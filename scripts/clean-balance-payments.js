#!/usr/bin/env node

/**
 * Clean balance_payments for a block range before re-inserting from transactions.
 *
 * READ-ONLY by default — shows what would be deleted. Use --confirm to execute.
 *
 * Usage:
 *   node scripts/clean-balance-payments.js [options]
 *
 * Options:
 *   --mongodb-uri    MongoDB URI (default: mongodb://localhost:27017)
 *   --db-name        Database name (default: tokenpool_rebuild)
 *   --from-block     Delete balance_payments from this block onward (required)
 *   --to-block       Delete up to this block (default: no upper limit)
 *   --confirm        Actually delete (without this flag, only shows count)
 */

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.POOL_DB_NAME || 'tokenpool_rebuild',
    fromBlock: null,
    toBlock: null,
    confirm: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--mongodb-uri': opts.mongodbUri = args[++i]; break;
      case '--db-name': opts.dbName = args[++i]; break;
      case '--from-block': opts.fromBlock = parseInt(args[++i]); break;
      case '--to-block': opts.toBlock = parseInt(args[++i]); break;
      case '--confirm': opts.confirm = true; break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  if (opts.fromBlock === null) {
    console.error('ERROR: --from-block is required');
    process.exit(1);
  }

  return opts;
}

async function main() {
  const opts = parseArgs();

  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   Clean balance_payments by block range           ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log(`  DB:           ${opts.dbName}`);
  console.log(`  From block:   ${opts.fromBlock}`);
  console.log(`  To block:     ${opts.toBlock || 'no limit (all above from-block)'}`);
  console.log(`  Mode:         ${opts.confirm ? 'DELETE' : 'DRY RUN (use --confirm to delete)'}`);

  const Mongodb = (await import('mongodb')).default;
  const mongoClient = await Mongodb.MongoClient.connect(opts.mongodbUri, {
    useUnifiedTopology: true
  });
  const dbo = mongoClient.db(opts.dbName);

  // Build query
  const query = { block: { $gte: opts.fromBlock } };
  if (opts.toBlock) {
    query.block.$lte = opts.toBlock;
  }

  // Count what would be deleted
  const count = await dbo.collection('balance_payments').find(query).count();
  console.log(`\n  balance_payments matching block range: ${count}`);

  // Show some stats
  const totalCount = await dbo.collection('balance_payments').find({}).count();
  console.log(`  Total balance_payments in DB:          ${totalCount}`);
  console.log(`  Would remain after delete:             ${totalCount - count}`);

  if (count === 0) {
    console.log('\n  Nothing to delete.');
    await mongoClient.close();
    return;
  }

  if (opts.confirm) {
    console.log(`\n  Deleting ${count} balance_payments...`);
    const result = await dbo.collection('balance_payments').deleteMany(query);
    console.log(`  Deleted: ${result.deletedCount}`);

    const remaining = await dbo.collection('balance_payments').find({}).count();
    console.log(`  Remaining in DB: ${remaining}`);
  } else {
    console.log(`\n  Run with --confirm to delete these ${count} records`);
  }

  await mongoClient.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
