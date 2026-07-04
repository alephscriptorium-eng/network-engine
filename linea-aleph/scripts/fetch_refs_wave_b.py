#!/usr/bin/env python3
"""Wave B: fetch meta (and ~10% body sample) for external refs in demarcación index."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from mw_client import USER_AGENT  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INDEX = ROOT / "cache" / "viajes" / "refs-12763920-index.json"
DEFAULT_OUTPUT = ROOT / "cache" / "viajes" / "refs-wave-b-external.json"
URL_RE = re.compile(r"https?://[^\s\]<>'\"]+")
BODY_SAMPLE_BYTES = 4096


def collect_urls(entries: list[dict]) -> dict[str, dict]:
    urls: dict[str, dict] = {}
    for e in entries:
        tipo = e["tipo"]
        if tipo == "external":
            targets = [e["target"]]
        elif tipo == "biblio":
            targets = [m.group(0).rstrip(".,)") for m in URL_RE.finditer(e.get("context_snippet", ""))]
        else:
            continue
        for url in targets:
            if url not in urls:
                urls[url] = {"tipo": tipo, "seccion_origen": set(), "context_snippets": []}
            urls[url]["seccion_origen"].add(e["seccion_origen"])
            snippet = e.get("context_snippet", "")
            if snippet and snippet not in urls[url]["context_snippets"]:
                urls[url]["context_snippets"].append(snippet[:200])
    return urls


def normalize_url(url: str) -> str:
    parts = urllib.parse.urlsplit(url)
    path = urllib.parse.quote(parts.path, safe="/:@!$&'()*+,;=-._~")
    query = urllib.parse.quote(parts.query, safe="=&?/:;+,-._~") if parts.query else parts.query
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, path, query, parts.fragment))


def should_sample(url: str, rate: float) -> bool:
    bucket = int(hashlib.sha256(url.encode()).hexdigest(), 16) % 100
    return bucket < int(rate * 100)


def fetch_meta(url: str, timeout: float = 30.0) -> dict:
    url = normalize_url(url)
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return {
                "status": "ok",
                "status_code": resp.status,
                "content_type": resp.headers.get("Content-Type"),
                "content_length": resp.headers.get("Content-Length"),
                "final_url": resp.geturl(),
            }
    except urllib.error.HTTPError as exc:
        if exc.code in (405, 501):
            return _meta_via_get(url, timeout, head_failed=True)
        return {
            "status": "error",
            "status_code": exc.code,
            "error": str(exc.reason),
            "final_url": url,
        }
    except Exception as exc:  # noqa: BLE001
        return _meta_via_get(url, timeout, head_failed=True, head_error=str(exc))


def _meta_via_get(
    url: str,
    timeout: float,
    head_failed: bool = False,
    head_error: str | None = None,
) -> dict:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Range": f"bytes=0-{BODY_SAMPLE_BYTES - 1}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            meta = {
                "status": "ok",
                "status_code": resp.status,
                "content_type": resp.headers.get("Content-Type"),
                "content_length": resp.headers.get("Content-Length"),
                "final_url": resp.geturl(),
            }
            if head_failed:
                meta["head_fallback"] = True
                if head_error:
                    meta["head_error"] = head_error
            return meta
    except Exception as exc:  # noqa: BLE001
        out = {"status": "error", "error": str(exc), "final_url": url}
        if head_failed:
            out["head_fallback"] = True
            if head_error:
                out["head_error"] = head_error
        return out


def fetch_body_sample(url: str, timeout: float = 30.0) -> dict | None:
    url = normalize_url(url)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Range": f"bytes=0-{BODY_SAMPLE_BYTES - 1}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read(BODY_SAMPLE_BYTES)
            try:
                text = raw.decode("utf-8", errors="replace")
            except Exception:  # noqa: BLE001
                text = raw.decode("latin-1", errors="replace")
            return {
                "sampled": True,
                "bytes": len(raw),
                "snippet": text[:BODY_SAMPLE_BYTES],
                "final_url": resp.geturl(),
            }
    except Exception as exc:  # noqa: BLE001
        return {"sampled": True, "error": str(exc)}


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch external ref meta for Wave B")
    parser.add_argument("--index", type=Path, default=DEFAULT_INDEX)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--sample-rate", type=float, default=0.1)
    parser.add_argument("--sleep", type=float, default=1.0)
    parser.add_argument("--limit", type=int, default=0, help="Max URLs (0 = all)")
    args = parser.parse_args()

    index = json.loads(args.index.read_text(encoding="utf-8"))
    urls = collect_urls(index["entries"])
    items = sorted(urls.items())
    if args.limit:
        items = items[: args.limit]

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    refs: list[dict] = []
    meta_ok = meta_err = sampled = sample_err = 0

    for url, info in items:
        if args.sleep:
            time.sleep(args.sleep)
        meta = fetch_meta(url)
        if meta.get("status") == "ok":
            meta_ok += 1
        else:
            meta_err += 1
        meta["fetched_at"] = now

        body_sample = None
        if should_sample(url, args.sample_rate):
            if args.sleep:
                time.sleep(args.sleep)
            body_sample = fetch_body_sample(url)
            if body_sample and body_sample.get("error"):
                sample_err += 1
            else:
                sampled += 1

        refs.append(
            {
                "url": url,
                "tipo": info["tipo"],
                "seccion_origen": sorted(info["seccion_origen"]),
                "context_snippets": info["context_snippets"][:3],
                "meta": meta,
                "body_sample": body_sample,
            }
        )

    out = {
        "generated_at": now,
        "wave": "B",
        "source_index": str(args.index.relative_to(ROOT)).replace("\\", "/"),
        "source_oldid": index.get("source_oldid"),
        "sample_rate": args.sample_rate,
        "counts": {
            "unique_urls": len(items),
            "meta_ok": meta_ok,
            "meta_failed": meta_err,
            "body_sampled": sampled,
            "body_sample_failed": sample_err,
        },
        "refs": refs,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(
        f"wrote {args.output} — {meta_ok}/{len(items)} meta ok, "
        f"{sampled} body samples ({args.sample_rate:.0%})"
    )


if __name__ == "__main__":
    main()
