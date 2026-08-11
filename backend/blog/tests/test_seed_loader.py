"""Regression tests for seed data used by historical migrations."""

from types import SimpleNamespace

from blog.seed_loader import fields_available_on


def test_seed_fields_are_limited_to_the_historical_model_schema():
    """A newer seed loader must remain usable by older data migrations."""
    historical_post = SimpleNamespace(
        _meta=SimpleNamespace(
            get_fields=lambda: [
                SimpleNamespace(name="title", concrete=True),
                SimpleNamespace(name="body", concrete=True),
                SimpleNamespace(name="category", concrete=False),
            ]
        )
    )

    result = fields_available_on(
        historical_post,
        {"title": "Guide", "body": "Text", "city": "Quito"},
    )

    assert result == {"title": "Guide", "body": "Text"}
