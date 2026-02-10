/**
 * Runs Prisma CLI with env loaded. Sets DIRECT_URL from DATABASE_URL if not defined.
 * Use: node scripts/prisma-with-env.js <prisma-command> [args...]
 * Example: node scripts/prisma-with-env.js db push --force-reset
 */
const path = require('path');
const { execSync } = require('child_process');

const { loadEnv } = require(path.join(__dirname, '..', 'src', 'lib', 'env'));
loadEnv();

if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const args = process.argv.slice(2);
const cmd = ['npx', 'prisma', ...args].join(' ');
execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
