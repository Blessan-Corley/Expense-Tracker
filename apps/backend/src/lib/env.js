const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnv() {
  const backendRoot = path.join(__dirname, '..', '..');
  const useProductionEnvFile =
    process.env.NODE_ENV === 'production' &&
    process.env.USE_ENV_PRODUCTION !== 'false';

  const envFiles = useProductionEnvFile
    ? [
      path.join(backendRoot, '.env.production'),
      path.join(backendRoot, '.env'),
    ]
    : [path.join(backendRoot, '.env')];

  envFiles.forEach((envFile) => {
    if (fs.existsSync(envFile)) {
      dotenv.config({
        path: envFile,
        override: false,
        quiet: true,
      });
    }
  });
}

module.exports = {
  loadEnv,
};
