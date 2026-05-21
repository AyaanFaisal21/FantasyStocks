from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent


def load_backend_env() -> None:
    load_dotenv(PROJECT_ROOT / ".env", override=False)
    load_dotenv(BACKEND_DIR / ".env.back", override=True)
