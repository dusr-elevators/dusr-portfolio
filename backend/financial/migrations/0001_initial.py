from django.db import migrations, models
import django.db.models.deletion
from django.core.validators import FileExtensionValidator


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='ReportCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name_en', models.CharField(max_length=200)),
                ('name_ar', models.CharField(blank=True, max_length=200)),
                ('icon', models.CharField(default='description', help_text='Material Symbols icon name (e.g., description, analytics)', max_length=100)),
                ('order', models.IntegerField(default=0, help_text='Order in which the category appears')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Report Category',
                'verbose_name_plural': 'Report Categories',
                'db_table': 'home_reportcategory',
                'ordering': ['order', 'name_en'],
            },
        ),
        migrations.CreateModel(
            name='FinancialCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('section', models.CharField(choices=[('summary', 'Summary'), ('balance_sheet', 'Balance sheet'), ('income_statement', 'Income statement'), ('cash_flow', 'Cash flow'), ('kpis', 'KPIs')], max_length=50)),
                ('label_en', models.CharField(max_length=200)),
                ('label_ar', models.CharField(blank=True, max_length=200)),
                ('order', models.IntegerField(default=0, help_text='Order in which the category appears')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Financial Category',
                'verbose_name_plural': 'Financial Categories',
                'db_table': 'home_financialcategory',
                'ordering': ['section', 'order', 'label_en'],
            },
        ),
        migrations.CreateModel(
            name='Report',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('description_en', models.CharField(max_length=255)),
                ('description_ar', models.CharField(blank=True, max_length=255)),
                ('pdf_file', models.FileField(help_text='Upload a PDF file', upload_to='reports/', validators=[FileExtensionValidator(['pdf'])])),
                ('date', models.DateField(help_text='Report date (used for year filtering)')),
                ('order', models.IntegerField(default=0, help_text='Order within the category and year')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reports', to='financial.reportcategory')),
            ],
            options={
                'verbose_name': 'Report',
                'verbose_name_plural': 'Reports',
                'db_table': 'home_report',
                'ordering': ['-date', 'order', 'description_en'],
            },
        ),
        migrations.CreateModel(
            name='FinancialDataPoint',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('year', models.PositiveIntegerField()),
                ('quarter', models.PositiveSmallIntegerField(choices=[(1, 'Q1'), (2, 'Q2'), (3, 'Q3'), (4, 'Q4')])),
                ('value', models.DecimalField(decimal_places=2, max_digits=16)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='data_points', to='financial.financialcategory')),
            ],
            options={
                'verbose_name': 'Financial Data Point',
                'verbose_name_plural': 'Financial Data Points',
                'db_table': 'home_financialdatapoint',
                'ordering': ['year', 'quarter'],
                'unique_together': {('category', 'year', 'quarter')},
            },
        ),
    ]
