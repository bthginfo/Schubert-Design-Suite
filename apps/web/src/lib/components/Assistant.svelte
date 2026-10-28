<script lang="ts">
  import CompanionHome from "./CompanionHome.svelte";
  import AssistantReply from "./AssistantReply.svelte";
  import { planningProposalReview } from "#lib/client/proposal-review.ts";
  import {
    studioAssistantContext,
    prepareStudioAssistant,
    adoptStudioAssistantResult,
  } from "#lib/client/studio-assistant.ts";
  import { planningStepLabel } from "@schubert/contracts";
  import { focusTrap } from "#lib/client/focus-trap.ts";
  import { fullscreenCompanion } from "#lib/client/fullscreen-companion.ts";
  import { onDestroy, onMount, untrack, tick } from "svelte";
  import { page } from "$app/state";
  import { refreshAll, goto } from "$app/navigation";
  import {queueVisualization} from "#lib/client/visualization-handoff.ts";
  import { request, permitted, RequestError } from "#lib/client/api.ts";
  import { validateVoiceRecording, appendDictation } from "#lib/client/voice-recording.ts";
  import type { AppData, Row } from "#lib/client/types.ts";
  import Icon from "./Icon.svelte";
  import ProposalPreview from "./ProposalPreview.svelte";
  import AssistantSources from "./AssistantSources.svelte";
  import {
    assistantRestrictedPaths,
    selectedPlanningElements,
    sourceReady,
    sourceReferences,
    type AssistantSource,
  } from "#lib/client/assistant.ts";
  let { data }: { data: AppData } = $props();
  let section = $state<"help" | "chat">("help"),
    mobile = $state(false),
    optionsOpen = $state(false),
    expanded = $state(true);
  const expandedChat = $derived(expanded && section === "chat");
  let chatArea = $state<HTMLDivElement>();
  const conversations = new Map<string, Row>();
  let launcher = $state<HTMLButtonElement>();
  function companionFocus(node: HTMLElement, enlarged: boolean) {
    const candidate = document.activeElement;
    const previous =
      candidate instanceof HTMLElement &&
      candidate !== document.body &&
      candidate !== document.documentElement
        ? candidate
        : null;
    let trap: ReturnType<typeof focusTrap> | undefined;
    const media = matchMedia("(max-width:760px)"),
      update = () => {
        mobile = media.matches;
        if ((media.matches || enlarged) && !trap) trap = focusTrap(node);
        else if (!media.matches && !enlarged && trap) {
          trap.destroy();
          trap = undefined;
        }
      };
    update();
    if (!media.matches) node.querySelector<HTMLElement>("button")?.focus();
    media.addEventListener("change", update);
    return {
      update(value: boolean) { enlarged = value; update(); },
      destroy() {
        media.removeEventListener("change", update);
        trap?.destroy();
        void tick().then(() => {
          if (
            open ||
            !launcher?.isConnected ||
            document.querySelector(
              'dialog[open],[role="dialog"][aria-modal="true"]',
            )
          )
            return;
          const active = document.activeElement;
          if (
            active instanceof HTMLElement &&
            active !== document.body &&
            active !== document.documentElement &&
            active !== launcher &&
            active !== previous &&
            !node.contains(active)
          )
            return;
          const target =
            previous?.isConnected &&
            previous.getClientRects().length &&
            !previous.closest("[inert]")
              ? previous
              : launcher;
          if (
            target.getClientRects().length &&
            getComputedStyle(target).visibility !== "hidden"
          )
            target.focus({ preventScroll: true });
        });
      },
    };
  }
  async function choosePrompt(prompt: string) {
    section = "chat";
    input = prompt;
    await tick();
    document.getElementById("assistant-message")?.focus();
  }
  function studioAction(action: string) {
    close();
    if (action !== "close")
      window.dispatchEvent(
        new CustomEvent("schubert:studio:action", { detail: { action } }),
      );
  }
  function newConversation() {
    messages = [];
    input = "";
    sources = [];
    error = "";
    retryAudio = null;
    section = "help";
  }
  let displayedReply = "";
  const chatPositions = new Map<string, { top: number; pinned: boolean }>();
  function chatViewport(node: HTMLDivElement, key: string) {
    let current = key,
      active = true;
    const remember = () => {
      const pinned =
        node.scrollHeight - node.scrollTop - node.clientHeight < 80;
      chatPositions.set(current, { top: node.scrollTop, pinned });
      if (current === contextKey) chatPinned = pinned;
      if (chatPositions.size > 10)
        chatPositions.delete(chatPositions.keys().next().value!);
    };
    const restore = () => {
      const scope = current,
        position = chatPositions.get(scope);
      chatPinned = position?.pinned ?? true;
      void tick().then(() => {
        if (active && scope === current) node.scrollTop = position?.top ?? 0;
      });
    };
    node.addEventListener("scroll", remember);
    restore();
    return {
      update(next: string) {
        if (next !== current) {
          current = next;
          restore();
        }
      },
      destroy() {
        active = false;
        node.removeEventListener("scroll", remember);
      },
    };
  }
  $effect(() => {
    const last = messages.at(-1);
    busy;
    section;
    const newReply = last?.role === "assistant" && last.id !== displayedReply;
    if (newReply && chatArea && section === "chat") displayedReply = last.id;
    if (section === "chat" && chatArea && chatPinned)
      void tick().then(() => {
        if (!chatArea) return;
        const reply = newReply
          ? chatArea.querySelector<HTMLElement>(
              '[data-message-id="' + last!.id + '"]',
            )
          : null;
        chatArea.scrollTo({
          top: !available&&!messages.length?0:reply
            ? chatArea.scrollTop +
              reply.getBoundingClientRect().top -
              chatArea.getBoundingClientRect().top -
              12
            : chatArea.scrollHeight,
          behavior: "instant",
        });
      });
  });
  let open = $state(false);
  let deepReview = $state(false);
  let input = $state("");
  let sourcePicker:{addFiles:(files:File[])=>Promise<void>;remove:(row:AssistantSource)=>void}|undefined=$state();
  let attachmentInput:HTMLInputElement|undefined=$state();
  async function addAttachments(files:File[]){if(!files.length||sensitiveContext)return;section="chat";await tick();await sourcePicker?.addFiles(files);}
  function pasteAttachment(event:ClipboardEvent){const files=Array.from(event.clipboardData?.files??[]).filter(file=>file.type.startsWith("image/"));if(files.length){event.preventDefault();void addAttachments(files);}}
  function dropAttachment(event:DragEvent){if(event.dataTransfer?.files.length){event.preventDefault();void addAttachments(Array.from(event.dataTransfer.files));}}
  async function sendAnswers(text:string){if(busy||!available||sourcePending||studioLoading)return false;const next=input.trim()&&!input.endsWith(text)?input+"\n\n"+text:input.endsWith(text)?input:text;if(next.length>6000){error="Bitte die Angaben auf 6.000 Zeichen kürzen.";return false;}input=next;return (await send())===true;}
  let error = $state("");
  let phase = $state("idle");
  const busy = $derived(phase !== "idle");
  let recording = $state(false);
  let recordingStarting = $state(false);
  let transcribing = $state(false);
  let retryAudio = $state<{ blob: Blob; key: string } | null>(null);
  let messages: Row[] = $state([]);
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let recordingTimeout: ReturnType<typeof setTimeout>;
  let cancelled = false;
  const proposalKeys = new Map<string, string>();
  let runId = 0;
  let activeRun: {
    id: number;
    controller: AbortController;
    key: string;
    messageId?: string;
  } | null = null;
  let preserveMeasurements = $state(false),
    preserveWording = $state(false),
    selectionOnly = $state(false),
    compactHelp = $state(false),
    chatPinned = $state(true);
  const phaseLabel = $derived(
    (
      {
        preparing: "Planstand speichern und prüfen …",
        requesting: "KI-Anfrage läuft …",
        applying: "Vorschlag wird übernommen …",
        undoing: "Änderung wird zurückgenommen …",
      } as Record<string, string>
    )[phase] ?? "",
  );
  function appendPrompt(prompt: string) {
    const next = input.trim() ? input.trim() + "\n\n" + prompt : prompt;
    if (next.length > 6000) {
      error =
        "Die Nachricht wird zu lang. Kürzen Sie zuerst Ihre Eingabe; Ihre Angaben bleiben erhalten.";
      return;
    }
    void choosePrompt(next);
  }
  async function openBoundaries() {
    section = "chat";
    optionsOpen = true;
    await tick();
    document
      .querySelector<HTMLInputElement>("#assistant-boundaries input")
      ?.focus();
  }
  async function finishOptions() {
    optionsOpen = false;
    await tick();
    document.getElementById("assistant-message")?.focus();
  }
  function toggleHelp() {
    compactHelp = !compactHelp;
    try {
      localStorage.setItem(
        "schubert:companion-compact:" + data.user?.id,
        String(compactHelp),
      );
    } catch {}
  }
  onMount(() => {
    try {
      compactHelp =
        localStorage.getItem("schubert:companion-compact:" + data.user?.id) ===
        "true";
    } catch {}
  });
  function stopRequest(showNotice = true) {
    const current = activeRun;
    if (!current || !["preparing", "requesting"].includes(phase)) return;
    current.controller.abort();
    runId++;
    activeRun = null;
    phase = "idle";
    messages = messages.map((m) =>
      m.id === current.messageId ? { ...m, status: "cancelled" } : m,
    );
    if (showNotice) {
      contextNotice =
        "Anfrage beendet. Der Plan wurde nicht durch die KI verändert. Bereits begonnene Verarbeitung kann Kosten verursachen.";
      void tick().then(() =>
        document.getElementById("assistant-message")?.focus(),
      );
    }
  }
  function proposalStale(message: Row) {
    return !!(
      studioWork &&
      message.work &&
      !message.applied &&
      (studioWork.revisionId !== message.work.revisionId ||
        studioWork.baseVersion !== message.work.baseVersion ||
        studioWork.dirty)
    );
  }
  function reviewMessage(message: Row) {
    return message.proposal
      ? planningProposalReview(data, message.proposal)
      : null;
  }
  function updateMessage(
    key: string,
    id: string,
    change: (message: Row) => Row,
  ) {
    if (key === contextKey) {
      messages = messages.map((m) => (m.id === id ? change(m) : m));
      return;
    }
    const saved = conversations.get(key);
    if (saved)
      conversations.set(key, {
        ...saved,
        messages: saved.messages.map((m: Row) => (m.id === id ? change(m) : m)),
      });
  }
  let sources: AssistantSource[] = $state([]);
  const sourcePending=$derived(sources.some(source=>source.working));
  let selectedElementIds: string[] = $state([]);
  let contextNotice = $state("");
  let lastContext = "";
  const variantId = $derived(
    page.url.searchParams.get("variant") ||
      data.summary?.selectedVariantId ||
      data.related?.variants?.[0]?.id ||
      undefined,
  );
  const studioWork = $derived(
    $studioAssistantContext?.projectId === data.detail?.id
      ? $studioAssistantContext
      : null,
  );
  const studioLoading=$derived(data.view==='studio'&&!!data.detail&&!studioWork);
  const guardrails = $derived({
    preserveMeasurements,
    preserveWording,
    selectionOnly,
  });
  const contextKey = $derived(
    data.path +
      ":" +
      (data.detail?.id || "") +
      ":" +
      (variantId || "") +
      ":" +
      page.url.search +
      ":" +
      (studioWork?.step ?? ""),
  );
  const sensitiveContext = $derived(
    !!data.module?.hr ||
      data.module?.permission === "hr" ||
      assistantRestrictedPaths.has((data.path || "").split("/")[0]),
  );
  const designContext = $derived(
    data.path === "studio" ||
      data.path?.startsWith("studio/") ||
      data.module?.permission === "planning" ||
      ["planning", "design", "surveys"].some((section) =>
        data.path?.startsWith(section),
      ),
  );
  const modelProfile = $derived(data.summary?.assistantModelProfile || {});
  const chosenProfile = $derived(
    designContext && deepReview ? modelProfile.design : modelProfile.standard,
  );
  function dollars(value: unknown) {
    return value === undefined ||
      value === null ||
      !Number.isFinite(Number(value))
      ? "noch nicht bestätigt"
      : new Intl.NumberFormat("de-DE", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 6,
        }).format(Number(value));
  }
  $effect(() => {
    const next = contextKey;
    untrack(() => {
      if (next !== lastContext) {
        if (lastContext) {
          stopRequest(false);
          conversations.set(lastContext, {
            messages: messages.slice(-20),
            input,
            sources,
            deepReview,
            preserveMeasurements,
            preserveWording,
            selectionOnly,
          });
          if (conversations.size > 10)
            conversations.delete(conversations.keys().next().value!);
        }
        const previous = conversations.get(next);
        contextNotice = lastContext
          ? previous
            ? "Ihr Gespräch zu diesem Arbeitsbereich ist wieder geöffnet."
            : "Die Hilfe bezieht sich jetzt auf die geöffnete Seite."
          : "";
        lastContext = next;
        sources = previous?.sources ?? [];
        selectedElementIds = [];
        messages = previous?.messages ?? [];
        input = previous?.input ?? "";
        deepReview = previous?.deepReview ?? false;
        preserveMeasurements =
          previous?.preserveMeasurements ?? false;
        preserveWording = previous?.preserveWording ?? false;
        selectionOnly = previous?.selectionOnly ?? false;
        section = previous?.messages.length ? "chat" : "help";
        error = "";
        retryAudio = null;
        if (recording || recordingStarting) stopRecording(true);
      }
    });
  });
  const integration = $derived(
    data.integrations?.ai || data.integrations?.openai,
  );
  const available = $derived(
    (integration?.available ?? false) && !sensitiveContext,
  );
  async function send(event?: SubmitEvent) {
    event?.preventDefault();
    if (!input.trim() || busy || !available || sourcePending || studioLoading || recording || recordingStarting || transcribing) return false;
    const message = input.trim(),
      sendingContext = contextKey,
      history = messages
        .filter((m) => !["pending", "failed", "cancelled"].includes(m.status))
        .slice(-6)
        .map(({ role, text }) => ({ role, text: text.slice(0, 1800) }));
    const run = {
      id: ++runId,
      controller: new AbortController(),
      key: sendingContext,
      messageId: crypto.randomUUID(),
    };
    activeRun = run;
    error = "";
    contextNotice = "";
    phase = "preparing";
    optionsOpen = false;
    chatPinned = true;
    const boundaries = { ...guardrails };
    try {
      const references = sourceReferences(sources),
        work = studioWork ? await prepareStudioAssistant() : null;
      if (
        run.id !== runId ||
        sendingContext !== contextKey ||
        run.controller.signal.aborted
      )
        return;
      messages = [
        ...messages,
        {
          id: run.messageId,
          role: "user",
          text: message,
          status: "pending",
          sources: sources.map((source) =>
            [
              source.name || "Ausgewählte Unterlage",
              "Seite " + source.pageNumber,
              source.includeImage
                ? "Text und vorbereitete Bildreferenz"
                : "vorhandene Textauszüge",
            ].join(" · "),
          ),
        },
      ];
      phase = "requesting";
      const result = await request(
        "/api/v1/ai/chat",
        {
          message,
          history,
          mode: designContext && deepReview ? "design_review" : "standard",
          context: {
            path: data.path,
            variantId: work?.variantId ?? variantId,
            search: page.url.search,
            ...(work
              ? {
                  planning_work: {
                    step: work.step,
                    revision_id: work.revisionId,
                    base_version: work.baseVersion,
                    view: work.view,
                    display_unit: work.displayUnit,
                    guardrails: boundaries,
                  },
                  selected_element_ids: work.selectedElementIds,
                }
              : designContext && selectedElementIds.length
                ? { selected_element_ids: selectedElementIds }
                : {}),
          },
          references,
        },
        "POST",
        run.controller.signal,
      );
      if (run.id !== runId || sendingContext !== contextKey) return;
      if (typeof result?.text !== "string")
        throw new Error("Der Assistent hat keine lesbare Antwort geliefert.");
      messages = [
        ...messages.map((m) =>
          m.id === run.messageId ? { ...m, status: "completed" } : m,
        ),
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: result.text,
          proposal: result.proposal,
          assumptions: result.assumptions ?? result.proposal?.assumptions ?? [],
          missingInputs:
            result.missingInputs ?? result.proposal?.missing_inputs ?? [],
          skillsUsed: result.skillsUsed ?? [],
          clarifications: result.clarifications ?? [],
          visualization: result.visualization ?? null,
          visualizationSources: sources.filter(source=>sourceReady(source)).map(source=>({...source})),
          work: work ? { ...work } : null,
          boundaries,
        },
      ].slice(-20);
      input = "";
      return true;
    } catch (cause) {
      if (run.id === runId && sendingContext === contextKey) {
        messages = messages.map((m) =>
          m.id === run.messageId
            ? {
                ...m,
                status: run.controller.signal.aborted ? "cancelled" : "failed",
              }
            : m,
        );
        error = run.controller.signal.aborted
          ? ""
          : cause instanceof Error
            ? cause.message
            : "Die Anfrage konnte nicht abgeschlossen werden.";
      }
    } finally {
      if (run.id === runId) {
        phase = "idle";
        activeRun = null;
      }
    }
  }
  async function apply(index: number) {
    const message = messages[index];
    if (!message.proposal?.id || busy) return;
    const review = reviewMessage(message);
    if (proposalStale(message) || review?.error) {
      error =
        review?.error ??
        "Der Plan wurde geändert. Fordern Sie einen neuen Vorschlag zum aktuellen Stand an.";
      return;
    }
    phase = "applying";
    error = "";
    const applyingContext = contextKey;
    try {
      const work = studioWork ? await prepareStudioAssistant() : null;
      if (applyingContext !== contextKey) return;
      if (work && message.work && work.revisionId !== message.work.revisionId)
        throw Error(
          "Der Plan wurde geändert. Bitte einen neuen Vorschlag anfordern.",
        );
      const proposalId = message.proposal.id,
        key = proposalKeys.get(proposalId) || crypto.randomUUID();
      proposalKeys.set(proposalId, key);
      const result = await request(`/api/v1/ai/proposals/${proposalId}/apply`, {
        idempotencyKey: key,
      });
      proposalKeys.delete(proposalId);
      if (review?.before && result.revision)
        adoptStudioAssistantResult(
          review.before.revisionId,
          review.operations,
          result,
        );
      updateMessage(applyingContext, message.id, (m) => ({
        ...m,
        applied: true,
        records: result.records??[],
        undo:
          review?.before && result.revision && result.variant
            ? {
                variantId: result.variant.id,
                revisionId: result.revision.id,
                version: result.variant.version,
                operations: review.inverse,
                sourceRevisionId: review.before.revisionId,
              }
            : null,
      }));
      await refreshAll().catch(() => {});
    } catch (e) {
      if (applyingContext === contextKey)
        error =
          e instanceof Error
            ? e.message
            : "Der Vorschlag konnte nicht angewendet werden. Prüfen Sie den aktuellen Stand.";
    } finally {
      phase = "idle";
    }
  }
  async function undoProposal(index: number) {
    const message = messages[index],
      undo = message.undo;
    if (!undo || busy) return;
    phase = "undoing";
    error = "";
    const key = contextKey;
    try {
      const work = await prepareStudioAssistant();
      if (contextKey !== key) return;
      if (
        work.revisionId !== undo.revisionId ||
        work.baseVersion !== undo.version
      )
        throw Error(
          "Seit dieser KI-Änderung wurde weitergearbeitet. Nutzen Sie Rückgängig im Studio oder öffnen Sie den früheren Stand unter Stände. Ihre spätere Arbeit wird nicht überschrieben.",
        );
      const undoKey=undo.key??(undo.key=crypto.randomUUID());
      const result = undo.operations ? await request(`/api/v1/designs/${undo.variantId}/commands`, {
        base_revision_id:undo.revisionId,expected_version:undo.version,operations:undo.operations,idempotency_key:undoKey,
      }):await request('/api/v1/commands', {name:'planning.design.restore_previous',id:undo.variantId,expectedVersion:undo.version,idempotencyKey:undoKey,payload:{base_revision_id:undo.revisionId,source_revision_id:undo.sourceRevisionId}});
      adoptStudioAssistantResult(undo.revisionId,undo.operations??[],result);
      updateMessage(key, message.id, (m) => ({ ...m, undone: true }));
      await refreshAll().catch(() => {});
    } catch (e) {
      if (contextKey === key)
        error =
          e instanceof Error
            ? e.message
            : "Die Änderung konnte nicht zurückgenommen werden.";
    } finally {
      phase = "idle";
    }
  }
  async function visualize(message:Row){
    const projectId=message.records?.findLast((item:Row)=>item.module==='studio')?.record?.id??message.work?.projectId??(data.module?.slug==='studio'?data.detail?.id:null);
    if(!projectId||!message.visualization)return;
    const handoff={...message.visualization,sources:message.visualizationSources??[]};
    close();
    if(studioWork?.projectId===projectId)window.dispatchEvent(new CustomEvent('schubert:studio:action',{detail:{action:handoff.intent==='photo'?'photo':'image',prompt:handoff.prompt,sources:handoff.sources}}));
    else{queueVisualization(projectId,handoff);await goto('/studio/'+projectId);}
  }
  let microphoneRequest = 0;
  async function transcribeRecording(blob: Blob, key: string) {
    if (transcribing || key !== contextKey) return;
    transcribing = true;
    error = "";
    retryAudio = null;
    try {
      await validateVoiceRecording(blob);
      if (key !== contextKey) return;
      const body = new FormData();
      body.append("audio", blob, blob.type.includes("mp4") ? "aufnahme.m4a" : "aufnahme.webm");
      const result = await request("/api/v1/ai/transcribe", body);
      if (key !== contextKey) return;
      if (typeof result?.text !== "string") throw new Error("Es wurde kein bearbeitbarer Text erkannt.");
      input = appendDictation(input, result.text);
      await tick();
      document.getElementById("assistant-message")?.focus();
    } catch (cause) {
      if (key === contextKey) {
        error = cause instanceof Error ? cause.message : "Die Spracherkennung ist fehlgeschlagen. Text und Anhänge bleiben erhalten.";
        // Only definitive pre-provider rejections may offer an explicit retry.
        if (cause instanceof RequestError && ["AUDIO_INSPECTION", "WORKER_FAILED", "INTEGRATION_UNAVAILABLE", "AUDIO_PROVIDER_CONFIGURATION"].includes(cause.code))
          retryAudio = { blob, key };
      }
    } finally { transcribing = false; }
  }
  async function startRecording() {
    if (recording || recordingStarting || transcribing || busy || !available || studioLoading) return;
    error = "";
    retryAudio = null;
    recordingStarting = true;
    const key = contextKey, token = ++microphoneRequest;
    let capture: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error("Dieser Browser unterstützt die Audioaufnahme nicht. Nutzen Sie die Texteingabe.");
      capture = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (token !== microphoneRequest || key !== contextKey || !open) {
        capture.getTracks().forEach(track => track.stop());
        return;
      }
      stream = capture;
      const parts: Blob[] = [];
      cancelled = false;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(type => MediaRecorder.isTypeSupported(type));
      const current = new MediaRecorder(capture, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 48000 });
      recorder = current;
      let bytes = 0;
      current.ondataavailable = event => {
        if (event.data.size) { parts.push(event.data); bytes += event.data.size; }
        if (bytes > 2_800_000) {
          error = "Die Aufnahme ist zu groß. Bitte kürzer aufnehmen. Text und Anhänge bleiben erhalten.";
          stopRecording(true);
        }
      };
      current.onstop = () => {
        clearTimeout(recordingTimeout);
        capture?.getTracks().forEach(track => track.stop());
        stream = null;
        recorder = null;
        recording = false;
        if (cancelled || key !== contextKey) return;
        // onstop follows the final dataavailable event: keep every container chunk.
        void transcribeRecording(new Blob(parts, { type: current.mimeType || "audio/webm" }), key);
      };
      current.onerror = () => {
        error = "Die Audioaufnahme ist fehlgeschlagen. Bitte erneut aufnehmen. Text und Anhänge bleiben erhalten.";
        stopRecording(true);
      };
      current.start(1000);
      recording = true;
      recordingTimeout = setTimeout(() => stopRecording(), 120000);
    } catch (cause) {
      capture?.getTracks().forEach(track => track.stop());
      if (token === microphoneRequest) {
        stream = null;
        error = cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "Das Mikrofon ist nicht freigegeben. Erlauben Sie den Zugriff im Browser oder schreiben Sie weiter. Text und Anhänge bleiben erhalten."
          : cause instanceof Error ? cause.message : "Der Mikrofonzugriff ist nicht verfügbar.";
      }
    } finally { if (token === microphoneRequest) recordingStarting = false; }
  }
  function stopRecording(cancel = false) {
    cancelled = cancel;
    ++microphoneRequest;
    recordingStarting = false;
    clearTimeout(recordingTimeout);
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else {
      stream?.getTracks().forEach(track => track.stop());
      stream = null;
      recording = false;
    }
  }
  function close() {
    if (recording || recordingStarting) stopRecording(true);
    retryAudio = null;
    open = false;
  }
  onMount(() => {
    const show = (event: Event) => {
      open = true;
      const detail = (event as CustomEvent).detail;
      if (detail?.prompt)
        void choosePrompt(String(detail.prompt).slice(0, 6000));
      if (detail?.section === "help") section = "help";
      if (
        detail?.source &&
        sources.length < 2 &&
        !sources.some(
          (source) => source.documentId === detail.source.documentId,
        )
      ) {
        sources = [
          ...sources,
          {
            key: crypto.randomUUID(),
            documentId: String(detail.source.documentId),
            name: String(detail.source.name),
            pageNumber: 1,
            includeImage: true,
          },
        ];
        section = "chat";
        optionsOpen = true;
        contextNotice =
          "Herstellerquelle ausgewählt. Bereiten Sie die Bildseite vor und prüfen Sie die Vorschau vor dem Senden.";
      }
    };
    const selection = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (designContext && detail?.variantId === variantId)
        selectedElementIds = selectedPlanningElements(
          detail.selectedElementIds,
        );
    };
    window.addEventListener("schubert:assistant:open", show);
    window.addEventListener("schubert:studio:selection", selection);
    return () => {
      window.removeEventListener("schubert:assistant:open", show);
      window.removeEventListener("schubert:studio:selection", selection);
    };
  });
  onDestroy(() => {
    activeRun?.controller.abort();
    runId++;
    cancelled = true;
    ++microphoneRequest;
    retryAudio = null;
    clearTimeout(recordingTimeout);
    if (recorder?.state === "recording") recorder.stop();
    stream?.getTracks().forEach((t) => t.stop());
  });
