const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const frontendSrc = path.resolve(__dirname, '../src');

// Copy contracts
const contractsSrc = path.join(rootDir, 'contracts');
const contractsDest = path.join(frontendSrc, 'contracts');
if (!fs.existsSync(contractsDest)) fs.mkdirSync(contractsDest, { recursive: true });
for (const file of fs.readdirSync(contractsSrc)) {
  fs.copyFileSync(path.join(contractsSrc, file), path.join(contractsDest, file));
}

// Copy config
const configSrc = path.join(rootDir, 'config', 'DeployedContractInfo.json');
const configDest = path.join(frontendSrc, 'config');
if (!fs.existsSync(configDest)) fs.mkdirSync(configDest, { recursive: true });
fs.copyFileSync(configSrc, path.join(configDest, 'DeployedContractInfo.json'));
