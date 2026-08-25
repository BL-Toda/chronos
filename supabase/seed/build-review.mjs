// supabase/seed/data/*.json → prototypes/seed-review.html を生成する
// 実行: node supabase/seed/build-review.mjs（データ更新のたびに再実行して deploy）
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "data");
const template = await readFile(join(here, "review-template.html"), "utf8");
const out = join(here, "..", "..", "prototypes", "seed-review.html");

const files = (await readdir(dataDir)).filter((f) => f.endsWith(".json")).sort();
const data = [];
for (const f of files) data.push(JSON.parse(await readFile(join(dataDir, f), "utf8")));

const authors = JSON.parse(await readFile(join(here, "AUTHORS.json"), "utf8")).authors;
const authorBySlug = {};
for (const a of authors) for (const sl of a.timelines) authorBySlug[sl] = {username: a.username, name: a.display_name};
const authorsJson = JSON.stringify(authorBySlug).replace(/</g, "\\u003c");
const json = JSON.stringify(data).replace(/</g, "\\u003c");
const stamp = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace("T", " ") + " JST";
// カバー写真プールは explore が正。ビルド時に抽出して二重管理を避ける
const explore = await readFile(join(here, "..", "..", "prototypes", "explore.html"), "utf8");
const poolMatch = explore.match(/const PHOTO_POOL=(\{[\s\S]*?\});/);
if (!poolMatch) throw new Error("PHOTO_POOL not found in explore.html");
await writeFile(out, template.replace("/*__DATA__*/[]", json).replace("/*__PHOTO_POOL__*/{}", poolMatch[1]).replace("/*__AUTHORS__*/{}", authorsJson).replace("__BUILD__", stamp));
console.log(`seed-review.html: ${data.length} timelines, ${data.reduce((n, t) => n + t.events.length, 0)} events -> ${out}`);
