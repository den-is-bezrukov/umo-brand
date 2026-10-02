import ufoLib2, math
from fontTools.ttLib import TTFont
from fontTools.pens.areaPen import AreaPen
from audit import segs
from ttfseg import ttf_contours
def area_bbox(cs):
    # area via polygon of sampled points
    from comb import pt
    P=[pt(s,t/20) for s in cs for t in range(20)]
    A=0
    for (x1,y1),(x2,y2) in zip(P,P[1:]+P[:1]): A+=x1*y2-x2*y1
    xs=[p[0] for p in P]; ys=[p[1] for p in P]
    return abs(A)/2,(min(xs),min(ys),max(xs),max(ys))
def straight(cs):
    return round(sum(math.dist(s[0],s[1]) for s in cs if len(s)==2 and abs(s[0][1]-s[1][1])<1 or (len(s)==2 and abs(s[0][0]-s[1][0])<1)))
def describe(contours):
    info=[]
    for cs in sorted(contours,key=lambda c:-area_bbox(c)[0])[:2]:
        a,b=area_bbox(cs); w=b[2]-b[0]; h=b[3]-b[1]
        info.append((round(a/(w*h),3),round(w/h,3),straight(cs)))
    return info
U=ufoLib2.Font.open('umo/GolosUMO-Medium.ufo'); G=ufoLib2.Font.open('master_ufo/GolosText-Medium.ufo'); C=TTFont('/home/user/umo-brand/public/fonts/CoFoSans-Medium.ttf')
uni={chr(u):g.name for g in G for u in g.unicodes}
if __name__=='__main__': print('per contour: superness (circle .785 / square 1), width:height, straight length (h+v lines)')
if __name__=="__main__":
 for ch in 'ODC0ЭЗ8GS':
     n=uni[ch]
     g=describe([segs(c) for c in G[n].contours]); u=describe([segs(c) for c in U[n].contours]); c=describe(ttf_contours(C,ch))
     print(f'{ch}: Golos {g} | UMO {u} | CoFo {c}')
