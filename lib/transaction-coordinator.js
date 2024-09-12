

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
 import StatsInterface from './stats-interface.js'
 import web3utils from 'web3-utils'

 import Web3 from 'web3'

 import ContractHelper from './util/contract-helper.js'
 
const PAYMENT_BROADCAST_PERIOD = 100 * 1000;

export default class TransactionCoordinator  {




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

            setInterval(function(){this.updateTransactionStatistics(this.mongoInterface)}.bind(this),3600000)
         

            
            setInterval(function(){this.broadcastQueuedMintTransactions(this.mongoInterface, this.poolConfig)}.bind(this),5000)
            setInterval(function(){this.broadcastQueuedBatchedPaymentTransactions(this.mongoInterface,this.poolConfig)}.bind(this),5000)
            setInterval(function(){this.requeueSkippedBatchedPaymentTransactions(this.mongoInterface,this.poolConfig)}.bind(this),5000)
            
            setInterval(function(){this.CheckStuckPaymentTransactions(this.mongoInterface,this.poolConfig)}.bind(this),150000)
            

            setInterval(function(){this.monitorStaleMintTransactions(this.mongoInterface,this.poolConfig)}.bind(this),15000)
            setInterval(function(){this.monitorStalePaymentTransactions(this.mongoInterface,this.poolConfig)}.bind(this),15000)

            // detect pool mining success:
            setInterval(function(){this.detectPoolMiningSuccess(this.tokenContract , this.web3, this.mongoInterface, this.poolConfig)}.bind(this),15000)

            //
            setInterval(function(){this.rewardCrawl(this.mongoInterface, this.poolConfig)}.bind(this),60000)
           
            setInterval(function(){TransactionCoordinator.monitorMinedPayments(this.paymentContract, this.mongoInterface, this.poolConfig)}.bind(this),5*1000)

            setInterval(function(){TransactionCoordinator.monitorMinedSolutions(  this.mongoInterface, this.poolConfig)}.bind(this),5*1000)
 
            
            setInterval(function(){this.SendEtiToBatchContractCrawl(this.mongoInterface, this.poolConfig)}.bind(this),80000)

  } 

  /*
  TXS STATUS:
  queued - transaction not broadcasted yet
  pending - transaction broadcasted but not mined
  mined - transaction mined !
  successful - transaction mined and not reverted

  */
 

   static  async monitorMinedPayments(paymentContract, mongoInterface, poolConfig)
  {

    
    try{ 

      let payment_txes = await TransactionHelper.findTransactionsWithQuery({ txType:'batched_payment', status:'pending' } ,mongoInterface)
      //console.log(' --debug-- monitorMinedPayments found all these pending transactions as batched_payments are:', payment_txes);
      let web3 = new Web3(poolConfig.paymentsConfig.web3Provider)
   
 
       if( payment_txes != null && payment_txes.length > 0) {
      

        TransactionHelper.checkTransactionReceipts( payment_txes, web3, mongoInterface)
      }
    
    }catch(e){
       console.log('error',e)
      }


     
  } 


  static async monitorMinedSolutions( mongoInterface, poolConfig )
  {

    

   try {
    LoggingHelper.appendLog('monitor mined solutions', LoggingHelper.TYPECODES.GENERIC, mongoInterface)
 
   
   let solution_txes = await TransactionHelper.findTransactionsWithQuery({ txType:'solution', status:'pending' } ,mongoInterface)

   let web3 = new Web3(poolConfig.mintingConfig.web3Provider)
    
   if( solution_txes != null && solution_txes.length > 0)
    {
      //look for receipt 
       var response = await TransactionHelper.checkTransactionReceipts( solution_txes, web3, mongoInterface)
    }
   }catch(e)
   {
   console.log('error',e)
    }

    
  } 

 

 
 



