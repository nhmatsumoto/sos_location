from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_mapannotation_rescuegroup_supplylogistics'),
    ]

    operations = [
        migrations.CreateModel(
            name='DisasterEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('provider', models.CharField(max_length=20)),
                ('provider_event_id', models.CharField(max_length=120)),
                ('event_type', models.CharField(choices=[('Flood', 'Flood'), ('Earthquake', 'Earthquake'), ('Cyclone', 'Cyclone'), ('Volcano', 'Volcano'), ('Wildfire', 'Wildfire'), ('Storm', 'Storm'), ('Tsunami', 'Tsunami'), ('Landslide', 'Landslide'), ('Other', 'Other')], default='Other', max_length=20)),
                ('severity', models.PositiveSmallIntegerField(default=1)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('start_at', models.DateTimeField()),
                ('end_at', models.DateTimeField(blank=True, null=True)),
                ('provider_updated_at', models.DateTimeField(blank=True, null=True)),
                ('lat', models.FloatField()),
                ('lon', models.FloatField()),
                ('country_code', models.CharField(blank=True, max_length=2)),
                ('country_name', models.CharField(blank=True, max_length=120)),
                ('geometry', models.JSONField(blank=True, default=dict)),
                ('source_url', models.URLField(blank=True, max_length=500)),
                ('raw_payload', models.JSONField(blank=True, default=dict)),
                ('ingested_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'indexes': [models.Index(fields=['country_code', 'event_type', 'start_at'], name='api_disaste_country_44e9fd_idx'), models.Index(fields=['start_at'], name='api_disaste_start_a_a68f71_idx')],
                'unique_together': {('provider', 'provider_event_id')},
            },
        ),
    ]
