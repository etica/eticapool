import  SegfaultHandler from  'segfault-handler';
import web3utils from 'web3-utils'

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

console.log('launching indexdebuglogs script');
 
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

        /*await _DevelopmentDebugs.check_miner_diff_challenge_rewards('0xf8031eb7197989387825668aec86b69da151d8d1a3addd53fef8a989826a39f8');*/
        /*await _DevelopmentDebugs.check_miner_diff_challenge_rewardfactors('0xf8031eb7197989387825668aec86b69da151d8d1a3addd53fef8a989826a39f8');*/
        /*await _DevelopmentDebugs.calculate_current_owed_coins();*/
        /*await _DevelopmentDebugs.get_miner_challengediffs('0xc6b59a8082f0d35fdcf9e1e67828850bb52c3249e08938f0885f76bdb9e57300'); */
 
        var solution_number = "0x59f5245004f4f936615f29d1beebfeb2c437000026c087ba738883f3c7bb0c9a";
        var challenge_number = "0x783c8e373d4bd19f898bf634739a02ffc1a30c8c23a3fe9660b445addaad180f";
        var poolEthAddress = "0x3e457C7F819B7f340A58A3A98b950B61c05B105F";


        var computed_digest =  web3utils.soliditySha3( challenge_number , poolEthAddress, solution_number)

        var expected_diggest = "0x0000000000000436551f335069871655af822a6b875b9bdbcbe3e0a65603f0c2";

        console.log('expected digest: ', expected_diggest)
        console.log('computed_digest: ', computed_digest)

        
}
