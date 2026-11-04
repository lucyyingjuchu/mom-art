#!/usr/bin/env python3
"""Gives regular verse in data/artworks.json its line breaks, adding only line breaks.
Five- and seven-character verse: one line per phrase. Four-character verse: two phrases
per line. Lines split by ／ break at the slash. Irregular text and text that already has
line breaks are left alone.   python3 scripts/break-verses.py"""
import json, pathlib, re

PATH = pathlib.Path(__file__).resolve().parent.parent / 'data/artworks.json'
PHRASE = re.compile(r'[^，。；！？、]+[，。；！？、]')


def break_lines(text):
    text = text.strip()
    if '\n' in text:
        return text
    if '／' in text:
        return text.replace('／', '\n')
    phrases = PHRASE.findall(text)
    if len(phrases) < 2 or len(phrases) % 2 or ''.join(phrases) != text:
        return text
    lengths = {len(p) - 1 for p in phrases}
    if len(lengths) != 1:
        return text
    size = lengths.pop()
    if size in (5, 7):
        return '\n'.join(phrases)
    if size == 4:
        return '\n'.join(''.join(phrases[i:i + 2]) for i in range(0, len(phrases), 2))
    return text


raw = PATH.read_text(encoding='utf8')
data = json.loads(raw)
artworks = data['artworks'] if isinstance(data, dict) else data
changed = 0
for artwork in artworks:
    text = artwork.get('description')
    if isinstance(text, str) and re.search(r'[一-鿿]', text):
        broken = break_lines(text)
        if broken != text.strip():
            artwork['description'] = broken
            changed += 1
PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + ('\n' if raw.endswith('\n') else ''), encoding='utf8')
print(changed, 'descriptions broken into lines')
