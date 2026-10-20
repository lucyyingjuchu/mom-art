#!/usr/bin/env python3
"""
Make and upload one print file per print size (see print_sizes.py).

Each file is the whole painting at its exact proportions, centred on whole-inch
paper with a white border, at the pixel size stored in finerworks_ready_artworks.json
(file_pix_w x file_pix_h). Uploaded to s3://xiaoran-raw-artworks/<file_key>
(raw/sized/<id>_<W>x<H>.jpg); the bucket is private, Finerworks gets a signed link.

Source for each artwork, first found:
  1. the professional scan on this computer (scan_mapping_2026.csv + scans folder)
  2. the artwork's raw file in S3 (raw/<id>.jpg or .png)
  3. the large image on the website

Run on the computer with the AWS upload keys:
    python make_print_files.py                     # everything not yet uploaded
    python make_print_files.py --dry-run           # list what would be made
    python make_print_files.py --only 01a12c08-744b   # one artwork (id prefix)
Safe to re-run: files already uploaded with the same spec are skipped.
Writes make_print_files_log.txt next to this script.
"""
import csv
import io
import json
import os
import sys
import tempfile
import urllib.request

BUCKET = "xiaoran-raw-artworks"
REGION = "us-east-1"
HERE = os.path.dirname(os.path.abspath(__file__))
PRINTS_JSON = os.path.join(HERE, "finerworks_ready_artworks.json")
MAPPING = os.path.join(HERE, "scan_mapping_2026.csv")
SCAN_DIRS = [os.path.join(HERE, "印畫冊相片(修正後)"),
             os.path.expanduser(r"~\OneDrive\文件\Mom's website\印畫冊相片(修正後)")]
SITE = "https://xiaoranart.com"


class Tee:
    def __init__(self, *s): self.s = s
    def write(self, x):
        for f in self.s: f.write(x); f.flush()
    def flush(self):
        for f in self.s: f.flush()


def main():
    from PIL import Image, ImageCms
    Image.MAX_IMAGE_PIXELS = None
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError

    dry = "--dry-run" in sys.argv
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    prints = json.load(open(PRINTS_JSON, encoding="utf-8"))
    scans = {}
    if os.path.exists(MAPPING):
        scan_dir = next((d for d in SCAN_DIRS if os.path.isdir(d)), None)
        for r in csv.DictReader(open(MAPPING, encoding="utf-8-sig")):
            if scan_dir:
                scans[r["artwork_id"]] = os.path.join(scan_dir, r["scan_file"])
    s3 = boto3.client("s3", region_name=REGION)
    srgb = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()

    def remote_spec(key):
        try:
            return s3.head_object(Bucket=BUCKET, Key=key).get("Metadata", {}).get("spec")
        except NoCredentialsError:
            sys.exit("No AWS credentials on this computer (run: py -m awscli configure).")
        except ClientError:
            return None

    def open_source(art_id, entry):
        if art_id in scans and os.path.exists(scans[art_id]):
            return Image.open(scans[art_id]), "scan " + os.path.basename(scans[art_id])
        for ext in ("jpg", "png"):
            key = f"raw/{art_id}.{ext}"
            try:
                s3.head_object(Bucket=BUCKET, Key=key)
            except ClientError:
                continue
            tmp = os.path.join(tempfile.gettempdir(), f"xr_{art_id}.{ext}")
            if not os.path.exists(tmp):
                s3.download_file(BUCKET, key, tmp)
            return Image.open(tmp), "s3 " + key
        api = entry["finerworks_image"]["finerworks_api_object"]
        url = api.get("public_preview_uri") or f"{SITE}/images/paintings/large/{art_id}_large.jpg"
        data = urllib.request.urlopen(url.replace("https://xiaoran.netlify.app", SITE)).read()
        return Image.open(io.BytesIO(data)), "web " + url.rsplit("/", 1)[-1]

    made = skipped = failed = 0
    items = [(k, v) for k, v in prints.items() if v.get("recommended_sizes") and (not only or k.startswith(only))]
    for n, (art_id, entry) in enumerate(items, 1):
        title = entry.get("artwork_info", {}).get("title", art_id)
        todo = []
        for s in entry["recommended_sizes"]:
            spec = f"{s['width_inches']}x{s['height_inches']}in-{s['file_pix_w']}x{s['file_pix_h']}px-img{s['image_width_inches']}x{s['image_height_inches']}"
            if remote_spec(s["file_key"]) == spec:
                skipped += 1
            else:
                todo.append((s, spec))
        if not todo:
            print(f"[{n}/{len(items)}] {title}: all sizes already uploaded")
            continue
        if dry:
            print(f"[{n}/{len(items)}] {title}: would make " + ", ".join(f"{s['width_inches']}x{s['height_inches']}" for s, _ in todo))
            continue
        try:
            src, where = open_source(art_id, entry)
            icc = src.info.get("icc_profile")
            src = src.convert("RGB")
        except Exception as e:
            print(f"[{n}/{len(items)}] {title}: ✗ cannot open source ({e})"); failed += len(todo); continue
        for s, spec in todo:
            try:
                W, H = s["file_pix_w"], s["file_pix_h"]
                ppi = W / s["width_inches"]
                iw = round(s["image_width_inches"] * ppi)
                ih = round(s["image_height_inches"] * ppi)
                img = src.resize((iw, ih), Image.LANCZOS)
                canvas = Image.new("RGB", (W, H), (255, 255, 255))
                canvas.paste(img, ((W - iw) // 2, (H - ih) // 2))
                out = os.path.join(tempfile.gettempdir(), f"xr_print_{art_id}_{s['width_inches']}x{s['height_inches']}.jpg")
                canvas.save(out, "JPEG", quality=95, subsampling=0, dpi=(round(ppi), round(ppi)), icc_profile=icc or srgb)
                s3.upload_file(out, BUCKET, s["file_key"], ExtraArgs={"ContentType": "image/jpeg", "Metadata": {"spec": spec}})
                os.remove(out)
                made += 1
                print(f"[{n}/{len(items)}] {title}: ✓ {s['width_inches']}x{s['height_inches']} in ({W}x{H} px, {round(ppi)} ppi) from {where}")
            except Exception as e:
                failed += 1
                print(f"[{n}/{len(items)}] {title}: ✗ {s['width_inches']}x{s['height_inches']} ({e})")
        src.close()

    print(f"\nMade {made}, already there {skipped}, problems {failed}")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    log = open(os.path.join(HERE, "make_print_files_log.txt"), "w", encoding="utf-8")
    sys.stdout = sys.stderr = Tee(sys.__stdout__, log)
    try:
        main()
    except SystemExit as e:
        if e.code not in (None, 0):
            print(e.code if isinstance(e.code, str) else f"exit {e.code}")
        raise
    except Exception:
        import traceback; traceback.print_exc(); sys.exit(1)
