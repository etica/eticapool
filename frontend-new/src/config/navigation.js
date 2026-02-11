export function getNavDropdowns(poolName) {
  const name = (poolName || 'Etica Pool').toUpperCase();
  // If the name already ends with "POOL", strip it for the network menu title
  const baseName = name.endsWith(' POOL')
    ? name.slice(0, -5).trim()
    : name.endsWith('POOL') && name.length > 4
      ? name.slice(0, -4).trim()
      : name;

  return [
    {
      title: 'POOL',
      rows: [
        { title: 'Overview', url: '/' },
        { title: 'Miners', url: '/miners' },
        { title: 'Payments', url: '/payments' },
        { title: 'My Miner', url: '/miner/:address', requiresWallet: true },
        { title: 'Custom Settings', url: '/account', requiresWallet: true },
      ],
    },
    {
      title: `${baseName} POOLS NETWORK`,
      rows: [
        { title: 'Epochs', url: '/epochs' },
        { title: 'Active Pools', url: '/pools' },
        { title: 'Mint Addresses', url: '/mint-addresses' },
      ],
    },
    {
      title: 'ECOSYSTEM',
      rows: [
        { title: 'Etica Official Website', url: 'https://www.eticaprotocol.org', external: true },
        { title: 'How it works', url: 'https://www.eticaprotocol.org/eticadocs', external: true },
        { title: 'Block Explorer', url: 'https://www.eticascan.org', external: true },
        { title: 'Web App', url: 'https://www.etica.io', external: true },
        { title: 'Reddit', url: 'https://reddit.com/r/etica', external: true },
        { title: 'Eticanomics', url: 'https://www.eticanomics.net', external: true },
        { title: 'Etica Intel', url: 'https://eticaintel.org/', external: true },
        { title: 'Github', url: 'https://github.com/etica/etica', external: true },
      ],
    },
  ];
}
