
 //var redis = require("redis");
   import jayson from 'jayson' 

   import web3utils from 'web3-utils' 

   //var peerUtils = require('./peer-utils')

   import LoggingHelper from './util/logging-helper.js'

  import PeerHelper from './util/peer-helper.js'
  import TokenDataHelper from './util/token-data-helper.js';
  import TransactionHelper from './util/transaction-helper.js';

  import TokenInterface from './token-interface.js'
  import PoolStatsHelper from './util/pool-stats-helper.js';

  import Web3 from 'web3' 
 
  import ContractHelper from './util/contract-helper.js' 

  import randomx from "randomx-etica-nodejs";
  import BigNumber from "bignumber.js";
  import * as randomxHelper from "./util/randomx-formats-helper.js";

  // var redisClient;

  const UPDATE_VAR_DIFF_PERIOD = 30 * 1000; //30 seconds


  //const UPDATE_HASH_RATE_PERIOD = 4 * 60  * 1000;

  const SOLUTION_FINDING_BONUS = 0;
  var varDiffPeriodCount = 0;


export default class PeerInterface  {

  constructor(mongoInterface, poolConfig){
    this.mongoInterface=mongoInterface;
    this.poolConfig=poolConfig;

    this.web3 = new Web3(poolConfig.mintingConfig.web3Provider);
    this.tokenContract = ContractHelper.getTokenContract(this.web3, this.poolConfig  )  


    if(this.poolConfig.mintingConfig.poolTokenFee == null)
    {
      console.error('Please set a poolTokenFee (% of tokens as a pool fee)')
      throw 'Please set a poolTokenFee (% of tokens as a pool fee)'

       
    }

    if(this.poolConfig.communityTokenFee == null)
    {
      this.poolConfig.communityTokenFee = 0;
    }

  } 


 



  async listenForJSONRPC()
  {

        //this.initJSONRPCServer();
        this.initJSONRPCServerHighDiff();

  } 

  async update()
  {

    this.processQueuedShares(this.mongoInterface, this.poolConfig)

    setInterval(function(){PeerHelper.calculateMinerHashrateData(this.mongoInterface, this.poolConfig)}.bind(this), 120000) // used to be every minute (60000)
    setInterval(function(){PeerHelper.calculatePoolhashrate(this.mongoInterface, this.poolConfig)}.bind(this), 600000)

  } 



