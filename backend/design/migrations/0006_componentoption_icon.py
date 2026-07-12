from django.db import migrations, models
import django.db.models.deletion


OPTION_ICONS = [
    ('Arrow up', 'ArrowUp'),
    ('Arrow down', 'ArrowDown'),
    ('Move up', 'MoveUp'),
    ('Move down', 'MoveDown'),
]


def populate_option_icons(apps, schema_editor):
    LucideIconChoice = apps.get_model('design', 'LucideIconChoice')
    for label, lucide_name in OPTION_ICONS:
        LucideIconChoice.objects.get_or_create(lucide_name=lucide_name, defaults={'label': label})


class Migration(migrations.Migration):

    dependencies = [
        ('design', '0005_alter_componentoption_projection_image_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='componentoption',
            name='icon',
            field=models.ForeignKey(
                blank=True,
                help_text='Optional icon shown in the Studio option selector, e.g. ArrowUp or ArrowDown for mirrors.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='options',
                to='design.lucideiconchoice',
                verbose_name='Icon',
            ),
        ),
        migrations.RunPython(populate_option_icons, migrations.RunPython.noop),
    ]
