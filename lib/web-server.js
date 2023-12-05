  
  
  
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
 

export default class WebServer  {


  //https_enabled,webInterface,peerInterface,web3apihelper 
  async init( https_enabled, poolConfig, mongoInterface   )
  {
      console.log("init web server...")

      this.mongoInterface=mongoInterface;
      this.poolConfig=poolConfig;
      //this.webInterface=webInterface;
      //this.peerInterface=peerInterface;

      //this.web3apihelper=web3apihelper;


            const app = express()
            app.use(express.json());
            
            // Apply rate limiting middleware with a limit of 50 requests per 10 minutes
            const limiter = rateLimit({
            windowMs: 7 * 60 * 1000, // 2 minutes (used to be 10 minutes)
            max: 50, // limit each IP to 50 requests per windowMs
            message: 'Too many requests from this IP, please retry after 7 minutes.',
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


      app.get('/api/v1/:query', async (req, res) => {         
          
        let response = await APIHelper.handleApiRequest( req , this.poolConfig, this.mongoInterface )

        res.send(response)
      })

      app.get('/api/v1/daily/metrics/:daytimestamp', async (req, res) => {         
          
        let response = await APIHelper.getPoolDailyMetrics( req , this.poolConfig, this.mongoInterface )

        res.send(response)
      })

      app.get('/api/v1/daily/networkmetrics/:daytimestamp', async (req, res) => {         
          
        let response = await APIHelper.getNetworkDailyMetrics( req , this.poolConfig, this.mongoInterface )

        res.send(response)
      })

      app.post('/api/v1/poolinfo', async (req, res) => {         

        let fromPoolInfo = req.body;
        //let senderhost = req.header('Host'); implement potential checker compare host and pool url
        let response = await APIHelper.getNetworkPoolInfofrom( fromPoolInfo , this.poolConfig, this.mongoInterface )

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
  } 

  startSocketServer(server )
  {
 
    var io = new Server(server);
    //var port = process.env.PORT || 2052;
    var port = 2052;


    ///  https://socket.io/docs/rooms-and-namespaces/#


    server.listen(port, function () {
      console.log('Socket server listening at port %d', port);
    });

    var sockets = {};

    var mongoInterface = this.mongoInterface
    var poolConfig = this.poolConfig


    io.on('connection', function (socket) {
     // console.log('established new socket connection');


          socket.on('ping', function (data) {
            console.log('ping', data);

              io.emit('pong', {
                  message:'pong'
                });


             });



             socket.on('getPoolData', async function (data) {

              var poolData = await PoolStatsHelper.getPoolData( poolConfig, mongoInterface );

              socket.emit('poolData',  poolData);

             // console.log('poolData event emitted with data:', poolData);

              
             });


             socket.on('getPoolStatus', async function (data) { 
              
              let poolStatus = await PoolStatsHelper.getPoolStatus( poolConfig, mongoInterface )
      
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
              
              let poolStatsRecord = await PoolStatsHelper.getLastPoolStatsRecord( poolConfig, mongoInterface )
      
              socket.emit('LastpoolStatsRecord',  poolStatsRecord);


             });


             socket.on('get24hPoolStatsRecords', async function (data) { 
              
              let poolStatsRecords = await PoolStatsHelper.get24hPoolStatsRecords( poolConfig, mongoInterface )
      
              socket.emit('24hpoolStatsRecords',  poolStatsRecords);


             });

             socket.on('getLastNetworkStatsRecord', async function (data) { 
              
              let networkStatsRecord = await PoolStatsHelper.getLastNetworkStatsRecord( poolConfig, mongoInterface )
      
              socket.emit('LastnetworkStatsRecord',  networkStatsRecord);


             });


             socket.on('get24hNetworkStatsRecords', async function (data) { 
              
              let networkStatsRecords = await PoolStatsHelper.get24hNetworkStatsRecords( poolConfig, mongoInterface )
      
              socket.emit('24hnetworkStatsRecords',  networkStatsRecords);


             });



             socket.on('getRecentSolutions', async function (data) {

              let query = {txType:'solution'}

              var txData = await TransactionHelper.findRecentTransactionsWithQuery(query,  mongoInterface )

              socket.emit('recentSolutions',  txData);


             });


             socket.on('getRecentPayments', async function (data) {

              let query = {txType:'batched_payment'}

              var txData = await TransactionHelper.findRecentTransactionsWithQuery(query,  mongoInterface )

              socket.emit('recentPayments',  txData);


             });


             socket.on('getMinerData', async function (data) {

               
              var result = await PeerHelper.getMinerData(data.ethMinerAddress,  mongoInterface )

              socket.emit('minerData',  result);


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
              
              let statsPayment = await PoolStatsHelper.getStatsPayment( poolConfig, mongoInterface )
      
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
