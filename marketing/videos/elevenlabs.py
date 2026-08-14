#!/usr/bin/env python3
"""The one HTTP call to ElevenLabs, and the failures worth naming.

Voice and music both buy audio the same way, so they fail the same way too. The
bytes are returned rather than written: no caller can mistake a half-finished
download for something already paid for.
"""

from __future__ import annotations

import json
import os
import ssl
import urllib.error
import urllib.request


BASE = "https://api.elevenlabs.io/v1"


def api_key() -> str:
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise RuntimeError(
            "ELEVENLABS_API_KEY is not set. Add it to marketing/videos/.env — it is git-ignored."
        )
    return key


def request_audio(path: str, payload: dict, timeout: int = 300) -> bytes:
    """Post a job to ElevenLabs and return the audio it charged for."""
    request = urllib.request.Request(
        f"{BASE}/{path.lstrip('/')}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "xi-api-key": api_key()},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            audio = response.read()
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        if error.code == 401 and "permission" in detail:
            raise RuntimeError(
                f"The API key is missing a permission for /{path}: {detail}"
            ) from error
        raise RuntimeError(f"ElevenLabs request failed ({error.code}): {detail}") from error
    except urllib.error.URLError as error:
        if isinstance(error.reason, ssl.SSLCertVerificationError):
            raise RuntimeError(
                "This Python has no certificate store, so the request never left the machine "
                "and nothing was charged. On a python.org install, run "
                "'/Applications/Python 3.10/Install Certificates.command' once."
            ) from error
        raise RuntimeError(f"Could not reach ElevenLabs: {error.reason}") from error
    if not audio:
        raise RuntimeError(f"ElevenLabs returned no audio for /{path}")
    return audio
