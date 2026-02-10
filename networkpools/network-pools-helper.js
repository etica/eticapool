 
import https from 'https'

const API_INTERVAL = 1000*30 // thirty seconds 
 

import  cron from 'node-cron' 
import  axios from 'axios' 

  //perform this with a robust task runner  - bree  and /tasks folder 

  import PeerHelper from '../lib/util/peer-helper.js'
  import PoolStatsHelper from '../lib/util/pool-stats-helper.js'
  import web3utils from 'web3-utils'

import LoggingHelper from '../lib/util/logging-helper.js'


export default class NetworkPools  {

  constructor(mongoInterface, poolConfig ){
  
    this.poolConfig=poolConfig;
    this.mongoInterface=mongoInterface;

  }
  
  init(){
    NetworkPools.initNetworkNewPools(this.poolConfig,this.mongoInterface);
    NetworkPools.scanPoolsMintAddresses(this.poolConfig,this.mongoInterface);
  }
  

   update(){

    setInterval(function(){NetworkPools.scanNetworkNewPools(this.poolConfig,this.mongoInterface)}.bind(this),7200000) // 7 200 000 every 2 hours (12 times a day)
    setInterval(function(){NetworkPools.scanNetworkPoolsInfo(this.poolConfig,this.mongoInterface)}.bind(this),300000) // 300000   5 minutes
    setInterval(function(){NetworkPools.resetPools(this.mongoInterface)}.bind(this),600000) // 300000   10 minutes


    // every hour at 09 mins:
    cron.schedule('09 * * * *', async function() {
      NetworkPools.deactivatePools(this.mongoInterface)
    }.bind(this));

    // Every day at 00:01 am 
    cron.schedule('1 00 * * *', async function() {
      NetworkPools.reactivatePools(this.mongoInterface);
    }.bind(this));
    // Every day at 06:01 am 
    cron.schedule('1 06 * * *', async function() {
      NetworkPools.reactivatePools(this.mongoInterface);
    }.bind(this));
    // Every day at 12:01 am 
    cron.schedule('1 12 * * *', async function() {
      NetworkPools.reactivatePools(this.mongoInterface);
      NetworkPools.TurnOffSleepingPools(this.mongoInterface);
    }.bind(this));
    // Every day at 15:01 pm 
    cron.schedule('1 15 * * *', async function() {
      NetworkPools.reactivatePools(this.mongoInterface);
    }.bind(this));
    // Every day at 18:01 pm 
    cron.schedule('1 18 * * *', async function() {
      NetworkPools.reactivatePools(this.mongoInterface);
    }.bind(this));
    // Every day at 21:01 pm 
    cron.schedule('1 21 * * *', async function() {
      NetworkPools.reactivatePools(this.mongoInterface);
    }.bind(this));

    // every day at 21:24 mins:
    cron.schedule('24 21 * * *', async function() {
      NetworkPools.deleteDoublePools(this.mongoInterface)
    }.bind(this));

     // every day at 22:01 mins:
     cron.schedule('1 22 * * *', async function() {
      NetworkPools.scanPoolsMintAddresses(this.poolConfig, this.mongoInterface)
    }.bind(this));
 
  } 


  /*
      * * * * *  command to execute
      ┬ ┬ ┬ ┬ ┬
      │ │ │ │ │
      │ │ │ │ │
      │ │ │ │ └───── day of week (0 - 7) (0 to 6 are Sunday to Saturday, or use names; 7 is Sunday, the same as 0)
      │ │ │ └────────── month (1 - 12)
      │ │ └─────────────── day of month (1 - 31)
      │ └──────────────────── hour (0 - 23)
      └───────────────────────── min (0 - 59)
*/

/*

FLOW

scanNetworkPoolsInfo()
Runs every 10 minutes. 
It increases nb fails. If there is an error during function execution fails nb stayed with increased nb. If function reaches end successfully pool nb fails is set back to 0.
It tries to fetch information from pool.url to update pool hashrate and nb of miners
It checks if mining pool bockchain address retrieved from fetch url is already registered in network_pools_addresses, insert if not
*/