  async processQueuedShares(mongoInterface, poolConfig)
  {
   

    let shareDataResult  = await mongoInterface.findAndDeleteOne('queued_shares_list', {} )

    let shareData = shareDataResult.value 

   
    //var shareData = JSON.parse(shareDataJSON)

    //console.log('process queued shares')

    if(typeof shareData != 'undefined' && shareData != null)
    {

     // LoggingHelper.appendLog('share data to process', LoggingHelper.TYPECODES.GENERIC, mongoInterface)

     
      
      try{
        var response =  await PeerInterface.handlePeerShareSubmit(shareData, mongoInterface , poolConfig);
        }catch(err)
        {
          console.error(err)
          LoggingHelper.appendLog(['handle share error',err], LoggingHelper.TYPECODES.ERROR, mongoInterface)

          
        }
      }else {
       // console.log('WARNING: share data undefined')
      }
    
    
    //keep looping 
      setTimeout(function(){this.processQueuedShares(mongoInterface,poolConfig)}.bind(this),0)

  } 

/* 




   /*
    This is the gatekeeper for solution submits
   */

   
   static async handlePeerShareSubmit(shareData ,mongoInterface, poolConfig)
   {
    //nonce,minerEthAddress,challengeNumber,digest,difficulty
    let nonce = shareData.nonce 
    let minerEthAddress = shareData.minerEthAddress 
    let challengeNumber = shareData.challengeNumber 
    let digest = shareData.digest 
    let difficulty = shareData.difficulty 
    let minerport = shareData.minerport
    let randomxhash = shareData.randomxhash
    let randomx_blob = shareData.randomx_blob
    let randomx_seedhash = shareData.randomx_seedhash
    let claimedtarget = shareData.claimedtarget
 
     
     console.log('\n')
     console.log('---- received peer share submit -----')
     console.log('nonce',nonce)
     console.log('challengeNumber',challengeNumber)
     console.log('minerEthAddress',minerEthAddress)
     console.log('digest',digest)
     console.log('difficulty',difficulty)
     console.log('randomxhash',randomxhash)
     console.log('randomx_blob',randomx_blob)
     console.log('randomx_seedhash',randomx_seedhash)
     console.log('claimedtarget',claimedtarget)
     console.log('\n') 
     

     if( difficulty == null  ) return ;
     if( nonce == null  ) return ;
     if( minerEthAddress == null  ) return ;
     if( challengeNumber == null  ) return ;
     if( digest == null  ) return ;
     if( randomxhash == null  ) return ;
     if( randomx_blob == null  ) return ;
     if( randomx_seedhash == null  ) return ;
     if( claimedtarget == null  ) return ;


     var poolEthAddress = PeerHelper.getPoolEthAddress(poolConfig);

     let poolChallengeNumber = await TokenDataHelper.getChallengeNumber(mongoInterface)
     let poolRandomxBlob = await TokenDataHelper.getRandomxBlob(mongoInterface);
     let poolConfigRandomxSeedhash = await TokenDataHelper.getRandomxSeedhash(mongoInterface);
     let poolEpochCount = await TokenDataHelper.getEpochCount(mongoInterface);


      // Verify Randomx nonce:
      const blockHeader = randomxHelper.convertToRawWithout0x(poolRandomxBlob);
      console.log('blockHeader:', blockHeader.toString('hex'));
      const randomxhashRaw = randomxHelper.convertToRawWithout0x(randomxhash);
      console.log('blockHeader:', blockHeader.toString('hex'));
      const nonceBuffer = Buffer.from(nonce, 'hex');
      console.log('nonceBuffer:', nonceBuffer.toString('hex'));
      const targetBigNumber = new BigNumber(claimedtarget);
      console.log('targetBigNumber:', targetBigNumber.toString(10)); // Base 10
      const targetBigNumberString = targetBigNumber.toString(10);
      const claimedtargetBN = web3utils.toBN(targetBigNumberString);
      console.log('targetBigNumber (hex):', targetBigNumber.toString(16)); // Hexadecimal 
      const targetBuffer = Buffer.from(targetBigNumber.toString(16).padStart(64, '0'), 'hex');

      // Seed hash
      const seedHash = randomxHelper.convertToRawWithout0x(randomx_seedhash);
      console.log('seedHash:', seedHash.toString('hex'));

     const isValid = randomx.VerifyEticaRandomXNonce(blockHeader, nonceBuffer, targetBuffer, seedHash, randomxhashRaw);
     console.log(`Solution is ${isValid ? 'valid' : 'invalid'}`);

     if(!isValid){
      console.log('-*-*-*-*-*-*-*999999*-*-*-*-*-*-*-*-*-**-*-*-*-*-*Invalid RandomX solution');
      return { success: false, message: "Invalid RandomX solution" };
     }

     if (randomx_blob != poolRandomxBlob) {
      console.log('-*-*-*-*-*-*-*999999*-*-*-*-*-*-*-*-*-**-*-*-*-*-*Submitted randomx_blob does not match pools randomx_blob');
      return { success: false, message: "Submitted randomx_blob does not match pool's randomx_blob" };
     }
     
  
     var computed_digest =  web3utils.soliditySha3( poolChallengeNumber , poolEthAddress, nonce )

     var digestBytes32 = web3utils.hexToBytes(computed_digest)
     var digestBigNumber = web3utils.toBN(computed_digest)


     let poolMinDiff;
     var minShareTarget;
     var miningTarget;
     var minShareDifficulty;

     if(minerport == 8080){
      poolMinDiff =  PeerHelper.getPoolMinimumShareDifficulty( poolConfig );
      minShareTarget = web3utils.toBN(PeerHelper.getPoolMinimumShareTarget(poolConfig) ) ;
      miningTarget = web3utils.toBN(await TokenDataHelper.getPoolDifficultyTarget(mongoInterface) ) ;
      minShareDifficulty = PeerHelper.getPoolMinimumShareDifficulty( poolConfig );
      }

     else if(minerport == 8081){
      poolMinDiff =  PeerHelper.getPoolMinimumShareDifficultyHard( poolConfig );
      minShareTarget = web3utils.toBN(PeerHelper.getPoolMinimumShareTargetHard(poolConfig) ) ;
      miningTarget = web3utils.toBN(await TokenDataHelper.getPoolDifficultyTarget(mongoInterface) ) ;
      minShareDifficulty = PeerHelper.getPoolMinimumShareDifficultyHard( poolConfig );
     }

     // Check if the claimed target meets the pool minimum difficulty
    if (claimedtargetBN.gt(minShareTarget)) {
      return { success: false, message: "Share difficulty too low" };
    }

    // Convert randomxhash to BigNumber for comparison
    const randomxhashBN = web3utils.toBN('0x' + randomxhash);
    console.log('randomxhashBN is: ', randomxhashBN.toString());

    // Reverse the bytes of randomxhashBN
    const reversedRandomxhash = Buffer.from(randomxhashBN.toBuffer().reverse());
    console.log('reversedRandomxhash is: ', reversedRandomxhash.toString());

    const reversedRandomxhashString = reversedRandomxhash.toString();
    const reversedRandomxhashBN = web3utils.toBN('0x' + reversedRandomxhashString);

    console.log('reversedRandomxhashBN is: ', reversedRandomxhashBN.toString());

    console.log('miningTarget STRING IS: ', miningTarget.toString(16));

        console.log('miningTarget IS: ', miningTarget)
        console.log('targetBigNumber IS: ', targetBigNumber)
        var shareIsASolution = reversedRandomxhashBN.lte(miningTarget)
        console.log('SHARE IS A NETWORK SOLUTION IS: ', shareIsASolution)

        return await this.prehandleValidShare( nonce,
                                            minerEthAddress,
                                            digest,
                                            difficulty,
                                            shareIsASolution, minerport, mongoInterface, poolConfig );

   } 


// not used anymore:
  static async  handleValidShare( nonce,minerEthAddress,digest,difficulty, shareIsASolution, mongoInterface, poolConfig )
   {
      
      var existingShare =  await  mongoInterface.findOne('miner_shares', {digest: digest}  ) //await this.redisInterface.findHashInRedis("submitted_share", digest );

        //make sure we have never gotten this digest before (redis )
      if(existingShare == null && minerEthAddress!=null)
      { 

        //LoggingHelper.appendLog(['handle valid new share from', minerEthAddress], LoggingHelper.TYPECODES.GENERIC, mongoInterface)


        var ethBlock = await TokenDataHelper.getEthBlockNumber(mongoInterface)


        var minerData = await PeerHelper.getMinerData(minerEthAddress.toString().toLowerCase(), mongoInterface)

        // minerData.usingCustomDifficulty = usingCustomDifficulty;

       //  await PeerHelper.saveMinerDataToRedisMongo(minerEthAddress,minerData, mongoInterface)

        if(minerData.lastSubmittedSolutionTime != null)
        {
            var timeToFindShare = (PeerHelper.getTimeNowSeconds() - minerData.lastSubmittedSolutionTime);
        }else{
           //make sure we check for this later
            var timeToFindShare = 0;   /* CHECK IF TO BE MODIFIED   */
        }

        var difficultyBN = web3utils.toBN(difficulty);

        var shareData=  {
          block: ethBlock,
          nonce: nonce,
          minerEthAddress: minerEthAddress.toString().toLowerCase(),
          difficulty: difficulty,
          digest:digest,
          isSolution: shareIsASolution,
          hashrateEstimate: PeerHelper.getEstimatedShareHashrate(difficultyBN,timeToFindShare),
          time: PeerHelper.getTimeNowSeconds(),
          timeToFind: timeToFindShare  //helps estimate hashrate- look at recent shares
        };

        //make sure this is threadsafe

        // Used to make sure this diggest cant be submited twice:
        await mongoInterface.insertOne("miner_shares", shareData )

      
        await mongoInterface.updateOne('minerData', {_id: minerData._id},  {lastSubmittedSolutionTime: PeerHelper.getTimeNowSeconds()}    )


        // ---->  increase token balance  < ----- //
          //--optional | after analysis doesnt seem optional dont know why they wrote it
        var shareCredits =  await PeerHelper.getShareCreditsFromDifficulty( difficulty,shareIsASolution,poolConfig )
 
        // This function increases field MinerData.ShareCredits but note the var ShareCredits is used instead of field MinerData.ShareCredits, this field is not used at all in the app
         await PeerHelper.awardShareCredits( minerEthAddress, shareCredits, mongoInterface )
          // optional end-- 

          // ---->  This is the function that Actually increases token balance based on shareCredits (difficulty) compared to total mining pool difficulty < ----- //
        await PeerHelper.awardTokensBalanceForShares( minerEthAddress, shareCredits, poolConfig, mongoInterface ) // now var challengenumber is necessary
         // ---->  increase token balance  < ----- //

         
        var challengeNumber = await TokenDataHelper.getChallengeNumber( mongoInterface );

        if( shareIsASolution )
        {
         // LoggingHelper.appendLog(['share is a solution!', nonce,minerEthAddress,digest,challengeNumber], LoggingHelper.TYPECODES.SHARES, mongoInterface)
 
          //await TokenInterface.queueMiningSolution( nonce,minerEthAddress,digest,challengeNumber, mongoInterface, poolConfig ); now done by prehandleValisShare()
        }else{
            // nothing 
        }

        return {success: true, message: "New share credited successfully"}

      }else{
        return {success: false, message: "This share digest was already received"}
      }

   } 



//   NEW SYSTEM REWARD BASED ON ADDRESSES INSTEAD OF SHARES, REMOVE MINER_SHARES ONLY USES MINER_PENDINGSHARES   //

