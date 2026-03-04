from rest_framework import serializers

from apps.rescue_ops.models import RescueTask


class RescueTaskSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    external_id = serializers.UUIDField(required=False)
    createdAtUtc = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = RescueTask
        fields = ['id', 'external_id', 'title', 'team', 'priority', 'location', 'description', 'status', 'createdAtUtc']
