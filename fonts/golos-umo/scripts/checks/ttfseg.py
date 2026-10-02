"""Contours of a TrueType glyph as exact cubic/line segments, in the same form as audit.segs."""
from fontTools.pens.recordingPen import DecomposingRecordingPen
def ttf_contours(font,ch):
    gs=font.getGlyphSet(); name=font.getBestCmap()[ord(ch)]
    rp=DecomposingRecordingPen(gs); gs[name].draw(rp)
    contours=[]; cur=None; start=None
    for op,args in rp.value:
        if op=='moveTo': cur=[]; start=args[0]; last=args[0]
        elif op=='lineTo': cur.append([last,args[0]]); last=args[0]
        elif op=='curveTo': cur.append([last,*args]); last=args[-1]
        elif op=='qCurveTo':
            offs=list(args[:-1]); end=args[-1]
            pts=[last]
            for i,c in enumerate(offs):
                nxt=end if i==len(offs)-1 else ((c[0]+offs[i+1][0])/2,(c[1]+offs[i+1][1])/2)
                p0=pts[-1]
                c1=(p0[0]+2/3*(c[0]-p0[0]),p0[1]+2/3*(c[1]-p0[1])); c2=(nxt[0]+2/3*(c[0]-nxt[0]),nxt[1]+2/3*(c[1]-nxt[1]))
                cur.append([p0,c1,c2,nxt]); pts.append(nxt)
            last=end
        elif op in('closePath','endPath'):
            if last!=start: cur.append([last,start])
            contours.append(cur)
    return contours