//types are 'batched_payment','solution'
   static async addTransactionToQueue(txType, txData,  mongoInterface, poolConfig)
  {

    var blockNum  = await TokenDataHelper.getEthBlockNumber( mongoInterface );

    var packetData = {
       block: blockNum,
       txType: txType, //batched_payment or solution 
       txData: txData, 
       txHash: null,
       status: 'queued'  //queued, pending, reverted, success 

     }
     LoggingHelper.appendLog( [  ' addTransactionToQueue ',  packetData ], LoggingHelper.TYPECODES.TRANSACTIONS, mongoInterface)

     console.log('- - - - - - - -- - - --- - - - - >addTransactionToQueue packetData: ', packetData);
 
     await mongoInterface.insertOne('transactions', packetData)

 

  } 

  async broadcastQueuedMintTransactions(mongoInterface, poolConfig){
    
    LoggingHelper.appendLog('broadcastQueuedMintTransactions', LoggingHelper.TYPECODES.GENERIC, mongoInterface)

   
    let pendingMintTransactions = await TransactionHelper.findTransactionsWithQuery({txType:'solution',status:'pending'},mongoInterface)

    console.log('Broadcasting TXS');
    console.log('pendingMintTransactions are --> ', pendingMintTransactions);
    var hasPendingTransaction = (pendingMintTransactions.length > 0);

    // Priority to txs with current challenge number look for txs type solution with current challenge number:
    let currentchallengenumber = await TokenDataHelper.getChallengeNumber(mongoInterface);
    //console.log('broadcastQueuedMintTransactions currentchallengenumber --> ', currentchallengenumber);
    var nextQueuedTransactionData = await TransactionHelper.findOneTransactionWithQuery({txType:'solution',status:'queued', "txData.challenge_number": currentchallengenumber },mongoInterface) //JSON.parse(nextQueuedTransactionDataJSON)
    console.log('nextQueuedTransactionData is --> ', nextQueuedTransactionData);
    // if no txs type solution with current challenge number, try to look for other txs type solution to mark them as outdated, To be done: create script to delete txs with challenge number outdated instead of marking them as outdated
    if(!(nextQueuedTransactionData != null)){
    nextQueuedTransactionData = await TransactionHelper.findOneTransactionWithQuery({txType:'solution',status:'queued'},mongoInterface) //JSON.parse(nextQueuedTransactionDataJSON)
    }
  
    var hasQueuedTransaction = (nextQueuedTransactionData != null)
    console.log('broadcastQueuedMintTransactions stage a1 hasQueuedTransaction: --> ', hasQueuedTransaction);
    console.log('broadcastQueuedMintTransactions stage a1 hasPendingTransaction: --> ', hasPendingTransaction);
       
       if( hasQueuedTransaction && !hasPendingTransaction ){

          try{
           
             //LoggingHelper.appendLog(['nextQueuedTransactionData',nextQueuedTransactionData], LoggingHelper.TYPECODES.TRANSACTIONS, mongoInterface)

             var successful_broadcast = await this.broadcastTransaction(nextQueuedTransactionData, mongoInterface, poolConfig);

             if(!successful_broadcast)
             {
               //LoggingHelper.appendLog(['unsuccessful broadcast !', nextQueuedTransactionData], LoggingHelper.TYPECODES.ERROR , mongoInterface)

             }

          }
          catch(e)
          {
            LoggingHelper.appendLog(['error',e], LoggingHelper.TYPECODES.ERROR , mongoInterface)

 
          }
       }

   } 

 
   async broadcastQueuedBatchedPaymentTransactions(mongoInterface, poolConfig){
     
    LoggingHelper.appendLog('broadcastQueuedBatchedPaymentTransactions', LoggingHelper.TYPECODES.GENERIC, mongoInterface)

    //console.log(' --debug-- broadcasting QUEUED BATCH PAYMENTS !!!');
   
    let pendingTransactions = await TransactionHelper.findTransactionsWithQuery({txType:'batched_payment',status:'pending'},mongoInterface)

    var hasPendingTransaction = (pendingTransactions.length > 0);

    console.log('BatchedPayments pendingTransactions');
    console.log('BatchedPayments pendingTransactions are', pendingTransactions);

    var nextQueuedTransactionData = await TransactionHelper.findOneTransactionWithQuery({txType:'batched_payment',status:'queued'},mongoInterface) //JSON.parse(nextQueuedTransactionDataJSON)
 
    console.log('BatchedPayments nextQueuedTransactionData');
    console.log('BatchedPayments nextQueuedTransactionData is', nextQueuedTransactionData);
 
   
    var hasQueuedTransaction = (nextQueuedTransactionData != null)

       
       if( hasQueuedTransaction && !hasPendingTransaction ){

          try{ 

              //console.log('passed cond nextQueuedTransactionData');
                

             var successful_broadcast = await this.broadcastTransaction(nextQueuedTransactionData, mongoInterface, poolConfig);

             if(!successful_broadcast)
             {
               console.error('unsuccessful broadcast ! ')  
             }
             else {
              console.log('successfull payment broadcast !');
             }

          }
          catch(e)
          {
          console.log('error',e);
          }
       }

   } 


   async requeueSkippedBatchedPaymentTransactions(mongoInterface, poolConfig){
   
    LoggingHelper.appendLog('reQueuedSkippedBatchedPaymentTransactions', LoggingHelper.TYPECODES.GENERIC, mongoInterface)


    let pendingTransactions = await TransactionHelper.findTransactionsWithQuery({txType:'batched_payment',status:'skipped'},mongoInterface)

    let currentEthBlock = await TokenDataHelper.getEthBlockNumber(mongoInterface)

    if(!currentEthBlock)return;

    for(let pendingTransaction of pendingTransactions){

      if(!pendingTransaction.block || pendingTransaction.block < currentEthBlock-500){
        await mongoInterface.updateOne('transactions',{_id:pendingTransaction._id}, 
            {block: currentEthBlock, status:'queued'} )
      }

    }

   }



