"""Package native 4K master stills; video encoding is separate."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent.parent
stills=root/'assets/stills';stills.mkdir(exist_ok=True)
for name,frame in [('opening',0),('ridge',79),('foil',173),('edge',235),('reveal',348)]:
    p=root/'render-work/master-4k'/f'{frame:04d}.png'
    im=Image.open(p).convert('RGB');assert im.size==(3840,2160)
    im.save(stills/f'{name}.webp',quality=95,method=6)
print('Packaged five native 4K stills')
