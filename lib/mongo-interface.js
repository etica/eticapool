
 
 
 
 import Mongodb from 'mongodb'
 
 var mongoClient = Mongodb.MongoClient;



var url = process.env.MONGODB_URI || "mongodb://localhost:27017";
var dbo;


export default class MongoInterface  {



    async init( dbName  )
    {

      var self = this;


      if(dbName == null)
      {
        dbName = "pooldb"
      }

      var database = await new Promise(function(resolve, reject) {
            mongoClient.connect(url, { useUnifiedTopology: true }, function(err, db) {
              if (err) throw err;
                dbo = db.db( dbName );

                //test
                //self.insertOne('stats',{'hashrate':1000})
                resolve(dbo)
            });
        });


        await this.createCollectionUniqueIndexes()

    } 

    async deletedatabase( dbName  )
    {

      var self = this;


      if(dbName == null)
      {
        dbName = "pooldb"
      }

      var database = await new Promise(function(resolve, reject) {
            mongoClient.connect(url, { useUnifiedTopology: true }, function(err, db) {
              if (err) throw err;
                dbo = db.db( dbName );
                dbo.dropDatabase();

                //test
                //self.insertOne('stats',{'hashrate':1000})
                resolve(dbo)
            });
        });

    }

    async createCollectionUniqueIndexes()
    {
      await this.createIndexOnCollection('miner_shares', 'minerEthAddress') 
      await this.createIndexOnCollection('miner_shares', 'digest')  

      await this.createIndexOnCollection('minerData', 'minerEthAddress') 

      await this.createIndexOnCollection('balance_payments', 'minerEthAddress') 
      await this.createDualIndexOnCollection('balance_payments', 'batchId', 'txHash')  
      

      // added update new mining reward system, reward after blockchain pool solutions mined:
      await this.createIndexOnCollection('miner_pendingshares', 'challengeNumber') 
      await this.createIndexOnCollection('miner_pendingshares', 'digest')

      await this.createIndexOnCollection('allminingContracts', 'epochCount') 
      await this.createIndexOnCollection('allminingContracts', 'newChallengeNumber')
      
      await this.createIndexOnCollection('totaldiff_challengenumber', 'newChallengeNumber')
      await this.createIndexOnCollection('totaldiff_challengenumber', 'minerport')

      await this.createIndexOnCollection('miner_challengediff', 'ChallengeNumber')
      await this.createIndexOnCollection('miner_challengediff', 'minerEthAddress')
      await this.createIndexOnCollection('miner_challengediff', 'minerport')

      // Compound indexes for common query patterns
      await this.createDualIndexOnCollection('miner_challengediff', 'minerEthAddress', 'challengeNumber')
      await this.createTripleIndexOnCollection('miner_challengediff', 'minerEthAddress', 'challengeNumber', 'minerport')
      await this.createDualIndexOnCollection('totaldiff_challengenumber', 'challengeNumber', 'minerport')
      await this.createDualIndexOnCollection('miner_pendingshares', 'minerEthAddress', 'time')
      await this.createIndexOnCollection('ppnls_rewards', 'createdAt')
      await this.createDualIndexOnCollection('ppnls_rewards', 'minerEthAddress', 'createdAt')


      await this.createIndexOnCollection('pool_mints', 'epochCount') 
      await this.createIndexOnCollection('pool_mints', 'newChallengeNumber') 
      // added update new mining reward system, reward after blockchain pool solutions mined


      await this.createIndexOnCollection('poolStatsRecords', 'recordedat')
      await this.createIndexOnCollection('networkStatsRecords', 'recordedat')


      await this.createIndexOnCollection('all_eti_mints', 'epochCount') 
      await this.createIndexOnCollection('all_eti_mints', 'newChallengeNumber')
      await this.createIndexOnCollection('all_eti_mints', 'from')
      

      await this.createIndexOnCollection('network_pools', 'name') 
      await this.createIndexOnCollection('network_pools', 'mintAddress')
      await this.createIndexOnCollection('network_pools', 'lastupdate')
      
      await this.createIndexOnCollection('network_pools_addresses', 'name') 
      await this.createIndexOnCollection('network_pools_addresses', 'mintAddress')
      await this.createIndexOnCollection('network_pools_addresses', 'poolId')


      await this.createIndexOnCollection('stats_payment', 'lastpoolMintId')
      await this.createIndexOnCollection('stats_payment', 'epochCount')
      await this.createIndexOnCollection('stats_payment', 'createdAt')

      await this.createIndexOnCollection('ppnls_rewards', 'poolMintId') // typo in table name, should have been pplns but it's ok
      await this.createIndexOnCollection('ppnls_rewards', 'minerDataId')
      await this.createIndexOnCollection('ppnls_rewards', 'epochCount')
      await this.createIndexOnCollection('ppnls_rewards', 'minerEthAddress')
      await this.createIndexOnCollection('ppnls_rewards', 'ChallengeNumber')


      //await this.createDualIndexOnCollection('event_data', 'contractAddress', 'startBlock')
      //await this.createUniqueDualIndexOnCollection('event_list', 'transactionHash', 'logIndex')

    }



