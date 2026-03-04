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


class DisasterEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ('Flood', 'Flood'),
        ('Earthquake', 'Earthquake'),
        ('Cyclone', 'Cyclone'),
        ('Volcano', 'Volcano'),
        ('Wildfire', 'Wildfire'),
        ('Storm', 'Storm'),
        ('Tsunami', 'Tsunami'),
        ('Landslide', 'Landslide'),
        ('Other', 'Other'),
    ]

    provider = models.CharField(max_length=20)
    provider_event_id = models.CharField(max_length=120)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES, default='Other')
    severity = models.PositiveSmallIntegerField(default=1)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)
    provider_updated_at = models.DateTimeField(null=True, blank=True)
    lat = models.FloatField()
    lon = models.FloatField()
    country_code = models.CharField(max_length=2, blank=True)
    country_name = models.CharField(max_length=120, blank=True)
    geometry = models.JSONField(default=dict, blank=True)
    source_url = models.URLField(max_length=500, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    ingested_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('provider', 'provider_event_id')
        indexes = [
            models.Index(fields=['country_code', 'event_type', 'start_at']),
            models.Index(fields=['start_at']),
        ]


class Incident(TimestampedModel):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('resolved', 'Resolved'),
        ('archived', 'Archived'),
    ]

    name = models.CharField(max_length=180)
    type = models.CharField(max_length=80)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    country = models.CharField(max_length=120)
    region = models.CharField(max_length=120)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=['status', '-starts_at'])]


class AuditLog(models.Model):
    entity_type = models.CharField(max_length=80)
    entity_id = models.CharField(max_length=64)
    action = models.CharField(max_length=40)
    actor_user_id = models.CharField(max_length=128)
    actor_email = models.CharField(max_length=255, blank=True)
    incident = models.ForeignKey(Incident, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    diff_json = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [models.Index(fields=['entity_type', 'entity_id']), models.Index(fields=['-timestamp'])]


class Campaign(TimestampedModel):
    STATUS_CHOICES = [('draft', 'Draft'), ('active', 'Active'), ('closed', 'Closed')]

    incident = models.ForeignKey(Incident, on_delete=models.CASCADE)
    external_id = models.UUIDField(default=None, null=True, blank=True, unique=True)
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    goal_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')


class DonationMoney(TimestampedModel):
    STATUS_CHOICES = [('received', 'Received'), ('pending', 'Pending'), ('canceled', 'Canceled')]

    incident = models.ForeignKey(Incident, on_delete=models.CASCADE)
    external_id = models.UUIDField(default=None, null=True, blank=True, unique=True)
    campaign = models.ForeignKey(Campaign, on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10)
    donor_name = models.CharField(max_length=180, blank=True)
    donor_contact = models.CharField(max_length=180, blank=True)
    payment_ref = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='received')
    received_at = models.DateTimeField()


class Expense(TimestampedModel):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE)
    external_id = models.UUIDField(default=None, null=True, blank=True, unique=True)
    campaign = models.ForeignKey(Campaign, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10)
    vendor_name = models.CharField(max_length=180, blank=True)
    invoice_number = models.CharField(max_length=120, blank=True)
    occurred_at = models.DateTimeField()


class SearchArea(TimestampedModel):
    STATUS_CHOICES = [('Pending', 'Pending'), ('InProgress', 'InProgress'), ('Completed', 'Completed')]

    incident = models.ForeignKey(Incident, on_delete=models.CASCADE)
    external_id = models.UUIDField(default=None, null=True, blank=True, unique=True)
    name = models.CharField(max_length=180, blank=True)
    geometry_json = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')


class Assignment(TimestampedModel):
    STATUS_CHOICES = [('Assigned', 'Assigned'), ('InProgress', 'InProgress'), ('Completed', 'Completed')]

    incident = models.ForeignKey(Incident, on_delete=models.CASCADE)
    external_id = models.UUIDField(default=None, null=True, blank=True, unique=True)
    search_area = models.ForeignKey(SearchArea, on_delete=models.CASCADE)
    assigned_to_user_id = models.CharField(max_length=128)
    assigned_to_team_id = models.CharField(max_length=128, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Assigned')
    assigned_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)


class PublicSnapshot(models.Model):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE)
    generated_at = models.DateTimeField(auto_now_add=True)
    data_json = models.JSONField(default=dict)
    version = models.CharField(max_length=20, default='v1')

    class Meta:
        indexes = [models.Index(fields=['incident', '-generated_at'])]


class ProcessedCommand(models.Model):
    command_id = models.UUIDField(unique=True)
    processed_at = models.DateTimeField(auto_now_add=True)
    response_payload = models.JSONField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=['command_id'])]


class DomainEvent(models.Model):
    event_id = models.UUIDField(unique=True)
    aggregate_id = models.CharField(max_length=128)
    aggregate_type = models.CharField(max_length=80)
    event_type = models.CharField(max_length=80)
    payload = models.JSONField()
    timestamp = models.DateTimeField(auto_now_add=True)
    actor_user_id = models.CharField(max_length=128, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['aggregate_id', 'aggregate_type']),
            models.Index(fields=['-timestamp']),
        ]


class EdgeHub(models.Model):
    hub_id = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=120)
    local_ip = models.GenericIPAddressField()
    last_seen_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=40, default='online')
    incident = models.ForeignKey(Incident, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=['hub_id']), models.Index(fields=['incident'])]
