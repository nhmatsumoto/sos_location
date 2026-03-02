from django.db import models


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class AttentionAlert(TimestampedModel):
    external_id = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=160)
    message = models.TextField()
    severity = models.CharField(max_length=20, default='medium')
    lat = models.FloatField()
    lng = models.FloatField()
    radius_meters = models.PositiveIntegerField(default=500)

    class Meta:
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['severity', '-created_at']),
        ]


class MissingPerson(TimestampedModel):
    external_id = models.CharField(max_length=20, unique=True)
    person_name = models.CharField(max_length=160)
    age = models.PositiveIntegerField(null=True, blank=True)
    city = models.CharField(max_length=120)
    last_seen_location = models.CharField(max_length=255)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    physical_description = models.TextField(blank=True)
    additional_info = models.TextField(blank=True)
    contact_name = models.CharField(max_length=160)
    contact_phone = models.CharField(max_length=40)
    source = models.CharField(max_length=30, default='manual')

    class Meta:
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['city', '-created_at']),
        ]


class CollapseReport(TimestampedModel):
    external_id = models.CharField(max_length=40, unique=True)
    location_name = models.CharField(max_length=160)
    latitude = models.FloatField()
    longitude = models.FloatField()
    description = models.TextField(blank=True)
    reporter_name = models.CharField(max_length=160, blank=True)
    reporter_phone = models.CharField(max_length=40, blank=True)
    video_file_name = models.CharField(max_length=255)
    stored_video_path = models.CharField(max_length=512)
    video_size_bytes = models.BigIntegerField(default=0)
    processing_status = models.CharField(max_length=60, default='Pending')
    splat_pipeline_hint = models.CharField(max_length=255, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['-created_at']),
        ]


class MapAnnotation(TimestampedModel):
    TYPE_SUPPORT_POINT = 'support_point'
    TYPE_RISK_AREA = 'risk_area'
    TYPE_MISSING_PERSON = 'missing_person'
    TYPE_CHOICES = [
        (TYPE_SUPPORT_POINT, 'Support point'),
        (TYPE_RISK_AREA, 'Risk area'),
        (TYPE_MISSING_PERSON, 'Missing person marker'),
    ]

    external_id = models.CharField(max_length=24, unique=True)
    record_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=180)
    lat = models.FloatField()
    lng = models.FloatField()
    severity = models.CharField(max_length=20, blank=True)
    radius_meters = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=30, default='active')
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['record_type', '-created_at']),
            models.Index(fields=['status', '-created_at']),
        ]


class RescueGroup(TimestampedModel):
    external_id = models.CharField(max_length=24, unique=True)
    name = models.CharField(max_length=160)
    members = models.PositiveIntegerField(default=0)
    specialty = models.CharField(max_length=120, default='generalista')
    status = models.CharField(max_length=30, default='pronto')
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=['status', '-created_at'])]


class SupplyLogistics(TimestampedModel):
    external_id = models.CharField(max_length=24, unique=True)
    item = models.CharField(max_length=140)
    quantity = models.PositiveIntegerField(default=0)
    unit = models.CharField(max_length=40, default='un')
    origin = models.CharField(max_length=160)
    destination = models.CharField(max_length=160)
    status = models.CharField(max_length=30, default='planejado')
    priority = models.CharField(max_length=20, default='media')

    class Meta:
        indexes = [models.Index(fields=['status', '-created_at'])]