  static async initNetworkNewPools(poolConfig,mongoInterface){

      let thisPoolInfo = await NetworkPools.getNetworkPoolInfo(poolConfig, mongoInterface);
      let mainpeerpoolurl = poolConfig.MainPeerPoolUrl;

      try {

      let queryurl = ''+mainpeerpoolurl+'/api/v1/poolinfo';
      let mainpeerpoolinforesponse = await NetworkPools.axiospostRequestURL(queryurl, thisPoolInfo);
      let mainpeerpoolinfo = mainpeerpoolinforesponse.PoolInfo;

      let existpool = await  mongoInterface.findOne('network_pools', {name: mainpeerpoolinfo.name, url: mainpeerpoolinfo.url}  );

      // if pool not in db yet, save pool info in 'newpools_checker' table:
      if(!existpool){
        let candidatepool = {
          name: mainpeerpoolinfo.name,
          mintAddress: mainpeerpoolinfo.mintAddress,
          url: mainpeerpoolinfo.url,
          Hashrate: mainpeerpoolinfo.Hashrate,
          Numberminers: mainpeerpoolinfo.Numberminers,
          status: 1,
        }
        // check name, networkid and url fields type string and max X characters
        await NetworkPools.CheckAndInsertNewPool(candidatepool, poolConfig.poolUrl, mongoInterface);
      }
  
        // sync with Network:
        await NetworkPools.scanNetworkNewPools(poolConfig,mongoInterface);
        await NetworkPools.scanNetworkPoolsInfo(poolConfig,mongoInterface);

      }
    catch(error) {
     // console.log('A network pool endpoint responded with error: ', error)
    }

  }


  // run twice a day: / 
  static async scanNetworkNewPools(poolConfig,mongoInterface){
    let max_peers_scanned_per_round = 5;
    let max_newpools_loop_per_peer = 10;
    let network_pools = await  mongoInterface.findAllSortedWithLimit('network_pools', {}, {lastscannewpools:1}, max_peers_scanned_per_round );

    for(let onepool of network_pools)
    {
       // update lastscannewpools
       let _lastscannewpools = PeerHelper.getTimeNowSeconds();
       await mongoInterface.updateOne('network_pools',{_id:onepool._id}, {lastscannewpools: _lastscannewpools } )

     if(onepool.url){

      try {

      let queryurl = ''+onepool.url+'/api/v1/networkpools'
      let onepool_poolsresponse = await NetworkPools.axiosgetRequestURL(queryurl) // https://www.onepool.com/networkpools return objects with just pool name, pool address and pool url fields
      let onepool_pools = onepool_poolsresponse.Pools;
      // lopp through max 10 pools per peer:
      if(onepool_pools.length > max_newpools_loop_per_peer){
        onepool_pools = onepool_pools.splice(max_newpools_loop_per_peer);
      }
      
      for(let onenewpool of onepool_pools){

        let existsnewpool = await  mongoInterface.findOne('network_pools', {name: onenewpool.name, url: onenewpool.url}  );

      // if pool not in db yet, save it with 0 Hashrate and 0 Numberminers:
      if(!existsnewpool){
        var candidatepool = {
          name: onenewpool.name,
          mintAddress: onenewpool.mintAddress,
          url: onenewpool.url,
          Hashrate: 0,
          Numberminers: 0,
          status: 1,
        }
        // check name, networkid and url fields type string and max X characters

        await NetworkPools.CheckAndInsertNewPool(candidatepool, poolConfig.poolUrl, mongoInterface);

      }

      }


    }
    catch(error){
      // console.log('A network pool endpoint responded with error: ', error)
    }
     }

    }

  }



  
  static async CheckAndInsertNewPool(candidatepool, _poolUrl,mongoInterface){

    // only insert if candiate pool is not same name and url of server pool:
    if( (candidatepool.url != _poolUrl) )
    {

      try {
      
      // check url is an eticapool and that the name, url and mintAddress are valid:
      let queryurl = ''+candidatepool.url+'/api/v1/networkpoolinfo';
      let inforesponse = await NetworkPools.axiosgetRequestURL(queryurl);
      let askedpool = inforesponse.PoolInfo;
     if( askedpool && candidatepool.name == askedpool.name && candidatepool.url == askedpool.url && candidatepool.mintAddress == askedpool.mintAddress){


      // Add filters and checkers
      let checkedname = 0;
      let checkedurl = 0;
      let checkedaddress = 0;
      let checkedHashrate = 0;
      let checkedNumberminers = 0;


      if(candidatepool.name != null && candidatepool.name != '' && typeof candidatepool.name === 'string' && candidatepool.name.length < 60){
      checkedname = 1;
      }
      if(candidatepool.url != null && candidatepool.url != '' && typeof candidatepool.url === 'string' && candidatepool.url.length < 200){
        checkedurl = 1;
      }

      if(candidatepool.mintAddress != null && candidatepool.mintAddress != '' && typeof candidatepool.mintAddress === 'string' && web3utils.isAddress(candidatepool.mintAddress)){
        checkedaddress = 1;
      }

      if(Number.isInteger(candidatepool.Hashrate)){
        checkedHashrate = 1;
      }

      if(Number.isInteger(candidatepool.Numberminers)){
        checkedNumberminers = 1;
      }

      if(checkedname == 1 && checkedurl == 1 && checkedaddress == 1 && checkedHashrate ==1 && checkedNumberminers ==1){
        let lastupdate = PeerHelper.getTimeNowSeconds();
        candidatepool.lastupdate = lastupdate; // last update of pool's metric
        candidatepool.lastupdatetry = lastupdate; // last try update of pool's metric, updated even when pool url doesnt reply
        candidatepool.fails = 0; // metric that keeptrack of many failed connections to this pool in a raw, delete pool if too much
        candidatepool.reactivatefails = 0; // metric that keeptrack of many failed reactivations
        candidatepool.lastscannewpools = 0; // last scan of pool's new_pools
        await mongoInterface.insertOne('network_pools', candidatepool);
      }

     }

    }
    catch(error) {
    //  console.log('A network pool endpoint responded with error: ', error)
    }

    }   

  }



