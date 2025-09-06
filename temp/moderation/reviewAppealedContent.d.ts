/**
 * ASORA REVIEW APPEALED CONTENT ENDPOINT
 *
 * 🎯 Purpose: Moderator queue for reviewing appeals and votes
 * 🔐 Security: JWT authentication + moderator role verification
 * 📊 Features: Priority queue, batch operations, detailed context
 * 🚀 Performance: Indexed queries with smart filtering
 */
import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
export declare function reviewAppealedContent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
//# sourceMappingURL=reviewAppealedContent.d.ts.map