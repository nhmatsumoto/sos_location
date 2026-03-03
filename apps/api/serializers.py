from rest_framework import serializers


class CoordinateSerializer(serializers.Serializer):
    lat = serializers.FloatField()
    lng = serializers.FloatField()


class SupportPointSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=True, default='Ponto de apoio')
    type = serializers.CharField(required=False, allow_blank=True, default='apoio')
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    status = serializers.CharField(required=False, allow_blank=True, default='active')
    capacity = serializers.IntegerField(required=False, min_value=0, default=0)


class RiskAreaSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=True, default='Área de risco')
    severity = serializers.CharField(required=False, allow_blank=True, default='high')
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    status = serializers.CharField(required=False, allow_blank=True, default='active')
    radiusMeters = serializers.IntegerField(required=False, min_value=1, default=500)
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class RescueGroupSerializer(serializers.Serializer):
    name = serializers.CharField()
    members = serializers.IntegerField(required=False, min_value=0, default=0)
    specialty = serializers.CharField(required=False, allow_blank=True, default='generalista')
    status = serializers.CharField(required=False, allow_blank=True, default='pronto')
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)


class SupplyLogisticsSerializer(serializers.Serializer):
    item = serializers.CharField()
    quantity = serializers.IntegerField(min_value=0)
    unit = serializers.CharField(required=False, allow_blank=True, default='un')
    origin = serializers.CharField(required=False, allow_blank=True, default='Não informado')
    destination = serializers.CharField(required=False, allow_blank=True, default='Não informado')
    status = serializers.CharField(required=False, allow_blank=True, default='planejado')
    priority = serializers.CharField(required=False, allow_blank=True, default='media')
