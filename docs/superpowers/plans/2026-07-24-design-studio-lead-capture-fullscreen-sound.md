# Design Studio: Lead-Gated PDF Export, Fullscreen Preview, and Cabin Sounds — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the design studio's PDF export behind a contact form that emails the PDF to the user, add a fullscreen cabin preview, and add an optional Sound component category the user can audition and select.

**Architecture:** The browser keeps building the PDF exactly as it does today (html2canvas + jsPDF) and uploads it base64-encoded to a new Django endpoint, which saves the lead, emails the user with the PDF attached, and notifies sales. A `DesignExportSettings` singleton chooses between three delivery modes so the gate can change without a deploy. Sound reuses the existing `ComponentCategory`/`ComponentOption` tables via a new `kind` discriminator, so it inherits the tab, selection, and PDF-summary machinery for free.

**Tech Stack:** Django 5.1.3 + DRF 3.15.2 (SQLite, no task queue), Next.js 15 App Router + React 19 + TypeScript, Tailwind v4, Vitest + React Testing Library, html2canvas + jsPDF.

## Global Constraints

- **Python 3.11**, Django 5.1.3, DRF 3.15.2. Add no new backend dependencies — everything here uses the stdlib plus what's in `backend/requirements.txt`.
- **No task queue exists.** Email sends synchronously inside the request. Never let a mail failure lose a lead.
- **Bilingual, always.** Every user-facing string ships Arabic and English, selected by `lang === 'ar'`. Every interactive container sets `dir={lang === 'ar' ? 'rtl' : 'ltr'}`.
- **Palette:** background `#131313`, surface `#2a2a2a`, accent `#FF5722`, accent-hover `#e64a19`, body text `#e5e2e1`, muted text `#888`/`#9a9a9a`.
- **Design app tables use explicit `db_table` names** (`design_ctasettings`, `design_componentoption`, …). New models follow: `design_exportsettings`, `design_leadsubmission`.
- **All model verbose names use `gettext_lazy as _`**, matching `backend/design/models.py`.
- **Frontend tests import the real implementation.** Never re-declare production logic inside a test file — that was the bug fixed in commit `2dcb16c`.
- **PDF filename is `dusr-elevator-design.pdf`** everywhere (browser download and email attachment).
- **Run backend tests with `python manage.py test`** from `backend/`; frontend with `npm test` from `frontend/`.

---

## File Structure

**Backend — `backend/design/`**

| File | Responsibility |
|---|---|
| `models.py` (modify) | Add `ComponentCategory.kind`, `ComponentOption.sound_file`, `ComponentOption.clean()`, `DesignExportSettings`, `DesignLeadSubmission`. |
| `migrations/0008_*.py` (create) | Schema for the above. |
| `admin.py` (modify) | `DesignExportSettingsAdmin` (singleton), `DesignLeadSubmissionAdmin` (read-mostly list). |
| `api/serializers.py` (modify) | Expose `kind`/`sound_file`; add `DesignExportSettingsSerializer`, `DesignLeadSubmissionSerializer`. |
| `api/views.py` (modify) | `DesignExportSettingsView`, `DesignLeadSubmissionView`. |
| `api/emails.py` (create) | `send_design_emails()` — builds and sends both messages. Isolated so the view stays about HTTP and the mail body is testable on its own. |
| `api_urls.py` (modify) | Register the two new routes. |
| `tests.py` (modify) | Extend with the new coverage. |

**Frontend — `frontend/components/design/`**

| File | Responsibility |
|---|---|
| `types.ts` (modify) | `kind`, `sound_file`, `DeliveryMode`, `LeadDetails`. |
| `useDesignPdf.ts` (create) | The html2canvas + jsPDF routine, extracted from `ExportButton`. One job: selections in, PDF blob out. |
| `LeadCaptureModal.tsx` (create) | The contact form, its validation, and its submit state. |
| `ExportButton.tsx` (modify) | Orchestration only: delivery-mode branching, wiring modal → PDF → POST. |
| `FullscreenPreview.tsx` (create) | The overlay. Renders its own layer stack; never touches `canvasRef`. |
| `SoundOptionList.tsx` (create) | Sound rows: select vs. audition, shared audio element. |
| `DesignStudio.tsx` (modify) | Route sound categories to `SoundOptionList`; pass `deliveryMode` through. |
| `ProjectionCanvas.tsx` (modify) | Skip `kind === 'sound'` layers; host the fullscreen trigger. |
| `app/[lang]/design/page.tsx` (modify) | Fetch export settings; rewrite `sound_file` URLs. |

---

## Task 1: Sound-capable categories and options

**Files:**
- Modify: `backend/design/models.py`
- Create: `backend/design/migrations/0008_sound_categories.py` (generated)
- Modify: `backend/design/api/serializers.py:11-17` (`ComponentOptionSerializer`), `:20-26` (`ComponentCategorySerializer`)
- Test: `backend/design/tests.py`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `ComponentCategory.kind` (`'visual'`/`'sound'`, default `'visual'`), `ComponentCategory.KIND_VISUAL`/`KIND_SOUND` constants, `ComponentOption.sound_file` (`FileField`, blank), `ComponentOption.clean()`. API now returns `kind` on each category and `sound_file` on each option.

- [ ] **Step 1: Write the failing tests**

Append to `backend/design/tests.py`:

```python
from django.core.exceptions import ValidationError


class SoundCategoryModelTest(TestCase):
    def setUp(self):
        self.walls = ComponentCategory.objects.create(
            name_en="Walls", name_ar="Walls", layer_order=1,
        )
        self.sounds = ComponentCategory.objects.create(
            name_en="Sound", name_ar="الصوت", layer_order=99,
            kind=ComponentCategory.KIND_SOUND,
        )

    def test_categories_default_to_visual(self):
        self.assertEqual(self.walls.kind, ComponentCategory.KIND_VISUAL)

    def test_sound_option_with_audio_is_valid(self):
        option = ComponentOption(
            category=self.sounds, name_en="Chime", name_ar="جرس",
            sound_file=SimpleUploadedFile("chime.mp3", b"ID3", content_type="audio/mpeg"),
        )
        option.full_clean(exclude=['thumbnail', 'projection_image'])

    def test_sound_option_without_audio_is_rejected(self):
        option = ComponentOption(category=self.sounds, name_en="Chime", name_ar="جرس")
        with self.assertRaises(ValidationError) as ctx:
            option.clean()
        self.assertIn('sound_file', ctx.exception.error_dict)

    def test_sound_option_with_projection_image_is_rejected(self):
        option = ComponentOption(
            category=self.sounds, name_en="Chime", name_ar="جرس",
            sound_file=SimpleUploadedFile("chime.mp3", b"ID3", content_type="audio/mpeg"),
            projection_image=SimpleUploadedFile("x.png", b"img", content_type="image/png"),
        )
        with self.assertRaises(ValidationError) as ctx:
            option.clean()
        self.assertIn('projection_image', ctx.exception.error_dict)

    def test_visual_option_with_sound_file_is_rejected(self):
        option = ComponentOption(
            category=self.walls, name_en="Oak", name_ar="بلوط",
            sound_file=SimpleUploadedFile("chime.mp3", b"ID3", content_type="audio/mpeg"),
        )
        with self.assertRaises(ValidationError) as ctx:
            option.clean()
        self.assertIn('sound_file', ctx.exception.error_dict)


class SoundSerializerTest(TestCase):
    def test_category_exposes_kind_and_option_exposes_sound_file(self):
        sounds = ComponentCategory.objects.create(
            name_en="Sound", name_ar="الصوت", layer_order=99,
            kind=ComponentCategory.KIND_SOUND,
        )
        ComponentOption.objects.create(
            category=sounds, name_en="Chime", name_ar="جرس",
            sound_file=SimpleUploadedFile("chime.mp3", b"ID3", content_type="audio/mpeg"),
        )
        data = ComponentCategorySerializer(sounds).data
        self.assertEqual(data['kind'], 'sound')
        self.assertTrue(data['options'][0]['sound_file'].endswith('.mp3'))
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && python manage.py test design.tests.SoundCategoryModelTest design.tests.SoundSerializerTest -v 2`
Expected: FAIL — `AttributeError: type object 'ComponentCategory' has no attribute 'KIND_SOUND'`.

- [ ] **Step 3: Add the model fields and validation**

In `backend/design/models.py`, add the upload-path helper beside the existing two (after `design_projection_path`):

```python
def design_sound_path(instance, filename):
    ext = filename.split('.')[-1]
    return os.path.join('design', 'sounds', f"{uuid4().hex}.{ext}")
```

Add to the imports at the top:

```python
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
```

In `ComponentCategory`, add the constants and field (place `kind` directly after `name_en`):

```python
    KIND_VISUAL = 'visual'
    KIND_SOUND = 'sound'
    KIND_CHOICES = [
        (KIND_VISUAL, _('Visual — paints a layer on the cabin preview')),
        (KIND_SOUND, _('Sound — the user auditions and picks an audio file')),
    ]

    kind = models.CharField(
        _('Kind'),
        max_length=10,
        choices=KIND_CHOICES,
        default=KIND_VISUAL,
        help_text=_(
            'Visual categories paint an image layer. Sound categories hold audio '
            'files instead and render a player in the studio.'
        ),
    )
```

In `ComponentOption`, add the field after `projection_image`:

```python
    sound_file = models.FileField(
        _('Sound file'),
        upload_to=design_sound_path,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['mp3', 'wav', 'ogg'])],
        help_text=_('Audio clip for options in a Sound category. Leave empty for visual categories.'),
    )
```

And add `clean()` to `ComponentOption`, directly above `__str__`:

```python
    def clean(self):
        super().clean()
        if not self.category_id:
            return

        errors = {}
        if self.category.kind == ComponentCategory.KIND_SOUND:
            if not self.sound_file:
                errors['sound_file'] = _('Options in a Sound category need an audio file.')
            if self.projection_image:
                errors['projection_image'] = _('Sound options do not paint a layer; leave this empty.')
        elif self.sound_file:
            errors['sound_file'] = _('Only options in a Sound category can carry an audio file.')

        if errors:
            raise ValidationError(errors)
```

- [ ] **Step 4: Generate and apply the migration**

Run: `cd backend && python manage.py makemigrations design --name sound_categories && python manage.py migrate`
Expected: creates `0008_sound_categories.py` adding two fields. Because `kind` has a default, existing rows backfill to `visual` with no prompt.

- [ ] **Step 5: Expose the fields through the API**

In `backend/design/api/serializers.py`, add `sound_file` to `ComponentOptionSerializer.Meta.fields`:

