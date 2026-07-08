# Mirror Matrix Admin & Radio Selection — End-to-End Test Results

**Date:** 2026-07-08
**Tester:** Claude Code (automated, against real running dev services — no browser available)
**Branch:** `feature/mirror-matrix-admin` @ `506b3779b58282e671209188921bc76b13e7ac47`
**Environment:**
- Backend: Django 5.1, SQLite dev DB, container `dusr-portfolio-backend-1`, `http://localhost:8001`
- Frontend: Next.js dev server, container `dusr-portfolio-frontend-1`, `http://localhost:3001`
- Both containers running with live-mounted code, up ~28h at test time.
- Admin auth: existing superuser `admin` (no temp user was needed/created).

**Method note:** No browser is available in this environment. Every check below was executed either as a real anonymous HTTP request (`curl`) against the live containers, or as an authenticated round-trip using Django's test `Client` with `force_login(admin)` run via `docker compose exec backend python manage.py shell` — which operates against the same dev SQLite database the running server uses. The DB and media directory were verified byte-for-byte restored after the round-trip (see Step 1.3). Purely visual/interactive client-side behavior (radio click interaction, canvas layering, wall-switch reset, PDF export, RTL visual reading order) genuinely cannot be exercised this way and is marked **NEEDS-HUMAN** rather than inferred from code reading.

Real seed data used for the round-trip (already present in the dev DB, not created by this test):
- Category `wall` (id 2): options id 3 ("65"), 4 ("50"), 7, 8, 9 — 5 active wall options.
- Category `Mirror` (id 20, `depends_on_category=2`): one active option, id 11 ("1"), with exactly one pre-existing variant: `(option=11, depends_on_option=3)`.

---

## Step 1: Admin matrix round-trip

### 1.1 Anonymous access is gated — PASS

```
curl -s -I http://localhost:8001/admin/design/optionvariant/
HTTP/1.1 302 Found
Location: /admin/login/?next=/admin/design/optionvariant/
```

### 1.2 Matrix grid shows every active mirror row × wall column — PASS

Authenticated GET (Django test `Client`, `force_login(admin)`) of `/admin/design/optionvariant/` → `200`.
Parsed the returned HTML for `name="image__<row>__<col>"` file inputs:

```
TOTAL image inputs: 5
Pairs: [('11','3'), ('11','4'), ('11','7'), ('11','8'), ('11','9')]
Matrix headers: ['Mirror images per wall']
```

This is exactly 1 active mirror row (option 11) × 5 active wall columns (3,4,7,8,9) = 5 cells, matching the DB. Grid renders correctly.

### 1.3 Create → Replace → Delete round-trip on one cell; API reflects each step; DB/media restored — PASS

Ran a scripted round-trip inside the backend container (`docker compose exec -T backend python manage.py shell < script.py`) using Django's test `Client` with `force_login(admin)` — real ORM/DB, real admin view code, real image-upload validation, not mocked. **All three save branches (create, replace, delete) were exercised** on the same initially-empty cell `(option=11, wall=4)` so pre-existing data stayed untouched. Two genuinely different PNGs were generated with Pillow (`PNG_A` = 1×1 transparent, `PNG_B` = 1×1 red; verified `PNG_A == PNG_B bytes: False`). Success messages were read from Django's messages storage on each POST response (`django.contrib.messages.get_messages`) — i.e. the exact texts the admin banner renders.

