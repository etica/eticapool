
 
import Web3 from 'web3'
import web3utils from 'web3-utils'

import PeerHelper from './peer-helper.js'
import ContractHelper from './contract-helper.js'

import LoggingHelper from './logging-helper.js'
import events from 'events';

export default class TokenDataHelper extends events.EventEmitter {

   
    
    static async getChallengeNumber(mongoInterface){
        let recentMiningContractData = await TokenDataHelper.getRecentMiningContractData(mongoInterface)

       return recentMiningContractData.challengeNumber 

    }


    static async getMiningDifficultyTarget(mongoInterface){
      let recentMiningContractData = await TokenDataHelper.getRecentMiningContractData(mongoInterface)

     return recentMiningContractData.miningDifficulty

  }

    static async getMiningReward(mongoInterface){
      let recentMiningContractData = await TokenDataHelper.getRecentMiningContractData(mongoInterface)

    return recentMiningContractData.miningReward

  }
 
    static async getMineableTokenToEthPriceRatio(mongoInterface){

      let priceOracleData = await TokenDataHelper.getPriceOracleData(mongoInterface)
        return priceOracleData.price_ratio_eth 
    }

    static async getPriceOracleData(mongoInterface){

       return  await mongoInterface.findOne('priceOracle', {} )
         
    } 


    static async getPoolDifficultyTarget(mongoInterface){
      let recentMiningContractData = await TokenDataHelper.getRecentMiningContractData(mongoInterface)

     return recentMiningContractData.miningTarget 

  }

    //there should only ever be one   record 
    static async getRecentMiningContractData(mongoInterface){

        return await mongoInterface.findOne('miningContractData', {} )
 
     }

     static async getLastMiningContracts(mongoInterface, nbcontracts){

      var miningContracts = await mongoInterface.findAllSortedWithLimitonString('allminingContracts', {}, {epochCount:-1}, nbcontracts );
      return miningContracts;

   }

      //there should only ever be one   record 
     static async getEthBlockNumber(mongoInterface){

      let ethBlockNumberRecord =  await mongoInterface.findOne('ethBlockNumber', {} ) 

        
        if(ethBlockNumberRecord){
          return ethBlockNumberRecord.ethBlockNumber
        }
        
      return null 
   }


  static async collectTokenParameters(tokenContract, web3,  mongoInterface  )
  {
    if(typeof tokenContract == 'undefined'){
      console.log('WARN: Could not collect token parameters')
      return 
    }
    

    var miningDifficultyString = await tokenContract.methods.getMiningDifficulty().call()  ;

    var miningDifficulty = parseInt(miningDifficultyString)

    var miningTargetString = await tokenContract.methods.getMiningTarget().call()  ;
    var miningTarget = web3utils.toBN(miningTargetString)

    var challengeNumber = await tokenContract.methods.getChallengeNumber().call() ;
    
    var epochCount = await tokenContract.methods.epochCount().call();
    
    var miningReward = await tokenContract.methods.getMiningReward().call() ;    

    let unixTime = PeerHelper.getTimeNowSeconds()

    
    var existingMiningContractData = null

    try{ 

        existingMiningContractData = await TokenDataHelper.getRecentMiningContractData(mongoInterface)

    }catch(error){
      console.log(error)
    }
 
      var ethBlockNumber = await new Promise(function (fulfilled,error) {
            web3.eth.getBlockNumber(function(err, result)
          {
            if(err){error(err);return}
            // console.log('eth block number ', result )
            fulfilled(result);
            return;
          });
       });


    // check if we've seen this challenge before

    let updatedEthBlock =  await mongoInterface.upsertOne('ethBlockNumber', {}, {ethBlockNumber: ethBlockNumber} )  // self.redisInterface.loadRedisData('challengeNumber' )
  
  

    if (existingMiningContractData == null ||   challengeNumber != existingMiningContractData.challengeNumber) {


      let newMiningContractData = {
        challengeNumber: challengeNumber,
        epochCount: epochCount, // added field epochCount, used by PeerInterface -> rewardCrawl() to query
        miningTarget: miningTarget.toString(),
        miningDifficulty: miningDifficulty,
        miningReward: miningReward,
        updatedAt: unixTime
      }

      let updated =  await mongoInterface.upsertOne('miningContractData', {}, newMiningContractData );  // only oneminingContractData is stored in db
      let recorded =  await mongoInterface.upsertOne('allminingContracts', {epochCount: epochCount} ,newMiningContractData ); // all miningContracts Data are stored in db

      var TotalDiffexist = await mongoInterface.findOne('totaldiff_challengenumber', {challengeNumber: challengeNumber, minerport:8080})
      if( !TotalDiffexist )
      { 
      let TotalDiff = {
        challengeNumber: challengeNumber,
        totaldiff: 0,
        minerport:8080
      }
       let inserted = await mongoInterface.insertOne('totaldiff_challengenumber', TotalDiff);
       
      }

      var TotalDiffHardexist = await mongoInterface.findOne('totaldiff_challengenumber', {challengeNumber: challengeNumber, minerport:8081})
      if( !TotalDiffHardexist )
      { 
      let TotalDiffHard = {
        challengeNumber: challengeNumber,
        totaldiff: 0,
        minerport: 8081
      }
       let insertedhard = await mongoInterface.insertOne('totaldiff_challengenumber', TotalDiffHard);
       
       // Inform miner workers using stratum server sockets of new challenge number:
       this.emit('newChallenge', newMiningContractData);
       
      }

      //LoggingHelper.appendLog( [ 'collectTokenParameters'   ], LoggingHelper.TYPECODES.GENERIC, mongoInterface)
 

    }
   
  }

