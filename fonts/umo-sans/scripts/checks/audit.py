import ufoLib2, math, json
D=json.load(open('delta.json')); R=json.load(open('report.json'))
def segs(c):
    pts=c.points; n=len(pts); on=[i for i,p in enumerate(pts) if p.type]
    out=[]
    for k,i in enumerate(on):
        j=on[(k+1)%len(on)]; idx=[]; t=(i+1)%n
        while t!=j: idx.append(t); t=(t+1)%n
        out.append([(pts[i].x,pts[i].y)]+[(pts[t].x,pts[t].y) for t in idx]+[(pts[j].x,pts[j].y)])
    return out
def bez_curv(P,t):
    if len(P)==2: return 0.0
    (x0,y0),(x1,y1),(x2,y2),(x3,y3)=P
    dx=3*((1-t)**2*(x1-x0)+2*(1-t)*t*(x2-x1)+t*t*(x3-x2)); dy=3*((1-t)**2*(y1-y0)+2*(1-t)*t*(y2-y1)+t*t*(y3-y2))
    ddx=6*((1-t)*(x2-2*x1+x0)+t*(x3-2*x2+x1)); ddy=6*((1-t)*(y2-2*y1+y0)+t*(y3-2*y2+y1))
    v=(dx*dx+dy*dy)**1.5
    return (dx*ddy-dy*ddx)/v if v else float('inf')
def tang(a,b): return math.atan2(b[1]-a[1],b[0]-a[0])
def audit(g):
    kinks=0; jumps=[]; flips=0
    for c in g.contours:
        S=segs(c)
        for k,s in enumerate(S):
            nxt=S[(k+1)%len(S)]
            # tangent continuity at the join s[-1]==nxt[0]
            a=tang(s[-2],s[-1]) if s[-2]!=s[-1] else None; b=tang(nxt[0],nxt[1]) if nxt[0]!=nxt[1] else None
            if a is not None and b is not None:
                d=abs((b-a+math.pi)%(2*math.pi)-math.pi)
                if 0.004<d<0.35: kinks+=1          # 0.25..20 degrees: an unintended corner
            k1=bez_curv(s,1.0); k2=bez_curv(nxt,0.0)
            if (len(s)==4 or len(nxt)==4):
                big=max(abs(k1),abs(k2))
                if big>0 and min(abs(k1),abs(k2))/big<0.35 and big>1/400: jumps.append(round(1/big))
            if len(s)==4:
                ch=(s[3][0]-s[0][0],s[3][1]-s[0][1])
                for h,o in ((s[1],s[0]),(s[2],s[3])):
                    v=(h[0]-o[0],h[1]-o[1]); sgn=1 if o is s[0] else -1
                    if sgn*(v[0]*ch[0]+v[1]*ch[1])<0: flips+=1
    return kinks,len(jumps),flips
if __name__=="__main__":
  names=[n for n,d in D.items() if d]
  O={m:ufoLib2.Font.open(f'master_ufo/GolosText-{m}.ufo') for m in ['Regular','Medium','Black']}
  U={m:ufoLib2.Font.open(f'umo/UMOSans-{m}.ufo') for m in ['Light','Regular','Medium','Black']}
  print('%-13s %-6s | Golos R/M/Bk kinks,curv-jumps,flips | UMO Light/R/M/Bk'%('glyph','how'))
  for n in names:
      how='split' if isinstance(R.get(n),list) else 'scale'
      o=[audit(O[m][n]) for m in O]; u=[audit(U[m][n]) for m in U]
      flag=' <<' if any(x!=o[min(i,2) if i else 0] for i,x in enumerate(u)) else ''
      print('%-13s %-6s | %s | %s%s'%(n,how,' '.join('%d,%d,%d'%x for x in o),' '.join('%d,%d,%d'%x for x in u),flag))
