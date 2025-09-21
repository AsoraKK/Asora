#!/usr/bin/env python3
"""Compare live SPKI pins against expected values."""

from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
import urllib.parse
from pathlib import Path

EXPECTED_FILE = Path("mobile-expected-pins.json")


def load_expected() -> dict[str, list[str]]:
    if not EXPECTED_FILE.exists():
        raise SystemExit(f"Expected pins file not found: {EXPECTED_FILE}")
    data = json.loads(EXPECTED_FILE.read_text(encoding="utf-8"))
    return {host: list(dict.fromkeys(pins)) for host, pins in data.items()}


def collect_hosts() -> set[str]:
    hosts: set[str] = set()

    base_url = os.environ.get("BASE_URL", "").strip()
    if base_url:
        host = urllib.parse.urlparse(base_url).hostname
        if host:
            hosts.add(host)

    extra = os.environ.get("EXTRA_PIN_HOSTS", "").strip()
    if extra:
        for item in extra.split(","):
            host = item.strip()
            if host:
                hosts.add(host)

    if not hosts:
        raise SystemExit("No hosts provided. Set BASE_URL or EXTRA_PIN_HOSTS.")

    return hosts


def compute_spki(host: str) -> str:
    try:
        s_client = subprocess.run(
            [
                "openssl",
                "s_client",
                "-servername",
                host,
                "-connect",
                f"{host}:443",
            ],
            input=b"\n",
            capture_output=True,
            check=True,
        )
    except subprocess.CalledProcessError as exc:  # pragma: no cover
        raise RuntimeError(
            f"openssl s_client failed for {host}: {exc.stderr.decode(errors='ignore')}"
        ) from exc

    try:
        pubkey = subprocess.run(
            ["openssl", "x509", "-pubkey", "-noout"],
            input=s_client.stdout,
            capture_output=True,
            check=True,
        )
        der = subprocess.run(
            ["openssl", "pkey", "-pubin", "-outform", "DER"],
            input=pubkey.stdout,
            capture_output=True,
            check=True,
        )
        digest = subprocess.run(
            ["openssl", "dgst", "-sha256", "-binary"],
            input=der.stdout,
            capture_output=True,
            check=True,
        )
    except subprocess.CalledProcessError as exc:  # pragma: no cover
        raise RuntimeError(
            f"openssl pipeline failed for {host}: {exc.stderr.decode(errors='ignore')}"
        ) from exc

    return base64.b64encode(digest.stdout).decode("ascii")


def main() -> int:
    expected = load_expected()
    hosts = collect_hosts()

    report: dict[str, dict[str, object]] = {}
    failed = False

    for host in hosts:
        allowed = set(expected.get(host, []))
        try:
            observed = compute_spki(host)
        except Exception as exc:  # pragma: no cover
            report[host] = {"ok": False, "error": str(exc), "expected": list(allowed)}
            failed = True
            continue

        ok = observed in allowed and bool(allowed)
        report[host] = {
            "ok": ok,
            "observed": observed,
            "expected": list(allowed),
        }
        if not ok:
            failed = True

    Path("mobile-pin-report.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print("Wrote mobile-pin-report.json")

    return 1 if failed else 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
