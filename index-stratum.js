// Suppress mongodb 3.6 driver noise (not fixable without driver upgrade)
const _origWarn = console.warn;
console.warn = (...args) => { if (args[0] && typeof args[0] === 'string' && args[0].includes('Top-level use of w')) return; _origWarn.apply(console, args); };
process.on('warning', (w) => { if (w.message && w.message.includes('MongoError')) return; console.warn(w); });

import SegfaultHandler from 'segfault-handler';
SegfaultHandler.registerHandler('crash.log');
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise rejection:', reason);
});

import { loadAndValidateConfig } from './lib/util/config-helper.js'
import MongoInterface from './lib/mongo-interface.js'
import WebServer from './lib/web-server.js'
import RedisInterface from './lib/redis-interface.js'
import RedisPubSub from './lib/util/redis-pubsub.js'
import GeneralEventEmitterHandler from './lib/util/GeneralEventEmitterHandler.js'

var pool_env = process.env.POOL_ENV || 'production';
const configPath = process.env.POOL_CONFIG_PATH || '/pool.config.json';
let poolConfig = loadAndValidateConfig(configPath, pool_env);

console.log('Eticapool Stratum Service starting...');

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    setTimeout(() => process.exit(0), 3000);
});
process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    setTimeout(() => process.exit(0), 3000);
});

async function init() {
    let mongoInterface = new MongoInterface();
    await mongoInterface.init('tokenpool_'.concat(pool_env));

    // Redis Streams for share queue
    let redisInterface = new RedisInterface();
    await redisInterface.init(process.env.REDIS_URL);

    // Redis Pub/Sub for cross-process events
    let redisPubSub = RedisPubSub.getInstance();
    await redisPubSub.init(process.env.REDIS_URL);
    GeneralEventEmitterHandler.getInstance().setRedisPubSub(redisPubSub);

    let webServer = new WebServer();
    await webServer.initStratumOnly(poolConfig, mongoInterface, redisInterface);

    console.log('Stratum service ready');
}

init().catch(err => {
    console.error('Stratum service init failed:', err);
    process.exit(1);
});
