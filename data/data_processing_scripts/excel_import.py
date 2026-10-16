#!/usr/bin/env python3
"""
Excel -> artworks.json importer for xiaoranart.com
==================================================

Adds new artworks from Mom's Excel sheet in one go, instead of typing them into
the admin page one by one.

    python data/data_processing_scripts/excel_import.py 作品清單.xlsx --photos 照片資料夾/
    python data/data_processing_scripts/excel_import.py 作品清單.xlsx --photos 照片資料夾/ --write

Run from the repo root. Without --write it only shows what WOULD happen (safe).

What it does for each row
  * Reads the columns it recognises (Chinese or English headers, see COLUMN_NAMES).
  * Skips a row whose title already exists on the site (prints it) - re-running is safe.
  * If a photo for the row is found, makes the website copies:
        images/paintings/large/<id>_large.jpg       (long side 1600px)
        images/paintings/thumbnails/<id>_thumb.jpg  (long side 800px)
  * Rows without a photo are still added, but stay hidden from the public site
    (they show up on the admin page as 草稿 / draft) until a photo is added.
  * Makes a backup of artworks.json before writing.

Photos are matched by the sheet's 圖片/檔名 column if there is one, otherwise by a
file whose name starts with the artwork title (e.g. "清音.jpg" or "清音-1.JPG").

After importing: fill English titles/poems (Unified_translator.py, or ask Claude),
then run artwork_categorizer.py. Rows with a 題材 (and/or 地點) column filled in
keep exactly those filter tags; rows without one get keyword guesses.
"""

import argparse
import json
import os
import re
import secrets
import shutil
import sys
import time
import unicodedata
from datetime import datetime

try:
    import openpyxl
except ImportError:
    sys.exit("Please install openpyxl first:  pip install openpyxl pillow")

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Please install Pillow first:  pip install openpyxl pillow")

ARTWORKS_JSON = "data/artworks.json"
CATEGORY_CONFIG = "data/category-config.json"
THUMB_DIR = "images/paintings/thumbnails"
LARGE_DIR = "images/paintings/large"
THUMB_LONG_SIDE = 800
LARGE_LONG_SIDE = 1600
PHOTO_EXTS = (".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp", ".heic")

# Header text (lower-cased, spaces removed) -> artworks.json field
COLUMN_NAMES = {
    "title":        ["標題", "作品名稱", "名稱", "題目", "畫題", "作品", "title", "name"],
    "titleEn":      ["英文標題", "英文名稱", "englishtitle", "titleen", "title(en)"],
    "year":         ["創作年代", "年份", "年代", "創作年份", "年", "year", "date"],
    "heightCm":     ["高", "高度", "高(cm)", "高cm", "直", "height", "heightcm", "h"],
    "widthCm":      ["寬", "寬度", "寬(cm)", "寬cm", "橫", "width", "widthcm", "w"],
    "size":         ["畫心尺寸(cm)", "畫心尺寸", "尺寸", "尺寸(cm)", "大小", "規格", "size", "dimensions"],
    "format":       ["形式", "裝裱", "裱法", "格式", "format", "mounting"],
    "description":  ["落款", "描述", "題詩", "題款", "詩文", "內容", "description", "poem", "inscription"],
    "descriptionEn":["英文描述", "英文說明", "descriptionen", "englishdescription"],
    "curatorNote":  ["作品說明", "說明", "備註", "策展說明", "附註", "note", "notes", "curatornote"],
    "available":    ["可售", "是否可售", "販售", "狀態", "available", "forsale"],
    "featured":     ["精選", "featured"],
    "price":        ["價格", "售價", "price"],
    "series":       ["系列", "series"],
    "subjects":     ["題材", "題材分類", "分類", "類別", "subject", "subjects", "category", "categories"],
    "locations":    ["地點", "地點分類", "景點", "location", "locations", "place"],
    "photo":        ["圖片", "照片", "檔名", "圖檔", "圖片檔名", "photo", "image", "file", "filename"],
    "ignore":       ["編號", "媒材", "no", "no.", "#"],   # recognised so they don't get mistaken for other columns
}

FORMAT_EN = {
    "框": "Framed", "軸": "Hanging Scroll", "立軸": "Hanging Scroll", "橫軸": "Horizontal Scroll",
    "鏡片": "Mounted Panel", "圓框": "Circular Frame", "扇面": "Fan", "冊頁": "Album Leaf",
    "斗方": "Square Panel", "手卷": "Handscroll", "橫幅": "Horizontal Panel",
}

