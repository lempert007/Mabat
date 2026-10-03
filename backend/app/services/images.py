"""Image helpers: attachment thumbnails and project covers."""

from pathlib import Path

from PIL import Image, ImageOps

THUMB_SIZE = (640, 640)
COVER_SIZE = (1280, 800)


class UnreadableImage(Exception):
    """The file claims to be an image but Pillow cannot decode it."""


def write_thumbnail(source: Path, target: Path) -> tuple[int, int]:
    """Write a JPEG thumbnail of `source` and return the original's width and height."""
    try:
        with Image.open(source) as img:
            size = (img.width, img.height)
            img = ImageOps.exif_transpose(img).convert("RGB")
            img.thumbnail(THUMB_SIZE)
            img.save(target, "JPEG", quality=85, optimize=True)
    except (OSError, Image.DecompressionBombError) as exc:
        raise UnreadableImage() from exc
    return size


def write_cover(source: Path, target: Path) -> None:
    """Normalize a viewer capture into a JPEG cover image."""
    try:
        with Image.open(source) as img:
            img = img.convert("RGB")
            img.thumbnail(COVER_SIZE)
            img.save(target, "JPEG", quality=88, optimize=True)
    except (OSError, Image.DecompressionBombError) as exc:
        raise UnreadableImage() from exc
