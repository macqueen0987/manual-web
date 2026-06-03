import logging

from app.core.config import get_settings
from app.factory import create_app, default_lifespan

settings = get_settings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

app = create_app(lifespan=default_lifespan)
