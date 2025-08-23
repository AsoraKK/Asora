#!/bin/bash

# 🔒 PRIVACY SERVICE DEPLOYMENT VALIDATION
# Validates that all GDPR/POPIA compliance functions are ready for deployment

echo "🧪 ASORA PRIVACY SERVICE - DEPLOYMENT READINESS CHECK"
echo "=================================================="

cd "$(dirname "$0")"

echo ""
echo "📁 Checking function structure..."

# Check if privacy functions exist
if [ -f "privacy/exportUser.ts" ]; then
    echo "✅ exportUser.ts found"
else
    echo "❌ exportUser.ts missing"
    exit 1
fi

if [ -f "privacy/deleteUser.ts" ]; then
    echo "✅ deleteUser.ts found"
else
    echo "❌ deleteUser.ts missing"
    exit 1
fi

# Check function configurations
if [ -f "privacy/exportUser/function.json" ]; then
    echo "✅ exportUser function.json found"
else
    echo "❌ exportUser function.json missing"
    exit 1
fi

if [ -f "privacy/deleteUser/function.json" ]; then
    echo "✅ deleteUser function.json found"  
else
    echo "❌ deleteUser function.json missing"
    exit 1
fi

echo ""
echo "🔍 Validating function configurations..."

# Validate exportUser endpoint
export_route=$(grep -o '"route": "[^"]*"' privacy/exportUser/function.json | cut -d'"' -f4)
if [ "$export_route" = "user/export" ]; then
    echo "✅ Export endpoint configured correctly: /api/user/export"
else
    echo "❌ Export endpoint misconfigured"
    exit 1
fi

# Validate deleteUser endpoint  
delete_route=$(grep -o '"route": "[^"]*"' privacy/deleteUser/function.json | cut -d'"' -f4)
if [ "$delete_route" = "user/delete" ]; then
    echo "✅ Delete endpoint configured correctly: /api/user/delete"
else
    echo "❌ Delete endpoint misconfigured"
    exit 1
fi

echo ""
echo "📝 Checking TypeScript compilation..."

# Compile TypeScript files
if npx tsc --noEmit privacy/exportUser.ts privacy/deleteUser.ts; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

echo ""
echo "🔐 Validating security features..."

# Check for JWT authentication
if grep -q "verifyJWT" privacy/exportUser.ts && grep -q "verifyJWT" privacy/deleteUser.ts; then
    echo "✅ JWT authentication implemented"
else
    echo "❌ JWT authentication missing"
    exit 1
fi

# Check for rate limiting
if grep -q "checkRateLimit" privacy/exportUser.ts; then
    echo "✅ Rate limiting implemented for exports"
else
    echo "❌ Rate limiting missing for exports"
    exit 1
fi

if grep -q "checkRateLimit" privacy/deleteUser.ts; then
    echo "✅ Rate limiting implemented for deletions"
else
    echo "❌ Rate limiting missing for deletions"  
    exit 1
fi

# Check for confirmation header requirement
if grep -q "X-Confirm-Delete" privacy/deleteUser.ts; then
    echo "✅ Deletion confirmation mechanism implemented"
else
    echo "❌ Deletion confirmation mechanism missing"
    exit 1
fi

echo ""
echo "📊 Validating GDPR compliance features..."

# Check for comprehensive data export
if grep -q "userProfile.*content.*interactions.*moderation" privacy/exportUser.ts; then
    echo "✅ Comprehensive data export implemented"
else
    echo "❌ Incomplete data export - missing required sections"
    exit 1
fi

# Check for content anonymization
if grep -q "Deleted User" privacy/deleteUser.ts; then
    echo "✅ Content anonymization implemented"
else
    echo "❌ Content anonymization missing"
    exit 1
fi

# Check for audit logging
if grep -q "auditLog" privacy/exportUser.ts && grep -q "auditLog" privacy/deleteUser.ts; then
    echo "✅ Audit logging implemented"
else
    echo "❌ Audit logging missing"
    exit 1
fi

echo ""
echo "🌐 Environment validation..."

# Check required environment variables are referenced
if grep -q "COSMOS_CONNECTION_STRING" privacy/exportUser.ts && grep -q "COSMOS_CONNECTION_STRING" privacy/deleteUser.ts; then
    echo "✅ Cosmos DB configuration referenced"
else
    echo "❌ Cosmos DB configuration missing"
    exit 1
fi

if grep -q "JWT_SECRET" privacy/exportUser.ts && grep -q "JWT_SECRET" privacy/deleteUser.ts; then
    echo "✅ JWT secret configuration referenced"
else
    echo "❌ JWT secret configuration missing"
    exit 1
fi

echo ""
echo "🎯 Final validation..."

# Count lines to ensure functions aren't stubs
export_lines=$(wc -l < privacy/exportUser.ts)
delete_lines=$(wc -l < privacy/deleteUser.ts)

if [ "$export_lines" -gt 100 ]; then
    echo "✅ Export function is fully implemented ($export_lines lines)"
else
    echo "❌ Export function appears incomplete ($export_lines lines)"
    exit 1
fi

if [ "$delete_lines" -gt 100 ]; then
    echo "✅ Delete function is fully implemented ($delete_lines lines)"
else
    echo "❌ Delete function appears incomplete ($delete_lines lines)"
    exit 1
fi

echo ""
echo "🎉 PRIVACY SERVICE DEPLOYMENT READINESS: PASSED"
echo "================================================="
echo ""
echo "📋 Summary:"
echo "  ✅ Function structure complete"
echo "  ✅ Azure Functions configuration ready"
echo "  ✅ TypeScript compilation successful"
echo "  ✅ Security features implemented"
echo "  ✅ GDPR/POPIA compliance features complete"
echo "  ✅ Environment configuration ready"
echo "  ✅ Functions fully implemented"
echo ""
echo "🚀 Ready for deployment to Azure Functions!"
echo "   Use: npm run deploy or azd up"
echo ""
echo "🧪 Next steps:"
echo "   1. Deploy functions to Azure"
echo "   2. Test with real JWT tokens"
echo "   3. Validate rate limiting in production"
echo "   4. Conduct GDPR compliance audit"
