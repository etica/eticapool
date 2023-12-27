// worker.js

import events from 'events';
import {EmptyAnswer, Notify, Answer, PositiveAnswer, ErrorAnswer, errors} from './interactions.js'; // Import the interaction classes
import {randomBytes} from 'crypto';
import web3utils from "web3-utils";
import PeerHelper from "../util/peer-helper.js";

// Import other necessary modules and definitions (e.g., interactions)


class Worker extends events.EventEmitter {
    constructor(socket, poolConfig, poolStatsHelper, tokenDataHelper, mongoInterface) {
        super();
        this.poolConfig = poolConfig
        this.mongoInterface = mongoInterface
        this.extraNonce = randomBytes(4).toString('hex')+(PeerHelper.getTimeNowSeconds()).toString(16)
        this._socket = socket;
        this.chain = 'etica'
        this.authorized = false
        this.subscribe = false
        this.workerName = null // example Jessminer1
        this.minerEthAddress = null
        this.fullWorkerName = null // ethaddress+workername
        this.difficulty = poolConfig.miningConfig.minimumShareDifficultyHard
        this.poolSuspended = false
        this.sentInteractions = 0;
        this.cachedBytes = [];
        this.sessionId = randomBytes(8).toString('hex')
        this.tokenDataHelper = tokenDataHelper;
        this.poolStatsHelper = poolStatsHelper;
        this.challengeNumber = poolConfig.challengeNumber;
        this.poolAddress = poolConfig.mintingConfig.publicAddress;
        const valueToConvert = poolConfig.recentMiningContractData.miningTarget;
        this.target = '0x' +web3utils.toBN(valueToConvert).toString('hex');
        this.jobId = 1;

        // Set up event listeners for the socket
        this._socket.on('data', (data) => this._handleStream(data));
        this._socket.on('error', (err) => this._handleError(err));
        this._socket.on('end', () => this._handleEnd());
    }

    // Send a formatted interaction to the client
    sendInteraction(interaction) {
        const jsonInteraction = interaction.toJSON();

        // Assign an ID to the interaction if not already present
        if (typeof jsonInteraction.id === 'undefined') {
            this.sentInteractions += 1;
            jsonInteraction.id = this.sentInteractions;
        }

        let interactionCall = JSON.stringify(jsonInteraction);

        // Additional processing if required
        // Example: Replacing placeholders in the interaction call string

        this._socket.write(interactionCall + '\n');
    }

    sendNewJob(increaseJobId=true) {
        this.extraNonce = "0x"+randomBytes(4).toString('hex')+(PeerHelper.getTimeNowSeconds()).toString(16)
        if (increaseJobId) {
            this.jobId += 1
        }
        this.sendInteraction(new Notify(this.jobId,
            this.challengeNumber,
            this.poolAddress,
            this.extraNonce,
            this.target,
            this.difficulty
        ));
    }

    async handleUpdate(updatedChallenge) {
        // Logic to handle the updated data
        console.log('Worker is handling updated updatedChallenge: ', updatedChallenge);

        try {
        if (updatedChallenge){
            if (updatedChallenge !== this.challengeNumber && this.authorized && this.subscribe) {
                this.challengeNumber = updatedChallenge
                this.sendNewJob()
            }
        }
        }
        catch(error){
            console.log('error:', error);
        }
    }

    // Handle incoming data from the socket
    _handleStream(data) {
        for (const byte of data) {
            if (byte === 0x0a) { // Newline character
                const interaction = Buffer.from(this.cachedBytes);
                this._handleMessage(interaction);
                this.cachedBytes = [];
            } else {
                this.cachedBytes.push(byte);

                // Implement a check for maximum allowed interaction size
                if (this.cachedBytes.length > 512) {
                    this._socket.end('INVALID_INTERACTION_SIZE');
                }
            }
        }
    }

