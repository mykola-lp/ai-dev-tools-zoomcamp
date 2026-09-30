import json
import pathlib

from app.main import app

OUTPUT_PATH = pathlib.Path(__file__).parent.parent / "openapi.json"


def main() -> None:
    schema = app.openapi()
    OUTPUT_PATH.write_text(json.dumps(schema, indent=2))
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
