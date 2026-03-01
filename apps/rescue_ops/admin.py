from django.contrib import admin

from apps.rescue_ops.models import RescueTask


@admin.register(RescueTask)
class RescueTaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'team', 'priority', 'status', 'created_at')
    list_filter = ('priority', 'status')
    search_fields = ('title', 'team', 'location')
