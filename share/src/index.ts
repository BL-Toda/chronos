// Chronos プロトタイプ共有（Cloudflare Workers + 静的アセット）
// - 共有パスワード1つでログイン → 関係者だけが閲覧可能（eコンシェルのmockup-shareと同方式）
// - リポジトリの prototypes/ をそのまま配信。deployするだけで常に最新版が見られる
// - "/" は一覧ページ（manifest.json はデプロイ時に scripts/gen-manifest.mjs が生成）

import manifest from "./manifest.json";

export interface Env {
  // prototypes/ を配信する静的アセットバインディング
  ASSETS: Fetcher;
  // 関係者で共有する閲覧パスワード（wrangler secret put SHARE_PASSWORD で設定）
  SHARE_PASSWORD: string;
  // セッションCookieの署名鍵（wrangler secret put SESSION_SECRET で設定）
  SESSION_SECRET: string;
}

interface ManifestItem {
  file: string;
  title: string;
  size: number;
  mtime: number;
}

const COOKIE_NAME = "chronos_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7日間

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    // 初回セットアップ漏れのチェック
    if (!env.SHARE_PASSWORD || !env.SESSION_SECRET) {
      return htmlResponse(setupPage(), 500);
    }

    const url = new URL(req.url);
    const path = url.pathname;

    // 認証不要なルート（ログイン処理・共通アセット）
    if (path === "/login" && req.method === "POST") return handleLogin(req, env);
    if (path === "/logout" && req.method === "POST") return handleLogout();
    // ロゴ等の共通アセットはログイン画面でも使うため認証の外に置く
    if (path.startsWith("/assets/") && req.method === "GET") return env.ASSETS.fetch(req);

    // ここから先はログイン必須（関係者だけ）
    const authed = await isAuthed(req, env);
    if (!authed) {
      if (req.method === "GET") {
        return htmlResponse(loginPage(url.searchParams.get("e") === "1"));
      }
      return new Response("Unauthorized", { status: 401 });
    }

    // 一覧ページ
    if (path === "/" && req.method === "GET") return htmlResponse(indexPage());

    // それ以外は prototypes/ の静的アセットをそのまま返す
    return env.ASSETS.fetch(req);
  },
};

// ───────────────────────── 認証まわり ─────────────────────────

async function handleLogin(req: Request, env: Env): Promise<Response> {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  if (!constantTimeEqual(password, env.SHARE_PASSWORD)) {
    return redirect("/?e=1");
  }
  const token = await createSession(env);
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`,
    },
  });
}

function handleLogout(): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
    },
  });
}

async function isAuthed(req: Request, env: Env): Promise<boolean> {
  const token = getCookie(req, COOKIE_NAME);
  if (!token) return false;
  return verifySession(token, env);
}

async function createSession(env: Env): Promise<string> {
  const exp = Date.now() + SESSION_TTL_MS;
  const sig = await hmac(String(exp), env.SESSION_SECRET);
  return `${exp}.${sig}`;
}

async function verifySession(token: string, env: Env): Promise<boolean> {
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const expStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = await hmac(expStr, env.SESSION_SECRET);
  return constantTimeEqual(sig, expected);
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64url(new Uint8Array(sig));
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// タイミング攻撃を避けるための定数時間比較
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

// ───────────────────────── レスポンスヘルパ ─────────────────────────

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location } });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ───────────────────────── 画面（HTML） ─────────────────────────

// Chronosデザイントークン（CLAUDE.md準拠）
const BASE_CSS = `
  :root{
    --bg:#0A0A0C; --card:#16161A; --accent:#C8A87E;
    --text:#E8E4DE; --text2:#8A8680; --border:#26262C;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);
    font-family:"DM Sans","Noto Sans JP",-apple-system,BlinkMacSystemFont,sans-serif;
    line-height:1.7;-webkit-font-smoothing:antialiased;}
  a{color:var(--text);text-decoration:none}
  .serif{font-family:"Erode",serif;font-weight:500}
  .mono{font-family:"JetBrains Mono",monospace}
`;

const FONT_LINKS = `
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+JP:wght@400;500&display=swap" rel="stylesheet">
<link href="https://api.fontshare.com/v2/css?f[]=erode@500&display=swap" rel="stylesheet">`;

function loginPage(error: boolean): string {
  return `<!doctype html><html lang="ja"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Chronos — Prototypes</title>
${FONT_LINKS}
<style>${BASE_CSS}
.wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:48px 40px;width:100%;max-width:400px}
/* ロゴはSVGがぴったりサイズのため、高さの50%を上下左右のアイソレーション（余白）として確保する */
.logo{display:block;height:36px;width:auto;margin:18px 18px 50px 0}
p.sub{color:var(--text2);font-size:13px;margin:0 0 32px}
label{display:block;font-size:12px;color:var(--text2);letter-spacing:.08em;margin-bottom:10px}
input{width:100%;padding:13px 15px;border:1px solid var(--border);border-radius:10px;font-size:15px;
  font-family:inherit;background:var(--bg);color:var(--text)}
