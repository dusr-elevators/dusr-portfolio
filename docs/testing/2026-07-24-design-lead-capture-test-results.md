# Design Studio Lead Capture, Fullscreen & Sounds — End-to-End Test Results

**Date:** 2026-07-24
**Tester:** Claude Code (automated suites only — no browser, no SMTP account, no mobile devices in this environment)
**Branch:** `feat/design-lead-capture` @ `c657ed9`
**Plan:** `docs/superpowers/plans/2026-07-24-design-studio-lead-capture-fullscreen-sound.md`

**Method note:** This branch was built task-by-task with per-task automated tests (backend `manage.py test`, frontend Vitest) and per-task code review. The automated results below were run by Claude against a **clean checkout** of `HEAD` in a throwaway git worktree (so nothing depends on uncommitted working-tree state — this is the same condition CI runs under). Everything that requires a real browser, a real SMTP mailbox, or a physical mobile device is genuinely outside this environment and is marked **NEEDS-HUMAN** with exact steps, rather than inferred from code or fabricated.

---

## Part A — Automated (executed by Claude, results real)

### A.1 Backend test suite — PASS

Clean-checkout run (`python manage.py test` from `backend/`, Python 3.11, SQLite, `locmem` email backend for the lead tests):

```
Ran 58 tests in 5.567s
OK
```

Covers, among the pre-existing suite:
- `SoundCategoryModelTest` — `kind` defaults to `visual`; `ComponentOption.clean()` rejects a sound option with no audio, a sound option carrying a projection image, and a visual option carrying audio.
- `DesignExportSettingsAPITest` — `GET /api/design/export-settings/` lazily creates the singleton, defaults to `form_email_download`, and reflects an admin change.
- `DesignLeadSubmissionModelTest` — stores the contact details + selection snapshot; newest-first ordering.
- `DesignLeadSubmissionAPITest` (8 cases) — valid submission saves the lead and sends two emails; the customer email carries a valid `%PDF-` attachment named `dusr-elevator-design.pdf`; missing field → 400 with no lead saved; non-PDF bytes → 400; oversize base64 payload → 400; **SMTP failure still persists the lead and returns `email_sent: false`**; a request over the Content-Length cap → 413 before the body is parsed; repeated submissions → 429 (throttled).

### A.2 Frontend test suite — PASS

Clean-checkout run (`npm ci && npm run typecheck && npm test` from `frontend/`):

```
tsc --noEmit    → clean
Test Files  7 passed (7)
     Tests  74 passed (74)
```

Covers: `useDesignPdf` (capture options, A4 sizing both branches, missing-element guards); `LeadCaptureModal` (`validateLead` rules, invalid blocks submit, trimmed submit, Escape/backdrop close, focus trap, Enter-to-submit); `ExportButton` (all three delivery modes, the `email_sent:false` fallback, build-on-open/await-on-submit, build-exactly-once, retry reuses the build, error keeps modal open); `FullscreenPreview` + `ProjectionCanvas` (sound layers never painted, enlarge-button gating, **capture target stays mounted through fullscreen**, close 3 ways); `SoundOptionList` (select≠audition, stop-previous, stop-on-unmount, None deselects, stop-on-category-switch, Arabic render); plus the pre-existing `selectionRules`/`resolveLayerImage` suites.

### A.3 CI gate — VERIFIED PRESENT (not executed here)

