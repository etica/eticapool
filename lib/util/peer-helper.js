


 
import TokenDataHelper from "./token-data-helper.js";
import Web3ApiHelper from "./web3-api-helper.js";
import LoggingHelper from "./logging-helper.js";

 
import web3utils from 'web3-utils'

export default class PeerHelper {


// ----------  Get Now time info (not blockchain but local using new Date() )  -----------  //

    //this is in seconds -- for now 
    static getTimeNowSeconds()
    {
      return Math.round((new Date()).getTime() / 1000);
    } 

    static getTimeNowUnix()
    {
      return Math.round((new Date()).getTime() );
    }
    
    // ----------  Get Now time info (not blockchain but local using new Date() )  -----------  //



    // ----------  Get Pool Minimum Difficulty and Pool Minimum Share Target from parameter object poolConfig -----------  //
    static getPoolMinimumShareDifficulty(poolConfig)
    {
      return  poolConfig.miningConfig.minimumShareDifficulty;
    } 


    static getPoolMinimumShareTarget( poolConfig ) //compute me
    { 
       let diff =   PeerHelper.getPoolMinimumShareDifficulty( poolConfig )
      
      return this.getTargetFromDifficulty(diff);
    } 

  // ----------  Get Pool Minimum Difficulty, Pool Minimum Share Target from parameter object poolConfig -----------  //


      
  // ----------  Hard: Get Pool Minimum Difficulty Hard and Pool Minimum Share Target from parameter object poolConfig -----------  //
      static getPoolMinimumShareDifficultyHard(poolConfig)
      {
        return  poolConfig.miningConfig.minimumShareDifficultyHard;
      } 
  
  
      static getPoolMinimumShareTargetHard( poolConfig ) //compute me
      { 
         let diff =   PeerHelper.getPoolMinimumShareDifficultyHard( poolConfig );
        
        return this.getTargetFromDifficulty(diff);
      } 
  
    // ----------  Hard: Get Pool Minimum Difficulty Hard, Pool Minimum Share Target from parameter object poolConfig -----------  //
 



   // ----------  Get Current Target from Difficulty -----------  //
    static getTargetFromDifficulty(difficulty)
    {
    
      var max_target = web3utils.toBN('2').pow(web3utils.toBN('256')).sub(web3utils.toBN('1'));

      const difficultyBN = web3utils.toBN(difficulty);
 
      var current_target = max_target.div(difficultyBN);
 
      return current_target ;
    } 
   // ----------  Get Current Target from Difficulty -----------  //
 

   
   // ----------  Get Pool Data (Token Fee, Minting address, Payment Address) -----------  //
   static   getPoolData(poolConfig)
    {
      return {
        tokenFee: this.poolConfig.poolTokenFee,
        mintingAddress: this.accountConfig.minting.address,
        paymentAddress: this.accountConfig.payment.address
      }
    } 
   // ----------  Get Pool Data (Token Fee, Minting address, Payment Address) -----------  //
    

    static getPoolEthAddress(poolConfig)
    {

      return poolConfig.mintingConfig.publicAddress

      
    } 

    
 
  // ---------  Get Balance of Payments of a specific Miner from Mongo DB ------------  //
    static async getMinerBalancePayments(minerAddress,  mongoInterface)
    { 
      var payments = await mongoInterface.findAllSortedWithLimit('balance_payments',{minerEthAddress: minerAddress.toString().toLowerCase()}, {block:-1} , 100)
   
      return payments

    }
   // ---------  Get Balance of Payments of a specific Miner from Mongo DB ------------  //



  // ---------  Get Details of challenges of a specific Miner from Mongo DB ------------  //
  static async getMinerChallengeDetails(minerAddress, nbchallenges, mongoInterface)
  { 
    
    // Protects against too many request to protect server ressources
    if(nbchallenges > 10){
       nbchallenges = 10;
    }
    var miningContracts = await mongoInterface.findAllSortedWithLimitonString('allminingContracts', {}, {epochCount:-1}, nbchallenges );
    
    var challenges = [];
    for(let [index, oneminingcontract] of miningContracts.entries()){
      var challengedetails = {};
      challengedetails.miningcontract = oneminingcontract;
      challengedetails.miner_challengediff =  await mongoInterface.findOne('miner_challengediff', {challengeNumber: oneminingcontract.challengeNumber, minerEthAddress: minerAddress.toString().toLowerCase()});
      challengedetails.TotalDiffHard = await mongoInterface.findOne('totaldiff_challengenumber', {challengeNumber: oneminingcontract.challengeNumber, minerport: 8888}); 

      challenges[index] = challengedetails;
    }

   return challenges
  }
  // ---------  Get Details of challenges of a specific Miner ------------  //


    // --------- Get Specific Miner or Create Miner if dont exist -------- //
    //this finds or creates miner data 
  static async getMinerData(minerEthAddress, mongoInterface)
  {
    
    if(minerEthAddress)
    {
      var minerData  = await mongoInterface.findOne("minerData", {minerEthAddress: minerEthAddress.toString().toLowerCase() } );

      if(minerData  == null)
      {
        let newMinerData =  PeerHelper.getDefaultMinerData(minerEthAddress)
        
        await mongoInterface.insertOne("minerData", newMinerData)

        
        return await mongoInterface.findOne("minerData", {minerEthAddress: minerEthAddress.toString().toLowerCase() } );

      }

      
       return minerData 
    }

     return null;

  } 
     // --------- Get Specific Miner or Create Miner if dont exist -------- //

