"""Deterministic asset preparation. Requires Pillow, numpy, Node.js and sharp.
Set SHARP_MODULE to an absolute sharp package path when not installed locally.
"""
from pathlib import Path
import subprocess, os
import numpy as np
from PIL import Image, ImageFilter
root=Path(__file__).resolve().parent.parent
maps=root/'assets/maps';maps.mkdir(exist_ok=True)
module=os.environ.get('SHARP_MODULE','sharp')
script="const sharp=require(process.argv[1]);sharp(process.argv[2]).resize({height:2048}).png().toFile(process.argv[3]);"
subprocess.run(['node','-e',script,module,str(root/'assets/estienne-monogram.svg'),str(maps/'monogram-mask.png')],check=True)
alpha=Image.open(maps/'monogram-mask.png').convert('RGBA').getchannel('A')
near=np.asarray(alpha.filter(ImageFilter.GaussianBlur(2.2)),dtype=np.float32)/255
far=np.asarray(alpha.filter(ImageFilter.GaussianBlur(6)),dtype=np.float32)/255
height=(near*.85+far*.15).clip(0,1)
Image.fromarray((height*65535).astype(np.uint16)).save(maps/'emboss-height-16.png')
np.save(maps/'emboss-height.npy',height)
