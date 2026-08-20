#!/usr/bin/env python3
"""Class-based CLI use cases added to the established video factory."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import catalog as catalog_store
import renderer
import brand
from workflow import ExperimentDecision, PublicationImport, ResultsTable


class PublicationSynchronizer:
    """Reconcile external reality into one atomic publication ledger."""

    def __init__(self, root: Path) -> None:
        self.root = root
        self.ledger_path = root / "memory/publications.json"

    def execute(self, source: Path, dry_run: bool = False) -> dict[str, Any]:
        if self.root.resolve() == brand.ROOT.resolve():
            self.ledger_path = brand.current().memory / "publications.json"
        else:
            self.ledger_path = self.root / "memory/publications.json"
        records = PublicationImport.read(source)
        catalog = catalog_store.load()
        videos = {item["id"]: item for item in catalog["videos"]}
        unknown = sorted({record["video"] for record in records} - set(videos))
        if unknown:
            raise RuntimeError(f"Unknown videos in publication sync: {', '.join(unknown)}")
        ledger = catalog_store.load_json(self.ledger_path, {"version": 1, "publications": []})
        indexed = {(row["video"], row["platform"]): row for row in ledger.get("publications", [])}
        for record in records:
            key = (record["video"], record["platform"])
            indexed[key] = {**indexed.get(key, {}), **record, "recorded_at": catalog_store.now()}
        updated, anomalies = self._reconcile(videos, indexed)
        if not dry_run:
            ledger["publications"] = sorted(indexed.values(), key=lambda row: (row["video"], row["platform"]))
            ledger["updated_at"] = catalog_store.now()
            catalog_store.write_json(self.ledger_path, ledger)
            catalog_store.save(catalog)
        return {"updated": updated, "anomalies": anomalies, "dry_run": dry_run}

    def _reconcile(
        self,
        videos: dict[str, dict[str, Any]],
        records: dict[tuple[str, str], dict[str, Any]],
    ) -> tuple[list[str], list[str]]:
        updated, anomalies = [], []
        for video_id in sorted({record["video"] for record in records.values()}):
            item = videos[video_id]
            confirmed = [
                row for row in records.values()
                if row["video"] == video_id and row.get("status", "published") == "published"
            ]
            if not confirmed:
                continue
            if item["state"] not in {"signed", "published", "learned"}:
                anomalies.append(f"{video_id} is externally published from internal state {item['state']}")
            if item["state"] != "learned":
                item["state"] = "published"
            item["published_at"] = min(row["published_at"] for row in confirmed)
            item["published_platforms"] = sorted({row["platform"] for row in confirmed})
            item["updated_at"] = catalog_store.now()
            updated.append(video_id)
        return updated, anomalies


class HookExperimentAnalyzer:
    """Compare a control and its hook variants using one declared metric."""

    def __init__(self, root: Path) -> None:
        self.root = root

    def execute(self, reference: str, metric: str, minimum_views: int) -> dict[str, Any]:
        directory, item, _ = catalog_store.find(reference)
        family_ids = [item["id"], *item.get("variants", [])]
        if item.get("parent"):
            directory, parent, _ = catalog_store.find(item["parent"])
            family_ids = [parent["id"], *parent.get("variants", [])]
        entries = []
        for video_id in family_ids:
            child_directory, child, _ = catalog_store.find(video_id)
            rows = ResultsTable.read(child_directory / "results.csv")
            entries.append({
                "video": video_id,
                "label": child.get("hook_label", "control"),
                "value": ResultsTable.total(rows, metric),
                "views": int(ResultsTable.total(rows, "views")),
            })
        decision = ExperimentDecision.build(entries, metric, minimum_views)
        decision["decided_at"] = catalog_store.now()
        catalog_store.write_json(directory / "experiment-decision.json", decision)
        return decision


class ScenePreviewRenderer:
    """Render one scene from cached props without touching canonical artifacts."""

    def execute(self, reference: str, scene_number: int, overlay: bool = False) -> Path:
        directory, _, _ = catalog_store.find(reference)
        props = catalog_store.load_json(directory / "render-props.json")
        if not props:
            raise RuntimeError("Render props are missing; render a draft once before previewing a scene")
        if not 1 <= scene_number <= len(props["scenes"]):
            raise RuntimeError(f"Scene must be between 1 and {len(props['scenes'])}")
        preview_props = {
            **props,
            "scenes": [props["scenes"][scene_number - 1]],
            "musicFile": None,
            "showSafeAreas": overlay,
        }
        target_dir = directory / "previews"
        target_dir.mkdir(exist_ok=True)
        props_path = target_dir / f"scene-{scene_number:02}.json"
        catalog_store.write_json(props_path, preview_props)
        return renderer.render_video(props_path, target_dir / f"scene-{scene_number:02}.mp4")


class ExtensionCommands:
    """Thin argparse adapter; domain classes own every decision."""

    def __init__(self, root: Path) -> None:
        self.publications = PublicationSynchronizer(root)
        self.experiments = HookExperimentAnalyzer(root)
        self.previews = ScenePreviewRenderer()

    def sync(self, args: Any) -> None:
        print(json.dumps(self.publications.execute(args.file, args.dry_run), ensure_ascii=False, indent=2))

    def experiment(self, args: Any) -> None:
        print(json.dumps(
            self.experiments.execute(args.video, args.metric, args.minimum_views),
            ensure_ascii=False,
            indent=2,
        ))

    def preview(self, args: Any) -> None:
        print(self.previews.execute(args.video, args.scene, args.overlay))
