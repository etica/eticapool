const KEY_PREFIX = 'eticapool:banned:';

export default class RedisBanList {

    constructor(redisClient) {
        this.client = redisClient;
    }

    async has(ip) {
        const result = await this.client.exists(KEY_PREFIX + ip);
        return result === 1;
    }

    async add(ip, durationMs) {
        await this.client.set(KEY_PREFIX + ip, '1', 'PX', durationMs);
    }

    async delete(ip) {
        await this.client.del(KEY_PREFIX + ip);
    }
}
