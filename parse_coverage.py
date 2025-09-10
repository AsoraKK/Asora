#!/usr/bin/env python3
import sys

def parse_lcov(filename):
    files_coverage = []
    current_file = None
    lf = lh = 0
    
    with open(filename, 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith('SF:'):
                current_file = line[3:]
            elif line.startswith('LF:'):
                lf = int(line[3:])
            elif line.startswith('LH:'):
                lh = int(line[3:])
            elif line == 'end_of_record':
                if current_file and lf > 0:
                    coverage = (lh / lf) * 100
                    files_coverage.append((coverage, current_file, lh, lf))
                current_file = None
                lf = lh = 0
    
    return files_coverage

if __name__ == "__main__":
    coverage_data = parse_lcov('coverage/lcov.info')
    coverage_data.sort()
    
    print("Files with lowest coverage:")
    for coverage, filename, lh, lf in coverage_data[:15]:
        print(f"{coverage:.1f}% {filename} ({lh}/{lf})")
    
    print(f"\nTotal files: {len(coverage_data)}")
    total_lf = sum(lf for _, _, _, lf in coverage_data)
    total_lh = sum(lh for _, _, lh, _ in coverage_data)
    print(f"Overall coverage: {(total_lh/total_lf)*100:.2f}% ({total_lh}/{total_lf})")