// Check if some txs were marked as skipped but were mined in the meantime, because then they would be stuck in a loop
// since they would go to queue and then immediatly back to skipped as their broadcast would fail
   async CheckStuckPaymentTransactions(mongoInterface, poolConfig){

    try {

    let web3 = new Web3(poolConfig.paymentsConfig.web3Provider);
    let potentialstuckTransactions = await TransactionHelper.findTransactionsWithQuery({txType:'batched_payment',status:'skipped'},mongoInterface);

    // If a transaction hash is found on blockchain as mined its status will be updated as success or reverted:
    var response = await TransactionHelper.checkTransactionReceipts(potentialstuckTransactions, web3, mongoInterface);

  }catch(e){
    console.log('error',e)
   }

   }



  // Mark solution txs waiting for broadcast as outdated to avoid them from broadcasting and preventing uptodate solutions to be submited:
   async OutdateMintTransactions(_challengeNumber, mongoInterface){
    //console.log('inside OutdateMintTransactions');
    //console.log('inside OutdateMintTransactions with challengenumber:', _challengeNumber);  

    await mongoInterface.deleteMany('transactions', {'txType':'solution', 'status':'pending', 'txData.challenge_number': _challengeNumber } )
    await mongoInterface.deleteMany('transactions', {'txType':'solution', 'status':'queued', 'txData.challenge_number': _challengeNumber } )
    await mongoInterface.deleteMany('transactions', {'txType':'solution', 'status':'skipped', 'txData.challenge_number': _challengeNumber } )
    await mongoInterface.deleteMany('transactions', {'txType':'solution', 'status':'outdated', 'txData.challenge_number': _challengeNumber } )

   } 



   /*
      Pending TX block the eth account so we need to skip if tx is taking too long.

   */
   async monitorStaleMintTransactions(mongoInterface, poolConfig){

    //const blockDelayForStaleTx = 100;  //25 mins
    const blockDelayForStaleTx = 30;  //6 mins 30 

    const currentBlockNumber = await TokenDataHelper.getEthBlockNumber(mongoInterface)

    if(isNaN(currentBlockNumber)) return;



    let staleTransactions = await TransactionHelper.findTransactionsWithQuery({txType:'solution', status:'pending', block: {$lt: (currentBlockNumber - blockDelayForStaleTx)}},mongoInterface)

    for(let tx of staleTransactions){      
     

      await TransactionHelper.updateOneTransactionById(tx._id, {status:'skipped'}, mongoInterface)

     // LoggingHelper.appendLog(['skipping transaction', JSON.stringify(tx)], LoggingHelper.TYPECODES.WARNING, mongoInterface)


    }
   

    
   }

   async monitorStalePaymentTransactions(mongoInterface, poolConfig){

    const blockDelayForStaleTx = 100;  //25 mins 

    const currentBlockNumber = await TokenDataHelper.getEthBlockNumber(mongoInterface)

    if(isNaN(currentBlockNumber)) return;



    let staleTransactions = await TransactionHelper.findTransactionsWithQuery({txType:'batched_payment', status:'pending', block: {$lt: (currentBlockNumber - blockDelayForStaleTx)}},mongoInterface)

    //console.log(' --debug-- setting txs as stale tx because remained pending too long');

    for(let tx of staleTransactions){      
      
      
      console.log(' --debug-- setting a txs as stale', tx);
      await TransactionHelper.updateOneTransactionById(tx._id, {status:'skipped'}, mongoInterface)

      //LoggingHelper.appendLog(['skipping transaction', JSON.stringify(tx)], LoggingHelper.TYPECODES.WARNING, mongoInterface)


    }
   

    
   }


    //?? not used ? 
   async updateLastBroadcastDataForTx(txHash,broadcastData)
   {
      var broadcastAtBlock ;
      var accountTxNonce ;
   } 


   async broadcastTransaction(transactionPacketData, mongoInterface, poolConfig)
   {

    //var receiptData = transactionPacketData.receiptData;
    var txData = transactionPacketData.txData;
    var txType = transactionPacketData.txType;
    
    //LoggingHelper.appendLog( [ '---- broadcast transaction ---',txType,txData ], LoggingHelper.TYPECODES.TRANSACTIONS, mongoInterface)

    var tx_hash = null;
    let isoutdated = false; // If solutions tx is for a former challenge number mark it as status outdated so that it never goes back for broadcasting


   // ----------- I. SUBMIT TXS OR NOT ------------ // 
   if(txType=="solution"){
     
    let currentchallengenumber = await TokenDataHelper.getChallengeNumber(mongoInterface);
    if( currentchallengenumber == txData.challenge_number){
 
          if(txData == null /*|| currentChallengeNumber !=  txData.challenge_number */)
          {
            //LoggingHelper.appendLog('missing txdata !  Not submitting solution to contract ' , LoggingHelper.TYPECODES.ERROR, mongoInterface)


             return false;
          }
  
          var submitResult =    await TransactionHelper.submitMiningSolution(txData.minerEthAddress,txData.solution_number, txData.challenge_number, txData.randomx_blob, txData.randomx_seedhash, txData.randomxhash, txData.claimedtarget, txData.extraNonce, mongoInterface, poolConfig)
 
          LoggingHelper.appendLog( ['submitresult ', submitResult ], LoggingHelper.TYPECODES.TRANSACTIONS, mongoInterface)


          if(submitResult.success == true){
             
            tx_hash = submitResult.txResult.txHash 
             
          }

    }
    
    else{
    // challenge number is outdated
    isoutdated = true;
    }

     }else if(txType=="batched_payment"){

      if(txData == null  )
          {
            //console.log('missing txdata !  Not submitting solution to contract ' )
            return false;
          }
  
          var submitResult =   await TransactionHelper.submitBatchedPayment(txData, mongoInterface, poolConfig)
          
          console.log('submitresult ', submitResult )
 

          if(submitResult.success == true){
             
            tx_hash = submitResult.txResult.txHash 
            console.log(' --debug-- SUCCESSFULLY broadcasted tx of type batched_payment');
             
          }

    }else{
      console.error('invalid tx type!',txType)
      return false;
    }
    // ---------  I. SUBMIT TXS OR NOT -------------  //

   
    // -----------  II. UDPATES STATUS OF TXS  END  -------------  //

if(!isoutdated){

    if(tx_hash == null){

      ///Store new transfer data with a null tx_hash  which we will pick up later and then grab a receipt for !!!
      
      await TransactionHelper.updateOneTransactionById(transactionPacketData._id, {status:'skipped'}, mongoInterface)

      return false;
    }else{
      console.log('broadcasted transaction -> ',tx_hash,txType,txData)

        await TransactionHelper.updateOneTransactionById(transactionPacketData._id, {status:'pending', txHash: tx_hash}, mongoInterface)

        return true

    }

  }

  else {

    console.log('marked a tx as outdated for challenge number', txData.challenge_number);
    // solution tx is outdated because challenge number has changed
    await TransactionHelper.updateOneTransactionById(transactionPacketData._id, {status:'outdated'}, mongoInterface)
    await this.OutdateMintTransactions(txData.challenge_number, mongoInterface); // outdates all solution txs with this outdated challenge number

  }
      // ---------   II. UDPATES STATUS OF TXS END  -------------  //

  } 


 

    async getTransactionStatistics(mongoInterface){
      return await mongoInterface.findOne('transactionsMetrics',{})
    }

    
      async updateTransactionStatistics(mongoInterface)
      {
        var pendingCount = 0;
        var queuedCount = 0;
        var revertedCount = 0;
        var successCount = 0;

        var queuedMintsCount = 0;


        var pendingMintsCount = 0;
        var pendingPaymentsCount = 0;

        //var queuedMintsTransactions = await mongoInterface.findAll('mint_transactions', {status:'queued'}) //await this.redisInterface.getElementsOfListInRedis('queued_mint_transactions')


        ///mint AND transfer type transactions are in here 
        var ethereumTransactions  = await mongoInterface.findAllSortedWithLimitonString('transactions', {}, {block:-1}, 100); // findAll('transactions')

       

       ethereumTransactions.map(function(item){

        //  console.log('item',item)


          var transactionStatus = item.status;


          if(transactionStatus == 'pending'){
            pendingCount++;

            if(item.txType == 'transfer')
            {
                pendingPaymentsCount++;
            }
            if(item.txType == 'solution')
            {
                pendingMintsCount++;
            }
          }


          if(transactionStatus == 'queued' ){
            queuedCount++;


            if(item.txType == 'solution')
            {
                queuedMintsCount++;
            }
          }

          if(transactionStatus == 'reverted')revertedCount++;
          if(transactionStatus == 'success')successCount++;

        })

          let newTxMetrics = {
            queuedTxCount: queuedCount,
            pendingTxCount: pendingCount,
            successTxCount:successCount,
            revertedTxCount: revertedCount,

            queuedMintsCount: queuedMintsCount,
            queuedPaymentsCount: 0,
            pendingMintsCount: pendingMintsCount,
            pendingPaymentsCount: pendingPaymentsCount
          }


          await mongoInterface.upsertOne('transactionsMetrics', {}, newTxMetrics)
 
       return newTxMetrics;

      } 





     async requestTransactionData(tx_hash)
     {
       try{
          var data = await this.web3.eth.getTransaction(tx_hash);
        }catch(err)
        {
          console.error("could not find tx ", tx_hash )
          return null;
        }

          return data;
     } 



   async requestTransactionReceipt(tx_hash)
   {

      try{
      var receipt = await this.web3.eth.getTransactionReceipt(tx_hash);
      }catch(err)
      {
        console.error("could not find receipt ", tx_hash )
        return null;
      }
        return receipt;


   } 


   //required for balance payouts
      async storeNewSubmittedSolutionTransactionHash(tx_hash, tokensAwarded, minerEthAddress, challengeNumber)
      {
        var blockNum = await TokenDataHelper.getEthBlockNumber(this.mongoInterface);

        var txData = {
          block: blockNum,
          tx_hash: tx_hash,
          minerEthAddress: minerEthAddress,
          challengeNumber: challengeNumber,
          mined: false,  //completed being mined ?
          succeeded: false,
          token_quantity_rewarded: tokensAwarded,
          rewarded: false   //did we win the reward of 50 tokens ?
        }

         this.redisInterface.storeRedisHashData('unconfirmed_submitted_solution_tx',tx_hash,JSON.stringify(txData) )
      } 


     async getBalanceTransferConfirmed(paymentId)
     {
        //check balance payment

        var balanceTransferJSON = await this.redisInterface.findHashInRedis('balance_transfer',paymentId);
        var balanceTransfer = JSON.parse(balanceTransferJSON)


        if(balanceTransferJSON == null || balanceTransfer.txHash == null)
        {
          return false;
        }else{

          //dont need to check receipt because we wait many blocks between broadcasts - enough time for the monitor to populate this data correctly
          return balanceTransfer.confirmed;

        }
     } 

