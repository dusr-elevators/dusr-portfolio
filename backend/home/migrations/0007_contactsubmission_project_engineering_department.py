from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0006_seokeyword'),
    ]

    operations = [
        migrations.AddField(
            model_name='contactsubmission',
            name='project_engineering_department',
            field=models.CharField(blank=True, max_length=100),
        ),
    ]
