"""Build print faces from the bundled variable Geist; merge overlaps before even-odd outline filling.

Requires fonttools[woff] and skia-pathops. The web WOFF2 stays the original variable font.
Run from any directory: python3 brand/posset/scripts/prepare-fonts.py
"""
from pathlib import Path
import pathops
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.misc.roundTools import otRound
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.ttLib.removeOverlaps import removeOverlaps

FONTS = Path(__file__).resolve().parent.parent / 'public' / 'fonts'
for weight, style in [(400, 'Regular'), (500, 'Medium')]:
    font = TTFont(FONTS / 'Geist.woff2')
    font.flavor = None
    font = instantiateVariableFont(font, {'wght': weight}, inplace=True)
    advances = {name: otRound(width) for name, (width, _) in font['hmtx'].metrics.items()}
    removeOverlaps(font)
    for name_id, text in [(2, style), (4, f'Geist {style}'), (6, f'Geist-{style}'), (17, style)]:
        for record in font['name'].names:
            if record.nameID == name_id:
                record.string = text.encode(record.getEncoding())
    font.save(FONTS / f'Geist-{style}.ttf')
    # Check the saved TrueType, after integer rounding, not only the in-memory contours.
    saved = TTFont(FONTS / f'Geist-{style}.ttf')
    assert {name: width for name, (width, _) in saved['hmtx'].metrics.items()} == advances, 'Outline cleanup changed spacing'
    glyphs = saved.getGlyphSet()
    for name in saved.getGlyphOrder():
        recording = DecomposingRecordingPen(glyphs)
        glyphs[name].draw(recording)
        outline = pathops.Path()
        recording.replay(outline.getPen())
        outline.fillType = pathops.FillType.WINDING
        nonzero_area = pathops.simplify(outline).area
        outline.fillType = pathops.FillType.EVEN_ODD
        evenodd_area = pathops.simplify(outline).area
        assert abs(nonzero_area - evenodd_area) < 0.1, f'Overlapping contours: {name}'
    print(f'Geist-{style}.ttf: all glyphs pass even-odd/nonzero parity, spacing unchanged')
