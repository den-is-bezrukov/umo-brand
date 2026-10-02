import ufoLib2, json, copy
from fontMath import MathGlyph
from widen import plan, apply, dup_points, MASTERS, SRC

DELTA=json.load(open('delta.json'))
fonts={m:ufoLib2.Font.open(SRC%m) for m in MASTERS}
ref=fonts['Regular']; L=ref.layers.defaultLayer
WGHT={'Regular':400,'Medium':500,'SemiBold':600,'Bold':700,'Black':900}

def choose(g):
    r=plan(g,L,700)
    if not r: return None
    b,iv=r; w=b.xMax-b.xMin
    onx={p.x for c in g.contours for p in c.points if p.type}
    keep=[]
    for I in iv:
        mid=(I[0]+I[-1])/2
        if not (b.xMin+0.15*w <= mid <= b.xMax-0.15*w): continue
        inside=[x for x in onx if x in I]
        keep.append(min(inside,key=lambda x:abs(x-mid)) if inside and len(I)<3 else round(mid))
    if not keep: return None
    if len(keep)==1 and abs(keep[0]-(b.xMin+b.xMax)/2)>0.2*w: return None
    return keep

def stem(f,name='H'):
    # vertical stem of H: first contour's leftmost run
    g=f[name]; xs=sorted({p.x for c in g.contours for p in c.points})
    return xs[1]-xs[0]

stems={m:stem(fonts[m]) for m in MASTERS}
print('H stems',stems)

def lighter(m,name,amount):
    """glyph of master m made `amount` units thinner in vertical stems (interpolating/extrapolating
    along the weight axis between neighbouring masters)."""
    i=MASTERS.index(m)
    if i==0: a,b=MASTERS[0],MASTERS[1]
    else: a,b=MASTERS[i-1],MASTERS[i]
    ga=MathGlyph(fonts[a][name],strict=True); gb=MathGlyph(fonts[b][name],strict=True)
    step=stems[b]-stems[a]
    t=amount/step
    g=MathGlyph(fonts[m][name],strict=True) - (gb-ga)*t
    return g

report={}
plans={}
for name,d in DELTA.items():
    if d==0: continue
    g=ref[name]
    if g.components and not g.contours: continue
    plans[name]=choose(g)
    report[name]=plans[name] or 'scale'

for name,splits in plans.items():
    d=DELTA[name]
    if splits:
        # classify on the Regular master; reuse by point index so every master gets the same topology
        rg=ref[name]; share=d/len(splits)
        def sh(x,eq=False): return sum(share for s_ in splits if x>s_)
        dupk={}
        for ci,c in enumerate(rg.contours):
            for i,p in enumerate(c.points):
                for k,s_ in enumerate(splits):
                    if p.type and p.x==s_: dupk[(ci,i)]=k
        shifts={(ci,i):sh(p.x) for ci,c in enumerate(rg.contours) for i,p in enumerate(c.points)}
        ash=[sh(a.x) if a.x not in splits else share/2 for a in rg.anchors]
        nxtright={(ci,i):rg.contours[ci].points[(i+1)%len(rg.contours[ci].points)].x>rg.contours[ci].points[i].x for (ci,i) in dupk}
        for m in MASTERS:
            g=fonts[m][name]
            for ci,c in enumerate(g.contours):
                pts=list(c.points); new=[]
                for i,p in enumerate(pts):
                    base=shifts[(ci,i)]; P=type(p)
                    if (ci,i) in dupk:
                        a=P(p.x+base,p.y,p.type,p.smooth,p.name); b_=P(p.x+base+share,p.y,'line',p.smooth,None)
                        if nxtright[(ci,i)]: new+=[a,b_]
                        else: new+=[P(p.x+base+share,p.y,p.type,p.smooth,p.name),P(p.x+base,p.y,'line',p.smooth,None)]
                    else: new.append(P(p.x+base,p.y,p.type,p.smooth,p.name))
                c.points[:]=new
            for a,v in zip(g.anchors,ash): a.x+=v
            g.width+=d
    else:
        for m in MASTERS:
            f=fonts[m]; g=f[name]; b=g.getBounds(f.layers.defaultLayer)
            k=(b.xMax-b.xMin+d)/(b.xMax-b.xMin)
            comp=0.6*stems[m]*(1-1/k)
            mg=lighter(m,name,comp)
            ng=ufoLib2.objects.Glyph()
            mg.drawPoints(ng.getPointPen())
            for a in mg.anchors: ng.appendAnchor(dict(name=a['name'],x=a['x'],y=a['y']))
            # rescale around the bounds centre
            nb=ng.getBounds(f.layers.defaultLayer); c=(nb.xMin+nb.xMax)/2
            off=(b.xMin+b.xMax)/2-c
            for cn in ng.contours:
                for p in cn.points: p.x=round(c+(p.x-c)*k+off+d/2)
            for a in ng.anchors: a.x=round(c+(a.x-c)*k+off+d/2)
            g.clearContours(); 
            for cn in ng.contours: g.appendContour(cn)
            g.anchors=[a for a in ng.anchors]
            g.width=g.width+d

# composites built on widened bases: widen advance, move marks to the new centre
for m in MASTERS:
    f=fonts[m]
    for g in f:
        if not g.components or g.contours: continue
        base=g.components[0].baseGlyph
        d=DELTA.get(base,0)
        if not d or base not in plans: continue
        g.width+=d
        for c in g.components[1:]:
            t=c.transformation; c.transformation=(t[0],t[1],t[2],t[3],t[4]+d/2,t[5])

# tabular figures: same widened shapes, all set to one advance, centred
for m in MASTERS:
    f=fonts[m]
    digits=['zero','one','two','three','four','five','six','seven','eight','nine']
    tfw=f['zero.tf'].width; add=round(sum(DELTA[x] for x in digits)/10/5)*5
    for dname in digits:
        src=f[dname]; tf=f[dname+'.tf']
        if tf.components: continue
        tf.clearContours()
        for c in src.contours: tf.appendContour(copy.deepcopy(c))
        b=tf.getBounds(f.layers.defaultLayer); W=tfw+add
        dx=round((W-(b.xMax-b.xMin))/2-b.xMin)
        for c in tf.contours:
            for p in c.points: p.x+=dx
        tf.width=W

# capitals: tighten 5 units per side (lowercase spacing stays as Golos)
TIGHT=5
for m in MASTERS:
    f=fonts[m]
    caps={g.name for g in f if any(chr(u).isupper() for u in g.unicodes)}
    for n in caps:
        g=f[n]
        if g.contours:
            for c in g.contours:
                for p in c.points: p.x-=TIGHT
            for a in g.anchors: a.x-=TIGHT
            for c in g.components:
                t=c.transformation; c.transformation=(t[0],t[1],t[2],t[3],t[4]-TIGHT,t[5])
        else:
            # composite: base component carries its own shift, the marks follow it
            for c in g.components[1:]:
                t=c.transformation; c.transformation=(t[0],t[1],t[2],t[3],t[4]-TIGHT,t[5])
            if g.components and g.components[0].baseGlyph not in caps:
                t=g.components[0].transformation; g.components[0].transformation=(t[0],t[1],t[2],t[3],t[4]-TIGHT,t[5])
        g.width-=2*TIGHT
for m in MASTERS: fonts[m].save('umo/GolosUMO-%s.ufo'%m,overwrite=True)
json.dump(report,open('report.json','w'),indent=0)
print(report)
