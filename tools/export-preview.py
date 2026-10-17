"""Export one self-contained preview HTML plus the static-site source archive."""
from pathlib import Path
import base64,re,zipfile,shutil,json,sys
root=Path(__file__).resolve().parent.parent
out=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root/'render-work/export'
out.mkdir(parents=True,exist_ok=True)
def uri(p):
    mime='image/svg+xml' if p.suffix=='.svg' else 'image/webp'
    return 'data:'+mime+';base64,'+base64.b64encode(p.read_bytes()).decode()
html=(root/'index.html').read_text(encoding='utf-8-sig')
css=(root/'assets/terrain.css').read_text(encoding='utf-8-sig')
js=(root/'assets/terrain.js').read_text(encoding='utf-8-sig')
frames=[uri(root/'assets/frames-v2'/f'{i:04d}.webp') for i in range(433)]
js=js.replace("const path = n => `assets/frames-v2/${String(n).padStart(4, '0')}.webp`;",'const frameURLs='+json.dumps(frames)+';\nconst path = n => frameURLs[n];')
assert 'const frameURLs=' in js
html=html.replace('<link rel="stylesheet" href="assets/terrain.css">','<style>'+css+'</style>')
html=html.replace('<script type="module" src="assets/terrain.js"></script>','<script type="module">'+js+'</script>')
html=re.sub(r'src="(assets/[^\"]+)"',lambda m:'src="'+uri(root/m.group(1))+'"',html)
(out/'Estienne-Terrain-Smooth.html').write_text(html,encoding='utf-8')
for name in ['ridge','edge','reveal']:
    shutil.copy2(root/'assets/stills'/f'{name}.webp',out/f'terrain-smooth-{name}.webp')
with zipfile.ZipFile(out/'Estienne-Terrain-Smooth-Source.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in root.rglob('*'):
        rel=p.relative_to(root)
        if p.is_file() and not any(a in ['.git','render-work','__pycache__','frames'] for a in rel.parts) and not p.name.startswith('qa-') and p.suffix not in ['.npy','.log']:
            z.write(p,str(rel))
print('Exported',out)
