
import GeneralEventEmitterHandler from "./GeneralEventEmitterHandler.js";

const MAX_POINTS = 144; // 24h at 10-min intervals
const STALE_THRESHOLD_S = 1200; // 20 minutes

const MINER_SHARES_MAX = 100;
const MINER_REWARDS_MAX = 20;
const MINER_STALE_S = 60; // 60 seconds before incremental refresh

class ChartDataHelper {

    constructor() {
        // singleton — no state beyond the class itself
    }

    /**
     * Full rebuild of a chart document from poolStatsRecords.
     * Queries the last `maxPoints` records, reverses to chronological order,
     * and upserts the result into chart_linedata.
     */
    async buildChart(name, mongoInterface) {
        const records = await mongoInterface.findAllSortedWithLimit(
            'poolStatsRecords', {}, { recordedat: -1 }, MAX_POINTS
        );

        if (!records || records.length === 0) {
            return null;
        }

        // records are newest-first — reverse to chronological
        records.reverse();

        const timestamps = [];
        const hashrate = [];
        const miners = [];
        const workers = [];

        for (const r of records) {
            timestamps.push(Number(r.recordedat) || 0);
            hashrate.push(Number(r.Hashrate) || 0);
            miners.push(Number(r.Numberminers) || 0);
            workers.push(Number(r.Numberworkers) || 0);
        }

        const now = Math.floor(Date.now() / 1000);
        const doc = {
            name,
            timestamps,
            series: { hashrate, miners, workers },
            maxPoints: MAX_POINTS,
            lastUpdate: timestamps[timestamps.length - 1] || now,
            updatedAt: new Date(),
        };

        await mongoInterface.upsertOne('chart_linedata', { name }, doc);
        return doc;
    }

    /**
     * Incremental append: push a new data point and trim to maxPoints.
     * Uses MongoDB $push with $each/$slice for atomic append+trim.
     */
    async updateChart(name, point, mongoInterface) {
        const update = {
            $push: {
                timestamps:          { $each: [point.timestamp], $slice: -MAX_POINTS },
                'series.hashrate':   { $each: [point.hashrate],  $slice: -MAX_POINTS },
                'series.miners':     { $each: [point.miners],    $slice: -MAX_POINTS },
                'series.workers':    { $each: [point.workers],   $slice: -MAX_POINTS },
            },
            $set: {
                lastUpdate: point.timestamp,
                updatedAt: new Date(),
            },
            $setOnInsert: {
                name,
                maxPoints: MAX_POINTS,
            },
        };

        await mongoInterface.upsertOneCustom('chart_linedata', { name }, update);
    }

    /**
     * Read the pre-computed chart document (1 findOne).
     */
    async getChart(name, mongoInterface) {
        const doc = await mongoInterface.findOne('chart_linedata', { name });
        if (doc && doc._id) {
            delete doc._id;
        }
        return doc || null;
    }

    /**
     * Ensure a chart document exists. Builds from poolStatsRecords if missing or stale.
     */
    async ensureChart(name, mongoInterface) {
        const existing = await this.getChart(name, mongoInterface);
        if (existing && existing.lastUpdate) {
            const age = Math.floor(Date.now() / 1000) - existing.lastUpdate;
            if (age < STALE_THRESHOLD_S) {
                return existing;
            }
        }
        // Missing or stale — full rebuild
        return await this.buildChart(name, mongoInterface);
    }

    // ---- Per-miner chart methods ----

    /**
     * Full build of a miner's shares chart from miner_pendingshares.
     * Queries the last MINER_SHARES_MAX shares, reverses to chronological,
     * and upserts into chart_linedata as "miner_shares:{address}".
     */
    async buildMinerSharesChart(address, mongoInterface) {
        const records = await mongoInterface.findAllSortedWithLimit(
            'miner_pendingshares',
            { minerEthAddress: { $regex: '^' + address } },
            { time: -1 },
            MINER_SHARES_MAX
        );

        if (!records || records.length === 0) {
            return null;
        }

        records.reverse();

        const timestamps = [];
        const difficulty = [];

        for (const r of records) {
            timestamps.push(Number(r.time) || 0);
            difficulty.push(Number(r.difficulty) || 0);
        }

        const now = Math.floor(Date.now() / 1000);
        const name = 'miner_shares:' + address;
        const doc = {
            name,
            timestamps,
            series: { difficulty },
            maxPoints: MINER_SHARES_MAX,
            lastUpdate: timestamps[timestamps.length - 1] || now,
            updatedAt: new Date(),
        };

        await mongoInterface.upsertOne('chart_linedata', { name }, doc);
        return doc;
    }

    /**
     * Full build of a miner's rewards chart from ppnls_rewards.
     */
    async buildMinerRewardsChart(address, mongoInterface) {
        const records = await mongoInterface.findAllSortedWithLimitonString(
            'ppnls_rewards',
            { minerEthAddress: { $regex: '^' + address } },
            { epochCount: -1 },
            MINER_REWARDS_MAX
        );

        if (!records || records.length === 0) {
            return null;
        }

        records.reverse();

        const timestamps = [];
        const earned = [];
        const poolPercent = [];

        for (const r of records) {
            const t = r.createdAt;
            timestamps.push(t ? (Number(t) || 0) : 0);

            let etiEarned = 0;
            try {
                const awarded = BigInt(r.tokensAwarded || 0);
                const bonus = BigInt(r.bonusAwarded || 0);
                etiEarned = Number(awarded + bonus) / 1e18;
            } catch {
                etiEarned = 0;
            }
            earned.push(etiEarned);

            const pct = r.poolshares > 0 ? (r.shares / r.poolshares) * 100 : 0;
            poolPercent.push(pct);
        }

        const now = Math.floor(Date.now() / 1000);
        const name = 'miner_rewards:' + address;
        const doc = {
            name,
            timestamps,
            series: { earned, poolPercent },
            maxPoints: MINER_REWARDS_MAX,
            lastUpdate: timestamps[timestamps.length - 1] || now,
            updatedAt: new Date(),
        };

        await mongoInterface.upsertOne('chart_linedata', { name }, doc);
        return doc;
    }