  // select pool to update based on it local db _id:
  static async CheckAndUpdatePool( _poolid , _Hashrate, _Numberminers,mongoInterface){
    // Add filters and checkers
    let checkedHashrate = 0;
    let checkedNumberminers = 0;

    if(Number.isInteger(_Hashrate)){
      checkedHashrate = 1;
    }

    if(Number.isInteger(_Numberminers)){
      checkedNumberminers = 1;
    }

    if(checkedHashrate ==1 && checkedNumberminers ==1){
      let _lastupdate = PeerHelper.getTimeNowSeconds();
      await mongoInterface.updateOne('network_pools',{_id:_poolid}, {Hashrate: _Hashrate, Numberminers: _Numberminers, lastupdate: _lastupdate } )
    }
    
   }

   // updates pool nb miners, hashrate and mintingaddress, based on pool url:
    static async CheckAndUpdatePool2( _poolname, _poolurl , _Hashrate, _Numberminers, _address, mongoInterface){
  // Add filters and checkers for hashrate and nbminers
  // _address already checked by CheckandIsert and scanNetworkPoolsInfo
  let checkedHashrate = 0;
  let checkedNumberminers = 0;

  if(Number.isInteger(_Hashrate)){
    checkedHashrate = 1;
  }

  if(Number.isInteger(_Numberminers)){
    checkedNumberminers = 1;
  }

  if(checkedHashrate ==1 && checkedNumberminers ==1){
    let _lastupdate = PeerHelper.getTimeNowSeconds();
    await mongoInterface.updateOne('network_pools',{name:_poolname, url: _poolurl}, { Hashrate: _Hashrate, Numberminers: _Numberminers, mintAddress: _address,lastupdate: _lastupdate, fails:0 } );
  }
  
  }

