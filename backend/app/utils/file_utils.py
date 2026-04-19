import os
import re
from fastapi import UploadFile


ALLOWED_EXTENSIONS = {
    "pdf", "dwg", "dxf", "png", "jpg", "jpeg", "gif", "geojson", "json"
}


def sanitize_filename(filename: str) -> str:
    name = re.sub(r'[^\w\s\-\.]', '', filename)
    name = re.sub(r'\s+', '_', name)
    return name


def validate_file(file: UploadFile, max_size_mb: int = 50) -> bool:
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        return False
    return True


def get_file_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if filename else ""
    mapping = {
        "pdf": "pdf",
        "dwg": "autocad_dwg",
        "dxf": "autocad_dxf",
        "png": "image",
        "jpg": "image",
        "jpeg": "image",
        "gif": "image",
        "geojson": "geojson",
        "json": "geojson",
    }
    return mapping.get(ext, "other")