   // pre handle valide share
   static async  prehandleValidShare( nonce,minerEthAddress,digest,difficulty, shareIsASolution, minerport, mongoInterface, poolConfig )
   {

       var mindifficulty;
       if(minerport == 8081){
        mindifficulty = await PeerHelper.getPoolMinimumShareDifficultyHard(poolConfig);
       }
       else{
        mindifficulty = await PeerHelper.getPoolMinimumShareDifficulty(poolConfig);
       }
       let typeofmindiff = typeof mindifficulty;
       let typeofdiff = typeof difficulty;
       let bndifficulty = web3utils.toBN(difficulty);
       let bnmindifficulty = web3utils.toBN(mindifficulty);

      var existingPreShare =  await  mongoInterface.findOne('miner_pendingshares', {digest: digest}  ); 

        //make sure we have never gotten this digest before
      if(existingPreShare == null && minerEthAddress!=null)
      { 
        var minerData = await PeerHelper.getMinerData(minerEthAddress.toString().toLowerCase(), mongoInterface);
        var isfirstsolution = false; // used for if (timetofindshare > 20) condition
        if(minerData.lastSubmittedSolutionTime != null)
        {
            var timeToFindShare = (PeerHelper.getTimeNowSeconds() - minerData.lastSubmittedSolutionTime);
        }else{
            var timeToFindShare = 0;
            isfirstsolution = true;
        }

        // Set limit of maximum one share submission per 2 seconds on port 8080:
       if( (timeToFindShare >= 2 && minerport == 8080) || (timeToFindShare >= 0 && minerport == 8081) || isfirstsolution)
        { 
        await mongoInterface.updateOne('minerData', {_id: minerData._id},  {lastSubmittedSolutionTime: PeerHelper.getTimeNowSeconds()}    )


        //LoggingHelper.appendLog(['handle valid new share from', minerEthAddress], LoggingHelper.TYPECODES.GENERIC, mongoInterface)


        var ethBlock = await TokenDataHelper.getEthBlockNumber(mongoInterface)

        var difficultyBN = web3utils.toBN(difficulty);

        var challengeNumber = await TokenDataHelper.getChallengeNumber( mongoInterface );

        let difficulty_numberformat = difficulty.toString();
        difficulty_numberformat = Math.floor(difficulty_numberformat);

        var shareData=  {
          block: ethBlock,
          nonce: nonce,
          minerEthAddress: minerEthAddress.toString().toLowerCase(),
          difficulty: difficulty_numberformat,
          digest:digest,
          isSolution: shareIsASolution,
          hashrateEstimate: PeerHelper.getEstimatedShareHashrate(difficultyBN,timeToFindShare),
          time: PeerHelper.getTimeNowSeconds(),
          challengeNumber: challengeNumber, // added field challengeNumber, used by PeerInterface -> rewardCrawl() to find miner_pendingshares
          timeToFind: timeToFindShare,  //helps estimate hashrate- look at recent shares
          minerport: minerport
        };

let _td = await mongoInterface.findOne('totaldiff_challengenumber', {challengeNumber: challengeNumber, minerport: minerport});
let _difficulty = difficulty.toString();
let _totaldiff = _td.totaldiff.toString();
let newdiff =  web3utils.toBN(_totaldiff).add(web3utils.toBN(_difficulty));
let _newdiff = newdiff.toString();
await mongoInterface.updateOne('totaldiff_challengenumber', {challengeNumber: challengeNumber, minerport: minerport},  {totaldiff: _newdiff});

await mongoInterface.insertOne("miner_pendingshares", shareData ); // saves share data to then use it in handlevalide share
let _miner_challengediff = await mongoInterface.findOne('miner_challengediff', {minerEthAddress: minerEthAddress.toString().toLowerCase(), challengeNumber: challengeNumber, minerport: minerport});

if(_miner_challengediff == null){
  var newminerchallengediff =  {
    minerEthAddress: minerEthAddress.toString().toLowerCase(),
    challengeNumber: challengeNumber,
    totaldiff: _difficulty,
    status:1,
    minerport: minerport
  };

await mongoInterface.insertOne('miner_challengediff', newminerchallengediff);
}

else {
  let _minertotaldiff = _miner_challengediff.totaldiff.toString();
  let newminertotaldiff =  web3utils.toBN(_minertotaldiff).add(web3utils.toBN(_difficulty));
  let _newminertotaldiff = newminertotaldiff.toString();
  await mongoInterface.updateOne('miner_challengediff', {minerEthAddress: minerEthAddress.toString().toLowerCase(), challengeNumber: challengeNumber, minerport: minerport},  {totaldiff: _newminertotaldiff});
}

        if( shareIsASolution )
        {
          //LoggingHelper.appendLog(['share is a solution!', nonce,minerEthAddress,digest,challengeNumber], LoggingHelper.TYPECODES.SHARES, mongoInterface)
 
          await TokenInterface.queueMiningSolution( nonce,minerEthAddress,digest,challengeNumber, randomx_blob, randomx_seedhash, randomxhash, randomxhash_claimedtarget, mongoInterface, poolConfig );
        }else{
            // nothing 
        }

        return {success: true, message: "New share added to db, ready to be sent to handlevalideshares"}


      }
      else{
        //console.log('<---------------------------Reached limit solution submission per 2 seconds ----------------------------------------');
        //console.log('<-Reached limit solution submission per 2 seconds on port 8080 -time to find was: ', timeToFindShare);
        return {success: true, message: "New share added to db, ready to be sent to handlevalideshares"} // share is valid but doesnt count for miner because of max submissions per 2 seconds limit on port 8080
      } 


      }else{
        return {success: false, message: "This share digest was already received"}
      }

   } 

