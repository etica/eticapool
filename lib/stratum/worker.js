// worker.js

import events from 'events';
import {EmptyAnswer, AskNewJob, AskFirstJob, Answer, PositiveAnswer, ErrorAnswer, errors} from './interactions.js'; // Import the interaction classes
import {randomBytes} from 'crypto';
import web3utils from "web3-utils";
import PeerHelper from "../util/peer-helper.js";
import multiHashing from "cryptonight-hashing";
import BigNumber from "bignumber.js";
import * as randomxHelper from "../util/randomx-formats-helper.js";
import TokenDataHelper from '../util/token-data-helper.js'

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
        this.loginId = null
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
        this.epochCount = poolConfig.epochCount; // ETI height
        this.challengeNumber = poolConfig.challengeNumber;
        this.poolAddress = poolConfig.mintingConfig.publicAddress;
        this.randomxBlob = poolConfig.randomxBlob;
        this.randomxBlobWithReservedHash = randomxHelper.setReservedHashOnBlob(this.randomxBlob, this.poolAddress, this.challengeNumber, randomxHelper.convertAdd0x(this.extraNonce));
        this.randomxSeedhash = poolConfig.randomxSeedhash;
        const valueToConvert = poolConfig.minimumTarget;
        this.target = '0x' +web3utils.toBN(valueToConvert).toString('hex');
        // target = max(client->total_hashes / client->connected_duration * retarget_time, pool->start_diff)
        this.jobId = 1;
        this.newShareExpectedTime = poolConfig.miningConfig.newShareExpectedTime || 30; // miners are expected to send new shares on average every 30 seconds
        this.lastShareSubmissionTime = 0;
        this.minShareSubmissionInterval = 1100; // 1.1 seconds in milliseconds
        this.entryport = this._socket.localPort;

        this.retargetInterval = 120000; // 120 seconds in miliseconds
        this.retargetTimer = null;

        this.retargetDelay = Math.floor(Math.random() * 20000); // Random delay between 0 and 20 seconds

        // Set up event listeners for the socket
        this._socket.on('data', (data) => this._handleStream(data));
        this._socket.on('error', (err) => this._handleError(err));
        this._socket.on('end', () => this._handleEnd());
    }

    // Send a formatted interaction to the client
    sendInteraction(interaction) {
        const jsonInteraction = interaction.toJSON();

        // Assign an ID to the interaction if not already present
       /* if (typeof jsonInteraction.id === 'undefined') {
            this.sentInteractions += 1;
            jsonInteraction.id = this.sentInteractions;
        } */

        let interactionCall = JSON.stringify(jsonInteraction);

        this._socket.write(interactionCall + '\n');
    }

    async sendNewJob(increaseJobId=true) {
        await this.setMinerSpecificTarget();
        const compactTarget = randomxHelper.convertTargetToCompact(this.target);
        const randomxBlobRaw = randomxHelper.convertToRawWithout0x(this.randomxBlobWithReservedHash);
        const randomxSeedhashRaw = randomxHelper.convertToRawWithout0x(this.randomxSeedhash);
        if (increaseJobId) {
            this.jobId += 1
        }
        this.sendInteraction(new AskNewJob(randomxBlobRaw,
            randomxSeedhashRaw,
            compactTarget,
            this.epochCount,
            this.jobId
        ));
    }

    async sendFirstJob() {

        await this.setMinerSpecificTarget();
        const compactTarget = randomxHelper.convertTargetToCompact(this.target);

        const currentHeight = await TokenDataHelper.getEpochCount(this.mongoInterface);
        const currentrandomxBlob = await TokenDataHelper.getRandomxBlob(this.mongoInterface);
        if(this.epochCount != currentHeight || this.randomxBlob != currentrandomxBlob){
            await this.reloadWorkerJob();
        }
        const randomxBlobRaw = randomxHelper.convertToRawWithout0x(this.randomxBlobWithReservedHash);
        const randomxSeedhashRaw = randomxHelper.convertToRawWithout0x(this.randomxSeedhash);
        
        this.sendInteraction(new AskFirstJob(randomxBlobRaw,
            randomxSeedhashRaw,
            compactTarget,
            this.epochCount,
            this.jobId,
            this.loginId
        ));
    }

    async handleUpdate(updatedContract) {
        // Logic to handle the updated data

        try {
        if (updatedContract){
            if (updatedContract && updatedContract.challengeNumber !== this.challengeNumber && this.authorized && this.subscribe) {
                this.stopRetargetTimer();
                this.challengeNumber = updatedContract.challengeNumber;
                this.epochCount = updatedContract.epochCount;
                this.randomxBlob = updatedContract.randomxBlob;
                this.randomxBlobWithReservedHash = randomxHelper.setReservedHashOnBlob(this.randomxBlob, this.poolAddress, this.challengeNumber, randomxHelper.convertAdd0x(this.extraNonce)); // set specific miner blob by updating reservedSpace
                this.randomxSeedhash = updatedContract.randomxSeedhash;
                this.startRetargetTimer();
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
                if (this.cachedBytes.length > 4000) {
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
            console.error(`_handleMessage error for miner ${this.fullWorkerName || 'unknown'}:`, error);
            console.log('received wrong data format:', buffer.toString());
            this._socket.end('INVALID_INTERACTION');
        }
    }


    async _processInteraction(interaction, poolStatsHelper, tokenDataHelper) {
        // Here you can define logic to process different types of interactions

            if (interaction.method === 'login'){

                // Send a response to acknowledge the subscription
                this.subscribe = true
                //this.emit('subscribe');

                    const minerLogin = interaction.params.login;
                    const minerPass = interaction.params.pass;
                    const rigidWorkerName = interaction.params.rigid;

                    var _minerEthAddress = minerLogin.toString().substr(0, 42);
                    var extractedWorkerName = minerLogin.substring(42).trim();

                    // Use rigid parameter if provided, otherwise use extracted worker name
                    var workerName = (rigidWorkerName !== undefined && rigidWorkerName !== null) ? rigidWorkerName : extractedWorkerName;
              
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
                        if(workerName){
                            this.fullWorkerName = _minerEthAddress+'.'+workerName;
                        }
                        else {
                            this.fullWorkerName = _minerEthAddress;
                        }

                        this.authorized = true;
                        this.loginId = this.generateRandomId();
                        //this.sendInteraction(new PositiveAnswer(interaction.id));
                        this.startRetargetTimer();
                        this.sendFirstJob(); // sends new job to miner without increasing jobid
                    }

                }

                else if (interaction.method === 'submit'){

                try{
                   // ------------  Check not too many shares within  minShareSubmissionInterval to protect server resources ------------  //
                    const currentTime = Date.now();
                    const timeSinceLastSubmission = currentTime - this.lastShareSubmissionTime;

                    if (timeSinceLastSubmission < this.minShareSubmissionInterval) {
                    this.sendInteraction(new ErrorAnswer(interaction.id, errors.TOOMANY_SHARES));
                    return;
                    }
                    // ------------  Check not too many shares within  minShareSubmissionInterval to protect server resources  ------------  //

                    // check right randomxBlob //
                    const currentrandomxBlob = await TokenDataHelper.getRandomxBlob(this.mongoInterface);

                    if(this.randomxBlob != currentrandomxBlob){
                        await this.reloadWorkerJob();
                        this.sendInteraction(new ErrorAnswer(interaction.id, errors.INVALID_RANDOMX_BLOB));
                        this.sendNewJob();
                        return;
                    }
                    // check right randomxBlob //

                      var nonce = interaction.params.nonce;
                      var hashresult = interaction.params.result;

                      var validJSONSubmit = true;


                      // Verify Randomx nonce:
                     const minerBlob = randomxHelper.convertToRawWithout0x(this.randomxBlobWithReservedHash);
                     
                     const nonceBuffer = Buffer.from(nonce, 'hex');
                     const hashresultBuffer = Buffer.from(hashresult, 'hex');
                     const targetBigNumber = new BigNumber(this.target);
                     const targetBigNumberString = targetBigNumber.toString(10);
                     const targetBN = web3utils.toBN(targetBigNumberString);
                     const targetBuffer = Buffer.from(targetBigNumber.toString(16).padStart(64, '0'), 'hex');
                     // Seed hash
                     const seedHash = randomxHelper.convertToRawWithout0x(this.randomxSeedhash);

                     // Create blobWithNonce
                     const blobWithNonce = Buffer.from(minerBlob, 'hex');
                     const nonceOffset = 39; // Adjust this value if the nonce offset is different
                     nonceBuffer.copy(blobWithNonce, nonceOffset);

                     const calculatedHash = multiHashing.randomx(blobWithNonce, Buffer.from(seedHash, 'hex'), 0);

                     this.lastShareSubmissionTime = currentTime;

                    // Compare calculated hash with expected hash
                    const hashesMatch = calculatedHash.equals(hashresultBuffer);

                    if (!hashesMatch) {
                        console.log("Calculated hash does not match expected hash");
                        validJSONSubmit = false;
                    }

                    // Reverse the buffer
                    const reversedRandomxhash = Buffer.from(hashresultBuffer).reverse();
                    // Convert the reversed buffer to a BigNumber
                    const reversedRandomxhashBN = web3utils.toBN('0x' + reversedRandomxhash.toString('hex'));

                    const isClaimedTarget = reversedRandomxhashBN.lte(targetBN);


                    if (!isClaimedTarget) {
                    console.log("Calculated hash does not meet claimed target");
                    validJSONSubmit = false;
                    }


                      if(
                        this.difficulty == null  ||
                        nonce == null  ||
                        this.fullWorkerName == null  ||
                        this.challengeNumber == null
                      ) {
                        validJSONSubmit = false;
                      }

                      var ethBlock = await tokenDataHelper.getEthBlockNumber(this.mongoInterface);
                      

                      var shareData = {block: ethBlock,
                        nonce: nonce,
                        minerEthAddress: this.fullWorkerName,
                        challengeNumber: this.challengeNumber,
                        randomxhash: randomxHelper.convertAdd0x(hashresultBuffer.toString('hex')),
                        randomx_blob: this.randomxBlob,
                        randomx_seedhash: this.randomxSeedhash,
                        claimedtarget: this.target,
                        extraNonce: randomxHelper.convertAdd0x(this.extraNonce),
                        digest: randomxHelper.convertAdd0x(hashresultBuffer.toString('hex')),
                        difficulty: this.difficulty,
                        customVardiff: false,
                        minerport: 8888,
                        entryport: this.entryport
                      };
                      
                      if(validJSONSubmit){
                        var response = await this.mongoInterface.insertOne('queued_shares_list', shareData );
                        this.sendInteraction(new PositiveAnswer(interaction.id));            
                        
                      }else{
                        console.error('Invalid share JSON:');
                        this.sendInteraction(new ErrorAnswer(interaction.id, errors.INVALID_SHARE));
                      }

                      }  catch (error) {
                            console.error('Error submiting share:', error);
                            this.sendInteraction(new ErrorAnswer(interaction.id, errors.UNKNOWN));
                      }

                    }

                    else {
                        // Handle unknown methods
                        this.sendInteraction(new ErrorAnswer(interaction.id, errors.INVALID_METHOD_NAME));
                    }
                            
                    
    }



    async reloadWorkerJob(){
        this.challengeNumber = await TokenDataHelper.getChallengeNumber(this.mongoInterface);
        this.randomxBlob = await TokenDataHelper.getRandomxBlob(this.mongoInterface);
        this.randomxSeedhash = await TokenDataHelper.getRandomxSeedhash(this.mongoInterface);
        this.epochCount = await TokenDataHelper.getEpochCount(this.mongoInterface);
        this.randomxBlobWithReservedHash = randomxHelper.setReservedHashOnBlob(this.randomxBlob, this.poolAddress, this.challengeNumber, randomxHelper.convertAdd0x(this.extraNonce));
    }

    async setMinerSpecificTarget() {

        let minerData = await PeerHelper.getMinerData(this.fullWorkerName.toString().toLowerCase(), this.mongoInterface);

        if (minerData && minerData.avgHashrate && minerData.avgHashrate > 0) {

            const calculatedDifficulty = new BigNumber(minerData.avgHashrate).multipliedBy(this.newShareExpectedTime);


            const maxTarget = new BigNumber(2).pow(256).minus(1);
            const calculatedTargetValue = maxTarget.dividedBy(calculatedDifficulty);

            // Set minimum difficulty based on entry port
            let minimumDifficulty;
            if (this.entryport == 3333) {
               minimumDifficulty = 400015;
            } else if (this.entryport == 5555) {
               minimumDifficulty = 500001;
            } else if (this.entryport == 7777) {
               minimumDifficulty = 1000001;
            } else if (this.entryport == 9999) {
                minimumDifficulty = 2000001;
            }
             else {
               minimumDifficulty = this.poolConfig.minimumTarget;
            }

            //const minimumTarget = new BigNumber(this.poolConfig.minimumTarget.toString());
            const minimumTarget = maxTarget.dividedBy(new BigNumber(minimumDifficulty));
        
            // ensure that the more difficult target (lower value) is selected:
            const finalTargetValue = BigNumber.min(calculatedTargetValue, minimumTarget);
        
            this.target = '0x' + finalTargetValue.integerValue().toString(16).padStart(64, '0');
            // Calculate the difficulty based on the finalTargetValue
            this.difficulty = this.safeBigNumberToNumber(maxTarget.dividedBy(finalTargetValue));


        }
    }

    startRetargetTimer() {
        /*if (!this.retargetTimer) {
          this.retargetTimer = setInterval(() => this.sendNewJob(), this.retargetInterval); // sendNewJob() will call etMinerSpecificTarget()
        }*/

        if (!this.retargetTimer) {
            setTimeout(() => {
              this.retargetTimer = setInterval(() => this.sendNewJob(), this.retargetInterval);
            }, this.retargetDelay);
          }
      }
    
    stopRetargetTimer() {
        if (this.retargetTimer) {
            clearInterval(this.retargetTimer);
            this.retargetTimer = null;
        }
    }

    //generates LoginId
    generateRandomId(length = 16) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = 'login-';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    safeBigNumberToNumber(bigNumber) {
        if (bigNumber.isGreaterThan(Number.MAX_SAFE_INTEGER)) {
            console.warn("Warning: Converting a BigNumber larger than MAX_SAFE_INTEGER. Precision may be lost.");
            return Number.MAX_SAFE_INTEGER;
        }
        return parseInt(bigNumber.toFixed(0));
    }


    // Parse and validate the interaction data
    _parseInteraction(data) {
        const interaction = JSON.parse(data);
        //interaction.method = interaction.method.replace('mining.', '');
        return interaction;
    }

    // Handle socket error event
    _handleError(err) {
        this.emit('error', err);
    }

    // Handle socket end event
    _handleEnd() {
        this.stopRetargetTimer();
        this.emit('end');
    }
}

export default Worker;
