// prototypes/*.html を走査してマニフェスト（一覧ページの元データ）を生成する。
// 表示名・グループは names.json で管理（無いファイルはtitleで「未分類」にフォールバック）。
// デプロイ前に必ず実行される（package.json の deploy スクリプト参照）。
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const protoDir = join(root, "..", "prototypes");
const outFile = join(root, "src", "manifest.json");

const names = JSON.parse(await readFile(join(root, "names.json"), "utf8"));
// prototypes/ 直下と archive/ など1階層下のサブディレクトリを走査（assets/ は除外）
const top = await readdir(protoDir, { withFileTypes: true });
const files = [];
for (const ent of top) {
  if (ent.isFile() && /\.html?$/i.test(ent.name)) files.push(ent.name);
  else if (ent.isDirectory() && ent.name !== "assets") {
    for (const f of await readdir(join(protoDir, ent.name))) {
      if (/\.html?$/i.test(f)) files.push(`${ent.name}/${f}`);
    }
  }
}
files.sort();

const items = [];
for (const file of files) {
  const full = join(protoDir, file);
  const [html, st] = await Promise.all([readFile(full, "utf8"), stat(full)]);
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = m ? m[1].replace(/\s+/g, " ").trim() : file;
  const entry = names.pages[file];
  const order = entry ? Object.keys(names.pages).indexOf(file) : -1;
  items.push({
    file,
    title,
    name: entry?.name ?? title,
    group: entry?.group ?? "未分類",
    order,
    size: st.size,
    mtime: st.mtimeMs,
  });
}

const unmapped = items.filter((i) => i.group === "未分類").map((i) => i.file);
if (unmapped.length) console.log(`note: names.json に未登録 → 未分類: ${unmapped.join(", ")}`);

await writeFile(outFile, JSON.stringify({ groups: names.groups, items }, null, 2) + "\n");
console.log(`manifest: ${items.length} prototypes -> ${outFile}`);
