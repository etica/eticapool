
  
export default class FrontendHelper {


   static getNetworkNameForTransactionScope(scope, poolConfig){
        if(scope == 'minting'){
            return poolConfig.mintingConfig.networkName 
        }

        if(scope == 'payments'){
            return poolConfig.paymentsConfig.networkName 
        } 
   }

   
   static getExplorerBaseURL(   networkName   )
  { 

    networkName = networkName.toLowerCase( )
     
    if(networkName == 'mainnet'){
        return 'https://eticascan.org/' 
    } 

    if(networkName == 'goerli'){ 
        return 'https://goerli.etherscan.io/'
    }

    if(networkName == 'matic'){
        return 'https://polygonscan.com/'
    }

    if(networkName == 'etica'){
        return 'https://eticascan.org/'
    }

    return 'https://eticascan.org/'
    
  } 
 

}
