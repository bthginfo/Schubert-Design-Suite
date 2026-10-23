import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const names = [
  "schubert-memorial-de",
  "schubert-room-de",
  "schubert-source-review-de",
  "schubert-office-drafts-de",
];
const skills = [];
for (const name of names) {
  const source = (
    await readFile(
      new URL("../skills/" + name + "/SKILL.md", import.meta.url),
      "utf8",
    )
  ).replaceAll("\r\n", "\n");
  const match = /^---\n([\s\S]+?)\n---\n([\s\S]+)$/.exec(source);
  if (!match) throw new Error(name + ": invalid SKILL.md manifest");
  const fields = {},
    metadata = {};
  let inMetadata = false;
  for (const line of match[1].split("\n")) {
    if (line === "metadata:") {
      inMetadata = true;
      continue;
    }
    const entry = (
      inMetadata ? /^  ([a-z_]+): (.+)$/ : /^([a-z_]+): (.+)$/
    ).exec(line);
    if (!entry) throw new Error(name + ": unsupported manifest line");
    const target = inMetadata ? metadata : fields;
    if (Object.hasOwn(target, entry[1]))
      throw new Error(name + ": duplicate manifest key");
    target[entry[1]] = entry[2].startsWith('"')
      ? JSON.parse(entry[2])
      : entry[2];
  }
  if (
    Object.keys(fields).sort().join(",") !== "description,license,name" ||
    Object.keys(metadata).sort().join(",") !==
      "display_name,jurisdiction,version"
  )
    throw new Error(name + ": unexpected manifest keys");
  if (
    fields.name !== name ||
    typeof fields.description !== "string" ||
    !fields.description.trim() ||
    fields.description.length > 1024 ||
    fields.license !== "Proprietary" ||
    metadata.jurisdiction !== "DE" ||
    !/^\d+\.\d+\.\d+$/.test(metadata.version) ||
    !metadata.display_name?.trim()
  )
    throw new Error(name + ": invalid skill metadata");
  const instructions = match[2].trim();
  if (instructions.length < 200 || Buffer.byteLength(instructions) > 6000)
    throw new Error(
      name + ": instructions must be focused (200 characters to 6000 bytes)",
    );
  skills.push({
    id: name,
    label: metadata.display_name,
    description: fields.description,
    version: metadata.version,
    jurisdiction: metadata.jurisdiction,
    contentHash: createHash("sha256").update(source).digest("hex"),
    instructions,
  });
}
const registry = {
  version: createHash("sha256").update(JSON.stringify(skills)).digest("hex"),
  skills,
};
const generated = JSON.stringify(registry, null, 2) + "\n",
  target = new URL("../packages/ai/src/skills.generated.json", import.meta.url);
if (process.argv.includes("--check")) {
  if (
    (await readFile(target, "utf8").catch(() => null))?.replaceAll(
      "\r\n",
      "\n",
    ) !== generated
  )
    throw new Error(
      "AI skills bundle is stale. Run node scripts/build-ai-skills.mjs and commit the generated bundle.",
    );
} else await writeFile(target, generated);
console.log(
  "Four reviewed DE skills " +
    (process.argv.includes("--check") ? "verified." : "bundled."),
);
