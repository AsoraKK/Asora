#!/usr/bin/env python3
"""Verify that runtime certificate pins match the live endpoints.

This script extracts the pinned SPKI hashes from lib/core/security/cert_pinning.dart,
fetches the current certificate for each host, and ensures the computed hash is one
of the allowed values. Fails with a non-zero exit code if any host drifts.
"""

import base64
import json
import re
import subprocess
import sys
from pathlib import Path

PIN_SOURCE = Path("lib/core/security/cert_pinning.dart")


def extract_pins():
    text = PIN_SOURCE.read_text(encoding="utf-8")
    pattern = re.compile(r"'([^']+)':\s*\[(.*?)\]", re.S)
    mapped = {}
    for host, body in pattern.findall(text):
        pins = re.findall(r"'sha256/([A-Za-z0-9+/=]+)'", body)
        if pins:
            mapped[host] = pins
    if not mapped:
        raise SystemExit("No pins discovered in cert_pinning.dart")
    return mapped


def compute_spki_pin(host: str) -> str:
    try:
        client = subprocess.run(
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
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"openssl s_client failed for {host}: {exc.stderr.decode(errors='ignore')}" ) from exc

    try:
        pubkey = subprocess.run(
            ["openssl", "x509", "-pubkey", "-noout"],
            input=client.stdout,
            capture_output=True,
            check=True,
        )
        der = subprocess.run(
            ["openssl", "pkey", "-pubin", "-outform", "der"],
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
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"openssl pipeline failed for {host}: {exc.stderr.decode(errors='ignore')}" ) from exc

    return base64.b64encode(digest.stdout).decode("ascii")


def main() -> int:
    pin_map = extract_pins()
    results = []
    exit_code = 0

    for host, expected_pins in pin_map.items():
        try:
            current_pin = compute_spki_pin(host)
        except Exception as exc:  # pylint: disable=broad-except
            print(f"::error::Failed to compute pin for {host}: {exc}")
            exit_code = 1
            continue

        if current_pin not in expected_pins:
            print(
                f"::error::Pin drift detected for {host}.\n"
                f"Expected one of: {json.dumps(expected_pins)}\n"
                f"Observed: {current_pin}"
            )
            exit_code = 1
        else:
            print(f"{host} pin verified ({current_pin})")

        results.append({"host": host, "observed": current_pin, "expected": expected_pins})

    out_path = Path("mobile-pin-report.json")
    out_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"Wrote verification report to {out_path}")

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
