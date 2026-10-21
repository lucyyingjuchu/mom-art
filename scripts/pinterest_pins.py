#!/usr/bin/env python3
"""Build a Pinterest "Bulk create Pins" CSV from data/artworks.json.

Every public artwork becomes one Pin: the real artwork image (never a mockup),
an English title and description, the board it belongs to, and a link that opens
that artwork's lightbox on xiaoranart.com. Pins are spread out with publish
dates so the account posts a few a day instead of all at once.

Usage:
    python3 scripts/pinterest_pins.py                  # all public artworks
    python3 scripts/pinterest_pins.py --limit 5        # first few, to check
    python3 scripts/pinterest_pins.py --start 2026-10-22 --per-day 3 --batch 90
    python3 scripts/pinterest_pins.py --skip-ids pinned.txt   # leave out ones already pinned

Writes pinterest_pins.csv (or --out). Upload it in Pinterest:
Create -> Bulk create Pins -> Upload .csv. The boards must already exist with
exactly these names.
"""
import argparse
import csv
import datetime as dt
import json
import os
import sys

SITE = "https://xiaoranart.com"
ARTIST = "Yuan Chih-Jin"

BOARDS = {
    "calligraphy": "Chinese Calligraphy Art",
    "flowers": "Chinese Flower & Bird Painting",
    "abstract": "Contemporary Ink Abstraction",
    "landscape": "Chinese Ink Landscape Painting",
}

# Times (UTC) a day's Pins go out: 9am, 3pm and 9pm US Eastern (EDT)
SLOTS_UTC = ["13:00", "19:00", "01:00"]


def subjects(a):
    s = set()
    for key in ("manualCategories", "autoCategories"):
        s.update((a.get(key) or {}).get("subjects") or [])
    return s


def board_for(a):
    """One board per Pin, by what dominates the work.

    Landscapes that carry a calligraphy poem stay on the landscape board (the poem
    is noted in keywords); the calligraphy board is for works that are mainly
    writing. Abstract style wins over subject.
    """
    s = subjects(a)
    scenery = s & {"landscape", "flowingclouds", "waterfall", "山水", "煙雲"}
    title = f"{a.get('title', '')} {a.get('titleEn', '')}".lower()
    if "calligraphy" in s and not scenery and not (s & {"flowers", "bamboo", "abstract"}):
        return BOARDS["calligraphy"]
    if "abstract" in s:
        return BOARDS["abstract"]
    if (s & {"flowers", "bamboo", "花鳥"} and "landscape" not in s) or any(
            w in title for w in ("bird", "peacock", "鳥")):
        return BOARDS["flowers"]
    return BOARDS["landscape"]


def is_public(a):
    if a.get("hidden") in (True, "true") or str(a.get("status", "")).lower() == "draft":
        return False
    if not (a.get("title") or "").strip():
        return False
    img = a.get("image") or ""
    return bool(img.strip()) and "placeholder" not in img


def abs_url(path):
    return SITE + "/" + path.lstrip("./")


def clip(text, n):
    text = " ".join((text or "").split())
    return text if len(text) <= n else text[: n - 1].rsplit(" ", 1)[0] + "…"


def kind_phrase(a):
    b = board_for(a)
    if b == BOARDS["calligraphy"]:
        return "Chinese calligraphy"
    if b == BOARDS["flowers"]:
        return "Chinese bird-and-flower ink painting"
    if b == BOARDS["abstract"]:
        return "contemporary Chinese ink painting"
    return "Chinese ink landscape painting"


def title_for(a):
    name = (a.get("titleEn") or "").strip() or (a.get("title") or "").strip()
    tail = " | Chinese Calligraphy" if board_for(a) == BOARDS["calligraphy"] else " | Chinese Ink Painting"
    return clip(name, 100 - len(tail)) + tail


def description_for(a):
    parts = []
    poem = (a.get("descriptionEn") or "").strip()
    name = (a.get("titleEn") or a.get("title") or "").strip()
    if poem and poem.rstrip(".").lower() != name.lower():
        parts.append(clip(poem, 220))
    year = a.get("year") if str(a.get("year", "")).isdigit() else ""
    fmt = (a.get("formatEn") or "").strip()
    size = f"{a['heightCm']} × {a['widthCm']} cm" if a.get("heightCm") and a.get("widthCm") else ""
    line = f"Original {kind_phrase(a)} by Taiwanese artist {ARTIST} (Xiaoran 曉然)"
    line += f", {year}." if year else "."
    parts.append(line)
    details = ", ".join(x for x in (fmt, size) if x)
    if details:
        parts.append(details[0].upper() + details[1:] + ".")
    if a.get("printFile"):
        parts.append("Fine art giclée prints available.")
    parts.append("See the full work at xiaoranart.com.")
    return clip(" ".join(parts), 500)


