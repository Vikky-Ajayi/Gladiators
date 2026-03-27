from django.urls import path
from .views import (
    InitializePaymentView, VerifyPaymentView,
    InterswitchRedirectView, PaymentHistoryView,
    NINVerifyView, NINStatusView,
)

urlpatterns = [
    # Payments — Pro subscription via Interswitch Webpay
    path('initialize/',  InitializePaymentView.as_view(),  name='payment-initialize'),
    path('verify/',      VerifyPaymentView.as_view(),      name='payment-verify'),
    path('redirect/',    InterswitchRedirectView.as_view(), name='payment-redirect'),
    path('history/',     PaymentHistoryView.as_view(),     name='payment-history'),

    # Identity — NIN verification via Interswitch Identity API
    path('identity/verify-nin/', NINVerifyView.as_view(),  name='nin-verify'),
    path('identity/nin-status/', NINStatusView.as_view(),  name='nin-status'),
]
