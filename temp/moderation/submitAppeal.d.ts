/**
 * ASORA APPEAL SUBMISSION ENDPOINT
 *
 * 🎯 Purpose: Allow users to appeal content moderation decisions
 * 🔐 Security: JWT authentication + one appeal per content limit
 * 🚨 Features: Appeal creation, duplicate prevention, auto-prioritization
 * 📊 Models: Community-driven appeals system
 */
import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
export declare function submitAppeal(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
//# sourceMappingURL=submitAppeal.d.ts.map