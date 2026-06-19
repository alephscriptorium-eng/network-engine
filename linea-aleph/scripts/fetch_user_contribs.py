#!/usr/bin/env python3
"""Harvest SolveCoagula user contributions from es.wikipedia → raw/linea2."""

from __future__ import annotations

import argparse
import json
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "raw"
API = "https://es.wikipedia.org/w/api.php"
USER_AGENT = "linea-aleph/1.0 (BOT_ALEPH corpus; educational)"
DEMARCACION = "Problema de la demarcación"
LINEA1_COUNT = 677


def api_get(params: dict) -> dict:
    url = API + "?" + urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_user_meta(username: str) -> dict:
    data = api_get(
        {
            "action": "query",
            "list": "users",
            "ususers": username,
            "usprop": "editcount|registration|groups",
        }
    )
    users = data.get("query", {}).get("users", [])
    if not users or "missing" in users[0]:
        raise ValueError(f"User not found: {username}")
    return users[0]


def fetch_contribs(username: str, namespace: int) -> list[dict]:
    contribs: list[dict] = []
    uccontinue: str | None = None
    while True:
        params: dict = {
            "action": "query",
            "list": "usercontribs",
            "ucuser": username,
            "ucnamespace": str(namespace),
            "uclimit": "500",
            "ucprop": "ids|title|timestamp|comment|size|sizediff",
        }
        if uccontinue:
            params["uccontinue"] = uccontinue
        data = api_get(params)
        batch = data.get("query", {}).get("usercontribs", [])
        for c in batch:
            contribs.append(
                {
                    "revid": c.get("revid"),
                    "oldid": c.get("revid"),
                    "parentid": c.get("parentid"),
                    "title": c.get("title", ""),
                    "timestamp": c.get("timestamp", ""),
                    "comment": c.get("comment", "") or "",
                    "size": c.get("newlen"),
                    "sizediff": c.get("sizediff", 0),
                }
            )
        uccontinue = data.get("continue", {}).get("uccontinue")
        if not uccontinue:
            break
    return contribs


def format_ts_display(iso_ts: str) -> str:
    m = re.match(r"(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})", iso_ts)
    if m:
        return f"{m.group(1)} {m.group(2)}"
    return iso_ts[:16].replace("T", " ")


def format_delta(n: int) -> str:
    return f"+{n}" if n >= 0 else str(n)


def build_linea2_md(
    username: str,
    user_meta: dict,
    contribs: list[dict],
    generated_at: str,
) -> str:
    demarc_count = sum(1 for c in contribs if c["title"] == DEMARCACION)
    gap = demarc_count - LINEA1_COUNT

    lines = [
        f"# {username} — contribuciones NS0 (es.wikipedia)",
        f"# generado: {generated_at} · total: {len(contribs)}",
        "",
        f"Usuario: {username} · editcount: {user_meta.get('editcount', '?')} · "
        f"registration: {user_meta.get('registration', '?')}",
        "",
        f"Nota linea1: `raw/linea.md` tiene {LINEA1_COUNT} registros sobre "
        f"«{DEMARCACION}»; esta API lista {demarc_count} "
        f"(gap {gap:+d} — export 2018 vs contribuciones completas).",
        "",
    ]
    for c in contribs:
        ts = format_ts_display(c["timestamp"])
        delta = format_delta(c.get("sizediff") or 0)
        comment = (c.get("comment") or "").replace("\n", " ").strip()
        if len(comment) > 120:
            comment = comment[:117] + "..."
        suffix = f" · {comment}" if comment else ""
        lines.append(
            f"- [{ts}] **{c['title']}** · oldid {c['oldid']} · {delta}{suffix}"
        )
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--user", default="SolveCoagula")
    parser.add_argument("--namespace", type=int, default=0)
    args = parser.parse_args()

    RAW.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    user_meta = fetch_user_meta(args.user)
    contribs = fetch_contribs(args.user, args.namespace)
    contribs.sort(key=lambda c: c["timestamp"])

    payload = {
        "meta": {
            "user": args.user,
            "namespace": args.namespace,
            "wiki": "es",
            "generated_at": generated_at,
            "editcount": user_meta.get("editcount"),
            "registration": user_meta.get("registration"),
            "contrib_count": len(contribs),
            "ordering": "oldest_first",
            "linea1_note": {
                "article": DEMARCACION,
                "linea1_registros": LINEA1_COUNT,
            },
        },
        "contribuciones": contribs,
    }

    json_path = RAW / "linea2.json"
    md_path = RAW / "linea2.md"
    json_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    md_path.write_text(
        build_linea2_md(args.user, user_meta, contribs, generated_at),
        encoding="utf-8",
    )

    print(
        json.dumps(
            {
                "ok": True,
                "contrib_count": len(contribs),
                "json": str(json_path),
                "md": str(md_path),
                "articles": len({c["title"] for c in contribs}),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
