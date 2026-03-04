/**
 * ASORA APPEAL VOTING ENDPOINT
 *
 * 🎯 Purpose: Allow moderators to vote on content appeals
 * 🔐 Security: JWT authentication + role verification + duplicate prevention
 * 🚨 Features: Democratic voting, quorum tracking, automatic resolution
 * 📊 Models: Community moderation with weighted voting
 */
import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
export declare function voteOnAppeal(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
//# sourceMappingURL=voteOnAppeal.d.ts.map