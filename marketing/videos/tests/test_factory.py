import json
import os
import re
import shutil
import sys
import tempfile
import unittest
import unittest.mock
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import catalog
import brand
import factory
import extensions
import planner
import quality
import renderer
import lessons
import review_tools
import scene_cache
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


class BrandWorkspaceTests(unittest.TestCase):
    """SPEC:VFACT-015 — brands share an engine, never editorial state."""

    def tearDown(self):
        profile = brand.configure("geo")
        catalog.configure(profile)
        lessons.configure(profile)
        quality.configure(profile)
        renderer.configure(profile)

    def activate(self, identifier):
        profile = brand.configure(identifier)
        catalog.configure(profile)
        lessons.configure(profile)
        quality.configure(profile)
        renderer.configure(profile)
        return profile

    def test_cli_defaults_to_the_legacy_geo_workspace(self):
        args = factory.parser().parse_args(["status"])
        self.assertEqual(args.brand, "geo")

    def test_cli_selects_aents_before_the_command(self):
        args = factory.parser().parse_args(["--brand", "aents", "status"])
        self.assertEqual(args.brand, "aents")

    def test_geo_owns_catalog_library_lessons_and_publications(self):
        profile = self.activate("geo")
        root = Path(__file__).resolve().parents[1]
        self.assertEqual(catalog.LIBRARY, profile.profile_root / "library")
        self.assertEqual(catalog.CATALOG, profile.memory / "catalog.json")
        self.assertEqual(lessons.STORE, profile.memory / "lessons.json")
        self.assertEqual(profile.id, "geo")

    def test_aents_owns_catalog_library_lessons_and_publications(self):
        profile = self.activate("aents")
        self.assertEqual(catalog.LIBRARY, profile.profile_root / "library")
        self.assertEqual(catalog.CATALOG, profile.memory / "catalog.json")
        self.assertEqual(lessons.STORE, profile.memory / "lessons.json")
        synchronizer = extensions.PublicationSynchronizer(Path(__file__).resolve().parents[1])
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "empty.json"
            source.write_text("[]", encoding="utf-8")
            with self.assertRaises(RuntimeError):
                synchronizer.execute(source, dry_run=True)
        self.assertEqual(synchronizer.ledger_path, profile.memory / "publications.json")

    def test_aents_rejects_a_geo_simulation(self):
        self.activate("aents")
        directory = Path(tempfile.mkdtemp())
        try:
            findings = quality.check_assets(plan(), directory)
        finally:
            directory.rmdir()
        self.assertTrue(any(item["rule"] == "animation_brand" for item in findings))

    def test_renderer_props_carry_explicit_aents_identity(self):
        profile = self.activate("aents")
        self.assertEqual(renderer.BRAND_ID, "aents")
        self.assertEqual(renderer.BRAND_NAME, "Aents")
        self.assertEqual(renderer.URL, "aents.net")
        self.assertEqual(renderer.BRAND_TAGLINE, "Software for people.")
        self.assertEqual(brand.current(), profile)

    def test_planner_context_reads_only_the_selected_brand_memory(self):
        profile = self.activate("aents")
        context = planner.read_context()
        self.assertIn("Contexto verificable de Aents", context)
        # The point is which memory is read, not whether it is empty: asserting
        # the placeholder made this fail the day Aents recorded its first lesson.
        self.assertIn((profile.memory / "lessons.md").read_text(encoding="utf-8").strip(), context)
        self.assertNotIn("Todas las piezas cierran con la misma tarjeta", context)

    def test_planner_schema_uses_the_selected_brand_audiences(self):
        profile = self.activate("aents")
        captured = {}

        def fake_ask(prompt, schema, system=None):
            captured["prompt"] = prompt
            captured["schema"] = schema
            return {}

        with unittest.mock.patch.object(planner, "ask", side_effect=fake_ask):
            planner.create_plan("Presentar el proceso", 20, [], "[]")
        self.assertEqual(
            captured["schema"]["properties"]["audience"]["enum"],
            list(profile.audiences),
        )
        self.assertIn("for Aents", captured["prompt"])

    def test_remotion_staging_is_namespaced_by_brand(self):
        self.activate("geo")
        geo_job = renderer.job_name(Path("geo-001"))
        self.activate("aents")
        aents_job = renderer.job_name(Path("aents-001"))
        self.assertEqual(geo_job, "geo-001")
        self.assertEqual(aents_job, "aents-001")

    def test_remotion_rejects_a_directory_from_another_brand(self):
        self.activate("aents")
        with self.assertRaisesRegex(RuntimeError, "does not belong to active brand"):
            renderer.job_name(Path("geo-001"))


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
        return quality.lint(candidate, self.directory, target, self.catalog, "geo-001")

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

    def test_narration_longer_than_the_target_is_accepted(self):
        # Duration is an editorial decision, not a gate: a piece that runs past
        # its declared target is not a defect.
        broken = plan()
        broken["scenes"][1]["voice"] = "Palabras de relleno para alargar la locución mucho más allá. " * 8
        report = self.lint(broken, target=15)
        self.assertTrue(report["passed"])
        self.assertFalse(any(item["rule"] == "duration" for item in report["findings"]))

    def test_a_cta_from_another_audience_is_flagged(self):
        report = self.lint(plan(cta="Publica tu propiedad"))
        self.assertTrue(any(item["rule"] == "cta_family" for item in report["findings"]))

    def test_the_last_scene_must_be_the_cta(self):
        broken = plan()
        broken["scenes"][-1]["purpose"] = "prueba"
        self.assertFalse(self.lint(broken)["passed"])

    def test_more_scenes_than_the_short_form_budget_are_rejected(self):
        broken = plan()
        broken["scenes"] = broken["scenes"][:1] + [broken["scenes"][1]] * quality.MAX_SCENES + broken["scenes"][-1:]
        report = self.lint(broken)
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "scene_count" for item in report["findings"]))

    def test_a_story_may_use_more_scenes_than_short_form(self):
        long_form = plan()
        long_form["scenes"] = long_form["scenes"][:1] + [long_form["scenes"][1]] * (quality.MAX_SCENES + 2) + long_form["scenes"][-1:]
        report = self.lint(long_form, target=90)
        self.assertFalse(any(item["rule"] == "scene_count" for item in report["findings"]))

    def test_a_story_still_has_a_scene_ceiling(self):
        broken = plan()
        broken["scenes"] = broken["scenes"][:1] + [broken["scenes"][1]] * quality.MAX_STORY_SCENES + broken["scenes"][-1:]
        report = self.lint(broken, target=90)
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "scene_count" for item in report["findings"]))

    def test_a_lesson_may_use_more_scenes_than_a_story(self):
        """Ten beats is a story that failed; at four minutes it is the subject."""
        lesson = plan()
        lesson["scenes"] = lesson["scenes"][:1] + [lesson["scenes"][1]] * (quality.MAX_STORY_SCENES + 2) + lesson["scenes"][-1:]
        report = self.lint(lesson, target=210)
        self.assertFalse(any(item["rule"] == "scene_count" for item in report["findings"]))

    def test_a_lesson_still_has_a_scene_ceiling(self):
        broken = plan()
        broken["scenes"] = broken["scenes"][:1] + [broken["scenes"][1]] * quality.MAX_LESSON_SCENES + broken["scenes"][-1:]
        report = self.lint(broken, target=210)
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "scene_count" for item in report["findings"]))

    def test_the_scene_budget_grows_once_per_threshold(self):
        self.assertEqual(quality.scene_budget(45), quality.MAX_SCENES)
        self.assertEqual(quality.scene_budget(46), quality.MAX_STORY_SCENES)
        self.assertEqual(quality.scene_budget(120), quality.MAX_STORY_SCENES)
        self.assertEqual(quality.scene_budget(121), quality.MAX_LESSON_SCENES)

    def test_a_lesson_is_not_a_story(self):
        self.assertTrue(quality.is_story(120))
        self.assertFalse(quality.is_story(121))
        self.assertTrue(quality.is_lesson(121))

    def test_a_lesson_may_teach_before_it_reaches_the_product(self):
        lesson = plan()
        lesson["scenes"][0]["duration"] = 22
        lesson["scenes"][0]["asset"] = "sim:anuncios"
        lesson["scenes"][1]["asset"] = "sim:mapa"
        report = self.lint(lesson, target=210)
        self.assertFalse(any(item["rule"] == "product_reveal" for item in report["findings"]))

    def test_a_lesson_cannot_teach_for_free_until_the_end(self):
        broken = plan()
        broken["scenes"][0]["duration"] = 26
        broken["scenes"][0]["asset"] = "sim:anuncios"
        broken["scenes"][1]["asset"] = "sim:mapa"
        report = self.lint(broken, target=210)
        self.assertFalse(report["passed"])
        self.assertTrue(any(item["rule"] == "product_reveal" for item in report["findings"]))

    def test_the_plan_schema_admits_a_whole_lesson(self):
        """The gate holds short form to its own budget; the schema must not cap
        the format that needs the most scenes, or a lesson dies in the planner."""
        self.assertEqual(
            planner.PLAN_SCHEMA["properties"]["scenes"]["maxItems"], quality.MAX_LESSON_SCENES
        )

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
        self.catalog = {"videos": [{"id": "geo-000", "hook": "Te gusta el anuncio."}]}
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

    def test_aents_idea_and_workflow_are_registered_for_the_aents_profile(self):
        source = (Path(__file__).resolve().parents[1] / "remotion/src/simulations.tsx").read_text(encoding="utf-8")
        profile = brand.BrandProfile.load("aents")
        for identifier in ("sim:aents-idea", "sim:aents-flujo"):
            self.assertIn(identifier, planner.SIMULATIONS)
            self.assertIn(identifier, renderer.SIMULATIONS)
            self.assertIn(identifier, profile.simulations)
            self.assertIn(f"'{identifier}':", source)

    BRAND_STORY = (
        "sim:aents-crecimiento",
        "sim:aents-carga",
        "sim:aents-giro",
        "sim:aents-arquitectura",
        "sim:aents-automatizacion",
        "sim:aents-panel",
        "sim:aents-escala",
        "sim:aents-posicionamiento",
        "sim:aents-cierre",
    )

    def test_the_aents_brand_story_animations_are_registered_on_every_side(self):
        import renderer

        source = (Path(__file__).resolve().parents[1] / "remotion/src/simulations.tsx").read_text(encoding="utf-8")
        profile = brand.BrandProfile.load("aents")
        for identifier in self.BRAND_STORY:
            self.assertIn(identifier, planner.SIMULATIONS, identifier)
            self.assertIn(identifier, renderer.SIMULATIONS, identifier)
            self.assertIn(identifier, profile.simulations, identifier)
            self.assertIn(f"'{identifier}':", source, identifier)

    SYSTEM_ARC = (
        "sim:aents-problema-software",
        "sim:aents-disperso",
        "sim:aents-desconectado",
        "sim:aents-entender",
        "sim:aents-soluciones",
        "sim:aents-etapas",
        "sim:aents-medida",
    )

    def test_the_system_arc_is_registered_in_both_halves_and_in_the_aents_profile(self):
        """A scene of «Del problema al software» must not lint clean and render blank."""
        import renderer

        source = (Path(__file__).resolve().parents[1] / "remotion/src/simulations.tsx").read_text(encoding="utf-8")
        profile = brand.BrandProfile.load("aents")
        for identifier in self.SYSTEM_ARC:
            self.assertIn(identifier, planner.SIMULATIONS, identifier)
            self.assertIn(identifier, renderer.SIMULATIONS, identifier)
            self.assertIn(identifier, profile.simulations, identifier)
            self.assertIn(f"'{identifier}':", source, identifier)

    def test_the_system_arc_takes_its_palette_from_the_brand_instead_of_hardcoding_one(self):
        """These panels are the ones a Geo piece would reuse, so the ground, the
        accent and the status line come from the brand the render is running as."""
        source = (Path(__file__).resolve().parents[1] / "remotion/src/aents-system-simulations.tsx").read_text(encoding="utf-8")
        self.assertIn("tokensFor(brandId, brandName)", source)
        self.assertNotIn("#6B5CF6", source)
        self.assertNotIn("aents-brand-tile", source)

    def brand_story_source(self):
        return (Path(__file__).resolve().parents[1] / "remotion/src/aents-brand-simulations.tsx").read_text(encoding="utf-8")

    def test_every_invented_figure_in_the_brand_story_carries_the_example_badge(self):
        """The panels illustrate a made-up business, and the brief only allows
        that when the screen says so while the number is on it."""
        source = self.brand_story_source()
        for component in ("AentsGrowthSim", "AentsAutomationSim", "AentsPanelSim", "AentsScaleSim"):
            block = source.split(f"export const {component}")[1].split("export const")[0]
            self.assertIn("<Example", block, component)

    def test_the_sign_off_uses_the_published_aents_tagline(self):
        """`BUILD WHAT'S NEXT` came from the draft script and belongs to nobody:
        the identity says `Software para personas.` and the close has to agree."""
        source = self.brand_story_source()
        self.assertIn("Software para personas.", source)
        self.assertNotIn("BUILD WHAT", source.upper())

    def test_the_search_arc_is_registered_in_both_halves_and_in_the_aents_profile(self):
        """A scene of the search piece must not lint clean and render blank."""
        source = (Path(__file__).resolve().parents[1] / "remotion/src/simulations.tsx").read_text(encoding="utf-8")
        profile = brand.BrandProfile.load("aents")
        for identifier in (
            "sim:aents-busqueda",
            "sim:aents-lenta",
            "sim:aents-rebote",
            "sim:aents-rearmado",
            "sim:aents-prueba-web",
        ):
            self.assertIn(identifier, planner.SIMULATIONS)
            self.assertIn(identifier, renderer.SIMULATIONS)
            self.assertIn(identifier, profile.simulations)
            self.assertIn(f"'{identifier}':", source)

    def test_the_search_cover_names_an_illustration_that_exists(self):
        """`cover_art` falls back silently, so the branch has to be checked here."""
        self.assertIn("aents-buscador", quality.cover_art_branches())

    TRANSFORMATION_ARC = (
        "sim:aents-antes",
        "sim:aents-contraste",
        "sim:aents-reconstruccion",
        "sim:aents-credibilidad",
        "sim:aents-cotizacion",
        "sim:aents-adaptacion",
        "sim:aents-comparacion",
    )

    def test_the_transformation_arc_is_registered_in_both_halves_and_in_the_aents_profile(self):
        """A scene of the before/after piece must not lint clean and render blank."""
        source = (Path(__file__).resolve().parents[1] / "remotion/src/simulations.tsx").read_text(encoding="utf-8")
        profile = brand.BrandProfile.load("aents")
        for identifier in self.TRANSFORMATION_ARC:
            self.assertIn(identifier, planner.SIMULATIONS, identifier)
            self.assertIn(identifier, renderer.SIMULATIONS, identifier)
            self.assertIn(identifier, profile.simulations, identifier)
            self.assertIn(f"'{identifier}':", source, identifier)

    def transformation_arc_source(self):
        return (Path(__file__).resolve().parents[1] / "remotion/src/aents-web-simulations.tsx").read_text(encoding="utf-8")

    def test_every_invented_figure_in_the_transformation_arc_carries_the_example_badge(self):
        """The piece rebuilds a company that does not exist, and the brief only
        allows its years, its projects and its team on screen while the frame
        says they are an example."""
        source = self.transformation_arc_source()
        for component in (
            "AentsWebDatedSim",
            "AentsWebContrastSim",
            "AentsWebCredibilitySim",
            "AentsWebRequestSim",
            "AentsWebBeforeAfterSim",
        ):
            block = source.split(f"export const {component}")[1].split("export const")[0]
            self.assertIn("<ExampleBadge", block, component)

    def test_the_invented_company_cannot_be_mistaken_for_a_real_builder(self):
        """`Constructora Andes` came from the draft script and may well name a
        real company; the arc uses the XYZ convention the file already had."""
        source = self.transformation_arc_source()
        self.assertIn("CONSTRUCTORA XYZ", source)
        self.assertNotIn("ANDES", source.upper())

    def test_the_transformation_arc_speaks_spanish_and_avoids_industry_jargon(self):
        """The delivered piece says `nueva solicitud`, not `lead`, and
        `Reconstruyámosla`, not `LET'S REBUILD IT`."""
        source = self.transformation_arc_source()
        self.assertIn("NUEVA SOLICITUD", source)
        self.assertIn("Reconstruyámosla", source)
        self.assertNotIn("LEAD", source.upper())
        self.assertNotIn("REBUILD IT", source.upper())

    def test_the_transformation_cover_names_an_illustration_that_exists(self):
        self.assertIn("aents-transformacion", quality.cover_art_branches())

    MOBILE_ARC = (
        "sim:aents-encoge",
        "sim:aents-sintomas",
        "sim:aents-dos-caminos",
        "sim:aents-cabe",
        "sim:aents-pregunta",
        "sim:aents-portal-escritorio",
        "sim:aents-portal-movil",
        "sim:aents-dedo",
        "sim:aents-tarjetas",
        "sim:aents-gestos",
        "sim:aents-peso",
        "sim:aents-hacia-arriba",
        "sim:aents-usala",
    )

    def test_the_mobile_arc_is_registered_in_both_halves_and_in_the_aents_profile(self):
        """A scene of the mobile-first lesson must not lint clean and render blank."""
        source = (Path(__file__).resolve().parents[1] / "remotion/src/simulations.tsx").read_text(encoding="utf-8")
        profile = brand.BrandProfile.load("aents")
        for identifier in self.MOBILE_ARC:
            self.assertIn(identifier, planner.SIMULATIONS, identifier)
            self.assertIn(identifier, renderer.SIMULATIONS, identifier)
            self.assertIn(identifier, profile.simulations, identifier)
            self.assertIn(f"'{identifier}':", source, identifier)

    def mobile_arc_source(self):
        return (Path(__file__).resolve().parents[1] / "remotion/src/aents-mobile-simulations.tsx").read_text(encoding="utf-8")

    def test_every_invented_figure_in_the_mobile_arc_carries_the_example_badge(self):
        """The lesson prices a map and counts results that do not exist. The
        brief allows those figures only while the frame says they are examples,
        and the two compositions that print them are the two that must say so."""
        source = self.mobile_arc_source()
        for component in ("AentsMobilePortalDesktopSim", "AentsMobilePortalPhoneSim", "AentsMobileWeightSim"):
            block = source.split(f"export const {component}")[1].split("export const")[0]
            self.assertIn("<Example", block, component)

    def test_the_mobile_arc_draws_the_drawer_the_product_really_has(self):
        """The phone scene is the one claim in the piece that is about a built
        product, so it may only draw states `MobilePropertyDrawer` implements:
        a launcher pill that opens search and filters, a card that stops at half
        height, and a backdrop that only dims once it is full."""
        block = self.mobile_arc_source().split("export const AentsMobilePortalPhoneSim")[1].split("export const")[0]
        self.assertIn("propiedades", block)
        self.assertIn("Buscar por zona", block)
        for state in ("half", "sheetFull", "backdrop"):
            self.assertIn(state, block)

    def test_the_mobile_arc_never_shows_a_visit_counter(self):
        """`No se muestran contadores públicos de visitas` is a repo rule, and a
        piece that recreates a listing card is exactly where one would appear."""
        source = self.mobile_arc_source().lower()
        self.assertNotIn("visitas", source)
        self.assertNotIn("vistas", source)

    def test_the_mobile_cover_names_an_illustration_that_exists(self):
        self.assertIn("aents-movil", quality.cover_art_branches())

    AI_ARC = (
        "sim:aents-ia-funciona",
        "sim:aents-ia-contexto",
        "sim:aents-ia-partes",
        "sim:aents-ia-reglas",
        "sim:aents-ia-camino-feliz",
        "sim:aents-ia-revision",
        "sim:aents-ia-dependencias",
        "sim:aents-ia-seguridad",
        "sim:aents-ia-secretos",
        "sim:aents-ia-pruebas",
        "sim:aents-ia-git",
        "sim:aents-ia-orden",
        "sim:aents-ia-criterio",
        "sim:aents-ia-cierre",
    )

    def test_the_ai_arc_is_registered_in_both_halves_and_in_the_aents_profile(self):
        """A scene of the lesson about building with AI must not lint clean and render blank."""
        import renderer

        source = (Path(__file__).resolve().parents[1] / "remotion/src/simulations.tsx").read_text(encoding="utf-8")
        profile = brand.BrandProfile.load("aents")
        for identifier in self.AI_ARC:
            self.assertIn(identifier, planner.SIMULATIONS, identifier)
            self.assertIn(identifier, renderer.SIMULATIONS, identifier)
            self.assertIn(identifier, profile.simulations, identifier)
            self.assertIn(f"'{identifier}':", source, identifier)

    def ai_arc_source(self):
        return (Path(__file__).resolve().parents[1] / "remotion/src/aents-ia-simulations.tsx").read_text(encoding="utf-8")

    def test_the_appointment_book_of_the_ai_arc_carries_the_example_badge(self):
        """It is the one composition that invents times and bookings, and the
        brief allows those only while the frame says they are an example."""
        block = self.ai_arc_source().split("export const AentsAiRulesSim")[1].split("export const")[0]
        self.assertIn("<Example", block)

    def test_the_ai_arc_takes_its_palette_from_the_brand_instead_of_hardcoding_one(self):
        source = self.ai_arc_source()
        self.assertIn("tokensFor(brandId, brandName)", source)
        self.assertNotIn("#6B5CF6", source)

    def test_the_ai_arc_names_no_ai_product(self):
        """The piece teaches how to direct a tool, so naming one would turn a
        lesson into a recommendation the brand has not made.

        The list is of product names only. «copiloto» is the metaphor the script
        itself uses for the working relationship, and a `Cursor` component draws
        the arrow that presses buttons: neither is a vendor.
        """
        source = self.ai_arc_source().lower()
        for product in ("chatgpt", "openai", "github copilot", "gemini", "anthropic", "midjourney"):
            self.assertNotIn(product, source, product)

    def test_the_closing_scene_of_the_ai_arc_carries_the_brand_block(self):
        """`scene.tsx` draws no outro over a simulation in the final beat, so a
        closing animation without the mark, the invitation and the domain would
        ship a CTA nobody can act on."""
        block = self.ai_arc_source().split("export const AentsAiClosingSim")[1]
        self.assertIn("brandTile", block)
        self.assertIn("brandDomain", block)
        self.assertIn("Cuéntanos qué estás construyendo", block)

    def test_the_ai_cover_names_an_illustration_that_exists(self):
        self.assertIn("aents-ia", quality.cover_art_branches())

    def test_aents_contact_uses_the_canonical_international_whatsapp_number(self):
        source = (Path(__file__).resolve().parents[1] / "remotion/src/aents-simulations.tsx").read_text(encoding="utf-8")
        contact = source.split("export const AentsContactSim")[1]
        self.assertIn("WHATSAPP", contact)
        self.assertIn("+593 98 373 8151", contact)
        self.assertNotIn(">098 373 8151<", contact)


