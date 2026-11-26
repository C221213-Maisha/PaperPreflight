# Rebuilds the README artwork in docs/assets. Run with: python3 docs/make_assets.py. Plain SVG with CSS keyframes, which GitHub renders in <img>.
import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")
os.makedirs(OUT + "/icons", exist_ok=True)

FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"
MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"

MARK = ('<defs><linearGradient id="g" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">'
        '<stop offset="0" stop-color="#4C74F5"/><stop offset="1" stop-color="#2140C4"/></linearGradient></defs>'
        '<rect x="1" y="1" width="30" height="30" rx="9" fill="url(#g)"/>'
        '<path d="M8.6 9.6a2.1 2.1 0 0 1 2.1-2.1h2.1V23a2.1 2.1 0 0 1-4.2 0z" fill="#fff"/>'
        '<path d="M12.8 7.5 24.3 10.6 16.2 12.9z" fill="#fff"/>'
        '<path d="M16.2 12.9 24.3 10.6 12.8 18.6z" fill="#C3D2FF"/>')

# ---------- Logo header ----------
for name, ink, sub in [("light", "#111827", "#4B5563"), ("dark", "#F3F6FC", "#A9B4C8")]:
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="560" height="120" viewBox="0 0 560 120" role="img" aria-label="PaperPreflight">
<style>
  .w{{font:700 44px {FONT};letter-spacing:-1.6px;fill:{ink}}}
  .s{{font:500 16px {FONT};fill:{sub}}}
  .wing{{animation:fly 3.2s cubic-bezier(.2,.7,.2,1) infinite;transform-origin:16px 13px}}
  @keyframes fly{{0%,70%,100%{{transform:none}}80%{{transform:translate(.8px,-.8px)}}90%{{transform:translate(0,0)}}}}
