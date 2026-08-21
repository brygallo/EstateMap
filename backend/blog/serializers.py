from rest_framework import serializers

from .models import Category, Post, PostImage, SponsorKind

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
    # Advertising has to be disclosed where it is read, not only recorded in the
    # admin, so the label travels with every representation of the article.
    sponsor = serializers.SerializerMethodField()

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
            "sponsor",
        ]

    def get_cover_image(self, obj):
        return obj.cover_image.url if obj.cover_image else None

    def get_sponsor(self, obj):
        """Who this article serves, or null when it serves the reader."""
        if not obj.sponsor_id:
            return None
        return {
            "name": obj.sponsor.name,
            "slug": obj.sponsor.slug,
            "website": obj.sponsor.website,
            "kind": obj.sponsor_kind or SponsorKind.PARTNER,
            "paid": obj.sponsor_kind == SponsorKind.PAID,
        }

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


class AdminBlogCategorySerializer(serializers.ModelSerializer):
    post_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "order", "post_count"]


class AdminBlogPostSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    cover_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id", "title", "slug", "excerpt", "body", "category", "category_name",
            "tags", "city", "faqs", "related_links", "cover_image", "cover_image_url",
            "cover_image_alt", "author_name", "author_role", "status", "published_at",
            "is_featured", "meta_title", "meta_description", "reading_minutes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["reading_minutes", "created_at", "updated_at"]
        extra_kwargs = {"cover_image": {"write_only": True, "required": False}}

    def get_cover_image_url(self, obj):
        return obj.cover_image.url if obj.cover_image else None

    def validate(self, attrs):
        next_status = attrs.get("status", getattr(self.instance, "status", Post.Status.DRAFT))
        published_at = attrs.get("published_at", getattr(self.instance, "published_at", None))
        if next_status == Post.Status.SCHEDULED and published_at is None:
            raise serializers.ValidationError({"published_at": "Indica cuándo se publicará."})
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        validated_data.setdefault("author", request.user)
        validated_data.setdefault("author_name", request.user.get_full_name() or "")
        return super().create(validated_data)


class AdminBlogImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    markdown = serializers.CharField(read_only=True)

    class Meta:
        model = PostImage
        fields = ["id", "post", "image", "image_url", "alt", "caption", "credit", "markdown", "created_at"]
        read_only_fields = ["created_at"]
        extra_kwargs = {"image": {"write_only": True}}

    def get_image_url(self, obj):
        return obj.image.url if obj.image else None
