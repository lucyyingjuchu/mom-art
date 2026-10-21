#!/usr/bin/env python3
"""
Pinterest bulk-upload CSV for xiaoranart.com
============================================

Makes the next batch of scheduled Pins from artworks.json, ready to upload in
Pinterest (Create → Bulk create Pins → upload .csv). Each run picks up where the
last one stopped, so you never post the same picture twice.

    python data/data_processing_scripts/pinterest_csv.py                  # next 30 pins, 1 per day from tomorrow
    python data/data_processing_scripts/pinterest_csv.py --count 12 --every 2 --start 2026-11-01
    python data/data_processing_scripts/pinterest_csv.py --mark-posted pinterest_2026-10-12.csv

Pins come from public artworks with an English title and a real photo of the
artwork. Works from SKIP_YEARS are left out (empty now that the 2026 scans are in).
"In a room" mockups are only added with --with-mockups.

Workflow (about 10 minutes a month):
  1. Run this script -> pinterest_YYYY-MM-DD.csv appears in the repo root.
  2. Pinterest (desktop) -> Create -> Bulk create Pins -> upload the CSV.
  3. Run again with --mark-posted <that csv> so those pins are not repeated.
     (The log lives in data/pinterest_log.json - commit it.)
"""

import argparse
import csv
import json
import os
import sys
from datetime import date, datetime, timedelta, timezone

SITE = "https://xiaoranart.com"
ARTWORKS_JSON = "data/artworks.json"
LOG_JSON = "data/pinterest_log.json"
ARTIST = "Yuan Chih-Jin"   # official English name (passport) - never another spelling
SKIP_YEARS = set()         # e.g. {"2027"} to hold back a year until its photos are ready
# Publish times in UTC, one per pin per day (--per-day picks the first N)
POST_HOURS_UTC = [1, 14, 18]   # 9pm / 10am / 2pm New York

# Subject (artworks.json "subjects") -> Pinterest board.
# Boards that don't exist yet are created by Pinterest on upload.
BOARDS = {
    "waterfall": "Chinese Waterfall Paintings",
    "flowingclouds": "Chinese Landscape Paintings",
    "landscape": "Chinese Landscape Paintings",
    "flowers": "Chinese Flower & Bird Paintings",
    "bamboo": "Chinese Ink Bamboo",
    "calligraphy": "Chinese Calligraphy Art",
}
DEFAULT_BOARD = "Chinese Ink Paintings by Xiaoran"
MOCKUP_BOARD = "Chinese Art for the Home"

KEYWORDS = {
    "waterfall": "waterfall painting, chinese waterfall art",
    "flowingclouds": "sea of clouds, misty mountains",
    "landscape": "chinese landscape painting, shan shui",
    "flowers": "flower and bird painting, botanical ink art",
    "bamboo": "ink bamboo, sumi-e bamboo",
    "calligraphy": "chinese calligraphy, calligraphy wall art",
}
BASE_KEYWORDS = "chinese ink painting, asian wall art, traditional chinese painting"


def categories(art):
    """The work's subjects (山水, 瀑布 ... as keys like 'landscape'), from artworks.json."""
    return [c for c in (art.get("subjects") or []) if isinstance(c, str)]


def is_public(art):
    if art.get("hidden") in (True, "true") or str(art.get("status", "")).lower() == "draft":
        return False
    img = (art.get("image") or "").strip()
    return bool((art.get("title") or "").strip() and img and "placeholder" not in img)


def abs_url(path):
    path = (path or "").replace("\\", "/").lstrip("./")
    return f"{SITE}/{path}" if path else ""


def clip(text, limit):
    text = " ".join((text or "").split())
    return text if len(text) <= limit else text[: limit - 1].rstrip(" ,.;") + "…"


def describe(art, is_mockup):
    title_en = art.get("titleEn") or ""
    size = f"{art['heightCm']} × {art['widthCm']} cm" if art.get("heightCm") and art.get("widthCm") else ""
    poem = clip(art.get("descriptionEn") or "", 220)
    lead = (f"How this original Chinese ink painting by {ARTIST} looks on the wall. " if is_mockup
            else f"Original Chinese ink painting by {ARTIST} (Xiaoran 曉然). ")
    parts = [lead + f"{title_en} 「{art['title']}」."]
    if poem:
        parts.append(poem)
    details = ", ".join(x for x in [art.get("formatEn"), art.get("year"), size] if x)
    if details:
        parts.append(details + ".")
    parts.append("Fine art prints and originals at xiaoranart.com")
    return clip(" ".join(parts), 500)


