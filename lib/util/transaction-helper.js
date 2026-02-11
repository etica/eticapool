

import Web3 from 'web3'

import ContractHelper from './contract-helper.js'


import Web3ApiHelper from './web3-api-helper.js'
import LoggingHelper from './logging-helper.js'
import PoolLogger from './pool-logger.js'
import PeerHelper from './peer-helper.js'

import web3utils from 'web3-utils'

import * as randomxHelper from "./randomx-formats-helper.js";


var last_gasprice_minting = 10; // 10 GWei, use it to retry send txs with higher gas price in case of tx stuck in tx pool
var last_gasprice_payment = 10;
var retrytx = false;
/*
  This class should only have static methods
*/


export default class TransactionHelper  {


  static async submitMiningSolution(minerAddress,solution_number, challenge_number, randomx_blob, randomx_seedhash, randomxhash, claimedtarget, extraNonce, mongoInterface,poolConfig){

    PoolLogger.tx(`Submitting solution | nonce=${PoolLogger.truncateHash(solution_number)} | miner=${PoolLogger.truncateHash(minerAddress)}`);

    var addressFrom = poolConfig.mintingConfig.publicAddress;


   let web3 = new Web3( poolConfig.mintingConfig.web3Provider )

   var tokenContract =  ContractHelper.getTokenContract(web3, poolConfig);

   PoolLogger.debug(`nonce=${solution_number} challenge=${PoolLogger.truncateHash(challenge_number)}`);
   PoolLogger.debug(`randomx_blob=${PoolLogger.truncateHash(randomx_blob)}`);
   PoolLogger.debug(`randomx_seedhash=${PoolLogger.truncateHash(randomx_seedhash)}`);
   PoolLogger.debug(`randomxhash=${PoolLogger.truncateHash(randomxhash)}`);
   PoolLogger.debug(`typeof solution_number: ${typeof solution_number}`);
    const _nonce = randomxHelper.convertAdd0x(solution_number);
    const _extraNonce = randomxHelper.convertAdd0x(extraNonce);
    PoolLogger.debug(`claimedtarget=${PoolLogger.truncateHash(String(claimedtarget))}`);
    PoolLogger.debug(`_nonce with 0x: ${_nonce}`);


   try {
    // Call checkMintRandomxInputs to validate the inputs
    const checkResult = await tokenContract.methods.checkMintRandomxInputs(randomx_blob, challenge_number, claimedtarget, randomx_seedhash).call();
    PoolLogger.debug('checkResult', checkResult);
    // Check if the result is valid
    if (!checkResult.isValid) {
        PoolLogger.warn(`Input validation failed: ${checkResult.errorMessage}`);
        return { success: false, reason: checkResult.errorMessage };
    }
    }
    catch(error){
      return error;
    }


   var mintMethod = tokenContract.methods.mintrandomX( solution_number, randomx_blob, challenge_number, randomxhash, claimedtarget, randomx_seedhash, extraNonce )
   PoolLogger.debug('Encoding mint transaction...');
  try{
    var txCount = await web3.eth.getTransactionCount(addressFrom);
   } catch(error) {  //here goes if someAsyncPromise() rejected}

    LoggingHelper.appendLog( [ 'txCount error',error ], LoggingHelper.TYPECODES.ERROR , mongoInterface)

     return error;    //this will result in a resolved promise.
   }
   PoolLogger.debug('Got txCount, encoding ABI...');

   var addressTo = tokenContract.options.address;


    var txData = web3.eth.abi.encodeFunctionCall({
            name: 'mintrandomX',
            type: 'function',
            inputs: [{
                type: 'bytes4',
                name: 'nonce'
            },{
                type: 'bytes',
                name: 'blockHeader'
            },{
              type: 'bytes32',
              name: 'currentChallenge'
            },{
              type: 'bytes',
              name: 'randomxHash'
            },{
              type: 'uint256',
              name: 'claimedTarget'
            },{
              type: 'bytes',
              name: 'seedHash'
            },
            {
              type: 'bytes8',
              name: 'extraNonce'
            }
           ]
        }, [_nonce, randomx_blob, challenge_number, randomxhash, claimedtarget, randomx_seedhash, _extraNonce ]);

        PoolLogger.debug('ABI encoded txData', txData);
   var max_gas_cost = 999000;

    var estimatedGasCost = 499000;

    PoolLogger.debug('Preparing tx options...');
    /* TODO: WARNING: Handle tx estimation, create other function dedicated to mintrandomx() estimation


    var randomxBlob = await tokenContract.methods.checkMintRandomxInputs(_nonce, randomx_blob, challenge_number, randomxhash, claimedtarget, randomx_seedhash, _extraNonce).call();

    try{
      estimatedGasCost = await mintMethod.estimateGas({gas: max_gas_cost, gasPrice:1000000000, from:addressFrom, to:addressTo });
      //console.log(estimatedGasCost);
      //console.log('estimatedGasCost is', estimatedGasCost);
      if( estimatedGasCost > max_gas_cost){
        console.log("Gas estimate too high!  Something went wrong ")
        return;
      }
    }catch(error){
      //LoggingHelper.appendLog( ['estimatedGasCostError', error], LoggingHelper.TYPECODES.ERROR, mongoInterface)
      // In case error due to 'replacement transaction underpriced',
      // Will try with 20% higher gas price :
      console.log('  --debug-- mintMethod estimatedGasCostError');
      console.log('  --debug--  mintMethod estimatedGasCostError error is', error);

      return {success:false,reason:'predictedRevert'} //don't fail yet, wil retry with higher gasPrice before!
    } */


    LoggingHelper.appendLog( ['sending soln tx', estimatedGasCost, txData, addressFrom, addressTo ], LoggingHelper.TYPECODES.ERROR, mongoInterface)

   let mintingGasPriceBoost = 0;

    if(poolConfig && poolConfig.mintingConfig.gasPriceBoost){
      mintingGasPriceBoost = parseInt(poolConfig.mintingConfig.gasPriceBoost)
      if(isNaN(mintingGasPriceBoost)){mintingGasPriceBoost=0}
    }

    this.last_gasprice_minting = 10; // reset normal gas price has no tx stuck that would have triggered the error replacement transaction
    const txOptions = {
      nonce: web3utils.toHex(txCount),
      gas: web3utils.toHex(estimatedGasCost),
      gasPrice: 200000000000,
      value: 0,
      to: addressTo,
      from: addressFrom,
      data: txData
    }

    var privateKey = poolConfig.mintingConfig.privateKey;

    LoggingHelper.appendLog(['sendSignedRawTransactionSimple',txOptions], LoggingHelper.TYPECODES.TRANSACTIONS, mongoInterface)

    let txResult = null;
    try{
      PoolLogger.debug('Signing and sending transaction...');
      txResult= await TransactionHelper.sendSignedRawTransactionSimple(web3,txOptions,addressFrom,privateKey);
      return {success:true,txResult: txResult}
    }catch(error){

      LoggingHelper.appendLog( ['estimatedGasCostError', error], LoggingHelper.TYPECODES.ERROR, mongoInterface)
      PoolLogger.warn('Mint TX rejected by node');
      PoolLogger.debug('Mint TX rejection details', error);

     this.last_gasprice_minting = this.last_gasprice_minting + this.last_gasprice_minting * (20/100);

     txOptions.gasPrice = 1500000000;

     var estimatedGasCost2 = null;
     // former: gasPrice: 1500000000
     //console.log('new last gasprice minting is', this.last_gasprice_minting);
     try{
       estimatedGasCost2 = await mintMethod.estimateGas({gas: max_gas_cost, gasPrice: 300000000000, from: txOptions.addressFrom, to: txOptions.addressTo });
       PoolLogger.debug(`estimatedGasCost2: ${estimatedGasCost2}`);
     }catch(error){
       LoggingHelper.appendLog( ['estimatedGasCostError2', error], LoggingHelper.TYPECODES.ERROR, mongoInterface)
       PoolLogger.warn('Mint retry gas estimation failed (predictedRevert2)');
       PoolLogger.debug('estimatedGasCostError2', error);
       // We abandon:
       return {success:false,reason:'predictedRevert2'}
     }

     LoggingHelper.appendLog(['sendSignedRawTransactionSimple', txOptions], LoggingHelper.TYPECODES.TRANSACTIONS, mongoInterface)

       let txResult2= await TransactionHelper.sendSignedRawTransactionSimple(web3, txOptions, addressFrom,privateKey);

       return {success:true,txResult2: txResult2}

    }
  }