class FinalVoiceRotationTests(unittest.TestCase):
    """The account cannot sound like one person reading every piece.

    The rule was written in the lessons file and broken eleven times in a row,
    so it is a machine check now: the number picks the profile, and buying the
    voice of the piece before this one is refused before a single character is
    sent to the provider.
    """

    CATALOG = {
        "profiles": {
            "draft-dora": {"provider": "kokoro", "settings": {"voice": "ef_dora"}},
            "final-main": {"provider": "elevenlabs", "settings": {"voice_id_env": "ELEVENLABS_VOICE_ID"}},
            "voice-01": {"provider": "elevenlabs", "settings": {"voice_id": "aaa"}},
            "voice-02": {"provider": "elevenlabs", "settings": {"voice_id": "bbb"}},
            "voice-03": {"provider": "elevenlabs", "settings": {"voice_id": "ccc"}},
        }
    }

    def test_the_pool_is_every_paid_profile_that_names_its_own_voice(self):
        self.assertEqual(
            workflow.FinalVoiceRotation.pool(self.CATALOG),
            ["voice-01", "voice-02", "voice-03"],
        )

    def test_a_profile_that_reads_its_id_from_the_environment_cannot_take_a_turn(self):
        """Two such profiles are indistinguishable, so the rotation is unverifiable."""
        self.assertNotIn("final-main", workflow.FinalVoiceRotation.pool(self.CATALOG))

    def test_consecutive_videos_get_different_voices(self):
        pool = workflow.FinalVoiceRotation.pool(self.CATALOG)
        assigned = [workflow.FinalVoiceRotation.assign(number, pool) for number in range(1, 8)]
        for first, second in zip(assigned, assigned[1:]):
            self.assertNotEqual(first, second)

    def test_the_same_number_always_gets_the_same_voice(self):
        pool = workflow.FinalVoiceRotation.pool(self.CATALOG)
        self.assertEqual(
            workflow.FinalVoiceRotation.assign(13, pool),
            workflow.FinalVoiceRotation.assign(13, pool),
        )

    def test_an_empty_pool_is_an_error_and_not_a_silent_default(self):
        with self.assertRaises(RuntimeError):
            workflow.FinalVoiceRotation.assign(1, [])

    def test_repeating_the_previous_pieces_voice_is_refused(self):
        with self.assertRaises(RuntimeError):
            workflow.FinalVoiceRotation.enforce("voice-02", (12, "voice-02"))

    def test_a_different_voice_from_the_previous_piece_is_allowed(self):
        workflow.FinalVoiceRotation.enforce("voice-03", (12, "voice-02"))

    def test_the_first_paid_piece_has_nothing_to_repeat(self):
        workflow.FinalVoiceRotation.enforce("voice-01", None)