    async createIndexOnCollection(collectionName, indexColumnName)
    {
      dbo.collection(collectionName).createIndex( { [`${indexColumnName}`]: 1 }, { unique: false } )
    }

    async createUniqueIndexOnCollection(collectionName, indexColumnName)
    {
      dbo.collection(collectionName).createIndex( { [`${indexColumnName}`]: 1 }, { unique: true } )
    }

    async createDualIndexOnCollection(collectionName, indexColumnNameA, indexColumnNameB)
    {
      dbo.collection(collectionName).createIndex( { [`${indexColumnNameA}`]: 1,  [`${indexColumnNameB}`]: 1 }, { unique: false } )
    }

    async createTripleIndexOnCollection(collectionName, indexColumnNameA, indexColumnNameB, indexColumnNameC)
    {
      dbo.collection(collectionName).createIndex( { [`${indexColumnNameA}`]: 1,  [`${indexColumnNameB}`]: 1 , [`${indexColumnNameC}`]: 1}, { unique: false } )
    }

    async createUniqueTripleIndexOnCollection(collectionName, indexColumnNameA, indexColumnNameB, indexColumnNameC)
    {
      dbo.collection(collectionName).createIndex( { [`${indexColumnNameA}`]: 1,  [`${indexColumnNameB}`]: 1 , [`${indexColumnNameC}`]: 1}, { unique: true } )
    }

    async createUniqueDualIndexOnCollection(collectionName, indexColumnNameA, indexColumnNameB)
    {
      dbo.collection(collectionName).createIndex( { [`${indexColumnNameA}`]: 1,  [`${indexColumnNameB}`]: 1 }, { unique: true } )
    }

    async aggregateOnCollection(collectionName, pipeline, options) {
      return dbo.collection(collectionName).aggregate(pipeline, options).toArray()
    }





    async insertOne(collectionName,obj)
    {
    //  var myobj = { name: "Company Inc", address: "Highway 37" };
      return new Promise(function(resolve, reject) {
          dbo.collection(collectionName).insertOne(obj, function(err, res) {
            if (err) { reject(err); return; }
            //console.log("1 inserted ",collectionName);
            resolve(res);
          });
      });

    } 

    async updateOne(collectionName,query,newvalues)
    {
    //  var query = { address: "Park Lane 38" };
    //  var filter = { _id: 0, name: 1, address: 1 };

      var setvalues = { $set: newvalues }

      return new Promise(function(resolve, reject) {

        dbo.collection(collectionName).updateOne(query,setvalues,function(err, res) {
           if (err) { reject(err); return; }
           resolve(res);
         });


      });

    }

    async updateOneCustom(collectionName,query,customvalues)
    {
     
      return new Promise(function(resolve, reject) {

        dbo.collection(collectionName).updateOne(query,customvalues,function(err, res) {
           if (err) { reject(err); return; }
           resolve(res);
         });


      });

    }



    async updateAndFindOne(collectionName,query,newvalues)
     {
       let options= {returnOriginal:false} //give us the new record not the original
       var setvalues = { $set: newvalues }

       return new Promise(function(resolve, reject) {

         dbo.collection(collectionName).findOneAndUpdate(query,setvalues,options,function(err, res) {
            if (err) { reject(err); return; }
            resolve(res);
          });


       }.bind(this));

     } 


    async upsertOne(collectionName,query,newvalues)
    {

      var setvalues = { $set: newvalues }

      return new Promise(function(resolve, reject) {
        dbo.collection(collectionName).updateOne(query, setvalues, { upsert: true }, function(err, res) {
          if (err) { reject(err); return; }
          resolve(res);
        });
      });

    }
    
    
    async upsertOneCustom(collectionName, query, customvalues) {
      return new Promise(function(resolve, reject) {
        dbo.collection(collectionName).updateOne(
          query,
          customvalues,
          { upsert: true },
          function(err, res) {
            if (err) { reject(err); return; }
            resolve(res);
          }
        );
      });
    }
    

