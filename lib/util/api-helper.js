 
 
        import PoolStatsHelper from './pool-stats-helper.js'
        import PeerHelper from './peer-helper.js'
        import NetworkPools from '../../networkpools/network-pools-helper.js'
        import web3utils from 'web3-utils'
        import TokenDataHelper from './token-data-helper.js'
        import TransactionHelper from './transaction-helper.js'

 
    export default class APIHelper  {
    
        constructor(   ){
           
           
        }

        //http://localhost:3000/api/v1/somestuff
        static async handleApiRequest(request, poolConfig, mongoInterface){
           // console.log('got api request', request.params )


            if(request.params['query'].toLowerCase() == ''){

                let poolApiWelcomeMsg = "Welcome on your pool API. Go on lib/util/api-helper.js to view the routing system of your API."
                
                return { poolApiWelcomeMsg }
            }


            if(request.params['query'].toLowerCase() == 'overview'){

                //  var poolData = await PoolStatsHelper.getPoolData( poolConfig, mongoInterface )

                let poolStatus = await PoolStatsHelper.getPoolStatus( poolConfig, mongoInterface )
                
                return { poolStatus }
            }

            if(request.params['query'].toLowerCase() == 'poolrecords'){

                //  var poolData = await PoolStatsHelper.getPoolData( poolConfig, mongoInterface )

                let poolStatsRecords = await PeerHelper.getpoolStatsRecords( mongoInterface, 1 )
                
                return { poolStatsRecords }
            }

            if(request.params['query'].toLowerCase() == 'gettotalminerhashrate'){

                //  same as /poolrecords route but returns data in same format as 0xpool.me (/api/v1/getTotalMinerHashrate) api for integration miningpoolstats.stream website:

                let poolStatsRecords = await PeerHelper.getpoolStatsRecords( mongoInterface, 1 );
                let eti = {};
                if(poolStatsRecords && poolStatsRecords[0]){
                       eti.totalHashrate = parseFloat((poolStatsRecords[0].Hashrate / 1000000000).toFixed(6)); // returns in GH unit
                       eti.activeMiner = poolStatsRecords[0].Numberminers;
                }
                
                return { eti }
            }

            if(request.params['query'].toLowerCase() == 'networkpools'){

                //  https://www.onepool.com/networkpools return objects with just pool name, pool_id and pool url fields

                let Pools = await NetworkPools.getNetworkPools( mongoInterface, 10 ) // get 10 most recent updated pools
                
                return { Pools }
            }


            if(request.params['query'].toLowerCase() == 'networkpoolinfo'){

                //  https://www.onepool.com/networkpoolinfo return objects with just pool Hashrate

                let PoolInfo = await NetworkPools.getNetworkPoolInfo( poolConfig, mongoInterface )
                
                return { PoolInfo }
            }

            if(request.params['query'].toLowerCase() == 'networkmintaddresses'){

                //  https://www.onepool.com/getpools return objects with just pool name, pool_id and pool url fields

                let NetworkMintAddresses = await NetworkPools.getNetworkMintAddresses( mongoInterface )
                
                return { NetworkMintAddresses }
            }

            if(request.params['query'].toLowerCase() == 'miningcontracts'){

                let recentMiningContractData = await TokenDataHelper.getLastMiningContracts(mongoInterface, 100)
                
                return { recentMiningContractData }
            }


            if(request.params['query'].toLowerCase() == 'lastsolutions'){
            
              let query = {txType:'solution'}

              var Solutions = await TransactionHelper.findRecentTransactionsWithQuery(query,  mongoInterface )
 
              return { Solutions }

            }


            if(request.params['query'].toLowerCase() == 'lastpoolmints'){

                var LastPoolMints = await PeerHelper.getPoolMints( 50,  mongoInterface )
                
                return { LastPoolMints }
            }

            return 'This is the API'
        }


        static async getNetworkPoolInfofrom(PoolInfofrom, poolConfig, mongoInterface){

            // Sanitize inputs to prevent NoSQL injection
            if (!PoolInfofrom || typeof PoolInfofrom !== 'object') return {};
            if (!PoolInfofrom.name || typeof PoolInfofrom.name !== 'string') return {};
            if (!PoolInfofrom.url || typeof PoolInfofrom.url !== 'string') return {};
            // Cap lengths
            PoolInfofrom.name = PoolInfofrom.name.substring(0, 200);
            PoolInfofrom.url = PoolInfofrom.url.substring(0, 500);
            // Sanitize numeric fields
            if (PoolInfofrom.Hashrate !== undefined) {
                PoolInfofrom.Hashrate = Number(PoolInfofrom.Hashrate) || 0;
            }
            if (PoolInfofrom.Numberminers !== undefined) {
                PoolInfofrom.Numberminers = Number(PoolInfofrom.Numberminers) || 0;
            }

            if( web3utils.isAddress(PoolInfofrom.mintAddress) ){

                //  https://www.onepool.com/networkpools return objects with just pool name, pool_id and pool url fields

                let PoolInfo = await NetworkPools.getNetworkPoolInfofrom( PoolInfofrom, poolConfig, mongoInterface, 10 ) // get 10 most recent updated pools
                
                return { PoolInfo }
            }
            else {
                let PoolInfo = {};
                return PoolInfo;
            }

        }


        static async getPoolDailyMetrics(request, poolConfig, mongoInterface){
           // console.log('got api request', request.params )

            // 4102444800 is timestamp for 2100, make this filter to avoid issue if request with too high number
            if(parseInt(request.params['daytimestamp']) && parseInt(request.params['daytimestamp']) < 4102444800){

                let daytimestamp = parseInt(request.params['daytimestamp']);
                let poolStatsRecords = await PeerHelper.getpoolStatsRecordsofDay( mongoInterface, daytimestamp )
                
                return { poolStatsRecords }
            }
            else{
                'Wrong timestamp format provided'
            }

        }


        static async getNetworkDailyMetrics(request, poolConfig, mongoInterface){
            // console.log('got api request', request.params )
 
             // 4102444800 is timestamp for 2100, make this filter to avoid issue if request with too high number
             if(parseInt(request.params['daytimestamp']) && parseInt(request.params['daytimestamp']) < 4102444800){
 
                 let daytimestamp = parseInt(request.params['daytimestamp']);
                 let networkStatsRecords = await PeerHelper.getnetworkStatsRecordsofDay( mongoInterface, daytimestamp )
                 
                 return { networkStatsRecords }
             }
             else{
                 'Wrong timestamp format provided'
             }
 
         }


         static async getHashrateMiner(request, mongoInterface){
            
             const minerEthAddress = request.params['minerEthAddress'];

             var minerAddressWithoutWorkerName = minerEthAddress.toString().substr(0, 42); 

             if(minerEthAddress && web3utils.isAddress(minerAddressWithoutWorkerName)){
 
                 let result = await mongoInterface.findOne("minerData", {minerEthAddress: minerEthAddress.toString().toLowerCase() } );
                 
                 if(result && result.avgHashrate){
                    const successResponse = {
                        success: true,
                        result: result.avgHashrate.toString()
                      };
                      return successResponse;
                 }
                 else {
                    const errorResponse = {
                        success: false,
                        error: 'miner not found for provided address',
                        result:  web3utils.toBN('0')
                      };
                      return errorResponse;
                 }
                 
             }
             else{
                const errorResponse = {
                    success: false,
                    error: 'invalid address provided',
                    result: web3utils.toBN('0')
                  };
                  return errorResponse;
             }
 
         }


         static async checkMinerAnyShare(request, mongoInterface){
            
            const minerEthAddress = request.params['minerEthAddress'];

            var minerAddressWithoutWorkerName = minerEthAddress.toString().substr(0, 42); 

            if(minerEthAddress && web3utils.isAddress(minerAddressWithoutWorkerName)){

                let result = await mongoInterface.findOne("miner_pendingshares", {minerEthAddress: minerEthAddress.toString().toLowerCase()} );
                
                
                if(result && result.time){
                   const successResponse = {
                       success: true,
                       result: result
                     };
                     return successResponse;
                }
                else {
                   const errorResponse = {
                       success: false,
                       error: 'no shares',
                       result:  null
                     };
                     return errorResponse;
                }
                
            }
            else{
               const errorResponse = {
                   success: false,
                   error: 'invalid address provided',
                   result: null
                 };
                 return errorResponse;
            }

        }

    
         
    }