# Legacy environment roots

The `dev`, `staging`, and `prod` roots are retained as reference-only configuration. They are not authoritative for the Lythaus shared-MVP Azure environment and must not be applied.

The project currently has one approved Azure environment: the existing shared MVP. The missing historical observability module references were removed so the remaining reference configuration can be formatted and validated without implying that additional environments should be created.

Use the root `infra/` configuration only through the protected infrastructure-change workflow, after importing and reconciling live state. Ordinary application deployments must never apply any Terraform root.
