#!/usr/bin/env python
"""
Fix database by running migrations.
Run this script if you get "no such table" errors.
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'weblog_analyzer.settings')
django.setup()

from django.core.management import call_command

if __name__ == '__main__':
    print("Running database migrations...")
    try:
        call_command('makemigrations')
        call_command('migrate')
        print("\n✅ Database migrations completed successfully!")
    except Exception as e:
        print(f"\n❌ Error running migrations: {e}")
        sys.exit(1)

