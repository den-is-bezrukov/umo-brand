import ufoLib2
for m in ['Regular','Medium','SemiBold','Bold','Black']:
    f=ufoLib2.Font.open(f'umo/GolosUMO-{m}.ufo'); f.info.familyName='Golos UMO'; f.info.styleMapFamilyName=None
    f.info.postscriptFontName=f'GolosUMO-{m}'; f.info.openTypeNameUniqueID=None; f.save()
