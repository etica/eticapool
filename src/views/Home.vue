<template>

<div>




   
       <Navbar />



   <div class="section bg-slate-etica   autospacing  ">
     <div class=" w-container pt-8">

       <section class="hero circuit-overlay  text-center ">
          <div class="flex flex-col lg:w-1/2" style="margin:0 auto">
            <span :style="{ color: blinkerColor, marginTop: '1vh' }"><img src="@/assets/images/eti-logo.png" style="width:20px;"> RandomX mining activated <img src="@/assets/images/eti-logo.png" style="width:20px;"></span>
          <div class=" text-center  "  >
            <span v-if="poolName" class="title font-roboto text-white font-bold text-4xl">
                {{ poolName }}
            </span>
            </div>

            <div  v-if="false"  class="loading-animation">
                <div class="loader"></div>
            </div> 

                <p class="text-white font-bold">Mining Pool URLs</p>
                <p v-if="poolUrl" class="text-white font-bold" style="color:rgb(115, 233, 233);">{{ poolUrl }}:3333 (Low-end CPU)</p>
                <p v-if="poolUrl" class="text-white font-bold" style="color:rgb(167, 191, 191);">{{ poolUrl }}:5555 (Mid-range CPU)</p>
                <p v-if="poolUrl" class="text-white font-bold" style="color:rgb(48, 153, 164);">{{ poolUrl }}:7777 (High-end CPU)</p>
                <p class="text-white font-bold">Smart Contract Address: 0x34c61EA91bAcdA647269d4e310A86b875c09946f </p>

                <div class="whitespace-md" style="margin-top: 2em;"></div>

                <div class="account-search-container ">
                  <div class="field">
                    <!--<a href="/accounts" style="text-decoration:underline;color:#85b593;"> Accounts Page</a>-->
                   <!-- <br> -->
                    <div class="label text-white font-bold">ethMinerAddress Mining Address</div>
                    <div class="control">
                      <form v-on:submit.prevent="submitMiningAccountSearch" style="display: inline-flex; width:100%;">
                       <input v-model="miningAccountSearchQuery" class="input dark-input" style="outline: none;" type="text" placeholder="0x...">
                       <button type="submit" class="submit-button">Search</button>
                      </form>
                   
                    </div>
                  </div>
                </div>
            </div>
               <!-- <div class="whitespace-lg"></div> -->
            <div class="w-full p-4 m-4">
               <div v-if="poolStatus" class="m-2 text-lg text-white">Pool Status</div>
             <div v-if="poolStatus && poolStatus.poolStatus == 'active'" >
                   <div v-if="poolName" class="bg-green-500 p-2" style="background-color: rgb(22, 176, 0); color: #e6f7d6; width: 98%;">
                     {{ poolName }} is Active.
                    </div> 
              
                    <div v-if="poolName" style="color:white;"> {{ poolName }} is open and synced with Etica mainnet</div>

                      <p style="color:#35aa31;">{{ hashrateToGH(LastPoolStatsRecord[0].Hashrate) }} GH/s   |   {{ LastPoolStatsRecord[0].Numberminers }} active miners (last hour)</p>


              </div>
            </div>
          
      </section>

 <section id="guide" class="box background-primary text-center ">
        <div class='text-lg text-white'> Start Mining ETICA </div>
        <div class='button-bubble button-gradient' style="color: #dbdbdb;">ETI Miners</div>

        <!-- <div @click="showInstructions=!showInstructions" class="cursor-pointer   select-none bg-gray-800 p-1 mt-1 rounded text-white text-xs inline-block hover:bg-gray-700"> Instructions (click for details)</div> -->

        <!--  <br> -->
      
       <!-- <div class="  m-2 "  v-if="showInstructions">
             
            <div class= " inline-block bg-gray-800 p-2 text-white">
              <p>Download the mining software</p>
              <hr>
              <!- - <p>Set pool URL to 'http://eticapool.com:8080' for low hashrates</p>
              <hr> - ->
              <p v-if="poolUrl">Set pool URL to '{{ poolUrl }}:3333'</p>
              <p v-else>Set pool URL in your miner config</p>
              <hr>
              <p>Set address to your Etica address and begin mining!</p>
              <hr>
              <p>How to mine guide: https://www.eticaprotocol.org/eticadocs/mining.html</p>
                
             </div>



            
     </div>
      <div class="whitespace-sm"></div>
    -->
        
      

        <a href="https://xmrig.com/" target="_blank" style="margin-right:1%;">
          <div class='bg-brown-button p-4 mt-4 rounded inline-block'>XMRig miner</div>
        </a>
        <a href="https://github.com/doktor83/SRBMiner-Multi/releases" target="_blank">
          <div class='bg-brown-button p-4 mt-4 rounded inline-block'>SRBMiner</div>
        </a>

        <div class="whitespace-sm"></div>
     
        <a href="/getstarted" target="_blank">
          <div class='button-bubble button-gradient' style="color: #dbdbdb;"> Getting Started  </div>
          <div class="cursor-pointer select-none bg-gray-800 p-1 mt-1 rounded text-white text-xs inline-block hover:bg-gray-700"> Getting Started</div>
        </a>
        
     <div class="whitespace-sm"></div>


       

    </section>




    <section class="flex flex-row hidden ">
      
        <div class="w-1/2">
            <div class="hidden">
            <HashrateChart 
            
            />
            </div>
      </div>
      <div class="w-1/2">
         
            <div class="card card-background-secondary"  >
              <div class="card-content text-white ">


                
                  <p>Minting:
                     <a v-cloak v-bind:href='poolAPIData.etherscanMintingURL' >
                       {{poolAPIData.mintingAddress}}
                       </a> 
                  </p>
                
                <p>Payments:   
                 <a v-cloak v-bind:href='poolAPIData.etherscanPaymentsURL' >
                  {{poolAPIData.paymentsAddress}}
                </a>
                </p>



              </div>
          </div>

       </div>

    </section>



    <section class="flex flex-row my-16  ">
      
        <div class="text-center w-full flex flex-col">
           
           <img style="width:400px; margin:0 auto;" src="@/assets/images/eticaprotocolpasteur.jpg"  />
            
           <a href="https://www.reddit.com/r/Etica" target="_blank" class="color-eticacyan"> Science knows no country because knowledge belongs to Humanity </a>
      </div>
     

    </section>
     
    
  


     </div>
   </div>

    

 



  <Footer/>

