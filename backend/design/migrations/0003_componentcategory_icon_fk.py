from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('design', '0002_lucideiconchoise_alter_componentcategory_icon'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='componentcategory',
            name='icon',
        ),
        migrations.AddField(
            model_name='componentcategory',
            name='icon',
            field=models.ForeignKey(
                verbose_name='Icon',
                on_delete=django.db.models.deletion.SET_NULL,
                null=True,
                blank=True,
                related_name='categories',
                to='design.lucideiconchoice',
                help_text='Icon shown in the component tab. Add new icons under Lucide Icons.',
            ),
        ),
    ]
