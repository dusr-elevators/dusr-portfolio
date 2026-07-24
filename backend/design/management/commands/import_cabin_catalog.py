"""Import an elevator cabin component catalog from an Elementor-built source page.

The source page renders every option twice: once as a selectable thumbnail
(``<img>`` inside a ``material-thumb`` loop item) and once as a stacked
projection layer (a ``material-layer`` container whose background image is
emitted in a ``loop-dynamic`` <style> block, keyed by the loop item id).
Both halves are joined on that loop item id.

Wall options additionally carry five mirror overlays each. Those become
``OptionVariant`` rows under a Mirrors category that depends on Walls, which is
exactly the shape ``resolveLayerImage`` on the frontend expects.

Re-running the command is safe: options are matched on (category, name_en) and
images are only re-downloaded when ``--refresh-images`` is passed.
"""

import hashlib
import html
import os
import re
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from design.models import ComponentCategory, ComponentOption, LucideIconChoice, OptionVariant

SOURCE_URL = 'https://atlaslifts-sa.com/design-your-own-cabin/'
USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64)'

# Elementor loop template ids on the source page.
TPL_THUMB = '4452'      # selectable thumbnail + heading
TPL_LAYER = '4455'      # projection layer for every non-wall category
TPL_WALL = '4820'       # wall projection layer + its five mirror overlays

# Elementor element id of the wall's own projection inside TPL_WALL. Every other
# element id in that template is a mirror overlay (see MIRRORS).
WALL_LAYER_ELEMENT = '19db539e'

# Categories, in source stacking order (DOM order == paint order, so the first
# entry sits at the bottom of the canvas). ``slug`` is the WordPress post type
# emitted as a ``type-<slug>`` class on each loop item.
CATEGORIES = [
    # slug,         name_en,                   name_ar,                    order, icon,         label,         ar_label,   required
    ('celling',     'Ceiling',                 'السقف',                     10, 'PanelTop',    'Ceiling',     'سقف',       True),
    ('handrail',    'Handrails',               'المسكات اليدوية',            20, 'Grip',        'Handrail',    'مسكة',      False),
    ('side',        'Walls',                   'الجوانب',                   30, 'BrickWall',   'Wall',        'جدار',      True),
    ('mirror',      'Mirrors',                 'المرايا',                   40, 'ScanFace',    None,          None,        False),
    ('cop',         'Interior Buttons (COP)',  'الأزرار داخل الكابينة',      50, 'LayoutGrid',  'COP',         'لوحة داخلية', False),
    ('floor',       'Floors',                  'الأرضيات',                  60, 'PanelBottom', 'Floor',       'أرضية',     True),
    ('door-frame',  'Door Frames',             'إطارات الأبواب',            70, 'DoorOpen',    'Door Frame',  'إطار باب',  False),
    ('lop',         'Exterior Buttons (LOP)',  'الأزرار خارج الكابينة',      80, 'Monitor',     'LOP',         'لوحة خارجية', False),
]

# Mirror overlays, keyed by the Elementor element id that carries them inside
# TPL_WALL. Order matches the source DOM.
MIRRORS = [
    ('2736c2a', 'No Mirror',    'بدون مرآة',        0, True),
    ('56f7e93', 'First Half',   'النصف الأول',      1, False),
    ('8149091', 'Second Half',  'النصف الثاني',     2, False),
    ('d87879a', 'Small Cut',    'قص صغير',          3, False),
    ('7050bb1', 'Wide Cut',     'قص عريض',          4, False),
]

MIRROR_SLUG = 'mirror'
WALL_SLUG = 'side'


def _fetch(url):
    request = Request(url, headers={'User-Agent': USER_AGENT})
    with urlopen(request, timeout=120) as response:
        return response.read()


def _text(fragment):
    return html.unescape(re.sub(r'<[^>]+>', '', fragment)).strip()


def _trailing_number(name):
    """``"Hand Rail 12"`` and ``"cop3"`` both yield 12 / 3."""
    match = re.search(r'(\d+)\s*$', name or '')
    return int(match.group(1)) if match else None


