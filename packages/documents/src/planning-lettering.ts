import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fontkit from '@pdf-lib/fontkit';
import type { Font } from '@pdf-lib/fontkit';

/**
 * Preview lettering for plan output. The studio shows inscriptions in one of the
 * self-hosted, licensed preview fonts (apps/web/static/planning-fonts). When the
 * original font file is available to the server and matches its manifest hash,
 * the PDF draws the same glyph outlines as vector paths. Otherwise the caller
 * says so explicitly and keeps the reading font; nothing is substituted silently.
 * Glyph outlines avoid embedding multi-megabyte variable fonts (whose subsets
 * pdf-lib cannot produce reliably) and stay exact at any drawing scale.
 */
export type PreviewFont = { key: string; label: string; capRatio: number; ascender: number; descender: number; font: Font };
type ManifestEntry = { key: string; label: string; path: string; capRatio: number; ascender: number; descender: number; sha256: string };

function fontDirectories() {
  const candidates = [process.env.PLANNING_FONT_DIR,
    resolve(process.cwd(), 'static/planning-fonts'), resolve(process.cwd(), 'apps/web/static/planning-fonts'),
    resolve(process.cwd(), 'build/client/planning-fonts'), resolve(process.cwd(), '.svelte-kit/output/client/planning-fonts')];
  try { candidates.push(fileURLToPath(new URL('../../../apps/web/static/planning-fonts/', import.meta.url))); } catch { /* bundled without a file URL */ }
  return [...new Set(candidates.filter((dir): dir is string => !!dir))];
}

const cache = new Map<string, Promise<PreviewFont | null>>();
async function load(key: string): Promise<PreviewFont | null> {
  for (const dir of fontDirectories()) {
    try {
      const manifest = JSON.parse(await readFile(resolve(dir, 'manifest.json'), 'utf8')) as ManifestEntry[];
      const entry = manifest.find(item => item.key === key);
      if (!entry || !/^\/planning-fonts\/[a-z0-9]+\.ttf$/.test(entry.path)) return null;
      const bytes = await readFile(resolve(dir, entry.path.slice('/planning-fonts/'.length)));
      // Only the licensed original named in the manifest, never a similar substitute.
      if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) return null;
      let font = fontkit.create(bytes) as Font & { variationAxes?: Record<string, { min: number; max: number }>; getVariation?: (settings: Record<string, number>) => Font };
      // The studio preview renders variable fonts at weight 400.
      const weight = font.variationAxes?.wght;
      if (weight && weight.min <= 400 && weight.max >= 400 && font.getVariation) font = font.getVariation({ wght: 400 });
      return { key: entry.key, label: entry.label, capRatio: entry.capRatio, ascender: entry.ascender, descender: entry.descender, font };
    } catch { continue; }
  }
  return null;
}
export function loadPreviewFont(key: string) {
  let pending = cache.get(key);
  if (!pending) { pending = load(key); cache.set(key, pending); }
  return pending;
}

const svgCommand: Record<string, string> = { moveTo: 'M', lineTo: 'L', quadraticCurveTo: 'Q', bezierCurveTo: 'C', closePath: 'Z' };
/**
 * SVG path (x right, y down, origin on the baseline start) for one line of text
 * at `size` points. `xScale` compresses the advance like the studio preview.
 */
export function glyphOutline(preview: PreviewFont, text: string, size: number, xScale = 1) {
  const run = preview.font.layout(text), unit = size / preview.font.unitsPerEm;
  let advance = 0, d = '';
  run.glyphs.forEach((glyph, index) => {
    const position = run.positions[index];
    for (const command of (glyph.path as unknown as { commands: Array<{ command: string; args: number[] }> }).commands) {
      const args = command.args.map((value, i) => i % 2 === 0
        ? ((advance + position.xOffset + value) * unit * xScale).toFixed(3)
        : (-(position.yOffset + value) * unit).toFixed(3));
      d += svgCommand[command.command] + args.join(' ') + ' ';
    }
    advance += position.xAdvance;
  });
  return { d: d.trim(), width: advance * unit * xScale };
}

const labels: Record<string, string> = { notoserif: 'Noto Serif', cinzel: 'Cinzel', lora: 'Lora', cormorantgaramond: 'Cormorant Garamond', greatvibes: 'Great Vibes', montserrat: 'Montserrat' };
/** Name of a preview font even when its file is not available to the server. */
export function previewFontLabel(key: string) { return labels[key] ?? key; }
