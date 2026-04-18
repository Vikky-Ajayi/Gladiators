import uuid
from django.db import models
from django.conf import settings


class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('abandoned', 'Abandoned'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='payments'
    )
    land_scan = models.ForeignKey(
        'scans.LandScan',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='payments'
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='NGN')
    payment_type = models.CharField(
        max_length=30,
        choices=[
            ('premium_scan', 'Premium Scan'),
            ('monthly_alerts', 'Monthly Alerts'),
            ('agent_package', 'Agent Package'),
        ],
        default='premium_scan'
    )

    # Interswitch fields
    payment_reference = models.CharField(max_length=100, unique=True)
    gateway_reference = models.CharField(max_length=100, blank=True)
    authorization_url = models.URLField(max_length=2000, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paid_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['payment_reference']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.payment_reference} ({self.status})"
