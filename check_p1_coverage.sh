#!/bin/bash
# Calculate P1 modules coverage manually

echo "📊 Calculating P1 modules coverage..."

# Extract P1 coverage data
cd /c/Users/kylee/asora

# Get P1 module lines from coverage
P1_LINES=$(grep -A 50 "SF:lib\\\\p1_modules" coverage/lcov.info | grep "^DA:" | wc -l)
P1_HIT_LINES=$(grep -A 50 "SF:lib\\\\p1_modules" coverage/lcov.info | grep "^DA:" | grep -v ",0$" | wc -l)

echo "Total instrumented lines in P1 modules: $P1_LINES"
echo "Hit lines in P1 modules: $P1_HIT_LINES"

if [ $P1_LINES -gt 0 ]; then
    P1_COVERAGE=$(( $P1_HIT_LINES * 100 / $P1_LINES ))
    echo "P1 modules coverage: $P1_COVERAGE%"
    
    if [ $P1_COVERAGE -ge 80 ]; then
        echo "✅ Coverage gate PASSED ($P1_COVERAGE% >= 80%)"
        exit 0
    else
        echo "❌ Coverage gate FAILED ($P1_COVERAGE% < 80%)"
        echo "Need to add $(( 80 - P1_COVERAGE ))% more coverage"
        exit 1
    fi
else
    echo "❌ No P1 module lines found in coverage"
    exit 1
fi
