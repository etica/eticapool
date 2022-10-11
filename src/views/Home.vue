<template>

<div>




   
       <Navbar />



   <div class="section bg-slate-etica   autospacing  ">
     <div class=" w-container pt-8">





       <section class="hero circuit-overlay  text-center ">
          <div class="flex flex-col lg:w-1/2" style="margin:0 auto">

          <div class=" text-center  "  >
            <span v-if="poolName" class="title font-roboto text-white font-bold text-4xl">
                {{ poolName }}
            </span>
            </div>

            <div  v-if="false"  class="loading-animation">
                <div class="loader"></div>
            </div> 

                <p class="text-white font-bold">Mining Pool URLs</p>
                <p class="text-white font-bold" style="color:#76bbb1;">http://eticapool.com:8080 (for low hashrates) </p>
                <p class="text-white font-bold" style="color:#399999;">http://eticapool.com:8081 (for high hashrates) </p>
                <p class="text-white font-bold">Smart Contract Address: 0x34c61EA91bAcdA647269d4e310A86b875c09946f </p>

                <div class="whitespace-md" style="margin-top: 2em;"></div>

                <div class="account-search-container ">
                  <div class="field">
                    <a href="/accounts" style="text-decoration:underline;color:#85b593;"> Accounts Page</a>
                    <br>
                    <div class="label text-white font-bold">View Mining Account</div>
                    <div class="control">
                      <form v-on:submit.prevent="submitMiningAccountSearch">
   

                       <input v-model="miningAccountSearchQuery" class="input dark-input  " type="text" placeholder="0x...">
                      </form>
                   
                    </div>
                  </div>
                </div>
            </div>
               <!-- <div class="whitespace-lg"></div> -->
            <div class="w-full p-4 m-4">
               <div v-if="poolStatus" class="m-2 text-lg text-white">Pool Status</div>
             <div v-if="poolStatus && poolStatus.poolStatus == 'active'" >
                   <div v-if="poolName" class="bg-green-500 w-full p-2">
                     {{ poolName }} is Active.
                    </div> 
                    <div v-if="poolName" style="color:white;"> {{ poolName }} is open and synced with Etica mainnet</div>

                      <p style="color:#35aa31;">{{ hashrateToGH(LastPoolStatsRecord[0].Hashrate) }} GH/s   |   {{ LastPoolStatsRecord[0].Numberminers }} active miners (last hour)</p>


              </div>
          
      </section>

 <section id="guide" class="box background-primary text-center ">
        <div class='text-lg text-white'> Start Mining ETICA </div>

         <div @click="showInstructions=!showInstructions" class="cursor-pointer   select-none bg-gray-800 p-1 mt-1 rounded text-white text-xs inline-block hover:bg-gray-700"> Instructions (click for details)</div>

          <br>
      
        <div class="  m-2 "  v-if="showInstructions">
             
            <div class= " inline-block bg-gray-800 p-2 text-white">
              <p>Download the mining software</p>
              <hr>
              <p>Set pool URL to 'http://eticapool.com:8080' for low hashrates</p>
              <hr>
              <p>Set pool URL to 'http://eticapool.com:8081' for high hashrates</p>
              <hr>
              <p>Set address to your ETH address and begin mining!</p>
              <hr>
              <p>How to mine guide: https://www.eticaprotocol.org/eticadocs/mining.html</p>
                
             </div>



            
     </div>
      <div class="whitespace-sm"></div>
        
      

        <a href="https://bio.hiveos.farm/repo/SoliditySHA3Miner-2.2.8.tar.gz" target="_blank">
          <div class='bg-cyan-etica p-4 mt-4 rounded text-black inline-block  hover:bg-blue-200'>Download the Token Miner (Linux)</div>
        </a>
         <div class=""></div>
        <a href="https://bio.hiveos.farm/repo/SoliditySHA3Miner-2.2.8.tar.gz" target="_blank">
          <div class='bg-cyan-etica p-4 mt-4 rounded text-black inline-block hover:bg-blue-200'>Download the Token Miner (Windows)</div>
        </a>

        <div class="whitespace-sm"></div>
     
        <a href="https://www.eticaprotocol.org/eticadocs" target="_blank">
          <div class='button-bubble button-gradient' style="color: #dbdbdb;">How to mine Eticas</div>
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
           
           <img style="width:400px; margin:0 auto;" src="@/assets/images/eticaprotocolpasteur.png"  />
            
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
      poolAPIData: {}, //read this from sockets
      poolStatus: null,
      LastPoolStatsRecord: null,
      miningAccountSearchQuery: null, 
      web3Plug: null,
      showInstructions: false,
      
    }
  },
  created(){
      this.socketHelper = new SocketHelper()
      
      setInterval(this.pollSockets.bind(this),5000)
      setInterval(this.pollSocketsSlow.bind(this),60000)


      this.socketsListener = this.socketHelper.initSocket()
     
     this.socketsListener.on('poolName', (name) => {   
            this.poolName = name;
        });
     
      this.socketsListener.on('poolData', (data) => {  
             
            this.poolAPIData = data 
        });

          this.socketsListener.on('poolStatus', (data) => {   
            this.poolStatus = data    
        });


        this.socketsListener.on('LastpoolStatsRecord', (data) => {   
            this.LastPoolStatsRecord = data;
            console.log('LastpoolStatsRecord',this.LastPoolStatsRecord);    
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
      this.socketHelper.emitEvent('getPoolName')
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
    }

  }
}
</script>
