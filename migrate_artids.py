#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ArtID migration tool
- Cleans image references vs filesystem
- Optionally deletes orphaned image files
- Rewrites artworks.json IDs to UUIDs (or 8-digit numeric if chosen)
- Renames corresponding image files safely (2-phase, collision-proof)
- Outputs a CSV/JSON report and a migrated JSON file

Usage:
  python migrate_artids.py --root <project_root> --json artworks.json --id-scheme uuidv7 --dry-run
  python migrate_artids.py --root <project_root> --json artworks.json --id-scheme uuidv4
  python migrate_artids.py --root <project_root> --json artworks.json --id-scheme numeric8

Notes:
- "root" should be the repo/web root that contains images/ and the artworks.json file.
- Default images locations (can be overridden via CLI):
    thumbnails_dir = images/paintings/thumbnails
    large_dir      = images/paintings/large
"""

import argparse
import csv
import datetime as dt
import json
import os
import re
import shutil
import sys
import uuid
import time
import random

# --------------------------- Helpers ---------------------------

def uuidv4_str():
    return str(uuid.uuid4())

def uuidv7_str():
    """Pure-Python UUID v7 per draft spec.
    Layout (big-endian):
      48 bits: unix_ts_ms
       4 bits: version (0b0111)
      12 bits: rand_a
       2 bits: variant (0b10)
      62 bits: rand_b
    """
    ts_ms = int(time.time() * 1000) & ((1 << 48) - 1)
    rand_a = random.getrandbits(12)
    rand_b = random.getrandbits(62)
    n = (ts_ms << 80) | (0x7 << 76) | (rand_a << 64) | (0b10 << 62) | rand_b
    # Format as 8-4-4-4-12 hex
    hex32 = f"{n:032x}"
    return f"{hex32[0:8]}-{hex32[8:12]}-{hex32[12:16]}-{hex32[16:20]}-{hex32[20:32]}"

def numeric8_gen(start=1):
    # Simple generator for zero-padded 8-digit numbers
    n = start
    while True:
        yield f"{n:08d}"
        n += 1

FNAME_RE_THUMB = re.compile(r"^(?P<artid>.+?)_thumb\.(?P<ext>png|jpg|jpeg|webp)$", re.IGNORECASE)
FNAME_RE_LARGE = re.compile(r"^(?P<artid>.+?)_large\.(?P<ext>png|jpg|jpeg|webp)$", re.IGNORECASE)

def norm_path(p):
    return os.path.normpath(p).replace("\\", "/")

def find_images(dir_path):
    files = {}
    if not os.path.isdir(dir_path):
        return files
    for fn in os.listdir(dir_path):
        full = os.path.join(dir_path, fn)
        if not os.path.isfile(full):
            continue
        mthumb = FNAME_RE_THUMB.match(fn)
        mlarge = FNAME_RE_LARGE.match(fn)
        if mthumb:
            artid = mthumb.group("artid")
            ext = mthumb.group("ext")
            files.setdefault(artid, {})["thumb"] = {"path": full, "ext": ext.lower()}
        elif mlarge:
            artid = mlarge.group("artid")
            ext = mlarge.group("ext")
            files.setdefault(artid, {})["large"] = {"path": full, "ext": ext.lower()}
    return files

def safe_rename(src, dst, dry_run=False):
    if norm_path(src) == norm_path(dst):
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if dry_run:
        return
    # Ensure destination dir exists
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    # If destination exists, raise to avoid accidental overwrite
    if os.path.exists(dst):
        raise FileExistsError(f"Destination already exists: {dst}")
    os.rename(src, dst)

def temp_path(dst):
    # Put files into a temp "._moving" dir to avoid filename collisions in-place
    base_dir = os.path.dirname(dst)
    temp_dir = os.path.join(base_dir, ".__moving")
    os.makedirs(temp_dir, exist_ok=True)
    base_name = os.path.basename(dst)
    return os.path.join(temp_dir, base_name + ".__tmp")

def rel_from_root(root, p):
    try:
        return norm_path(os.path.relpath(p, root))
    except Exception:
        return norm_path(p)

# --------------------------- Main ---------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="Project root containing images/ and artworks.json")
    ap.add_argument("--json", default="artworks.json", help="Path to artworks.json (relative to root or absolute)")
    ap.add_argument("--thumb-dir", default="images/paintings/thumbnails", help="Thumbnails directory relative to root")
    ap.add_argument("--large-dir", default="images/paintings/large", help="Large images directory relative to root")
    ap.add_argument("--id-scheme", choices=["uuidv7", "uuidv4", "numeric8"], default="uuidv7", help="New ID scheme")
    ap.add_argument("--delete-orphans", action="store_true", help="Delete image files that have no matching JSON entry")
    ap.add_argument("--dry-run", action="store_true", help="Do not change files, only report actions")
    ap.add_argument("--start-index", type=int, default=1, help="Start index for numeric8 scheme (default 1)")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    json_path = os.path.join(root, args.json) if not os.path.isabs(args.json) else args.json
    thumbs_dir = os.path.join(root, args.thumb_dir)
    large_dir = os.path.join(root, args.large_dir)

    # Load JSON
    if not os.path.isfile(json_path):
        print(f"ERROR: artworks.json not found at {json_path}", file=sys.stderr)
        sys.exit(2)
    with open(json_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"ERROR: JSON parse failed: {e}", file=sys.stderr)
            sys.exit(2)

    # Build sets from JSON
    json_ids = []
    for i, entry in enumerate(data):
        eid = str(entry.get("id", "")).strip()
        if not eid:
            print(f"WARN: Entry index {i} has empty id; will still migrate but consider cleaning.", file=sys.stderr)
        json_ids.append(eid)

    json_id_set = set(json_ids)

    # Scan filesystem
    thumbs = find_images(thumbs_dir)
    large = find_images(large_dir)

    # Merge sightings
    fs_index = {}
    for artid, parts in thumbs.items():
        fs_index.setdefault(artid, {}).update(parts)
    for artid, parts in large.items():
        fs_index.setdefault(artid, {}).update(parts)

    # Step 1: Orphans (files on disk with no JSON entry)
    orphans = []
    for artid, parts in fs_index.items():
        if artid not in json_id_set:
            # each part can be "thumb" and/or "large"
            for kind, info in parts.items():
                orphans.append(info["path"])

    # Step 2: Missing files for JSON entries (clear image paths when file doesn't exist)
    missing_paths_actions = []  # (entry_index, field_name, old_value)
    def file_exists_from_json_path(p):
        if not p:
            return False
        # p may be like "./images/paintings/thumbnails/2018_001_thumb.png"
        # Make it absolute:
        abs_p = os.path.join(root, p.lstrip("./"))
        return os.path.isfile(abs_p)

    for idx, entry in enumerate(data):
        img = entry.get("image", "")
        img_hi = entry.get("imageHigh", "")
        if img and not file_exists_from_json_path(img):
            missing_paths_actions.append((idx, "image", img))
            entry["image"] = ""
        if img_hi and not file_exists_from_json_path(img_hi):
            missing_paths_actions.append((idx, "imageHigh", img_hi))
            entry["imageHigh"] = ""

    # Step 3: Remap IDs and rename files safely
    # Build id map
    if args.id_scheme == "uuidv7":
        new_id_for = {old: uuidv7_str() for old in json_ids}
    elif args.id_scheme == "uuidv4":
        new_id_for = {old: uuidv4_str() for old in json_ids}
    else:  # numeric8
        gen = numeric8_gen(start=args.start_index)
        new_id_for = {old: next(gen) for old in json_ids}

    # Two-phase renames to avoid collisions:
    #   - Compute target filenames for each existing file
    #   - First move all source files into a temp ".__moving" area with their *final new base name* appended .__tmp
    #   - Then move from temp to final destination names
    temp_moves = []  # (src, tmp)
    final_moves = []  # (tmp, final)
    rename_records = []  # for report

    def target_paths(old_id, new_id, part_info, kind):
        ext = part_info["ext"]
        if kind == "thumb":
            new_rel = f"{args.thumb_dir}/{new_id}_thumb.{ext}"
        else:
            new_rel = f"{args.large_dir}/{new_id}_large.{ext}"
        new_abs = os.path.join(root, new_rel)
        return new_rel, new_abs

    # Build planned moves for files that exist
    for old_id, parts in fs_index.items():
        for kind in ("thumb", "large"):
            if kind not in parts:
                continue
            info = parts[kind]
            if old_id not in new_id_for:
                # File exists on disk but JSON doesn't have this id (orphan) - handled separately if delete-orphans
                continue
            new_id = new_id_for[old_id]
            new_rel, new_abs = target_paths(old_id, new_id, info, kind)
            # temp absolute path
            tmp_abs = temp_path(new_abs)
            temp_moves.append((info["path"], tmp_abs))
            final_moves.append((tmp_abs, new_abs))
            rename_records.append({
                "kind": kind,
                "old_id": old_id,
                "new_id": new_id,
                "old_abs": info["path"],
                "tmp_abs": tmp_abs,
                "new_abs": new_abs,
                "old_rel": rel_from_root(root, info["path"]),
                "new_rel": new_rel
            })

    # Execute moves (dry-run respected)
    # 1) Orphans delete
    deleted_files = []
    if args.delete_orphans and orphans:
        for p in orphans:
            if not args.dry_run and os.path.isfile(p):
                os.remove(p)
            deleted_files.append(rel_from_root(root, p))

    # 2) Temp moves
    for src, tmp in temp_moves:
        if not os.path.isfile(src):
            # Source missing (maybe only one of thumb/large exists) - skip silently
            continue
        safe_rename(src, tmp, dry_run=args.dry_run)

    # 3) Final moves
    for tmp, dst in final_moves:
        # If temp didn't create due to dry-run or source missing, skip
        if args.dry_run:
            continue
        # temp file might not exist if the source didn't exist
        if os.path.exists(tmp):
            safe_rename(tmp, dst, dry_run=args.dry_run)

    # Update JSON entries with new IDs and updated image paths
    for entry in data:
        old_id = str(entry.get("id", "")).strip()
        new_id = new_id_for.get(old_id, old_id)
        entry["id"] = new_id

        # If images existed (in fs_index) we already moved them; re-point paths if appropriate
        parts = fs_index.get(old_id, {})
        # Update thumb
        if "thumb" in parts:
            # Use new extension from record
            ext = parts["thumb"]["ext"]
            entry["image"] = f"./{args.thumb_dir}/{new_id}_thumb.{ext}"
        else:
            # If missing or cleared earlier, keep as-is (could be empty string)
            pass

        # Update large
        if "large" in parts:
            ext = parts["large"]["ext"]
            entry["imageHigh"] = f"./{args.large_dir}/{new_id}_large.{ext}"
        else:
            pass

    # Write outputs
    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    out_json = os.path.join(root, f"artworks.migrated.{stamp}.json")
    report_csv = os.path.join(root, f"migration_report.{stamp}.csv")
    report_json = os.path.join(root, f"migration_report.{stamp}.json")

    if not args.dry_run:
        with open(out_json, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    report = {
        "timestamp": stamp,
        "root": root,
        "json_input": rel_from_root(root, json_path),
        "json_output": rel_from_root(root, out_json) if not args.dry_run else "(dry-run)",
        "id_scheme": args.id_scheme,
        "delete_orphans": args.delete_orphans,
        "dry_run": args.dry_run,
        "counts": {
            "json_entries": len(json_ids),
            "fs_ids_seen": len(fs_index),
            "orphan_files": len(orphans),
            "missing_path_clears": len(missing_paths_actions),
            "planned_moves": len(rename_records),
            "deleted_files": len(deleted_files),
        },
        "missing_path_clears": [
            {"entry_index": idx, "field": field, "old_value": old}
            for (idx, field, old) in missing_paths_actions
        ],
        "deleted_files": deleted_files,
        "renames": rename_records
    }

    # Write reports (always write, even in dry-run)
    with open(report_json, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    with open(report_csv, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["kind","old_id","new_id","old_rel","new_rel"])
        for r in rename_records:
            w.writerow([r["kind"], r["old_id"], r["new_id"], r["old_rel"], r["new_rel"]])

    print("=== SUMMARY ===")
    print(json.dumps(report["counts"], indent=2, ensure_ascii=False))
    print("\nReports:")
    print(" -", rel_from_root(root, report_json))
    print(" -", rel_from_root(root, report_csv))
    if not args.dry_run:
        print("Migrated JSON:", rel_from_root(root, out_json))
    else:
        print("Migrated JSON: (dry-run, not written)")

if __name__ == "__main__":
    main()
