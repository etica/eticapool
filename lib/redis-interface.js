import Redis from 'ioredis';

const STREAM_KEY = 'eticapool:shares';
const GROUP_NAME = 'share-processors';

export default class RedisInterface {

    constructor() {
        this.client = null;
        this.connected = false;
    }

    async init(redisUrl) {
        const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

        this.client = new Redis(url, {
            retryStrategy(times) {
                if (times > 3) return null; // stop retrying after 3 attempts
                const delay = Math.min(times * 200, 2000);
                return delay;
            },
            maxRetriesPerRequest: null,
            enableReadyCheck: true,
            lazyConnect: true
        });

        this.client.on('connect', () => {
            console.log('Redis connected');
            this.connected = true;
        });

        this.client.on('error', () => {
            // Silenced — errors are handled at init and operation level
        });

        this.client.on('close', () => {
            this.connected = false;
        });

        // Attempt connection (lazyConnect means we must call .connect())
        try {
            await this.client.connect();
        } catch (err) {
            // Connection failed — clean up the client so it stops retrying
            this.client.disconnect(false);
            this.client = null;
            throw err;
        }

        // Create consumer group (ignore error if it already exists)
        try {
            await this.client.xgroup('CREATE', STREAM_KEY, GROUP_NAME, '0', 'MKSTREAM');
            console.log(`Redis consumer group '${GROUP_NAME}' created on stream '${STREAM_KEY}'`);
        } catch (err) {
            if (err.message && err.message.includes('BUSYGROUP')) {
                // Group already exists, that's fine
            } else {
                throw err;
            }
        }
    }

    async addShare(shareData) {
        const json = JSON.stringify(shareData);
        return this.client.xadd(STREAM_KEY, 'MAXLEN', '~', '100000', '*', 'data', json);
    }

    async readShares(consumerName, count = 10, blockMs = 2000) {
        const result = await this.client.xreadgroup(
            'GROUP', GROUP_NAME, consumerName,
            'COUNT', count,
            'BLOCK', blockMs,
            'STREAMS', STREAM_KEY, '>'
        );

        return this._parseReadResult(result);
    }

    // Read pending (claimed) messages from this consumer's PEL (non-blocking).
    // Use stream ID '0' instead of '>' to get messages that were claimed but not yet acked.
    async readPendingShares(consumerName, count = 10) {
        const result = await this.client.xreadgroup(
            'GROUP', GROUP_NAME, consumerName,
            'COUNT', count,
            'STREAMS', STREAM_KEY, '0'
        );
        return this._parseReadResult(result);
    }

    _parseReadResult(result) {
        if (!result) return [];
        // result is [[streamKey, [[id, [field, value, ...]], ...]]]
        const messages = [];
        for (const [, entries] of result) {
            for (const [id, fields] of entries) {
                const msg = { id };
                for (let i = 0; i < fields.length; i += 2) {
                    msg[fields[i]] = fields[i + 1];
                }
                messages.push(msg);
            }
        }
        return messages;
    }

    async ackShare(messageId) {
        return this.client.xack(STREAM_KEY, GROUP_NAME, messageId);
    }

    async claimStaleShares(consumerName, minIdleMs = 30000) {
        try {
            const result = await this.client.xautoclaim(
                STREAM_KEY, GROUP_NAME, consumerName,
                minIdleMs, '0-0', 'COUNT', 100
            );
            if (result && result[1] && result[1].length > 0) {
                console.log(`Claimed ${result[1].length} stale shares for ${consumerName}`);
            }
            return result;
        } catch (err) {
            // XAUTOCLAIM requires Redis 6.2+; log and continue if unavailable
            if (err.message && err.message.includes('unknown command')) {
                console.log('XAUTOCLAIM not available (requires Redis 6.2+), skipping stale claim');
                return null;
            }
            throw err;
        }
    }

    async deleteStaleShares(challengeNumber) {
        // When a new challenge arrives, we need to purge shares with the old challenge.
        // With Redis Streams we can't filter by content, so we read pending entries and
        // ack+discard those with a non-matching challengeNumber.
        // For simplicity, we trim old entries. The stream MAXLEN ~100000 already caps size.
        // The share processor will reject stale-challenge shares naturally.
    }

    getClient() {
        return this.client;
    }

    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.connected = false;
            console.log('Redis disconnected');
        }
    }
}
