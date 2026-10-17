"""Blender encoder: -- output.mp4 [study|master|web]. No image upscaling."""
from pathlib import Path
import bpy,sys
root=Path(__file__).resolve().parent.parent
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
profile=args[1] if len(args)>1 else 'study'
master=profile in ('master','web')
frames=root/('render-work/master-4k' if master else 'render-work/smooth-24')
paths=[frames/f'{i:04d}.png' for i in range(433)]
assert all(p.exists() for p in paths),'Finish rendering all 433 frames first'
out=Path(args[0]).resolve() if args else root/'render-work/Estienne-Terrain-Smooth.mp4'
out.parent.mkdir(parents=True,exist_ok=True)
scene=bpy.context.scene
scene.render.resolution_x=3840 if profile=='master' else 1920 if profile=='web' else 960
scene.render.resolution_y=2160 if profile=='master' else 1080 if profile=='web' else 540
scene.render.resolution_percentage=100
editor=scene.sequence_editor_create()
strip=editor.strips.new_image(name='Terrain / 24 fps',filepath=str(paths[0]),channel=1,frame_start=1)
for p in paths[1:]:strip.elements.append(p.name)
strip.transform.scale_x=scene.render.resolution_x/strip.elements[0].orig_width
strip.transform.scale_y=scene.render.resolution_y/strip.elements[0].orig_height
scene.frame_start=1;scene.frame_end=433
scene.render.fps=24;scene.render.fps_base=1
scene.render.use_sequencer=True
scene.view_settings.view_transform='Standard'
scene.render.image_settings.media_type='VIDEO';scene.render.image_settings.file_format='FFMPEG'
scene.render.ffmpeg.format='MPEG4';scene.render.ffmpeg.codec='H264'
scene.render.ffmpeg.constant_rate_factor='PERC_LOSSLESS' if master else 'HIGH'
scene.render.ffmpeg.ffmpeg_preset='BEST' if master else 'GOOD'
scene.render.ffmpeg.gopsize=12;scene.render.ffmpeg.max_b_frames=0
scene.render.ffmpeg.audio_codec='NONE';scene.render.filepath=str(out)
bpy.ops.render.render(animation=True)
print('TERRAIN_VIDEO',out,scene.render.resolution_x,scene.render.resolution_y)