</style>
<g transform="translate(20 18) scale(2.6)">{MARK.replace('<path d="M12.8', '<g class="wing"><path d="M12.8').replace('fill="#C3D2FF"/>', 'fill="#C3D2FF"/></g>')}</g>
<text class="w" x="118" y="66">PaperPreflight</text>
<text class="s" x="120" y="94">Catch the mistakes reviewers notice first.</text>
</svg>'''
    open(f"{OUT}/logo-{name}.svg", "w").write(svg)

# ---------- Animated demo: the hero scan ----------
P = {
 "light": dict(bg="#F6F7F9", card="#FFFFFF", line="#E5E7EB", ink="#111827", ink2="#4B5563", ink3="#9CA3AF", pri="#2F5BEA", prisoft="#E8EEFD",
               err="#C2410C", errsoft="#FDEBE4", warn="#B45309", warnsoft="#FDF3E2", note="#2F5BEA", notesoft="#E8EEFD", ok="#0F8A5F", shadow="rgba(17,24,39,.10)", kw="#2F5BEA"),
 "dark":  dict(bg="#0A0F1C", card="#111A2D", line="#22304D", ink="#E8EDF7", ink2="#A9B4C8", ink3="#6B7894", pri="#7C9CFF", prisoft="#1B2A4F",
               err="#FF8A7A", errsoft="#3A1F25", warn="#F5B861", warnsoft="#362C1C", note="#7C9CFF", notesoft="#1B2A4F", ok="#5BD6A5", shadow="rgba(0,0,0,.45)", kw="#8FB0FF"),
}
SRC = [
 ("10", [("kw", "\\section"), ("", "{Introduction}")], None),
 ("11", [("", "Fake news spreads quickly online.")], None),
 ("12", [("kw", "\\begin"), ("", "{abstract}")], None),
 ("13", [("", "We reach "), ("u", "98.6%"), ("", " F1 with 15 ms inference.")], "err"),
 ("14", [("", "The model beats strong baselines by 7.6 points")], None),
 ("15", [("", "on three public benchmarks.")], None),
 ("16", [("kw", "\\end"), ("", "{abstract}")], None),
 ("17", [("", "See Table~"), ("kw", "\\ref"), ("", "{tab:ablation}.")], "warn"),
 ("18", [("kw", "\\section"), ("", "{Method}")], None),
 ("19", [("", "% TODO add significance tests")], "note"),
 ("20", [("", "We use a dual encoder with cross attention.")], None),
]
FIND = [("err", "Abstract number not in paper", "98.6% has no match. Table II says 98.55.", "L13", 88),
        ("warn", "Undefined reference", "tab:ablation has no label.", "L17", 80),
        ("note", "Placeholder left in source", "A TODO is still in the paper.", "L19", 71)]
T = 9  # loop seconds
def pct(sec): return f"{sec / T * 100:.2f}%"
for name, c in P.items():
    W, H = 880, 420
    rows = []
    y0 = 92
    flag_at = {"err": 1.2, "warn": 1.8, "note": 2.3}
    for i, (n, parts, flag) in enumerate(SRC):
        y = y0 + i * 26
        if flag:
            col = c[flag]; soft = c[flag + "soft"]; t = flag_at[flag]
            rows.append(f'<g class="fl" style="animation-name:fl{flag}"><rect x="24" y="{y-17}" width="500" height="25" fill="{soft}"/><rect x="24" y="{y-17}" width="3" height="25" fill="{col}"/></g>')
        tx = []
        for kind, txt in parts:
            txt = txt.replace("&", "&amp;").replace("<", "&lt;")
            if kind == "kw": tx.append(f'<tspan fill="{c["kw"]}">{txt}</tspan>')
            elif kind == "u": tx.append(f'<tspan fill="{c["err"]}" text-decoration="underline">{txt}</tspan>')
            else: tx.append(f'<tspan>{txt}</tspan>')
        rows.append(f'<text class="ln" x="48" y="{y}" text-anchor="end">{n}</text><text class="src" x="64" y="{y}">{"".join(tx)}</text>')
    items = []
    for k, (sev, title, detail, loc, score) in enumerate(FIND):
        y = 186 + k * 66
        col = c[sev]
        items.append(f'''<g class="it" style="animation-name:it{k}">
  <rect x="556" y="{y}" width="300" height="56" rx="10" fill="{c["card"]}" stroke="{c["line"]}"/>
  <circle cx="576" cy="{y+20}" r="6" fill="none" stroke="{col}" stroke-width="1.8"/>
  <text class="ttl" x="592" y="{y+24}">{title}</text>
  <text class="dt" x="592" y="{y+42}">{detail}</text>
  <rect x="816" y="{y+10}" width="30" height="18" rx="5" fill="{c["bg"]}" stroke="{c["line"]}"/>
  <text class="loc" x="831" y="{y+23}" text-anchor="middle">{loc}</text>
