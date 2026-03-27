from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import User


class AuthProIntegrationTests(APITestCase):
    def test_register_returns_token_and_pro_enabled_user(self):
        payload = {
            "email": "integration@example.com",
            "password": "SuperSecure123",
            "confirm_password": "SuperSecure123",
            "full_name": "Integration User",
        }

        response = self.client.post(reverse("auth-register"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        self.assertIn("user", response.data)
        self.assertTrue(response.data["user"]["is_pro"])
        self.assertTrue(response.data["user"]["has_active_subscription"])
        self.assertTrue(response.data["user"]["can_scan"])
        self.assertEqual(response.data["user"]["scans_remaining"], "unlimited")

    def test_login_then_profile_is_always_pro(self):
        user = User.objects.create_user(
            email="login@example.com",
            password="SuperSecure123",
            full_name="Login User",
            plan=User.Plan.BASIC,
            basic_scan_used=True,
        )

        login_response = self.client.post(
            reverse("auth-login"),
            {"email": user.email, "password": "SuperSecure123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        token = login_response.data["token"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        profile_response = self.client.get(reverse("user-profile"))

        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertTrue(profile_response.data["is_pro"])
        self.assertTrue(profile_response.data["has_active_subscription"])
        self.assertTrue(profile_response.data["can_scan"])
        self.assertEqual(profile_response.data["scans_remaining"], "unlimited")

    def test_protected_profile_still_requires_authentication(self):
        response = self.client.get(reverse("user-profile"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
