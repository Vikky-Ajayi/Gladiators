from django.urls import path
from .views import ProfileView, ChangePasswordView, UserScansView, ManualProUpgradeView, DowngradeToBasicView

urlpatterns = [
    path('me/', ProfileView.as_view(), name='user-profile'),
    path('me/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('me/scans/', UserScansView.as_view(), name='user-scans'),
    # Test-mode only — blocked in production
    path('me/activate-pro/', ManualProUpgradeView.as_view(), name='activate-pro-test'),
    path('me/downgrade-to-basic/', DowngradeToBasicView.as_view(), name='downgrade-basic-test'),
]