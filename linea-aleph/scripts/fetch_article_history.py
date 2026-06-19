#!/usr/bin/env python3
"""Fetch article revision history from es.wikipedia → {corpus-dir}/raw/linea.md + linea.json."""

from __future__ import annotations

import argparse
import json
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = "https://es.wikipedia.org/w/api.php"
USER_AGENT = "linea-aleph/1.0 (BOT_ALEPH corpus; educational)"

# SolveCoagula window anchors from raw/linea2.json (Pseudociencia)
DEFAULT_FIRST_SC = 11951464
DEFAULT_LAST_SC = 12910974

MONTHS_ES = {
    1: "ene",
    2: "feb",
    3: "mar",
    4: "abr",
    5: "may",
    6: "jun",
    7: "jul",
    8: "ago",
    9: "sep",
    10: "oct",
    11: "nov",
    12: "dic",
}


def api_get(params: dict) -> dict:
    url = API + "?" + urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_revision_meta(revid: int) -> dict:
    data = api_get(
        {
            "action": "query",
            "prop": "revisions",
            "revids": str(revid),
            "rvprop": "ids|timestamp|user|comment|size|parentids",
        }
    )
    page = next(iter(data.get("query", {}).get("pages", {}).values()))
    if "missing" in page:
        raise ValueError(f"Revision not found: {revid}")
    rev = page["revisions"][0]
    return {
        "revid": rev["revid"],
        "parentid": rev.get("parentid"),
        "timestamp": rev["timestamp"],
        "user": rev.get("user", ""),
        "comment": rev.get("comment", "") or "",
        "size": rev.get("size", 0),
        "title": page.get("title", ""),
    }


def fetch_all_revisions(title: str) -> list[dict]:
    title_underscore = title.replace(" ", "_")
    revisions: list[dict] = []
    rvcontinue: str | None = None
    while True:
        params: dict = {
            "action": "query",
            "prop": "revisions",
            "titles": title_underscore,
            "rvlimit": "500",
            "rvprop": "ids|timestamp|user|comment|size|parentids",
        }
        if rvcontinue:
            params["rvcontinue"] = rvcontinue
        data = api_get(params)
        pages = data.get("query", {}).get("pages", {})
        page = next(iter(pages.values()))
        if "missing" in page:
            raise ValueError(f"Article not found: {title}")
        for rev in page.get("revisions", []):
            revisions.append(
                {
                    "revid": rev["revid"],
                    "parentid": rev.get("parentid"),
                    "timestamp": rev["timestamp"],
                    "user": rev.get("user", ""),
                    "comment": rev.get("comment", "") or "",
                    "size": rev.get("size", 0),
                }
            )
        rvcontinue = data.get("continue", {}).get("rvcontinue")
        if not rvcontinue:
            break
    return revisions


def format_ts_display(iso_ts: str) -> str:
    """WP history style: HH:MM DD mon YYYY."""
    dt = datetime.strptime(iso_ts[:19], "%Y-%m-%dT%H:%M:%S")
    return f"{dt.hour:02d}:{dt.minute:02d} {dt.day} {MONTHS_ES[dt.month]} {dt.year}"


def format_bytes(n: int) -> str:
    return f"{n:,}".replace(",", "\xa0")


def format_delta(n: int) -> str:
    if n > 500:
        return f"**(+{n:,})**".replace(",", "\xa0")
    return f"({n:+d})" if n != 0 else "(0)"


def extract_section(comment: str) -> str | None:
    m = re.match(r"/\*\s*(.+?)\s*\*/", comment)
    return m.group(1).strip() if m else None


def title_url(title: str) -> str:
    return urllib.parse.quote(title.replace(" ", "_"), safe="/:")


def format_history_line(
    rev: dict,
    prev_size: int | None,
    title: str,
    next_revid: int | None,
) -> str:
    """Single list item compatible with segment_linea.parse_registro_line."""
    oldid = rev["revid"]
    parent = rev["parentid"] or 0
    ts = format_ts_display(rev["timestamp"])
    user = rev["user"]
    size = rev["size"]
    delta = size - prev_size if prev_size is not None else 0
    comment = rev["comment"].replace("\n", " ").strip()
    section = extract_section(comment)
    t = title_url(title)

    user_enc = urllib.parse.quote(user.replace(" ", "_"))
    user_link = (
        f"[{user}](https://es.wikipedia.org/wiki/Usuario:{user_enc} "
        f'"Usuario:{user}")'
    )
    disc = f"https://es.wikipedia.org/wiki/Usuario_discusi%C3%B3n:{user_enc}"
    contribs = f"https://es.wikipedia.org/wiki/Especial:Contribuciones/{user_enc}"

    act_oldid = next_revid if next_revid else oldid
    diff_act = (
        f"https://es.wikipedia.org/w/index.php?title={t}"
        f"&diff={act_oldid}&oldid={oldid}"
    )
    diff_ant = (
        f"https://es.wikipedia.org/w/index.php?title={t}"
        f"&diff={oldid}&oldid={parent}"
    )
    rev_url = f"https://es.wikipedia.org/w/index.php?title={t}&oldid={oldid}"
    undo = (
        f"https://es.wikipedia.org/w/index.php?title={t}"
        f"&action=edit&undoafter={parent}&undo={oldid}"
    )

    delta_str = format_delta(delta)
    summary = comment if comment else "(sin resumen)"
    if section:
        sec_url = f"https://es.wikipedia.org/wiki/{t}#{urllib.parse.quote(section.replace(' ', '_'))}"
        section_part = (
            f" . . ([→]({sec_url} \"{title}\"){section})"
        )
    else:
        section_part = f" . . ({summary})"

    return (
        f"-   ([act]({diff_act} \"{title}\") - [ant]({diff_ant} \"{title}\")) "
        f"[{ts}]({rev_url} \"{title}\") "
        f"{user_link} "
        f"([discusión]({disc} \"Usuario discusión:{user}\") - "
        f"[contribuciones]({contribs} \"Especial:Contribuciones/{user}\")) "
        f". . ({format_bytes(size)} bytes) {delta_str}{section_part} "
        f"([deshacer]({undo} \"{title}\"))"
    )


