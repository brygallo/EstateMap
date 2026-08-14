import json
import os
import re
import sys
import tempfile
import unittest
import unittest.mock
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import catalog
import factory
import planner
import quality
import subtitles
import tts
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
        "narration": "Te gusta el anuncio. Pero dónde queda. Explora el mapa.",
        "verification_notes": [],
        "scenes": [
            {"purpose": "gancho", "duration": 3, "voice": "Te gusta el anuncio.", "on_screen_text": "¿Dónde queda?",
             "asset": "sim:mapa", "visual_direction": "Mapa", "transition": "fade"},
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

    def test_headlines_are_capped_so_they_fit_on_a_single_row(self):
        scene = planner.PLAN_SCHEMA["properties"]["scenes"]["items"]
        self.assertEqual(scene["properties"]["on_screen_text"]["maxLength"], 22)


class CaptionTests(unittest.TestCase):
    def test_long_narration_splits_into_readable_groups(self):
        captions = voice.split_captions(
            "En Geo Propiedades Ecuador buscas sobre el mapa: acercas la zona que te interesa y comparas."
        )
        self.assertGreater(len(captions), 2)
        for caption in captions:
            self.assertLessEqual(len(caption), voice.MAX_CAPTION_CHARS + 8)

    def test_a_caption_does_not_end_on_a_word_that_leans_forward(self):
        captions = voice.split_captions(
            "La pregunta que nadie me contestaba era la más simple de todas, y el mapa no te dice si te conviene."
        )
        for caption in captions[:-1]:
            last = caption.split()[-1].strip(".,;:!?¿¡…").lower()
            self.assertNotIn(last, voice.TRAILING_BINDERS, f"«{caption}» corta antes de la palabra que sostiene")

    def test_splitting_preserves_every_word(self):
        text = "Te gusta el anuncio, pero no sabes dónde queda exactamente."
        self.assertEqual(" ".join(voice.split_captions(text)).split(), text.split())

    def test_word_timings_cover_the_whole_caption(self):
        timings = voice.word_timings("Busca por zona", 1.5)
        self.assertEqual(len(timings), 3)
        self.assertAlmostEqual(timings[-1]["end"], 1.5, places=2)
        self.assertAlmostEqual(timings[0]["start"], 0.0, places=3)

    def test_scene_is_synthesised_as_one_take_even_when_captions_split(self):
        text = "Mira fotos, precio y detalles de cada propiedad."
        provider = unittest.mock.Mock()
        source = Path("/tmp/complete-take.mp3")
        target = Path("/tmp/scene-take.mp3")
        with unittest.mock.patch.object(voice, "synthesize", return_value=[source]) as synthesise:
            with unittest.mock.patch.object(voice.media, "probe_duration", return_value=3.0):
                with unittest.mock.patch.object(voice.shutil, "copy2"):
                    timeline = voice.speak_scene(text, target, provider)

        synthesise.assert_called_once_with([text], provider)
        self.assertGreater(len(timeline), 1)
        self.assertEqual(timeline[0]["start"], 0.0)
        self.assertEqual(timeline[-1]["end"], 3.0)
        self.assertTrue(all(left["end"] == right["start"] for left, right in zip(timeline, timeline[1:])))


class PaidVoiceCacheTests(unittest.TestCase):
    """A paid clip must be bought once and only once per unchanged script."""

    def setUp(self):
        self.paid = tts.ElevenLabsVoice()
        environment = unittest.mock.patch.dict(os.environ, {"ELEVENLABS_VOICE_ID": "voice-abc"})
        environment.start()
        self.addCleanup(environment.stop)

    def test_identical_text_maps_to_one_clip(self):
        self.assertEqual(voice.cache_key("Busca por zona", self.paid), voice.cache_key("Busca por zona", self.paid))

    def test_editing_the_script_buys_a_new_clip(self):
        self.assertNotEqual(voice.cache_key("Busca por zona", self.paid), voice.cache_key("Busca por barrio", self.paid))

    def test_another_providers_settings_cannot_invalidate_paid_clips(self):
        before = voice.cache_key("Busca por zona", self.paid)
        with unittest.mock.patch.dict(os.environ, {"KOKORO_SPEED": "9.9", "LOCAL_VOICE": "Otra"}):
            self.assertEqual(voice.cache_key("Busca por zona", self.paid), before)

    def test_changing_the_paid_voice_does_buy_a_new_clip(self):
        before = voice.cache_key("Busca por zona", self.paid)
        with unittest.mock.patch.dict(os.environ, {"ELEVENLABS_VOICE_ID": "voice-xyz"}):
            self.assertNotEqual(voice.cache_key("Busca por zona", self.paid), before)

    def test_every_provider_signs_its_cache_differently(self):
        signatures = {tts.build(name).signature() for name in tts.PROVIDERS}
        self.assertEqual(len(signatures), len(tts.PROVIDERS))

    def test_a_repeated_caption_is_quoted_once(self):
        report = voice.quote(["Busca por zona", "Busca por zona", "Compara"], self.paid)
        self.assertEqual(report["captions"], 2)
        self.assertEqual(report["billable_characters"], len("Busca por zona") + len("Compara"))

    def test_a_free_provider_never_reports_a_cost(self):
        report = voice.quote(["Busca por zona"], tts.KokoroVoice())
        self.assertEqual(report["billable_characters"], 0)

    def test_an_oversized_script_is_refused_before_spending(self):
        with unittest.mock.patch.dict(os.environ, {"ELEVENLABS_MAX_CHARS_PER_RUN": "10", "ELEVENLABS_API_KEY": "k"}):
            with unittest.mock.patch.object(self.paid, "buy") as purchase:
                with self.assertRaises(RuntimeError):
                    self.paid.synthesize([tts.Clip("Una narración más larga que el tope", Path("/tmp/x.mp3"))])
                purchase.assert_not_called()


class DraftVersusFinalVoiceTests(unittest.TestCase):
    """Iterating on a script is free; only an explicit master is bought."""

    def test_the_draft_voice_is_free(self):
        self.assertFalse(tts.draft().paid)

    def test_the_draft_voice_ignores_the_paid_settings(self):
        with unittest.mock.patch.dict(os.environ, {"ELEVENLABS_VOICE_ID": "voice-abc"}):
            self.assertEqual(tts.draft().name, "kokoro")

    def test_a_final_master_uses_the_paid_voice(self):
        self.assertTrue(tts.final().paid)

    def test_a_final_master_without_a_key_stops_before_rendering(self):
        with unittest.mock.patch.dict(os.environ, {"ELEVENLABS_VOICE_ID": "voice-abc"}):
            os.environ.pop("ELEVENLABS_API_KEY", None)
            with self.assertRaises(RuntimeError):
                tts.final().check_ready()

    def test_an_unknown_provider_is_named_in_the_error(self):
        with self.assertRaises(RuntimeError) as caught:
            tts.build("robot")
        self.assertIn("robot", str(caught.exception))

    def test_env_file_does_not_override_the_real_environment(self):
        with tempfile.NamedTemporaryFile("w", suffix=".env", delete=False, encoding="utf-8") as handle:
            handle.write('# comment\nELEVENLABS_VOICE_ID="from-file"\nNEW_FACTORY_SETTING=set\n')
            path = Path(handle.name)
        self.addCleanup(path.unlink)
        with unittest.mock.patch.dict(os.environ, {"ELEVENLABS_VOICE_ID": "from-shell"}):
            voice.load_env(path)
            self.assertEqual(os.environ["ELEVENLABS_VOICE_ID"], "from-shell")
            self.assertEqual(os.environ["NEW_FACTORY_SETTING"], "set")
        os.environ.pop("NEW_FACTORY_SETTING", None)


class MusicTests(unittest.TestCase):
    def test_a_track_without_author_and_license_proof_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            track = Path(directory) / "track.mp3"
            track.touch()
            with self.assertRaises(RuntimeError):
                factory.music_license(track)

    def test_a_free_commercial_track_with_an_author_is_accepted(self):
        with tempfile.TemporaryDirectory() as directory:
            track = Path(directory) / "track.mp3"
            track.touch()
            track.with_suffix(".mp3.license.json").write_text(json.dumps({
                "title": "Track",
                "author": "Author",
                "source_url": "https://example.com/track",
                "license": "Free commercial licence",
                "commercial_use": True,
                "paid": False,
            }), encoding="utf-8")
            self.assertEqual(factory.music_license(track)["author"], "Author")


class SpendConsentTests(unittest.TestCase):
    """Silence is not a yes: an unattended run must not be able to buy."""

    def test_no_terminal_and_no_flag_refuses(self):
        with unittest.mock.patch.object(sys.stdin, "isatty", return_value=False):
            with self.assertRaises(RuntimeError):
                factory.agree_to_spend("Buy them?", assumed=False)

    def test_the_flag_is_consent_given_in_advance(self):
        with unittest.mock.patch.object(sys.stdin, "isatty", return_value=False):
            factory.agree_to_spend("Buy them?", assumed=True)

    def test_a_person_can_still_say_no(self):
        with unittest.mock.patch.object(sys.stdin, "isatty", return_value=True):
            with unittest.mock.patch("builtins.input", return_value="n"):
                with self.assertRaises(RuntimeError):
                    factory.agree_to_spend("Buy them?", assumed=False)

    def test_a_person_can_say_yes_in_spanish(self):
        with unittest.mock.patch.object(sys.stdin, "isatty", return_value=True):
            with unittest.mock.patch("builtins.input", return_value="sí"):
                factory.agree_to_spend("Buy them?", assumed=False)


class LintTests(unittest.TestCase):
    def setUp(self):
        self.directory = Path(__file__).resolve().parent
        self.catalog = {"videos": []}

    def lint(self, candidate, target=20):
        return quality.lint(candidate, self.directory, target, self.catalog, "video-001")

    def test_a_sound_plan_passes(self):
        self.assertTrue(self.lint(plan())["passed"])

    def test_a_headline_longer_than_four_words_fails(self):
        broken = plan()
        broken["scenes"][1]["on_screen_text"] = "Uno dos tres cuatro cinco"
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

    def test_more_than_five_scenes_are_rejected_in_short_form(self):
        broken = plan()
        broken["scenes"] = broken["scenes"][:1] + [broken["scenes"][1]] * 4 + broken["scenes"][-1:]
        report = self.lint(broken)
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "scene_count" for item in report["findings"]))

    def test_a_story_may_use_more_scenes_than_short_form(self):
        long_form = plan()
        long_form["scenes"] = long_form["scenes"][:1] + [long_form["scenes"][1]] * 7 + long_form["scenes"][-1:]
        report = self.lint(long_form, target=90)
        self.assertFalse(any(item["rule"] == "scene_count" for item in report["findings"]))

    def test_a_story_still_has_a_scene_ceiling(self):
        broken = plan()
        broken["scenes"] = broken["scenes"][:1] + [broken["scenes"][1]] * 9 + broken["scenes"][-1:]
        report = self.lint(broken, target=90)
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "scene_count" for item in report["findings"]))

    def test_an_unimplemented_ai_animation_is_rejected_before_rendering(self):
        broken = plan()
        broken["scenes"][1]["asset"] = "sim:inventada"
        report = self.lint(broken)
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "animation_missing" for item in report["findings"]))

    def test_a_buyer_video_must_reveal_the_product_by_second_three(self):
        broken = plan()
        broken["scenes"][0]["duration"] = 4
        broken["scenes"][0]["asset"] = "sim:anuncios"
        broken["scenes"][1]["asset"] = "sim:mapa"
        report = self.lint(broken)
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "product_reveal" for item in report["findings"]))

    def test_a_story_may_set_the_scene_before_showing_the_product(self):
        story = plan()
        story["scenes"][0]["duration"] = 8
        story["scenes"][0]["asset"] = "sim:anuncios"
        story["scenes"][1]["asset"] = "sim:mapa"
        report = self.lint(story, target=90)
        self.assertFalse(any(item["rule"] == "product_reveal" for item in report["findings"]))

    def test_a_story_cannot_hold_the_product_back_for_ever(self):
        broken = plan()
        broken["scenes"][0]["duration"] = 11
        broken["scenes"][0]["asset"] = "sim:anuncios"
        broken["scenes"][1]["asset"] = "sim:mapa"
        report = self.lint(broken, target=90)
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "product_reveal" for item in report["findings"]))

    def test_a_teaching_piece_may_hold_the_product_until_the_end(self):
        lesson = plan(pillar="Educación inmobiliaria")
        lesson["scenes"][0]["duration"] = 40
        lesson["scenes"][0]["asset"] = "sim:anuncios"
        lesson["scenes"][1]["asset"] = "sim:mapa"
        report = self.lint(lesson, target=90)
        self.assertFalse(any(item["rule"] == "product_reveal" for item in report["findings"]))

    def test_a_teaching_piece_still_has_to_reach_the_product(self):
        broken = plan(pillar="Educación inmobiliaria")
        for scene in broken["scenes"]:
            scene["asset"] = "sim:anuncios"
        report = self.lint(broken, target=90)
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "product_reveal" for item in report["findings"]))

    def test_buyer_copy_cannot_switch_to_the_owner_audience(self):
        broken = plan(caption="Explora el mapa. Publica tu propiedad gratis.")
        report = self.lint(broken)
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "audience_focus" for item in report["findings"]))

    def test_buyer_copy_may_name_the_person_who_published_the_listing(self):
        sound = plan(narration="Escribes directo a quien publica el anuncio y preguntas lo que necesites.")
        report = self.lint(sound)
        self.assertFalse(any(item["rule"] == "audience_focus" for item in report["findings"]))

    def test_buyer_cta_is_the_canonical_map_action(self):
        report = self.lint(plan(cta="Busca dónde vivir"))
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "cta_family" for item in report["findings"]))

    def test_a_hand_edited_plan_with_null_fields_reports_instead_of_crashing(self):
        broken = plan()
        broken["narration"] = None
        broken["cover_text"] = None
        broken["scenes"][0]["voice"] = None
        broken["scenes"][1]["on_screen_text"] = None
        report = self.lint(broken)
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "voice_empty" for item in report["findings"]))

    def test_a_scene_without_narration_is_caught_before_rendering(self):
        broken = plan()
        broken["scenes"][1]["voice"] = "   "
        report = self.lint(broken)
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "voice_empty" for item in report["findings"]))

    def test_authorisation_notes_must_name_the_clip_they_clear(self):
        generic = ["Esta pieza no requiere autorización de ningún anunciante."]
        specific = ["casas-en-venta: autorización del anunciante archivada el 2026-08-12."]
        self.assertFalse(quality.authorized("casas-en-venta.mp4", generic))
        self.assertTrue(quality.authorized("casas-en-venta.mp4", specific))

    def test_a_repeated_hook_is_rejected(self):
        self.catalog = {"videos": [{"id": "video-000", "hook": "Te gusta el anuncio."}]}
        report = self.lint(plan())
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "repeated_hook" for item in report["findings"]))


