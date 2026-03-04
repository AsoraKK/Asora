/**
 * ASORA USER ACCOUNT DELETION ENDPOINT
 *
 * 🎯 Purpose: GDPR Article 17 (Right to be Forgotten) compliance - Delete user data
 * 🔐 Security: JWT auth + confirmation header + idempotent operations
 * ⚠️ Features: Complete data scrubbing, content anonymization, audit logging
 * 🗃️ Architecture: Multi-container cleanup with rollback safety
 */
import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
export declare function deleteUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
//# sourceMappingURL=deleteUser.d.ts.map