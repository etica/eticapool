import  SegfaultHandler from  'segfault-handler'; 
SegfaultHandler.registerHandler('crash.log');

var https_enabled = process.argv[2] === 'https';
var pool_env = 'production';

 
if( process.argv[2] == "staging" )
{
  pool_env = 'staging'
}
 

import FileUtils from './lib/util/file-utils.js'

let poolConfigFull = FileUtils.readJsonFileSync('/pool.config.json');
let poolConfig = poolConfigFull[pool_env]

console.log('poolConfig',poolConfig, poolConfigFull)

console.log('init');


 
import MongoInterface from './lib/mongo-interface.js'
import DevelopmentDebugs from './lib/development-debugs.js';
 
import Web3 from 'web3'

init( );


async function init( )
{
        
        let mongoInterface = new MongoInterface();
        let web3 = new Web3(poolConfig.mintingConfig.web3Provider);
  
        await mongoInterface.init( 'tokenpool_'.concat(pool_env))

        let _DevelopmentDebugs = new DevelopmentDebugs(web3, poolConfig,  mongoInterface  )

        await _DevelopmentDebugs.check_miner_diff_challenge_number('0xc6b59a8082f0d35fdcf9e1e67828850bb52c3249e08938f0885f76bdb9e57300');
        await _DevelopmentDebugs.check_miner_diff_challenge_rewardfactors('0xc6b59a8082f0d35fdcf9e1e67828850bb52c3249e08938f0885f76bdb9e57300');

}