</g>''')
    # ring: r=22, circumference 138.2
    C = 138.23
    def off(v): return f"{C * (1 - v / 100):.2f}"
    kf_ring = (f"@keyframes ring{{0%,{pct(0.9)}{{stroke-dashoffset:{off(100)}}}{pct(1.25)}{{stroke-dashoffset:{off(88)}}}"
               f"{pct(1.85)}{{stroke-dashoffset:{off(80)}}}{pct(2.35)},{pct(8.4)}{{stroke-dashoffset:{off(71)}}}100%{{stroke-dashoffset:{off(100)}}}}}")
    def show(start, end=8.4):
        return f"0%,{pct(start-0.01)}{{opacity:0;transform:translateY(6px)}}{pct(start+0.3)},{pct(end)}{{opacity:1;transform:none}}{pct(end+0.4)},100%{{opacity:0;transform:none}}"
    def flagk(start, end=8.4):
        return f"0%,{pct(start-0.01)}{{opacity:0}}{pct(start+0.2)},{pct(end)}{{opacity:1}}{pct(end+0.4)},100%{{opacity:0}}"
    def num(a, b):
        return f"0%,{pct(a-0.01)}{{opacity:0}}{pct(a)},{pct(b)}{{opacity:1}}{pct(b+0.01)},100%{{opacity:0}}"
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="PaperPreflight scanning a LaTeX abstract and flagging three issues">
<style>
  text{{font-family:{FONT}}}
  .src{{font:13.5px {MONO};fill:{c["ink"]}}}
  .ln{{font:12px {MONO};fill:{c["ink3"]}}}
  .ttl{{font-size:13px;font-weight:600;fill:{c["ink"]}}}
  .dt{{font-size:11.5px;fill:{c["ink2"]}}}
  .loc{{font:600 10px {MONO};fill:{c["ink2"]}}}
  .hd{{font-size:12.5px;fill:{c["ink2"]}}}
  .chip{{font:600 12px {MONO};fill:{c["ink"]}}}
  .big{{font-size:22px;font-weight:700;fill:{c["ink"]}}}
  .fl,.it{{opacity:0;animation-duration:{T}s;animation-iteration-count:infinite;animation-timing-function:cubic-bezier(.2,.7,.2,1)}}
  .scan{{animation:scan {T}s cubic-bezier(.4,0,.2,1) infinite}}
  .ring{{animation:ring {T}s cubic-bezier(.2,.7,.2,1) infinite}}
  .n{{opacity:0;animation-duration:{T}s;animation-iteration-count:infinite;animation-timing-function:steps(1,end)}}
  .st1{{animation:st1 {T}s steps(1,end) infinite}} .st2{{opacity:0;animation:st2 {T}s steps(1,end) infinite}}
  @keyframes scan{{0%,{pct(0.3)}{{transform:translateY(-60px);opacity:0}}{pct(0.4)}{{opacity:1}}{pct(2.5)}{{transform:translateY(300px);opacity:1}}{pct(2.7)},100%{{transform:translateY(300px);opacity:0}}}}
  @keyframes flerr{{{flagk(1.2)}}} @keyframes flwarn{{{flagk(1.8)}}} @keyframes flnote{{{flagk(2.3)}}}
  @keyframes it0{{{show(1.1)}}} @keyframes it1{{{show(1.65)}}} @keyframes it2{{{show(2.1)}}}
  {kf_ring}
  @keyframes n100{{{num(0, 1.25)}}} @keyframes n88{{{num(1.25, 1.85)}}} @keyframes n80{{{num(1.85, 2.35)}}} @keyframes n71{{{num(2.35, 8.8)}}}
  @keyframes st1{{0%,{pct(2.5)}{{opacity:1}}{pct(2.51)},{pct(8.8)}{{opacity:0}}{pct(8.81)},100%{{opacity:1}}}}
  @keyframes st2{{0%,{pct(2.5)}{{opacity:0}}{pct(2.51)},{pct(8.8)}{{opacity:1}}{pct(8.81)},100%{{opacity:0}}}}
  @media (prefers-reduced-motion:reduce){{.fl,.it,.n71,.st2{{opacity:1!important;animation:none!important}}.n100,.n88,.n80,.st1,.scan{{display:none}}.ring{{animation:none;stroke-dashoffset:{off(71)}}}}}
</style>
<defs>
  <filter id="sh" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="{c["shadow"]}"/></filter>
  <linearGradient id="sc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c["pri"]}" stop-opacity="0"/><stop offset=".5" stop-color="{c["pri"]}" stop-opacity=".16"/><stop offset="1" stop-color="{c["pri"]}" stop-opacity="0"/></linearGradient>
  <clipPath id="srcclip"><rect x="24" y="60" width="500" height="320"/></clipPath>
</defs>
<rect width="{W}" height="{H}" rx="18" fill="{c["bg"]}"/>
<g filter="url(#sh)"><rect x="12" y="12" width="{W-24}" height="{H-24}" rx="14" fill="{c["card"]}" stroke="{c["line"]}"/></g>
<rect x="28" y="24" width="84" height="24" rx="7" fill="{c["bg"]}" stroke="{c["line"]}"/><text class="chip" x="70" y="40" text-anchor="middle">main.tex</text>
<circle cx="128" cy="36" r="4" fill="{c["ok"]}"/>
<text class="hd st1" x="140" y="40">Checking</text><text class="hd st2" x="140" y="40">3 issues found</text>
<rect x="756" y="24" width="100" height="24" rx="12" fill="{c["prisoft"]}"/><text x="806" y="40" text-anchor="middle" style="font-size:11.5px;font-weight:600;fill:{c["pri"]}">IEEE conference</text>
<line x1="12" y1="60" x2="{W-12}" y2="60" stroke="{c["line"]}"/>
<line x1="540" y1="60" x2="540" y2="{H-12}" stroke="{c["line"]}"/>
<g clip-path="url(#srcclip)">
{chr(10).join(rows)}
<rect class="scan" x="24" y="40" width="500" height="60" fill="url(#sc)"/>
</g>
<rect x="556" y="76" width="300" height="94" rx="12" fill="{c["bg"]}" stroke="{c["line"]}"/>
<circle cx="606" cy="123" r="22" fill="none" stroke="{c["line"]}" stroke-width="5"/>
<circle class="ring" cx="606" cy="123" r="22" fill="none" stroke="{c["pri"]}" stroke-width="5" stroke-linecap="round" stroke-dasharray="{C}" stroke-dashoffset="{off(100)}" transform="rotate(-90 606 123)"/>
<text class="big n" style="animation-name:n100" x="646" y="122">100</text>
<text class="big n" style="animation-name:n88" x="646" y="122">88</text>
<text class="big n" style="animation-name:n80" x="646" y="122">80</text>
<text class="big n n71" style="animation-name:n71" x="646" y="122">71</text>
<text class="hd" x="646" y="142">Readiness</text>
{chr(10).join(items)}
</svg>'''
    open(f"{OUT}/demo-{name}.svg", "w").write(svg)

