import uuid
from django.db import models
from django.conf import settings


class FloodRiskZone(models.Model):
    RISK_CHOICES = [
        ('very_low', 'Very Low'), ('low', 'Low'), ('medium', 'Medium'),
        ('high', 'High'), ('very_high', 'Very High'),
    ]
    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    zone_name = models.CharField(max_length=255, blank=True)
    risk_level = models.CharField(max_length=20, choices=RISK_CHOICES)
    state     = models.CharField(max_length=50)
    lga       = models.CharField(max_length=100, blank=True)
    min_lat   = models.DecimalField(max_digits=10, decimal_places=8)
    max_lat   = models.DecimalField(max_digits=10, decimal_places=8)
    min_lng   = models.DecimalField(max_digits=11, decimal_places=8)
    max_lng   = models.DecimalField(max_digits=11, decimal_places=8)
    flood_type = models.CharField(max_length=30, blank=True)
    peak_months = models.CharField(max_length=100, blank=True)
    last_major_flood_year = models.IntegerField(null=True, blank=True)
    data_source = models.CharField(max_length=100, blank=True)
    notes     = models.TextField(blank=True)
    flood_type = models.CharField(max_length=100, null=True, blank=True)
    peak_months = models.CharField(max_length=200, null=True, blank=True)
    last_major_flood_year = models.IntegerField(null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'flood_risk_zones'
        indexes = [
            models.Index(fields=['state', 'lga']),
            models.Index(fields=['risk_level']),
        ]

    def __str__(self):
        return f"{self.zone_name} ({self.risk_level})"


class AcquisitionArea(models.Model):
    ACQUISITION_TYPES = [
        ('planned', 'Planned'), ('ongoing', 'Ongoing'), ('completed', 'Completed'),
    ]
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    area_name        = models.CharField(max_length=255)
    authority        = models.CharField(max_length=255)
    acquisition_type = models.CharField(max_length=20, choices=ACQUISITION_TYPES)
    state            = models.CharField(max_length=50)
    lga              = models.CharField(max_length=100, blank=True)
    min_lat          = models.DecimalField(max_digits=10, decimal_places=8)
    max_lat          = models.DecimalField(max_digits=10, decimal_places=8)
    min_lng          = models.DecimalField(max_digits=11, decimal_places=8)
    max_lng          = models.DecimalField(max_digits=11, decimal_places=8)
    gazette_reference = models.CharField(max_length=255, blank=True)
    date_gazetted    = models.DateField(null=True, blank=True)
    data_source      = models.CharField(max_length=100, blank=True)
    notes            = models.TextField(blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'acquisition_areas'
        indexes = [models.Index(fields=['state', 'lga'])]

    def contains_point(self, lat, lng):
        return (
            float(self.min_lat) <= lat <= float(self.max_lat) and
            float(self.min_lng) <= lng <= float(self.max_lng)
        )


class Dam(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name         = models.CharField(max_length=255)
    river_basin  = models.CharField(max_length=100, blank=True)
    state        = models.CharField(max_length=50, blank=True)
    country      = models.CharField(max_length=50, blank=True, default='Nigeria')
    latitude     = models.DecimalField(max_digits=10, decimal_places=8)
    longitude    = models.DecimalField(max_digits=11, decimal_places=8)
    capacity_mcm = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    height_m     = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    year_completed = models.IntegerField(null=True, blank=True)
    purpose      = models.CharField(max_length=255, blank=True)
    risk_level   = models.CharField(max_length=20, default='medium')
    downstream_states = models.CharField(max_length=255, blank=True)
    data_source  = models.CharField(max_length=100, blank=True)
    notes        = models.TextField(blank=True)

    class Meta:
        db_table = 'dams'

    def __str__(self):
        return self.name


class LandScan(models.Model):
    SCAN_TYPES    = [('basic', 'Basic (Free — 1 scan, summary report'), ('pro', 'Pro (Paid — unlimited, AI report)')]
    RISK_LEVELS   = [('low','Low'),('medium','Medium'),('high','High'),('critical','Critical'),('unknown','Unknown')]
    PAYMENT_STATUS = [('not_required','Not Required'),('pending','Pending'),('paid','Paid'),('failed','Failed')]
    SCAN_STATUS   = [('processing','Processing'),('completed','Completed'),('failed','Failed')]

    id   = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='scans'
    )
    scan_reference = models.CharField(max_length=30, unique=True)

    # ── Location ──────────────────────────────────────────────────────
    latitude        = models.DecimalField(max_digits=10, decimal_places=8)
    longitude       = models.DecimalField(max_digits=11, decimal_places=8)
    accuracy_meters = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    radius_km       = models.DecimalField(max_digits=5, decimal_places=2, default=0.5)  # User-selected area radius

    # Reverse geocoded
    address  = models.TextField(blank=True)
    lga      = models.CharField(max_length=100, blank=True)
    state    = models.CharField(max_length=50, blank=True)
    place_id = models.CharField(max_length=255, blank=True)

    # ── Status ────────────────────────────────────────────────────────
    status    = models.CharField(max_length=20, choices=SCAN_STATUS, default='processing')
    scan_type = models.CharField(max_length=20, choices=SCAN_TYPES, default='basic')

    # ── Overall Risk ──────────────────────────────────────────────────
    risk_score = models.IntegerField(null=True, blank=True)       # 0-100
    risk_level = models.CharField(max_length=20, choices=RISK_LEVELS, default='unknown')

    # ── Legal Status ──────────────────────────────────────────────────
    is_government_land    = models.BooleanField(null=True)
    is_under_acquisition  = models.BooleanField(null=True)
    acquisition_authority = models.CharField(max_length=255, blank=True)
    acquisition_type      = models.CharField(max_length=50, blank=True)
    gazette_reference     = models.CharField(max_length=255, blank=True)
    legal_notes           = models.TextField(blank=True)

    # ── Flood Risk ────────────────────────────────────────────────────
    flood_risk_level  = models.CharField(max_length=20, blank=True)
    flood_zone_name   = models.CharField(max_length=255, blank=True)
    flood_type        = models.CharField(max_length=30, blank=True)
    flood_peak_months = models.CharField(max_length=100, blank=True)
    flood_last_major_year = models.IntegerField(null=True, blank=True)
    flood_notes       = models.TextField(blank=True)
    flood_data_source = models.CharField(max_length=100, blank=True)

    # ── Erosion ───────────────────────────────────────────────────────
    erosion_risk_level = models.CharField(max_length=20, blank=True)

    # ── Dam Proximity ─────────────────────────────────────────────────
    nearest_dam_name         = models.CharField(max_length=255, blank=True)
    nearest_dam_distance_km  = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    dam_risk_level           = models.CharField(max_length=20, blank=True)
    dam_river_basin          = models.CharField(max_length=100, blank=True)
    dam_capacity_mcm         = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dam_height_m             = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    dam_year_completed       = models.IntegerField(null=True, blank=True)
    dam_purpose              = models.CharField(max_length=255, blank=True)
    dam_downstream_states    = models.CharField(max_length=255, blank=True)
    dam_notes                = models.TextField(blank=True)

    # ── Terrain ───────────────────────────────────────────────────────
    elevation_meters = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    # ── AI Report (Groq — core product) ──────────────────────────────
    ai_report        = models.TextField(blank=True)           # Full markdown time-projection report
    ai_report_model  = models.CharField(max_length=100, blank=True)
    ai_report_tokens = models.IntegerField(null=True, blank=True)
    report_generated = models.BooleanField(default=False)
    report_generated_at = models.DateTimeField(null=True, blank=True)

    # ── Payment ───────────────────────────────────────────────────────
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='not_required')
    payment_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'land_scans'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['scan_reference']),
            models.Index(fields=['state', 'lga']),
        ]

    def __str__(self):
        return f"{self.scan_reference} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.scan_reference:
            self.scan_reference = self._generate_reference()
        super().save(*args, **kwargs)

    def _generate_reference(self):
        import random, string
        from django.utils import timezone
        year   = timezone.now().year
        suffix = ''.join(random.choices(string.digits, k=5))
        return f"LND-{year}-{suffix}"


class SavedLand(models.Model):
    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_lands')
    land_scan = models.ForeignKey(LandScan, on_delete=models.CASCADE, related_name='saved_by')
    custom_name   = models.CharField(max_length=255, blank=True)
    notes         = models.TextField(blank=True)
    alert_enabled = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'saved_lands'
        unique_together = ['user', 'land_scan']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} — {self.custom_name or self.land_scan.scan_reference}"
