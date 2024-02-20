

/*

Turns queued ethereum transaction into actual ones :)

Waits for pending TX to be mined before sending another !

Solutions are highest priority

*/
 
import readline from 'readline';

import Web3 from 'web3'

import ContractHelper from './util/contract-helper.js'
import PeerHelper from './util/peer-helper.js'
import web3utils from 'web3-utils'
import Web3ApiHelper from "./util/web3-api-helper.js";

 
const PAYMENT_BROADCAST_PERIOD = 100 * 1000;

export default class ResetWorkersAddresses  {




  constructor(web3, poolConfig,   mongoInterface )
  {


    this.web3=web3;
     
    this.mongoInterface=mongoInterface;

  

    this.poolConfig=poolConfig;

    this.paymentContract = ContractHelper.getBatchedPaymentsContract(this.web3,this.poolConfig )

    this.tokenContract = ContractHelper.getTokenContract( this.web3 , this.poolConfig  )  
   

  } 

  async update()
  {
      

  } 


  // Function to reset workers addresses
  async ResetWorkersBalances(mongoInterface) {
      var minerList = await PeerHelper.getMinerList(mongoInterface);



      var total_coins_owed = 0;
      var total_next_coins_batchs = 0;

      var actual_total_coins_owed = 0;
      var actual_total_next_coins_batchs = 0;

      console.log('---------- Please wait. Calculating total amount awaiting payouts for addresses that used worker names. ---------');
      
      for(let minerData of minerList) //reward each miner
      {
        //console.log('Minerdata is', minerData);
     
        let minerAddress = minerData.minerEthAddress;
        let minerAddressWithoutWorkerName = minerAddress.toString().substr(0, 42); // removes potential worker name
  
        // var miner_token_balance = minerData.tokenBalance;
  
        if(typeof minerData.alltimeTokenBalance == 'undefined') minerData.alltimeTokenBalance = 0;
        if(typeof minerData.tokensAwarded == 'undefined') minerData.tokensAwarded = 0;
  
         var coins_owed = 0;
         if( minerData.alltimeTokenBalance > 0 && minerData.alltimeTokenBalance > minerData.tokensAwarded)
         {  
             coins_owed = Math.floor(minerData.alltimeTokenBalance - minerData.tokensAwarded);
             total_coins_owed = total_coins_owed + coins_owed;
            
             if(web3utils.isAddress( minerAddressWithoutWorkerName )){
                actual_total_coins_owed = actual_total_coins_owed + coins_owed;
              }

         }    
  
      }

      console.log('---------- Total amount of ETI awaiting payouts for addresses that used worker names calculated. ---------');
      const rawAmountToFormatted = Web3ApiHelper.rawAmountToFormatted(actual_total_coins_owed, 18)
      console.log('amount is: ', rawAmountToFormatted, 'ETI');
      console.log('---------- Check your pool has enough liquidity to honour this amount. If confirm next step to reset balance of addresses that used worker names ---------');
  
      // Set up readline interface
      const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
      });
  
      console.log("Warning: Continuing will reset balances of addresses using worker names to 0.");
      rl.question('Do you want to continue? (yes/no): ', async (answer) => {
          if (answer.toLowerCase() === 'yes') {
              await performReset(mongoInterface, minerList);
          } else {
              console.log('Operation cancelled.');
          }
          rl.close();
      });
  
      // Function to perform the reset operation
      async function performReset(mongoInterface, minerList) {
          for (let minerData of minerList) {
              let minerAddress = minerData.minerEthAddress;
              // if address uses worker name:
              if (!web3utils.isAddress(minerAddress) && minerAddress.length >= 43) {
                console.log('reseting address: ', minerAddress);
                  // reset worker address:
                  await mongoInterface.updateOne('minerData', { _id: minerData._id }, { tokensAwarded: 0, alltimeTokenBalance: 0 });
              }
              else{
                console.log('not reseting address: ', minerAddress);
              }
          }
          console.log('Workers addresses reset successfully.');
      }
  }


}