from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Alert


FALSE_VALUES = {'0', 'false', 'no', 'off'}
TRUE_VALUES = {'1', 'true', 'yes', 'on'}


def _parse_bool(value):
    """Normalise string and boolean payloads from JSON/form submissions."""
    if isinstance(value, bool):
        return value
    if value is None:
        return None
    normalised = str(value).strip().lower()
    if normalised in TRUE_VALUES:
        return True
    if normalised in FALSE_VALUES:
        return False
    return None


class AlertListView(APIView):
    """GET /api/v1/alerts/ — Paginated list of user alerts."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        alerts = Alert.objects.filter(user=request.user)

        # Filter by read/unread
        is_read = request.query_params.get('is_read')
        if is_read is not None:
            alerts = alerts.filter(is_read=is_read.lower() == 'true')

        alerts = alerts.values(
            'id', 'alert_type', 'severity', 'title',
            'message', 'is_read', 'created_at',
            'land_scan_id',
        )[:50]  # Cap at 50 for hackathon

        unread_count = Alert.objects.filter(user=request.user, is_read=False).count()

        return Response({
            'unread_count': unread_count,
            'alerts': list(alerts),
        })


class AlertMarkReadView(APIView):
    """PUT /api/v1/alerts/:id/read/"""
    permission_classes = [IsAuthenticated]

    def put(self, request, alert_id):
        try:
            alert = Alert.objects.get(id=alert_id, user=request.user)
        except Alert.DoesNotExist:
            return Response({'error': 'Alert not found.'}, status=status.HTTP_404_NOT_FOUND)

        alert.is_read = True
        alert.read_at = timezone.now()
        alert.save(update_fields=['is_read', 'read_at'])
        return Response({'status': 'marked as read'})


class AlertMarkAllReadView(APIView):
    """PUT /api/v1/alerts/read-all/"""
    permission_classes = [IsAuthenticated]

    def put(self, request):
        count = Alert.objects.filter(user=request.user, is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
        return Response({'marked_read': count})


class AlertDeleteView(APIView):
    """DELETE /api/v1/alerts/:id/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, alert_id):
        try:
            alert = Alert.objects.get(id=alert_id, user=request.user)
        except Alert.DoesNotExist:
            return Response({'error': 'Alert not found.'}, status=status.HTTP_404_NOT_FOUND)

        alert.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AlertSettingsView(APIView):
    """
    GET/PUT /api/v1/alerts/settings/
    Controls whether a user has alerts enabled globally and per saved land.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.scans.models import SavedLand
        saved_lands = SavedLand.objects.filter(user=request.user).values(
            'id', 'custom_name', 'alert_enabled', 'land_scan__scan_reference',
            'land_scan__state', 'land_scan__lga',
        )
        return Response({
            'subscription_status': 'active' if request.user.is_pro else 'basic',
            'subscription_expires_at': request.user.pro_expires_at,
            'plan': request.user.plan,
            'saved_lands_alerts': list(saved_lands),
        })

    def put(self, request):
        """Toggle alerts for a specific saved land."""
        from apps.scans.models import SavedLand
        saved_id = request.data.get('saved_land_id')
        alert_enabled = _parse_bool(request.data.get('alert_enabled'))

        if saved_id is None or alert_enabled is None:
            return Response(
                {'error': 'saved_land_id and alert_enabled are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            saved = SavedLand.objects.get(id=saved_id, user=request.user)
        except SavedLand.DoesNotExist:
            return Response({'error': 'Saved land not found.'}, status=status.HTTP_404_NOT_FOUND)

        saved.alert_enabled = alert_enabled
        saved.save(update_fields=['alert_enabled'])
        return Response({'status': 'updated', 'alert_enabled': saved.alert_enabled})
