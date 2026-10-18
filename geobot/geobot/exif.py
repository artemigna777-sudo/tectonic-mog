"""Read location, direction and capture time from photo metadata."""

import io
from dataclasses import dataclass

from PIL import ExifTags, Image, ImageOps

try:  # iPhone files sent "as file" are often HEIC
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:  # pragma: no cover - optional dependency
    pass

GPS_IFD = 0x8825
EXIF_IFD = 0x8769


@dataclass
class PhotoMeta:
    lat: float | None = None
    lon: float | None = None
    altitude: float | None = None
    direction: float | None = None  # degrees from north the camera faced
    taken_at: str | None = None  # "YYYY:MM:DD HH:MM:SS", local camera time
    utc_offset: str | None = None  # "+03:00"
    camera: str | None = None

    @property
    def has_gps(self) -> bool:
        return self.lat is not None and self.lon is not None


def _num(v) -> float:
    if isinstance(v, tuple) and len(v) == 2:  # old-style rational
        return v[0] / v[1] if v[1] else 0.0
    return float(v)


def _dms(values, ref) -> float | None:
    try:
        d, m, s = (_num(x) for x in values)
    except (TypeError, ValueError, ZeroDivisionError):
        return None
    deg = d + m / 60 + s / 3600
    return -deg if str(ref).upper() in ("S", "W") else deg


def read_meta(data: bytes) -> PhotoMeta:
    meta = PhotoMeta()
    try:
        img = Image.open(io.BytesIO(data))
        exif = img.getexif()
    except Exception:
        return meta
    if not exif:
        return meta

    make, model = exif.get(0x010F), exif.get(0x0110)
    if make or model:
        meta.camera = " ".join(str(x).strip() for x in (make, model) if x)

    sub = exif.get_ifd(EXIF_IFD)
    tags = {ExifTags.TAGS.get(k, k): v for k, v in sub.items()}
    meta.taken_at = tags.get("DateTimeOriginal") or exif.get(0x0132)
    meta.utc_offset = tags.get("OffsetTimeOriginal") or tags.get("OffsetTime")

    gps = {ExifTags.GPSTAGS.get(k, k): v for k, v in exif.get_ifd(GPS_IFD).items()}
    if "GPSLatitude" in gps and "GPSLongitude" in gps:
        meta.lat = _dms(gps["GPSLatitude"], gps.get("GPSLatitudeRef", "N"))
        meta.lon = _dms(gps["GPSLongitude"], gps.get("GPSLongitudeRef", "E"))
        if meta.lat == 0 and meta.lon == 0:  # placeholder some apps write
            meta.lat = meta.lon = None
    try:
        if "GPSImgDirection" in gps:
            meta.direction = round(_num(gps["GPSImgDirection"]) % 360, 1)
        if "GPSAltitude" in gps:
            meta.altitude = round(_num(gps["GPSAltitude"]), 1)
    except (TypeError, ValueError, ZeroDivisionError):
        pass
    return meta


def jpeg_for_upload(data: bytes, max_side: int = 1600, max_bytes: int = 1_000_000) -> bytes:
    """Re-encode to a JPEG under max_bytes (OCR.space free tier limit is 1 MB)."""
    img = Image.open(io.BytesIO(data))
    k = max_side / max(img.size)
    if k < 1:  # JPEG: decode at reduced scale straight away, saves up to ~4x memory
        img.draft("RGB", (int(img.width * k), int(img.height * k)))
    img = ImageOps.exif_transpose(img).convert("RGB")  # phones store rotation in EXIF
    img.thumbnail((max_side, max_side))
    quality = 88
    while True:
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=quality)
        if buf.tell() <= max_bytes or quality <= 40:
            return buf.getvalue()
        quality -= 12
        if quality < 64:
            img.thumbnail((int(img.width * 0.8), int(img.height * 0.8)))
