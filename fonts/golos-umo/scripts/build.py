"""Golos UMO, second pass.
- straight letters (H E T Ш…) are cut where a vertical line crosses only horizontal lines and moved apart;
- everything with curves or diagonals is scaled across with the weight compensated in x only
  (x from a lighter instance, y from the original), so vertical and diagonal strokes keep their
  thickness, horizontals are untouched and curves stay as smooth as they were;
- letters drawn from a widened base (Ң Ө Є ₽ € …) get the base's amount; composites inherit
  recursively; anchors follow the shape;
- capitals' sidebearings shrink by 7%, in proportion."""
import ufoLib2, json, copy, math
from fontMath import MathGlyph
from fontTools.pens.pointInsidePen import PointInsidePen
# only what Regular (an extrapolation below Golos 400) and Medium (Golos 540) are made from
MASTERS=['Regular','Medium','SemiBold']
fonts={m:ufoLib2.Font.open(f'master_ufo/GolosText-{m}.ufo') for m in MASTERS}
ref=fonts['Regular']; L=ref.layers.defaultLayer
DELTA={k:v for k,v in json.load(open('delta.json')).items() if v}
# derived letters take their base's amount
DERIVED={'E-cy':'C','Obarred-cy':'O','Schwa-cy':'Ereversed-cy','Gestroke-cy':'Ge-cy','Geupturn-cy':'Ge-cy','Gemiddlehook-cy':'Ge-cy',
 'Endescender-cy':'H','EnGe-cy':'H','Enhook-cy':'H','Nje-cy':'H','Hadescender-cy':'X','Chedescender-cy':'Che-cy','Chekhakassian-cy':'Che-cy',
 'Cheverticalstroke-cy':'Che-cy','Shha-cy':'Che-cy','Dje-cy':'T','Tshe-cy':'T','Dzhe-cy':'Pe-cy','Lje-cy':'El-cy','Elhook-cy':'El-cy',
 'Ustraight-cy':'Y','Ustraightstroke-cy':'Y','Zedescender-cy':'Ze-cy','Zhedescender-cy':'Zhe-cy','Esdescender-cy':'C',
 'AE':'E','OE':'O','Oslash':'O','Eth':'D','Thorn':'P','Eng':'N','Hbar':'H','Lslash':'L','Germandbls':'B',
 'Euro':'C','dollar':'S','uni20BD':'P','yen':'Y','uni20B8':'T','uni20B4':'S'}
for k,b in DERIVED.items():
    if k in ref and b in DELTA and not ref[k].components: DELTA[k]=DELTA[b]
# old-style figures: the lining amount in proportion to their width
for dname in ['zero','one','two','three','four','five','six','seven','eight','nine']:
    if dname in DELTA and dname+'.osf' in ref:
        r=ref[dname].getBounds(L); o=ref[dname+'.osf'].getBounds(L)
        DELTA[dname+'.osf']=round(DELTA[dname]*(o.xMax-o.xMin)/(r.xMax-r.xMin)/5)*5

def segs(c):
    pts=c.points; n=len(pts); on=[i for i,p in enumerate(pts) if p.type]; out=[]
    for k,i in enumerate(on):
        j=on[(k+1)%len(on)]; idx=[]; t=(i+1)%n
        while t!=j: idx.append(t); t=(t+1)%n
        out.append((i,idx,j,pts[j].type))
    return out
def straight_split_ok(g,s):
    """s is a half-integer, so no point lies on it: every segment crossing it must be a horizontal line."""
    for c in g.contours:
        pts=c.points
        for i,idx,j,typ in segs(c):
            xs=[pts[i].x]+[pts[t].x for t in idx]+[pts[j].x]
            if min(xs)<s<max(xs):
                if typ=='line' and not idx and pts[i].y==pts[j].y: continue
                return False
    return True
