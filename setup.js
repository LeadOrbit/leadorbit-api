const fs = require('fs');

function createFileIfMissing(path, content, label) {
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, content);
    console.log(`✅ Created ${path}.`);
    console.log(`ℹ️  Please update the ${label} with actual values or ask the repository owner.`);
  } else {
    console.log(`✔️  ${path} already exists.`);
  }
}

const envTemplate = `
# Server Settings
ENABLE_JOBS=
PORT=

# Database Settings
DB_USER=
DB_HOST=
DB_NAME=
DB_PASSWORD=
DB_PORT=
DB_SSL=

# Authentication
LOGIN_USERNAME=
LOGIN_PASSWORD=
JWT_SECRET=

# URLs
SERVER_BASE_URL=
FRONTEND_URL=
BACKEND_URL=
FRONTEND_URL_PROD=
BACKEND_URL_PROD=

# Automation
AUTOMATION_LIST_URI=

# API Keys
OPENAI_API_KEY=
OPEN_ROUTER_API_KEY=
OPENROUTER_API_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Zoho
ZOHO_USER=
ZOHO_PASS=
ZOHO_EMAIL=
SUPPORT_EMAIL=

# Apollo
APOLLO_API_KEY=
APOLLO_SEARCH_API_KEY=

# Google Service Account (JSON string or path to file)
GOOGLE_SERVICE_ACCOUNT_CRED=
`.trim();

const credentialsTemplate = JSON.stringify({
  type: "service_account",
  project_id: "your-project-id",
  private_key_id: "your-private-key-id",
  private_key: "-----BEGIN PRIVATE KEY-----\\nYOUR_PRIVATE_KEY\\n-----END PRIVATE KEY-----\\n",
  client_email: "your-service-account-email@your-project-id.iam.gserviceaccount.com",
  client_id: "your-client-id",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account-email%40your-project-id.iam.gserviceaccount.com"
}, null, 2);

createFileIfMissing('.env', envTemplate, '.env file');
createFileIfMissing('credentials.json', credentialsTemplate, 'Google Cloud credentials file');
