#!/usr/bin/env bash
# Release-web config shared by Cloudflare Pages and GitHub Actions.
# Public values only; do not add secrets here.

export ENVIRONMENT=production
export API_BASE_URL=https://api.lythaus.co/api
export AUTH_URL=https://api.lythaus.co/api
export WEB_BASE_URL=https://app.lythaus.co
export ADMIN_API_URL=https://admin-api.lythaus.co/api
export MARKETING_BASE_URL=https://lythaus.co
export OAUTH2_AUTHORIZATION_ENDPOINT=https://api.lythaus.co/api/auth/authorize
export OAUTH2_TOKEN_ENDPOINT=https://api.lythaus.co/api/auth/token
export OAUTH2_USERINFO_ENDPOINT=https://api.lythaus.co/api/auth/userinfo
