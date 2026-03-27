from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['payment_reference', 'user', 'amount', 'payment_type', 'status', 'paid_at', 'created_at']
    list_filter = ['status', 'payment_type', 'currency']
    search_fields = ['payment_reference', 'user__email', 'gateway_reference']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-created_at']
