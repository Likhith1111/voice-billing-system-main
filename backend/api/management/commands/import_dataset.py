from django.core.management.base import BaseCommand
import sys
from pathlib import Path

class Command(BaseCommand):
    help = 'Import grocery dataset from CSV or JSON files in dataset/ or project root'

    def handle(self, *args, **kwargs):
        import import_dataset
        import_dataset.run()
        self.stdout.write(self.style.SUCCESS('Dataset import finished!'))
