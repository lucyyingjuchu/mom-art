#!/usr/bin/env python3
"""Builds data/placeholders.json: a tiny blurred preview of every artwork, shown
until the real image fades in. Run again after adding artworks; a work without an
entry simply shows the plain paper tone.   python3 scripts/build-placeholders.py"""
import base64, io, json, pathlib
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((root / 'data/artworks.json').read_text(encoding='utf8'))
artworks = data if isinstance(data, list) else data.get('artworks', data)
artworks = list(artworks.values()) if isinstance(artworks, dict) else artworks

out = {}
for artwork in artworks:
    path = root / str(artwork.get('image') or '').lstrip('./')
    if not path.is_file():
        continue
    image = Image.open(path).convert('RGB')
    image.thumbnail((20, 20))
    buffer = io.BytesIO()
    image.save(buffer, 'WEBP', quality=40, method=6)
    out[artwork['id']] = 'data:image/webp;base64,' + base64.b64encode(buffer.getvalue()).decode()

(root / 'data/placeholders.json').write_text(json.dumps(out, separators=(',', ':')), encoding='utf8')
print(len(out), 'of', len(artworks))
