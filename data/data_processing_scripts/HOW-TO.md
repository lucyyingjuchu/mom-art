# xiaoranart.com — how to run things

Everything below runs from the repo root on your computer (`pip install openpyxl pillow` once).
Push to `main` → Netlify deploys in ~1 minute.

## One-time Netlify settings (Site configuration → Environment variables)

| Variable | Value | Why |
|---|---|---|
| `ADMIN_PASSWORD` | a long password only you and Mom know | admin page asks for it before saving anything |
| `GITHUB_TOKEN` | fine-grained token, **only** the `mom-art` repo, Contents: read & write | used by the admin page to save |
| `FINERWORKS_ORDER_MODE` | `off` → `validate` → `live` | `off`: paid orders are only logged; `validate`: Finerworks checks but doesn't print; `live`: real print orders |
| `STRIPE_SECRET_KEY`, `FINERWORKS_*`, `EMAILJS_*` | unchanged | |

## Adding artworks from Mom's Excel sheet

1. Put the photos in one folder. Name each photo after the artwork title (`清音.jpg`, `清音-1.jpg` is fine), or put the file name in a 圖片 / 檔名 column.
2. Dry run — shows what will be added, changes nothing:
   `python data/data_processing_scripts/excel_import.py 作品清單.xlsx --photos 照片/`
3. If it looks right, add `--write`.
4. English titles/poems: ask Claude, or run `Unified_translator.py` (fills only empty English fields).
5. Filter categories: `python data/data_processing_scripts/artwork_categorizer.py`
6. Commit and push.

Recognised columns (Chinese or English): 標題/作品名稱, 英文標題, 年份, 高, 寬 (or 尺寸 like `135x70`), 形式 (軸/框/鏡片…), 題詩/描述, 可售, 精選, 備註, 價格, 圖片. Anything else is listed as "not used" and ignored.
Titles already on the site are skipped, so re-running is safe.

## Drafts (unfinished works)

A work is hidden from the public site and shown as **📝 草稿** on the admin page when it has no photo, no title, or `"status": "draft"`. Add the photo (admin page or importer) and it appears automatically. Type `草稿` in the admin search box to list them.

## Fine-art prints (Finerworks), when new high-res photos arrive (~5 minutes)

Prints are made from a high-res original stored in S3, never from the website images
(those are ≤1600 px and some are cropped from catalogues). 200 PPI, longest side up to 24",
three sizes (100 / 70 / 50 %), ratio kept exactly - all calculated automatically.

1. Put the high-res photos/scans in one folder, named by title (`清音.jpg`, `清音-高解析.tif`) or by artwork id.
2. Dry run - shows each match and the print sizes it allows, changes nothing:
   `python data/data_processing_scripts/print_prep.py 高解析照片/`
3. `... print_prep.py 高解析照片/ --upload` → uploads to S3 (skips ones already there; `--replace` to redo)
   and rebuilds `data/finerworks_ready_artworks.json`.
4. Commit and push that file. The new print sizes appear in the shop after the deploy.

Needs `pip install boto3` and the AWS login on that computer (`aws configure`). If S3 can't be reached it stops without changing anything.
Works sold from the web image before this rule (older small prints) keep their sizes.

### One-time: make the originals private

Finerworks gets a signed link (valid 7 days) for each order, so the bucket doesn't need to be public:
1. AWS → IAM → create a user `xiaoran-print-reader` with only this permission:
   `s3:GetObject` on `arn:aws:s3:::xiaoran-raw-artworks/raw/*`. Create an access key for it.
2. Netlify → Environment variables: `PRINT_S3_KEY_ID`, `PRINT_S3_SECRET` = that key. Redeploy.
3. AWS → S3 → `xiaoran-raw-artworks` → Permissions: delete the public-read bucket policy and turn
   **Block all public access** on. Opening an original's plain S3 link in a browser should now say AccessDenied.
4. Place one order with `FINERWORKS_ORDER_MODE=validate` to check Finerworks still accepts it.

## Pinterest, every month (~10 minutes)

1. New "in a room" mockups: save as `images/mockups/original/<artwork id>_orig_mock.jpg` (2:3, e.g. 1024×1536), then run `python data/data_processing_scripts/update_artworks_multiview.py`. Push.
2. `python data/data_processing_scripts/pinterest_csv.py` → `pinterest_<date>.csv` with the next 30 pins, one per day.
   Options: `--count 12 --every 2` (12 pins, every other day), `--start 2026-11-01`.
3. Pinterest on a computer → **Create → Bulk create Pins** → upload the CSV.
4. `python data/data_processing_scripts/pinterest_csv.py --mark-posted pinterest_<date>.csv`, then commit `data/pinterest_log.json` so next month continues where this one stopped.

Boards are set at the top of `pinterest_csv.py` (`BOARDS`, `MOCKUP_BOARD`); Pinterest creates any that don't exist yet. Each Pin links straight to that artwork on the site.

## Contact email

- Website "Email" card: `index.html` (search for `mailto:`).
- Inquiry form: the recipient is set in the **EmailJS dashboard** (both templates, `template_14hjrgo` and `template_lur15po` → "To Email").
