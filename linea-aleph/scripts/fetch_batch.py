#!/usr/bin/env python3
"""Batch-fetch priority revisions for block-7 cache boost."""

from __future__ import annotations

import argparse
import importlib.util
import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "cache" / "snapshots"
SCRIPTS = Path(__file__).resolve().parent
DEFAULT_PRIORITY = SCRIPTS / "fetch-priority-block7.json"

_spec = importlib.util.spec_from_file_location(
    "fetch_snapshot", ROOT / "scripts" / "fetch_snapshot.py"
)
_fs = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_fs)


def save_payload(payload: dict) -> Path:
    wt_path, _meta_path = _fs.save_snapshot_payload(payload)
    meta = json.loads((CACHE / f"{payload['oldid']}.meta.json").read_text(encoding="utf-8"))
    _fs.update_snapshot_endpoints(
        payload["oldid"],
        meta["fetched_at"],
        len(payload["wikitext"]),
        title=payload["title"],
        user=payload.get("user", ""),
        timestamp=payload.get("timestamp", ""),
    )
    return wt_path


def reconcile_meta() -> int:
    """Set fetched=true where wikitext body already exists."""
    updated = 0
    snap_roots = [ROOT / "snapshots"]
    pseudo = ROOT / "pseudociencia" / "snapshots"
    if pseudo.exists():
        snap_roots.append(pseudo)
    for snap_root in snap_roots:
        for role in ("previo", "inicial", "final", "sc_cierre", "actual"):
            meta_path = snap_root / role / "meta.json"
            if not meta_path.exists():
                continue
            sm = json.loads(meta_path.read_text(encoding="utf-8"))
            oldid = sm.get("oldid")
            if not oldid:
                continue
            wt = CACHE / f"{oldid}.wikitext"
            if wt.exists() and not sm.get("fetched"):
                sm["fetched"] = True
                if not sm.get("fetched_at"):
                    side_meta = CACHE / f"{oldid}.meta.json"
                    if side_meta.exists():
                        sm["fetched_at"] = json.loads(
                            side_meta.read_text(encoding="utf-8")
                        ).get("fetched_at", "")
                meta_path.write_text(
                    json.dumps(sm, indent=2, ensure_ascii=False) + "\n",
                    encoding="utf-8",
                )
                updated += 1
    return updated


def filter_by_wave(entries: list[dict], wave: str) -> list[dict]:
    if wave == "all":
        return entries
    return [e for e in entries if e.get("wave", "all") in (wave, "all")]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--priority-file",
        type=Path,
        default=DEFAULT_PRIORITY,
        help="JSON priority list (default: fetch-priority-block7.json)",
    )
    parser.add_argument("--tier", choices=("demarcacion", "pseudociencia", "all"), default="all")
    parser.add_argument("--wave", choices=("A", "B", "C", "all"), default="all")
    parser.add_argument("--sleep", type=float, default=0.8)
    parser.add_argument("--reconcile-only", action="store_true")
    args = parser.parse_args()

    reconciled = reconcile_meta()
    if args.reconcile_only:
        print(json.dumps({"reconciled": reconciled}, indent=2))
        return

    priority_path = args.priority_file
    if not priority_path.is_absolute():
        candidate = SCRIPTS / priority_path
        priority_path = candidate if candidate.exists() else ROOT / priority_path
    entries = json.loads(priority_path.read_text(encoding="utf-8"))
    if args.tier != "all":
        entries = [e for e in entries if e["tier"] == args.tier]
    entries = filter_by_wave(entries, args.wave)

    results = {"reconciled": reconciled, "fetched": [], "skipped": [], "failed": []}
    for entry in entries:
        oldid = entry["oldid"]
        title = entry["title"]
        wt_path = CACHE / f"{oldid}.wikitext"
        if wt_path.exists():
            _fs.update_snapshot_endpoints(
                oldid,
                json.loads((CACHE / f"{oldid}.meta.json").read_text(encoding="utf-8")).get(
                    "fetched_at", ""
                )
                if (CACHE / f"{oldid}.meta.json").exists()
                else "",
                wt_path.stat().st_size,
                title=title,
            )
            results["skipped"].append({"oldid": oldid, "reason": "exists"})
            continue
        last_err = None
        for attempt in range(4):
            try:
                payload = _fs.fetch_revision(oldid, title)
                path = save_payload(payload)
                results["fetched"].append(
                    {
                        "oldid": oldid,
                        "title": title,
                        "bytes": len(payload["wikitext"]),
                        "path": str(path),
                    }
                )
                time.sleep(args.sleep)
                last_err = None
                break
            except Exception as exc:  # noqa: BLE001
                last_err = str(exc)
                if "429" in last_err and attempt < 3:
                    time.sleep(args.sleep * (2 ** (attempt + 2)))
                    continue
                break
        if last_err:
            results["failed"].append({"oldid": oldid, "error": last_err})
            time.sleep(args.sleep)

    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
