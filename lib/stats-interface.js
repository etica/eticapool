


//const Tx = require('ethereumjs-tx') ///handle this like the updated coinpurse.cc relay  code 

import PeerHelper from './util/peer-helper.js';
import TokenDataHelper from './util/token-data-helper.js';
  
import web3Utils from 'web3-utils';

import  cron from 'node-cron'
import Web3 from 'web3'
 
/**

**/


export default class StatsInterface {
  
  constructor( mongoInterface, poolConfig  ){
    this.mongoInterface=mongoInterface;
    this.poolConfig = poolConfig;

    this.web3 = new Web3(poolConfig.mintingConfig.web3Provider);
   
  
  }

  async init(){

  
  }

  async  update()
  {
    StatsInterface.CalculateCurrentStatsPayment(this.mongoInterface,this.poolConfig);
    setInterval(function(){ StatsInterface.CalculateCurrentStatsPayment(this.mongoInterface,this.poolConfig)}.bind(this) , 20*1000) // Every hour
  } 


  // Payments stats:
  static async CalculateCurrentStatsPayment(mongoInterface, poolConfig)
    { 
  
      var min_balance_for_transfer = poolConfig.paymentsConfig.minBalanceForTransfer; //this is in token-satoshis
      
      var minerList =  await PeerHelper.getMinerList(mongoInterface)
      var total_coins_owed = 0;
      var total_next_coins_batchs = 0;

      var actual_total_coins_owed = 0;
      var actual_total_next_coins_batchs = 0;
      
      for(let minerData of minerList) //reward each miner
      {
        //console.log('Minerdata is', minerData);
     
        let minerAddress = minerData.minerEthAddress
  
        // var miner_token_balance = minerData.tokenBalance;
  
        if(typeof minerData.alltimeTokenBalance == 'undefined') minerData.alltimeTokenBalance = 0;
        if(typeof minerData.tokensAwarded == 'undefined') minerData.tokensAwarded = 0;
  
         var coins_owed = 0;
         if( minerData.alltimeTokenBalance > 0 && minerData.alltimeTokenBalance > minerData.tokensAwarded)
         {  
             coins_owed = Math.floor(minerData.alltimeTokenBalance - minerData.tokensAwarded);
             total_coins_owed = total_coins_owed + coins_owed;
            
             console.log('minerAddress owed coins is: ', coins_owed);
             if(coins_owed > min_balance_for_transfer){
              total_next_coins_batchs = total_next_coins_batchs + coins_owed;

              console.log('web3Utils.isAddress( minerAddress )', minerAddress, 'is: ', web3Utils.isAddress( minerAddress ));

              if(coins_owed > min_balance_for_transfer
              && web3Utils.isAddress( minerAddress )){
                console.log('passed1')
                actual_total_next_coins_batchs = actual_total_next_coins_batchs + coins_owed;
              }

             }

             if(web3Utils.isAddress( minerAddress )){
                console.log('passed2')
                actual_total_coins_owed = actual_total_coins_owed + coins_owed;
              }

         }
          
  
      }
  
      console.log('total_coins_owed is: ', total_coins_owed); 
      console.log('total_next_coins_batchs is: ', total_next_coins_batchs);

      console.log('actual_total_coins_owed is: ', actual_total_coins_owed); 
      console.log('actual_total_next_coins_batchs is: ', actual_total_next_coins_batchs);

      let poolAccountBalances = await TokenDataHelper.getPoolAccountBalancesData(mongoInterface);
      const poolpaymentsAccountBalances = poolAccountBalances.paymentsAccountBalances['token'];
      const mintingAccountBalances = poolAccountBalances.mintingAccountBalances['token'];

      var lastpoolMint =  await  mongoInterface.findAllSortedWithLimitonString('pool_mints', {poolstatus: 2}, {epochCount:-1}, 1);

      var paymentStats =  {
        lastpoolMintId: lastpoolMint._id,
        epochCount: lastpoolMint.epochCount,
        pool_payments_balance: poolpaymentsAccountBalances,
        pool_minting_balance: mintingAccountBalances,
        total_coins_owed: total_coins_owed,
        total_next_coins_batchs: total_next_coins_batchs,
        actual_total_coins_owed: actual_total_coins_owed,
        actual_total_next_coins_batchs: actual_total_next_coins_batchs,
        time: PeerHelper.getTimeNowSeconds()
       };
       
       await mongoInterface.insertOne("stats_payment", paymentStats )

    }


}
