from rest_framework import serializers

from apps.rescue_ops.models import RescueTask


class RescueTaskSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    createdAtUtc = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = RescueTask
        fields = ['id', 'title', 'team', 'priority', 'location', 'description', 'status', 'createdAtUtc']