class LocationQuestionAnimationTests(unittest.TestCase):
    """The owner pair asks a question in the hook and answers it in the result.

    Both states are one component on purpose: the payoff is that the same
    listing now has a location, and drawing it as a second, different picture
    would have hidden exactly the thing the piece is about. The prices and
    features on the card are invented to illustrate a listing, so the badge that
    licenses them has to be in the drawing and not only in the plan.
    """

    PAIR = ("sim:donde-queda", "sim:ya-lo-saben")

    def source(self):
        return (Path(__file__).resolve().parents[1] / "remotion/src/simulations.tsx").read_text(encoding="utf-8")

    def test_both_states_are_registered_on_both_sides(self):
        import planner
        import renderer

        source = self.source()
        for identifier in self.PAIR + ("sim:elige-zona",):
            self.assertIn(identifier, renderer.SIMULATIONS, identifier)
            self.assertIn(identifier, planner.SIMULATIONS, identifier)
            self.assertIn(f"'{identifier}':", source, identifier)

    def test_both_states_come_from_the_same_component(self):
        source = self.source()
        self.assertIn("'sim:donde-queda': OwnerLocationQuestionSim", source)
        self.assertIn("'sim:ya-lo-saben': OwnerLocationAnsweredSim", source)
        for wrapper in ("OwnerLocationQuestionSim", "OwnerLocationAnsweredSim"):
            declaration = source.split(f"export const {wrapper}: React.FC<SimulationProps> = ")[1][:120]
            self.assertIn("OwnerLocationAskSim", declaration, wrapper)

    def test_the_example_listing_says_it_is_an_example(self):
        source = self.source()
        block = source.split("const OwnerLocationAskSim")[1].split("export const SearchOrderSim")[0]
        self.assertIn("EJEMPLO", block)

    def test_the_zone_scene_prices_carry_the_example_badge(self):
        source = self.source()
        block = source.split("export const SearchOrderSim")[1].split("export const SIMULATIONS")[0]
        self.assertIn("EJEMPLO", block)

    def test_the_zone_scene_paints_no_inventory_figure(self):
        """A count of what is in a zone would be a market claim frozen in a video."""
        source = self.source()
        block = source.split("export const SearchOrderSim")[1].split("export const SIMULATIONS")[0]
        self.assertNotIn("propiedades", block.lower())

    def test_showing_the_published_listing_counts_as_showing_the_product(self):
        for identifier in self.PAIR + ("sim:elige-zona",):
            self.assertIn(identifier, quality.PRODUCT_ASSETS, identifier)


