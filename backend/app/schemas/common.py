from pydantic import BaseModel
from typing import Optional, List


class PaginationParams(BaseModel):
    page: int = 1
    per_page: int = 20


class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    per_page: int
    pages: int
