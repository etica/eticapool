

/*

Turns queued ethereum transaction into actual ones :)

Waits for pending TX to be mined before sending another !

Solutions are highest priority

*/
 
 
//const poolConfig = require('../pool.config').config
 
 
 //var TransactionHelper = new TransactionHelper();
 import TokenDataHelper from './util/token-data-helper.js'
 import TransactionHelper from './util/transaction-helper.js'
 import LoggingHelper from './util/logging-helper.js'
 import PeerInterface from './peer-interface.js'
 import web3utils from 'web3-utils'

  import Web3 from 'web3'

  import ContractHelper from './util/contract-helper.js'
 
const PAYMENT_BROADCAST_PERIOD = 100 * 1000;

export default class CleanerCoordinator  {




  constructor(web3, poolConfig,   mongoInterface )
  {


    this.web3=web3;
     
    this.mongoInterface=mongoInterface;

  

    this.poolConfig=poolConfig;

    this.paymentContract = ContractHelper.getBatchedPaymentsContract(this.web3,this.poolConfig )

    this.tokenContract = ContractHelper.getTokenContract( this.web3 , this.poolConfig  )  
   

  } 

  async update()
  {
            CleanerCoordinator.cleanOldPendingShares(this.tokenContract, this.mongoInterface, this.poolConfig)
            setInterval(function(){CleanerCoordinator.cleanOldPendingShares(this.tokenContract, this.mongoInterface, this.poolConfig)}.bind(this),3600*1000) // 1 hour 

  } 

  /*
  TXS STATUS:
  queued - transaction not broadcasted yet
  pending - transaction broadcasted but not mined
  mined - transaction mined !
  successful - transaction mined and not reverted

  */
 

   static  async cleanOldPendingShares(tokenContract, mongoInterface, poolConfig)
  {

    
    try{ 

      // EpochCount delay:
    const EpochCountDelayForOldPendingShare = 1000; // keep last 1000 epochs in db
    const deleteDepth = 200; // for instnce 100 means making sure the delete on 100 previous rows is done

    //const currentepochCount = await tokenContract.methods.epochCount().call();

    // Retrieve last pool_mint
    var lastpoolMint =  await  mongoInterface.findAllSortedWithLimitonString('pool_mints', {poolstatus: 2}, {epochCount:-1}, 1);
    console.log('------- STARTING DELETE SHARES PROCESS lastpoolMint is: ', lastpoolMint);

    let currentepochCount = lastpoolMint[0].epochCount;

    if(currentepochCount <= EpochCountDelayForOldPendingShare || isNaN(currentepochCount)){
      return; // stop and wait for currentepochCount to be high enoughS
    } 
    let param1 = currentepochCount - EpochCountDelayForOldPendingShare;
    let stringparam1 = param1.toString();

    // should always be in this case after beginings:
    if(currentepochCount - EpochCountDelayForOldPendingShare > deleteDepth ){

       let param2 = currentepochCount - EpochCountDelayForOldPendingShare -deleteDepth;
       let stringparam2 = param2.toString();

       var _miningContractsData= await mongoInterface.findAllonString('allminingContracts', {epochCount: {$lt: stringparam1,$gte: stringparam2}} );
    }
    else { 
       let param2 = currentepochCount - EpochCountDelayForOldPendingShare -deleteDepth;
       let stringparam2 = param2.toString();
       var _miningContractsData= await mongoInterface.findAllonString('allminingContracts', {epochCount: {$lt: stringparam1}} );
    }

    for(let oneContract of _miningContractsData){      
     await mongoInterface.deleteMany('miner_pendingshares', {challengeNumber: oneContract.challengeNumber} )
     console.log('--------------------- DELETED SHARES FOR CONTRACT OF EPOCHCOUNT ',oneContract.epochCount,'------------------'); 
     }
    
    }catch(e){
       console.log('error',e)
      }

  }


}