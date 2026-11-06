# xiaoranart.com — how to run things

Everything below runs from the repo root on your computer (`pip install openpyxl pillow` once).
Push to `main` → Netlify deploys in ~1 minute.

## One-time Netlify settings (Site configuration → Environment variables)

| Variable | Value | Why |
|---|---|---|
| `ADMIN_PASSWORD` | a long password only you and Mom know | admin page asks for it before saving anything |
| `GITHUB_TOKEN` | fine-grained token, **only** the `mom-art` repo, Contents: read & write | used by the admin page to save |
| `FINERWORKS_ORDER_MODE` | `live` | **Must be `live` or paid orders are not printed.** `off` (also when missing): only logged; `validate`: Finerworks checks but doesn't print |
| `STRIPE_WEBHOOK_SECRET` | signing secret of the Stripe webhook | sends the print order even if the buyer closes the page |
| `EMAILJS_PRIVATE_KEY`, `EMAILJS_ALERT_TEMPLATE_ID` | from EmailJS | emails the studio about every paid print order and any failure |
| `STRIPE_SECRET_KEY`, `FINERWORKS_*`, `EMAILJS_*` | unchanged | |

To check the order settings, open `/.netlify/functions/print-file-check`: it should show `"order_mode":"live"`, `"webhook_set":true`, `"alerts_set":true`.

## Adding artwork Reels to the 短影音 tab

`python3 scripts/add-reels.py "<folder of Reels>"` (ffmpeg needed), then push. Files are named `MMDD_reel_作品名.mp4`; each Reel appears in Exhibitions & News › 短影音 (`xiaoranart.com/reels`) at 19:00 Taiwan time on its date. If a cover shows dated text such as a countdown, pick another frame with `--only 作品名 --at 0.7`.

Each artwork's short link is `xiaoranart.com/w/` plus the last 5 characters of its id (6 or more if an older artwork already ends the same way; see `js/short-code.js`). The share button copies the same link.

## If a paid print order failed

The alert email names the order, and the status is on the Stripe payment's metadata as `finerworks_status`. Look in Finerworks first: the order may have arrived anyway. If it did not, delete that metadata on the Stripe payment, then use Resend on the event in Stripe > Developers > Webhooks.

## Adding artworks from Mom's Excel sheet

1. Put the photos in one folder. Name each photo after the artwork title (`清音.jpg`, `清音-1.jpg` is fine), or put the file name in a 圖片 / 檔名 column.
2. Dry run — shows what will be added, changes nothing:
   `python data/data_processing_scripts/excel_import.py 作品清單.xlsx --photos 照片/`
3. If it looks right, add `--write`.
4. English titles/poems: ask Claude, or run `Unified_translator.py` (fills only empty English fields).
5. Commit and push.

Recognised columns (Chinese or English): 標題/作品名稱, 英文標題, 年份, 高, 寬 (or 尺寸 like `135x70`), 形式 (軸/框/鏡片…), 系列 (series name, e.g. `明月` — keeps a series together in the gallery), 題材 (e.g. `瀑布` or `抽象、明月` — 山水 瀑布 煙雲 花鳥 明月 抽象 書法; 墨竹 counts as 花鳥), 題詩/描述, 可售, 精選, 備註, 價格, 圖片. Anything else is listed as "not used" and ignored.
Titles already on the site are skipped, so re-running is safe.

## Print files (high-res scans → AWS S3 → Finerworks)

Print-on-demand uses the full-resolution file at `s3://xiaoran-raw-artworks/raw/<artwork id>.jpg`.
For the 2026 catalogue scans, `scan_mapping_2026.csv` says which scan is which artwork;
`upload_scans_to_s3.py` uploads them (double-click `上傳掃描檔到AWS.bat` in the Mom's website folder,
or `python data/data_processing_scripts/upload_scans_to_s3.py "<scans folder>"`). Re-running skips files already there.
Each work's `printFile` in `artworks.json` records the scan file and its pixel size.

## Gallery tabs (題材)

Each 題材 is one tab on the gallery: 山水, 瀑布, 煙雲, 花鳥, 明月, 抽象, 書法. A work's tabs are its `subjects` list in `artworks.json`, ticked on the admin page or filled from the Excel 題材 column; nothing is guessed. A work may be under several tabs (e.g. 抽象 + 明月), but a waterfall or a sea of clouds goes under 瀑布 / 煙雲 instead of 山水, so 山水 stays for the other landscapes. 書法 is for works that are mainly writing, not paintings with a poem. Tab names (zh/en) are in `data/category-config.json`.

## Drafts (unfinished works)

A work is hidden from the public site and shown as **📝 草稿** on the admin page when it has no photo, no title, or `"status": "draft"`. Add the photo (admin page or importer) and it appears automatically. Type `草稿` in the admin search box to list them.

## Pinterest, every month (~10 minutes)

1. `python data/data_processing_scripts/pinterest_csv.py --count 42 --per-day 3` → `pinterest_<date>.csv` with the next 42 pins, 3 a day (two weeks).
   Options: `--count 12 --every 2` (12 pins, every other day), `--start 2026-11-01`,
   `--with-mockups` (also pin "in a room" mockups from `images/mockups/original/`).
   Pins use only real photos of the artworks (`SKIP_YEARS` can hold back a year whose photos aren't ready).
2. Pinterest on a computer → **Create → Bulk create Pins** → upload the CSV.
3. `python data/data_processing_scripts/pinterest_csv.py --mark-posted pinterest_<date>.csv`, then commit `data/pinterest_log.json` so next month continues where this one stopped.

Boards are set at the top of `pinterest_csv.py` (`BOARDS`, `MOCKUP_BOARD`); Pinterest creates any that don't exist yet. Each Pin links straight to that artwork on the site.

## Contact email

- Website "Email" card: `index.html` (search for `mailto:`).
- Inquiry form: the recipient is set in the **EmailJS dashboard** (both templates, `template_14hjrgo` and `template_lur15po` → "To Email").
