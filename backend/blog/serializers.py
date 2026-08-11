from rest_framework import serializers

from .models import Category, Post

# Every field below is safe to show a stranger. The blog has no private
# counterpart to the property metrics, but the rule from the rest of the API
# holds: the public serializer enumerates fields, it never uses `__all__`.


class CategorySerializer(serializers.ModelSerializer):
    post_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ["name", "slug", "description", "post_count"]


class PostListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    cover_image = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "slug",
            "title",
            "excerpt",
            "category",
            "tags",
            "city",
            "cover_image",
            "cover_image_alt",
            "author_name",
            "author_role",
            "author_slug",
            "published_at",
            "updated_at",
            "reading_minutes",
            "is_featured",
        ]

    def get_cover_image(self, obj):
        return obj.cover_image.url if obj.cover_image else None

    def get_author_name(self, obj):
        return obj.public_author_name


class PostDetailSerializer(PostListSerializer):
    class Meta(PostListSerializer.Meta):
        fields = PostListSerializer.Meta.fields + [
            "body",
            "faqs",
            "related_links",
            "meta_title",
            "meta_description",
        ]
