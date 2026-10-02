"""Dots and commas (run after details.py). DOTS picks the dot: 'square' (cut like the strokes) or
'round' (Golos's). The comma is a trapezoid: its top is the period's dot, cut level and as wide, and it
narrows and leans gently left down to a level bottom under the baseline; the quotes are built from
it. (COMMA = 'stroke' gives a straight stroke at Q's tail angle, 'tail' the dot with a curled tail.)
- period, the dots of ! ? ¡ ¿ and ÷: the period's size; colon, semicolon, ellipsis and the middle
  dot take the period as a component and follow;
- the dot of i j and the dieresis (ё Ё): as wide as the stem of i, so the dot stands on the stem;
- comma, quotesinglbase (and so ‚ „ ‘ ’ “ ”), the comma accent and the caron's apostrophe form."""
import math, sys, ufoLib2
import pathops

DOTS = 'square'
COMMA = 'trapezoid'
COMMA_LEAN = 18     # trapezoid: lean of its middle line from the vertical, degrees
COMMA_FOOT = 0.5    # trapezoid: width of its bottom over its top (the period's width)
COMMA_DEPTH = 100   # the stroke's lowest corner below the baseline (Q's tail reaches 85)
COMMA_WEIGHT = 0.85 # the stroke's thickness over the period's width: on its own it needs the dot's
                    # weight, which Q's tail, leaning on the bowl, does without
QUOTE_GAP = 0.45    # double quotes: the gap between the two strokes, over the period's width
# Dots grow slower than the stem: a light weight needs a relatively bigger dot or it melts away
# (calibrated on CoFo's two weights: its period is 1.34 stems wide in Regular, 1.11 in Medium).
# Sizes in font units from the stem of i, S: a + b*S.
DOT = (60, 0.61)        # the period (and the dots of ! ? ¡ ¿ ÷): about 111 in Regular, 133 in Medium
IDOT = (23, 0.86)       # the dot of i j and the dieresis: a touch wider than the stem (95, 126)
GAP = (155, -0.47)      # ellipsis: the gap between its dots (116, 99)
DOT_HEIGHT = 1.03       # square dots: height over width (a touch taller looks square)
TAIL_WIDTH = 0.6     # comma: the tail where it leaves the head, over the head's width
TAIL_TIP = 0.05      # comma: the point, this far in from the head's left edge, over the head's width


def stem(font):
    c = font['idotless'].contours[0]; xs = [p.x for p in c.points]
    return max(xs) - min(xs)


def bounds(c):
    xs = [p.x for p in c.points]; ys = [p.y for p in c.points]
    return min(xs), min(ys), max(xs), max(ys)


def draw(g, contours):
    for pts in contours:
        pen = g.getPointPen(); pen.beginPath()
        for x, y, tp in pts: pen.addPoint((round(x), round(y)), segmentType=tp)
        pen.endPath()


def square(cx, cy, w, h):
    """counter-clockwise, like the font's outer contours"""
    l, r, b, t = cx - w / 2, cx + w / 2, cy - h / 2, cy + h / 2
    return [(l, b, 'line'), (r, b, 'line'), (r, t, 'line'), (l, t, 'line')]


def circle(cx, cy, d):
    r = d / 2; k = 0.5523 * r
    return [(cx, cy - r, 'curve'), (cx + k, cy - r, None), (cx + r, cy - k, None), (cx + r, cy, 'curve'),
            (cx + r, cy + k, None), (cx + k, cy + r, None), (cx, cy + r, 'curve'), (cx - k, cy + r, None),
            (cx - r, cy + k, None), (cx - r, cy, 'curve'), (cx - r, cy - k, None), (cx - k, cy - r, None)]


def replace(g, index, pts):
    """swap contour `index` of g for pts"""
    keep = [[(p.x, p.y, p.type) for p in c.points] for i, c in enumerate(g.contours) if i != index]
    g.clearContours(); draw(g, keep[:index] + [pts] + keep[index:])


def tail(l, r, depth):
    """the comma's tail under a head spanning l..r on the baseline: inner edge from the head's
    underside down to the point, outer edge back up to the head's right corner"""
    w = r - l; ri = r - TAIL_WIDTH * w; tip = (l + TAIL_TIP * w, -depth)
    inner = [(ri, -0.45 * depth, None), (tip[0] + 0.3 * (ri - tip[0]), tip[1] + 0.45 * depth, None), (tip[0], tip[1], 'curve')]
    outer = [(tip[0] + 0.55 * (r - tip[0]), tip[1] + 0.2 * depth, None), (r, -0.5 * depth, None), (r, 0, 'curve')]
    return ri, inner, outer


