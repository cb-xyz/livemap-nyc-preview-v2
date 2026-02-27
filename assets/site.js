/* assets/site.js — livemap.nyc preview v3
   - Loads assets/manifest.csv
   - Renders cards with screenshot cover images (falls back to screenshots/all)
   - No external API calls (avoids CORS issues you saw)
*/

const SITE = {
  basePath: "", // for GitHub Pages project sites, leave "" and use relative paths
  manifestPath: "assets/manifest.csv",
  screenshotsRoot: "assets/screenshots",
  defaultScreenshotFolder: "all",
  theme: "dark",
};

function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseCSV(text) {
  // Minimal CSV parser that supports quoted fields and commas/newlines inside quotes.
  const rows = [];
  let i = 0, field = "", row = [], inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"' && inQuotes && next === '"') { field += '"'; i += 2; continue; }
    if (c === '"') { inQuotes = !inQuotes; i++; continue; }

    if (!inQuotes && c === ",") { row.push(field); field = ""; i++; continue; }
    if (!inQuotes && (c === "\n" || c === "\r")) {
      if (c === "\r" && next === "\n") i++;
      row.push(field); field = "";
      if (row.some(v => v !== "")) rows.push(row);
      row = [];
      i++;
      continue;
    }

    field += c; i++;
  }
  row.push(field);
  if (row.some(v => v !== "")) rows.push(row);
  return rows;
}