    // --------- Get Specific Miner (with workers) or Create Miner if dont exist -------- //
    //this finds or creates miner data 
  static async getMinerDataWithWorkers(minerEthAddress, mongoInterface)
  {
    
    if(minerEthAddress)
    {
      var minerData  = await mongoInterface.findOne("minerData", {minerEthAddress: minerEthAddress.toString().toLowerCase() } );

      if(minerData  == null)
      {
        let newMinerData =  PeerHelper.getDefaultMinerData(minerEthAddress)
        
        await mongoInterface.insertOne("minerData", newMinerData)

        
        return await mongoInterface.findOne("minerData", {minerEthAddress: minerEthAddress.toString().toLowerCase() } );

      }

        const addressBlockchain = minerEthAddress.toString().substr(0, 42);

        // Fetch workers data
        const workersData = await mongoInterface.findAllSortedWithLimit('minerData', {addressBlockchain: addressBlockchain.toLowerCase(), workerName: { $exists: true, $ne: null }}, {avgHashrate:-1}, 1000);

            let totalAvgHashrate = 0;
            let totalTokensAwarded = 0;
            let totalTokensReceived = 0;
            let totalAlltimeTokenBalance = 0;
            let totalLast24hTokenBalance = 0;

        if(workersData && workersData.length > 0){

            // Add workers to minerData and calculate totals
            minerData.workers = workersData.map(worker => {
                totalAvgHashrate += worker.avgHashrate || 0;
                totalTokensAwarded += worker.tokensAwarded || 0;
                totalTokensReceived += worker.tokensReceived || 0;
                totalAlltimeTokenBalance += worker.alltimeTokenBalance || 0;
                totalLast24hTokenBalance += worker.last24hTokenBalance || 0;

                return {
                    workerName: worker.workerName,
                    minerEthAddress: worker.minerEthAddress,
                    avgHashrate: worker.avgHashrate,
                    tokenBalance: worker.tokenBalance,
                    alltimeTokenBalance: worker.alltimeTokenBalance,
                    last24hTokenBalance: worker.last24hTokenBalance,
                    tokensAwarded: worker.tokensAwarded,
                    tokensReceived: worker.tokensReceived,
                    lastSubmittedSolutionTime: worker.lastSubmittedSolutionTime,
                    entryport: worker.entryport
                };
            });

        }

        // Use default values if any of the fields are null
        const avgHashrate = minerData.avgHashrate || 0;
        const tokensAwarded = minerData.tokensAwarded || 0;
        const tokensReceived = minerData.tokensReceived || 0;
        const alltimeTokenBalance = minerData.alltimeTokenBalance || 0;
        const last24hTokenBalance = minerData.last24hTokenBalance || 0;

        // Update minerData with calculated totals
        minerData.totalAvgHashrate = avgHashrate + totalAvgHashrate;
        minerData.totalTokensAwarded = tokensAwarded + totalTokensAwarded;
        minerData.totalTokensReceived = tokensReceived + totalTokensReceived;
        minerData.totalAlltimeTokenBalance = alltimeTokenBalance + totalAlltimeTokenBalance;
        minerData.totalLast24hTokenBalance = last24hTokenBalance + totalLast24hTokenBalance;
      
       return minerData 
    }

     return null;

  } 
     // --------- Get Specific Miner or Create Miner if dont exist -------- //
 

    // -------  Returns Empty Object with structure of Miner fields to store in Mongo DB  -------- //
  static getDefaultMinerData(minerEthAddress){

    if(minerEthAddress == null) minerEthAddress = "0x0"; //this should not happen

    return {
      minerEthAddress: minerEthAddress.toString().toLowerCase(),
       shareCredits: 0,
      tokenBalance: 0, //what the pool owes currenc..deprecated
      alltimeTokenBalance: 0,  //total amt pool owes (total amt mined)
      tokensAwarded:0, //total amt added to balance payments !
      tokensReceived:0, //total amt confirmed and verified sent to miner !
   //   varDiff: 1, //default
       validSubmittedSolutionsCount: 0,
      lastSubmittedSolutionTime: 0
    }
  }
   // -------  Returns Empty Object with structure of Miner fields to store in Mongo DB  -------- //

   // -------  Returns Empty Object with hashrate field  -------- //
  static getDefaultSharesData(minerEthAddress){

    if(minerEthAddress == null) minerEthAddress = "0x0"; //this should not happen

    return {
      minerEthAddress: minerEthAddress.toString().toLowerCase(),
       shareCredits: 0,
      // varDiff: 1, //default
       validSubmittedSolutionsCount: 0,
       hashrate: 0
    }
  } 
   // -------  Returns Empty Object with hashrate field  -------- //

   
   // -------  Returns total totalShares by adding from all Miners  -------- //
  static async getTotalMinerShares(mongoInterface)
  {

    var allMinerData  = await PeerHelper.getMinerList(mongoInterface)
 


    var totalShares = 0;

    for(let minerData of  allMinerData)
    { 
      var minerShares = minerData.shareCredits;

      totalShares += minerShares;
    }

    //console.log('---- debug got miner total shares', totalShares)
    return totalShares;

  } 
   // -------  Returns total totalShares by adding from all Miners  -------- //

   // -------  Returns total totalHashrate by adding from all Miners  -------- //
  static async getTotalMinerHashrate(mongoInterface)
  {

    var allMinerData  = await PeerHelper.getMinerList(mongoInterface)
  
 
    var totalHashrate = 0;

    for(let minerData of  allMinerData)
    { 
         
       var hashrate = parseInt(minerData.hashRate)

      if(hashrate)
      {
        totalHashrate += hashrate;
      }

    }

    // console.log('---debug got miner total hashrate', totalHashrate)
    return totalHashrate;

  } 
   // -------  Returns total totalHashrate by adding from all Miners  -------- //


   // -------  Updates minerData fields shareCredits, validSubmittedSolutionsCount  -------- //
  static async awardShareCredits( minerEthAddress, shareCredits , mongoInterface)
  {


    let minerData = await PeerHelper.getMinerData(minerEthAddress, mongoInterface)

    await mongoInterface.updateOneCustom('minerData',{_id: minerData._id }, {$inc:{
      shareCredits: parseInt(shareCredits),
      validSubmittedSolutionsCount: 1 
    }} )
   
  } 
   // -------  Updates minerData fields shareCredits, validSubmittedSolutionsCount  -------- //
  

   // -------  Returns MinerShares from a specific Miner  -------- //
  static async getMinerShares(minerEthAddress, mongoInterface)
  {
    if(minerEthAddress)
    {
      minerEthAddress = minerEthAddress.toString().toLowerCase()


      var sharesData = await mongoInterface.findAllSortedWithLimit("miner_shares", {minerEthAddress: minerEthAddress}, {block:-1},100 );

      if(sharesData)
      {
         return  sharesData  ;
      }

      
    }

    return [] 

  }
   // -------  Returns MinerShares from a specific Miner  -------- //


