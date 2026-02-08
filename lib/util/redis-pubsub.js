import Redis from 'ioredis';

const CHANNEL_PREFIX = 'eticapool:';

class RedisPubSub {

    constructor() {
        this.publisher = null;
        this.subscriber = null;
        this.listeners = new Map(); // event -> Set of callbacks
        this.connected = false;
    }

    async init(redisUrl) {
        const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

        const opts = {
            retryStrategy(times) {
                if (times > 3) return null;
                return Math.min(times * 200, 2000);
            },
            maxRetriesPerRequest: null,
            lazyConnect: true
        };

        this.publisher = new Redis(url, opts);
        this.subscriber = new Redis(url, opts);

        // Silence background error events (handled at init/operation level)
        this.publisher.on('error', () => {});
        this.subscriber.on('error', () => {});

        try {
            await Promise.all([
                this.publisher.connect(),
                this.subscriber.connect()
            ]);
        } catch (err) {
            // Clean up so clients stop retrying
            this.publisher.disconnect(false);
            this.subscriber.disconnect(false);
            this.publisher = null;
            this.subscriber = null;
            throw err;
        }

        this.subscriber.on('message', (channel, message) => {
            const event = channel.replace(CHANNEL_PREFIX, '');
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                let data;
                try {
                    data = JSON.parse(message);
                } catch {
                    data = message;
                }
                for (const cb of callbacks) {
                    try {
                        cb(data);
                    } catch (err) {
                        console.error(`RedisPubSub listener error for '${event}':`, err);
                    }
                }
            }
        });

        this.connected = true;
        console.log('Redis Pub/Sub initialized');
    }

    async emit(event, data) {
        if (!this.publisher) return;
        const channel = CHANNEL_PREFIX + event;
        const message = JSON.stringify(data);
        await this.publisher.publish(channel, message);
    }

    async on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
            if (this.subscriber) {
                await this.subscriber.subscribe(CHANNEL_PREFIX + event);
            }
        }
        this.listeners.get(event).add(callback);
    }

    async disconnect() {
        if (this.subscriber) await this.subscriber.quit();
        if (this.publisher) await this.publisher.quit();
        this.connected = false;
    }

    static getInstance() {
        if (!RedisPubSub._instance) {
            RedisPubSub._instance = new RedisPubSub();
        }
        return RedisPubSub._instance;
    }
}

RedisPubSub._instance = null;

export default RedisPubSub;
