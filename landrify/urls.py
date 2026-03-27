from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import render
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

def tester_view(request):
    return render(request, 'tester.html')

def home_redirect(request):
    from django.http import HttpResponseRedirect
    return HttpResponseRedirect('/tester/')

urlpatterns = [
    path('', home_redirect),
    path('tester/', tester_view, name='tester'),
    path('admin/', admin.site.urls),

    # Core (health, stats, demo-scan)
    path('api/v1/', include('apps.core.urls')),

    # Auth
    path('api/v1/auth/', include('apps.users.urls')),

    # User profile
    path('api/v1/users/', include('apps.users.profile_urls')),

    # Land scans
    path('api/v1/scans/', include('apps.scans.urls')),

    # Payments (Pro subscription) + Identity (NIN verification)
    path('api/v1/payments/', include('apps.payments.urls')),

    # Saved lands
    path('api/v1/saved-lands/', include('apps.scans.saved_urls')),

    # Alerts
    path('api/v1/alerts/', include('apps.alerts.urls')),

    # API Docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)