      // -------  Returns MinerPreShares from a specific Miner  -------- //
  static async getMinerPreShares(minerEthAddress, mongoInterface)
  {
    if(minerEthAddress)
    {
      minerEthAddress = minerEthAddress.toString().toLowerCase()


      var sharesData = await mongoInterface.findAllSortedWithLimit("miner_pendingshares", {minerEthAddress: minerEthAddress}, {time:-1},100 );

      if(sharesData)
      {
         return  sharesData  ;
      }

      
    }

    return [] 

  }

  static async getLastMinerPreShare(minerEthAddress, mongoInterface)
  {
    if(minerEthAddress)
    {
      minerEthAddress = minerEthAddress.toString().toLowerCase()


      var sharesData = await mongoInterface.findAllSortedWithLimit("miner_pendingshares", {minerEthAddress: minerEthAddress}, {time:-1},1 );

      if(sharesData)
      {
         return  sharesData  ;
      }

      
    }

    return [] 

  }
   // -------  Returns MinerPreShares from a specific Miner  -------- //


   
  // -------  Updates alltimeTokenBalance field (with value tokenRewardAmt) for a specific Miner on Mongo DB -------- //
  static async awardTokensBalanceForShares( minerEthAddress, difficulty , totaldiff, minerport, poolmint, challengenumber, poolConfig, mongoInterface)
  {

   var minerData = await PeerHelper.getMinerData(minerEthAddress,mongoInterface)
 
   //var sharesData = await PeerHelper.getSharesData(minerEthAddress,mongoInterface)
 
    //shareCredits is an int 
    let [tokenRewardAmt, bonusRewardAmt] = await PeerHelper.getTokenRewardForShareOfDifficulty(difficulty, totaldiff, minerport, poolConfig, mongoInterface)

     
    let tokensAwarded = Math.floor(  tokenRewardAmt );

    if(isNaN(tokensAwarded) || tokensAwarded == 0){
      LoggingHelper.appendLog( [ 'WARN: no tokens awardable for ',minerEthAddress, tokensAwarded ], LoggingHelper.TYPECODES.WARN , mongoInterface)

 
      return false 
    }

    let bonusAwarded = Math.floor(  bonusRewardAmt ); // ETI bonus amount

    await mongoInterface.updateOneCustom('minerData', {_id: minerData._id}, 
            {$inc:{alltimeTokenBalance: tokensAwarded}}   )

            var addressBlockchain = null;

            if(minerData.addressBlockchain){
              addressBlockchain = minerData.addressBlockchain;
            }

            // ppnls_rewards table used only for stats metrics displayed to users, the reward system sends same values but direclty from minerData alltimeTokenBalance
            var PpnlsReward =  {
              minerDataId: minerData._id,
              poolMintId: poolmint._id,
              epochCount: poolmint.epochCount,
              minerEthAddress: minerEthAddress,
              addressBlockchain: addressBlockchain,
              ChallengeNumber: challengenumber,
              shares: difficulty,
              poolshares: totaldiff,
              tokensAwarded: tokensAwarded,
              createdAt: PeerHelper.getTimeNowSeconds()
             };
             
             if (bonusAwarded > 0 && !(isNaN(bonusAwarded))) {
              PpnlsReward.bonusAwarded = bonusAwarded;
             }
             
            await mongoInterface.insertOne("ppnls_rewards", PpnlsReward );


            await mongoInterface.upsertOneCustom(
              'poolGlobalMetrics',
              { metricName: "totalBonusAwarded" },
              {
                $inc: { totalBonusAwarded: bonusAwarded },
                $setOnInsert: { createdAt: new Date() }
              }
            );

      //LoggingHelper.appendLog( [ 'miner data - award tokenbalance ', minerEthAddress,tokensAwarded ], LoggingHelper.TYPECODES.SHARES, mongoInterface)

  } 
  // -------  Updates alltimeTokenBalance field (with value tokenRewardAmt) for a specific Miner on Mongo DB -------- //


    // -------  Increases total tokenreceived amount for a specific Miner on Mongo DB -------- //
    // ------- Function added to have a metric for total tokens sent by pool to miner address -------- //
    static async increaseTokensReceivedForMiner( minerEthAddress, balance_payment, mongoInterface)
    {
  
     var minerData = await PeerHelper.getMinerData(minerEthAddress,mongoInterface)

  
      let tokensReceived = minerData.tokensReceived;
  
      if(isNaN(tokensReceived)){
        //LoggingHelper.appendLog( [ 'WARN: no tokens awardable for ',minerEthAddress, tokensAwarded ], LoggingHelper.TYPECODES.WARN , mongoInterface)
        //console.log(' --debug-- setting tokensReceived to 0 for settup');
        tokensReceived = 0;
   
        //return false 
      }
  
      //console.log('  --debug--  updating minerData tokensReceived');
      await mongoInterface.updateOneCustom('minerData', {_id: minerData._id}, 
              {$inc:{tokensReceived: balance_payment.amountToPay}}   )
  
        LoggingHelper.appendLog( [ 'miner data - increased tokensReceived ', minerEthAddress,tokensReceived ], LoggingHelper.TYPECODES.SHARES, mongoInterface)
  
    } 
    // -------  Increases total tokenreceived amount for a specific Miner on Mongo DB -------- //



  

  /*
    This is multiplied by share credits (difficulty) to determine the number of tokens to reward
    This depends on:

    The difficulty of 0xbtc (avg 0xbtc per share)

    Less fees:      
    The estimated % of 0xbtc wasted on gas fees 

    
  */