  static  async retrysendMinintingTx(_txoptions , web3, poolConfig, mongoInterface)
  {

    var tokenContract =  ContractHelper.getTokenContract(web3, poolConfig)
    var mintMethod = tokenContract.methods.mint( solution_number,challenge_digest )
    var max_gas_cost = 600624;
    var estimatedGasCost2 = null;

    this.last_gasprice_minting = this.last_gasprice_minting + this.last_gasprice_minting * (20/100);

    try{
      estimatedGasCost2 = await mintMethod.estimateGas({gas: max_gas_cost, gasPrice: this.last_gasprice_minting, from:_txoptions.addressFrom, to: _txoptions.addressTo });
      PoolLogger.debug(`retrysendMinintingTx estimatedGasCost2: ${estimatedGasCost2}`);
    }catch(error){
      LoggingHelper.appendLog( ['estimatedGasCostError2', error], LoggingHelper.TYPECODES.ERROR, mongoInterface)
      PoolLogger.warn('Retry mint gas estimation failed');
      PoolLogger.debug('retrysendMinintingTx estimatedGasCostError2', error);
      // We abandon:
      return {success:false,reason:'predictedRevert2'}
    }

    let _newtxoptions = {
      nonce: _txoptions.nonce,
      gas: web3utils.toHex(estimatedGasCost2),
      gasPrice: this.last_gasprice_minting,
      value: 0,
      to: _txoptions.addressTo,
      from: _txoptions.addressFrom,
      data: _txoptions.data
    }

    // Send the transaction:
    var privateKey = poolConfig.mintingConfig.privateKey;

    LoggingHelper.appendLog(['sendSignedRawTransactionSimple',_newtxoptions], LoggingHelper.TYPECODES.TRANSACTIONS, mongoInterface)

      let txResult= await TransactionHelper.sendSignedRawTransactionSimple(web3,_newtxoptions,_txoptions.addressFrom,privateKey);

      return {success:true,txResult: txResult}

  }