  static async CheckAndUpdatePoolAddressAndName(candidatepool, _poolUrl,mongoInterface){

    // only update if candiate pool is not same name and url of server pool:
    if( (candidatepool.url != _poolUrl) )
    {

      try {

      
      // check url is an eticapool and that the name, url and mintAddress are valid:
      let queryurl = ''+candidatepool.url+'/api/v1/networkpoolinfo';
      let inforesponse = await NetworkPools.axiosgetRequestURL(queryurl);
      let askedpool = inforesponse.PoolInfo;
     if( askedpool && candidatepool.name == askedpool.name && candidatepool.url == askedpool.url && candidatepool.mintAddress == askedpool.mintAddress){


      // Add filters and checkers
      let checkedname = 0;
      let checkedurl = 0;
      let checkedaddress = 0;


      if(candidatepool.name != null && candidatepool.name != '' && typeof candidatepool.name === 'string' && candidatepool.name.length < 60){
      checkedname = 1;
      }
      if(candidatepool.url != null && candidatepool.url != '' && typeof candidatepool.url === 'string' && candidatepool.url.length < 200){
        checkedurl = 1;
      }

      if(candidatepool.mintAddress != null && candidatepool.mintAddress != '' && typeof candidatepool.mintAddress === 'string' && web3utils.isAddress(candidatepool.mintAddress)){
        checkedaddress = 1;
      }

      if(checkedname == 1 && checkedurl == 1 && checkedaddress == 1){
        let lastupdate = PeerHelper.getTimeNowSeconds();
        candidatepool.lastupdate = lastupdate; // last update of pool's metric
        candidatepool.lastupdatetry = lastupdate; // last try update of pool's metric, updated even when pool url doesnt reply
        candidatepool.fails = 0; // metric that keeptrack of many failed connections to this pool in a raw, delete pool if too much
        await mongoInterface.updateOne('network_pools',{url: candidatepool.url}, { poolId: onepool._id, name: candidatepool.name, mintAddress: candidatepool.mintAddress, status:1, fails:0 } );
      }

     }

    }
    catch(error) {
     // console.log('A network pool endpoint responded with error: ', error)
    }

    }   

  }


  // run every 10 minutes
  static async scanNetworkPoolsInfo(poolConfig,mongoInterface){
    let time_trigger_updates = 600; // all network_pools with more than 10 minutes since last update will be updated
    let minTimeUpdate = (PeerHelper.getTimeNowSeconds() - time_trigger_updates);
    let network_pools = await  mongoInterface.findAllSortedWithLimit('network_pools', {status:1,lastupdate: {$lte:minTimeUpdate}}, {lastupdatetry:1}, 10  );
    let thisPoolInfo = await NetworkPools.getNetworkPoolInfo(poolConfig,mongoInterface);
    for(let onepool of network_pools)
    {

      // update lastscannewpools
      let _lastupdatetry = PeerHelper.getTimeNowSeconds();
      await mongoInterface.updateOneCustom('network_pools',{_id:onepool._id}, { $inc: {fails: 1}, $set: { lastupdatetry: _lastupdatetry } })

      if(onepool.url){

       try {

      let queryurl = ''+onepool.url+'/api/v1/poolinfo';
      let onepoolinforesponse = await NetworkPools.axiospostRequestURL(queryurl, thisPoolInfo) // https://www.onepool.com/poolinfo return objects with just pool Hashrate
      
      if(onepoolinforesponse && onepoolinforesponse.PoolInfo){

        let askedpool = onepoolinforesponse.PoolInfo;
        let currentaddress = onepool.mintAddress; // current address
  
        // if new address detected, check and update mint address:
        if( (onepool.mintAddress != askedpool.mintAddress) && web3utils.isAddress(askedpool.mintAddress)){

          currentaddress = askedpool.mintAddress;
          
          let existingAddress = await mongoInterface.findOne('network_pools_addresses', {mintAddress: askedpool.mintAddress});
          if(!existingAddress){
            await mongoInterface.insertOne('network_pools_addresses', { name: onepool.name, url: onepool.url, mintAddress: askedpool.mintAddress});
            }
        }
  
        if( askedpool && onepool.url == askedpool.url && (onepool.mintAddress != askedpool.mintAddress || onepool.name != askedpool.name)){
          // updates pool mintAddress and pool name
          await NetworkPools.CheckAndUpdatePoolAddressAndName(askedpool, poolConfig.poolUrl, mongoInterface);
        }
  
        else if(askedpool && onepool.url == askedpool.url) {
          // updates pool nb miners and pool hashrate
          await NetworkPools.CheckAndUpdatePool2(askedpool.name, askedpool.url, askedpool.Hashrate, askedpool.Numberminers, currentaddress, mongoInterface);
        }

      }

      }
      catch(error) {
       // console.log('A network pool endpoint responded with error: ', error)
      }

      }
    }
  }