def coverage(g,s,b):
    n=t=0; y=b.yMin+5
    while y<b.yMax:
        pen=PointInsidePen(L,(s,y)); g.draw(pen); n+=pen.getResult(); t+=1; y+=10
    return n/max(t,1)
def plan_split(g):
    if any(p.type in ('curve','qcurve') for c in g.contours for p in c.points): return None
    b=g.getBounds(L); w=b.xMax-b.xMin
    ok=[x+0.5 for x in range(int(b.xMin)+1,int(b.xMax)-1) if straight_split_ok(g,x+0.5)]
    ok=[s for s in ok if coverage(g,s,b)<0.5]
    iv=[]
    for s in ok:
        if iv and s-iv[-1][-1]<=1: iv[-1].append(s)
        else: iv.append([s])
    keep=[]
    for I in iv:
        mid=(I[0]+I[-1])/2
        if b.xMin+0.15*w<=mid<=b.xMax-0.15*w: keep.append(math.floor(mid)+0.5)
    if not keep: return None
    if len(keep)==1 and abs(keep[0]-(b.xMin+b.xMax)/2)>0.2*w: return None
    return keep

def hstem(f):
    xs=sorted({p.x for c in f['H'].contours for p in c.points}); return xs[1]-xs[0]
stems={m:hstem(fonts[m]) for m in MASTERS}
def at_weight(m,name,amount):
    """glyph of master m with vertical stems `amount` units thinner (neighbouring masters, extrapolating below Regular)."""
    i=MASTERS.index(m); a,b=(MASTERS[0],MASTERS[1]) if i==0 else (MASTERS[i-1],MASTERS[i])
    ga=MathGlyph(fonts[a][name],strict=True); gb=MathGlyph(fonts[b][name],strict=True)
    return MathGlyph(fonts[m][name],strict=True)-(gb-ga)*(amount/(stems[b]-stems[a]))
COMP={'Z':0.35}   # diagonals that flatten when widened keep their perpendicular thickness with less compensation
def xonly_scale(m,name,d):
    f=fonts[m]; g=f[name]; b=g.getBounds(f.layers.defaultLayer); w0=b.xMax-b.xMin; S=stems[m]
    amount=0
    for _ in range(4):
        lg=ufoLib2.objects.Glyph(); at_weight(m,name,amount).drawPoints(lg.getPointPen())
        lb=lg.getBounds(f.layers.defaultLayer); wl=lb.xMax-lb.xMin
        k=(w0+d)/wl; amount=(S-(S/k))*COMP.get(name,1) if k>1 else 0   # (S-amount)*k == S
    # positions: x from the light glyph scaled about its centre onto the old centre (+d/2), y untouched
    cl=(lb.xMin+lb.xMax)/2; c0=(b.xMin+b.xMax)/2+d/2
    lp=[p for c in lg.contours for p in c.points]; op=[p for c in g.contours for p in c.points]
    assert len(lp)==len(op), name
    for p,q in zip(op,lp): p.x=round(c0+(q.x-cl)*k)
    la={a['name']:a['x'] for a in at_weight(m,name,amount).anchors}
    for a in g.anchors: a.x=round(c0+(la[a.name]-cl)*k)
    g.width+=d
def split_apply(name,splits,d):
    rg=ref[name]; share=d/len(splits)
    shifts=[[sum(share for s in splits if p.x>s) for p in c.points] for c in rg.contours]
    for m in MASTERS:
        g=fonts[m][name]
        for c,sh in zip(g.contours,shifts):
            for p,v in zip(c.points,sh): p.x=round(p.x+v)
        for a,ra in zip(g.anchors,rg.anchors):
            a.x=round(a.x+(d/2 if ra.name in('top','bottom','center') else sum(share for s in splits if ra.x>s)))
        g.width+=d

report={}
for name,d in DELTA.items():
    g=ref[name]
    if g.components and not g.contours: continue
    sp=plan_split(g)
    if sp: split_apply(name,sp,d); report[name]=['split',sp,d]
    else:
        for m in MASTERS: xonly_scale(m,name,d)
        report[name]=['scale',None,d]

