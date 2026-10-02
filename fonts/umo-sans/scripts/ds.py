from fontTools.designspaceLib import DesignSpaceDocument, AxisDescriptor, SourceDescriptor, InstanceDescriptor
doc=DesignSpaceDocument()
a=AxisDescriptor(); a.tag='wght'; a.name='Weight'; a.minimum=400; a.default=400; a.maximum=500; doc.addAxis(a)
for name,loc in (('Regular',400),('Medium',500)):
    s=SourceDescriptor(); s.filename=f'UMOSans-{name}.ufo'; s.familyName='UMO Sans'; s.styleName=name; s.location={'Weight':loc}
    if name=='Regular': s.copyLib=s.copyInfo=s.copyGroups=s.copyFeatures=True
    doc.addSource(s)
    i=InstanceDescriptor(); i.familyName='UMO Sans'; i.styleName=name; i.location={'Weight':loc}; i.filename=f'instance_ufos/UMOSans-{name}.ufo'; doc.addInstance(i)
doc.write('umo/UMOSans.designspace')
