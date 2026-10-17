"""Export an offline HTML with adjacent movies, a preview bundle and source archive."""
from pathlib import Path
import base64,re,zipfile,shutil,json,sys
root=Path(__file__).resolve().parent.parent
out=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root/'render-work/export'
out.mkdir(parents=True,exist_ok=True)
def uri(p):
    mime='video/mp4' if p.suffix=='.mp4' else 'image/svg+xml' if p.suffix=='.svg' else 'image/webp'
    return 'data:'+mime+';base64,'+base64.b64encode(p.read_bytes()).decode()
html=(root/'index.html').read_text(encoding='utf-8-sig')
css=(root/'assets/terrain.css').read_text(encoding='utf-8-sig')
js=(root/'assets/terrain.js').read_text(encoding='utf-8-sig')
for source,name in [('terrain-4k.mp4','Estienne-Terrain-4K.mp4'),('terrain-1080.mp4','Estienne-Terrain-1080.mp4')]:
    shutil.copy2(root/'assets/film'/source,out/name)
js=js.replace("const sources = {master:'assets/film/terrain-4k.mp4',mobile:'assets/film/terrain-1080.mp4'};","const sources = {master:'Estienne-Terrain-4K.mp4',mobile:'Estienne-Terrain-1080.mp4'};")
assert "master:'Estienne-Terrain-4K.mp4'" in js
html=html.replace('<link rel="stylesheet" href="assets/terrain.css">','<style>'+css+'</style>')
html=html.replace('<script type="module" src="assets/terrain.js"></script>','<script type="module">'+js+'</script>')
html=re.sub(r'src="(assets/[^\"]+)"',lambda m:'src="'+uri(root/m.group(1))+'"',html)
(out/'Estienne-Terrain-4K.html').write_text(html,encoding='utf-8')
for name,frame in [('emboss',79),('foil',173),('edge',235),('whole',348)]:
    shutil.copy2(root/'render-work/master-4k'/f'{frame:04d}.png',out/f'Estienne-4K-{name}.png')
with zipfile.ZipFile(out/'Estienne-Terrain-4K-Source.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in root.rglob('*'):
        rel=p.relative_to(root)
        if p.is_file() and not any(a in ['.git','render-work','__pycache__','frames','frames-v2'] for a in rel.parts) and not p.name.startswith('qa-') and p.suffix not in ['.npy','.log']:
            z.write(p,str(rel))
print('Exported',out)

with zipfile.ZipFile(out/'Estienne-Terrain-4K-Preview.zip','w',zipfile.ZIP_DEFLATED) as z:
    for name in ['Estienne-Terrain-4K.html','Estienne-Terrain-4K.mp4','Estienne-Terrain-1080.mp4']:
        z.write(out/name,name)