NO_WORDS = {"否", "不", "不可", "已售", "售出", "no", "n", "false", "0", "sold", "x", "✗"}
YES_WORDS = {"是", "可", "可售", "yes", "y", "true", "1", "v", "✓", "√", "o"}


def norm(text):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", str(text or ""))).lower()


def uuidv7():
    """Same id style as the rest of artworks.json (time-ordered UUID v7)."""
    ts = int(time.time() * 1000) & ((1 << 48) - 1)
    rand_a = secrets.randbits(12)
    rand_b = secrets.randbits(62)
    n = (ts << 80) | (0x7 << 76) | (rand_a << 64) | (0x2 << 62) | rand_b
    h = f"{n:032x}"
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:]}"


def find_header(ws):
    """Return (row_number, {field: column_index}) for the row that looks most like headers."""
    lookup = {norm(alias): field for field, aliases in COLUMN_NAMES.items() for alias in aliases}
    by_length = sorted(lookup.items(), key=lambda kv: -len(kv[0]))
    best_row, best = None, {}
    for r in range(1, min(ws.max_row, 10) + 1):
        mapping = {}
        for c in range(1, ws.max_column + 1):          # exact header names first
            field = lookup.get(norm(ws.cell(r, c).value))
            if field and field not in mapping:
                mapping[field] = c
        for c in range(1, ws.max_column + 1):          # then e.g. "備註欄", "作品名稱(中文)"
            header = norm(ws.cell(r, c).value)
            if not header or c in mapping.values():
                continue
            for alias, field in by_length:
                if len(alias) >= 2 and alias in header and field not in mapping:
                    mapping[field] = c
                    break
        if "title" in mapping and len(mapping) > len(best):
            best_row, best = r, mapping
    return best_row, best


def cell_text(value):
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    if isinstance(value, datetime):
        return str(value.year)
    return unicodedata.normalize("NFKC", str(value)).strip()


def parse_number(text):
    m = re.search(r"\d+(?:\.\d+)?", text or "")
    if not m:
        return None
    n = float(m.group())
    return int(n) if n.is_integer() else n


def parse_size(text):
    """'135x70', '135 × 70 cm', '高135寬70' -> (135, 70)  (height, width)"""
    nums = re.findall(r"\d+(?:\.\d+)?", text or "")
    if len(nums) >= 2:
        h, w = float(nums[0]), float(nums[1])
        return (int(h) if h.is_integer() else h, int(w) if w.is_integer() else w)
    return None, None


def parse_bool(text, default):
    t = norm(text)
    if not t:
        return default
    if t in NO_WORDS:
        return False
    if t in YES_WORDS:
        return True
    return default


def index_photos(folder):
    photos = {}
    if not folder:
        return photos
    for root, _, files in os.walk(folder):
        for f in files:
            if f.lower().endswith(PHOTO_EXTS) and not f.startswith("."):
                photos[norm(os.path.splitext(f)[0])] = os.path.join(root, f)
    return photos


def embedded_photos(ws, out_dir):
    """Pictures pasted into the sheet -> {row_number: saved_file}. A picture belongs
    to the row its vertical middle sits in (pictures often overlap row borders)."""
    os.makedirs(out_dir, exist_ok=True)
    emu_per_pt = 12700
    tops = [0]
    for r in range(1, ws.max_row + 50):
        tops.append(tops[-1] + (ws.row_dimensions[r].height or 15) * emu_per_pt)
    found = {}
    for i, img in enumerate(getattr(ws, "_images", [])):
        a = img.anchor
        start = a._from
        y0 = tops[start.row] + start.rowOff
        to = getattr(a, "to", None)
        y1 = tops[to.row] + to.rowOff if to is not None else y0 + a.ext.height
        middle = (y0 + y1) / 2
        row = next(r for r in range(1, len(tops)) if tops[r] > middle)
        path = os.path.join(out_dir, f"row{row:03d}_{i}.png")
        with open(path, "wb") as f:
            f.write(img._data())
        if row in found:
            print(f"⚠️  Row {row} has more than one picture - using the first, check it by hand")
            continue
        found[row] = path
    return found


