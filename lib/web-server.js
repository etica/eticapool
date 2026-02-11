  
  
  
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
 import RedisBanList from "./util/redis-ban-list.js";
 import { registerApiV2Routes } from "./util/api-routes.js";
 import web3utils from 'web3-utils';

 export default class WebServer extends events {

  //https_enabled,webInterface,peerInterface,web3apihelper
  async init( https_enabled, poolConfig, mongoInterface, redisInterface   )
  {
      if(process.env.DEBUG) console.log("init web server...")

      this.mongoInterface=mongoInterface;
      this.poolConfig=poolConfig;
      this.redisInterface=redisInterface;
      this.workers = new Set();
      this.banDuration = 10000; // 10 seconds in milliseconds

      // Use Redis ban list if available, otherwise fall back to in-memory Set
      this.bannedIPs = new Set(); // always init as safety net
      if (redisInterface && redisInterface.getClient()) {
        this.redisBanList = new RedisBanList(redisInterface.getClient());
      }
      //this.webInterface=webInterface;
      //this.peerInterface=peerInterface;

      //this.web3apihelper=web3apihelper;


            const app = express()
            app.use(express.json());
            app.set('trust proxy', 1);

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


      const allowedOrigin = process.env.CORS_ORIGIN || poolConfig.poolUrl || '*';
      app.use(cors({ origin: allowedOrigin }));


      app.get('/api/v1/daily/metrics/:daytimestamp', async (req, res) => {
        try {
          let response = await APIHelper.getPoolDailyMetrics( req , this.poolConfig, this.mongoInterface )
          res.send(response)
        } catch (err) {
          console.error('API error:', err.message);
          res.status(500).json({ error: 'Internal server error' });
        }
      })

      app.get('/api/v1/daily/networkmetrics/:daytimestamp', async (req, res) => {
        try {
          let response = await APIHelper.getNetworkDailyMetrics( req , this.poolConfig, this.mongoInterface )
          res.send(response)
        } catch (err) {
          console.error('API error:', err.message);
          res.status(500).json({ error: 'Internal server error' });
        }
      })

      app.get('/api/v1/minerhashrate/:minerEthAddress', async (req, res) => {
        try {
          let response = await APIHelper.getHashrateMiner( req , this.mongoInterface )
          res.send(response)
        } catch (err) {
          console.error('API error:', err.message);
          res.status(500).json({ error: 'Internal server error' });
        }
      })

      app.get('/api/v1/checkmineranyshare/:minerEthAddress', async (req, res) => {
        try {
          let response = await APIHelper.checkMinerAnyShare( req , this.mongoInterface )
          res.send(response)
        } catch (err) {
          console.error('API error:', err.message);
          res.status(500).json({ error: 'Internal server error' });
        }
      })

      app.post('/api/v1/poolinfo', async (req, res) => {
        try {
          let fromPoolInfo = req.body;
          //let senderhost = req.header('Host'); implement potential checker compare host and pool url
          let response = await APIHelper.getNetworkPoolInfofrom( fromPoolInfo , this.poolConfig, this.mongoInterface )
          res.send(response)
        } catch (err) {
          console.error('API error:', err.message);
          res.status(500).json({ error: 'Internal server error' });
        }
      })

      // Register v2 API routes BEFORE the v1 catch-all
      var dataCache = DataCache.getInstance();
      registerApiV2Routes(app, poolConfig, mongoInterface, dataCache);

      app.get('/api/v1/:query', async (req, res) => {
        try {
          let response = await APIHelper.handleApiRequest( req , this.poolConfig, this.mongoInterface )
          res.send(response)
        } catch (err) {
          console.error('API error:', err.message);
          res.status(500).json({ error: 'Internal server error' });
        }
      })

      let __dirname = path.resolve();

      const distPath = process.env.FRONTEND_DIST_PATH || 'dist';
      const staticFileMiddleware = express.static(distPath);
      app.use(staticFileMiddleware);
      app.use(history({
        disableDotRule: true,
        verbose: true
      }));
      app.use(staticFileMiddleware);

      const httpPort = parseInt(process.env.HTTP_PORT) || 80;
      app.listen(httpPort, function () {
        console.log( `Express serving on ${httpPort}!` )
      })

      this.startSocketServer(server)
      this.startSratumServer()

      const miningContractData = await TokenDataHelper.getRecentMiningContractData(this.mongoInterface);
      this.challengeNumber = miningContractData.challengeNumber;
      setTimeout(() => {
        this.CheckChallengeNumberForWorkers();
      }, 15000); // 15000 milliseconds = 15 seconds

  }

  // Web/API only mode (Express + Socket.IO, no stratum)
  async initWebOnly(https_enabled, poolConfig, mongoInterface) {
      if(process.env.DEBUG) console.log("init web server (web-only mode)...")

      this.mongoInterface = mongoInterface;
      this.poolConfig = poolConfig;

      const app = express();
      app.use(express.json());
      app.set('trust proxy', 1);

      const limiter = rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 50,
        message: 'Too many requests from this IP, please retry after 1 minutes.',
      });
      app.use(limiter);
      const allowedOrigin = process.env.CORS_ORIGIN || poolConfig.poolUrl || '*';
      app.use(cors({ origin: allowedOrigin }));

      var server;
      if (https_enabled) {
        let config = FileUtils.readJsonFileSync('/sslconfig.json');
        var sslOptions = {
          key: fs.readFileSync(config.ssl.key),
          cert: fs.readFileSync(config.ssl.cert)
        };
        server = https.createServer(sslOptions, app);
      } else {
        server = http.createServer(app);
      }

      app.get('/api/v1/daily/metrics/:daytimestamp', async (req, res) => {
        try {
          let response = await APIHelper.getPoolDailyMetrics(req, this.poolConfig, this.mongoInterface);
          res.send(response);
        } catch (err) {
          console.error('API error:', err.message);
          res.status(500).json({ error: 'Internal server error' });
        }
      });
      app.get('/api/v1/daily/networkmetrics/:daytimestamp', async (req, res) => {
        try {
          let response = await APIHelper.getNetworkDailyMetrics(req, this.poolConfig, this.mongoInterface);
          res.send(response);
        } catch (err) {
          console.error('API error:', err.message);
          res.status(500).json({ error: 'Internal server error' });
        }
      });
      app.get('/api/v1/minerhashrate/:minerEthAddress', async (req, res) => {
        try {
          let response = await APIHelper.getHashrateMiner(req, this.mongoInterface);
          res.send(response);
        } catch (err) {
          console.error('API error:', err.message);
          res.status(500).json({ error: 'Internal server error' });
        }
      });
      app.get('/api/v1/checkmineranyshare/:minerEthAddress', async (req, res) => {
        try {
          let response = await APIHelper.checkMinerAnyShare(req, this.mongoInterface);
          res.send(response);
        } catch (err) {
          console.error('API error:', err.message);
          res.status(500).json({ error: 'Internal server error' });
        }
      });
      app.post('/api/v1/poolinfo', async (req, res) => {
        try {
          let fromPoolInfo = req.body;
          let response = await APIHelper.getNetworkPoolInfofrom(fromPoolInfo, this.poolConfig, this.mongoInterface);
          res.send(response);
        } catch (err) {
          console.error('API error:', err.message);
          res.status(500).json({ error: 'Internal server error' });
        }
      });
      // Register v2 API routes BEFORE the v1 catch-all
      var dataCache = DataCache.getInstance();
      registerApiV2Routes(app, poolConfig, mongoInterface, dataCache);

      app.get('/api/v1/:query', async (req, res) => {
        try {
          let response = await APIHelper.handleApiRequest(req, this.poolConfig, this.mongoInterface);
          res.send(response);
        } catch (err) {
          console.error('API error:', err.message);
          res.status(500).json({ error: 'Internal server error' });
        }
      });

      let __dirname = path.resolve();
      const distPath = process.env.FRONTEND_DIST_PATH || 'dist';
      const staticFileMiddleware = express.static(distPath);
      app.use(staticFileMiddleware);
      app.use(history({ disableDotRule: true, verbose: true }));
      app.use(staticFileMiddleware);

      const httpPort = parseInt(process.env.HTTP_PORT) || 80;
      app.listen(httpPort, function () {
        console.log(`Express serving on ${httpPort}!`);
      });

      this.startSocketServer(server);
  }

  // Stratum only mode (TCP stratum servers + JSONRPC, no Express)
  async initStratumOnly(poolConfig, mongoInterface, redisInterface) {
      if(process.env.DEBUG) console.log("init web server (stratum-only mode)...")

      this.mongoInterface = mongoInterface;
      this.poolConfig = poolConfig;
      this.redisInterface = redisInterface;
      this.workers = new Set();
      this.banDuration = 10000;

      // Use Redis ban list if available, otherwise fall back to in-memory Set
      this.bannedIPs = new Set(); // always init as safety net
      if (redisInterface && redisInterface.getClient()) {
        this.redisBanList = new RedisBanList(redisInterface.getClient());
      }

      this.startSratumServer();

      const miningContractData = await TokenDataHelper.getRecentMiningContractData(this.mongoInterface);
      this.challengeNumber = miningContractData.challengeNumber;
      setTimeout(() => {
        this.CheckChallengeNumberForWorkers();
      }, 15000);
  }


  setupWorkerEvent() {
    if(process.env.DEBUG) console.log('setupWorker called');
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
  const handler = GeneralEventEmitterHandler.getInstance();
  const listener = (miningContractData) => {
    if (miningContractData != null && miningContractData.challengeNumber && this.challengeNumber != miningContractData.challengeNumber){
      this.challengeNumber = miningContractData.challengeNumber;
      this.handleUpdateForAllWorkers(miningContractData);
    }
  };
  if (handler.redisPubSub) {
    await handler.onCrossProcess('newChallenge', listener);
  } else {
    handler.on('newChallenge', listener);
  }
}

          async startSratumServer(){

              if(process.env.DEBUG) console.log('startSratumServer called');
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

            const dataLimiter = new RateLimiterMemory({
              points: 10, // Allow 5 connections per second per IP
              duration: 1, // Per second
            });

            // Track rate limit violations per IP — only ban after repeated abuse
            const rateLimitStrikes = new Map(); // ip -> { count, firstStrike }
            const STRIKES_BEFORE_BAN = 5;
            const STRIKE_WINDOW = 30000; // 30 seconds

            portConfigs.forEach(config => {

              const portMinimumTarget = PeerHelper.getTargetFromDifficulty(config.difficulty);

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

                const isBanned = await this.isIPBanned(ipAddress);
                if (isBanned) {
                  //console.log(`Rejected banned IP: ${ipAddress}`);
                  return socket.end('IP is banned');
                }

              try {

                socket.once("data", (data) => {

                  try {

                    dataLimiter.consume(ipAddress, 2) // consume 2 points
                    .then((rateLimiterRes) => {
                      // 2 points consumed
                      poolConfig.minimumTarget = portMinimumTarget;
                      const worker = new Worker(socket, poolConfig, PoolStatsHelper, TokenDataHelper, mongoInterface, this.redisInterface);
                      this.emit('worker', worker);
                      worker._handleStream(data);
                    })
                    .catch((rateLimiterRes) => {
                      // Rate limit exceeded — just reject, only ban after repeated violations
                      socket.end('Rate limit exceeded');
                      const now = Date.now();
                      const strike = rateLimitStrikes.get(ipAddress);
                      if (!strike || (now - strike.firstStrike) > STRIKE_WINDOW) {
                        rateLimitStrikes.set(ipAddress, { count: 1, firstStrike: now });
                      } else {
                        strike.count++;
                        if (strike.count >= STRIKES_BEFORE_BAN) {
                          rateLimitStrikes.delete(ipAddress);
                          this.banIP(ipAddress).catch(err => console.error('banIP error:', err));
                        }
                      }
                    });


                  } catch (error) {
                    socket.end('Rate limit exceeded');
                  }

                });

              } catch (error) {
                // console.log(`Connection rate limit exceeded for ${ipAddress}`);
                socket.end('Connection rate limit exceeded');
              }

              });

              stratumserver.listen(config.port, function () {
                console.log(`Stratum Server serving on ${config.port}!`);
              });
          
              stratumserver.on('error', (err) => {
                console.error(`Stratum server error on port ${config.port}:`, err);
              });

            });

          }


          async banIP(ipAddress) {
            if (this.redisBanList) {
              try {
                await this.redisBanList.add(ipAddress, this.banDuration);
                console.log(`IP banned (Redis): ${ipAddress}`);
                return;
              } catch (err) {
                console.error('Redis ban failed, falling back to local Set:', err.message);
              }
            }
            if (!this.bannedIPs.has(ipAddress)) {
              this.bannedIPs.add(ipAddress);
              console.log(`IP banned: ${ipAddress}`);
              setTimeout(() => {
                this.bannedIPs.delete(ipAddress);
                console.log(`IP unbanned: ${ipAddress}`);
              }, this.banDuration);
            }
          }

          async isIPBanned(ipAddress) {
            if (this.redisBanList) {
              try {
                return await this.redisBanList.has(ipAddress);
              } catch (err) {
                console.error('Redis ban list check failed, falling back to local Set:', err.message);
              }
            }
            return this.bannedIPs && this.bannedIPs.has(ipAddress);
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

      // Strip _id before broadcasting
      var safePoolData = poolData;
      var safePoolStatus = poolStatus;
      var safePoolStatsRecord = poolStatsRecord;
      if (poolData && poolData._id) { var { _id, ...safePoolData } = poolData; }
      if (poolStatus && poolStatus._id) { var { _id: _id2, ...safePoolStatus } = poolStatus; }
      if (poolStatsRecord && poolStatsRecord._id) { var { _id: _id3, ...safePoolStatsRecord } = poolStatsRecord; }

      io.to('pool-stats').emit('poolUpdate', {
        poolData: safePoolData,
        poolStatus: safePoolStatus,
        poolNameAndUrl: poolNameAndUrl,
        LastpoolStatsRecord: safePoolStatsRecord
      });
    } catch (err) {
      console.error('broadcastPoolUpdate error:', err);
    }
  }

  async startPoolDataBroadcast(io, poolConfig, mongoInterface, dataCache) {
    setInterval(() => {
      this.broadcastPoolUpdate(io, poolConfig, mongoInterface, dataCache);
    }, 30000);

    const handler = GeneralEventEmitterHandler.getInstance();
    const listener = () => {
      dataCache.invalidate('poolData');
      dataCache.invalidate('poolStatus');
      this.broadcastPoolUpdate(io, poolConfig, mongoInterface, dataCache);
    };
    // Use cross-process listener if Redis Pub/Sub is available, otherwise local-only
    if (handler.redisPubSub) {
      await handler.onCrossProcess('newChallenge', listener);
    } else {
      handler.on('newChallenge', listener);
    }

    // Chart linedata incremental push
    const chartUpdateListener = (data) => {
      io.to('pool-stats').emit('chartUpdate', data);
    };
    if (handler.redisPubSub) {
      handler.onCrossProcess('chartUpdate', chartUpdateListener).catch(err => {
        console.error('chartUpdate listener registration failed:', err);
      });
    } else {
      handler.on('chartUpdate', chartUpdateListener);
    }

    // Incremental events: push new blocks and payments to connected clients
    const mintListener = (data) => {
      io.to('pool-stats').emit('newBlock', data);
    };
    const paymentListener = (data) => {
      io.to('pool-stats').emit('newPayment', data);
    };
    if (handler.redisPubSub) {
      handler.onCrossProcess('newMint', mintListener).catch(err => {
        console.error('newMint listener registration failed:', err);
      });
      handler.onCrossProcess('newBatchedPayment', paymentListener).catch(err => {
        console.error('newBatchedPayment listener registration failed:', err);
      });
    } else {
      handler.on('newMint', mintListener);
      handler.on('newBatchedPayment', paymentListener);
    }
  }

  startSocketServer(server )
  {

    var io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || this.poolConfig.poolUrl || '*',
        methods: ['GET', 'POST']
      }
    });
    this.io = io;
    var port = parseInt(process.env.SOCKETIO_PORT) || 2053;


    ///  https://socket.io/docs/rooms-and-namespaces/#


    server.listen(port, function () {
      console.log('Socket server listening at port %d', port);
    });

    var sockets = {};

    var mongoInterface = this.mongoInterface
    var poolConfig = this.poolConfig
    var dataCache = DataCache.getInstance();

    this.startPoolDataBroadcast(io, poolConfig, mongoInterface, dataCache);

    var socketRateLimiter = new RateLimiterMemory({
        points: 30,    // 30 events
        duration: 10,  // per 10 seconds
    });

    // Validate ethMinerAddress from socket data. Returns sanitized address or null.
    function validateAddress(data) {
      if (!data || typeof data !== 'object') return null;
      if (!data.ethMinerAddress || typeof data.ethMinerAddress !== 'string') return null;
      var addr = data.ethMinerAddress.substring(0, 42);
      if (!web3utils.isAddress(addr)) return null;
      return addr;
    }

    // Clamp a numeric parameter to a safe integer range.
    function clampInt(value, defaultVal, max) {
      var n = parseInt(value);
      if (isNaN(n) || n < 1) return defaultVal;
      return Math.min(n, max);
    }

    var connectionsPerIP = new Map();
    var MAX_CONNECTIONS_PER_IP = 10;

    io.on('connection', function (socket) {

          var clientIP = socket.handshake.address;
          var currentCount = connectionsPerIP.get(clientIP) || 0;
          if (currentCount >= MAX_CONNECTIONS_PER_IP) {
              socket.disconnect(true);
              return;
          }
          connectionsPerIP.set(clientIP, currentCount + 1);

          socket.join('pool-stats');

          socket.use((packet, next) => {
              var clientIP = socket.handshake.address;
              socketRateLimiter.consume(clientIP)
                  .then(() => next())
                  .catch(() => {
                      next(new Error('Rate limit exceeded'));
                  });
          });

          socket.on('subscribeMiner', function (data) {
            var raw = (typeof data === 'string') ? data : (data && data.ethMinerAddress);
            if (raw) {
              var addr = raw.toString().substr(0, 42);
              if (web3utils.isAddress(addr)) {
                socket.join('miner:' + addr.toLowerCase());
              }
            }
          });

          socket.on('unsubscribeMiner', function (data) {
            var raw = (typeof data === 'string') ? data : (data && data.ethMinerAddress);
            if (raw) {
              var addr = raw.toString().substr(0, 42);
              if (web3utils.isAddress(addr)) {
                socket.leave('miner:' + addr.toLowerCase());
              }
            }
          });

          socket.on('ping', function (data) {
              socket.emit('pong', {
                  message:'pong'
                });
             });



             socket.on('getPoolData', async function (data) {
              try {
              var poolData = dataCache.get('poolData');
              if (!poolData) {
                poolData = await PoolStatsHelper.getPoolData( poolConfig, mongoInterface );
                dataCache.set('poolData', poolData, 30000);
              }

              if (poolData && poolData._id) {
                var { _id, ...safePoolData } = poolData;
                socket.emit('poolData', safePoolData);
              } else {
                socket.emit('poolData', poolData);
              }
              } catch (err) { console.error('getPoolData error:', err.message); }

             });


             socket.on('getPoolStatus', async function (data) {
              try {
              let poolStatus = dataCache.get('poolStatus');
              if (!poolStatus) {
                poolStatus = await PoolStatsHelper.getPoolStatus( poolConfig, mongoInterface );
                dataCache.set('poolStatus', poolStatus, 8000);
              }

              if (poolStatus && poolStatus._id) {
                var { _id, ...safePoolStatus } = poolStatus;
                socket.emit('poolStatus', safePoolStatus);
              } else {
                socket.emit('poolStatus', poolStatus);
              }
              } catch (err) { console.error('getPoolStatus error:', err.message); }

             });


             socket.on('getPoolName', async function (data) {
              try {
              var poolName = poolConfig.poolName;

              socket.emit('poolName',  poolName);
              } catch (err) { console.error('getPoolName error:', err.message); }

             });

             socket.on('getPoolNameAndUrl', async function (data) {
              try {
              var poolNameAndUrl = {poolName: poolConfig.poolName, poolUrl: poolConfig.poolUrl};

              socket.emit('poolNameAndUrl',  poolNameAndUrl);
              } catch (err) { console.error('getPoolNameAndUrl error:', err.message); }

             });


             socket.on('getLastPoolStatsRecord', async function (data) {
              try {
              let poolStatsRecord = dataCache.get('lastPoolStatsRecord');
              if (!poolStatsRecord) {
                poolStatsRecord = await PoolStatsHelper.getLastPoolStatsRecord( poolConfig, mongoInterface );
                dataCache.set('lastPoolStatsRecord', poolStatsRecord, 60000);
              }

              if (poolStatsRecord && poolStatsRecord._id) {
                var { _id, ...safePoolStatsRecord } = poolStatsRecord;
                socket.emit('LastpoolStatsRecord', safePoolStatsRecord);
              } else {
                socket.emit('LastpoolStatsRecord', poolStatsRecord);
              }
              } catch (err) { console.error('getLastPoolStatsRecord error:', err.message); }

             });


             socket.on('get24hPoolStatsRecords', async function (data) {
              try {
              let poolStatsRecords = dataCache.get('24hPoolStatsRecords');
              if (!poolStatsRecords) {
                poolStatsRecords = await PoolStatsHelper.get24hPoolStatsRecords( poolConfig, mongoInterface );
                dataCache.set('24hPoolStatsRecords', poolStatsRecords, 60000);
              }

              socket.emit('24hpoolStatsRecords',  poolStatsRecords);
              } catch (err) { console.error('get24hPoolStatsRecords error:', err.message); }

             });

             socket.on('getLastNetworkStatsRecord', async function (data) {
              try {
              let networkStatsRecord = dataCache.get('lastNetworkStatsRecord');
              if (!networkStatsRecord) {
                networkStatsRecord = await PoolStatsHelper.getLastNetworkStatsRecord( poolConfig, mongoInterface );
                dataCache.set('lastNetworkStatsRecord', networkStatsRecord, 60000);
              }

              socket.emit('LastnetworkStatsRecord',  networkStatsRecord);
              } catch (err) { console.error('getLastNetworkStatsRecord error:', err.message); }

             });


             socket.on('get24hNetworkStatsRecords', async function (data) {
              try {
              let networkStatsRecords = dataCache.get('24hNetworkStatsRecords');
              if (!networkStatsRecords) {
                networkStatsRecords = await PoolStatsHelper.get24hNetworkStatsRecords( poolConfig, mongoInterface );
                dataCache.set('24hNetworkStatsRecords', networkStatsRecords, 60000);
              }

              socket.emit('24hnetworkStatsRecords',  networkStatsRecords);
              } catch (err) { console.error('get24hNetworkStatsRecords error:', err.message); }

             });



             socket.on('getRecentSolutions', async function (data) {
              try {
              var txData = dataCache.get('recentSolutions');
              if (!txData) {
                let query = {txType:'solution'}
                txData = await TransactionHelper.findRecentTransactionsWithQuery(query,  mongoInterface );
                dataCache.set('recentSolutions', txData, 30000);
              }

              socket.emit('recentSolutions',  txData);
              } catch (err) { console.error('getRecentSolutions error:', err.message); }

             });


             socket.on('getRecentPayments', async function (data) {
              try {
              var txData = dataCache.get('recentPayments');
              if (!txData) {
                let query = {txType:'batched_payment', txHash: { $ne: null }, status: { $in: ['pending', 'success', 'reverted'] }}
                txData = await TransactionHelper.findRecentTransactionsWithQuery(query,  mongoInterface );
                dataCache.set('recentPayments', txData, 30000);
              }

              socket.emit('recentPayments',  txData);
              } catch (err) { console.error('getRecentPayments error:', err.message); }

             });


             socket.on('getMinerData', async function (data) {
              try {
              var addr = validateAddress(data);
              if (!addr) return socket.emit('error', {message: 'Invalid address'});

              var result = await PeerHelper.getMinerData(addr,  mongoInterface )

              socket.emit('minerData',  result);
              } catch (err) { console.error('getMinerData error:', err.message); }

             });


             socket.on('getMinerDataWithWorkers', async function (data) {
              try {
              var addr = validateAddress(data);
              if (!addr) return socket.emit('error', {message: 'Invalid address'});

              var result = await PeerHelper.getMinerDataWithWorkers(addr,  mongoInterface )

              socket.emit('minerDataWithWorkers',  result);
              } catch (err) { console.error('getMinerDataWithWorkers error:', err.message); }

             });

             socket.on('getMinerShares', async function (data) {
              try {
              var addr = validateAddress(data);
              if (!addr) return socket.emit('error', {message: 'Invalid address'});

              var result = await PeerHelper.getMinerPreShares(addr,  mongoInterface )

              socket.emit('minerShares',  result);
              } catch (err) { console.error('getMinerShares error:', err.message); }

             });

             socket.on('getMinerPayments', async function (data) {
              try {
              var addr = validateAddress(data);
              if (!addr) return socket.emit('error', {message: 'Invalid address'});

              var txData = await PeerHelper.getMinerBalancePayments(addr,  mongoInterface )

              socket.emit('minerPayments',  txData);
              } catch (err) { console.error('getMinerPayments error:', err.message); }

             });

             socket.on('getMinerList', async function (data) {
              try {
              var result = dataCache.get('minerList');
              if (!result) {
                result = await PeerHelper.getMinerListForDisplay(mongoInterface);
                dataCache.set('minerList', result, 30000);
              }
              socket.emit('minerList', result);
              } catch (err) { console.error('getMinerList error:', err.message); }
             });

             socket.on('getActiveMinerList', async function (data) {
              try {
              var result = dataCache.get('activeMinerList');
              if (!result) {
                result = await PeerHelper.getMinerListForDisplay(mongoInterface);
                dataCache.set('activeMinerList', result, 30000);
              }
              socket.emit('minerList', result);
              } catch (err) { console.error('getActiveMinerList error:', err.message); }
             });

             socket.on('getActiveMinerListDisplay', async function (data) {
              try {
              var result = dataCache.get('activeMinerListDisplay');
              if (!result) {
                result = await PeerHelper.getMinerListForDisplay( mongoInterface );
                dataCache.set('activeMinerListDisplay', result, 30000);
              }

              socket.emit('activeMinerListDisplay',  result);
              } catch (err) { console.error('getActiveMinerListDisplay error:', err.message); }

             });

             socket.on('getShareList', async function (data) {
              try {
              var result = dataCache.get('shareList');
              if (!result) {
                result = await mongoInterface.findAllSortedWithLimit('miner_shares', {}, {time: -1}, 200);
                dataCache.set('shareList', result, 30000);
              }
              socket.emit('shareList', result);
              } catch (err) { console.error('getShareList error:', err.message); }
             });


             socket.on('getMinerChallengeDetails', async function (data) {
              try {
              var addr = validateAddress(data);
              if (!addr) return socket.emit('error', {message: 'Invalid address'});
              var nbchallenges = clampInt(data.nbchallenges, 10, 100);

              var result = await PeerHelper.getMinerChallengeDetails(addr, nbchallenges,  mongoInterface )

              socket.emit('MinerChallengeDetails',  result);
              } catch (err) { console.error('getMinerChallengeDetails error:', err.message); }

             });


             socket.on('getMintList', async function (data) {
              try {
              var nbmints = clampInt(data && data.nbmints, 10, 200);

              var result = await PeerHelper.getMintList( nbmints,  mongoInterface )

              socket.emit('mintList',  result);
              } catch (err) { console.error('getMintList error:', err.message); }

             });


             socket.on('getMiningContracts', async function (data) {
              try {
              var nbcontracts = clampInt(data && data.nbcontracts, 10, 200);

              var result = await TokenDataHelper.getLastMiningContracts(mongoInterface, nbcontracts)

              socket.emit('miningContracts',  result);
              } catch (err) { console.error('getMiningContracts error:', err.message); }

             });

             socket.on('getPoolMints', async function (data) {
              try {
              var nbpoolmints = clampInt(data && data.nbpoolmints, 10, 200);

              var result = await PeerHelper.getPoolMints( nbpoolmints,  mongoInterface )

              socket.emit('poolMints',  result);
              } catch (err) { console.error('getPoolMints error:', err.message); }

             });


             socket.on('getMintAddresses', async function (data) {
              try {
              var result = dataCache.get('mintAddresses');
              if (!result) {
                result = await PeerHelper.getMintAddresses(mongoInterface);
                dataCache.set('mintAddresses', result, 60000);
              }
              socket.emit('mintAddressesList', result);
              } catch (err) { console.error('getMintAddresses error:', err.message); }
             });


             socket.on('getPoolList', async function (data) {
              try {
              var result = dataCache.get('poolList');
              if (!result) {
                result = await PeerHelper.getPoolList(poolConfig, mongoInterface);
                dataCache.set('poolList', result, 60000);
              }
              socket.emit('poolList', result);
              } catch (err) { console.error('getPoolList error:', err.message); }
             });

             socket.on('getStatsPayment', async function () {
              try {
              let statsPayment = dataCache.get('statsPayment');
              if (!statsPayment) {
                statsPayment = await PoolStatsHelper.getStatsPayment( poolConfig, mongoInterface );
                dataCache.set('statsPayment', statsPayment, 60000);
              }

              socket.emit('statsPayment',  statsPayment);
              } catch (err) { console.error('getStatsPayment error:', err.message); }

             });

             socket.on('getMinerPpnlsRewards', async function (data) {
              try {
              var addr = validateAddress(data);
              if (!addr) return socket.emit('error', {message: 'Invalid address'});
              var nbrewards = clampInt(data.nbrewards, 10, 100);

              let PpnlsRewards = await PeerHelper.getPpnlsRewards( addr, nbrewards, mongoInterface )

              socket.emit('MinerPpnlsRewards',  PpnlsRewards);
              } catch (err) { console.error('getMinerPpnlsRewards error:', err.message); }

             });

      socket.on('disconnect', function () {
        var count = connectionsPerIP.get(clientIP) || 1;
        if (count <= 1) {
            connectionsPerIP.delete(clientIP);
        } else {
            connectionsPerIP.set(clientIP, count - 1);
        }
        delete sockets[socket.sid];
      });
    });



  }




}
