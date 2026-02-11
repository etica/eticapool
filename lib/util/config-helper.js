import fs from 'fs'
import path from 'path'

/**
 * Validates pool.config.json at startup and returns the config for the specified environment.
 * Exits with a clear error message if validation fails.
 */
export function loadAndValidateConfig(configPath, poolEnv) {
    // 1. Resolve the path (same logic as FileUtils.readJsonFileSync)
    const cwdPath = path.resolve() + configPath;
    let resolvedPath = null;

    if (fs.existsSync(cwdPath)) {
        resolvedPath = cwdPath;
    } else if (path.isAbsolute(configPath) && fs.existsSync(configPath)) {
        resolvedPath = configPath;
    }

    if (!resolvedPath) {
        console.error(`FATAL: Config file not found at '${configPath}'.`);
        console.error(`  Checked: ${cwdPath}`);
        if (path.isAbsolute(configPath)) console.error(`  Checked: ${configPath}`);
        console.error(`  Copy pool.config.template.json to pool.config.json and fill in your values.`);
        console.error(`  If using Docker, ensure the volume mount is correct.`);
        process.exit(1);
    }

    // 2. Read the file
    let raw;
    try {
        raw = fs.readFileSync(resolvedPath, 'utf8');
    } catch (err) {
        console.error(`FATAL: Cannot read config file '${resolvedPath}': ${err.message}`);
        process.exit(1);
    }

    // 3. Parse JSON
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        console.error(`FATAL: Config file '${resolvedPath}' is not valid JSON: ${err.message}`);
        process.exit(1);
    }

    // 4. Check environment section exists
    if (!parsed[poolEnv] || typeof parsed[poolEnv] !== 'object') {
        const available = Object.keys(parsed).join(', ');
        console.error(`FATAL: Config has no '${poolEnv}' section. Available sections: [${available}].`);
        console.error(`  Check the POOL_ENV environment variable (current: '${poolEnv}').`);
        process.exit(1);
    }

    const config = parsed[poolEnv];

    // 5. Check required fields
    const errors = [];
    if (!config.mintingConfig || typeof config.mintingConfig !== 'object') {
        errors.push(`${poolEnv}.mintingConfig section is missing.`);
    } else {
        if (!config.mintingConfig.publicAddress) {
            errors.push(`${poolEnv}.mintingConfig.publicAddress is missing or empty.`);
        }
        if (!config.mintingConfig.web3Provider) {
            errors.push(`${poolEnv}.mintingConfig.web3Provider is missing or empty.`);
        }
    }
    if (!config.paymentsConfig || typeof config.paymentsConfig !== 'object') {
        errors.push(`${poolEnv}.paymentsConfig section is missing.`);
    } else {
        if (!config.paymentsConfig.publicAddress) {
            errors.push(`${poolEnv}.paymentsConfig.publicAddress is missing or empty.`);
        }
    }

    if (errors.length > 0) {
        console.error(`FATAL: pool.config.json validation failed:`);
        errors.forEach(e => console.error(`  - ${e}`));
        process.exit(1);
    }

    return config;
}
