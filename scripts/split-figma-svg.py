"""
Cut the guide's vector figures out of Figma SVG exports.

Figma exports a frame that stretches inside a grid/flex parent at the wrong size, so export the parent
Body node instead (Figma MCP download_assets, format svg) and cut each figure out of it here.
Usage: python3 scripts/split-figma-svg.py <dir with exports> brand/<name>/guide/images
Add a make() or assemble() line per figure at the bottom for the run, and take it out once the SVG is in the brand's folder.
"""
import xml.etree.ElementTree as ET, sys, re, os
SVG='http://www.w3.org/2000/svg'; XL='http://www.w3.org/1999/xlink'
ET.register_namespace('', SVG); ET.register_namespace('xlink', XL)
q=lambda t:f'{{{SVG}}}{t}'
SRC, OUT = sys.argv[1], sys.argv[2]

def make(src, name, keep, box, drop=()):
    tree=ET.parse(os.path.join(SRC, src)); root=tree.getroot()
    x,y,w,h=box
    root.set('viewBox',f'{x} {y} {w} {h}'); root.set('width',str(w)); root.set('height',str(h))
    # page-level background rects (the export's frame fill and the white page) — the figure has its own
    for r in [c for c in root if c.tag==q('rect')]: root.remove(r)
    parents={c:p for p in root.iter() for c in p}
    for g in root.iter(q('g')):
        for r in [c for c in g if c.tag==q('rect') and c.get('width')=='1440']: g.remove(r)
    body2=next(g for g in root.iter(q('g')) if g.get('id')=='Body_2')
    if keep:
        for c in [c for c in body2 if c.tag==q('g') and c.get('id')!=keep]: body2.remove(c)
    for d in drop:
        for e in list(root.iter()):
            if e.get('id')==d: parents[e].remove(e)
    # checkerboard placeholder fills hidden under solid backgrounds
    for e in list(root.iter()):
        if (e.get('fill') or '').startswith('url(#pattern'): parents[e].remove(e)
    for d in root.iter(q('defs')):
        for p in [c for c in d if c.tag==q('pattern')]: d.remove(p)
        for i in [c for c in d if c.tag==q('image')]: d.remove(i)
    s=ET.tostring(root,encoding='unicode')
    s=re.sub(r'\s+id="[^"]*"','',s)  # layer names aren't needed and can clash when inlined
    s=re.sub(r'>\s+<','><',s)
    open(os.path.join(OUT,name+'.svg'),'w').write(s)
    print(name, len(s))

def assemble(name, size, bg, parts):
    """A figure laid out from separate layer exports: [(file, x, y)] over a flat background."""
    w,h=size
    out=[f'<svg xmlns="{SVG}" width="{w}" height="{h}" viewBox="0 0 {w} {h}" fill="none"><rect width="{w}" height="{h}" fill="{bg}"/>']
    for src,x,y in parts:
        root=ET.parse(os.path.join(SRC, src)).getroot()
        inner=''.join(ET.tostring(c,encoding='unicode') for c in root)
        out.append(f'<g transform="translate({x} {y})">{inner}</g>')  # parts are exported at 1:1, viewBox = size
    s=''.join(out)+'</svg>'
    s=re.sub(r'\s+id="[^"]*"','',s); s=re.sub(r'(<(?!svg )\w+) xmlns="[^"]*"',r'\1',s)  # serialised children repeat it
    s=re.sub(r'>\s+<','><',s)
    open(os.path.join(OUT,name+'.svg'),'w').write(s)
    print(name, len(s))

# The figures for this run: make(export, name, frame to keep, (x, y, w, h)) or assemble(name, (w, h), background, [(export, x, y)])
