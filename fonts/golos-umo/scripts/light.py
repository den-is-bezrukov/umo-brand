import ufoLib2, copy
from fontMath import MathGlyph, MathKerning, MathInfo
R=ufoLib2.Font.open('umo/GolosUMO-Regular.ufo'); M=ufoLib2.Font.open('umo/GolosUMO-Medium.ufo')
t=(400-375)/100   # extrapolate 25 design units below Regular
L=copy.deepcopy(R)
for g in L:
    gr=MathGlyph(R[g.name],strict=True); gm=MathGlyph(M[g.name],strict=True)
    ng=gr-(gm-gr)*t
    g.clearContours(); g.clearComponents(); g.clearAnchors()
    ng.drawPoints(g.getPointPen())
    for a in ng.anchors: g.appendAnchor(dict(name=a['name'],x=a['x'],y=a['y']))
    g.width=round(ng.width)
    # round coordinates
    for c in g.contours:
        for p in c.points: p.x=round(p.x); p.y=round(p.y)
    for c in g.components:
        tr=c.transformation; c.transformation=(tr[0],tr[1],tr[2],tr[3],round(tr[4]),round(tr[5]))
    for a in g.anchors: a.x=round(a.x); a.y=round(a.y)
kr=MathKerning(R.kerning,R.groups); km=MathKerning(M.kerning,M.groups)
kl=kr-(km-kr)*t; kl.round(); L.kerning.clear(); kl.extractKerning(L)
L.info.styleName='Light'; L.info.postscriptFontName='GolosUMO-Light'
L.save('umo/GolosUMO-Light.ufo',overwrite=True)