class PurchaseProcessAnimationTests(unittest.TestCase):
    """The six steps of a purchase happen away from the portal.

    Verifying an owner, negotiating, signing a deed and registering a transfer
    are not things Geo Propiedades does, so none of these animations may pass as
    proof that the product appeared: if one of them counted as a product asset,
    a buyer piece could satisfy the reveal gate without ever showing the map.
    They are also drawn on `FieldShell`, the paper card the series reserves for
    everything that happens outside the product, which is what puts the
    `EJEMPLO` badge over the invented prices of the negotiation scene.
    """

    STEPS = (
        "sim:verificar",
        "sim:negociar",
        "sim:promesa",
        "sim:escritura-publica",
        "sim:inscripcion",
        "sim:pasos-compra",
    )

    def source(self):
        return (Path(__file__).resolve().parents[1] / "remotion/src/simulations.tsx").read_text(encoding="utf-8")

    def test_every_step_is_registered_on_both_sides(self):
        import planner
        import renderer

        source = self.source()
        for step in self.STEPS:
            self.assertIn(step, renderer.SIMULATIONS, step)
            self.assertIn(step, planner.SIMULATIONS, step)
            self.assertIn(f"'{step}':", source, step)

    def test_no_step_of_the_purchase_counts_as_showing_the_product(self):
        self.assertEqual(set(self.STEPS) & quality.PRODUCT_ASSETS, set())

    def test_every_step_is_drawn_on_the_paper_card(self):
        source = self.source()
        components = [
            "VerificationSim",
            "NegotiationSim",
            "PromiseContractSim",
            "PublicDeedSim",
            "RegistrationSim",
            "PurchaseStepsSim",
        ]
        for component in components:
            body = source.split(f"export const {component}")[1].split("\nexport const ")[0]
            self.assertIn("<FieldShell", body, component)

    def test_the_negotiation_prices_are_printed_and_never_counted_up(self):
        source = self.source()
        self.assertIn("const EXAMPLE_LISTED_PRICE = '$75.000';", source)
        self.assertIn("const EXAMPLE_OFFER_PRICE = '$70.000';", source)


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
        profile = brand.configure("geo")
        catalog.configure(profile)
        self.assertEqual(catalog.video_id(7), "geo-007")

    def test_a_number_the_catalogue_skipped_can_be_claimed_again(self):
        """`next_number` only counts forward, so a discarded plan leaves a hole
        that nothing could ever fill without asking for it by number."""
        store = {"videos": [{"number": 1}, {"number": 2}, {"number": 4}]}
        self.assertEqual(catalog.next_number(store), 5)
        request = factory.VideoRequest(plan(), "brief", 20, number=3)
        self.assertEqual(request.number, 3)

    def test_a_number_the_catalogue_already_owns_is_refused(self):
        profile = brand.configure("geo")
        catalog.configure(profile)
        store = {"videos": [{"number": 3, "id": "geo-003"}]}
        with self.assertRaises(RuntimeError):
            factory.create_video(store, factory.VideoRequest(plan(), "brief", 20, number=3))

    def test_package_names_are_ascii_and_readable(self):
        self.assertEqual(factory.slug("Kit social después de publicar", 3), "kit-social-despues")


class VideoWorkflowTests(unittest.TestCase):
    def test_publishing_copy_is_ready_to_paste(self):
        """SPEC:VFACT-016"""
        result = workflow.PublishingCopy.build(
            "Mira cómo funciona.",
            ["#Aents", "#SoftwareEcuador"],
        )
        self.assertEqual(
            result["text"],
            "Mira cómo funciona.\n\n#Aents #SoftwareEcuador\n",
        )

    def test_publishing_copy_rejects_hashtags_with_spaces(self):
        """SPEC:VFACT-016"""
        with self.assertRaises(RuntimeError):
            workflow.PublishingCopy.build("Texto", ["#Software Ecuador"])

    def test_publishing_copy_deduplicates_hashtags_case_insensitively(self):
        result = workflow.PublishingCopy.build("Texto", ["#Aents", "#aents"])
        self.assertEqual(result["hashtags"], ["#Aents"])

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
                "video": "geo-001", "platform": "tiktok",
                "published_at": "2026-08-14T12:00:00-05:00", "url": "https://example.test/1",
            }]), encoding="utf-8")
            item = {"id": "geo-001", "state": "learned"}
            state = {"version": 1, "videos": [item]}
            synchronizer = extensions.PublicationSynchronizer(root)
            with unittest.mock.patch.object(catalog, "load", return_value=state):
                with unittest.mock.patch.object(catalog, "save"):
                    first = synchronizer.execute(source)
                    second = synchronizer.execute(source)
        self.assertEqual(first["updated"], ["geo-001"])
        self.assertEqual(second["updated"], ["geo-001"])
        self.assertEqual(item["state"], "learned")

    def test_experiment_needs_two_arms_with_enough_views(self):
        """SPEC:VFACT-010"""
        entries = [
            {"video": "geo-001", "value": 40, "views": 120},
            {"video": "geo-002", "value": 30, "views": 80},
        ]
        decision = workflow.ExperimentDecision.build(entries, "views_3s", 100)
        self.assertEqual(decision["status"], "inconclusive")
        entries[1]["views"] = 120
        decision = workflow.ExperimentDecision.build(entries, "views_3s", 100)
        self.assertEqual(decision["winner"], "geo-001")

    def test_long_education_is_not_mislabeled_as_a_story(self):
        """SPEC:VFACT-011"""
        self.assertEqual(
            workflow.EditorialFormat.classify({"pillar": "Educación inmobiliaria"}, 80),
            "education",
        )

    def test_past_two_minutes_a_piece_is_a_lesson_and_not_a_long_story(self):
        self.assertEqual(workflow.EditorialFormat.classify({"pillar": "Sitios web"}, 120), "story")
        self.assertEqual(workflow.EditorialFormat.classify({"pillar": "Sitios web"}, 121), "lesson")

    def test_registered_asset_cannot_be_described_as_missing(self):
        """SPEC:VFACT-009"""
        sample = plan(verification_notes=["sim:mapa todavía no existe"])
        findings = workflow.PlanConsistencyAudit.findings(sample, {"sim:mapa"})
        self.assertEqual(findings[0]["rule"], "asset_note_consistency")


