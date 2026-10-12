import html
W=1600; AX=210; COLS=["Trigger","Input","Context","Processing","AI","Output"]; CW=(W-AX)/6
HDR=54; RH=118; TOP=70
rows=[
 # actor, role, col, lines, band, fill, stroke
 ("Vercel Cron","Scheduler",0,["Runs every morning","07:30 IST (+ Refresh now)","Mondays → digest"],"#eaeefc","#dfe5ff","#5b6cf0"),
 ("Live news sources","Google · Bing · CSR press",1,["Fetches last 7 days of","CSR news (searches built","from her settings + feeds)"],"#e8f4fb","#d6ebfa","#3b8fd6"),
 ("Neon Postgres","Settings + memory",2,["Ananya's sectors, regions,","weights, NGO profile;","past stories per company"],"#fdf8e2","#fdf0bf","#d9a400"),
 ("Pipeline code","Next.js on Vercel",3,["Dedupe + 7-day window","Free pre-filter (adverts)","Nothing deleted → Cold"],"#eaf7ec","#d3f0d8","#2f9e52"),
 ("Gemini Flash","Reader",4,["Story → structured facts","signal · sector · ₹ · place","+ verbatim evidence quote"],"#fdeef4","#fbd9e7","#d6337a"),
 ("Rules engine","Code · Ananya's weights",3,["Verifies quote in source","Radar score 0–100 →","Hot · Warm · Cool · Cold"],"#f1ecfb","#e2d7fb","#7c3aed"),
 ("Gemini Flash","Writer + web search",4,["Point of contact (sourced)","B2B email draft (JTBD,","Hook·Pain·Value·CTA)"],"#fdeef4","#fbd9e7","#d6337a"),
 ("Resend + Dashboard","Delivery",5,["Mon email: snapshot +","only Hot companies → link;","dashboard + CRM daily"],"#e6f6f4","#cdeee9","#1a9a8a"),
 ("Ananya","Review gate",5,["Decides who to call","Edits & sends email herself","Moves deal in micro-CRM"],"#fff6ea","#ffe7cc","#f07a1a"),
]
H=TOP+HDR+RH*len(rows)+20
BW=CW-38; BH=74
def cx(c): return AX+CW*c+CW/2
def ry(r): return TOP+HDR+RH*r+RH/2
out=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H+40}" viewBox="0 0 {W} {H+40}" font-family="Helvetica, Arial, sans-serif">',
 '<defs><marker id="ar" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,1 L9,5 L0,9 z" fill="#6b7280"/></marker></defs>',
 f'<rect width="{W}" height="{H+40}" fill="#ffffff"/>',
 f'<text x="{W/2}" y="38" text-anchor="middle" font-size="22" font-weight="700" fill="#111827">CSR Partnership Radar · Weekly CSR Intelligence Digest — Components Map (High)</text>']
# bands
for i,r in enumerate(rows):
  y=TOP+HDR+RH*i
  out.append(f'<rect x="{AX}" y="{y}" width="{W-AX}" height="{RH}" fill="{r[4]}"/>')
# column grid
for c in range(7):
  x=AX+CW*c
  out.append(f'<line x1="{x}" y1="{TOP}" x2="{x}" y2="{TOP+HDR+RH*len(rows)}" stroke="#e5e7eb" stroke-width="1"/>')
for i in range(len(rows)+1):
  y=TOP+HDR+RH*i
  out.append(f'<line x1="{AX}" y1="{y}" x2="{W}" y2="{y}" stroke="#e5e7eb" stroke-width="1"/>')
# header + actor col
out.append(f'<rect x="0" y="{TOP}" width="{W}" height="{HDR}" fill="#1f2937"/>')
out.append(f'<rect x="0" y="{TOP+HDR}" width="{AX}" height="{RH*len(rows)}" fill="#1f2937"/>')
out.append(f'<text x="{AX/2}" y="{TOP+HDR/2+6}" text-anchor="middle" font-size="16" fill="#cbd5e1">Actor</text>')
for c,n in enumerate(COLS):
  out.append(f'<text x="{cx(c)}" y="{TOP+HDR/2+6}" text-anchor="middle" font-size="17" font-weight="700" fill="#ffffff">{n}</text>')
for i,r in enumerate(rows):
  out.append(f'<text x="{AX/2}" y="{ry(i)-2}" text-anchor="middle" font-size="16" font-weight="700" fill="#ffffff">{html.escape(r[0])}</text>')
  out.append(f'<text x="{AX/2}" y="{ry(i)+18}" text-anchor="middle" font-size="12.5" fill="#94a3b8">{html.escape(r[1])}</text>')
# review gate dashed border
gy=TOP+HDR+RH*(len(rows)-1)
out.append(f'<rect x="{AX+2}" y="{gy+2}" width="{W-AX-4}" height="{RH-4}" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="9 7"/>')
# connectors: (from row, to row) elbow from right-mid of source → right, then down to top of target
links=[(0,1),(1,3),(2,3),(3,4),(4,5),(5,6),(6,7),(7,8)]
for a,b in links:
  ca,cb=rows[a][2],rows[b][2]
  x1=cx(ca)+BW/2; y1=ry(a)
  x2=cx(cb); y2=ry(b)-BH/2
  if cb>ca or (cb==ca):
    if cb==ca:
      # same column: from bottom-mid down
      x1=cx(ca); y1=ry(a)+BH/2
      d=f'M{x1},{y1} L{x2},{y2-2}'
    else:
      d=f'M{x1},{y1} L{x2},{y1} L{x2},{y2-2}'
  else:
    # target is left: leave from bottom, go down to mid-gap, left, then down
    x1=cx(ca); y1=ry(a)+BH/2; mid=(y1+y2)/2
    d=f'M{x1},{y1} L{x1},{mid} L{x2},{mid} L{x2},{y2-2}'
  out.append(f'<path d="{d}" fill="none" stroke="#6b7280" stroke-width="1.8" stroke-dasharray="5 4" marker-end="url(#ar)"/>')
  out.append(f'<circle cx="{x1}" cy="{y1}" r="4.5" fill="#22c55e" stroke="#fff" stroke-width="1.5"/>')
# boxes
for i,r in enumerate(rows):
  x=cx(r[2])-BW/2; y=ry(i)-BH/2
  out.append(f'<rect x="{x}" y="{y}" width="{BW}" height="{BH}" rx="7" fill="{r[5]}" stroke="{r[6]}" stroke-width="2"/>')
  for k,line in enumerate(r[3]):
    out.append(f'<text x="{cx(r[2])}" y="{y+22+k*18}" text-anchor="middle" font-size="13" fill="#111827">{html.escape(line)}</text>')
# footer legend
fy=H+14
out.append(f'<text x="{AX}" y="{fy}" font-size="13.5" fill="#374151"><tspan font-weight="700">The cut:</tspan> Gemini Flash only extracts facts and drafts; deterministic code decides the score; Ananya decides who to call. Nothing is hidden — Cold stories stay listed with the reason. All AI = Gemini Flash.</tspan></text>')
out.append('</svg>')
svg="\n".join(out)
open("components-map.html","w").write(f'<!doctype html><html><head><meta charset="utf-8"><title>CSR Radar — Components Map</title><style>body{{margin:0;background:#fff}}</style></head><body>{svg}</body></html>')
print(W,H+40)