  // -------  Returns netReward for specific miner based on its sharediff compared to totaldiff. taking into Bloackreward, account Pool fees and shareDiff and totalDifficulty  -------- //
  static async getTokenRewardForShareOfDifficulty(shareDiff, totalDiff, minerport, poolConfig, mongoInterface){


   // --> Now Gets total diff for this challenge number:
   // --> var totalDifficulty =  await  mongoInterface.findOne('totaldiff_challengenumber', {challengeNumber: challengeNumber}  );
   // --> totalDiff is totalDifficulty.totaldiff

    if(isNaN(totalDiff)){
      console.log('ERROR: totalDifficulty missing')
      return 0
    }


    let rewardFactor = PeerHelper.getRewardFactor(shareDiff,totalDiff)


    let totalBlockReward = await TokenDataHelper.getMiningReward(mongoInterface)
    if(isNaN(totalBlockReward)){
      console.log('ERROR: totalBlockReward missing')
      return 0
    }

    if(minerport != 8888){
      totalBlockReward = (totalBlockReward * 0) / 100; // low difficulty shares get 0% of rewards
    }

    let poolFeesMetrics = await PeerHelper.getPoolFeesMetrics(poolConfig, mongoInterface)
    let poolFeesFactor = poolFeesMetrics.overallFeeFactor
    let poolRewardsBonus = poolFeesMetrics.poolRewardsBonus

    //make pool fees factor above 0.005 
    if(poolFeesFactor < 0.005){
     poolFeesFactor = 0.005
    } 
   
    // max 10%
    if(poolFeesFactor > 0.10){
     poolFeesFactor = 0.10
    }

    // max 100% Bonus
    if(poolRewardsBonus > 1){
      poolRewardsBonus = 1
     }

    let netBlockReward = totalBlockReward * PeerHelper.constrainToPercent(1.0 - poolFeesFactor) 

    let netReward = rewardFactor * netBlockReward; 

    // netreward can't be more than 30 eti per block, adding security in case of unexpected miscalculation. 
    // Never should this happen (unless one miner has almost all hashrate on the pool) but always good to have since otherwise could deplete mining pool funds
    if(netReward > totalBlockReward){
      netReward = netBlockReward; // 31.963 eti (current block reward) max to protect against any unpredicted bug
    }

    let netBonus = 0;

    if(poolRewardsBonus && poolRewardsBonus > 0){
      netBonus = netReward * poolRewardsBonus;
    }

    netReward = netReward + netBonus;

    // netreward can't be more than 2 times block reward (since max poolRewardsBonus is 100%), adding security in case of unexpected miscalculation. 
    // This should never happen (unless one miner has almost all hashrate on the pool) but always good to have since otherwise could deplete mining pool funds
    if(netReward > totalBlockReward * 2){
      netReward = netBlockReward * 2; // 31.963 eti (current block reward) max to protect against any unpredicted bug
    }
    
    return [netReward, netBonus];
  }
  // -------  Returns netReward for specific miner based on its sharediff compared to totaldiff. taking into Bloackreward, account Pool fees and shareDiff and totalDifficulty  -------- //


  //Just out of security but shareDiff / totalDiff  > 1 can't happen
  static getRewardFactor(shareDiff, totalDiff){
    return Math.min( ( shareDiff / totalDiff  ) , 1.0 ) 
  }
 

  // -------  Returns object with global Mining reward and Pool data  -------- //
  static async getPoolFeesMetrics(poolConfig, mongoInterface){

    let poolBaseFee = PeerHelper.constrainToPercent(poolConfig.mintingConfig.poolTokenFee / 100.0)

    let miningRewardRaw = await TokenDataHelper.getMiningReward(mongoInterface)
    let token_Eth_Price_Ratio = await TokenDataHelper.getMineableTokenToEthPriceRatio(mongoInterface)

    if(!token_Eth_Price_Ratio || token_Eth_Price_Ratio == 0){
      console.log('WARN: Missing price oracle for pool fees factor')
      return 1
    }

    const TOKEN_DECIMALS = 18 

    let miningRewardFormatted = Web3ApiHelper.rawAmountToFormatted(miningRewardRaw, TOKEN_DECIMALS) 

    let miningRewardInEth = (miningRewardFormatted * PeerHelper.constrainToPercent(token_Eth_Price_Ratio))

    let avgGasPriceGWei = 10
    
    const gasRequiredForMint = 94626
    const ethPerGWei = 0.000000001
    

    let ethRequiredForMint = gasRequiredForMint * avgGasPriceGWei * ethPerGWei

    
    //let gasFee = PeerHelper.constrainToPercent(ethRequiredForMint / miningRewardInEth);
    let gasFee = 0; // set gasFee to 0

    // poolRewardsBonus:
    var poolRewardsBonus = 0;
    if(poolConfig.paymentsConfig.poolRewardsBonus && poolConfig.paymentsConfig.poolRewardsBonus > 0){
       poolRewardsBonus = PeerHelper.constrainToPercent(poolConfig.paymentsConfig.poolRewardsBonus / 100.0);
    }
    

    return  {
      poolBaseFee: poolBaseFee ,
      gasCostFee:gasFee,

      token_Eth_Price_Ratio: token_Eth_Price_Ratio, 

      miningRewardRaw: miningRewardRaw,
      miningRewardFormatted: miningRewardFormatted,  
      miningRewardInEth: miningRewardInEth, 

      avgGasPriceGWei: avgGasPriceGWei,
      miningRewardInEth: miningRewardInEth,
      ethRequiredForMint: ethRequiredForMint,
      overallFeeFactor: PeerHelper.constrainToPercent(poolBaseFee + gasFee),
      poolRewardsBonus: poolRewardsBonus

    }


  }
  // -------  Returns object with global Mining reward and Pool data  -------- //


  static constrainToPercent(x){
    return Math.min(Math.max(x,0), 1)
  }
   

  //this needs to use config adn oracles 
  static async getMaxGweiPriceUntilMiningSuspension(poolConfig, mongoInterface){
    return 100
  }
  
    // -------  Returns all Miners  -------- //
   static  async getMinerList( mongoInterface )
    {
        
        let minerData = await mongoInterface.findAll( "minerData", {} )  
        return minerData;
 
    } 
   // -------  Returns all Miners  -------- //

   // -------  Returns active Miners  -------- //
   static  async getActiveMinerList( _duration, mongoInterface )
    {

        const unixTime = PeerHelper.getTimeNowSeconds() - _duration
        
        let minerData = await mongoInterface.findAll( "minerData", {lastSubmittedSolutionTime: {$gt: unixTime}})
        
        return minerData;
 
    } 
   // -------  Returns active Miners  -------- //


