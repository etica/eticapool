<template>
  <div id="app" class="antialiased   flex flex-col min-h-screen  ">
    <router-view class="flex-1"/>

  </div>
</template>

<style>
@tailwind base;
@tailwind components;
@tailwind utilities;

.bg-cyan-etica {
background-color:rgb(80, 181, 204);
}

.bg-cyan-etica-hov {
background-color:rgb(139, 220, 238);
}

.bg-cyan-etica-hove {
background-color:rgb(200, 220, 238);
}

.color-eticacyan {
color: #31aaa7;
}

.bg-slate-etica {
 background: rgb(19, 19, 19);
}

.bg-etica-footer {
padding-top: 2.5%;
padding-bottom: 2.5%;
background-color: #222;
}

.slate-min-height-65 {
  min-height: 65vh;
}

</style>
