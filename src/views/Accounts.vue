<template>

<div>



 
       <Navbar />
     

   <div class="section bg-slate-etica   ">
     <div class="w-container pt-8 text-gray-100">      
            <h1 class="title text-lg text-gray-100">
              Mining Account List (Data updates every 5 minutes)
            </h1>
            <h2 class=" ">
             
            </h2>

<p v-if="poolName" style="color:green;">{{ poolName }} is Active (Hashrates estimate updates based on shares submited over last hour)</p>
<p v-if="poolName" style="color:white;">{{ poolName }} is open and synced with Etica mainnet. Thanks for patience</p>

             <div class="whitespace-sm"></div>

 



     
  

      <div   class="box  background-secondary overflow-x-auto" style="  min-height:480px;">
        <div class='subtitle'> </div>
        <table class='table w-full'>

          <thead>
            <tr >
              <td class="px-1"> Miner # </td>

              <td class="px-1"> Eth Address </td>
              <td class="px-1"> Hash Rate </td>
             
              
              <td class="px-1"> Total Etica Earned </td>
              <!--<td class="px-1"> Tokens Awarded </td>-->
              <td class="px-1"> Etica Received </td>
              <td class="px-1"> Port </td>
            </tr>
          </thead>

          <tbody>

            <tr v-for="(item, index) in accountList">
              <td class="px-1" style="width: 100%;">  Miner {{ index }} </td>


                <td>
                      <a v-bind:href='"/profile/"+item.minerEthAddress' >
                        <span class="color-eticacyan">  {{ item.minerEthAddress }}  </span>
                      </a>
                </td>

                <td class="px-1"> {{ formatHashrate(item.avgHashrate) }} </td>
              

                <td class="px-1"> {{ tokensRawToFormatted( item.alltimeTokenBalance,18) }}    </td>
              <td class="px-1"> {{ tokensRawToFormatted( item.tokensReceived,18 ) }}   </td>
              <td v-if="item.entryport == 3333" class="px-1" style="color:#9bca33;"> 3333 </td>
              <td v-if="item.entryport == 5555" class="px-1" style="color:orange;"> 5555 </td>
              <td v-if="item.entryport == 7777" class="px-1" style="color:orange;"> 7777 </td>
              <td v-if="item.entryport == 9999" class="px-1" style="color:orange;"> 9999 </td>
             
            </tr> 


          </tbody>
        </table>

      </div>

     </div>
   </div>

   


    

  <Footer/>

</div>
</template>


<script>
import Navbar from './components/Navbar.vue';
import AppPanel from './components/AppPanel.vue';
import VerticalNav from './components/VerticalNav.vue'
import Footer from './components/Footer.vue';
 

import SocketHelper from '../js/socket-helper'
import MathHelper from '../js/math-helper'

import web3utils from 'web3-utils'

export default {
  name: 'Accounts',
  props: [],
  components: {Navbar,AppPanel,VerticalNav,Footer},
  data() {
    return {
      poolName: null,
      accountList: []
    }
  },
  created(){
    
     this.socketHelper = new SocketHelper()
    
     setInterval(this.pollSockets.bind(this),1000000)


    this.socketsListener = this.socketHelper.initSocket()
    
    
    this.socketsListener.on('poolName', (name) => {   
            this.poolName = name;
        });


    this.socketsListener.on('minerList', (data) => {               
       
         
          this.updateAccountList(data)

    });

   this.pollSockets()

  },
  beforeDestroy(){
    this.socketsListener.removeAllListeners()
  },
  methods: {


      async updateAccountList(newList){

        this.accountList = newList.filter(item => {
          const minerAddress = item.minerEthAddress.substr(0, 42);
          return web3utils.isAddress(minerAddress) && !isNaN(item.avgHashrate);
        });

          this.accountList.sort((a,b) => {return parseFloat(b.avgHashrate) - parseFloat(a.avgHashrate)});
        
      },

      pollSockets(){
          this.socketHelper.emitEvent('getPoolName'),
          //this.socketHelper.emitEvent( 'getActiveMinerList') get active miners
          this.socketHelper.emitEvent( 'getMinerList') // get all miners
      },
      hashrateToMH(hashrate){
         return MathHelper.rawAmountToFormatted( hashrate , 6 )
      },
      tokensRawToFormatted(rawAmount, decimals){
          return MathHelper.rawAmountToFormatted( rawAmount , decimals )
      },

      formatHashrate(rate) {
      rate= parseFloat(rate); 
      let unit= 'H/s';
       if(rate >= 1000) { rate /= 1000; unit= 'KH/s'; }
       if(rate >= 1000) { rate /= 1000; unit= 'MH/s'; }
       if(rate >= 1000) { rate /= 1000; unit= 'GH/s'; }
       if(rate >= 1000) { rate /= 1000; unit= 'TH/s'; }
       if(rate >= 1000) { rate /= 1000; unit= 'PH/s'; }
       return (rate.toFixed(4) + ' ' + unit);
      }

  }
}
</script>