# composites, recursively: width and marks follow the base's change (centre moves by half of it)
changed={n:v[2] for n,v in report.items()}
def resolve(f,name,seen=()):
    g=f[name]
    if name in changed: return changed[name]
    if not g.components or g.contours: return 0
    return resolve(f,g.components[0].baseGlyph)
for m in MASTERS:
    f=fonts[m]
    for g in f:
        if g.contours or not g.components or g.name in changed: continue
        d=resolve(f,g.components[0].baseGlyph)
        if not d: continue
        g.width+=d
        for c in g.components[1:]:
            t=c.transformation; c.transformation=(t[0],t[1],t[2],t[3],t[4]+d/2,t[5])
        for a in g.anchors: a.x+=d/2
for g in ref:
    if not g.contours and g.components and g.name not in changed:
        v=resolve(ref,g.components[0].baseGlyph)
        if v: report[g.name]=['composite',g.components[0].baseGlyph,v]

# tabular figures (lining and old-style): the new shapes on one shared advance, centred
for m in MASTERS:
    f=fonts[m]; digits=['zero','one','two','three','four','five','six','seven','eight','nine']
    for suf,tsuf in (('','.tf'),('.osf','.tosf')):
        add=round(sum(DELTA.get(x+suf,0) for x in digits)/10/5)*5
        for dn in digits:
            src=f[dn+suf]; tf=f[dn+tsuf]
            if tf.components: continue
            W=tf.width+add; tf.clearContours()
            for c in src.contours: tf.appendContour(copy.deepcopy(c))
            b=tf.getBounds(f.layers.defaultLayer); dx=round((W-(b.xMax-b.xMin))/2-b.xMin)
            for c in tf.contours:
                for p in c.points: p.x+=dx
            tf.width=W

# capitals: sidebearings 7% tighter, in proportion (rounds lose less than straights)
F=0.93
for m in MASTERS:
    f=fonts[m]; L2=f.layers.defaultLayer
    caps=[g for g in f if any(chr(u).isupper() for u in g.unicodes)]
    shift={}
    for g in caps:
        if not g.contours: continue
        b=g.getBounds(L2); lsb=b.xMin; rsb=g.width-b.xMax
        dl=round(lsb*F)-lsb; dr=round(rsb*F)-rsb
        for c in g.contours:
            for p in c.points: p.x+=dl
        for c in g.components:
            t=c.transformation; c.transformation=(t[0],t[1],t[2],t[3],t[4]+dl,t[5])
        for a in g.anchors: a.x+=dl
        g.width+=dl+dr; shift[g.name]=(dl,dl+dr)
    def res(name):
        if name in shift: return shift[name]
        g=f[name]
        if g.contours or not g.components: return (0,0)
        return res(g.components[0].baseGlyph)
    for g in caps:
        if g.contours or not g.components: continue
        dl,dw=res(g.components[0].baseGlyph)
        g.width+=dw
        for c in g.components[1:]:
            t=c.transformation; c.transformation=(t[0],t[1],t[2],t[3],t[4]+dl,t[5])
        for a in g.anchors: a.x+=dl

for m in MASTERS:
    f=fonts[m]; f.info.familyName='Golos UMO'; f.info.styleMapFamilyName=None
    f.info.postscriptFontName=f'GolosUMO-{m}'; f.info.openTypeNameUniqueID=None
    f.save(f'mid/GolosUMO-{m}.ufo',overwrite=True)
json.dump(report,open('report.json','w'),ensure_ascii=False,indent=0)
print(sum(1 for v in report.values() if v[0]=='split'),'split',sum(1 for v in report.values() if v[0]=='scale'),'scaled',sum(1 for v in report.values() if v[0]=='composite'),'composites')
print({k:v[1] for k,v in report.items() if v[0]=='split'})