def trapezoid_comma(dot):
    """top: the period's dot, level and as wide; bottom: COMMA_FOOT as wide, COMMA_DEPTH under the
    baseline, its middle COMMA_LEAN degrees left of the top's"""
    l, b, r, t = dot; cx = (l + r) / 2; w = r - l
    H = t + COMMA_DEPTH; cb = cx - math.tan(math.radians(COMMA_LEAN)) * H; bw = COMMA_FOOT * w
    return [(cb - bw / 2, -COMMA_DEPTH, 'line'), (cb + bw / 2, -COMMA_DEPTH, 'line'), (r, t, 'line'), (l, t, 'line')]


def stroke_comma(font, dot):
    """Q's tail as a comma: a straight stroke at its angle mirrored, ends cut square to the stroke,
    COMMA_WEIGHT of the period's width thick, the top corner level with the period's top, the bottom one COMMA_DEPTH
    below the baseline, centred on the period's dot"""
    from details import TAIL_ANGLE
    w = COMMA_WEIGHT * (dot[2] - dot[0])
    a = math.radians(TAIL_ANGLE)
    d = (-math.cos(a), -math.sin(a)); n = (-math.sin(a), math.cos(a))
    top = dot[3] - math.cos(a) * w / 2; bottom = -COMMA_DEPTH + math.cos(a) * w / 2
    L = (top - bottom) / math.sin(a)
    Ct = (0.0, top); Cb = (Ct[0] + d[0] * L, Ct[1] + d[1] * L)
    pts = [(Ct[0] + n[0] * w / 2, Ct[1] + n[1] * w / 2), (Cb[0] + n[0] * w / 2, Cb[1] + n[1] * w / 2),
           (Cb[0] - n[0] * w / 2, Cb[1] - n[1] * w / 2), (Ct[0] - n[0] * w / 2, Ct[1] - n[1] * w / 2)]
    area = sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]))
    if area < 0: pts.reverse()                                   # counter-clockwise, like the font
    xs = [x for x, _ in pts]; shift = (dot[0] + dot[2]) / 2 - (min(xs) + max(xs)) / 2
    return [(x + shift, y, 'line') for x, y in pts]


def comma(dot, depth, style):
    """the comma as one contour: the period's dot `dot` (l, b, r, t) with the tail"""
    l, b, r, t = dot
    ri, inner, outer = tail(l, r, depth)
    if style == 'square':
        return [(l, 0, 'line'), (ri, 0, 'line')] + inner + outer + [(r, t, 'line'), (l, t, 'line')]
    # round: union of the dot and a tail running from inside it
    d = r - l; cx, cy = (l + r) / 2, (b + t) / 2
    tl = [(ri, cy, 'line')] + [(x, y, tp) for x, y, tp in inner] + outer[:2] + [(r, cy, 'curve')]
    path = pathops.Path()
    for pts in (circle(cx, cy, d), tl):
        pen = path.getPen(); pen.moveTo(pts[0][:2]); buf = []
        for x, y, tp in pts[1:] + pts[:1]:
            if tp is None: buf.append((x, y))
            elif buf: pen.curveTo(*buf, (x, y)); buf = []
            else: pen.lineTo((x, y))
        pen.closePath()
    path.simplify(fix_winding=True, keep_starting_points=False)
    g = ufoLib2.objects.Glyph(); path.draw(g.getPen())
    return [(p.x, p.y, p.type) for p in g.contours[0].points]


def fit_to(pts, box):
    """scale and move a contour into a bounding box (for the small comma forms)"""
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    l, b, r, t = min(xs), min(ys), max(xs), max(ys); L, B, R, T = box
    sx, sy = (R - L) / (r - l), (T - B) / (t - b); s = min(sx, sy)
    ox = (L + R) / 2 - (l + r) / 2 * s; oy = (B + T) / 2 - (b + t) / 2 * s
    return [(x * s + ox, y * s + oy, tp) for x, y, tp in pts]


