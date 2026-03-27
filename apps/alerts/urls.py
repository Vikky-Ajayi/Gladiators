from django.urls import path
from .views import (
    AlertListView, AlertMarkReadView, AlertMarkAllReadView,
    AlertDeleteView, AlertSettingsView,
)

urlpatterns = [
    path('', AlertListView.as_view(), name='alert-list'),
    path('read-all/', AlertMarkAllReadView.as_view(), name='alert-read-all'),
    path('settings/', AlertSettingsView.as_view(), name='alert-settings'),
    path('<uuid:alert_id>/read/', AlertMarkReadView.as_view(), name='alert-mark-read'),
    path('<uuid:alert_id>/', AlertDeleteView.as_view(), name='alert-delete'),
]
