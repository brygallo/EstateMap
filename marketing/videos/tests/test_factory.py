import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import factory
import planner
import quality
import subtitles
import voice


def plan(**overrides):
    base = {
        "title": "Buscar por zona",
        "audience": "comprador",
        "funnel_stage": "descubrimiento",
        "objective": "Abrir el mapa",
        "conversion_event": "map_open",
        "pillar": "Mapa primero",
        "series": "Busca así, no así",
        "concept": "Contraste entre lista y mapa",
        "promise": "Ves dónde queda cada anuncio",
        "cta": "Explora el mapa",
        "hypothesis": "La tensión espacial retiene",
        "cover_text": "Busca por zona",
        "caption": "Busca por zona.",
        "music_prompt": "instrumental",
        "narration": "Te gusta el anuncio. Pero dónde queda. Explora el mapa.",
        "verification_notes": [],
        "scenes": [
            {"purpose": "gancho", "duration": 3, "voice": "Te gusta el anuncio.", "on_screen_text": "¿Dónde queda?",
             "asset": None, "visual_direction": "Mapa", "transition": "fade"},
            {"purpose": "prueba", "duration": 5, "voice": "Pero dónde queda.", "on_screen_text": "Busca por zona",
             "asset": None, "visual_direction": "Mapa", "transition": "cut"},
            {"purpose": "cta", "duration": 3, "voice": "Explora el mapa.", "on_screen_text": "Explora el mapa",
             "asset": None, "visual_direction": "Cierre", "transition": "cut"},
        ],
    }
    base.update(overrides)
    return base


class PlanSchemaTests(unittest.TestCase):
    def test_scene_purposes_are_a_closed_set(self):
        scene = planner.PLAN_SCHEMA["properties"]["scenes"]["items"]
        self.assertEqual(scene["properties"]["purpose"]["enum"], planner.PURPOSES)

    def test_headlines_are_capped_so_they_cannot_overflow_the_frame(self):
        scene = planner.PLAN_SCHEMA["properties"]["scenes"]["items"]
        self.assertEqual(scene["properties"]["on_screen_text"]["maxLength"], 28)


class CaptionTests(unittest.TestCase):
    def test_long_narration_splits_into_readable_groups(self):
        captions = voice.split_captions(
            "En Geo Propiedades Ecuador buscas sobre el mapa: acercas la zona que te interesa y comparas."
        )
        self.assertGreater(len(captions), 2)
        for caption in captions:
            self.assertLessEqual(len(caption), voice.MAX_CAPTION_CHARS + 8)

    def test_splitting_preserves_every_word(self):
        text = "Te gusta el anuncio, pero no sabes dónde queda exactamente."
        self.assertEqual(" ".join(voice.split_captions(text)).split(), text.split())

    def test_word_timings_cover_the_whole_caption(self):
        timings = voice.word_timings("Busca por zona", 1.5)
        self.assertEqual(len(timings), 3)
        self.assertAlmostEqual(timings[-1]["end"], 1.5, places=2)
        self.assertAlmostEqual(timings[0]["start"], 0.0, places=3)


class LintTests(unittest.TestCase):
    def setUp(self):
        self.directory = Path(__file__).resolve().parent
        self.catalog = {"videos": []}

    def lint(self, candidate, target=20):
        return quality.lint(candidate, self.directory, target, self.catalog, "video-001")

    def test_a_sound_plan_passes(self):
        self.assertTrue(self.lint(plan())["passed"])

    def test_a_headline_longer_than_five_words_fails(self):
        broken = plan()
        broken["scenes"][1]["on_screen_text"] = "Uno dos tres cuatro cinco seis"
        report = self.lint(broken)
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "headline_length" for item in report["findings"]))

    def test_forbidden_claims_are_rejected(self):
        broken = plan(narration="Publica y garantizamos que vendes rápido en una zona segura.")
        report = self.lint(broken)
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "forbidden_claim" for item in report["findings"]))

    def test_narration_longer_than_the_target_is_rejected_before_rendering(self):
        broken = plan()
        broken["scenes"][1]["voice"] = "Palabras de relleno para alargar la locución mucho más allá. " * 8
        report = self.lint(broken, target=15)
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "duration" for item in report["findings"]))

    def test_a_cta_from_another_audience_is_flagged(self):
        report = self.lint(plan(cta="Publica tu propiedad"))
        self.assertTrue(any(item["rule"] == "cta_family" for item in report["findings"]))

    def test_the_last_scene_must_be_the_cta(self):
        broken = plan()
        broken["scenes"][-1]["purpose"] = "prueba"
        self.assertFalse(self.lint(broken)["passed"])

    def test_a_repeated_hook_is_rejected(self):
        self.catalog = {"videos": [{"id": "video-000", "hook": "Te gusta el anuncio."}]}
        report = self.lint(plan())
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "repeated_hook" for item in report["findings"]))


class SubtitleTests(unittest.TestCase):
    def test_cues_are_offset_by_the_scenes_before_them(self):
        timings = [
            {"render_seconds": 2.0, "captions": [{"text": "Hola", "start": 0.0, "end": 1.5, "words": []}]},
            {"render_seconds": 2.0, "captions": [{"text": "Adiós", "start": 0.0, "end": 1.2, "words": []}]},
        ]
        target = Path(__file__).resolve().parent / "_subtitles.srt"
        subtitles.write_srt(timings, target)
        content = target.read_text(encoding="utf-8")
        target.unlink()
        self.assertIn("00:00:00,000 --> 00:00:01,500", content)
        self.assertIn("00:00:02,000 --> 00:00:03,200", content)


class CatalogTests(unittest.TestCase):
    def test_content_gap_counts_ignore_archived_videos(self):
        catalog = {
            "videos": [
                {"state": "reviewed", "audience": "propietario", "funnel_stage": "conversión", "pillar": "kit", "series": "demo"},
                {"state": "archived", "audience": "comprador", "funnel_stage": "descubrimiento", "pillar": "mapa", "series": "demo"},
            ]
        }
        gaps = factory.calculate_gaps(catalog)
        self.assertEqual(gaps["video_count"], 1)
        self.assertEqual(gaps["coverage"]["audience"], {"propietario": 1})

    def test_video_ids_are_stable_and_zero_padded(self):
        self.assertEqual(factory.video_id(7), "video-007")

    def test_package_names_are_ascii_and_readable(self):
        self.assertEqual(factory.slug("Kit social después de publicar", 3), "kit-social-despues")


if __name__ == "__main__":
    unittest.main()
