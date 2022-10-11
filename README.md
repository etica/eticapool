### EticaPool  

Original pool Developed by InfernalToast with help from the 0xBitcoin Community (https://github.com/0xbitcoin/tokenpool) (GNU PUBLIC LICENSE)

A pool for mining EIP918 Tokens

See me running at http://eticapool.com


Windows GPU Miner 1
https://bitbucket.org/LieutenantTofu/cosmic-v3/downloads/COSMiC-v4.1.1-MultiGPU-TMP.zip

Windows GPU Miner 2
 https://github.com/mining-visualizer/MVis-tokenminer/releases

 Windows GPU Miner 3
 https://github.com/lwYeo/SoliditySHA3MinerUI/releases/tag/1.0.2

 Linux GPU Miner
 https://github.com/lwYeo/SoliditySHA3Miner/releases


### BASIC SETUP  (needs Node 14) [nvm install 14]

MAKE SURE TO USE NPM 6.14.17 and NODE 14.20.1
you can install both versions with: nvm install 14
 

Overall process (for details check: ## EXAMPLE FRESH INSTALL ON BRAND NEW SERVER, SERVER COMMANDS):
1. npm install

2. rename 'sample.pool.config.json' to 'pool.config.json' and fill it with the pool's etica account data (make two new accounts, one for minting one for payments and fill both with a small amount of ETH)

3. Install mongodb, make sure it is running as a service

4. 'npm run build'  #(to build the website files)

5. 'npm run pool' #(or 'npm run pool staging 'for staging test mode)
 



### CONFIGURING  - set up  pool.config.json

##### pool.config.json



## Deploy a BatchedPayments.sol Contract
Deploy BatchedPayments.sol contract (it is the contract in deploythis folder).
Then after deploy, Enter the address of your BatchedPayments contract in src/config/DeployedContractInfo.json


## HOW TO TEST
1. Point a EIP918 tokenminer at your pool using http://localhost:8080   (make sure firewall allows this port)
2. Start the server with 'npm run build' and 'npm run server staging' to put it into staging test mode
3. View website interface at http://localhost (Feel free to set up nginx/apache to serve the static files in /dist)

You should see that the miner is able to successfully submit shares to the pool when the share difficulty is set to a low value such as 100 and the pool is in 'staging mode'.  Then you can run the pool on mainnet using 'npm run server'.


## Installing MongoDB

Digitalocean guide:
https://www.digitalocean.com/community/tutorials/how-to-install-mongodb-on-ubuntu-16-04#step-3-%E2%80%94-adjusting-the-firewall-(optional)

 - Mongo is used to store data related to miner shares, balances, and payments

 (WSL: sudo mongod --dbpath ~/data/db)


## EXAMPLE FRESH INSTALL ON BRAND NEW SERVER, SERVER COMMANDS:

-> sudo apt-get install build-essential  
then : install nvm with following command:  
-> wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash  
  
(nvm install guides (follow part a): https://www.whitesourcesoftware.com/free-developer-tools/blog/how-to-update-node-js-to-latest-version/)  
  
  
close terminal then open it again  
-> sudo apt install node-gyp
-> sudo apt update  
-> command -v nvm  
-> nvm install 14  
-> node --version  
check it's version  14.20.1
-> npm --version  
check it's version 6.14.17
-> npm i pm2 -g  
-> curl -fsSL https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -  
-> echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list  
-> sudo apt update  
-> sudo apt install mongodb-org  
-> sudo systemctl start mongod.service  
-> sudo ufw allow 22  
-> sudo ufw allow 3000 (if you want to run express on this port, in pool.config.json set yourpoolurl:3000 as poolUrl)
-> sudo ufw allow 80  (by default express will be on port 80, so in poolUrl just enter your pool url without ports)
-> sudo ufw allow 8080  
-> sudo ufw allow 8081  
-> sudo ufw allow ssh  
-> sudo ufw enable   

-> cd /var  
-> mkdir www  
-> cd www  
-> git clone repo address here

-> npm install  
-> npm run build  
  
Initiate pool with:  
-> node index.js (creates database tokenpool_production and collections)  
  
Run pool with pm2:  
-> pm2 start index.js  
-> pm2 start indexcleanercoordinator.js  
-> pm2 start indexpoolsnetwork.js
  
You're ETI pool is running  
  
  
  






--------------------------------    FUNCTION MAPPING  -----------------------------------



token-data-helper.js
   -> static async collectPoolAccountBalances(poolConfig,  mongoInterface  ){
      ->Updates poolAccountBalances in mongo DB
    
let poolAccountBalances = {  
       mintingAccountBalances: {},
       paymentsAccountBalances: {},
       tokensApprovedToBatchPayments:0 ,
       updatedAt: PeerHelper.getTimeNowSeconds()

    }





diagnostic-manager.js 
 Repetitive functions that run on back end server to collect stats about blockchain:

     -> async collectStats()

     -> async monitorPoolStatus(){



jobs:
collectTokenParameters.js
-> look like file to initialise Mongo and the pool
  -> runTask()
     -> get tokenDataHelper.collecTokenParameters( tokenContract, wbe3, mongoInterface)
     -> await mongoInterface.init( 'tokenpool_'.concat(pool_env))   


api-helper.js
 -> return test route "This is the Api"

congig-helper.js
 -> empty file

contract-helper.js
 -> returns Contracts and Contracts address, by take addresses from config/DeployedContractInfo.json

file-utils.js
 -> readJsonFileSync()

logging-helper.js
    -> static async appendLog(message, typeCode,   mongoInterface ){
       -> Update Mongo DB with log message

    -> static async deleteOldLogs( mongoInterface ){


peer-helper.js

 // ----------  Get Now time info (not blockchain but local using new Date() )  -----------  //
                -> getTimeNowSeconds()
                -> static getTimeNowUnix()
 // ----------  Get Now time info (not blockchain but local using new Date() )  -----------  //


 // ----------  Get Pool Minimum Difficulty and Pool Minimum Share Target from parameter object poolConfig -----------  //
                -> static getPoolMinimumShareDifficulty(poolConfig)
                -> static getPoolMinimumShareTarget( poolConfig )
 // ----------  Get Pool Minimum Difficulty and Pool Minimum Share Target from parameter object poolConfig -----------  //


 // ----------  Get Current Target from Difficulty -----------  //
                -> static getTargetFromDifficulty(difficulty)
 // ----------  Get Current Target from Difficulty -----------  //



// ----------  Get Pool Data (Token Fee, Minting address, Payment Address) -----------  //
               -> static   getPoolData(poolConfig)
// ----------  Get Pool Data (Token Fee, Minting address, Payment Address) -----------  //


 // Specific Miner //

          // ---------  Get Balance of Payments of a specific Miner  ------------  //
              -> static async getMinerBalancePayments(minerAddress,  mongoInterface)
          // ---------  Get Balance of Payments of a specific Miner  ------------  //


         // --------- Get Specific Miner or Create Miner if dont exist -------- //
              -> static async getMinerData(minerEthAddress, mongoInterface)
                        uses -> static getDefaultMinerData(minerEthAddress)
         // --------- Get Specific Miner or Create Miner if dont exist -------- //


         // ------- Returns Empty Object with structure of Miner fields to store in Mongo DB  -------- //
              -> static getDefaultMinerData(minerEthAddress)
         // ------- Returns Empty Object with structure of Miner fields to store in Mongo DB  -------- //

 
          // -------  Returns Empty Object with hashrate field  -------- //
              -> static getDefaultSharesData(minerEthAddress){
          // -------  Returns Empty Object with hashrate field  -------- //


          // -------  Updates minerData fields shareCredits, validSubmittedSolutionsCount, lastSubmittedSolutionTime  -------- //
              -> static async awardShareCredits( minerEthAddress, shareCredits , mongoInterface)
          // -------  Updates minerData fields shareCredits, validSubmittedSolutionsCount, lastSubmittedSolutionTime  -------- //



          // -------  Returns MinerShares from a specific Miner  -------- //
              -> static async getMinerShares(minerEthAddress, mongoInterface)
          // -------  Returns MinerShares from a specific Miner  -------- //



          // -------  Updates alltimeTokenBalance field (with value tokenRewardAmt) for a specific Miner on Mongo DB -------- //
              -> static async awardTokensBalanceForShares( minerEthAddress, difficulty , poolConfig, mongoInterface)
                      ->let tokenRewardAmt = await PeerHelper.getTokenRewardForShareOfDifficulty(difficulty,poolConfig, mongoInterface)
          // -------  Updates alltimeTokenBalance field (with value tokenRewardAmt) for a specific Miner on Mongo DB -------- //


          // -----  Returns Estimated Hashrate from (MinerAddress)  ---------- //   
              -> static async estimateMinerHashrate(minerAddress, mongoInterface)
                         -> var hashrate = PeerHelper.getEstimatedShareHashrate( totalDiff, seconds );
          // -----  Returns Estimated Hashrate from (MinerAddress)  ---------- //   


           // -----  Returns Average Time to find Solution from (MinerAddress)  ---------- //
               -> static async getAverageSolutionTime(minerAddress, mongoInterface)
           // -----  Returns Average Time to find Solution from (MinerAddress)  ---------- //


           // --------  Stores minerEthAddress into DB  ---------  //
               -> static async saveMinerDataToRedisMongo(minerEthAddress, minerData, mongoInterface)
           // --------  Stores minerEthAddress into DB  ---------  //


           // -----  Returns Estimated Hashrate from (MinerAddress)  ---------- //  
               -> static async estimateMinerHashrate(minerAddress, mongoInterface)
                         -> var submitted_shares = await PeerHelper.getSharesData(minerAddress, mongoInterface)
                         -> var hashrate = PeerHelper.getEstimatedShareHashrate( totalDiff, seconds );
           // -----  Returns Estimated Hashrate from (MinerAddress)  ---------- //  



           // -----  Returns Average Time to find Solution from (MinerAddress)  ---------- //
                -> static async getAverageSolutionTime(minerAddress, mongoInterface)
           // -----  Returns Average Time to find Solution from (MinerAddress)  ---------- //

// Specific Miner //


// All Miners //
           // -------  Returns total totalShares by adding from all Miners  -------- //
               -> static async getTotalMinerShares(mongoInterface)
           // -------  Returns total totalShares by adding from all Miners  -------- //

           // -------  Returns total totalHashrate by adding from all Miners  -------- //
               -> static async getTotalMinerHashrate(mongoInterface)
           // -------  Returns total totalHashrate by adding from all Miners  -------- //

           // -------  Returns all Miners  -------- //
               -> static  async getMinerList( mongoInterface )
           // -------  Returns all Miners  -------- //

           // -------  Deletes OLD miner_shares  -------- //
               -> static async cleanOldData(mongoInterface, poolConfig){
           // -------  Deletes OLD miner_shares  -------- //


// All Miners //


// Calculate general Data //


             // --------  Updates each Miner Hashrate  ---------  //
                -> static async calculateMinerHashrateData(mongoInterface, poolConfig)
             // --------  Updates each Miner Hashrate  ---------  //

             // -------  Returns netReward global variable from Blockreward and by taking into account Pool fees and shareDiff and totalDifficulty  -------- //
                -> static async getTokenRewardForShareOfDifficulty(shareDiff, poolConfig, mongoInterface)
             // -------  Returns netReward global variable from Blockreward and by taking into account Pool fees and shareDiff and totalDifficulty  -------- //


             // -------  Returns object with global Mining reward and Pool data  -------- //
              -> static async getPoolFeesMetrics(poolConfig, mongoInterface)
             // -------  Returns object with global Mining reward and Pool data  -------- //



// Calculate general Data //


// Specific Share //

// --------  Returns Sharecredits (Math.floor(difficulty)) from Difficulty  ---------  // 
                -> static async getShareCreditsFromDifficulty(difficulty,shareIsASolution,poolConfig)
// --------  Returns Sharecredits (Math.floor(difficulty)) from Difficulty  ---------  //

// -----  Returns Estimated Hashrate from (difficulty and timeToFindSeconds) ---------- //
                -> static getEstimatedShareHashrate(difficulty, timeToFindSeconds )
// -----  Returns Estimated Hashrate from (difficulty and timeToFindSeconds) ---------- //

// Specific Share  //


// Solutions  //

          // -----  Save submited Solution  ---------- //
               -> static  async saveSubmittedSolutionTransactionData(tx_hash,transactionData, mongoInterface)
          // -----  Save submited Solution  ---------- //

         // -----  Check balanceTransfer.confirmed (for a paymentId)  ---------- //
               -> static async loadStoredSubmittedSolutionTransaction(tx_hash, mongoInterface )
         // -----  Check balanceTransfer.confirmed (for a paymentId)  ---------- //


         // -----  Get saved submited Solution (from tx_hash)  ---------- //
               -> static async loadStoredSubmittedSolutionTransaction(tx_hash, mongoInterface )
         // -----  Get saved submited Solution (from tx_hash)  ---------- //


// Solutions  //



 --------------------------------    FUNCTION MAPPING  -----------------------------------

token-interface:
  -> buildBalancePayments:
   creates balance_payments record i MongoDb with {batchedPaymentUuid:undefined} value

   -> buildBatchedPaymentTransactions:
 updtaes balance_payments record i MongoDb with {batchedPaymentUuid:newBatchedPaymentTxData.uui}  value 


 transactions-coordinator.js:

addTransactionToQueue(txType, txData,  mongoInterface, poolConfig)

txData will be used to create packedData with status queued
var packetData = {
       block: blockNum,
       txType: txType, //batched_payment or solution 
       txData: txData, 
       txHash: null,
       status: 'queued'  //queued, pending, reverted, success 

     }
 Will store an object (packetData with Batch id). Then all ballance_payment object with this batch id will be used in broadcast function    

 broadcastQueuedBatchedPaymentTransactions
  -> broadcastTransaction



  Updates alltimeTokenBalance with tokensAwarded:
     -> awardTokensBalanceForShares()


// MINERS INTERFACE PROCESS //

peer-interface.js: 
async initJSONRPCServer()  // This is the interface that miners connect to ! 
   stores sharedata in 'queued_shares_list'and then 
   calls
   -> processQueuedShares() 
     get sharedata from 'queued_shares_list' and immediatly deletes sharedata and then
     calls 
     -> PeerInterface.handlePeerShareSubmit() with sharedata and then 
     check: 
     computed_digest === sharedata.digest && sharedata.difficulty >= sharedata.minShareDifficulty && digestBigNumber.lt(minShareTarget)
     if sharedata isSolution calls -> this.prehandleValidShare() with sharedata
     else insert sharedata in 'miner_shares' with isSolution False
        -> this.prehandleValidShare()
        checks no existence of this sharedata in 'miner_shares' yet
        gets MinerData and estimates var timeToFoFindShare with minerData.lastSubmittedSolutionTime. timeToFoFindShare set to 0 if no minerData.lastSubmittedSolution
        stores ShareData in 'miner_pendingshares' with isSolution True and timeToFoFindShare
        and then calls
    -> TokenInterface.queueMiningSolution() with sharedata

    queueMiningSolution will mine the transaction
    transactionsCoordinator.rewardCrawl() will scan the blockchain periodically and store solutions mined by the pool in 'pool_mints'

    When transactionsCoordinator.rewardCrawl() finds a solution with same challengeNumber as a 'miner_pendingshares' it
    calls 
    -> PeerInterface.processValidShare() with pendingshare


    -> PeerInterface.processValidShare()
    check no existence of this pendingshare in 'miner_shares'
    insert pendingshare in 'miner_shares' to make sure this diggest cant be submited twice
    updates minerData with lastSubmittedSolutionTime() equal to now
    calaculate ShareCredits based on sharedata.difficulty / totalpool difficulty ratio
    and then calls
    -> PeerHelper.awardTokensBalanceForShares() with minerEthAddress and ShareCredits. It actually increases token balance based on shareCredits

    -> PeerHelper.awardTokensBalanceForShares()
       calculates tokenRewardAmt with PeerHelper.getTokenRewardForShareOfDifficulty(minerAddress, ShareCredits)
       increases with tokenRewardAmt and stores updated minerData.alltimeTokenBalance


-> Rq: removed return{} on submit share() function when peer submit invalid json. Solved issue miners errors and unable to detect new challenge numbers

// MINERS INTERFACE PROCESS //