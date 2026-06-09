(() => {
  const STATUS_URL = "./data/earthquake-status.json";
  const FULL_URL = "./data/latest-earthquakes.json";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function fmtTime(value) {
    if (!value) return "--";
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${y}/${m}/${day} ${hh}:${mm}`;
    } catch {
      return String(value);
    }
  }

  function safeText(v, fallback = "--") {
    return v === null || v === undefined || v === "" ? fallback : String(v);
  }

  function createStatusCard(status) {
    const latest = status.latest || {};
    const card = document.createElement("section");
    card.id = "auto-earthquake-status-card";
    card.innerHTML = `
      <style>
        #auto-earthquake-status-card{
          margin:14px auto;
          padding:14px;
          border:1px solid rgba(59,130,246,.18);
          border-radius:18px;
          background:linear-gradient(135deg,#ffffff,#eef7ff);
          box-shadow:0 8px 24px rgba(15,23,42,.08);
          color:#172033;
        }
        #auto-earthquake-status-card .eq-auto-head{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          margin-bottom:10px;
        }
        #auto-earthquake-status-card h2{
          margin:0;
          font-size:20px;
          line-height:1.25;
        }
        #auto-earthquake-status-card .eq-auto-badge{
          display:inline-flex;
          align-items:center;
          padding:5px 9px;
          border-radius:999px;
          background:#dcfce7;
          color:#166534;
          font-weight:800;
          font-size:12px;
          white-space:nowrap;
        }
        #auto-earthquake-status-card .eq-auto-grid{
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:8px;
        }
        #auto-earthquake-status-card .eq-auto-box{
          background:#fff;
          border:1px solid #dce7f3;
          border-radius:14px;
          padding:10px;
        }
        #auto-earthquake-status-card .eq-auto-box strong{
          display:block;
          font-size:18px;
          line-height:1.25;
        }
        #auto-earthquake-status-card .eq-auto-box span{
          display:block;
          margin-top:3px;
          font-size:12px;
          color:#667085;
        }
        #auto-earthquake-status-card .eq-auto-latest{
          margin-top:10px;
          padding:12px;
          border-radius:14px;
          background:#f8fbff;
          border:1px solid #e6eef8;
          font-size:14px;
          line-height:1.6;
        }
        @media(max-width:560px){
          #auto-earthquake-status-card .eq-auto-grid{grid-template-columns:repeat(2,1fr)}
          #auto-earthquake-status-card h2{font-size:18px}
        }
      </style>
      <div class="eq-auto-head">
        <h2>最新地震データ</h2>
        <div class="eq-auto-badge">${safeText(status.status, "確認中").toUpperCase()}</div>
      </div>
      <div class="eq-auto-grid">
        <div class="eq-auto-box"><strong>${safeText(status.count, 0)}</strong><span>取得件数</span></div>
        <div class="eq-auto-box"><strong>M${safeText(latest.magnitude)}</strong><span>最新M</span></div>
        <div class="eq-auto-box"><strong>${safeText(latest.intensityLabel)}</strong><span>最大震度</span></div>
        <div class="eq-auto-box"><strong>${safeText(latest.domesticTsunami, "不明")}</strong><span>津波</span></div>
      </div>
      <div class="eq-auto-latest">
        <strong>最新：</strong>${safeText(latest.area)} / ${fmtTime(latest.time)} / 深さ ${safeText(latest.depth)}km<br>
        <strong>取得：</strong>${fmtTime(status.fetched_at)}
      </div>
    `;
    return card;
  }

  function insertStatusCard(status) {
    const old = $("#auto-earthquake-status-card");
    if (old) old.remove();

    const card = createStatusCard(status);

    const h1 = $("h1");
    if (h1 && h1.parentElement) {
      const target = h1.closest("section, header, main > div, .hero") || h1.parentElement;
      target.insertAdjacentElement("afterend", card);
      return;
    }

    document.body.insertBefore(card, document.body.firstChild);
  }

  function replaceLooseText(status) {
    const latest = status.latest || {};
    const replacements = [
      [/データ更新\s*--/g, `データ更新 ${fmtTime(status.fetched_at)}`],
      [/0\s*地震数/g, `${safeText(status.count, 0)} 地震数`],
      [/-最大M/g, `M${safeText(latest.magnitude)} 最大M`],
      [/-最大震度/g, `${safeText(latest.intensityLabel)} 最大震度`],
    ];

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      let text = node.nodeValue;
      let changed = false;
      replacements.forEach(([pat, rep]) => {
        if (pat.test(text)) {
          text = text.replace(pat, rep);
          changed = true;
        }
      });
      if (changed) node.nodeValue = text;
    });
  }

  function insertLatestList(full) {
    const items = Array.isArray(full.items) ? full.items.slice(0, 5) : [];
    if (!items.length) return;

    const old = $("#auto-latest-earthquake-list");
    if (old) old.remove();

    const box = document.createElement("div");
    box.id = "auto-latest-earthquake-list";
    box.style.cssText = "margin:10px 0 16px;padding:12px;border:1px solid #e6eef8;border-radius:14px;background:#fff;font-size:14px;line-height:1.6;";
    box.innerHTML = `
      <strong>直近の地震</strong>
      ${items.map(item => `
        <div style="border-top:1px solid #edf2f7;margin-top:8px;padding-top:8px;">
          ${safeText(item.time)} / ${safeText(item.area)} / M${safeText(item.magnitude || item.mag)} / 最大震度${safeText(item.intensityLabel)}
        </div>
      `).join("")}
    `;

    const headings = $$("h2,h3").filter(h => h.textContent.includes("最新地震"));
    if (headings[0]) {
      headings[0].insertAdjacentElement("afterend", box);
    }
  }

  async function loadJson(url) {
    const res = await fetch(`${url}?ts=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    return await res.json();
  }

  async function main() {
    try {
      const status = await loadJson(STATUS_URL);
      insertStatusCard(status);
      replaceLooseText(status);

      try {
        const full = await loadJson(FULL_URL);
        insertLatestList(full);
      } catch (e) {
        console.warn("latest earthquake list load failed", e);
      }
    } catch (e) {
      console.warn("earthquake status load failed", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();