</script>

<div class="assistant-host" use:fullscreenCompanion>
  {#if !open}<button
      bind:this={launcher}
      class="assistant-trigger"
      onclick={() => (open = true)}
      aria-expanded="false"
      aria-haspopup="dialog"
      aria-controls="assistant-drawer"
      title="Assistent öffnen"><Icon name="spark" size={19} />Assistent</button
    >{:else}<div
      class="assistant-overlay"
      class:expanded={expandedChat}
      role="presentation"
      onclick={close}
    ></div>
    <div
      use:companionFocus={expandedChat}
      id="assistant-drawer"
      class="assistant-drawer"
      class:chat={section === "chat"}
      class:expanded={expandedChat}
      role="dialog"
      aria-modal={mobile || expandedChat ? "true" : undefined}
      aria-label="Schubert Begleiter"
      tabindex="-1"
      onkeydown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
      }}
    >
      <header class="assistant-header">
        <div class="empty-icon" style="width:35px;height:35px;margin:0">
          <Icon name="spark" size={18} />
        </div>
        <div>
          <h2>Schubert Begleiter</h2>
          <p>Hilfe und Ideen für Ihren nächsten Schritt</p>
        </div>
        <button
          class="icon-button"
          disabled={busy || recording || recordingStarting || transcribing || studioLoading}
          onclick={newConversation}
          aria-label="Neues Gespräch"><Icon name="edit" size={18} /></button
        >{#if section === "chat"}<button class="icon-button assistant-resize" onclick={() => (expanded = !expanded)} aria-label={expanded ? "Chat verkleinern" : "Chat vergrößern"} aria-pressed={expanded}><Icon name={expanded ? "panel-close" : "panel-open"} size={18}/></button>{/if}<button
          class="icon-button"
          onclick={close}
          aria-label="Assistent schließen"><Icon name="close" /></button
        >
      </header>
      <div class="companion-tabs" aria-label="Begleiteransicht">
        <button
          aria-pressed={section === "help"}
          onclick={() => (section = "help")}
          ><Icon name="help" size={16} />Hilfe für diese Seite</button
        ><button
          aria-pressed={section === "chat"}
          onclick={() => (section = "chat")}
          ><Icon name="chat" size={16} />Chat{messages.length
            ? " · " + messages.length
            : ""}</button
        >
      </div>
      {#if studioWork}<div class="assistant-context">
          <div>
            <Icon name="link" size={15} /><strong
              >{planningStepLabel(studioWork.kind, studioWork.step, studioWork.presetId)}</strong
            >
          </div>
          <p>
            {studioWork.historic
              ? "Historischer Stand · aktuellen Plan zum Bearbeiten öffnen"
              : studioWork.dirty
                ? "Letzte Änderungen werden vor dem Senden gespeichert."
                : "Aktueller gespeicherter Planstand"}{studioWork.selectedLabels
              .length
              ? " · " + studioWork.selectedLabels.slice(0, 2).join(", ")
              : " · gesamter Plan"}{studioWork.selectedLabels.length > 2
              ? " + " + (studioWork.selectedLabels.length - 2) + " weitere"
              : ""}
          </p>
          <small>Die KI kann den ganzen Entwurf bearbeiten. Änderungen werden mit Vorschau übernommen.</small><button
              type="button"
              class="assistant-scope-link"
              aria-label="Bearbeitungsgrenzen ändern"
              aria-controls="assistant-boundaries"
              aria-expanded={section === "chat" && optionsOpen}
              disabled={busy}
              onclick={openBoundaries}
              >{guardrails.selectionOnly
                ? "Nur Auswahl"
                : "Gesamter Plan"}{preserveMeasurements
                ? " · Maßwerte geschützt"
                : ""}{preserveWording && studioWork.kind === "memorial"
                ? " · Wortlaut geschützt"
                : ""}<Icon name="settings" size={14} /></button
            >
        </div>{/if}{#if section === "help"}<div class="companion-density">
          <button type="button" aria-pressed={compactHelp} onclick={toggleHelp}
            >{compactHelp
              ? "Mehr Erklärung anzeigen"
              : "Kurzhilfe verwenden"}</button
          >
        </div>
        <CompanionHome
          {data}
          {available}
          compact={compactHelp}
          onchat={choosePrompt}
          onaction={studioAction}
        />{:else}<div
          class="assistant-messages"
          bind:this={chatArea}
          use:chatViewport={contextKey}
          aria-live="polite"
        >
          {#if !available}<div class="notice warning">
              <Icon name="alert" />
              <div class="notice-content">
                <div class="notice-title">
                  {sensitiveContext
                    ? "Lokale Feldhilfe für diesen Bereich"
                    : "Noch nicht verfügbar"}
                </div>
                <p>
                  {sensitiveContext
                    ? "Personal- und Administrationsakten bleiben außerhalb der KI. Die Hinweise direkt an den Eingabefeldern erklären die erforderlichen Angaben."
                    : integration?.message ||
                      "Die OpenAI-Verbindung und das Modellprofil sind noch nicht eingerichtet."}
                </p>
                {#if !sensitiveContext && permitted(data, "admin")}<a
                    class="text-link mt"
                    href="/settings"
                    onclick={close}
                    >Integration prüfen<Icon name="arrow" size={14} /></a
                  >{:else if !sensitiveContext}<p class="field-help mt">
                    Die zuständige Administration kann die Verbindung in den
                    Betriebseinstellungen einrichten.
                  </p>{/if}
              </div>
            </div>{/if}{#if contextNotice}<p
              class="field-help mb"
              role="status"
            >
              {contextNotice}
            </p>{/if}{#if !messages.length && !sensitiveContext}<div
              class="chat-message assistant"
            >
              <div class="chat-role">Arbeiten mit dem Assistenten</div>
              Beschreiben Sie Ihr Vorhaben. Wir können es Schritt für Schritt besprechen,
              Unterlagen einbeziehen und konkrete Änderungen vorbereiten.
              <p class="field-help mt">
                Änderungsvorschläge sehen Sie vor der Anwendung. Im
                Planungsstudio können Sie daneben weiterarbeiten.
              </p>
            </div>{/if}{#each messages as message, index (message.id)}<article
              class="chat-message {message.role}"
              data-message-id={message.id}
            >
              <div class="chat-role">
                {message.role === "user" ? "Sie" : "Schubert Assistent · KI"}
              </div>
              {#if message.role === "assistant"}<AssistantReply
                  text={message.text}
                  assumptions={message.assumptions ?? []}
                  missingInputs={message.missingInputs ?? []}
                  clarifications={message.clarifications ?? []}
                  displayUnit={message.work?.displayUnit??'mm'}
                  allowMaterials={data.context?.permissions?.some(p=>['planning','planning.read','*'].includes(p))??false}
                  skillsUsed={message.skillsUsed ?? []}
                  disabled={busy}
                  onfollowup={appendPrompt}
                  onanswersubmit={sendAnswers}
                />{#if message.visualization}<button type="button" class="btn small mt" disabled={busy||!!message.proposal&&!message.applied} onclick={()=>visualize(message)}><Icon name="image" size={16}/>{message.visualization.intent==='photo'?'Bildbearbeitung vorbereiten':'Kundenbild vorbereiten'}</button><p class="field-help">{message.proposal&&!message.applied?'Zuerst die Entwurfsänderung anwenden. Danach wird das Bild mit diesem Planstand vorbereitet.':'Die Bildbeschreibung wird übernommen. Qualität und Kosten prüfen Sie im Bildstudio.'}</p>{/if}{#if message.work}<p class="reply-origin">
                    Grundlage: {planningStepLabel(
                      message.work.kind,
                      message.work.step,
                      message.work.presetId,
                    )} · {message.work.selectedLabels?.join(", ") ||
                      "gesamter Plan"}
                  </p>{/if}{#if proposalStale(message)}<p
                    class="reply-stale"
                    role="status"
                  >
                    Der Plan wurde seit dieser Antwort geändert. Vor einer
                    Übernahme einen neuen Vorschlag anfordern.
                  </p>{/if}{:else}<div class="chat-body">{message.text}</div>
                {#if message.status === "cancelled" || message.status === "failed"}<p
                    class="reply-origin"
                  >
                    {message.status === "cancelled"
                      ? "Anfrage beendet"
                      : "Anfrage nicht abgeschlossen"}
                  </p>{/if}{/if}{#if message.sources?.length}<p
                  class="field-help mt"
                >
                  Bewusst gewählte Quellen: {message.sources.join(" · ")}
                </p>{/if}{#if message.proposal}<div class="assistant-proposal">
                  <h3>Änderungsvorschlag prüfen</h3>
                  {#if message.proposal.target}<p>
                      Bezug: {message.proposal.target.entityType} · Version {message
                        .proposal.target.baseVersion}
                    </p>{/if}<ProposalPreview
                    proposal={message.proposal}
                    {data}
                  />
                  <details class="mt">
                    <summary style="font-size:12px;cursor:pointer"
                      >Technische Details ansehen</summary
                    >
                    <pre>{JSON.stringify(
                        message.proposal.proposedCommands ||
                          message.proposal.commands ||
                          message.proposal.changes ||
                          {},
                        null,
                        2,
                      )}</pre>
                  </details>
                  {#if message.proposal.validation?.blocking?.length}<div
                      class="notice error mt"
                    >
                      {message.proposal.validation.blocking.join(" · ")}
                    </div>{/if}{#if message.applied}<p class="mt">
                      <Icon name="check" size={13} />{message.undone
                        ? "Änderung zurückgenommen und als neuer Stand gespeichert."
                        : "Vom Server bestätigt angewendet."}
                    </p>
                    {#if message.records?.length}<div class="proposal-actions">{#each message.records as item}<a class="btn small" href={item.href} onclick={close}><Icon name="arrow" size={14}/>{item.record.number??item.record.title??item.record.name??'Entwurf'} öffnen</a>{/each}</div>{/if}
                    {#if message.undo && !message.undone}<button
                        type="button"
                        class="btn small"
                        disabled={busy}
                        onclick={() => undoProposal(index)}
                        ><Icon name="back" size={15} />KI-Änderung rückgängig</button
                      >{/if}{:else if message.dismissed}<p
                      class="field-help mt"
                    >
                      Nicht übernommen.
                    </p>{:else}<div class="proposal-actions">
                      <button
                        class="btn primary full"
                        onclick={() => apply(index)}
                        disabled={busy ||
                          proposalStale(message) ||
                          !!reviewMessage(message)?.error ||
                          !!message.proposal.validation?.blocking?.length ||
                          message.proposal.status === "expired"}
                        >Geprüften Vorschlag anwenden</button
                      ><button
                        type="button"
                        class="btn small"
                        disabled={busy}
                        onclick={() =>
                          appendPrompt(
                            "Bitte den Vorschlag für die aktuelle Auswahl anpassen: ",
                          )}>Anpassen</button
                      ><button
                        type="button"
                        class="btn small ghost"
                        disabled={busy}
                        onclick={() =>
                          (messages = messages.map((m) =>
                            m.id === message.id ? { ...m, dismissed: true } : m,
                          ))}>Nicht übernehmen</button
                      >
                    </div>{/if}
                </div>{/if}
            </article>{/each}{#if busy}<p class="small muted" role="status">
              <Icon name="refresh" size={14} class="spin" />
              {phaseLabel}
            </p>{/if}{#if error}<div class="notice error" role="alert">
              <Icon name="alert" />
              <div>{error}</div>
            </div>{/if}
        </div>
        <form class="assistant-input" onsubmit={send} onpaste={pasteAttachment} ondragover={event=>{if(event.dataTransfer?.types.includes("Files"))event.preventDefault();}} ondrop={dropAttachment}>
          <div class="assistant-compose-fields">
            {#if sources.length}<div class="assistant-attachments" aria-label="Anhänge dieser Nachricht">
              {#each sources as source, index (source.key)}<div class="assistant-attachment">
                {#if source.preview?.status === "completed" && source.preview.document_id && source.preview.document_version_id}<img src={'/api/v1/documents/'+source.preview.document_id+'/download?version='+source.preview.document_version_id+'&inline=1'} alt={'Bildvorlage '+source.name}/>{:else}<Icon name="file" size={22}/>{/if}
                <div><strong>{source.name || 'Quelle '+(index+1)}</strong><span role="status">{sourceReady(source) ? 'Bereit · wird mit Ihrer Nachricht gesendet' : source.working ? 'Wird vorbereitet …' : source.error || 'Vorbereitung prüfen'}</span></div>
                <button type="button" class="icon-button" aria-label={'Anhang '+(index+1)+' prüfen'} onclick={()=>optionsOpen=true}><Icon name="settings" size={16}/></button>
                <button type="button" class="icon-button" aria-label={'Anhang '+(index+1)+' entfernen'} disabled={busy} onclick={()=>sourcePicker?.remove(source)}><Icon name="close" size={16}/></button>
              </div>{/each}
            </div>{/if}
            <label class="sr-only" for="assistant-message"
              >Nachricht an den Assistenten</label
            ><textarea
              id="assistant-message"
              class="field-control"
              maxlength="6000"
              bind:value={input}
              rows="2"
              placeholder={sensitiveContext
                ? "Nutzen Sie die Hinweise an den Eingabefeldern."
                : available
                  ? sources.length ? "Was soll die KI mit dem Bild oder der Unterlage machen? Tippen oder diktieren …" : "Nachricht schreiben, Bild hinzufügen oder sprechen …"
                  : "Texteingabe nach Einrichtung verfügbar"}
              disabled={!available || busy || studioLoading}
            ></textarea>{#if recording}<div
                class="notice warning mt"
                role="status"
              >
                <Icon name="mic" size={17} />
                <div>
                  Aufnahme läuft. Stoppen Sie die Aufnahme, um den Text zu
                  prüfen.
                </div>
              </div>{/if}{#if transcribing}<p
                class="field-help mt"
                role="status"
              >
                Audio wird transkribiert. Anschließend können Sie den Text
                bearbeiten.
              </p>{/if}{#if recordingStarting}<p class="field-help" role="status">Mikrofon im Browser freigeben … <button type="button" class="text-link" onclick={()=>stopRecording(true)}>Abbrechen</button></p>{/if}{#if retryAudio}<div class="inline-actions"><button type="button" class="btn small" disabled={transcribing} onclick={()=>{if(retryAudio)void transcribeRecording(retryAudio.blob,retryAudio.key);}}>Spracherkennung erneut versuchen</button><button type="button" class="text-link" onclick={()=>retryAudio=null}>Aufnahme verwerfen</button></div>{/if}
          </div>
          <div class="assistant-input-actions">
            <details class="companion-options" bind:open={optionsOpen}>
              <summary aria-label="Unterlagen und Modelloptionen"
                ><Icon name="settings" size={16} /><span class="options-label">Optionen</span></summary
              ><div class="companion-options-body"><div class="options-heading"><strong>Unterlagen & Modell</strong><button type="button" class="icon-button" aria-label="Optionen schließen" onclick={finishOptions}><Icon name="close" size={16}/></button></div>{#if !sensitiveContext}<AssistantSources
                  bind:this={sourcePicker}
                  {data}
                  bind:rows={sources}
                  disabled={busy || studioLoading}
                />{/if}{#if studioWork}<fieldset
                  class="assistant-boundaries"
                  id="assistant-boundaries"
                >
                  <legend>Optionale Einschränkungen</legend><label
                    ><input
                      type="checkbox"
                      checked={guardrails.selectionOnly}
                      disabled={busy}
                      onchange={(event) =>
                        (selectionOnly = event.currentTarget.checked)}
                    />Nur Auswahl bearbeiten</label
                  ><label
                    ><input
                      type="checkbox"
                      bind:checked={preserveMeasurements}
                      disabled={busy}
                    />Maßwerte beibehalten</label
                  >{#if studioWork.kind === "memorial"}<label
                      ><input
                        type="checkbox"
                        bind:checked={preserveWording}
                        disabled={busy}
                      />Wortlaut beibehalten</label
                    >{/if}
                  <p>
                    Diese Grenzen werden beim Vorschlag und vor der Übernahme
                    geprüft.
                  </p>
                  <button
                    type="button"
                    class="btn small"
                    onclick={finishOptions}>Zur Nachricht</button
                  >
                </fieldset>{/if}{#if !sensitiveContext}<div
                  class="assistant-model-choice"
                >
                  {#if designContext}<label class="check-field"
                      ><input
                        type="checkbox"
                        bind:checked={deepReview}
                        disabled={busy || !available}
                      /><span>Vertieft prüfen</span></label
                    >
                    <p class="field-help">
                      {deepReview
                        ? "Verwendet nach dem Senden das Modell für vertiefte Designprüfung. Das eigene Kostenlimit und das Monatsbudget gelten."
                        : "Standardmodus mit dem günstigeren Modell. Für komplexe Planungsfragen können Sie eine vertiefte Prüfung bewusst auswählen."}
                    </p>{:else}<p class="field-help">
                      Standardassistent · keine automatische Eskalation zu
                      teureren Modellen.
                    </p>{/if}{#if chosenProfile?.model}<p class="field-help mt">
                      {chosenProfile.model} · höchstens {dollars(
                        chosenProfile.maxRequestCost,
                      )} je Anfrage.
                    </p>
                    <details class="mt">
                      <summary class="field-help">Kostenrahmen ansehen</summary>
                      <p class="field-help mt">
                        Je 1 Million Tokens: Eingabe {dollars(
                          chosenProfile.inputCostPerMillion,
                        )}, Ausgabe {dollars(
                          chosenProfile.outputCostPerMillion,
                        )}. Monatsbudget {dollars(modelProfile.monthlyBudget)}.
                        Der Server reserviert die mögliche Obergrenze;
                        abgerechnet wird der tatsächliche bestätigte Verbrauch.
                      </p>
                    </details>{/if}{#if designContext && selectedElementIds.length}<p
                      class="field-help mt"
                    >
                      Aktuell {selectedElementIds.length} ausgewählte Studiokomponente(n).
                      Die gespeicherte Revision bleibt die Grundlage.
                    </p>{/if}
                </div>{/if}
            </div></details>

            {#if !sensitiveContext&&permitted(data,"documents.upload")}<input class="assistant-attachment-input" type="file" tabindex="-1" aria-hidden="true" accept="image/jpeg,image/png,image/webp,image/tiff,application/pdf" multiple bind:this={attachmentInput} onchange={event=>{void addAttachments(Array.from(event.currentTarget.files??[]));event.currentTarget.value="";}} aria-label="Foto oder PDF im Chat hochladen"/><button type="button" class="btn small" aria-label="Foto oder PDF im Chat hochladen" disabled={busy||studioLoading||sources.length>=2} onclick={()=>attachmentInput?.click()}><Icon name="camera" size={15}/>Foto / PDF</button>{/if}
            {#if ["preparing", "requesting"].includes(phase)}<button
                type="button"
                class="btn small"
                onclick={() => stopRequest()}
                ><Icon name="stop" size={15} />Anfrage abbrechen</button
              >{/if}{#if recording}<div class="inline-actions">
                <button
                  type="button"
                  class="btn small danger"
                  onclick={() => stopRecording()}
                  ><Icon name="stop" size={15} />Stoppen</button
                ><button
                  type="button"
                  class="btn small ghost"
                  onclick={() => stopRecording(true)}>Verwerfen</button
                >
              </div>{:else}<button
                type="button"
                class="btn small ghost"
                disabled={!available || busy || recordingStarting || transcribing || studioLoading}
                onclick={startRecording}
                ><Icon name="mic" size={17} />Sprechen</button
              >{/if}<button
              class="btn primary"
              type="submit"
              disabled={!available ||
                busy || studioLoading ||
                recording || recordingStarting ||
                transcribing ||
                !input.trim() ||
                sources.some((source) => !sourceReady(source))}
              >Senden<Icon name="arrow" size={16} /></button
            >
          </div>
          {#if studioLoading}<p class="field-help" role="status">Der aktuelle Planstand wird geladen. Danach können Sie die Nachricht senden.</p>{/if}
          <p class="field-help mt">
            Bilder, Text und Sprache lassen sich kombinieren. Namen und Maße vor der Anwendung prüfen.
          </p>
        </form>{/if}
    </div>{/if}
</div>

<style>
  .assistant-header { flex-shrink: 0; padding: 16px 20px; gap: 10px; }
  .assistant-header h2 { font-size: 16px; letter-spacing: -.01em; }
  .assistant-header p { font-size: 12px; }
  .assistant-header > div:nth-child(2) { flex: 1; min-width: 0; }
  .assistant-header > .icon-button { flex: none; margin-left: 0; width: 44px; height: 44px; }
  .companion-tabs { display: flex; gap: 4px; padding: 0 18px 10px; flex: none; }
  .companion-tabs button { display: flex; justify-content: center; align-items: center; gap: 8px; flex: 1; border: 0; border-radius: 8px; background: transparent; color: var(--muted); font-size: 13px; min-height: 44px; padding: 10px; }
  .companion-tabs button[aria-pressed="true"] { background: var(--wash); color: var(--ink); font-weight: 550; }
  .assistant-drawer { overflow: hidden; }
  .assistant-messages { min-height: 100px; flex: 1 1 200px; position: relative; padding: 20px 24px; overscroll-behavior: contain; }
  .assistant-messages :global(.chat-message) { overflow-wrap: anywhere; white-space: normal; font-size: 14px; }
  .chat-body { white-space: pre-wrap; }
  .assistant-messages :global(.chat-message.user) { background: var(--wash); border: 0; border-radius: 12px 12px 3px 12px; padding: 14px 16px; }
  .assistant-messages :global(.chat-message.assistant) { padding-right: 0; }
  .assistant-messages :global(.chat-role) { font-size: 12px; text-transform: none; letter-spacing: 0; color: var(--muted); margin-bottom: 6px; }
  .assistant-messages :global(.assistant-proposal) { border-radius: 10px; background: var(--paper); padding: 16px; border: 1px solid var(--line); }
  .assistant-input { position: relative; display: flex; flex-direction: column; flex: none; padding: 12px 20px 16px; min-height: 0; max-height: none; overflow: visible; }
  .assistant-compose-fields { min-height: 0; }
  .assistant-input textarea#assistant-message { min-height: 64px; max-height: 150px; field-sizing: content; resize: vertical; overflow-y: auto; border-radius: 10px; font-size: 15px; line-height: 1.6; }
  .assistant-input-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-start; gap: 8px; margin-top: 8px; padding: 0; }
  .assistant-input-actions :global(.btn), .companion-options > summary { min-height: 44px; font-size: 13px; }
  .assistant-input-actions > .primary { margin-left: auto; }
  .assistant-input > p { margin-top: 6px; font-size: 12px; line-height: 1.5; }
  .assistant-attachment-input { position: absolute!important; width: 1px!important; height: 1px!important; min-height: 0!important; padding: 0!important; overflow: hidden!important; clip-path: inset(50%); white-space: nowrap; }
  .assistant-attachments { display: flex; flex-direction: column; gap: 6px; max-height: 146px; overflow: auto; margin-bottom: 8px; }
  .assistant-attachment { display: flex; align-items: center; gap: 10px; padding: 5px 8px; background: var(--wash); border-radius: 8px; min-width: 0; }
  .assistant-attachment > img { width: 48px; height: 48px; object-fit: contain; border-radius: 4px; background: white; }
  .assistant-attachment > div { flex: 1; min-width: 0; }
  .assistant-attachment strong { display: block; font-size: 13px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .assistant-attachment span { display: block; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
  .assistant-attachment .icon-button { flex: none; min-width: 44px; min-height: 44px; }
  .companion-options { position: static; border: 0; padding: 0; margin: 0; }
  .companion-options > summary { display: flex; align-items: center; gap: 6px; padding: 8px 10px; cursor: pointer; color: var(--muted); border-radius: 8px; list-style: none; }
  .companion-options > summary::-webkit-details-marker { display: none; }
  .companion-options[open] > summary { background: var(--wash); color: var(--ink); }
  .companion-options-body { position: absolute; bottom: calc(100% + 8px); left: 12px; right: 12px; z-index: 5; max-height: min(56dvh, 560px); overflow: auto; overscroll-behavior: contain; border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 10px 35px #0003; padding: 16px; background: var(--paper); }
  .options-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
  .options-heading strong { font-size: 14px; }
  .companion-options :global(.assistant-sources) { border-top: 0; margin: 0; }
  .companion-options :global(.assistant-source-body) { max-height: none; overflow: visible; }
  .assistant-model-choice details summary { cursor: pointer; min-height: 40px; }
  .assistant-context { flex: none; padding: 10px 22px; border-bottom: 1px solid var(--line); background: var(--accent-wash); color: var(--forest); }
  .assistant-context > div { display: flex; align-items: center; gap: 8px; }
  .assistant-context strong { font-weight: 600; }
  .assistant-context p { margin: 5px 0 3px; font-size: 13px; line-height: 1.5; color: var(--ink); overflow-wrap: anywhere; }
  .assistant-context small { font-size: 12px; line-height: 1.5; color: var(--muted); }
  .assistant-boundaries { margin: 14px 0; padding: 12px 14px; border: 1px solid var(--line); border-radius: 10px; white-space: normal; min-width: 0; }
  .assistant-boundaries legend { font-size: 13px; font-weight: 600; padding: 0 5px; color: var(--ink); }
  .assistant-scope-link { display: flex; align-items: center; gap: 8px; justify-content: space-between; width: 100%; min-height: 40px; font: inherit; font-size: 12px; line-height: 1.5; text-align: left; color: var(--forest); border: 0; background: transparent; padding: 5px 0; }
  .assistant-scope-link :global(svg) { flex: none; }
  .assistant-scope-link:hover { text-decoration: underline; text-underline-offset: 3px; }
  .assistant-boundaries label { display: flex; align-items: center; gap: 8px; min-height: 44px; font-size: 13px; color: var(--ink); }
  .assistant-boundaries input { width: 16px; height: 16px; accent-color: var(--forest); }
  .assistant-boundaries > p, .reply-origin { font-size: 12px; line-height: 1.6; }
  .reply-origin { color: var(--muted); margin-top: 10px; white-space: normal; }
  .reply-stale { font-size: 13px; line-height: 1.6; padding: 10px; background: var(--warning-wash); border-radius: 9px; color: var(--warning); white-space: normal; }
  .proposal-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .proposal-actions > .primary { flex-basis: 100%; }
  .proposal-actions > .btn { min-height: 44px; }
  .companion-density { padding: 0 24px; flex: none; }
  .companion-density button { font: inherit; font-size: 13px; color: var(--muted); min-height: 40px; text-decoration: underline; text-underline-offset: 3px; }
  @media (min-width:761px) {
    .assistant-overlay { display: none; }
    .assistant-overlay.expanded { display: block; }
    .assistant-drawer { inset: 72px 22px 22px auto; width: min(460px, calc(100vw - 44px)); max-height: calc(100dvh - 94px); border: 0; border-radius: 16px; box-shadow: 0 14px 65px #0004; background: var(--paper); }
    .assistant-drawer.chat { width: min(620px, calc(100vw - 44px)); }
    .assistant-drawer.expanded { inset: 24px 24px 24px auto; width: min(1000px, calc(100vw - 48px)); max-height: calc(100dvh - 48px); }
  }
  @media (max-width:760px) {
    .assistant-header { padding: 8px 12px; gap: 4px; }
    .assistant-header p, .assistant-resize, .assistant-input > p, .assistant-context small { display: none; }
    .assistant-header h2 { font-size: 15px; }
    .companion-tabs { padding: 0 12px 6px; }
    .assistant-context { padding: 8px 14px; }
    .assistant-context p { font-size: 12px; }
    .assistant-input { padding: 10px 12px calc(12px + env(safe-area-inset-bottom)); }
    .assistant-input textarea#assistant-message { font-size: 16px; max-height: 112px; }
    .assistant-input-actions { gap: 4px; }
    .assistant-input-actions :global(.btn), .companion-options > summary { padding-inline: 8px; gap: 4px; }
    .companion-options > summary { width: 44px; justify-content: center; }
    .options-label { display: none; }
    .assistant-messages { padding: 14px 16px; min-height: 80px; }
    .assistant-attachments { max-height: 116px; }
    .companion-options-body { left: 6px; right: 6px; padding: 12px; }
  }
</style>
