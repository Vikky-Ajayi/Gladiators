import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):

    class UserType(models.TextChoices):
        INDIVIDUAL = 'individual', 'Individual'
        AGENT      = 'agent',      'Real Estate Agent'
        DEVELOPER  = 'developer',  'Developer'
        BANK       = 'bank',       'Bank / Financial Institution'

    class Plan(models.TextChoices):
        BASIC = 'basic', 'Basic (Free)'
        PRO   = 'pro',   'Pro (Paid)'

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email      = models.EmailField(unique=True)
    phone      = models.CharField(max_length=20, unique=True, null=True, blank=True)
    full_name  = models.CharField(max_length=255, blank=True)
    user_type  = models.CharField(max_length=20, choices=UserType.choices, default=UserType.INDIVIDUAL)

    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)

    # ── Plan / Subscription ───────────────────────────────────────────
    # Basic: 1 free scan ever, basic report only
    # Pro:   unlimited scans, full AI time-projection report
    plan                  = models.CharField(max_length=10, choices=Plan.choices, default=Plan.BASIC)
    pro_activated_at      = models.DateTimeField(null=True, blank=True)
    pro_expires_at        = models.DateTimeField(null=True, blank=True)
    interswitch_customer  = models.CharField(max_length=100, blank=True)  # ISW customer code

    # Basic users: tracked to enforce 1-scan limit
    basic_scan_used       = models.BooleanField(default=False)

    # ── NIN Verification (optional — Interswitch Identity API) ────────
    # Users can verify their NIN at any time after registration
    # for an additional layer of account security.
    # Not required to register or to use the app.
    nin_verified          = models.BooleanField(default=False)
    nin_verified_at       = models.DateTimeField(null=True, blank=True)
    nin_last_four         = models.CharField(max_length=4, blank=True)   # Store last 4 digits only
    nin_full_name_matched = models.BooleanField(null=True)               # Did NIN name match account name?

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return self.email

    # ── Plan helpers ──────────────────────────────────────────────────

    @property
    def is_pro(self) -> bool:
        """User has an active Pro subscription."""
        from django.utils import timezone
        if self.plan != self.Plan.PRO:
            return False
        if self.pro_expires_at and self.pro_expires_at < timezone.now():
            return False
        return True

    @property
    def has_active_subscription(self) -> bool:
        return self.is_pro

    @property
    def can_scan(self) -> bool:
        """
        Pro users can always scan.
        Basic users can scan only once (ever).
        """
        if self.is_pro:
            return True
        return not self.basic_scan_used

    @property
    def scans_remaining(self):
        if self.is_pro:
            return 'unlimited'
        return 0 if self.basic_scan_used else 1