// ------- DETECT POOL MINING SUCCESS FOR NEW MINING REWARD SYSTEM, ONLY INCREASE BALANCE IF SOLUTION MINED ----- //

      async detectPoolMiningSuccess (tokenContract, web3,  mongoInterface, poolConfig )
     {
       if(typeof tokenContract == 'undefined'){
         console.log('WARN: Could not detect mining success')
         return 
       }
       let _searchrange = 2000; // range search of number of blocks to look for a past mining pool success
       let latestblock = await web3.eth.getBlock('latest');
       
       let _fromblock = latestblock.number - _searchrange;
       if(_fromblock <= 0){
       _fromblock = 0;
       }
       //console.log('_fromblock is ', _fromblock);
       //console.log('latestblock is ', latestblock);
       
       
       let options = {
         fromBlock: _fromblock,                  //Number || "earliest" || "pending" || "latest"
         toBlock:'latest'
     };
   
       var lastmints = await tokenContract.getPastEvents('Mint', options)
       .then(async (events) => {
   
       events.forEach(onevent => {
           if(onevent.event == 'Mint' && onevent.returnValues.from == poolConfig.mintingConfig.publicAddress ){
               this.insertMint(onevent, mongoInterface);
               this.insertalletiMint(onevent, mongoInterface, 1);
           }
           else{
            this.insertalletiMint(onevent, mongoInterface, 2);
           }
   
       });
   
       })
       .catch(err => console.log('error!', err));
     }
   
             // Insert Event of type Mint in DB, called by detectMining()
             async insertMint(mintevent, mongoInterface) {
              let _mintepochCount = parseInt(mintevent.returnValues.epochCount -1);
              _mintepochCount = _mintepochCount.toString();
               var existingMint =  await  mongoInterface.findOne('pool_mints', {epochCount: _mintepochCount}  );
               // check we have right type of event. Event should be a mint
               if(mintevent.event == 'Mint'){
               // Only insert if mint doesn't exist yet:
               if(!existingMint){
                 let newmint = {
                   transactionhash: mintevent.transactionHash,
                   from: mintevent.returnValues.from,
                   blockreward: mintevent.returnValues.blockreward,
                   epochCount: _mintepochCount,
                   poolstatus: 1 // 1: miners balance not updated yet 2: miners balance were increased and mint should not be used to increase balance again
               };
               // Insert mint! Will be used then to confirm miners solutions mined in blockchain and when solution is confirmed trigger script that will increase miners reward balance
               await mongoInterface.insertOne("pool_mints", newmint);
               }
               else{
                 return 'This mint already exists !';
               }
           }
   
           else {
               return 'wont insert this event in db as mint, wrong type of event, not a mint';
           }
       
               }


               async insertalletiMint(mintevent, mongoInterface, _status) {
                let _mintepochCount = parseInt(mintevent.returnValues.epochCount -1);
                _mintepochCount = _mintepochCount.toString();
                 var existingMint =  await  mongoInterface.findOne('all_eti_mints', {epochCount: _mintepochCount}  );
                 //console.log('existingMint is', existingMint);
                 // check we have right type of event. Event should be a mint
                 if(mintevent.event == 'Mint'){
                 // Only insert if mint doesn't exist yet:
                 if(!existingMint){
  
                   let newmint = {
                     transactionhash: mintevent.transactionHash,
                     from: mintevent.returnValues.from,
                     blockreward: mintevent.returnValues.blockreward,
                     epochCount: _mintepochCount,
                     status: _status // 1: from pool 2: not from pool
                 };
                 // Insert mint! Will be used then to confirm miners solutions mined in blockchain and when solution is confirmed trigger script that will increase miners reward balance
                 await mongoInterface.insertOne("all_eti_mints", newmint);
                 }
                 else{
                   return 'This mint already exists !';
                 }
             }
     
             else {
                 return 'wont insert this event in db as mint, wrong type of event, not a mint';
             }
         
                 }
