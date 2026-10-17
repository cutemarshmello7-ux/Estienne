import bpy, math, re, xml.etree.ElementTree as ET, sys
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'render-work';OUT.mkdir(exist_ok=True)
SVG=ROOT/'assets/estienne-monogram.svg'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
prefs=bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type='OPTIX';prefs.get_devices()
for d in prefs.devices:d.use=d.type=='OPTIX'
scene.cycles.device='GPU'
scene.render.resolution_x=960;scene.render.resolution_y=540;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-1
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.21,.19,.16,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.25
scene.unit_settings.system='METRIC'
def rgba(c):
    c=c.lstrip('#');v=[int(c[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(((x+.055)/1.055)**2.4 if x>.04045 else x/12.92 for x in v)+(1,)
def material(name,color,rough=.7,metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=rgba(color)
    bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    return m,bs
paper,bs=material('Warm ivory - short cotton fibres','#eee5d2',.93)
bs.inputs['Subsurface Weight'].default_value=.025
bs.inputs['Subsurface Scale'].default_value=.00015
n=paper.node_tree.nodes;l=paper.node_tree.links
tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=8500;tex.inputs['Detail'].default_value=2.2
coord=n.new('ShaderNodeTexCoord');l.new(coord.outputs['Object'],tex.inputs['Vector'])
bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.22;bump.inputs['Distance'].default_value=.000012
l.new(tex.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],bs.inputs['Normal'])
foil,fb=material('Champagne hot foil - fine surface variation','#c9a770',.235,1)
anisotropic=fb.inputs.get('Anisotropic IOR Level') or fb.inputs.get('Anisotropic')
if anisotropic:anisotropic.default_value=.22
fn=foil.node_tree.nodes;fl=foil.node_tree.links
ft=fn.new('ShaderNodeTexNoise');ft.inputs['Scale'].default_value=17000;ft.inputs['Detail'].default_value=1.5
fc=fn.new('ShaderNodeTexCoord');fl.new(fc.outputs['Object'],ft.inputs['Vector'])
fr=fn.new('ShaderNodeMapRange');fr.inputs['From Min'].default_value=0;fr.inputs['From Max'].default_value=1
fr.inputs['To Min'].default_value=.16;fr.inputs['To Max'].default_value=.29
fl.new(ft.outputs['Fac'],fr.inputs['Value']);fl.new(fr.outputs['Result'],fb.inputs['Roughness'])
edge,edgebs=material('Hand painted oxblood edge','#4b1d22',.65)
ground,gb=material('Warm mineral studio surface','#7e7466',.87)

# Real paper scan detail complements the geometric microfibres and broad relief.
paper_scan=bpy.data.images.load(str(ROOT/'assets/cotton-paper.webp'));paper_scan.colorspace_settings.name='Non-Color'
image=n.new('ShaderNodeTexImage');image.image=paper_scan;image.extension='REPEAT'
mapping=n.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(48,48,48)
l.new(coord.outputs['Object'],mapping.inputs[0]);l.new(mapping.outputs['Vector'],image.inputs['Vector'])
l.new(image.outputs['Color'],bump.inputs['Height']);bump.inputs['Strength'].default_value=.7;bump.inputs['Distance'].default_value=.00006
en=edge.node_tree.nodes;el=edge.node_tree.links
et=en.new('ShaderNodeTexNoise');et.inputs['Scale'].default_value=14000;et.inputs['Detail'].default_value=2
etcoord=en.new('ShaderNodeTexCoord');el.new(etcoord.outputs['Object'],et.inputs['Vector'])
ebump=en.new('ShaderNodeBump');ebump.inputs['Strength'].default_value=.5;ebump.inputs['Distance'].default_value=.000012
el.new(et.outputs['Fac'],ebump.inputs['Height']);el.new(ebump.outputs['Normal'],edgebs.inputs['Normal'])


def box(name,dim,loc,mat,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dim
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
    if bevel:
        m=o.modifiers.new('Fine cut edge','BEVEL');m.width=bevel;m.segments=3
        o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    return o

# One continuous paper surface. The relief is vertex displacement of that
# surface, never a separate extrusion laid on top of it.
import numpy as np, random
height_img=bpy.data.images.load(str(ROOT/'assets/maps/emboss-height-16.png'))
height_img.colorspace_settings.name='Non-Color'
hw,hh=height_img.size
height=np.array(height_img.pixels[:],dtype=np.float32).reshape(hh,hw,4)[:,:,0]
view=list(map(float,ET.parse(SVG).getroot().attrib['viewBox'].split()))
mark_h=.026;mark_w=mark_h*view[2]/view[3]
mx,my=-.018,.001
def paper_height(x,y):
    u=np.clip((np.asarray(x)-(mx-mark_w/2))/mark_w,0,1)*(hw-1)
    v=np.clip((np.asarray(y)-(my-mark_h/2))/mark_h,0,1)*(hh-1)
    inside=(np.asarray(x)>=mx-mark_w/2)&(np.asarray(x)<=mx+mark_w/2)&(np.asarray(y)>=my-mark_h/2)&(np.asarray(y)<=my+mark_h/2)
    x0=np.floor(u).astype(int);y0=np.floor(v).astype(int);x1=np.minimum(x0+1,hw-1);y1=np.minimum(y0+1,hh-1)
    a=u-x0;b=v-y0
    h=(height[y0,x0]*(1-a)*(1-b)+height[y0,x1]*a*(1-b)+height[y1,x0]*(1-a)*b+height[y1,x1]*a*b)
    return .0009+.00017*h*inside
rig=bpy.data.objects.new('Cotton card - physical delivery rig',None);bpy.context.collection.objects.link(rig)
for i in range(3):
    layer=box('Cotton ply '+str(i+1),(.085,.055,.0003),(0,0,.00015+i*.0003),edge if i==1 else paper,.000025)
    layer.parent=rig
    if i==2:
        # Keep the flat top behind the displaced continuous face.
        layer.location.z-=.000003
def patch(name,x0,x1,y0,y1,nx,ny):
    xs=np.linspace(x0,x1,nx+1);ys=np.linspace(y0,y1,ny+1)
    xx,yy=np.meshgrid(xs,ys);zz=paper_height(xx,yy)
    verts=np.column_stack((xx.ravel(),yy.ravel(),zz.ravel())).tolist()
    row=nx+1
    faces=[(j*row+i,j*row+i+1,(j+1)*row+i+1,(j+1)*row+i) for j in range(ny) for i in range(nx)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.parent=rig;mesh.materials.append(paper)
    for p in mesh.polygons:p.use_smooth=True
    return obj
pad=.0005;left=mx-mark_w/2-pad;right=mx+mark_w/2+pad;bottom=my-mark_h/2-pad;top=my+mark_h/2+pad
patch('Paper and embossed shoulders - single deformed mesh',left,right,bottom,top,1000,1045)
patch('Paper / west',-.0425,left,-.0275,.0275,36,100)
patch('Paper / east',right,.0425,-.0275,.0275,100,100)
patch('Paper / south',left,right,-.0275,bottom,80,50)
patch('Paper / north',left,right,top,.0275,80,50)

# Short, irregular cotton fibres give true near-field parallax. Their roots
# follow the displaced surface, including the shoulders of the blind emboss.
random.seed(47)
fib=bpy.data.curves.new('Cotton fibres / real geometry','CURVE');fib.dimensions='3D';fib.resolution_u=1
fib.bevel_depth=.0000015;fib.bevel_resolution=1;fib.resolution_u=1
for i in range(12500):
    x=random.uniform(-.0424,.0424);y=random.uniform(-.0274,.0274)
    angle=random.random()*math.tau;length=random.uniform(.00009,.00048)
    sp=fib.splines.new('POLY');sp.points.add(2)
    for j,p in enumerate(sp.points):
        xx=x+math.cos(angle)*length*(j/2-.5);yy=y+math.sin(angle)*length*(j/2-.5)
        zz=float(paper_height(xx,yy))+.0000003+(math.sin(j*math.pi/2)*random.uniform(.0000005,.000002))
        p.co=(xx,yy,zz,1)
fo=bpy.data.objects.new('Cotton fibre detail',fib);bpy.context.collection.objects.link(fo);fo.parent=rig;fib.materials.append(paper)

font=bpy.data.fonts.load('C:/Windows/Fonts/GARA.TTF')
italic=bpy.data.fonts.load('C:/Windows/Fonts/GARAIT.TTF')
for name,body,size,pos,font in [
    ('ESTIENNE - thin foil','E S T I E N N E',.0026,(.019,-.013,.000904),font),
    ('Studio signature','Modern print studio',.0017,(.019,-.017,.000904),italic)]:
    c=bpy.data.curves.new(name,'FONT');c.body=body;c.font=font;c.size=size;c.align_x='CENTER';c.extrude=.000001
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.location=pos;o.parent=rig;c.materials.append(foil)

table=box('Warm stone tabletop',(.8,.8,.014),(0,0,-.00705),ground,.0001)
tn=ground.node_tree.nodes;tl=ground.node_tree.links
stone=tn.new('ShaderNodeTexNoise');stone.inputs['Scale'].default_value=420;stone.inputs['Detail'].default_value=2
tc=tn.new('ShaderNodeTexCoord');tl.new(tc.outputs['Object'],stone.inputs['Vector'])
tb=tn.new('ShaderNodeBump');tb.inputs['Strength'].default_value=.14;tb.inputs['Distance'].default_value=.000035
tl.new(stone.outputs['Fac'],tb.inputs['Height']);tl.new(tb.outputs['Normal'],gb.inputs['Normal'])

# The envelope is present throughout the shot, outside the initial framing.
# Its open south-facing mouth is genuine geometry and occludes the inserted card.
envelope_mat,eb=material('Warm grey cotton envelope','#b0a28f',.84)
lining,_=material('Oxblood envelope lining','#5e282c',.77)
env_y=.062;mouth=.0305
env_back=box('Envelope back',(.092,.063,.00018),(0,env_y,.00010),envelope_mat,.00005)
env_liner=box('Lining inside mouth',(.089,.059,.00004),(0,env_y,.00021),lining,.00001)
def polygon(name,coords,mat):
    m=bpy.data.meshes.new(name);m.from_pydata(coords,[],[tuple(range(len(coords)))]);m.update()
    o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);m.materials.append(mat);return o
polygon('Envelope left fold',[(-.046,mouth,.00135),(-.046,.0935,.00135),(.001,.068,.00135)],envelope_mat)
polygon('Envelope right fold',[(.046,mouth,.00135),(-.001,.068,.00135),(.046,.0935,.00135)],envelope_mat)
polygon('Envelope pocket',[(-.046,.0935,.0014),(-.046,.049,.0014),(0,.034,.0014),(.046,.049,.0014),(.046,.0935,.0014)],envelope_mat)
polygon('Open envelope flap',[(-.046,mouth,.00018),(0,.011,.00022),(.046,mouth,.00018)],envelope_mat)

def area(name,loc,power,size,color=(1,1,1),target=(0,0,0),size_y=None):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='RECTANGLE';d.size=size;d.size_y=size_y or size;d.color=color
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o
key=area('Low grazing morning softbox',(-.12,-.08,.023),4,.10,(1,.88,.72),size_y=.003)
area('Cool open sky',(.06,.03,.12),.25,.14,(.82,.91,1),size_y=.11)
area('Long reflection in foil',(.01,.05,.08),.3,.10,(1,.97,.88),size_y=.006)
window=area('Window revealed with the whole object',(-.06,-.04,.16),0,.14,(1,.94,.84),size_y=.11)
camdata=bpy.data.cameras.new('Terrain / one continuous camera');cam=bpy.data.objects.new('Terrain camera',camdata);bpy.context.collection.objects.link(cam);scene.camera=cam
camdata.clip_start=.000025;camdata.clip_end=3;camdata.lens=100
focus=bpy.data.objects.new('Moving focus - anchored to the paper',None);bpy.context.collection.objects.link(focus)
camdata.dof.use_dof=True;camdata.dof.focus_object=focus

keys=[
 (0,(-.036,-.021,.0019),(-.030,-.013,.00091),100,45),
 (3.5,(-.031,-.010,.0019),(-.026,-.004,.0010),100,45),
 (5.5,(-.023,-.005,.0022),(-.018,.001,.0010),92,40),
 (7.5,(-.010,-.007,.0034),(.002,-.010,.0009),85,36),
 (9.5,(.015,-.017,.0018),(.021,-.013,.000905),85,36),
 (11,(.028,-.022,.0023),(.031,-.0273,.0009),85,32),
 (12.3,(.034,-.0287,.0017),(.033,-.0275,.0006),75,28),
 (14,(.038,-.035,.004),(.032,-.0274,.0005),65,20),
 (15.6,(.059,-.067,.030),(.008,-.006,.0008),52,12),
 (18,(.082,-.132,.15),(-.022,.015,.0009),50,7.1),
 (19.4,(.09,-.15,.205),(-.025,.022,.0010),50,5.6),
 (21,(.095,-.159,.24),(-.025,.027,.0010),50,5.6)
]
times=[k[0] for k in keys]
def pchip(t,values):
    n=len(values);d=[(values[i+1]-values[i])/(times[i+1]-times[i]) for i in range(n-1)]
    slopes=[d[0]]+[0]*(n-2)+[0]
    for i in range(1,n-1):
        if d[i-1]*d[i]>0:
            h0=times[i]-times[i-1];h1=times[i+1]-times[i];w0=2*h1+h0;w1=h1+2*h0
            slopes[i]=(w0+w1)/(w0/d[i-1]+w1/d[i])
    i=min(n-2,max(0,next((j-1 for j,q in enumerate(times) if q>t),n-2)))
    h=times[i+1]-times[i];u=max(0,min(1,(t-times[i])/h));u2=u*u;u3=u2*u
    return (2*u3-3*u2+1)*values[i]+(u3-2*u2+u)*h*slopes[i]+(-2*u3+3*u2)*values[i+1]+(u3-u2)*h*slopes[i+1]
def smooth(a,b,t):
    v=max(0,min(1,(t-a)/(b-a)));return v*v*(3-2*v)
def pose(t):
    cam.location=[pchip(t,[k[1][j] for k in keys]) for j in range(3)]
    focus.location=[pchip(t,[k[2][j] for k in keys]) for j in range(3)]
    cam.rotation_euler=(focus.location-cam.location).to_track_quat('-Z','Y').to_euler()
    camdata.dof.use_dof=t>=15.6
    camdata.lens=pchip(t,[k[3] for k in keys]);camdata.dof.aperture_fstop=max(14,pchip(t,[k[4] for k in keys]))+1800*(1-smooth(14,17,t))
    lift=smooth(18,18.65,t)*(1-smooth(18.7,19.45,t))
    rig.location.z=.0024*lift+.00022*smooth(19.1,20.2,t)
    rig.location.y=.010*smooth(18.65,20.6,t)
    rig.rotation_euler.x=.025*lift
    window.data.energy=1.1*smooth(14,18,t)
    scene.frame_set(round(t*24)+1)

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
mode=args[0] if args else 'keys'
if mode=='keys':
    scene.cycles.samples=96;scene.render.resolution_x=1600;scene.render.resolution_y=900
    for name,t in [('ridge',5.5),('edge',12.3),('reveal',18.0)]:
        pose(t);scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
elif mode=='animatic':
    scene.cycles.samples=16;scene.render.resolution_x=960;scene.render.resolution_y=540
    scene.cycles.use_animated_seed=False;scene.cycles.seed=47
    frames=OUT/'animatic';frames.mkdir(exist_ok=True)
    for i in range(253):
        pose(i/12);scene.render.filepath=str(frames/f'{i:04d}.png')
        if not Path(scene.render.filepath).exists():bpy.ops.render.render(write_still=True)
        print('TERRAIN_FRAME',i,flush=True)
elif mode=='scene':
    pose(18);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'terrain.blend'),compress=True)

