#!/usr/bin/env python3
"""Fetch talk-page revision history (meta) → talk/{vista}/raw/linea.md + manifest.json."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from history_common import (
    fetch_all_revisions,
    format_history_line,
    in_date_window,
    parse_iso_ts,
)

ROOT = Path(__file__).resolve().parents[1]

DEFAULT_WINDOW_START = "2007-10-01"
DEFAULT_WINDOW_END = "2007-11-30"
FULL_HISTORY_START = "1971-01-01"
FULL_HISTORY_END = "2099-12-31"
PROBE_VIAJE_ID = "talk-sala-probe"
ALIGNMENT_HOURS = 24
ARTICLE_ALIGNMENT_OLDIDS = {12719652, 12909144}

TALK_VISTAS = [
    {
        "slug": "discusion-pseudociencia",
        "title": "Discusión:Pseudociencia",
        "corpus_id": "linea-talk-discusion-pseudociencia",
        "namespace": 1,
        "linked_article": "Pseudociencia",
    },
    {
        "slug": "usuario-discusion-analiza",
        "title": "Usuario discusión:Analiza",
        "corpus_id": "linea-talk-usuario-analiza",
        "namespace": 3,
        "linked_article": None,
    },
    {
        "slug": "usuario-discusion-ignacio-icke",
        "title": "Usuario discusión:Ignacio_Icke",
        "corpus_id": "linea-talk-usuario-ignacio-icke",
        "namespace": 3,
        "linked_article": None,
    },
    {
        "slug": "usuario-discusion-solvecoagula",
        "title": "Usuario discusión:SolveCoagula",
        "corpus_id": "linea-talk-usuario-solvecoagula",
        "namespace": 3,
        "linked_article": None,
    },
]


@dataclass
class FetchConfig:
    window_start: str
    window_end: str
    probe_output: bool = False

    def corpus_dir(self, slug: str) -> str:
        if self.probe_output:
            return f"talk/{slug}/probe"
        return f"talk/{slug}"

    def corpus_path(self, slug: str) -> Path:
        return ROOT / self.corpus_dir(slug)

    def manifest_name(self) -> str:
        return "manifest.probe.json" if self.probe_output else "manifest.json"

    def manifest_path(self, slug: str) -> Path:
        base = ROOT / "talk" / slug
        if self.probe_output:
            return base / "manifest.probe.json"
        return base / "manifest.json"


def load_article_milestones() -> list[dict]:
    manifest_path = ROOT / "pseudociencia" / "manifest.json"
    if not manifest_path.exists():
        return []
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    milestones = []
    for reg in manifest.get("registros", []):
        ts = reg.get("timestamp", "")
        if not ts:
            continue
        if "T" in ts:
            iso = ts
        else:
            parts = ts.split()
            if len(parts) < 4:
                continue
            months = {
                "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
                "jul": 7, "ago": 8, "sep": 9, "oct": 10, "nov": 11, "dic": 12,
            }
            mon = months.get(parts[2].lower())
            if not mon:
                continue
            iso = f"{parts[3]}-{mon:02d}-{parts[1].zfill(2)}T{parts[0]}:00"
        milestones.append(
            {
                "oldid": reg["oldid"],
                "title": "Pseudociencia",
                "timestamp": iso,
                "milestone": reg.get("milestone", False),
            }
        )
    return milestones


def article_refs_for_talk(talk_ts: str, milestones: list[dict]) -> list[dict]:
    talk_dt = parse_iso_ts(talk_ts)
    refs: list[dict] = []
    for ms in milestones:
        ms_dt = parse_iso_ts(ms["timestamp"])
        delta = abs((talk_dt - ms_dt).total_seconds()) / 3600
        if delta <= ALIGNMENT_HOURS:
            refs.append(
                {
                    "oldid": ms["oldid"],
                    "title": ms["title"],
                    "delta_hours": round(delta, 1),
                }
            )
    refs.sort(key=lambda r: r["delta_hours"])
    return refs


def filter_talk_window(
    revisions: list[dict], config: FetchConfig
) -> list[dict]:
    window = [
        r
        for r in revisions
        if in_date_window(r["timestamp"], config.window_start, config.window_end)
    ]
    window.sort(key=lambda r: r["timestamp"])
    return window


def build_talk_linea_md(
    title: str,
    window: list[dict],
    generated_at: str,
    vista: dict,
    config: FetchConfig,
) -> str:
    sizes: dict[int, int] = {}
    for r in window:
        sizes[r["revid"]] = r["size"]

    linked = vista.get("linked_article")
    window_label = f"{config.window_start} – {config.window_end}"
    lines = [
        f"# {title} — historial talk (es.wikipedia)",
        f"# generado: {generated_at} · registros en ventana {window_label}: {len(window)}",
        "",
        f"Página: [{title}](https://es.wikipedia.org/wiki/{title.replace(' ', '_')})",
        f"Namespace: **{vista['namespace']}** · corpus: **talk**",
    ]
    if linked:
        lines.append(f"Artículo enlazado: [{linked}](https://es.wikipedia.org/wiki/{linked})")
    if config.probe_output:
        lines.append(f"Modo: **probe** · no sustituye manifest oct–nov")
    lines.extend(["", ""])

    ordered = list(reversed(window))
    for i, rev in enumerate(ordered):
        parent = rev["parentid"]
        prev_size = sizes.get(parent) if parent else None
        next_rev = ordered[i - 1]["revid"] if i > 0 else None
        lines.append(format_history_line(rev, prev_size, title, next_rev))

    lines.append("")
    return "\n".join(lines)


def run_segment_linea(vista: dict, config: FetchConfig) -> bool:
    """Run segment_linea; return False if window empty (no registros)."""
    corpus_dir = config.corpus_dir(vista["slug"])
    cmd = [
        sys.executable,
        str(ROOT / "segment_linea.py"),
        "--corpus-dir",
        corpus_dir,
        "--title",
        vista["title"],
        "--corpus-id",
        vista["corpus_id"],
        "--expand",
        "none",
    ]
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if proc.returncode == 0:
        return True
    if "No registros parsed" in (proc.stderr or "") + (proc.stdout or ""):
        return False
    print(proc.stdout, file=sys.stderr)
    print(proc.stderr, file=sys.stderr)
    proc.check_returncode()
    return True


def write_empty_manifest(vista: dict, generated_at: str, config: FetchConfig) -> Path:
    """Manifest stub when ventana has zero edits (vacío explícito)."""
    config.corpus_path(vista["slug"]).mkdir(parents=True, exist_ok=True)
    manifest_path = config.manifest_path(vista["slug"])
    meta = {
        "corpus": "talk",
        "corpus_id": vista["corpus_id"],
        "title": vista["title"],
        "namespace": vista["namespace"],
        "linked_article": vista.get("linked_article"),
        "source": "probe/raw/linea.md" if config.probe_output else "raw/linea.md",
        "generated_at": generated_at,
        "window": {"start": config.window_start, "end": config.window_end},
        "registro_count": 0,
        "ordering": "newest_first_in_linea_md",
        "vacío_explícito": True,
    }
    if config.probe_output:
        meta.update({"probe": True, "viaje_id": PROBE_VIAJE_ID, "output_dir": "probe/"})
    payload = {
        "meta": meta,
        "registros": [],
    }
    manifest_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return manifest_path


def enrich_manifest(vista: dict, milestones: list[dict], config: FetchConfig) -> None:
    manifest_path = config.manifest_path(vista["slug"])
    segment_manifest = config.corpus_path(vista["slug"]) / "manifest.json"
    if config.probe_output and segment_manifest.exists():
        data = json.loads(segment_manifest.read_text(encoding="utf-8"))
    elif manifest_path.exists():
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
    else:
        return
    meta = data.setdefault("meta", {})
    meta["corpus"] = "talk"
    meta["namespace"] = vista["namespace"]
    if vista["linked_article"]:
        meta["linked_article"] = vista["linked_article"]
    meta["window"] = {"start": config.window_start, "end": config.window_end}
    if config.probe_output:
        meta.update(
            {
                "probe": True,
                "viaje_id": PROBE_VIAJE_ID,
                "output_dir": "probe/",
                "source": "probe/raw/linea.md",
            }
        )

    linea_json = config.corpus_path(vista["slug"]) / "raw" / "linea.json"
    if linea_json.exists():
        lj = json.loads(linea_json.read_text(encoding="utf-8"))
        iso_by_oldid = {r["revid"]: r["timestamp"] for r in lj.get("revisiones", [])}
        for reg in data.get("registros", []):
            oid = reg.get("oldid")
            iso = iso_by_oldid.get(oid, "")
            if iso:
                reg["timestamp_iso"] = iso
                reg["article_refs"] = article_refs_for_talk(iso, milestones)
            else:
                reg.setdefault("article_refs", [])

    manifest_path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def write_anchors(vista: dict, window: list[dict], config: FetchConfig) -> Path:
    anchors_dir = ROOT / "cache" / "talk" / "anchors"
    anchors_dir.mkdir(parents=True, exist_ok=True)
    wave_a: list[dict] = []
    for rev in window:
        day = rev["timestamp"][:10]
        if config.probe_output:
            wave = "probe"
            note = f"probe · {rev.get('comment', '')[:80]}"
        else:
            wave = None
            if vista["slug"] == "discusion-pseudociencia" and "2007-11-10" <= day <= "2007-11-18":
                wave = "A1"
            elif vista["slug"] in ("usuario-discusion-analiza", "usuario-discusion-ignacio-icke"):
                if day.startswith("2007-11"):
                    wave = "A2"
            elif vista["slug"] == "usuario-discusion-solvecoagula" and day.startswith("2007"):
                wave = "A3"
            if not wave:
                continue
            note = f"{wave} · {rev.get('comment', '')[:80]}"
        wave_a.append(
            {
                "oldid": rev["revid"],
                "timestamp": rev["timestamp"],
                "note": note,
                "wave": wave,
            }
        )

    payload = {
        "vista": vista["slug"],
        "title": vista["title"],
        "linked_article": vista.get("linked_article"),
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "window": {"start": config.window_start, "end": config.window_end},
        "wave_a_oldids": wave_a,
    }
    if config.probe_output:
        payload["probe"] = True
        payload["viaje_id"] = PROBE_VIAJE_ID
    suffix = ".probe.json" if config.probe_output else ".json"
    out = anchors_dir / f"{vista['slug']}{suffix}"
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return out


def process_vista(vista: dict, milestones: list[dict], config: FetchConfig) -> dict:
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    corpus = config.corpus_path(vista["slug"])
    raw_dir = corpus / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    all_revs = fetch_all_revisions(vista["title"])
    window = filter_talk_window(all_revs, config)

    enriched = []
    by_id = {r["revid"]: r for r in all_revs}
    for r in window:
        parent = r["parentid"]
        parent_size = by_id.get(parent, {}).get("size", 0) if parent else 0
        enriched.append({**r, "byte_delta": r["size"] - parent_size})

    payload = {
        "meta": {
            "title": vista["title"],
            "wiki": "es",
            "corpus": "talk",
            "namespace": vista["namespace"],
            "linked_article": vista.get("linked_article"),
            "generated_at": generated_at,
            "corpus_dir": config.corpus_dir(vista["slug"]),
            "window": {"start": config.window_start, "end": config.window_end},
            "revision_count": len(window),
            "ordering": "newest_first_in_linea_md",
            **({"probe": True} if config.probe_output else {}),
        },
        "revisiones": enriched,
    }

    md_path = raw_dir / "linea.md"
    json_path = raw_dir / "linea.json"
    md_path.write_text(
        build_talk_linea_md(vista["title"], window, generated_at, vista, config),
        encoding="utf-8",
    )
    json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    if window:
        if not run_segment_linea(vista, config):
            write_empty_manifest(vista, generated_at, config)
    else:
        write_empty_manifest(vista, generated_at, config)
    enrich_manifest(vista, milestones, config)
    anchors_path = write_anchors(vista, window, config)

    return {
        "slug": vista["slug"],
        "title": vista["title"],
        "revision_count": len(window),
        "window": {"start": config.window_start, "end": config.window_end},
        "probe": config.probe_output,
        "md": str(md_path),
        "manifest": str(config.manifest_path(vista["slug"])),
        "anchors": str(anchors_path),
    }


def parse_date_arg(value: str) -> str:
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"expected YYYY-MM-DD, got {value!r}") from exc
    return value


def resolve_config(args: argparse.Namespace) -> FetchConfig:
    if args.full_history:
        window_start = FULL_HISTORY_START
        window_end = FULL_HISTORY_END
    else:
        window_start = args.window_start or DEFAULT_WINDOW_START
        window_end = args.window_end or DEFAULT_WINDOW_END
    if window_start > window_end:
        raise SystemExit("--window-start must be on or before --window-end")
    default_window = (
        window_start == DEFAULT_WINDOW_START and window_end == DEFAULT_WINDOW_END
    )
    probe_output = bool(args.probe_output) or args.full_history or not default_window
    return FetchConfig(
        window_start=window_start,
        window_end=window_end,
        probe_output=probe_output,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", help="Single vista slug (default: all)")
    parser.add_argument(
        "--vista",
        help="Alias for --slug (discusion-pseudociencia, usuario-discusion-ignacio-icke, …)",
    )
    parser.add_argument("--all-anchors", action="store_true", help="Process all 4 talk vistas")
    parser.add_argument(
        "--window-start",
        type=parse_date_arg,
        metavar="YYYY-MM-DD",
        help=f"Inclusive window start (default: {DEFAULT_WINDOW_START})",
    )
    parser.add_argument(
        "--window-end",
        type=parse_date_arg,
        metavar="YYYY-MM-DD",
        help=f"Inclusive window end (default: {DEFAULT_WINDOW_END})",
    )
    parser.add_argument(
        "--full-history",
        action="store_true",
        help="Fetch entire revision history (wide window; for probe vistas)",
    )
    parser.add_argument(
        "--probe-output",
        action="store_true",
        help="Write to talk/{slug}/probe/ + manifest.probe.json (no overwrite oct–nov)",
    )
    args = parser.parse_args()

    slug = args.vista or args.slug
    vistas = TALK_VISTAS
    if slug:
        vistas = [v for v in TALK_VISTAS if v["slug"] == slug]
        if not vistas:
            parser.error(f"Unknown slug/vista: {slug}")

    if not args.all_anchors and not slug:
        parser.error("Provide --all-anchors, --slug, or --vista")

    config = resolve_config(args)

    milestones = load_article_milestones()
    for oid in ARTICLE_ALIGNMENT_OLDIDS:
        if not any(m["oldid"] == oid for m in milestones):
            from mw_client import fetch_revision_meta

            meta = fetch_revision_meta(oid)
            milestones.append(
                {
                    "oldid": oid,
                    "title": "Pseudociencia",
                    "timestamp": meta["timestamp"],
                    "milestone": True,
                }
            )

    results = []
    for vista in vistas:
        results.append(process_vista(vista, milestones, config))

    print(
        json.dumps(
            {
                "ok": True,
                "window": {"start": config.window_start, "end": config.window_end},
                "probe_output": config.probe_output,
                "vistas": results,
            },
            indent=2,
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
