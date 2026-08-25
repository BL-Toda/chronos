// Supabase に SQL ファイルを適用する。
// 接続情報は supabase/.env.local の DATABASE_URL から読む（gitignore 済み・ログには出さない）。
//
// 使い方:
//   node supabase/tools/apply-sql.mjs supabase/schema.sql
//   node supabase/tools/apply-sql.mjs supabase/seed.sql
//   node supabase/tools/apply-sql.mjs --check      # 接続確認と件数表示のみ
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");

// ── 接続情報の読み込み（値は一切表示しない）
let url = process.env.DATABASE_URL;
if (!url) {
  try {
    const env = await readFile(join(repo, "supabase", ".env.local"), "utf8");
    const m = env.match(/^\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?\s*$/m);
    if (m) url = m[1].trim();
  } catch {}
}
if (!url) {
  console.error("DATABASE_URL が見つかりません。supabase/.env.local に 1 行だけ書いてください:");
  console.error('  DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-....pooler.supabase.com:5432/postgres"');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

const counts = async () => {
  const tables = ["users", "timelines", "layers", "events", "event_sources"];
  const out = [];
  for (const t of tables) {
    try {
      const r = await client.query(`select count(*)::int as n from public.${t}`);
      out.push(`${t}=${r.rows[0].n}`);
    } catch (e) {
      out.push(`${t}=(なし)`);
    }
  }
  return out.join(" / ");
};

try {
  await client.connect();
} catch (e) {
  // 例外メッセージに接続文字列が混ざらないよう、種別だけ出す
  console.error("接続に失敗しました:", e.code || e.message.split("\n")[0]);
  process.exit(1);
}

try {
  const arg = process.argv[2];
  if (!arg || arg === "--check") {
    const v = await client.query("select current_database() as db, version() as v");
    console.log("接続OK:", v.rows[0].db, "|", v.rows[0].v.split(",")[0]);
    console.log("件数:", await counts());
  } else {
    const sql = await readFile(join(repo, arg), "utf8");
    const kb = Math.round(Buffer.byteLength(sql) / 1024);
    console.log(`適用: ${arg} (${kb}KB)`);
    const t0 = Date.now();
    await client.query(sql); // ファイル全体を1トランザクションで実行（失敗時は自動ロールバック）
    console.log(`完了 (${((Date.now() - t0) / 1000).toFixed(1)}秒)`);
    console.log("件数:", await counts());
  }
} catch (e) {
  console.error("SQLエラー:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
