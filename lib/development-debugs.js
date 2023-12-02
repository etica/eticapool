

/*

Scripts used to check pool and help for Development and Debug purpose

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

  async check_miner_diff_challenge_rewards(_challengeNumber){

    console.log('Checking rewards for challenge number: ', _challengeNumber);

    let mongoInterface = this.mongoInterface 
    let poolConfig = this.poolConfig

    
    var miners_challengediffs = await mongoInterface.findAll('miner_challengediff', {challengeNumber: _challengeNumber, status:1});
    var totalDifficulty =  await  mongoInterface.findOne('totaldiff_challengenumber', {challengeNumber: _challengeNumber, minerport: 8081}  );
    var miners_rewards = 0;
    console.log('Number miners_challengediffs is: ', miners_challengediffs.length);
    for(let oneminer_challengediff of miners_challengediffs){
      var shareCredits = Math.floor(oneminer_challengediff.totaldiff);
      let tokenRewardAmt = await PeerHelper.getTokenRewardForShareOfDifficulty(shareCredits, totalDifficulty.totaldiff, 8081, poolConfig, mongoInterface)
      miners_rewards = miners_rewards + tokenRewardAmt;
      console.log('oneminer_challengediff tokenRewardAmt is: ', tokenRewardAmt);
    }

    console.log('miners_rewards: ', miners_rewards);

   }

   async check_miner_diff_challenge_rewardfactors(_challengeNumber){

    console.log('Checking rewardfactors for challenge number: ', _challengeNumber);

    let mongoInterface = this.mongoInterface 
      let poolConfig = this.poolConfig

    
    var miners_challengediffs = await mongoInterface.findAll('miner_challengediff', {challengeNumber: _challengeNumber, status:1});
    var totalDifficulty =  await  mongoInterface.findOne('totaldiff_challengenumber', {challengeNumber: _challengeNumber, minerport: 8081}  );
    var miners_ratio = 0;
    console.log('Number miners_challengediffs is: ', miners_challengediffs.length);
    for(let oneminer_challengediff of miners_challengediffs){
      var shareCredits = Math.floor(oneminer_challengediff.totaldiff);
      let rewardFactor = PeerHelper.getRewardFactor(shareCredits, totalDifficulty.totaldiff)
      miners_ratio = miners_ratio + rewardFactor;
      console.log('oneminer_challengediff rewardFactor is: ', rewardFactor);
    }

    console.log('miners_ratio: ', miners_ratio);

   }


   
   
   async get_miner_challengediffs(_challengeNumber){

    console.log('Getting get_miner_challengediffs for : ', _challengeNumber);

    let mongoInterface = this.mongoInterface 
      let poolConfig = this.poolConfig

    
      let miners_challengediffs = await mongoInterface.findAll('miner_challengediff', {challengeNumber: _challengeNumber, minerport: 8081});
      var miners_ratio = 0;
        console.log('Number get_miner_challengediffs is: ', miners_challengediffs.length);
      for(let oneminer_challengediff of miners_challengediffs){
        console.log('oneminer_challengediff rewardFactor is: ', oneminer_challengediff);
      }

    console.log('miners_ratio: ', miners_ratio);

   }

}