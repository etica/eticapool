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

 
import Web3 from 'web3'

init( );


async function init( )
{
 
        var randomxhash = "0f5d44e563df09e2dad9703315f775c33e6ce39cdd549e67f55984fb4f310000";
        var miningtarget = "178754037760106876685137708107161957748485538827582620735912645312215893";
        var miningTargetBN = web3utils.toBN(miningtarget);

        console.log('Original randomxhash:', randomxhash);

        // Convert the hex string to a Buffer
        const randomxhashBuffer = Buffer.from(randomxhash, 'hex');
    
        // Reverse the buffer
        const reversedRandomxhash = Buffer.from(randomxhashBuffer).reverse();
    
        console.log('Reversed randomxhash:', reversedRandomxhash.toString('hex'));
    
        // Convert the reversed buffer to a BigNumber
        const reversedRandomxhashBN = web3utils.toBN('0x' + reversedRandomxhash.toString('hex'));
    
        console.log('reversedRandomxhashBN:', reversedRandomxhashBN.toString());
        console.log('miningTargetBN:', miningTargetBN.toString());
    

    var shareIsASolution = reversedRandomxhashBN.lte(miningTargetBN)
    console.log('SHARE IS A NETWORK SOLUTION IS: ', shareIsASolution)



        
}
