from pydantic import BaseModel

from app.schemas.product import ProductCreate
from app.schemas.user import UserCreate


class SetupInitRequest(BaseModel):
    admin: UserCreate
    product: ProductCreate