```python
        fields = ['id', 'name_ar', 'name_en', 'thumbnail', 'projection_image',
                  'sound_file', 'is_default_selected', 'sort_order', 'variants']
```

And `kind` to `ComponentCategorySerializer.Meta.fields`:

```python
        fields = ['id', 'name_ar', 'name_en', 'kind', 'layer_order', 'is_required', 'icon',
                  'depends_on_category', 'options']
```

- [ ] **Step 6: Show the sound file in the admin inline**

In `backend/design/admin.py`, add `sound_file` to `ComponentOptionInline.fields`, after `projection_image`:

```python
    fields = ('name_en', 'name_ar', 'thumbnail', 'thumbnail_preview', 'projection_image', 'sound_file', 'is_default_selected', 'sort_order', 'is_active')
```

And add `kind` to `ComponentCategoryAdmin.list_display` so the discriminator is visible at a glance. Find the `@admin.register(ComponentCategory)` class and add `'kind'` to its existing `list_display` tuple.

- [ ] **Step 7: Run the full backend suite**

Run: `cd backend && python manage.py test`
Expected: PASS — 36 pre-existing tests plus 6 new ones = 42, `OK`.

- [ ] **Step 8: Commit**

```bash
git add backend/design/models.py backend/design/migrations/0008_sound_categories.py backend/design/api/serializers.py backend/design/admin.py backend/design/tests.py
git commit -m "Add sound-capable component categories

ComponentCategory.kind discriminates visual from sound categories, and
ComponentOption.sound_file holds the audio. clean() stops the admin saving
a silent sound option or a visual option carrying audio, which would fail
confusingly in the studio rather than at save time."
```

---

## Task 2: Export delivery-mode setting

**Files:**
- Modify: `backend/design/models.py`, `backend/design/admin.py`, `backend/design/api/serializers.py`, `backend/design/api/views.py`, `backend/design/api_urls.py`
- Create: `backend/design/migrations/0009_designexportsettings.py` (generated)
- Test: `backend/design/tests.py`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `DesignExportSettings` with `MODE_FORM_EMAIL_DOWNLOAD` / `MODE_FORM_EMAIL_ONLY` / `MODE_FREE_DOWNLOAD` constants and a `delivery_mode` field. `GET /api/design/export-settings/` → `{"delivery_mode": "<mode>"}`.

- [ ] **Step 1: Write the failing tests**

Append to `backend/design/tests.py`:

```python
from .models import DesignExportSettings


class DesignExportSettingsAPITest(TestCase):
    def test_get_lazily_creates_and_defaults_to_gated_download(self):
        self.assertEqual(DesignExportSettings.objects.count(), 0)
        response = self.client.get('/api/design/export-settings/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'delivery_mode': 'form_email_download'})
        self.assertEqual(DesignExportSettings.objects.count(), 1)

    def test_get_reflects_admin_change(self):
        DesignExportSettings.objects.create(
            pk=1, delivery_mode=DesignExportSettings.MODE_FREE_DOWNLOAD,
        )
        response = self.client.get('/api/design/export-settings/')
        self.assertEqual(response.json(), {'delivery_mode': 'free_download'})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && python manage.py test design.tests.DesignExportSettingsAPITest -v 2`
Expected: FAIL — `ImportError: cannot import name 'DesignExportSettings'`.

- [ ] **Step 3: Add the model**

Append to `backend/design/models.py`, after `DesignCTASettings`:

```python
class DesignExportSettings(models.Model):
    MODE_FORM_EMAIL_DOWNLOAD = 'form_email_download'
    MODE_FORM_EMAIL_ONLY = 'form_email_only'
    MODE_FREE_DOWNLOAD = 'free_download'
    MODE_CHOICES = [
        (MODE_FORM_EMAIL_DOWNLOAD, _('Contact form → email the PDF and download it')),
        (MODE_FORM_EMAIL_ONLY, _('Contact form → email the PDF only')),
        (MODE_FREE_DOWNLOAD, _('Free download, no contact form')),
    ]

    delivery_mode = models.CharField(
        _('PDF delivery mode'),
        max_length=32,
        choices=MODE_CHOICES,
        default=MODE_FORM_EMAIL_DOWNLOAD,
        help_text=_('Controls whether visitors must submit their contact details to get the PDF.'),
    )

    class Meta:
        db_table = 'design_exportsettings'
        verbose_name = _('Design Export Setting')
        verbose_name_plural = _('Design Export Setting')

    def __str__(self):
        return 'Design Export Setting'
```

- [ ] **Step 4: Register it in the admin**

In `backend/design/admin.py`, import `DesignExportSettings` alongside the existing model imports, then append (mirroring `DesignCTASettingsAdmin`):

```python
@admin.register(DesignExportSettings)
class DesignExportSettingsAdmin(admin.ModelAdmin):
    list_display = ('delivery_mode',)
    list_editable = ('delivery_mode',)
    list_display_links = None

    def get_queryset(self, request):
        DesignExportSettings.objects.get_or_create(pk=1)
        return super().get_queryset(request)

    def has_add_permission(self, request):
        return not DesignExportSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
```

- [ ] **Step 5: Add the serializer and view**

In `backend/design/api/serializers.py`, add `DesignExportSettings` to the model imports, then append:

```python
class DesignExportSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DesignExportSettings
        fields = ['delivery_mode']
```

In `backend/design/api/views.py`, add to the imports and append:

```python
from ..models import DesignCTASettings, DesignExportSettings
from .serializers import DesignCTASettingsSerializer, DesignExportSettingsSerializer


class DesignExportSettingsView(APIView):
    def get(self, request):
        settings_obj, _created = DesignExportSettings.objects.get_or_create(pk=1)
        serializer = DesignExportSettingsSerializer(settings_obj)
        return Response(serializer.data)
```

In `backend/design/api_urls.py`, import `DesignExportSettingsView` and add the route:

```python
    path('design/export-settings/', DesignExportSettingsView.as_view(), name='design-export-settings'),
```

- [ ] **Step 6: Migrate and run the tests**

Run: `cd backend && python manage.py makemigrations design --name designexportsettings && python manage.py migrate && python manage.py test design.tests.DesignExportSettingsAPITest -v 2`
Expected: PASS — 2 tests, `OK`.

- [ ] **Step 7: Commit**

```bash
git add backend/design/models.py backend/design/migrations/0009_designexportsettings.py backend/design/admin.py backend/design/api/serializers.py backend/design/api/views.py backend/design/api_urls.py backend/design/tests.py
git commit -m "Add admin-controlled PDF delivery mode

A singleton following the DesignCTASettings pattern, so marketing can
tighten or drop the contact-form gate without a deploy."
```

---

## Task 3: Lead submission model and admin

**Files:**
- Modify: `backend/design/models.py`, `backend/design/admin.py`
- Create: `backend/design/migrations/0010_designleadsubmission.py` (generated)
- Test: `backend/design/tests.py`

**Interfaces:**
- Consumes: nothing.
- Produces: `DesignLeadSubmission` with fields `full_name`, `email`, `mobile`, `selections_summary`, `design_url`, `created_at`.

- [ ] **Step 1: Write the failing test**

Append to `backend/design/tests.py`:

```python
from .models import DesignLeadSubmission


class DesignLeadSubmissionModelTest(TestCase):
    def test_stores_contact_details_and_selection_snapshot(self):
        lead = DesignLeadSubmission.objects.create(
            full_name="Sara Ahmed",
            email="sara@example.com",
            mobile="+966501234567",
            selections_summary="Walls: Oak\nSound: Classic chime",
            design_url="https://dusr.sa/design?c1=4",
        )
        self.assertIsNotNone(lead.created_at)
        self.assertIn("Sara Ahmed", str(lead))

    def test_newest_lead_is_listed_first(self):
        old = DesignLeadSubmission.objects.create(
            full_name="Old", email="o@example.com", mobile="1", selections_summary="",
        )
        new = DesignLeadSubmission.objects.create(
            full_name="New", email="n@example.com", mobile="2", selections_summary="",
        )
        self.assertEqual(list(DesignLeadSubmission.objects.all()), [new, old])
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && python manage.py test design.tests.DesignLeadSubmissionModelTest -v 2`
Expected: FAIL — `ImportError: cannot import name 'DesignLeadSubmission'`.

- [ ] **Step 3: Add the model**

Append to `backend/design/models.py`:

```python
class DesignLeadSubmission(models.Model):
    full_name = models.CharField(_('Full name'), max_length=100)
    email = models.EmailField(_('Email'))
    mobile = models.CharField(_('Mobile'), max_length=20)
    selections_summary = models.TextField(
        _('Chosen components'),
        blank=True,
        help_text=_('Snapshot of the cabin the visitor designed, kept as text so it '
                    'survives later edits to the component catalogue.'),
    )
    design_url = models.URLField(_('Design link'), max_length=500, blank=True)
    created_at = models.DateTimeField(_('Submitted at'), auto_now_add=True)

    class Meta:
        db_table = 'design_leadsubmission'
        ordering = ['-created_at']
        verbose_name = _('Design Lead')
        verbose_name_plural = _('Design Leads')

    def __str__(self):
        return f"{self.full_name} — {self.email}"
```

- [ ] **Step 4: Register it in the admin**

In `backend/design/admin.py`, import `DesignLeadSubmission` and append:

```python
@admin.register(DesignLeadSubmission)
class DesignLeadSubmissionAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'email', 'mobile', 'created_at')
    search_fields = ('full_name', 'email', 'mobile')
    readonly_fields = ('full_name', 'email', 'mobile', 'selections_summary', 'design_url', 'created_at')
    ordering = ('-created_at',)

    def has_add_permission(self, request):
        return False
```

Leads arrive from the public endpoint, never by hand — `has_add_permission` returning `False` keeps the admin honest about that, and `readonly_fields` stops a stray edit rewriting what a customer actually chose.

- [ ] **Step 5: Migrate and run the tests**

Run: `cd backend && python manage.py makemigrations design --name designleadsubmission && python manage.py migrate && python manage.py test design.tests.DesignLeadSubmissionModelTest -v 2`
Expected: PASS — 2 tests, `OK`.

- [ ] **Step 6: Commit**

```bash
git add backend/design/models.py backend/design/migrations/0010_designleadsubmission.py backend/design/admin.py backend/design/tests.py
git commit -m "Add DesignLeadSubmission model and read-only admin

Selections are stored as a text snapshot rather than a relation so the
record still says what the customer chose after the catalogue changes."
```

---

## Task 4: Lead submission endpoint with PDF email