  static async submitBatchedPayment(txData, mongoInterface, poolConfig)
  {

    LoggingHelper.appendLog(['broadcasting batch payment', txData], LoggingHelper.TYPECODES.TRANSACTIONS, mongoInterface)


    var addressFrom = poolConfig.paymentsConfig.publicAddress;

    let web3 = new Web3( poolConfig.paymentsConfig.web3Provider )




    var tokenContract =  ContractHelper.getPaymentsTokenContract(web3, poolConfig)
    let tokenAddress = tokenContract.options.address


    let dests = []
    let amounts = []

    for(let payment of txData.payments){
      dests.push(payment.minerEthAddress);
      let big_int_number = BigInt(payment.amountToPay);
      // Using BigInt.prototype.toString()
      let string_version = big_int_number.toString();
      amounts.push(string_version);
    }

    var batchedPaymentsContract =  ContractHelper.getBatchedPaymentsContract(web3, poolConfig)
    var multisendMethod = batchedPaymentsContract.methods.multisend( tokenAddress, txData.uuid, dests, amounts)

   //do the broadcast here

      try{
        var txCount = await web3.eth.getTransactionCount(addressFrom);

      } catch(error) {  //here goes if someAsyncPromise() rejected}

        LoggingHelper.appendLog( [ 'txCount error',error ], LoggingHelper.TYPECODES.ERROR , mongoInterface)


        return error;    //this will result in a resolved promise.
      }

      var addressTo =  batchedPaymentsContract.options.address;



      var txData = web3.eth.abi.encodeFunctionCall({
        name: 'multisend',
        type: 'function',
        inputs: [
          {
            "name": "_tokenAddr",
            "type": "address"
          },
          {
            "name": "paymentId",
            "type": "bytes32"
          },
          {
            "name": "dests",
            "type": "address[]"
          },
          {
            "name": "values",
            "type": "uint256[]"
          }
        ]
    }, [tokenAddress, txData.uuid, dests, amounts]);



    var max_gas_cost = 1704624;


    var estimatedGasCost = null

    try{
    estimatedGasCost = await multisendMethod.estimateGas({gas: max_gas_cost, from:addressFrom, to: addressTo });

    }catch(error){

     PoolLogger.warn('Multisend gas estimation failed');
     PoolLogger.debug('multisendMethod estimatedGasCostError', error);

      return {success:false,reason:'predictedRevert'}
    }

    PoolLogger.debug(`estimatedGasCost: ${estimatedGasCost}`);

    if( estimatedGasCost > max_gas_cost){
     PoolLogger.error('Gas estimate too high — something went wrong')
     return;
    }


    let gasPriceWei = await  Web3ApiHelper.getGasPriceWeiForTxType('batched_payment', poolConfig,mongoInterface)


    let minRequiredGas = 50000; // apparently requires minimum 29464 instead of estimatedGasCost 23978 (from new error message)
    estimatedGasCost = Math.max(estimatedGasCost, minRequiredGas);

    const txOptions = {
    nonce: web3utils.toHex(txCount),
    gas: web3utils.toHex(estimatedGasCost),
    gasPrice: web3utils.toHex(web3utils.toWei(gasPriceWei.toString(), 'gwei') ),
    value: 0,
    to: addressTo,
    from: addressFrom,
    data: txData
    }

    var privateKey = poolConfig.paymentsConfig.privateKey;




    LoggingHelper.appendLog(['sendSignedRawTransactionSimple',txOptions], LoggingHelper.TYPECODES.TRANSACTIONS, mongoInterface)

    let txResult= await TransactionHelper.sendSignedRawTransactionSimple(web3,txOptions,addressFrom,privateKey);

    return {success:true,txResult: txResult}



  }

