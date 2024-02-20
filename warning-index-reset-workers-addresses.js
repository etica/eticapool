import  SegfaultHandler from  'segfault-handler'; 
SegfaultHandler.registerHandler('crash.log');

//var INFURA_ROPSTEN_URL = 'https://ropsten.infura.io/v3/';
//var INFURA_MAINNET_URL = 'https://mainnet.infura.io/v3/';

var https_enabled = process.argv[2] === 'https';
var pool_env = 'production';

 
if( process.argv[2] == "staging" )
{
  pool_env = 'staging'
}
 

import FileUtils from './lib/util/file-utils.js'
import  cron from 'node-cron' 

let poolConfigFull = FileUtils.readJsonFileSync('/pool.config.json');
let poolConfig = poolConfigFull[pool_env]



console.log('poolConfig',poolConfig, poolConfigFull)

console.log('init');


 
import MongoInterface from './lib/mongo-interface.js'
import ResetWorkersAddresses from './lib/reset-workers-addresses.js';

 
import Web3 from 'web3'
 
 

init( );


async function init( )
{
        
        let mongoInterface = new MongoInterface();
        let web3 = new Web3(poolConfig.mintingConfig.web3Provider);
  
        await mongoInterface.init( 'tokenpool_'.concat(pool_env))

        let ResetWorkers = new ResetWorkersAddresses(web3, poolConfig,  mongoInterface  )

        // Warning will reset addresses using worker names to 0 balance.
        // Script asks user confirmation
        ResetWorkers.ResetWorkersBalances(mongoInterface);

}
