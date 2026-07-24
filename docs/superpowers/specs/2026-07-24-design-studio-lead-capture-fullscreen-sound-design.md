# Design Studio: Lead-Gated PDF Export, Fullscreen Preview, and Cabin Sounds

## Problem

The Elevator Cabin Designer at `/design` lets a visitor build a cabin and download a branded PDF, but
three gaps limit its commercial value:

1. **No lead capture.** `ExportButton.tsx` generates the PDF in the browser and calls `pdf.save()`
   immediately. A visitor can design a full cabin and leave without the business learning anything
   about them. The business wants name, email, and mobile before handing over the PDF, and wants the
   PDF delivered by email.
2. **The preview is small.** `ProjectionCanvas` is capped at `max-w-[320px]`, which is too small to
   appreciate finish detail on a cabin the user has just spent time configuring.
3. **Design is silent.** Elevator sounds (chimes, arrival tones, voice announcements) are a real part
   of the product that the studio doesn't represent at all.

## Scope

- A contact form gating the PDF export, with the PDF emailed to the user as an attachment.
- An admin-controlled setting choosing between three delivery modes, so the gate can be tightened or
  removed without a deploy.
- A view-only fullscreen preview of the cabin.
- An optional "Sound" component category whose options are audio files the user can audition and
  select.

Out of scope, deliberately:

- Server-side PDF rendering. The browser builds the PDF exactly as it does today and uploads it for
  the backend to attach. Rebuilding it in Python would mean reimplementing `PrintLayout`'s A4 layout
  and the variant-resolution logic with Pillow and a PDF renderer — substantial work producing two
  renderers that drift apart. Uploading costs a size cap and a type check, which the endpoint needs
  regardless.
- Structured querying of leads by selected option, and archiving the generated PDF on the lead
  record — the text snapshot covers the sales use case; both are cheap to add later.
- Gating the existing "Request Quotation" WhatsApp button. It already identifies the user by phone
  number, so a form in front of it adds friction without adding information.

## Backend

All changes live in `backend/design/`.

### Model changes

**`ComponentCategory.kind`** — new choice field, `visual` (default) or `sound`. The migration
backfills every existing row to `visual`. This drives whether a category paints a layer on the
projection canvas or renders a sound picker.

**`ComponentOption.sound_file`** — new `FileField`, `upload_to` a `design/sounds/<uuid>.<ext>` path
matching the existing `design_thumbnail_path` / `design_projection_path` helpers. Blank by default,
extension-validated to `mp3` / `wav` / `ogg`. Only meaningful when the parent category is
`kind='sound'`.

**`ComponentOption.clean()`** — new validation preventing the two shapes from mixing:

- An option in a `sound` category must have a `sound_file` and must not have a `projection_image`.
- An option in a `visual` category must not have a `sound_file`; its existing image rules are
  unchanged.

Without this, the admin will happily save a sound option with no audio, which fails silently and
confusingly in the studio.

**`DesignExportSettings`** — a singleton, following the `DesignCTASettings` pattern exactly
(`db_table = 'design_exportsettings'`, singular `verbose_name_plural`, fetched with
`get_or_create(pk=1)`). One field:

```
delivery_mode = models.CharField(choices=[
    ('form_email_download', 'Form → email + download'),  # default
    ('form_email_only',     'Form → email only'),
    ('free_download',       'Free download, no form'),
])
```

**`DesignLeadSubmission`** — `full_name`, `email`, `mobile`, `selections_summary` (TextField),
`design_url` (URLField), `created_at`. Registered in admin with a list display and search fields
mirroring `ContactSubmissionAdmin` in `backend/home/admin.py`.

