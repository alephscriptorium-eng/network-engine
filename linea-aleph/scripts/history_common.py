#!/usr/bin/env python3
"""Shared Wikipedia revision-history helpers for article and talk fetch scripts."""

from __future__ import annotations

import re
import urllib.parse
from datetime import datetime

from mw_client import api_get

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
            raise ValueError(f"Page not found: {title}")
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
        section_part = f" . . ([→]({sec_url} \"{title}\"){section})"
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


def parse_iso_ts(iso_ts: str) -> datetime:
    return datetime.strptime(iso_ts[:19], "%Y-%m-%dT%H:%M:%S")


def in_date_window(iso_ts: str, start: str, end: str) -> bool:
    """Inclusive window on ISO date prefixes YYYY-MM-DD."""
    day = iso_ts[:10]
    return start <= day <= end
