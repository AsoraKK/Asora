#!/usr/bin/env bash
# Release-web config shared by Cloudflare Pages and GitHub Actions.
# Public values only; do not add secrets here.

export ENVIRONMENT=production
export API_BASE_URL=https://asora-function-prod.northeurope-01.azurewebsites.net/api
export AUTH_URL=https://asora-function-prod.northeurope-01.azurewebsites.net/api
export WEB_BASE_URL=https://lythaus-web.pages.dev
export ADMIN_API_URL=https://admin-api.asora.co.za