def keywords_for(a):
    s = subjects(a)
    kw = ["chinese ink painting", "ink wash painting", "asian art", "wall art", "Yuan Chih-Jin"]
    extra = {
        "calligraphy": ["chinese calligraphy", "calligraphy art"] if board_for(a) == BOARDS["calligraphy"]
                       else ["painting with calligraphy"],
        "flowers": ["flower painting", "botanical art"],
        "bamboo": ["bamboo painting"],
        "landscape": ["mountain landscape", "shan shui"],
        "waterfall": ["waterfall painting"],
        "flowingclouds": ["misty mountains"],
        "moon": ["moon art"],
        "abstract": ["abstract ink art"],
    }
    for k, v in extra.items():
        if k in s:
            kw += v
    seen, out = set(), []
    for k in kw:
        if k.lower() not in seen:
            seen.add(k.lower())
            out.append(k)
    return ", ".join(out)


def link_for(a):
    return f"{SITE}/?artwork={a['id']}&utm_source=pinterest&utm_medium=social&utm_campaign=pins"


def order(artworks):
    """Newest and featured first, then rotate through boards so the feed mixes."""
    def key(a):
        y = int(a["year"]) if str(a.get("year", "")).isdigit() else 0
        return (0 if a.get("featured") else 1, -y)
    by_board = {}
    for a in sorted(artworks, key=key):
        by_board.setdefault(board_for(a), []).append(a)
    queues = [by_board[b] for b in BOARDS.values() if b in by_board]
    out = []
    while any(queues):
        for q in queues:
            if q:
                out.append(q.pop(0))
    return out


def schedule(n, start, per_day):
    slots = SLOTS_UTC[:per_day] if per_day <= len(SLOTS_UTC) else SLOTS_UTC
    times = []
    day = start
    while len(times) < n:
        for s in slots:
            h, m = map(int, s.split(":"))
            t = dt.datetime.combine(day, dt.time(h, m))
            if h < 12:          # the 01:00 UTC slot is the same US evening
                t += dt.timedelta(days=1)
            times.append(t.strftime("%Y-%m-%dT%H:%M:%S"))
            if len(times) == n:
                break
        day += dt.timedelta(days=1)
    return times


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--data", default="data/artworks.json")
    p.add_argument("--out", default="pinterest_pins.csv")
    p.add_argument("--start", help="first publish day (YYYY-MM-DD); omit to publish immediately")
    p.add_argument("--per-day", type=int, default=3)
    p.add_argument("--batch", type=int, default=0, help="max rows in this file (0 = all)")
    p.add_argument("--limit", type=int, default=0, help="alias for --batch")
    p.add_argument("--skip-ids", help="text file of artwork ids already pinned, one per line")
    args = p.parse_args()

    artworks = [a for a in json.load(open(args.data, encoding="utf-8")) if is_public(a)]
    if args.skip_ids and os.path.exists(args.skip_ids):
        done = {l.strip() for l in open(args.skip_ids) if l.strip()}
        artworks = [a for a in artworks if a["id"] not in done]
    rows = order(artworks)
    cap = args.batch or args.limit
    if cap:
        rows = rows[:cap]

    dates = schedule(len(rows), dt.date.fromisoformat(args.start), args.per_day) if args.start else [""] * len(rows)
    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Title", "Media URL", "Pinterest board", "Thumbnail", "Description", "Link", "Publish date", "Keywords"])
        for a, when in zip(rows, dates):
            w.writerow([title_for(a), abs_url(a.get("imageHigh") or a["image"]), board_for(a), "",
                        description_for(a), link_for(a), when, keywords_for(a)])
    with open(os.path.splitext(args.out)[0] + "_ids.txt", "w") as f:
        f.write("\n".join(a["id"] for a in rows) + "\n")
    counts = {}
    for a in rows:
        counts[board_for(a)] = counts.get(board_for(a), 0) + 1
    print(f"{len(rows)} pins -> {args.out}", counts, file=sys.stderr)


if __name__ == "__main__":
    main()
