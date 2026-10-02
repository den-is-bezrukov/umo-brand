#!/usr/bin/env bash
# Rebuilds Golos UMO from the Golos Text sources (googlefonts/golos-text, pinned below).
# Needs: pip install fontmake glyphsLib ufoLib2 fontMath brotli
set -euo pipefail
cd "$(dirname "$0")"
UPSTREAM=cf2e27222937d97c2d858fff0499bcc667a64e9d
W=work; rm -rf "$W"; mkdir -p "$W"
git clone -q https://github.com/googlefonts/golos-text "$W/golos-text"
git -C "$W/golos-text" checkout -q "$UPSTREAM"
glyphs2ufo "$W/golos-text/sources/GolosText.glyphs" -m "$W/master_ufo" >/dev/null 2>&1
cp scripts/*.py scripts/delta.json scripts/checks/*.py "$W/"
mkdir -p "$W/umo"
cd "$W"
python3 build.py
python3 light.py
python3 ds.py
python3 check.py ../../../public/fonts/CoFoSans-Medium.ttf
(cd umo && fontmake -m GolosUMO.designspace -o variable --output-dir ../build --no-production-names >/dev/null 2>&1)
cd ..
python3 - <<'PY'
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
vf='work/build/GolosUMO-VF.ttf'
f=TTFont(vf); f.save('GolosUMO[wght].ttf'); f.flavor='woff2'; f.save('GolosUMO[wght].woff2')
for w,n in ((400,'Regular'),(500,'Medium')):
    s=instancer.instantiateVariableFont(TTFont(vf),{'wght':w})
    nt=s['name']
    for i in (16,17,25): nt.removeNames(nameID=i)
    nt.setName('Golos UMO' if n=='Regular' else f'Golos UMO {n}',1,3,1,0x409)
    nt.setName('Regular',2,3,1,0x409)
    nt.setName(f'Golos UMO {n}',4,3,1,0x409)
    nt.setName(f'GolosUMO-{n}',6,3,1,0x409)
    if n!='Regular':
        nt.setName('Golos UMO',16,3,1,0x409); nt.setName(n,17,3,1,0x409)
    s['OS/2'].usWeightClass=w
    s.save(f'GolosUMO-{n}.ttf'); s.flavor='woff2'; s.save(f'GolosUMO-{n}.woff2')
PY
rm -rf "$W"
ls -la *.ttf *.woff2
