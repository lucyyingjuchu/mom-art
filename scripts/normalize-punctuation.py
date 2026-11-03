#!/usr/bin/env python3
"""Turns half-width punctuation in the Chinese artwork titles and texts of data/artworks.json
into full-width. Numbers such as 6.4 stay as they are; English fields are not touched.
Run after adding artwork text:   python3 scripts/normalize-punctuation.py"""
import json, pathlib, re

FIELDS = ('title', 'description', 'curatorNote')
CJK = r'[㐀-鿿　-〿＀-￯]'
ROOT = pathlib.Path(__file__).resolve().parent.parent
PATH = ROOT / 'data/artworks.json'
PRINTS = ROOT / 'data/finerworks_ready_artworks.json'


def normalize(text):
    if not re.search(r'[一-鿿]', text):
        return text
    text = text.translate(str.maketrans({',': '，', ';': '；', '!': '！', '?': '？', '(': '（', ')': '）', '/': '／'}))
    text = re.sub(r'(?<!\d):|:(?!\d)', '：', text)
    text = re.sub(rf'(?<={CJK})-|-(?={CJK})', '－', text)
    return re.sub(rf'(?<={CJK}) +(?={CJK})', '　', text)


def save(path, content):
    ending = '\n' if path.read_text(encoding='utf8').endswith('\n') else ''
    path.write_text(json.dumps(content, ensure_ascii=False, indent=2) + ending, encoding='utf8')


data = json.loads(PATH.read_text(encoding='utf8'))
artworks = data['artworks'] if isinstance(data, dict) else data
changed = 0
for artwork in artworks:
    for field in FIELDS:
        value = artwork.get(field)
        if isinstance(value, str) and normalize(value) != value:
            artwork[field] = normalize(value)
            changed += 1
save(PATH, data)

# Print orders read their titles from this file
prints = json.loads(PRINTS.read_text(encoding='utf8'))
for entry in prints.values():
    info = entry.get('artwork_info') or {}
    if isinstance(info.get('title'), str) and normalize(info['title']) != info['title']:
        info['title'] = normalize(info['title'])
        changed += 1
save(PRINTS, prints)
print(changed, 'fields changed')