  // ---------  Updates poolAccountBalances field in mongo DB ---------- //
  static async collectPoolAccountBalances(poolConfig,  mongoInterface  )
  {

    let mintingWeb3 = new Web3(poolConfig.mintingConfig.web3Provider)
    let paymentsWeb3 = new Web3(poolConfig.paymentsConfig.web3Provider)

    let mintingAccountAddress = poolConfig.mintingConfig.publicAddress
    let paymentsAccountAddress = poolConfig.paymentsConfig.publicAddress

    let batchedPaymentsContractAddress = ContractHelper.getBatchedPaymentContractAddress(poolConfig) // return a contract address

     
    const mintingTokenContract = ContractHelper.getMintingTokenContract( mintingWeb3,  poolConfig  )  
    const paymentsTokenContract = ContractHelper.getPaymentsTokenContract( paymentsWeb3,  poolConfig  )  

   

     
    let poolAccountBalances = {  
       mintingAccountBalances: {},
       paymentsAccountBalances: {},
       tokensApprovedToBatchPayments:0 ,
       updatedAt: PeerHelper.getTimeNowSeconds()

    }

    /* ------ Get current balance of ETH of minting and payment Contracts  ------- */
    poolAccountBalances.mintingAccountBalances['ETH'] = await mintingWeb3.eth.getBalance(mintingAccountAddress);
    poolAccountBalances.paymentsAccountBalances['ETH'] = await paymentsWeb3.eth.getBalance(paymentsAccountAddress);

    poolAccountBalances.mintingAccountBalances['token'] = await mintingTokenContract.methods.balanceOf(mintingAccountAddress).call()
    poolAccountBalances.paymentsAccountBalances['token'] = await paymentsTokenContract.methods.balanceOf(batchedPaymentsContractAddress).call()
    /* ------ Get current balance of ETH of minting and payment Contracts  ------- */

    /* ------  Check it , not sure what it does yet ------------- */
    poolAccountBalances.tokensApprovedToBatchPayments = await paymentsTokenContract.methods.allowance(paymentsAccountAddress, batchedPaymentsContractAddress  ).call()
    /* ------  Check it , not sure what it does yet ------------- */

    let updated =  await mongoInterface.upsertOne('poolAccountBalances', {}, poolAccountBalances )  // self.redisInterface.loadRedisData('challengeNumber' )
 
   // LoggingHelper.appendLog( ['collectPoolAccountBalances' , poolAccountBalances ], LoggingHelper.TYPECODES.GENERIC, mongoInterface)
 
  }

 
  
  static async getChallengeNumber(mongoInterface){
    let recentMiningContractData = await TokenDataHelper.getRecentMiningContractData(mongoInterface)

   return recentMiningContractData.challengeNumber 

}

//there should only ever be one miningContractData record 
static async getRecentMiningContractData(mongoInterface){

    return await mongoInterface.findOne('miningContractData', {} )   

 }

 static async getPoolAccountBalancesData(mongoInterface){
     return await mongoInterface.findOne('poolAccountBalances', {} ) 

 }





}