#!/usr/bin/env node

/**
 * Generate secure random secrets for environment variables
 * Usage: node scripts/generate-secrets.js
 */

const crypto = require('crypto');

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

console.log('Generated secure secrets for your environment variables:\n');
console.log('NEXTAUTH_SECRET=' + generateSecret());
console.log('CRON_SECRET=' + generateSecret());
console.log('\nCopy these values to your .env file or Vercel environment variables.');

