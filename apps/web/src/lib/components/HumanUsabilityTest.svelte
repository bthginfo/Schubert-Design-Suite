<script lang="ts">
  import { onMount } from "svelte";
  import { searchableSelect } from "#lib/client/searchable-select.ts";
  let {
    feedbackEnabled = false,
    userId = "",
  }: { feedbackEnabled?: boolean; userId?: string } = $props();
  let role = $state("planning"),
    notes = $state(""),
    results: Record<string, string> = $state({});
  let restored = $state(false);
  onMount(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("schubert:practice:" + userId) ?? "null",
      );
      if (saved) {
        if (["planning", "office"].includes(saved.role)) role = saved.role;
        notes =
          typeof saved.notes === "string" ? saved.notes.slice(0, 4000) : "";
        if (saved.results && typeof saved.results === "object")
          results = Object.fromEntries(
            Object.entries(saved.results)
              .filter(
                ([key, value]) =>
                  /^(planning|office):[a-z]+$/.test(key) &&
                  ["Ohne Hilfe", "Mit Hilfe", "Nicht geschafft"].includes(
                    value as string,
                  ),
              )
              .slice(0, 6),
          ) as Record<string, string>;
      }
    } catch {}
    restored = true;
  });
  $effect(() => {
    if (restored && userId)
      try {
        sessionStorage.setItem(
          "schubert:practice:" + userId,
          JSON.stringify({ role, notes, results }),
        );
      } catch {}
  });
  const tasks = $derived(
    role === "planning"
      ? [
          {
            id: "new",
            title: "Ein neues Grabmal vorbereiten",
            goal: "Legen Sie einen eigenen TEST-Entwurf an. Erfassen Sie einen Stein mit den von der Testleitung vorgegebenen Maßen und ergänzen Sie den vorgegebenen Wortlaut.",
          },
          {
            id: "units",
            title: "Einen Entwurf ändern und wiederfinden",
            goal: "Ändern Sie die Anzeige auf cm, korrigieren Sie ein Maß und prüfen Sie die Inschrift in 3D. Öffnen Sie den gespeicherten Entwurf erneut.",
          },
          {
            id: "ai",
            title: "Eine offene Angabe mit der KI klären",
            goal: "Lassen Sie sich beim aktuellen Arbeitsschritt helfen. Beantworten Sie eine Rückfrage, prüfen Sie den Vorschlag und nehmen Sie eine Änderung wieder zurück.",
          },
        ]
      : [
          {
            id: "customer",
            title: "Die nächste Aufgabe für einen Kunden finden",
            goal: "Öffnen Sie den vorgegebenen TEST-Kunden. Finden Sie heraus, was als Nächstes zu tun ist, wer zuständig ist und welcher Termin gilt.",
          },
          {
            id: "draft",
            title: "Einen Vorgang im Kundenkontext vorbereiten",
            goal: "Bereiten Sie eine Anfrage oder einen Angebotsentwurf für diesen Kunden vor. Prüfen Sie, ob die Zuordnung erhalten bleibt. Keine verbindliche Ausgabe oder Nachricht versenden.",
          },
          {
            id: "find",
            title: "Unterlagen und Planung wiederfinden",
            goal: "Finden Sie die vorgegebene Planung und die zugehörige Unterlage des TEST-Kunden und kehren Sie zur Kundenübersicht zurück.",
          },
        ],
  );
  const completed = $derived(
    tasks.filter((task) => results[role + ":" + task.id]).length,
  );
  function report() {
    const text =
      "Praxistest · " +
      (role === "planning" ? "Steinmetz / Beratung" : "Büro") +
      "\n" +
      tasks
        .map(
          (task) =>
            task.title +
            ": " +
            (results[role + ":" + task.id] ?? "Nicht getestet"),
        )
        .join("\n") +
      "\nBeobachtungen: " +
      notes;
    window.dispatchEvent(
      new CustomEvent("schubert:feedback:open", {
        detail: { category: "usability", message: text },
      }),
    );
  }
</script>

<details class="practice-test">
  <summary>Praxistest mit Mitarbeitenden</summary>
  <div class="practice-body">
    <h2>Wie leicht gelingt die Arbeit ohne Einweisung?</h2>
    <p>
      Für einen echten Test mit einer Person aus dem Betrieb. Die Testleitung
      gibt TEST-Kunde, Maße und Wortlaut vor und beobachtet, ohne die Klickfolge
      zu erklären. Ergebnisse werden von der testenden Person selbst erfasst;
      hier läuft kein automatischer Nutzertest.
    </p>
    <label
      >Mein Arbeitsbereich<select use:searchableSelect={role} bind:value={role}
        ><option value="planning">Steinmetz / Beratung</option><option
          value="office">Büro</option
        ></select
      ></label
    >
    <p>
      {completed} von {tasks.length} Aufgaben bewertet · ungefähr 20–30 Minuten
    </p>
    {#each tasks as task}<section>
        <h3>{task.title}</h3>
        <p>{task.goal}</p>
        <fieldset>
          <legend>Wie ist es gelungen?</legend
          >{#each ["Ohne Hilfe", "Mit Hilfe", "Nicht geschafft"] as result}<label
              class="result"
              ><input
                type="radio"
                name={role + task.id}
                value={result}
                bind:group={results[role + ":" + task.id]}
              />{result}</label
            >{/each}
        </fieldset>
      </section>{/each}<label
      >Wo mussten Sie suchen oder waren unsicher?<textarea
        rows="4"
        maxlength="4000"
        bind:value={notes}></textarea></label
    ><button
      class="btn primary"
      onclick={report}
      disabled={!feedbackEnabled || !completed}>Rückmeldung prüfen</button
    >{#if !feedbackEnabled}<p>
        Die Rückmeldefunktion ist derzeit ausgeschaltet. Die Testleitung kann
        die Beobachtungen im Testprotokoll festhalten.
      </p>{/if}<small
      >Der nächste Dialog zeigt Ihre Rückmeldung vor dem Senden. Andere
      Formulare und bereits angelegte Testdaten bleiben erhalten.</small
    >
  </div>
</details>

<style>
  .practice-test {
    margin-bottom: 28px;
    padding: 18px 22px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--paper);
  }
  summary {
    min-height: 32px;
    cursor: pointer;
    font-weight: 600;
  }
  .practice-body {
    max-width: 760px;
    padding-top: 18px;
  }
  h2 {
    font-size: 20px;
  }
  h3 {
    font-size: 16px;
  }
  p,
  small {
    font-size: 13px;
    line-height: 1.7;
    color: var(--muted);
  }
  section {
    margin: 22px 0;
    padding-block: 12px;
    border-block: 1px solid var(--line);
  }
  label {
    display: block;
    margin-block: 14px;
    font-size: 14px;
  }
  select,
  textarea {
    display: block;
    width: 100%;
    box-sizing: border-box;
    min-height: 46px;
    padding: 11px 13px;
    margin-top: 8px;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: var(--input-surface);
    color: var(--ink);
    font: inherit;
  }
  fieldset {
    border: 0;
    margin: 12px 0;
    padding: 0;
  }
  legend {
    font-size: 13px;
  }
  .result {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 10px 18px 4px 0;
    min-height: 42px;
  }
  .result input {
    accent-color: var(--forest);
  }
  small {
    display: block;
    margin-top: 12px;
  }
  @media (max-width: 760px) {
    .practice-test {
      padding: 18px;
    }
    .result {
      display: flex;
    }
    select,
    textarea {
      font-size: 16px;
      min-height: 48px;
    }
  }
</style>
