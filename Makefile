TF_DIR := infrastructure

.PHONY: tf-workspace tf-init tf-plan tf-apply tf-init-dev tf-plan-dev tf-apply-dev tf-init-stage tf-plan-stage tf-apply-stage tf-init-prod tf-plan-prod tf-apply-prod

# Internal helper to select or create a workspace
 tf-workspace:
	@cd $(TF_DIR) && (terraform workspace select $(ENV) || terraform workspace new $(ENV))

# Generic targets (ENV must be set)
 tf-init: tf-workspace
	@cd $(TF_DIR) && terraform init -input=false

 tf-plan: tf-workspace
	@cd $(TF_DIR) && terraform plan -input=false

 tf-apply: tf-workspace
	@cd $(TF_DIR) && terraform apply -input=false

# Convenience targets for dev
 tf-init-dev:
	@$(MAKE) tf-init ENV=dev
 tf-plan-dev:
	@$(MAKE) tf-plan ENV=dev
 tf-apply-dev:
	@$(MAKE) tf-apply ENV=dev

# Convenience targets for stage
 tf-init-stage:
	@$(MAKE) tf-init ENV=stage
 tf-plan-stage:
	@$(MAKE) tf-plan ENV=stage
 tf-apply-stage:
	@$(MAKE) tf-apply ENV=stage

# Convenience targets for prod
 tf-init-prod:
	@$(MAKE) tf-init ENV=prod
 tf-plan-prod:
	@$(MAKE) tf-plan ENV=prod
 tf-apply-prod:
	@$(MAKE) tf-apply ENV=prod
