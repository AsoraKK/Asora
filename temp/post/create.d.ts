/**
 * ASORA POST CREATION ENDPOINT
 *
 * 🎯 Purpose: Create new posts with AI-powered content moderation
 * 🔐 Security: JWT authentication + Hive AI content scanning
 * 🚨 Features: Automatic content flagging, rate limiting, spam prevention
 * 📊 Models: Text analysis, image scanning, policy enforcement
 */
import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
export declare function createPost(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
//# sourceMappingURL=create.d.ts.map