from django.urls import path
from .views import LandScanCreateView, LandScanDetailView, LandScanReportView

urlpatterns = [
    path('', LandScanCreateView.as_view(), name='scan-create'),
    path('<uuid:scan_id>/', LandScanDetailView.as_view(), name='scan-detail'),
    path('<uuid:scan_id>/report/', LandScanReportView.as_view(), name='scan-report'),
]
