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



// SECURITY: Never log poolConfig — it contains private keys

console.log('Starting cleaner process');


 
import MongoInterface from './lib/mongo-interface.js'
import CleanerCoordinator from './lib/cleaner-coordinator.js';
//import CleanerCoordinator from './lib/cleaner-coordinatorj.js';
 
import PeerInterface from './lib/peer-interface.js';
import TokenInterface from './lib/token-interface.js';

import Web3ApiHelper from './lib/util/web3-api-helper.js';
import PoolStatsHelper from  './lib/util/pool-stats-helper.js'  
import  WebServer from './lib/web-server.js' 

import DiagnosticsManager from './lib/diagnostics-manager.js' 
 

import ContractHelper from './lib/util/contract-helper.js'
import TokenDataHelper from './lib/util/token-data-helper.js'


var accountConfig;

import Web3 from 'web3'

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    setTimeout(() => process.exit(0), 3000);
});
process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    setTimeout(() => process.exit(0), 3000);
});

init( ).catch(err => {
    console.error('Init failed:', err);
    process.exit(1);
});


async function init( )
{


        // Code to run if we're in the master process


           
        
        let mongoInterface = new MongoInterface()
        let web3 = new Web3(poolConfig.mintingConfig.web3Provider);
  
        await mongoInterface.init( 'tokenpool_'.concat(pool_env))

        let cleanerCoordinator = new CleanerCoordinator(web3, poolConfig,  mongoInterface  )

        cleanerCoordinator.update();
 



}
