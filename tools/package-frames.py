from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent.parent
frames=root/'assets/frames-v2';frames.mkdir(exist_ok=True)
stills=root/'assets/stills';stills.mkdir(exist_ok=True)
for p in sorted((root/'render-work/smooth-24').glob('*.png')):
    Image.open(p).convert('RGB').save(frames/(p.stem+'.webp'),quality=83,method=6)
for name in ['ridge','edge','reveal']:
    Image.open(root/'render-work'/f'{name}.png').convert('RGB').save(stills/f'{name}.webp',quality=91,method=6)
print('frames',len(list(frames.glob('*.webp'))),'bytes',sum(p.stat().st_size for p in frames.glob('*.webp')))
