from django.contrib import admin
from .models import LandScan, FloodRiskZone, AcquisitionArea, Dam, SavedLand


@admin.register(LandScan)
class LandScanAdmin(admin.ModelAdmin):
    list_display = ['scan_reference', 'user', 'state', 'lga', 'risk_level', 'risk_score', 'scan_type', 'status', 'created_at']
    list_filter = ['status', 'scan_type', 'risk_level', 'state', 'payment_status']
    search_fields = ['scan_reference', 'user__email', 'address', 'state']
    readonly_fields = ['id', 'scan_reference', 'created_at']
    ordering = ['-created_at']


@admin.register(FloodRiskZone)
class FloodRiskZoneAdmin(admin.ModelAdmin):
    list_display = ['zone_name', 'state', 'lga', 'risk_level', 'data_source']
    list_filter = ['risk_level', 'state']
    search_fields = ['zone_name', 'state', 'lga']


@admin.register(AcquisitionArea)
class AcquisitionAreaAdmin(admin.ModelAdmin):
    list_display = ['area_name', 'authority', 'state', 'acquisition_type', 'date_gazetted']
    list_filter = ['acquisition_type', 'state']
    search_fields = ['area_name', 'authority', 'state']


@admin.register(Dam)
class DamAdmin(admin.ModelAdmin):
    list_display = ['name', 'state', 'river_basin', 'risk_level', 'capacity_mcm']
    list_filter = ['risk_level', 'state']
    search_fields = ['name', 'river_basin', 'state']


@admin.register(SavedLand)
class SavedLandAdmin(admin.ModelAdmin):
    list_display = ['user', 'land_scan', 'custom_name', 'alert_enabled', 'created_at']
    list_filter = ['alert_enabled']
    search_fields = ['user__email', 'custom_name']
