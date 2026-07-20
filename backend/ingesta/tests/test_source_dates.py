from ingesta.scrapers.base import extract_html_source_dates, parse_source_datetime


def test_extracts_schema_source_dates_from_html():
    html = '''
      <script type="application/ld+json">
        {"datePosted":"2026-05-10T14:30:00-05:00","dateModified":"2026-06-01"}
      </script>
    '''
    dates = extract_html_source_dates(html)
    assert dates["source_published_at"].isoformat() == "2026-05-10T14:30:00-05:00"
    assert dates["source_updated_at"].date().isoformat() == "2026-06-01"


def test_invalid_source_date_is_not_invented():
    assert parse_source_datetime("publicado recientemente") is None
