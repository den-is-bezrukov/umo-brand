"""Drawn details on the two final styles (run after final.py):
- M: the vertex comes down to VERTEX_Y, the diagonals turning about their top joints and keeping
  their thickness across the stroke, so they get steeper;
- Q: the tail turns to TAIL_ANGLE and reaches TAIL_BOTTOM below the baseline, keeping its thickness
  and square-cut ends; it is re-cut into the bowl, with the same points as before;
- G.ss01: G with a spur, the right side running straight down from the bar to the baseline
  (stylistic set 1, also for Ğ Ģ Ġ);
- Л л, Д д: geometric legs. Golos bends them over most of their height, like a sabre; here they
  stand straight and turn only near the foot. Л's turn into its foot is close to a quarter circle
  (EL_BEND times as tall as wide) and the foot lies flat on the baseline with a square end;
  Д's legs flare along a clothoid into the slab."""
import math, copy, ufoLib2

VERTEX_Y = 65       # M vertex, font units above the baseline (Golos UMO had 143-151)
TOP_JOINT = 50      # the M diagonals start this far in from the stems' inner edge at the top (Golos: at the edge)
TAIL_ANGLE = 53     # Q tail, degrees below the horizontal (Golos 43)
TAIL_BOTTOM = -85   # lowest corner of the Q tail (Golos about -30)
# G.ss01, per style: spur width and the height where the bowl runs into it (None keeps the shape
# that falls out of the drawing: the spur as wide as the jaw, the bowl cut where it meets the spur).
# Medium needs both, or the bowl merges into the spur at the baseline in a dark knot.
DE_LANDING = 44     # Д д: angle at which the legs land on the slab (Golos 62-69, a 21-28° turn too small to read)
DE_REACH = 15       # Д д: the legs land this much further out than Golos's, so the flare reads at a lower height
DE_SPLIT = 0.55     # where along the flare its two cubic pieces meet
# handle lengths as a share of the turn's extent. Л's leg turns left into its foot: the convex
# side of the turn (the leg's right edge running round to the foot's underside) is nearly a circle,
# so no weight piles up in the corner; the concave side (the leg's left edge meeting the top of the
# foot) is tighter and squarer.
# The concave side (the leg's left edge turning into the top of the foot) follows Д's leg: Л and Д
# are drawn the same way, so it starts turning as far above the convex side as Д's outer edge starts
# above its inner one, takes its top handle by Д's rule and goes on turning to the horizontal of the
# foot where Д lands on the slab. The stroke then stays between the foot's and the leg's thickness
# all the way round. A tight turn of its own pinched it to 0.8 of the leg; Д's full flare height
# (taller in Regular, whose Д legs lean more) made a wedge 150 units long.
EL_FOOT_TENSION = 0.75
EL_FOOT_RATIO = 0.97   # the foot as thick as the leg, nearly (Golos 0.88; CoFo 0.97-0.99)
EL_FOOT_REACH = 12     # the foot reaches this much further left than Golos's
# the convex side starts its turn a little higher (EL_CONVEX_BEND times as tall as wide) with a long
# handle at the leg and a short one at the foot: it leaves the straight with the curvature CoFo has
# there (under 18; CoFo 17), and the stroke round the turn stays within 0.95-1.08 of the leg (searched
# over both styles, with the foot as thick as the leg)
EL_CONVEX_BEND = 1.2
EL_CONVEX_LEG = 0.8
EL_CONVEX_FOOT = 0.6
# Д's legs flare along a clothoid: the curvature grows evenly from nothing where the straight leg ends
# to its most where the leg lands on the slab, the smoothest way out of a straight. Its height follows
# from the landing angle (3.7 times the flare's width at 44°), so the flare is kept low by reaching
# further out, not by squeezing the curve. Drawn as two cubics fitted to the spiral.
DE_TOP_TENSION = 0.9   # Л's concave turn still takes its top handle by this rule
REDRAWN = ['El-cy', 'el-cy', 'De-cy', 'de-cy']   # redrawn with a different number of points than Golos's
SPUR_WIDTH = {'Regular': None, 'Medium': 108}
CROTCH_Y = {'Regular': None, 'Medium': 68}
TAIL_SHIFT = -65    # the tail's line moves this far left, so it cuts into the bowl nearer its middle


