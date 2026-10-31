#!/usr/bin/env bash
# Render.com build script for QBill Django backend
set -o errexit

echo "==> Installing Python dependencies..."
pip install -r requirements.txt

echo "==> Running database migrations..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Creating superuser (admin) if not exists..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@qbill.com', 'admin123')
    print('Admin superuser created.')
else:
    u = User.objects.get(username='admin')
    u.set_password('admin123')
    u.is_staff = True
    u.is_superuser = True
    u.save()
    print('Admin superuser updated.')
"

echo "==> Build complete!"
