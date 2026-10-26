import { parse } from "csv-parse/sync";
import { parseLength } from "@schubert/geometry";
import { DomainError, requireRule } from "@schubert/domain";
import type {
  ManufacturerDeliveryInput,
  ManufacturerDeliveryRow,
} from "@schubert/contracts";
/** Explicit column mapping and unit; neither filenames nor model knowledge supply dimensions. */
export function parseManufacturerDelivery(
  bytes: Uint8Array,
  input: ManufacturerDeliveryInput,
): { headers: string[]; items: ManufacturerDeliveryRow[] } {
  requireRule(
    bytes.length > 0 && bytes.length <= 2 * 1024 * 1024,
    "DELIVERY_SIZE",
    "Eine CSV-Datei bis 2 MB verwenden.",
  );
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new DomainError(
      "DELIVERY_ENCODING",
      "Die CSV-Datei ist nicht UTF-8-kodiert. Bitte als CSV (UTF-8) exportieren.",
    );
  }
  // Count delimiters outside quoted header values, so an article name cannot choose the format.
  const line = text.replace(/^\uFEFF/, "").split(/\r?\n/)[0];
  let quoted = false,
    semicolons = 0,
    commas = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (quoted && line[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted) {
      if (line[i] === ";") semicolons++;
      if (line[i] === ",") commas++;
    }
  }
  const delimiter = semicolons > commas ? ";" : ",";
  let raw: unknown[][];
  try {
    raw = parse(text, {
      bom: true,
      delimiter,
      skip_empty_lines: true,
      max_record_size: 50000,
      relax_column_count: false,
      to: 502,
    });
  } catch {
    throw new DomainError(
      "DELIVERY_CSV",
      "Die CSV-Datei ist nicht lesbar. UTF-8 und gleich viele Spalten pro Zeile verwenden.",
    );
  }
  requireRule(
    raw.length >= 2 && raw.length <= 501,
    "DELIVERY_ROWS",
    "Zwischen einem und 500 Artikelstände pro Lieferung verwenden.",
  );
  const headers = raw[0].map((value) => String(value).trim());
  requireRule(
    new Set(headers).size === headers.length && headers.length <= 80,
    "DELIVERY_HEADERS",
    "Eindeutige Spaltenüberschriften verwenden.",
  );
  for (const key of Object.values(input.mapping))
    requireRule(
      !key || headers.includes(key),
      "DELIVERY_MAPPING",
      "Die ausgewählte Spalte fehlt in der Quelldatei: " + key,
    );
  const seen = new Set<string>();
  const items = raw.slice(1).map((values, index) => {
    const read = (column: string) =>
      column ? String(values[headers.indexOf(column)] ?? "").trim() : "";
    const article = read(input.mapping.article),
      name = read(input.mapping.name);
    requireRule(
      /^[0-9A-Za-z][0-9A-Za-z._ -]{2,79}$/.test(article) &&
        name.length >= 2 &&
        name.length <= 250,
      "DELIVERY_ARTICLE",
      "Artikelnummer und Bezeichnung in Zeile " + (index + 2) + " prüfen.",
    );
    requireRule(
      !seen.has(article),
      "DELIVERY_DUPLICATE",
      "Artikelnummer mehrfach in derselben Lieferung: " + article,
    );
    seen.add(article);
    const dimension = (column: string) => {
      const value = read(column);
      if (!value) return null;
      const parsed = parseLength(value, input.unit);
      requireRule(
        parsed !== null && Number(parsed) > 0 && Number(parsed) <= 100000,
        "DELIVERY_DIMENSION",
        "Ungültiges Maß in Zeile " + (index + 2) + ", Spalte " + column,
      );
      return parsed;
    };
    return {
      article,
      name,
      width: dimension(input.mapping.width),
      depth: dimension(input.mapping.depth),
      height: dimension(input.mapping.height),
      row: index + 2,
    };
  });
  return { headers, items };
}
