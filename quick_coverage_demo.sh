#!/bin/bash
# Quick coverage gate demonstration

echo "🎯 Flutter Coverage Gate for P1 Modules - Demo"
echo "==============================================="

# Run just the test to show it works
echo "📊 Running Flutter tests with coverage..."
flutter test --coverage > /dev/null 2>&1

if [ -f coverage/lcov.info ]; then
    echo "✅ Coverage generated successfully"
    
    # Check for P1 modules
    P1_FILES=$(grep -c "p1_modules" coverage/lcov.info 2>/dev/null || echo "0")
    echo "📊 P1 modules found in coverage: $P1_FILES"
    
    if [ "$P1_FILES" -gt 0 ]; then
        echo "✅ P1 modules are covered by tests"
        echo ""
        echo "🔍 P1 files in coverage:"
        grep "SF:" coverage/lcov.info | grep p1_modules
        echo ""
        echo "🚀 In CI: This will be processed by lcov for exact coverage percentages"
        echo "🎯 Gate requirement: 80% coverage for P1 modules"
        echo "✅ Status: Ready for CI validation"
    else
        echo "❌ No P1 modules found in coverage"
    fi
else
    echo "❌ No coverage file generated"
fi
