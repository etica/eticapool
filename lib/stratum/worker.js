// worker.js

import events from 'events';
import {EmptyAnswer, AskNewJob, AskFirstJob, Answer, PositiveAnswer, ErrorAnswer, errors} from './interactions.js'; // Import the interaction classes
import {randomBytes} from 'crypto';
import web3utils from "web3-utils";
import PeerHelper from "../util/peer-helper.js";
import randomx from "randomx-etica-nodejs";
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
        console.log('valueToConvert: ', valueToConvert);
        this.target = '0x' +web3utils.toBN(valueToConvert).toString('hex');
        // target = max(client->total_hashes / client->connected_duration * retarget_time, pool->start_diff)
        this.jobId = 1;
        this.newShareExpectedTime = 30 * 10; // miners are expected to send new shares on average every 30 seconds
        this.lastShareSubmissionTime = 0;
        this.minShareSubmissionInterval = 5000; // 5 seconds in milliseconds

        // Set up event listeners for the socket
        this._socket.on('data', (data) => this._handleStream(data));
        this._socket.on('error', (err) => this._handleError(err));
        this._socket.on('end', () => this._handleEnd());
    }

    // Send a formatted interaction to the client
    sendInteraction(interaction) {
        const jsonInteraction = interaction.toJSON();
        console.info('login stage X');

        // Assign an ID to the interaction if not already present
       /* if (typeof jsonInteraction.id === 'undefined') {
            this.sentInteractions += 1;
            jsonInteraction.id = this.sentInteractions;
        } */

        let interactionCall = JSON.stringify(jsonInteraction);

        // Additional processing if required
        // Example: Replacing placeholders in the interaction call string
        console.info('jsonInteraction:', jsonInteraction);
        this._socket.write(interactionCall + '\n');
    }

    async sendNewJob(increaseJobId=true) {
        console.log('--------------- SENDING NEW JOB ---------------------');
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

        console.log('- - - - - - - > sending first job this.target before is: ', this.target);
        await this.setMinerSpecificTarget();
        console.log('- - - - - - - > sending first job new this.target is: ', this.target);
        const compactTarget = randomxHelper.convertTargetToCompact(this.target);

        const currentHeight = await TokenDataHelper.getEpochCount(this.mongoInterface);
        const currentrandomxBlob = await TokenDataHelper.getRandomxBlob(this.mongoInterface);
        console.log('- - - - - - - > WORKER WRONG HEIGHT GOT : ', this.epochCount);
        console.log('- - - - - - - > WORKER WRONG HEIGHT INSTEAD OF : ', currentHeight);
        console.log('---- this.randomxBlob just before reload ----------', this.randomxBlob);
        console.log('---- this.challengeNumber just before reload ----------', this.challengeNumber);
        if(this.epochCount != currentHeight || this.randomxBlob != currentrandomxBlob){
            await this.reloadWorkerJob();
            console.log('---- this.randomxBlob just after reload ----------', this.randomxBlob);
            console.log('---- this.challengeNumber just after reload ----------', this.challengeNumber);
        }

        console.log('---- this.randomxBlob just before convertToRawWithout0x()----------', this.randomxBlob);
        console.log('---- this.randomxBlobWithReservedHash just before convertToRawWithout0x()----------', this.randomxBlobWithReservedHash);
        const randomxBlobRaw = randomxHelper.convertToRawWithout0x(this.randomxBlobWithReservedHash);
        console.log('---- randomxBlobRaw just after convertToRawWithout0x()----------', randomxBlobRaw);
        const randomxSeedhashRaw = randomxHelper.convertToRawWithout0x(this.randomxSeedhash);
        console.log('- - - - - - - > compactTarget is: ', compactTarget);
        
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
        console.log('Worker is handling updated updatedContract: ', updatedContract);

        try {
        if (updatedContract){
            if (updatedContract && updatedContract.challengeNumber !== this.challengeNumber && this.authorized && this.subscribe) {
                this.challengeNumber = updatedContract.challengeNumber;
                this.epochCount = updatedContract.epochCount;
                this.randomxBlob = updatedContract.randomxBlob;
                this.randomxBlobWithReservedHash = randomxHelper.setReservedHashOnBlob(this.randomxBlob, this.poolAddress, this.challengeNumber, randomxHelper.convertAdd0x(this.extraNonce)); // set specific miner blob by updating reservedSpace
                this.randomxSeedhash = updatedContract.randomxSeedhash;
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
            console.error("_handleMessage error", error)
            this._socket.end('INVALID_INTERACTION');
        }
    }


    async _processInteraction(interaction, poolStatsHelper, tokenDataHelper) {
        // Here you can define logic to process different types of interactions

        switch (interaction.method) {
            case 'login':
                console.info('login method received: ', interaction);
                // Send a response to acknowledge the subscription
                this.subscribe = true
                //this.emit('subscribe');

                    const minerLogin = interaction.params.login;
                    const minerPass = interaction.params.pass;

                    console.info('login stage I');
                    var _minerEthAddress = minerLogin.toString().substr(0, 42);
                    var extractedWorkerName = minerLogin.substring(42).trim();
                    var workerName = extractedWorkerName;
                    var chain = ''; // Default empty chain
                    console.info('login stage II');
                    // Regular expression to match the pattern :CHAIN
                    var chainRegex = /:(\w+)/;
                    console.info('login stage III');
                    // Check if the worker name contains the chain pattern
                    var chainMatch = extractedWorkerName.match(chainRegex);
                    if (chainMatch) {
                        chain = chainMatch[1]; // Extract chain from the matched pattern
                        workerName = extractedWorkerName.replace(chainRegex, '').trim(); // Remove the chain part from the worker name
                    }
                    console.info('login stage IV');
                    // Remove leading dot if present
                    if (workerName.startsWith('.')) {
                        workerName = workerName.substring(1);
                    }
                    if (chain) {
                        this.chain = chain.toLowerCase()
                    }
                    console.info('login stage V');

                    //this.poolSuspended = (poolStatsHelper && poolStatsHelper.poolStatus && poolStatsHelper.poolStatus && poolStatsHelper.poolStatus !== "active")
                    //console.log("this.poolSuspended", this.poolSuspended)

                    if (!web3utils.isAddress(_minerEthAddress.toString())) {
                        // Send a error response to acknowledge the subscription
                        console.info('login stage VII');
                        this.sendInteraction(new ErrorAnswer(interaction.id, errors.INVALID_ADDRESS));
                    } else {
                        console.info('login stage VIII');
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
                        console.info('login stage IX');
                        this.sendFirstJob(); // sends new job to miner without increasing jobid
                    }

                break;
                    
              case 'submit':
                try{
                   // ------------  Check not too many shares within  minShareSubmissionInterval to protect server resources ------------  //
                    const currentTime = Date.now();
                    const timeSinceLastSubmission = currentTime - this.lastShareSubmissionTime;

                    console.log('worker new submitShare');
                    console.log('this.fullWorkerName: ', this.fullWorkerName);

                    if (timeSinceLastSubmission < this.minShareSubmissionInterval) {
                    console.log('Share submitted too quickly. Ignoring.');
                    this.sendInteraction(new ErrorAnswer(interaction.id, errors.TOOMANY_SHARES));
                    return;
                    }
                    // ------------  Check not too many shares within  minShareSubmissionInterval to protect server resources  ------------  //

                    // check right randomxBlob //
                    const currentrandomxBlob = await TokenDataHelper.getRandomxBlob(this.mongoInterface);
                    if(this.randomxBlob != currentrandomxBlob){
                        console.log('--- -- -- -- --- WRONG WORKER CURRENT RNADOMX BLOB, RELOADING WORKER --- -- -- -- -- ---');
                        console.log('minerBlob:', minerBlob.toString('hex'));
                        console.log('networkBlob:', minerBlob.toString('hex'));
                        await this.reloadWorkerJob();
                        this.sendInteraction(new ErrorAnswer(interaction.id, errors.TOOMANY_SHARES));
                        this.sendNewJob();
                        return;
                    }
                    // check right randomxBlob //

                      var nonce = interaction.params.nonce;
                      var hashresult = interaction.params.result;

                      var validJSONSubmit = true;


                      // Verify Randomx nonce:
                     const minerBlob = randomxHelper.convertToRawWithout0x(this.randomxBlobWithReservedHash);
                     console.log('minerBlob:', minerBlob.toString('hex'));
                     
                     const nonceBuffer = Buffer.from(nonce, 'hex');
                     const hashresultBuffer = Buffer.from(hashresult, 'hex');
                     const targetBigNumber = new BigNumber(this.target);
                     const targetBuffer = Buffer.from(targetBigNumber.toString(16).padStart(64, '0'), 'hex');
                     // Seed hash
                     const seedHash = randomxHelper.convertToRawWithout0x(this.randomxSeedhash);

                
                     const isValid = randomx.VerifyEticaRandomXNonce(minerBlob, nonceBuffer, targetBuffer, seedHash, hashresultBuffer);
                    console.log(`Solution is ${isValid ? 'valid' : 'invalid'}`);
                    this.lastShareSubmissionTime = currentTime;

                    if(!isValid){
                        validJSONSubmit = false;
                        console.log('invalid nonce');
                    }


                      if(
                        this.difficulty == null  ||
                        nonce == null  ||
                        this.fullWorkerName == null  ||
                        this.challengeNumber == null
                      ) {
                        validJSONSubmit = false;
                        console.log('failed reason I');
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
                        minerport: 8081
                      };

                      console.log('- - - - - - - - - > shareData is:', shareData);
                      
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

                        // Handle other methods...

                        default:
                            // Handle unknown methods
                            this.sendInteraction(new ErrorAnswer(interaction.id, errors.INVALID_METHOD_NAME));
                            break;
                    }
    }



    async reloadWorkerJob(){
        console.log('reloading worker data');
        this.challengeNumber = await TokenDataHelper.getChallengeNumber(this.mongoInterface);
        this.randomxBlob = await TokenDataHelper.getRandomxBlob(this.mongoInterface);
        this.randomxSeedhash = await TokenDataHelper.getRandomxSeedhash(this.mongoInterface);
        this.epochCount = await TokenDataHelper.getEpochCount(this.mongoInterface);
        this.randomxBlobWithReservedHash = randomxHelper.setReservedHashOnBlob(this.randomxBlob, this.poolAddress, this.challengeNumber, randomxHelper.convertAdd0x(this.extraNonce));
        console.log('worker data reloaded');
    }

    async setMinerSpecificTarget() {
        console.log('entering setMinerSpecificTarget with this.target:', this.target);
        let minerData = await PeerHelper.getMinerData(this.fullWorkerName.toString().toLowerCase(), this.mongoInterface);
        console.log('setMinerSpecificTarget minerData is:', minerData);
        if (minerData && minerData.avgHashrate && minerData.avgHashrate > 0) {

            console.log('avgHashrate > 0 passed!');
            console.log('avgHashrate:', minerData.avgHashrate);
            console.log('newShareExpectedTime:', this.newShareExpectedTime);

            const calculatedDifficulty = new BigNumber(minerData.avgHashrate).multipliedBy(this.newShareExpectedTime);
            console.log('calculatedDifficulty is:', calculatedDifficulty.toString());

            const maxTarget = new BigNumber(2).pow(256).minus(1);
            const calculatedTargetValue = maxTarget.dividedBy(calculatedDifficulty);
            console.log('calculatedTargetValue is:', calculatedTargetValue.toString());

            const minimumTarget = new BigNumber(this.poolConfig.minimumTarget.toString());
            console.log('minimumTarget is:', minimumTarget.toString());
        
            // ensure that the more difficult target (lower value) is selected:
            const finalTargetValue = BigNumber.min(calculatedTargetValue, minimumTarget);
            console.log('finalTargetValue is:', finalTargetValue.toString());

            console.log('Calculated difficulty:', calculatedDifficulty.toString());
            console.log('Calculated target:', calculatedTargetValue.toString());
            console.log('Minimum target:', minimumTarget.toString());
            console.log('Selected target:', finalTargetValue.toString());
        
            this.target = '0x' + finalTargetValue.integerValue().toString(16).padStart(64, '0');
            console.log('*-*-*-**-*- > this.target is now:', this.target);


        }
        console.log('setMinerSpecificTarget called end with this.target:', this.target);
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
        this.emit('end');
    }
}

export default Worker;