    async deleteOne(collectionName,obj)
    {
      return new Promise(function(resolve, reject) {
          dbo.collection(collectionName).deleteOne(obj, function(err, res) {
            if (err) { reject(err); return; }

            resolve(res);
          });
      });


    } 

    async deleteMany(collectionName,query)
    {
      return new Promise(function(resolve, reject) {
          dbo.collection(collectionName).deleteMany(query, function(err, res) {
            if (err) { reject(err); return; }
          //  console.log("1 inserted ",collectionName);
            resolve(res);
          });
      });


    } 

    async dropCollection(collectionName)
    {
      return new Promise(function(resolve, reject) {
          dbo.dropCollection(collectionName, function(err, res) {
            if (err) { reject(err); return; }
          //  console.log("1 inserted ",collectionName);
            resolve(res);
          });
      });


    } 

    async dropDatabase( )
    {
      return new Promise(function(resolve, reject) {
          dbo.dropDatabase(  function(err, res) {
            if (err) { reject(err); return; }
            resolve(res);
          });
      });


    } 

    async findAndDeleteOne(collectionName, query){
      return new Promise(function(resolve, reject) {

        dbo.collection(collectionName).findOneAndDelete(query,function(err, res) {
           if (err) { reject(err); return; }
           resolve(res);
         });


      });
    } 

    async findOne(collectionName,query)
    {
     
      return new Promise(function(resolve, reject) {

        dbo.collection(collectionName).findOne(query,function(err, res) {
           if (err) { reject(err); return; }
           resolve(res);
         });


      });

    } 

   

    async findAll(collectionName,query,outputFields)
    {
    //  var query = { address: "Park Lane 38" };
    //  var filter = { _id: 0, name: 1, address: 1 };
      return new Promise(function(resolve, reject) {

        dbo.collection(collectionName).find(query, outputFields).toArray(function(err, res) {
           if (err) { reject(err); return; }
           resolve(res);
         });


      });

    }


    async findAllSorted(collectionName,query,sortBy)
    {
     
      return new Promise(function(resolve, reject) {

        dbo.collection(collectionName).find(query).sort(sortBy).toArray(function(err, res) {
           if (err) { reject(err); return; }
           resolve(res);
         });


      });

    } 


    async findAllSortedWithLimit(collectionName,query,sortBy,limit)
    {
     //.find().limit( 5 ).sort( { name: 1 } )

     
      return new Promise(function(resolve, reject) {

        dbo.collection(collectionName).find(query).sort(sortBy).limit(limit).toArray(function(err, res) {
           if (err) { reject(err); return; }
           resolve(res);
         });


      });

    }
    
    
    async findAllSortedWithLimitAndProjection(collectionName,query,sortBy,limit,projection)
    {

      return new Promise(function(resolve, reject) {

        dbo.collection(collectionName).find(query, {projection: projection}).sort(sortBy).limit(limit).toArray(function(err, res) {
           if (err) { reject(err); return; }
           resolve(res);
         });


      });

    }

    async findAllSortedWithLimitonString(collectionName,query,sortBy,limit)
    {
     //.collation({locale:"en_US", numericOrdering:true}) -> makes it possible to sort string field as if it was integer field

     
      return new Promise(function(resolve, reject) {

        dbo.collection(collectionName).find(query).sort(sortBy).collation({locale:"en_US", numericOrdering:true}).limit(limit).toArray(function(err, res) {
           if (err) { reject(err); return; }
           resolve(res);
         });


      });

    }

    async findAllonString(collectionName,query,outputFields)
    {
    //  var query = { address: "Park Lane 38" };
    //  var filter = { _id: 0, name: 1, address: 1 };
      return new Promise(function(resolve, reject) {

        dbo.collection(collectionName).find(query, outputFields).collation({locale:"en_US", numericOrdering:true}).toArray(function(err, res) {
           if (err) { reject(err); return; }
           resolve(res);
         });


      });

    }


    async countAll(collectionName,query,outputFields)
    {
      return new Promise(function(resolve, reject) {

        dbo.collection(collectionName).find(query, outputFields).count(function(err, res) {
          if (err) { reject(err); return; }
          resolve(res);
        });

      });

    } 


     getMongoClient()
     {
       return mongoClient;
     } 



}
