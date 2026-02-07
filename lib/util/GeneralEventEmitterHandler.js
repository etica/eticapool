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

    onCrossProcess(event, callback) {
        // Listen for local events
        super.on(event, callback);
        // Also listen for cross-process events via Redis
        if (this.redisPubSub) {
            this.redisPubSub.on(event, callback);
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