  static  async requestTransactionReceipt(web3, tx_hash)
  {
      if (!tx_hash) {
        PoolLogger.debug('requestTransactionReceipt called with null/empty txHash, skipping');
        return null;
      }
      try{
       var receipt = await  web3.eth.getTransactionReceipt(tx_hash);
     }catch(err)
     {
      PoolLogger.debug(`Failed to get receipt for tx ${PoolLogger.truncateHash(tx_hash)}`);
       return null;
     }
       return receipt;
  }


    //checks each to see if they have been mined
    //rewrite this for mongo  !


    static async checkTransactionReceipts(txes, web3, mongoInterface)
    {
      for(let transaction of txes)
      {
        var tx_hash = transaction.txHash

        // Skip transactions with no txHash — they were never broadcasted successfully
        if (!tx_hash) {
          PoolLogger.debug(`Skipping receipt check for tx with null txHash (id=${transaction._id})`);
          continue;
        }

        LoggingHelper.appendLog(['checkPendingSolutions',tx_hash], LoggingHelper.TYPECODES.TRANSACTION, mongoInterface)

        let transactionWasMined = TransactionHelper.transactionWasMined(transaction)

        if( !transactionWasMined )
        {
          let liveTransactionReceipt = null;
          const maxRetries = 5;

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            liveTransactionReceipt = await TransactionHelper.requestTransactionReceipt(web3, tx_hash);

            if (liveTransactionReceipt != null) {
              break; // got receipt, stop retrying
            }

            if (attempt < maxRetries) {
              // Wait 2 seconds before retrying
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }

          if (liveTransactionReceipt != null)
          {
            LoggingHelper.appendLog(['got receipt',liveTransactionReceipt], LoggingHelper.TYPECODES.TRANSACTION, mongoInterface)

                var transaction_succeeded = ((liveTransactionReceipt.status == true)
                                               || (web3utils.hexToNumber( liveTransactionReceipt.status) == 1 ))

                if( transaction_succeeded )
                {
                  await TransactionHelper.updateOneTransactionById(transaction._id, {status:'success'} ,mongoInterface)

                  PoolLogger.success(`TX mined | ${PoolLogger.truncateHash(tx_hash)}`)
                  console.log('[PAYMENT-TRACE] checkTransactionReceipts: TX SUCCESS | txType:', transaction.txType, '| txHash:', tx_hash.substring(0,18));

                  // Updates balance_payments to confirmed: true and increase receiveTokensReceived:
                  if(transaction.txType == 'batched_payment'){
                    console.log('[PAYMENT-TRACE] checkTransactionReceipts: calling markPaymentsCompleteForBatch | uuid:', transaction.txData?.uuid?.substring(0,18), '| txHash:', tx_hash.substring(0,18));
                    await TransactionHelper.markPaymentsCompleteForBatch(transaction, mongoInterface);
                    console.log('[PAYMENT-TRACE] checkTransactionReceipts: markPaymentsCompleteForBatch DONE');
                  }

                }else {
                  await TransactionHelper.updateOneTransactionById(transaction._id, {status:'reverted'} ,mongoInterface)

                  console.log('[PAYMENT-TRACE] checkTransactionReceipts: TX REVERTED | txType:', transaction.txType, '| txHash:', tx_hash.substring(0,18));
                  PoolLogger.error(`TX mined but REVERTED | ${PoolLogger.truncateHash(tx_hash)}`)
                }

          } else {
            PoolLogger.debug(`Receipt still null after ${maxRetries} attempts | ${PoolLogger.truncateHash(tx_hash)}`);
            LoggingHelper.appendLog( [ 'got null receipt',tx_hash], LoggingHelper.TYPECODES.WARN, mongoInterface)
          }

        }

      }

    }

