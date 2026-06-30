from django.db import migrations, models

DEFAULT_ICONS = [
    ('Layers (general)', 'Layers'),
    ('Wall', 'BrickWall'),
    ('Ceiling', 'PanelTop'),
    ('Floor', 'PanelBottom'),
    ('Door (open)', 'DoorOpen'),
    ('Door (closed)', 'DoorClosed'),
    ('Handrails / grip', 'Grip'),
    ('Lighting', 'Lightbulb'),
    ('Mirror', 'ScanFace'),
    ('Buttons panel', 'LayoutGrid'),
    ('Color / finish', 'Palette'),
    ('Seating', 'Armchair'),
    ('Safety features', 'Shield'),
    ('Controls / settings', 'Settings'),
    ('Display / screen', 'Monitor'),
    ('Camera / security', 'Camera'),
    ('Ventilation / fan', 'Wind'),
    ('Audio / speakers', 'Music'),
    ('Premium / luxury', 'Star'),
    ('Mechanical / other', 'Wrench'),
]


def populate_icons(apps, schema_editor):
    LucideIconChoice = apps.get_model('design', 'LucideIconChoice')
    for label, lucide_name in DEFAULT_ICONS:
        LucideIconChoice.objects.get_or_create(lucide_name=lucide_name, defaults={'label': label})


class Migration(migrations.Migration):

    dependencies = [
        ('design', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='LucideIconChoice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('label', models.CharField(
                    max_length=100,
                    verbose_name='Label',
                    help_text='Friendly name shown in the dropdown, e.g. "Ceiling".',
                )),
                ('lucide_name', models.CharField(
                    max_length=50,
                    unique=True,
                    verbose_name='Lucide icon name',
                    help_text='Exact PascalCase name from lucide.dev, e.g. "PanelTop".',
                )),
            ],
            options={
                'verbose_name': 'Lucide Icon',
                'verbose_name_plural': 'Lucide Icons',
                'db_table': 'design_lucideiconchoise',
                'ordering': ['label'],
            },
        ),
        migrations.RunPython(populate_icons, migrations.RunPython.noop),
    ]
