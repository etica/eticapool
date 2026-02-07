import SegfaultHandler from 'segfault-handler';
SegfaultHandler.registerHandler('crash.log');

import FileUtils from './lib/util/file-utils.js'
import MongoInterface from './lib/mongo-interface.js'
import WebServer from './lib/web-server.js'
import DiagnosticsManager from './lib/diagnostics-manager.js'
import RedisPubSub from './lib/util/redis-pubsub.js'
import GeneralEventEmitterHandler from './lib/util/GeneralEventEmitterHandler.js'

var pool_env = process.env.POOL_ENV || 'production';
const configPath = process.env.POOL_CONFIG_PATH || '/pool.config.json';
let poolConfigFull = FileUtils.readJsonFileSync(configPath);
let poolConfig = poolConfigFull[pool_env];

var https_enabled = process.argv[2] === 'https';

console.log('Eticapool Web/API Service starting...');

async function init() {
    let mongoInterface = new MongoInterface();
    await mongoInterface.init('tokenpool_'.concat(pool_env));

    // Redis Pub/Sub for cross-process events (optional for web-only mode)
    try {
        let redisPubSub = RedisPubSub.getInstance();
        await redisPubSub.init(process.env.REDIS_URL);
        GeneralEventEmitterHandler.getInstance().setRedisPubSub(redisPubSub);
        console.log('Redis Pub/Sub enabled for cross-process events');
    } catch (err) {
        console.log('Redis Pub/Sub not available, using local events only:', err.message);
    }

    let diagnosticsManager = new DiagnosticsManager();
    await diagnosticsManager.init(poolConfig, mongoInterface);

    let webServer = new WebServer();
    await webServer.initWebOnly(https_enabled, poolConfig, mongoInterface);

    diagnosticsManager.update();

    console.log('Web/API service ready');
}

init().catch(err => {
    console.error('Web/API service init failed:', err);
    process.exit(1);
});