// ------- DETECT POOL MINING SUCCESS FOR NEW MINING REWARD SYSTEM, ONLY INCREASE BALANCE IF SOLUTION MINED ----- //


   // check if existence pool_mints with this digest, if yes send it to handlevalide shares
   async rewardCrawl( mongoInterface, poolConfig )
   {

    var unprocessedPoolmints =  await  mongoInterface.findAll('pool_mints', {poolstatus: 1}  );
    for(let onepoolmint of unprocessedPoolmints)
    {
     // get poolmint's pendingshare thanks to allminingContractsthat has both fields epochCount and challengeNumber to make the link:
     var _miningContractData = await mongoInterface.findOne('allminingContracts', {epochCount: onepoolmint.epochCount} );
  
     if(_miningContractData && _miningContractData != null){

            // get last X totalDifficulties:
            // Get last X totalDifficulties
            const PPLNSDEPTH = 5;
            let stringparam1 = onepoolmint.epochCount.toString();
            let param2 = onepoolmint.epochCount - (PPLNSDEPTH);
            let stringparam2 = param2.toString();
     
            var _miningContractsData = await mongoInterface.findAllonString('allminingContracts', {epochCount: {$lte: stringparam1,$gt: stringparam2}} );
           
            // Ensure the number of elements is at most 5
            if (_miningContractsData.length > PPLNSDEPTH) {
               _miningContractsData = _miningContractsData.slice(0, PPLNSDEPTH); // Take the first PPLNSDEPTH elements
            }

            var pplns_challenge_numbers = [];
            var pplns_totalDifficulties_BN = web3utils.toBN('0');

            for (let oneminingContract of _miningContractsData) {
    
              var totalDifficulty =  await  mongoInterface.findOne('totaldiff_challengenumber', {challengeNumber: oneminingContract.challengeNumber, minerport: 8888}  );
              if(totalDifficulty){
                let _totaldiff = totalDifficulty.totaldiff.toString();
                pplns_totalDifficulties_BN = pplns_totalDifficulties_BN.add(web3utils.toBN(_totaldiff));
                pplns_challenge_numbers.push(oneminingContract.challengeNumber);
              }

            }

     // find all miners of this pplns round:
     var miners_pplns = await mongoInterface.findAll('miner_challengediff', {challengeNumber: { $in: pplns_challenge_numbers }});

     // Get unique miners addresses:
     const uniqueMiners = [...new Set(miners_pplns.map(item => item.minerEthAddress))];

     // Creates missing miners_challengediffs (if miner didn't find share for current challenge number we create one with share amount equal to 0):
     for(let oneminerAddress of uniqueMiners){
      
      let existingChallengediff = await mongoInterface.findOne('miner_challengediff', {minerEthAddress: oneminerAddress, challengeNumber: _miningContractData.challengeNumber, minerport: 8888});
      if(existingChallengediff == null)
      {
        var newminerchallengediff =  {
          minerEthAddress: oneminerAddress,
          challengeNumber: _miningContractData.challengeNumber,
          totaldiff: '0',
          status:1,
          minerport: 8888
        };

      await mongoInterface.insertOne('miner_challengediff', newminerchallengediff);

      }

     }


     var miners_challengediffs = await mongoInterface.findAll('miner_challengediff', {challengeNumber: _miningContractData.challengeNumber, status: 1});

      if( miners_challengediffs ){

        if( miners_challengediffs){

            for(let oneminer_challengetotaldiff of  miners_challengediffs){
               // process mint, to increase miners token balance:    
               await PeerInterface.processAddressforChallenge( oneminer_challengetotaldiff, pplns_challenge_numbers, pplns_totalDifficulties_BN, onepoolmint, mongoInterface, poolConfig );
            }
    }
  
            await mongoInterface.updateOne('pool_mints', {_id: onepoolmint._id}, {poolstatus: 2});

    }
      else {

      // poolstatus 3 for no miners_challengediffs found for this poolmint
      await mongoInterface.updateOne('pool_mints', {_id: onepoolmint._id}, {poolstatus: 3});

       }
     }
     else {
      // / poolstatus 4 for no mining contract found !!!
      await mongoInterface.updateOne('pool_mints', {_id: onepoolmint._id}, {poolstatus: 4});
     }

    }

    await StatsInterface.CalculateCurrentStatsPayment(mongoInterface, poolConfig);

   }


      // Send eti to batch contract from mining Address:
      // check if existence pool_mints with this digest, if yes send it to handlevalide shares
      async SendEtiToBatchContractCrawl( mongoInterface, poolConfig )
      {
        //console.log('trying SendEtiToBatchContractCrawl');

        let poolAccountBalances = await TokenDataHelper.getPoolAccountBalancesData(mongoInterface);

        if(poolAccountBalances.mintingAccountBalances['token'] > 0){

        let amounttosend = poolAccountBalances.mintingAccountBalances['token'];
        //let amounttosend = '58354866108329588310'; Used for tests 58.354... ETI

        let paymentsAccountAddress = poolConfig.paymentsConfig.publicAddress;
        let batchedPaymentsContractAddress = ContractHelper.getBatchedPaymentContractAddress( poolConfig )

        let web3 = new Web3( poolConfig.mintingConfig.web3Provider )

        var tokenContract =  ContractHelper.getTokenContract(web3, poolConfig)
        var transferMethod = tokenContract.methods.transfer( batchedPaymentsContractAddress,amounttosend )

        var addressFrom = poolConfig.mintingConfig.publicAddress;
        var addressTo = tokenContract.options.address;
     
       try{
         var txCount = await web3.eth.getTransactionCount(addressFrom);
         //console.log('txCount',txCount)
        } catch(error) {  //here goes if someAsyncPromise() rejected}
     
          return error;    //this will result in a resolved promise.
        }
    
        var txData = web3.eth.abi.encodeFunctionCall({
                 name: 'transfer',
                 type: 'function',
                 inputs: [{
                     type: 'address',
                     name: 'to'
                 },{
                     type: 'uint256',
                     name: 'tokens'
                 } ]
             }, [batchedPaymentsContractAddress, amounttosend ]);
     
     
        var max_gas_cost = 700624;
      
         var estimatedGasCost = null
     
         try{
           estimatedGasCost = await transferMethod.estimateGas({gas: max_gas_cost, gasPrice:1000000000, from:addressFrom, to:addressTo });
           //console.log(estimatedGasCost);
           //console.log('SendEtiToBatchContractCrawl estimatedGasCost is', estimatedGasCost);
           if( estimatedGasCost > max_gas_cost){
             console.log("Gas estimate too high!  Something went wrong ")
             return;
           }
         }catch(error){      
           //LoggingHelper.appendLog( ['estimatedGasCostError', error], LoggingHelper.TYPECODES.ERROR, mongoInterface)
           // In case error due to 'replacement transaction underpriced',
           // Will try with 20% higher gas price :
           console.log('  --debug-- SendEtiToBatchContractCrawl estimatedGasCostError');
           console.log('  --debug--  SendEtiToBatchContractCrawl estimatedGasCostError error is', error);
           
           return {success:false,reason:'predictedRevert'} //don't fail yet, wil retry with higher gasPrice before!
          /* let _txOptions = {
             nonce: web3utils.toHex(txCount),
             value: 0,
             to: addressTo,
             from: addressFrom,
             data: txData
           }
          return this.retrysendMinintingTx(_txOptions, addressFrom, poolConfig, mongoInterface);*/
         }     
     
        let mintingGasPriceBoost = 0;

         const txOptions = {
           nonce: web3utils.toHex(txCount),
           gas: web3utils.toHex(estimatedGasCost),
           gasPrice: 1000000000,
           value: 0,
           to: addressTo,
           from: addressFrom,
           data: txData
         }
     
         var privateKey = poolConfig.mintingConfig.privateKey;

         let txResult = null;
         try{
           txResult= await TransactionHelper.sendSignedRawTransactionSimple(web3,txOptions,addressFrom,privateKey);
           return {success:true,txResult: txResult}
         }catch(error){   
           
           LoggingHelper.appendLog( ['estimatedGasCostError', error], LoggingHelper.TYPECODES.ERROR, mongoInterface)
           console.log('  --debug-- mint tx rejected');
           console.log('  --debug--  mint tx rejected error is', error);
     
          txOptions.gasPrice = 1900000000; // put +20% above 15 so that it gets accepted in priority
     
          var estimatedGasCost2 = null;
          try{
            estimatedGasCost2 = await transferMethod.estimateGas({gas: max_gas_cost, gasPrice: 1900000000, from: txOptions.addressFrom, to: txOptions.addressTo });
            //console.log('estimatedGasCost2 SendEtiToBatchContractCraw');
            //console.log('estimatedGasCost2 SendEtiToBatchContractCraw is', estimatedGasCost2);
          }catch(error){      
            LoggingHelper.appendLog( ['estimatedGasCostError2', error], LoggingHelper.TYPECODES.ERROR, mongoInterface)
            console.log('  --debug-- SendEtiToBatchContractCrawestimatedGasCostError2');
            console.log('  --debug--  SendEtiToBatchContractCraw estimatedGasCostError2 error is', error);
            // We abandon:
            return {success:false,reason:'predictedRevert2'}
          }
          
            let txResult2= await TransactionHelper.sendSignedRawTransactionSimple(web3, txOptions, addressFrom,privateKey);
      
            return {success:true,txResult2: txResult2}   
     
         }


      }


      }


}