<template>

<div>
       <Navbar />
     

   <div class="section bg-slate-etica   ">
     <div class="w-container pt-8 text-gray-100">      
            <h1 class="title text-lg text-gray-100">
              Etica Pools
            </h1>

<p style="color:green;">Etica pools Network</p>
<p style="color:white;">Latest list of Network Mint Addresses detected by this pool:</p>
<p v-if="mintList && mintList[0]" style="color:#3c6a4e;">Last mint from: {{ mintList[0].from }} ( {{ getdisplayname(mintList[0].from) }} )</p>
      <div class="whitespace-sm"></div> 

      <div   class="box  background-secondary overflow-x-auto" style="  min-height:480px;">
        <div class='subtitle'> </div>
        <table class='table w-full'>

          <thead>
            <tr >
              <td class="px-1"> Mint Address #</td>
              <td class="px-1"> Pool Name </td>
              <td class="px-1"> Pool Url </td>
            </tr>
          </thead>

          <tbody>
            <tr v-if="poolAPIData && poolAPIData.mintingAddress">
                <td class="px-1"> <a v-bind:href='"https://www.eticascan.org/address/"+poolAPIData.mintingAddress' >
                        <span style="color:rgb(162, 162, 162);">  {{ poolAPIData.mintingAddress }}  </span>
                      </a> 
                </td>  
                <td><a v-bind:href='poolName' >
                        <span class="namecolors">  {{ poolName }} </span>
                      </a></td>
                <td class="px-1"> <a v-bind:href='poolUrl' >
                        <span class="urlcolors">  {{ poolUrl }}  </span>
                      </a> 
                </td>         
            </tr>
            <tr v-for="(item, index) in mintAddressList" v-bind:key="index">
                <td class="px-1"> <a v-bind:href='"https://www.eticascan.org/address/"+item.mintAddress' >
                        <span v-if="index % 2 === 0" style="color: rgb(213, 201, 201);">  {{ item.mintAddress }}  </span>
                        <span v-else-if="index % 3 === 0" style="color:rgb(162, 162, 162);">  {{ item.mintAddress }}  </span>
                        <span v-else style="color: rgb(89, 89, 89);">  {{ item.mintAddress }}  </span>
                      </a> 
                </td>  
                <td><a v-bind:href='item.url' >
                        <span class="namecolors">  {{ item.name }} </span>
                      </a></td>
                <td class="px-1"> <a v-bind:href='item.url' >
                        <span class="urlcolors">  {{ item.url }}  </span>
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

<style scoped>

.urlcolors{
  color:#527b7a;
}

.namecolors{
  color:#399999;
}

.nbminerscolors{
  color:#65a669;
}

.hashratecolors{
  color: cadetblue;
}

.lastupdatecolors{
  color:#527b7a;
}

</style>

<script>
import Navbar from './components/Navbar.vue';
import AppPanel from './components/AppPanel.vue';
import VerticalNav from './components/VerticalNav.vue'
import Footer from './components/Footer.vue';
import moment from 'moment'; 

import SocketHelper from '../js/socket-helper'
import MathHelper from '../js/math-helper'

import web3utils from 'web3-utils'

export default {
  name: 'Pools running with Eticapool',
  props: [],
  components: {Navbar,AppPanel,VerticalNav,Footer},
  data() {
    return {
      mintAddressList: [],
      poolName: null,
      poolUrl: null,
      poolAPIData: {},
    }
  },
  created(){
    
     this.socketHelper = new SocketHelper()
    
     setInterval(this.pollSockets.bind(this),240000)

    this.socketsListener = this.socketHelper.initSocket()

        this.socketsListener.on('mintAddressesList', (data) => {               
         
          this.updateMintAddressList(data)

    });

        this.socketsListener.on('poolNameAndUrl', (pool) => {   
            this.poolName = pool.poolName;
            this.poolUrl= pool.poolUrl;
        });

        this.socketsListener.on('poolData', (data) => {  
            this.poolAPIData = data; 
        });




   this.pollSockets()

  },
  beforeDestroy(){
    this.socketsListener.removeAllListeners()
  },
  methods: {

      async updateMintAddressList(newList){
 
           this.mintAddressList = newList 

           this.mintAddressList = this.mintAddressList.filter(x => web3utils.isAddress( x.mintAddress ) )
        
      },

      pollSockets(){
          this.socketHelper.emitEvent( 'getMintAddresses')
          this.socketHelper.emitEvent('getPoolNameAndUrl')
          this.socketHelper.emitEvent('getPoolData')
      },
      hashrateToMH(hashrate){
         return MathHelper.rawAmountToFormatted( hashrate , 6 )
      },

      totalHashrate(arr){
         let result = arr.reduce((a,curr) => a + curr.Hashrate, 0);
         return this.hashrateToMH(result);
      },

      totalMiners(arr){
         let result = arr.reduce((a,curr) => a + curr.Numberminers, 0);
         return result;
      },

      tokensRawToFormatted(rawAmount, decimals){
          return MathHelper.rawAmountToFormatted( rawAmount , decimals )
      },

      getdateformat(timestamp) {
        const now = moment.utc();
        const blockTime = moment.unix(timestamp).utc();
        const duration = moment.duration(now.diff(blockTime));

        if (!duration.isValid() || duration.asSeconds() < 0) {
          return "";
        }

        return duration.humanize() + ' ago';
      },

      getutcformat(_timestamp){
        let _utctime = new moment.unix(_timestamp).utc();
        if(_utctime.isValid()){
           return _utctime.format("YYYY-MM-DDTHH:mm") +' UTC';
        }
        else {
          return "";
        }
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
