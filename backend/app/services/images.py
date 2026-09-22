"""Image helpers: thumbnails and dimension probing."""

from pathlib import Path

from PIL import Image, ImageOps

THUMB_SIZE = (640, 640)
COVER_SIZE = (1280, 800)


def probe_dimensions(path: Path) -> tuple[int, int] | None:
    try:
        with Image.open(path) as img:
            return img.width, img.height
    except OSError:
        return None


def write_thumbnail(source: Path, target: Path, size: tuple[int, int] = THUMB_SIZE) -> None:
    with Image.open(source) as img:
        img = ImageOps.exif_transpose(img).convert("RGB")
        img.thumbnail(size)
        img.save(target, "JPEG", quality=85, optimize=True)


def write_cover(source: Path, target: Path) -> None:
    """Normalize a viewer capture into a JPEG cover image."""
    with Image.open(source) as img:
        img = img.convert("RGB")
        img.thumbnail(COVER_SIZE)
        img.save(target, "JPEG", quality=88, optimize=True)
