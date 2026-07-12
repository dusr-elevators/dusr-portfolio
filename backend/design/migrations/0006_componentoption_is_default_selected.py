from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('design', '0005_alter_componentoption_projection_image_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='componentoption',
            name='is_default_selected',
            field=models.BooleanField(
                default=False,
                help_text='Auto-select this option in the Studio when the user has not chosen another option.',
                verbose_name='Selected by default',
            ),
        ),
    ]
