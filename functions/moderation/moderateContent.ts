/**
 * ASORA - MODERATE CONTENT (PHASE 3 - ADMIN DECISIONS)
 * 
 * 🧑‍⚖️ Admin Content Moderation Decision Endpoint
 * 
 * ✅ Requirements:
 * - ADMIN JWT Authentication required (role: 'admin' or 'moderator')
 * - Accept admin decision: approve/reject/warning/escalate
 * - Update content moderation status and visibility
 * - Log detailed moderation decision with reasoning
 * - Notify flagging users of resolution (optional)
 * - Update flag status to resolved/upheld
 * - Track moderator performance metrics
 * 
 * 🎯 Request Body:
 * {
 *   contentId: string,
 *   contentType: "post" | "comment" | "user",
 *   decision: "approve" | "reject" | "warning" | "escalate",
 *   reason: string,
 *   notes?: string,
 *   notifyUsers?: boolean,
 *   severity?: "low" | "medium" | "high"
 * }
 * 
 * 📊 Decision Actions:
 * - approve: Restore content visibility, mark flags as resolved
 * - reject: Keep content hidden, mark flags as upheld
 * - warning: Restore content, send warning to author
 * - escalate: Move to senior moderator queue
 * 
 * 🔄 Database Updates:
 * - Content: moderationStatus, visibility, moderatorId, reviewedAt
 * - Flags: status (resolved/upheld), reviewedBy, reviewedAt
 * - Logs: Detailed audit trail with decision reasoning
 * 
 * 🛡️ Security & Compliance:
 * - Role-based access control
 * - Decision audit logging
 * - Moderator accountability tracking
 * - Appeal process preparation
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserContext } from '../shared/auth';
import { getContainer } from '../shared/cosmosClient';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';

interface ModerationDecision {
    contentId: string;
    contentType: 'post' | 'comment' | 'user';
    decision: 'approve' | 'reject' | 'warning' | 'escalate';
    reason: string;
    notes?: string;
    notifyUsers?: boolean;
    severity?: 'low' | 'medium' | 'high';
}

interface ModerationResult {
    success: boolean;
    decision: ModerationDecision;
    contentUpdated: boolean;
    flagsUpdated: number;
    auditLogId: string;
    notificationsSent?: number;
}

export async function moderateContent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        // 1. Validate admin authentication
        const userContext = getUserContext(request);
        if (!userContext) {
            return {
                status: 401,
                jsonBody: { error: 'Unauthorized - Invalid or missing JWT token' }
            };
        }

        // 2. Check if user has admin/moderator role
        if (userContext.role !== 'admin' && userContext.role !== 'moderator') {
            context.warn(`Unauthorized moderation attempt by user ${userContext.userId} with role ${userContext.role}`);
            return {
                status: 403,
                jsonBody: { 
                    error: 'Forbidden - Admin or moderator role required',
                    userRole: userContext.role,
                    requiredRoles: ['admin', 'moderator']
                }
            };
        }

        // 3. Validate request body
        const schema = Joi.object({
            contentId: Joi.string().required(),
            contentType: Joi.string().valid('post', 'comment', 'user').required(),
            decision: Joi.string().valid('approve', 'reject', 'warning', 'escalate').required(),
            reason: Joi.string().min(10).max(500).required(),
            notes: Joi.string().max(1000).optional(),
            notifyUsers: Joi.boolean().default(true),
            severity: Joi.string().valid('low', 'medium', 'high').default('medium')
        });

        const { error, value } = schema.validate(await request.json());
        if (error) {
            return {
                status: 400,
                jsonBody: { error: `Validation failed: ${error.message}` }
            };
        }

        const moderationRequest: ModerationDecision = value;

        // 4. Get the content to be moderated
        const collectionName = moderationRequest.contentType === 'user' ? 'users' : `${moderationRequest.contentType}s`;
        const contentContainer = getContainer(collectionName);
        
        let targetContent;
        try {
            const { resource } = await contentContainer.item(moderationRequest.contentId, moderationRequest.contentId).read();
            targetContent = resource;
        } catch (dbError: any) {
            if (dbError.code === 404) {
                return {
                    status: 404,
                    jsonBody: { 
                        error: `${moderationRequest.contentType.charAt(0).toUpperCase() + moderationRequest.contentType.slice(1)} not found`,
                        contentId: moderationRequest.contentId
                    }
                };
            }
            throw dbError;
        }

        if (!targetContent) {
            return {
                status: 404,
                jsonBody: { error: `Content not found: ${moderationRequest.contentId}` }
            };
        }

        // 5. Verify content is in pending review state
        if (targetContent.moderationStatus !== 'pending_review') {
            return {
                status: 409,
                jsonBody: { 
                    error: 'Content is not pending review',
                    currentStatus: targetContent.moderationStatus,
                    contentId: moderationRequest.contentId
                }
            };
        }

        // 6. Apply moderation decision to content
        const timestamp = new Date().toISOString();
        let contentUpdates: any[] = [];
        let newModerationStatus = '';
        let newVisibility = targetContent.visibility;

        switch (moderationRequest.decision) {
            case 'approve':
                newModerationStatus = 'approved';
                newVisibility = 'public'; // Restore visibility
                contentUpdates = [
                    { op: 'replace' as const, path: '/moderationStatus', value: 'approved' },
                    { op: 'replace' as const, path: '/visibility', value: 'public' },
                    { op: 'replace' as const, path: '/moderatedBy', value: userContext.userId },
                    { op: 'replace' as const, path: '/moderatedAt', value: timestamp },
                    { op: 'replace' as const, path: '/moderationReason', value: moderationRequest.reason },
                    { op: 'replace' as const, path: '/updatedAt', value: timestamp }
                ];
                break;

            case 'reject':
                newModerationStatus = 'rejected';
                newVisibility = 'hidden'; // Keep hidden
                contentUpdates = [
                    { op: 'replace' as const, path: '/moderationStatus', value: 'rejected' },
                    { op: 'replace' as const, path: '/visibility', value: 'hidden' },
                    { op: 'replace' as const, path: '/moderatedBy', value: userContext.userId },
                    { op: 'replace' as const, path: '/moderatedAt', value: timestamp },
                    { op: 'replace' as const, path: '/moderationReason', value: moderationRequest.reason },
                    { op: 'replace' as const, path: '/updatedAt', value: timestamp }
                ];
                break;

            case 'warning':
                newModerationStatus = 'warning_issued';
                newVisibility = 'public'; // Restore but flag for warning
                contentUpdates = [
                    { op: 'replace' as const, path: '/moderationStatus', value: 'warning_issued' },
                    { op: 'replace' as const, path: '/visibility', value: 'public' },
                    { op: 'replace' as const, path: '/moderatedBy', value: userContext.userId },
                    { op: 'replace' as const, path: '/moderatedAt', value: timestamp },
                    { op: 'replace' as const, path: '/moderationReason', value: moderationRequest.reason },
                    { op: 'replace' as const, path: '/warningIssued', value: true },
                    { op: 'replace' as const, path: '/updatedAt', value: timestamp }
                ];
                break;

            case 'escalate':
                newModerationStatus = 'escalated';
                newVisibility = targetContent.visibility; // Keep current state
                contentUpdates = [
                    { op: 'replace' as const, path: '/moderationStatus', value: 'escalated' },
                    { op: 'replace' as const, path: '/escalatedBy', value: userContext.userId },
                    { op: 'replace' as const, path: '/escalatedAt', value: timestamp },
                    { op: 'replace' as const, path: '/escalationReason', value: moderationRequest.reason },
                    { op: 'replace' as const, path: '/escalationLevel', value: 'senior_moderator' },
                    { op: 'replace' as const, path: '/updatedAt', value: timestamp }
                ];
                break;
        }

        // Apply content updates
        let contentUpdated = false;
        try {
            await contentContainer.item(moderationRequest.contentId, moderationRequest.contentId).patch(contentUpdates);
            contentUpdated = true;
            context.log(`✅ Content ${moderationRequest.contentId} updated with decision: ${moderationRequest.decision}`);
        } catch (updateError: any) {
            context.error(`Failed to update content: ${updateError.message}`);
            return {
                status: 500,
                jsonBody: { 
                    error: 'Failed to update content',
                    details: updateError.message
                }
            };
        }

        // 7. Update all flags associated with this content
        const flagsContainer = getContainer('flags');
        const flagsQuery = {
            query: 'SELECT * FROM c WHERE c.targetType = @targetType AND c.targetId = @targetId',
            parameters: [
                { name: '@targetType', value: moderationRequest.contentType },
                { name: '@targetId', value: moderationRequest.contentId }
            ]
        };

        const { resources: contentFlags } = await flagsContainer.items.query(flagsQuery).fetchAll();
        let flagsUpdated = 0;

        // Determine flag resolution status
        const flagStatus = moderationRequest.decision === 'reject' ? 'upheld' : 'resolved';
        
        for (const flag of contentFlags) {
            try {
                const flagUpdate = [{
                    op: 'replace' as const,
                    path: '/status',
                    value: flagStatus
                }, {
                    op: 'replace' as const,
                    path: '/reviewedBy',
                    value: userContext.userId
                }, {
                    op: 'replace' as const,
                    path: '/reviewedAt',
                    value: timestamp
                }, {
                    op: 'replace' as const,
                    path: '/moderationDecision',
                    value: moderationRequest.decision
                }, {
                    op: 'replace' as const,
                    path: '/moderationReason',
                    value: moderationRequest.reason
                }];

                await flagsContainer.item(flag.id, flag.id).patch(flagUpdate);
                flagsUpdated++;
            } catch (flagUpdateError: any) {
                context.warn(`Failed to update flag ${flag.id}: ${flagUpdateError.message}`);
            }
        }

        // 8. Create comprehensive audit log
        const moderationLogsContainer = getContainer('moderationLogs');
        const auditLogId = uuidv4();
        
        const auditRecord = {
            id: auditLogId,
            type: 'moderation_decision',
            moderatorUserId: userContext.userId,
            moderatorEmail: userContext.email,
            moderatorRole: userContext.role,
            contentId: moderationRequest.contentId,
            contentType: moderationRequest.contentType,
            contentAuthorId: targetContent.userId || targetContent.id,
            decision: moderationRequest.decision,
            reason: moderationRequest.reason,
            notes: moderationRequest.notes,
            severity: moderationRequest.severity,
            flagsAffected: contentFlags.length,
            flagsUpdated,
            previousStatus: targetContent.moderationStatus,
            newStatus: newModerationStatus,
            previousVisibility: targetContent.visibility,
            newVisibility,
            timestamp,
            metadata: {
                flagDetails: contentFlags.map(f => ({
                    flagId: f.id,
                    flagReason: f.reason,
                    flaggedBy: f.userId,
                    flaggedAt: f.createdAt
                })),
                aiAnalysis: contentFlags[0]?.aiAnalysis || null,
                processingTimeMs: Date.now() - new Date(targetContent.updatedAt).getTime()
            }
        };

        await moderationLogsContainer.items.create(auditRecord);

        // 9. Prepare notifications (placeholder for future implementation)
        let notificationsSent = 0;
        if (moderationRequest.notifyUsers) {
            // TODO: Implement user notifications
            // - Notify content author of decision
            // - Notify flagging users of resolution
            // - Send warnings if decision is 'warning'
            context.log(`📧 Notification queued for decision: ${moderationRequest.decision}`);
        }

        // 10. Log success and return result
        context.log(`✅ Moderation decision processed by ${userContext.email}: ${moderationRequest.decision} for ${moderationRequest.contentType}:${moderationRequest.contentId}`);

        const result: ModerationResult = {
            success: true,
            decision: moderationRequest,
            contentUpdated,
            flagsUpdated,
            auditLogId,
            notificationsSent: moderationRequest.notifyUsers ? notificationsSent : undefined
        };

        return {
            status: 200,
            jsonBody: result
        };

    } catch (error: any) {
        context.error('Moderation decision error:', error);
        return {
            status: 500,
            jsonBody: {
                error: 'Internal server error',
                message: process.env['NODE_ENV'] === 'development' ? error.message : 'Unable to process moderation decision'
            }
        };
    }
}

app.http('moderateContent', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'moderation/moderate',
    handler: moderateContent
});
