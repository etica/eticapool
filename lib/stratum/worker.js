// worker.js

import events from 'events';
import {SetExtranonce, SetDifficulty, FirstNotify, Notify, Answer, ErrorAnswer, errors} from './interactions.js'; // Import the interaction classes
import {randomBytes} from 'crypto';
import web3utils from "web3-utils";
import PeerHelper from "../util/peer-helper.js";

// Import other necessary modules and definitions (e.g., interactions)


class Worker extends events.EventEmitter {
    constructor(socket, poolConfig, poolStatsHelper, tokenDataHelper) {
        super();
        this.poolConfig = poolConfig
        this.extraNonce = randomBytes(4).toString('hex')+(PeerHelper.getTimeNowSeconds()).toString(16)
        this._socket = socket;
        this.chain = 'etica'
        this.authorized = false
        this.subscribe = false
        this.workerName = null
        this.difficulty = 256
        this.poolSuspended = false
        this.sentInteractions = 0;
        this.cachedBytes = [];
        this.sessionId = randomBytes(8).toString('hex')
        this.tokenDataHelper = tokenDataHelper
        this.poolStatsHelper = poolStatsHelper;

        console.log("this.tokenDataHelper", this.tokenDataHelper)
        console.log("this.poolStatsHelper", this.poolStatsHelper)

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

    _processInteraction(interaction, poolStatsHelper, tokenDataHelper) {
        // Here you can define logic to process different types of interactions
        // For example:
        console.log("interaction", interaction)
        switch (interaction.method) {
            case 'subscribe':
                console.info('subscribe method received', interaction.params);
                // Send a response to acknowledge the subscription
                this.subscribe = true
                this.sendInteraction(new FirstNotify(interaction.id, this.sessionId, this.extraNonce));
                this.emit('subscribe');
                break;
            case 'authorize':
                console.info('authorize method received', interaction.params);
                console.log("interaction.params", interaction.params)
                if (!this.subscribe) {
                    this.sendInteraction(new ErrorAnswer(interaction.id, errors.NOT_SUBSCRIBED));
                } else {
                    var minerEthAddress = interaction.params[0].toString().substr(0, 42);
                    var fullWorkerName = interaction.params[0].substring(42).trim();
                    var workerName = fullWorkerName;
                    var chain = ''; // Default empty chain

                    // Regular expression to match the pattern :CHAIN
                    var chainRegex = /:(\w+)/;

                    // Check if the worker name contains the chain pattern
                    var chainMatch = fullWorkerName.match(chainRegex);
                    if (chainMatch) {
                        chain = chainMatch[1]; // Extract chain from the matched pattern
                        workerName = fullWorkerName.replace(chainRegex, '').trim(); // Remove the chain part from the worker name
                    }

                    // Remove leading dot if present
                    if (workerName.startsWith('.')) {
                        workerName = workerName.substring(1);
                    }
                    this.workerName = workerName
                    if (chain) {
                        this.chain = chain.toLowerCase()
                    }
                    this.minerEthAddress = minerEthAddress
                    //this.difficulty = this.poolConfig[chain].difficulty
                    //this.poolSuspended = PoolStatsHelper.poolMintingIsSuspended(chain)

                    console.log("minerEthAddress", minerEthAddress);
                    console.log("workerName", workerName);
                    console.log("chain", this.chain); // Log the extracted chain
                    //console.log("poolConfig", this.poolConfig);

                    //this.difficulty = this.poolConfig[chain].difficulty
                    //console.log(PoolStatsHelper.poolStatus[this.chain].poolStatus)
                    this.poolSuspended = (poolStatsHelper && poolStatsHelper.poolStatus && poolStatsHelper.poolStatus && poolStatsHelper.poolStatus !== "active")
                    console.log("this.poolSuspended", this.poolSuspended)

                    if (!web3utils.isAddress(minerEthAddress.toString()) || this.poolSuspended) {
                        // Send a error response to acknowledge the subscription
                        this.sendInteraction(new ErrorAnswer(interaction.id, errors.UNKNOWN));
                    } else {
                        // Send a response to acknowledge the subscription
                        this.sendInteraction(new Answer(interaction.id));
                        //this.sendInteraction(new SetDifficulty(interaction.id));
                        //this.sendInteraction(new Answer(interaction.id));
                        this.sendInteraction(new Notify(interaction.id,
                            this.poolConfig.recentMiningContractData.challengeNumber,
                            PeerHelper.getPoolEthAddress(this.poolConfig),
                            this.poolConfig.recentMiningContractData.miningTarget,
                            this.poolConfig.recentMiningContractData.miningDifficulty,
                            this.extraNonce));
                            /*
                            this.sendInteraction(new Notify(interaction.id,
                            this.tokenDataHelper.recentMiningContractData[this.chain].challengeNumber,
                            PeerHelper.getPoolEthAddress(this.poolConfig[this.chain]),
                            this.tokenDataHelper.recentMiningContractData[this.chain].miningTarget,
                            this.tokenDataHelper.recentMiningContractData[this.chain].miningDifficulty,
                            this.extraNonce));
                            */

                    }
                }
                break;
            // Handle other methods...
            default:
                // Handle unknown methods
                this.sendInteraction(new ErrorAnswer(interaction.id, errors.UNKNOWN));
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
