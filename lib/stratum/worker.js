// worker.js

import events from 'events';
import {EmptyAnswer, AskNewJob, AskFirstJob, Answer, PositiveAnswer, ErrorAnswer, errors} from './interactions.js'; // Import the interaction classes
import {randomBytes} from 'crypto';
import web3utils from "web3-utils";
import PeerHelper from "../util/peer-helper.js";
import randomx from "randomx-etica-nodejs";
import BigNumber from "bignumber.js";

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
        this.challengeNumber = poolConfig.challengeNumber;
        this.poolAddress = poolConfig.mintingConfig.publicAddress;
        const valueToConvert = poolConfig.minimumTarget;
        console.log('valueToConvert: ', valueToConvert);
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
        console.info('login stage X');

        // Assign an ID to the interaction if not already present
        if (typeof jsonInteraction.id === 'undefined') {
            this.sentInteractions += 1;
            jsonInteraction.id = this.sentInteractions;
        }

        let interactionCall = JSON.stringify(jsonInteraction);

        // Additional processing if required
        // Example: Replacing placeholders in the interaction call string
        console.info('login stage XI');
        console.info('login stage jsonInteraction:', jsonInteraction);
        this._socket.write(interactionCall + '\n');
    }

    sendNewJob(increaseJobId=true) {
        this.extraNonce = "0x"+randomBytes(4).toString('hex')+(PeerHelper.getTimeNowSeconds()).toString(16)
        console.log('- - - - - - - > this.target is: ', this.target);
        const compactTarget = this.convertTargetToCompact(this.target);
        console.log('- - - - - - - > compactTarget is: ', compactTarget)
        if (increaseJobId) {
            this.jobId += 1
        }
        this.sendInteraction(new AskNewJob(this.challengeNumber,
            this.target,
            this.jobId
        ));
    }

    sendFirstJob() {
        this.extraNonce = "0x"+randomBytes(4).toString('hex')+(PeerHelper.getTimeNowSeconds()).toString(16)
        console.log('- - - - - - - > this.target is: ', this.target);
        this.testCompactTargetConversion();
        const compactTarget = this.convertTargetToCompact(this.target);
        console.log('- - - - - - - > compactTarget is: ', compactTarget)
        this.sendInteraction(new AskFirstJob(this.challengeNumber,
            compactTarget,
            this.jobId,
            this.loginId
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

                      console.log('this.difficulty == null is: ', this.difficulty == null);
                      console.log('this.challengeNumber == null: ', this.challengeNumber == null);
                      console.log('this.fullWorkerName == null is: ', this.fullWorkerName == null);
                      console.log('nonce == null is: ', nonce == null);


                      // Use VerifyEticaRandomXNonce

                     // Warning: Temporary use harcoded value for tests, 
                     //need to get data from this.challengeNumber
                     //const blockHeader = Buffer.from(this.challengeNumber.slice(2), 'hex');
                     const blockHeader = "101096a5a1b4061274d1d8e13640eff7416062d3366960171731b703b31244d20c252d090c9d97000000008f3f41a03692ea66f71676a3eae82c215be3347b447fd2545b0cfd2c7b850ad837";
                     console.log('blockHeader:', blockHeader.toString('hex'));
                     const nonceBigNumber = new BigNumber(nonce);
                     console.log('nonceBigNumber:', nonceBigNumber.toString(10)); // Base 10
                     console.log('nonceBigNumber (hex):', nonceBigNumber.toString(16)); // Hexadecimal

                     const nonceBuffer = Buffer.from(nonceBigNumber.toString(16).padStart(16, '0'), 'hex');
                     console.log('nonceBuffer:', nonceBuffer.toString('hex'));

                     // Warning: Temporary use harcoded value for tests,
                     /*const targetBigNumber = new BigNumber(this.target);
                     console.log('targetBigNumber:', targetBigNumber.toString(10)); // Base 10
                     console.log('targetBigNumber (hex):', targetBigNumber.toString(16)); // Hexadecimal 
                     const targetBuffer = Buffer.from(targetBigNumber.toString(16).padStart(64, '0'), 'hex'); */

                     const target = "ff7fffff00000000000000000000000000000000000000000000000000000000"; //new BigNumber(2).pow(248);
                     const targetBuffer = Buffer.from(target.toString(16).padStart(64, '0'), 'hex');
                     console.log('targetBuffer:', targetBuffer.toString('hex'));

                     // Warning: Temporary use harcoded value for tests,
                     // Seed hash
                     const seedHash = "25314901c96d26ff28484bddf315f0a3295f30f13590d056efd65fcb6d8da788";

                    const isValid = randomx.VerifyEticaRandomXNonce(blockHeader, nonceBuffer, targetBuffer, seedHash);
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

                      

                      //var computed_digest =  web3utils.soliditySha3( this.challengeNumber , this.poolAddress, nonce );
                      var computed_digest = web3utils.soliditySha3( this.challengeNumber , this.poolAddress, nonce ); // WARNING: need to implement get computed_diggest from randomx instead of web3utils.soliditySha3

                      //console.log('computed_digest', computed_digest)
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
                        digest: computed_digest,
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


               case 'submitoriginal':
                try{
                   // ------------  PoolSuspended   ------------  //
                      console.log('worker submitShare function reached');
                      var nonce = interaction.params.nonce;
                      var hashresult = interaction.params.result;
                      console.log('nonce is:', nonce);
                      console.log('target is: ', this.target);

                      var validJSONSubmit = true;

                      console.log('this.difficulty: ', this.difficulty)
                      console.log('this.fullWorkerName: ', this.fullWorkerName)
                      console.log('this.challengeNumber: ', this.challengeNumber)

                      console.log('validJSONSubmit I is:', validJSONSubmit);

                      console.log('this.difficulty == null is: ', this.difficulty == null);
                      console.log('this.challengeNumber == null: ', this.challengeNumber == null);
                      console.log('this.fullWorkerName == null is: ', this.fullWorkerName == null);
                      console.log('nonce == null is: ', nonce == null);


                      // Use VerifyEticaRandomXNonce
                     const blockHeader = Buffer.from(this.challengeNumber.slice(2), 'hex');
                     console.log('blockHeader:', blockHeader.toString('hex'));
                     const nonceBigNumber = new BigNumber(nonce);
                     console.log('nonceBigNumber:', nonceBigNumber.toString(10)); // Base 10
                     console.log('nonceBigNumber (hex):', nonceBigNumber.toString(16)); // Hexadecimal

                     const nonceBuffer = Buffer.from(nonceBigNumber.toString(16).padStart(16, '0'), 'hex');
                     console.log('nonceBuffer:', nonceBuffer.toString('hex'));

                     const targetBigNumber = new BigNumber(this.target);
                     console.log('targetBigNumber:', targetBigNumber.toString(10)); // Base 10
                     console.log('targetBigNumber (hex):', targetBigNumber.toString(16)); // Hexadecimal

                     const targetBuffer = Buffer.from(targetBigNumber.toString(16).padStart(64, '0'), 'hex');
                     console.log('targetBuffer:', targetBuffer.toString('hex'));

                    const isValid = randomx.VerifyEticaRandomXNonce(blockHeader, nonceBuffer, targetBuffer);
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

                      

                      var computed_digest =  web3utils.soliditySha3( this.challengeNumber , this.poolAddress, nonce );

                      console.log('computed_digest', computed_digest)

                      var digestBigNumber = web3utils.toBN(computed_digest);

                      console.log('digestBigNumber', digestBigNumber.toString())

                      var minimumTarget = PeerHelper.getTargetFromDifficulty( this.difficulty )

                      console.log('minimumTarget:', minimumTarget.toString())

                      if(digestBigNumber.gte(minimumTarget))
                      {
                        validJSONSubmit = false;
                        console.log('failed reason II');
                      }

                      console.log('validJSONSubmit III is:', validJSONSubmit);

                      var ethBlock = await tokenDataHelper.getEthBlockNumber(this.mongoInterface);

                      var shareData = {block: ethBlock,
                        nonce: nonce,
                        minerEthAddress: this.fullWorkerName,
                        challengeNumber: this.challengeNumber,
                        digest: computed_digest,
                        difficulty: this.difficulty,
                        customVardiff: false,
                        minerport: 8081
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

                        // Handle other methods...

                        default:
                            // Handle unknown methods
                            this.sendInteraction(new ErrorAnswer(interaction.id, errors.INVALID_METHOD_NAME));
                            break;
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

    /*
        convertTargetToCompact(target) {
            // Remove '0x' prefix if present
            target = target.startsWith('0x') ? target.slice(2) : target;
            
            // Convert target to BigNumber
            const targetBN = new web3utils.BN(target, 16);
            
            // Calculate difficulty: (2^256 - 1) / target
            const maxTarget = new web3utils.BN(2).pow(new web3utils.BN(256)).sub(new web3utils.BN(1));
            const difficulty = maxTarget.div(targetBN);
            
            // Calculate 32-bit representation: ((2^256 - 1) / difficulty) >> 224
            const compactTarget = maxTarget.div(difficulty).shrn(224);
            
            // Convert to hexadecimal and pad to 8 characters
            let compactHex = compactTarget.toString(16).padStart(8, '0');
            
            // Swap endianness
            compactHex = compactHex.match(/.{2}/g).reverse().join('');
            
            return compactHex;
        } */

            convertTargetToCompact(target) {
                // Remove '0x' prefix if present
                target = target.startsWith('0x') ? target.slice(2) : target;
                
                // Convert target to BigNumber
                const targetBN = new web3utils.BN(target, 16);
                
                // Find the most significant byte
                let msbyte = 32;
                for (let i = 0; i < 32; i++) {
                    if (targetBN.shrn(8 * (31 - i)).gtn(0)) {
                        msbyte = i;
                        break;
                    }
                }
                
                // Extract 3 most significant bytes
                let significand = targetBN.shrn(8 * (29 - msbyte)).maskn(24).toNumber();
                let exponent = msbyte + 1;
            
                // Adjust for special case when significand is 0xFFFFFF
                if (significand > 0x7fffff) {
                    significand >>= 8;
                    exponent++;
                }
                
                // Compose compact target
                const compactTarget = (exponent << 24) | significand;
                
                return compactTarget.toString(16).padStart(8, '0');
            }

       /* testCompactTargetConversion() {
            const difficulties = [1, 10, 100, 1000, 10000, 100000, 1000000];
            
            difficulties.forEach(difficulty => {
                // Calculate full target
                const maxTarget = new web3utils.BN(2).pow(new web3utils.BN(256)).sub(new web3utils.BN(1));
                const fullTarget = maxTarget.div(new web3utils.BN(difficulty));
                
                // Convert to compact target
                const compactTarget = this.convertTargetToCompact(fullTarget.toString(16));
                
                // Convert compact target back to difficulty for verification
                const compactTargetBN = new web3utils.BN(compactTarget, 16);
                const backCalculatedDifficulty = maxTarget.div(compactTargetBN.shln(224));
                
                console.log(`Difficulty: ${difficulty}`);
                console.log(`Full Target: 0x${fullTarget.toString(16)}`);
                console.log(`Compact Target: ${compactTarget}`);
                console.log(`Back-calculated Difficulty: ${backCalculatedDifficulty.toString()}`);
                console.log('---');
            });
        } */

            testCompactTargetConversion() {
                const difficulties = [1, 10, 100, 1000, 10000, 100000, 1000000];
                
                difficulties.forEach(difficulty => {
                    const maxTarget = new web3utils.BN(2).pow(new web3utils.BN(256)).sub(new web3utils.BN(1));
                    const fullTarget = maxTarget.div(new web3utils.BN(difficulty));
                    
                    const compactTarget = this.convertTargetToCompact(fullTarget.toString(16));
                    
                    console.log(`Difficulty: ${difficulty}`);
                    console.log(`Full Target: 0x${fullTarget.toString(16)}`);
                    console.log(`Compact Target: ${compactTarget}`);
                    
                    // Convert compact target back to full target for verification
                    const compactTargetBN = new web3utils.BN(compactTarget, 16);
                    const exponent = compactTargetBN.shrn(24).toNumber();
                    const significand = compactTargetBN.maskn(24).toNumber();
                    
                    let backCalculatedTarget;
                    if (exponent <= 3) {
                        backCalculatedTarget = new web3utils.BN(significand).shrn(8 * (3 - exponent));
                    } else {
                        backCalculatedTarget = new web3utils.BN(significand).shln(8 * (exponent - 3));
                    }
                    
                    const backCalculatedDifficulty = maxTarget.div(backCalculatedTarget);
                    
                    console.log(`Back-calculated Difficulty: ${backCalculatedDifficulty.toString()}`);
                    console.log('---');
                });
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