def line_x(p, d, x):
    """point on the line through p with direction d at abscissa x"""
    t = (x - p[0]) / d[0]
    return (p[0] + d[0] * t, p[1] + d[1] * t)


def dist(p, a, d):
    """distance from p to the line through a with unit direction d"""
    return abs((p[0] - a[0]) * d[1] - (p[1] - a[1]) * d[0])


def fix_m(g):
    P = [(p.x, p.y) for p in g.contours[0].points]
    # 0 (x0,0) 1 (xs,0) 2 stem/diagonal joint 3 vertex left 4 vertex right 5 joint 6 (xs',0) 7 (x1,0)
    # 8 (x1,700) 9 top right 10 crotch 11 top left 12 (x0,700)
    cx = (P[0][0] + P[7][0]) / 2
    up = (P[10][0] - P[11][0], P[10][1] - P[11][1]); n = math.hypot(*up); up = (up[0] / n, up[1] / n)
    w = dist(P[3], P[11], up)                 # thickness across the diagonal
    T = (P[11][0] + TOP_JOINT, P[11][1])
    V = (P[3][0], VERTEX_Y)
    # turn the upper edge about T, from flat towards the vertex, until the vertex is w away from it
    lo, hi = -0.01, math.atan2(V[1] - T[1], V[0] - T[0])
    for _ in range(60):
        mid = (lo + hi) / 2; d = (math.cos(mid), math.sin(mid))
        # signed: positive while the vertex is further than w from the edge
        if dist(V, T, d) > w: lo = mid
        else: hi = mid
    d = (math.cos(lo), math.sin(lo))
    crotch = line_x(T, d, cx)
    joint = line_x(V, d, P[1][0])
    new = list(P)
    new[2] = joint; new[3] = V
    new[11] = T; new[9] = (2 * cx - T[0], T[1])
    new[10] = (cx, crotch[1]); new[4] = (2 * cx - V[0], V[1]); new[5] = (2 * cx - joint[0], joint[1])
    for p, q in zip(g.contours[0].points, new):
        p.x, p.y = round(q[0]), round(q[1])


def bez(P, t):
    m = 1 - t
    return (m**3 * P[0][0] + 3 * m * m * t * P[1][0] + 3 * m * t * t * P[2][0] + t**3 * P[3][0],
            m**3 * P[0][1] + 3 * m * m * t * P[1][1] + 3 * m * t * t * P[2][1] + t**3 * P[3][1])


