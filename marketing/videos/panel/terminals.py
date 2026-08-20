"""One live terminal per video.

Each terminal is a real `claude` or `codex` process working on one piece. The
agent runs inside its own tmux session and `ttyd` only attaches a view to it,
which buys two things that matter: closing the browser tab no longer kills the
agent, and the panel can find the agent again after a restart. The registry
enforces the rule that matters — a video may have at most one terminal, so two
agents can never edit the same piece at the same time.
"""

from __future__ import annotations

import atexit
import os
import re
import shlex
import shutil
import socket
import subprocess
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from . import factory

BIND_HOST = "127.0.0.1"
FIRST_PORT = 7700
LAST_PORT = 7799
SESSION_PREFIX = "videopanel"

CLIS: dict[str, dict[str, str]] = {
    "claude": {"label": "Claude Code", "binary": "claude"},
    "codex": {"label": "Codex", "binary": "codex"},
}

# If the panel itself was started from inside a Claude Code session, these
# markers are inherited and the CLI treats the terminal as a nested child: it
# stops writing a transcript, and the Proceso tab has nothing to read. A
# terminal opened here is a session of its own, so the markers are dropped.
INHERITED_SESSION_MARKERS = (
    "CLAUDECODE",
    "CLAUDE_CODE_CHILD_SESSION",
    "CLAUDE_CODE_ENTRYPOINT",
    "CLAUDE_CODE_SESSION_ID",
    "CLAUDE_CODE_MESSAGING_SOCKET",
    "CLAUDE_CODE_MESSAGING_TOKEN",
    "CLAUDE_CODE_EXECPATH",
    "CLAUDE_PID",
    "CLAUDE_EFFORT",
)

OPENING_PROMPT = (
    "Trabajas sobre el video {video_id} de la marca {brand} en la fábrica de "
    "marketing/videos. Su carpeta es {directory} y ahora mismo está en estado "
    "«{state}». Lee su plan.json y su script.md antes de proponer cambios, y "
    "respeta las reglas de marketing/videos/CLAUDE.md."
)


@dataclass
class Terminal:
    """An agent working on one video, and the view attached to it."""

    brand: str
    video_id: str
    cli: str
    session: str
    started_at: float
    port: int | None = None
    viewer: subprocess.Popen | None = None
    # Cached once found: the CLI's own session log, which the Proceso tab reads.
    session_file: Path | None = None

    @property
    def key(self) -> tuple[str, str]:
        return (self.brand, self.video_id)

    def viewing(self) -> bool:
        return self.viewer is not None and self.viewer.poll() is None and self.port is not None

    def running(self) -> bool:
        return session_exists(self.session)

    def url(self) -> str | None:
        return f"http://{BIND_HOST}:{self.port}/" if self.viewing() else None

    def describe(self) -> dict[str, Any]:
        return {
            "brand": self.brand,
            "video_id": self.video_id,
            "cli": self.cli,
            "cli_label": CLIS.get(self.cli, {}).get("label", self.cli),
            "session": self.session,
            "port": self.port,
            "url": self.url(),
            "alive": self.running(),
            "viewing": self.viewing(),
            "started_at": self.started_at,
            # Rounded to minutes on purpose: the panel repaints only when its
            # payload changes, and a ticking second would repaint every poll.
            "uptime_minutes": round((time.time() - self.started_at) / 60),
        }


_registry: dict[tuple[str, str], Terminal] = {}
_registry_lock = threading.Lock()


def requirements() -> dict[str, bool]:
    """What has to be installed for terminals to work at all."""
    return {
        "ttyd": shutil.which("ttyd") is not None,
        "tmux": shutil.which("tmux") is not None,
        "claude": shutil.which("claude") is not None,
        "codex": shutil.which("codex") is not None,
    }


def _environment() -> dict[str, str]:
    clean = {key: value for key, value in os.environ.items() if key not in INHERITED_SESSION_MARKERS}
    clean["CLAUDE_CODE_FORCE_SESSION_PERSISTENCE"] = "1"
    return clean


