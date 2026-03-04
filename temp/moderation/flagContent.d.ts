/**
 * ASORA CONTENT FLAGGING ENDPOINT
 *
 * 🎯 Purpose: Allow users to flag inappropriate content for review
 * 🔐 Security: JWT authentication + rate limiting + spam prevention
 * 🚨 Features: Content flagging, duplicate prevention, Hive AI analysis
 * 📊 Models: User reports with optional AI verification
 */
import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
export declare function flagContent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
//# sourceMappingURL=flagContent.d.ts.map