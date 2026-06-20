#!/usr/bin/env python3
"""Shared MediaWiki API client for linea-aleph fetch scripts."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

API_ES = "https://es.wikipedia.org/w/api.php"
API_EN = "https://en.wikipedia.org/w/api.php"
USER_AGENT = "linea-aleph/1.0 (BOT_ALEPH corpus; educational)"
DEFAULT_TIMEOUT = 60
MAX_429_RETRIES = 3


def api_url(lang: str = "es") -> str:
    return API_ES if lang == "es" else API_EN


def api_get(
    params: dict[str, Any],
    *,
    lang: str = "es",
    timeout: int = DEFAULT_TIMEOUT,
    retry_429: bool = True,
) -> dict:
    """GET w/api.php with User-Agent, optional 429 backoff."""
    base = api_url(lang)
    url = base + "?" + urllib.parse.urlencode({**params, "format": "json"})
    last_err: Exception | None = None
    attempts = MAX_429_RETRIES + 1 if retry_429 else 1
    for attempt in range(attempts):
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            last_err = exc
            if exc.code == 429 and retry_429 and attempt < attempts - 1:
                time.sleep(2 ** (attempt + 2))
                continue
            raise
        except Exception as exc:
            last_err = exc
            raise
    if last_err:
        raise last_err
    raise RuntimeError("api_get failed without error")


def human_source_url(title: str, oldid: int, lang: str = "es") -> str:
    """index.php URL for meta.source_url — citation only, not for fetch."""
    host = "es.wikipedia.org" if lang == "es" else "en.wikipedia.org"
    title_underscore = title.replace(" ", "_")
    t = urllib.parse.quote(title_underscore, safe="/:")
    return f"https://{host}/w/index.php?title={t}&oldid={oldid}"


def fetch_revision_content(oldid: int, title: str = "Problema de la demarcación", *, lang: str = "es") -> dict:
    """Fetch full wikitext for one revision by oldid."""
    data = api_get(
        {
            "action": "query",
            "prop": "revisions",
            "revids": oldid,
            "rvprop": "content|timestamp|user|ids|comment",
            "rvslots": "main",
        },
        lang=lang,
    )
    page = next(iter(data.get("query", {}).get("pages", {}).values()))
    rev = page["revisions"][0]
    slot = rev["slots"]["main"]
    resolved_title = page.get("title", title)
    return {
        "oldid": oldid,
        "title": resolved_title,
        "timestamp": rev.get("timestamp"),
        "user": rev.get("user"),
        "comment": rev.get("comment", ""),
        "wikitext": slot.get("*", ""),
        "source_url": human_source_url(resolved_title, oldid, lang),
        "source_api": api_url(lang),
    }


def fetch_latest_revision_content(title: str = "Problema de la demarcación", *, lang: str = "es") -> dict:
    """Fetch wikitext for the current (latest) revision of an article."""
    data = api_get(
        {
            "action": "query",
            "prop": "revisions",
            "titles": title,
            "rvlimit": 1,
            "rvprop": "content|timestamp|user|ids|comment",
            "rvslots": "main",
        },
        lang=lang,
    )
    page = next(iter(data.get("query", {}).get("pages", {}).values()))
    rev = page["revisions"][0]
    oldid = rev["revid"]
    slot = rev["slots"]["main"]
    resolved_title = page.get("title", title)
    return {
        "oldid": oldid,
        "title": resolved_title,
        "timestamp": rev.get("timestamp"),
        "user": rev.get("user"),
        "comment": rev.get("comment", ""),
        "wikitext": slot.get("*", ""),
        "source_url": human_source_url(resolved_title, oldid, lang),
        "source_api": api_url(lang),
    }


def fetch_revision_meta(revid: int, *, lang: str = "es") -> dict:
    """Revision metadata without body (bytes, parent, user)."""
    data = api_get(
        {
            "action": "query",
            "prop": "revisions",
            "revids": str(revid),
            "rvprop": "ids|timestamp|user|comment|size|parentids",
        },
        lang=lang,
        timeout=90,
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


def fetch_compare(fromrev: int, torev: int, *, lang: str = "es") -> dict:
    """Diff between two revisions via action=compare."""
    data = api_get(
        {
            "action": "compare",
            "fromrev": fromrev,
            "torev": torev,
            "prop": "diff|diffsize|rel",
        },
        lang=lang,
        timeout=90,
    )
    compare = data.get("compare", {})
    if not compare:
        raise ValueError(f"compare failed for {fromrev}→{torev}: {data}")
    return {
        "fromrev": fromrev,
        "torev": torev,
        "diff": compare.get("*", compare.get("body", "")),
        "diffsize": compare.get("diffsize"),
        "rel": compare.get("rel"),
        "source_api": api_url(lang),
    }
