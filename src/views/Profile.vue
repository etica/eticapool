<template>

<div>



 
        <Navbar />

   <div class="cypherpunk-background section bg-slate-etica text-gray-100">
     <div class="w-container pt-8">

       
 
       
      
            <div class="text-lg md:text-2xl text-white overflow-x-auto">
              <span style="font-family: dotgothicregular;font-size: 45px;color: #7e9f8c;">Mining Account</span> <br> 
              <i style="font-size: 1rem;">(Data updates every 5 minutes)</i>
            </div>

             <div class="text-md md:text-xl text-white overflow-x-auto">
              {{ publicAddress }}
            </div>
             



             <div class="whitespace-sm"></div>

              <div v-if="minerData">
                <div> Hashrate Average: {{ formatHashrate(minerData.avgHashrate) }} </div>
                 <div> Tokens Earned: {{ tokenBalanceFormatted()  }} ETI</div>
                  <div> Tokens Awarded: {{ tokensAwardedFormatted()   }} ETI</div>
                  <div> Tokens Sent: {{ tokensReceivedFormatted()   }} ETI</div>
                  <div> Last seen (timestamp): {{ minerData.lastSubmittedSolutionTime }} </div>
              </div>



     
      <div class="whitespace-md"></div>

<HorizontalNav 
          class="mb-8"
         v-bind:activeSection="activeSection"
         v-bind:activeColor="'eticacyan'" 
         v-bind:buttonClickedCallback="onHorizontalNavClicked" 
         v-bind:buttonNamesArray="['Recent Shares','Payouts','Details' ]"
   
       />


      <div v-if="activeSection=='Recent Shares'" class="box  background-secondary overflow-x-auto" 
         style=" min-height:480px;">

        <div class='text-lg font-bold'>Recent Shares (Last 100 shares)</div>
        <table class='table w-full'>

          <thead>
            <tr >
              

               
              <td> Block # </td>
              <td> Difficulty  </td>
              <td> challenge Number </td>
               
            </tr>
          </thead>

          <tbody>

            <tr v-for="(share, index) in shares">
             
  

              <td class="px-1"> {{ share.block }} </td>

              <td class="px-1">  {{ share.difficulty }} </td>
              <td class="px-1">  {{ share.challengeNumber  }} </td>
              
            </tr>


          </tbody>
        </table>

      </div>


      <div v-if="activeSection=='Payouts'" class="box  background-secondary overflow-x-auto" 
         style="  min-height:480px;">

        <div class='text-lg font-bold'>Payouts (Last 100 payouts)</div>
        <table class='table w-full'>

          <thead>
            <tr > 
               
              <td> Block # </td>
              <td> Amount (ETI)  </td>
              <td> BatchedPaymentUUID </td>
              <td> txHash </td>
            </tr>
          </thead>

          <tbody>

            <tr v-for="(tx, index) in payment_tx">
              

              <td class="px-1"> {{ tx.block }} </td>

              <td class="px-1" >  {{ tokensRawToFormatted(tx.amountToPay,18) }} </td>
              <td class="px-1">  {{ tx.batchedPaymentUuid  }} </td>
              <td class="px-1"> <a :href="'https://www.eticascan.org/tx/'+tx.txHash" target="_blank" class="color-eticacyan">   {{ tx.txHash }} </a>  </td>
            </tr>


          </tbody>
        </table>

      </div>


      <div v-if="activeSection=='Details'"  class="box  background-secondary overflow-x-auto" 
         style="  min-height:480px;">

        <!--<div class='text-lg font-bold'>Details <i>most recent challenge numbers</i></div>-->
        <!--<div class='text-lg font-bold'>Details (Only loads last 2 ETI blocks, due to server overload. Will be possible to load 1000 more blocks once server overload issue is resolved)</div> -->
        <div class='text-lg font-bold' style="color: rgb(32, 255, 0);">PPNLS rewards, For each found by pool rewards are calculated based on shares submited last 5 blocks.</div>
        <div class='text-lg font-bold' style="color: #868686;">This is a new feature, allow few hours to see whole metrics</div>
        <table class='table w-full'>

          <thead>
            <tr style="border-bottom: 1px solid #ffffff;" >   
              <td> Epoch count </td>
              <td> challenge Number </td>
              <td> Pool total difficulty </td>
              <td> Miner difficulty </td>
              <td> Rewards </td>
              <td> Miner % on this port</td>
              <td> Miner port</td>
            </tr>
          </thead>

          <tbody v-if="ppnlsrewards && ppnlsrewards.length > 0">

          <tr v-if="currentchallenge">
              <td class="px-1"> {{ currentchallenge.miningcontract.challengeNumber | truncate(20, '...') }} </td>
            
              <td class="px-1" v-if="currentchallenge.TotalDiffHard">  {{ currentchallenge.TotalDiffHard.totaldiff }} </td>
              <td class="px-1" v-else>  No shares </td>
              <td class="px-1" v-if="currentchallenge.TotalDiffEasy">  {{ currentchallenge.TotalDiffEasy.totaldiff }} </td>
              <td class="px-1" v-else>  No shares </td>

              <td v-if="currentchallenge.miner_challengediff" class="px-1" >  {{ currentchallenge.miner_challengediff.totaldiff }} </td>
              <td v-else class="px-1" >  No shares </td>

              <td v-if="currentchallenge.TotalDiffHard && currentchallenge.miner_challengediff && currentchallenge.miner_challengediff.minerport == 8081" class="px-1" >  {{ (currentchallenge.miner_challengediff.totaldiff / currentchallenge.TotalDiffHard.totaldiff) * 100 }} %</td>
              <td v-else class="px-1" >  No shares </td>

              <td v-if="index == 0" style="font-size: 0.52em;color: #ff7f50;">Current challenge</td>
              <td v-if="currentchallenge.miner_challengediff && currentchallenge.miner_challengediff.minerport == 8081" class="px-1" style="color:orange;"> 8081 </td>
          </tr>  
          
          <tr v-for="(ppnlsreward, index) in ppnlsrewards" v-bind:key="index">
              
              <td class="px-1"> {{ ppnlsreward.epochCount }} </td>
              <td class="px-1"> {{ ppnlsreward.ChallengeNumber | truncate(10, '...') }} </td>
              <td class="px-1" v-if="ppnlsreward.poolshares">  {{ ppnlsreward.poolshares }} </td>
              <td class="px-1" v-else>  No shares </td>
              <td class="px-1" v-if="ppnlsreward.shares">  {{ ppnlsreward.shares }} </td>
              <td class="px-1" v-else>  No shares </td>

              <td v-if="ppnlsreward.tokensAwarded" class="px-1" style="display:inline-flex;" >  {{ tokensRawToFormatted(ppnlsreward.tokensAwarded, 18) }} <img src="@/assets/images/etica-logo-sanstexte.png" height="100"  alt="" class="w-6 m-2" style="margin-left: 3px;position: relative;top: -0.65vh;width: 19px;"> </td>

              <td v-if="ppnlsreward.poolshares && ppnlsreward.poolshares > 0 && ppnlsreward.shares" class="px-1" >  {{ (ppnlsreward.shares / ppnlsreward.poolshares) * 100 }} %</td>
              <td v-else class="px-1" >  No shares </td>

              <td v-if="index == 0" style="font-size: 0.52em;color: #ff7f50;">Current challenge</td>
              <td class="px-1" style="color:orange;"> 8081 </td>
          </tr>  


          </tbody>
          <tbody v-else>

           <p style="color: #ff8c00;"> LOADING DATA, THANKS FOR PATIENCE </p>

          </tbody>


        </table>

      </div>
 


     </div>
   </div>

   


    

  <Footer/>

