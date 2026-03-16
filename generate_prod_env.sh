#!/bin/bash

# Configuration Generator for SOS Location Production
# Generates strong random secrets for environment variables

GEN_PASSWORD() {
    openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 32
}

GEN_SECRET() {
    openssl rand -hex 32
}

ENV_FILE=".env.prod"

if [ -f "$ENV_FILE" ]; then
    echo "Warning: $ENV_FILE already exists. Aborting to prevent overwrite."
    exit 1
fi

echo "### PRODUCTION ENVIRONMENT CONFIGURATION ###" > $ENV_FILE
echo "### Generated on $(date) ###" >> $ENV_FILE
echo "" >> $ENV_FILE

# Database
echo "POSTGRES_DB=sos_location" >> $ENV_FILE
echo "POSTGRES_USER=sos_prod_admin" >> $ENV_FILE
echo "POSTGRES_PASSWORD=$(GEN_PASSWORD)" >> $ENV_FILE
echo "" >> $ENV_FILE

# Keycloak
echo "KEYCLOAK_ADMIN=guardian_admin" >> $ENV_FILE
echo "KEYCLOAK_ADMIN_PASSWORD=$(GEN_PASSWORD)" >> $ENV_FILE
echo "KEYCLOAK_DB_PASSWORD=$(GEN_PASSWORD)" >> $ENV_FILE
echo "" >> $ENV_FILE

# JWT & API Secrets
echo "JWT_SECRET=$(GEN_SECRET)" >> $ENV_FILE
echo "API_KEY_CLIMAKI=$(GEN_SECRET)" >> $ENV_FILE
echo "" >> $ENV_FILE

# Hostnames
echo "VITE_KEYCLOAK_URL=https://sso.soslocation.org" >> $ENV_FILE
echo "VITE_API_BASE_URL=https://api.soslocation.org" >> $ENV_FILE

echo "Success: $ENV_FILE generated with high-entropy secrets."
echo "CRITICAL: Do not commit this file to version control."
chmod 600 $ENV_FILE