   // -------  Returns Miners that still have an avgHashrate > 0 but need to be turned off because last submited share long time ago -------- //
   static  async getNeedTurnOffMinerList( _duration, mongoInterface )
    {

        const unixTime = PeerHelper.getTimeNowSeconds() - _duration
        
        let minerData = await mongoInterface.findAll( "minerData", {lastSubmittedSolutionTime: {$lt: unixTime}, avgHashrate: {$gt: 0}})
        
        return minerData;
 
    } 
   // -------  Returns active Miners  -------- //

     
    // -------  Returns all Shares  -------- //
    static  async getShareList( mongoInterface )
    {
        
        let minerShares = await mongoInterface.findAll( "miner_shares", {} )
        
        return minerShares;
 
    } 
   // -------  Returns all Shares  -------- //



       // -------  Returns all Pools  -------- //
       static  async getPoolList( poolConfig, mongoInterface )
       {
           
           let poolData = await mongoInterface.findAll( "network_pools", {} )

           let poolStatsRecord = await mongoInterface.findAllSortedWithLimit( "poolStatsRecords", {}, {recordedat:-1}, 1 );
           let _hashrate = 0;
           let _numberminers = 0;
           if(poolStatsRecord && poolStatsRecord.length > 0){
           _hashrate = poolStatsRecord[0].Hashrate;
           _numberminers = poolStatsRecord[0].Numberminers;
        }
        
        var poolInfo = {
         name: poolConfig.poolName,
         url: poolConfig.poolUrl,
         Hashrate: _hashrate,
         Numberminers: _numberminers,
         mintAddress: poolConfig.mintingConfig.publicAddress,
         poolserver:true,
        }
        poolData.push(poolInfo);
           
           return poolData;
    
       } 
      // -------  Returns all Pools  -------- //

      // -------  Returns all Pools mints addresses retrieved from network -------- //
      static  async getMintAddresses( mongoInterface )
      {
          let mintAddresses = await mongoInterface.findAll( "network_pools_addresses", {} )
          return mintAddresses;
      } 
     // -------  Returns all Pools mints addresses retrieved from network -------- //

     // -------  Returns all Ppnls rewards -------- //
     static  async getPpnlsRewards( minerAddress, nbrewards, mongoInterface )
     {
         let ppnlsRewards = await mongoInterface.findAllSortedWithLimitonString( "ppnls_rewards", {minerEthAddress: minerAddress.toString().toLowerCase()}, {epochCount:-1}, nbrewards );
         return ppnlsRewards;
     } 
    // -------  Returns Returns all Ppnls rewards -------- //
   
        
       // -------  Returns all Mints  -------- //
       static  async getMintList( nbrecords, mongoInterface )
       {
    
        // max 100 to limit server cpu comsumption:
        if(nbrecords > 100){
          nbrecords = 100;
        }

           let alletiMints = await mongoInterface.findAllSortedWithLimitonString( "all_eti_mints", {}, {epochCount:-1}, nbrecords );
           
           return alletiMints;
    
       } 
      // -------  Returns all Mints  -------- //

      // -------  Returns pool Mints  -------- //
      static  async getPoolMints( nbrecords, mongoInterface )
      {
   
       // max 100 to limit server cpu comsumption:
       if(nbrecords > 100){
         nbrecords = 100;
       }

          let poolMints = await mongoInterface.findAllSortedWithLimitonString( "pool_mints", {}, {epochCount:-1}, nbrecords );
          
          return poolMints;
   
      } 
     // -------  Returns pool Mints  -------- //


    // --------  Returns Sharecredits (Math.floor(difficulty)) from Difficulty  ---------  // 
  static async getShareCreditsFromDifficulty(difficulty,shareIsASolution, minerport, poolConfig)
  {

    var minShareDifficulty;

    /* Old ports system:
    if(minerport == 8080){
      minShareDifficulty = PeerHelper.getPoolMinimumShareDifficulty(poolConfig)  ;  
    }
    else {
      minShareDifficulty = PeerHelper.getPoolMinimumShareDifficultyHard(poolConfig)  ;
    } */

    minShareDifficulty = PeerHelper.getPoolMinimumShareDifficultyHard(poolConfig)  ;

    const SOLUTION_FINDING_BONUS = 0

    if(shareIsASolution)//(difficulty >= miningDifficulty)
    {

     var amount = Math.floor( difficulty   ) ;
      

      amount += SOLUTION_FINDING_BONUS;
      return amount;

    }else if(difficulty >= minShareDifficulty)
    {

      var amount = Math.floor(  difficulty    ) ;
       
      return amount;
    }

    LoggingHelper.appendLog( [ 'no shares for this solve!!',difficulty,minShareDifficulty ], LoggingHelper.TYPECODES.WARN , mongoInterface)

 

    return 0;
  } 
   // --------  Returns Sharecredits (Math.floor(difficulty)) from Difficulty  ---------  //



  // --------  Stores minerEthAddress into DB  ---------  //
  static async saveMinerDataToRedisMongo(minerEthAddress, minerData, mongoInterface)
  {

    if(minerEthAddress == null) return;

    minerEthAddress = minerEthAddress.toString().toLowerCase()

    let result = await mongoInterface.upsertOne("minerData",{minerEthAddress: minerEthAddress},minerData)

    return result 
  } 
  // --------  Stores minerEthAddress into DB  ---------  //
  



