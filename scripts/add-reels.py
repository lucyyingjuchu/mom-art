#!/usr/bin/env python3
"""Add artwork Reels to the 短影音 tab in Exhibitions & News (data/reels.json).

    python3 scripts/add-reels.py <folder of Reels> [--year 2026] [--only 標題] [--at 0.45]

Files are named MMDD_reel_作品名.mp4. The date is the day the Reel goes out, and the
tab shows it from 19:00 Taiwan time that day. Each name is matched to artworks.json,
and the cover is the frame --at of the way through. Run again with --only and another
--at to pick a different frame. Needs ffmpeg and ffprobe.
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIST = ROOT / 'data/reels.json'
COVERS = ROOT / 'images/reels'


def plain(title):
    return re.sub(r'[-－―—─・\s]', '', title)


def cover_at(video, fraction, out):
    length = float(subprocess.check_output(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(video)]))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{length * fraction:.2f}', '-i', str(video),
                    '-frames:v', '1', '-vf', 'scale=540:-1', '-q:v', '4', str(out)], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('folder', type=Path)
    ap.add_argument('--year', default='2026')
    ap.add_argument('--only', default='')
    ap.add_argument('--at', type=float, default=0.45)
    args = ap.parse_args()

    artworks = json.loads((ROOT / 'data/artworks.json').read_text(encoding='utf8'))
    reels = json.loads(LIST.read_text(encoding='utf8')) if LIST.exists() else []

    for video in sorted(args.folder.glob('*.mp4')):
        m = re.match(r'(\d\d)(\d\d)_reel_(.+)\.mp4$', video.name)
        if not m or args.only not in m[3]:
            continue
        found = [a for a in artworks if plain(a['title']) == plain(m[3])]
        if len(found) != 1:
            print(f'NOT ADDED, {len(found)} artworks match: {video.name}')
            continue
        id_ = found[0]['id']
        date = f'{args.year}-{m[1]}-{m[2]}'
        cover = COVERS / f'{date}-{id_[-5:]}.jpg'
        cover_at(video, args.at, cover)
        entry = {'date': date, 'id': id_, 'cover': f'images/reels/{cover.name}'}
        reels = [r for r in reels if (r['date'], r['id']) != (date, id_)] + [entry]
        print(f'{date} {found[0]["title"]}')

    reels.sort(key=lambda r: r['date'], reverse=True)
    LIST.write_text(json.dumps(reels, ensure_ascii=False, indent=2) + '\n', encoding='utf8')


if __name__ == '__main__':
    main()