class AnimationRegistryTests(unittest.TestCase):
    """An animation exists only when both halves of the factory know about it.

    The linter trusts the Python registry, and the renderer draws from the
    Remotion one. If either side is edited alone, a plan passes quality control
    and then renders a blank stage, or a working animation stays unreachable.
    """

    def remotion_animations(self):
        import re

        source = (Path(__file__).resolve().parents[1] / "remotion/src/simulations.tsx").read_text(encoding="utf-8")
        block = source.split("export const SIMULATIONS")[1]
        return set(re.findall(r"'(sim:[a-z-]+)'", block))

    def test_both_registries_describe_the_same_animations(self):
        import renderer

        self.assertEqual(set(renderer.SIMULATIONS), self.remotion_animations())

    def test_every_animation_the_linter_calls_product_is_implemented(self):
        import renderer

        self.assertTrue(quality.PRODUCT_ASSETS <= set(renderer.SIMULATIONS))


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
        self.assertEqual(catalog.video_id(7), "video-007")

    def test_package_names_are_ascii_and_readable(self):
        self.assertEqual(factory.slug("Kit social después de publicar", 3), "kit-social-despues")


class SafeAreaTests(unittest.TestCase):
    """The side crop is the one measurement a phone enforces and the canvas cannot show.

    TikTok scales a 1080 x 1920 upload to the screen height, so a screen taller
    than 16:9 hides whole columns of the canvas. Every check here failed on
    video-003, which shipped with the domain pill reading "opropiedadesecuador.com".
    """

    RENDERER = Path(__file__).resolve().parents[1] / "remotion/src"

    def hidden_margin(self, ratio: float) -> float:
        """Canvas pixels hidden on each side of a 1080 x 1920 export."""
        return (1080 - 1920 / ratio) / 2

    def side_crop(self) -> int:
        source = (self.RENDERER / "theme.ts").read_text(encoding="utf-8")
        match = re.search(r"export const sideCrop = (\d+)", source)
        self.assertIsNotNone(match, "theme.ts must state the side crop as a number")
        return int(match.group(1))

    def test_side_crop_covers_the_tallest_common_phone(self):
        # 19.5:9 covers iPhone X and later; 20:9 covers the taller Android range.
        self.assertGreaterEqual(self.side_crop(), self.hidden_margin(19.5 / 9))
        self.assertGreaterEqual(self.side_crop(), self.hidden_margin(20 / 9))

    def test_text_margin_is_the_side_crop(self):
        source = (self.RENDERER / "theme.ts").read_text(encoding="utf-8")
        self.assertRegex(
            source,
            r"left: sideCrop",
            "safe.left must derive from sideCrop, or headlines start inside the hidden margin",
        )

    def test_brand_block_stays_inside_the_visible_canvas(self):
        source = (self.RENDERER / "scene.tsx").read_text(encoding="utf-8")
        for anchor in re.findall(r"(?:left|right): (\d+),\n\s+top: safe\.top", source):
            self.assertGreaterEqual(
                int(anchor),
                self.side_crop(),
                "the domain pill and the brand tile must not be anchored inside the side crop",
            )


if __name__ == "__main__":
    unittest.main()