</div>
</template>


<script>
import Navbar from './components/Navbar.vue'; 
import VerticalNav from './components/VerticalNav.vue'
import Footer from './components/Footer.vue';

import TransactionsTable from './components/TransactionsTable.vue';
import HashrateChart from './components/HashrateChart.vue';
import MathHelper from '../js/math-helper'

import SocketHelper from '../js/socket-helper'

export default {
  name: 'Home',
  props: [],
  components: {Navbar,HashrateChart,TransactionsTable,VerticalNav,Footer},
  data() {
    return {
      poolName: null,
      poolUrl: null,
      poolAPIData: {}, //read this from sockets
      poolStatus: null,
      LastPoolStatsRecord: null,
      miningAccountSearchQuery: null, 
      web3Plug: null,
      showInstructions: false,
      blinkerColor:'#399999'
      
    }
  },
  created(){
      this.socketHelper = new SocketHelper()
      
      setInterval(this.pollSockets.bind(this),240000)
      setInterval(this.pollSocketsSlow.bind(this),240000)

      setInterval(this.changeblinkerColor, 600);


      this.socketsListener = this.socketHelper.initSocket()
     
     this.socketsListener.on('poolNameAndUrl', (pool) => {   
            this.poolName = pool.poolName;
            this.poolUrl= pool.poolUrl;
        });
     
      this.socketsListener.on('poolData', (data) => {  
            this.poolAPIData = data; 
        });

          this.socketsListener.on('poolStatus', (data) => {   
            this.poolStatus = data    
        });


        this.socketsListener.on('LastpoolStatsRecord', (data) => {   
            this.LastPoolStatsRecord = data;   
        });


         this.socketsListener.on('recentSolutions', (data) => {  
            this.recentSolutionTx=data
        });

         this.socketsListener.on('recentPayments', (data) => {  
            this.recentPaymentTx=data
        });

        this.pollSockets()
        this.pollSocketsSlow()
  },
  methods: {
    submitMiningAccountSearch( ){  
        this.$router.push('profile/'+this.miningAccountSearchQuery );
    //  console.log('submitMiningAccountSearch ', this.miningAccountSearchQuery)
    },

    pollSockets(){
      this.socketHelper.emitEvent('getPoolNameAndUrl')
      this.socketHelper.emitEvent('getPoolData')
       this.socketHelper.emitEvent('getPoolStatus')
      
    },

    pollSocketsSlow(){
      this.socketHelper.emitEvent('getLastPoolStatsRecord')
    },

    hashrateToMH(hashrate){
      return MathHelper.rawAmountToFormatted( hashrate , 6 )
    },

    hashrateToGH(hashrate){
      return MathHelper.rawAmountToFormatted( hashrate , 9 )
    },

    changeblinkerColor(){
        if(this.blinkerColor == '#399999'){
           this.blinkerColor = '#83e5c4';
        }
        else {
          this.blinkerColor = '#399999';
        }
        
      }

  }
}
</script>
