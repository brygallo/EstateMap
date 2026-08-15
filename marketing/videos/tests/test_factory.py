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
import extensions
import planner
import quality
import review_tools
import subtitles
import tts
import voice
import workflow


class SharedAgentContractTests(unittest.TestCase):
    """Claude, Codex and the planner must load the same video council contract."""

    ROOT = Path(__file__).resolve().parents[1]

    def test_claude_and_codex_reference_the_same_contract_version(self):
        marker = "CONTRACT: VIDEO_COUNCIL_V1"
        for filename in ("CLAUDE.md", "AGENTS.md", "council.md"):
            self.assertIn(marker, (self.ROOT / filename).read_text(encoding="utf-8"), filename)

    def test_the_planner_loads_every_shared_contract(self):
        required = {"CLAUDE.md", "AGENTS.md", "council.md", "animation-standard.md"}
        self.assertTrue(required.issubset(set(planner.CONTEXT_FILES)))

    def test_codex_is_explicitly_bound_to_the_full_video_contract(self):
        contract = (self.ROOT / "AGENTS.md").read_text(encoding="utf-8")
        self.assertIn("`CLAUDE.md` es normativo también para Codex", contract)


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
    def test_header_only_audio_is_rejected_before_cache_reuse(self):
        """SPEC:VFACT-012"""
        with tempfile.TemporaryDirectory() as temporary:
            clip = Path(temporary) / "broken.mp3"
            clip.write_bytes(b"ID3")
            with unittest.mock.patch.object(tts.media, "probe_duration", side_effect=RuntimeError("invalid")):
                self.assertFalse(tts.AudioClipValidator.is_valid(clip))

    def test_macos_voice_cleans_an_invalid_aiff(self):
        """SPEC:VFACT-012"""
        with tempfile.TemporaryDirectory() as temporary:
            target = Path(temporary) / "voice.mp3"
            provider = tts.MacOSVoice()
            with unittest.mock.patch.object(tts.media, "run"):
                with unittest.mock.patch.object(tts.AudioClipValidator, "require", side_effect=RuntimeError("silent")):
                    with self.assertRaises(RuntimeError):
                        provider.synthesize([tts.Clip("Hola", target)])
            self.assertFalse(target.with_suffix(".aiff").exists())

    """Iterating on a script is free; only an explicit master is bought."""

    def test_the_draft_voice_is_free(self):
        self.assertFalse(tts.draft().paid)

    def test_the_draft_voice_ignores_the_paid_settings(self):
        with unittest.mock.patch.dict(os.environ, {"ELEVENLABS_VOICE_ID": "voice-abc"}):
            self.assertEqual(tts.draft().name, "kokoro")

    def test_a_final_master_uses_the_paid_voice(self):
        self.assertTrue(tts.final().paid)

    def test_a_named_profile_resolves_its_provider_and_settings(self):
        provider = tts.build("draft-dora")
        self.assertEqual(provider.name, "kokoro")
        self.assertEqual(provider.profile_id, "draft-dora")
        self.assertEqual(provider.settings()["voice"], "ef_dora")

    def test_a_paid_profile_cannot_be_used_for_a_draft(self):
        with self.assertRaises(RuntimeError):
            tts.select("final-main", final_master=False)

    def test_the_old_provider_variable_still_picks_the_draft_voice(self):
        """`DRAFT_TTS_PROVIDER=macos` is the documented Kokoro fallback and has to keep working."""
        with unittest.mock.patch.dict(os.environ, {"DRAFT_TTS_PROVIDER": "macos"}):
            os.environ.pop("DRAFT_VOICE_PROFILE", None)
            provider = tts.select(None, final_master=False)
        self.assertEqual(provider.name, "macos")
        self.assertEqual(provider.profile_id, "draft-paulina")

    def test_the_old_variable_does_not_downgrade_a_matching_profile(self):
        """`DRAFT_TTS_PROVIDER=kokoro` names the provider the default already uses."""
        with unittest.mock.patch.dict(os.environ, {"DRAFT_TTS_PROVIDER": "kokoro"}):
            os.environ.pop("DRAFT_VOICE_PROFILE", None)
            self.assertEqual(tts.select(None, final_master=False).profile_id, "draft-dora")

    def test_the_new_variable_wins_over_the_old_one(self):
        with unittest.mock.patch.dict(os.environ, {
            "DRAFT_TTS_PROVIDER": "macos",
            "DRAFT_VOICE_PROFILE": "draft-dora",
        }):
            self.assertEqual(tts.select(None, final_master=False).profile_id, "draft-dora")

    def test_a_plan_profile_wins_over_both_variables(self):
        with unittest.mock.patch.dict(os.environ, {
            "DRAFT_TTS_PROVIDER": "macos",
            "DRAFT_VOICE_PROFILE": "draft-paulina",
        }):
            self.assertEqual(tts.select("draft-dora", final_master=False).profile_id, "draft-dora")

    def test_every_scene_uses_the_video_profile(self):
        candidate = plan(voice_profile="draft-dora")
        candidate["scenes"][1]["voice_profile"] = "draft-paulina"
        providers = factory.scene_providers(candidate, final_master=False)
        self.assertEqual({provider.profile_id for provider in providers}, {"draft-dora"})

    def test_a_cli_profile_override_applies_to_every_scene(self):
        candidate = plan(voice_profile="draft-dora")
        candidate["scenes"][1]["voice_profile"] = "draft-paulina"
        providers = factory.scene_providers(candidate, final_master=False, override="draft-paulina")
        self.assertEqual({provider.profile_id for provider in providers}, {"draft-paulina"})

    def test_a_final_voice_lock_rejects_another_profile(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            first = tts.build("voice-01")
            factory.enforce_voice_lock(target, first)
            factory.enforce_voice_lock(target, first)
            with self.assertRaises(RuntimeError):
                factory.enforce_voice_lock(target, tts.build("voice-02"))

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

    def test_an_invented_voice_profile_is_caught_before_approval(self):
        report = self.lint(plan(voice_profile="voz-que-no-existe"))
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "voice_profile_unknown" for item in report["findings"]))

    def test_a_known_voice_profile_passes(self):
        self.assertTrue(self.lint(plan(voice_profile="draft-dora"))["passed"])

    def test_a_paid_voice_profile_warns_that_drafts_refuse_it(self):
        report = self.lint(plan(voice_profile="final-main"))
        self.assertTrue(report["passed"])
        self.assertTrue(any(item["rule"] == "voice_profile_paid" for item in report["findings"]))

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

    def test_listing_gallery_freezes_after_the_fourth_photo(self):
        source = (Path(__file__).resolve().parents[1] / "remotion/src/simulations.tsx").read_text(encoding="utf-8")
        self.assertIn("const shotPhase = shotClock >= 4 ? 1", source)


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