**Files:**
- Create: `backend/design/api/emails.py`
- Modify: `backend/design/api/serializers.py`, `backend/design/api/views.py`, `backend/design/api_urls.py`, `backend/goldenMeatPortfolio/settings/base.py:186-204`
- Test: `backend/design/tests.py`

**Interfaces:**
- Consumes: `DesignLeadSubmission` (Task 3).
- Produces: `POST /api/design/lead-submissions/` accepting `{full_name, email, mobile, design_url, selections_summary, pdf_base64}` → `201 {"email_sent": bool}`. Also `send_design_emails(lead, pdf_bytes) -> bool` in `api/emails.py`.

- [ ] **Step 1: Write the failing tests**

Append to `backend/design/tests.py`:

```python
import base64
from unittest.mock import patch

from django.core import mail
from django.core.cache import cache
from django.test import override_settings

VALID_PDF = b"%PDF-1.4\n%fake pdf body\n"


def lead_payload(**overrides):
    payload = {
        'full_name': 'Sara Ahmed',
        'email': 'sara@example.com',
        'mobile': '+966501234567',
        'design_url': 'https://dusr.sa/design?c1=4',
        'selections_summary': 'Walls: Oak\nSound: Classic chime',
        'pdf_base64': base64.b64encode(VALID_PDF).decode(),
    }
    payload.update(overrides)
    return payload


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class DesignLeadSubmissionAPITest(TestCase):
    url = '/api/design/lead-submissions/'

    def setUp(self):
        cache.clear()
        mail.outbox = []

    def test_valid_submission_saves_lead_and_sends_two_emails(self):
        response = self.client.post(self.url, lead_payload(), content_type='application/json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json(), {'email_sent': True})

        lead = DesignLeadSubmission.objects.get()
        self.assertEqual(lead.full_name, 'Sara Ahmed')
        self.assertEqual(lead.selections_summary, 'Walls: Oak\nSound: Classic chime')

        self.assertEqual(len(mail.outbox), 2)
        recipients = {m.to[0] for m in mail.outbox}
        self.assertIn('sara@example.com', recipients)

    def test_customer_email_carries_the_pdf_attachment(self):
        self.client.post(self.url, lead_payload(), content_type='application/json')
        customer = next(m for m in mail.outbox if m.to == ['sara@example.com'])

        self.assertEqual(len(customer.attachments), 1)
        name, content, mimetype = customer.attachments[0]
        self.assertEqual(name, 'dusr-elevator-design.pdf')
        self.assertEqual(mimetype, 'application/pdf')
        self.assertTrue(content.startswith(b'%PDF-'))

    def test_missing_required_field_is_rejected(self):
        response = self.client.post(
            self.url, lead_payload(full_name=''), content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(DesignLeadSubmission.objects.count(), 0)

    def test_payload_that_is_not_a_pdf_is_rejected(self):
        not_a_pdf = base64.b64encode(b"GIF89a totally not a pdf").decode()
        response = self.client.post(
            self.url, lead_payload(pdf_base64=not_a_pdf), content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('pdf_base64', response.json())
        self.assertEqual(DesignLeadSubmission.objects.count(), 0)

    def test_oversize_payload_is_rejected(self):
        response = self.client.post(
            self.url, lead_payload(pdf_base64='A' * 7_000_001), content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(DesignLeadSubmission.objects.count(), 0)

    def test_lead_survives_smtp_failure_and_response_says_so(self):
        with patch('design.api.emails.EmailMessage.send', side_effect=OSError('smtp down')):
            response = self.client.post(self.url, lead_payload(), content_type='application/json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json(), {'email_sent': False})
        self.assertEqual(DesignLeadSubmission.objects.count(), 1)

    def test_repeated_submissions_are_throttled(self):
        for _ in range(10):
            self.client.post(self.url, lead_payload(), content_type='application/json')
        response = self.client.post(self.url, lead_payload(), content_type='application/json')
        self.assertEqual(response.status_code, 429)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && python manage.py test design.tests.DesignLeadSubmissionAPITest -v 2`
Expected: FAIL — all 7 error with `404` because the route doesn't exist yet.

- [ ] **Step 3: Add the throttle rate to settings**

In `backend/goldenMeatPortfolio/settings/base.py`, add to the `REST_FRAMEWORK` dict (after `DEFAULT_PARSER_CLASSES`):

```python
    # Throttling is opt-in per view, not global: the read endpoints are hit on
    # every page load and must not be rate-limited.
    'DEFAULT_THROTTLE_RATES': {
        'design_lead': '10/hour',
    },
```

- [ ] **Step 4: Write the email module**

Create `backend/design/api/emails.py`:

```python
"""Outbound mail for design lead submissions.

Kept apart from the view so the message bodies can be tested directly and the
view stays about HTTP concerns.
"""

import logging

from django.conf import settings
from django.core.mail import EmailMessage

logger = logging.getLogger(__name__)

PDF_FILENAME = 'dusr-elevator-design.pdf'


def _customer_message(lead, pdf_bytes):
    body = (
        f"Hello {lead.full_name},\n\n"
        "Thank you for designing your elevator cabin with Dusr. Your design is "
        "attached as a PDF.\n\n"
        f"Your chosen components:\n{lead.selections_summary}\n\n"
    )
    if lead.design_url:
        body += f"You can reopen or change your design here:\n{lead.design_url}\n\n"
    body += "Our team will be in touch shortly.\n\nDusr Elevators\ndusr.sa"

    message = EmailMessage(
        subject='Your Dusr elevator cabin design',
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[lead.email],
    )
    message.attach(PDF_FILENAME, pdf_bytes, 'application/pdf')
    return message


def _sales_message(lead, pdf_bytes):
    body = (
        "A new elevator cabin design was submitted.\n\n"
        f"Name:   {lead.full_name}\n"
        f"Email:  {lead.email}\n"
        f"Mobile: {lead.mobile}\n"
        f"Link:   {lead.design_url or '—'}\n\n"
        f"Chosen components:\n{lead.selections_summary}\n"
    )
    message = EmailMessage(
        subject=f'New elevator design lead — {lead.full_name}',
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[settings.CONTACT_EMAIL],
        reply_to=[lead.email],
    )
    message.attach(PDF_FILENAME, pdf_bytes, 'application/pdf')
    return message


def send_design_emails(lead, pdf_bytes):
    """Email the PDF to the customer and notify sales.

    Returns True only if both messages were sent. Never raises: the lead is
    already saved by the time this runs, and losing it because an SMTP server
    is down would be worse than a missing email.
    """
    try:
        _customer_message(lead, pdf_bytes).send()
        _sales_message(lead, pdf_bytes).send()
        return True
    except Exception:
        logger.exception('Failed to send design lead emails for lead %s', lead.pk)
        return False
```

- [ ] **Step 5: Write the serializer**

Append to `backend/design/api/serializers.py` (add `DesignLeadSubmission` to the model imports and `import base64` at the top):

```python
# 5 MB of PDF; base64 inflates by ~4/3, so cap the encoded string a little above that.
MAX_PDF_BYTES = 5 * 1024 * 1024
MAX_PDF_B64_CHARS = 7_000_000


class DesignLeadSubmissionSerializer(serializers.ModelSerializer):
    pdf_base64 = serializers.CharField(write_only=True)

    class Meta:
        model = DesignLeadSubmission
        fields = ['full_name', 'email', 'mobile', 'selections_summary', 'design_url', 'pdf_base64']

    def validate_pdf_base64(self, value):
        # Check the encoded length first so an oversize payload never gets decoded.
        if len(value) > MAX_PDF_B64_CHARS:
            raise serializers.ValidationError('The design file is too large.')

        try:
            decoded = base64.b64decode(value, validate=True)
        except (ValueError, TypeError):
            raise serializers.ValidationError('The design file could not be decoded.')

        if len(decoded) > MAX_PDF_BYTES:
            raise serializers.ValidationError('The design file is too large.')
        # Without this the endpoint would mail arbitrary attachments from our domain.
        if not decoded.startswith(b'%PDF-'):
            raise serializers.ValidationError('The uploaded file is not a PDF.')

        return value
```

- [ ] **Step 6: Write the view**

Append to `backend/design/api/views.py` (extend the imports):

```python
import base64

from rest_framework import status
from rest_framework.throttling import ScopedRateThrottle

from ..models import DesignLeadSubmission
from .emails import send_design_emails
from .serializers import DesignLeadSubmissionSerializer


class DesignLeadSubmissionView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'design_lead'

    def post(self, request):
        serializer = DesignLeadSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pdf_bytes = base64.b64decode(serializer.validated_data.pop('pdf_base64'))

        # Save before sending: a mail failure must never cost us the lead.
        lead = DesignLeadSubmission.objects.create(**serializer.validated_data)
        email_sent = send_design_emails(lead, pdf_bytes)

        return Response({'email_sent': email_sent}, status=status.HTTP_201_CREATED)
```

In `backend/design/api_urls.py`, import `DesignLeadSubmissionView` and add:

```python
    path('design/lead-submissions/', DesignLeadSubmissionView.as_view(), name='design-lead-submissions'),
```

- [ ] **Step 7: Run the tests**

Run: `cd backend && python manage.py test design.tests.DesignLeadSubmissionAPITest -v 2`
Expected: PASS — 7 tests, `OK`.

- [ ] **Step 8: Run the whole backend suite**

Run: `cd backend && python manage.py test`
Expected: PASS — `OK`, no regressions.

- [ ] **Step 9: Commit**

```bash
git add backend/design/api/emails.py backend/design/api/serializers.py backend/design/api/views.py backend/design/api_urls.py backend/design/tests.py backend/goldenMeatPortfolio/settings/base.py
git commit -m "Add design lead endpoint that emails the PDF

Saves the lead before attempting delivery and reports email_sent, so an
SMTP outage costs an email rather than a customer. Guards the first public
upload path in this codebase with a size cap, a %PDF- magic-byte check,
and a scoped throttle."
```

---

## Task 5: Frontend types for the new API fields

**Files:**
- Modify: `frontend/components/design/types.ts`, `frontend/app/[lang]/design/page.tsx`
- Test: none — this task only declares types and rewrites one URL field; Tasks 8 and 10 cover the behaviour that uses them.

**Interfaces:**
- Consumes: the API shapes from Tasks 1 and 2.
- Produces: `CategoryKind`, `DeliveryMode`, and `LeadDetails` types; `ComponentCategory.kind`; `ComponentOption.sound_file`, with sound URLs rewritten for the browser.

The `deliveryMode` prop is deliberately **not** threaded here. Threading it through `page.tsx` → `DesignStudio` → `ExportButton` before anything consumes it would leave a chain of unused props across two commits. Task 8 introduces the whole chain in the commit that uses it.

