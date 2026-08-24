// supabase/seed/data/*.json → prototypes/chronos-seed-review.html を生成する
// 実行: node supabase/seed/build-review.mjs（データ更新のたびに再実行して deploy）
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "data");
const template = await readFile(join(here, "review-template.html"), "utf8");
const out = join(here, "..", "..", "prototypes", "chronos-seed-review.html");

const files = (await readdir(dataDir)).filter((f) => f.endsWith(".json")).sort();
const data = [];
for (const f of files) data.push(JSON.parse(await readFile(join(dataDir, f), "utf8")));

const json = JSON.stringify(data).replace(/</g, "\\u003c");
const stamp = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace("T", " ") + " JST";
await writeFile(out, template.replace("/*__DATA__*/[]", json).replace("__BUILD__", stamp));
console.log(`chronos-seed-review.html: ${data.length} timelines, ${data.reduce((n, t) => n + t.events.length, 0)} events -> ${out}`);
