from django.urls import path
from .views import SavedLandListCreateView, SavedLandDetailView

urlpatterns = [
    path('', SavedLandListCreateView.as_view(), name='saved-land-list'),
    path('<uuid:saved_id>/', SavedLandDetailView.as_view(), name='saved-land-detail'),
]
