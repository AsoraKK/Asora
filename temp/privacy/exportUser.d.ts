/**
 * ASORA USER DATA EXPORT ENDPOINT
 *
 * 🎯 Purpose: GDPR Article 20 (Data Portability) compliance - Export user data
 * 🔐 Security: JWT authentication + user ownership verification + rate limiting
 * 📊 Features: Complete data aggregation, rate limiting, privacy-safe export
 * 🏗️ Architecture: Multi-source data collection with structured JSON output
 */
import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
export declare function exportUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
//# sourceMappingURL=exportUser.d.ts.map