async function loadManifest() {
  const res = await fetch(SITE.manifestPath, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load manifest: ${res.status}`);
  const text = await res.text();
  const rows = parseCSV(text);
  if (!rows.length) return [];

  const headers = rows[0].map(h => (h || "").trim());
  const data = rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? "").trim(); });
    return obj;
  });

  // Normalize expected fields (support a few header variants)
  // We will prefer Share Url (dark) if present, else Share Url, else any URL-like field.
  const urlFieldCandidates = [
    "Share Url (dark)",
    "Share URL (dark)",
    "Share Url",
    "Share URL",
    "Url",
    "URL",
    "Link",
  ];

  const bestUrlField = urlFieldCandidates.find(f => headers.includes(f)) || null;

  return data.map((row, idx) => {
    const name = row["Name"] || row["Map"] || row["Title"] || `Row ${idx + 2}`;
    const url = bestUrlField
      ? row[bestUrlField]
      : (Object.values(row).find(v => /^https?:\/\//i.test(v)) || "");

    // Screenshot filename: your script generated filenames like:
    // <id>__<slug>.png OR noid_<...>__<slug>.png
    // Manifest usually contains Screenshot Path or Screenshot File. If not, we derive from URL id.
    const screenshotFile =
      row["Screenshot File"] ||
      row["Screenshot"] ||
      row["Screenshot Path"] ||
      "";

    const id =
      row["Id"] ||
      row["Map Id"] ||
      (url.match(/\/maplist\/([a-z0-9]+)/i)?.[1] || "");

    return {
      _idx: idx,
      name,
      url,
      id,
      // keep all original fields around for future logic
      raw: row,
      screenshotFile,
    };
  }).filter(x => x.url); // only rows with URLs
}

function inferCategory(item) {
  // You can tune this later. For now:
  // - if name contains "BID" or looks like corridor -> neighborhoods
  // - if name matches known country list -> countries
  // - if contains "event" -> events
  // - else -> explore/all
  const n = (item.name || "").toLowerCase();

  const countryHints = [
    "japan","france","mexico","ireland","italy","spain","brazil","argentina","colombia",
    "korea","china","taiwan","thailand","vietnam","philippines","india","pakistan",
    "bangladesh","nepal","greece","turkey","egypt","morocco","nigeria","ghana","ethiopia",
    "uk","england","scotland","wales","germany","poland","ukraine","russia","israel",
    "palestine","lebanon","syria","iran","iraq"
  ];

  if (n.includes(" bid") || n.endsWith(" bid") || n.includes(" corridor") || n.includes(" avenue") || n.includes(" partnership")) {
    return "neighborhoods";
  }
  if (n.includes("event") || n.includes("festival") || n.includes("parade") || n.includes("concert")) {
    return "events";
  }
  if (countryHints.some(c => n.includes(c))) {
    return "countries";
  }
  return "explore";
}

function buildScreenshotPath(item, preferredFolder) {
  // 1) If manifest provides an explicit screenshotFile/path, use it relative to assets/ if needed.
  if (item.screenshotFile) {
    // If they stored an absolute-ish path, strip to filename
    const file = item.screenshotFile.split("/").pop();
    // Assume it lives in /assets/screenshots/all by default unless the path already includes screenshots/
    if (item.screenshotFile.includes("assets/")) return item.screenshotFile;
    if (item.screenshotFile.includes("screenshots/")) return item.screenshotFile.startsWith("assets/") ? item.screenshotFile : `assets/${item.screenshotFile}`;
    return `${SITE.screenshotsRoot}/${SITE.defaultScreenshotFolder}/${file}`;
  }

  // 2) Try to match by id__slug pattern
  const slug = slugify(item.name);
  const id = item.id ? String(item.id).toLowerCase() : "";

  const candidates = [];

  if (id) candidates.push(`${SITE.screenshotsRoot}/${preferredFolder}/${id}__${slug}.png`);
  if (id) candidates.push(`${SITE.screenshotsRoot}/${SITE.defaultScreenshotFolder}/${id}__${slug}.png`);

  if (id) candidates.push(`${SITE.screenshotsRoot}/${preferredFolder}/${id}__${slug}.jpg`);
  if (id) candidates.push(`${SITE.screenshotsRoot}/${SITE.defaultScreenshotFolder}/${id}__${slug}.jpg`);

  // 3) fallback: noid__slug pattern
  candidates.push(`${SITE.screenshotsRoot}/${preferredFolder}/noid__${slug}.png`);
  candidates.push(`${SITE.screenshotsRoot}/${SITE.defaultScreenshotFolder}/noid__${slug}.png`);

  // We can’t check existence synchronously without extra fetches,
  // so return first candidate and use <img onerror> fallback in DOM.
  return candidates[0];
}

function cardHTML(item, folder) {
  const safeName = escapeHtml(item.name);
  const safeUrl = escapeHtml(item.url);
  const img1 = buildScreenshotPath(item, folder);
  const imgFallback = `${SITE.screenshotsRoot}/${SITE.defaultScreenshotFolder}/${slugify(item.name)}.png`;

  return `
    <a class="card card-link" href="${safeUrl}" target="_blank" rel="noopener">
      <div class="card-media">
        <img
          loading="lazy"
          src="${img1}"
          alt="${safeName}"
          onerror="this.onerror=null;this.src='${imgFallback}';"
        />
      </div>
      <div class="card-body">
        <div class="card-title">${safeName}</div>
        <div class="card-sub">Open map</div>
      </div>
    </a>
  `;
}

function renderGrid(el, items, folder) {
  if (!el) return;
  el.innerHTML = items.map(it => cardHTML(it, folder)).join("");
}

function wireSearch(inputEl, items, onUpdate) {
  if (!inputEl) return;
  inputEl.addEventListener("input", () => {
    const q = (inputEl.value || "").trim().toLowerCase();
    const filtered = !q
      ? items
      : items.filter(it => (it.name || "").toLowerCase().includes(q));
    onUpdate(filtered);
  });
}

function groupByFirstLetter(items) {
  const groups = {};
  for (const it of items) {
    const letter = (it.name || "#").trim().charAt(0).toUpperCase() || "#";
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(it);
  }
  return Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0]));
}

async function bootPage() {
  const body = document.body;
  const page = body?.dataset?.page || "";

  const manifest = await loadManifest();

  // Attach inferred categories
  const enriched = manifest.map(m => ({ ...m, category: inferCategory(m) }));

  // Page routing
  if (page === "home") {
    const byCountry = enriched.filter(x => x.category === "countries");
    const countryGrid = $("#countryGrid");
    renderGrid(countryGrid, byCountry.slice(0, 24), "countries"); // show top 24
    wireSearch($("#countrySearch"), byCountry, (items) => renderGrid(countryGrid, items.slice(0, 48), "countries"));
  }

  if (page === "explore") {
    const items = enriched; // show all
    renderGrid($("#exploreGrid"), items, "explore");
    wireSearch($("#exploreSearch"), items, (filtered) => renderGrid($("#exploreGrid"), filtered, "explore"));
  }

  if (page === "countries") {
    const items = enriched.filter(x => x.category === "countries");
    renderGrid($("#countryGrid"), items, "countries");
    wireSearch($("#countrySearch"), items, (filtered) => renderGrid($("#countryGrid"), filtered, "countries"));
  }

  if (page === "neighborhoods") {
    const items = enriched.filter(x => x.category === "neighborhoods");
    renderGrid($("#hoodGrid"), items, "neighborhoods");
    wireSearch($("#hoodSearch"), items, (filtered) => renderGrid($("#hoodGrid"), filtered, "neighborhoods"));
  }

  if (page === "events") {
    const items = enriched.filter(x => x.category === "events");
    renderGrid($("#eventsGrid"), items, "events");
    wireSearch($("#eventsSearch"), items, (filtered) => renderGrid($("#eventsGrid"), filtered, "events"));
  }

  // Highlight active nav
  $all(".nav-links a").forEach(a => {
    const href = a.getAttribute("href") || "";
    if (href && location.pathname.endsWith(href)) a.classList.add("active");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bootPage().catch(err => {
    console.error(err);
    const holder = document.createElement("div");
    holder.className = "container";
    holder.innerHTML = `<div class="card" style="margin-top:16px;padding:14px">
      <div style="font-weight:900">Site error</div>
      <div style="color:var(--muted);margin-top:6px">Could not load manifest or render cards.</div>
      <div style="margin-top:8px;font-family:ui-monospace,Menlo,Monaco,Consolas,monospace;font-size:12px;white-space:pre-wrap">${escapeHtml(String(err))}</div>
    </div>`;
    document.body.appendChild(holder);
  });
});
