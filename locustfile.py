# pyright: reportMissingImports=false

import logging
import os
import uuid
from dataclasses import dataclass

from dotenv import load_dotenv

try:
    from gevent.lock import Semaphore  # type: ignore[import]
except ImportError:  # pragma: no cover
    from threading import Lock as Semaphore  # type: ignore[misc]

from locust import HttpUser, between, events, task  # type: ignore[import]
load_dotenv()

DEFAULT_HOST = os.getenv(
    "LOCUST_HOST",
    "https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net",
)


@dataclass
class MetricBucket:
    count: int = 0
    latency_sum: float = 0.0
    ru_sum: float = 0.0


class RunMetrics:
    def __init__(self) -> None:
        self.lock = Semaphore()
        self.feed = MetricBucket()
        self.posts = MetricBucket()
        self.rate_limit_hits = 0

    def record(self, bucket: MetricBucket, headers) -> None:
        try:
            duration = float(headers.get("X-Request-Duration", 0) or 0)
        except (TypeError, ValueError):
            duration = 0.0
        try:
            ru = float(headers.get("X-RU-Estimate", 0) or 0)
        except (TypeError, ValueError):
            ru = 0.0

        with self.lock:
            bucket.count += 1
            bucket.latency_sum += duration
            bucket.ru_sum += ru

    def track_rate_limit(self) -> None:
        with self.lock:
            self.rate_limit_hits += 1

    def snapshot(self):
        with self.lock:
            return {
                "feed": {
                    "count": self.feed.count,
                    "latency": self.feed.latency_sum,
                    "ru": self.feed.ru_sum,
                },
                "posts": {
                    "count": self.posts.count,
                    "latency": self.posts.latency_sum,
                    "ru": self.posts.ru_sum,
                },
                "rate_limit_hits": self.rate_limit_hits,
            }


run_metrics = RunMetrics()


@events.quitting.add_listener
def report_custom_metrics(environment, **_kwargs):
    snapshot = run_metrics.snapshot()

    def summarize(label: str, bucket: dict[str, float | int]) -> str:
        count = bucket["count"] or 0
        if not count:
            return f"{label}: no samples"
        avg_latency = bucket["latency"] / count
        avg_ru = bucket["ru"] / count
        return (
            f"{label}: {count} samples | avg latency {avg_latency:.2f} ms | avg RU {avg_ru:.2f}"
        )

    environment.log.info(summarize("Feed", snapshot["feed"]))
    environment.log.info(summarize("Posts", snapshot["posts"]))
    environment.log.info(f"Rate limit responses: {snapshot['rate_limit_hits']}")


class ApiUser(HttpUser):
    wait_time = between(float(os.getenv("LOCUST_WAIT_MIN", 0.5)), float(os.getenv("LOCUST_WAIT_MAX", 2)))
    host = DEFAULT_HOST
    timeout_duration = float(os.getenv("LOCUST_REQUEST_TIMEOUT", 30))

    def on_start(self):
        enable_logging = os.getenv("ENABLE_LOGGING", "False").lower() == "true"
        logging.basicConfig(level=logging.DEBUG if enable_logging else logging.INFO)
        self.log_headers = enable_logging

    @task(3)
    def fetch_feed(self):
        headers = {"Accept": "application/json"}
        with self.client.get(
            url="/api/feed",
            headers=headers,
            name="GET /feed",
            catch_response=True,
            timeout=self.timeout_duration,
        ) as response:
            if response.status_code == 200:
                run_metrics.record(run_metrics.feed, response.headers)
                response.success()
            else:
                response.failure(
                    f"Feed request failed with {response.status_code}: {response.text[:200]}"
                )

    @task(1)
    def create_post(self):
        payload = {
            "text": f"Perf check {uuid.uuid4()}",
            "authorId": os.getenv("LOCUST_AUTHOR_ID", "loadtest"),
        }
        with self.client.post(
            url="/api/posts",
            json=payload,
            name="POST /posts",
            catch_response=True,
            timeout=self.timeout_duration,
        ) as response:
            if response.status_code == 201:
                run_metrics.record(run_metrics.posts, response.headers)
                response.success()
            elif response.status_code == 429:
                run_metrics.track_rate_limit()
                response.failure("Rate limited: retry later")
            else:
                response.failure(
                    f"Post creation failed with {response.status_code}: {response.text[:200]}"
                )


# Example run:
# locust -f locustfile.py -u 50 -r 10 --run-time 5m