def match_photo(photos, title, photo_cell):
    if photo_cell:
        key = norm(os.path.splitext(photo_cell)[0])
        if key in photos:
            return photos[key]
    t = norm(title)
    if t in photos:
        return photos[t]
    # "清音-1", "清音 (正面)" ... take the shortest name that starts with the title
    candidates = sorted((k for k in photos if k.startswith(t)), key=len)
    return photos[candidates[0]] if candidates else None


def save_resized(src, dest, long_side, quality):
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        scale = long_side / max(im.size)
        if scale < 1:
            im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
        im.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)


def load_category_words():
    """Map 山水 / Landscape / landscape -> ("subjects", "landscape"), 玉山 -> ("locations", "yushan"), ..."""
    with open(CATEGORY_CONFIG, encoding="utf-8") as f:
        cfg = json.load(f)
    words = {}
    for kind in ("subjects", "locations"):
        for key in cfg["categories"][kind]:
            words[norm(key)] = (kind, key)
            for lang in ("zh", "en"):
                label = cfg["displayLabels"][lang][kind].get(key)
                if label:
                    words[norm(label)] = (kind, key)
    words[norm("花卉")] = words[norm("花鳥")]   # common alternative names
    words[norm("雲")] = words[norm("煙雲")]
    words[norm("月")] = words[norm("明月")]
    return words


def parse_categories(text, words, where):
    """'山水、煙雲 / 玉山' -> {"subjects": ["landscape", "flowingclouds"], "locations": ["yushan"]}"""
    found = {"subjects": [], "locations": []}
    for part in re.split(r"[、,，;；/／|\s]+", text or ""):
        if not part:
            continue
        hit = words.get(norm(part))
        if not hit:
            print(f"⚠️  {where}: unknown category '{part}' ignored (known: 山水 瀑布 煙雲 明月 花鳥 墨竹 書法 抽象, or a place like 玉山)")
            continue
        kind, key = hit
        if key not in found[kind]:
            found[kind].append(key)
    return found


