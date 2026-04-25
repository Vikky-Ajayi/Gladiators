from django.urls import path
from .views import HealthCheckView, PlatformStatsView, DemoScanView, PublicConfigView

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('stats/', PlatformStatsView.as_view(), name='platform-stats'),
    path('demo-scan/', DemoScanView.as_view(), name='demo-scan'),
    path('config/', PublicConfigView.as_view(), name='public-config'),
]
