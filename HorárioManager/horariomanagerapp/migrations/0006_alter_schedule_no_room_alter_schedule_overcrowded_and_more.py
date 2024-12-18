# Generated by Django 5.0.3 on 2024-12-16 03:06

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('horariomanagerapp', '0005_alter_schedule_no_room_alter_schedule_overcrowded_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='schedule',
            name='no_room',
            field=models.DecimalField(blank=True, decimal_places=2, default=None, max_digits=5, null=True),
        ),
        migrations.AlterField(
            model_name='schedule',
            name='overcrowded',
            field=models.DecimalField(blank=True, decimal_places=2, default=None, max_digits=5, null=True),
        ),
        migrations.AlterField(
            model_name='schedule',
            name='overlap',
            field=models.DecimalField(blank=True, decimal_places=2, default=None, max_digits=5, null=True),
        ),
        migrations.AlterField(
            model_name='schedule',
            name='time_regulation',
            field=models.DecimalField(blank=True, decimal_places=2, default=None, max_digits=5, null=True),
        ),
        migrations.AlterField(
            model_name='schedule',
            name='wrong_characteristics',
            field=models.DecimalField(blank=True, decimal_places=2, default=None, max_digits=5, null=True),
        ),
    ]
