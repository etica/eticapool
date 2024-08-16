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


.bg-brown-button {
background-color: #424141;
color: #8e8e8e;
}

.bg-brown-button:hover {
  background-color: #222;
  color: #f7f7f7;
}

.submit-button {
  background-color: #4CAF50;
  color: white;
  padding: 10px 20px;
  border: none;
  cursor: pointer;
  font-size: 16px;
  margin-left: 10px;
  padding-top: 1px;
  padding-bottom: 1px;
}

.submit-button:hover {
  background-color: #45a049;
}

</style>