- [ ] **Step 1: Extend the types**

In `frontend/components/design/types.ts`:

```typescript
export type CategoryKind = 'visual' | 'sound';

export type DeliveryMode = 'form_email_download' | 'form_email_only' | 'free_download';

export interface LeadDetails {
  full_name: string;
  email: string;
  mobile: string;
}
```

Add `sound_file: string | null;` to `ComponentOption` (after `projection_image`) and `kind: CategoryKind;` to `ComponentCategory` (after `name_en`).

- [ ] **Step 2: Rewrite sound URLs for the browser**

In `frontend/app/[lang]/design/page.tsx`, add `sound_file` to the option rewrite inside `fetchCategories`, alongside `thumbnail` and `projection_image`:

```typescript
        sound_file: fixUrlNullable(opt.sound_file),
```

Without this, audio 404s behind Docker while images work — a confusing way to find the bug.

- [ ] **Step 3: Verify typecheck and tests**

Run: `cd frontend && npm run typecheck && npm test`
Expected: typecheck clean; 21 existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/design/types.ts frontend/app/[lang]/design/page.tsx
git commit -m "Add frontend types for sound categories and delivery mode

Sound URLs go through the same internal-URL rewrite as images."
```

---

## Task 6: Extract the PDF builder

**Files:**
- Create: `frontend/components/design/useDesignPdf.ts`
- Modify: `frontend/components/design/ExportButton.tsx:25-68`
- Test: `frontend/components/design/__tests__/useDesignPdf.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `useDesignPdf({ canvasRef, printRef, setProjectionSrc })` returning `{ buildPdf: () => Promise<Blob> }`.

This is a pure refactor: behaviour before and after must be identical.

- [ ] **Step 1: Write the failing test**

Create `frontend/components/design/__tests__/useDesignPdf.test.ts`:

```typescript
/**
 * buildPdf captures the projection canvas, injects it into the hidden print
 * layout, captures that, and returns an A4 PDF blob. html2canvas and jsPDF are
 * mocked because jsdom has no real layout or canvas.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const html2canvasMock = vi.fn();
const addImageMock = vi.fn();
const outputMock = vi.fn(() => new Blob(['%PDF-'], { type: 'application/pdf' }));

vi.mock('html2canvas', () => ({
  default: (...args: unknown[]) => html2canvasMock(...args),
}));

vi.mock('jspdf', () => ({
  jsPDF: class {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    addImage = addImageMock;
    output = outputMock;
  },
}));

import { buildDesignPdf } from '../useDesignPdf';

function fakeCanvas(width: number, height: number) {
  return { width, height, toDataURL: () => 'data:image/png;base64,AAA' };
}

describe('buildDesignPdf', () => {
  beforeEach(() => {
    html2canvasMock.mockReset().mockResolvedValue(fakeCanvas(800, 1200));
    addImageMock.mockReset();
    outputMock.mockClear();
  });

  it('captures the projection canvas and then the print layout', async () => {
    const canvasEl = document.createElement('div');
    const printEl = document.createElement('div');
    const setProjectionSrc = vi.fn();

    await buildDesignPdf({
      canvasEl,
      getPrintEl: () => printEl,
      setProjectionSrc,
      settleMs: 0,
    });

    expect(html2canvasMock).toHaveBeenCalledTimes(2);
    expect(html2canvasMock.mock.calls[0][0]).toBe(canvasEl);
    expect(html2canvasMock.mock.calls[1][0]).toBe(printEl);
    expect(setProjectionSrc).toHaveBeenCalledWith('data:image/png;base64,AAA');
  });

  it('returns a PDF blob', async () => {
    const result = await buildDesignPdf({
      canvasEl: document.createElement('div'),
      getPrintEl: () => document.createElement('div'),
      setProjectionSrc: vi.fn(),
      settleMs: 0,
    });

    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('application/pdf');
  });

  it('throws when the projection canvas is missing', async () => {
    await expect(
      buildDesignPdf({
        canvasEl: null,
        getPrintEl: () => document.createElement('div'),
        setProjectionSrc: vi.fn(),
        settleMs: 0,
      }),
    ).rejects.toThrow('projection canvas');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- useDesignPdf`
Expected: FAIL — cannot resolve `../useDesignPdf`.

- [ ] **Step 3: Write the module**

Create `frontend/components/design/useDesignPdf.ts`:

```typescript
/**
 * Builds the branded A4 PDF from the on-screen projection canvas and the hidden
 * print layout. Extracted from ExportButton so the capture pipeline can be
 * tested and so ExportButton is only about orchestration.
 */

export interface BuildDesignPdfArgs {
  /** The live projection canvas element (ExportButton's canvasRef.current). */
  canvasEl: HTMLElement | null;
  /** Read lazily: the print layout only renders once projectionSrc is set. */
  getPrintEl: () => HTMLElement | null;
  setProjectionSrc: (src: string) => void;
  /** Time allowed for the print layout to re-render with the injected image. */
  settleMs?: number;
}

export async function buildDesignPdf({
  canvasEl,
  getPrintEl,
  setProjectionSrc,
  settleMs = 200,
}: BuildDesignPdfArgs): Promise<Blob> {
  if (!canvasEl) throw new Error('Cannot export: the projection canvas is not mounted.');

  const [html2canvas, { jsPDF }] = await Promise.all([
    import('html2canvas').then(m => m.default),
    import('jspdf'),
  ]);

  // Step 1: capture the projection canvas → base64
  const projCanvas = await html2canvas(canvasEl, {
    useCORS: true,
    backgroundColor: '#ffffff',
    scale: 2,
  });
  setProjectionSrc(projCanvas.toDataURL('image/png'));

  // Step 2: let the print layout re-render with the injected image
  await new Promise(r => setTimeout(r, settleMs));

  // Step 3: capture the full print layout
  const printEl = getPrintEl();
  if (!printEl) throw new Error('Cannot export: the print layout is not mounted.');
  const printCanvas = await html2canvas(printEl, {
    useCORS: true,
    backgroundColor: '#ffffff',
    scale: 2,
  });

  // Step 4: insert into an A4 PDF
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = printCanvas.height / printCanvas.width;
  const imgH = Math.min(pageW * ratio, pageH);
  pdf.addImage(printCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, imgH);

  return pdf.output('blob');
}

/** Triggers a browser download of an already-built PDF blob. */
export function downloadPdfBlob(blob: Blob, filename = 'dusr-elevator-design.pdf') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run the test**

Run: `cd frontend && npm test -- useDesignPdf`
Expected: PASS — 3 tests.

- [ ] **Step 5: Rewrite ExportButton's handleExport to use it**

In `frontend/components/design/ExportButton.tsx`, replace the whole `handleExport` body (currently lines 25-68) with:

```tsx
  const handleExport = async () => {
    if (!isReady) return;
    setLoading(true);
    try {
      const blob = await buildDesignPdf({
        canvasEl: canvasRef.current,
        getPrintEl: () => printRef.current,
        setProjectionSrc,
      });
      downloadPdfBlob(blob);
    } finally {
      setLoading(false);
      setProjectionSrc('');
    }
  };
```

And add the import:

```typescript
import { buildDesignPdf, downloadPdfBlob } from './useDesignPdf';
```

- [ ] **Step 6: Verify nothing regressed**

Run: `cd frontend && npm run typecheck && npm test`
Expected: typecheck clean; 24 tests pass.

- [ ] **Step 7: Manually confirm the PDF is unchanged**

Run: `cd frontend && npm run dev`, open `http://localhost:3000/design`, pick the required components, click **Download PDF**.
Expected: a PDF downloads named `dusr-elevator-design.pdf`, visually identical to before this task — logo header, cabin image, component table, footer.

This is a refactor, so a byte-for-byte identical *look* is the acceptance criterion. If the layout shifted, the extraction changed behaviour and must be corrected before moving on.

- [ ] **Step 8: Commit**

```bash
git add frontend/components/design/useDesignPdf.ts frontend/components/design/__tests__/useDesignPdf.test.ts frontend/components/design/ExportButton.tsx
git commit -m "Extract the PDF capture pipeline out of ExportButton

Pure refactor. ExportButton is about to grow a form and three delivery
modes; the capture pipeline should not grow with it."
```

---

## Task 7: Lead capture modal

**Files:**
- Create: `frontend/components/design/LeadCaptureModal.tsx`
- Test: `frontend/components/design/__tests__/LeadCaptureModal.test.tsx`

**Interfaces:**
- Consumes: `LeadDetails`, `Lang`.
- Produces: `<LeadCaptureModal open onClose onSubmit lang submitting error />` where `onSubmit: (details: LeadDetails) => void`. Also exports `validateLead(details, lang): Partial<Record<keyof LeadDetails, string>>`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/components/design/__tests__/LeadCaptureModal.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LeadCaptureModal, { validateLead } from '../LeadCaptureModal';

const validDetails = {
  full_name: 'Sara Ahmed',
  email: 'sara@example.com',
  mobile: '+966501234567',
};

describe('validateLead', () => {
  it('accepts well-formed details', () => {
    expect(validateLead(validDetails, 'en')).toEqual({});
  });

  it('rejects a blank name', () => {
    expect(validateLead({ ...validDetails, full_name: '   ' }, 'en')).toHaveProperty('full_name');
  });

  it('rejects a malformed email', () => {
    expect(validateLead({ ...validDetails, email: 'sara@' }, 'en')).toHaveProperty('email');
  });

  it('rejects a mobile that is too short', () => {
    expect(validateLead({ ...validDetails, mobile: '12345' }, 'en')).toHaveProperty('mobile');
  });

  it('accepts an international mobile with spaces', () => {
    expect(validateLead({ ...validDetails, mobile: '+971 50 123 4567' }, 'en')).toEqual({});
  });

  it('rejects a mobile containing letters', () => {
    expect(validateLead({ ...validDetails, mobile: '+9665O1234567' }, 'en')).toHaveProperty('mobile');
  });

  it('returns Arabic messages when lang is ar', () => {
    const errors = validateLead({ ...validDetails, full_name: '' }, 'ar');
    expect(errors.full_name).toMatch(/[؀-ۿ]/);
  });
});

