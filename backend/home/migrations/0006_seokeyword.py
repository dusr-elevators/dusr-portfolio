from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0005_investmentsubmission_message'),
    ]

    operations = [
        migrations.CreateModel(
            name='SEOKeyword',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('page', models.CharField(choices=[('home', 'Home'), ('about', 'About'), ('invest', 'Invest'), ('sectors', 'Sectors'), ('sector-detail', 'Sector Detail'), ('media', 'Media'), ('careers', 'Careers'), ('job-detail', 'Job Detail'), ('contact', 'Contact')], max_length=32, unique=True)),
                ('keywords_en', models.TextField(blank=True, help_text='Comma-separated English SEO phrases for this page.')),
                ('keywords_ar', models.TextField(blank=True, help_text='Comma-separated Arabic SEO phrases for this page.')),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'SEO Keyword',
                'verbose_name_plural': 'SEO Keywords',
                'db_table': 'home_seokeyword',
                'ordering': ['page'],
            },
        ),
    ]
