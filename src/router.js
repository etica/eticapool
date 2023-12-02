import Vue from 'vue'
import Router from 'vue-router'
//import Router from './hash-router.vue'

import Home from './views/Home.vue'
import Accounts from './views/Accounts.vue'
import Pools from './views/Pools.vue'
import MintAddresses from './views/MintAddresses.vue'
import Epochs from './views/Epochs.vue'
import Profile from './views/Profile.vue'
import Overview from './views/Overview.vue'
import Payments from './views/Payments.vue'
import NotFound from './views/NotFound.vue'

Vue.use(Router)

export default new Router({
   mode: 'history',
   base: process.env.PUBLIC_URL,
  routes: [

    {
      path: '/',
      name: 'home',
      component: Home
    },

    {
      path: '/accounts',
      name: 'accounts',
      component: Accounts
    },

    {
      path: '/profile/:publicAddress',
      name: 'profile',
      component: Profile
    },

    {
      path: '/overview',
      name: 'overview',
      component: Overview
    },


    {
      path: '/pools',
      name: 'pools',
      component: Pools
    },

    {
      path: '/mintaddresses',
      name: 'mintaddresses',
      component: MintAddresses
    },

    {
      path: '/epochs',
      name: 'epochs',
      component: Epochs
    },


    {
      path: '/paymentstats',
      name: 'paymentsstats',
      component: Payments
    },
   
    {
      path: '/*',
      component: NotFound
    },


  ]
})
