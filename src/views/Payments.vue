<template>

<div>



 
        <Navbar />
     

   <div class="cypherpunk-background section bg-slate-etica slate-min-height-65 text-white  pb-8">
     <div class="w-container pt-8">

      <h1 class="title font-primary-title color-primary mb-4" style="font-family: dotgothicregular;font-size: 45px;">
        Payments Overview
      </h1>
      
      <HorizontalNav 
          class="mb-8"
         v-bind:activeSection="activeSection" 
         v-bind:activeColor="'green'" 
         v-bind:buttonClickedCallback="onHorizontalNavClicked" 
         v-bind:buttonNamesArray="['Pool Balance Stats','Pool mints','Batched Payments' ]"
   
       />
        



        <div v-if="poolData && poolStatus && statsPayment && activeSection=='Pool Balance Stats'"  class="overflow-x-auto mb-4">
            <div class="my-4">
            <div v-if="poolName" style="color:green;"> {{ poolName }} is Active </div>              
               <div style="color: rgb(133, 251, 15);" v-if="statsPayment">Total ETI owed: {{rawAmountToFormatted(statsPayment.actual_total_coins_owed, 18 ) }} ETI [awaiting to reach the minimum payout]</div>
               <div style="color: rgb(31, 208, 75);" v-if="statsPayment">Total ETI in next Batch: {{rawAmountToFormatted(statsPayment.actual_total_next_coins_batchs , 18 ) }} ETI [total coins reached minimum payout, included next batchs]</div>

               <span v-if="statsPayment.createdAt">Last update: {{ statsPayment.createdAt }} </span>
              
              <div>Minting Account Address: <a class="color-eticacyan" v-if="getExplorerBaseURLFromType('solutions')" target="_blank" v-bind:href="getExplorerBaseURLFromType('solutions') + 'address/' + poolData.mintingAddress  "> {{poolData.mintingAddress}}  </a> </div>
              <div v-if="poolStatus.mintingAccountBalances">Minting address Balance: {{rawAmountToFormatted(poolStatus.mintingAccountBalances['ETH'] , 18 ) }} EGAZ</div>
              <div v-if="poolStatus.mintingAccountBalances">Minting address Balance: {{rawAmountToFormatted(poolStatus.mintingAccountBalances['token'], 18)}} ETI</div>
              <span>(Eti mined are immediately sent to reward process)</span>
            </div>
            <div class="my-4">
              <div>Payments Accounts Address: <a class="color-eticacyan" v-if="getExplorerBaseURLFromType('payments')" target="_blank" v-bind:href="getExplorerBaseURLFromType('payments') + 'address/' + poolData.paymentsAddress  "> {{poolData.paymentsAddress}} </a> </div>
              <div>Payments Network Name: {{poolData.paymentsNetwork}}</div>
              <div v-if="poolStatus.paymentsAccountBalances">Payments Balance EGAZ: {{rawAmountToFormatted(poolStatus.paymentsAccountBalances['ETH'],18)}} EGAZ (ETH)</div>

              <div v-if="poolData.batchedPaymentsContractAddress">Batched Payments Contract Address: <a class="color-eticacyan" v-if="getExplorerBaseURLFromType('payments')" target="_blank" v-bind:href="getExplorerBaseURLFromType('payments') + 'address/' + poolData.batchedPaymentsContractAddress  ">  {{poolData.batchedPaymentsContractAddress}}  </a> </div>
              <div v-if="poolStatus.paymentsAccountBalances" style="color: #aad0aa;">Mining Pool Balance: {{rawAmountToFormatted(poolStatus.paymentsAccountBalances['token'], 18)}} ETI</div>
              
            </div>
            <div class="my-4">
              <div>Minimum User Balance For Payment: {{rawAmountToFormatted(poolData.minBalanceForPayment,18)}} ETI</div>
            </div>
        </div> 

        <div v-if="poolStatus && activeSection=='Pool mints'" class="overflow-x-auto  mb-4">
          
          <div   class="box  background-secondary overflow-x-auto" style="  min-height:480px;">
        <div class='subtitle'> </div>
        <table class='table w-full'>

          <thead>
            <tr >
              <td class="px-1"> EpochCount # </td>
              <td class="px-1"> TransactionHash </td>
              <td class="px-1"> Status </td>
              <td class="px-1"> Block reward </td>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(item, index) in poolMints" v-bind:key="index">
                <td>
                  <a v-bind:href='item.url' >
                        <span style="color: #ffffff;">  {{ item.epochCount }} </span>
                  </a>
                </td>
                <td class="px-1"> 
                  <a v-bind:href='"https://www.eticascan.org/tx/"+item.transactionHash' >
                        <span style="color: #527b7a;">  {{ item.transactionHash }}  </span>
                  </a> 
                </td>
                <td class="px-1"> 
                      <span style="color: rgb(54, 179, 97);">  {{ getstatusname(item.status) }}  </span>
                </td>
                <td class="px-1"> 
                        <span v-if="index % 2 === 0" style="color: rgb(54, 179, 97);">  +{{ item.blockreward }} ETI </span>
                        <span v-else-if="index % 3 === 0" style="color:rgb(75, 176, 91);">  +{{ item.blockreward }} ETI </span>
                        <span v-else style="color: rgb(129, 221, 135);">  +{{ item.blockreward }} ETI </span>
                </td>
            </tr> 
          </tbody>
        </table>

      </div>
          
        </div> 


          

        <div v-if="activeSection =='Batched Payments'" class="mb-4">

       <!-- <section>
          <TransactionsTable
            class="mb-4"
            label="Batched Payments" 
            v-bind:transactionsList="recentPaymentTx"
          />
        </section> -->


        </div>

     </div>


    
   </div>
    

  <Footer    />

