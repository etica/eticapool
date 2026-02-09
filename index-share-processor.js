import SegfaultHandler from 'segfault-handler';
SegfaultHandler.registerHandler('crash.log');
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise rejection:', reason);
});

import { loadAndValidateConfig } from './lib/util/config-helper.js'
import MongoInterface from './lib/mongo-interface.js'
import PeerInterface from './lib/peer-interface.js'
import RedisInterface from './lib/redis-interface.js'
import RedisPubSub from './lib/util/redis-pubsub.js'
import GeneralEventEmitterHandler from './lib/util/GeneralEventEmitterHandler.js'

var pool_env = process.env.POOL_ENV || 'production';
const configPath = process.env.POOL_CONFIG_PATH || '/pool.config.json';
let poolConfig = loadAndValidateConfig(configPath, pool_env);

console.log('Eticapool Share Processor starting...');

let peerInterface = null;

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    if (peerInterface) peerInterface._shuttingDown = true;
    setTimeout(() => process.exit(0), 5000);
});
process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    if (peerInterface) peerInterface._shuttingDown = true;
    setTimeout(() => process.exit(0), 5000);
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

    peerInterface = new PeerInterface(mongoInterface, poolConfig, redisInterface);
    peerInterface.update();

    console.log('Share processor service ready');
}

init().catch(err => {
    console.error('Share processor init failed:', err);
    process.exit(1);
});
