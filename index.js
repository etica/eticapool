// Suppress mongodb 3.6 driver noise (not fixable without driver upgrade)
const _origWarn = console.warn;
console.warn = (...args) => { if (args[0] && typeof args[0] === 'string' && args[0].includes('Top-level use of w')) return; _origWarn.apply(console, args); };
process.on('warning', (w) => { if (w.message && w.message.includes('MongoError')) return; console.warn(w); });

import  SegfaultHandler from  'segfault-handler';
SegfaultHandler.registerHandler('crash.log');
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise rejection:', reason);
});

//var INFURA_ROPSTEN_URL = 'https://ropsten.infura.io/v3/';
//var INFURA_MAINNET_URL = 'https://mainnet.infura.io/v3/';

var https_enabled = process.argv[2] === 'https';
var pool_env = process.env.POOL_ENV || 'production';


if( process.argv[2] == "staging" )
{
  pool_env = 'staging'
}
 

import { loadAndValidateConfig } from './lib/util/config-helper.js'
import  cron from 'node-cron' 

const configPath = process.env.POOL_CONFIG_PATH || '/pool.config.json';
let poolConfig = loadAndValidateConfig(configPath, pool_env);



//console.log('poolConfig',poolConfig, poolConfigFull)

console.log(`

░█▀▀░▀█▀░▀█▀░█▀▀░█▀█░█▀█░█▀█░█▀█░█░░░░░█░█░█▀▀
░█▀▀░░█░░░█░░█░░░█▀█░█▀▀░█░█░█░█░█░░░░░▀▄▀░▀▀█
░▀▀▀░░▀░░▀▀▀░▀▀▀░▀░▀░▀░░░▀▀▀░▀▀▀░▀▀▀░░░░▀░░▀▀░

  `);

console.log(`  

░█▀▄░█▀█░█▀█░█▀▄░█▀█░█▄█░█░█░░░█▄█░▀█▀░█▀█░▀█▀░█▀█░█▀▀
░█▀▄░█▀█░█░█░█░█░█░█░█░█░▄▀▄░░░█░█░░█░░█░█░░█░░█░█░█░█
░▀░▀░▀░▀░▀░▀░▀▀░░▀▀▀░▀░▀░▀░▀░░░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀

  `);



console.log('Initialising Mining Pool');
 
import MongoInterface from './lib/mongo-interface.js'
 
import PeerInterface from './lib/peer-interface.js';
import TokenInterface from './lib/token-interface.js';
import StatsInterface from './lib/stats-interface.js';

import Web3ApiHelper from './lib/util/web3-api-helper.js';
import PoolStatsHelper from  './lib/util/pool-stats-helper.js'  
import  WebServer from './lib/web-server.js' 

import DiagnosticsManager from './lib/diagnostics-manager.js' 
 

import ContractHelper from './lib/util/contract-helper.js'
import TokenDataHelper from './lib/util/token-data-helper.js'
import RedisInterface from './lib/redis-interface.js'
import RedisPubSub from './lib/util/redis-pubsub.js'
import GeneralEventEmitterHandler from './lib/util/GeneralEventEmitterHandler.js'


var accountConfig;

import Web3 from 'web3'

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

init( ).catch(err => {
    console.error('Init failed:', err);
    process.exit(1);
});


async function init( )
{


        // Code to run if we're in the master process

        let mongoInterface = new MongoInterface()
        let diagnosticsManager = new DiagnosticsManager()
        let webServer = new WebServer()

        // Initialize Redis Streams (optional — falls back to MongoDB queue if unavailable)
        let redisInterface = null;
        try {
            redisInterface = new RedisInterface();
            await redisInterface.init(process.env.REDIS_URL);
            console.log('Redis Streams share queue enabled');
        } catch (err) {
            console.log('Redis Streams not available, falling back to MongoDB share queue:', err.message);
            redisInterface = null;
        }

        // Initialize Redis Pub/Sub (optional — independent of Streams)
        try {
            let redisPubSub = RedisPubSub.getInstance();
            await redisPubSub.init(process.env.REDIS_URL);
            GeneralEventEmitterHandler.getInstance().setRedisPubSub(redisPubSub);
            console.log('Redis Pub/Sub enabled');
        } catch (err) {
            console.log('Redis Pub/Sub not available, using local events only:', err.message);
        }

        await mongoInterface.init( 'tokenpool_'.concat(pool_env))

        let tokenInterface = new TokenInterface(mongoInterface, poolConfig)
        // await peerInterface.init(web3,accountConfig,mongoInterface,tokenInterface,pool_env) //initJSONRPCServer();

        //This worker is dying !!!
        await tokenInterface.init();
        tokenInterface.update();

        let web3apihelper = new Web3ApiHelper(mongoInterface, poolConfig)


        await web3apihelper.init();
        web3apihelper.update()  //fetch API data

        await diagnosticsManager.init(poolConfig, mongoInterface)

        await webServer.init(https_enabled, poolConfig, mongoInterface, redisInterface);

        diagnosticsManager.update();

        peerInterface = new PeerInterface(mongoInterface, poolConfig, redisInterface)
           if (webServer.io) peerInterface.setIO(webServer.io);
           peerInterface.update();


        let statsInterface = new StatsInterface(mongoInterface, poolConfig)
        await statsInterface.init();
        statsInterface.update();   

}