    // Process each complete interaction message
    async _handleMessage(buffer) {
        let interaction = buffer.toString();
        try {
            interaction = this._parseInteraction(interaction);
            // Process the interaction and possibly send a response
            this._processInteraction(interaction, this.poolStatsHelper, this.tokenDataHelper);
        } catch (error) {
            console.error("_handleMessage error", error)
            this._socket.end('INVALID_INTERACTION');
        }
    }


    async _processInteraction(interaction, poolStatsHelper, tokenDataHelper) {
        // Here you can define logic to process different types of interactions

        switch (interaction.method) {
            case 'subscribe':
                console.info('subscribe method received', interaction.params);
                // Send a response to acknowledge the subscription
                this.subscribe = true
                this.sendInteraction(new EmptyAnswer(interaction.id));
                this.emit('subscribe');
                break;
            case 'authorize':
                if (!this.subscribe) {
                    this.sendInteraction(new ErrorAnswer(interaction.id, errors.NOT_SUBSCRIBED));
                } else {
                    var _minerEthAddress = interaction.params[0].toString().substr(0, 42);
                    var extractedWorkerName = interaction.params[0].substring(42).trim();
                    var workerName = extractedWorkerName;
                    var chain = ''; // Default empty chain

                    // Regular expression to match the pattern :CHAIN
                    var chainRegex = /:(\w+)/;

                    // Check if the worker name contains the chain pattern
                    var chainMatch = extractedWorkerName.match(chainRegex);
                    if (chainMatch) {
                        chain = chainMatch[1]; // Extract chain from the matched pattern
                        workerName = extractedWorkerName.replace(chainRegex, '').trim(); // Remove the chain part from the worker name
                    }

                    // Remove leading dot if present
                    if (workerName.startsWith('.')) {
                        workerName = workerName.substring(1);
                    }
                    if (chain) {
                        this.chain = chain.toLowerCase()
                    }

                    //this.poolSuspended = (poolStatsHelper && poolStatsHelper.poolStatus && poolStatsHelper.poolStatus && poolStatsHelper.poolStatus !== "active")
                    //console.log("this.poolSuspended", this.poolSuspended)

                    if (!web3utils.isAddress(_minerEthAddress.toString())) {
                        // Send a error response to acknowledge the subscription
                        this.sendInteraction(new ErrorAnswer(interaction.id, errors.INVALID_ADDRESS));
                    } else {
                        // Send a response to acknowledge the subscription
                        this.workerName = workerName
                        this.minerEthAddress = _minerEthAddress;
                        this.fullWorkerName = _minerEthAddress+'.'+workerName;
                        this.authorized = true;
                        this.sendInteraction(new PositiveAnswer(interaction.id));
                        this.sendNewJob(false); // sends new job to miner without increasing jobid
                    }
                }
                break;
            case 'getPoolProtocolVersion':
                  console.log('getPoolProtocolVersion method received');
                  // Implement your logic here to retrieve the pool protocol version
                  const poolProtocolVersion = PoolStatsHelper.getPoolProtocolVersion();
                  this.sendInteraction(new Answer(interaction.id, poolProtocolVersion));
                  break;
  
            case 'getPoolStatus':
                  console.log('getPoolStatus method received');
                  // Implement your logic here to get pool status
                  // For example, check if pool minting is suspended
                  PoolStatsHelper.poolMintingIsSuspended(poolConfig, mongoInterface)
                      .then((poolSuspended) => {
                          this.sendInteraction(new Answer(interaction.id, { poolIsSuspended: poolSuspended }));
                      })
                      .catch((error) => {
                          console.error('Error getting pool status:', error);
                          this.sendInteraction(new ErrorAnswer(interaction.id, errors.UNKNOWN));
                      });
                  break;
              case 'getPoolEthAddress':
                    console.log('getPoolEthAddress method received');
                    const poolEthAddress = PeerHelper.getPoolEthAddress(poolConfig).toString();
                    this.sendInteraction(new Answer(interaction.id, poolEthAddress));
                    break;
    
              case 'getMinimumShareDifficulty':
                    console.log('getMinimumShareDifficulty method received');
                    PeerHelper.getPoolMinimumShareDifficultyHard(poolConfig)
                        .then((difficulty) => {
                            this.sendInteraction(new Answer(interaction.id, difficulty));
                        })
                        .catch((error) => {
                            console.error('Error getting minimum share difficulty:', error);
                            this.sendInteraction(new ErrorAnswer(interaction.id, errors.UNKNOWN));
                        });
                    break;
    
              case 'getMinimumShareTarget':
                    console.log('getMinimumShareTarget method received');
                    // Similar implementation as getMinimumShareDifficulty but for retrieving the minimum share target
                    // Using getPoolMinimumShareTargetHard method from PeerHelper
                    // Handle error and send response accordingly
                    break;
    
              case 'getChallengeNumber':
                    console.log('getChallengeNumber method received');
                    tokenDataHelper.getChallengeNumber(mongoInterface)
                        .then((challengeNumber) => {
                            challengeNumber = challengeNumber ? challengeNumber.toString() : null;
                            this.sendInteraction(new Answer(interaction.id, challengeNumber));
                        })
                        .catch((error) => {
                            console.error('Error getting challenge number:', error);
                            this.sendInteraction(new ErrorAnswer(interaction.id, errors.UNKNOWN));
                        });
                    break;
               
                    
              case 'submit':
                try{
                   // ------------  PoolSuspended   ------------  //
                      console.log('worker submitShare function reached');
                      var nonce = interaction.params[1].toString()
                      console.log('nonce is:', nonce);

                      var validJSONSubmit = true;

                      if(
                        this.difficulty == null  ||
                        nonce == null  ||
                        this.fullWorkerName == null  ||
                        this.challengeNumber == null
                      ) {
                        validJSONSubmit = false;
                      }

                      var computed_digest =  web3utils.soliditySha3( this.challengeNumber , this.poolAddress, nonce );

                      var digestBigNumber = web3utils.toBN(computed_digest);

                      var minimumTarget = PeerHelper.getTargetFromDifficulty( this.difficulty )

                      if(digestBigNumber.gte(minimumTarget))
                      {
                        validJSONSubmit = false;
                      }

                      var ethBlock = await tokenDataHelper.getEthBlockNumber(this.mongoInterface);

                      var shareData = {block: ethBlock ,
                        nonce: nonce,
                        minerEthAddress: this.fullWorkerName,
                        challengeNumber: this.challengeNumber,
                        digest: computed_digest,
                        difficulty: this.difficulty,
                        customVardiff: false,
                        minerport: 8081
                      };
                    
                      
                      if(validJSONSubmit){
                        var response = await mongoInterface.insertOne('queued_shares_list', shareData );
                        this.sendInteraction(new PositiveAnswer(interaction.id));            
                        
                      }else{
                        console.error('Invalid share JSON:');
                        this.sendInteraction(new ErrorAnswer(interaction.id, errors.INVALID_SHARE));
                      }

                      }  catch (error) {
                            console.error('Error submiting share:', error);
                            this.sendInteraction(new ErrorAnswer(interaction.id, errors.UNKNOWN));
                      }

                        // Handle other methods...

                        default:
                            // Handle unknown methods
                            this.sendInteraction(new ErrorAnswer(interaction.id, errors.INVALID_METHOD_NAME));
                            break;
                    }
    }

    // Parse and validate the interaction data
    _parseInteraction(data) {
        const interaction = JSON.parse(data);
        interaction.method = interaction.method.replace('mining.', '');
        return interaction;
    }

    // Handle socket error event
    _handleError(err) {
        this.emit('error', err);
    }

    // Handle socket end event
    _handleEnd() {
        this.emit('end');
    }
}

export default Worker;
