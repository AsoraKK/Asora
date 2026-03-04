"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Simple validation test for privacy functions
const exportUser_1 = require("./privacy/exportUser");
const deleteUser_1 = require("./privacy/deleteUser");
console.log('✅ Privacy functions imported successfully');
// Validate function signatures
const isFunction = (fn) => typeof fn === 'function';
if (isFunction(exportUser_1.exportUser)) {
    console.log('✅ exportUser function found');
}
else {
    console.log('❌ exportUser function not found');
}
if (isFunction(deleteUser_1.deleteUser)) {
    console.log('✅ deleteUser function found');
}
else {
    console.log('❌ deleteUser function not found');
}
console.log('📝 Privacy Service Module validation complete');
//# sourceMappingURL=validate-privacy.js.map