def filter_window(
    revisions: list[dict],
    previo_revid: int,
    last_sc_revid: int,
) -> list[dict]:
    """All revisions after previo through last SC edit (inclusive)."""
    by_id = {r["revid"]: r for r in revisions}
    if last_sc_revid not in by_id:
        raise ValueError(f"Last SC revision {last_sc_revid} not in article history")
    last_ts = by_id[last_sc_revid]["timestamp"]
    previo_ts = by_id.get(previo_revid, {}).get("timestamp")
    if not previo_ts:
        meta = fetch_revision_meta(previo_revid)
        previo_ts = meta["timestamp"]

    window = [
        r
        for r in revisions
        if r["timestamp"] > previo_ts and r["timestamp"] <= last_ts
    ]
    window.sort(key=lambda r: r["timestamp"])
    return window


def build_linea_md(
    title: str,
    window: list[dict],
    previo_revid: int,
    first_sc: int,
    last_sc: int,
    generated_at: str,
) -> str:
    sizes: dict[int, int] = {previo_revid: 0}
    for r in window:
        sizes[r["revid"]] = r["size"]

    lines = [
        f"# {title} — historial artículo (es.wikipedia)",
        f"# generado: {generated_at} · registros en ventana: {len(window)}",
        "",
        f"Artículo: [{title}](https://es.wikipedia.org/wiki/{title_url(title)})",
        "",
        f"Ventana SolveCoagula: previo oldid **{previo_revid}** → última edit SC "
        f"**{last_sc}** (primera SC: **{first_sc}**).",
        f"Anclas desde [`raw/linea2.json`](../raw/linea2.json) (contribuciones usuario).",
        f"Incluye **todos** los editores en la ventana (paridad con export `linea.md`).",
        "",
    ]

    # newest first
    ordered = list(reversed(window))
    for i, rev in enumerate(ordered):
        parent = rev["parentid"]
        prev_size = sizes.get(parent) if parent else None
        next_rev = ordered[i - 1]["revid"] if i > 0 else None
        lines.append(format_history_line(rev, prev_size, title, next_rev))

    lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--title", default="Pseudociencia")
    parser.add_argument("--corpus-dir", default="pseudociencia")
    parser.add_argument("--first-sc", type=int, default=DEFAULT_FIRST_SC)
    parser.add_argument("--last-sc", type=int, default=DEFAULT_LAST_SC)
    args = parser.parse_args()

    corpus = ROOT / args.corpus_dir
    raw_dir = corpus / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    first_meta = fetch_revision_meta(args.first_sc)
    previo_revid = first_meta["parentid"]
    if not previo_revid:
        raise ValueError(f"No parent for first SC revision {args.first_sc}")

    previo_meta = fetch_revision_meta(previo_revid)
    all_revs = fetch_all_revisions(args.title)
    window = filter_window(all_revs, previo_revid, args.last_sc)

    enriched = []
    by_id = {r["revid"]: r for r in all_revs}
    by_id[previo_revid] = previo_meta
    for r in window:
        parent = r["parentid"]
        parent_size = by_id.get(parent, {}).get("size", 0) if parent else 0
        enriched.append({**r, "byte_delta": r["size"] - parent_size})

    payload = {
        "meta": {
            "title": args.title,
            "wiki": "es",
            "generated_at": generated_at,
            "corpus_dir": args.corpus_dir,
            "window": {
                "previo_oldid": previo_revid,
                "first_sc_oldid": args.first_sc,
                "last_sc_oldid": args.last_sc,
                "previo_timestamp": previo_meta["timestamp"],
                "first_sc_timestamp": first_meta["timestamp"],
            },
            "revision_count": len(window),
            "ordering": "newest_first_in_linea_md",
        },
        "previo": previo_meta,
        "revisiones": enriched,
    }

    md_path = raw_dir / "linea.md"
    json_path = raw_dir / "linea.json"
    md_path.write_text(
        build_linea_md(
            args.title,
            window,
            previo_revid,
            args.first_sc,
            args.last_sc,
            generated_at,
        ),
        encoding="utf-8",
    )
    json_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    print(
        json.dumps(
            {
                "ok": True,
                "revision_count": len(window),
                "previo_oldid": previo_revid,
                "first_sc": args.first_sc,
                "last_sc": args.last_sc,
                "md": str(md_path),
                "json": str(json_path),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