def candidate_pins(artworks, with_mockups=False):
    mockups, originals = [], []
    for art in artworks:
        if not is_public(art) or not art.get("titleEn"):
            continue  # needs an English title for an English-language Pin
        if str(art.get("year") or "")[:4] in SKIP_YEARS or not art.get("imageHigh"):
            continue
        cats = categories(art)
        board = next((BOARDS[c] for c in cats if c in BOARDS), DEFAULT_BOARD)
        keywords = ", ".join([BASE_KEYWORDS] + [KEYWORDS[c] for c in cats if c in KEYWORDS])
        link = f"{SITE}/?artwork={art['id']}&lang=en"
        for view in (art.get("productViews") or []) if with_mockups else []:
            if "mockup" in str(view.get("type", "")):
                mockups.append({
                    "key": f"{art['id']}:mockup:{view.get('image')}",
                    "Title": clip(f"{art['titleEn']} – Chinese ink painting in a room", 100),
                    "Media URL": abs_url(view.get("image")),
                    "Pinterest board": MOCKUP_BOARD,
                    "Description": describe(art, True),
                    "Link": link,
                    "Keywords": keywords + ", chinese art home decor",
                })
        originals.append({
            "key": f"{art['id']}:original",
            "Title": clip(f"{art['titleEn']} – Chinese ink painting by {ARTIST}", 100),
            "Media URL": abs_url(art.get("imageHigh")),
            "Pinterest board": board,
            "Description": describe(art, False),
            "Link": link,
            "Keywords": keywords,
        })
    # Alternate "in a room" and artwork photos so the boards grow evenly
    pins = []
    for i in range(max(len(mockups), len(originals))):
        pins.extend(x[i] for x in (mockups, originals) if i < len(x))
    return pins


def load_log():
    if os.path.exists(LOG_JSON):
        with open(LOG_JSON, encoding="utf-8") as f:
            return json.load(f)
    return {"posted": {}}


def save_log(log):
    with open(LOG_JSON, "w", encoding="utf-8") as f:
        json.dump(log, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    ap = argparse.ArgumentParser(description="Make the next Pinterest bulk-upload CSV")
    ap.add_argument("--count", type=int, default=30, help="pins in this batch (Pinterest max 200)")
    ap.add_argument("--every", type=int, default=1, help="days between posting days")
    ap.add_argument("--per-day", type=int, default=1, choices=range(1, len(POST_HOURS_UTC) + 1),
                    help="pins per posting day")
    ap.add_argument("--with-mockups", action="store_true", help="also pin the 'in a room' mockup images")
    ap.add_argument("--start", help="first publish date YYYY-MM-DD (default: tomorrow)")
    ap.add_argument("--mark-posted", metavar="CSV", help="record a CSV you uploaded so it isn't repeated")
    args = ap.parse_args()

    if not os.path.exists(ARTWORKS_JSON):
        sys.exit(f"Run this from the repo root - {ARTWORKS_JSON} not found")
    log = load_log()

    if args.mark_posted:
        with open(args.mark_posted, encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        for row in rows:
            log["posted"][row["Media URL"]] = row.get("Publish date") or date.today().isoformat()
        save_log(log)
        print(f"Marked {len(rows)} pins as posted in {LOG_JSON}")
        return

    with open(ARTWORKS_JSON, encoding="utf-8") as f:
        artworks = json.load(f)

    pins = [p for p in candidate_pins(artworks, args.with_mockups) if p["Media URL"] and p["Media URL"] not in log["posted"]]
    if not pins:
        print("Every public artwork has already been pinned. Add mockups or new works, or clear data/pinterest_log.json to start a second round.")
        return

    batch = pins[: min(args.count, 200)]
    start = datetime.strptime(args.start, "%Y-%m-%d").date() if args.start else date.today() + timedelta(days=1)
    out_name = f"pinterest_{start.isoformat()}.csv"
    columns = ["Title", "Media URL", "Pinterest board", "Thumbnail", "Description", "Link", "Publish date", "Keywords"]

    with open(out_name, "w", encoding="utf-8-sig", newline="") as f:   # utf-8-sig keeps 中文 readable in Excel
        writer = csv.DictWriter(f, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for i, pin in enumerate(batch):
            day = start + timedelta(days=(i // args.per_day) * args.every)
            when = datetime.combine(day, datetime.min.time(),
                                    tzinfo=timezone.utc).replace(hour=POST_HOURS_UTC[i % args.per_day])
            writer.writerow({**pin, "Thumbnail": "", "Publish date": when.strftime("%Y-%m-%dT%H:%M:%S")})

    last = start + timedelta(days=((len(batch) - 1) // args.per_day) * args.every)
    print(f"✅ {out_name}: {len(batch)} pins, {start} → {last}  ({len(pins) - len(batch)} more waiting)")
    print("Next: Pinterest → Create → Bulk create Pins → upload it, then:")
    print(f"      python data/data_processing_scripts/pinterest_csv.py --mark-posted {out_name}")


if __name__ == "__main__":
    main()
