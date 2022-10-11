


var redisInterface = require('../lib/redis-interface')



init();

//DEPRECATED
async function init()
{
   await redisInterface.init()


   //var balance_xfers = await redisInterface.deleteHashArrayInRedis('balance_payments')

   console.log('deprecated method..' )
}
