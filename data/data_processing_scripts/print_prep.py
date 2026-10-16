#!/usr/bin/env python3
"""
Fine-art prints: high-res photos -> S3 -> print sizes on the website, in one go
==============================================================================

    python data/data_processing_scripts/print_prep.py 高解析照片/            (dry run - changes nothing)
    python data/data_processing_scripts/print_prep.py 高解析照片/ --upload   (upload + update the shop)

Run from the repo root, on the computer that has the AWS login (aws configure).

1. Matches every photo in the folder to an artwork: by file name = artwork id
   (019891b0-....jpg) or file name = title (清音.jpg, 清音-高解析.tif ...).
2. Shows each match's pixel size and the print sizes it allows
   (200 PPI, longest side capped at 24", sizes at 100% / 70% / 50%).
3. --upload: sends the originals to S3 (raw/<id>.jpg). Photos already in S3 are skipped
   unless you add --replace. TIFF/HEIC/WebP and photos with a rotation flag are saved
   as top-quality JPEG first, so Finerworks prints them the right way up.
4. Re-runs the Finerworks processor -> data/finerworks_ready_artworks.json.
   Commit and push that file; the new print sizes go live with the next deploy.
"""

import argparse
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from excel_import import index_photos, match_photo, norm, ARTWORKS_JSON   # noqa: E402
from Finerworks_processor_aws import HybridFinerWorksProcessor             # noqa: E402

import contextlib
import io
import json

from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = None   # scans of big paintings are huge; that's fine here
try:
    import pillow_heif          # optional: iPhone .heic photos
    pillow_heif.register_heif_opener()
except ImportError:
    pass

OUTPUT = "data/finerworks_ready_artworks.json"


def quiet(fn, *args):
    with contextlib.redirect_stdout(io.StringIO()):
        return fn(*args)


def prepare_upload_file(path, tmpdir):
    """Return a .jpg/.png path S3 + Finerworks can use as-is (rotation baked in)."""
    ext = os.path.splitext(path)[1].lower()
    with Image.open(path) as im:
        rotated = im.getexif().get(0x0112, 1) not in (0, 1)
        if ext in (".jpg", ".jpeg", ".png") and not rotated:
            return path
        icc = im.info.get("icc_profile")
        im = ImageOps.exif_transpose(im)
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        out = os.path.join(tmpdir, norm(os.path.splitext(os.path.basename(path))[0]) + ".jpg")
        im.save(out, "JPEG", quality=95, subsampling=0, icc_profile=icc)
        return out