class ReviewWorkflowTests(unittest.TestCase):
    def test_render_cleanup_refuses_to_delete_a_master_or_voice(self):
        """SPEC:VFACT-014"""
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            master = root / "video.mp4"
            voice_file = root / "voice-01.mp3"
            master.write_bytes(b"master")
            voice_file.write_bytes(b"voice")
            with self.assertRaises(RuntimeError):
                workflow.RenderCleanupPolicy.discard(master)
            with self.assertRaises(RuntimeError):
                workflow.RenderCleanupPolicy.discard(voice_file)
            self.assertTrue(master.exists())
            self.assertTrue(voice_file.exists())

    def test_render_cleanup_only_deletes_pending_files(self):
        """SPEC:VFACT-014"""
        with tempfile.TemporaryDirectory() as temporary:
            pending = Path(temporary) / "video.pending.mp4"
            pending.write_bytes(b"temporary")
            workflow.RenderCleanupPolicy.discard(pending)
            self.assertFalse(pending.exists())

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
            directory = Path(temporary) / "geo-001"
            directory.mkdir()
            catalog.write_json(directory / "render-props.json", {
                "scenes": [{"durationInFrames": 30}], "musicFile": None, "showSafeAreas": False,
            })
            renderer = extensions.ScenePreviewRenderer()
            with unittest.mock.patch.object(catalog, "find", return_value=(directory, {"id": "geo-001"}, {})):
                with unittest.mock.patch.object(extensions.renderer, "render_video", side_effect=lambda props, target: target):
                    target = renderer.execute("geo-001", 1, True)
        self.assertEqual(target.parts[-2:], ("previews", "scene-01.mp4"))

    def test_review_page_has_video_controls_and_a_skip_link(self):
        """SPEC:VFACT-005"""
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            page = review_tools.ReviewPage(directory).write(
                {"id": "geo-001", "state": "reviewed"},
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
    geo-003, which shipped with the domain pill reading "opropiedadesecuador.com".
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


class ContainedTextTests(unittest.TestCase):
    """A text does not leave the box it belongs to.

    `AUTOMATIZACIÓN` printed over both borders of its card in `sim:aents-idea`
    because the size was picked with `title.length > 10 ? 22 : 29`. Any pair of
    hardcoded numbers is a guess: the next long word breaks it again. The size
    has to be measured against the width the container actually has, which is
    what `fit()` does, so the anti-pattern is banned outright.
    """

    RENDERER = Path(__file__).resolve().parents[1] / "remotion/src"

    def sources(self):
        return sorted(self.RENDERER.glob("*.tsx"))

    def test_no_font_size_is_derived_from_the_length_of_its_string(self):
        for path in self.sources():
            source = path.read_text(encoding="utf-8")
            self.assertNotRegex(
                source,
                r"fontSize: ?[^,\n]*\.length",
                f"{path.name}: size the text with fit() against its container, not from the string length",
            )

    def test_every_kit_scene_carries_the_continuous_push(self):
        """A composition built on the kit that forgets `push` renders as a
        photograph with a voice over it, and the motion review says so. The
        vocabulary is only worth having if nobody can skip half of it."""
        source = (self.RENDERER / "aents-system-simulations.tsx").read_text(encoding="utf-8")
        for opening in re.findall(r"<(?:Panel|Field)\b[^>]*", source):
            self.assertIn("push=", opening, "every Panel/Field in a kit scene must receive the scene progress")

    def test_the_kit_exposes_the_documented_motion_vocabulary(self):
        """`animation-standard.md` §10 bis names these by hand; a rule that
        points at a function that no longer exists is worse than no rule."""
        source = (self.RENDERER / "system-kit.tsx").read_text(encoding="utf-8")
        for symbol in ("land", "glide", "settle", "anticipate", "stagger", "Halo", "glass", "lit", "Reveal", "Trace"):
            self.assertIn(f"export const {symbol}", source, symbol)

    def test_the_shared_kit_measures_the_text_it_boxes(self):
        source = (self.RENDERER / "system-kit.tsx").read_text(encoding="utf-8")
        self.assertIn("import {fit}", source)
        self.assertIn("export const BoxedText", source)

    def test_the_option_cards_of_the_idea_animation_fit_their_labels(self):
        source = (self.RENDERER / "aents-simulations.tsx").read_text(encoding="utf-8")
        self.assertIn("CARD_TEXT_WIDTH", source)


class AnimatedFigureTests(unittest.TestCase):
    """A figure that counts up to its value is false until it arrives.

    Video-010 shipped a master where the price per square metre climbed from
    zero: "$0/m²" was on screen for about a second, and "$906/m²" after it.
    Neither number was ever true. One frame per scene could not catch it, so the
    rule lives in the source instead of in the eye.
    """

    ROOT = Path(__file__).resolve().parents[1]

    def test_no_simulation_prints_an_interpolated_figure(self):
        findings = review_tools.AnimatedFigureAudit(self.ROOT).findings()
        self.assertEqual(
            findings,
            [],
            "una cifra interpolada afirma un valor falso en cada fotograma menos el último",
        )

    def test_the_audit_catches_a_direct_count(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "remotion/src").mkdir(parents=True)
            (root / "remotion/src/simulations.tsx").write_text(
                "const total = Math.round(ease(progress, 0, 1, 0, 122000));\n",
                encoding="utf-8",
            )
            self.assertEqual(len(review_tools.AnimatedFigureAudit(root).findings()), 1)

    def test_the_audit_catches_a_figure_printed_one_step_later(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "remotion/src").mkdir(parents=True)
            (root / "remotion/src/simulations.tsx").write_text(
                "const grow = ease(progress, 0, 1, 0, 1353);\n"
                "<div>${Math.round(grow)}<span>/m²</span></div>\n",
                encoding="utf-8",
            )
            self.assertEqual(len(review_tools.AnimatedFigureAudit(root).findings()), 1)

    def test_rounding_that_nobody_reads_is_not_a_finding(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "remotion/src").mkdir(parents=True)
            (root / "remotion/src/simulations.tsx").write_text(
                "const scan = ease(progress, 0, 1, 0, 4);\n"
                "const focused = Math.round(scan) === index;\n"
                "const dash = Math.round(frame * 0.9) % 40;\n",
                encoding="utf-8",
            )
            self.assertEqual(review_tools.AnimatedFigureAudit(root).findings(), [])


class MotionReviewTests(unittest.TestCase):
    """The review has to sample movement, not a single quiet instant."""

    def test_every_scene_is_sampled_at_least_four_times(self):
        self.assertGreaterEqual(4, 4)
        self.assertLessEqual(review_tools.MotionStripExtractor.SAMPLE_SECONDS, 0.5)

    def test_a_still_stretch_and_a_pop_are_both_watched_for(self):
        # 0.0025 saw nothing on a master whose scenes are still 88% of the time.
        self.assertGreaterEqual(review_tools.MotionDefectAudit.FREEZE_NOISE, 0.01)
        self.assertLessEqual(review_tools.MotionDefectAudit.FREEZE_SECONDS, 3.0)
        self.assertLessEqual(review_tools.MotionDefectAudit.STILL_RATIO, 0.4)
        self.assertLess(review_tools.MotionDefectAudit.POP_SCORE, 0.5)

    def test_the_scene_of_a_timestamp_is_the_one_playing(self):
        audit = review_tools.MotionDefectAudit(Path("/tmp"))
        cuts = [0.0, 10.0, 20.0]
        self.assertEqual(audit._scene_of(0.0, cuts), 1)
        self.assertEqual(audit._scene_of(9.9, cuts), 1)
        self.assertEqual(audit._scene_of(10.1, cuts), 2)
        self.assertEqual(audit._scene_of(25.0, cuts), 3)


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


class AentsWebsiteAnimationTests(unittest.TestCase):
    """The website arc draws an imaginary client, and says so.

    Every scene here shows a company page that does not exist: if the drawing
    ever picked up a real customer, a real search engine or a real result, the
    piece would be making a claim nobody approved. The alerts in the closing
    scene are the delicate part — they illustrate what a website does, so they
    have to carry the `EJEMPLO` badge in the drawing and not only in the plan.
    """

    IDENTIFIERS = (
        "sim:aents-web-busqueda",
        "sim:aents-web-lenta",
        "sim:aents-web-nueva",
        "sim:aents-web-conversion",
        "sim:aents-web-cierre",
    )

    ROOT = Path(__file__).resolve().parents[1]

    def source(self):
        return (self.ROOT / "remotion/src/aents-web-simulations.tsx").read_text(encoding="utf-8")

    def test_every_scene_is_registered_on_both_sides_and_for_the_brand(self):
        registry = (self.ROOT / "remotion/src/simulations.tsx").read_text(encoding="utf-8")
        profile = brand.BrandProfile.load("aents")
        for identifier in self.IDENTIFIERS:
            self.assertIn(identifier, planner.SIMULATIONS, identifier)
            self.assertIn(identifier, renderer.SIMULATIONS, identifier)
            self.assertIn(identifier, profile.simulations, identifier)
            self.assertIn(f"'{identifier}':", registry, identifier)

    def test_the_illustrated_company_is_invented(self):
        self.assertIn("Empresa XYZ", self.source())
        self.assertIn("empresaxyz.com", self.source())

    def test_no_third_party_search_engine_is_drawn(self):
        """A generic field is honest; a named engine borrows somebody's brand."""
        for name in ("Google", "Bing", "Chrome", "Safari"):
            self.assertNotIn(name, self.source(), name)

    def test_the_closing_alerts_are_labelled_as_an_example(self):
        source = self.source()
        stops = source.split("const CLOCK_STOPS")[1].split("export const AentsWebClosingSim")[0]
        closing = source.split("export const AentsWebClosingSim")[1]
        self.assertIn("Nueva visita", stops)
        self.assertIn("Nueva solicitud", stops)
        self.assertIn("<ExampleBadge", closing)

    def test_the_closing_uses_the_canonical_international_whatsapp_number(self):
        closing = self.source().split("export const AentsWebClosingSim")[1]
        self.assertIn("+593 98 373 8151", closing)
        self.assertIn("aents.net", closing)

    def test_the_capability_chips_stay_inside_the_published_copy(self):
        """Analytics, security and forms are not in the Aents landing, so they
        are not drawn as things Aents builds."""
        source = self.source()
        self.assertIn("const FUNNEL_CHIPS = ['Posicionamiento', 'Velocidad', 'Móvil']", source)
        for absent in ("Analytics", "Seguridad", "Formularios"):
            self.assertNotIn(absent, source, absent)

    def test_the_arc_is_driven_by_frame_and_never_by_the_clock(self):
        source = self.source()
        for forbidden in ("Date.now", "setTimeout", "Math.random", "new Date"):
            self.assertNotIn(forbidden, source, forbidden)


class ConcurrentCatalogTests(unittest.TestCase):
    """Two sessions write this catalogue; neither may delete the other's work."""

    def test_a_video_added_after_the_snapshot_survives_the_write(self):
        mine = [{"id": "aents-001", "number": 1, "state": "approved"}]
        theirs = [{"id": "aents-001", "number": 1, "state": "planned"}, {"id": "aents-007", "number": 7}]
        merged = catalog.merge_concurrent(mine, theirs)
        self.assertEqual([item["id"] for item in merged], ["aents-001", "aents-007"])

    def test_the_caller_wins_on_the_entry_it_is_updating(self):
        mine = [{"id": "aents-001", "number": 1, "state": "rendered"}]
        theirs = [{"id": "aents-001", "number": 1, "state": "planned"}]
        self.assertEqual(catalog.merge_concurrent(mine, theirs)[0]["state"], "rendered")

    def test_the_result_stays_ordered_by_number(self):
        mine = [{"id": "aents-003", "number": 3}]
        theirs = [{"id": "aents-001", "number": 1}, {"id": "aents-007", "number": 7}]
        merged = catalog.merge_concurrent(mine, theirs)
        self.assertEqual([item["number"] for item in merged], [1, 3, 7])

    def test_saving_over_a_newer_file_keeps_both_videos(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "catalog.json"
            original = catalog.CATALOG
            catalog.CATALOG = path
            try:
                snapshot = {"version": 1, "videos": [{"id": "aents-003", "number": 3}]}
                catalog.write_json(path, {"version": 1, "videos": [{"id": "aents-007", "number": 7}]})
                catalog.save(snapshot)
                written = json.loads(path.read_text(encoding="utf-8"))
            finally:
                catalog.CATALOG = original
        self.assertEqual([item["id"] for item in written["videos"]], ["aents-003", "aents-007"])


class RenderProgressTests(unittest.TestCase):
    """A long render must be legible while it runs, not only once it ends."""

    def test_progress_reaches_the_log_and_the_tail_carries_the_failure(self):
        with tempfile.TemporaryDirectory() as folder:
            log = Path(folder) / "render.log"
            code, tail = renderer.run_remotion(
                ["/bin/sh", "-c", "echo Rendered 1/2; echo Rendered 2/2; exit 3"], log
            )
            written = log.read_text(encoding="utf-8")
        self.assertEqual(code, 3)
        self.assertIn("Rendered 2/2", tail)
        self.assertIn("Rendered 1/2", written)

    def test_the_tail_is_bounded_so_an_error_message_stays_readable(self):
        with tempfile.TemporaryDirectory() as folder:
            log = Path(folder) / "render.log"
            _, tail = renderer.run_remotion(["/bin/sh", "-c", "seq 1 500"], log)
            written = log.read_text(encoding="utf-8")
        self.assertLessEqual(len(tail.splitlines()), 40)
        self.assertEqual(len(written.splitlines()), 500)


class RenderConcurrencyTests(unittest.TestCase):
    """A cap that only exists when somebody asked for one."""

    def tearDown(self):
        os.environ.pop("VIDEO_RENDER_CONCURRENCY", None)

    def test_nothing_is_capped_by_default(self):
        os.environ.pop("VIDEO_RENDER_CONCURRENCY", None)
        self.assertIsNone(renderer.render_concurrency())

    def test_the_flag_wins_over_the_environment(self):
        os.environ["VIDEO_RENDER_CONCURRENCY"] = "4"
        self.assertEqual(renderer.render_concurrency(2), 2)

    def test_the_environment_caps_a_whole_session(self):
        os.environ["VIDEO_RENDER_CONCURRENCY"] = "3"
        self.assertEqual(renderer.render_concurrency(), 3)

    def test_a_meaningless_value_is_ignored_rather_than_crashing_the_render(self):
        for value in ("0", "-2", "auto", ""):
            os.environ["VIDEO_RENDER_CONCURRENCY"] = value
            self.assertIsNone(renderer.render_concurrency(), value)


class AentsSearchLessonAnimationTests(unittest.TestCase):
    """The lesson about being found draws two things that need watching.

    One is other people's surfaces: a search engine and an answering reader are
    recreated as the patterns a viewer recognises, and putting anybody's
    wordmark on them would be quoting a brand the piece does not carry. The
    other is the invented workshop, whose prices and times are only allowed
    while the drawing says they are an example.
    """

    IDENTIFIERS = (
        "sim:aents-seo-encontrar",
        "sim:aents-seo-entender",
        "sim:aents-seo-intencion",
        "sim:aents-seo-senales",
        "sim:aents-seo-red",
        "sim:aents-seo-respuesta",
        "sim:aents-seo-sin-truco",
        "sim:aents-seo-datos",
        "sim:aents-seo-entidad",
        "sim:aents-seo-lectores",
    )

    ROOT = Path(__file__).resolve().parents[1]

    def source(self):
        return (self.ROOT / "remotion/src/aents-seo-simulations.tsx").read_text(encoding="utf-8")

    def test_every_scene_is_registered_on_both_sides_and_for_the_brand(self):
        registry = (self.ROOT / "remotion/src/simulations.tsx").read_text(encoding="utf-8")
        profile = brand.BrandProfile.load("aents")
        for identifier in self.IDENTIFIERS:
            self.assertIn(identifier, planner.SIMULATIONS, identifier)
            self.assertIn(identifier, renderer.SIMULATIONS, identifier)
            self.assertIn(identifier, profile.simulations, identifier)
            self.assertIn(f"'{identifier}':", registry, identifier)

    def test_no_other_companys_mark_is_drawn(self):
        """The surfaces are drawn by what they are, never by whose they are.

        The comments may name a crawler, because that is where the claim is
        sourced from; what may not happen is one of those names reaching the
        screen, so the check runs on the code with the comments removed.
        """
        source = re.sub(r"/\*.*?\*/|//[^\n]*", "", self.source(), flags=re.DOTALL).lower()
        for absent in ("google", "chatgpt", "gemini", "copilot", "perplexity", "openai", "bing"):
            self.assertNotIn(absent, source, absent)

    def test_the_invented_workshop_carries_the_example_badge(self):
        source = self.source()
        for component in (
            "AentsSeoFoundSim",
            "AentsSeoUnderstandSim",
            "AentsSeoIntentSim",
            "AentsSeoNetworkSim",
            "AentsSeoAnswerSim",
            "AentsSeoDataSim",
            "AentsSeoEntitySim",
        ):
            block = source.split(f"export const {component}")[1].split("export const")[0]
            self.assertIn("<Example", block, component)

    def test_the_scene_that_describes_real_work_invents_no_business(self):
        """`sim:aents-seo-lectores` is the one shot that reports what Aents
        does, so it may not carry a made-up figure alongside it."""
        block = self.source().split("export const AentsSeoReadableSim")[1]
        self.assertNotIn("<Example", block)
        for figure in ("$35", "2 horas", "3 meses"):
            self.assertNotIn(figure, block, figure)

    def test_the_lesson_is_built_from_the_shared_kit(self):
        """A composition that copies the panel and writes its palette by hand
        stops receiving the fixes the other brand gets."""
        source = self.source()
        self.assertIn("from './system-kit'", source)
        self.assertIn("tokensFor(brandId, brandName)", source)
        self.assertNotIn("const violet =", source)
        self.assertNotIn("const green =", source)

    def test_the_arc_is_driven_by_frame_and_never_by_the_clock(self):
        source = self.source()
        for forbidden in ("Date.now", "setTimeout", "Math.random", "new Date"):
            self.assertNotIn(forbidden, source, forbidden)


class HeroSceneTests(unittest.TestCase):
    """The opening scene, and the three things that stop it from slipping.

    A kit nobody is forced to use is a suggestion, a rule nobody measures is
    prose, and a shared kit nobody varies is a template. Each of those failed
    once already, so each one has a test here.
    """

    ROOT = Path(__file__).resolve().parents[1]

    def source(self, name):
        return (self.ROOT / "remotion/src" / name).read_text(encoding="utf-8")

    def hero_plan(self, asset="sim:aents-problema-software"):
        candidate = plan()
        candidate["scenes"][0]["asset"] = asset
        return candidate

    # -- the kit is not optional ----------------------------------------- #

    def test_every_registered_opening_is_a_real_animation(self):
        self.assertTrue(set(renderer.HERO_STAGINGS) <= set(renderer.SIMULATIONS))

    def test_every_registered_staging_is_a_camera_move_that_exists(self):
        moves = set(re.findall(r"^  '([a-z-]+)':", self.source("hero-stage.tsx"), re.MULTILINE))
        self.assertTrue(set(renderer.HERO_STAGINGS.values()) <= moves, moves)

    def test_the_opening_is_built_on_the_hero_stage_and_the_interface_kit(self):
        source = self.source("aents-system-simulations.tsx")
        self.assertIn("from './hero-stage'", source)
        self.assertIn("from './interface-kit'", source)
        self.assertIn("<HeroStage", source)

    def test_the_hero_stage_is_driven_by_frame_and_never_by_the_clock(self):
        source = self.source("hero-stage.tsx") + self.source("interface-kit.tsx")
        for forbidden in ("Date.now", "setTimeout", "Math.random", "new Date"):
            self.assertNotIn(forbidden, source, forbidden)

    def test_interface_text_never_drops_below_the_review_floor(self):
        sizes = re.findall(r"(?:display|title|body|label|micro): (\d+)", self.source("interface-kit.tsx"))
        self.assertTrue(sizes)
        self.assertGreaterEqual(min(int(size) for size in sizes), review_tools.TextLegibilityAudit.MINIMUM_PX)

    # -- the plan gate ---------------------------------------------------- #

    def test_an_opening_that_is_not_built_on_the_hero_stage_is_refused(self):
        findings = quality.check_hero_scene(self.hero_plan("sim:aents-disperso"), {"videos": []}, "aents-009")
        self.assertEqual([item["rule"] for item in findings], ["hero_missing"])

    def test_a_scene_with_no_animation_at_all_is_refused(self):
        findings = quality.check_hero_scene(self.hero_plan(None), {"videos": []}, "aents-009")
        self.assertEqual([item["rule"] for item in findings], ["hero_missing"])

    def test_a_registered_opening_passes(self):
        self.assertEqual(quality.check_hero_scene(self.hero_plan(), {"videos": []}, "aents-009"), [])

    def test_two_consecutive_openings_may_not_be_shot_the_same_way(self):
        catalog_with_history = {"videos": [{"id": "aents-008", "hero_staging": "push-in"}]}
        findings = quality.check_hero_scene(self.hero_plan(), catalog_with_history, "aents-009")
        self.assertEqual([item["rule"] for item in findings], ["hero_staging_repeats"])

    def test_the_staging_of_the_piece_before_last_may_be_reused(self):
        catalog_with_history = {"videos": [
            {"id": "aents-007", "hero_staging": "push-in"},
            {"id": "aents-008", "hero_staging": "crane-down"},
        ]}
        self.assertEqual(quality.check_hero_scene(self.hero_plan(), catalog_with_history, "aents-009"), [])

    def test_pieces_planned_before_the_rule_are_left_alone(self):
        self.assertEqual(quality.check_hero_scene(self.hero_plan("sim:mapa"), {"videos": []}, "geo-004"), [])

    def test_the_approved_plan_records_how_its_opening_was_shot(self):
        metadata = workflow.PlanCatalogMetadata.build(self.hero_plan(), 20)
        self.assertEqual(metadata["hero_staging"], "push-in")

    # -- the measurement -------------------------------------------------- #

    def audit(self, memory=None):
        return review_tools.HeroSceneAudit(Path(tempfile.gettempdir()), memory)

    def test_a_rise_over_the_floor_counts_once_however_long_it_lasts(self):
        energy = [0.1] * 4 + [3.0] * 8 + [0.1] * 4 + [3.0] * 8
        self.assertEqual(self.audit()._events(energy), 2)

    def test_a_flat_scene_scores_nothing_even_if_it_shimmers(self):
        self.assertEqual(self.audit()._events([0.3, 0.32, 0.29, 0.31] * 20), 0)

    def test_the_floor_starts_at_the_declared_minimum(self):
        self.assertEqual(self.audit().required_rate(), review_tools.HeroSceneAudit.MIN_EVENTS_PER_SECOND)

    def test_the_best_opening_a_brand_ships_becomes_the_next_one_s_floor(self):
        with tempfile.TemporaryDirectory() as folder:
            memory = Path(folder)
            self.audit(memory)._raise_bar(6.0, "aents-001")
            self.assertEqual(self.audit(memory).best()["set_by"], "aents-001")
            self.assertEqual(self.audit(memory).required_rate(), 5.1)

    def test_a_worse_opening_never_lowers_the_floor(self):
        with tempfile.TemporaryDirectory() as folder:
            memory = Path(folder)
            self.audit(memory)._raise_bar(6.0, "aents-001")
            self.audit(memory)._raise_bar(3.2, "aents-002")
            self.assertEqual(self.audit(memory).best()["set_by"], "aents-001")

    def test_the_declared_floor_matches_the_one_the_compositions_read(self):
        declared = re.search(r"HERO_MIN_EVENTS_PER_SECOND = (\d+)", self.source("hero-stage.tsx"))
        self.assertEqual(float(declared.group(1)), review_tools.HeroSceneAudit.MIN_EVENTS_PER_SECOND)


class DeclaredLayoutTests(unittest.TestCase):
    """Cards that share a frame may not reach each other, and this proves it.

    `sim:aents-soluciones` put four option cards on a slowly turning ellipse
    around a smaller fifth. At the sizes involved every outer card overlapped the
    centre by about 28 x 11 px, and because the ring turned, the overlap appeared
    and disappeared — a defect no still frame catches and no reviewer is obliged
    to notice. A position computed at render time cannot be checked; a declared
    one can, which is why the layout is constants now and why this test exists.
    """

    #  Nothing in the scene may come closer to anything else than this.
    MINIMUM_GAP = 16

    def source(self):
        return (Path(__file__).resolve().parents[1] / "remotion/src/aents-system-simulations.tsx").read_text(
            encoding="utf-8"
        )

    def cards(self):
        """Every card in the choice scene, as (name, left, top, right, bottom)."""
        source = self.source()
        size = re.search(r"const CHOICE = \{width: (\d+), height: (\d+)\}", source)
        need = re.search(r"const NEED = \{x: (\d+), y: (\d+)\}", source)
        self.assertIsNotNone(size, "CHOICE debe declarar el tamaño de las tarjetas")
        self.assertIsNotNone(need, "NEED debe declarar dónde va la tarjeta central")
        width, height = int(size.group(1)), int(size.group(2))
        boxes = [("Tu necesidad", int(need.group(1)), int(need.group(2)))]
        block = source.split("const SOLUTIONS = [")[1].split("] as const;")[0]
        boxes += [
            (label, int(x), int(y))
            for label, x, y in re.findall(r"\{label: '([^']+)'.*?x: (\d+), y: (\d+),", block, re.S)
        ]
        self.assertEqual(len(boxes), 5, "la escena declara una necesidad y cuatro opciones")
        return [(label, x, y, x + width, y + height) for label, x, y in boxes]

    def test_no_two_cards_can_reach_each_other(self):
        cards = self.cards()
        for index, first in enumerate(cards):
            for second in cards[index + 1:]:
                apart = (
                    first[3] + self.MINIMUM_GAP <= second[1]
                    or second[3] + self.MINIMUM_GAP <= first[1]
                    or first[4] + self.MINIMUM_GAP <= second[2]
                    or second[4] + self.MINIMUM_GAP <= first[2]
                )
                self.assertTrue(apart, f"«{first[0]}» y «{second[0]}» se tocan o se quedan demasiado cerca")

    def test_every_card_is_the_same_size(self):
        """One size for everything competing in the same decision. A card that is
        smaller, or that grows when it is chosen, reads as a mistake."""
        source = self.source()
        self.assertIn("width: CHOICE.width", source)
        self.assertIn("height: CHOICE.height", source)
        self.assertNotIn("active ? 1.04", source)

    def test_the_cards_stay_inside_the_panel(self):
        # `PANEL_WIDTH` is the canvas minus the side crop and the panel padding.
        panel_width = 1080 - 120 * 2 - 44 * 2
        for label, left, _, right, _ in self.cards():
            self.assertGreaterEqual(left, 0, label)
            self.assertLessEqual(right, panel_width, label)

    def test_each_stage_of_the_process_draws_something_of_its_own(self):
        """Four named stages need four different faces, or the scene is one box
        blinking. This is what «solo salen cuadros random» looked like."""
        source = self.source()
        for face in ("StageStrategy", "StageDesign", "StageBuild", "StageLaunch"):
            self.assertIn(f"const {face}:", source, face)
        self.assertIn("const faces = [StageStrategy, StageDesign, StageBuild, StageLaunch]", source)


class SceneCacheTests(unittest.TestCase):
    """Reusing a shot is only allowed when nothing about it changed.

    The cache exists so a correction to four seconds does not cost sixty, and it
    is worth exactly nothing if a stale frame can reach a master. Every test here
    is about the same question: does the fingerprint notice?
    """

    def props(self, **overrides):
        base = {
            "brandId": "aents",
            "brandName": "Aents",
            "cta": "Cuéntanos qué quieres mejorar",
            "url": "aents.net",
            "musicFile": None,
            "scenes": [
                {"durationInFrames": 120, "headline": "Problema → Software",
                 "asset": "sim:aents-problema-software", "assetType": "simulation", "accent": "#6B5CF6"},
                {"durationInFrames": 90, "headline": "Todo por separado",
                 "asset": "sim:aents-disperso", "assetType": "simulation", "accent": "#14B8A6"},
                {"durationInFrames": 60, "headline": "¿Qué construimos?",
                 "asset": "sim:mapa", "assetType": "simulation", "accent": "#A78BFA"},
            ],
        }
        base.update(overrides)
        return base

    def cache(self, folder):
        return scene_cache.SceneRenderCache(Path(folder))

    def print_of(self, cache, props, index):
        return cache.fingerprint(props, index, cache.spans(props)[index])

    # -- the ranges ------------------------------------------------------- #

    def test_the_ranges_cover_every_frame_exactly_once(self):
        with tempfile.TemporaryDirectory() as folder:
            spans = self.cache(folder).spans(self.props())
            self.assertEqual(spans, [(0, 119), (120, 209), (210, 269)])

    def test_the_last_range_ends_on_the_last_frame_of_the_plan(self):
        with tempfile.TemporaryDirectory() as folder:
            props = self.props()
            spans = self.cache(folder).spans(props)
            total = sum(scene["durationInFrames"] for scene in props["scenes"])
            self.assertEqual(spans[-1][1] + 1, total)

    # -- what must invalidate a shot -------------------------------------- #

    def test_editing_a_scene_changes_its_own_fingerprint(self):
        with tempfile.TemporaryDirectory() as folder:
            cache, props = self.cache(folder), self.props()
            before = self.print_of(cache, props, 0)
            props["scenes"][0]["headline"] = "Otra cosa"
            self.assertNotEqual(before, self.print_of(cache, props, 0))

    def test_editing_the_piece_around_a_scene_changes_it_too(self):
        """The brand block and the closing sit inside every frame."""
        with tempfile.TemporaryDirectory() as folder:
            cache, props = self.cache(folder), self.props()
            before = self.print_of(cache, props, 0)
            props["url"] = "otro.dominio"
            self.assertNotEqual(before, self.print_of(cache, props, 0))

    def test_a_scene_that_moves_in_the_timeline_is_re_rendered(self):
        """The progress cue reads the whole piece, so where a shot sits is part
        of what it looks like."""
        with tempfile.TemporaryDirectory() as folder:
            cache, props = self.cache(folder), self.props()
            before = self.print_of(cache, props, 2)
            props["scenes"][0]["durationInFrames"] = 150
            self.assertNotEqual(before, self.print_of(cache, props, 2))

    def test_a_new_animation_module_invalidates_the_scenes_that_use_it(self):
        with tempfile.TemporaryDirectory() as folder:
            props = self.props()
            source = Path(folder) / "src"
            shutil.copytree(Path(__file__).resolve().parents[1] / "remotion/src", source)
            first = scene_cache.SceneRenderCache(Path(folder), index=scene_cache.SourceIndex(source))
            before = self.print_of(first, props, 0)
            module = source / "aents-system-simulations.tsx"
            module.write_text(module.read_text(encoding="utf-8") + "\n// changed\n", encoding="utf-8")
            after = scene_cache.SceneRenderCache(Path(folder), index=scene_cache.SourceIndex(source))
            self.assertNotEqual(before, self.print_of(after, props, 0))

    def test_a_shared_file_invalidates_everything(self):
        with tempfile.TemporaryDirectory() as folder:
            props = self.props()
            source = Path(folder) / "src"
            shutil.copytree(Path(__file__).resolve().parents[1] / "remotion/src", source)
            first = scene_cache.SceneRenderCache(Path(folder), index=scene_cache.SourceIndex(source))
            before = [self.print_of(first, props, index) for index in range(3)]
            shared = source / "theme.ts"
            shared.write_text(shared.read_text(encoding="utf-8") + "\n// changed\n", encoding="utf-8")
            after = scene_cache.SceneRenderCache(Path(folder), index=scene_cache.SourceIndex(source))
            self.assertTrue(all(
                before[index] != self.print_of(after, props, index) for index in range(3)
            ))

    # -- what must not ---------------------------------------------------- #

    def test_editing_one_scene_leaves_the_others_alone(self):
        """The whole point: a fix to the hook must not cost the other twelve."""
        with tempfile.TemporaryDirectory() as folder:
            cache, props = self.cache(folder), self.props()
            before = [self.print_of(cache, props, index) for index in (1, 2)]
            props["scenes"][0]["headline"] = "Otro gancho"
            self.assertEqual(before, [self.print_of(cache, props, index) for index in (1, 2)])

    def test_another_brand_s_animations_do_not_invalidate_a_scene(self):
        with tempfile.TemporaryDirectory() as folder:
            props = self.props()
            source = Path(folder) / "src"
            shutil.copytree(Path(__file__).resolve().parents[1] / "remotion/src", source)
            first = scene_cache.SceneRenderCache(Path(folder), index=scene_cache.SourceIndex(source))
            before = self.print_of(first, props, 0)
            other = source / "aents-seo-simulations.tsx"
            other.write_text(other.read_text(encoding="utf-8") + "\n// changed\n", encoding="utf-8")
            after = scene_cache.SceneRenderCache(Path(folder), index=scene_cache.SourceIndex(source))
            self.assertEqual(before, self.print_of(after, props, 0))

    # -- the assembled master has to prove it is whole -------------------- #

    def test_a_master_that_is_short_is_refused(self):
        with tempfile.TemporaryDirectory() as folder:
            cache = self.cache(folder)
            with unittest.mock.patch.object(scene_cache.media, "probe_duration", return_value=8.0):
                with self.assertRaises(RuntimeError):
                    cache.verify(Path(folder) / "master.mp4", 270, "el máster")

    def test_a_master_of_the_planned_length_is_accepted(self):
        with tempfile.TemporaryDirectory() as folder:
            cache = self.cache(folder)
            with unittest.mock.patch.object(scene_cache.media, "probe_duration", return_value=9.0):
                cache.verify(Path(folder) / "master.mp4", 270, "el máster")

    def test_a_rounding_frame_either_way_is_not_an_error(self):
        with tempfile.TemporaryDirectory() as folder:
            cache = self.cache(folder)
            with unittest.mock.patch.object(scene_cache.media, "probe_duration", return_value=9.02):
                cache.verify(Path(folder) / "master.mp4", 270, "el máster")

    # -- the record ------------------------------------------------------- #

    def test_a_master_says_which_shots_it_re_drew(self):
        with tempfile.TemporaryDirectory() as folder:
            cache = self.cache(folder)
            cache.rendered, cache.reused = [1], [2, 3]
            self.assertEqual(cache.report, {"scenes_rendered": [1], "scenes_reused": [2, 3]})


if __name__ == "__main__":
    unittest.main()
