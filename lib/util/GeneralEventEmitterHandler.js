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
        if (this.redisPubSub) {
            // When Redis Pub/Sub is available, listen ONLY on Redis.
            // The emit() method already publishes to Redis, so the callback
            // will fire once via Redis (even for local emits). This avoids
            // double-firing in monolith+Redis mode.
            await this.redisPubSub.on(event, callback);
        } else {
            // No Redis: listen on local EventEmitter only
            super.on(event, callback);
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