def main():
    ap = argparse.ArgumentParser(description="Upload high-res originals and update print sizes")
    ap.add_argument("folder", help="folder with the high-res photos / scans")
    ap.add_argument("--upload", action="store_true", help="upload to S3 and update the shop (default: dry run)")
    ap.add_argument("--replace", action="store_true", help="also re-upload works already in S3")
    args = ap.parse_args()

    if not os.path.exists(ARTWORKS_JSON):
        sys.exit(f"Run this from the repo root - {ARTWORKS_JSON} not found")
    with open(ARTWORKS_JSON, encoding="utf-8") as f:
        artworks = [a for a in json.load(f) if a.get("title") and a.get("image") and a.get("status") != "draft"]

    photos = index_photos(args.folder)
    if not photos:
        sys.exit(f"No photos found in {args.folder}")

    proc = HybridFinerWorksProcessor()
    can_check_s3 = proc.s3_client is not None
    used = set()
    plan = []
    for art in artworks:
        path = photos.get(norm(art["id"])) or match_photo(photos, art["title"], "")
        if not path:
            continue
        used.add(path)
        try:
            with Image.open(path) as im:
                w, h = ImageOps.exif_transpose(im).size if im.getexif().get(0x0112, 1) not in (0, 1) else im.size
        except Exception as e:
            print(f"⚠️  {os.path.basename(path)}: can't open ({e}) - convert it to JPEG or TIFF")
            continue
        sizes, cap, _ = quiet(proc.calculate_print_cap_and_sizes, w, h)
        in_s3 = False
        if can_check_s3:
            try:
                in_s3 = quiet(proc.check_s3_object_exists, art["id"])[0]
            except Exception:
                can_check_s3 = False
        plan.append((art, path, w, h, sizes, in_s3))

    print(f"{'Photo':<30} {'Pixels':<12} {'Print sizes (inches)':<26} Artwork")
    for art, path, w, h, sizes, in_s3 in plan:
        size_txt = ", ".join(f"{s['width_inches']}×{s['height_inches']}" for s in sizes) or "too small to print"
        flag = "  (already in S3)" if in_s3 else ""
        print(f"{os.path.basename(path)[:29]:<30} {f'{w}×{h}':<12} {size_txt:<26} {art['title']}{flag}")
    unmatched = sorted(set(photos.values()) - used)
    if unmatched:
        print(f"\nNo artwork found for ({len(unmatched)}) - rename to the title or id: "
              + ", ".join(os.path.basename(p) for p in unmatched))
    small = [a["title"] for a, _, w, h, s, _ in plan if not s]
    if small:
        print("\n⚠️  Too small for a 6\" print at 200 PPI (need ~1200 px on the short side): " + "、".join(small))
    if not can_check_s3:
        print("\n(Couldn't reach S3 - is the AWS login set up on this computer? `aws configure`)")

    if not args.upload:
        print(f"\n{len(plan)} matched. Dry run - nothing uploaded. Add --upload to send them and update the shop.")
        return
    if not can_check_s3:
        sys.exit("Can't upload without S3 access.")

    uploaded = 0
    with tempfile.TemporaryDirectory() as tmp:
        for art, path, w, h, sizes, in_s3 in plan:
            if not sizes or (in_s3 and not args.replace):
                continue
            src = prepare_upload_file(path, tmp)
            if src.lower().endswith(".png"):   # don't leave a stale .jpg next to a new .png (or vice versa)
                stale = f"raw/{art['id']}.jpg"
            else:
                stale = f"raw/{art['id']}.png"
            if proc.upload_to_s3(src, art["id"]):
                uploaded += 1
                print(f"⬆️  {art['title']}")
                try:
                    proc.s3_client.delete_object(Bucket=proc.s3_bucket_name, Key=stale)
                except Exception:
                    pass
    print(f"\nUploaded {uploaded}. Updating print sizes...")

    before = {}
    if os.path.exists(OUTPUT):
        with open(OUTPUT, encoding="utf-8") as f:
            before = {k: v["artwork_info"]["title"] for k, v in json.load(f).items() if v.get("print_ready")}
    log = io.StringIO()
    with contextlib.redirect_stdout(log):
        ok = proc.process_artworks(ARTWORKS_JSON, OUTPUT)
    title = ""
    for line in log.getvalue().splitlines():   # pass on the warnings, with the artwork they belong to
        if line.startswith("Processing: "):
            title = line[len("Processing: "):]
        elif "⚠️" in line or "❌" in line or "   Nothing" in line:
            print(f"{line.strip()}  [{title}]" if "⚠️" in line else line)
    if not ok:
        sys.exit("Print sizes NOT updated.")
    with open(OUTPUT, encoding="utf-8") as f:
        after = json.load(f)
    new = [v["artwork_info"]["title"] for k, v in after.items() if v.get("print_ready") and k not in before]
    total = sum(1 for v in after.values() if v.get("print_ready"))
    gone = [title for k, title in before.items() if not after.get(k, {}).get("print_ready")]
    print(f"✅ {OUTPUT}: {total} works offered as prints" + (f", new: {'、'.join(new)}" if new else ""))
    if gone:
        print(f"⚠️  No longer offered ({len(gone)}): " + "、".join(gone))
    print("Commit and push data/finerworks_ready_artworks.json to put them on the site.")


if __name__ == "__main__":
    main()
