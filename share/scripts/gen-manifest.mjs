// prototypes/*.html を走査してマニフェスト（一覧ページの元データ）を生成する。
// デプロイ前に必ず実行される（package.json の deploy スクリプト参照）。
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const protoDir = join(root, "..", "prototypes");
const outFile = join(root, "src", "manifest.json");

const files = (await readdir(protoDir)).filter((f) => /\.html?$/i.test(f)).sort();

const items = [];
for (const file of files) {
  const full = join(protoDir, file);
  const [html, st] = await Promise.all([readFile(full, "utf8"), stat(full)]);
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = m ? m[1].replace(/\s+/g, " ").trim() : file;
  items.push({ file, title, size: st.size, mtime: st.mtimeMs });
}

await writeFile(outFile, JSON.stringify(items, null, 2) + "\n");
console.log(`manifest: ${items.length} prototypes -> ${outFile}`);
