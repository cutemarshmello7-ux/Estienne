"""Run with Blender to encode the completed Cycles image sequence as H.264."""
from pathlib import Path
import bpy,sys
root=Path(__file__).resolve().parent.parent
frames=root/'render-work/smooth-24'
paths=[frames/f'{i:04d}.png' for i in range(433)]
assert all(p.exists() for p in paths),'Finish rendering all 433 frames first'
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
out=Path(args[0]).resolve() if args else root/'render-work/Estienne-Terrain-Smooth.mp4'
scene=bpy.context.scene
editor=scene.sequence_editor_create()
strip=editor.strips.new_image(name='Terrain / 24 fps',filepath=str(paths[0]),channel=1,frame_start=1)
for p in paths[1:]:strip.elements.append(p.name)
scene.frame_start=1;scene.frame_end=433
scene.render.resolution_x=960;scene.render.resolution_y=540;scene.render.resolution_percentage=100
scene.render.fps=24;scene.render.fps_base=1
scene.render.use_sequencer=True
scene.view_settings.view_transform='Standard'
scene.render.image_settings.media_type='VIDEO'
scene.render.image_settings.file_format='FFMPEG'
scene.render.ffmpeg.format='MPEG4';scene.render.ffmpeg.codec='H264'
scene.render.ffmpeg.constant_rate_factor='HIGH';scene.render.ffmpeg.ffmpeg_preset='GOOD'
scene.render.ffmpeg.audio_codec='NONE';scene.render.filepath=str(out)
bpy.ops.render.render(animation=True)
print('TERRAIN_VIDEO',out)
