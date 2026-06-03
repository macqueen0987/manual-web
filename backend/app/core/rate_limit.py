import time
from collections import defaultdict
from threading import Lock

from fastapi import Depends, HTTPException, Request, status

_buckets: dict[str, list[float]] = defaultdict(list)
_lock = Lock()


def rate_limit(max_calls: int, window_seconds: int, scope: str):
    """Per-IP in-memory rate limiter for sensitive endpoints."""

    def dependency(request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        key = f"{scope}:{client_ip}"
        now = time.time()
        window_start = now - window_seconds

        with _lock:
            timestamps = [t for t in _buckets[key] if t > window_start]
            if len(timestamps) >= max_calls:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please try again later.",
                )
            timestamps.append(now)
            _buckets[key] = timestamps

    return Depends(dependency)
