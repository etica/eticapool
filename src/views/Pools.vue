<template>

<div>
       <Navbar />
     

   <div class="section bg-slate-etica   ">
     <div class="w-container pt-8 text-gray-100">      
            <h1 class="title text-lg text-gray-100">
              Etica Pools
            </h1>
            <p v-if="poolList" style="color:#53b311;">
             Total Hashrate: {{ totalHashrate(poolList) }} (MH/s) | Number active miners (from last updates): {{ totalMiners(poolList) }}
            </p>

<p style="color:green;">Etica pools Network</p>
<p style="color:white;">Mining Pools running with Eticapool, data updates about every 10 minutes</p>
<p v-if="mintList && mintList[0]" style="color:#3c6a4e;">Last mint from: {{ mintList[0].from }} ( {{ getdisplayname(mintList[0].from) }} )</p>
      <div class="whitespace-sm"></div> 

      <div   class="box  background-secondary overflow-x-auto" style="  min-height:480px;">
        <div class='subtitle'> </div>
        <table class='table w-full'>

          <thead>
            <tr >
              <td class="px-1"> Name # </td>
              <td class="px-1"> Url </td>
              <td class="px-1"> Mint Address </td>
              <td class="px-1"> Nb Miners </td>
              <td class="px-1" style="width:7%;"> Hashrate </td>
              <td class="px-1" style="width:75%;"> Last update </td>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(item, index) in poolList">
                <td><a v-bind:href='item.url' >
                        <span v-if="item.poolserver == true" :style="{ color: blinkerColor }">  {{ item.name }} </span>
                        <span v-else class="namecolors">  {{ item.name }} </span>
                      </a></td>
                <td class="px-1"> <a v-bind:href='item.url' >
                        <span class="urlcolors">  {{ item.url }}  </span>
                      </a> 
                </td>
                <td class="px-1"> <a v-bind:href='"https://www.eticascan.org/address/"+item.mintAddress' >
                        <span v-if="index % 2 === 0 && item.Hashrate > 0" style="color: rgb(213, 201, 201);">  {{ item.mintAddress }}  </span>
                        <span v-else-if="index % 3 === 0 && item.Hashrate > 0" style="color:rgb(162, 162, 162);">  {{ item.mintAddress }}  </span>
                        <span v-else-if="item.Hashrate > 0" style="color: rgb(225, 225, 225);">  {{ item.mintAddress }}  </span>
                        <span v-else style="color: rgb(89, 89, 89);">  {{ item.mintAddress }}  </span>
                      </a> 
                </td>
                <td class="px-1 nbminerscolors"> {{ item.Numberminers }}    </td>
                <td class="px-1 hashratecolors"> {{ formatHashrate(item.Hashrate) }} </td>
                <td class="px-1 lastupdatecolors" v-bind:title='getutcformat(item.lastupdate)'> {{ getdateformat(item.lastupdate) }} </td>              
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
       
      poolList: [],
      mintList: [],
      blinkerColor:'#399999'
    }
  },
  created(){
    
     this.socketHelper = new SocketHelper()
    
     setInterval(this.pollSockets.bind(this),60000)

     setInterval(this.changeblinkerColor, 600);

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
        
      },
            async updateMintList(newList){
          console.log('Mint list is', newList);
           this.mintList = newList;
        
      },
      pollSockets(){
          this.socketHelper.emitEvent( 'getPoolList'),
          this.socketHelper.emitEvent( 'getMintList', {nbmints: 1})
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
       return (rate.toFixed(4) + ' ' + unit);
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

      getdateformat(_timestamp){
        let _now = new moment();
        let _nowUtc = _now.utc();
        let _blocktime= moment.unix(_timestamp);
        let _remaining  = moment.duration(_nowUtc.diff(_blocktime));
        if(_remaining < 0){
           _remaining = 0;
        }

        if(_remaining.isValid()){
        return _remaining.humanize() +' ago';
        }
        else{
          return "";
        }
      },

      getutcformat(_timestamp){
        let _utctime = new moment.unix(_timestamp).utc();
        if(_utctime.isValid()){
           return _utctime.format("YYYY-MM-DDTHH:mm") +' UTC';
        }
        else {
          return "";
        }
      },

      getdisplayname(_address){

      let displaypool = this.poolList.find(({ mintAddress }) => mintAddress === _address);

      if(displaypool){
        return displaypool.name
      }
      else {
        return "unknown miner";
      }
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
