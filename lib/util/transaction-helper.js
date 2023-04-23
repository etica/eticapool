 

import Web3 from 'web3'
 
import ContractHelper from './contract-helper.js'
 
 
import Web3ApiHelper from './web3-api-helper.js'
import LoggingHelper from './logging-helper.js'
import PeerHelper from './peer-helper.js'
 
import web3utils from 'web3-utils'
 

var last_gasprice_minting = 10; // 10 GWei, use it to retry send txs with higher gas price in case of tx stuck in tx pool
var last_gasprice_payment = 10;
var retrytx = false;
/*
  This class should only have static methods 
*/


export default class TransactionHelper  {
 

  static async submitMiningSolution(minerAddress,solution_number,challenge_digest,challenge_number, mongoInterface,poolConfig){

    var addressFrom = poolConfig.mintingConfig.publicAddress;


   let web3 = new Web3( poolConfig.mintingConfig.web3Provider )

   var tokenContract =  ContractHelper.getTokenContract(web3, poolConfig)
   var mintMethod = tokenContract.methods.mint( solution_number,challenge_digest )

  try{
    var txCount = await web3.eth.getTransactionCount(addressFrom);
   } catch(error) {  //here goes if someAsyncPromise() rejected}
 
    LoggingHelper.appendLog( [ 'txCount error',error ], LoggingHelper.TYPECODES.ERROR , mongoInterface)

     return error;    //this will result in a resolved promise.
   }


   var addressTo = tokenContract.options.address;


    var txData = web3.eth.abi.encodeFunctionCall({
            name: 'mint',
            type: 'function',
            inputs: [{
                type: 'uint256',
                name: 'nonce'
            },{
                type: 'bytes32',
                name: 'challenge_digest'
            } ]
        }, [solution_number, challenge_digest ]);

   var max_gas_cost = 999000;
 
    var estimatedGasCost = null

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
    }


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
      txResult= await TransactionHelper.sendSignedRawTransactionSimple(web3,txOptions,addressFrom,privateKey);      
      return {success:true,txResult: txResult}
    }catch(error){   
      
      LoggingHelper.appendLog( ['estimatedGasCostError', error], LoggingHelper.TYPECODES.ERROR, mongoInterface)
      //console.log('  --debug-- mint tx rejected');
      //console.log('  --debug--  mint tx rejected error is', error);

     this.last_gasprice_minting = this.last_gasprice_minting + this.last_gasprice_minting * (20/100);

     txOptions.gasPrice = 1500000000;

     var estimatedGasCost2 = null;
     // former: gasPrice: 1500000000
     //console.log('new last gasprice minting is', this.last_gasprice_minting);
     try{
       estimatedGasCost2 = await mintMethod.estimateGas({gas: max_gas_cost, gasPrice: 300000000000, from: txOptions.addressFrom, to: txOptions.addressTo });
       console.log('estimatedGasCost2');
       console.log('estimatedGasCost2 is', estimatedGasCost2);
     }catch(error){      
       LoggingHelper.appendLog( ['estimatedGasCostError2', error], LoggingHelper.TYPECODES.ERROR, mongoInterface)
       console.log('  --debug-- mintMethod estimatedGasCostError2');
       console.log('  --debug--  mintMethod estimatedGasCostError2 error is', error);
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
      console.log('estimatedGasCost2');
      console.log('estimatedGasCost2 is', estimatedGasCost2);
    }catch(error){      
      LoggingHelper.appendLog( ['estimatedGasCostError2', error], LoggingHelper.TYPECODES.ERROR, mongoInterface)
      console.log('  --debug-- mintMethod estimatedGasCostError2');
      console.log('  --debug--  mintMethod estimatedGasCostError2 error is', error);
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

     console.log('  --debug-- multisendMethod estimatedGasCostError');
     console.log('  --debug--  multisendMethod estimatedGasCostError error is', error);

      return {success:false,reason:'predictedRevert'}
    }

    console.log('estimatedGasCost',estimatedGasCost);

    if( estimatedGasCost > max_gas_cost){
     console.log("Gas estimate too high!  Something went wrong ")
     return;
    }


    let gasPriceWei = await  Web3ApiHelper.getGasPriceWeiForTxType('batched_payment', poolConfig,mongoInterface)



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

  static  async requestTransactionReceipt(web3, tx_hash)  //not working
  {
      try{
        //console.log('  --debug-- trying to get tx receipt');
        //console.log('  --debug-- trying to get tx receipt for tx', tx_hash);
       var receipt = await  web3.eth.getTransactionReceipt(tx_hash);
       //console.log('  --debug-- passed trying to get tx receipt for tx');
       //console.log('  --debug-- passed trying to get tx receipt for tx, receipt is', receipt);
     }catch(err)
     {
      console.log('  --debug-- did not pass trying to get tx receipt for tx');
       console.error("could not find receipt ", tx_hash );
       return null;
     }
       return receipt;
  } 


    //checks each to see if they have been mined
    //rewrite this for mongo  !

     
    static async checkTransactionReceipts(txes, web3, mongoInterface)
    {
     
      //console.log('  --debug-- entering checkTransactionReceipts');
      for(let transaction of txes)
      {
        var tx_hash = transaction.txHash

        //console.log('  --debug-- entering checkTransactionReceipts stage 2');
        //console.log('  --debug-- entering checkTransactionReceipts stage 2 tx is', transaction);
        LoggingHelper.appendLog(['checkPendingSolutions',tx_hash], LoggingHelper.TYPECODES.TRANSACTION, mongoInterface)

         
        let transactionWasMined = TransactionHelper.transactionWasMined(transaction) //(transaction.status == 'success' || transaction.status == 'reverted')
 
        if( !transactionWasMined )
        {
        //console.log('  --debug-- entering checkTransactionReceipts stage 3 tx was not mined');
        //console.log('  --debug-- entering checkTransactionReceipts stage 3 tx is', tx_hash);
          var liveTransactionReceipt = await TransactionHelper.requestTransactionReceipt(web3,tx_hash)
         
          //console.log('  --debug-- reached last stage 3 pointeer for tx');
          //console.log('  --debug-- reached last stage 3 pointeer for tx tx_hash is', tx_hash);

          let n = 1; // introduce n counter to keep trying to retrieve receipt in case of failure
          while (n < 6) {

          if(liveTransactionReceipt != null)
          {
            n = 7; // stop the loop because succedded in retrieving the tx receipt

            //console.log('  --debug-- entering checkTransactionReceipts stage 4 liveTransactionReceipt != null true');
            //console.log('  --debug-- entering checkTransactionReceipts stage 4 tx is', tx_hash);
            LoggingHelper.appendLog(['got receipt',liveTransactionReceipt], LoggingHelper.TYPECODES.TRANSACTION, mongoInterface)
 
                //transactionData.mined = true;
 
                var transaction_succeeded = ((liveTransactionReceipt.status == true)
                                               || (web3utils.hexToNumber( liveTransactionReceipt.status) == 1 ))
 
                if( transaction_succeeded )
                { 
                  await TransactionHelper.updateOneTransactionById(transaction._id, {status:'success'} ,mongoInterface)
                   
                  console.log('transaction was mined and succeeded',tx_hash)

                  // Updates balance_payments to confirmed: true and increase receiveTokensReceived:
                  if(transaction.txType == 'batched_payment'){
                    TransactionHelper.markPaymentsCompleteForBatch(transaction, mongoInterface);
                  }
                

                }else {
                  await TransactionHelper.updateOneTransactionById(transaction._id, {status:'reverted'} ,mongoInterface)

                  console.log('transaction was mined and failed',tx_hash)
                }
 
          }else{

            n = n +1;
            // if n=5 we reached max attemps and we leave error console before leaving the loop:
            if(n == 5){
            //console.log('  --debug-- entering checkTransactionReceipts stage 4 but liveTransactionReceipt is null');
            //console.log('  --debug-- entering checkTransactionReceipts stage 4 but liveTransactionReceipt is null tx is', tx_hash);
            LoggingHelper.appendLog( [ 'got null receipt',tx_hash], LoggingHelper.TYPECODES.WARN, mongoInterface)
            }
          
          }
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
         var paymentsForBatch = await mongoInterface.findAll('balance_payments',{batchedPaymentUuid: batchPayment.txData.uuid})

         for( var element of paymentsForBatch )   {
          // only do it once (when confirmed not true yet):
         if(!element.confirmed){
            await mongoInterface.updateOne('balance_payments', {_id: element._id},  {txHash: batchPayment.txHash, confirmed: true} );
            await PeerHelper.increaseTokensReceivedForMiner( element.minerEthAddress, element, mongoInterface);
         }

         }

         return true;
       } 


  
      static  async requestCurrentChallengeNumber()
       {

         console.log('request challenge number')

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
               console.log(error);
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
                  console.log('on tx hash: ', txHash)
                  resolve({success:true, txHash: txHash})
                })
                .on('error', (reason) => {
                  console.log('error tx rejected by node');
                  console.log('error tx rejected by node, reason is: ', reason);
                  reject({success:false, reason: reason})
                })
     
          })
    
            
            console.log('submittedTx',submittedTx)
    
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

    console.log('storing data about eth tx ', tx_hash, packetData )

    
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