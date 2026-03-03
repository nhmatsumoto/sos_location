from django.db import models


class RescueTask(models.Model):
    PRIORITY_CHOICES = [
        ('alta', 'Alta'),
        ('media', 'Média'),
        ('baixa', 'Baixa'),
    ]
    STATUS_CHOICES = [
        ('aberto', 'Aberto'),
        ('em_acao', 'Em ação'),
        ('concluido', 'Concluído'),
    ]

    title = models.CharField(max_length=180)
    team = models.CharField(max_length=140)
    location = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='media')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='aberto')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['priority', '-created_at']),
        ]