</div>
</template>

<style scoped>

/*
.cypherpunk-background {
  background-image: linear-gradient(90deg, rgba(100, 100, 100, 0.1) 1px, transparent 1px), linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
background-size: 20px 20px;
}
.cypherpunk-background {
background-image: linear-gradient(90deg, rgba(100, 100, 100, 0.09) 1px, transparent 1px), linear-gradient(rgba(111, 93, 93, 0.1) 1px, transparent 1px);
background-size: 20px 20px;
}
*/

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
      poolData: null,
      poolStatus: null,
      statsPayment: null,
      activeSection: 'Pool Balance Stats',
      accountList: [] ,
      poolMints: []

    }
  },
 

  created(){
     this.socketHelper = new SocketHelper()
      
      setInterval(this.pollSockets.bind(this),180000)


      this.socketsListener = this.socketHelper.initSocket()
     
     

        this.socketsListener.on('poolName', (name) => {   
            this.poolName = name;
        });

       this.socketsListener.on('poolData', (data) => {   
            this.poolData = data 
        });

         this.socketsListener.on('poolStatus', (data) => {   
            this.poolStatus = data 
            
        });

        this.socketsListener.on('statsPayment', (data) => {   
            if(data && data.length > 0){
                this.statsPayment = data[0]
            }        
        });

        this.socketsListener.on('statsPayment', (data) => {   
            if(data && data.length > 0){
                this.statsPayment = data[0]
            }        
        });

        this.socketsListener.on('poolMints', (data) => {   
            if(data && data.length > 0){
                this.poolMints = data
            }        
            console.log('this poolMints are:', this.poolMints)
        });

      this.pollSockets()
  },
  methods: {
    pollSockets(){
      this.socketHelper.emitEvent('getPoolName')
      this.socketHelper.emitEvent('getPoolData')
      this.socketHelper.emitEvent('getPoolStatus')
      this.socketHelper.emitEvent('getStatsPayment')
      this.socketHelper.emitEvent('getPoolMints', {nbpoolmints: 50})
    },

    rawAmountToFormatted(amount, decimals){
      return MathHelper.rawAmountToFormatted(amount,decimals)
    },

    onHorizontalNavClicked(item){
     
      this.activeSection = item

    },

    getstatusname(_status){

console.log('checking status', _status)

console.log('_status == 2', _status == 2)
console.log('_status == " 2 " ', _status == '2')

console.log('_status == 1', _status == 1)
console.log('_status == " 1 " ', _status == '1')

      if(_status == 2){
        return 'Processed (rewards awarded)';
      }
      else if(_status == 1){
        return 'Processed (rewards awarded)';
      }
      else {
        return 'Unprocessed';
      }

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

 
    }

 

  }
}
</script>
