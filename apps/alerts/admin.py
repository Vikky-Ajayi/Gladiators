from django.contrib import admin
from .models import Alert


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'alert_type', 'severity', 'is_read', 'created_at']
    list_filter = ['alert_type', 'severity', 'is_read']
    search_fields = ['user__email', 'title', 'message']
    readonly_fields = ['id', 'created_at']
    ordering = ['-created_at']
