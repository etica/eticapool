
import web3utils from 'web3-utils';
import PeerHelper from './peer-helper.js';
import PoolStatsHelper from './pool-stats-helper.js';
import TransactionHelper from './transaction-helper.js';
import AuthHelper from './auth-helper.js';
import ChartDataHelper from './chart-data-helper.js';

export function registerApiV2Routes(app, poolConfig, mongoInterface, dataCache) {

  // Auth: get nonce
  app.post('/api/v2/auth/nonce', async (req, res) => {
    try {
      const { address } = req.body;
      if (!address || !web3utils.isAddress(address)) {
        return res.status(400).json({ error: 'Invalid Ethereum address' });
      }
      const result = await AuthHelper.createNonce(address, mongoInterface);
      res.json(result);
    } catch (err) {
      console.error('POST /api/v2/auth/nonce error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Auth: verify signature
  app.post('/api/v2/auth/verify', async (req, res) => {
    try {
      const { address, signature, nonce } = req.body;
      if (!address || !signature || !nonce) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const result = await AuthHelper.verifySignature(address, signature, nonce, mongoInterface);
      res.json(result);
    } catch (err) {
      if (err.message === 'Invalid signature' || err.message === 'Signature does not match address' || err.message === 'Invalid or expired nonce' || err.message === 'Nonce expired') {
        return res.status(401).json({ error: err.message });
      }
      console.error('POST /api/v2/auth/verify error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Account settings: read
  app.get('/api/v2/account/settings', AuthHelper.authMiddleware, async (req, res) => {
    try {
      // Try bare address first, then fall back to any worker-suffixed doc.
      // Settings are synced to all docs via updateMany on write, so any doc works.
      const addrLower = req.minerAddress.toLowerCase();
      let minerData = await mongoInterface.findOne('minerData', { minerEthAddress: addrLower });
      if (!minerData) {
        minerData = await mongoInterface.findOne('minerData', { minerEthAddress: { $regex: '^' + addrLower } });
      }
      res.json({
        address: req.minerAddress,
        customMiningDifficulty: (minerData && minerData.customMiningDifficulty) || null,
        customMinPayout: (minerData && minerData.customMinPayout) || null
      });
    } catch (err) {
      console.error('GET /api/v2/account/settings error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Account settings: update
  app.post('/api/v2/account/settings', AuthHelper.authMiddleware, async (req, res) => {
    try {
      const { customMiningDifficulty, customMinPayout } = req.body;
      const update = {};

      // Validate customMiningDifficulty if provided
      if (customMiningDifficulty !== undefined) {
        const PORT_3333_MIN = 400015;
        if (customMiningDifficulty !== null) {
          const diff = Number(customMiningDifficulty);
          if (!Number.isFinite(diff) || diff < PORT_3333_MIN) {
            return res.status(400).json({ error: 'Custom difficulty must be at least 400,015 (port 3333 minimum) or null to clear' });
          }
          update.customMiningDifficulty = diff;
        } else {
          update.customMiningDifficulty = null;
        }
      }

      // Validate customMinPayout if provided
      if (customMinPayout !== undefined) {
        if (customMinPayout !== null) {
          const payout = Number(customMinPayout);
          const floor = poolConfig.paymentsConfig.customMinPayoutFloor || 10000000000000000;
          const ceiling = poolConfig.paymentsConfig.customMinPayoutCeiling || 50000000000000000000;
          if (!Number.isFinite(payout) || payout < floor || payout > ceiling) {
            return res.status(400).json({ error: `Custom min payout must be between ${floor} and ${ceiling} wei, or null to clear` });
          }
          update.customMinPayout = payout;
        } else {
          update.customMinPayout = null;
        }
      }

      if (Object.keys(update).length === 0) {
        return res.status(400).json({ error: 'No valid settings provided' });
      }

      // Update all minerData docs for this address (bare + worker-suffixed).
      // minerData docs are keyed by fullWorkerName (e.g. "0xaddr.worker1"),
      // so a bare-address upsert would create an orphan doc.
      // Use updateMany with regex to hit bare + all workers, then upsert
      // the bare address doc as fallback (in case miner has no shares yet).
      const addrLower = req.minerAddress.toLowerCase();
      await mongoInterface.updateMany(
        'minerData',
        { minerEthAddress: { $regex: '^' + addrLower } },
        update
      );
      await mongoInterface.upsertOne(
        'minerData',
        { minerEthAddress: addrLower },
        update
      );

      res.json({ success: true, ...update });
    } catch (err) {
      console.error('POST /api/v2/account/settings error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 1. GET /api/v2/pool/overview
  app.get('/api/v2/pool/overview', async (req, res) => {
    try {
      let poolData = dataCache.get('poolData');
      if (!poolData) {
        poolData = await PoolStatsHelper.getPoolData(poolConfig, mongoInterface);
        dataCache.set('poolData', poolData, 30000);
      }

      let poolStatus = dataCache.get('poolStatus');
      if (!poolStatus) {
        poolStatus = await PoolStatsHelper.getPoolStatus(poolConfig, mongoInterface);
        dataCache.set('poolStatus', poolStatus, 8000);
      }

      let statsRecord = dataCache.get('lastPoolStatsRecord');
      if (!statsRecord) {
        statsRecord = await PoolStatsHelper.getLastPoolStatsRecord(poolConfig, mongoInterface);
        dataCache.set('lastPoolStatsRecord', statsRecord, 60000);
      }

      let recentPaymentTxs = dataCache.get('recentPaymentTxs');
      if (!recentPaymentTxs) {
        recentPaymentTxs = await TransactionHelper.findRecentTransactionsWithQuery({ txType: 'batched_payment', txHash: { $ne: null }, status: { $in: ['pending', 'success', 'reverted'] } }, mongoInterface);
        dataCache.set('recentPaymentTxs', recentPaymentTxs, 60000);
      }

      res.json({
        poolData,
        poolStatus,
        statsRecord,
        recentPaymentTxs,
        config: {
          stratumPorts: [3333, 5555, 7777, 9999],
          smartContractAddress: poolConfig.mintingConfig.publicAddress,
          poolFee: poolConfig.mintingConfig.poolTokenFee,
          minimumPayout: poolConfig.paymentsConfig.minBalanceForTransfer,
          customMinPayoutFloor: poolConfig.paymentsConfig.customMinPayoutFloor || 10000000000000000,
          customMinPayoutCeiling: poolConfig.paymentsConfig.customMinPayoutCeiling || 50000000000000000000,
          poolName: poolConfig.poolName,
          poolUrl: poolConfig.poolUrl
        }
      });
    } catch (err) {
      console.error('GET /api/v2/pool/overview error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 2. GET /api/v2/pool/miners
  app.get('/api/v2/pool/miners', async (req, res) => {
    try {
      let result = dataCache.get('activeMinerListDisplay');
      if (!result) {
        result = await PeerHelper.getMinerListForDisplay(mongoInterface);
        dataCache.set('activeMinerListDisplay', result, 30000);
      }
      res.json(result);
    } catch (err) {
      console.error('GET /api/v2/pool/miners error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 3. GET /api/v2/pool/miner/:address
  app.get('/api/v2/pool/miner/:address', async (req, res) => {
    try {
      const address = req.params.address;
      const addressBlockchain = address.toString().substr(0, 42);
      if (!web3utils.isAddress(addressBlockchain)) {
        return res.status(400).json({ error: 'Invalid Ethereum address' });
      }

      const [minerData, challengeDetails] = await Promise.all([
        PeerHelper.getMinerDataWithWorkers(address, mongoInterface),
        PeerHelper.getMinerChallengeDetails(address, 1, mongoInterface)
      ]);

      res.json({ minerData, challengeDetails });
    } catch (err) {
      console.error('GET /api/v2/pool/miner/:address error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 4. GET /api/v2/pool/miner/:address/shares
  // For bare address (main account): aggregates shares from all workers
  // For worker address (contains '.'): returns that worker's shares only
  app.get('/api/v2/pool/miner/:address/shares', async (req, res) => {
    try {
      const address = req.params.address.toLowerCase();
      const addressBlockchain = address.toString().substr(0, 42);
      if (!web3utils.isAddress(addressBlockchain)) {
        return res.status(400).json({ error: 'Invalid Ethereum address' });
      }

      const isBareAddress = address.length === 42;
      if (isBareAddress) {
        // Main account: aggregate shares from all workers (bare + worker addresses)
        const shares = await mongoInterface.findAllSortedWithLimit(
          'miner_pendingshares',
          { minerEthAddress: { $regex: '^' + addressBlockchain } },
          { time: -1 },
          100
        );
        res.json(shares || []);
      } else {
        const shares = await PeerHelper.getMinerPreShares(address, mongoInterface);
        res.json(shares);
      }
    } catch (err) {
      console.error('GET /api/v2/pool/miner/:address/shares error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 5. GET /api/v2/pool/miner/:address/payments
  // For bare address: aggregates payments from all workers
  app.get('/api/v2/pool/miner/:address/payments', async (req, res) => {
    try {
      const address = req.params.address.toLowerCase();
      const addressBlockchain = address.toString().substr(0, 42);
      if (!web3utils.isAddress(addressBlockchain)) {
        return res.status(400).json({ error: 'Invalid Ethereum address' });
      }

      const isBareAddress = address.length === 42;
      if (isBareAddress) {
        const payments = await mongoInterface.findAllSortedWithLimit(
          'balance_payments',
          { minerEthAddress: { $regex: '^' + addressBlockchain } },
          { block: -1 },
          100
        );
        res.json(payments || []);
      } else {
        const payments = await PeerHelper.getMinerBalancePayments(address, mongoInterface);
        res.json(payments);
      }
    } catch (err) {
      console.error('GET /api/v2/pool/miner/:address/payments error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 6. GET /api/v2/pool/miner/:address/rewards
  // For bare address: aggregates rewards from all workers
  app.get('/api/v2/pool/miner/:address/rewards', async (req, res) => {
    try {
      const address = req.params.address.toLowerCase();
      const addressBlockchain = address.toString().substr(0, 42);
      if (!web3utils.isAddress(addressBlockchain)) {
        return res.status(400).json({ error: 'Invalid Ethereum address' });
      }

      const isBareAddress = address.length === 42;
      if (isBareAddress) {
        const rewards = await mongoInterface.findAllSortedWithLimitonString(
          'ppnls_rewards',
          { minerEthAddress: { $regex: '^' + addressBlockchain } },
          { epochCount: -1 },
          20
        );
        res.json(rewards || []);
      } else {
        const rewards = await PeerHelper.getPpnlsRewards(address, 20, mongoInterface);
        res.json(rewards);
      }
    } catch (err) {
      console.error('GET /api/v2/pool/miner/:address/rewards error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 7. GET /api/v2/pool/payments
  app.get('/api/v2/pool/payments', async (req, res) => {
    try {
      let statsPayment = dataCache.get('statsPayment');
      if (!statsPayment) {
        statsPayment = await PoolStatsHelper.getStatsPayment(poolConfig, mongoInterface);
        dataCache.set('statsPayment', statsPayment, 60000);
      }

      const [poolMints, recentPaymentTxs] = await Promise.all([
        PeerHelper.getPoolMints(50, mongoInterface),
        TransactionHelper.findRecentTransactionsWithQuery({ txType: 'batched_payment', txHash: { $ne: null }, status: { $in: ['pending', 'success', 'reverted'] } }, mongoInterface)
      ]);

      res.json({ statsPayment, poolMints, recentPaymentTxs });
    } catch (err) {
      console.error('GET /api/v2/pool/payments error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 8. GET /api/v2/pool/blocks
  app.get('/api/v2/pool/blocks', async (req, res) => {
    try {
      const blocks = await PeerHelper.getMintList(50, mongoInterface);
      res.json(blocks);
    } catch (err) {
      console.error('GET /api/v2/pool/blocks error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 9. GET /api/v2/pool/network
  app.get('/api/v2/pool/network', async (req, res) => {
    try {
      const [poolList, mintAddresses] = await Promise.all([
        PeerHelper.getPoolList(poolConfig, mongoInterface),
        PeerHelper.getMintAddresses(mongoInterface)
      ]);
      res.json({ poolList, mintAddresses });
    } catch (err) {
      console.error('GET /api/v2/pool/network error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 10. GET /api/v2/pool/stats/24h — serves pre-computed linedata chart document
  app.get('/api/v2/pool/stats/24h', async (req, res) => {
    try {
      let chart = dataCache.get('chart_pool_hashrate_24h');
      if (!chart) {
        const chartHelper = ChartDataHelper.getInstance();
        chart = await chartHelper.getChart('pool_hashrate_24h', mongoInterface);
        if (!chart) {
          // First request or rebuild needed — build from poolStatsRecords
          await chartHelper.ensureChart('pool_hashrate_24h', mongoInterface);
          chart = await chartHelper.getChart('pool_hashrate_24h', mongoInterface);
        }
        if (chart) {
          dataCache.set('chart_pool_hashrate_24h', chart, 60000);
        }
      }
      res.json(chart || { timestamps: [], series: { hashrate: [], miners: [], workers: [] }, maxPoints: 144 });
    } catch (err) {
      console.error('GET /api/v2/pool/stats/24h error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

}
