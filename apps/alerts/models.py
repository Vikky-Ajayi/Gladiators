import uuid
from django.db import models
from django.conf import settings


class Alert(models.Model):
    ALERT_TYPES = [
        ('flood_warning', 'Flood Warning'),
        ('heavy_rain', 'Heavy Rain'),
        ('dam_release', 'Dam Release'),
        ('acquisition', 'Government Acquisition'),
        ('system', 'System Notification'),
    ]
    SEVERITY_CHOICES = [
        ('info', 'Info'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='alerts'
    )
    land_scan = models.ForeignKey(
        'scans.LandScan',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='alerts'
    )

    alert_type = models.CharField(max_length=30, choices=ALERT_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='info')
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'alerts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
        ]

    def __str__(self):
        return f"{self.alert_type} — {self.user.email}"