class VideoWorkflowTests(unittest.TestCase):
    def test_two_renders_cannot_own_the_same_video(self):
        """SPEC:VFACT-013"""
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            with workflow.RenderLock(directory):
                with self.assertRaises(RuntimeError):
                    with workflow.RenderLock(directory):
                        self.fail("A second render acquired the same video")

    def test_an_explicit_denial_is_not_a_forbidden_claim(self):
        statement = "Un mapa no dice si una zona es rentable."
        self.assertTrue(workflow.ForbiddenClaimPolicy.is_explicitly_negated(statement, "rentable"))
        claims = quality.check_claims({"narration": statement, "verification_notes": []})
        self.assertNotIn("forbidden_claim", {finding["rule"] for finding in claims})

    def test_published_and_learned_states_cannot_regress(self):
        """SPEC:VFACT-001 SPEC:VFACT-004"""
        for state in ("published", "learned"):
            item = {"state": state}
            with unittest.mock.patch.object(catalog, "save"):
                with self.assertRaises(RuntimeError):
                    catalog.update(item, {"videos": [item]}, "reviewed")
            self.assertEqual(item["state"], state)

    def test_results_contract_requires_a_declared_numeric_metric(self):
        """SPEC:VFACT-002"""
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "results.csv"
            path.write_text(
                ",".join(workflow.ResultsTable.FIELDS) + "\n"
                "tiktok,2026-08-14T12:00:00-05:00,24,500,300,100,20,10,4,3,1,views_3s,iterate,Test another hook\n",
                encoding="utf-8",
            )
            rows = workflow.ResultsTable.read(path)
        self.assertEqual(workflow.ResultsTable.total(rows, "views_3s"), 300)

    def test_publication_sync_is_idempotent_and_preserves_learned(self):
        """SPEC:VFACT-003 SPEC:VFACT-008"""
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "sync.json"
            source.write_text(json.dumps([{
                "video": "video-001", "platform": "tiktok",
                "published_at": "2026-08-14T12:00:00-05:00", "url": "https://example.test/1",
            }]), encoding="utf-8")
            item = {"id": "video-001", "state": "learned"}
            state = {"version": 1, "videos": [item]}
            synchronizer = extensions.PublicationSynchronizer(root)
            with unittest.mock.patch.object(catalog, "load", return_value=state):
                with unittest.mock.patch.object(catalog, "save"):
                    first = synchronizer.execute(source)
                    second = synchronizer.execute(source)
        self.assertEqual(first["updated"], ["video-001"])
        self.assertEqual(second["updated"], ["video-001"])
        self.assertEqual(item["state"], "learned")

    def test_experiment_needs_two_arms_with_enough_views(self):
        """SPEC:VFACT-010"""
        entries = [
            {"video": "video-001", "value": 40, "views": 120},
            {"video": "video-002", "value": 30, "views": 80},
        ]
        decision = workflow.ExperimentDecision.build(entries, "views_3s", 100)
        self.assertEqual(decision["status"], "inconclusive")
        entries[1]["views"] = 120
        decision = workflow.ExperimentDecision.build(entries, "views_3s", 100)
        self.assertEqual(decision["winner"], "video-001")

    def test_long_education_is_not_mislabeled_as_a_story(self):
        """SPEC:VFACT-011"""
        self.assertEqual(
            workflow.EditorialFormat.classify({"pillar": "Educación inmobiliaria"}, 80),
            "education",
        )

    def test_registered_asset_cannot_be_described_as_missing(self):
        """SPEC:VFACT-009"""
        sample = plan(verification_notes=["sim:mapa todavía no existe"])
        findings = workflow.PlanConsistencyAudit.findings(sample, {"sim:mapa"})
        self.assertEqual(findings[0]["rule"], "asset_note_consistency")


