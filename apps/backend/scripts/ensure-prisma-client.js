const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const backendRoot = path.join(__dirname, '..');
const prismaDefaultClientPath = path.join(backendRoot, '..', '..', 'node_modules', '.prisma', 'client', 'default.js');

function prismaClientNeedsGeneration() {
  if (!fs.existsSync(prismaDefaultClientPath)) {
    return true;
  }

  try {
    const content = fs.readFileSync(prismaDefaultClientPath, 'utf8');
    return content.includes('@prisma/client did not initialize yet');
  } catch {
    return true;
  }
}

if (prismaClientNeedsGeneration()) {
  console.log('Prisma client is missing or not initialized. Generating...');
  execSync('npm run db:generate', { cwd: backendRoot, stdio: 'inherit' });
} else {
  console.log('Prisma client already generated.');
}
