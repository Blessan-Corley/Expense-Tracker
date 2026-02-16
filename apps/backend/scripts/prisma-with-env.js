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

const hasDangerousFlag = args.includes('--force-reset') || args.includes('--accept-data-loss');
const isMigrateReset = args[0] === 'migrate' && args[1] === 'reset';
const allowDestructive = process.env.ALLOW_DESTRUCTIVE_DB_COMMANDS === 'true';

if ((hasDangerousFlag || isMigrateReset) && !allowDestructive) {
  console.error('Refusing to run destructive Prisma command.');
  console.error('If you really need it, set ALLOW_DESTRUCTIVE_DB_COMMANDS=true for that command only.');
  process.exit(1);
}

const cmd = ['npx', 'prisma', ...args].join(' ');
execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
