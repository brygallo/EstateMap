from django.core.management.base import BaseCommand

from blog.models import Category, Post
from blog.seed_loader import seed_blog


class Command(BaseCommand):
    help = (
        "Carga en el blog las guías iniciales (backend/blog/seed/guides.json). "
        "Es idempotente: no duplica posts existentes."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Sobrescribe los posts que ya existen con el contenido del seed.",
        )

    def handle(self, *args, **options):
        result = seed_blog(Category, Post, overwrite=options["overwrite"])
        self.stdout.write(
            self.style.SUCCESS(
                "Blog seed: {categories_created} categorías nuevas, "
                "{posts_created} posts creados, {posts_updated} actualizados.".format(**result)
            )
        )
