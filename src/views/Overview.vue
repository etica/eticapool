<template>

<div>



 
        <Navbar />
     

   <div class="cypherpunk-background section bg-slate-etica slate-min-height-65 text-white  pb-8">
     <div class="w-container pt-8">

       
 

      <h1 class="title font-primary-title color-primary mb-4" style="font-family: dotgothicregular;font-size: 45px;color: #d0d0d0;">
        Pool Overview
      </h1>
      

      
      <HorizontalNav 
          class="mb-8"
         v-bind:activeSection="activeSection" 
         v-bind:activeColor="'green'" 
         v-bind:buttonClickedCallback="onHorizontalNavClicked" 
         v-bind:buttonNamesArray="['Mining Data', 'Getting Started', 'Pool Status','Recent Transactions' ]"
   
       />
        



        <div v-if="poolData && poolStatus && activeSection=='Mining Data'"  class="overflow-x-auto mb-4">
            <div class="my-4">
            <div v-if="poolName" style="color:green;"> {{ poolName }} is Active <span v-if="poolStatus.poolFeesMetrics && poolStatus.poolFeesMetrics.poolRewardsBonus > 0" style="color: #04ffab;">(Bonus Activated: +{{poolStatus.poolFeesMetrics.poolRewardsBonus * 100}}% on all mining rewards)</span></div>
              <div>Minting Account Address: <a class="color-eticacyan" v-if="getExplorerBaseURLFromType('solutions')" target="_blank" v-bind:href="getExplorerBaseURLFromType('solutions') + 'address/' + poolData.mintingAddress  "> {{poolData.mintingAddress}}  </a> </div>
              <div>Minting Network Name: {{poolData.mintingNetwork}}</div>
              <div v-if="poolStatus.mintingAccountBalances">Minting Balance: {{rawAmountToFormatted(poolStatus.mintingAccountBalances['ETH'] , 18 ) }} EGAZ</div>
              <div v-if="poolStatus.mintingAccountBalances">Minting Balance: {{rawAmountToFormatted(poolStatus.mintingAccountBalances['token'], 18)}} ETI</div>
              <span>(Eti mined are immediately sent to reward process)</span>
            </div>
            <div class="my-4">
              <div>Payments Accounts Address: <a class="color-eticacyan" v-if="getExplorerBaseURLFromType('payments')" target="_blank" v-bind:href="getExplorerBaseURLFromType('payments') + 'address/' + poolData.paymentsAddress  "> {{poolData.paymentsAddress}} </a> </div>
              <div>Payments Network Name: {{poolData.paymentsNetwork}}</div>
              <div v-if="poolStatus.paymentsAccountBalances">Payments Balance EGAZ: {{rawAmountToFormatted(poolStatus.paymentsAccountBalances['ETH'],18)}} EGAZ</div>

              <div v-if="poolData.batchedPaymentsContractAddress">Batched Payments Contract Address: <a class="color-eticacyan" v-if="getExplorerBaseURLFromType('payments')" target="_blank" v-bind:href="getExplorerBaseURLFromType('payments') + 'address/' + poolData.batchedPaymentsContractAddress  ">  {{poolData.batchedPaymentsContractAddress}}  </a> </div>
              <div v-if="poolStatus.paymentsAccountBalances">Mining Pool Balance: {{rawAmountToFormatted(poolStatus.paymentsAccountBalances['token'], 18)}} ETI</div>
              
            </div>
            <div class="my-4">
              <div>Last Known Block Number: {{poolData.ethBlockNumber}}</div>
              <div style="color: #04ffab;">Minimum User Balance For Payment: {{rawAmountToFormatted(poolData.minBalanceForPayment,18)}} ETI</div>
              <div style="color: #868585;">
                  <i>Low Balance Payments:</i> <i>every 24 hours for balances between <b>0.01 ETI</b> and 
                 <b> {{rawAmountToFormatted(poolData.minBalanceForPayment,18)}} ETI</b></i>
              </div>
            </div>
        </div> 

          

         <div v-if="poolData && poolData.miningContract && activeSection=='Mining Data'"  class="overflow-x-auto  mb-4">
           
            <div><span style="text-decoration:underline;">Current Network Randomx Blob:</span> 
              <br><span style="font-size:11px;color: rgb(164, 255, 3);">{{poolData.miningContract.randomxBlob}}</span>
            </div>
            <div>Current Network Randomx Seedhash: <span style="color: rgb(6, 119, 55);">{{poolData.miningContract.randomxSeedhash}}</span></div>
            <div>Current Challenge Number: <span>{{poolData.miningContract.challengeNumber}}</span></div>

            <div>epochCount: {{poolData.miningContract.epochCount}}</div> 

            <div style="text-decoration:underline;">Blockchain difficulty:</div>
            <div>Current ETI Mining Difficulty: {{poolData.miningContract.miningDifficulty}}</div>

        </div> 

        <div v-if="poolData && poolStatus && activeSection=='Getting Started'"  class="overflow-x-auto mb-4">


          <div>Miners</div>
          <div>XMRig: <a target="_blank" href="https://xmrig.com/" style="color:#135e56;">https://xmrig.com/</a></div>
          <div>SRBMiner: <a target="_blank" href="https://github.com/doktor83/SRBMiner-Multi/releases" style="color:#135e56;">https://github.com/doktor83/SRBMiner-Multi/releases</a></div>

          <br>
          <i>Instructions:</i>
          <i>Use same settings as monero. Replace address with Etica address. Enter pool url with mining port. Example: {{ removeProtocol(poolUrl) }}:3333</i>


          <h1 class="title font-primary-title color-primary mb-4" style="font-family: dotgothicregular;font-size: 24px;color: #d0d0d0;">
            Connection Details
          </h1>

          <div><span style="text-decoration:underline;">Mining Pool address:</span><span style="color:rgb(179, 179, 179);"> {{ poolUrl }}</span></div>
          
          <br>
          <div style="text-decoration:underline;">Mining Ports</div>
          <br>
          

        <div style="display:inline-flex">
          <div style="margin-right: 5%;border-right: solid 1px white;width: 296px;">
          <div>Port: <span style="color:#135e56;">3333</span></div>
          <div>Starting Difficulty: <span style="color:#135e56;"> 400 000</span></div> 
          <div>Low-end CPU</div> 
          </div>

          <div style="margin-right: 5%;border-right: solid 1px white;width: 296px;">
          <div style="color:#135e56;">Port: <span style="color:#135e56;">55555</span></div>
          <div>Starting Difficulty: <span style="color:#135e56;"> 500 000</span></div> 
          <div>Low-end CPU</div> 
          </div>

          <div style="margin-left: 5%;width: 296px;">
          <div>Port: <span style="color:#135e56;">7777</span></div>
          <div>Starting Difficulty: <span style="color:#135e56;">1 000 000</span></div> 
          <div>High-end CPU</div>
          </div>

        </div>

        <div style="display:inline-flex">

          <div style="margin-left: 5%;width: 296px;">
          <div>Port: <span style="color:#135e56;">9999</span></div>
          <div>Starting Difficulty: <span style="color:#135e56;">2 000 000</span></div> 
          <div>Very-High-end CPU</div>
          </div>
        </div>


        </div>


        <div v-if="poolStatus && activeSection=='Pool Status'" class="overflow-x-auto  mb-4">
          
          <div class="mb-4">
            <div v-if="poolName" style="color:green;">Pool status: {{ poolName }} is Active </div>
    
          </div>

          <h3>Stratum ports</h3>
          <div style="text-decoration:underline;">Port 3333:</div>
          <div>Minimum Shares Difficulty: 400 000</div> 
          <div style="text-decoration:underline;">Port 5555:</div>
          <div>Minimum Shares Difficulty: 500 000</div> 
          <div style="text-decoration:underline;">Port 7777:</div>
          <div>Minimum Shares Difficulty: 1 000 000</div> 
          <div style="text-decoration:underline;">Port 9999:</div>
          <div>Minimum Shares Difficulty: 2 000 000</div> 


          <div class="mb-4">avgGasPriceGWei: {{poolStatus.poolFeesMetrics.avgGasPriceGWei}}</div>
          
          
          <div>Full Mining Reward: {{Number.parseFloat(rawAmountToFormatted(poolStatus.poolFeesMetrics.miningRewardRaw,18))}} ETI</div>

         <!-- <div>miningRewardInEth: {{poolStatus.poolFeesMetrics.miningRewardInEth}}</div> -->

          <div>Current ETI/EGAZ ratio: {{poolStatus.poolFeesMetrics.token_Eth_Price_Ratio}} (1 <img src="@/assets/images/etica-logo-sanstexte.png" height="100"  alt="" class="w-6 m-2" style="margin-left: 0;margin-right: 0;position: relative;top: -0.2vh;"> for {{ 1 / poolStatus.poolFeesMetrics.token_Eth_Price_Ratio }} <img src="@/assets/images/egaz-logo.png" height="100"  alt="" class="w-6 m-2" style="margin-left: 0;margin-right: 0;position: relative;top: -0.2vh;">)</div>

           <div>poolBaseFeeFactor: {{poolStatus.poolFeesMetrics.poolBaseFee}}</div>

           <div v-if="poolStatus.poolFeesMetrics && poolStatus.poolFeesMetrics.poolRewardsBonus > 0">pool Rewards Bonus: {{poolStatus.poolFeesMetrics.poolRewardsBonus}}</div>
          
        </div> 


          

        <div v-if="activeSection =='Recent Transactions'" class="mb-4">

        <section>
          <TransactionsTable
            class="mb-4"
            label="Recent Payments" 
            v-bind:transactionsList="recentPaymentTx"
          />
        </section>


        </div>

       

 


     </div>


    
   </div>

   

 
    

  <Footer    />

