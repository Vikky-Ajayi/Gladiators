from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ['email', 'full_name', 'user_type', 'plan', 'is_pro', 'nin_verified', 'basic_scan_used', 'created_at']
    list_filter   = ['plan', 'user_type', 'nin_verified', 'is_active']
    search_fields = ['email', 'full_name', 'phone']
    ordering      = ['-created_at']
    readonly_fields = ['id', 'created_at', 'updated_at', 'last_login', 'is_pro', 'can_scan', 'scans_remaining']

    fieldsets = (
        ('Account',       {'fields': ('id', 'email', 'password')}),
        ('Profile',       {'fields': ('full_name', 'phone', 'user_type')}),
        ('Plan',          {'fields': ('plan', 'pro_activated_at', 'pro_expires_at', 'basic_scan_used')}),
        ('NIN Verification', {'fields': ('nin_verified', 'nin_verified_at', 'nin_last_four', 'nin_full_name_matched')}),
        ('Computed',      {'fields': ('is_pro', 'can_scan', 'scans_remaining')}),
        ('Permissions',   {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Timestamps',    {'fields': ('created_at', 'updated_at', 'last_login')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'full_name', 'password1', 'password2', 'user_type')}),
    )
