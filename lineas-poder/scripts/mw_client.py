"""Minimal MediaWiki API client for lineas-poder."""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request

API_URL = "https://es.wikipedia.org/w/api.php"
USER_AGENT = "lineas-poder/1.0 (corpus educational; non-commercial)"


def _request(params: dict, sleep: float = 0.0) -> dict:
    if sleep:
        time.sleep(sleep)
    query = urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request(
        f"{API_URL}?{query}",
        headers={"User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def api_get(params: dict, sleep: float = 0.0) -> dict:
    """Public MediaWiki API GET."""
    return _request(params, sleep=sleep)


def fetch_revision_content(oldid: int, sleep: float = 0.0) -> tuple[str, dict]:
    data = _request(
        {
            "action": "query",
            "prop": "revisions",
            "revids": str(oldid),
            "rvprop": "content|ids|timestamp|user|size|parentids",
            "rvslots": "main",
        },
        sleep=sleep,
    )
    page = next(iter(data["query"]["pages"].values()))
    if "missing" in page:
        raise ValueError(f"Revision {oldid} not found")
    rev = page["revisions"][0]
    slots = rev.get("slots", {}).get("main", {})
    content = slots.get("*") or rev.get("*", "")
    meta = {
        "oldid": rev["revid"],
        "parent_oldid": rev.get("parentid"),
        "title": page.get("title", ""),
        "timestamp": rev.get("timestamp", ""),
        "user": rev.get("user", ""),
        "bytes": rev.get("size", 0),
    }
    return content, meta


def fetch_revision_meta(oldid: int, sleep: float = 0.0) -> dict:
    data = _request(
        {
            "action": "query",
            "prop": "revisions",
            "revids": str(oldid),
            "rvprop": "ids|timestamp|user|size|parentids",
        },
        sleep=sleep,
    )
    page = next(iter(data["query"]["pages"].values()))
    rev = page["revisions"][0]
    return {
        "oldid": rev["revid"],
        "parent_oldid": rev.get("parentid"),
        "title": page.get("title", ""),
        "timestamp": rev.get("timestamp", ""),
        "user": rev.get("user", ""),
        "bytes": rev.get("size", 0),
    }


def fetch_latest_revision(title: str, sleep: float = 0.0) -> tuple[str, dict]:
    data = _request(
        {
            "action": "query",
            "prop": "revisions",
            "titles": title,
            "rvlimit": "1",
            "rvprop": "content|ids|timestamp|user|size|parentids",
            "rvslots": "main",
        },
        sleep=sleep,
    )
    page = next(iter(data["query"]["pages"].values()))
    if "missing" in page:
        raise ValueError(f"Page not found: {title}")
    rev = page["revisions"][0]
    slots = rev.get("slots", {}).get("main", {})
    content = slots.get("*") or rev.get("*", "")
    meta = {
        "oldid": rev["revid"],
        "parent_oldid": rev.get("parentid"),
        "title": page.get("title", title),
        "timestamp": rev.get("timestamp", ""),
        "user": rev.get("user", ""),
        "bytes": rev.get("size", 0),
    }
    return content, meta
