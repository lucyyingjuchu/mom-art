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
5. Filter categories: `python data/data_processing_scripts/artwork_categorizer.py` (rows with a 題材 / 地點 column keep exactly those tags; the rest get keyword guesses — check them on the admin page)
6. Commit and push.

Recognised columns (Chinese or English): 標題/作品名稱, 英文標題, 年份, 高, 寬 (or 尺寸 like `135x70`), 形式 (軸/框/鏡片…), 題材 (e.g. `山水、煙雲` — 山水 瀑布 煙雲 明月 花鳥 墨竹 書法 抽象), 地點 (e.g. `玉山`), 題詩/描述, 可售, 精選, 備註, 價格, 圖片. Anything else is listed as "not used" and ignored.
Titles already on the site are skipped, so re-running is safe.

## Filter categories (題材 / 地點)

Hand-picked tags (admin page ✏️ 手動分類, or the Excel 題材 column) replace the automatic keyword guesses: once a work has any hand-picked 題材, the site shows only those. Add a new 題材 in `data/category-config.json` (list + zh/en label).

## Drafts (unfinished works)

A work is hidden from the public site and shown as **📝 草稿** on the admin page when it has no photo, no title, or `"status": "draft"`. Add the photo (admin page or importer) and it appears automatically. Type `草稿` in the admin search box to list them.

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
