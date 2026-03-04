// Simple validation test for privacy functions
import { exportUser } from './privacy/exportUser';
import { deleteUser } from './privacy/deleteUser';

console.log('✅ Privacy functions imported successfully');

// Validate function signatures
const isFunction = (fn: any) => typeof fn === 'function';

if (isFunction(exportUser)) {
  console.log('✅ exportUser function found');
} else {
  console.log('❌ exportUser function not found');
}

if (isFunction(deleteUser)) {
  console.log('✅ deleteUser function found');
} else {
  console.log('❌ deleteUser function not found');
}

console.log('📝 Privacy Service Module validation complete');
