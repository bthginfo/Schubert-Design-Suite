/** Check the complete browser container before uploading or reserving AI costs. */
export async function validateVoiceRecording(blob: Blob): Promise<void> {
  if (!blob.size) throw new Error('Die Aufnahme enthält noch keinen Ton. Bitte erneut aufnehmen und mindestens eine Sekunde sprechen. Text und Anhänge bleiben erhalten.');
  if (blob.size > 2_800_000) throw new Error('Die Aufnahme ist zu groß. Bitte höchstens zwei Minuten aufnehmen. Text und Anhänge bleiben erhalten.');
  const context = new AudioContext();
  try {
    let audio: AudioBuffer;
    try { audio = await context.decodeAudioData(await blob.arrayBuffer()); }
    catch { throw new Error('Die Aufnahme ist unvollständig oder nicht lesbar. Bitte erneut aufnehmen. Text und Anhänge bleiben erhalten.'); }
    if (!Number.isFinite(audio.duration) || audio.duration < 0.25)
      throw new Error('Die Aufnahme ist zu kurz. Bitte erneut aufnehmen und mindestens eine Sekunde sprechen. Text und Anhänge bleiben erhalten.');
    if (audio.duration > 125) throw new Error('Die Aufnahme ist zu lang. Bitte höchstens zwei Minuten aufnehmen. Text und Anhänge bleiben erhalten.');
  } finally { await context.close(); }
}

export function appendDictation(input: string, text: string): string {
  const transcript = text.trim();
  if (!transcript) throw new Error('Es wurde keine Sprache erkannt. Bitte erneut sprechen oder den Text eingeben. Text und Anhänge bleiben erhalten.');
  return input ? `${input}\n${transcript}` : transcript;
}