def main():
    ap = argparse.ArgumentParser(description="Import new artworks from an Excel sheet")
    ap.add_argument("excel", help="the .xlsx file")
    ap.add_argument("--photos", help="folder with the artwork photos")
    ap.add_argument("--sheet", help="worksheet name (default: first sheet)")
    ap.add_argument("--write", action="store_true", help="actually change files (default is a dry run)")
    args = ap.parse_args()

    if not os.path.exists(ARTWORKS_JSON):
        sys.exit(f"Run this from the repo root - {ARTWORKS_JSON} not found")

    wb = openpyxl.load_workbook(args.excel, data_only=True)
    ws = wb[args.sheet] if args.sheet else wb.worksheets[0]
    header_row, cols = find_header(ws)
    if not header_row:
        sys.exit("Couldn't find a header row with a title column (標題 / 作品名稱 / Title).")

    print(f"Sheet '{ws.title}', headers on row {header_row}")
    print("Columns used: " + ", ".join(f"{f}←{ws.cell(header_row, c).value}" for f, c in cols.items()))
    ignored = [ws.cell(header_row, c).value for c in range(1, ws.max_column + 1)
               if c not in cols.values() and ws.cell(header_row, c).value]
    if ignored:
        print("Columns NOT used: " + ", ".join(map(str, ignored)))

    with open(ARTWORKS_JSON, encoding="utf-8") as f:
        artworks = json.load(f)
    existing_titles = {norm(a.get("title")) for a in artworks}
    photos = index_photos(args.photos)
    category_words = load_category_words()
    sheet_photos = embedded_photos(ws, os.path.join("data", ".excel_photos_tmp"))
    if sheet_photos:
        print(f"Found {len(sheet_photos)} pictures inside the sheet")

    added, skipped, with_photo, drafts = [], [], 0, 0
    for r in range(header_row + 1, ws.max_row + 1):
        get = lambda field: cell_text(ws.cell(r, cols[field]).value) if field in cols else ""
        title = get("title")
        if not title:
            # Untitled row with a picture or poem: import it as a draft so it shows
            # up on the admin page for Mom to name, but stays off the public site.
            if not (sheet_photos.get(r) or get("description")):
                continue
        elif norm(title) in existing_titles:
            skipped.append(title)
            continue
        else:
            existing_titles.add(norm(title))

        h, w = parse_number(get("heightCm")), parse_number(get("widthCm"))
        if (h is None or w is None) and get("size"):
            h, w = parse_size(get("size"))

        fmt = get("format")
        art_id = uuidv7()
        artwork = {
            "id": art_id,
            "title": title,
            "titleEn": get("titleEn"),
            "image": "",
            "imageHigh": "",
            "description": get("description"),
            "descriptionEn": get("descriptionEn"),
            "format": fmt,
            "formatEn": FORMAT_EN.get(fmt, ""),
            "year": get("year"),
            "price": get("price"),
            "available": parse_bool(get("available"), True),
            "featured": parse_bool(get("featured"), False),
            "curatorNote": get("curatorNote"),
            "curatorNoteEn": "",
        }
        if get("series"):
            artwork["series"] = get("series")    # gallery keeps a year's series together
        # 題材 / 地點 columns -> hand-picked filter tags (these win over the automatic guesses)
        cats = parse_categories(get("subjects") + " " + get("locations"), category_words, f"Row {r}")
        if cats["subjects"] or cats["locations"]:
            artwork["autoCategories"] = {"subjects": [], "locations": []}
            artwork["manualCategories"] = cats
        if h is not None and w is not None:
            artwork.update({
                "heightCm": h, "widthCm": w,
                "heightInches": round(h / 2.54, 1), "widthInches": round(w / 2.54, 1),
            })

        photo = sheet_photos.get(r) or match_photo(photos, title, get("photo"))

        # Sizes are 高x寬 (height x width); if the photo's shape says otherwise, swap and warn
        if photo and h is not None and w is not None:
            with Image.open(photo) as im:
                photo_portrait = im.height > im.width
            if (h > w) != photo_portrait and abs(h - w) > 5:
                print(f"⚠️  Row {r} {title}: size {h}×{w} doesn't match the photo's shape - stored as {w}×{h}")
                h, w = w, h
                artwork.update({"heightCm": h, "widthCm": w,
                                "heightInches": round(h / 2.54, 1), "widthInches": round(w / 2.54, 1)})
        if photo:
            large = f"{LARGE_DIR}/{art_id}_large.jpg"
            thumb = f"{THUMB_DIR}/{art_id}_thumb.jpg"
            if args.write:
                save_resized(photo, large, LARGE_LONG_SIDE, 88)
                save_resized(photo, thumb, THUMB_LONG_SIDE, 82)
            with Image.open(photo) as im:
                im = ImageOps.exif_transpose(im)
                artwork["imageRatio"] = round(im.width / im.height, 3)   # gallery box shape
            artwork["image"] = "./" + thumb
            artwork["imageHigh"] = "./" + large
            artwork["productViews"] = [{"type": "original", "image": "./" + large}]
            if title:
                with_photo += 1
            else:
                drafts += 1
        else:
            drafts += 1

        if not title:
            artwork["status"] = "draft"
        artworks.append(artwork)
        added.append((r, title, os.path.basename(photo) if photo else None, h, w))

    print(f"\n{'Row':>4}  {'Photo':<28} Size        Title")
    for (r, title, photo, h, w), art in zip(added, artworks[len(artworks) - len(added):]):
        size = f"{h}×{w}" if h is not None else "—"
        tags = art.get("manualCategories", {})
        tags = " ".join(tags.get("subjects", []) + tags.get("locations", [])) or "(no 題材 - will be guessed)"
        print(f"{r:>4}  {(photo or '(none → draft)'):<28} {size:<11} {title or '(無題 → draft)'}  [{tags}]")
    if skipped:
        print(f"\nAlready on the site, skipped ({len(skipped)}): " + "、".join(skipped))
    print(f"\n{len(added)} new artworks: {with_photo} ready (public), {drafts} drafts (no photo or no title - admin only)")

    if not args.write:
        print("\nDry run - nothing changed. Add --write to import.")
        return

    backup = f"data/artworks_backup_{datetime.now():%Y%m%d_%H%M%S}.json"
    shutil.copyfile(ARTWORKS_JSON, backup)
    with open(ARTWORKS_JSON, "w", encoding="utf-8") as f:
        json.dump(artworks, f, ensure_ascii=False, indent=2)
        f.write("\n")
    shutil.rmtree(os.path.join("data", ".excel_photos_tmp"), ignore_errors=True)
    print(f"✅ Wrote {ARTWORKS_JSON} (backup: {backup})")


if __name__ == "__main__":
    main()
