import logging
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from knox.models import AuthToken
from knox.views import LogoutView as KnoxLogoutView, LogoutAllView as KnoxLogoutAllView

from .models import User
from .serializers import (
    RegisterSerializer, LoginSerializer,
    UserProfileSerializer, UpdateProfileSerializer, ChangePasswordSerializer
)

logger = logging.getLogger(__name__)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Catch duplicate email cleanly (returns 400 not 500)
        try:
            user = serializer.save()
        except Exception as e:
            if 'unique' in str(e).lower() or 'duplicate' in str(e).lower() or 'already exists' in str(e).lower():
                return Response(
                    {'email': ['An account with this email already exists. Please login instead.']},
                    status=status.HTTP_400_BAD_REQUEST
                )
            raise

        _, token = AuthToken.objects.create(user)

        return Response({
            'user': UserProfileSerializer(user).data,
            'token': token,
            'message': 'Account created successfully.'
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        _, token = AuthToken.objects.create(user)

        return Response({
            'user': UserProfileSerializer(user).data,
            'token': token,
        })


class GoogleAuthView(APIView):
    """
    POST /api/v1/auth/google/

    Body: { "credential": "<Google ID token>" }

    Verifies a Google ID token (issued by Google Identity Services on the
    client) and returns a Knox token for an existing or newly created user.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = (request.data.get('credential')
                     or request.data.get('id_token')
                     or '').strip()
        if not token_str:
            return Response(
                {'error': 'Missing Google credential.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '') or ''
        if not client_id:
            return Response(
                {'error': 'Google sign-in is not configured on the server. '
                          'Set GOOGLE_CLIENT_ID in the environment.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests as google_requests
            payload = google_id_token.verify_oauth2_token(
                token_str,
                google_requests.Request(),
                client_id,
                clock_skew_in_seconds=10,
            )
        except Exception as e:
            logger.warning(f"Google ID token verification failed: {e}")
            return Response(
                {'error': 'Invalid Google credential.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if payload.get('aud') != client_id:
            return Response({'error': 'Invalid audience.'}, status=status.HTTP_401_UNAUTHORIZED)
        if not payload.get('email_verified'):
            return Response({'error': 'Google account email is not verified.'},
                            status=status.HTTP_401_UNAUTHORIZED)

        email = User.objects.normalize_email((payload.get('email') or '').strip().lower())
        full_name = (payload.get('name') or '').strip()

        user = User.objects.filter(email__iexact=email).first()
        created = False
        if user is None:
            user = User.objects.create_user(
                email=email,
                full_name=full_name,
                user_type=User.UserType.INDIVIDUAL,
            )
            user.set_unusable_password()
            user.save(update_fields=['password'])
            created = True
        elif full_name and not user.full_name:
            user.full_name = full_name
            user.save(update_fields=['full_name'])

        _, token = AuthToken.objects.create(user)
        return Response({
            'user': UserProfileSerializer(user).data,
            'token': token,
            'created': created,
            'provider': 'google',
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class LogoutView(KnoxLogoutView):
    """Invalidates the current auth token."""
    pass


class LogoutAllView(KnoxLogoutAllView):
    """Invalidates all tokens for the user (all devices)."""
    pass


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UpdateProfileSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserProfileSerializer(request.user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'message': 'Password changed successfully.'})


class UserScansView(APIView):
    """Returns a summary of the user's scan history."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.scans.models import LandScan
        from apps.scans.serializers import LandScanListSerializer

        scans = LandScan.objects.filter(user=request.user).order_by('-created_at')
        from rest_framework.pagination import PageNumberPagination
        paginator = PageNumberPagination()
        paginator.page_size = 20
        result_page = paginator.paginate_queryset(scans, request)
        serializer = LandScanListSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)


class ManualProUpgradeView(APIView):
    """
    POST /api/v1/users/me/activate-pro/
    Manually activate Pro for testing when TEST_MODE=True.
    In production this endpoint is blocked.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.conf import settings as s
        if not getattr(s, 'TEST_MODE', False):
            return Response(
                {'error': 'This endpoint is only available in TEST_MODE. Set TEST_MODE=True in .env.'},
                status=status.HTTP_403_FORBIDDEN
            )
        from django.utils import timezone
        user = request.user
        user.plan            = 'pro'
        user.pro_activated_at = timezone.now()
        user.pro_expires_at  = timezone.now() + timezone.timedelta(days=30)
        user.basic_scan_used = False  # Reset so they can scan immediately
        user.save(update_fields=['plan', 'pro_activated_at', 'pro_expires_at', 'basic_scan_used'])

        return Response({
            'success': True,
            'message': 'Pro plan activated for testing.',
            'plan': 'pro',
            'pro_expires_at': user.pro_expires_at,
            'note': 'This only works while TEST_MODE=True. Remove before production deploy.',
        })


class DowngradeToBasicView(APIView):
    """
    POST /api/v1/users/me/downgrade-to-basic/
    Reset to Basic plan for testing. TEST_MODE only.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.conf import settings as s
        if not getattr(s, 'TEST_MODE', False):
            return Response({'error': 'TEST_MODE only.'}, status=status.HTTP_403_FORBIDDEN)
        user = request.user
        user.plan            = 'basic'
        user.pro_expires_at  = None
        user.basic_scan_used = False
        user.save(update_fields=['plan', 'pro_expires_at', 'basic_scan_used'])
        return Response({'success': True, 'message': 'Downgraded to Basic. basic_scan_used reset to False.'})