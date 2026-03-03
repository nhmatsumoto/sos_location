from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rescue_ops.models import RescueTask
from apps.rescue_ops.serializers import RescueTaskSerializer


class RescueTaskListCreateApi(APIView):
    def get(self, request):
        queryset = RescueTask.objects.all()
        serializer = RescueTaskSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = RescueTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RescueTaskDetailApi(APIView):
    def put(self, request, task_id):
        task = RescueTask.objects.filter(pk=task_id).first()
        if not task:
            return Response({'detail': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = RescueTaskSerializer(task, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, task_id):
        task = RescueTask.objects.filter(pk=task_id).first()
        if not task:
            return Response(status=status.HTTP_204_NO_CONTENT)
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
