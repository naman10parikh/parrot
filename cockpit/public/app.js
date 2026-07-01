// cockpit/public/app.js — parrot cockpit SPA (vanilla JS, zero framework; PLAN §10).
// Four views (brain / runs / evals / ask) each fetch parrot's REAL API and render. Endpoints (from
// cockpit/server.mjs): /api/brain?q= · /api/brain/files · /api/brain/file?name= · /api/runs ·
// /api/eval?level= · /api/ci-blocking · POST /api/action · /ar-proof.
// The RTL-proof panel is the load-bearing one (G2): it renders the real dir="rtl" /ar/ DOM.

// ── tiny DOM helpers ──────────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
// Escape text so brain markdown / CLI output can never inject HTML into the page.
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
async function getJson(url) {
  const r = await fetch(url);
  const data = await r.json().catch(() => ({ error: `bad JSON from ${url}` }));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

// ── nav ──────────────────────────────────────────────────────────────────────────────
const loaded = {}; // lazy-load each view once
function showView(name) {
  $$(".view").forEach((v) => v.classList.add("hidden"));
  $("#view-" + name).classList.remove("hidden");
  $$("#nav button").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  if (!loaded[name]) {
    loaded[name] = true;
    if (name === "brain") loadBrain();
    if (name === "runs") loadRuns();
    if (name === "evals") loadEvals();
    if (name === "ask") setupAsk();
  }
}
$$("#nav button").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));

// ── view 1: brain browser ──────────────────────────────────────────────────────────────
async function loadBrain() {
  try {
    const { files } = await getJson("/api/brain/files"); // → ["EXPERTISE-MAP", …] (6 names)
    const list = $("#brain-list");
    list.innerHTML = "";
    files.forEach((name) => {
      const btn = document.createElement("button");
      btn.className = "file";
      btn.textContent = name;
      btn.addEventListener("click", () => {
        $$(".brain-list .file").forEach((x) => x.classList.remove("active"));
        btn.classList.add("active");
        openBrainFile(name);
      });
      list.appendChild(btn);
    });
    // open the first one by default so the view is never empty
    if (files[0]) {
      list.firstChild.classList.add("active");
      openBrainFile(files[0]);
    }
  } catch (err) {
    $("#brain-list").innerHTML = `<div class="error-box">${esc(err.message)}</div>`;
  }
}
async function openBrainFile(name) {
  const pane = $("#brain-content");
  pane.innerHTML = '<span class="loading">loading…</span>';
  try {
    const { markdown } = await getJson("/api/brain/file?name=" + encodeURIComponent(name));
    pane.innerHTML = `<pre>${esc(markdown)}</pre>`;
    pane.scrollTop = 0;
  } catch (err) {
    pane.innerHTML = `<div class="error-box">${esc(err.message)}</div>`;
  }
}
async function runBrainSearch() {
  const q = $("#brain-q").value.trim();
  const out = $("#brain-results");
  if (!q) {
    out.innerHTML = "";
    return;
  }
  out.innerHTML = '<span class="loading">searching the brain (BM25)…</span>';
  try {
    const { hits } = await getJson("/api/brain?q=" + encodeURIComponent(q)); // → {query, hits:[{file,heading,score,snippet}]}
    if (!hits.length) {
      out.innerHTML = `<div class="card muted">No brain hits for "${esc(q)}".</div>`;
      return;
    }
    out.innerHTML =
      '<div class="card"><h3>BM25 hits</h3>' +
      hits
        .map(
          (h) =>
            `<div class="hit"><span class="f">${esc(h.file)}</span><span class="s">score ${esc(
              (h.score || 0).toFixed ? h.score.toFixed(2) : h.score,
            )}</span>${h.heading ? `<div class="h">${esc(h.heading)}</div>` : ""}${
              h.snippet ? `<div class="snippet">${esc(h.snippet)}</div>` : ""
            }</div>`,
        )
        .join("") +
      "</div>";
  } catch (err) {
    out.innerHTML = `<div class="error-box">${esc(err.message)}</div>`;
  }
}
$("#brain-search-btn").addEventListener("click", runBrainSearch);
$("#brain-q").addEventListener("keydown", (e) => {
  if (e.key === "Enter") runBrainSearch();
});

// ── view 2: run log ──────────────────────────────────────────────────────────────────────
async function loadRuns() {
  try {
    const { aggregate, recent } = await getJson("/api/runs"); // → {aggregate:{total,commands[]}, recent[]}
    const cmds = aggregate && Array.isArray(aggregate.commands) ? aggregate.commands : [];
    const pass = cmds.reduce((n, c) => n + (c.pass || 0), 0);
    const fail = cmds.reduce((n, c) => n + (c.fail || 0), 0);
    const err = cmds.reduce((n, c) => n + (c.error || 0), 0);
    const stats = $("#runs-stats");
    stats.innerHTML = [
      ["total", (aggregate && aggregate.total) || 0],
      ["pass", pass],
      ["fail", fail],
      ["error", err],
    ]
      .map(([l, n]) => `<div class="stat"><div class="n">${esc(n)}</div><div class="l">${l}</div></div>`)
      .join("");
    const tb = $("#runs-tbody");
    if (!recent || !recent.length) {
      tb.innerHTML = '<tr><td colspan="7" class="faint">no runs yet — invoke the CLI to populate logs/runs.jsonl</td></tr>';
      return;
    }
    tb.innerHTML = recent
      .map((r) => {
        const t = (r.ts || "").replace("T", " ").replace(/\..*$/, "");
        const ok = r.outcome === "ok" || r.outcome === "pass";
        return `<tr>
          <td class="mono">${esc(t)}</td>
          <td class="cmd">${esc(r.cmd)}</td>
          <td>${esc(r.jtbd)}</td>
          <td class="mono faint">${esc(r.model)}</td>
          <td>${esc(r.duration_ms)}</td>
          <td class="${ok ? "ok" : "err"}">${esc(r.outcome)}</td>
          <td>${esc(r.findings_count == null ? "" : r.findings_count)}</td>
        </tr>`;
      })
      .join("");
  } catch (err) {
    $("#runs-tbody").innerHTML = `<tr><td colspan="7"><div class="error-box">${esc(err.message)}</div></td></tr>`;
  }
}

