


//const Tx = require('ethereumjs-tx') ///handle this like the updated coinpurse.cc relay  code 

import PeerHelper from './util/peer-helper.js';
import TokenDataHelper from './util/token-data-helper.js';


import LoggingHelper from './util/logging-helper.js'
import PoolLogger from './util/pool-logger.js'

import TransactionCoordinator from './transaction-coordinator.js'
  
 import web3Utils from 'web3-utils'

const COLLECT_TOKEN_DATA_PERIOD = 30 * 1000;

import  cron from 'node-cron' 
import ContractHelper from './util/contract-helper.js'
import Web3 from 'web3'
 
/**

**/




export default class TokenInterface {

  static _buildBalancePaymentsRunning = false;
  static _buildBatchedPaymentsRunning = false;

  constructor( mongoInterface, poolConfig  ){
    this.mongoInterface=mongoInterface;
    this.poolConfig = poolConfig;

    this.web3 = new Web3(poolConfig.mintingConfig.web3Provider);
   
  
  }

  async init(){
    const tokenContract = await ContractHelper.getTokenContract( this.web3 , this.poolConfig  )  
    await TokenDataHelper.collectTokenParameters( tokenContract,  this.web3,  this.mongoInterface) 
    await TokenDataHelper.collectPoolAccountBalances(  this.poolConfig,  this.mongoInterface) 
  }