# ---------- Icons (24px, single stroke, brand blue that reads on both themes) ----------
ICONS = {
 "consistency": '<path d="M4.5 7.5h9M4.5 12h6M4.5 16.5h9"/><path d="M15.5 13.5l2 2 3.5-4"/>',
 "reporting": '<path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10"/><path d="M4.5 6.5l1 1 2-2M4.5 12l1 1 2-2M4.5 17.5l1 1 2-2"/>',
 "format": '<rect x="5.5" y="3.5" width="13" height="17" rx="2"/><path d="M8.5 7.5h7M8.5 11h7M8.5 14.5h4"/><path d="M3.5 3.5v17" stroke-dasharray="1.5 2"/>',
 "cleanup": '<path d="M14.5 4.5l5 5L10 19H5v-5z"/><path d="M12 7l5 5"/>',
 "experiments": '<rect x="5.5" y="3.5" width="13" height="17" rx="2"/><path d="M3.5 8h3M3.5 12h3M3.5 16h3M10 8.5l-1.5 1.5 1.5 1.5M14 8.5l1.5 1.5-1.5 1.5M9.5 15.5h5"/>',
 "repeat": '<path d="M4.5 11V9.5a3 3 0 0 1 3-3h11M15.5 3.5l3 3-3 3"/><path d="M19.5 13v1.5a3 3 0 0 1-3 3h-11M8.5 20.5l-3-3 3-3"/>',
 "complete": '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.4 2.4 4.6-5"/>',
 "venue": '<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4c1.5 1.6 3.4 2.4 5.5 2.4s4-.8 5.5-2.4v-4"/>',
 "results": '<path d="M4.5 19.5v-6M9.5 19.5v-10M14.5 19.5v-8M19.5 19.5v-14"/>',
 "target": '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="#4C74F5"/>',
 "lock": '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7M12 14.5v2"/>',
 "upload": '<path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9"/><path d="M4.5 14.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/>',
 "template": '<rect x="3.5" y="4.5" width="10" height="15" rx="1.5"/><rect x="10.5" y="4.5" width="10" height="15" rx="1.5"/><path d="M17.5 7v10"/>',
 "bib": '<path d="M5.5 4.5h10a3 3 0 0 1 3 3v12h-10a3 3 0 0 1-3-3z"/><path d="M5.5 16.5a3 3 0 0 1 3-3h10M9 8h6"/>',
 "zip": '<path d="M5 8.5h14v10a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.5z"/><path d="M3.5 4.5h17v4h-17zM10 12.5h4"/>',
 "help": '<circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.6a2.3 2.3 0 0 1 4.4.9c0 1.6-2.2 2-2.2 3.3M12 16.6v.01"/>',
 "link": '<path d="M10 13.5a3.6 3.6 0 0 0 5.1.4l2.7-2.7a3.6 3.6 0 0 0-5.1-5.1l-1 1"/><path d="M14 10.5a3.6 3.6 0 0 0-5.1-.4l-2.7 2.7a3.6 3.6 0 0 0 5.1 5.1l1-1"/>',
 "code": '<path d="M8.5 7.5 4 12l4.5 4.5M15.5 7.5 20 12l-4.5 4.5M13.5 5.5l-3 13"/>',
 "shield": '<path d="M12 3.5l7 3v5.5c0 4.2-3 7.4-7 8.5-4-1.1-7-4.3-7-8.5V6.5z"/><path d="M9 12l2 2 4-4"/>',
 "rocket": '<path d="M14.5 4.5c3 0 5 2 5 5-1.5 4-5 7-9 8.5l-4-4C8 10 11 6.5 14.5 4.5z"/><circle cx="14.5" cy="9.5" r="1.6"/><path d="M6.5 13.5l-3 1 1.5 3.5M10.5 17.5l-1 3-3.5-1.5"/>',
 "palette": '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.3-1.3-1.7-1.3-3 0-1 .8-1.8 1.8-1.8h2.2a4 4 0 0 0 4-4c0-3.7-3.8-6.5-8.5-6.5z"/><circle cx="7.8" cy="11" r="1"/><circle cx="10.5" cy="7.3" r="1"/><circle cx="15" cy="7.6" r="1"/>',
 "message": '<path d="M5.5 4.5h13a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H10l-4.5 3.5V17a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z"/><path d="M8.5 9.5h7M8.5 12.5h4.5"/>',
 "alert": '<path d="M10.3 4.6 3.4 17a2 2 0 0 0 1.7 3h13.8a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 16.8v.01"/>',
 "map": '<path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
 "user": '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>',
}
for k, body in ICONS.items():
    open(f"{OUT}/icons/{k}.svg", "w").write(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4C74F5" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{body}</svg>\n')

# ---------- Badges (self-made, so the README needs no outside service) ----------
def badge(label, value, color, fname):
    lw = 8 + len(label) * 6.6 + 8
    vw = 8 + len(value) * 6.8 + 8
    w = lw + vw
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w:.0f}" height="22" viewBox="0 0 {w:.0f} 22" role="img" aria-label="{label}: {value}">
<rect width="{w:.0f}" height="22" rx="6" fill="#1F2937"/><rect x="{lw:.0f}" width="{vw:.0f}" height="22" rx="6" fill="{color}"/><rect x="{lw:.0f}" width="8" height="22" fill="{color}"/>
<g font-family="{FONT}" font-size="11.5" font-weight="600" fill="#fff"><text x="{lw/2:.1f}" y="15" text-anchor="middle" fill="#D1D5DB">{label}</text><text x="{lw + vw/2:.1f}" y="15" text-anchor="middle">{value}</text></g>
</svg>'''
    open(f"{OUT}/badge-{fname}.svg", "w").write(svg)
badge("reads", "LaTeX | Word | PDF", "#2F5BEA", "formats")
badge("runs", "in your browser", "#0F8A5F", "browser")
badge("checks", "rule-based", "#2F5BEA", "rules")
badge("API key", "not needed", "#0F8A5F", "nokey")
badge("deploy", "Netlify", "#0E7C86", "netlify")
badge("experiments", "beta", "#7C3AED", "beta")
print("assets ok")