def parse_thumbnails(page):
    """Loop item id -> {type, name, thumbnail} for every selectable option."""
    thumbnails = {}
    pattern = r'<div data-elementor-type="loop-item" data-elementor-id="%s"[^>]*class="([^"]*)"[^>]*>' % TPL_THUMB
    for match in re.finditer(pattern, page):
        classes = match.group(1)
        item_id = re.search(r'e-loop-item-(\d+)', classes)
        item_type = re.search(r'\btype-([a-z-]+)\b', classes)
        if not item_id or not item_type:
            continue
        # The image and heading are the only two widgets in the loop item, well
        # inside this window.
        block = page[match.end():match.end() + 3000]
        image = re.search(r'<img[^>]*src="([^"]+)"', block)
        heading = re.search(r'elementor-heading-title[^>]*>(.*?)</h2>', block, re.S)
        thumbnails[int(item_id.group(1))] = {
            'type': item_type.group(1),
            'name': _text(heading.group(1)) if heading else None,
            'thumbnail': html.unescape(image.group(1)) if image else None,
        }
    return thumbnails


def parse_layers(page, template_id):
    """Loop item id -> {elementor element id: projection url}."""
    css = ''.join(
        match.group(1)
        for match in re.finditer(r'<style id="loop-dynamic-%s">(.*?)</style>' % template_id, page, re.S)
    )
    layers = {}
    for rule in css.split('}'):
        if 'background-image' not in rule:
            continue
        item_id = re.search(r'\.e-loop-item-(\d+)', rule)
        element_id = re.search(r'elementor-element-([0-9a-f]+)', rule)
        url = re.search(r'url\("([^"]+)"\)', rule)
        if not (item_id and element_id and url):
            continue
        layers.setdefault(int(item_id.group(1)), {})[element_id.group(1)] = html.unescape(url.group(1))
    return layers