</div>
</template>


<style scoped>

.cypherpunk-background {
background-image: linear-gradient(90deg, rgba(79, 238, 22, 0.09) 1px, transparent 1px), linear-gradient(rgba(111, 93, 93, 0.1) 1px, transparent 1px);
background-size: 20px 20px;
}

</style>


<script>
import Vue from 'vue'

import Navbar from './components/Navbar.vue';
import AppPanel from './components/AppPanel.vue';
import VerticalNav from './components/VerticalNav.vue'
import Footer from './components/Footer.vue';
import HorizontalNav from './components/HorizontalNav.vue';

import MathHelper from '../js/math-helper'

import FrontendHelper from '../js/frontend-helper'

import SocketHelper from '../js/socket-helper'

export default {
  name: 'Profile',
  props: [],
  components: {Navbar,AppPanel,VerticalNav,Footer,HorizontalNav},
  data() {
    return {
         publicAddress:null,
         minerData:{}, 
         poolData: {},
         shares: [],
         payment_tx: [],
         currentchallenge: [],
         ppnlsrewards: [],
         activeSection: 'Recent Shares' 
    }
  },
  created(){
    this.publicAddress = this.$route.params.publicAddress
  

    this.socketHelper = new SocketHelper()
    
    setInterval(this.pollSockets.bind(this),300000)
    setInterval(this.pollSocketsSlow.bind(this),300000)


    this.socketsListener = this.socketHelper.initSocket()

    this.socketsListener.on('poolData', (data) => {   
        this.poolData = data 
    }); 

    
    this.socketsListener.on('minerData', (data) => {     
       this.minerData = data 
    });

      this.socketsListener.on('minerShares', (data) => {       
       this.shares = data 
    });

    this.socketsListener.on('minerPayments', (data) => {               
       this.payment_tx = data 
    });

    this.socketsListener.on('MinerChallengeDetails', (data) => {    
      if (data && data.length > 0){
        this.currentchallenges = data[0];
      }           
       
    });

    this.socketsListener.on('MinerPpnlsRewards', (data) => {               
       this.ppnlsrewards = data 
    });

    this.pollSockets();
    this.pollSocketsSlow()

  },
  methods: {
    pollSockets(){
      this.socketHelper.emitEvent('getPoolData')
      this.socketHelper.emitEvent( 'getMinerData', {ethMinerAddress: this.publicAddress})
      this.socketHelper.emitEvent( 'getMinerShares', {ethMinerAddress: this.publicAddress})
      this.socketHelper.emitEvent( 'getMinerPayments', {ethMinerAddress: this.publicAddress})
      this.socketHelper.emitEvent( 'getMinerPpnlsRewards', {ethMinerAddress: this.publicAddress, nbrewards: 50})
    },

     // more resource full backend functions that need to be called less frequently:
    pollSocketsSlow(){
    this.socketHelper.emitEvent( 'getMinerChallengeDetails', {ethMinerAddress: this.publicAddress, nbchallenges: 1})
    },

    tokenBalanceFormatted(){
      return  MathHelper.rawAmountToFormatted(this.minerData.alltimeTokenBalance , 18) 

    }, 

    tokensAwardedFormatted(){
      return MathHelper.rawAmountToFormatted( this.minerData.tokensAwarded , 18)

    },

    tokensReceivedFormatted(){
      return MathHelper.rawAmountToFormatted( this.minerData.tokensReceived , 18)

    },

    tokensRawToFormatted(rawAmount, decimals){
          return MathHelper.rawAmountToFormatted( rawAmount , decimals )
    },

    ratioFormatted(rawRatio){
          return MathHelper.rawAmountToFormatted( rawRatio , 12 )
    },

    hashrateToMH(hashrate){
      return MathHelper.rawAmountToFormatted( hashrate , 6 )
    },

    formatHashrate(rate) {
      rate= parseFloat(rate); 
      let unit= 'H/s';
       if(rate >= 1000) { rate /= 1000; unit= 'KH/s'; }
       if(rate >= 1000) { rate /= 1000; unit= 'MH/s'; }
       if(rate >= 1000) { rate /= 1000; unit= 'GH/s'; }
       if(rate >= 1000) { rate /= 1000; unit= 'TH/s'; }
       if(rate >= 1000) { rate /= 1000; unit= 'PH/s'; }
       return (rate.toFixed(6) + ' ' + unit);
    },

    getExplorerBaseURLForPayments(){
      if(!this.poolData) return;
     
      return FrontendHelper.getExplorerBaseURL( this.poolData.paymentsNetwork   )
    },

    onHorizontalNavClicked(item){ 
      this.activeSection = item
    }
    
 

  },
    filters: {
        truncate: function (text, length, suffix) {
            if(text){
            if (text.length > length) {
                return text.substring(0, length) + suffix;
            } else {
                return text;
            }
            }
        }
  }
}
</script>