// ── view 3: eval scores ──────────────────────────────────────────────────────────────────
async function loadEvals() {
  const body = $("#evals-body");
  try {
    // level 2 = the blocking golden gate (needs dist/); server surfaces an honest error if unbuilt.
    const e = await getJson("/api/eval?level=2");
    let blocking = [];
    try {
      blocking = (await getJson("/api/ci-blocking")).blocking || [];
    } catch {
      /* the badge just omits the CI marks if the set is unavailable */
    }
    if (e.error && e.green == null) {
      body.innerHTML = `<div class="card"><h3>Eval</h3><div class="error-box">${esc(
        e.error,
      )}</div><p class="faint">Run <code class="mono">pnpm build</code> then reload — L2 imports the compiled lib.</p></div>`;
      return;
    }
    const gateCls = e.green === true ? "green" : e.green === false ? "red" : "unknown";
    const l1 = Array.isArray(e.l1) ? e.l1 : [];
    const l2 = Array.isArray(e.l2) ? e.l2 : [];
    const l1html =
      `<ul class="checklist">` +
      l1.map((a) => `<li class="${a.ok ? "" : "fail"}">${esc(a.name)}</li>`).join("") +
      `</ul>`;
    const blockingSet = new Set(blocking);
    const l2html =
      `<div class="task-grid">` +
      l2
        .map((g) => {
          const id = g.id || g.task || g.name || "?";
          const ok = g.ok != null ? g.ok : g.pass != null ? g.pass : (g.f1 || 0) >= 0.8;
          const f1 = g.f1 != null ? (g.f1.toFixed ? g.f1.toFixed(2) : g.f1) : "";
          return `<span class="task ${ok ? "pass" : "fail"}">${esc(id)}${f1 !== "" ? ` F1=${esc(f1)}` : ""}${
            blockingSet.has(id) ? '<span class="ci">CI</span>' : ""
          }</span>`;
        })
        .join("") +
      `</div>`;
    body.innerHTML = `
      <div class="card">
        <h3>The gate
          <span class="gate-badge ${gateCls}" style="margin-left:10px">${esc(
            e.green === true ? "GREEN" : e.green === false ? "RED" : "?",
          )}</span>
        </h3>
        <p class="muted">level <span class="amber">${esc(e.level)}</span> &nbsp;·&nbsp;
          F1 = <span class="${(e.f1 || 0) >= 0.8 ? "green" : "red"}">${esc(
            e.f1 != null ? (e.f1.toFixed ? e.f1.toFixed(3) : e.f1) : "—",
          )}</span> (bar ≥ 0.8) &nbsp;·&nbsp;
          blocking failures: <span class="${e.blockingFail ? "red" : "green"}">${esc(
            e.blockingFail == null ? "—" : e.blockingFail,
          )}</span> &nbsp;·&nbsp; ${esc(blocking.length)} CI-blocking golden tasks</p>
        ${e.l3 && e.l3.note ? `<p class="faint">${esc(e.l3.note)}</p>` : ""}
      </div>
      <div class="card"><h3>L1 — structural assertions</h3>${l1.length ? l1html : '<p class="faint">no L1 assertions returned</p>'}</div>
      <div class="card"><h3>L2 — golden tasks</h3>${l2.length ? l2html : '<p class="faint">no L2 tasks returned (build dist/ for the golden gate)</p>'}</div>`;
  } catch (err) {
    body.innerHTML = `<div class="error-box">${esc(err.message)}</div>`;
  }
}

// ── view 4: ask the employee ─────────────────────────────────────────────────────────────
function setupAsk() {
  $("#ask-btn").addEventListener("click", ask);
  $("#rtl-btn").addEventListener("click", renderRtlProof);
}

async function ask() {
  const verb = $("#ask-verb").value;
  const dir = $("#ask-dir").value.trim() || "eval/fixtures/app";
  const out = $("#ask-answer");
  out.innerHTML = `<span class="loading">parrot is thinking (running \`parrot ${esc(verb)}\`)…</span>`;
  try {
    const body = verb === "check" ? { action: "check", dir } : { action: "pick" };
    const r = await fetch("/api/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    const okVerdict = data.exit === 0;
    out.innerHTML = `
      <div class="card">
        <h3>parrot ${esc(verb)}
          <span class="verdict ${okVerdict ? "pass" : "fail"}">exit ${esc(data.exit)}${
            okVerdict ? " · clean" : " · finding/gate"
          }</span>
        </h3>
        ${verb === "check" ? `<p class="muted">dir <code class="mono">${esc(data.dir || dir)}</code></p>` : ""}
        <div class="check-out">${esc(data.output || "(no output)")}</div>
        <div class="disclaimer-line">parrot reports the verdict on the locale tree — it validates and routes; it never authors the source copy.</div>
      </div>`;
  } catch (err) {
    out.innerHTML = `<div class="error-box">${esc(err.message)}</div>`;
  }
}

// Render the real /ar-proof DOM inside an iframe — the chairman SEES <html dir="rtl"> + distinct plurals.
function renderRtlProof() {
  const holder = $("#rtl-holder");
  holder.innerHTML = '<iframe class="rtl-frame" src="/ar-proof" title="parrot /ar/ RTL render proof"></iframe>';
}

// boot: open the default view
showView("brain");