input:focus{outline:none;border-color:var(--accent)}
.err{color:#D4849A;font-size:13px;margin:14px 0 0}
button{width:100%;margin-top:24px;padding:13px;border:none;border-radius:10px;background:var(--accent);
  color:#0A0A0C;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;letter-spacing:.04em;transition:.15s}
button:hover{opacity:.88}
</style></head><body>
<div class="wrap"><form class="card" method="POST" action="/login">
<img class="logo" src="/assets/chronos-logo.svg" alt="Chronos">
<p class="sub">関係者専用のプロトタイプ確認ページです。共有パスワードを入力してください。</p>
<label for="password">SHARED PASSWORD</label>
<input id="password" name="password" type="password" autocomplete="current-password" autofocus required>
${error ? '<p class="err">パスワードが違います。</p>' : ""}
<button type="submit">ログイン</button>
</form></div></body></html>`;
}

function indexPage(): string {
  const items = (manifest as ManifestItem[])
    .slice()
    .sort((a, b) => b.mtime - a.mtime);
  const rows = items
    .map((it) => {
      const kb = (it.size / 1024).toFixed(0);
      const date = new Date(it.mtime).toLocaleDateString("ja-JP", {
        year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Tokyo",
      });
      return `<a class="row" href="/${encodeURIComponent(it.file)}" target="_blank" rel="noopener" data-q="${escapeHtml((it.title + " " + it.file).toLowerCase())}">
<span class="t">${escapeHtml(it.title)}</span>
<span class="f mono">${escapeHtml(it.file)}</span>
<span class="m mono">${kb} KB ・ ${date}</span>
</a>`;
    })
    .join("\n");

  return `<!doctype html><html lang="ja"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Chronos — Prototypes</title>
${FONT_LINKS}
<style>${BASE_CSS}
.container{max-width:880px;margin:0 auto;padding:32px 24px 96px}
header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 0 32px;
  margin-bottom:28px;border-bottom:1px solid var(--border)}
/* ロゴのアイソレーション：高さの50%以上を周囲に確保（headerのpadding/gapで担保） */
.brand{display:flex;align-items:center;gap:14px;margin:0}
.brand img{display:block;height:26px;width:auto}
.brand small{font-size:11px;letter-spacing:.06em;color:var(--text2);margin-left:13px}
.logout{background:none;border:1px solid var(--border);border-radius:8px;color:var(--text2);
  font-size:12px;font-family:inherit;padding:7px 14px;cursor:pointer;transition:.15s}
.logout:hover{border-color:var(--accent);color:var(--text)}
.toolbar{display:flex;align-items:center;gap:12px;margin-bottom:20px}
.toolbar input{flex:1;padding:11px 15px;border:1px solid var(--border);border-radius:10px;font-size:14px;
  font-family:inherit;background:var(--card);color:var(--text)}
.toolbar input:focus{outline:none;border-color:var(--accent)}
.count{font-size:12px;color:var(--text2);white-space:nowrap}
.list{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:14px;overflow:hidden}
.row{display:grid;grid-template-columns:1fr auto auto;gap:18px;align-items:center;
  padding:15px 20px;background:var(--card);border-bottom:1px solid var(--border);transition:.15s}
.row:last-child{border-bottom:none}
.row:hover{background:#1C1C22}
.row .t{font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row .f{font-size:11px;color:var(--text2);white-space:nowrap}
.row .m{font-size:11px;color:var(--text2);white-space:nowrap}
.row[hidden]{display:none}
.empty{color:var(--text2);text-align:center;padding:48px 0;font-size:13px}
@media (max-width:640px){.row{grid-template-columns:1fr}.row .f,.row .m{display:none}}
</style></head><body>
<div class="container">
<header>
  <h1 class="brand"><img src="/assets/chronos-logo.svg" alt="Chronos"><small>Prototypes</small></h1>
  <form method="POST" action="/logout"><button class="logout" type="submit">ログアウト</button></form>
</header>
<div class="toolbar">
  <input id="search" type="search" placeholder="検索（タイトル・ファイル名）" autocomplete="off">
  <span id="count" class="count"></span>
</div>
<div class="list" id="list">
${rows}
</div>
<p class="empty" id="empty" hidden>該当するプロトタイプがありません。</p>
</div>
<script>
var rows=[].slice.call(document.querySelectorAll('.row'));
var count=document.getElementById('count');
var empty=document.getElementById('empty');
function apply(){
  var q=(document.getElementById('search').value||'').toLowerCase().trim();
  var n=0;
  rows.forEach(function(r){
    var hit=!q||r.getAttribute('data-q').indexOf(q)>=0;
    r.hidden=!hit;if(hit)n++;
  });
  count.textContent=n+' / '+rows.length+' 件';
  empty.hidden=n>0;
  document.getElementById('list').style.display=n>0?'':'none';
}
document.getElementById('search').addEventListener('input',apply);
apply();
</script>
</body></html>`;
}

function setupPage(): string {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>セットアップが必要です</title>
<style>${BASE_CSS}.w{max-width:560px;margin:60px auto;padding:0 20px}code{background:var(--card);border:1px solid var(--border);border-radius:6px;padding:2px 6px}</style>
</head><body><div class="w">
<h1>セットアップが必要です</h1>
<p>環境変数が未設定です。share/ ディレクトリで以下を実行してください：</p>
<pre><code>npx wrangler secret put SHARE_PASSWORD
npx wrangler secret put SESSION_SECRET</code></pre>
</div></body></html>`;
}
