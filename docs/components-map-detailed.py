# Generates components-map-detailed.html (A3 landscape). Connectors are drawn in the browser from box positions.
import html, json
COLS=["TRIGGER","INPUT","CONTEXT","PROCESSING","AI","OUTPUT"]
ACTORS=[
 ("Ananya","Head of Corporate Partnerships · Pune NGO"),
 ("Scheduler","Vercel Cron"),
 ("News feeds","Google News · Bing News · CSR trade press"),
 ("Pipeline","Next.js 16 on Vercel"),
 ("LLM","Gemini 3.7 Flash · OpenRouter · Google providers only"),
 ("Database","Neon Postgres"),
 ("Web","company & CSR pages · CSR Exchange portal"),
 ("Email","Resend"),
]
# (actor_index, col_index, id, type, text)
B=[
 (0,0,"0","person","Clicks <b>Refresh now</b> on the dashboard, or <b>Run &amp; email digest</b> in Settings. Examiners: one-click <b>Enter as examiner</b>."),
 (0,2,"T","person","Edits <b>Settings</b>: sectors &amp; keywords, regions (Pune → Maharashtra → India), 16 scoring weights, thresholds, NGO profile &amp; verified proof points, recipients. No code, no deploy."),
 (0,5,"18","person","Reads the Monday email and the dashboard, opens a brief, <b>edits and sends outreach herself</b>, moves the deal and logs calls in the CRM.<br>⚑ nothing is ever sent to a company by the system"),
 (1,0,"1","data","Daily 02:00 UTC = <b>07:30 IST</b>, bearer secret. Mondays → digest email. Runs stuck &gt;10 min are reaped."),
 (3,0,"2","code","One run at a time. Returns at once, continues in <b>after()</b> (300 s budget). Every stage writes its counts → live progress bar and Runs page."),
 (2,1,"3","data","<b>Google News</b>: ~15 searches built from settings (7 days) + 3 policy searches (<b>30 days</b>). <b>Bing News</b>: 14 keyword searches. <b>India CSR, The CSR Journal, The CSR Universe</b> feeds."),
 (4,4,"4","ai","<b>Search</b> (native Google Search): proposes open CSR <b>RFPs / EOIs</b> (last 30 days, deadline open, corporate funders only) and headlines the feeds missed."),
 (6,1,"5","data","<b>Verify</b>: an open-call page must load and name the funder; an AI-found headline must match a real Google News article. Otherwise dropped."),
 (3,3,"6","code","<b>Clean</b>: time windows, canonical URLs, stored once; same story from other outlets merged into one card; free pre-filter drops adverts → listed as <b>Cold</b> with the reason."),
 (5,2,"7","data","Settings read fresh every run · each story's reading <b>cached</b> (never paid twice) · 90-day company history → “warming”."),
 (4,4,"8","ai","<b>Read</b>: 10 stories per call → signal, company, sectors, places, ₹, deadline, partner search, audience fit + <b>verbatim quote</b>. JSON schema, temp 0. Decides nothing."),
 (3,3,"9","code","<b>Verify quote</b>: it must appear in the source text, else −10 and no override."),
 (3,3,"10","code","<b>Radar score</b> 0–100 from her weights → Hot · Warm · Cool · Cold · Policy. Open calls (corporate CSR) and explicit partner searches are <b>always Hot</b>."),
 (4,4,"11","ai","<b>Contact</b>: spokesperson named in the story, else Google Search for the CSR head, kept only with a source. <b>Never guesses emails.</b>"),
 (4,4,"12","ai","<b>Draft</b>: buyer-journey stage (set by code) → JTBD, facts vs assumptions, Hook · Pain · Value · CTA, follow-up with a new angle."),
 (3,3,"13","code","<b>Guard</b>: any number in a draft that is not in the story or her NGO profile is flagged before she sees it."),
 (4,4,"14","ai","<b>Summary</b>: “the week in one minute” from the ranked facts only."),
 (5,5,"15","data","Stored: stories, signals, every run's funnel, source health, tokens &amp; cost · <b>micro-CRM</b>: companies, contacts, deal stage, next steps, activity log."),
 (3,5,"16","code","<b>Dashboard</b>: Hot &amp; Warm cards (open-call countdown), Policy watch (30 d), Cool, <b>every Cold story ranked</b> (top 25 + show all), briefs, pipeline board, Runs, How it works."),
 (7,5,"17","data","<b>Monday email</b> to her inbox: dashboard snapshot (signed PNG) + <b>only the Hot companies</b>, each linking to its brief."),
]
LINKS=[("0","2"),("1","2"),("2","3"),("2","4"),("4","5"),("3","6"),("5","6"),("6","8"),("8","9"),("9","10"),("T","7"),("7","10"),("10","11"),("11","12"),("12","13"),("13","14"),("14","15"),("15","16"),("15","17"),("16","18"),("17","18")]
COLOR={"ai":("#c2347a","#fdf0f6"),"code":("#3d4a8f","#f1f3fc"),"data":("#2a8a86","#eefaf9"),"person":("#e08a2c","#fff6ec")}

