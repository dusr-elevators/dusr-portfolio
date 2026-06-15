from django.db import migrations, models
import django.db.models.deletion


def create_sections(apps, schema_editor):
    FinancialSection = apps.get_model('financial', 'FinancialSection')
    FinancialCategory = apps.get_model('financial', 'FinancialCategory')

    section_order = [
        ('summary', ('Summary', False)),
        ('balance_sheet', ('Balance sheet', True)),
        ('income_statement', ('Income statement', True)),
        ('cash_flow', ('Cash flow', True)),
        ('kpis', ('KPIs', True)),
    ]
    order_map = {code: idx for idx, (code, _) in enumerate(section_order)}
    label_map = {code: label for code, (label, _) in section_order}
    tab_map = {code: is_tab for code, (_, is_tab) in section_order}

    existing_codes = FinancialCategory.objects.values_list('section', flat=True).distinct()
    for code in existing_codes:
        label = label_map.get(code) or str(code).replace('_', ' ').title()
        section, _ = FinancialSection.objects.get_or_create(
            name_en=label,
            defaults={
                'order': order_map.get(code, 0),
                'is_tab': tab_map.get(code, True),
                'is_active': True,
            }
        )
        FinancialCategory.objects.filter(section=code).update(section_fk=section)


class Migration(migrations.Migration):
    dependencies = [
        ('financial', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='FinancialSection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name_en', models.CharField(max_length=200)),
                ('name_ar', models.CharField(blank=True, max_length=200)),
                ('order', models.IntegerField(default=0, help_text='Order in which the section appears')),
                ('is_tab', models.BooleanField(default=True, help_text='Show this section as a tab')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Financial Section',
                'verbose_name_plural': 'Financial Sections',
                'db_table': 'home_financialsection',
                'ordering': ['order', 'name_en'],
            },
        ),
        migrations.AddField(
            model_name='financialcategory',
            name='section_fk',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='categories', to='financial.financialsection'),
        ),
        migrations.AddField(
            model_name='financialcategory',
            name='show_in_summary',
            field=models.BooleanField(default=False, help_text='Show this category in the Summary tab'),
        ),
        migrations.RunPython(create_sections, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='financialcategory',
            name='section',
        ),
        migrations.RenameField(
            model_name='financialcategory',
            old_name='section_fk',
            new_name='section',
        ),
        migrations.AlterField(
            model_name='financialcategory',
            name='section',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='categories', to='financial.financialsection'),
        ),
        migrations.AlterModelOptions(
            name='financialcategory',
            options={'db_table': 'home_financialcategory', 'ordering': ['section__order', 'order', 'label_en'], 'verbose_name': 'Financial Category', 'verbose_name_plural': 'Financial Categories'},
        ),
    ]
