#!/usr/bin/env python3
"""
Print size rule for xiaoranart.com (Finerworks, Canson Arches Aquarelle Rag 310).

Largest print = the smallest of
  * what the file supports at MIN_PPI (180 pixels per inch),
  * the original painting's size (a print is never bigger than the original),
  * 40 x 62 in (the paper goes to 40 x 90, but prints longer than ~62 in have no
    international shipping rate at Finerworks, so we don't offer them).
Offered sizes: 100 %, 70 % and 50 % of that (image size).

Finerworks prints whole inches only, and a painting's proportions almost never
fit whole inches - so the image is never stretched or cropped to the paper.
Instead each size gets its own print file: the whole painting, at its exact
proportions, centred on whole-inch paper with a white border of at least
BORDER (8 %) of the paper's short side - a museum-style margin. The paper size
is picked so the borders on the two axes are as even as possible. Paper short
side at least MIN_SHORT_IN (8 in). Print files: s3://xiaoran-raw-artworks/
raw/sized/<id>_<W>x<H>.jpg, made by make_print_files.py.

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
MAX_FILE_PPI = 300         # print files are never made at more than this
STEPS = (1.0, 0.7, 0.5)
BORDER = 0.08              # white border, as a share of the paper's short side
MIN_SHORT_IN = 8           # paper short side
MOUNTED_MAX = (20, 30)     # short side, long side (inches)
OFFER_MOUNTED = False
PAPER_MAX = (40, 62)       # paper is 40 x 90, but Finerworks can't quote shipping abroad above ~62 in (Oct 2026)
CM_PER_IN = 2.54


def style_for(w, h):
    short, long_ = sorted((w, h))
    if not OFFER_MOUNTED:
        return "rolled"
    return "mounted" if short <= MOUNTED_MAX[0] and long_ <= MOUNTED_MAX[1] else "rolled"


def sku_for(w, h, style=None):
    style = style or style_for(w, h)
    return f"5M210M{'37' if style == 'mounted' else '8'}S{w}X{h}"


def fit(paper_long, paper_short, R):
    """Image (long, short) in inches and margins on a paper, image long/short = R."""
    m = BORDER * paper_short
    img_long = min(paper_long - 2 * m, (paper_short - 2 * m) * R)
    img_short = img_long / R
    return img_long, img_short, (paper_long - img_long) / 2, (paper_short - img_short) / 2


def print_sizes(pix_w, pix_h, width_cm=None, height_cm=None):
    """List of sizes, largest first. width/height_inches = paper; image_* = the painting on it."""
    ratio = pix_w / pix_h
    landscape = ratio >= 1
    R = max(ratio, 1 / ratio)                                    # long / short
    long_px = max(pix_w, pix_h)
    caps = [long_px / MIN_PPI]                                   # resolution (image)
    try:
        w_cm, h_cm = float(width_cm), float(height_cm)
        if w_cm > 0 and h_cm > 0:
            caps.append(max(w_cm, h_cm) / CM_PER_IN)            # original size (image)
    except (TypeError, ValueError):
        pass
    # the paper (image + borders) must fit PAPER_MAX
    k = 2 * BORDER / (1 - 2 * BORDER)                            # border share of paper per image short
    caps.append(PAPER_MAX[1] / (1 + k / R) - 0.5)
    caps.append(PAPER_MAX[0] * (1 - 2 * BORDER) * R - 0.5)
    cap_img = min(caps)

    sizes, seen = [], set()
    for step in STEPS:
        target = cap_img * step                                  # image long side wanted
        s_ideal = (target / R) / (1 - 2 * BORDER)
        l_ideal = target + 2 * BORDER * s_ideal
        best = None
        for S in range(max(MIN_SHORT_IN, int(s_ideal) - 2), int(s_ideal) + 3):
            for L in range(max(S, int(l_ideal) - 2), int(l_ideal) + 3):
                if S > PAPER_MAX[0] or L > PAPER_MAX[1]:
                    continue
                il, ish, ml, ms = fit(L, S, R)
                if il > cap_img + 1e-9 or il < target * 0.88:   # never above the caps; near the step
                    continue
                score = abs(ml - ms) + 0.15 * abs(il - target)   # even borders first
                if best is None or score < best[0]:
                    best = (score, L, S, il, ish, ml, ms)
        if not best:
            continue
        _, L, S, il, ish, ml, ms = best
        w, h = (L, S) if landscape else (S, L)
        if (w, h) in seen:
            continue
        seen.add((w, h))
        iw, ih = (il, ish) if landscape else (ish, il)
        ppi = min(long_px / il, MAX_FILE_PPI)
        style = style_for(w, h)
        sizes.append({
            "width_inches": w, "height_inches": h,                 # paper (what Finerworks prints)
            "image_width_inches": round(iw, 2), "image_height_inches": round(ih, 2),
            "border_inches": round(min(ml, ms), 2),
            "file_pix_w": round(w * ppi), "file_pix_h": round(h * ppi),
            "style": style, "sku": sku_for(w, h, style),
        })
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
        for size in new:
            size["file_key"] = f"raw/sized/{art_id}_{size['width_inches']}x{size['height_inches']}.jpg"
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
