import ufoLib2, sys
from PIL import Image, ImageDraw, ImageFont
from audit import segs
def pt(P,t):
    if len(P)==2: return (P[0][0]+(P[1][0]-P[0][0])*t, P[0][1]+(P[1][1]-P[0][1])*t)
    (x0,y0),(x1,y1),(x2,y2),(x3,y3)=P; m=1-t
    return (m**3*x0+3*m*m*t*x1+3*m*t*t*x2+t**3*x3, m**3*y0+3*m*m*t*y1+3*m*t*t*y2+t**3*y3)
def d1(P,t):
    if len(P)==2: return (P[1][0]-P[0][0],P[1][1]-P[0][1])
    (x0,y0),(x1,y1),(x2,y2),(x3,y3)=P; m=1-t
    return (3*(m*m*(x1-x0)+2*m*t*(x2-x1)+t*t*(x3-x2)), 3*(m*m*(y1-y0)+2*m*t*(y2-y1)+t*t*(y3-y2)))
from audit import bez_curv
lab=ImageFont.truetype('/home/user/umo-brand/public/fonts/CoFoSans-Medium.ttf',22)
def draw(font,name,ox,oy,sc,d,title):
    g=font[name]; d.text((ox,oy-40),title,font=lab,fill='black')
    base=oy+760*sc
    X=lambda x: ox+x*sc; Y=lambda y: base-y*sc
    for c in g.contours:
        for s in segs(c):
            prev=None
            for i in range(41):
                t=i/40; x,y=pt(s,t); k=bez_curv(s,t) if len(s)==4 else 0
                dx,dy=d1(s,t); L=(dx*dx+dy*dy)**.5 or 1; nx,ny=-dy/L,dx/L
                ex,ey=x+nx*k*9000, y+ny*k*9000
                d.line((X(x),Y(y),X(ex),Y(ey)),fill=(120,160,255),width=1)
                if prev: d.line((prev[0],prev[1],X(ex),Y(ey)),fill=(30,80,230),width=2)
                prev=(X(ex),Y(ey))
            pts=[pt(s,i/60) for i in range(61)]
            d.line([(X(a),Y(b)) for a,b in pts],fill='black',width=3)
        for p in c.points:
            r=5 if p.type else 3
            col=(220,0,0) if p.type=='line' else ((0,0,0) if p.type else (150,150,150))
            d.ellipse((X(p.x)-r,Y(p.y)-r,X(p.x)+r,Y(p.y)+r),fill=col)
if __name__=="__main__":
    names=sys.argv[1].split(','); m=sys.argv[2]; out=sys.argv[3]
    O=ufoLib2.Font.open(f'master_ufo/GolosText-{m if m!="Light" else "Regular"}.ufo'); U=ufoLib2.Font.open(f'umo/GolosUMO-{m}.ufo')
    sc=0.55; W=int(900*sc)
    im=Image.new('RGB',(len(names)*2*W+40,int(1000*sc)+60),'white'); d=ImageDraw.Draw(im)
    for i,n in enumerate(names):
        draw(O,n,20+i*2*W,60,sc,d,f'{n} Golos'); draw(U,n,20+i*2*W+W,60,sc,d,f'{n} UMO')
    im.save(out)
    