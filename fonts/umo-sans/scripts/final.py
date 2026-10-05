"""The two working styles from the widened masters:
Regular = Golos Regular extrapolated 25 units below 400 (CoFo Regular's stem, 0.118 of the cap height),
Medium  = Golos at 540, between Medium and SemiBold (CoFo Medium's stem, 0.169)."""
import ufoLib2, copy
from fontMath import MathGlyph, MathKerning
src={m:ufoLib2.Font.open(f'mid/UMOSans-{m}.ufo') for m in ['Regular','Medium','SemiBold']}
def blend(a,b,t,style,weight):
    A,B=src[a],src[b]; out=copy.deepcopy(A)
    for g in out:
        ng=MathGlyph(A[g.name],strict=True)+(MathGlyph(B[g.name],strict=True)-MathGlyph(A[g.name],strict=True))*t
        g.clearContours(); g.clearComponents(); g.clearAnchors()
        ng.drawPoints(g.getPointPen())
        for an in ng.anchors: g.appendAnchor(dict(name=an['name'],x=round(an['x']),y=round(an['y'])))
        g.width=round(ng.width)
        for c in g.contours:
            for p in c.points: p.x=round(p.x); p.y=round(p.y)
        for c in g.components:
            tr=c.transformation; c.transformation=(tr[0],tr[1],tr[2],tr[3],round(tr[4]),round(tr[5]))
    ka=MathKerning(A.kerning,A.groups); kb=MathKerning(B.kerning,B.groups)
    k=ka+(kb-ka)*t; k.round(); out.kerning.clear(); k.extractKerning(out)
    i=out.info
    i.familyName='UMO Sans'; i.styleName=style; i.styleMapFamilyName=None; i.styleMapStyleName='regular' if style=='Regular' else None
    i.postscriptFontName=f'UMOSans-{style}'; i.openTypeOS2WeightClass=weight; i.openTypeNameUniqueID=None
    i.versionMajor=0; i.versionMinor=2; i.openTypeOS2VendorID='NONE'
    # A modified version under the OFL: Golos Text's authors credited, nothing that presents it as
    # ParaType's release or uses the Golos trademark (Smena Ltd.), which the license doesn't grant
    i.copyright='Copyright 2019 The Golos Text Project Authors (https://github.com/googlefonts/golos-text). Copyright 2026 The UMO Sans Project Authors.'
    i.trademark=None
    i.openTypeNameManufacturer=None; i.openTypeNameManufacturerURL=None
    i.openTypeNameDesigner='Alexandra Korolkova, Vitaly Kuzmin (Golos Text); modified for UMO'; i.openTypeNameDesignerURL=None
    i.openTypeNameDescription=('UMO Sans is a modified version of Golos Text by Alexandra Korolkova and Vitaly Kuzmin, '
        'released under the SIL Open Font License: wider capitals and figures, weights matched to CoFo Sans, redrawn details. '
        'It is not an official release of Golos and is not affiliated with or endorsed by ParaType.')
    out.save(f'umo/UMOSans-{style}.ufo',overwrite=True)
blend('Regular','Medium',-0.25,'Regular',400)
blend('Medium','SemiBold',0.40,'Medium',500)