     // -----  Returns Estimated Hashrate from (difficulty and timeToFindSeconds)  ---------- //
   static getEstimatedShareHashrate(difficulty, timeToFindSeconds )
   {

    // Prevents from returning hashrate equals 0 if solution found extrmly fast:
    if(timeToFindSeconds == 0){
      timeToFindSeconds = 1;
    }

     if(timeToFindSeconds!= null && timeToFindSeconds>0)
     {

        var hashrate = web3utils.toBN(difficulty).mul( web3utils.toBN(2).pow(  web3utils.toBN(22) )).div( web3utils.toBN( timeToFindSeconds ) )

        return hashrate.toNumber(); //hashes per second

      }else{
        return 0;
      }
   }
     // -----  Returns Estimated Hashrate from (difficulty and timeToFindSeconds)  ---------- // 










// ------------------  Added thanks to crnxhh --------------- //

static async calculateMinerHashrateData(mongoInterface, poolConfig) {
  const HashRateCalculationPeriod = 60 * 60;  // 60 minutes
  
  try {
      const minerList = await PeerHelper.getActiveMinerList(HashRateCalculationPeriod * 2, mongoInterface);
      const currentTime = PeerHelper.getTimeNowSeconds();
      const startTime = currentTime - HashRateCalculationPeriod;

      // Get shares with timestamps for better accuracy
      const sharesDifficultySum = await mongoInterface.aggregateOnCollection(
          "miner_pendingshares",
          [
              {
                  $match: {
                      time: { $gt: startTime },
                      time: { $lte: currentTime }
                  }
              },
              {
                  $group: {
                      _id: {
                          minerEthAddress: "$minerEthAddress",
                          entryport: "$entryport"
                      },
                      difficulty: { $sum: "$difficulty" },
                      shareCount: { $sum: 1 },
                      firstShare: { $min: "$time" },
                      lastShare: { $max: "$time" }
                  }
              }
          ]
      );

      for (let minerData of minerList) {
          let totalHashrate = 0;
          
          // Calculate hashrate per entry port
          for (let shareSummary of sharesDifficultySum) {
              if (shareSummary._id.minerEthAddress === minerData.minerEthAddress) {
                  // Use actual mining duration instead of full period
                  const actualDuration = shareSummary.lastShare - shareSummary.firstShare;
                  const periodDuration = Math.min(HashRateCalculationPeriod, Math.max(60, actualDuration)); // At least 1 minute
                  
                  const portHashrate = web3utils.toBN(shareSummary.difficulty)
                      .div(web3utils.toBN(periodDuration))
                      .toNumber();
                  
                  totalHashrate += portHashrate;
                  
                  // Add detailed logging
                  console.log(`Miner ${minerData.minerEthAddress} port ${shareSummary._id.entryport}:`, {
                      shares: shareSummary.shareCount,
                      difficulty: shareSummary.difficulty,
                      duration: periodDuration,
                      hashrate: portHashrate
                  });
              }
          }

          if (totalHashrate !== minerData.avgHashrate) {
              await mongoInterface.updateOne(
                  'minerData',
                  { _id: minerData._id },
                  { avgHashrate: totalHashrate }
              );
          }
      }
  } catch (error) {
      console.error("Error calculating hashrate:", error);
  }
}

/* former
     static async calculateMinerHashrateData(mongoInterface, poolConfig) {

         const HashRateCalculationPeriod = 60 * 60;  // 60 MINUTES
         const HashRateCalculationPeriod_extendedMargin = HashRateCalculationPeriod * 2;  // 60 MINUTES multiply by 2 to have large margin and avoid missing active miners
 
         var minerList = await PeerHelper.getActiveMinerList( HashRateCalculationPeriod_extendedMargin, mongoInterface ); // Only retrieve active miners
         var needturnoffMiners = await PeerHelper.getNeedTurnOffMinerList( HashRateCalculationPeriod_extendedMargin, mongoInterface ); // miners that still have an avgHashrate although last share was submitted longer than HashRateCalculationPeriod_extendedMargin

         const sharesDifficultySum = await PeerHelper.getMinerSharesDifficultySum(mongoInterface, (PeerHelper.getTimeNowSeconds() - HashRateCalculationPeriod))
   
         for (let minerData of minerList) {
             let minerTotalDifficulty = sharesDifficultySum.find(o => o._id === minerData.minerEthAddress);
             if (minerTotalDifficulty) {
                 let avgHashrate = web3utils.toBN(minerTotalDifficulty.difficulty).div(web3utils.toBN(HashRateCalculationPeriod));
                 let convertedHashrate = avgHashrate.toNumber(); // MH unit
                 avgHashrate = parseInt((convertedHashrate).toFixed(6));
                 if (avgHashrate !== minerData.avgHashrate) {
                     var lastpreshareArray = await PeerHelper.getLastMinerPreShare(minerData.minerEthAddress, mongoInterface);
                     if(lastpreshareArray == null || lastpreshareArray.length<=0){
                      // Should never happen but just in case, If no lastpreshareArray it means skip this miner and continue loop
                      continue
                    }
                     await mongoInterface.updateOne('minerData', {_id: minerData._id}, {avgHashrate: avgHashrate, minerport: lastpreshareArray[0].minerport, entryport: lastpreshareArray[0].entryport})
                 }
             } else if (minerData.avgHashrate !== 0) {
                 await mongoInterface.updateOne('minerData', {_id: minerData._id}, {avgHashrate: 0})
             }
 
         }


         for (let needturnoffMiner of needturnoffMiners) {

          await mongoInterface.updateOne('minerData', {_id: needturnoffMiner._id}, {avgHashrate: 0});

         }


     } */
     static async getMinerSharesDifficultySum(mongoInterface, unixTime) {
         let minerDifficultySum = await mongoInterface.aggregateOnCollection("miner_pendingshares",
             [{$match: {time: {$gt: unixTime}}},
                 {
                     $group:
                         {
                             _id: "$minerEthAddress",
                             difficulty: {$sum: "$difficulty"}
                         }
                 }
             ], {}
         )
 
 
         if (minerDifficultySum) {
             return minerDifficultySum;
         }
         return []
     }
     

// ------------------  Added thanks to crnxhh --------------- //


// ------------------  Calculates Last 24h Earnings of each miner --------------- //

static async calculateLast24hEarnings(mongoInterface) {
  try {

    const EarningsCalculationPeriod = 24 * 60 * 60;  // 24h

    const LastEarningsSum = await PeerHelper.getLastEarningsSum(mongoInterface, (PeerHelper.getTimeNowSeconds() - EarningsCalculationPeriod));

    // Update each miner's last24hTokenBalance in minerData
    for (let earning of LastEarningsSum) {
        await mongoInterface.updateOneCustom(
          'minerData',
          { minerEthAddress: earning._id },
          { $set: { last24hTokenBalance: earning.totalTokensAwarded } }
        );
    }

    console.log("Last 24h earnings calculated and updated successfully.");

  } catch (error) {
    console.error("Error calculating last 24h earnings:", error);
  }
}

/* Removed, not used but useful example of query to get only main addresses filtering out workers
static async getLastEarningsSumMainAddresses(mongoInterface, unixTime) {
  console.log('calling getLastEarningsSum3 mainAddress without workerName');

  // Aggregate tokens awarded in the last 24 hours for each miner, considering worker names
  let minerEarningsSum = await mongoInterface.aggregateOnCollection("ppnls_rewards", [
    { $match: { createdAt: { $gt: unixTime } } },
    {
      $group: {
        _id: {
          $cond: {
            if: { $gt: [{ $indexOfBytes: ["$minerEthAddress", "."] }, -1] },
            then: { $substrCP: ["$minerEthAddress", 0, { $indexOfBytes: ["$minerEthAddress", "."] }] },
            else: "$minerEthAddress"
          }
        },
        totalTokensAwarded: { $sum: "$tokensAwarded" }
      }
    }
  ], {});

  if (minerEarningsSum) {
    return minerEarningsSum;
  }
  return [];
}
Removed, not used but useful example of query to get only main addresses filtering out workers */


static async getLastEarningsSum(mongoInterface, unixTime) {

  let minerEarningsSum = await mongoInterface.aggregateOnCollection("ppnls_rewards",
      [{$match: {createdAt: {$gt: unixTime}}},
          {
              $group:
                  {
                      _id: "$minerEthAddress",
                      totalTokensAwarded: {$sum: "$tokensAwarded"}
                  }
          }
      ], {}
  )

  if (minerEarningsSum) {
      return minerEarningsSum;
  }
  return []
}


static async resetLast24hNoEarnings(mongoInterface) {
  try {

    // Get the current time and calculate the timestamp for 24 hours ago
    const nowSeconds = PeerHelper.getTimeNowSeconds();
    const twentyFourHoursAgo = nowSeconds - (24 * 60 * 60 * 1000);

    // Find all miners with last24hTokenBalance > 0
    const activeMiners = await mongoInterface.findAll('minerData', { last24hTokenBalance: { $gt: 0 } });

    for (let miner of activeMiners) {
      // Check if the miner has any rewards in the last 24 hours
      
      /*
      const recentRewards = await mongoInterface.findOne('ppnls_rewards', {
        $or: [
          { minerEthAddress: miner.minerEthAddress },
          { minerEthAddress: miner.addressBlockchain }
        ],
        createdAt: { $gt: twentyFourHoursAgo }
      }); */

       const recentRewards = await mongoInterface.findOne('ppnls_rewards', {
           createdAt: { $gt: twentyFourHoursAgo },
           minerEthAddress: miner.minerEthAddress
        });

      // If no recent rewards, reset last24hTokenBalance to 0
      if (!recentRewards) {
        await mongoInterface.updateOneCustom(
          'minerData',
          { minerEthAddress: miner.minerEthAddress },
          { $set: { last24hTokenBalance: 0 } }
        );
      }
      
    }

  } catch (error) {
    console.error("Error resetting Last24h earnings for inactive miners:", error);
  }
}

// ------------------  Calculates Last 24h Earnings of each miner --------------- //




// ------------------  PoolStatsRecords --------------- //

static async calculatePoolhashrate(mongoInterface, poolConfig) {

  
  const poolHashrate = await PeerHelper.getPoolhashrate(mongoInterface)
  const poolNumberminers = await PeerHelper.getPoolnumberminers(mongoInterface)
  

  let newpoolrecord = {};

      if (poolHashrate) {
        // check if query result is format expected to avoid inserting query error data:
        if(poolHashrate[0]){
          newpoolrecord.Hashrate = poolHashrate[0].Hashrate;
        }
        else {
          newpoolrecord.Hashrate = 0;
        }
      }
      else {
        newpoolrecord.Hashrate = 0;
      }


      if (poolNumberminers > 0) {
        newpoolrecord.Numberminers = poolNumberminers;
      }
      else {
      newpoolrecord.Numberminers = 0;
      }
      
      newpoolrecord.recordedat = PeerHelper.getTimeNowSeconds();

      await mongoInterface.insertOne('poolStatsRecords', newpoolrecord);
      
      // calculate network hashrate and nbminers:
      await PeerHelper.calculateNetworkhashrate(mongoInterface, poolConfig)
}


static async getPoolhashrate(mongoInterface) {
  let poolHashrate = await mongoInterface.aggregateOnCollection("minerData",
      [ {
              $group:
                  {
                      _id: null,
                      Hashrate: {$sum: "$avgHashrate"}
                  }
        }
      ], {}
  )


  if (poolHashrate) {
      return poolHashrate;
  }
  return []
}


static async getPoolnumberminers(mongoInterface) {
  let numberMiners = await mongoInterface.countAll("minerData", {avgHashrate: {$gt: 0}});

  if (numberMiners) {
      return numberMiners;
  }
  return []
}


static  async getpoolStatsRecords( mongoInterface, nbrecords )
    {

        let poolStatsRecords = await mongoInterface.findAllSortedWithLimit( "poolStatsRecords", {}, {recordedat:-1}, nbrecords );
        
        return poolStatsRecords;
 
    }
    
// daytimestamp is timestamp of day start.(for instance for getting pool metrics of 02/11/2022, we need to pass timestamp of 02/11/2022 at 00:00 am)
static  async getpoolStatsRecordsofDay( mongoInterface, daytimestamp )
    {

        let enddaytimestamp = daytimestamp + 86400;
        // 86400 seconds in a day and metrics saved every 10 minutes => 144 records per day: 
        let poolStatsRecords = await mongoInterface.findAllSortedWithLimit( "poolStatsRecords", {recordedat: {$gte:daytimestamp, $lte:enddaytimestamp}}, {recordedat:-1}, 144 );
        
        return poolStatsRecords;
 
    }


// ------------------  PoolStatsRecords --------------- //


// ------------------  NetworkStatsRecords --------------- //

static async calculateNetworkhashrate(mongoInterface, poolConfig) {
  
  var poolHashrate = await PeerHelper.getPoolhashrate(mongoInterface)
  var poolNumberminers = await PeerHelper.getPoolnumberminers(mongoInterface)

  var networkHashrate = 0;
  var networkNumberminers = 0;

  if(poolHashrate && poolHashrate[0] && !isNaN(poolHashrate[0].Hashrate)){
       networkHashrate = poolHashrate[0].Hashrate;
  }

  if(poolNumberminers > 0){
       networkNumberminers = poolNumberminers;
  } 
  
  let activeNetworkPools = await mongoInterface.findAll('network_pools', {status: 1});

  for(let onepool of activeNetworkPools)
  {

  try {

    if (onepool.Hashrate && !isNaN(onepool.Hashrate)) {
      networkHashrate += onepool.Hashrate;
    }

    if (onepool.Numberminers && !isNaN(onepool.Numberminers)) {
      networkNumberminers += onepool.Numberminers;
    }

  }
  catch(error){

  }

  }

  let newnetworkrecord = {};
  newnetworkrecord.Hashrate = networkHashrate;
  newnetworkrecord.Numberminers = networkNumberminers;
  newnetworkrecord.recordedat = PeerHelper.getTimeNowSeconds();

  await mongoInterface.insertOne('networkStatsRecords', newnetworkrecord);

}


static  async getnetworkStatsRecords( mongoInterface, nbrecords )
    {

        let networkStatsRecords = await mongoInterface.findAllSortedWithLimit( "networkStatsRecords", {}, {recordedat:-1}, nbrecords );
        
        return networkStatsRecords;
 
    }
    
// daytimestamp is timestamp of day start.(for instance for getting network metrics of 02/11/2022, we need to pass timestamp of 02/11/2022 at 00:00 am)
static  async getnetworkStatsRecordsofDay( mongoInterface, daytimestamp )
    {

        let enddaytimestamp = daytimestamp + 86400;
        // 86400 seconds in a day and metrics saved every 10 minutes => 144 records per day: 
        let networkStatsRecords = await mongoInterface.findAllSortedWithLimit( "networkStatsRecords", {recordedat: {$gte:daytimestamp, $lte:enddaytimestamp}}, {recordedat:-1}, 144 );
        
        return networkStatsRecords;
 
    }

// ------------------  NetworkStatsRecords --------------- //


