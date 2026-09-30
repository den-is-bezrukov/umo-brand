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
make('b1445.svg','cobrand-square','Frame 52',(0,0,912,304))
make('b1445.svg','cobrand-square-example','Frame 53',(0,328,912,304))
make('b1616.svg','cobrand-horizontal','Frame 50',(0,0,912,304))
make('b1616.svg','cobrand-horizontal-example','Frame 51',(0,328,912,304))
make('b1845.svg','type-styles',None,(0,0,912,456))
make('b1784.svg','font-geist','Frame 47',(0,512,288,216),drop=('Frame 39_2',))
make('b1784.svg','font-helvetica','Frame 48',(312,512,288,216),drop=('Frame 39_3',))
make('b1784.svg','font-arial','Frame 49',(624,512,288,216),drop=('Frame 39_4',))
# These two export 684 wide instead of 444; their content is centred, so shift the viewBox by 120.
make('f1961.svg','lettering-vector',None,(120,0,444,333))
make('f1969.svg','lettering-plates',None,(120,0,444,333))