  static  async getNetworkPools( mongoInterface, nbrecords )
    {

        let NetworkPools = await mongoInterface.findAllSortedWithLimit( "network_pools", {}, {lastscannewpools:1}, nbrecords );
        
        return NetworkPools;
 
    }


  static  async getNetworkPoolInfo( poolConfig, mongoInterface )
    {

        let poolStatsRecord = await PoolStatsHelper.getLastPoolStatsRecord( poolConfig, mongoInterface )
        let _hashrate = 0;
        let _numberminers = 0;
        if(poolStatsRecord && poolStatsRecord.length > 0){
          _hashrate = poolStatsRecord[0].Hashrate;
          _numberminers = poolStatsRecord[0].Numberminers;
        }
        // Identification though Pool Name and Pool url: if pool owner changes pool Name And keep address, the address remains associated to former pool Name
        // If pool owner changes mint Address but not name, the new address will be associated to former pool name
        var poolInfo = {
         name: poolConfig.poolName,
         url: poolConfig.poolUrl,
         Hashrate: _hashrate,
         Numberminers: _numberminers,
         mintAddress: poolConfig.mintingConfig.publicAddress,
        }
        return poolInfo;
    }



    static  async getNetworkPoolInfofrom( PoolInfofrom, poolConfig, mongoInterface, nbrecords )
    {
      // A) if pool name making request doesn't exists add it to network pools:
      let updatepool = await  mongoInterface.findOne('network_pools', {name: PoolInfofrom.name, url: PoolInfofrom.url}  );
      if(!updatepool){
        let _candidatepool = {
          name: PoolInfofrom.name,
          mintAddress: PoolInfofrom.mintAddress,
          url: PoolInfofrom.url,
          Hashrate: PoolInfofrom.Hashrate,
          Numberminers: PoolInfofrom.Numberminers,
          status: 1,
        }
        // checks on name, networkid, url and other fields:
        await NetworkPools.CheckAndInsertNewPool(_candidatepool, poolConfig.poolUrl, mongoInterface);
      }

        // B)  create poolInfo response:
        let poolStatsRecord = await PoolStatsHelper.getLastPoolStatsRecord( poolConfig, mongoInterface )
        let _hashrate = 0;
        let _numberminers = 0;
        if(poolStatsRecord && poolStatsRecord.length > 0){
          _hashrate = poolStatsRecord[0].Hashrate;
          _numberminers = poolStatsRecord[0].Numberminers;
        }
        // Identification though Pool Name and Pool Address: if pool owner changes pool Name And keep address, the address remains associated to former pool Name
        // If pool owner changes mint Address but not name, the new address will be associated to former pool name
        let _poolInfo = {
         name: poolConfig.poolName,
         url: poolConfig.poolUrl,
         Hashrate: _hashrate,
         Numberminers: _numberminers,
         mintAddress: poolConfig.mintingConfig.publicAddress,
        }
        return _poolInfo;
    }

  
  static  async getNetworkMintAddresses( mongoInterface )
    {

        let NetworkMintAddresses = await mongoInterface.findAll( "network_pools_addresses", {mintAddress: {$ne:null}} );
        
        return NetworkMintAddresses;
 
    }


    // pass all unreachable pools to staging zone (pool status: 2):
    static  async deactivatePools( mongoInterface )
    {

        let unreachablePools = await mongoInterface.findAll('network_pools', {status:1, fails: {$gte:5}} );

        for(let onepool of unreachablePools)
    {
      await mongoInterface.updateOne('network_pools',{_id:onepool._id}, {status: 2, Hashrate:0, Numberminers:0 } )
    }
        
        return unreachablePools;
 
    }

