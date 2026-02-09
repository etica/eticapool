<template>
  <div   class="navbar h-nav">
    <div class=" grid grid-flow-col text-gray-900 ">

      <div

      v-for="name in buttonNames"
      @click="onClick(name)"
      class="font-sans bg-gray-200 border-2 border-gray-500 hover:bg-gray-800 hover:text-gray-200 cursor-pointer capitalize  text-center p-2 m-2 inline-block"
      :class="{'bg-green-500': (name == activeSection && activeColor =='green'),'bg-eticacyan-500': (name == activeSection && activeColor =='eticacyan') , 'text-gray-200': (name == activeSection)}"
      >
       {{name}}
     </div>


    </div>
  </div>
</template>


<script>

export default {
  name: 'HorizontalNav',
  props: ['activeSection', 'activeColor', 'buttonClickedCallback', 'buttonNamesArray'],
  components: { },
  data() {
    return {
      buttonNames: this.buttonNamesArray
    }
  },
  methods: {
    onClick(buttonName){
      this.buttonClickedCallback(buttonName)
    }
  }
}
</script>

<style scoped>
/* note: former bg-green-500 available everywhere, no need add style scoped */
.bg-eticacyan-500 {
background-color: #3e7963;
color: #ffffff;
}

</style>
