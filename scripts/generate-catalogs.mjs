/**
 * One-shot generator: reads WFCD All.json and writes static ducat + relic catalogs.
 *
 * Usage:
 *   node scripts/generate-catalogs.mjs [path/to/All.json]
 *
 * Default input: %TEMP%/wfcd-all.json (or /tmp/wfcd-all.json).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const inputPath =
  process.argv[2] ??
  path.join(os.tmpdir(), "wfcd-all.json");

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

const items = JSON.parse(fs.readFileSync(inputPath, "utf8"));
if (!Array.isArray(items)) {
  throw new Error(`Expected array in ${inputPath}`);
}

const ducatByUrl = new Map();
const ducatByName = new Map();

function addDucat(name, ducats, urlName) {
  if (!name || typeof ducats !== "number" || ducats <= 0) return;
  const url = urlName || slugify(name);
  const prev = ducatByUrl.get(url);
  if (prev === undefined || prev < ducats) {
    ducatByUrl.set(url, ducats);
  }
  const norm = name.toLowerCase();
  if (!ducatByName.has(norm)) {
    ducatByName.set(norm, { name, ducats, urlName: url });
  }
}

const SHORT_COMPONENT =
  /^(Blueprint|Chassis|Neuroptics|Systems|Barrel|Receiver|Stock|Blade|Handle|Grip|Link|Head|Hilt|Gauntlet|Lower Limb|Upper Limb|String|Guard|Pouch|Stars|Boot|Chain|Ornament)$/i;

for (const item of items) {
  if (typeof item.ducats === "number" && item.ducats > 0) {
    addDucat(item.name, item.ducats, item.warframeMarket?.urlName);
  }
  if (!Array.isArray(item.components)) continue;
  for (const component of item.components) {
    if (typeof component.ducats !== "number" || component.ducats <= 0) continue;
    const resolved = SHORT_COMPONENT.test(component.name)
      ? `${item.name} ${component.name}`
      : component.name;
    addDucat(resolved, component.ducats, component.warframeMarket?.urlName);
  }
}

for (const item of items) {
  if (item.category !== "Relics" || !Array.isArray(item.rewards)) continue;
  for (const reward of item.rewards) {
    const url = reward.item?.warframeMarket?.urlName;
    const name = reward.item?.name;
    if (!url || !name) continue;
    const known = ducatByName.get(name.toLowerCase());
    if (known) {
      ducatByUrl.set(url, known.ducats);
    }
  }
}

const ducatEntries = [...ducatByUrl.entries()]
  .map(([urlName, ducats]) => ({ urlName, ducats }))
  .sort((a, b) => a.urlName.localeCompare(b.urlName));

const radiantByBase = new Map();
for (const item of items) {
  if (
    item.category === "Relics" &&
    typeof item.name === "string" &&
    item.name.endsWith(" Radiant")
  ) {
    radiantByBase.set(item.name.replace(/ Radiant$/, ""), item);
  }
}

const relics = [];
for (const relic of items) {
  if (
    relic.category !== "Relics" ||
    typeof relic.name !== "string" ||
    !relic.name.endsWith(" Intact")
  ) {
    continue;
  }

  const base = relic.name.replace(/ Intact$/, "");
  const parts = base.split(" ");
  const era = parts[0];
  const code = parts.slice(1).join(" ");

  const radiant = radiantByBase.get(base);
  const radiantChances = new Map();
  if (Array.isArray(radiant?.rewards)) {
    for (const reward of radiant.rewards) {
      const url = reward.item?.warframeMarket?.urlName;
      const name = reward.item?.name;
      if (url) radiantChances.set(url, reward.chance);
      if (name) radiantChances.set(name, reward.chance);
    }
  }

  const drops = (relic.rewards ?? [])
    .map((reward) => ({
      name: reward.item?.name ?? null,
      urlName: reward.item?.warframeMarket?.urlName ?? null,
      rarity: reward.rarity,
      chanceIntact: reward.chance,
      chanceRadiant:
        radiantChances.get(reward.item?.warframeMarket?.urlName) ??
        radiantChances.get(reward.item?.name) ??
        null,
    }))
    .filter((drop) => drop.name);

  relics.push({
    name: base,
    era,
    code,
    vaulted: Boolean(relic.vaulted),
    drops,
  });
}

relics.sort((a, b) => a.name.localeCompare(b.name));

const outDir = path.join(root, "src", "lib", "dashboard", "data");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "ducats.json"), JSON.stringify(ducatEntries, null, 2));
fs.writeFileSync(path.join(outDir, "relics.json"), JSON.stringify(relics, null, 2));

console.log(`Wrote ${ducatEntries.length} ducat rows, ${relics.length} relics → ${outDir}`);
