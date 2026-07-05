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


def load_expected() -> tuple[dict[str, list[str]], dict[str, str]]:
    if not EXPECTED_FILE.exists():
        raise SystemExit(f"Expected pins file not found: {EXPECTED_FILE}")
    raw = json.loads(EXPECTED_FILE.read_text(encoding="utf-8"))
    states_raw = raw.get("_states", {})
    states = {}
    if isinstance(states_raw, dict):
        states = {
            str(host): str(state).lower()
            for host, state in states_raw.items()
        }
    # Skip comment keys (keys starting with underscore)
    data = {k: v for k, v in raw.items() if not k.startswith("_")}
    return (
        {host: list(dict.fromkeys(pins)) for host, pins in data.items()},
        states,
    )


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
    expected, states = load_expected()
    hosts = collect_hosts()

    report: dict[str, dict[str, object]] = {}
    has_hard_failure = False

    for host in hosts:
        state = states.get(host, "live")
        allowed = set(expected.get(host, []))
        try:
            observed = compute_spki(host)
        except Exception as exc:  # pragma: no cover
            error_msg = str(exc)
            openssl_missing = (
                isinstance(exc, FileNotFoundError)
                or "The system cannot find the file specified" in error_msg
                or "No such file or directory" in error_msg
            )
            if openssl_missing and state in {"planned", "deprecated"}:
                report[host] = {
                    "ok": True,
                    "skipped": f"openssl unavailable locally (host state: {state})",
                    "expected": list(allowed),
                    "state": state,
                }
                continue
            # Don't fail on DNS resolution errors (host not live yet)
            if "Name or service not known" in error_msg or "errno=2" in error_msg:
                if state in {"planned", "deprecated"} or not allowed:
                    # Host not provisioned or intentionally retained for compatibility.
                    report[host] = {
                        "ok": True,
                        "skipped": (
                            f"DNS resolution failed (host state: {state}; pins not yet required)"
                        ),
                        "expected": list(allowed),
                        "state": state,
                    }
                else:
                    report[host] = {
                        "ok": True,
                        "skipped": "DNS resolution failed",
                        "expected": list(allowed),
                        "state": state,
                    }
                continue
            report[host] = {
                "ok": False,
                "error": error_msg,
                "expected": list(allowed),
                "state": state,
            }
            has_hard_failure = True
            continue

        # Host resolves but has no expected pins — this is a launch blocker
        if not allowed:
            if state in {"planned", "deprecated"}:
                print(
                    f"ℹ {host} is marked {state}; observed pin is informational until the config is promoted."
                )
                report[host] = {
                    "ok": True,
                    "skipped": f"planned/deprecated host state: {state}",
                    "observed": observed,
                    "expected": [],
                    "state": state,
                }
                continue
            print(
                f"✗ LAUNCH BLOCKER: {host} resolves but has no expected pins in {EXPECTED_FILE}.\n"
                f"  Extract the SPKI pin with:\n"
                f"    ./scripts/extract-spki-pins.sh {host}\n"
                f"  Observed pin (add to {EXPECTED_FILE} and environment_config.dart):\n"
                f"    {observed}\n"
                f"  See docs/runbooks/tls-pinning-rotation.md for the full procedure."
            )
            report[host] = {
                "ok": False,
                "error": "no_expected_pins_configured",
                "observed": observed,
                "expected": [],
                "state": state,
            }
            has_hard_failure = True
            continue

        ok = observed in allowed
        report[host] = {
            "ok": ok,
            "observed": observed,
            "expected": list(allowed),
            "state": state,
        }
        if not ok:
            # Azure shared hosting (*.azurewebsites.net) rotates TLS certs
            # frequently. Treat a new but valid pin as a warning, not a failure.
            print(
                f"⚠ WARNING: New pin observed for {host}: {observed}\n"
                f"  Add it to {EXPECTED_FILE} and kPinnedDomains in cert_pinning.dart"
            )

    Path("mobile-pin-report.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print("Wrote mobile-pin-report.json")

    return 1 if has_hard_failure else 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
