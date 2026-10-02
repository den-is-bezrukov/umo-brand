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
O={m:ufoLib2.Font.open(f'master_ufo/GolosText-{m}.ufo') for m in ['Regular','Medium']}
U={m:ufoLib2.Font.open(f'umo/GolosUMO-{m}.ufo') for m in ['Light','Regular','Medium']}
bad=[]
for n,(how,_,d) in rep.items():
    if how=='composite': continue
    if topology(U['Medium'][n])!=topology(O['Medium'][n]): bad.append(f'{n}: points added or removed'); continue
    allowed=set().union(*(breaks(O[m][n]) for m in O))
    new=set().union(*(breaks(U[m][n]) for m in U))-allowed
    if new: bad.append(f'{n}: new curvature breaks between curves at {sorted(new)}')
cofo=TTFont(sys.argv[1]) if len(sys.argv)>1 else None
for ch,n in (('O','O'),('0','zero')):
    g=describe([segs(c) for c in O['Medium'][n].contours])[0][0]; u=describe([segs(c) for c in U['Medium'][n].contours])[0][0]
    c=describe(ttf_contours(cofo,ch))[0][0] if cofo else None
    print(f'superness {ch}: Golos {g} UMO {u} CoFo {c}')
    if abs(u-g)>0.01: bad.append(f'{ch}: superness {u} vs Golos {g}')
print('\n'.join(bad) if bad else 'checks passed')
sys.exit(1 if bad else 0)