 async  update()
  {

      
   let transactionCoordinator = new TransactionCoordinator(this.web3,this.poolConfig,  this.mongoInterface  )

   transactionCoordinator.update();

   
    const tokenContract = await ContractHelper.getTokenContract( this.web3 , this.poolConfig  )  

 
    //every 20 secs
    //cron.schedule('*/20 * * * * *', async function() {
    // every 5 secs
    cron.schedule('*/3 * * * * *', async function() {
      
      await TokenDataHelper.collectTokenParameters( tokenContract,  this.web3,  this.mongoInterface) 
      

    }.bind(this));


    //every 2 minutes
    cron.schedule('*/2 * * * *', async function() {
      
      
      await TokenDataHelper.collectPoolAccountBalances(  this.poolConfig,  this.mongoInterface) 
  

    }.bind(this));




    setInterval(function(){ TokenInterface.buildBalancePayments(this.mongoInterface,this.poolConfig)}.bind(this) , 240*1000)
    
    setInterval(function(){ TokenInterface.buildBatchedPaymentTransactions(this.mongoInterface,this.poolConfig)}.bind(this) , 20*1000)

    await TokenDataHelper.collectTokenParameters( tokenContract,  this.web3,  this.mongoInterface) 
    await TokenDataHelper.collectPoolAccountBalances(  this.poolConfig,  this.mongoInterface) 
  
  } 



 
 


 
 static async queueMiningSolution(solution_number,minerEthAddress,challenge_digest,challenge_number, randomx_blob, randomx_seedhash, randomxhash, claimedtarget, extraNonce, mongoInterface, poolConfig)
  {

    let recentMiningContractData = await TokenDataHelper.getRecentMiningContractData(mongoInterface)


    var currentTokenMiningReward = recentMiningContractData.miningReward
    var currentMiningTarget = recentMiningContractData.miningTarget


      var txData= {
          minerEthAddress: minerEthAddress,    //we use this differently in the pool!
          solution_number: solution_number,
          challenge_digest: challenge_digest,
          challenge_number: challenge_number,
          randomxhash: randomxhash,
          randomx_blob: randomx_blob,
          randomx_seedhash: randomx_seedhash,
          claimedtarget: currentMiningTarget,
          extraNonce: extraNonce,
          tokenReward: currentTokenMiningReward
        }

        PoolLogger.tx(`Queueing solution | nonce=${PoolLogger.truncateHash(solution_number)} | miner=${PoolLogger.truncateHash(minerEthAddress)}`);
        PoolLogger.debug('queueMiningSolution txData', txData);

        await TransactionCoordinator.addTransactionToQueue('solution', txData ,  mongoInterface, poolConfig)

  } 


//converted all time miner balance into tokens awarded and creates 'balance payment' records which will get batch-paid 
 static async buildBalancePayments(mongoInterface, poolConfig )
  {
    if (TokenInterface._buildBalancePaymentsRunning) {
        PoolLogger.debug('buildBalancePayments: previous run still in progress, skipping');
        return;
    }
    TokenInterface._buildBalancePaymentsRunning = true;
    try {

    var enablePayPerShare = poolConfig.paymentsConfig.enablePPS;  
    if(enablePayPerShare == false){
 
      LoggingHelper.appendLog('WARN: Not building PPS balance payments since `enablePPS`==false in PaymentsConfig.', LoggingHelper.TYPECODES.WARN, mongoInterface)

    }

 

    LoggingHelper.appendLog('buildBalancePayments', LoggingHelper.TYPECODES.GENERIC, mongoInterface)


    var min_balance_for_transfer = poolConfig.paymentsConfig.minBalanceForTransfer; //this is in token-satoshis
    const minBalanceThreshold = BigInt('10000000000000000'); // 0.01 ETI in wei (18 decimals)

    var minerList =  await PeerHelper.getMinerList(mongoInterface)

    // Check if 24 hours have passed since the last full payout
    const lastFullPayoutTime =  await mongoInterface.findOne('lastFullPayoutTime', {} );
    const currentTime = Date.now();
    let isFullPayoutDay = false;
        if (!lastFullPayoutTime) {
            isFullPayoutDay = true;
        } else {
            const timeSinceLastFullPayout = currentTime - lastFullPayoutTime.lastFullPayoutTime;
            const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
            isFullPayoutDay = timeSinceLastFullPayout >= oneDayInMilliseconds;
        }  
    
    for(let minerData of minerList) //reward each miner
    {
      //console.log('Minerdata is', minerData);
   
      const minerAddress = minerData.minerEthAddress;
      const minerAddressWithoutWorkerName = minerAddress.toString().substr(0, 42); // removes worker name

      // var miner_token_balance = minerData.tokenBalance;

      if(typeof minerData.alltimeTokenBalance == 'undefined') minerData.alltimeTokenBalance = 0;
      if(typeof minerData.tokensAwarded == 'undefined') minerData.tokensAwarded = 0;

       var num_tokens_owed = 0;
       if( minerData.alltimeTokenBalance > 0 && minerData.alltimeTokenBalance > minerData.tokensAwarded)
       {  
          var num_tokens_owed = Math.floor(minerData.alltimeTokenBalance - minerData.tokensAwarded);
       }


       let shouldPayout = false;

        if (typeof num_tokens_owed != 'undefined' && num_tokens_owed > min_balance_for_transfer) {
          // Regular payout for balances above minBalanceForTransfer
          shouldPayout = true;
        } else if (isFullPayoutDay && typeof num_tokens_owed != 'undefined' && BigInt(num_tokens_owed) > minBalanceThreshold && num_tokens_owed <= min_balance_for_transfer) {
          // Small balances payout once per day
          shouldPayout = true;
        }

        if(shouldPayout && web3Utils.isAddress( minerAddressWithoutWorkerName ))
       {

         minerData.tokensAwarded += num_tokens_owed;


         var blockNumber = await TokenDataHelper.getEthBlockNumber(mongoInterface);
         var balancePaymentData = {
           //id: web3Utils.randomHex(32),
           minerEthAddress: minerAddress,
           //previousTokenBalance: minerData.tokenBalance, //not used
           //newTokenBalance: 0,
           amountToPay: num_tokens_owed,
           block: blockNumber,

           batchedPaymentUuid: undefined,
           txHash: undefined,

           confirmed:false,
           broadcastedAt:null
         }
 
         LoggingHelper.appendLog( [ 'storing balance payment',('balance_payments:'+minerAddress.toString().toLowerCase()) ,balancePaymentData ], LoggingHelper.TYPECODES.GENERIC, mongoInterface)

         console.log('[PAYMENT-TRACE] buildBalancePayments: creating balance_payment for', minerAddress.toString().substring(0,20), '| amountToPay:', num_tokens_owed, '| batchedPaymentUuid:', balancePaymentData.batchedPaymentUuid, '| confirmed:', balancePaymentData.confirmed);

         // Save miner data FIRST (updates tokensAwarded) — if we crash after this but before
         // inserting balance_payments, the miner misses one payment (recoverable) instead of
         // getting a duplicate payment (unrecoverable money loss for pool).
         // Uses targeted $set on tokensAwarded+tokenBalance only, to avoid overwriting
         // concurrent $inc on alltimeTokenBalance from rewardCrawl.
         await PeerHelper.updateMinerPaymentFields(minerAddress, minerData.tokensAwarded, mongoInterface)

         //store balance payment in mongo
         await mongoInterface.insertOne('balance_payments',  balancePaymentData   ) //should be handled by batching
         console.log('[PAYMENT-TRACE] buildBalancePayments: balance_payment INSERTED for', minerAddress.toString().substring(0,20));

         minerData.tokenBalance = 0;


       }

    }

    // Update the last full payout time if it's a full payout day
    if (isFullPayoutDay) {
      await mongoInterface.upsertOne('lastFullPayoutTime', {}, {lastFullPayoutTime: currentTime} )
    }

      return minerList

    } finally {
        TokenInterface._buildBalancePaymentsRunning = false;
    }
  } 

