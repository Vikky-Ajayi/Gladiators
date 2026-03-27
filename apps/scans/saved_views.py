from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SavedLand
from .serializers import SavedLandSerializer, SavedLandCreateSerializer


class SavedLandListCreateView(APIView):
    """
    GET  /api/v1/saved-lands/  — List user's saved lands
    POST /api/v1/saved-lands/  — Save a land
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        saved = SavedLand.objects.filter(user=request.user).select_related('land_scan')
        serializer = SavedLandSerializer(saved, many=True)
        return Response({'results': serializer.data, 'count': saved.count()})

    def post(self, request):
        serializer = SavedLandCreateSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        saved = serializer.save()
        return Response(SavedLandSerializer(saved).data, status=status.HTTP_201_CREATED)


class SavedLandDetailView(APIView):
    """
    GET    /api/v1/saved-lands/:id/  — Get single saved land
    PUT    /api/v1/saved-lands/:id/  — Update name/notes/alert toggle
    DELETE /api/v1/saved-lands/:id/  — Remove from saved
    """
    permission_classes = [IsAuthenticated]

    def _get_object(self, request, saved_id):
        try:
            return SavedLand.objects.get(id=saved_id, user=request.user)
        except SavedLand.DoesNotExist:
            return None

    def get(self, request, saved_id):
        saved = self._get_object(request, saved_id)
        if not saved:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(SavedLandSerializer(saved).data)

    def put(self, request, saved_id):
        saved = self._get_object(request, saved_id)
        if not saved:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        allowed_fields = ['custom_name', 'notes', 'alert_enabled']
        for field in allowed_fields:
            if field in request.data:
                setattr(saved, field, request.data[field])
        saved.save()

        return Response(SavedLandSerializer(saved).data)

    def delete(self, request, saved_id):
        saved = self._get_object(request, saved_id)
        if not saved:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        saved.delete()
        return Response({'message': 'Removed from saved lands.'}, status=status.HTTP_200_OK)
