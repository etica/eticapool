
import web3utils from 'web3-utils';
import PeerHelper from './peer-helper.js';
import PoolStatsHelper from './pool-stats-helper.js';
import TransactionHelper from './transaction-helper.js';

export function registerApiV2Routes(app, poolConfig, mongoInterface, dataCache) {

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

      res.json({
        poolData,
        poolStatus,
        statsRecord,
        config: {
          stratumPorts: [3333, 5555, 7777, 9999],
          smartContractAddress: poolConfig.mintingConfig.publicAddress,
          poolFee: poolConfig.mintingConfig.poolTokenFee,
          minimumPayout: poolConfig.paymentsConfig.minBalanceForTransfer,
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
        TransactionHelper.findRecentTransactionsWithQuery({ txType: 'batched_payment' }, mongoInterface)
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

  // 10. GET /api/v2/pool/stats/24h
  app.get('/api/v2/pool/stats/24h', async (req, res) => {
    try {
      let records = dataCache.get('24hPoolStatsRecords');
      if (!records) {
        records = await PoolStatsHelper.get24hPoolStatsRecords(poolConfig, mongoInterface);
        dataCache.set('24hPoolStatsRecords', records, 60000);
      }
      res.json(records);
    } catch (err) {
      console.error('GET /api/v2/pool/stats/24h error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

}
