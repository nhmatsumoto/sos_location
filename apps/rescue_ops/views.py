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
        import uuid
        from apps.api.events import dispatch_event
        
        data = request.data.copy()
        if not data.get('external_id'):
            data['external_id'] = str(uuid.uuid4())

        serializer = RescueTaskSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        task = serializer.save()

        dispatch_event(
            aggregate_id=task.external_id,
            aggregate_type='RescueTask',
            event_type='RescueTaskCreated',
            payload=serializer.data,
            actor_user_id=getattr(request.user, 'id', None)
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RescueTaskDetailApi(APIView):
    def put(self, request, task_id):
        from apps.api.events import dispatch_event
        task = RescueTask.objects.filter(pk=task_id).first()
        if not task:
            return Response({'detail': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = RescueTaskSerializer(task, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        task = serializer.save()

        dispatch_event(
            aggregate_id=task.external_id or task.id,
            aggregate_type='RescueTask',
            event_type='RescueTaskUpdated',
            payload=serializer.data,
            actor_user_id=getattr(request.user, 'id', None)
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, task_id):
        from apps.api.events import dispatch_event
        task = RescueTask.objects.filter(pk=task_id).first()
        if not task:
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        task_id_ref = task.external_id or task.id
        task.delete()

        dispatch_event(
            aggregate_id=task_id_ref,
            aggregate_type='RescueTask',
            event_type='RescueTaskDeleted',
            payload={'id': task_id},
            actor_user_id=getattr(request.user, 'id', None)
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
