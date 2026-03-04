#!/usr/bin/env python3
"""Parse lcov.info and report per-file and overall coverage.

Usage: parse_coverage.py <lcov_file> [threshold_percent]

Exits with code 0 when overall coverage >= threshold, otherwise exits 1.
"""
import sys
import argparse
from pathlib import Path


def parse_lcov(filename: str):
    files_coverage = []
    current_file = None
    lf = lh = 0

    with open(filename, 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith('SF:'):
                current_file = line[3:]
            elif line.startswith('LF:'):
                try:
                    lf = int(line[3:])
                except ValueError:
                    lf = 0
            elif line.startswith('LH:'):
                try:
                    lh = int(line[3:])
                except ValueError:
                    lh = 0
            elif line == 'end_of_record':
                if current_file is not None and lf > 0:
                    coverage = (lh / lf) * 100
                    files_coverage.append((coverage, current_file, lh, lf))
                current_file = None
                lf = lh = 0

    return files_coverage


def main():
    parser = argparse.ArgumentParser(description='Parse LCOV and check coverage')
    parser.add_argument('lcov', nargs='?', default='coverage/lcov.info', help='path to lcov.info')
    parser.add_argument('threshold', nargs='?', type=float, default=80.0, help='coverage threshold percent')
    args = parser.parse_args()

    lcov_path = Path(args.lcov)
    if not lcov_path.is_file():
        print(f"LCOV file not found: {lcov_path}", file=sys.stderr)
        sys.exit(2)

    coverage_data = parse_lcov(str(lcov_path))
    coverage_data.sort()

    if coverage_data:
        print("Files with lowest coverage:")
        for coverage, filename, lh, lf in coverage_data[:15]:
            print(f"{coverage:.1f}% {filename} ({lh}/{lf})")
    else:
        print("No file coverage records found in LCOV.")

    total_files = len(coverage_data)
    total_lf = sum(lf for _, _, _, lf in coverage_data)
    total_lh = sum(lh for _, _, lh, _ in coverage_data)

    if total_lf == 0:
        print("No lines found in LCOV data.", file=sys.stderr)
        sys.exit(2)

    overall = (total_lh / total_lf) * 100
    print(f"\nTotal files: {total_files}")
    print(f"Overall coverage: {overall:.2f}% ({total_lh}/{total_lf})")

    if overall < args.threshold:
        print(f"Coverage below {args.threshold:.0f}% threshold", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
