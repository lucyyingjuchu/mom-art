#!/usr/bin/env python3
"""Gives regular verse in data/artworks.json, and its English translation, line breaks only.
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


def break_english(text, lines):
    """Breaks an English translation to match its verse, only when the line count agrees."""
    if '\n' in text:
        return '\n'.join(line.strip() for line in text.strip().splitlines())
    flat = re.sub(r'\s+', ' ', text.strip())
    # A new verse line starts with a capital after punctuation; a mid-line "I" does not count
    parts = re.split(r'(?<=[,;:.!?\u2014])\s+(?=[A-Z\u201c"])(?!I\s)|(?<=[;:.!?])\s+(?=I\s)', flat)
    if len(parts) == lines:
        return '\n'.join(parts)
    if lines == 2 and len(parts) == 1 and len(re.findall(r'[,;]', flat)) == 1:
        return re.sub(r'([,;])\s+', r'\1\n', flat)
    # A couplet translated as two long sentences keeps those two lines
    sentences = re.split(r'(?<=[;.!?])\s+', flat)
    if len(sentences) * 2 == lines:
        return '\n'.join(sentences)
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
        english = artwork.get('descriptionEn')
        if isinstance(english, str) and '\n' in broken:
            artwork['descriptionEn'] = break_english(english, broken.count('\n') + 1)
PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + ('\n' if raw.endswith('\n') else ''), encoding='utf8')
print(changed, 'descriptions broken into lines')
