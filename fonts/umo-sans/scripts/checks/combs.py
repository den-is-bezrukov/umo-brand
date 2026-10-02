"""Curvature combs: Golos, UMO Sans and CoFo side by side.
Usage, from the work directory (KEEP=1 ./build.sh): python3 combs.py O,C,zero Medium out.png"""
import sys, ufoLib2
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont
from audit import segs, bez_curv
from comb import pt, d1
from ttfseg import ttf_contours
lab=ImageFont.truetype('/home/user/umo-brand/public/fonts/CoFoSans-Medium.ttf',22)
def draw_segs(contours,ox,oy,sc,d,title,scale_y=1.0,nodes=None):
    d.text((ox,oy-40),title,font=lab,fill='black'); base=oy+760*sc
    X=lambda x: ox+x*sc; Y=lambda y: base-y*sc
    for cs in contours:
        for s in cs:
            prev=None
            for i in range(41):
                t=i/40; x,y=pt(s,t); k=bez_curv(s,t) if len(s)==4 else 0
                dx,dy=d1(s,t); L=(dx*dx+dy*dy)**.5 or 1; nx,ny=-dy/L,dx/L
                ex,ey=x+nx*k*9000/scale_y, y+ny*k*9000/scale_y
                d.line((X(x),Y(y),X(ex),Y(ey)),fill=(120,160,255),width=1)
                if prev: d.line((prev[0],prev[1],X(ex),Y(ey)),fill=(30,80,230),width=2)
                prev=(X(ex),Y(ey))
            d.line([(X(a),Y(b)) for a,b in [pt(s,i/60) for i in range(61)]],fill='black',width=3)
            for p in (s[0],):
                d.ellipse((X(p[0])-4,Y(p[1])-4,X(p[0])+4,Y(p[1])+4),fill=(220,0,0) if len(s)==2 else 'black')
def ufo_contours(g): return [segs(c) for c in g.contours]
names=sys.argv[1].split(','); m=sys.argv[2]; out=sys.argv[3]
cf='/home/user/umo-brand/public/fonts/CoFoSans-%s.ttf'%('Regular' if m in('Light','Regular') else 'Medium')
C=TTFont(cf); O=ufoLib2.Font.open(f'master_ufo/GolosText-{"Regular" if m=="Light" else m}.ufo'); U=ufoLib2.Font.open(f'umo/UMOSans-{m}.ufo')
sc=0.5; W=int(880*sc); k=700/680
uni={g.name:g for g in O}
im=Image.new('RGB',(len(names)*3*W+40,int(1000*sc)+60),'white'); d=ImageDraw.Draw(im)
for i,n in enumerate(names):
    ch=chr(O[n].unicodes[0])
    # CoFo scaled to the 700 cap height so the three read at one size
    cc=[[[ (x*k,y*k) for x,y in s] for s in cs] for cs in ttf_contours(C,ch)]
    draw_segs(ufo_contours(O[n]),20+i*3*W,60,sc,d,f'{ch} Golos')
    draw_segs(ufo_contours(U[n]),20+i*3*W+W,60,sc,d,f'{ch} UMO')
    draw_segs(cc,20+i*3*W+2*W,60,sc,d,f'{ch} CoFo')
im.save(out)
