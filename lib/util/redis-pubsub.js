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
                return Math.min(times * 200, 5000);
            },
            maxRetriesPerRequest: null
        };

        this.publisher = new Redis(url, opts);
        this.subscriber = new Redis(url, opts);

        await Promise.all([
            new Promise((resolve, reject) => {
                this.publisher.once('ready', resolve);
                this.publisher.once('error', reject);
            }),
            new Promise((resolve, reject) => {
                this.subscriber.once('ready', resolve);
                this.subscriber.once('error', reject);
            })
        ]);

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
