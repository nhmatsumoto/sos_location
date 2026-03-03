from rest_framework import serializers

from apps.api.models import Assignment, Campaign, DonationMoney, Expense, Incident, SearchArea


class IncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = ['id', 'name', 'type', 'status', 'country', 'region', 'starts_at', 'ends_at', 'created_at', 'updated_at']


class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = '__all__'


class DonationMoneySerializer(serializers.ModelSerializer):
    class Meta:
        model = DonationMoney
        fields = '__all__'

    def validate(self, attrs):
        if attrs.get('amount', 0) <= 0:
            raise serializers.ValidationError({'amount': 'Amount must be greater than zero.'})
        if not attrs.get('currency'):
            raise serializers.ValidationError({'currency': 'Currency is required.'})
        if not attrs.get('incident'):
            raise serializers.ValidationError({'incident': 'Incident is required.'})
        return attrs


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'

    def validate(self, attrs):
        if attrs.get('amount', 0) <= 0:
            raise serializers.ValidationError({'amount': 'Amount must be greater than zero.'})
        if not attrs.get('currency'):
            raise serializers.ValidationError({'currency': 'Currency is required.'})
        if not attrs.get('incident'):
            raise serializers.ValidationError({'incident': 'Incident is required.'})
        return attrs


class SearchAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchArea
        fields = '__all__'

    def validate_geometry_json(self, value):
        if not isinstance(value, dict) or 'type' not in value or 'coordinates' not in value:
            raise serializers.ValidationError('Geometry must be a valid GeoJSON object with type and coordinates.')
        return value


class AssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = '__all__'