</div>
</template>


<style scoped>

.cypherpunk-background {
background-image: linear-gradient(90deg, rgba(79, 238, 22, 0.09) 1px, transparent 1px), linear-gradient(rgba(111, 93, 93, 0.1) 1px, transparent 1px);
background-size: 20px 20px;
}

</style>


<script>
import Navbar from './components/Navbar.vue';
import AppPanel from './components/AppPanel.vue';
import VerticalNav from './components/VerticalNav.vue'
import Footer from './components/Footer.vue';
 

import TransactionsTable from './components/TransactionsTable.vue';
import HashrateChart from './components/HashrateChart.vue';

import HorizontalNav from './components/HorizontalNav.vue';

import SocketHelper from '../js/socket-helper'

 import FrontendHelper from '../js/frontend-helper';
 

import MathHelper from '../js/math-helper'

export default {
  name: 'Accounts',
  props: [],
  components: {Navbar,AppPanel,VerticalNav,Footer,TransactionsTable, HorizontalNav},
  data() {
    return {
      poolName: null,
      poolUrl: null,
      poolData: null,
      poolStatus: null,

      activeSection: 'Mining Data',

      accountList: [] ,

      recentPaymentTx:[] 
    }
  },
 

  created(){
     this.socketHelper = new SocketHelper()

      setInterval(this.pollSockets.bind(this),600000)


      this.socketsListener = this.socketHelper.initSocket()



        this.socketsListener.on('poolNameAndUrl', (data) => {
            this.poolName = data.poolName;
            this.poolUrl = data.poolUrl;
        });

       this.socketsListener.on('poolData', (data) => {
            this.poolData = data
        });

         this.socketsListener.on('poolStatus', (data) => {
            this.poolStatus = data
        });

         this.socketsListener.on('recentPayments', (data) => {
            this.recentPaymentTx=data

            this.recentPaymentTx.map( x => this.addExplorerUrl(x, 'payments')  )

        });

        this.socketHelper.onPoolUpdate((data) => {
            if (data.poolNameAndUrl) {
                this.poolName = data.poolNameAndUrl.poolName;
                this.poolUrl = data.poolNameAndUrl.poolUrl;
            }
            if (data.poolData) { this.poolData = data.poolData; }
            if (data.poolStatus) { this.poolStatus = data.poolStatus; }
        });

      this.pollSockets()
  },
  methods: {
    pollSockets(){
      this.socketHelper.emitEvent('getPoolNameAndUrl')
      this.socketHelper.emitEvent('getPoolData')
      this.socketHelper.emitEvent('getPoolStatus')
      this.socketHelper.emitEvent('getRecentPayments')
    },


    rawAmountToFormatted(amount, decimals){
      return MathHelper.rawAmountToFormatted(amount,decimals)
    },

    onHorizontalNavClicked(item){
     
      this.activeSection = item


    },

    addExplorerUrl(txData, txType){

      
      if(!this.poolData) return ; 
      
      const solutionsNetworkName = this.poolData.mintingNetwork

      const paymentsNetworkName = this.poolData.paymentsNetwork

   
      
      let baseURL = ''
 
      if(txType == 'payments'){
        baseURL =  FrontendHelper.getExplorerBaseURL(paymentsNetworkName)
      }else{
        baseURL = FrontendHelper.getExplorerBaseURL(solutionsNetworkName) 
      }



      txData.txURL=baseURL.concat('tx/').concat(txData.txHash)

    },

    getExplorerBaseURLFromType(txType){

      if(!this.poolData) return null; 
      
      const solutionsNetworkName = this.poolData.mintingNetwork

      const paymentsNetworkName = this.poolData.paymentsNetwork

     if(txType == 'payments'){
        return FrontendHelper.getExplorerBaseURL(paymentsNetworkName)
      }else{
        return FrontendHelper.getExplorerBaseURL(solutionsNetworkName) 
      }

 
    },

    // Function to remove http protocol from url
    removeProtocol(url) {
        if (!url) return ''
        return url.replace(/^(https?:\/\/)/, '')
    }


  }
}
</script>