    static transactionWasMined(transaction){
     return (transaction.status == 'success' || transaction.status == 'reverted')

    }



       // Updates balance_payments to confirmed: true and increase receiveTokensReceived:
       static async markPaymentsCompleteForBatch(batchPayment, mongoInterface)
       {
         console.log('[PAYMENT-TRACE] markPaymentsCompleteForBatch: looking for balance_payments with batchedPaymentUuid:', batchPayment.txData?.uuid?.substring(0,18));
         var paymentsForBatch = await mongoInterface.findAll('balance_payments',{batchedPaymentUuid: batchPayment.txData.uuid})

         console.log('[PAYMENT-TRACE] markPaymentsCompleteForBatch: found', paymentsForBatch ? paymentsForBatch.length : 0, 'balance_payments for this batch');

         for( var element of paymentsForBatch )   {
          // only do it once (when confirmed not true yet):
         if(!element.confirmed){
            console.log('[PAYMENT-TRACE] markPaymentsCompleteForBatch: confirming payment for', element.minerEthAddress?.substring(0,20), '| amountToPay:', element.amountToPay);
            await mongoInterface.updateOne('balance_payments', {_id: element._id},  {txHash: batchPayment.txHash, confirmed: true} );
            await PeerHelper.increaseTokensReceivedForMiner( element.minerEthAddress, element, mongoInterface);
            console.log('[PAYMENT-TRACE] markPaymentsCompleteForBatch: increaseTokensReceivedForMiner DONE for', element.minerEthAddress?.substring(0,20));
         } else {
            console.log('[PAYMENT-TRACE] markPaymentsCompleteForBatch: SKIPPING already confirmed payment for', element.minerEthAddress?.substring(0,20));
         }

         }

         return true;
       }



      static  async requestCurrentChallengeNumber()
       {

         PoolLogger.debug('request challenge number')

         var self = this ;
         var result =  new Promise(function (fulfilled,error) {

           self.tokenContract.methods.getChallengeNumber().call(function(err, result){
              if(err){error(err);return;}

              fulfilled(result)

            });
          });



         return result;
       }



       static async sendSignedRawTransactionSimple(web3,txOptions,addressFrom,pKey){



          let signedTx = await new Promise((resolve, reject) => {
          web3.eth.accounts.signTransaction(txOptions, pKey, function (error, signedTx) {
            if (error) {
               PoolLogger.error('TX signing failed', error);
            // handle error
               reject(error)
            } else {
                resolve(signedTx)
            }

          })
        });



          let submittedTx = await new Promise((resolve, reject) => {
            web3.eth.sendSignedTransaction(signedTx.rawTransaction)
                .on('transactionHash', (txHash) => {
                  PoolLogger.tx(`TX hash received | ${PoolLogger.truncateHash(txHash)}`);
                  resolve({success:true, txHash: txHash})
                })
                .on('error', (reason) => {
                  PoolLogger.error('TX rejected by node');
                  PoolLogger.debug('TX rejection reason', reason);
                  reject({success:false, reason: reason})
                })

          })


            PoolLogger.debug('submittedTx result', submittedTx)

              return submittedTx


      }


  static async findOneTransactionWithQuery(query,mongoInterface){

      return await mongoInterface.findOne('transactions',query)

  }

   static async findTransactionsWithQuery(query,mongoInterface){
    return await mongoInterface.findAll('transactions',query)
  }

  static async findRecentTransactionsWithQuery(query,mongoInterface){
    return await mongoInterface.findAllSortedWithLimit('transactions',query, {block: -1}, 100)
  }



  static async updateOneTransactionById(_id, newValues, mongoInterface){
    return await mongoInterface.updateAndFindOne('transactions',{_id:_id},newValues  )
  }

  //broadcasted to the network
  static async storeEthereumTransaction(tx_hash,packetData, mongoInterface)
  {

    PoolLogger.debug(`storing eth tx ${PoolLogger.truncateHash(tx_hash)}`, packetData)


    let existingTransaction = await mongoInterface.findOne('transactions', {tx_hash: tx_hash})

    if(!existingTransaction){
      await mongoInterface.insertOne('transactions',   packetData )
    }else{
      await mongoInterface.updateOne('transactions', {tx_hash: tx_hash}, packetData )
    }




    return true
  }

  static async findEthereumTransaction(tx_hash){

    let existingTransaction = await this.mongoInterface.findOne('transactions', {tx_hash: tx_hash})

    return existingTransaction
  }

}