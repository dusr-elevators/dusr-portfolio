# Design Page CTA Button + Admin Visibility Toggle

## Problem

The `/design` (Elevator Cabin Designer) page exists and is fully functional, but nothing on the main
site links to it — there's no way for a visitor to discover it. We need a prominent, on-brand
entry point on the home page, plus a way for an admin to hide it (e.g. while the designer is being
reworked or content isn't ready) without a code deploy.

## Scope

- A floating call-to-action button on the home page (`Home.tsx`) linking to the design studio.
- A Django admin-editable flag that controls whether the button renders.
- Explicitly out of scope: customizing the button's copy/icon from the admin, showing the button on
  pages other than home, per-language visibility control (it's one flag for both languages).

## Frontend: `DesignCTAButton`

New client component: `frontend/components/DesignCTAButton.tsx`.

- Fixed-position floating pill, rendered as a direct child of `Home.tsx`'s root div (so it overlays
  all sections while scrolling). `Header.tsx` uses `z-50`; the CTA button uses `z-[60]` so it always
  floats above the header.
- Position: bottom-right for `lang === 'en'`, bottom-left for `lang === 'ar'`. This mirrors the
  existing left/right mirroring convention already used for the scroll indicator in `Hero.tsx`
  (`lang === 'ar' ? 'left-6 md:left-16' : 'right-6 md:right-16'`).
- Visual language matches the existing button system already in the codebase (`Hero.tsx`'s primary
  CTA, `BentoServices.tsx`'s pulse dot):
  - Dark `#131313`/`#202020` pill (matching the card backgrounds used throughout `Home.tsx` and
    `BentoServices.tsx`) with an `#FF5722` icon, border glow, and label text — not a solid-orange
    fill, so it reads as a floating chrome element rather than competing with the primary Hero CTA.
  - A Lucide icon (e.g. `Sparkles` or `PenTool`) + label text: "Design Your Elevator" (en) /
    "صمم مصعدك" (ar).
  - A subtle glowing pulse ring behind the button (`animate-ping`-style, consistent with the existing
    pulse dot in `BentoServices.tsx`).
  - Entrance animation via `motion/react`: fade/scale in with a short delay after initial page load
    (consistent with `Hero.tsx`'s staggered `motion.div` delays).
  - Hover: scale up slightly + brighten, consistent with `Hero.tsx`'s primary button
    (`hover:scale-[1.02] active:scale-[0.98]`).
- Links to the design page in the current language: `lang === 'en' ? '/en/design' : '/design'`
  (derived from the existing `pathForLang`/`isLang` conventions in `lib/lang.ts`; no new helper
  needed since `design` is a single fixed segment, not itself language-branching).
- Rendered conditionally based on a `showDesignCTA: boolean` prop passed down from the page. If the
  backend fetch for the flag fails, the page passes `false` (fail closed — never show the button in
  a broken or inconsistent state).

## Backend: visibility flag

New model in the `design` app (`backend/design/models.py`), colocated with the rest of the
design-studio domain rather than the legacy/unused `pages.SiteConfig`:

```python
class DesignCTASettings(models.Model):
    is_visible = models.BooleanField(
        default=True,
        help_text='Show the floating "Design Your Elevator" button on the home page.',
    )

    class Meta:
        db_table = 'design_ctasettings'
        verbose_name = 'Design CTA Button Setting'
        verbose_name_plural = 'Design CTA Button Setting'
```

Singleton enforcement: override `has_add_permission` to return `False` once a row exists, and
`has_delete_permission` to return `False` always, so admins can't create duplicates or delete the
only row. A lazy `get_or_create(pk=1)` (in the API view — see below) guarantees a row exists on
first read, so no data migration is needed.

Admin registration in `backend/design/admin.py`:

```python
@admin.register(DesignCTASettings)
class DesignCTASettingsAdmin(admin.ModelAdmin):
    list_display = ('is_visible',)
    list_editable = ('is_visible',)

    def has_add_permission(self, request):
        return not DesignCTASettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
```

`list_editable` makes this a one-click checkbox toggle directly from the admin changelist — no need
to open a change form, matching the "tool to hide/show" framing from the request.

## API

New read-only endpoint: `GET /api/design/cta-settings/` → `{"is_visible": true}`.

Implementation: a small `APIView` (or function-based view) in `backend/design/api/`, wired in
`backend/design/api_urls.py` alongside the existing `design/categories` router registration. Uses
`DesignCTASettings.objects.get_or_create(pk=1)` so the first request ever made lazily creates the
default (`is_visible=True`) row.

## Data flow

`frontend/app/[lang]/page.tsx` (the home page route) fetches `${apiBase}/api/design/cta-settings/`
server-side, in the same style as `fetchCategories` in `app/[lang]/design/page.tsx` (same
`API_INTERNAL_URL` env var, `cache: 'no-store'`, try/catch defaulting to a safe fallback — `false`
here, `[]` there). The resulting boolean is passed as `showDesignCTA` into `<Home lang={lang}
showDesignCTA={showDesignCTA} />`, which conditionally renders `<DesignCTAButton lang={lang} />`.

## Testing

- Per [[frontend-tests-are-typechecked-docs]]: there is no JS test runner in this repo, so no new
  frontend test files are added; the component just needs to typecheck and be manually verified in
  the browser (button appears/hides based on the flag, links to the right locale path, RTL mirroring
  looks correct).
- Backend: a small Django test in `backend/design/tests.py` (existing file already has API tests for
  `ComponentCategoryViewSet`) verifying: (a) the endpoint lazily creates the singleton and defaults
  to `is_visible=True`, (b) toggling the flag is reflected in the API response.
