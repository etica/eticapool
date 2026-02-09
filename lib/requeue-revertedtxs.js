

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
 import PeerHelper from './util/peer-helper.js'
 import PeerInterface from './peer-interface.js'
 import web3utils from 'web3-utils'
 import os from 'os'

  import Web3 from 'web3'

  import ContractHelper from './util/contract-helper.js'
import TransactionCoordinator from './transaction-coordinator.js'
 
const PAYMENT_BROADCAST_PERIOD = 100 * 1000;

export default class RequeueReverted  {




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
      

  } 

  async requeueRevertedBatchedPaymentTransactions(mongoInterface, poolConfig){

    let revertedTransactions = await TransactionHelper.findTransactionsWithQuery({txType:'batched_payment',status:'reverted'},mongoInterface);
      console.log('revertedTransactions are', revertedTransactions);

    for(let revertedTransaction of revertedTransactions){
      console.log('one revertedTransaction reverted tx to rebroadcast is: ', revertedTransaction);

      if (!revertedTransaction.txData) {
        console.warn('requeueRevertedBatchedPaymentTransactions: skipping transaction _id=' + revertedTransaction._id + ' — txData is null/undefined');
        continue;
      }

      await TransactionCoordinator.addTransactionToQueue('batched_payment', revertedTransaction.txData ,  mongoInterface, poolConfig);
      await mongoInterface.findAndDeleteOne('transactions', {_id : revertedTransaction._id } );

    }

   }


}