`.github/workflows/build.yml` runs `frontend-test` + `backend-test` and `build` needs both; `deploy` needs `build`. So a failing test blocks the production deploy. (Added earlier on this branch's base.) The GitHub Actions run itself will execute on push — **NEEDS-HUMAN** to confirm green in the Actions tab after pushing.

---

## Part B — Manual (NEEDS-HUMAN — browser / email / devices required)

Run these against a dev stack (`backend/` `manage.py runserver` + `frontend/` `npm run dev`, or the docker compose dev stack). Fill in the result column and commit an update to this file.

### B.1 Seed a Sound category — NEEDS-HUMAN
1. Admin → Design → Component Categories → Add: name_en `Sound`, name_ar `الصوت`, **Kind = Sound**, Required off, Layer order `99`.
2. Add two Component Options under it, each with a real `.mp3` upload.
3. Try to save a sound option with NO audio file → **expect** the admin to reject it with "Options in a Sound category need an audio file." (This is `ComponentOption.clean()`; A.1 covers it in unit form, but confirm the admin surfaces it.)

Result: ____

### B.2 Three delivery modes — NEEDS-HUMAN
For each value of Admin → Design → **Design Export Setting → delivery mode**, reload `/design`, pick the required components, click **Download PDF**:

| Mode | Expected | Result |
|---|---|---|
| `free_download` | Downloads immediately, no form, no network call | ____ |
| `form_email_download` | Form appears; on submit the PDF downloads **and** an email arrives | ____ |
| `form_email_only` | Form appears; on submit an email arrives and nothing downloads | ____ |

Confirm the mode can be switched from the admin without a redeploy.

### B.3 Email + lead record — NEEDS-HUMAN
With a real SMTP account configured (`DJANGO_EMAIL_*`), submit in `form_email_download`:
- Recipient inbox receives the email; the attachment opens as a valid PDF showing the chosen components, including the `Sound: <name>` row.
- `support@dusr.sa` (CONTACT_EMAIL) receives the sales copy with the same attachment and the lead's details.
- Admin → Design → Design Leads shows the new lead with the correct `selections_summary`.

Result: ____

### B.4 Email-failure fallback — NEEDS-HUMAN (highest value)
Point SMTP at a dead host, then submit in **`form_email_only`**:
```
DJANGO_EMAIL_HOST=127.0.0.1 DJANGO_EMAIL_PORT=1 python manage.py runserver
```
**Expect:** the PDF downloads anyway, a notice explains the email failed, and the lead is still recorded in the admin. (A.1 proves the backend returns `email_sent:false` and still saves the lead; this confirms the frontend fallback download fires.)

Result: ____

### B.5 Fullscreen + export interaction — NEEDS-HUMAN
On mobile Safari and Android Chrome, at `/design` and `/en/design`:
- Enlarge button appears once a component is selected; fullscreen fills the screen; closes on ✕, Escape (desktop), and backdrop tap.
- After opening and closing fullscreen, **Download PDF still produces a correct PDF** (guards the canvasRef-not-reparented invariant in the real browser; A.2 covers it in jsdom).

Result: ____

### B.6 Sound playback + RTL — NEEDS-HUMAN
- Audition plays; selecting a different sound stops the previous; leaving the tab stops audio.
- Sound rows lay out correctly in RTL (`ar`) and LTR (`en`); play/pause and radio both reachable by keyboard.

Result: ____

### B.7 PDF visual fidelity after the Task 6 refactor — NEEDS-HUMAN
The PDF pipeline was extracted from `ExportButton` into `useDesignPdf` (a refactor verified byte-identical by code review and unit-locked for capture options + A4 math). Confirm a downloaded PDF still looks correct: logo header, cabin image, component table (with the sound row), footer.

Result: ____

---

## Known deferred items (from per-task reviews — for awareness, not blockers)

- Lead endpoint decodes the PDF base64 twice (once to validate, once to send) — minor CPU cost on a ~1–3 MB upload. `selections_summary` is an unbounded TextField.
- `send_design_emails` returns `email_sent:false` if EITHER email fails, including when only the sales copy fails but the customer got theirs — the user then also gets the fallback download. Plan-accepted behaviour.
- `LeadCaptureModal` mobile regex allows an all-spaces-with-2-digits edge case; no arrow-key roving in the sound radiogroup; the consent line is plain text because no `/privacy-policy` route exists yet (upgrade to a link when one is added).