def split(P, t):
    """de Casteljau: the two halves of cubic P at t"""
    l = lambda a, b: (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    a, b, c = l(P[0], P[1]), l(P[1], P[2]), l(P[2], P[3])
    d, e = l(a, b), l(b, c); f = l(d, e)
    return [P[0], a, d, f], [f, e, c, P[3]]


def hit(P, p0, d):
    """parameter where cubic P crosses the line through p0 with direction d"""
    side = lambda t: (bez(P, t)[0] - p0[0]) * d[1] - (bez(P, t)[1] - p0[1]) * d[0]
    ts = [i / 200 for i in range(201)]
    for a, b in zip(ts, ts[1:]):
        if side(a) == 0: return a
        if side(a) * side(b) < 0:
            for _ in range(50):
                m = (a + b) / 2
                if side(a) * side(m) <= 0: b = m
                else: a = m
            return (a + b) / 2
    raise ValueError('tail misses the bowl')


def fix_q(font):
    q = font['Q']; o = font['O']
    out, inn = q.contours[0].points, q.contours[1].points
    po = [(p.x, p.y) for p in o.contours[0].points]
    pi = [(p.x, p.y) for p in o.contours[1].points]
    outer = [po[0], po[1], po[2], po[3]]            # bottom extremum -> right side
    inner = [pi[-3 + 0 - 0] if False else pi[11], pi[12], pi[13], pi[0]]  # right side -> bottom extremum
    assert (out[9].x, out[9].y) == outer[3] and (inn[11].x, inn[11].y) == inner[0], 'Q bowl is not O'
    J1, J2 = (out[3].x, out[3].y), (out[6].x, out[6].y)
    BL, BR = (out[4].x, out[4].y), (out[5].x, out[5].y)
    w = math.dist(BL, BR)                           # the ends are cut square
    M0 = ((J1[0] + J2[0]) / 2 + TAIL_SHIFT, (J1[1] + J2[1]) / 2)
    TR, TL = (inn[15].x, inn[15].y), (inn[16].x, inn[16].y)
    top_len = math.dist(M0, ((TR[0] + TL[0]) / 2, (TR[1] + TL[1]) / 2))
    a = math.radians(TAIL_ANGLE); d = (math.cos(a), -math.sin(a))
    nl = (-math.sin(a), -math.cos(a)); nr = (math.sin(a), math.cos(a))   # towards the lower-left / upper-right edge
    off = lambda p, n, s: (p[0] + n[0] * s, p[1] + n[1] * s)
    left0, right0 = off(M0, nl, w / 2), off(M0, nr, w / 2)
    # bottom end: the lower (left-edge) corner sits on TAIL_BOTTOM
    lb = (TAIL_BOTTOM - left0[1]) / d[1]
    bl = (left0[0] + d[0] * lb, left0[1] + d[1] * lb); br = off(bl, nr, w)
    tc = (M0[0] - d[0] * top_len, M0[1] - d[1] * top_len)
    tl, tr = off(tc, nl, w / 2), off(tc, nr, w / 2)
    t1 = hit(outer, left0, d); t2 = hit(outer, right0, d)
    s1 = hit(inner, right0, d); s2 = hit(inner, left0, d)
    A, _ = split(outer, t1); _, B = split(outer, t2)
    C, _ = split(inner, s1); _, D = split(inner, s2)
    coords = {0: A[0], 1: A[1], 2: A[2], 3: A[3], 4: bl, 5: br, 6: B[0], 7: B[1], 8: B[2], 9: B[3]}
    for i, c in coords.items(): out[i].x, out[i].y = round(c[0]), round(c[1])
    icoords = {11: C[0], 12: C[1], 13: C[2], 14: C[3], 15: tr, 16: tl, 17: D[0], 18: D[1], 19: D[2], 0: D[3]}
    for i, c in icoords.items(): inn[i].x, inn[i].y = round(c[0]), round(c[1])


def g_spur(font, style):
    g = font['G']; s = font.newGlyph('G.ss01') if 'G.ss01' not in font else font['G.ss01']
    s.clear(); s.width = g.width
    for a in g.anchors: s.appendAnchor(dict(name=a.name, x=a.x, y=a.y))
    pts = [(p.x, p.y, p.type) for p in g.contours[0].points]
    # 0 bottom extremum, 1-2 handles, 3 right side, 4 bar top right, 5-6 bar left, 7 bar bottom right
    # (start of the jaw's inner curve), 8-9 its handles, 10 inner bottom ...
    R = pts[3][0]; xi = pts[7][0] if SPUR_WIDTH[style] is None else R - SPUR_WIDTH[style]
    outer = [(pts[0][0], pts[0][1]), (pts[1][0], pts[1][1]), (pts[2][0], pts[2][1]), (pts[3][0], pts[3][1])]
    if CROTCH_Y[style] is None:
        t = hit(outer, (xi, 0), (0, 1))             # where the bowl meets the spur's inner edge
        A, _ = split(outer, t)
    else:
        # cut the bowl where it reaches the crotch height and draw that stretch in to the spur's edge:
        # the curve climbs faster and thins as it meets the spur (an ink trap)
        t = hit(outer, (0, CROTCH_Y[style]), (1, 0))
        A, _ = split(outer, t)
        x0 = A[0][0]; k = (xi - x0) / (A[3][0] - x0)
        A = [(x0 + (x - x0) * k, y) for x, y in A]
    new = [(A[0][0], A[0][1], 'curve'), (A[1][0], A[1][1], None), (A[2][0], A[2][1], None), (xi, A[3][1], 'curve'),
           (xi, 0, 'line'), (R, 0, 'line'), (R, pts[4][1], 'line')]
    new += pts[5:7] + [(xi, pts[7][1], 'line')]   # the bar runs to the spur's inner edge
    new += [(xi, pts[8][1], None)] + pts[9:]        # the inner curve leaves the bar vertically
    pen = s.getPointPen(); pen.beginPath()
    for x, y, tp in new: pen.addPoint((round(x), round(y)), segmentType=tp)
    pen.endPath()
    for c in g.contours[1:]: s.appendContour(copy.deepcopy(c))
    for base in ('Gbreve', 'Gcommaaccent', 'Gdotaccent'):
        src = font[base]; alt = font.newGlyph(base + '.ss01') if base + '.ss01' not in font else font[base + '.ss01']
        alt.clear(); alt.width = src.width
        for i, c in enumerate(src.components):
            alt.components.append(ufoLib2.objects.Component(baseGlyph='G.ss01' if i == 0 else c.baseGlyph, transformation=c.transformation))
        for a in src.anchors: alt.appendAnchor(dict(name=a.name, x=a.x, y=a.y))
    fea = font.features.text
    if 'feature ss01' not in fea:
        font.features.text = fea + '''
feature ss01 {
    featureNames { name "G with spur"; };
    sub G by G.ss01;
    sub Gbreve by Gbreve.ss01;
    sub Gcommaaccent by Gcommaaccent.ss01;
    sub Gdotaccent by Gdotaccent.ss01;
} ss01;
'''
    order = font.lib.get('public.glyphOrder')
    if order is not None:
        for n in ('G.ss01', 'Gbreve.ss01', 'Gcommaaccent.ss01', 'Gdotaccent.ss01'):
            if n not in order: order.append(n)


def fix_el(g, lag):
    """Л л: 0 bottom of the convex side of the turn, 1-2 handles, 3 where it leaves the leg's right edge,
    4-9 the straight part, 10 where the concave side leaves the leg's left edge, 11-12 handles, 13 foot top, 14-15 handles, 16 foot end top,
    17 foot end bottom, 18-19 handles"""
    P = [(p.x, p.y) for p in g.contours[0].points]
    x0, xi, xo = P[0][0], P[3][0], P[10][0]
    xf, xt = P[13][0], P[16][0] - EL_FOOT_REACH
    yf = round(EL_FOOT_RATIO * (xi - xo))
    yi = EL_CONVEX_BEND * (xi - x0); yo = yi + lag
    new = [((x0, 0), 'line'), ((x0 + EL_CONVEX_FOOT * (xi - x0), 0), None), ((xi, yi - EL_CONVEX_LEG * yi), None), ((xi, yi), 'curve')]
    new += [(P[i], 'line') for i in range(4, 10)]
    new += [((xo, yo), 'line'), ((xo, yo - DE_TOP_TENSION * (yo - yf)), None), ((xf + EL_FOOT_TENSION * (xo - xf), yf), None), ((xf, yf), 'curve'),
            ((xt, yf), 'line'), ((xt, 0), 'line')]
    g.clearContours(); pen = g.getPointPen(); pen.beginPath()
    for (x, y), tp in new: pen.addPoint((round(x), round(y)), segmentType=tp)
    pen.endPath()


def clothoid(turn, n=400):
    """unit clothoid leaving straight down and turning left by `turn` radians: points, unit tangents"""
    smax = math.sqrt(2 * turn); pts = [(0.0, 0.0)]; tans = [(0.0, -1.0)]; x = y = 0.0
    for j in range(n):
        s0, s1 = j / n * smax, (j + 1) / n * smax; ph = ((s0 + s1) / 2) ** 2 / 2
        x -= math.sin(ph) * (s1 - s0); y -= math.cos(ph) * (s1 - s0)
        pts.append((x, y)); p1 = s1 * s1 / 2; tans.append((-math.sin(p1), -math.cos(p1)))
    return pts, tans


def fit(pts, t0, t3):
    """cubic from pts[0] to pts[-1] with the given end tangents, handle lengths by least squares"""
    P0, P3 = pts[0], pts[-1]
    L = [0.0]
    for a, b in zip(pts, pts[1:]): L.append(L[-1] + math.dist(a, b))
    rows, rhs = [], []
    for p, l in zip(pts, L):
        t = l / L[-1]; b0, b1, b2, b3 = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3
        for k in (0, 1):
            base = (b0 + b1) * P0[k] + (b2 + b3) * P3[k]
            rows.append((b1 * t0[k], -b2 * t3[k])); rhs.append(p[k] - base)
    # 2x2 normal equations
    a11 = sum(r[0] * r[0] for r in rows); a12 = sum(r[0] * r[1] for r in rows); a22 = sum(r[1] * r[1] for r in rows)
    b1_ = sum(r[0] * v for r, v in zip(rows, rhs)); b2_ = sum(r[1] * v for r, v in zip(rows, rhs))
    det = a11 * a22 - a12 * a12; ha = (b1_ * a22 - b2_ * a12) / det; hb = (a11 * b2_ - a12 * b1_) / det
    return [P0, (P0[0] + ha * t0[0], P0[1] + ha * t0[1]), (P3[0] - hb * t3[0], P3[1] - hb * t3[1]), P3]


def flare(top_x, landing):
    """the leg from where it leaves the straight (x = top_x) down to `landing` on the slab, flaring left:
    returns the top point and two cubics, top to slab"""
    pts, tans = clothoid(math.radians(90 - DE_LANDING))
    k = (top_x - landing[0]) / -pts[-1][0]               # scale so it spans the leg's horizontal reach
    P = [(landing[0] + (x - pts[-1][0]) * k, landing[1] + (y - pts[-1][1]) * k) for x, y in pts]
    m = int(len(P) * DE_SPLIT)
    A = fit(P[:m + 1], tans[0], tans[m]); B = fit(P[m:], tans[m], tans[-1])
    return P[0], A, B


def fix_de(g):
    """Д д: outer contour 10 top of the flare, 11-12 handles, 13 landing on the slab;
    inner contour 0 landing, 1-2 handles, 3 top of the flare. Each flare becomes two cubics."""
    tops = []
    o = g.contours[0]; P = [(p.x, p.y, p.type) for p in o.points]
    land = (P[13][0] - DE_REACH, P[13][1]); top, A, B = flare(P[10][0], land)
    new = P[:10] + [(top[0], top[1], 'line'), (*A[1], None), (*A[2], None), (*A[3], 'curve'),
                    (*B[1], None), (*B[2], None), (land[0], land[1], 'curve')] + P[14:]
    tops.append(top[1])
    i = g.contours[1]; Q = [(p.x, p.y, p.type) for p in i.points]
    land = (Q[0][0] - DE_REACH, Q[0][1]); top, A, B = flare(Q[3][0], land)
    newi = [(land[0], land[1], 'line'), (*B[2], None), (*B[1], None), (*B[0], 'curve'),
            (*A[2], None), (*A[1], None), (top[0], top[1], 'curve')] + Q[4:]
    tops.append(top[1])
    g.clearContours()
    for pts in (new, newi):
        pen = g.getPointPen(); pen.beginPath()
        for x, y, tp in pts: pen.addPoint((round(x), round(y)), segmentType=tp)
        pen.endPath()
    return tops

if __name__ == '__main__':
    for st in ('Regular', 'Medium'):
        f = ufoLib2.Font.open(f'umo/GolosUMO-{st}.ufo')
        fix_m(f['M']); fix_q(f); g_spur(f, st)
        for el, de in (('El-cy', 'De-cy'), ('el-cy', 'de-cy')):
            outer_top, inner_top = fix_de(f[de])
            fix_el(f[el], outer_top - inner_top)   # Д's outer edge starts its flare this far above the inner
        f.save()
        print(st, 'M', [(p.x, p.y) for p in f['M'].contours[0].points][2:6],
              'Q tail', [(p.x, p.y) for p in f['Q'].contours[0].points][3:7])
