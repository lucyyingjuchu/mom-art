"""Generate Pinterest bulk-upload CSV files from data/artworks.json.

Usage:
    python3 scripts/pinterest_csv.py --start 2026-10-20 --per-day 3 --days-per-file 14 --out pinterest_batches

Writes one CSV per batch (each <= 100 rows, dates within a 14-day window) so each
file can be uploaded on/just before its first date. Columns follow Pinterest's
"Bulk create Pins" template: Title, Media URL, Pinterest board, Thumbnail,
Description, Link, Publish date, Keywords.

Which works are included: public on the site (same rule as isPublicReady in
js/portfolio.js), have an English title, have a large image file, and are NOT
from 2026 (no high-res digital files for those yet). Use --exclude-ids to skip
works already pinned (one id per line).
"""
import argparse
import csv
import json
import os
from datetime import date, datetime, timedelta

SITE = "https://xiaoranart.com"
ROOT = os.path.join(os.path.dirname(__file__), "..")
ARTIST = "Yuan Chih-Jin"  # official English name (passport) - never another spelling
TIMES = ["09:00", "14:00", "20:00", "11:30", "17:00"]

# Board names must match boards that already exist on the Pinterest account.
BOARDS = {
    "calligraphy": "Chinese Calligraphy Art",
    "flowers": "Chinese Flower & Bird Paintings",
    "landscape": "Chinese Landscape Ink Paintings",
}


def load(path):
    with open(os.path.join(ROOT, path), encoding="utf8") as f:
        return json.load(f)


def is_public(a):
    if a.get("hidden") in (True, "true"):
        return False
    if str(a.get("status", "")).lower() == "draft":
        return False
    img = a.get("image") or ""
    return bool(a.get("title", "").strip()) and img and "placeholder" not in img


def subjects(a):
    s = set(a.get("manualCategories", {}).get("subjects", []))
    s |= set(a.get("autoCategories", {}).get("subjects", []))
    s |= set(a.get("categories") or [])
    return s


def board_for(a):
    s = subjects(a)
    if "calligraphy" in s or "書法" in (a.get("format") or ""):
        return BOARDS["calligraphy"]
    if s & {"flowers", "bamboo", "花鳥"}:
        return BOARDS["flowers"]
    return BOARDS["landscape"]


def clip(text, n):
    text = " ".join((text or "").split())
    return text if len(text) <= n else text[: n - 1].rsplit(" ", 1)[0] + "…"


def build_row(a, print_ready):
    # Keep the artist's name in every title; drop the extras first when too long
    for t in (f"{a['titleEn']} {a['title']} | {ARTIST} ink painting",
              f"{a['titleEn']} {a['title']} | {ARTIST}",
              f"{a['titleEn']} | {ARTIST}"):
        if len(t) <= 100:
            title = t
            break
    else:
        title = clip(a["titleEn"], 100 - len(ARTIST) - 3) + f" | {ARTIST}"

    facts = []
    if a.get("formatEn"):
        facts.append(a["formatEn"])
    if a.get("heightCm") and a.get("widthCm"):
        facts.append(f"{a['heightCm']} × {a['widthCm']} cm")
    year = str(a.get("year") or "")
    if year[:4].isdigit():
        facts.append(year[:4])
    offer = ("Fine art prints available at xiaoranart.com."
             if print_ready else "Original artwork — inquire at xiaoranart.com.")
    tail = (f"\n\n{' · '.join(facts)}\nChinese ink painting by Taiwanese artist {ARTIST} "
            f"(Xiaoran 曉然 / 袁之靜). {offer}")
    desc = clip(a.get("descriptionEn") or "", 500 - len(tail)) + tail

    keywords = ["chinese ink painting", "chinese painting", "asian wall art",
                "taiwanese artist", ARTIST]
    s = subjects(a)
    if "calligraphy" in s:
        keywords.append("chinese calligraphy")
    if s & {"landscape", "waterfall", "flowingclouds"}:
        keywords.append("ink landscape painting")
    if s & {"flowers", "bamboo"}:
        keywords.append("flower and bird painting")
    if print_ready:
        keywords.append("fine art print")

    return {
        "Title": title,
        "Media URL": SITE + a["imageHigh"].lstrip("."),
        "Pinterest board": board_for(a),
        "Thumbnail": "",
        "Description": desc,
        "Link": f"{SITE}/?artwork={a['id']}&utm_source=pinterest&utm_medium=social",
        "Keywords": ", ".join(keywords),
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--start", default=(date.today() + timedelta(days=1)).isoformat())
    p.add_argument("--per-day", type=int, default=3)
    p.add_argument("--days-per-file", type=int, default=14)
    p.add_argument("--out", default="pinterest_batches")
    p.add_argument("--exclude-ids", help="file with artwork ids already pinned")
    args = p.parse_args()

    arts = load("data/artworks.json")
    fw = load("data/finerworks_ready_artworks.json")
    print_ready = {k for k, v in fw.items() if v.get("print_ready")}
    skip = set()
    if args.exclude_ids:
        skip = {l.strip() for l in open(args.exclude_ids) if l.strip()}

    pool = [a for a in arts
            if is_public(a) and str(a.get("year")) != "2026" and a.get("titleEn")
            and os.path.exists(os.path.join(ROOT, a["imageHigh"].lstrip("./")))
            and a["id"] not in skip]

    # Featured and print-ready first, then rotate boards so the feed stays varied
    pool.sort(key=lambda a: (a.get("featured") not in (True, "true"), a["id"] not in print_ready))
    by_board = {}
    for a in pool:
        by_board.setdefault(board_for(a), []).append(a)
    ordered = []
    while any(by_board.values()):
        for b in list(by_board):
            if by_board[b]:
                ordered.append(by_board[b].pop(0))

    start = datetime.fromisoformat(args.start)
    per_file = args.per_day * args.days_per_file
    os.makedirs(args.out, exist_ok=True)
    fields = ["Title", "Media URL", "Pinterest board", "Thumbnail",
              "Description", "Link", "Publish date", "Keywords"]
    for n in range(0, len(ordered), per_file):
        chunk = ordered[n:n + per_file]
        first_day = start + timedelta(days=n // args.per_day)
        name = os.path.join(args.out, f"pinterest_batch{n // per_file + 1}_{first_day:%Y-%m-%d}.csv")
        with open(name, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader()
            for i, a in enumerate(chunk):
                k = n + i
                day = start + timedelta(days=k // args.per_day)
                hh, mm = TIMES[k % args.per_day].split(":")
                row = build_row(a, a["id"] in print_ready)
                row["Publish date"] = day.replace(hour=int(hh), minute=int(mm)).strftime("%Y-%m-%dT%H:%M:%S")
                w.writerow(row)
        print(f"{name}: {len(chunk)} pins, {chunk and row['Publish date'][:10]} last")
    with open(os.path.join(args.out, "pinned_ids.txt"), "w") as f:
        f.write("\n".join(a["id"] for a in ordered) + "\n")
    print(f"total {len(ordered)} pins; ids saved to {args.out}/pinned_ids.txt")


if __name__ == "__main__":
    main()
