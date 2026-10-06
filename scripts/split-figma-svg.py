"""
Cut the guide's vector figures out of Figma SVG exports.

Figma exports a frame that stretches inside a grid/flex parent at the wrong size, so export the parent
Body node instead (Figma MCP download_assets, format svg) and cut each figure out of it here.
Usage: python3 scripts/split-figma-svg.py <dir with exports> src/assets/guide
Exports expected in <dir>, named after the Figma node: b552.svg = Body 4818:552, f1961.svg = Frame 4818:1961.
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

make('b552.svg','clearspace','Frame 53',(0,0,912,456))
make('b552.svg','minsize','Frame 51',(0,480,912,304))
# cobrand-square(-example) and cobrand-horizontal(-example) are the 444×333 cards of Figma 4818:1328 (4818:1480,
# 4818:1514, 4995:10273, 4995:10305), exported as SVG one by one: they export 684 wide with the content centred, so
# their viewBox is shifted by 120 (as the lettering ones below).
make('b1845.svg','type-styles',None,(0,0,912,456))
make('b1784.svg','font-geist','Frame 47',(0,512,288,216),drop=('Frame 39_2',))
make('b1784.svg','font-helvetica','Frame 48',(312,512,288,216),drop=('Frame 39_3',))
make('b1784.svg','font-arial','Frame 49',(624,512,288,216),drop=('Frame 39_4',))

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

# Lettering frames 4818:1969 / 4818:1961 (444×333) export stretched, so they're laid out from their layers:
# n<id>.svg = the MODEL lettering (Vector 4870:3450 / 4818:1963) and the number plate (4870:3498 / 4870:3522).
assemble('lettering-model8',(444,333),'#000',[('n4870-3450.svg',78,100),('n4870-3498.svg',54.997,183)])
assemble('lettering-model5',(444,333),'#f5f5f5',[('n4818-1963.svg',77.9985,100),('n4870-3522.svg',54.997,183)])
