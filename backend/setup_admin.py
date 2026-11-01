import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

# Create or update superuser with default admin email
user, created = User.objects.get_or_create(username='admin', defaults={'email': 'likithsimhadri99@gmail.com'})
user.email = 'likithsimhadri99@gmail.com'
user.set_password('admin123')
user.is_staff = True
user.is_superuser = True
user.save()

# Also create user by email
user_email, _ = User.objects.get_or_create(username='likithsimhadri99@gmail.com', defaults={'email': 'likithsimhadri99@gmail.com'})
user_email.email = 'likithsimhadri99@gmail.com'
user_email.set_password('admin123')
user_email.is_staff = True
user_email.is_superuser = True
user_email.save()

print("Admin user configured successfully.")
