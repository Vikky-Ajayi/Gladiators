from rest_framework import serializers

from .models import LandScan, SavedLand


class LandScanListSerializer(serializers.ModelSerializer):
    class Meta:
        model = LandScan
        fields = [
            'id',
            'scan_reference',
            'status',
            'scan_type',
            'latitude',
            'longitude',
            'radius_km',
            'address',
            'address_hint',
            'state',
            'lga',
            'risk_score',
            'risk_level',
            'report_generated',
            'payment_status',
            'created_at',
        ]


class LandScanCreateSerializer(serializers.Serializer):
    latitude = serializers.DecimalField(max_digits=20, decimal_places=15, coerce_to_string=False)
    longitude = serializers.DecimalField(max_digits=20, decimal_places=15, coerce_to_string=False)
    radius_km = serializers.FloatField(default=0.05)
    accuracy = serializers.FloatField(required=False, allow_null=True)
    scan_type = serializers.ChoiceField(choices=['basic', 'pro'], default='basic', required=False)
    address_hint = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate_latitude(self, value):
        numeric_value = float(value)
        if not 4.0 <= numeric_value <= 14.0:
            raise serializers.ValidationError('Latitude must be within Nigeria (4.0 to 14.0).')
        return value

    def validate_longitude(self, value):
        numeric_value = float(value)
        if not 2.5 <= numeric_value <= 15.0:
            raise serializers.ValidationError('Longitude must be within Nigeria (2.5 to 15.0).')
        return value

    def validate_radius_km(self, value):
        if value <= 0:
            raise serializers.ValidationError('Radius must be greater than zero.')
        if value > 50:
            raise serializers.ValidationError('Radius capped at 50 km per scan.')
        return value


class LandScanDetailSerializer(serializers.ModelSerializer):
    legal_status = serializers.SerializerMethodField()
    environmental_risks = serializers.SerializerMethodField()
    weather = serializers.SerializerMethodField()

    class Meta:
        model = LandScan
        fields = [
            'id',
            'scan_reference',
            'status',
            'scan_type',
            'latitude',
            'longitude',
            'accuracy_meters',
            'radius_km',
            'address_hint',
            'address',
            'state',
            'lga',
            'risk_score',
            'risk_level',
            'legal_status',
            'environmental_risks',
            'elevation_meters',
            'satellite_image_url',
            'weather',
            'weather_current',
            'weather_historical',
            'weather_projection',
            'weather_summary',
            'ai_report',
            'ai_report_model',
            'ai_report_tokens',
            'report_generated',
            'report_generated_at',
            'payment_status',
            'payment_amount',
            'created_at',
            'expires_at',
        ]

    def get_legal_status(self, obj):
        return {
            'is_government_land': obj.is_government_land,
            'is_under_acquisition': obj.is_under_acquisition,
            'authority': obj.acquisition_authority,
            'gazette_reference': obj.gazette_reference,
            'notes': obj.legal_notes,
        }

    def get_environmental_risks(self, obj):
        return {
            'flood': {
                'risk_level': obj.flood_risk_level,
                'zone_name': obj.flood_zone_name,
                'flood_type': obj.flood_type,
                'peak_months': obj.flood_peak_months,
                'last_major_flood_year': obj.flood_last_major_year,
                'notes': obj.flood_notes,
                'data_source': obj.flood_data_source,
            },
            'erosion': {
                'risk_level': obj.erosion_risk_level,
            },
            'dam_proximity': {
                'nearest_dam': obj.nearest_dam_name,
                'distance_km': obj.nearest_dam_distance_km,
                'risk_level': obj.dam_risk_level,
                'river_basin': obj.dam_river_basin,
                'capacity_mcm': obj.dam_capacity_mcm,
                'height_m': obj.dam_height_m,
                'year_completed': obj.dam_year_completed,
                'purpose': obj.dam_purpose,
                'downstream_states': obj.dam_downstream_states,
                'notes': obj.dam_notes,
            },
        }

    def get_weather(self, obj):
        return {
            'current': obj.weather_current,
            'historical': obj.weather_historical,
            'projection': obj.weather_projection,
            'summary': obj.weather_summary or '',
        }


class SavedLandSerializer(serializers.ModelSerializer):
    scan = LandScanListSerializer(source='land_scan', read_only=True)

    class Meta:
        model = SavedLand
        fields = ['id', 'scan', 'custom_name', 'notes', 'alert_enabled', 'created_at']
        read_only_fields = ['id', 'created_at']


class SavedLandCreateSerializer(serializers.ModelSerializer):
    scan_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = SavedLand
        fields = ['scan_id', 'custom_name', 'notes', 'alert_enabled']

    def validate_scan_id(self, value):
        try:
            scan = LandScan.objects.get(id=value)
        except LandScan.DoesNotExist as exc:
            raise serializers.ValidationError('Scan not found.') from exc

        user = self.context['request'].user
        if SavedLand.objects.filter(user=user, land_scan=scan).exists():
            raise serializers.ValidationError('Already saved.')
        return value

    def create(self, validated_data):
        scan = LandScan.objects.get(id=validated_data.pop('scan_id'))
        return SavedLand.objects.create(
            user=self.context['request'].user,
            land_scan=scan,
            **validated_data,
        )
