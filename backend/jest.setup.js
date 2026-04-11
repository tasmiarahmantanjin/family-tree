// Load test-specific environment variables before any test runs.
// This ensures tests never accidentally use the production .env file.
require('dotenv').config({ path: '.env.test' })
