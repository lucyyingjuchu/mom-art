#!/usr/bin/env python3
"""
Print size rule for xiaoranart.com (Finerworks, Canson Arches Aquarelle Rag 310).

Largest print = the smallest of
  * what the file supports at MIN_PPI (180 pixels per inch),
  * the original painting's size (a print is never bigger than the original),
  * the paper's limit (40 x 90 in).
Offered sizes: 100 %, 70 % and 50 % of that, whole inches, same proportions as
the painting (never cropped or stretched); the short side must be at least 6 in.

Every size is sold unmounted ("rolled": print only, shipped rolled in a tube,
SKU 5M210M8S<W>X<H>, up to 40 x 90 in). Mounting on board (SKU 5M210M37S…) cost
nearly twice as much and made a mounted 20x30 dearer than a rolled 24x36, so it
was dropped in Oct 2026; set OFFER_MOUNTED = True to bring it back for <= 20 x 30 in.

Run from the repo root to recompute every entry in finerworks_ready_artworks.json
from the pixel sizes already stored there and the cm sizes in artworks.json:
    python data/data_processing_scripts/print_sizes.py          # dry run, prints changes
    python data/data_processing_scripts/print_sizes.py --write
"""
import json
import sys

MIN_PPI = 180
STEPS = (1.0, 0.7, 0.5)
MIN_SHORT_IN = 6
MOUNTED_MAX = (20, 30)     # short side, long side (inches)
OFFER_MOUNTED = False
PAPER_MAX = (40, 90)
CM_PER_IN = 2.54


def style_for(w, h):
    short, long_ = sorted((w, h))
    if not OFFER_MOUNTED:
        return "rolled"
    return "mounted" if short <= MOUNTED_MAX[0] and long_ <= MOUNTED_MAX[1] else "rolled"


def sku_for(w, h, style=None):
    style = style or style_for(w, h)
    return f"5M210M{'37' if style == 'mounted' else '8'}S{w}X{h}"


def print_sizes(pix_w, pix_h, width_cm=None, height_cm=None):
    """List of {width_inches, height_inches, style, sku}, largest first."""
    ratio = pix_w / pix_h
    landscape = ratio >= 1
    long_px = max(pix_w, pix_h)
    caps = [long_px / MIN_PPI]                                   # resolution
    try:
        w_cm, h_cm = float(width_cm), float(height_cm)
        if w_cm > 0 and h_cm > 0:
            caps.append(max(w_cm, h_cm) / CM_PER_IN)            # original size
    except (TypeError, ValueError):
        pass
    r = max(ratio, 1 / ratio)                                    # long / short
    caps.append(min(PAPER_MAX[1], PAPER_MAX[0] * r))             # paper
    cap_long = min(caps)

    sizes, seen = [], set()
    for step in STEPS:
        long_in = int(cap_long * step)             # floor: never above any cap
        short_in = round(long_in / r)
        if short_in < MIN_SHORT_IN:
            continue
        w, h = (long_in, short_in) if landscape else (short_in, long_in)
        if (w, h) in seen:
            continue
        seen.add((w, h))
        style = style_for(w, h)
        sizes.append({"width_inches": w, "height_inches": h, "style": style, "sku": sku_for(w, h, style)})
    return sizes


def main():
    write = "--write" in sys.argv
    arts = {a["id"]: a for a in json.load(open("data/artworks.json", encoding="utf-8"))}
    path = "data/finerworks_ready_artworks.json"
    fw = json.load(open(path, encoding="utf-8"))
    changed = 0
    for art_id, entry in fw.items():
        api = (entry.get("finerworks_image") or {}).get("finerworks_api_object") or {}
        if not api.get("pix_w"):
            continue
        a = arts.get(art_id, {})
        new = print_sizes(api["pix_w"], api["pix_h"], a.get("widthCm"), a.get("heightCm"))
        old = entry.get("recommended_sizes", [])
        if new != old:
            changed += 1
            fmt = lambda s: " ".join(f"{x['width_inches']}x{x['height_inches']}{'R' if x.get('style') == 'rolled' else ''}" for x in s)
            print(f"{entry['artwork_info'].get('title','?'):<20} {fmt(old):<28} -> {fmt(new)}")
        entry["recommended_sizes"] = new
        entry["print_ready"] = bool(new)
    print(f"\n{changed} of {len(fw)} changed (R = rolled)")
    if write:
        json.dump(fw, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print("written", path)


if __name__ == "__main__":
    main()
