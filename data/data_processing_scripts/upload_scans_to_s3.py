#!/usr/bin/env python3
"""
Upload the professional print scans (印畫冊相片) to S3 so Finerworks can print them.

Each scan goes to  s3://xiaoran-raw-artworks/raw/<artwork id>.jpg  — the same place
Finerworks_processor_aws.py and the checkout functions already look for print files.
Which scan belongs to which artwork is in scan_mapping_2026.csv (checked by hand
against the 2026 catalogue).

Run on the computer that has the AWS keys (the same one Single_aws_uploader.py used):
    python upload_scans_to_s3.py                       # scans folder next to this file / default path
    python upload_scans_to_s3.py "D:\\some\\other\\folder"
    python upload_scans_to_s3.py --dry-run             # only show what would happen

Safe to re-run: files already in S3 with the same size are skipped.
"""
import csv
import os
import sys

BUCKET = "xiaoran-raw-artworks"
REGION = "us-east-1"
HERE = os.path.dirname(os.path.abspath(__file__))
MAPPING = os.path.join(HERE, "scan_mapping_2026.csv")
DEFAULT_SCANS = [
    os.path.join(HERE, "印畫冊相片(修正後)"),
    os.path.expanduser(r"~\OneDrive\文件\Mom's website\印畫冊相片(修正後)"),
]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    folder = args[0] if args else next((p for p in DEFAULT_SCANS if os.path.isdir(p)), None)
    if not folder or not os.path.isdir(folder):
        sys.exit("找不到掃描檔資料夾 / scans folder not found. Pass it as the first argument.")

    try:
        import boto3
        from boto3.s3.transfer import TransferConfig
        from botocore.exceptions import ClientError, NoCredentialsError
    except ImportError:
        sys.exit("Please run:  pip install boto3")

    rows = list(csv.DictReader(open(MAPPING, encoding="utf-8-sig")))
    s3 = boto3.client("s3", region_name=REGION)
    cfg = TransferConfig(multipart_threshold=32 * 1024 * 1024, multipart_chunksize=32 * 1024 * 1024)

    done = skipped = failed = 0
    for i, r in enumerate(rows, 1):
        src = os.path.join(folder, r["scan_file"])
        key = f"raw/{r['artwork_id']}.jpg"
        label = f"[{i:2d}/{len(rows)}] {r['scan_file']:>12} → {r['title']}"
        if not os.path.isfile(src):
            print(f"{label}  ✗ missing file"); failed += 1; continue
        size = os.path.getsize(src)
        try:
            remote = s3.head_object(Bucket=BUCKET, Key=key)["ContentLength"]
        except NoCredentialsError:
            sys.exit("No AWS credentials on this computer. Run `aws configure` (or set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) and try again.")
        except ClientError:
            remote = None
        if remote == size:
            print(f"{label}  ✓ already in S3"); skipped += 1; continue
        if dry:
            print(f"{label}  would upload {size/1e6:.0f} MB"); continue
        try:
            s3.upload_file(src, BUCKET, key, ExtraArgs={"ContentType": "image/jpeg"}, Config=cfg)
            ok = s3.head_object(Bucket=BUCKET, Key=key)["ContentLength"] == size
            print(f"{label}  {'✓ uploaded' if ok else '✗ size mismatch'} ({size/1e6:.0f} MB)")
            done += ok; failed += (not ok)
        except Exception as e:  # keep going with the rest
            print(f"{label}  ✗ {e}"); failed += 1

    print(f"\nUploaded {done}, already there {skipped}, problems {failed}  (of {len(rows)})")
    if failed:
        sys.exit(1)


class _Tee:
    def __init__(self, *s): self.s = s
    def write(self, x):
        for f in self.s: f.write(x); f.flush()
    def flush(self):
        for f in self.s: f.flush()


if __name__ == "__main__":
    _log = open(os.path.join(HERE, "upload_log.txt"), "w", encoding="utf-8")
    sys.stdout = sys.stderr = _Tee(sys.__stdout__, _log)
    try:
        main()
    except SystemExit as e:
        if e.code not in (None, 0):
            print(e.code if isinstance(e.code, str) else f"exit {e.code}")
        raise
    except Exception:
        import traceback; traceback.print_exc()
        sys.exit(1)