    // remove pool metrics if too much time since last update but let pool in status 1:
    static  async resetPools( mongoInterface )
    {

      let time_trigger_reset = 60 * 60; // 3600 secs = 1 hour since last update
      let minTimeUpdate = (PeerHelper.getTimeNowSeconds() - time_trigger_reset);
      let unreachablePools = await  mongoInterface.findAllSortedWithLimit('network_pools', {status:1,lastupdate: {$lte:minTimeUpdate}}, {lastupdate:1}, 10  );

        for(let onepool of unreachablePools)
    {
      await mongoInterface.updateOne('network_pools',{_id:onepool._id}, { Hashrate:0, Numberminers:0 } )
    }

    }


    // check all unreachable pools, pass reachable pools from status 2 -> to networking zone (pool status: 1):
    static  async reactivatePools( mongoInterface )
    {

        let unreachablePools = await mongoInterface.findAll('network_pools',{status: 2});

        for(let onepool of unreachablePools)
    {

      try {

      let queryurl = ''+onepool.url+'/api/v1/networkpoolinfo';
      let inforesponse = await NetworkPools.axiosgetRequestURL(queryurl);

      if(inforesponse && inforesponse.PoolInfo){

      let askedpool = inforesponse.PoolInfo;
      if( askedpool && askedpool.name && askedpool.url && askedpool.mintAddress){
        await mongoInterface.updateOne('network_pools',{_id:onepool._id}, {status: 1 , fails: 0, reactivatefails: 0} )
      }

        else if(onepool.reactivatefails > 10){
        let _incfails = onepool.reactivatefails + 1;
        await mongoInterface.updateOne('network_pools',{_id:onepool._id}, {status: 3, reactivatefails: _incfails} )
        }
        else {
        let incfails = onepool.reactivatefails + 1;
        await mongoInterface.updateOne('network_pools',{_id:onepool._id}, {reactivatefails: incfails} )
        }

      }

      else if(onepool.reactivatefails > 10){
        let _incfails = onepool.reactivatefails + 1;
        await mongoInterface.updateOne('network_pools',{_id:onepool._id}, {status: 3, reactivatefails: _incfails} )
        }
        else {
        let incfails = onepool.reactivatefails + 1;
        await mongoInterface.updateOne('network_pools',{_id:onepool._id}, {reactivatefails: incfails} )
        }
 
      }
      catch(error) {
       // console.log('A network pool endpoint responded with error: ', error)
       
       // if too much failures to reactivate pool, pass pool from status 2 to status 3 (stop trials to reactivate):
       if(onepool.reactivatefails > 10){
        let _incfails = onepool.reactivatefails + 1;
        await mongoInterface.updateOne('network_pools',{_id:onepool._id}, {status: 3, reactivatefails: _incfails} )
        }
        else {
        let incfails = onepool.reactivatefails + 1;
        await mongoInterface.updateOne('network_pools',{_id:onepool._id}, {reactivatefails: incfails} )
        }

      }

    }

   }

