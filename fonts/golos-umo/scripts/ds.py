from fontTools.designspaceLib import DesignSpaceDocument, AxisDescriptor, SourceDescriptor, InstanceDescriptor
import ufoLib2
L=ufoLib2.Font.open('umo/GolosUMO-Light.ufo'); L.info.styleName='Regular'; L.info.postscriptFontName='GolosUMO-Regular'
L.info.versionMajor=0; L.info.versionMinor=1
L.info.copyright='Copyright 2019 The Golos Text Project Authors (https://github.com/googlefonts/golos-text). Golos UMO modifications 2026.'
L.info.openTypeNameDescription='Golos UMO: a modified version of Golos Text (OFL) with wider capitals and figures and a lighter Regular.'
L.info.openTypeOS2VendorID='NONE'
L.save()
doc=DesignSpaceDocument()
a=AxisDescriptor(); a.tag='wght'; a.name='Weight'; a.minimum=400; a.default=400; a.maximum=900
a.map=[(400,375),(500,540),(600,600),(700,700),(800,800),(900,900)]
doc.addAxis(a)
for name,loc in [('Light',375),('Regular',400),('Medium',500),('SemiBold',600),('Bold',700),('Black',900)]:
    s=SourceDescriptor(); s.filename=f'GolosUMO-{name}.ufo'; s.familyName='Golos UMO'; s.styleName=name; s.location={'Weight':loc}
    if name=='Light': s.copyLib=s.copyInfo=s.copyGroups=s.copyFeatures=True
    doc.addSource(s)
for name,loc in [('Regular',375),('Medium',540),('SemiBold',600),('Bold',700),('ExtraBold',800),('Black',900)]:
    i=InstanceDescriptor(); i.familyName='Golos UMO'; i.styleName=name; i.location={'Weight':loc}; i.filename=f'instance_ufos/GolosUMO-{name}.ufo'; doc.addInstance(i)
doc.write('umo/GolosUMO.designspace')
