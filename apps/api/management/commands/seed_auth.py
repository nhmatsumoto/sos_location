from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Cria seed inicial para autenticação local.'

    def handle(self, *args, **options):
        user_model = get_user_model()

        defaults = {
            'email': 'admin@mg-location.local',
            'is_staff': True,
            'is_superuser': True,
            'first_name': 'Admin',
            'last_name': 'MG',
        }

        user, created = user_model.objects.get_or_create(
            username='admin',
            defaults=defaults,
        )

        changed = False
        for field, value in defaults.items():
            if getattr(user, field) != value:
                setattr(user, field, value)
                changed = True

        if created or not user.check_password('admin123456'):
            user.set_password('admin123456')
            changed = True

        if changed:
            user.save()

        self.stdout.write(self.style.SUCCESS('Seed auth garantido: user=admin senha=admin123456'))
