from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ['email', 'password', 'confirm_password', 'full_name', 'phone', 'user_type']

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get('request'),
            username=attrs['email'],
            password=attrs['password'],
        )
        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled.')
        attrs['user'] = user
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    is_pro          = serializers.BooleanField(read_only=True)
    can_scan        = serializers.BooleanField(read_only=True)
    scans_remaining = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id', 'email', 'full_name', 'phone', 'user_type',
            # Plan
            'plan', 'is_pro', 'pro_expires_at',
            'can_scan', 'scans_remaining', 'basic_scan_used',
            # NIN verification
            'nin_verified', 'nin_verified_at', 'nin_last_four',
            'created_at',
        ]
        read_only_fields = [
            'id', 'email', 'plan', 'is_pro', 'pro_expires_at',
            'can_scan', 'scans_remaining', 'basic_scan_used',
            'nin_verified', 'nin_verified_at', 'nin_last_four',
            'created_at',
        ]

    def get_scans_remaining(self, obj):
        return obj.scans_remaining


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['full_name', 'phone', 'user_type']

    def validate_phone(self, value):
        if value and User.objects.exclude(pk=self.instance.pk).filter(phone=value).exists():
            raise serializers.ValidationError('This phone number is already in use.')
        return value


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user
