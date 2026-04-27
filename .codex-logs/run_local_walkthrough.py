import json
import os
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(r"C:\Users\VICTORIA\Desktop\Gladiators")
FRONTEND_ROOT = ROOT / "landrify_frontend"
LOG_DIR = ROOT / ".codex-logs"
LOG_DIR.mkdir(exist_ok=True)

BACKEND_URL = "http://127.0.0.1:8003"
FRONTEND_URL = "http://127.0.0.1:5000"


def wait_for_url(url: str, timeout: float = 90.0) -> None:
    deadline = time.time() + timeout
    last_error = None
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                if 200 <= response.status < 500:
                    return
        except Exception as exc:  # noqa: BLE001
            last_error = exc
        time.sleep(1.0)
    raise RuntimeError(f"Timed out waiting for {url}: {last_error}")


def terminate_process(process: subprocess.Popen | None) -> None:
    if process is None or process.poll() is not None:
        return
    try:
        process.terminate()
        process.wait(timeout=10)
    except Exception:  # noqa: BLE001
        try:
            process.kill()
        except Exception:  # noqa: BLE001
            pass


def main() -> int:
    backend_proc = None
    walkthrough_proc = None

    try:
        backend_env = os.environ.copy()
        backend_env["DEBUG"] = "True"
        backend_env["SECURE_SSL_REDIRECT"] = "False"

        backend_out = open(LOG_DIR / "backend8003.out.log", "w", encoding="utf-8")
        backend_err = open(LOG_DIR / "backend8003.err.log", "w", encoding="utf-8")
        backend_proc = subprocess.Popen(
            [sys.executable, "manage.py", "runserver", "127.0.0.1:8003", "--noreload"],
            cwd=ROOT,
            env=backend_env,
            stdout=backend_out,
            stderr=backend_err,
        )

        wait_for_url(f"{BACKEND_URL}/api/v1/scans/geocode/?q=Lekki&limit=1", timeout=120.0)

        wait_for_url(FRONTEND_URL, timeout=120.0)

        walkthrough_env = os.environ.copy()
        walkthrough_env["LANDRIFY_FRONTEND_URL"] = FRONTEND_URL
        walkthrough_env["LANDRIFY_API_BASE_URL"] = BACKEND_URL

        walkthrough_proc = subprocess.run(
            [r"C:\Program Files\nodejs\node.exe", str(LOG_DIR / "local_walkthrough.mjs")],
            cwd=ROOT,
            env=walkthrough_env,
            capture_output=True,
            text=True,
            timeout=420,
        )

        print("=== walkthrough stdout ===")
        print(walkthrough_proc.stdout)
        if walkthrough_proc.stderr:
            print("=== walkthrough stderr ===")
            print(walkthrough_proc.stderr)

        return walkthrough_proc.returncode
    finally:
        terminate_process(backend_proc)


if __name__ == "__main__":
    raise SystemExit(main())
