from django.db import migrations, models
import django.db.models.deletion


def migrate_icons(apps, schema_editor):
    ReportCategory = apps.get_model('financial', 'ReportCategory')
    ReportIcon = apps.get_model('financial', 'ReportIcon')

    existing_icons = ReportCategory.objects.values_list('icon', flat=True).distinct()
    icon_map = {}
    for icon_name in existing_icons:
        if not icon_name:
            continue
        icon_obj, _ = ReportIcon.objects.get_or_create(name=icon_name)
        icon_map[icon_name] = icon_obj

    for category in ReportCategory.objects.all():
        if category.icon and category.icon in icon_map:
            category.icon_fk = icon_map[category.icon]
            category.save(update_fields=['icon_fk'])


class Migration(migrations.Migration):
    dependencies = [
        ('financial', '0003_sync_section_columns'),
    ]

    operations = [
        migrations.CreateModel(
            name='ReportIcon',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
            ],
            options={
                'verbose_name': 'Report Icon',
                'verbose_name_plural': 'Report Icons',
                'db_table': 'home_reporticon',
                'ordering': ['name'],
            },
        ),
        migrations.AddField(
            model_name='reportcategory',
            name='icon_fk',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='categories', to='financial.reporticon'),
        ),
        migrations.RunPython(migrate_icons, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='reportcategory',
            name='icon',
        ),
        migrations.RenameField(
            model_name='reportcategory',
            old_name='icon_fk',
            new_name='icon',
        ),
    ]
