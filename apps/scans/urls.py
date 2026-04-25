from django.urls import path
from .views import (
    LandScanCreateView, LandScanDetailView, LandScanReportView,
    ForwardGeocodeView, ReverseGeocodeView,
)

urlpatterns = [
    path('', LandScanCreateView.as_view(), name='scan-create'),
    path('geocode/', ForwardGeocodeView.as_view(), name='scan-geocode'),
    path('reverse-geocode/', ReverseGeocodeView.as_view(), name='scan-reverse-geocode'),
    path('<uuid:scan_id>/', LandScanDetailView.as_view(), name='scan-detail'),
    path('<uuid:scan_id>/report/', LandScanReportView.as_view(), name='scan-report'),
]
