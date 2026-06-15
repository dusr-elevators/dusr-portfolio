from django.db import migrations


def add_missing_columns(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("PRAGMA table_info(home_financialsection)")
        section_cols = {row[1] for row in cursor.fetchall()}

        if 'is_tab' not in section_cols:
            cursor.execute("ALTER TABLE home_financialsection ADD COLUMN is_tab bool NOT NULL DEFAULT 1")

        cursor.execute("PRAGMA table_info(home_financialcategory)")
        category_cols = {row[1] for row in cursor.fetchall()}

        if 'show_in_summary' not in category_cols:
            cursor.execute("ALTER TABLE home_financialcategory ADD COLUMN show_in_summary bool NOT NULL DEFAULT 0")


class Migration(migrations.Migration):
    dependencies = [
        ('financial', '0002_sections_summary'),
    ]

    operations = [
        migrations.RunPython(add_missing_columns, migrations.RunPython.noop),
    ]