describe('LeadCaptureModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <LeadCaptureModal open={false} onClose={vi.fn()} onSubmit={vi.fn()} lang="en" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('does not submit invalid details, and shows the errors', () => {
    const onSubmit = vi.fn();
    render(<LeadCaptureModal open onClose={vi.fn()} onSubmit={onSubmit} lang="en" />);

    fireEvent.click(screen.getByRole('button', { name: /send|إرسال/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('submits the trimmed details when valid', () => {
    const onSubmit = vi.fn();
    render(<LeadCaptureModal open onClose={vi.fn()} onSubmit={onSubmit} lang="en" />);

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: '  Sara Ahmed  ' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'sara@example.com' } });
    fireEvent.change(screen.getByLabelText(/mobile/i), { target: { value: '+966501234567' } });
    fireEvent.click(screen.getByRole('button', { name: /send|إرسال/i }));

    expect(onSubmit).toHaveBeenCalledWith(validDetails);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<LeadCaptureModal open onClose={onClose} onSubmit={vi.fn()} lang="en" />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('shows a server error when one is given', () => {
    render(
      <LeadCaptureModal
        open onClose={vi.fn()} onSubmit={vi.fn()} lang="en" error="Something went wrong"
      />,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- LeadCaptureModal`
Expected: FAIL — cannot resolve `../LeadCaptureModal`.

- [ ] **Step 3: Write the component**

Create `frontend/components/design/LeadCaptureModal.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { LeadDetails } from './types';
import type { Lang } from '@/lib/lang';

type FieldErrors = Partial<Record<keyof LeadDetails, string>>;

// Permissive on purpose: the site is bilingual and draws Gulf-wide enquiries, so
// this is not restricted to Saudi 05XXXXXXXX / +9665XXXXXXXX.
const MOBILE_PATTERN = /^\+?[\d\s]{8,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLead(details: LeadDetails, lang: Lang): FieldErrors {
  const isAr = lang === 'ar';
  const errors: FieldErrors = {};

  const name = details.full_name.trim();
  if (!name) errors.full_name = isAr ? 'الاسم مطلوب' : 'Please enter your name';
  else if (name.length > 100) errors.full_name = isAr ? 'الاسم طويل جداً' : 'That name is too long';

  const email = details.email.trim();
  if (!email) errors.email = isAr ? 'البريد الإلكتروني مطلوب' : 'Please enter your email';
  else if (!EMAIL_PATTERN.test(email)) {
    errors.email = isAr ? 'صيغة البريد الإلكتروني غير صحيحة' : 'That email address looks incorrect';
  }

  const mobile = details.mobile.trim();
  if (!mobile) errors.mobile = isAr ? 'رقم الجوال مطلوب' : 'Please enter your mobile number';
  else if (!MOBILE_PATTERN.test(mobile)) {
    errors.mobile = isAr ? 'رقم الجوال غير صحيح' : 'That mobile number looks incorrect';
  }

  return errors;
}

interface LeadCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (details: LeadDetails) => void;
  lang: Lang;
  submitting?: boolean;
  error?: string;
}

export default function LeadCaptureModal({
  open, onClose, onSubmit, lang, submitting = false, error,
}: LeadCaptureModalProps) {
  const isAr = lang === 'ar';
  const [details, setDetails] = useState<LeadDetails>({ full_name: '', email: '', mobile: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const previouslyFocused = document.activeElement as HTMLElement | null;
    firstFieldRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = () => {
    const trimmed: LeadDetails = {
      full_name: details.full_name.trim(),
      email: details.email.trim(),
      mobile: details.mobile.trim(),
    };
    const found = validateLead(trimmed, lang);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(trimmed);
  };

  const field = (
    key: keyof LeadDetails,
    label: string,
    type: string,
    autoComplete: string,
    ref?: React.RefObject<HTMLInputElement | null>,
  ) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`lead-${key}`} className="text-xs text-[#9a9a9a]">
        {label}
      </label>
      <input
        id={`lead-${key}`}
        ref={ref}
        type={type}
        autoComplete={autoComplete}
        dir={key === 'mobile' || key === 'email' ? 'ltr' : undefined}
        value={details[key]}
        onChange={e => setDetails({ ...details, [key]: e.target.value })}
        aria-invalid={!!errors[key]}
        className={`rounded-xl border-2 bg-[#1a1a1a] px-4 py-3 text-sm text-[#e5e2e1] outline-none transition-colors ${
          errors[key] ? 'border-red-500' : 'border-[#2a2a2a] focus:border-[#FF5722]'
        }`}
      />
      {errors[key] && (
        <p role="alert" className="text-xs text-red-400">{errors[key]}</p>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isAr ? 'استلام التصميم بالبريد' : 'Receive your design by email'}
        dir={isAr ? 'rtl' : 'ltr'}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#131313] p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={isAr ? 'إغلاق' : 'Close'}
          className={`absolute top-4 text-[#888] hover:text-[#e5e2e1] ${isAr ? 'left-4' : 'right-4'}`}
        >
          <X size={18} />
        </button>

        <h2 className="text-lg font-semibold text-[#e5e2e1]">
          {isAr ? 'استلم تصميمك بالبريد' : 'Get your design by email'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#9a9a9a]">
          {isAr
            ? 'أدخل بياناتك وسنرسل لك تصميم المصعد بصيغة PDF.'
            : 'Enter your details and we will email you the elevator design as a PDF.'}
        </p>

        <div className="mt-5 flex flex-col gap-4">
          {field('full_name', isAr ? 'الاسم' : 'Full name', 'text', 'name', firstFieldRef)}
          {field('email', isAr ? 'البريد الإلكتروني' : 'Email', 'email', 'email')}
          {field('mobile', isAr ? 'رقم الجوال' : 'Mobile number', 'tel', 'tel')}
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all ${
            submitting
              ? 'cursor-not-allowed bg-[#2a2a2a] text-[#666]'
              : 'bg-[#FF5722] text-white shadow-lg shadow-[#FF5722]/25 hover:bg-[#e64a19]'
          }`}
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {isAr ? 'إرسال' : 'Send my design'}
        </button>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-[#666]">
          {isAr ? 'بإرسالك البيانات فإنك توافق على ' : 'By submitting you agree to our '}
          <a href={isAr ? '/privacy-policy' : '/en/privacy-policy'} className="underline hover:text-[#888]">
            {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `cd frontend && npm test -- LeadCaptureModal`
Expected: PASS — 12 tests.

- [ ] **Step 5: Confirm the privacy policy route exists**

Run: `cd frontend && grep -rn "privacy" app/ --include=*.tsx -i | head`
Expected: a route matching `/privacy-policy`. If the actual path differs, correct the `href` above to match — a broken link in a consent notice is worse than no link.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/design/LeadCaptureModal.tsx frontend/components/design/__tests__/LeadCaptureModal.test.tsx
git commit -m "Add lead capture modal for the design export

Mobile validation is deliberately permissive rather than Saudi-only, since
the site is bilingual and draws Gulf-wide enquiries."
```

---

## Task 8: Delivery-mode branching in ExportButton

**Files:**
- Modify: `frontend/components/design/ExportButton.tsx`
- Test: `frontend/components/design/__tests__/ExportButton.test.tsx`

**Interfaces:**
- Consumes: `buildDesignPdf`, `downloadPdfBlob` (Task 6); `LeadCaptureModal` (Task 7); the `DeliveryMode` type (Task 5).
- Produces: `blobToBase64(blob): Promise<string>` added to `useDesignPdf.ts`; `buildSelectionsSummary(categories, selections, lang): string` exported from `ExportButton.tsx` and reused by the WhatsApp quote; the `deliveryMode` prop chain `page.tsx` → `DesignStudio` → `ExportButton`.

This task introduces the whole `deliveryMode` chain at once, because every hop of it is consumed here.

- [ ] **Step 1: Write the failing tests**

Create `frontend/components/design/__tests__/ExportButton.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentCategory, ComponentOption } from '../types';

const buildDesignPdfMock = vi.fn();
const downloadPdfBlobMock = vi.fn();

vi.mock('../useDesignPdf', () => ({
  buildDesignPdf: (...args: unknown[]) => buildDesignPdfMock(...args),
  downloadPdfBlob: (...args: unknown[]) => downloadPdfBlobMock(...args),
  blobToBase64: async () => 'JVBERi0=',
}));

import ExportButton, { buildSelectionsSummary } from '../ExportButton';

const oak: ComponentOption = {
  id: 10, name_ar: 'بلوط', name_en: 'Oak',
  thumbnail: null, projection_image: '/oak.png', sound_file: null,
  is_default_selected: false, sort_order: 1,
};

const walls: ComponentCategory = {
  id: 1, name_ar: 'الجدران', name_en: 'Walls', kind: 'visual', layer_order: 1,
  is_required: true, icon: 'PanelTop', depends_on_category: null, options: [oak],
};

function renderButton(deliveryMode: 'form_email_download' | 'form_email_only' | 'free_download') {
  const canvasRef = { current: document.createElement('div') };
  return render(
    <ExportButton
      canvasRef={canvasRef}
      categories={[walls]}
      selections={{ 1: oak }}
      lang="en"
      deliveryMode={deliveryMode}
    />,
  );
}

function fillAndSubmitForm() {
  fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Sara' } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'sara@example.com' } });
  fireEvent.change(screen.getByLabelText(/mobile/i), { target: { value: '+966501234567' } });
  fireEvent.click(screen.getByRole('button', { name: /send my design/i }));
}

describe('buildSelectionsSummary', () => {
  it('lists each selected category and option', () => {
    expect(buildSelectionsSummary([walls], { 1: oak }, 'en')).toBe('Walls: Oak');
  });

  it('skips categories with nothing selected', () => {
    expect(buildSelectionsSummary([walls], {}, 'en')).toBe('');
  });
});

describe('ExportButton delivery modes', () => {
  beforeEach(() => {
    buildDesignPdfMock.mockReset().mockResolvedValue(new Blob(['%PDF-']));
    downloadPdfBlobMock.mockReset();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ email_sent: true }),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('free_download downloads immediately without a form', async () => {
    renderButton('free_download');
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() => expect(downloadPdfBlobMock).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('form_email_download posts the lead and also downloads', async () => {
    renderButton('form_email_download');
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fillAndSubmitForm();

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/design/lead-submissions/');
    expect(JSON.parse(init.body as string)).toMatchObject({
      full_name: 'Sara',
      email: 'sara@example.com',
      mobile: '+966501234567',
      pdf_base64: 'JVBERi0=',
    });
    await waitFor(() => expect(downloadPdfBlobMock).toHaveBeenCalled());
  });

  it('form_email_only posts but does not download', async () => {
    renderButton('form_email_only');
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));
    fillAndSubmitForm();

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(downloadPdfBlobMock).not.toHaveBeenCalled();
  });

  it('form_email_only falls back to downloading when the email fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ email_sent: false }),
    })));

    renderButton('form_email_only');
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));
    fillAndSubmitForm();

    // Without this fallback the user gets neither an email nor a file, having
    // just handed over their contact details.
    await waitFor(() => expect(downloadPdfBlobMock).toHaveBeenCalled());
  });

  it('starts building the PDF as soon as the modal opens', async () => {
    renderButton('form_email_download');
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));

    // The capture is slow; it runs while the user types rather than after submit.
    await waitFor(() => expect(buildDesignPdfMock).toHaveBeenCalled());
    expect(fetch).not.toHaveBeenCalled();
  });

  it('surfaces a server error and keeps the modal open', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 429,
      json: async () => ({ detail: 'Too many requests' }),
    })));

    renderButton('form_email_download');
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));
    fillAndSubmitForm();

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/could not send|too many/i)).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- ExportButton`
Expected: FAIL — `buildSelectionsSummary` is not exported.

- [ ] **Step 3: Add the base64 helper**

Append to `frontend/components/design/useDesignPdf.ts`:

```typescript
/** Bare base64 for the JSON payload — no `data:...;base64,` prefix. */
export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
```

- [ ] **Step 4: Thread deliveryMode from the page**

In `frontend/app/[lang]/design/page.tsx`, add `DeliveryMode` to the type import and add this function after `fetchCategories`:

```typescript
async function fetchDeliveryMode(): Promise<DeliveryMode> {
  const url = `${apiBase}/api/design/export-settings/`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.error(`Failed to fetch export settings from ${url}: ${res.status} ${res.statusText}`);
      return 'form_email_download';
    }
    const data = await res.json();
    return data.delivery_mode as DeliveryMode;
  } catch (error) {
    console.error(`Failed to fetch export settings from ${url}:`, error);
    // Fail closed: a backend hiccup must not silently switch lead capture off.
    return 'form_email_download';
  }
}
```

Update the page body:

```typescript
  const [categories, deliveryMode] = await Promise.all([
    fetchCategories(),
    fetchDeliveryMode(),
  ]);

  return (
    <Suspense>
      <DesignStudio categories={categories} lang={lang as Lang} deliveryMode={deliveryMode} />
    </Suspense>
  );
```

In `frontend/components/design/DesignStudio.tsx`, add `DeliveryMode` to the type import, add `deliveryMode: DeliveryMode;` to `DesignStudioProps`, destructure it in the component signature, and pass it to `ExportButton`:

```tsx
            <ExportButton
              canvasRef={canvasRef}
              categories={categories}
              selections={selections}
              lang={lang}
              deliveryMode={deliveryMode}
            />
```

- [ ] **Step 5: Rewrite ExportButton**

Replace `frontend/components/design/ExportButton.tsx` with:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2, MessageCircle } from 'lucide-react';
import type { ComponentCategory, DeliveryMode, LeadDetails, Selections } from './types';
import type { Lang } from '@/lib/lang';
import PrintLayout from './PrintLayout';
import LeadCaptureModal from './LeadCaptureModal';
import { blobToBase64, buildDesignPdf, downloadPdfBlob } from './useDesignPdf';

/** One "Category: Option" line per selected category, in category order. */
export function buildSelectionsSummary(
  categories: ComponentCategory[],
  selections: Selections,
  lang: Lang,
): string {
  return categories
    .map(cat => {
      const sel = selections[cat.id];
      if (!sel) return null;
      const catName = lang === 'ar' ? cat.name_ar : cat.name_en;
      const optName = lang === 'ar' ? sel.name_ar : sel.name_en;
      return `${catName}: ${optName}`;
    })
    .filter(Boolean)
    .join('\n');
}

interface ExportButtonProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  categories: ComponentCategory[];
  selections: Selections;
  lang: Lang;
  deliveryMode: DeliveryMode;
}

export default function ExportButton({
  canvasRef, categories, selections, lang, deliveryMode,
}: ExportButtonProps) {
  const isAr = lang === 'ar';
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [projectionSrc, setProjectionSrc] = useState('');
  const printRef = useRef<HTMLDivElement>(null);
  // The capture is kicked off when the modal opens and awaited on submit.
  const pdfPromiseRef = useRef<Promise<Blob> | null>(null);

  const requiredCategories = categories.filter(c => c.is_required);
  const missingRequired = requiredCategories.filter(c => !selections[c.id]);
  const isReady = missingRequired.length === 0 && Object.keys(selections).length > 0;

  const startBuildingPdf = useCallback(() => {
    pdfPromiseRef.current = buildDesignPdf({
      canvasEl: canvasRef.current,
      getPrintEl: () => printRef.current,
      setProjectionSrc,
    });
    return pdfPromiseRef.current;
  }, [canvasRef]);

  useEffect(() => {
    if (!modalOpen) return;
    // Build while the user types, so submitting does not then wait on capture.
    startBuildingPdf().catch(() => {
      /* surfaced on submit */
    });
  }, [modalOpen, startBuildingPdf]);

  const handleExportClick = async () => {
    if (!isReady) return;

    if (deliveryMode !== 'free_download') {
      setServerError(undefined);
      setNotice(undefined);
      setModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      const blob = await startBuildingPdf();
      downloadPdfBlob(blob);
    } finally {
      setLoading(false);
      setProjectionSrc('');
      pdfPromiseRef.current = null;
    }
  };

  const handleLeadSubmit = async (details: LeadDetails) => {
    setSubmitting(true);
    setServerError(undefined);

    try {
      const blob = await (pdfPromiseRef.current ?? startBuildingPdf());

      const response = await fetch('/api/design/lead-submissions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...details,
          design_url: window.location.href,
          selections_summary: buildSelectionsSummary(categories, selections, lang),
          pdf_base64: await blobToBase64(blob),
        }),
      });

      if (!response.ok) {
        setServerError(
          response.status === 429
            ? isAr ? 'محاولات كثيرة. يرجى المحاولة لاحقاً.' : 'Too many attempts. Please try again later.'
            : isAr ? 'تعذر إرسال التصميم. يرجى المحاولة مرة أخرى.' : 'We could not send your design. Please try again.',
        );
        return;
      }

      const { email_sent: emailSent } = await response.json();

      // In email-only mode a failed send would otherwise leave the user with
      // nothing, having just handed over their details.
      if (deliveryMode === 'form_email_download' || !emailSent) {
        downloadPdfBlob(blob);
      }

      setModalOpen(false);
      setNotice(
        emailSent
          ? isAr ? 'تم إرسال التصميم إلى بريدك الإلكتروني.' : 'Your design is on its way to your inbox.'
          : isAr ? 'تعذر إرسال البريد، وتم تنزيل التصميم بدلاً من ذلك.' : "We couldn't send the email, so we downloaded your design instead.",
      );
    } catch {
      setServerError(
        isAr ? 'تعذر إرسال التصميم. يرجى المحاولة مرة أخرى.' : 'We could not send your design. Please try again.',
      );
    } finally {
      setSubmitting(false);
      setProjectionSrc('');
      pdfPromiseRef.current = null;
    }
  };

  const handleQuote = () => {
    const intro = isAr
      ? 'مرحباً، أرغب في طلب عرض سعر لتصميم كبينة المصعد التالي:'
      : 'Hello, I would like to request a quotation for the following elevator cabin design:';
    const summary = buildSelectionsSummary(categories, selections, lang)
      .split('\n')
      .map(line => `• ${line}`)
      .join('\n');
    const message = `${intro}\n\n${summary}\n\n${window.location.href}`;
    const url = `https://wa.me/966539705301?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const tooltip = !isReady
    ? missingRequired.length > 0
      ? isAr
        ? `يرجى اختيار: ${missingRequired.map(c => c.name_ar).join('، ')}`
        : `Please select: ${missingRequired.map(c => c.name_en).join(', ')}`
      : isAr ? 'اختر مكوناً على الأقل' : 'Select at least one component'
    : undefined;

  return (
    <>
      <PrintLayout
        categories={categories}
        selections={selections}
        lang={lang}
        projectionSrc={projectionSrc}
        printRef={printRef}
      />

      <LeadCaptureModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleLeadSubmit}
        lang={lang}
        submitting={submitting}
        error={serverError}
      />

      <div className="flex w-full max-w-xs flex-col items-stretch gap-2">
        <button
          onClick={handleExportClick}
          disabled={!isReady || loading}
          title={tooltip}
          className={`flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all ${
            isReady && !loading
              ? 'bg-[#FF5722] text-white shadow-lg shadow-[#FF5722]/25 hover:bg-[#e64a19]'
              : 'cursor-not-allowed bg-[#2a2a2a] text-[#666]'
          }`}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {isAr ? 'تنزيل PDF' : 'Download PDF'}
        </button>

        <button
          onClick={handleQuote}
          disabled={!isReady}
          title={tooltip}
          className={`flex items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-medium transition-all ${
            isReady
              ? 'border-[#FF5722] text-[#FF5722] hover:bg-[#FF5722]/10'
              : 'cursor-not-allowed border-[#2a2a2a] text-[#666]'
          }`}
        >
          <MessageCircle size={16} />
          {isAr ? 'طلب عرض سعر' : 'Request Quotation'}
        </button>

        {notice && <p className="text-center text-xs text-[#FF5722]">{notice}</p>}
        {tooltip && <p className="text-center text-xs text-[#888]">{tooltip}</p>}
      </div>
    </>
  );
}
```

- [ ] **Step 6: Run the tests**

Run: `cd frontend && npm test -- ExportButton`
Expected: PASS — 9 tests.

- [ ] **Step 7: Confirm the API path resolves through the proxy**

Run: `cd frontend && grep -n "api" next.config.ts middleware.ts`
Expected: a rewrite or proxy mapping `/api/...` to the Django backend. If the frontend calls Django on a different origin, change the `fetch` URL above to match how other client-side calls in this codebase reach the API. Do not guess — check `DesignCTAButton.tsx` or any existing client fetch for the established pattern.

- [ ] **Step 8: Run the full suite**

Run: `cd frontend && npm run typecheck && npm test`
Expected: typecheck clean; all tests pass.

- [ ] **Step 9: Commit**

```bash
git add frontend/components/design/ExportButton.tsx frontend/components/design/__tests__/ExportButton.test.tsx frontend/components/design/useDesignPdf.ts frontend/app/[lang]/design/page.tsx frontend/components/design/DesignStudio.tsx
git commit -m "Gate the PDF export behind the delivery mode

PDF generation starts when the modal opens rather than on submit, so the
capture happens while the user types instead of behind a spinner. In
email-only mode a failed send falls back to a download."
```

---

## Task 9: Fullscreen preview

**Files:**
- Create: `frontend/components/design/FullscreenPreview.tsx`
- Modify: `frontend/components/design/ProjectionCanvas.tsx`
- Test: `frontend/components/design/__tests__/FullscreenPreview.test.tsx`

**Interfaces:**
- Consumes: `resolveLayerImage`, `ComponentCategory`, `Selections`.
- Produces: `<FullscreenPreview open onClose categories selections lang />`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/components/design/__tests__/FullscreenPreview.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import FullscreenPreview from '../FullscreenPreview';
import ProjectionCanvas from '../ProjectionCanvas';
import type { ComponentCategory, ComponentOption } from '../types';

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) =>
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />,
}));

const oak: ComponentOption = {
  id: 10, name_ar: 'بلوط', name_en: 'Oak',
  thumbnail: null, projection_image: '/oak.png', sound_file: null,
  is_default_selected: false, sort_order: 1,
};

const chime: ComponentOption = {
  id: 20, name_ar: 'جرس', name_en: 'Chime',
  thumbnail: null, projection_image: null, sound_file: '/chime.mp3',
  is_default_selected: false, sort_order: 1,
};

const walls: ComponentCategory = {
  id: 1, name_ar: 'الجدران', name_en: 'Walls', kind: 'visual', layer_order: 1,
  is_required: true, icon: 'PanelTop', depends_on_category: null, options: [oak],
};

const sound: ComponentCategory = {
  id: 2, name_ar: 'الصوت', name_en: 'Sound', kind: 'sound', layer_order: 99,
  is_required: false, icon: 'Volume2', depends_on_category: null, options: [chime],
};

describe('FullscreenPreview', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <FullscreenPreview
        open={false} onClose={vi.fn()} categories={[walls]} selections={{ 1: oak }} lang="en"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('paints the selected visual layers when open', () => {
    render(
      <FullscreenPreview
        open onClose={vi.fn()} categories={[walls]} selections={{ 1: oak }} lang="en"
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByAltText('Oak')).toBeInTheDocument();
  });

  it('never paints a sound category as a layer', () => {
    render(
      <FullscreenPreview
        open onClose={vi.fn()} categories={[walls, sound]}
        selections={{ 1: oak, 2: chime }} lang="en"
      />,
    );
    expect(screen.queryByAltText('Chime')).not.toBeInTheDocument();
  });

  it('closes on Escape and on the close button', () => {
    const onClose = vi.fn();
    render(
      <FullscreenPreview open onClose={onClose} categories={[walls]} selections={{ 1: oak }} lang="en" />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /close|إغلاق/i }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('ProjectionCanvas fullscreen trigger', () => {
  it('hides the enlarge button when nothing is selected', () => {
    render(
      <ProjectionCanvas
        categories={[walls]} selections={{}} lang="en" canvasRef={{ current: null }}
      />,
    );
    expect(screen.queryByRole('button', { name: /enlarge|تكبير/i })).not.toBeInTheDocument();
  });

  it('shows the enlarge button once something is selected', () => {
    render(
      <ProjectionCanvas
        categories={[walls]} selections={{ 1: oak }} lang="en" canvasRef={{ current: null }}
      />,
    );
    expect(screen.getByRole('button', { name: /enlarge|تكبير/i })).toBeInTheDocument();
  });

  it('keeps the export capture target mounted after opening and closing fullscreen', () => {
    const canvasRef = { current: null } as React.RefObject<HTMLDivElement | null>;
    render(
      <ProjectionCanvas
        categories={[walls]} selections={{ 1: oak }} lang="en" canvasRef={canvasRef}
      />,
    );
    const captureTarget = canvasRef.current;
    expect(captureTarget).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /enlarge|تكبير/i }));
    fireEvent.keyDown(document, { key: 'Escape' });

    // If the overlay ever reparents this node instead of rendering its own copy,
    // html2canvas silently captures the wrong thing and the PDF breaks.
    expect(canvasRef.current).toBe(captureTarget);
    expect(document.body.contains(canvasRef.current)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- FullscreenPreview`
Expected: FAIL — cannot resolve `../FullscreenPreview`.

- [ ] **Step 3: Write the overlay**

Create `frontend/components/design/FullscreenPreview.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X } from 'lucide-react';
import type { ComponentCategory, Selections } from './types';
import type { Lang } from '@/lib/lang';
import { resolveLayerImage } from './resolveLayerImage';

interface FullscreenPreviewProps {
  open: boolean;
  onClose: () => void;
  categories: ComponentCategory[];
  selections: Selections;
  lang: Lang;
}

/**
 * A view-only enlargement of the cabin.
 *
 * This renders its OWN copy of the layer stack. It must never move or reparent
 * ProjectionCanvas's canvasRef node — ExportButton captures that exact element
 * with html2canvas, and detaching it silently corrupts the PDF.
 *
 * A CSS overlay rather than the native Fullscreen API, which iOS Safari does not
 * honour on arbitrary elements.
 */
export default function FullscreenPreview({
  open, onClose, categories, selections, lang,
}: FullscreenPreviewProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const isAr = lang === 'ar';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isAr ? 'معاينة التصميم بملء الشاشة' : 'Fullscreen design preview'}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#131313]/95 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={isAr ? 'إغلاق' : 'Close'}
        className={`absolute top-5 rounded-full bg-[#2a2a2a]/80 p-2 text-[#e5e2e1] transition-colors hover:bg-[#2a2a2a] ${
          isAr ? 'left-5' : 'right-5'
        }`}
      >
        <X size={20} />
      </button>

      <div
        onClick={e => e.stopPropagation()}
        className="relative max-w-full overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ aspectRatio: '2 / 3', height: '90dvh' }}
      >
        {[...categories]
          .filter(cat => cat.kind !== 'sound')
          .sort((a, b) => a.layer_order - b.layer_order)
          .map(cat => {
            const selected = selections[cat.id];
            if (!selected) return null;
            const src = resolveLayerImage(cat, selected, selections);
            if (!src) return null;
            return (
              <Image
                key={cat.id}
                src={src}
                alt={isAr ? selected.name_ar : selected.name_en}
                fill
                className="object-contain"
                style={{ zIndex: cat.layer_order }}
                sizes="90vh"
              />
            );
          })}
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 4: Add the trigger to ProjectionCanvas**

Rewrite `frontend/components/design/ProjectionCanvas.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Maximize2 } from 'lucide-react';
import type { ComponentCategory, Selections } from './types';
import type { Lang } from '@/lib/lang';
import { resolveLayerImage } from './resolveLayerImage';
import FullscreenPreview from './FullscreenPreview';

interface ProjectionCanvasProps {
  categories: ComponentCategory[];
  selections: Selections;
  lang: Lang;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export default function ProjectionCanvas({ categories, selections, lang, canvasRef }: ProjectionCanvasProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const hasAny = Object.keys(selections).length > 0;
  const isAr = lang === 'ar';

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-3">
      <p className="text-xs uppercase tracking-widest text-[#888]">
        {isAr ? 'معاينة التصميم' : 'Design Preview'}
      </p>

      <div className="relative w-full max-w-[320px]">
        {/* The exported area — white background for PDF clarity. */}
        <div
          ref={canvasRef}
          className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          {!hasAny && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="px-6 text-center text-sm text-[#bbb]">
                {isAr
                  ? 'اختر مكونات المصعد لرؤية التصميم'
                  : 'Select elevator components to preview your design'}
              </p>
            </div>
          )}

          {/* Layers sorted by layer_order (ascending = bottom first). Sound
              categories carry no image and must never paint. */}
          {[...categories]
            .filter(cat => cat.kind !== 'sound')
            .sort((a, b) => a.layer_order - b.layer_order)
            .map(cat => {
              const selected = selections[cat.id];
              if (!selected) return null;
              const src = resolveLayerImage(cat, selected, selections);
              if (!src) return null;
              return (
                <Image
                  key={cat.id}
                  src={src}
                  alt={isAr ? selected.name_ar : selected.name_en}
                  fill
                  className="object-contain"
                  style={{ zIndex: cat.layer_order }}
                  sizes="320px"
                />
              );
            })}
        </div>

        {hasAny && (
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            aria-label={isAr ? 'تكبير' : 'Enlarge'}
            className={`absolute bottom-3 rounded-full bg-[#131313]/70 p-2 text-white backdrop-blur transition-colors hover:bg-[#131313] ${
              isAr ? 'left-3' : 'right-3'
            }`}
          >
            <Maximize2 size={16} />
          </button>
        )}
      </div>

      <FullscreenPreview
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        categories={categories}
        selections={selections}
        lang={lang}
      />
    </div>
  );
}
```

- [ ] **Step 5: Run the tests**

Run: `cd frontend && npm test -- FullscreenPreview`
Expected: PASS — 7 tests.

- [ ] **Step 6: Verify the export still works after fullscreen, by hand**

Run: `cd frontend && npm run dev`, open `/design`, select components, open fullscreen, close it, then click **Download PDF**.
Expected: the PDF is correct and identical to one exported without opening fullscreen. This is the regression the automated test guards, confirmed against a real browser.

- [ ] **Step 7: Commit**

```bash
git add frontend/components/design/FullscreenPreview.tsx frontend/components/design/ProjectionCanvas.tsx frontend/components/design/__tests__/FullscreenPreview.test.tsx
git commit -m "Add a view-only fullscreen cabin preview

The overlay renders its own layer stack rather than reparenting the export
capture target, which would silently corrupt the PDF."
```

---

## Task 10: Sound option list

**Files:**
- Create: `frontend/components/design/SoundOptionList.tsx`
- Modify: `frontend/components/design/DesignStudio.tsx`
- Test: `frontend/components/design/__tests__/SoundOptionList.test.tsx`

**Interfaces:**
- Consumes: `ComponentOption`, `Lang`.
- Produces: `<SoundOptionList options selectedId onSelect lang label />`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/components/design/__tests__/SoundOptionList.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SoundOptionList from '../SoundOptionList';
import type { ComponentOption } from '../types';

const chime: ComponentOption = {
  id: 20, name_ar: 'جرس كلاسيكي', name_en: 'Classic chime',
  thumbnail: null, projection_image: null, sound_file: '/chime.mp3',
  is_default_selected: false, sort_order: 1,
};

const bell: ComponentOption = {
  id: 21, name_ar: 'جرس ناعم', name_en: 'Soft bell',
  thumbnail: null, projection_image: null, sound_file: '/bell.mp3',
  is_default_selected: false, sort_order: 2,
};

const playMock = vi.fn();
const pauseMock = vi.fn();

beforeEach(() => {
  playMock.mockReset().mockResolvedValue(undefined);
  pauseMock.mockReset();
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(playMock);
  vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(pauseMock);
});

describe('SoundOptionList', () => {
  it('lists every sound plus a None entry', () => {
    render(
      <SoundOptionList options={[chime, bell]} selectedId={null} onSelect={vi.fn()} lang="en" />,
    );
    expect(screen.getByText('Classic chime')).toBeInTheDocument();
    expect(screen.getByText('Soft bell')).toBeInTheDocument();
    expect(screen.getByText(/none/i)).toBeInTheDocument();
  });

  it('selects a sound without auditioning it', () => {
    const onSelect = vi.fn();
    render(
      <SoundOptionList options={[chime, bell]} selectedId={null} onSelect={onSelect} lang="en" />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /classic chime/i }));

    expect(onSelect).toHaveBeenCalledWith(chime);
    expect(playMock).not.toHaveBeenCalled();
  });

  it('auditions a sound without selecting it', () => {
    const onSelect = vi.fn();
    render(
      <SoundOptionList options={[chime, bell]} selectedId={null} onSelect={onSelect} lang="en" />,
    );

    fireEvent.click(screen.getByRole('button', { name: /play classic chime/i }));

    expect(playMock).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('stops the previous sound when another is played', () => {
    render(
      <SoundOptionList options={[chime, bell]} selectedId={null} onSelect={vi.fn()} lang="en" />,
    );

    fireEvent.click(screen.getByRole('button', { name: /play classic chime/i }));
    fireEvent.click(screen.getByRole('button', { name: /play soft bell/i }));

    expect(pauseMock).toHaveBeenCalled();
    expect(playMock).toHaveBeenCalledTimes(2);
  });

  it('deselects when None is chosen', () => {
    const onSelect = vi.fn();
    render(
      <SoundOptionList options={[chime, bell]} selectedId={chime.id} onSelect={onSelect} lang="en" />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /none/i }));

    expect(onSelect).toHaveBeenCalledWith(chime);
  });

  it('stops playback when unmounted', () => {
    const { unmount } = render(
      <SoundOptionList options={[chime]} selectedId={null} onSelect={vi.fn()} lang="en" />,
    );

    fireEvent.click(screen.getByRole('button', { name: /play classic chime/i }));
    unmount();

    // Audio must not follow the user off the page.
    expect(pauseMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- SoundOptionList`
Expected: FAIL — cannot resolve `../SoundOptionList`.

- [ ] **Step 3: Write the component**

Create `frontend/components/design/SoundOptionList.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';
import type { ComponentOption } from './types';
import type { Lang } from '@/lib/lang';

interface SoundOptionListProps {
  options: ComponentOption[];
  selectedId: number | null;
  /** Called with the option to toggle; selecting the current one clears it. */
  onSelect: (option: ComponentOption) => void;
  lang: Lang;
  label?: string;
}

/**
 * Sound rows carry two independent controls: a radio that makes the sound part
 * of the design, and a play button that only auditions it. Keeping them separate
 * is the point of the feature — the user experiments, then chooses.
 */
export default function SoundOptionList({
  options, selectedId, onSelect, lang, label,
}: SoundOptionListProps) {
  const isAr = lang === 'ar';
  const [playingId, setPlayingId] = useState<number | null>(null);
  // One shared element: starting a sound necessarily stops the previous one.
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const stop = () => {
    audioRef.current?.pause();
    setPlayingId(null);
  };

  const toggleAudition = (option: ComponentOption) => {
    if (playingId === option.id) {
      stop();
      return;
    }
    if (!option.sound_file) return;

    audioRef.current?.pause();
    const audio = new Audio(option.sound_file);
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(option.id);
    void audio.play().catch(() => setPlayingId(null));
  };

  const selectedOption = options.find(o => o.id === selectedId) ?? null;

  const rowClass = (active: boolean) =>
    `flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all ${
      active ? 'border-[#FF5722] ring-2 ring-[#FF5722]/30' : 'border-[#2a2a2a] hover:border-[#444748]'
    }`;

  return (
    <div
      className="flex flex-col gap-2"
      role="radiogroup"
      aria-label={label}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className={rowClass(selectedId === null)}>
        <button
          type="button"
          role="radio"
          aria-checked={selectedId === null}
          aria-label={isAr ? 'بدون صوت' : 'None'}
          onClick={() => {
            if (selectedOption) onSelect(selectedOption);
            stop();
          }}
          className="flex flex-1 items-center gap-3 text-start"
        >
          <span
            className={`h-4 w-4 shrink-0 rounded-full border-2 ${
              selectedId === null ? 'border-[#FF5722] bg-[#FF5722]' : 'border-[#555]'
            }`}
          />
          <span className="text-sm text-[#9a9a9a]">{isAr ? 'بدون صوت' : 'None'}</span>
        </button>
      </div>

      {options.map(option => {
        const name = isAr ? option.name_ar : option.name_en;
        const isSelected = option.id === selectedId;
        const isPlaying = option.id === playingId;

        return (
          <div key={option.id} className={rowClass(isSelected)}>
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={name}
              onClick={() => onSelect(option)}
              className="flex flex-1 items-center gap-3 text-start"
            >
              <span
                className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                  isSelected ? 'border-[#FF5722] bg-[#FF5722]' : 'border-[#555]'
                }`}
              />
              <Volume2 size={16} className="shrink-0 text-[#888]" />
              <span className="text-sm text-[#e5e2e1]">{name}</span>
            </button>

            <button
              type="button"
              onClick={() => toggleAudition(option)}
              aria-label={
                isPlaying
                  ? isAr ? `إيقاف ${name}` : `Pause ${name}`
                  : isAr ? `تشغيل ${name}` : `Play ${name}`
              }
              className="shrink-0 rounded-full border border-[#2a2a2a] p-2 text-[#FF5722] transition-colors hover:bg-[#FF5722]/10"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Wire it into DesignStudio**

In `frontend/components/design/DesignStudio.tsx`, add the import:

```typescript
import SoundOptionList from './SoundOptionList';
```

In the `activeCategory` block, the current code branches on `activeCategory.depends_on_category != null`. Add a sound branch ahead of it, so the chain reads sound → dependent → grid:

```tsx
                {activeCategory.kind === 'sound' ? (
                  <SoundOptionList
                    options={activeCategory.options}
                    selectedId={selections[activeTab]?.id ?? null}
                    onSelect={handleSelect}
                    lang={lang}
                    label={lang === 'ar' ? activeCategory.name_ar : activeCategory.name_en}
                  />
                ) : activeCategory.depends_on_category != null ? (
```

The rest of the existing chain is unchanged.

- [ ] **Step 5: Run the tests**

Run: `cd frontend && npm test -- SoundOptionList`
Expected: PASS — 6 tests.

- [ ] **Step 6: Run the whole frontend suite**

Run: `cd frontend && npm run typecheck && npm test`
Expected: typecheck clean; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/components/design/SoundOptionList.tsx frontend/components/design/DesignStudio.tsx frontend/components/design/__tests__/SoundOptionList.test.tsx
git commit -m "Add the elevator sound picker

Selecting a sound and auditioning it are separate controls, so the user can
experiment freely before committing. One shared audio element means starting
one clip stops the last."
```

---

## Task 11: End-to-end verification and manual test record

**Files:**
- Create: `docs/testing/2026-07-24-design-lead-capture-test-results.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a signed-off manual test record, matching `docs/testing/2026-07-08-mirror-matrix-test-results.md`.

- [ ] **Step 1: Run both suites and CI's exact commands**

```bash
cd backend && python manage.py test
cd ../frontend && npm ci && npm run typecheck && npm test
```

Expected: backend `OK`; frontend typecheck clean and all tests passing.

- [ ] **Step 2: Seed a sound category**

```bash
cd backend && python manage.py runserver
```

In `/admin/design/componentcategory/`, add a category named `Sound` / `الصوت`, Kind = **Sound**, Required = off, Layer order `99`. Add two options with real `.mp3` uploads. Confirm saving an option with no audio is rejected with "Options in a Sound category need an audio file."

- [ ] **Step 3: Walk each delivery mode**

For each of the three values of **Design Export Setting → delivery mode**, reload `/design` and click **Download PDF**. Record what happened:

| Mode | Expected |
|---|---|
| `free_download` | Downloads immediately, no form. |
| `form_email_download` | Form appears; on submit the PDF downloads *and* an email arrives. |
| `form_email_only` | Form appears; on submit an email arrives and nothing downloads. |

- [ ] **Step 4: Confirm the email and the lead record**

Check the recipient inbox and `support@dusr.sa`. Confirm the attachment opens as a valid PDF showing the chosen components, including the `Sound:` row. Confirm the lead appears at `/admin/design/designleadsubmission/` with the correct summary.

- [ ] **Step 5: Force the email-failure fallback**

Stop the SMTP path by setting a bad host, then submit in `form_email_only` mode:

```bash
DJANGO_EMAIL_HOST=127.0.0.1 DJANGO_EMAIL_PORT=1 python manage.py runserver
```

Expected: the PDF downloads anyway, a notice explains the email failed, and the lead is still recorded in the admin. This is the most important manual check in this list — it is the path that would otherwise lose a customer.

- [ ] **Step 6: Check fullscreen and RTL on real devices**

Open `/design` and `/en/design` on mobile Safari and Android Chrome. Confirm fullscreen fills the screen and closes; the export still produces a correct PDF afterwards; sound rows lay out correctly in RTL and play in both languages.

- [ ] **Step 7: Write the results document**

Create `docs/testing/2026-07-24-design-lead-capture-test-results.md` recording, for every step above, what was run, what was expected, and what actually happened — including anything that failed and how it was resolved. Follow the structure of `docs/testing/2026-07-08-mirror-matrix-test-results.md`.

Record real observed results. A test record that says "all passed" without evidence is worse than none, because it makes an unverified claim look verified.

- [ ] **Step 8: Commit**

```bash
git add docs/testing/2026-07-24-design-lead-capture-test-results.md
git commit -m "Record manual test results for design lead capture"
```

---

## Notes for the implementer

**Two decisions already settled** — don't relitigate them mid-implementation:

- Leads store selections as a **text snapshot**, not a relation. It survives an admin deleting an option later, which a foreign key would not.
- Mobile validation is **permissive** (`+`, digits, spaces, 8–20 chars), not Saudi-specific, because the site is bilingual and draws Gulf-wide enquiries.

**Two places where the plan tells you to check rather than assume** — Task 7 Step 5 (the privacy policy URL) and Task 8 Step 5 (how client-side code reaches `/api/`). Both are existing conventions in this codebase; read them rather than guessing, and adjust the code shown here to match what you find.
