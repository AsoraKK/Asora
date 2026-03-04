/**
 * ASORA GET MY APPEALS ENDPOINT
 *
 * 🎯 Purpose: Retrieve user's appeal history with detailed status
 * 🔐 Security: JWT authentication + user ownership verification
 * 📊 Features: Pagination, filtering by status, detailed vote information
 * 🚀 Performance: Optimized queries with indexed searches
 */
import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
export declare function getMyAppeals(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
//# sourceMappingURL=getMyAppeals.d.ts.map