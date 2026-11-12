# Resizes item pictures larger than 256 px down to 256 px (the largest size the screen draws).
# Usage: python3 shrink_images.py web/images      Needs Pillow. Back the folder up first.
import glob, os, sys
from PIL import Image

folder = sys.argv[1]
count = saved = 0

for path in glob.glob(os.path.join(folder, '*.png')):
    try:
        image = Image.open(path)
        if max(image.size) <= 256:
            continue
        before = os.path.getsize(path)
        image = image.convert('RGBA')
        image.thumbnail((256, 256), Image.LANCZOS)
        image.save(path + '.tmp', 'PNG', optimize=True)
        after = os.path.getsize(path + '.tmp')
        if after < before:
            os.replace(path + '.tmp', path)
            count += 1
            saved += before - after
        else:
            os.remove(path + '.tmp')
    except Exception as error:
        print('skipped', os.path.basename(path), error)

print('resized', count, 'pictures, saved', saved // 1048576, 'MB')
