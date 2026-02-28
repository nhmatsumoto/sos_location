from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='AttentionAlert',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('external_id', models.CharField(max_length=20, unique=True)),
                ('title', models.CharField(max_length=160)),
                ('message', models.TextField()),
                ('severity', models.CharField(default='medium', max_length=20)),
                ('lat', models.FloatField()),
                ('lng', models.FloatField()),
                ('radius_meters', models.PositiveIntegerField(default=500)),
            ],
            options={
                'indexes': [
                    models.Index(fields=['-created_at'], name='apps_api_at_created_f3ee4f_idx'),
                    models.Index(fields=['severity', '-created_at'], name='apps_api_at_severit_e7c064_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='CollapseReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('external_id', models.CharField(max_length=40, unique=True)),
                ('location_name', models.CharField(max_length=160)),
                ('latitude', models.FloatField()),
                ('longitude', models.FloatField()),
                ('description', models.TextField(blank=True)),
                ('reporter_name', models.CharField(blank=True, max_length=160)),
                ('reporter_phone', models.CharField(blank=True, max_length=40)),
                ('video_file_name', models.CharField(max_length=255)),
                ('stored_video_path', models.CharField(max_length=512)),
                ('video_size_bytes', models.BigIntegerField(default=0)),
                ('processing_status', models.CharField(default='Pending', max_length=60)),
                ('splat_pipeline_hint', models.CharField(blank=True, max_length=255)),
            ],
            options={
                'indexes': [models.Index(fields=['-created_at'], name='apps_api_co_created_033f32_idx')],
            },
        ),
        migrations.CreateModel(
            name='MissingPerson',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('external_id', models.CharField(max_length=20, unique=True)),
                ('person_name', models.CharField(max_length=160)),
                ('age', models.PositiveIntegerField(blank=True, null=True)),
                ('city', models.CharField(max_length=120)),
                ('last_seen_location', models.CharField(max_length=255)),
                ('physical_description', models.TextField(blank=True)),
                ('additional_info', models.TextField(blank=True)),
                ('contact_name', models.CharField(max_length=160)),
                ('contact_phone', models.CharField(max_length=40)),
                ('source', models.CharField(default='manual', max_length=30)),
            ],
            options={
                'indexes': [
                    models.Index(fields=['-created_at'], name='apps_api_mi_created_8c0ff2_idx'),
                    models.Index(fields=['city', '-created_at'], name='apps_api_mi_city_4b9c99_idx'),
                ],
            },
        ),
    ]
