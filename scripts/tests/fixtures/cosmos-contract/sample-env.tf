module "cosmos_sql" {
  containers = [
    {
      name          = "users"
      partition_key = "/id"
    },
    {
      name          = "posts"
      partition_key = "/authorId"
    },
    {
      name          = "notification_events"
      partition_key = "/userId"
    }
  ]
}