def _tmux(*arguments: str, check: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["tmux", *arguments],
        capture_output=True,
        text=True,
        check=check,
        env=_environment(),
    )


def session_name(brand_id: str, video_id: str, cli: str) -> str:
    return f"{SESSION_PREFIX}_{cli}_{brand_id}_{video_id}"


def _parse_session(name: str) -> tuple[str, str, str] | None:
    match = re.fullmatch(rf"{SESSION_PREFIX}_([^_]+)_([^_]+)_(.+)", name)
    if match is None:
        return None
    return match.group(1), match.group(2), match.group(3)


def session_exists(name: str) -> bool:
    return _tmux("has-session", "-t", f"={name}").returncode == 0


def _free_port() -> int:
    for port in range(FIRST_PORT, LAST_PORT + 1):
        if any(item.port == port and item.viewing() for item in _registry.values()):
            continue
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                probe.bind((BIND_HOST, port))
            except OSError:
                continue
        return port
    raise RuntimeError("No queda ningún puerto libre para otra terminal")


def _start_session(terminal: Terminal, prompt: str) -> None:
    binary = CLIS[terminal.cli]["binary"]
    command = f"exec {binary} {shlex.quote(prompt)}"
    _tmux(
        "new-session",
        "-d",
        "-s",
        terminal.session,
        "-c",
        str(factory.FACTORY_ROOT),
        command,
        check=False,
    )


