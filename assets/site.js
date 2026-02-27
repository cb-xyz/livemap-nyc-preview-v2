function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

function norm(s){
  return String(s || "").toLowerCase().trim();
}

function slugify(s){
  return norm(s).replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,80);
}

/**
 * Card thumbnail strategy:
 * - If row.screenshot exists, use it (relative URL)
 * - Else fall back to gradient
 */
function cardThumbHTML(item){
  if(item.screenshot){
    return `<div class="thumb"><img src="${item.screenshot}" alt=""></div>`;
  }
  return `<div class="thumb"></div>`;
}

function renderCards(containerEl, items){
  containerEl.innerHTML = items.map(item => {
    const pill = item.pill || item.type || "";
    const sub  = item.sub || item.subtitle || "";
    const href = item.url || "#";

    return `
      <a class="card" href="${href}" target="_blank" rel="noopener">
        ${cardThumbHTML(item)}
        <div class="card-body">
          ${pill ? `<span class="pill">${pill}</span>` : ``}
          <div class="title">${item.name || "Untitled"}</div>
          ${sub ? `<div class="sub">${sub}</div>` : ``}
          <div class="card-actions">
            <span class="open">Open →</span>
            <span class="small">New tab</span>
          </div>
        </div>
      </a>
    `;
  }).join("");
}

function wireSearch(inputEl, allItems, onUpdate){
  const run = () => {
    const q = norm(inputEl.value);
    if(!q){ onUpdate(allItems); return; }
    const filtered = allItems.filter(it => {
      const hay = norm(it.name) + " " + norm(it.sub || it.subtitle) + " " + norm(it.pill || it.type);
      return hay.includes(q);
    });
    onUpdate(filtered);
  };
  inputEl.addEventListener("input", run);
  run();
}

/**
 * Optional: If you later create a data file (maps.json),
 * you can fetch it here. For now pages can pass their own arrays.
 */
async function tryLoadJSON(path){
  try{
    const r = await fetch(path, { cache: "no-store" });
    if(!r.ok) return null;
    return await r.json();
  }catch(e){
    return null;
  }
}
