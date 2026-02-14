"""
WebPublishWorker — optional worker that periodically publishes the car's
live telemetry (pose, trajectory, track boundaries, control state) to a
remote HTTP endpoint as JSON.

Designed for a pit-lane dashboard or spectator web-app that visualises
the vehicle's position on the mapped track in near-real-time.

Config kwargs
-------------
pose_buffer : PoseBuffer
    Latest SLAM pose.
boundary_buffer : TrackBoundaryBuffer | None
    Extracted track boundaries (optional — omitted when SLAM disabled).
control_buffer : ControlBuffer | None
    Latest steering / throttle (optional).
endpoint : str
    Full URL to POST JSON payloads to (e.g. ``http://10.0.0.1:8080/api/telemetry``).
publish_interval : float
    Seconds between publishes (default 1.0).
timeout : float
    HTTP POST timeout in seconds (default 2.0).
vehicle_id : str
    Arbitrary identifier for the vehicle (default ``"pilot_1"``).
max_trajectory_pts : int
    Cap on how many trajectory points to include per payload (default 500).
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen
from urllib.error import URLError

import numpy as np

from .base_worker import BaseWorker

# ---------------------------------------------------------------------------
# Lazy imports for typed buffers — they are passed in at runtime via kwargs.
# We use TYPE_CHECKING to keep type hints available for editors without
# requiring the imports at runtime (workers receive buffers as kwargs).
# ---------------------------------------------------------------------------
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from shared_buffer.pose_buffer import PoseBuffer
    from shared_buffer.track_boundary_buffer import TrackBoundaryBuffer
    from shared_buffer.control_buffer import ControlBuffer


class WebPublishWorker(BaseWorker):
    """Periodically POST live telemetry to an HTTP endpoint.

    Example JSON payload::

        {
            "vehicle_id": "pilot_1",
            "timestamp": 1718900000.123,
            "pose": {
                "x": 1.23, "z": 4.56, "heading_deg": 90.0
            },
            "trajectory": [[x, z], ...],
            "control": {"steering": 0.52, "throttle": 0.30},
            "track": {
                "outer": [[x, z], ...],
                "inner": [[x, z], ...]
            }
        }

    Parameters are documented at module level.
    """

    def __init__(self, name: str = "web_publish", **kwargs: Any) -> None:
        super().__init__(name, **kwargs)

        # Buffer handles (set in setup)
        self._pose_buf: Optional["PoseBuffer"] = None
        self._boundary_buf: Optional["TrackBoundaryBuffer"] = None
        self._ctrl_buf: Optional["ControlBuffer"] = None

        # Config
        self._endpoint: str = ""
        self._interval: float = 1.0
        self._timeout: float = 2.0
        self._vehicle_id: str = "pilot_1"
        self._max_traj: int = 500

        # Internal state
        self._trajectory: List[List[float]] = []
        self._last_pose_seq: int = 0
        self._last_publish: float = 0.0
        self._consecutive_errors: int = 0
        self._MAX_BACKOFF: float = 30.0  # max sleep on repeated failures

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def setup(self) -> None:
        self._pose_buf = self.config.get("pose_buffer")
        self._boundary_buf = self.config.get("boundary_buffer")
        self._ctrl_buf = self.config.get("control_buffer")
        self._endpoint = self.config.get("endpoint", "http://localhost:8080/api/telemetry")
        self._api_key = self.config.get("api_key", "dev-secret")
        self._interval = float(self.config.get("publish_interval", 1.0))
        self._timeout = float(self.config.get("timeout", 2.0))
        self._vehicle_id = self.config.get("vehicle_id", "pilot_1")
        self._max_traj = int(self.config.get("max_trajectory_pts", 500))

        if not self._endpoint:
            raise ValueError("WebPublishWorker requires a non-empty 'endpoint'")

        self.logger.info(
            f"WebPublishWorker ready — endpoint={self._endpoint}, "
            f"interval={self._interval}s, vehicle={self._vehicle_id}"
        )

    def step(self) -> None:
        # Accumulate trajectory from pose buffer every step
        self._ingest_pose()

        # Only publish at the configured interval
        now = time.monotonic()
        if now - self._last_publish < self._interval:
            time.sleep(0.05)  # yield CPU
            return

        # Build & send payload
        payload = self._build_payload()
        self._post(payload)
        self._last_publish = now

    def teardown(self) -> None:
        self.logger.info(
            f"WebPublishWorker shutting down — "
            f"{len(self._trajectory)} trajectory pts accumulated"
        )

    # ------------------------------------------------------------------
    # Data ingestion helpers
    # ------------------------------------------------------------------

    def _ingest_pose(self) -> None:
        """Read the latest pose and append (X, Z) to the trajectory."""
        if self._pose_buf is None:
            return
        result = self._pose_buf.read_latest()
        if result is None:
            return
        header, pose, _ = result
        if header.seq_no <= self._last_pose_seq:
            return
        self._last_pose_seq = header.seq_no

        # Extract translation from 4×4 matrix
        tx, tz = float(pose[0, 3]), float(pose[2, 3])
        self._trajectory.append([tx, tz])

        # Cap to the most recent N points
        if len(self._trajectory) > self._max_traj:
            self._trajectory = self._trajectory[-self._max_traj:]

    def _read_control(self) -> Optional[Dict[str, float]]:
        """Snapshot latest steering + throttle."""
        if self._ctrl_buf is None:
            return None
        result = self._ctrl_buf.read_latest()
        if result is None:
            return None
        _header, steering, throttle = result
        return {"steering": round(float(steering), 4),
                "throttle": round(float(throttle), 4)}

    def _read_boundaries(self) -> Optional[Dict[str, list]]:
        """Snapshot outer / inner track boundaries."""
        if self._boundary_buf is None:
            return None
        result = self._boundary_buf.read_latest()
        if result is None:
            return None
        _header, outer, inner = result
        return {
            "outer": _ndarray_to_list(outer),
            "inner": _ndarray_to_list(inner),
        }

    # ------------------------------------------------------------------
    # Payload construction
    # ------------------------------------------------------------------

    def _build_payload(self) -> Dict[str, Any]:
        """Assemble the JSON-serialisable telemetry dict."""
        payload: Dict[str, Any] = {
            "vehicle_id": self._vehicle_id,
            "timestamp": time.time(),
        }

        # Current pose
        if self._trajectory:
            last = self._trajectory[-1]
            payload["pose"] = {"x": last[0], "z": last[1]}

        # Trajectory
        payload["trajectory"] = self._trajectory

        # Control
        ctrl = self._read_control()
        if ctrl is not None:
            payload["control"] = ctrl

        # Track boundaries
        track = self._read_boundaries()
        if track is not None:
            payload["track"] = track

        return payload

    # ------------------------------------------------------------------
    # HTTP transport
    # ------------------------------------------------------------------

    def _post(self, payload: Dict[str, Any]) -> None:
        """POST JSON payload to the configured endpoint.

        Uses stdlib ``urllib`` to avoid an external dependency on
        ``requests``.  Applies exponential back-off on repeated failures
        so a flaky network doesn't flood the logs.
        """
        body = json.dumps(payload, default=_json_default).encode("utf-8")
        req = Request(
            self._endpoint,
            data=body,
            headers={
                "Content-Type": "application/json",
                "x-api-key": self._api_key,
            },
            method="POST",
        )

        try:
            with urlopen(req, timeout=self._timeout) as resp:
                status = resp.status
            self._consecutive_errors = 0
            self.logger.debug(
                f"Published {len(body)} bytes → {self._endpoint} "
                f"(HTTP {status})"
            )
        except (URLError, OSError, TimeoutError) as exc:
            self._consecutive_errors += 1
            backoff = min(
                self._interval * (2 ** self._consecutive_errors),
                self._MAX_BACKOFF,
            )
            self.logger.warning(
                f"POST failed ({exc}) — "
                f"back-off {backoff:.1f}s "
                f"(consecutive errors: {self._consecutive_errors})"
            )
            time.sleep(backoff)

    # ------------------------------------------------------------------
    # Convenience property
    # ------------------------------------------------------------------

    @property
    def logger(self) -> logging.Logger:
        if self._logger is None:
            self._logger = logging.getLogger(f"worker.{self.name}")
        return self._logger


# ======================================================================
# Module-level helpers
# ======================================================================

def _ndarray_to_list(arr: np.ndarray, decimals: int = 4) -> list:
    """Convert an (N, 2) float32 ndarray to a JSON-friendly nested list.

    Rounds to *decimals* decimal places to keep payloads compact.
    """
    if arr is None or len(arr) == 0:
        return []
    return np.round(arr, decimals=decimals).tolist()


def _json_default(obj: Any) -> Any:
    """Fallback serialiser for ``json.dumps`` — handles numpy scalars."""
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")