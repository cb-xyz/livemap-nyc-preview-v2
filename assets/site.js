// assets/site.js
(() => {
  const MANIFEST_PATH = "assets/manifest.csv";
  const SCREENSHOT_BASE = "assets/screenshots"; // manifest has file_all like "all/<png>"

  // ---------- tiny helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // ---------- CSV parsing (handles quoted commas) ----------
  function parseCSV(text) {
    const rows = [];
    let cur = "";
    let inQuotes = false;
    let row = [];

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"' && inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        row.push(cur);
        cur = "";
        continue;
      }
      if ((ch === "\n" || ch === "\r") && !inQuotes) {
        if (ch === "\r" && next === "\n") i++;
        row.push(cur);
        cur = "";
        if (row.length > 1 || (row[0] || "").trim() !== "") rows.push(row);
        row = [];
        continue;
      }
      cur += ch;
    }
    if (cur.length || row.length) {
      row.push(cur);
      if (row.length > 1 || (row[0] || "").trim() !== "") rows.push(row);
    }

    const headers = (rows.shift() || []).map((h) => (h || "").trim());
    return rows.map((r) => {
      const o = {};
      for (let i = 0; i < headers.length; i++) o[headers[i]] = (r[i] ?? "").trim();
      return o;
    });
  }

  // ---------- manifest loading ----------
  async function loadManifest() {
    const res = await fetch(MANIFEST_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load manifest: ${res.status} ${res.statusText}`);
    const txt = await res.text();
    const items = parseCSV(txt)
      .filter((r) => (r.status || "").toLowerCase() === "ok")
      .map((r) => normalizeManifestRow(r));
    return items;
  }

  function normalizeManifestRow(r) {
    // url in your manifest includes share.livexyz.com/maplist/... etc
    const name = r.Name || r.name || "Untitled";
    const url = r.url || r.Url || "";
    const slug = r.slug || "";
    const section = (r.section || "").trim(); // sometimes blank
    const fileAll = (r.file_all || "").trim(); // like "all/<png>"
    const fileSection = (r.file_section || "").trim();

    // Build screenshot src:
    // if fileAll already contains "all/..." then SCREENSHOT_BASE + "/" + fileAll => assets/screenshots/all/...
    const screenshot =
      fileAll
        ? `${SCREENSHOT_BASE}/${fileAll}`
        : fileSection
        ? `${SCREENSHOT_BASE}/${fileSection}`
        : "";

    return {
      name,
      url,
      slug,
      section,
      screenshot,
      raw: r,
    };
  }

  // ---------- UI rendering ----------
  function renderCards(gridEl, items, opts = {}) {
    if (!gridEl) return;
    const { showPill = true } = opts;

    gridEl.innerHTML = items
      .map((it) => {
        const img = it.screenshot
          ? `<img class="card-img" src="${esc(it.screenshot)}" alt="${esc(it.name)}" loading="lazy"
                onerror="this.style.display='none'; this.closest('.card').classList.add('noimg');" />`
          : "";

        const pill = showPill
          ? `<div class="pill">${esc(it.section || "Map")}</div>`
          : "";

        const href = it.url || "#";
        const target = href.startsWith("http") ? ` target="_blank" rel="noopener"` : "";

        return `
          <a class="card" href="${esc(href)}"${target}>
            ${img}
            <div class="card-body">
              <div class="card-top">
                <div class="card-title">${esc(it.name)}</div>
                ${pill}
              </div>
              <div class="card-sub">Open map</div>
            </div>
          </a>
        `;
      })
      .join("");
  }

  function wireSearch(inputEl, allItems, onChange) {
    if (!inputEl) return;
    inputEl.addEventListener("input", () => {
      const q = (inputEl.value || "").toLowerCase().trim();
      const filtered = !q
        ? allItems
        : allItems.filter((it) => (it.name || "").toLowerCase().includes(q));
      onChange(filtered);
    });
  }

  function setStatus(msg, type = "muted") {
    const el = $("#status");
    if (!el) return;
    el.textContent = msg;
    el.className = `status ${type}`;
  }

  // ---------- page controllers ----------
  async function init() {
    const page = document.body.getAttribute("data-page") || "home";

    let manifest = [];
    try {
      manifest = await loadManifest();
    } catch (e) {
      console.error(e);
      setStatus(`Could not load manifest.csv. Check path: ${MANIFEST_PATH}`, "bad");
      return;
    }

    // HOME
    if (page === "home") {
      setStatus(`Loaded ${manifest.length} maps`, "good");

      // “By Country” section on home is curated starter list (no manifest dependency)
      // (Your index.html defines it inline.)

      // “Featured” grid: show a handful of non-empty screenshots
      const featured = manifest.filter((m) => m.screenshot).slice(0, 18);
      renderCards($("#featuredGrid"), featured);
      return;
    }

    // EXPLORE (all maps)
    if (page === "explore") {
      setStatus(`Loaded ${manifest.length} maps`, "good");
      const grid = $("#grid");
      renderCards(grid, manifest);

      wireSearch($("#search"), manifest, (items) => {
        renderCards(grid, items);
        setStatus(`Showing ${items.length} / ${manifest.length}`, "muted");
      });
      return;
    }

    // NEIGHBORHOODS (BIDs/corridors/etc)
    if (page === "neighborhoods") {
      // If your manifest eventually adds section tags, filter here.
      // For now: heuristic filter for common corridor terms.
      const items = manifest.filter((m) =>
        /bid|district|corridor|avenue|street|partnership|alliance/i.test(m.name)
      );

      setStatus(`Loaded ${items.length} neighborhood maps`, "good");
      const grid = $("#grid");
      renderCards(grid, items);

      wireSearch($("#search"), items, (f) => {
        renderCards(grid, f);
        setStatus(`Showing ${f.length} / ${items.length}`, "muted");
      });
      return;
    }

    // COUNTRIES (you can upgrade later to real tagging)
    if (page === "countries") {
      // For now: show all maps + a country filter list (client-side stub)
      setStatus(`Loaded ${manifest.length} maps`, "good");
      const grid = $("#grid");
      renderCards(grid, manifest);

      wireSearch($("#search"), manifest, (f) => {
        renderCards(grid, f);
        setStatus(`Showing ${f.length} / ${manifest.length}`, "muted");
      });
      return;
    }

    // EVENTS
    if (page === "events") {
      setStatus(`Loaded ${manifest.length} maps`, "good");
      // If you later add real events list, wire it here.
      return;
    }

    // ABOUT
    if (page === "about") {
      setStatus(`Loaded ${manifest.length} maps`, "good");
      return;
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  // export a couple utilities for inline scripts if you want
  window.LiveMap = {
    parseCSV,
    loadManifest,
    renderCards,
    wireSearch,
  };
})();
