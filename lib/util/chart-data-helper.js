
import GeneralEventEmitterHandler from "./GeneralEventEmitterHandler.js";

const MAX_POINTS = 144; // 24h at 10-min intervals
const STALE_THRESHOLD_S = 1200; // 20 minutes

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

    static getInstance() {
        if (!ChartDataHelper._instance) {
            ChartDataHelper._instance = new ChartDataHelper();
        }
        return ChartDataHelper._instance;
    }
}

ChartDataHelper._instance = null;

export default ChartDataHelper;