   // One miner _minerChallengeDiff corresponds to an object containing infos about its shares for a specific challengeNumber
   // _pplns_challenge_numbers array containing challengenumbers of difficulties to use for pplns sharecredits calculation
   // _pplns_totalDifficulties_BN sum of pool Total shares difficulties for each challenge number
   static async  processAddressforChallenge( _minerChallengeDiff, _pplns_challenge_numbers, _pplns_totalDifficulties_BN, _poolmint, mongoInterface, poolConfig )
   {
     // Should arrive here for process only if status is still 1, make a check for security but should definitely never happen:
     let existingChallengediff = await mongoInterface.findOne('miner_challengediff', {minerEthAddress: _minerChallengeDiff.minerEthAddress, challengeNumber: _minerChallengeDiff.challengeNumber, status:1, minerport: _minerChallengeDiff.minerport});
  
          //make sure we have never gotten this digest before
        if(existingChallengediff != null)
        { 

          //var minerData = await PeerHelper.getMinerData(_minerChallengeDiff.minerEthAddress.toString().toLowerCase(), mongoInterface);
          //let isSol = true; // Set true by default just to get the result
          // var shareCredits =  await PeerHelper.getShareCreditsFromDifficulty( _minerChallengeDiff.totaldiff,isSol, _minerChallengeDiff.minerport, poolConfig ) // Functio usefull to return Floor format and avoid bugs when awardTokensBalanceForShares recieves other format
          //var shareCredits = Math.floor(_minerChallengeDiff.totaldiff);
          // This function increases field MinerData.ShareCredits but note the var ShareCredits is used instead of field MinerData.ShareCredits, this field is not used at all in the app

            
            let _minerdiff = web3utils.toBN('0');


            for(let one_pplns_challenge_numbers of _pplns_challenge_numbers){

              var oneChallengediff = await mongoInterface.findOne('miner_challengediff', {minerEthAddress: _minerChallengeDiff.minerEthAddress, challengeNumber: one_pplns_challenge_numbers, minerport: _minerChallengeDiff.minerport});
              
              if(oneChallengediff){
                let _onedifficulty = oneChallengediff.totaldiff.toString();
                _minerdiff =  web3utils.toBN(_minerdiff).add(web3utils.toBN(_onedifficulty)); 
              }

              

            }

            var shareCredits = Math.floor(_minerdiff.toString());


            // Gets total diff for this challenge number:
            //var totalDifficulty;

             // totalDifficulty =  await  mongoInterface.findOne('totaldiff_challengenumber', {challengeNumber: _minerChallengeDiff.challengeNumber, minerport: _minerChallengeDiff.minerport}  );

            if(shareCredits > 0){
              
              let poolAccountBalances = await TokenDataHelper.getPoolAccountBalancesData(mongoInterface);

              let poolsecuritybalance = poolConfig.paymentsConfig.PoolSecurityBalance;
              // security against cpu overload miscalculations and pool funds depletion. Only reward miners if pool balance is at least PoolSecurityBalance ETI as security. 
              // PoolSecurityBalance must be higher than unmoved pool profits (the pool profits still on Batch Payment Contract)
              if(poolAccountBalances.paymentsAccountBalances['token'] > poolsecuritybalance){  
                  await mongoInterface.updateOne('miner_challengediff', {_id: _minerChallengeDiff._id, minerport: _minerChallengeDiff.minerport},  {status:2});
                if(_pplns_totalDifficulties_BN.gt(web3utils.toBN('0'))){
                  let _totaldiff = _pplns_totalDifficulties_BN.toString();
                   // ---->  This is the function that Actually increases token balance based on this shareCredits (this Share difficulty) compared to total difficulty ( sum of shareCredits for this challenge number) < ----- //
                   await PeerHelper.awardTokensBalanceForShares( _minerChallengeDiff.minerEthAddress, shareCredits, _totaldiff, _minerChallengeDiff.minerport, _poolmint, _minerChallengeDiff.challengeNumber, poolConfig, mongoInterface )
                   // ---->  increase token balance  < ----- //
                }

                  return {success: true, message: "New share credited successfully with new reward system"}                

              }

            else{
              await mongoInterface.updateOne('miner_challengediff', {_id: _minerChallengeDiff._id, minerport: _minerChallengeDiff.minerport},  {status:5});

              return {success: true, message: "New share not taken into account because mining pool balance was too low."}
            }
      
      }else{

          await mongoInterface.updateOne('miner_challengediff', {_id: _minerChallengeDiff._id, minerport: _minerChallengeDiff.minerport},  {status:3}); // no shares for this pplns period

          return {success: false, message: "No shares for this pplns period."} // no shareCredits
      }

    }
    else {

      await mongoInterface.updateOne('miner_challengediff', {_id: _minerChallengeDiff._id, minerport: _minerChallengeDiff.minerport},  {status:4});

      return {success: true, message: "New share credited successfully with new reward system"}

    }

   } 