     // -----  Returns Estimated Hashrate from (MinerAddress)  ---------- //   
  static async estimateMinerHashrate(minerAddress, mongoInterface)
   {

      try {

        var submitted_shares = await PeerHelper.getSharesData(minerAddress, mongoInterface)

        if(submitted_shares == null || submitted_shares.length < 1)
        {
         // console.log('no submitted shares')
          return 0;
        }

        //need to use BN for totalDiff

        var totalDiff = web3utils.toBN(0);
        var CUTOFF_MINUTES = 90;
        var cutoff = PeerHelper.getTimeNowSeconds() - (CUTOFF_MINUTES * 60);

        // the most recent share seems to be at the front of the list
        var recentShareCount = 0;
        while (recentShareCount < submitted_shares.length && submitted_shares[recentShareCount].time > cutoff) {

          var diffDelta = submitted_shares[recentShareCount].difficulty;

          if(isNaN(diffDelta)) diffDelta = 0;

          totalDiff = totalDiff.add(  web3utils.toBN(diffDelta) );
          recentShareCount++;
        }

        if ( recentShareCount == 0 )
        {
        //  console.log('no recent submitted shares')
          return 0;
        }


        //console.log('miner recent share count: ', recentShareCount )
        var seconds = submitted_shares[0].time - submitted_shares[recentShareCount - 1].time;
        if (seconds == 0)
        {
          return 0;
        }

        //console.log('hashrate calc ', totalDiff, seconds )
        var hashrate = PeerHelper.getEstimatedShareHashrate( totalDiff, seconds );
        return hashrate.toString();

      } catch(err)
      {
        console.log('Error in peer-interface::estimateMinerHashrate: ',err);
        return 0;
      }
  } 
  // -----  Returns Estimated Hashrate from (MinerAddress)  ---------- //

