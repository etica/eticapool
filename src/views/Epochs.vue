<template>

<div>
       <Navbar />
     

   <div class="section bg-slate-etica   ">
     <div class="w-container pt-8 text-gray-100">      
            <h1 class="title text-lg text-gray-100">
              Etica Pools
            </h1>
            <h2 class=" ">
             
            </h2>

<p style="color:green;">Etica pools Network</p>
<p style="color:white;">Pools running with Eticapool don't represent the whole network</p>
<p v-if="mintList">Last mint: {{ mintList[0].from }}</p>
             <div class="whitespace-sm"></div> 

      <div   class="box  background-secondary overflow-x-auto" style="  min-height:480px;">
        <div class='subtitle'> </div>
        <table class='table w-full'>

          <thead>
            <tr >
              <td class="px-1"> EpochCount # </td>
              <td class="px-1"> TransactionHash </td>
              <td class="px-1"> Miner </td>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(item, index) in mintList">
                <td>
                  <a v-bind:href='item.url' >
                        <span style="color: #ffffff;">  {{ item.epochCount }} </span>
                  </a>
                </td>
                <td class="px-1"> 
                  <a v-bind:href='"https://www.eticascan.org/txs/"+item.transactionhash' >
                        <span style="color: #527b7a;">  {{ item.transactionhash }}  </span>
                  </a> 
                </td>
                <td class="px-1"> 
                  <a v-bind:href='"https://www.eticascan.org/address/"+item.from' >
                        <span v-if="index % 2 === 0" style="color: rgb(54, 179, 97);">  {{ getdisplayname(item.from) }}  </span>
                        <span v-else-if="index % 3 === 0" style="color:rgb(75, 176, 91);">  {{ getdisplayname(item.from) }}  </span>
                        <span v-else style="color: rgb(129, 221, 135);">  {{ getdisplayname(item.from) }}  </span>
                  </a> 
                </td>
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
  name: 'Pools running with Eticapool',
  props: [],
  components: {Navbar,AppPanel,VerticalNav,Footer},
  data() {
    return {
       
      poolList: [],
      mintList: [],
      PoolsmintAddresses: []  
    }
  },
  created(){
    
     this.socketHelper = new SocketHelper()
    
     setInterval(this.pollSockets.bind(this),60000)


    this.socketsListener = this.socketHelper.initSocket()
    
    
    this.socketsListener.on('poolList', (data) => {               
       
         
          this.updatePoolList(data)

    });

        this.socketsListener.on('mintList', (data) => {               
       
         
          this.updateMintList(data)

    });


   this.pollSockets()

  },
  beforeDestroy(){
    this.socketsListener.removeAllListeners()
  },
  methods: {


      async updatePoolList(newList){
 
           this.poolList = newList 

           this.poolList = this.poolList.filter(x => web3utils.isAddress( x.mintAddress ) )

          this.poolList.sort((a,b) => {return b.Hashrate - a.Hashrate})

          console.log('Pool list is', newList);

          this.PoolsmintAddresses = this.poolList.map(o => o.mintAddress);
        
      },
            async updateMintList(newList){
          console.log('Mint list is', newList);
           this.mintList = newList;
        
      },
      pollSockets(){
          this.socketHelper.emitEvent( 'getPoolList'),
          this.socketHelper.emitEvent( 'getMintList', {nbmints: 50})
      },
      hashrateToMH(hashrate){
         return MathHelper.rawAmountToFormatted( hashrate , 6 )
      },
      tokensRawToFormatted(rawAmount, decimals){
          return MathHelper.rawAmountToFormatted( rawAmount , decimals )
      },

      getdisplayname(_address){

      let displaypool = this.poolList.find(({ mintAddress }) => mintAddress === _address);

      if(displaypool){
        return displaypool.name
      }
      else {
        return _address;
      }


      }

  }
}
</script>