  //   NEW SYSTEM REWARD BASED ON ADDRESSES INSTEAD OF SHARES, REMOVE MINER_SHARES ONLY USES MINER_PENDINGSHARES   //


/*
This is the interface that miners connect to ! 
*/

/*
  async initJSONRPCServer()
     {
       let mongoInterface = this.mongoInterface 
       let poolConfig = this.poolConfig 

       console.log('listening on JSONRPC server localhost:8080')
         // create a server
         var server = jayson.server({
           ping: function(args, callback) {

               callback(null, 'pong');

           },

           getPoolProtocolVersion: function(args, callback) {

                return PoolStatsHelper.getPoolProtocolVersion();

           },


           getPoolStatus: async function(args, callback) {
            let poolSuspended = await PoolStatsHelper.poolMintingIsSuspended(poolConfig,mongoInterface)
          
            return {
              'poolIsSuspended': poolSuspended
            };

           },


           getPoolEthAddress: function(args, callback) {

               callback(null, PeerHelper.getPoolEthAddress(poolConfig).toString() );

           },

           getMinimumShareDifficulty: async function(args, callback) {

            var minerEthAddress = args[0];

            
            var difficulty = await PeerHelper.getPoolMinimumShareDifficulty(poolConfig );
             
            callback(null, difficulty);


          },

          getMinimumShareTarget: async function(args, callback) {
            var minerEthAddress = args[0];

            //always described in 'hex' to the cpp miner
            var minTargetBN = PeerHelper.getPoolMinimumShareTarget( poolConfig  );

           callback(null,  minTargetBN.toString() );

         },
         getChallengeNumber: async function(args, callback) {

           var challenge_number = await TokenDataHelper.getChallengeNumber( mongoInterface ) 

           if(challenge_number!= null)
           {
             challenge_number = challenge_number.toString()
           }
           
          callback(null, challenge_number );

        },

        allowingCustomVardiff: async function(args, callback) {

          return (poolConfig.miningConfig.allowCustomVardiff == true);
        },

        submitShare: async function(args, callback) {

          // cool mining pool
          //return {success: true, message: "New share added to db, ready to be sent to handlevalideshares"}

       // ------------  Pool Suspended status  ------------  //
          //let poolSuspended = await PoolStatsHelper.poolMintingIsSuspended(poolConfig,mongoInterface)
          let poolSuspended = false;
        // ------- Pool Suspended status -------- //

          var validJSONSubmit = true;

          var nonce = args[0];
          var minerEthAddress = args[1];
          var digest = args[2];
          var difficulty = args[3];
          var challenge_number = args[4];
          var custom_vardiff_used = args[5];

          if(
            difficulty == null  ||
            nonce == null  ||
            minerEthAddress == null  ||
            challenge_number == null  ||
            digest == null
          ) {
            validJSONSubmit = false;
          }


          if(custom_vardiff_used == null)
          {
            custom_vardiff_used = false;
          }

          var minShareDifficulty = PeerHelper.getPoolMinimumShareDifficulty(poolConfig)  ;
          if( difficulty <  minShareDifficulty)
          {
            validJSONSubmit = false;
          }

          var poolEthAddress = PeerHelper.getPoolEthAddress(poolConfig) ;
          var poolChallengeNumber = await TokenDataHelper.getChallengeNumber(mongoInterface);
          var computed_digest =  web3utils.soliditySha3( poolChallengeNumber , poolEthAddress, nonce )

          var digestBigNumber = web3utils.toBN(digest);
          var claimedTarget = PeerHelper.getTargetFromDifficulty( difficulty )

          if(computed_digest !== digest || digestBigNumber.gte(claimedTarget))
          {
            validJSONSubmit = false;
          }

          var ethBlock = await TokenDataHelper.getEthBlockNumber(mongoInterface);

          var shareData = {block: ethBlock ,
            nonce: nonce,
            minerEthAddress: minerEthAddress,
            challengeNumber: challenge_number,
            digest: digest,
            difficulty: difficulty,
            customVardiff: custom_vardiff_used,
            minerport: 8080

          };
        
          
          if(!poolSuspended && validJSONSubmit){
            var response = await mongoInterface.insertOne('queued_shares_list', shareData )            
            
          }else{
            console.log('WARN: Miner share trashed because pool is suspended')
           
           //do not response at all, telling miner we are suspended  
            //return
          }

          callback(null,  validJSONSubmit );

          },


           getMinerData: async function(args, callback) {

             var minerEthAddress = args[0];
             var minerData = null;

             if(web3utils.isAddress(minerEthAddress.toString()) ){
                 minerData = await PeerHelper.getMinerData(minerEthAddres, mongoInterface);
             }else{
               console.log('getMinerData error: not a valid address')
             }

            callback(null, JSON.stringify( minerData )  );

          },
          getAllMinerData: async function(args, callback) {

            var minerData = await PeerHelper.getAllMinerData(mongoInterface);


           callback(null, JSON.stringify( minerData )  );

         },

         });

         server.http().listen(8080);

     } */



