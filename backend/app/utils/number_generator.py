from datetime import datetime


def generate_number(prefix: str, count: int) -> str:
    year = datetime.utcnow().year
    return f"{prefix}-{year}-{count + 1:03d}"
