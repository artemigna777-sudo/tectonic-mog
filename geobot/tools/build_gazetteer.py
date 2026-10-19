"""Build geobot/data/ru_places.sqlite: python tools/build_gazetteer.py [RU.txt]"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from geobot.gazetteer_build import main  # noqa: E402

main()
