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
