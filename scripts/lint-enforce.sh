#!/bin/bash
# Lythaus Lint Enforcement Script
# Runs comprehensive code analysis and enforces design system usage

set -e

echo "🔍 Lythaus Code Quality Check"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Run Flutter analyze
echo "📊 Running Flutter analysis..."
if flutter analyze --no-pub; then
    echo -e "${GREEN}✅ Analysis passed${NC}"
else
    echo -e "${RED}❌ Analysis failed${NC}"
    exit 1
fi

echo ""
echo "📝 Checking for deprecated components..."

# Check for direct use of old components (should use design system)
DEPRECATED_PATTERNS=(
    "TextField("
    "ElevatedButton("
    "TextButton("
    "OutlinedButton("
    "Card("
    "AlertDialog("
    "SnackBar("
    "ListTile("
)

FOUND_DEPRECATED=false

for pattern in "${DEPRECATED_PATTERNS[@]}"; do
    # Search in lib/ excluding design_system and generated
    if grep -r --include="*.dart" \
         --exclude-dir="design_system" \
         --exclude-dir="generated" \
         "$pattern" lib/ > /dev/null 2>&1; then
        
        if [ "$FOUND_DEPRECATED" = false ]; then
            echo -e "${YELLOW}⚠️  Found deprecated component usage:${NC}"
            FOUND_DEPRECATED=true
        fi
        
        echo -e "${YELLOW}   - $pattern${NC}"
        grep -r --include="*.dart" \
             --exclude-dir="design_system" \
             --exclude-dir="generated" \
             -n "$pattern" lib/ | head -3
        echo ""
    fi
done

if [ "$FOUND_DEPRECATED" = false ]; then
    echo -e "${GREEN}✅ No deprecated components found${NC}"
fi

echo ""
echo "🎨 Checking for hardcoded values..."

# Check for hardcoded spacing/colors
HARDCODED_ISSUES=false

# Check for hardcoded padding/margin values
if grep -r --include="*.dart" \
     --exclude-dir="design_system" \
     --exclude-dir="generated" \
     "EdgeInsets\.\(all\|symmetric\|only\)([^context]" lib/ > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Found hardcoded padding/margin (use context.spacing.*)${NC}"
    HARDCODED_ISSUES=true
fi

# Check for direct Colors.* usage (except in design_system)
if grep -r --include="*.dart" \
     --exclude-dir="design_system" \
     --exclude-dir="generated" \
     "Colors\." lib/ > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Found Colors.* usage (use context.colorScheme.*)${NC}"
    HARDCODED_ISSUES=true
fi

if [ "$HARDCODED_ISSUES" = false ]; then
    echo -e "${GREEN}✅ No hardcoded values found${NC}"
fi

echo ""
echo "📦 Checking imports..."

# Check for missing design system imports in screens
SCREEN_FILES=$(find lib/screens -name "*.dart" 2>/dev/null || echo "")

if [ -n "$SCREEN_FILES" ]; then
    MISSING_IMPORTS=false
    
    for file in $SCREEN_FILES; do
        if ! grep -q "import.*design_system" "$file"; then
            if [ "$MISSING_IMPORTS" = false ]; then
                echo -e "${YELLOW}⚠️  Screens missing design system imports:${NC}"
                MISSING_IMPORTS=true
            fi
            echo -e "${YELLOW}   - $file${NC}"
        fi
    done
    
    if [ "$MISSING_IMPORTS" = false ]; then
        echo -e "${GREEN}✅ All screens import design system${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No screen files found${NC}"
fi

echo ""
echo "🧪 Running tests..."

if flutter test --coverage --no-pub > /dev/null 2>&1; then
    echo -e "${GREEN}✅ All tests passed${NC}"
else
    echo -e "${RED}❌ Tests failed${NC}"
    exit 1
fi

echo ""
echo "=============================="
echo -e "${GREEN}🎉 Lint enforcement complete!${NC}"
echo ""
echo "Summary:"
echo "  - Analysis: Passed"
echo "  - Tests: Passed"
if [ "$FOUND_DEPRECATED" = true ]; then
    echo "  - Deprecated components: Found (see above)"
else
    echo "  - Deprecated components: None"
fi
if [ "$HARDCODED_ISSUES" = true ]; then
    echo "  - Hardcoded values: Found (see above)"
else
    echo "  - Hardcoded values: None"
fi
echo ""
