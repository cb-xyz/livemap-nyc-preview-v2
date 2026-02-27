// assets/site.js
(function () {
  const MANIFEST_PATH = "assets/manifest.csv";
  const SCREENSHOT_BASE = "assets/screenshots"; // + /all/<file>

  // ---------- CSV parsing ----------
  function parseCSV(text) {
    const rows = [];
    let cur = "";
    let inQuotes = false;
    const out = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"' && inQuotes && next === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
        if (ch === "\r" && next === "\n") i++;
        out.push(cur);
        cur = "";
        if (out.length > 1 || out[0] !== "") rows.push(out.slice());
        out.length = 0;
      } else {
        cur += ch;
      }
    }
    if (cur.length || out.length) {
      out.push(cur);
      if (out.length > 1 || out[0] !== "") rows.push(out.slice());
    }

    const headers = rows.shift().map((h) => (h || "").trim());
    return rows
      .filter((r) => r.some((c) => String(c || "").trim() !== ""))
      .map((r) => {
        const obj = {};
        headers.forEach((h, idx) => (obj[h] = (r[idx] ?? "").trim()));
        return obj;
      });
  }

  async function loadManifest() {
    const res = await fetch(MANIFEST_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error(`Manifest fetch failed: ${res.status}`);
    const text = await res.text();
    return parseCSV(text);
  }

  // ---------- utils ----------
  function slugify(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function sectionLabel(section) {
    const s = (section || "").toLowerCase();
    if (s === "all") return "All";
    if (s === "countries") return "Country";
    if (s === "neighborhoods") return "Neighborhood";
    if (s === "events") return "Events";
    if (s === "explore") return "Explore";
    return "Map";
  }

  function screenshotUrl(row) {
    // manifest.csv includes file_all like: "all/<filename>.png"
    const fileAll = row.file_all || "";
    if (!fileAll) return ""; // fallback handled in UI
    return `${SCREENSHOT_BASE}/${fileAll}`; // => assets/screenshots/all/...
  }

  // ---------- rendering ----------
  function cardHTML({ title, subtitle, pill, href, img }) {
    const safeTitle = title || "";
    const safeSubtitle = subtitle || "";
    const safePill = pill || "Map";
    const safeHref = href || "#";
    const safeImg = img || "";

    return `
      <a class="card" href="${safeHref}" target="_blank" rel="noopener">
        <div class="thumb">
          ${safeImg ? `<img loading="lazy" src="${safeImg}" alt="${safeTitle}"/>` : `<div class="thumb-fallback">Map</div>`}
        </div>
        <div class="card-body">
          <div class="card-top">
            <div class="pill">${safePill}</div>
          </div>
          <div class="card-title">${safeTitle}</div>
          <div class="card-sub">${safeSubtitle}</div>
        </div>
      </a>
    `;
  }

  function renderGrid(el, items) {
    if (!el) return;
    el.innerHTML = items.map(cardHTML).join("");
  }

  function wireSearch(inputEl, allItems, onUpdate) {
    if (!inputEl) return;
    inputEl.addEventListener("input", () => {
      const q = inputEl.value.trim().toLowerCase();
      const filtered = !q
        ? allItems
        : allItems.filter((x) =>
            (x.title || "").toLowerCase().includes(q)
          );
      onUpdate(filtered);
    });
  }

  // ---------- page-specific loaders ----------
  async function boot() {
    const page = document.body.getAttribute("data-page");
    if (!page) return;

    let rows = [];
    try {
      rows = await loadManifest();
    } catch (e) {
      console.error(e);
      const err = document.getElementById("loadError");
      if (err) err.style.display = "block";
      return;
    }

    // normalize rows
    const maps = rows
      .filter((r) => (r.status || "").toLowerCase() === "ok")
      .map((r) => ({
        rowIndex: r.rowIndex,
        name: r.Name,
        section: (r.section || "").toLowerCase(),
        url: r.url,
        slug: r.slug || slugify(r.Name),
        img: screenshotUrl(r),
      }));

    if (page === "home") {
      // Share maps: choose some top “all” items as featured
      const featured = maps
        .filter((m) => m.section === "all")
        .slice(0, 12)
        .map((m) => ({
          title: m.name,
          subtitle: "Open map",
          pill: "Share Map",
          href: m.url,
          img: m.img,
        }));

      const countries = maps
        .filter((m) => m.section === "countries")
        .slice(0, 24)
        .map((m) => ({
          title: m.name,
          subtitle: "Open country guide",
          pill: "Country",
          href: m.url,
          img: m.img,
        }));

      const fg = document.getElementById("featuredGrid");
      renderGrid(fg, featured);

      const cg = document.getElementById("countryGrid");
      renderGrid(cg, countries);

      wireSearch(
        document.getElementById("countrySearch"),
        countries,
        (items) => renderGrid(cg, items)
      );
      return;
    }

    // Generic listing pages
    const sectionWanted = page; // explore/countries/neighborhoods/events
    const subset = maps
      .filter((m) => m.section === sectionWanted)
      .map((m) => ({
        title: m.name,
        subtitle: "Open map",
        pill: sectionLabel(m.section),
        href: m.url,
        img: m.img,
      }));

    const grid = document.getElementById("grid");
    renderGrid(grid, subset);

    wireSearch(
      document.getElementById("search"),
      subset,
      (items) => renderGrid(grid, items)
    );

    const count = document.getElementById("count");
    if (count) count.textContent = `${subset.length} maps`;
  }

  window.addEventListener("DOMContentLoaded", boot);

  // expose for debugging if needed
  window.__livemap = { loadManifest };
})();
