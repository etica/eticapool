 
 
        import PoolStatsHelper from './pool-stats-helper.js'
        import PeerHelper from './peer-helper.js'
        import NetworkPools from '../../networkpools/network-pools-helper.js'
        import web3utils from 'web3-utils'

 
    export default class APIHelper  {
    
        constructor(   ){
           
           
        }

        //http://localhost:3000/api/v1/somestuff
        static async handleApiRequest(request, poolConfig, mongoInterface){
            console.log('got api request', request.params )


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
                eti.totalHashrate = poolStatsRecords.Hashrate;
                eti.activeMiner = poolStatsRecords.Numberminers;
                
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


            return 'This is the API'
        }


        static async getNetworkPoolInfofrom(PoolInfofrom, poolConfig, mongoInterface){

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
            console.log('got api request', request.params )

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

    
         
    }