  //timeToFind
  // -----  Returns Average Time to find Solution from (MinerAddress)  ---------- //
  static async getAverageSolutionTime(minerAddress, mongoInterface)
  {
    if(minerAddress == null) return null;

    var submitted_shares =  await this.redisInterface.getRecentElementsOfListInRedis(('miner_submitted_share:'+minerAddress.toString().toLowerCase()), 3)

    var sharesCount = 0;

    if(submitted_shares == null || submitted_shares.length < 1)
    {
      return null;
    }


    var summedFindingTime  = 0;

    for (var i=0;i<submitted_shares.length;i++)
    {
      var share = submitted_shares[i];

      var findingTime = parseInt(share.timeToFind);

      if(!isNaN(findingTime) && findingTime> 0 && findingTime != null)
      {
          summedFindingTime += findingTime;
            sharesCount++;
       }
    }

    if(sharesCount <= 0)
    {
      return null;
    }


    var timeToFind = Math.floor(summedFindingTime / sharesCount);
    return timeToFind;
  } 
  // -----  Returns Average Time to find Solution from (MinerAddress)  ---------- //


  // -----  Check balanceTransfer.confirmed (for a paymentId)  ---------- //
   static async getBalanceTransferConfirmed(paymentId, mongoInterface)
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
  // -----  Check balanceTransfer.confirmed (for a paymentId)  ---------- //


  // -----  Save submited Solution  ---------- //
   static  async saveSubmittedSolutionTransactionData(tx_hash,transactionData, mongoInterface)
     {
        await this.redisInterface.storeRedisHashData('submitted_solution_tx',tx_hash,JSON.stringify(transactionData) )
        await this.redisInterface.pushToRedisList('submitted_solutions_list',JSON.stringify(transactionData) )

     } 
  // -----  Save submited Solution  ---------- //

  // -----  Get saved submited Solution  ---------- //
     static async loadStoredSubmittedSolutionTransaction(tx_hash, mongoInterface )
   {
      var txDataJSON = await this.redisInterface.findHashInRedis('submitted_solution_tx',tx_hash);
      var txData = JSON.parse(txDataJSON)
      return txData
   } 
  // -----  Check balanceTransfer.confirmed (for a paymentId)  ---------- //


}
