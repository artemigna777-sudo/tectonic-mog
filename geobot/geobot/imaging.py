"""Cut zoomed-in details out of the original photo."""

import io

from PIL import Image, ImageOps


def crop_boxes(data: bytes, boxes: list[dict], out_side: int = 768, pad: float = 0.12) -> list[tuple[str, bytes]]:
    """boxes: [{"box_2d": [ymin, xmin, ymax, xmax] in 0..1000, "label": str}] -> [(label, jpeg)].

    Crops come from the full-resolution original, so small details stay sharp; each crop is
    padded a little for context and scaled so its longer side is `out_side` pixels.
    """
    if not boxes:
        return []
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    w, h = img.size
    out = []
    for b in boxes:
        y0, x0, y1, x1 = (max(0.0, min(1000.0, v)) / 1000 for v in b["box_2d"])
        if y1 <= y0 or x1 <= x0:
            continue
        py, px = (y1 - y0) * pad, (x1 - x0) * pad
        left, top = int(max(0, x0 - px) * w), int(max(0, y0 - py) * h)
        right, bottom = int(min(1, x1 + px) * w), int(min(1, y1 + py) * h)
        if right - left < 24 or bottom - top < 24:
            continue
        piece = img.crop((left, top, right, bottom))
        scale = out_side / max(piece.size)
        piece = piece.resize((max(1, round(piece.width * scale)), max(1, round(piece.height * scale))), Image.LANCZOS)
        buf = io.BytesIO()
        piece.save(buf, "JPEG", quality=88)
        out.append((b.get("label") or "деталь", buf.getvalue()))
    return out
