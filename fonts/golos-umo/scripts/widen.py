"""Golos UMO: widen capitals and figures toward CoFo proportions, lowercase untouched.
Split-insert where a vertical line crosses only horizontal strokes or horizontal-tangent extrema;
scale (with a reduced amount) where no such line exists (diagonal letters)."""
import ufoLib2, sys, json
from fontTools.pens.pointInsidePen import PointInsidePen

MASTERS=['Regular','Medium','SemiBold','Bold','Black']
SRC='master_ufo/GolosText-%s.ufo'

# target extra ink width (Medium), from the CoFo comparison, rounded; hand overrides below
DELTA=json.load(open('delta.json'))

def r5(v): return int(5*round(v/5))

def segments(contour):
    pts=contour.points; n=len(pts)
    on=[i for i,p in enumerate(pts) if p.type]
    segs=[]
    for k,i in enumerate(on):
        j=on[(k+1)%len(on)]
        idx=[]; t=(i+1)%n
        while t!=j: idx.append(t); t=(t+1)%n
        segs.append((i,idx,j,pts[j].type))
    return segs

def htangent(contour,i):
    pts=contour.points; n=len(pts); p=pts[i]
    a=pts[(i-1)%n]; b=pts[(i+1)%n]
    return abs(a.y-p.y)<=1 and abs(b.y-p.y)<=1

def valid_split(glyph,s):
    for c in glyph.contours:
        pts=c.points
        for i,idx,j,typ in segments(c):
            xs=[pts[i].x]+[pts[t].x for t in idx]+[pts[j].x]
            lo,hi=min(xs),max(xs)
            if not(lo<s<hi):
                # touching only at an endpoint is fine if that endpoint has a horizontal tangent
                for e in (i,j):
                    if pts[e].x==s and not htangent(c,e) and lo<hi: return False
                continue
            if typ=='line' and not idx and abs(pts[i].y-pts[j].y)<=1: continue
            return False
    return True

def coverage(glyph,layer,s,top,bottom):
    pen=PointInsidePen(layer,(s,0)); n=0; tot=0
    y=bottom+5
    while y<top:
        pen=PointInsidePen(layer,(s,y)); glyph.draw(pen); n+=pen.getResult(); tot+=1; y+=10
    return n/max(tot,1)

def plan(glyph,layer,cap):
    b=glyph.getBounds(layer)
    if b is None: return None
    xs=list(range(int(b.xMin)+2,int(b.xMax)-1))
    # candidate splits: every unit is too slow, use every 2 units plus exact extremum x's
    cand=set(xs[::2])
    for c in glyph.contours:
        for i,p in enumerate(c.points):
            if p.type and htangent(c,i): cand.add(p.x)
    ok=sorted(s for s in cand if b.xMin<s<b.xMax and valid_split(glyph,s))
    ok=[s for s in ok if coverage(glyph,layer,s,b.yMax,b.yMin)<0.5]
    # group into intervals
    iv=[]
    for s in ok:
        if iv and s-iv[-1][-1]<=2: iv[-1].append(s)
        else: iv.append([s])
    return b,iv

def apply(glyph,layer,splits,d,cls):
    """splits: list of x positions (one per interval) sharing d; cls decided on Regular master and
    reused by index so the masters stay compatible."""
    shares=[d/len(splits)]*len(splits)
    def shift(x):
        return sum(sh for s,sh in zip(splits,shares) if x>s)
    for ci,c in enumerate(glyph.contours):
        new=[]
        pts=c.points; n=len(pts)
        for i,p in enumerate(pts):
            dup=[ (k,s) for k,s in enumerate(splits) if (ci,i) in cls[k] ]
            if dup:
                k,s=dup[0]
                # duplicate this extremum: original stays, copy shifted by the share, joined by a line
                nxt=pts[(i+1)%n]
                base=shift(p.x)
                p0=type(p)(p.x+base,p.y,p.type,p.smooth,p.name)
                p1=type(p)(p.x+base+shares[k],p.y,'line',p.smooth,None)
                nxt_right = nxt.x>p.x
                if nxt_right:
                    new+= [p0,p1]
                else:
                    p0b=type(p)(p.x+base+shares[k],p.y,p.type,p.smooth,p.name)
                    p1b=type(p)(p.x+base,p.y,'line',p.smooth,None)
                    # going leftwards: first the shifted copy keeps the incoming curve type
                    new+= [p0b,p1b]
            else:
                new.append(type(p)(p.x+shift(p.x),p.y,p.type,p.smooth,p.name))
        c.points[:]=new
    for a in glyph.anchors: a.x+=shift(a.x) if a.x not in splits else shares[0]/2
    glyph.width+=d

def dup_points(glyph,splits):
    cls=[]
    for s in splits:
        st=set()
        for ci,c in enumerate(glyph.contours):
            for i,p in enumerate(c.points):
                if p.type and p.x==s: st.add((ci,i))
        cls.append(st)
    return cls

def scale(glyph,b,d):
    c=(b.xMin+b.xMax)/2; k=(b.xMax-b.xMin+d)/(b.xMax-b.xMin)
    for cn in glyph.contours:
        for p in cn.points: p.x=round(c+(p.x-c)*k+d/2)
    for a in glyph.anchors: a.x=round(c+(a.x-c)*k+d/2)
    glyph.width+=d

if __name__=='__main__':
    fonts={m:ufoLib2.Font.open(SRC%m) for m in MASTERS}
    ref=fonts['Regular']
    report={}
    for name,d in DELTA.items():
        if d==0: continue
        g=ref[name]
        if g.components and not g.contours: continue
        b,iv=plan(g,ref.layers.defaultLayer,700)
        if iv:
            # prefer exact extremum points (round letters) inside an interval: use the interval midpoint
            # snapped to an on-curve x if one lies inside
            splits=[]
            onx={p.x for c in g.contours for p in c.points if p.type}
            for I in iv:
                inside=[x for x in onx if I[0]<=x<=I[-1] and x in I]
                mid=(I[0]+I[-1])/2
                splits.append(min(inside,key=lambda x:abs(x-mid)) if inside and len(I)<3 else round(mid))
            # keep the largest intervals only when there are many (more than 2 counters)
            if len(splits)>3: splits=splits[:3]
            report[name]=('split',splits)
        else:
            report[name]=('scale',None)
    json.dump(report,open('plan.json','w'),indent=0)
    for k,v in report.items(): print(k,v,DELTA[k])
