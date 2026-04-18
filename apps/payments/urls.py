from django.urls import path
from .views import (
    PaymentConfigView, InitializePaymentView, VerifyPaymentView,
    InterswitchRedirectView, PaymentHistoryView, MockConfirmPaymentView,
    NINVerifyView, NINStatusView,
)

urlpatterns = [
    path('config/',      PaymentConfigView.as_view(),      name='payment-config'),
    path('initialize/',  InitializePaymentView.as_view(),  name='payment-initialize'),
    path('verify/',      VerifyPaymentView.as_view(),      name='payment-verify'),
    path('mock-confirm/', MockConfirmPaymentView.as_view(), name='payment-mock-confirm'),
    path('redirect/',    InterswitchRedirectView.as_view(), name='payment-redirect'),
    path('history/',     PaymentHistoryView.as_view(),     name='payment-history'),

    path('identity/verify-nin/', NINVerifyView.as_view(),  name='nin-verify'),
    path('identity/nin-status/', NINStatusView.as_view(),  name='nin-status'),
]
