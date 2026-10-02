"""Regression checks for Golos UMO, run from the build's work directory after build.py:
- curvature: a widened glyph may not have more curvature breaks than Golos's own glyph (Light/Regular/Medium);
- superness of O and 0 stays within 0.01 of Golos's (CoFo shown for reference)."""
import json, sys, ufoLib2
from fontTools.ttLib import TTFont
from audit import segs as _segs, bez_curv
def breaks(g):
    """joins between two curves whose curvature drops below 35% of its neighbour's (a G2 break),
    keyed by (contour, join); joins to a straight line are the design's own flats and are left out."""
    out=set()
    for ci,c in enumerate(g.contours):
        S=_segs(c)
        for k,s in enumerate(S):
            n=S[(k+1)%len(S)]
            if len(s)!=4 or len(n)!=4: continue
            a,b=abs(bez_curv(s,1.0)),abs(bez_curv(n,0.0)); big=max(a,b)
            if big>1/400 and min(a,b)/big<0.35: out.add((ci,k))
    return out
def topology(g): return [len(c.points) for c in g.contours]
from roundcmp import describe
from audit import segs
from ttfseg import ttf_contours
rep=json.load(open('report.json'))
O={m:ufoLib2.Font.open(f'master_ufo/GolosText-{m}.ufo') for m in ['Regular','Medium','SemiBold']}
U={m:ufoLib2.Font.open(f'umo/GolosUMO-{m}.ufo') for m in ['Regular','Medium']}
bad=[]
from details import REDRAWN
for n,(how,_,d) in rep.items():
    if how=='composite' or n in REDRAWN: continue
    if topology(U['Medium'][n])!=topology(O['Medium'][n]): bad.append(f'{n}: points added or removed'); continue
    allowed=set().union(*(breaks(O[m][n]) for m in O))
    new=set().union(*(breaks(U[m][n]) for m in U))-allowed
    if new: bad.append(f'{n}: new curvature breaks between curves at {sorted(new)}')
# Л's turn must not pinch the stroke: the narrowest point no thinner than its leg or foot
import math as _m
from comb import pt as _pt
def _d(p,a,b):
    dx,dy=b[0]-a[0],b[1]-a[1]; L=dx*dx+dy*dy; t=0 if L==0 else max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L))
    return _m.dist(p,(a[0]+t*dx,a[1]+t*dy))
for st in ('Regular','Medium'):
    for n in ('El-cy','el-cy'):
        g=U[st][n]; S=_segs(g.contours[0]); cur=[i for i,s in enumerate(S) if len(s)==4]
        conv=[_pt(S[cur[0]],i/60) for i in range(61)]; out=[]
        for i in (cur[1]-1,cur[1],cur[1]+1): out+=[_pt(S[i],j/60) for j in range(61)]
        w=min(min(_d(p,a,b) for a,b in zip(out,out[1:])) for p in conv)
        P=g.contours[0].points; leg=P[3].x-P[10].x; foot=P[13].y
        print(f'{st} {n}: narrowest {w:.0f}, leg {leg}, foot {foot}')
        if w<0.97*min(leg,foot): bad.append(f'{st} {n}: the turn pinches the stroke to {w:.0f}')
cofo={st:TTFont(f'{sys.argv[1]}/CoFoSans-{st}.ttf') for st in ('Regular','Medium')} if len(sys.argv)>1 else {}
for st in ('Regular','Medium'):
    for ch,n in (('O','O'),('0','zero')):
        g=describe([segs(c) for c in O['Medium'][n].contours])[0][0]; u=describe([segs(c) for c in U[st][n].contours])[0][0]
        c=describe(ttf_contours(cofo[st],ch))[0][0] if cofo else None
        print(f'{st} superness {ch}: Golos {g}  UMO {u}  CoFo {c}')
        if abs(u-g)>0.01: bad.append(f'{st} {ch}: superness {u} vs Golos {g}')
print('\n'.join(bad) if bad else 'checks passed')
sys.exit(1 if bad else 0)
