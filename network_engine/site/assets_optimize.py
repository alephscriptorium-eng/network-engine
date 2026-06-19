# SPDX-License-Identifier: GPL-3.0-or-later
"""Optimiza logos PNG y genera favicon para el build estático."""

from __future__ import annotations

import io
from pathlib import Path

from network_engine.paths import SITE_DIR

SHARED_ASSETS = SITE_DIR / "assets" / "shared"
LOGO_SOURCES = {
    "logo.png": 128,
    "logo_scriptorium.png": 128,
}
FAVICON_SIZE = 32
MAX_OUTPUT_BYTES = 80_000


def _require_pillow():
    try:
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError(
            "Pillow es necesario para optimizar logos. Instala con: pip install -e \".[build]\""
        ) from exc
    return Image


def _source_path(name: str) -> Path:
    source = SHARED_ASSETS / f"{Path(name).stem}.source.png"
    if source.exists():
        return source
    return SHARED_ASSETS / name


def _save_png(img, dest: Path, max_bytes: int = MAX_OUTPUT_BYTES) -> None:
    Image = _require_pillow()
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA")
    for quality in (9, 6, 3):
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True, compress_level=quality)
        if buf.tell() <= max_bytes or quality == 3:
            dest.write_bytes(buf.getvalue())
            return


def optimizar_logos(dest_assets: Path) -> None:
    """Genera logos web y favicon en dest_assets a partir de fuentes en shared/."""
    Image = _require_pillow()
    dest_assets.mkdir(parents=True, exist_ok=True)

    logo_for_favicon = None
    for filename, max_dim in LOGO_SOURCES.items():
        src = _source_path(filename)
        if not src.exists():
            continue
        with Image.open(src) as im:
            im = im.convert("RGBA")
            im.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            _save_png(im, dest_assets / filename)
            if filename == "logo.png":
                logo_for_favicon = im.copy()

    if logo_for_favicon is None:
        existing = dest_assets / "logo.png"
        if existing.exists():
            with Image.open(existing) as im:
                logo_for_favicon = im.convert("RGBA")
    if logo_for_favicon is not None:
        fav = logo_for_favicon.copy()
        fav.thumbnail((FAVICON_SIZE, FAVICON_SIZE), Image.Resampling.LANCZOS)
        _save_png(fav, dest_assets / "favicon.png", max_bytes=16_000)
