"""Entry point: python main.py"""

import asyncio
import logging
from pathlib import Path

from geobot.config import Config, load_dotenv

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    load_dotenv(Path(__file__).with_name(".env"))
    from geobot.bot import run

    asyncio.run(run(Config.from_env()))
