import SegfaultHandler from 'segfault-handler';
SegfaultHandler.registerHandler('crash.log');
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise rejection:', reason);
});

import { loadAndValidateConfig } from './lib/util/config-helper.js'
import MongoInterface from './lib/mongo-interface.js'
import TokenInterface from './lib/token-interface.js'
import StatsInterface from './lib/stats-interface.js'
import Web3ApiHelper from './lib/util/web3-api-helper.js'
import RedisPubSub from './lib/util/redis-pubsub.js'
import GeneralEventEmitterHandler from './lib/util/GeneralEventEmitterHandler.js'

var pool_env = process.env.POOL_ENV || 'production';
const configPath = process.env.POOL_CONFIG_PATH || '/pool.config.json';
let poolConfig = loadAndValidateConfig(configPath, pool_env);

console.log('Eticapool Token Collector Service starting...');

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

    // Redis Pub/Sub for cross-process events (emits newChallenge to stratum/web)
    // This is REQUIRED for token-collector since it must broadcast new challenges
    let redisPubSub = RedisPubSub.getInstance();
    await redisPubSub.init(process.env.REDIS_URL);
    GeneralEventEmitterHandler.getInstance().setRedisPubSub(redisPubSub);
    console.log('Redis Pub/Sub enabled for newChallenge broadcasting');

    let tokenInterface = new TokenInterface(mongoInterface, poolConfig);
    await tokenInterface.init();
    tokenInterface.update();

    let web3apihelper = new Web3ApiHelper(mongoInterface, poolConfig);
    await web3apihelper.init();
    web3apihelper.update();

    let statsInterface = new StatsInterface(mongoInterface, poolConfig);
    await statsInterface.init();
    statsInterface.update();

    console.log('Token collector service ready');
}

init().catch(err => {
    console.error('Token collector init failed:', err);
    process.exit(1);
});