  static async buildBatchedPaymentTransactions(mongoInterface, poolConfig )
  {
    if (TokenInterface._buildBatchedPaymentsRunning) {
        PoolLogger.debug('buildBatchedPaymentTransactions: previous run still in progress, skipping');
        return;
    }
    TokenInterface._buildBatchedPaymentsRunning = true;
    try {

    var min_payments_in_batch = poolConfig.paymentsConfig.minPaymentsInBatch;  // Minimum nb of new payments (balance_payments) for creating a Batch

    let unbatchedBalancePayments = await mongoInterface.findAll('balance_payments',{batchedPaymentUuid:undefined})

    console.log('[PAYMENT-TRACE] buildBatchedPaymentTransactions: found', unbatchedBalancePayments ? unbatchedBalancePayments.length : 0, 'unbatched balance_payments | minPaymentsInBatch:', min_payments_in_batch);

    if(!unbatchedBalancePayments
      || unbatchedBalancePayments.length < min_payments_in_batch){return}


    let newBatchedPaymentTxData = { uuid: web3Utils.randomHex(32) , payments:[]}


    const MAX_TX_IN_BATCH = 25

    let balancePaymentsArray = unbatchedBalancePayments.slice(0,MAX_TX_IN_BATCH)

    console.log('[PAYMENT-TRACE] buildBatchedPaymentTransactions: before filter:', balancePaymentsArray.length, '| first payment sample:', JSON.stringify({minerEthAddress: balancePaymentsArray[0]?.minerEthAddress?.substring(0,20), amountToPay: balancePaymentsArray[0]?.amountToPay, batchedPaymentUuid: balancePaymentsArray[0]?.batchedPaymentUuid, confirmed: balancePaymentsArray[0]?.confirmed}));

    balancePaymentsArray = balancePaymentsArray.filter( bp => TokenInterface.balancePaymentIsValid( bp )  ); // check addresses are right type

    console.log('[PAYMENT-TRACE] buildBatchedPaymentTransactions: after filter:', balancePaymentsArray.length, 'valid payments');

    for(let balancePayment of  balancePaymentsArray ){

      let big_int_number = BigInt(balancePayment.amountToPay)

      // Using BigInt.prototype.toString()
      let string_version = big_int_number.toString();
      const minerAddressWithoutWorkerName = balancePayment.minerEthAddress.toString().substr(0, 42);

      if(web3Utils.isAddress( minerAddressWithoutWorkerName ))
      {
        newBatchedPaymentTxData.payments.push({
          minerEthAddress: minerAddressWithoutWorkerName,
          amountToPay: string_version
        })
           await mongoInterface.updateOne('balance_payments',
           {_id: balancePayment._id}, {batchedPaymentUuid: newBatchedPaymentTxData.uuid} );
      }

    }

   if(newBatchedPaymentTxData.payments.length === 0){
     console.log('[PAYMENT-TRACE] buildBatchedPaymentTransactions: NO VALID PAYMENTS after processing, skipping batch');
     PoolLogger.debug('No valid payments after filtering, skipping batch');
     return;
   }

   console.log('[PAYMENT-TRACE] buildBatchedPaymentTransactions: queueing batch with', newBatchedPaymentTxData.payments.length, 'payments | uuid:', newBatchedPaymentTxData.uuid.substring(0,18));
   PoolLogger.tx(`Queueing batched payment | ${newBatchedPaymentTxData.payments.length} payments`);
   PoolLogger.debug('newBatchedPaymentTxData', newBatchedPaymentTxData);
   await TransactionCoordinator.addTransactionToQueue('batched_payment', newBatchedPaymentTxData ,  mongoInterface, poolConfig)

    } catch(e) {
        console.error('[PAYMENT-TRACE] buildBatchedPaymentTransactions: ERROR:', e.message || e);
    } finally {
        TokenInterface._buildBatchedPaymentsRunning = false;
    }
  }

  static balancePaymentIsValid( balancePayment ){

     const ValidAddressLength = 42

     let addressSubstring = balancePayment.minerEthAddress.toString().substring(0,ValidAddressLength)


    return web3Utils.isAddress( addressSubstring )

  }


}
