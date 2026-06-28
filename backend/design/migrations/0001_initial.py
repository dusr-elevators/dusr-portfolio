from django.db import migrations, models
import design.models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='ComponentCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name_ar', models.CharField(max_length=100, verbose_name='Name (Arabic)')),
                ('name_en', models.CharField(max_length=100, verbose_name='Name (English)')),
                ('layer_order', models.PositiveIntegerField(
                    default=0,
                    verbose_name='Layer order (z-index)',
                    help_text='Higher value = renders on top in the projection canvas.',
                )),
                ('is_required', models.BooleanField(
                    default=False,
                    verbose_name='Required',
                    help_text='User must select an option before exporting PDF.',
                )),
                ('icon', models.CharField(
                    blank=True,
                    max_length=50,
                    verbose_name='Icon (Lucide name)',
                    help_text='Optional Lucide icon name shown in the tab, e.g. "Layers".',
                )),
                ('is_active', models.BooleanField(default=True, verbose_name='Active')),
            ],
            options={
                'verbose_name': 'Component Category',
                'verbose_name_plural': 'Component Categories',
                'db_table': 'design_componentcategory',
                'ordering': ['layer_order'],
            },
        ),
        migrations.CreateModel(
            name='ComponentOption',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name_ar', models.CharField(max_length=100, verbose_name='Name (Arabic)')),
                ('name_en', models.CharField(max_length=100, verbose_name='Name (English)')),
                ('thumbnail', models.ImageField(
                    upload_to=design.models.design_thumbnail_path,
                    verbose_name='Thumbnail',
                    help_text='Small preview image shown in the selection grid.',
                )),
                ('projection_image', models.ImageField(
                    upload_to=design.models.design_projection_path,
                    verbose_name='Projection image',
                    help_text='Transparent PNG placed on the 2D canvas. All projection images must share the same canvas dimensions.',
                )),
                ('sort_order', models.PositiveIntegerField(default=0, verbose_name='Sort order')),
                ('is_active', models.BooleanField(default=True, verbose_name='Active')),
                ('category', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='options',
                    to='design.componentcategory',
                    verbose_name='Category',
                )),
            ],
            options={
                'verbose_name': 'Component Option',
                'verbose_name_plural': 'Component Options',
                'db_table': 'design_componentoption',
                'ordering': ['sort_order'],
            },
        ),
    ]