def run(font, style):
    S = stem(font)
    pw = DOT[0] + DOT[1] * S; iw = IDOT[0] + IDOT[1] * S; gap = GAP[0] + GAP[1] * S
    # the period: Golos's sidebearings round the new dot
    p = font['period']; l, b, r, t = bounds(p.contours[0]); sb = l
    if style == 'square':
        ph = pw * DOT_HEIGHT; dot = (sb, 0, sb + pw, ph)
        replace(p, 0, square(sb + pw / 2, ph / 2, pw, ph)); p.width = round(pw + 2 * sb)
    else:
        dot = (l, b, r, t); pw = r - l
    # ! ? ¡ ¿ ÷ : their dot contours become the period's dot at the same centre
    for name, idx in (('exclam', [1]), ('question', [1]), ('exclamdown', [1]), ('questiondown', [1]), ('divide', [1, 2])):
        g = font[name]
        for i in idx:
            l2, b2, r2, t2 = bounds(g.contours[i]); c2 = ((l2 + r2) / 2, (b2 + t2) / 2)
            if style == 'square':
                # the dot sits where Golos's did: on the baseline, or under the top for the inverted marks
                y = dot[3] / 2 if b2 <= 0 else (t2 - (dot[3] - dot[1]) / 2 if name.endswith('down') else c2[1])
                replace(g, i, square(c2[0], y, pw, dot[3] - dot[1]))
    # the dot of i j and the dieresis: as wide as the stem, same centres
    if style == 'square':
        for name in ('dotaccentcomb', 'dotaccentcomb.case', 'dieresiscomb', 'dieresiscomb.case'):
            g = font[name]
            for i in range(len(g.contours)):
                l2, b2, r2, t2 = bounds(g.contours[i])
                replace(g, i, square((l2 + r2) / 2, (b2 + t2) / 2, iw, iw * DOT_HEIGHT))
    # colon and semicolon: the upper dot's top on the x-height; they, the middle dot and the comma
    # share the period's width; the ellipsis closes up round its smaller dots
    if style == 'square':
        xh = font.info.xHeight
        for name in ('colon', 'semicolon'):
            for c in font[name].components:
                tr = c.transformation
                if c.baseGlyph == 'period' and tr[5] > 0: c.transformation = (tr[0], tr[1], tr[2], tr[3], tr[4], round(xh - dot[3]))
        for name in ('colon', 'semicolon', 'periodcentered', 'comma'): font[name].width = p.width
        e = font['ellipsis']; step = pw + gap
        for k, c in enumerate(e.components):
            tr = c.transformation; c.transformation = (tr[0], tr[1], tr[2], tr[3], round(k * step), tr[5])
        e.width = round(p.width + 2 * step)
    # the comma and its family
    cm = font['comma']; l, b, r, t = bounds(cm.contours[0]); depth = -b
    shape = trapezoid_comma(dot) if COMMA == 'trapezoid' else stroke_comma(font, dot) if COMMA == 'stroke' else comma(dot, depth, style)
    cm.clearContours(); draw(cm, [shape])
    q = font['quotesinglbase']; q.clearContours()
    if style == 'square': q.width = p.width
    dx = (q.width - font['comma'].width) / 2
    draw(q, [[(x + dx, y, tp) for x, y, tp in shape]])
    # the quotes built from it: QUOTE_GAP between the two strokes, flipped ones re-anchored
    if style == 'square':
        xs_ = [x for x, _, _ in shape]; cw = max(xs_) - min(xs_)
        new_step = cw + QUOTE_GAP * pw
        for g in font:
            cs = [c for c in g.components if c.baseGlyph == 'quotesinglbase']
            if not cs or g.contours: continue
            # Golos turns the comma half round for the opening quotes ‘ “: the trapezoid then has its wide
            # end at the bottom, top level with the closing quotes'. (A straight stroke would lean the same
            # way both ends of a quote, so that one is mirrored instead.)
            xs = sorted(c.transformation[4] for c in cs)
            top = [c.transformation[5] for c in font['quoteright'].components][0]
            for c in cs:
                tr = c.transformation; k = xs.index(tr[4]); flip = tr[0] < 0
                ys = [y for _, y, _ in shape]
                if flip and COMMA == 'stroke':
                    c.transformation = (-1, 0, 0, 1, round(q.width + k * new_step), top)
                elif flip:
                    c.transformation = (-1, 0, 0, -1, round(q.width + k * new_step), round(top + max(ys) + min(ys)))
                else:
                    c.transformation = (tr[0], tr[1], tr[2], tr[3], round((q.width if flip else 0) + k * new_step), tr[5])
            g.width = round(q.width + (len(cs) - 1) * new_step)
    for name in ('commaaccentcomb', 'caroncomb.alt'):
        if name in font and font[name].contours:
            g = font[name]; box = bounds(g.contours[0]); g.clearContours(); draw(g, [fit_to(shape, box)])


if __name__ == '__main__':
    style = sys.argv[1] if len(sys.argv) > 1 else DOTS
    for st in ('Regular', 'Medium'):
        f = ufoLib2.Font.open(f'umo/GolosUMO-{st}.ufo'); run(f, style); f.save()
        print(st, style, 'stem', stem(f), 'period', bounds(f['period'].contours[0]), 'comma', bounds(f['comma'].contours[0]))
