import {afterEach, expect, it, vi} from 'vitest';
import {appendDictation, validateVoiceRecording} from '../apps/web/src/lib/client/voice-recording.ts';
import {callWorker} from '@schubert/adapters';

afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('keeps typed instructions when adding dictation and rejects empty recognition',()=>{
  expect(appendDictation('Bitte diese Skizze verwenden.', '  Breite 600 mm.  ')).toBe('Bitte diese Skizze verwenden.\nBreite 600 mm.');
  expect(()=>appendDictation('Bestehende Nachricht', '  ')).toThrow(/keine Sprache/);
});
it('rejects empty, incomplete and subsecond audio before any upload, and closes the decoder',async()=>{
  const close=vi.fn().mockResolvedValue(undefined), decode=vi.fn();
  vi.stubGlobal('AudioContext',class{close=close;decodeAudioData=decode;});
  await expect(validateVoiceRecording(new Blob([]))).rejects.toThrow(/keinen Ton/);
  expect(decode).not.toHaveBeenCalled();
  decode.mockRejectedValueOnce(Error('invalid container'));
  await expect(validateVoiceRecording(new Blob(['invalid']))).rejects.toThrow(/unvollständig/);
  decode.mockResolvedValueOnce({duration:.06});
  await expect(validateVoiceRecording(new Blob(['short']))).rejects.toThrow(/zu kurz/);
  decode.mockResolvedValueOnce({duration:126});
  await expect(validateVoiceRecording(new Blob(['long']))).rejects.toThrow(/zu lang/);
  decode.mockResolvedValueOnce({duration:2.34});
  await expect(validateVoiceRecording(new Blob(['valid']))).resolves.toBeUndefined();
  expect(close).toHaveBeenCalledTimes(4);
});
it('reports the actual audio failure and preserves its code for safe recovery',async()=>{
  vi.stubEnv('DOCUMENT_WORKER_URL','https://synthetic-worker.invalid');vi.stubEnv('DOCUMENT_WORKER_SECRET','synthetic-test-secret');vi.stubEnv('DOCUMENT_PROCESSING_WORKER_URL','https://synthetic-worker.invalid');
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({error:'AUDIO_INSPECTION'}),{status:422})));
  await expect(callWorker('/audio/inspect',{bytes:'not-a-real-recording'})).rejects.toMatchObject({code:'AUDIO_INSPECTION',status:422,message:expect.stringMatching(/Audioaufnahme.*erneut aufnehmen.*Bildanhänge/)});
});