class ReviewWorkflowTests(unittest.TestCase):
    def test_reapproval_metadata_comes_from_the_current_plan(self):
        """SPEC:VFACT-004"""
        sample = plan(title="Current title", pillar="Educación inmobiliaria")
        metadata = workflow.PlanCatalogMetadata.build(sample, 27)
        self.assertEqual(metadata["title"], "Current title")
        self.assertEqual(metadata["pillar"], "Educación inmobiliaria")
        self.assertEqual(metadata["hook"], sample["scenes"][0]["voice"])

    def test_a_corrected_reviewed_draft_can_be_reapproved(self):
        """SPEC:VFACT-004"""
        workflow.ApprovalPolicy.require_approvable("reviewed")

    def test_a_published_video_cannot_be_reapproved(self):
        """SPEC:VFACT-004"""
        with self.assertRaises(RuntimeError):
            workflow.ApprovalPolicy.require_approvable("published")

    def test_text_gate_does_not_claim_eighteen_pixels_meets_a_twenty_two_pixel_floor(self):
        """SPEC:VFACT-005"""
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "remotion/src"
            source.mkdir(parents=True)
            (source / "scene.tsx").write_text("fontSize: 22", encoding="utf-8")
            (source / "simulations.tsx").write_text("fontSize: 18", encoding="utf-8")
            report = review_tools.TextLegibilityAudit(root).report()
        self.assertTrue(report["passed"])
        self.assertEqual(report["editorial_minimum_literal_px"], 22)
        self.assertEqual(report["simulation_minimum_literal_px"], 18)
        self.assertEqual(report["simulation_small_literal_count"], 1)

    def test_global_cta_is_not_reported_as_an_empty_scene(self):
        """SPEC:VFACT-005"""
        sample = plan(scenes=[{
            "purpose": "cta",
            "duration": 4,
            "asset": None,
            "visual_direction": "Global branded outro",
        }])
        timings = [{"render_seconds": 4.0}]
        self.assertEqual(review_tools.MotionAudit.warnings(sample, timings), [])

    def test_long_non_cta_scene_without_an_asset_is_reported(self):
        """SPEC:VFACT-005"""
        sample = plan(scenes=[{
            "purpose": "prueba",
            "duration": 4,
            "asset": None,
            "visual_direction": "No visual resource",
        }])
        timings = [{"render_seconds": 4.0}]
        self.assertEqual(
            review_tools.MotionAudit.warnings(sample, timings),
            ["Scene 1 has no visual asset for 4.0 seconds"],
        )

    def test_preview_writes_outside_canonical_exports(self):
        """SPEC:VFACT-006"""
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary) / "video-001"
            directory.mkdir()
            catalog.write_json(directory / "render-props.json", {
                "scenes": [{"durationInFrames": 30}], "musicFile": None, "showSafeAreas": False,
            })
            renderer = extensions.ScenePreviewRenderer()
            with unittest.mock.patch.object(catalog, "find", return_value=(directory, {"id": "video-001"}, {})):
                with unittest.mock.patch.object(extensions.renderer, "render_video", side_effect=lambda props, target: target):
                    target = renderer.execute("video-001", 1, True)
        self.assertEqual(target.parts[-2:], ("previews", "scene-01.mp4"))

    def test_review_page_has_video_controls_and_a_skip_link(self):
        """SPEC:VFACT-005"""
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            page = review_tools.ReviewPage(directory).write(
                {"id": "video-001", "state": "reviewed"},
                {"title": "Review me"},
                {"measured_duration_seconds": 20, "checks": {"master": True}},
            )
            content = page.read_text(encoding="utf-8")
        self.assertIn("<video controls", content)
        self.assertIn('class="skip"', content)


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


