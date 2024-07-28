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
        this.randomxBlob = poolConfig.randomxBlob;
        this.randomxBlobWithReservedHash = this.setReservedHash(poolConfig.randomxBlob);
        console.log('---- this.randomxBlob ----------', this.randomxBlob);
        this.randomxSeedhash = poolConfig.randomxSeedhash;
        this.challengeNumber = poolConfig.challengeNumber;
        this.poolAddress = poolConfig.mintingConfig.publicAddress;
        const valueToConvert = poolConfig.minimumTarget;
        console.log('valueToConvert: ', valueToConvert);
        this.target = '0x' +web3utils.toBN(valueToConvert).toString('hex');
        // target = max(client->total_hashes / client->connected_duration * retarget_time, pool->start_diff)
        this.jobId = 1;

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

    sendNewJob(increaseJobId=true) {
        console.log('--------------- SENDING NEW JOB ---------------------')
        this.extraNonce = "0x"+randomBytes(4).toString('hex')+(PeerHelper.getTimeNowSeconds()).toString(16)
        console.log('- - - - - - - > this.target is: ', this.target);
        const compactTarget = randomxHelper.convertTargetToCompact(this.target);
        const randomxBlobRaw = randomxHelper.convertToRawWithout0x(this.randomxBlobWithReservedHash);
        const randomxSeedhashRaw = randomxHelper.convertToRawWithout0x(this.randomxSeedhash);
        console.log('- - - - - - - > compactTarget is: ', compactTarget)
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
        this.extraNonce = "0x"+randomBytes(4).toString('hex')+(PeerHelper.getTimeNowSeconds()).toString(16)
        console.log('- - - - - - - > this.target is: ', this.target);
        const compactTarget = randomxHelper.convertTargetToCompact(this.target);
        console.log('---- this.randomxBlob just before convertToRawWithout0x()----------', this.randomxBlob);
        console.log('---- this.randomxBlobWithReservedHash just before convertToRawWithout0x()----------', this.randomxBlobWithReservedHash);
        const randomxBlobRaw = randomxHelper.convertToRawWithout0x(this.randomxBlobWithReservedHash);
        console.log('---- randomxBlobRaw just after convertToRawWithout0x()----------', randomxBlobRaw);
        const randomxSeedhashRaw = randomxHelper.convertToRawWithout0x(this.randomxSeedhash);
        console.log('- - - - - - - > compactTarget is: ', compactTarget);
        const currentHeight = await TokenDataHelper.getEpochCount(this.mongoInterface);
        console.log('- - - - - - - > WORKER WRONG HEIGHT GOT : ', this.epochCount);
        console.log('- - - - - - - > WORKER WRONG HEIGHT INSTEAD OF : ', currentHeight);
        if(this.epochCount != currentHeight){
            await this.reloadWorkerJob();
        }
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
                this.randomxBlobWithReservedHash = this.setReservedHash(updatedContract.randomxBlob);
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
                console.info('login method received', interaction.params);
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
                        this.fullWorkerName = _minerEthAddress+'.'+workerName;
                        this.authorized = true;
                        this.loginId = this.generateRandomId();
                        //this.sendInteraction(new PositiveAnswer(interaction.id));
                        console.info('login stage IX');
                        this.sendFirstJob(); // sends new job to miner without increasing jobid
                    }

                break;
                    
              case 'submit':
                try{
                   // ------------  PoolSuspended   ------------  //
                      console.log('worker submitShare function reached');
                      var nonce = interaction.params.nonce;
                      var hashresult = interaction.params.result;
                      console.log('XMRig nonce is:', nonce);
                      console.log('XMRig result is:', hashresult);
                      console.log('XMRig params are:', interaction.params);
                      console.log('target is: ', this.target);

                      var validJSONSubmit = true;

                      console.log('this.difficulty: ', this.difficulty)
                      console.log('this.fullWorkerName: ', this.fullWorkerName)
                      console.log('this.challengeNumber: ', this.challengeNumber)

                      console.log('validJSONSubmit I is:', validJSONSubmit);


                      // Verify Randomx nonce:
                     const blockHeader = randomxHelper.convertToRawWithout0x(this.randomxBlob);
                     console.log('blockHeader:', blockHeader.toString('hex'));
                     
                     const nonceBuffer = Buffer.from(nonce, 'hex');
                     console.log('nonceBuffer:', nonceBuffer.toString('hex'));

                     const hashresultBuffer = Buffer.from(hashresult, 'hex');
                     console.log('hashresultBuffer:', hashresultBuffer.toString('hex'));
                     
                     /*const nonceBigNumber = new BigNumber(nonce);
                     console.log('nonceBigNumber:', nonceBigNumber.toString(10)); // Base 10
                     console.log('nonceBigNumber (hex):', nonceBigNumber.toString(16)); // Hexadecimal
                     const nonceBuffer = Buffer.from(nonceBigNumber.toString(16).padStart(16, '0'), 'hex');
                     console.log('nonceBuffer:', nonceBuffer.toString('hex')); */

                     const targetBigNumber = new BigNumber(this.target);
                     console.log('targetBigNumber:', targetBigNumber.toString(10)); // Base 10
                     console.log('targetBigNumber (hex):', targetBigNumber.toString(16)); // Hexadecimal 
                     const targetBuffer = Buffer.from(targetBigNumber.toString(16).padStart(64, '0'), 'hex');

                     /*const target = "ff7fffff00000000000000000000000000000000000000000000000000000000"; //new BigNumber(2).pow(248);
                     const targetBuffer = Buffer.from(target.toString(16).padStart(64, '0'), 'hex');
                     console.log('targetBuffer:', targetBuffer.toString('hex')); */

                     // Seed hash
                     const seedHash = randomxHelper.convertToRawWithout0x(this.randomxSeedhash);
                     console.log('seedHash:', seedHash.toString('hex'));

                    const isValid = randomx.VerifyEticaRandomXNonce(blockHeader, nonceBuffer, targetBuffer, seedHash, hashresultBuffer);
                    console.log(`Solution is ${isValid ? 'valid' : 'invalid'}`);

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

                      console.log('validJSONSubmit II is:', validJSONSubmit);

                      
                      
                      /*
                      var digestBigNumber = web3utils.toBN(this.challengeNumber);

                      console.log('digestBigNumber', digestBigNumber.toString())

                      var minimumTarget = PeerHelper.getTargetFromDifficulty( this.difficulty )

                      console.log('minimumTarget:', minimumTarget.toString())

                      if(digestBigNumber.gte(minimumTarget))
                      {
                        validJSONSubmit = false;
                        console.log('failed reason II');
                      } */

                      console.log('validJSONSubmit III is:', validJSONSubmit);

                      var ethBlock = await tokenDataHelper.getEthBlockNumber(this.mongoInterface);
                      

                      var shareData = {block: ethBlock,
                        nonce: nonce,
                        minerEthAddress: this.fullWorkerName,
                        challengeNumber: this.challengeNumber,
                        randomxhash: randomxHelper.convertAdd0x(hashresultBuffer.toString('hex')),
                        randomx_blob: this.randomxBlob,
                        randomx_seedhash: this.randomxSeedhash,
                        claimedtarget: this.target,
                        digest: randomxHelper.convertAdd0x(hashresultBuffer.toString('hex')),
                        difficulty: this.difficulty,
                        customVardiff: false,
                        minerport: 8081
                      };

                      console.log('- - - - - - - - - > validJSONSubmit is:', validJSONSubmit);
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
        console.log('worker data reloaded');
    }


    setReservedHash(blockHeader){

        console.log('-------------------  setting reservedHash -------------------');

        const reservedOffset = 55;
        const reservedSpaceSize = 8; // 8 bytes

        var extraNonceHash = web3utils.soliditySha3( this.poolAddress, this.extraNonce, this.challengeNumber );
            console.log('extraNonceHash: ', extraNonceHash);

            // Truncate extraNonceHash to 8 bytes
            const truncatedExtraNonceHash = Buffer.from(extraNonceHash.slice(2), 'hex').slice(0, reservedSpaceSize);
            console.log('truncatedExtraNonceHash:', truncatedExtraNonceHash.toString('hex'));

            console.log('blockHeader after inserting truncatedExtraNonceHash:', blockHeader.toString('hex'));

            // Insert truncatedExtraNonceHash into blockHeader at offset 55, blockHeader With ReservedHash set at offset 55
            var updatedblockHeader = Buffer.concat([
                blockHeader.slice(0, reservedOffset),
                truncatedExtraNonceHash,
                blockHeader.slice(reservedOffset + reservedSpaceSize)
            ]);

            console.log('blockHeader after inserting truncatedExtraNonceHash:', blockHeader.toString('hex'));

            return updatedblockHeader;

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
