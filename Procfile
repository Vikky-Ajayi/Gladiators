release: python manage.py migrate && python manage.py seed_data
web: gunicorn landrify.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120