class CoverArtTests(unittest.TestCase):
    """A cover_art with no branch in cover.tsx falls back silently.

    Video-010 asked for "terreno" and shipped a house, a price and a lot area
    on the thumbnail of a piece about flats. Nothing downstream could catch it:
    the fallback is a legitimate path for plans that name no illustration.
    """

    def test_the_implemented_branches_are_readable(self):
        self.assertIn("departamento", quality.cover_art_branches())

    def test_an_unimplemented_cover_art_is_an_error(self):
        findings = quality.check_cover_art({"cover_art": "no-existe-esta-portada"})
        self.assertEqual([f["rule"] for f in findings], ["cover_art_missing"])

    def test_an_implemented_cover_art_passes(self):
        self.assertEqual(quality.check_cover_art({"cover_art": "departamento"}), [])

    def test_no_cover_art_is_allowed(self):
        self.assertEqual(quality.check_cover_art({}), [])


class AtomicPhraseTests(unittest.TestCase):
    """The brand is the last thing every piece says; it cannot break in half.

    Video-010 ended on "Encuentra tu futuro hogar en Geo" / "Propiedades
    Ecuador", which reads as two companies for as long as the caption holds.
    """

    def caption_holding(self, text: str, phrase: str) -> str:
        for caption in voice.split_captions(text):
            if phrase.split()[0] in caption:
                return caption
        self.fail(f"no caption contains {phrase}")

    def test_brand_survives_the_closing_line(self):
        held = self.caption_holding(
            "Ve a verlo sabiendo qué preguntar. Encuentra tu futuro hogar en Geo Propiedades Ecuador.",
            "Geo Propiedades Ecuador",
        )
        self.assertIn("Geo Propiedades Ecuador", held)

    def test_brand_survives_mid_sentence(self):
        held = self.caption_holding(
            "Eso sí lo ves antes de ir: en Geo Propiedades Ecuador las propiedades están sobre el mapa.",
            "Geo Propiedades Ecuador",
        )
        self.assertIn("Geo Propiedades Ecuador", held)

    def test_the_binder_never_reaches_a_caption(self):
        captions = voice.split_captions("Encuentra tu futuro hogar en Geo Propiedades Ecuador.")
        self.assertFalse(any(voice.BINDER in caption for caption in captions))


class ExampleFigureTests(unittest.TestCase):
    """An example price teaches a calculation; a market figure claims a fact.

    The council once blocked `sim:dividir` for painting $122.000 and 400 m2,
    reading "no animation invents figures" as a ban on every number. The rule
    bans claims about the market or the platform, and explicitly allows the
    price and features of one illustrative listing. These checks pin the line
    the linter has always drawn so the prose cannot drift away from it again.
    """

    def claims(self, narration: str, notes: list[str] | None = None) -> list[str]:
        plan = {"narration": narration, "verification_notes": notes or []}
        return [f["rule"] for f in quality.check_claims(plan)]

    def test_example_price_and_area_are_not_findings(self):
        rules = self.claims("Divide el precio para los metros: $122.000 entre 400 m2.")
        self.assertNotIn("unsourced_number", rules)

    def test_market_percentage_needs_a_source(self):
        rules = self.claims("El 3,4 % de las casas de Quito se vende en un mes.")
        self.assertIn("unsourced_number", rules)

    def test_platform_count_needs_a_source(self):
        rules = self.claims("Hay 8719 propiedades publicadas en Quito.")
        self.assertIn("unsourced_number", rules)

    def test_a_sourced_count_passes(self):
        rules = self.claims(
            "Hay 8719 propiedades publicadas en Quito.",
            ["8719 propiedades: conteo del panel el 2026-08-14"],
        )
        self.assertNotIn("unsourced_number", rules)


if __name__ == "__main__":
    unittest.main()