  // TurnOff pools that stay too long in status 3, pass them from status 3 to status 4:
  static  async TurnOffSleepingPools( mongoInterface )
  {

      let unreachablePools = await mongoInterface.findAll('network_pools',{status: 3});

      for(let onepool of unreachablePools)
  {

  try {

    let queryurl = ''+onepool.url+'/api/v1/networkpoolinfo';
    let inforesponse = await NetworkPools.axiosgetRequestURL(queryurl);

    if(inforesponse && inforesponse.PoolInfo){

    let askedpool = inforesponse.PoolInfo;
    if( askedpool && askedpool.name && askedpool.url && askedpool.mintAddress){
    await mongoInterface.updateOne('network_pools',{_id:onepool._id}, {status: 1 , fails: 0, reactivatefails: 0} )
    }

    else if(onepool.reactivatefails > 15){
      // > 15 means 5 days in status 3 (1 attempts a day for 5 days), pass pool in status 4 stop trying and delete if double pool entry:
      let incfails = onepool.reactivatefails + 1;
      await mongoInterface.updateOne('network_pools',{_id:onepool._id}, {status: 4, reactivatefails: 0} )
    }
    else {
      let incfails = onepool.reactivatefails + 1;
      await mongoInterface.updateOne('network_pools',{_id:onepool._id}, {reactivatefails: incfails} )
    }

    }

    else if(onepool.reactivatefails > 15){
      // > 15 means 5 days in status 3 (1 attempts a day for 5 days), pass pool in status 4 stop trying and delete if double pool entry:
      let incfails = onepool.reactivatefails + 1;
      await mongoInterface.updateOne('network_pools',{_id:onepool._id}, {status: 4, reactivatefails: 0} )
    }
    else {
      let incfails = onepool.reactivatefails + 1;
      await mongoInterface.updateOne('network_pools',{_id:onepool._id}, {reactivatefails: incfails} )
    }

  }
  catch(error) {

   // console.log('A network pool endpoint responded with error: ', error)
   if(onepool.reactivatefails > 15){
    // > 15 means 5 days in status 3 (1 attempts a day for 5 days), pass pool in status 4 stop trying and delete if double pool entry:
    let incfails = onepool.reactivatefails + 1;
    await mongoInterface.updateOne('network_pools',{_id:onepool._id}, {status: 4, reactivatefails: 0} )
  }
  else {
    let incfails = onepool.reactivatefails + 1;
    await mongoInterface.updateOne('network_pools',{_id:onepool._id}, {reactivatefails: incfails} )
  }

  }

  }

  }


   // insert unregistered pool addresses in network_pools_addresses:
   static async scanPoolsMintAddresses(poolConfig,mongoInterface){
 
    let network_pools = await  mongoInterface.findAllSortedWithLimit('network_pools', {}, {lastupdate:1}, 20  );

    for(let onepool of network_pools)
    {

      let existingAddress = await mongoInterface.findOne('network_pools_addresses', {mintAddress: onepool.mintAddress})

      if(!existingAddress){
        await mongoInterface.insertOne('network_pools_addresses', { poolId: onepool._id, name: onepool.name, mintAddress: onepool.mintAddress, url: onepool.url});
      }

    }

  }

    // Deletes pools in status 4, that have double entry (other pool with same name, or mintAddress):
    static  async deleteDoublePools( mongoInterface )
    {
  
        let unreachablePools = await mongoInterface.findAll('network_pools',{status: 4});
  
        for(let onepool of unreachablePools)
    {
      let doublePools = await mongoInterface.findAll('network_pools', {$or: [
        { url: onepool.url },
        { mintAddress: onepool.mintAddress }
      ]
    });
      if(doublePools && doublePools[0] && doublePools[0].url ){
        await mongoInterface.deleteOne('network_pools', {_id:onepool._id})
      }
    }
  
    }

// REQUESTS //

static async axiosgetRequestURL(get_request_uri){

  return new Promise(   (resolve, reject) => {

    axios.get(get_request_uri)
.then(response => {
  resolve(response.data)
  
})
.catch(error => {
  console.error('axiosget error:', error.message || error.code);
  reject(error);
});

  })

}


static async axiospostRequestURL(request_uri, _data){

  return new Promise(   (resolve, reject) => {
    axios.post(request_uri, _data)
.then(response => {
  resolve(response.data)
})
.catch(error => {
  console.error('axiospost error:', error.message || error.code);
  reject(error);
});

  })

}


static async httpRequestURL(get_request_uri){

  return new Promise(   (resolve, reject) => {
    https.get(get_request_uri, (resp) => {
      let data = '';

      // A chunk of data has been recieved.
      resp.on('data', (chunk) => {
      data += chunk;
      });

      // The whole response has been received. Print out the result.
      resp.on('end', () => {

        let parsedData = null

        try{
          parsedData = JSON.parse(data)
        }catch(e){
          console.error(e)
        }

         

        if(parsedData){
          resolve(parsedData)
        }else{
          reject(false)
        }

      //  resolve( JSON.parse(data) )
      });

      }).on("error", (err) => {
        reject(err)
    });

  })

}

// REQUESTS //



}
