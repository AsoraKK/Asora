/**
 * COSMOS DB PRIVACY OPTIMIZATION INDEXES
 * 
 * 🎯 Purpose: Optimized indexes for GDPR/POPIA privacy queries
 * 🔍 Queries: Fast user data retrieval and privacy compliance operations
 * 📊 Performance: Minimize RU consumption for privacy operations
 * 🗃️ Platform: Azure Cosmos DB with SQL API
 */

// Privacy-optimized composite indexes for user data queries
resource "cosmos_privacy_indexes" {
  // Users container - already has partition key on 'id' (userId)
  users_container_indexes = {
    composite_indexes = [
      {
        // Index for user lookup by email (auth operations)
        paths = [
          { path = "/email", order = "ascending" },
          { path = "/createdAt", order = "descending" }
        ]
      }
    ],
    
    spatial_indexes = [],
    
    included_paths = [
      { path = "/*" }  // Include all paths for privacy export
    ],
    
    excluded_paths = []
  }

  // Posts container - partition key on 'id' (postId), but need authorId queries
  posts_container_indexes = {
    composite_indexes = [
      {
        // Index for posts by author (privacy export/deletion)
        paths = [
          { path = "/authorId", order = "ascending" },
          { path = "/createdAt", order = "descending" }
        ]
      },
      {
        // Index for posts by author and deletion status
        paths = [
          { path = "/authorId", order = "ascending" },
          { path = "/deletedAt", order = "ascending" },
          { path = "/createdAt", order = "descending" }
        ]
      }
    ],
    
    included_paths = [
      { path = "/*" }  // Include all paths for export
    ]
  }

  // Comments container - partition key on 'postId', but need authorId queries
  comments_container_indexes = {
    composite_indexes = [
      {
        // Index for comments by author across all posts
        paths = [
          { path = "/authorId", order = "ascending" },
          { path = "/postId", order = "ascending" },
          { path = "/createdAt", order = "descending" }
        ]
      },
      {
        // Index for comments by author and deletion status
        paths = [
          { path = "/authorId", order = "ascending" },
          { path = "/deletedAt", order = "ascending" },
          { path = "/createdAt", order = "descending" }
        ]
      }
    ]
  }

  // Likes container - partition key on 'postId', but need userId queries
  likes_container_indexes = {
    composite_indexes = [
      {
        // Index for likes by user across all posts
        paths = [
          { path = "/userId", order = "ascending" },
          { path = "/postId", order = "ascending" },
          { path = "/createdAt", order = "descending" }
        ]
      }
    ]
  }

  // Appeals container - partition key on 'id', but need userId queries
  appeals_container_indexes = {
    composite_indexes = [
      {
        // Index for appeals by user
        paths = [
          { path = "/userId", order = "ascending" },
          { path = "/status", order = "ascending" },
          { path = "/createdAt", order = "descending" }
        ]
      }
    ]
  }

  // Votes container - partition key on 'postId', but need userId queries
  votes_container_indexes = {
    composite_indexes = [
      {
        // Index for votes by user across all posts
        paths = [
          { path = "/userId", order = "ascending" },
          { path = "/postId", order = "ascending" },
          { path = "/voteType", order = "ascending" }
        ]
      }
    ]
  }

  // Flags container - partition key on 'postId', but need userId queries
  flags_container_indexes = {
    composite_indexes = [
      {
        // Index for flags by user across all posts
        paths = [
          { path = "/userId", order = "ascending" },
          { path = "/postId", order = "ascending" },
          { path = "/reason", order = "ascending" },
          { path = "/createdAt", order = "descending" }
        ]
      }
    ]
  }
}

/**
 * RECOMMENDED QUERY PATTERNS
 * 
 * These indexes optimize the following privacy queries:
 * 
 * 1. User Data Export (getAllUserData):
 *    - SELECT * FROM c WHERE c.authorId = @userId ORDER BY c.createdAt DESC
 *    - SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC
 * 
 * 2. User Content Marking (markUserContentAsDeleted):
 *    - SELECT * FROM c WHERE c.authorId = @userId AND IS_NULL(c.deletedAt)
 *    - UPDATE operations on posts and comments by authorId
 * 
 * 3. Privacy Cleanup Queries (future):
 *    - SELECT * FROM c WHERE c.deletedAt < @cutoffDate
 *    - SELECT * FROM c WHERE c.authorId = @userId AND NOT IS_NULL(c.deletedAt)
 * 
 * 4. Audit and Compliance:
 *    - SELECT * FROM c WHERE c.userId = @userId AND c.createdAt >= @startDate
 *    - Cross-container queries for complete user activity tracking
 * 
 * RU OPTIMIZATION NOTES:
 * - Composite indexes reduce query RU cost by 10-50%
 * - Order by createdAt DESC optimizes recent data retrieval
 * - Cross-partition queries minimized with userId-first indexing
 * - Deletion status indexes enable efficient cleanup operations
 */
