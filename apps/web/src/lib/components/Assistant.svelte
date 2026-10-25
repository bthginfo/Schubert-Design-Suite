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
  import { refreshAll } from "$app/navigation";
  import { request, permitted } from "#lib/client/api.ts";
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
    optionsOpen = $state(false);
  let chatArea = $state<HTMLDivElement>();
  const conversations = new Map<string, Row>();
  let launcher = $state<HTMLButtonElement>();
  function companionFocus(node: HTMLElement) {
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
        if (media.matches && !trap) trap = focusTrap(node);
        else if (!media.matches && trap) {
          trap.destroy();
          trap = undefined;
        }
      };
    update();
    if (!media.matches) node.querySelector<HTMLElement>("button")?.focus();
    media.addEventListener("change", update);
    return {
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
  let error = $state("");
  let phase = $state("idle");
  const busy = $derived(phase !== "idle");
  let recording = $state(false);
  let transcribing = $state(false);
  let messages: Row[] = $state([]);
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let audio: BlobPart[] = [];
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
    preserveWording = $state(true),
    selectionOnly = $state<boolean | null>(null),
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
  const guardrails = $derived({
    preserveMeasurements,
    preserveWording,
    selectionOnly: selectionOnly ?? !!studioWork?.selectedElementIds.length,
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
          previous?.preserveMeasurements ?? studioWork?.step === "design";
        preserveWording = previous?.preserveWording ?? true;
        selectionOnly = previous?.selectionOnly ?? null;
        section = previous?.messages.length ? "chat" : "help";
        error = "";
        if (recording) stopRecording(true);
      }
    });
  });
  const integration = $derived(
    data.integrations?.ai || data.integrations?.openai,
  );
  const available = $derived(
    (integration?.available ?? false) && !sensitiveContext,
  );
  async function send(event: SubmitEvent) {
    event.preventDefault();
    if (!input.trim() || busy || !available) return;
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
          work: work ? { ...work } : null,
          boundaries,
        },
      ].slice(-20);
      input = "";
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
    if (review && !review.inverse) {
      error =
        "Diese Änderung kann noch nicht direkt rückgängig gemacht werden. Bitte einen kleineren Vorschlag anfordern.";
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
        undo:
          review?.inverse && result.revision && result.variant
            ? {
                variantId: result.variant.id,
                revisionId: result.revision.id,
                version: result.variant.version,
                operations: review.inverse,
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
      const result = await request(
        `/api/v1/designs/${undo.variantId}/commands`,
        {
          base_revision_id: undo.revisionId,
          expected_version: undo.version,
          operations: undo.operations,
          idempotency_key: undo.key ?? (undo.key = crypto.randomUUID()),
        },
      );
      adoptStudioAssistantResult(undo.revisionId, undo.operations, result);
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
  async function startRecording() {
    if (recording || busy || !available) return;
    error = "";
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error(
          "Dieser Browser unterstützt die Audioaufnahme nicht. Nutzen Sie die Texteingabe.",
        );
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audio = [];
      cancelled = false;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
        (t) => MediaRecorder.isTypeSupported(t),
      );
      recorder = new MediaRecorder(stream, {
        ...(mime ? { mimeType: mime } : {}),
        audioBitsPerSecond: 48000,
      });
      recorder.ondataavailable = (e) => {
        if (e.data.size) audio.push(e.data);
        if (
          audio.reduce(
            (total, part) => total + (part instanceof Blob ? part.size : 0),
            0,
          ) > 2800000
        ) {
          error =
            "Die Aufnahme ist zu groß. Verwenden Sie eine kürzere Aufnahme oder die Texteingabe.";
          stopRecording(true);
        }
      };
      recorder.onstop = async () => {
        clearTimeout(recordingTimeout);
        stream?.getTracks().forEach((t) => t.stop());
        stream = null;
        recording = false;
        if (cancelled) return;
        transcribing = true;
        const transcribingContext = contextKey;
        try {
          const audioBlob = new Blob(audio, {
            type: recorder?.mimeType || "audio/webm",
          });
          if (audioBlob.size > 2800000)
            throw new Error(
              "Die Aufnahme ist zu groß. Bitte kürzer aufnehmen oder den Text eingeben.",
            );
          const body = new FormData();
          body.append(
            "audio",
            audioBlob,
            recorder?.mimeType.includes("mp4")
              ? "aufnahme.m4a"
              : "aufnahme.webm",
          );
          const result = await request("/api/v1/ai/transcribe", body);
          if (typeof result?.text !== "string")
            throw new Error("Es wurde kein bearbeitbarer Text erkannt.");
          if (transcribingContext !== contextKey) return;
          input = input ? `${input}\n${result.text}` : result.text;
        } catch (e) {
          if (transcribingContext === contextKey)
            error =
              e instanceof Error
                ? e.message
                : "Die Transkription ist fehlgeschlagen.";
        } finally {
          transcribing = false;
          audio = [];
        }
      };
      recorder.onerror = () => {
        error =
          "Die Audioaufnahme ist fehlgeschlagen. Nutzen Sie die Texteingabe.";
        stopRecording(true);
      };
      recorder.start(1000);
      recording = true;
      recordingTimeout = setTimeout(() => stopRecording(), 120000);
    } catch (e) {
      error =
        e instanceof Error
          ? e.message
          : "Der Mikrofonzugriff ist nicht verfügbar.";
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
    }
  }
  function stopRecording(cancel = false) {
    cancelled = cancel;
    clearTimeout(recordingTimeout);
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else {
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      recording = false;
    }
  }
  function close() {
    if (recording) stopRecording(true);
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
      role="presentation"
      onclick={close}
    ></div>
    <div
      use:companionFocus
      id="assistant-drawer"
      class="assistant-drawer"
      role="dialog"
      aria-modal={mobile ? "true" : undefined}
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
          disabled={busy || recording || transcribing}
          onclick={newConversation}
          aria-label="Neues Gespräch"><Icon name="edit" size={18} /></button
        ><button
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
              >{planningStepLabel(studioWork.kind, studioWork.step)}</strong
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
          {#if ["review", "output"].includes(studioWork.step)}<small
              >Dieser Schritt bereitet Hinweise vor; Planänderungen sind
              gesperrt.</small
            >{/if}{#if !["review", "output"].includes(studioWork.step)}<button
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
            >{/if}
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
                  skillsUsed={message.skillsUsed ?? []}
                  disabled={busy}
                  onfollowup={appendPrompt}
                />{#if message.work}<p class="reply-origin">
                    Grundlage: {planningStepLabel(
                      message.work.kind,
                      message.work.step,
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
        <form class="assistant-input" onsubmit={send}>
          <div class="assistant-compose-fields">
            <details class="companion-options" bind:open={optionsOpen}>
              <summary
                ><Icon name="plus" size={16} />Unterlagen & Modell</summary
              >{#if !sensitiveContext}<AssistantSources
                  {data}
                  bind:rows={sources}
                  disabled={busy || recording || transcribing}
                />{/if}{#if studioWork && !["review", "output"].includes(studioWork.step)}<fieldset
                  class="assistant-boundaries"
                  id="assistant-boundaries"
                >
                  <legend>Bearbeitungsgrenzen</legend><label
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
            </details>
            <label class="sr-only" for="assistant-message"
              >Nachricht an den Assistenten</label
            ><textarea
              id="assistant-message"
              class="field-control"
              maxlength="6000"
              bind:value={input}
              placeholder={sensitiveContext
                ? "Nutzen Sie die Hinweise an den Eingabefeldern."
                : available
                  ? "Was ist in diesem Schritt zu tun?"
                  : "Texteingabe nach Einrichtung verfügbar"}
              disabled={!available || busy || recording}
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
              </p>{/if}
          </div>
          <div class="assistant-input-actions">
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
                disabled={!available || busy || transcribing}
                onclick={startRecording}
                ><Icon name="mic" size={17} />Sprechen</button
              >{/if}<button
              class="btn primary"
              type="submit"
              disabled={!available ||
                busy ||
                recording ||
                transcribing ||
                !input.trim() ||
                sources.some((source) => !sourceReady(source))}
              >Senden<Icon name="arrow" size={16} /></button
            >
          </div>
          <p class="field-help mt">
            Namen, Daten, Maße und Beträge vor der Anwendung prüfen. Sprache ist
            freiwillig; die manuelle Eingabe bleibt verfügbar.
          </p>
        </form>{/if}
    </div>{/if}
</div>

<style>
  .assistant-header {
    flex-shrink: 0;
  }
  .assistant-input {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    max-height: 55dvh;
    overflow: hidden;
  }
  .assistant-compose-fields {
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .assistant-input-actions,
  .assistant-input > p {
    flex-shrink: 0;
  }
  .assistant-input-actions {
    padding-top: 12px;
  }
  .assistant-messages {
    min-height: 90px;
  }
  .assistant-model-choice details summary {
    cursor: pointer;
    min-height: 30px;
  }
  @media (max-width: 760px) {
    .assistant-input {
      max-height: calc(95dvh - 185px);
    }
    .assistant-model-choice details summary {
      min-height: 40px;
    }
  }
  .companion-tabs {
    display: flex;
    gap: 4px;
    padding: 0 18px 14px;
    flex: none;
  }
  .companion-tabs button {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    flex: 1;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--muted);
    font-size: 13px;
    min-height: 42px;
    padding: 10px;
  }
  .companion-tabs button[aria-pressed="true"] {
    background: var(--wash);
    color: var(--ink);
    font-weight: 550;
  }
  .companion-options {
    margin-bottom: 12px;
  }
  .companion-options :global(> summary) {
    font-size: 12px;
    min-height: 38px;
  }
  .companion-options :global(.assistant-sources) {
    border-top: 0;
    margin: 0;
  }
  .assistant-input :global(textarea#assistant-message) {
    min-height: 85px;
    max-height: 180px;
    border-radius: 10px;
    font-size: 14px;
    line-height: 1.6;
  }
  .assistant-header h2 {
    font-size: 16px;
    letter-spacing: -0.01em;
  }
  .assistant-header p {
    font-size: 12px;
  }
  .assistant-header > div:nth-child(2) {
    flex: 1;
    min-width: 0;
  }
  .assistant-header > .icon-button {
    flex: none;
  }
  .assistant-messages :global(.chat-message) {
    overflow-wrap: anywhere;
    white-space: normal;
  }
  .chat-body {
    white-space: pre-wrap;
  }
  .assistant-messages :global(.chat-message.user) {
    background: var(--wash);
    border: 0;
    border-radius: 12px 12px 3px 12px;
    padding: 14px 16px;
  }
  .assistant-messages :global(.chat-message.assistant) {
    padding-right: 0;
  }
  .assistant-messages :global(.chat-role) {
    font-size: 11px;
    text-transform: none;
    letter-spacing: 0;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .assistant-messages :global(.assistant-proposal) {
    border-radius: 10px;
    background: var(--paper);
    padding: 16px;
    border: 1px solid var(--line);
  }
  @media (min-width: 761px) {
    .assistant-overlay {
      display: none;
    }
    .assistant-drawer {
      inset: 82px 22px 22px auto;
      width: 460px;
      max-height: calc(100dvh - 104px);
      border: 0;
      border-radius: 16px;
      box-shadow: 0 14px 65px #00000028;
      background: var(--paper);
      overflow: hidden;
    }
    .assistant-header {
      padding: 22px 20px 17px;
    }
    .assistant-messages {
      padding: 20px 24px;
    }
    .assistant-input {
      padding: 16px 22px;
    }
    .assistant-input > p {
      font-size: 11px;
      line-height: 1.55;
    }
    .chat-message {
      font-size: 14px;
    }
  }
  @media (max-width: 760px) {
    .companion-tabs button {
      font-size: 13px;
      min-height: 44px;
    }
    .assistant-input {
      max-height: 55dvh;
    }
    .assistant-input :global(textarea#assistant-message) {
      font-size: 16px;
    }
    .assistant-header {
      padding: 18px 16px;
    }
    .assistant-header p {
      font-size: 11px;
    }
  }

  .assistant-context {
    flex: none;
    padding: 13px 22px;
    border-bottom: 1px solid var(--line);
    background: var(--accent-wash);
    color: var(--forest);
  }
  .assistant-context > div {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
  }
  .assistant-context strong {
    font-weight: 600;
  }
  .assistant-context p {
    margin: 5px 0 3px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--ink);
    overflow-wrap: anywhere;
  }
  .assistant-context small {
    font-size: 11px;
    line-height: 1.6;
    color: var(--muted);
  }
  .assistant-boundaries {
    margin: 14px 0;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: 10px;
    white-space: normal;
    min-width: 0;
  }
  .assistant-boundaries legend {
    font-size: 12px;
    font-weight: 600;
    padding: 0 5px;
    color: var(--ink);
  }
  .assistant-scope-link {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: space-between;
    width: 100%;
    min-height: 40px;
    font: inherit;
    font-size: 11px;
    line-height: 1.6;
    text-align: left;
    color: var(--forest);
    border: 0;
    background: transparent;
    padding: 5px 0;
  }
  .assistant-scope-link :global(svg) {
    flex: none;
  }
  .assistant-scope-link:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .assistant-boundaries label {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    font-size: 12px;
    color: var(--ink);
  }
  .assistant-boundaries input {
    width: 16px;
    height: 16px;
    accent-color: var(--forest);
  }
  .assistant-boundaries > p {
    font-size: 11px;
    line-height: 1.6;
  }
  .reply-origin {
    font-size: 11px;
    line-height: 1.6;
    color: var(--muted);
    margin-top: 10px;
    white-space: normal;
  }
  .reply-stale {
    font-size: 12px;
    line-height: 1.6;
    padding: 10px;
    background: var(--warning-wash);
    border-radius: 9px;
    color: var(--warning);
    white-space: normal;
  }
  .proposal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
  .proposal-actions > .primary {
    flex-basis: 100%;
  }
  .proposal-actions > .btn {
    min-height: 44px;
  }
  .companion-density {
    padding: 0 24px;
    flex: none;
  }
  .companion-density button {
    font: inherit;
    font-size: 12px;
    color: var(--muted);
    min-height: 40px;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .assistant-input-actions {
    flex-wrap: wrap;
    gap: 8px;
  }
  .assistant-input {
    flex: 0 1 auto;
    min-height: 170px;
    max-height: 43dvh;
  }
  .assistant-messages {
    flex: 1 1 200px;
    min-height: 90px;
    position: relative;
  }
  @media (max-width: 760px) {
    .assistant-header {
      padding: 12px 16px;
    }
    .assistant-header p {
      display: none;
    }
    .companion-tabs {
      padding: 0 12px 10px;
    }
    .assistant-context {
      padding: 10px 16px;
    }
    .assistant-input {
      padding: 12px 16px;
      max-height: 43dvh;
    }
    .assistant-input-actions {
      margin-top: 0;
      padding-top: 8px;
    }
    .assistant-input > p {
      font-size: 11px;
      line-height: 1.5;
    }
    .assistant-messages {
      padding: 14px 18px;
    }
  }
</style>
