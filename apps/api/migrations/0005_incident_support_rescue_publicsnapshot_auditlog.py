# Generated manually for MVP modules
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_disasterevent'),
    ]

    operations = [
        migrations.CreateModel(
            name='Incident',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=180)),
                ('type', models.CharField(max_length=80)),
                ('status', models.CharField(choices=[('active', 'Active'), ('resolved', 'Resolved'), ('archived', 'Archived')], default='active', max_length=20)),
                ('country', models.CharField(max_length=120)),
                ('region', models.CharField(max_length=120)),
                ('starts_at', models.DateTimeField()),
                ('ends_at', models.DateTimeField(blank=True, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('entity_type', models.CharField(max_length=80)),
                ('entity_id', models.CharField(max_length=64)),
                ('action', models.CharField(max_length=40)),
                ('actor_user_id', models.CharField(max_length=128)),
                ('actor_email', models.CharField(blank=True, max_length=255)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('diff_json', models.JSONField(blank=True, default=dict)),
                ('incident', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='api.incident')),
            ],
        ),
        migrations.CreateModel(
            name='Campaign',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('title', models.CharField(max_length=180)),
                ('description', models.TextField(blank=True)),
                ('goal_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('currency', models.CharField(max_length=10)),
                ('starts_at', models.DateTimeField()),
                ('ends_at', models.DateTimeField(blank=True, null=True)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('active', 'Active'), ('closed', 'Closed')], default='draft', max_length=20)),
                ('incident', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.incident')),
            ],
        ),
        migrations.CreateModel(
            name='DonationMoney',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('currency', models.CharField(max_length=10)),
                ('donor_name', models.CharField(blank=True, max_length=180)),
                ('donor_contact', models.CharField(blank=True, max_length=180)),
                ('payment_ref', models.CharField(blank=True, max_length=120)),
                ('status', models.CharField(choices=[('received', 'Received'), ('pending', 'Pending'), ('canceled', 'Canceled')], default='received', max_length=20)),
                ('received_at', models.DateTimeField()),
                ('campaign', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='api.campaign')),
                ('incident', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.incident')),
            ],
        ),
        migrations.CreateModel(
            name='Expense',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('title', models.CharField(max_length=180)),
                ('description', models.TextField(blank=True)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('currency', models.CharField(max_length=10)),
                ('vendor_name', models.CharField(blank=True, max_length=180)),
                ('invoice_number', models.CharField(blank=True, max_length=120)),
                ('occurred_at', models.DateTimeField()),
                ('campaign', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='api.campaign')),
                ('incident', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.incident')),
            ],
        ),
        migrations.CreateModel(
            name='SearchArea',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(blank=True, max_length=180)),
                ('geometry_json', models.JSONField(default=dict)),
                ('status', models.CharField(choices=[('Pending', 'Pending'), ('InProgress', 'InProgress'), ('Completed', 'Completed')], default='Pending', max_length=20)),
                ('incident', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.incident')),
            ],
        ),
        migrations.CreateModel(
            name='Assignment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('assigned_to_user_id', models.CharField(max_length=128)),
                ('assigned_to_team_id', models.CharField(blank=True, max_length=128)),
                ('status', models.CharField(choices=[('Assigned', 'Assigned'), ('InProgress', 'InProgress'), ('Completed', 'Completed')], default='Assigned', max_length=20)),
                ('assigned_at', models.DateTimeField(auto_now_add=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('incident', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.incident')),
                ('search_area', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.searcharea')),
            ],
        ),
        migrations.CreateModel(
            name='PublicSnapshot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('generated_at', models.DateTimeField(auto_now_add=True)),
                ('data_json', models.JSONField(default=dict)),
                ('version', models.CharField(default='v1', max_length=20)),
                ('incident', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.incident')),
            ],
        ),
        migrations.AddIndex(model_name='incident', index=models.Index(fields=['status', '-starts_at'], name='api_inciden_status_34b0d6_idx')),
        migrations.AddIndex(model_name='auditlog', index=models.Index(fields=['entity_type', 'entity_id'], name='api_auditlo_entity__3fcd0c_idx')),
        migrations.AddIndex(model_name='auditlog', index=models.Index(fields=['-timestamp'], name='api_auditlo_timesta_2a3e8f_idx')),
        migrations.AddIndex(model_name='publicsnapshot', index=models.Index(fields=['incident', '-generated_at'], name='api_publics_inciden_67ecf3_idx')),
    ]