    /**
     * Lazy refresh of a miner shares chart:
     * - Not found → full build
     * - Fresh (< MINER_STALE_S) → return as-is
     * - Stale → incremental append of new shares since lastUpdate
     */
    async refreshMinerSharesChart(address, mongoInterface) {
        const name = 'miner_shares:' + address;
        const existing = await this.getChart(name, mongoInterface);

        if (!existing) {
            return await this.buildMinerSharesChart(address, mongoInterface);
        }

        const ageS = (Date.now() - new Date(existing.updatedAt).getTime()) / 1000;
        if (ageS < MINER_STALE_S) {
            return existing;
        }

        // Incremental: query only shares newer than lastUpdate
        const newShares = await mongoInterface.findAllSortedWithLimit(
            'miner_pendingshares',
            { minerEthAddress: { $regex: '^' + address }, time: { $gt: existing.lastUpdate } },
            { time: 1 },
            MINER_SHARES_MAX
        );

        if (!newShares || newShares.length === 0) {
            // No new shares — just touch updatedAt
            await mongoInterface.upsertOneCustom('chart_linedata', { name }, {
                $set: { updatedAt: new Date() },
            });
            existing.updatedAt = new Date();
            return existing;
        }

        // Append new points and trim
        const newTimestamps = newShares.map(s => Number(s.time) || 0);
        const newDifficulty = newShares.map(s => Number(s.difficulty) || 0);
        const lastTs = newTimestamps[newTimestamps.length - 1];

        await mongoInterface.upsertOneCustom('chart_linedata', { name }, {
            $push: {
                timestamps: { $each: newTimestamps, $slice: -MINER_SHARES_MAX },
                'series.difficulty': { $each: newDifficulty, $slice: -MINER_SHARES_MAX },
            },
            $set: {
                lastUpdate: lastTs,
                updatedAt: new Date(),
            },
        });

        // Return merged result
        const merged = {
            ...existing,
            timestamps: [...existing.timestamps, ...newTimestamps].slice(-MINER_SHARES_MAX),
            series: {
                difficulty: [...existing.series.difficulty, ...newDifficulty].slice(-MINER_SHARES_MAX),
            },
            lastUpdate: lastTs,
            updatedAt: new Date(),
        };
        return merged;
    }

    /**
     * Lazy refresh of a miner rewards chart.
     * Same pattern as shares but queries ppnls_rewards by createdAt.
     */
    async refreshMinerRewardsChart(address, mongoInterface) {
        const name = 'miner_rewards:' + address;
        const existing = await this.getChart(name, mongoInterface);

        if (!existing) {
            return await this.buildMinerRewardsChart(address, mongoInterface);
        }

        const ageS = (Date.now() - new Date(existing.updatedAt).getTime()) / 1000;
        if (ageS < MINER_STALE_S) {
            return existing;
        }

        // Incremental: query rewards newer than lastUpdate
        const newRewards = await mongoInterface.findAllSortedWithLimit(
            'ppnls_rewards',
            { minerEthAddress: { $regex: '^' + address }, createdAt: { $gt: existing.lastUpdate } },
            { createdAt: 1 },
            MINER_REWARDS_MAX
        );

        if (!newRewards || newRewards.length === 0) {
            await mongoInterface.upsertOneCustom('chart_linedata', { name }, {
                $set: { updatedAt: new Date() },
            });
            existing.updatedAt = new Date();
            return existing;
        }

        const newTimestamps = [];
        const newEarned = [];
        const newPoolPercent = [];

        for (const r of newRewards) {
            const t = r.createdAt;
            newTimestamps.push(t ? (Number(t) || 0) : 0);

            let etiEarned = 0;
            try {
                const awarded = BigInt(r.tokensAwarded || 0);
                const bonus = BigInt(r.bonusAwarded || 0);
                etiEarned = Number(awarded + bonus) / 1e18;
            } catch {
                etiEarned = 0;
            }
            newEarned.push(etiEarned);
            newPoolPercent.push(r.poolshares > 0 ? (r.shares / r.poolshares) * 100 : 0);
        }

        const lastTs = newTimestamps[newTimestamps.length - 1];

        await mongoInterface.upsertOneCustom('chart_linedata', { name }, {
            $push: {
                timestamps: { $each: newTimestamps, $slice: -MINER_REWARDS_MAX },
                'series.earned': { $each: newEarned, $slice: -MINER_REWARDS_MAX },
                'series.poolPercent': { $each: newPoolPercent, $slice: -MINER_REWARDS_MAX },
            },
            $set: {
                lastUpdate: lastTs,
                updatedAt: new Date(),
            },
        });

        const merged = {
            ...existing,
            timestamps: [...existing.timestamps, ...newTimestamps].slice(-MINER_REWARDS_MAX),
            series: {
                earned: [...existing.series.earned, ...newEarned].slice(-MINER_REWARDS_MAX),
                poolPercent: [...existing.series.poolPercent, ...newPoolPercent].slice(-MINER_REWARDS_MAX),
            },
            lastUpdate: lastTs,
            updatedAt: new Date(),
        };
        return merged;
    }

    static getInstance() {
        if (!ChartDataHelper._instance) {
            ChartDataHelper._instance = new ChartDataHelper();
        }
        return ChartDataHelper._instance;
    }
}

ChartDataHelper._instance = null;

export default ChartDataHelper;
