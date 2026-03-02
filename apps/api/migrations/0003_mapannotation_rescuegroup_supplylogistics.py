from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_missingperson_coordinates'),
    ]

    operations = [
        migrations.CreateModel(
            name='MapAnnotation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('external_id', models.CharField(max_length=24, unique=True)),
                ('record_type', models.CharField(choices=[('support_point', 'Support point'), ('risk_area', 'Risk area'), ('missing_person', 'Missing person marker')], max_length=20)),
                ('title', models.CharField(max_length=180)),
                ('lat', models.FloatField()),
                ('lng', models.FloatField()),
                ('severity', models.CharField(blank=True, max_length=20)),
                ('radius_meters', models.PositiveIntegerField(blank=True, null=True)),
                ('status', models.CharField(default='active', max_length=30)),
                ('metadata', models.JSONField(blank=True, default=dict)),
            ],
            options={
                'indexes': [
                    models.Index(fields=['record_type', '-created_at'], name='api_mapanno_record__8d60f0_idx'),
                    models.Index(fields=['status', '-created_at'], name='api_mapanno_status_28d443_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='RescueGroup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('external_id', models.CharField(max_length=24, unique=True)),
                ('name', models.CharField(max_length=160)),
                ('members', models.PositiveIntegerField(default=0)),
                ('specialty', models.CharField(default='generalista', max_length=120)),
                ('status', models.CharField(default='pronto', max_length=30)),
                ('lat', models.FloatField(blank=True, null=True)),
                ('lng', models.FloatField(blank=True, null=True)),
            ],
            options={
                'indexes': [models.Index(fields=['status', '-created_at'], name='api_rescueg_status_87942b_idx')],
            },
        ),
        migrations.CreateModel(
            name='SupplyLogistics',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('external_id', models.CharField(max_length=24, unique=True)),
                ('item', models.CharField(max_length=140)),
                ('quantity', models.PositiveIntegerField(default=0)),
                ('unit', models.CharField(default='un', max_length=40)),
                ('origin', models.CharField(max_length=160)),
                ('destination', models.CharField(max_length=160)),
                ('status', models.CharField(default='planejado', max_length=30)),
                ('priority', models.CharField(default='media', max_length=20)),
            ],
            options={
                'indexes': [models.Index(fields=['status', '-created_at'], name='api_supplyl_status_d44cee_idx')],
            },
        ),
    ]