class Command(BaseCommand):
    help = 'Import elevator cabin component categories, options and mirror variants from the source page.'

    def add_arguments(self, parser):
        parser.add_argument('--url', default=SOURCE_URL, help='Source page to import from.')
        parser.add_argument('--html', help='Read the page from this local file instead of fetching --url.')
        parser.add_argument('--cache-dir', help='Directory to cache downloaded images between runs.')
        parser.add_argument('--refresh-images', action='store_true',
                            help='Re-download and replace images on options that already exist.')
        parser.add_argument('--dry-run', action='store_true',
                            help='Parse and report what would be imported without writing anything.')

    def handle(self, *args, **options):
        self.cache_dir = options.get('cache_dir')
        if self.cache_dir:
            os.makedirs(self.cache_dir, exist_ok=True)
        self.refresh_images = options['refresh_images']
        self.downloads = 0

        if options['html']:
            with open(options['html'], 'rb') as handle:
                page = handle.read().decode('utf-8', 'replace')
        else:
            self.stdout.write(f"Fetching {options['url']} ...")
            page = _fetch(options['url']).decode('utf-8', 'replace')

        thumbnails = parse_thumbnails(page)
        layers = parse_layers(page, TPL_LAYER)
        wall_layers = parse_layers(page, TPL_WALL)
        if not thumbnails:
            raise CommandError('No option thumbnails found — the source page layout has changed.')

        self.stdout.write(
            f'Parsed {len(thumbnails)} options, {len(layers)} projections, {len(wall_layers)} wall layer sets.'
        )

        if options['dry_run']:
            self.report_dry_run(thumbnails, layers, wall_layers)
            return

        with transaction.atomic():
            categories = self.sync_categories()
            option_ids = self.sync_options(categories, thumbnails, layers, wall_layers)
            self.sync_mirror_variants(categories, thumbnails, wall_layers, option_ids)

        self.stdout.write(self.style.SUCCESS(
            f'Done. {ComponentCategory.objects.count()} categories, '
            f'{ComponentOption.objects.count()} options, '
            f'{OptionVariant.objects.count()} mirror variants, '
            f'{self.downloads} images downloaded.'
        ))

    # -- reporting ---------------------------------------------------------

    def report_dry_run(self, thumbnails, layers, wall_layers):
        for slug, name_en, _ar, _order, _icon, _label, _arl, _req in CATEGORIES:
            if slug == MIRROR_SLUG:
                walls = [i for i, t in thumbnails.items() if t['type'] == WALL_SLUG]
                variants = sum(
                    1 for wall in walls
                    for element, _n, _a, _s, _d in MIRRORS
                    if element in wall_layers.get(wall, {})
                )
                self.stdout.write(f'  {name_en}: {len(MIRRORS)} options, {variants} variants')
                continue
            items = [(i, t) for i, t in thumbnails.items() if t['type'] == slug]
            projections = sum(
                1 for i, _t in items
                if layers.get(i, {}) or wall_layers.get(i, {}).get(WALL_LAYER_ELEMENT)
            )
            self.stdout.write(f'  {name_en}: {len(items)} options, {projections} projections')

    # -- image handling ----------------------------------------------------

    def download(self, url):
        filename = os.path.basename(urlparse(url).path) or 'image'
        # The source reuses basenames across upload folders (2025/07/3.jpg and
        # 2025/10/3.jpg are different images), so the cache key is the full URL.
        cache_key = hashlib.sha256(url.encode()).hexdigest() + os.path.splitext(filename)[1]
        cached = os.path.join(self.cache_dir, cache_key) if self.cache_dir else None
        if cached and os.path.exists(cached):
            with open(cached, 'rb') as handle:
                return filename, handle.read()
        data = _fetch(url)
        self.downloads += 1
        if cached:
            with open(cached, 'wb') as handle:
                handle.write(data)
        return filename, data

    def set_image(self, instance, field, url):
        """Attach ``url`` to ``instance.<field>``, skipping work when already set."""
        if not url:
            return False
        existing = getattr(instance, field)
        if existing and not self.refresh_images:
            return False
        filename, data = self.download(url)
        if existing:
            existing.delete(save=False)
        getattr(instance, field).save(filename, ContentFile(data), save=False)
        return True

    # -- import steps ------------------------------------------------------

    def sync_categories(self):
        categories = {}
        for slug, name_en, name_ar, order, icon_name, _label, _ar_label, required in CATEGORIES:
            icon, _ = LucideIconChoice.objects.get_or_create(
                lucide_name=icon_name, defaults={'label': name_en},
            )
            category, _ = ComponentCategory.objects.update_or_create(
                name_en=name_en,
                defaults={
                    'name_ar': name_ar,
                    'layer_order': order,
                    'is_required': required,
                    'icon': icon,
                    'is_active': True,
                },
            )
            categories[slug] = category

        # Mirrors paint onto the selected wall rather than standing alone.
        mirrors = categories[MIRROR_SLUG]
        mirrors.depends_on_category = categories[WALL_SLUG]
        mirrors.save(update_fields=['depends_on_category'])
        return categories

    def sync_options(self, categories, thumbnails, layers, wall_layers):
        """Create every non-mirror option. Returns loop item id -> ComponentOption."""
        specs = {slug: (label, ar_label) for slug, _e, _a, _o, _i, label, ar_label, _r in CATEGORIES}
        option_ids = {}
        skipped = []

        for item_id, item in sorted(thumbnails.items()):
            category = categories.get(item['type'])
            if category is None:
                skipped.append((item_id, item['type']))
                continue
            label, ar_label = specs[item['type']]
            number = _trailing_number(item['name'])
            # Source names are inconsistent ("cop3", "side 1", "Cop 1"); rebuild
            # them from the category label and the trailing number.
            name_en = f'{label} {number}' if number else (item['name'] or label)
            name_ar = f'{ar_label} {number}' if number else ar_label

            option, _ = ComponentOption.objects.get_or_create(
                category=category, name_en=name_en, defaults={'name_ar': name_ar},
            )
            option.name_ar = name_ar
            option.sort_order = number or 0
            option.is_active = True
            option.is_default_selected = (number == 1)

            self.set_image(option, 'thumbnail', item['thumbnail'])
            projection = (
                wall_layers.get(item_id, {}).get(WALL_LAYER_ELEMENT)
                if item['type'] == WALL_SLUG
                else next(iter(layers.get(item_id, {}).values()), None)
            )
            self.set_image(option, 'projection_image', projection)
            if not projection:
                self.stdout.write(self.style.WARNING(
                    f'  no projection on the source page for {category.name_en} / {name_en}'
                ))
            option.save()
            option_ids[item_id] = option

        for item_id, item_type in skipped:
            self.stdout.write(self.style.WARNING(f'  skipped unknown option type "{item_type}" (item {item_id})'))
        return option_ids

    def sync_mirror_variants(self, categories, thumbnails, wall_layers, option_ids):
        mirrors = categories[MIRROR_SLUG]
        for element_id, name_en, name_ar, sort_order, is_default in MIRRORS:
            option, _ = ComponentOption.objects.get_or_create(
                category=mirrors, name_en=name_en, defaults={'name_ar': name_ar},
            )
            option.name_ar = name_ar
            option.sort_order = sort_order
            option.is_default_selected = is_default
            option.is_active = True
            option.save()

            for item_id, item in thumbnails.items():
                if item['type'] != WALL_SLUG:
                    continue
                url = wall_layers.get(item_id, {}).get(element_id)
                wall = option_ids.get(item_id)
                if not url or wall is None:
                    continue
                variant, created = OptionVariant.objects.get_or_create(
                    option=option, depends_on_option=wall,
                )
                if created or self.refresh_images:
                    self.set_image(variant, 'projection_image', url)
                    variant.save()