     async initJSONRPCServerHighDiff()
     {
       let mongoInterface = this.mongoInterface 
       let poolConfig = this.poolConfig 
       ///var self = this;

       console.log('listening on JSONRPC server localhost:8081')
         // create a server
         var server = jayson.server({
           ping: function(args, callback) {

               callback(null, 'pong');

           },

           getPoolProtocolVersion: function(args, callback) {

                return PoolStatsHelper.getPoolProtocolVersion();

           },


           getPoolStatus: async function(args, callback) {
            let poolSuspended = await PoolStatsHelper.poolMintingIsSuspended(poolConfig,mongoInterface)
          
            return {
              'poolIsSuspended': poolSuspended
            };

           },


           getPoolEthAddress: function(args, callback) {

               callback(null, PeerHelper.getPoolEthAddress(poolConfig).toString() );

           },

           getMinimumShareDifficulty: async function(args, callback) {

            var minerEthAddress = args[0];

            
            var difficulty = await PeerHelper.getPoolMinimumShareDifficultyHard(poolConfig );
             
            callback(null, difficulty);


          },

          getMinimumShareTarget: async function(args, callback) {
            var minerEthAddress = args[0];

            //always described in 'hex' to the cpp miner
            var minTargetBN = PeerHelper.getPoolMinimumShareTargetHard( poolConfig  );

           callback(null,  minTargetBN.toString() );

         },
         getChallengeNumber: async function(args, callback) {


           var challenge_number = await TokenDataHelper.getChallengeNumber( mongoInterface ) 

           if(challenge_number!= null)
           {
             challenge_number = challenge_number.toString()
           }

          callback(null, challenge_number );

        },

        allowingCustomVardiff: async function(args, callback) {

          return (poolConfig.miningConfig.allowCustomVardiff == true);
        },

        submitShare: async function(args, callback) {

          // cool mining pool
          //return {success: true, message: "New share added to db, ready to be sent to handlevalideshares"}
        
         // console.log('peer submitting share port 8081');

       // ------------  PoolSuspended   ------------  //
          //let poolSuspended = await PoolStatsHelper.poolMintingIsSuspended(poolConfig,mongoInterface)
          let poolSuspended = false;
        // ------- PoolSuspended -------- //

          var validJSONSubmit = true;

          var nonce = args[0];
          var minerEthAddress = args[1];
          var digest = args[2];
          var difficulty = args[3];
          var challenge_number = args[4];
          var custom_vardiff_used = args[5];


          if(
            difficulty == null  ||
            nonce == null  ||
            minerEthAddress == null  ||
            challenge_number == null  ||
            digest == null
          ) {
            validJSONSubmit = false;
          }


          if(custom_vardiff_used == null)
          {
            custom_vardiff_used = false;
          }

          var minShareDifficulty = PeerHelper.getPoolMinimumShareDifficultyHard(poolConfig)  ;
          if( difficulty <  minShareDifficulty)
          {
            validJSONSubmit = false;
          }

          var poolEthAddress = PeerHelper.getPoolEthAddress(poolConfig) ;
          var poolChallengeNumber = await TokenDataHelper.getChallengeNumber(mongoInterface);
          var computed_digest =  web3utils.soliditySha3( poolChallengeNumber , poolEthAddress, nonce )

          var digestBigNumber = web3utils.toBN(digest);
          var claimedTarget = PeerHelper.getTargetFromDifficulty( difficulty )

          if(computed_digest !== digest || digestBigNumber.gte(claimedTarget))
          {
            validJSONSubmit = false;
          }

          var ethBlock = await TokenDataHelper.getEthBlockNumber(mongoInterface);

          var shareData = {block: ethBlock ,
            nonce: nonce,
            minerEthAddress: minerEthAddress,
            challengeNumber: challenge_number,
            digest: digest,
            difficulty: difficulty,
            customVardiff: custom_vardiff_used,
            minerport: 8081

          };
        
          
          if(!poolSuspended && validJSONSubmit){
            var response = await mongoInterface.insertOne('queued_shares_list', shareData )            
            
          }else{
           // console.log('WARN: Miner share trashed because invalid share or pool is suspended')
           
           //do not response at all, telling miner we are suspended  
            //return
          }

          callback(null,  validJSONSubmit );

          },


           getMinerData: async function(args, callback) {

             var minerEthAddress = args[0];
             var minerData = null;

             var minerAddressWithoutWorkerName = minerEthAddress.toString().substr(0, 42); 

             if(web3utils.isAddress(minerAddressWithoutWorkerName.toString()) ){
                 minerData = await PeerHelper.getMinerData(minerEthAddres, mongoInterface);
             }else{
               console.log('getMinerData error: not a valid address')
             }

            callback(null, JSON.stringify( minerData )  );

          },
          getAllMinerData: async function(args, callback) {

            var minerData = await PeerHelper.getAllMinerData(mongoInterface);


           callback(null, JSON.stringify( minerData )  );

         },

         });

         server.http().listen(8081);

     }

      


     

       
}
