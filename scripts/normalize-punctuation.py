#!/usr/bin/env python3
"""Turns half-width punctuation in the Chinese artwork titles and texts of data/artworks.json
into full-width. Numbers such as 6.4 stay as they are; English fields are not touched.
Run after adding artwork text:   python3 scripts/normalize-punctuation.py"""
import json, pathlib, re

FIELDS = ('title', 'description', 'curatorNote')
CJK = r'[㐀-鿿　-〿＀-￯]'
PATH = pathlib.Path(__file__).resolve().parent.parent / 'data/artworks.json'


def normalize(text):
    if not re.search(r'[一-鿿]', text):
        return text
    text = text.translate(str.maketrans({',': '，', ';': '；', '!': '！', '?': '？', '(': '（', ')': '）', '/': '／'}))
    text = re.sub(r'(?<!\d):|:(?!\d)', '：', text)
    text = re.sub(rf'(?<={CJK})-|-(?={CJK})', '－', text)
    return re.sub(rf'(?<={CJK}) +(?={CJK})', '　', text)


data = json.loads(PATH.read_text(encoding='utf8'))
artworks = data['artworks'] if isinstance(data, dict) else data
changed = 0
for artwork in artworks:
    for field in FIELDS:
        value = artwork.get(field)
        if isinstance(value, str) and normalize(value) != value:
            artwork[field] = normalize(value)
            changed += 1
raw = PATH.read_text(encoding='utf8')
PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + ('\n' if raw.endswith('\n') else ''), encoding='utf8')
print(changed, 'fields changed')
