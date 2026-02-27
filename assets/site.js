/* assets/site.css */
:root{
  --bg:#070A10;
  --card:#0E1422;
  --muted:#8EA0C6;
  --text:#EAF0FF;
  --line:rgba(255,255,255,.10);
  --blue:#6CA2FF;
  --shadow: 0 10px 30px rgba(0,0,0,.35);
  --r:18px;
}

*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
  background: radial-gradient(1200px 700px at 20% -10%, rgba(108,162,255,.25), transparent 55%),
              radial-gradient(900px 600px at 80% 0%, rgba(159,110,255,.18), transparent 60%),
              var(--bg);
  color:var(--text);
}

a{color:inherit; text-decoration:none}

.container{max-width:1120px; margin:0 auto; padding:0 18px}
.nav{
  position:sticky; top:0; z-index:50;
  backdrop-filter: blur(14px);
  background: rgba(7,10,16,.65);
  border-bottom:1px solid var(--line);
}
.nav-inner{display:flex; align-items:center; gap:14px; padding:14px 0}
.brand{display:flex; align-items:center; gap:10px; font-weight:800; letter-spacing:.2px}
.brand img{height:26px; width:auto}
.nav-links{display:flex; gap:14px; margin-left:14px; flex-wrap:wrap}
.nav-links a{
  color:rgba(234,240,255,.85);
  padding:8px 10px;
  border-radius:12px;
  font-weight:700;
  font-size:14px;
}
.nav-links a.active{background: rgba(255,255,255,.08)}
.cta{
  margin-left:auto;
  background: linear-gradient(135deg, rgba(108,162,255,.95), rgba(159,110,255,.95));
  color:#081022;
  padding:10px 14px;
  border-radius:14px;
  font-weight:900;
  box-shadow: var(--shadow);
}

.hero{padding:26px 0 6px}
.hero h1{margin:0; font-size:36px; letter-spacing:-.6px}
.hero p{margin:10px 0 0; color:rgba(234,240,255,.8); max-width:820px; line-height:1.5}

.section{padding:20px 0}
.section-head{display:flex; align-items:flex-end; justify-content:space-between; gap:14px; margin-bottom:12px}
.section-head h2{margin:0; font-size:18px}
.hint{color:rgba(234,240,255,.65); font-size:13px}

.status{
  padding:10px 12px;
  border-radius:14px;
  border:1px solid var(--line);
  background: rgba(255,255,255,.04);
  font-size:13px;
  color:rgba(234,240,255,.75);
}
.status.good{border-color:rgba(108,162,255,.35)}
.status.bad{border-color:rgba(255,90,90,.45); color:rgba(255,200,200,.95)}

.search{
  width:100%;
  margin:10px 0 14px;
  background: rgba(255,255,255,.04);
  border:1px solid var(--line);
  color:var(--text);
  padding:12px 14px;
  border-radius:14px;
  outline:none;
  font-weight:650;
}
.search::placeholder{color:rgba(234,240,255,.45)}

.grid{
  display:grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap:14px;
}
@media (max-width: 980px){ .grid{grid-template-columns:repeat(2, minmax(0,1fr));} }
@media (max-width: 620px){ .grid{grid-template-columns:repeat(1, minmax(0,1fr));} .nav-links{display:none;} }

.card{
  border:1px solid var(--line);
  background: rgba(14,20,34,.78);
  border-radius: var(--r);
  overflow:hidden;
  box-shadow: 0 12px 40px rgba(0,0,0,.25);
  transition: transform .12s ease, border-color .12s ease;
  display:block;
}
.card:hover{transform: translateY(-2px); border-color: rgba(108,162,255,.35)}
.card.noimg .card-body{padding-top:14px}

.card-img{width:100%; height:168px; object-fit:cover; display:block; background:#0A0F1A}
.card-body{padding:12px 12px 14px}
.card-top{display:flex; align-items:flex-start; justify-content:space-between; gap:10px}
.card-title{font-weight:900; letter-spacing:-.2px; line-height:1.2}
.card-sub{margin-top:8px; color:rgba(234,240,255,.65); font-size:13px}

.pill{
  flex:0 0 auto;
  font-size:12px;
  font-weight:900;
  padding:6px 10px;
  border-radius:999px;
  background: rgba(108,162,255,.14);
  border:1px solid rgba(108,162,255,.28);
  color: rgba(234,240,255,.92);
}

.embed-wrap{
  border:1px solid var(--line);
  background: rgba(255,255,255,.03);
  border-radius: var(--r);
  overflow:hidden;
  box-shadow: var(--shadow);
}
.embed-wrap iframe{width:100%; height:520px; border:0; display:block}

.footer{
  padding:26px 0 40px;
  color:rgba(234,240,255,.5);
  font-size:13px;
}
.hr{height:1px; background: var(--line); margin:16px 0}
img.responsive{max-width:100%; height:auto; display:block}
