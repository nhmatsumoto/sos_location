from django.urls import path

from apps.rescue_ops.views import RescueTaskDetailApi, RescueTaskListCreateApi

app_name = 'rescue_ops'

urlpatterns = [
    path('rescue-tasks', RescueTaskListCreateApi.as_view(), name='rescue_tasks_list_create'),
    path('rescue-tasks/<int:task_id>', RescueTaskDetailApi.as_view(), name='rescue_tasks_detail'),
]