1. Confirmed the cell was empty beforehand (`PRE_EXISTS: False`; existing variants for option 11 were only `[3]`).
2. **Create:** `POST /admin/design/optionvariant/` with `image__11__4` = PNG-A → `302`, message **"1 added, 0 replaced, 0 deleted."** DB row created; stored file `design/projections/1b44fedee97748f197381215b519a58f.png`; `GET /api/design/categories/` shows the variant with that same URL.
3. **Replace:** `POST` with `image__11__4` = PNG-B on the now-populated cell → `302`, message **"0 added, 1 replaced, 0 deleted."** Stored file name changed to `design/projections/82d4563b70c14254962358e4ae4adf8b.png` (`NAME_CHANGED_BY_REPLACE: True`); the API URL changed accordingly (`API_URL_CHANGED_BY_REPLACE: True`); the stored bytes read back from storage match PNG-B exactly (`STORED_BYTES_MATCH_PNG_B: True`); and the cell still has exactly one DB row (replace did not duplicate).
4. **Delete:** `POST` with `delete__11__4=on` → `302`, message **"0 added, 0 replaced, 1 deleted."** DB row gone; API no longer lists a variant for `(11,4)`.
5. Confirmed the original `(11,3)` variant was untouched throughout (`ORIGINAL_VARIANT_(11,3)_STILL_THERE: True`; final variant count for option 11 = 1; total `OptionVariant` rows = 1; total users = 1 — no temp user was created, the existing `admin` superuser was reused).
6. Confirmed no orphan files on disk: both test files (`1b44fede….png`, `82d4563b….png`) are absent from `/app/media/design/projections/` after the run — replace deleted PNG-A's file, delete removed PNG-B's file (the admin's `projection_image.delete(save=False)` calls).

Raw output:
```
PNG_A == PNG_B bytes: False
PRE_EXISTS (should be False): False
VARIANTS_BEFORE for option 11: [3]
CREATE_POST: 302 /admin/design/optionvariant/ MESSAGES: ['1 added, 0 replaced, 0 deleted.']
STORED_NAME_AFTER_CREATE: design/projections/1b44fedee97748f197381215b519a58f.png
API_URL_AFTER_CREATE: http://testserver/media/design/projections/1b44fedee97748f197381215b519a58f.png
REPLACE_POST: 302 /admin/design/optionvariant/ MESSAGES: [..., '0 added, 1 replaced, 0 deleted.']
STORED_NAME_AFTER_REPLACE: design/projections/82d4563b70c14254962358e4ae4adf8b.png
NAME_CHANGED_BY_REPLACE: True
API_URL_AFTER_REPLACE: http://testserver/media/design/projections/82d4563b70c14254962358e4ae4adf8b.png
API_URL_CHANGED_BY_REPLACE: True
STORED_BYTES_MATCH_PNG_B: True
STILL_ONE_ROW_FOR_CELL (replace did not duplicate): True
DELETE_POST: 302 /admin/design/optionvariant/ MESSAGES: [..., '0 added, 0 replaced, 1 deleted.']
DELETED_GONE_FROM_DB: True
API_AFTER_DELETE (should be None): None
ORIGINAL_VARIANT_(11,3)_STILL_THERE: True
FINAL_VARIANT_COUNT_FOR_OPTION_11 (should be 1): 1
TOTAL_OPTIONVARIANT_ROWS (should be 1): 1
TOTAL_USERS (should be 1): 1
```

Incidental finding (bonus evidence, observed in an earlier run that used a corrupt PNG payload): the validation branch also works — posting a non-image file produced messages **"1 × 50: not a valid image."** and **"Nothing was saved. Fix the files above and try again."**, and nothing was written to the DB.

**Not verified (requires human visual check):** the *rendered* admin UI — the banner actually appearing on screen and the cell's inline `<img>` preview swapping/disappearing in the browser DOM. The banner message texts and all state transitions are confirmed above; the pixels are not.
→ **Human check (create + delete):** log into `/admin/design/optionvariant/`, upload an image into any empty cell, click "Save all changes", confirm a success banner reading "1 added, 0 replaced, 0 deleted." appears and the new thumbnail shows in that cell; tick its Delete checkbox, save again, confirm the banner reads "0 added, 0 replaced, 1 deleted." and the cell reverts to an empty upload slot.
→ **Human check (visual replace):** pick the ALREADY-POPULATED cell (mirror "1" option=11 × wall "65" option=3) and choose a visibly different image file. Note that an instant client-side preview appears in the cell the moment you pick the file, *before* saving — that is the template's `URL.createObjectURL` nicety, not the saved state. Then click "Save all changes" and confirm the banner reads "0 added, 1 replaced, 0 deleted." and the cell's preview still shows the new image after the page reloads (now served from a new `/media/design/projections/...` URL). Afterwards, re-upload the original image for that cell if you want the demo data restored.

### 1.4 Wall (componentoption) edit page no longer shows a variants inline — PASS

Authenticated GET of `/admin/design/componentoption/3/change/` (option 3 = wall "65") → `200`.
Searched the full response HTML for any inline-formset markers:
- `id="variants-group"` → not present
- Django inline-formset management markers matching `variant.*TOTAL_FORMS` (regex, case-insensitive) → not present
- literal string `optionvariant_set` → not present

No variants-inline markup of any kind is present on the wall option's change page, confirming the inline was removed as intended by commit `cee7772`.

---

## Step 2 & 3: Studio behavior (English / Arabic RTL)

### 2.0 SSR pages load — PASS (with one URL-convention correction)

```
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/en/design   → 200
curl -s http://localhost:3001/en/design | grep -o "Design Studio"        → "Design Studio" found
```

The brief's literal `/ar/design` path returns `404` — this is **expected, pre-existing routing behavior**, not a bug from this branch. `frontend/middleware.ts` keeps Arabic canonical at `/` and internally rewrites `"/x"` → `"/ar/x"`; requesting `/ar/design` directly gets rewritten again to `/ar/ar/design` (visible in the `x-middleware-rewrite: /ar/ar/design` response header), which doesn't exist. The real Arabic URL is the bare path:

```
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/design      → 200 (x-middleware-rewrite: /ar/design)
curl -s http://localhost:3001/design | grep -o "استوديو التصميم"        → "استوديو التصميم" found
curl -s http://localhost:3001/design | grep -o '<html[^>]*>'            → <html lang="ar" dir="rtl" class="dark">
curl -s http://localhost:3001/en/design | grep -o '<html[^>]*>'         → <html lang="en" dir="ltr" class="dark">
```

Both locales serve correct SSR shells with correct `lang`/`dir` attributes.

### 2.1–2.4 (EN) and repeat 1–3 (AR/RTL): radio filtering, canvas painting, wall-switch reset, "None" behavior, RTL order — NEEDS-HUMAN

Confirmed by reading `frontend/app/[lang]/design/page.tsx` and `frontend/components/design/DesignStudio.tsx` that categories are fetched **server-side** (`fetch(..., {cache: 'no-store'})`) and passed as full props, so this is not a client-fetch gap — it's simply that the Mirror tab (a dependent category) is not the default active tab on load (`activeTab` defaults to `categories[0]?.id`, the first non-dependent category), so its radio list only renders after a user clicks the "Mirror" tab client-side. That interaction, along with canvas re-render and PDF export, cannot be triggered or observed via `curl`/shell — there is no browser in this environment.

Verified via code reading (not claimed as an observed PASS) that the real seed data supports exactly the scenario the brief describes:
- Wall "65" (id 3) is the **only** wall with a mirror variant (mirror option 11).
- Walls "50" (id 4), and options 7, 8, 9 have **no** mirror variant.
- `DependentOptionRadioList.tsx` always renders "None" (`بدون` in Arabic) as the first `role="radiogroup"` item, followed by only the options for which `isOptionAvailable()` returns true for the current parent selection.

**Human check — English (`http://localhost:3001/en/design`):**
1. Click the "wall" tab (category id 2, labeled "wall" — NOT the separate "Ceiling" category), select wall option "65". Click the "Mirror" tab → radio list should show exactly two items: "None" (checked by default) and "1".
2. Select "1" → canvas should show the mirror layer painted on top of the wall.
3. Go back to the wall tab, select "50" (or any wall other than "65") → Mirror tab's selection should auto-reset to "None" and its radio list should now show only "None" (no mirror options, since "50" has no variant for mirror "1").
4. With a mirror selected, explicitly click "None" → mirror layer should disappear from canvas immediately.
5. With wall "65" + mirror "1" selected, click Export/PDF → open the generated PDF and confirm the mirror shown matches what was on the canvas.

**Human check — Arabic RTL (`http://localhost:3001/design`, i.e. the bare root path — see note above, NOT `/ar/design`):** repeat checks 1–3 above; additionally confirm the radio list itself reads right-to-left, its first item is labeled "بدون", and mirror/wall option names are shown in Arabic (`name_ar`).

---

## Results summary

| # | Check | Result |
|---|---|---|
| 1.1 | Anonymous admin access redirects to login | PASS |
| 1.2 | Matrix grid shows all active mirror rows × wall columns | PASS |
| 1.3 | Create → replace → delete round-trip (all three branches, incl. banner message texts) → API reflects each step → DB/media restored | PASS |
| 1.3b | Rendered banner / live inline preview swap in browser (incl. visual replace on populated cell) | NEEDS-HUMAN |
| 1.4 | Wall option edit page has no variants inline | PASS |
| 2.0 | Frontend SSR shell loads (EN + AR) with correct `lang`/`dir` | PASS (AR path corrected to `/design`, see note) |
| 2.1–2.4 | Radio filtering, canvas paint, wall-switch reset, explicit "None" (EN) | NEEDS-HUMAN |
| 3 | Same checks + RTL reading order/labels (AR) | NEEDS-HUMAN |
| — | PDF export matches canvas | NEEDS-HUMAN |

**Automated: 5 PASS, 0 FAIL. Remaining: 6 items require a human with a browser.**

## Remaining human checks (copy of instructions above, for convenience)

1. Admin: confirm the rendered success banner and live thumbnail swap/removal in the matrix UI after save (create and delete on an empty cell; visual replace on the already-populated cell option=11 × wall=3, noting the instant pre-save `URL.createObjectURL` preview vs. the post-save `/media/...` image).
2. Studio EN: wall "65" → Mirror tab shows "None" + "1"; other walls → Mirror tab shows only "None"; selecting/deselecting mirror updates canvas; switching away from wall "65" resets mirror selection to "None".
3. Studio AR (`http://localhost:3001/design`, not `/ar/design`): same as above, plus confirm RTL layout and Arabic labels ("بدون" first).
4. PDF export: exported file's mirror image matches the on-screen canvas.
