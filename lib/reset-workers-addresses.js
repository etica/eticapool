

/*

Turns queued ethereum transaction into actual ones :)

Waits for pending TX to be mined before sending another !

Solutions are highest priority

*/
 
import readline from 'readline';

import Web3 from 'web3'

import ContractHelper from './util/contract-helper.js'
import PeerHelper from './util/peer-helper.js'

 
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
  async ResetWorkersBalances(mongoInterface, poolConfig) {
      var minerList = await PeerHelper.getMinerList(mongoInterface);
  
      // Set up readline interface
      const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
      });
  
      // Display a warning message after 30 seconds
      setTimeout(() => {
          console.log("Warning: Continuing will reset worker addresses in the database.");
          rl.question('Do you want to continue? (yes/no): ', async (answer) => {
              if (answer.toLowerCase() === 'yes') {
                  await performReset(mongoInterface, minerList);
              } else {
                  console.log('Operation cancelled.');
              }
              rl.close();
          });
      }, 30000);
  
      // Function to perform the reset operation
      async function performReset(mongoInterface, minerList) {
          for (let minerData of minerList) {
              let minerAddress = minerData.minerEthAddress;
              // if address uses worker name:
              if (!web3Utils.isAddress(minerAddress) && minerAddress.length >= 43) {
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