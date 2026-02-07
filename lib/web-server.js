  
  
  
 import express from 'express'
 import rateLimit from 'express-rate-limit'
   

 import cors from 'cors'

 import fs from 'fs'
 import path from 'path'

 import  history from 'connect-history-api-fallback'

 
 import PeerHelper from './util/peer-helper.js'
 import PoolStatsHelper from './util/pool-stats-helper.js'
 import Web3ApiHelper from './util/web3-api-helper.js'
 import TransactionHelper from './util/transaction-helper.js'
 import TokenDataHelper from './util/token-data-helper.js'

 import https from 'https'
 import http from 'http'
 
 import {Server}  from 'socket.io'


 import FileUtils from './util/file-utils.js'

 import APIHelper from './util/api-helper.js'

 import Worker from "./stratum/worker.js";
 import events from 'events';
 import net from 'net';
 import GeneralEventEmitterHandler from "./util/GeneralEventEmitterHandler.js";
 import { RateLimiterMemory } from "rate-limiter-flexible";
 import DataCache from "./util/data-cache.js";

 export default class WebServer extends events {


  //https_enabled,webInterface,peerInterface,web3apihelper 
  async init( https_enabled, poolConfig, mongoInterface   )
  {
      console.log("init web server...")

      this.mongoInterface=mongoInterface;
      this.poolConfig=poolConfig;
      this.workers = new Set();
      this.bannedIPs = new Set();
      this.banDuration = 10000; // 1 hour in milliseconds
      //this.webInterface=webInterface;
      //this.peerInterface=peerInterface;

      //this.web3apihelper=web3apihelper;


            const app = express()
            app.use(express.json());
            
            // Apply rate limiting middleware with a limit of 50 requests per 10 minutes
            const limiter = rateLimit({
            windowMs: 1 * 60 * 1000, // 2 minutes (used to be 10 minutes)
            max: 50, // limit each IP to 50 requests per windowMs
            message: 'Too many requests from this IP, please retry after 1 minutes.',
            });
            app.use(limiter);


         

      if(https_enabled)
      {
        console.log('using https')


        let config = FileUtils.readJsonFileSync('/sslconfig.json');


 
        var sslOptions ={
        key: fs.readFileSync(config.ssl.key),
        cert: fs.readFileSync(config.ssl.cert)/*,
        ca: [
          fs.readFileSync(config.ssl.root, 'utf8'),
          fs.readFileSync(config.ssl.chain, 'utf8')
        ]*/
       }



        var server = https.createServer(sslOptions,app);

      }else{
        var server = http.createServer(app);

      }


      app.use(cors());


      app.get('/api/v1/daily/metrics/:daytimestamp', async (req, res) => {         
          
        let response = await APIHelper.getPoolDailyMetrics( req , this.poolConfig, this.mongoInterface )

        res.send(response)
      })

      app.get('/api/v1/daily/networkmetrics/:daytimestamp', async (req, res) => {         
          
        let response = await APIHelper.getNetworkDailyMetrics( req , this.poolConfig, this.mongoInterface )

        res.send(response)
      })

      app.get('/api/v1/minerhashrate/:minerEthAddress', async (req, res) => {         
          
        let response = await APIHelper.getHashrateMiner( req , this.mongoInterface )

        res.send(response)
      })

      app.get('/api/v1/checkmineranyshare/:minerEthAddress', async (req, res) => {         
          
        let response = await APIHelper.checkMinerAnyShare( req , this.mongoInterface )

        res.send(response)
      })

      app.post('/api/v1/poolinfo', async (req, res) => {         

        let fromPoolInfo = req.body;
        //let senderhost = req.header('Host'); implement potential checker compare host and pool url
        let response = await APIHelper.getNetworkPoolInfofrom( fromPoolInfo , this.poolConfig, this.mongoInterface )

        res.send(response)
      })

      app.get('/api/v1/:query', async (req, res) => {         
          
        let response = await APIHelper.handleApiRequest( req , this.poolConfig, this.mongoInterface )

        res.send(response)
      })

      let __dirname = path.resolve();

      const staticFileMiddleware = express.static('dist');
      app.use(staticFileMiddleware);
      app.use(history({
        disableDotRule: true,
        verbose: true
      }));
      app.use(staticFileMiddleware);

      app.listen(80, function () {
        console.log( 'Express serving on 80!' )
      })

      this.startSocketServer(server)
      this.startSratumServer()

      const miningContractData = await TokenDataHelper.getRecentMiningContractData(this.mongoInterface);
      this.challengeNumber = miningContractData.challengeNumber;
      setTimeout(() => {
        this.CheckChallengeNumberForWorkers();
      }, 15000); // 15000 milliseconds = 15 seconds
      
  } 



  setupWorkerEvent() {
    console.log('setupWorker called');
    this.on('worker', (workerInstance) => {
      
        this.workers.add(workerInstance); // Add the worker on subscription

        // Handle incoming messages from the worker
        workerInstance.on('message', (message) => {
            // Process the message as required
            // You can call specific methods of the workerInstance here
        });

        // Handle incoming messages from the worker
        workerInstance.on('subscribe', () => {
            console.log('subscribe from worker');
        });

        // Handle errors from the worker
        workerInstance.on('error', (error) => {
            console.error('Error on a workerInstance. Error:', error);
            this.workers.delete(workerInstance);
        });

        // Handle when the worker connection is closed
        workerInstance.on('end', () => {
            //console.log('Worker connection ended.');
            this.workers.delete(workerInstance);
        });
    });
}

handleUpdateForAllWorkers(updatedContract) {
  this.workers.forEach((worker) => {
      worker.handleUpdate(updatedContract);
  });
}

async CheckChallengeNumberForWorkers(){
  GeneralEventEmitterHandler.getInstance().on('newChallenge', async (miningContractData) => {
    if (miningContractData != null && miningContractData.challengeNumber && this.challengeNumber != miningContractData.challengeNumber){
      this.challengeNumber = miningContractData.challengeNumber;
      this.handleUpdateForAllWorkers(miningContractData);
    }

  });

}

          async startSratumServer(){

              console.log('startSratumServer called');
              var mongoInterface = this.mongoInterface
              var poolConfig = this.poolConfig
              poolConfig.recentMiningContractData = await TokenDataHelper.getRecentMiningContractData(mongoInterface);
              poolConfig.challengeNumber = await TokenDataHelper.getChallengeNumber(mongoInterface);
              poolConfig.randomxBlob = await TokenDataHelper.getRandomxBlob(mongoInterface);
              poolConfig.randomxSeedhash = await TokenDataHelper.getRandomxSeedhash(mongoInterface);
              poolConfig.epochCount = await TokenDataHelper.getEpochCount(mongoInterface);
              
            this.setupWorkerEvent();

            const portConfigs = [
              { port: 3333, difficulty: 400015 },
              { port: 5555, difficulty: 500000 },
              { port: 7777, difficulty: 1000000 },
              { port: 9999, difficulty: 2000000 }
            ];

            const rateLimiter = new RateLimiterMemory({
              points: 5, // Allow 3 connections
              duration: 1, // Per second
            });

            const dataLimiter = new RateLimiterMemory({
              points: 5, // Allow 3 connections
              duration: 1, // Per second
            });

            portConfigs.forEach(config => {

              const stratumserver = net.createServer(async (socket) => {
                //console.log(`New connection on port ${socket.localPort}`);

                socket.on('error', (err) => {
                  
                  /*
                  if (err.code === 'ECONNRESET') {
                    console.log(`- - - - 1a - -- - - - ECONNRESET Connection reset by client ${socket.remoteAddress}`);
                  } else {
                    console.error(`- - - - 1b- -- - - -Socket  Connection reset by client error:`, err);
                  } */

                  socket.end('');

                });

                const ipAddress = socket.remoteAddress;
                //console.log(`New connection with ipAddress ${ipAddress}`);

                if (!ipAddress) {
                  return socket.end('IP undefined');
                }

                if (this.bannedIPs.has(ipAddress)) {
                  //console.log(`Rejected banned IP: ${ipAddress}`);
                  return socket.end('IP is banned');
                }

              try {

                socket.once("data", (data) => {
                  
                  try {

                    dataLimiter.consume(ipAddress, 2) // consume 2 points
                    .then((rateLimiterRes) => {
                      // 2 points consumed
                      const startingdifficulty = config.difficulty;
                      poolConfig.minimumTarget = PeerHelper.getTargetFromDifficulty(startingdifficulty);
            
                      const worker = new Worker(socket, poolConfig, PoolStatsHelper, TokenDataHelper, mongoInterface);
                      this.emit('worker', worker);
                      worker._handleStream(data);
                    })
                    .catch((rateLimiterRes) => {
                      // Not enough points to consume
                      socket.end('Rate limit exceeded');
                      this.banIP(ipAddress);
                    });

                    
                  } catch (error) {
                    socket.end('Rate limit exceeded');
                    this.banIP(ipAddress);
                  }

                });

              } catch (error) {
                // console.log(`Connection rate limit exceeded for ${ipAddress}`);
                socket.end('Connection rate limit exceeded');
                this.banIP(ipAddress);
              }

              });

              stratumserver.listen(config.port, function () {
                console.log(`Stratum Server serving on ${config.port}!`);
              });
          
              stratumserver.on('error', (err) => {
                console.error(`Stratum server error on port ${config.port}:`, err);
              });

              // Handle server errors
              stratumserver.on('error', (err) => {
                console.error('Stratum server error:', err);
                // Handle the error accordingly
              });

            });

          }


          banIP(ipAddress) {
            if (!this.bannedIPs.has(ipAddress)) {
              this.bannedIPs.add(ipAddress);
              console.log(`IP banned: ${ipAddress}`);
              setTimeout(() => {
                this.bannedIPs.delete(ipAddress);
                console.log(`IP unbanned: ${ipAddress}`);
              }, this.banDuration);
            }
          }


  async broadcastPoolUpdate(io, poolConfig, mongoInterface, dataCache) {
    try {
      var poolData = dataCache.get('poolData');
      if (!poolData) {
        poolData = await PoolStatsHelper.getPoolData( poolConfig, mongoInterface );
        dataCache.set('poolData', poolData, 30000);
      }

      var poolStatus = dataCache.get('poolStatus');
      if (!poolStatus) {
        poolStatus = await PoolStatsHelper.getPoolStatus( poolConfig, mongoInterface );
        dataCache.set('poolStatus', poolStatus, 8000);
      }

      var poolStatsRecord = dataCache.get('lastPoolStatsRecord');
      if (!poolStatsRecord) {
        poolStatsRecord = await PoolStatsHelper.getLastPoolStatsRecord( poolConfig, mongoInterface );
        dataCache.set('lastPoolStatsRecord', poolStatsRecord, 60000);
      }

      var poolNameAndUrl = {poolName: poolConfig.poolName, poolUrl: poolConfig.poolUrl};

      io.to('pool-stats').emit('poolUpdate', {
        poolData: poolData,
        poolStatus: poolStatus,
        poolNameAndUrl: poolNameAndUrl,
        LastpoolStatsRecord: poolStatsRecord
      });
    } catch (err) {
      console.error('broadcastPoolUpdate error:', err);
    }
  }

  startPoolDataBroadcast(io, poolConfig, mongoInterface, dataCache) {
    setInterval(() => {
      this.broadcastPoolUpdate(io, poolConfig, mongoInterface, dataCache);
    }, 30000);

    GeneralEventEmitterHandler.getInstance().on('newChallenge', () => {
      dataCache.invalidate('poolData');
      dataCache.invalidate('poolStatus');
      this.broadcastPoolUpdate(io, poolConfig, mongoInterface, dataCache);
    });
  }

  startSocketServer(server )
  {

    var io = new Server(server);
    this.io = io;
    //var port = process.env.PORT || 2052;
    var port = 2053;


    ///  https://socket.io/docs/rooms-and-namespaces/#


    server.listen(port, function () {
      console.log('Socket server listening at port %d', port);
    });

    var sockets = {};

    var mongoInterface = this.mongoInterface
    var poolConfig = this.poolConfig
    var dataCache = DataCache.getInstance();

    this.startPoolDataBroadcast(io, poolConfig, mongoInterface, dataCache);

    io.on('connection', function (socket) {
     // console.log('established new socket connection');

          socket.join('pool-stats');


          socket.on('ping', function (data) {
            //console.log('ping', data);

              io.emit('pong', {
                  message:'pong'
                });


             });



             socket.on('getPoolData', async function (data) {

              var poolData = dataCache.get('poolData');
              if (!poolData) {
                poolData = await PoolStatsHelper.getPoolData( poolConfig, mongoInterface );
                dataCache.set('poolData', poolData, 30000);
              }

              socket.emit('poolData',  poolData);

             // console.log('poolData event emitted with data:', poolData);


             });


             socket.on('getPoolStatus', async function (data) {

              let poolStatus = dataCache.get('poolStatus');
              if (!poolStatus) {
                poolStatus = await PoolStatsHelper.getPoolStatus( poolConfig, mongoInterface );
                dataCache.set('poolStatus', poolStatus, 8000);
              }

              socket.emit('poolStatus',  poolStatus);


             });


             socket.on('getPoolName', async function (data) {

              var poolName = poolConfig.poolName;

              socket.emit('poolName',  poolName);

              
             });

             socket.on('getPoolNameAndUrl', async function (data) {

              var poolNameAndUrl = {poolName: poolConfig.poolName, poolUrl: poolConfig.poolUrl};

              socket.emit('poolNameAndUrl',  poolNameAndUrl);
              
             });


             socket.on('getLastPoolStatsRecord', async function (data) {

              let poolStatsRecord = dataCache.get('lastPoolStatsRecord');
              if (!poolStatsRecord) {
                poolStatsRecord = await PoolStatsHelper.getLastPoolStatsRecord( poolConfig, mongoInterface );
                dataCache.set('lastPoolStatsRecord', poolStatsRecord, 60000);
              }

              socket.emit('LastpoolStatsRecord',  poolStatsRecord);


             });


             socket.on('get24hPoolStatsRecords', async function (data) {

              let poolStatsRecords = dataCache.get('24hPoolStatsRecords');
              if (!poolStatsRecords) {
                poolStatsRecords = await PoolStatsHelper.get24hPoolStatsRecords( poolConfig, mongoInterface );
                dataCache.set('24hPoolStatsRecords', poolStatsRecords, 60000);
              }

              socket.emit('24hpoolStatsRecords',  poolStatsRecords);


             });

             socket.on('getLastNetworkStatsRecord', async function (data) {

              let networkStatsRecord = dataCache.get('lastNetworkStatsRecord');
              if (!networkStatsRecord) {
                networkStatsRecord = await PoolStatsHelper.getLastNetworkStatsRecord( poolConfig, mongoInterface );
                dataCache.set('lastNetworkStatsRecord', networkStatsRecord, 60000);
              }

              socket.emit('LastnetworkStatsRecord',  networkStatsRecord);


             });


             socket.on('get24hNetworkStatsRecords', async function (data) {

              let networkStatsRecords = dataCache.get('24hNetworkStatsRecords');
              if (!networkStatsRecords) {
                networkStatsRecords = await PoolStatsHelper.get24hNetworkStatsRecords( poolConfig, mongoInterface );
                dataCache.set('24hNetworkStatsRecords', networkStatsRecords, 60000);
              }

              socket.emit('24hnetworkStatsRecords',  networkStatsRecords);


             });



             socket.on('getRecentSolutions', async function (data) {

              var txData = dataCache.get('recentSolutions');
              if (!txData) {
                let query = {txType:'solution'}
                txData = await TransactionHelper.findRecentTransactionsWithQuery(query,  mongoInterface );
                dataCache.set('recentSolutions', txData, 30000);
              }

              socket.emit('recentSolutions',  txData);


             });


             socket.on('getRecentPayments', async function (data) {

              var txData = dataCache.get('recentPayments');
              if (!txData) {
                let query = {txType:'batched_payment'}
                txData = await TransactionHelper.findRecentTransactionsWithQuery(query,  mongoInterface );
                dataCache.set('recentPayments', txData, 30000);
              }

              socket.emit('recentPayments',  txData);


             });


             socket.on('getMinerData', async function (data) {

               
              var result = await PeerHelper.getMinerData(data.ethMinerAddress,  mongoInterface )

              socket.emit('minerData',  result);


             });


             socket.on('getMinerDataWithWorkers', async function (data) {

               
              var result = await PeerHelper.getMinerDataWithWorkers(data.ethMinerAddress,  mongoInterface )

              socket.emit('minerDataWithWorkers',  result);


             });

             socket.on('getMinerShares', async function (data) {

               
              var result = await PeerHelper.getMinerPreShares(data.ethMinerAddress,  mongoInterface )

              socket.emit('minerShares',  result);


             });
             socket.on('getMinerPayments', async function (data) {
 

              var txData = await PeerHelper.getMinerBalancePayments(data.ethMinerAddress,  mongoInterface )

              socket.emit('minerPayments',  txData);


             });

             socket.on('getMinerList', async function (data) {

             
              var result = await PeerHelper.getMinerList(   mongoInterface )
            
              socket.emit('minerList',  result);


             });

             socket.on('getActiveMinerList', async function (data) {

              // get miners active last 86400 seconds ( 86400 secs per day):
              var result = await PeerHelper.getActiveMinerList( 86400,  mongoInterface )
            
              socket.emit('minerList',  result);


             });

             socket.on('getActiveMinerListDisplay', async function (data) {

              var result = dataCache.get('activeMinerListDisplay');
              if (!result) {
                result = await PeerHelper.getMinerListForDisplay( mongoInterface );
                dataCache.set('activeMinerListDisplay', result, 30000);
              }

              socket.emit('activeMinerListDisplay',  result);


             });

             socket.on('getShareList', async function (data) {

             
              var result = await PeerHelper.getShareList(   mongoInterface )
            
              socket.emit('shareList',  result);


             });


             socket.on('getMinerChallengeDetails', async function (data) {

             
              var result = await PeerHelper.getMinerChallengeDetails(   data.ethMinerAddress, data.nbchallenges,  mongoInterface )
            
              socket.emit('MinerChallengeDetails',  result);


             });


             socket.on('getMintList', async function (data) {

             
              var result = await PeerHelper.getMintList( data.nbmints,  mongoInterface )
            
              socket.emit('mintList',  result);


             });


             socket.on('getMiningContracts', async function (data) {

             
              var result = await TokenDataHelper.getLastMiningContracts(mongoInterface, data.nbcontracts)
            
              socket.emit('miningContracts',  result);


             });

             socket.on('getPoolMints', async function (data) {

             
              var result = await PeerHelper.getPoolMints( data.nbpoolmints,  mongoInterface )
            
              socket.emit('poolMints',  result);


             });


             socket.on('getMintAddresses', async function (data) {

             
              var result = await PeerHelper.getMintAddresses( mongoInterface )
            
              socket.emit('mintAddressesList',  result);


             });


             socket.on('getPoolList', async function (data) {

             
              var result = await PeerHelper.getPoolList(  poolConfig, mongoInterface )
            
              socket.emit('poolList',  result);


             });

             socket.on('getStatsPayment', async function () {

              let statsPayment = dataCache.get('statsPayment');
              if (!statsPayment) {
                statsPayment = await PoolStatsHelper.getStatsPayment( poolConfig, mongoInterface );
                dataCache.set('statsPayment', statsPayment, 60000);
              }

              socket.emit('statsPayment',  statsPayment);

             });

             socket.on('getMinerPpnlsRewards', async function (data) { 
              
              let PpnlsRewards = await PeerHelper.getPpnlsRewards( data.ethMinerAddress, data.nbrewards, mongoInterface )
      
              socket.emit('MinerPpnlsRewards',  PpnlsRewards);

             });

      socket.on('disconnect', function () {
       // console.log(socket.sid, 'disconnected');
        delete sockets[socket.sid];
      });
    });



  }




}
