 
import https from 'https'

const API_INTERVAL = 1000*30 // thirty seconds 
 

import  cron from 'node-cron' 

  //perform this with a robust task runner  - bree  and /tasks folder 

  import PeerHelper from './peer-helper.js'


import LoggingHelper from './logging-helper.js'


export default class Web3ApiHelper  {

  constructor(mongoInterface, poolConfig ){
  
    this.poolConfig=poolConfig;
    this.mongoInterface=mongoInterface;

  }
  
  init(){
    
    Web3ApiHelper.fetchAPIData(this.poolConfig,this.mongoInterface);

  }
  

   update(){

 

    cron.schedule('*/20 * * * * *', async function() {
       

      Web3ApiHelper.fetchAPIData(this.poolConfig,this.mongoInterface)


    }.bind(this));

 
  } 

  static async fetchAPIData(poolConfig,mongoInterface){
    LoggingHelper.appendLog('fetch api data', LoggingHelper.TYPECODES.GENERIC, mongoInterface)
    console.log('Fetching ApiData')

    try{  

     /* REMOVED API call to fect gas data, ethgasstation.info closed website. Need to replace with an api for EGAZ gas cost. Use hard coded data in the meanwhile
     
     const defipulseApiUri = 'https://ethgasstation.info/json/ethgasAPI.json'//'https://data-api.defipulse.com/api/v1/egs/api/ethgasAPI.json?api-key='

      let get_request_uri = defipulseApiUri // .concat( poolConfig.apiConfig.defiPulseApiKey )

      let unixTime = PeerHelper.getTimeNowSeconds()

      let api_response = await Web3ApiHelper.httpRequestURL(get_request_uri)

      used to use data from api_response.average ...
      
      */

        // Use hard coded data instead of recurrent fetching though api data, since ethgasstation closed and need to implement an api for EGAZ gas cost/=
        // For hardcoded data no need for recurrent only insert if not exist, no update necessary:

        let existPriceWei = await mongoInterface.findOne('ethGasPriceWei', {});
        console.log('existPriceWei is', existPriceWei)
        if(!existPriceWei){
          console.log('existPriceWei not exist')
          let unixTime = PeerHelper.getTimeNowSeconds()
        
          let priceEstimates = {
            networkName:'etica',
            blockNum: 15537392,
            fast: 53,
            average: 14.3,
            safeLow: 14.3,
            blockNumber: 15537392,
            safeLowWait: 1.5,
            avgWait: 1.5,
            fastWait: 0.5,
            updatedAt: unixTime
          }

          await  mongoInterface.upsertOne('ethGasPriceWei', {},  priceEstimates  )
          //await this.redisInterface.storeRedisData('ethGasPriceWei', JSON.stringify( ethgasPriceWei) )

          LoggingHelper.appendLog( [ 'stored gaspriceEstimates', priceEstimates ], LoggingHelper.TYPECODES.GENERIC, mongoInterface)

        }

        // Use hard coded data instead of recurrent fetching though api data, since ethgasstation closed and need to implement an api for EGAZ gas cost/=
        // For hardcoded data no need for recurrent only insert if not exist, no update necessary //


    }catch(e){
      console.log(e)
    }


    try{

      let get_request_uri_eti =  "https://api.coingecko.com/api/v3/coins/etica?localization=en&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false"
      let get_request_uri_egaz =  "https://api.coingecko.com/api/v3/coins/egaz?localization=en&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false"


      if(poolConfig && poolConfig.apiConfig.coinGeckoApiETI){
        console.log('using poolConfig.apiConfig.coinGeckoApiETI')
        get_request_uri_eti =  poolConfig.apiConfig.coinGeckoApiETI
      }

      if(poolConfig && poolConfig.apiConfig.coinGeckoApiEGAZ){
        console.log('using poolConfig.apiConfig.coinGeckoApiEGAZ')
         get_request_uri_egaz =  poolConfig.apiConfig.coinGeckoApiEGAZ
      }

      let api_response_eti = await Web3ApiHelper.httpRequestURL(get_request_uri_eti)
      let api_response_egaz = await Web3ApiHelper.httpRequestURL(get_request_uri_egaz)
 
        //use average gas price
        if(api_response_eti.market_data && api_response_eti.market_data.current_price && api_response_egaz.market_data && api_response_egaz.market_data.current_price)
        {
          console.log('api_response_eti.market_data.current_price', api_response_eti.market_data.current_price)
          console.log('api_response_egaz.market_data.current_price', api_response_egaz.market_data.current_price)
            let eti_egaz_ratio = api_response_eti.market_data.current_price.usd / api_response_egaz.market_data.current_price.usd;
            console.log('eti_egaz_ratio: ', eti_egaz_ratio)
            let priceEstimates = {
            price_ratio_eth: eti_egaz_ratio,
            updatedAt: (Date.parse(api_response_eti.last_updated) / 1000.0)
          }

          await  mongoInterface.upsertOne('priceOracle', {},  priceEstimates  )
          //await this.redisInterface.storeRedisData('ethGasPriceWei', JSON.stringify( ethgasPriceWei) )

          LoggingHelper.appendLog( ['stored priceOracle', priceEstimates], LoggingHelper.TYPECODES.GENERIC, mongoInterface)
 
        } 


    }catch(e){
      console.log(e)
    }

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

  /*

  This should adapt   -- ?
  */
  static async getGasPriceWeiForTxType(typename, poolConfig, mongoInterface)
  {
    let gasPriceData = await Web3ApiHelper.getGasPriceData( mongoInterface )

    if(!gasPriceData){
     var averageGasPriceWei = 100
    }

    else {


      var averageGasPriceWei = gasPriceData.average

      if(isNaN( averageGasPriceWei )){
        averageGasPriceWei = 100
      }

    }


    var solutionGasPriceWei = parseInt( averageGasPriceWei )



    if( typename == 'solution'  )
    {
        let gasPriceBoost =  parseInt( poolConfig.mintingConfig.gasPriceBoost ) 
        if(!isNaN(gasPriceBoost) && gasPriceBoost > 0){
          solutionGasPriceWei += gasPriceBoost
        }


        let maxGasPrice =  parseInt( poolConfig.mintingConfig.maxGasPriceGwei ) 

        return Math.min( solutionGasPriceWei , maxGasPrice )
    }

    if( typename == 'batched_payment'  )
    {
      let maxGasPrice = parseInt( poolConfig.paymentsConfig.maxGasPriceGwei )

      return Math.min( solutionGasPriceWei , maxGasPrice )
    }
     
    console.log('WARN: calculating gas fee for unknown type: ', typename)
    return solutionGasPriceWei


  } 

  static async getGasPriceData(mongoInterface)
  {
    let priceEstimates =  await mongoInterface.findOne('ethGasPriceWei')

    return  priceEstimates
  }


  static rawAmountToFormatted(amount,decimals)
  {
    return (amount * Math.pow(10,-1 * decimals)).toFixed(decimals);
  }

  static formattedAmountToRaw(amountFormatted,decimals)
  {

    var multiplier = new BigNumber( 10 ).exponentiatedBy( decimals ) ;


    return multiplier.multipliedBy(amountFormatted).toFixed() ;
  }



}
