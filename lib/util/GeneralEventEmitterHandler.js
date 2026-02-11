import {EventEmitter} from "events";

export default class GeneralEventEmitterHandler extends EventEmitter {

    constructor() {
        super();
        this.redisPubSub = null;
    }

    setRedisPubSub(pubsub) {
        this.redisPubSub = pubsub;
    }

    emit(event, ...args) {
        // Emit locally first
        super.emit(event, ...args);
        // Also publish to Redis for cross-process communication
        if (this.redisPubSub && args.length > 0) {
            this.redisPubSub.emit(event, args[0]).catch(err => {
                console.error('Redis Pub/Sub emit error:', err);
            });
        }
    }

    async onCrossProcess(event, callback) {
        // Always listen locally so same-process emits are never missed
        super.on(event, callback);
        // Also subscribe via Redis for cross-process emits (scaled deployment)
        if (this.redisPubSub) {
            await this.redisPubSub.on(event, callback);
        }
    }

    static getInstance() {
        if (!GeneralEventEmitterHandler.instance) {
            GeneralEventEmitterHandler.instance = new GeneralEventEmitterHandler();
        }
        return GeneralEventEmitterHandler.instance;
    }
}

GeneralEventEmitterHandler.instance = null;