cells={}
for a,c,i,t,txt in B: cells.setdefault((a,c),[]).append((i,t,txt))
rows=[]
for ai,(name,role) in enumerate(ACTORS):
  tds=[f'<div class="actor"><b>{html.escape(name)}</b><span>{html.escape(role)}</span></div>']
  for ci in range(6):
    boxes="".join(f'<div class="box {t}" id="b{i}" style="--c:{COLOR[t][0]};--bg:{COLOR[t][1]}"><i>{i}</i>{txt}</div>' for i,t,txt in cells.get((ai,ci),[]))
    n=len(cells.get((ai,ci),[]))
    tds.append(f'<div class="cell{" alt" if ai%2 else ""}{" many" if n>=3 else ""}">{boxes}</div>')
  rows.append("".join(tds))
grid="".join(rows)
page=f'''<!doctype html><html><head><meta charset="utf-8"><title>CSR Partnership Radar — Components Map (detailed)</title>
<style>
@page {{ size: 420mm 297mm; margin: 0; }}
*{{box-sizing:border-box}} html,body{{margin:0}}
body{{width:420mm;height:297mm;background:#fff;color:#17202a;font-family:-apple-system,"Segoe UI",Helvetica,Arial,sans-serif}}
.page{{padding:7mm 10mm 5mm;width:calc(420mm / 0.86);height:calc(297mm / 0.86);zoom:0.86;display:flex;flex-direction:column;position:relative}}
h1{{font-family:Georgia,serif;font-weight:600;color:#1f4a4a;font-size:24pt;margin:0;text-align:center}}
.sub{{text-align:center;color:#4a5560;font-size:10pt;margin:3pt 0 0}}
.legend{{display:flex;gap:16pt;justify-content:flex-end;font-size:8.5pt;color:#333;margin:2mm 0 2mm}}
.legend span::before{{content:"";display:inline-block;width:18pt;height:3pt;border-radius:2pt;background:var(--c);vertical-align:middle;margin-right:5pt}}
.wrap{{position:relative;flex:1;display:flex;flex-direction:column}}
.head,.grid{{display:grid;grid-template-columns:40mm 0.82fr 0.9fr 0.9fr 1.55fr 1.55fr 0.95fr}}
.head div{{background:#1b2440;color:#fff;font-weight:700;font-size:9pt;text-align:center;padding:7pt 0;letter-spacing:.5pt}}
.grid{{flex:1;grid-auto-rows:auto}}
.actor{{background:#1b2440;color:#fff;padding:5pt 7pt;display:flex;flex-direction:column;gap:2pt;border-top:1px solid #2b3658}}
.actor b{{font-size:10.5pt}} .actor span{{font-size:7.2pt;color:#b8c1d9;line-height:1.3}}
.cell{{border-left:1px solid #e6e8ee;border-top:1px solid #eef0f4;padding:4pt;display:flex;flex-direction:column;gap:4pt;min-height:13mm;justify-content:center}}
.cell.many{{display:grid;grid-template-columns:1fr 1fr;align-content:center}}
.cell.alt{{background:#f7f8fb}}
.box{{position:relative;z-index:2;border:1.6pt solid var(--c);background:var(--bg);border-radius:6pt;padding:4pt 6pt;font-size:6.9pt;line-height:1.3}}
.box i{{font-style:normal;font-weight:800;color:var(--c);font-size:8.5pt;margin-right:4pt}}
svg.links{{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;overflow:visible}}
.panels{{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin-top:3mm}}
.panel{{border:1.6pt solid var(--c);background:var(--bg);border-radius:8pt;padding:9pt 11pt}}
.panel h3{{margin:0 0 5pt;font-size:10.5pt;color:var(--c)}}
.panel p,.panel li{{font-size:7.3pt;line-height:1.38;margin:0}} .panel ol,.panel ul{{margin:0;padding-left:13pt}}
.foot{{text-align:center;font-size:7.5pt;color:#6b7480;margin-top:3mm}}
</style></head><body><div class="page">
<h1>CSR Partnership Radar — Components Map</h1>
<p class="sub">Mesa C4 · AI Final · Problem Statement 9 (High) · as built and live, 12 Oct 2026 · numbered in the order a daily run happens</p>
<div class="legend"><span style="--c:#c2347a">AI judgement (Gemini)</span><span style="--c:#3d4a8f">deterministic code</span><span style="--c:#2a8a86">data, database &amp; external services</span><span style="--c:#e08a2c">a person acts</span></div>
<div class="wrap" id="wrap">
<div class="head"><div></div>{"".join(f"<div>{c}</div>" for c in COLS)}</div>
<div class="grid">{grid}</div>
<svg class="links" id="links"><defs><marker id="ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0.5 L7,4 L0,7.5 z" fill="#8a909c"/></marker></defs></svg>
</div>
<div class="panels">
 <div class="panel" style="--c:#a3302a;--bg:#fcf0ee"><h3>The Cut — three things the radar never does</h3><ol>
  <li><b>Never contacts a company for her.</b> It drafts; Ananya edits and sends every email herself. The digest goes only to her inbox.</li>
  <li><b>Never guesses.</b> No invented contacts, emails or numbers: contacts need a source, quotes are checked against the source, numbers in drafts are checked by code.</li>
  <li><b>Never hides a story.</b> Off-sector, filtered and low-scoring stories stay listed as Cold, ranked, with the reason; she may know someone there.</li></ol></div>
 <div class="panel" style="--c:#3d4a8f;--bg:#f1f3fc"><h3>AI proposes, code decides, Ananya chooses</h3><p>Gemini searches, reads, finds contacts and writes. Everything that must be predictable is code: time windows, deduplication, the quote check, page verification for open calls, the 0–100 radar score from her 16 weights, the always-Hot rules, the invented-number guard. When she changes a weight in Settings, the next run re-scores every story with no new AI call; changing a sector or region changes the searches themselves. Every run's funnel, source health, tokens and cost are logged on the Runs page.</p></div>
 <div class="panel" style="--c:#2a8a86;--bg:#eefaf9"><h3>Running cost (measured)</h3><ul>
  <li>Daily run with all 5 sources: <b>≈ $0.21</b> of Gemini (avg of live runs), most of it the open-call search → <b>≈ $6 a month</b>.</li>
  <li>Reading only new stories: ≈ $0.01 per run (each reading cached); first full read of a week: $0.72.</li>
  <li>Neon, Vercel (hosting + cron), Resend, RSS feeds: free tiers → $0.</li>
  <li>Measured from OpenRouter's usage field on every call; model google/gemini-3.7-flash ($0.75 / $3.75 per million tokens).</li></ul></div>
</div>
<div class="foot">Live app: csr-radar.vercel.app · Code: github.com/durgeshforai-sketch/csr-radar · 29 unit tests in CI · extraction eval 89%</div>
</div>
<script>
const LINKS={json.dumps(LINKS)};
function draw(){{
  const W=document.getElementById('wrap'); const wrap=W.getBoundingClientRect(); const svg=document.getElementById('links');
  const k=W.offsetWidth/wrap.width; // undo CSS zoom: rects are in zoomed pixels, the SVG draws in layout pixels
  const r=id=>{{const e=document.getElementById('b'+id).getBoundingClientRect();const X=v=>(v-wrap.left)*k, Y=v=>(v-wrap.top)*k;return {{l:X(e.left),r:X(e.right),t:Y(e.top),b:Y(e.bottom),cx:X((e.left+e.right)/2),cy:Y((e.top+e.bottom)/2)}};}};
  let out='';
  for(const [a,b] of LINKS){{
    const A=r(a),Bx=r(b); let d,sx,sy;
    if(Math.abs(A.cx-Bx.cx)<4){{ // same column: vertical
      const down=Bx.t>A.b; sx=A.cx+18; sy=down?A.b:A.t; const ty=down?Bx.t:Bx.b; d=`M${{sx}},${{sy}} L${{sx}},${{ty}}`;
    }} else if(Bx.cx>A.cx){{ sx=A.r; sy=A.cy; const mx=Bx.l-10; d=`M${{sx}},${{sy}} L${{mx}},${{sy}} L${{mx}},${{Bx.cy}} L${{Bx.l}},${{Bx.cy}}`; }}
    else {{ sx=A.l; sy=A.cy; const mx=Bx.r+10; d=`M${{sx}},${{sy}} L${{mx}},${{sy}} L${{mx}},${{Bx.cy}} L${{Bx.r}},${{Bx.cy}}`; }}
    out+=`<path d="${{d}}" fill="none" stroke="#8a909c" stroke-width="1.1" stroke-dasharray="4 3" marker-end="url(#ar)"/><circle cx="${{sx}}" cy="${{sy}}" r="2.6" fill="#22c55e"/>`;
  }}
  svg.insertAdjacentHTML('beforeend',out);
}}
window.addEventListener('load',draw);
</script></body></html>'''
open("components-map-detailed.html","w").write(page)
print("ok")