`selections_summary` is a rendered text snapshot ("Ceiling: Recessed LED / Walls: Oak / Sound:
Classic chime") rather than a relation. It survives deletion of the underlying options, which a
foreign key would not, and it is what a salesperson actually reads.

### API

Registered in `backend/design/api_urls.py` alongside the existing routes.

**`GET /api/design/export-settings/`** → `{"delivery_mode": "form_email_download"}`. Public, an
`APIView` copying `DesignCTASettingsView`.

**`GET /api/design/categories/`** — existing endpoint, extended with `kind` on each category and
`sound_file` (absolute URL or null) on each option.

**`POST /api/design/lead-submissions/`** — accepts:

```json
{
  "full_name": "...",
  "email": "...",
  "mobile": "...",
  "design_url": "https://dusr.sa/design?c1=4&c2=7",
  "selections_summary": "Ceiling: Recessed LED\nWalls: Oak",
  "pdf_base64": "JVBERi0xLjQK..."
}
```

This is the first endpoint in the codebase that accepts a file payload from anonymous users, so it
is guarded on three fronts:

- **Throttling** — a DRF `AnonRateThrottle` scoped to this view.
- **Size** — the encoded string is rejected above ~5 MB *before* base64 decoding, so a large payload
  can't force a large allocation.
- **Type** — the decoded bytes must begin with the `%PDF-` magic number, so the endpoint can't be
  used to mail arbitrary attachments from `support@dusr.sa`.

### Request flow and failure handling

There is no Celery or task queue in this project, so email is sent synchronously inside the request.
The order of operations matters:

1. Validate the payload (fields, size, magic bytes).
2. **Save the `DesignLeadSubmission` first.**
3. Attempt the user email (PDF attached) and the sales notification to `settings.CONTACT_EMAIL`
   (lead details, selections, PDF attached), wrapped so SMTP failure cannot roll back step 2.
4. Return `201` with `{"email_sent": true|false}`.

The lead is captured even when mail delivery fails, and the response tells the frontend which
happened. A 1–3 MB attachment over Gmail SMTP can take a few seconds; the frontend shows a pending
state throughout.

## Frontend

### Data plumbing

`app/[lang]/design/page.tsx` gains `fetchExportSettings()` beside the existing `fetchCategories()`,
passing `deliveryMode` down through `DesignStudio` to `ExportButton`. On fetch failure it falls back
to `form_email_download` — the gated default, so a backend hiccup can't silently disable lead
capture.

The internal-URL rewriter in `fetchCategories()` must also rewrite `sound_file`, exactly as it
already does for `thumbnail`, `projection_image`, and variant images. Missing this means audio 404s
behind Docker while images work, which is a confusing way to discover the bug.

`types.ts` gains `kind` on `ComponentCategory`, `sound_file` on `ComponentOption`, and a
`DeliveryMode` union.

### Refactor: extract PDF generation

`ExportButton.tsx` already holds PDF generation, the WhatsApp quote, and the gating UI. Adding a
form and three delivery modes on top would make it the file nobody wants to touch.

The four-step html2canvas/jsPDF routine moves into a `useDesignPdf()` hook exposing
`buildPdf(): Promise<Blob>`. `ExportButton` becomes orchestration; `LeadCaptureModal` is
self-contained. This is scoped to the code this feature already touches, not general refactoring.

### Behaviour per delivery mode

| Mode | Clicking "Download PDF" |
|---|---|
| `free_download` | Today's behaviour exactly — no form, no network call. |
| `form_email_download` | Modal → submit → POST → PDF emailed **and** saved locally. |
| `form_email_only` | Modal → submit → POST → emailed only. If the response carries `email_sent: false`, fall back to the local download. |

The fallback matters: in `form_email_only` a failed send would otherwise leave the user with neither
an email nor a file, having just handed over their contact details.

### Generation timing

PDF generation starts **when the modal opens**, not when the user submits; the submit handler awaits
the already-running promise. Capturing at `scale: 2` takes a noticeable moment, and this hides it
behind the seconds the user spends typing. The alternative — generating after submit — makes the user
watch a spinner for work that could already have finished.

### The form

`LeadCaptureModal.tsx`. Name, email, and mobile, all required, validated client-side before the
request:

- **Name** — non-empty after trimming, max 100 characters.
- **Email** — standard format check; the backend's `EmailField` is the real authority.
- **Mobile** — permissive: digits, `+`, and spaces, 8–20 characters. Deliberately *not* restricted to
  Saudi `05XXXXXXXX` / `+9665XXXXXXXX`, since the site is bilingual and may draw Gulf-wide
  enquiries. Easy to tighten later.

The modal follows the existing `dir={lang === 'ar' ? 'rtl' : 'ltr'}` convention and the studio's
`#131313` / `#FF5722` palette. It closes on ✕, Escape, and backdrop click, traps focus while open,
and restores focus to the trigger on close.

It carries a one-line "by submitting you agree to our Privacy Policy" note linking the existing
`pages` app policy. The site is now collecting personal data where previously it collected none.

### Fullscreen preview

New `FullscreenPreview.tsx`. An expand button (Lucide `Maximize2`) sits on the preview corner,
appearing once `Object.keys(selections).length > 0` — before that there is nothing to enlarge. Note
this is gated on *any* selection, not on required ones, so the user can inspect a partial design.

It is a CSS overlay (`fixed inset-0` via a portal), **not** the native Fullscreen API, which iOS
Safari does not honour on arbitrary elements. The cabin keeps its `aspect-[2/3]` ratio, bounded by
`max-h-[90dvh]`. Closes on ✕, Escape, and backdrop click; traps focus, sets `aria-modal="true"`,
restores focus on close, and locks body scroll while open.

**The overlay renders its own copy of the layer stack. It must not move or reparent `canvasRef`'s
node.** `ExportButton` captures that exact element with html2canvas; portalling it into an overlay
would silently corrupt the PDF — capturing at fullscreen dimensions, or nothing at all if the node is
detached mid-capture. Both components call the shared `resolveLayerImage`, so this is a second
render, not duplicated logic.

### Sound picker

New `SoundOptionList.tsx`, rendered instead of `OptionGrid` when `activeCategory.kind === 'sound'`.

Each row carries two distinct controls: a **radio** selecting the sound as part of the design, and a
separate **play/pause button** to audition it without committing. This separation is the point of the
feature — the user experiments freely, then chooses. A built-in "None" entry matches how
`DependentOptionRadioList` already handles optional categories.

A single shared `HTMLAudioElement` ref means starting one sound stops the previous one, and it is
cleaned up on unmount and on tab change so audio never follows the user off the page. All playback is
user-gesture initiated, so browser autoplay policy does not apply.

Because the sound category is optional (`is_required = False`), it stays out of the required-progress
counter automatically.

### Components needing no change

`ProjectionCanvas` gains only an explicit `kind !== 'sound'` filter when mapping layers. Sound options
have no `projection_image`, so `resolveLayerImage` already returns null and nothing paints — but the
intent should be stated rather than left to coincidence.

`PrintLayout` changes not at all. It iterates every category, so the sound selection appears in the
PDF's component summary table as a `Sound: Classic chime` row for free. The WhatsApp quote builder in
`ExportButton` picks it up the same way. A PDF cannot reliably play embedded audio, so the sound is
recorded as text, which is also what a fabricator or salesperson needs.

## Testing

Both sides now have real, automated coverage running in CI.

**Backend — real, automated**, extending `backend/design/tests.py`:

- `GET /api/design/export-settings/` returns the default and reflects an admin change.
- `ComponentOption.clean()` rejects a sound option with no audio, a sound option carrying a
  projection image, and a visual option carrying audio.
- The lead endpoint rejects an oversize payload, a payload whose bytes are not a PDF, and requests
  over the throttle limit.
- A successful post persists the lead and sends two emails (Django's `locmem` backend).
- **With SMTP patched to fail, the lead is still persisted and the response reports
  `email_sent: false`.** This is the highest-value test here: it is the path that loses a customer's
  details if it regresses, and the one least likely to be exercised by hand.

**Frontend — real, automated.** Vitest with React Testing Library and jsdom is wired up (see
"Prerequisite" below), so new behaviour gets executable tests:

- `useDesignPdf()` builds a PDF blob from a given selection set.
- Delivery-mode branching: each of the three modes triggers the right combination of form, POST, and
  local download — including the `form_email_only` fallback when `email_sent` comes back false.
- `LeadCaptureModal` validation: each field rejects empty and malformed input, and submit stays
  disabled until all three are valid.
- `SoundOptionList`: selecting a sound is independent of auditioning it, and starting one sound stops
  the previous one.
- `FullscreenPreview`: opens and closes, and — the regression that would be expensive to find by hand
  — `canvasRef`'s element is still in place after closing, so the PDF export target survives.

### Prerequisite: test infrastructure

This landed before the feature work, as its own commit, so the new components arrive with real
coverage rather than retrofitted coverage.

Previously the frontend had no test runner at all — the files in `components/design/__tests__/` said
so outright and were kept honest only by `npm run typecheck`, and CI built and deployed Docker images
without running any tests on either side. What changed:

- **Vitest + React Testing Library + jsdom**, configured in `vitest.config.ts` with the `@/*` alias
  mirrored from `tsconfig.json`. No `globals`, so tests import `describe`/`it`/`expect` explicitly and
  `npm run typecheck` resolves them without widening tsconfig's `types`.
- **Pure selection logic extracted** from `DesignStudio.tsx` into `components/design/selectionRules.ts`
  (`isOptionAvailable`, `applyDefaultSelections`, `pruneOrphanedDependents`, `applySelection`),
  following the split `resolveLayerImage.ts` already established. This was necessary, not cosmetic:
  the old `DesignStudio.test.tsx` re-declared that logic locally, so it could pass while the component
  was broken. The tests now import the same code the component runs.
- **CI gains `frontend-test` and `backend-test` jobs**, and `build` now `needs` both. Since `deploy`
  already needed `build`, a failing test can no longer reach the production VPS.

### Manual verification

Recorded in `docs/testing/` as the last two features were:

- All three delivery modes, switched from the admin without a redeploy.
- A real email arriving with an attachment that opens as a valid PDF.
- The `form_email_only` fallback, by pointing SMTP at a bad host and confirming the download still
  happens.
- Fullscreen on mobile Safari and Android Chrome, and that exporting the PDF still works correctly
  after opening and closing fullscreen.
- Audio playback and selection in both `ar` and `en`, including RTL layout of the sound rows.