def _start_viewer(terminal: Terminal) -> None:
    port = _free_port()
    viewer = subprocess.Popen(
        [
            "ttyd",
            "--port",
            str(port),
            "--interface",
            BIND_HOST,
            "--writable",
            "--max-clients",
            "1",
            "--client-option",
            "fontSize=13",
            "--client-option",
            "fontFamily='JetBrains Mono, SFMono-Regular, Menlo, monospace'",
            "--client-option",
            'theme={"background":"#101418","foreground":"#e2e2e9","cursor":"#a8c7fa","selectionBackground":"#3a4a5c"}',
            "tmux",
            "attach-session",
            "-t",
            terminal.session,
        ],
        cwd=str(factory.FACTORY_ROOT),
        env=_environment(),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    terminal.viewer = viewer
    terminal.port = port
    _wait_until_serving(terminal)


def _wait_until_serving(terminal: Terminal, timeout: float = 6.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if terminal.viewer is None or terminal.viewer.poll() is not None:
            return
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            probe.settimeout(0.2)
            if probe.connect_ex((BIND_HOST, terminal.port or 0)) == 0:
                return
        time.sleep(0.15)


def start(brand_id: str, video_id: str, cli: str) -> Terminal:
    """Open the one terminal a video is allowed, or reattach to the open one."""
    if cli not in CLIS:
        raise ValueError(f"Unknown CLI: {cli}")
    missing = [
        name
        for name, present in requirements().items()
        if not present and name in {"ttyd", "tmux", cli}
    ]
    if missing:
        raise RuntimeError(f"Falta instalar: {', '.join(missing)}")

    detail = factory.video(brand_id, video_id)
    if detail is None:
        raise ValueError(f"Unknown video: {brand_id}/{video_id}")

    adopt_orphans()

    with _registry_lock:
        existing = _registry.get((brand_id, video_id))
        if existing is not None and existing.running():
            if not existing.viewing():
                _start_viewer(existing)
            return existing

        terminal = Terminal(
            brand=brand_id,
            video_id=video_id,
            cli=cli,
            session=session_name(brand_id, video_id, cli),
            started_at=time.time(),
        )
        if not terminal.running():
            _start_session(
                terminal,
                OPENING_PROMPT.format(
                    video_id=video_id,
                    brand=brand_id,
                    directory=detail["relative_directory"],
                    state=detail["state_label"],
                ),
            )
        _start_viewer(terminal)
        _registry[terminal.key] = terminal
        return terminal


def detach(brand_id: str, video_id: str) -> bool:
    """Close the view but leave the agent working."""
    terminal = _registry.get((brand_id, video_id))
    if terminal is None:
        return False
    _stop_viewer(terminal)
    return True


def stop(brand_id: str, video_id: str) -> bool:
    """Close the view and end the agent."""
    with _registry_lock:
        terminal = _registry.pop((brand_id, video_id), None)
    if terminal is None:
        return False
    _stop_viewer(terminal)
    _tmux("kill-session", "-t", f"={terminal.session}")
    return True


def _stop_viewer(terminal: Terminal) -> None:
    viewer = terminal.viewer
    terminal.viewer = None
    terminal.port = None
    if viewer is None or viewer.poll() is not None:
        return
    viewer.terminate()
    try:
        viewer.wait(timeout=3)
    except subprocess.TimeoutExpired:
        viewer.kill()


def adopt_orphans() -> None:
    """Re-find agents whose tmux session outlived the panel process."""
    if shutil.which("tmux") is None:
        return
    result = _tmux("list-sessions", "-F", "#{session_name}\t#{session_created}")
    if result.returncode != 0:
        return
    for line in result.stdout.splitlines():
        name, _, created = line.partition("\t")
        parsed = _parse_session(name)
        if parsed is None:
            continue
        cli, brand_id, video_id = parsed
        if (brand_id, video_id) in _registry:
            continue
        try:
            started_at = float(created)
        except ValueError:
            started_at = time.time()
        _registry[(brand_id, video_id)] = Terminal(
            brand=brand_id,
            video_id=video_id,
            cli=cli,
            session=name,
            started_at=started_at,
        )


def get(brand_id: str, video_id: str) -> Terminal | None:
    adopt_orphans()
    terminal = _registry.get((brand_id, video_id))
    if terminal is not None and not terminal.running():
        _stop_viewer(terminal)
        _registry.pop((brand_id, video_id), None)
        return None
    return terminal


def snapshot() -> dict[str, dict[str, Any]]:
    """Terminal state keyed by `brand/video`, for the polling endpoint."""
    adopt_orphans()
    live: dict[str, dict[str, Any]] = {}
    for key, terminal in list(_registry.items()):
        if not terminal.running():
            _stop_viewer(terminal)
            _registry.pop(key, None)
            continue
        live[f"{terminal.brand}/{terminal.video_id}"] = terminal.describe()
    return live


def reap_orphan_viewers() -> None:
    """Close views left behind by a previous run of the panel.

    A view belongs to the process that spawned it, so after a restart every
    `ttyd` attached to one of our tmux sessions is unreachable: nothing can stop
    it, and it holds a port. The agents themselves are untouched — they live in
    tmux, and `adopt_orphans` finds them again.
    """
    ours = {terminal.viewer.pid for terminal in _registry.values() if terminal.viewer is not None}
    for pid in _listening_viewers():
        if pid in ours:
            continue
        try:
            os.kill(pid, 15)
        except OSError:
            continue


def _listening_viewers() -> set[int]:
    """Every ttyd listening on one of the panel's ports.

    Matched by port rather than by command line: macOS truncates the arguments
    `ps` reports, so the tmux session name a viewer is attached to is not
    visible to `pgrep`.
    """
    if shutil.which("lsof") is None:
        return set()
    found = subprocess.run(
        ["lsof", "-nP", "-a", "-c", "ttyd", "-iTCP", "-sTCP:LISTEN", "-F", "pn"],
        capture_output=True,
        text=True,
    )
    viewers: set[int] = set()
    pid: int | None = None
    for line in found.stdout.splitlines():
        if line.startswith("p"):
            pid = int(line[1:]) if line[1:].isdigit() else None
        elif line.startswith("n") and pid is not None:
            _, _, port_text = line[1:].rpartition(":")
            if port_text.isdigit() and FIRST_PORT <= int(port_text) <= LAST_PORT:
                viewers.add(pid)
    return viewers


@atexit.register
def _shutdown() -> None:
    """Close the views; the agents stay alive in tmux for the next run."""
    for terminal in list(_registry.values()):
        _stop_viewer(terminal)


reap_orphan_viewers()
