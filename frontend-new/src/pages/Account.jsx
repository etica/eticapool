import React, { useState, useEffect, useRef } from 'react';
import DataCard from '../components/DataCard';
import DataRow from '../components/DataRow';
import WalletModal from '../components/WalletModal';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from '../hooks/useAuth';
import { useAccountSettings } from '../hooks/useAccountSettings';
import { truncateAddress, formatNumber } from '../lib/formatters';
import { PORT_META, PORT_COLORS } from '../config/constants';

const PORT_MINIMUMS = Object.entries(PORT_META).map(([port, meta]) => ({
  port: Number(port),
  difficulty: meta.difficulty,
  label: meta.label,
  color: PORT_COLORS[port] || '#6b7280',
}));

/**
 * Given a difficulty value, find the recommended port to mine on.
 * Returns the highest port whose minimum difficulty is <= the value.
 */
function getRecommendedPort(difficulty) {
  if (!difficulty || difficulty <= 0) return null;
  let best = null;
  for (const pm of PORT_MINIMUMS) {
    if (difficulty >= pm.difficulty) {
      best = pm;
    }
  }
  return best;
}

function ConnectPrompt({ onConnect, connectError }) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: '50vh' }}>
      <DataCard accent="linear-gradient(90deg, #34d399, #06b6d4)">
        <div className="text-center" style={{ padding: '2rem 1.5rem' }}>
          <p className="text-sm font-bold text-white uppercase tracking-wider mb-2">
            Account Settings
          </p>
          <p className="text-xs faded mb-6">
            Connect your wallet to manage account settings
          </p>
          <button
            onClick={onConnect}
            className="os-wallet-btn"
          >
            Connect Wallet
          </button>
          {connectError && (
            <p className="text-xs red mt-3">{connectError}</p>
          )}
        </div>
      </DataCard>
    </div>
  );
}

function AuthenticatingState() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: '50vh' }}>
      <DataCard accent="linear-gradient(90deg, #34d399, #06b6d4)">
        <div className="text-center" style={{ padding: '2rem 1.5rem' }}>
          <p className="text-sm font-bold text-white uppercase tracking-wider mb-2">
            Authenticating
          </p>
          <p className="text-xs" style={{ color: '#9ca3af' }}>
            Please sign the message in your wallet...
          </p>
        </div>
      </DataCard>
    </div>
  );
}

function DifficultyCard({ settings, isLoading, error, onSave, onClear }) {
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  const currentDiff = settings?.customMiningDifficulty;
  const hasCustom = currentDiff && currentDiff > 0;

  // Determine recommended port based on input or current custom diff
  const activeDiff = inputValue ? Number(inputValue) : (hasCustom ? currentDiff : null);
  const recommendedPort = getRecommendedPort(activeDiff);

  async function handleSave() {
    const val = Number(inputValue);
    if (!val || val < 400015) {
      setSaveMsg({ type: 'error', text: 'Minimum difficulty is 400,015 (port 3333 minimum)' });
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      await onSave(val);
      setSaveMsg({ type: 'ok', text: 'Difficulty updated!' });
      setInputValue('');
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    setSaveMsg(null);
    try {
      await onClear(null);
      setSaveMsg({ type: 'ok', text: 'Custom difficulty cleared' });
      setInputValue('');
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <DataCard
      accent="linear-gradient(90deg, #34d399, #06b6d4)"
      tag="SETTINGS"
      tagColor="emerald"
      title="Custom Mining Difficulty"
    >
      <p className="text-xs mb-4" style={{ color: '#9ca3af' }}>
        Set a custom difficulty for your mining worker. If not set, difficulty is
        automatically adjusted based on your hashrate.
      </p>

      <DataRow label="Current Value">
        <span className={hasCustom ? 'emerald' : ''} style={hasCustom ? {} : { color: '#9ca3af' }}>
          {hasCustom
            ? `${formatNumber(currentDiff)} (custom)`
            : 'Auto (based on hashrate)'}
        </span>
      </DataRow>

      {isLoading ? (
        <p className="text-xs mt-4" style={{ color: '#9ca3af' }}>Loading settings...</p>
      ) : error ? (
        <p className="text-xs red mt-4">{error}</p>
      ) : (
        <>
          <div className="mt-4">
            <input
              type="number"
              min="400015"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter difficulty (min: 400,015)"
              className="os-input w-full"
            />
          </div>

          {/* Port recommendation based on entered/active difficulty */}
          {recommendedPort && activeDiff >= 400015 && (
            <div className="os-port-recommendation mt-3" style={{ borderLeft: `3px solid ${recommendedPort.color}` }}>
              <span style={{ color: '#e5e7eb' }}>
                Mine on{' '}
                <span className="font-bold" style={{ color: recommendedPort.color }}>
                  port {recommendedPort.port}
                </span>
                {' '}<span style={{ color: '#9ca3af' }}>({recommendedPort.label})</span>
              </span>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              disabled={saving || !inputValue}
              className="os-btn os-btn-emerald"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            {hasCustom && (
              <button
                onClick={handleClear}
                disabled={saving}
                className="os-btn os-btn-dim"
              >
                Clear
              </button>
            )}
          </div>

          {saveMsg && (
            <p className={`text-xs mt-2 ${saveMsg.type === 'ok' ? 'emerald' : 'red'}`}>
              {saveMsg.text}
            </p>
          )}

          <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(55,65,81,0.3)' }}>
            <p className="os-label mb-2">Port Minimum Difficulties</p>
            {PORT_MINIMUMS.map((pm) => (
              <DataRow key={pm.port} label={<span style={{ color: pm.color, fontWeight: 600 }}>Port {pm.port}</span>}>
                <span style={{ color: '#d1d5db' }}>
                  {formatNumber(pm.difficulty)}
                  <span style={{ color: '#9ca3af' }}> - {pm.label}</span>
                </span>
              </DataRow>
            ))}
            <p className="text-xs mt-3" style={{ color: '#6b7280', fontStyle: 'italic' }}>
              If your custom difficulty is below the port minimum, the port minimum will be used instead.
            </p>
          </div>
        </>
      )}
    </DataCard>
  );
}

function PayoutCard() {
  return (
    <DataCard
      accent="linear-gradient(90deg, #374151, #4b5563)"
      tag="COMING SOON"
      tagColor="gray"
      title="Minimum Payout"
    >
      <div style={{ opacity: 0.5 }}>
        <p className="text-xs mb-4" style={{ color: '#9ca3af' }}>
          Configure the minimum payout threshold for your mining rewards.
        </p>
        <DataRow label="Current Value">
          <span style={{ color: '#9ca3af' }}>
            <span style={{ marginRight: '0.5rem' }}>&#128274;</span>
            1.5 ETI (default)
          </span>
        </DataRow>
        <div className="mt-4">
          <input
            type="number"
            disabled
            placeholder="Custom minimum payout"
            className="os-input w-full"
            style={{ opacity: 0.4, cursor: 'not-allowed' }}
          />
        </div>
      </div>
    </DataCard>
  );
}

export default function Account() {
  const { address, isConnected, connect, disconnect, showModal, wallets, selectWallet, closeModal, connecting, connectError: walletError, connectSuccess } = useWallet();
  const { token, isAuthenticated, login, logout } = useAuth(address);
  const { settings, isLoading, error, updateDifficulty, refetch } = useAccountSettings(token);

  const [connectError, setConnectError] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authenticating, setAuthenticating] = useState(false);
  const loginAttemptedRef = useRef(false);

  async function handleConnect() {
    setConnectError(null);
    try {
      await connect();
    } catch (err) {
      setConnectError(err.message);
    }
  }

  // Reset login attempt when address changes (new wallet connected)
  useEffect(() => {
    loginAttemptedRef.current = false;
  }, [address]);

  // Auto-trigger login ONCE when wallet connects but not yet authenticated
  useEffect(() => {
    if (isConnected && !isAuthenticated && !authenticating && !loginAttemptedRef.current) {
      loginAttemptedRef.current = true;
      setAuthenticating(true);
      setAuthError(null);
      login()
        .then(() => setAuthError(null))
        .catch((err) => setAuthError(err.message))
        .finally(() => setAuthenticating(false));
    }
  }, [isConnected, isAuthenticated, login, authenticating]);

  function handleDisconnect() {
    logout();
    disconnect();
    setAuthError(null);
  }

  if (!isConnected) {
    return (
      <>
        <ConnectPrompt onConnect={handleConnect} connectError={connectError || walletError} />
        {showModal && (
          <WalletModal wallets={wallets} onSelect={selectWallet} onClose={closeModal} connecting={connecting} connectError={walletError} connectSuccess={connectSuccess} />
        )}
      </>
    );
  }

  if (!isAuthenticated && authenticating) {
    return <AuthenticatingState />;
  }

  return (
    <div>
      <div className="os-heading">
        <h1 className="os-heading-title">Account Settings</h1>
        <p className="os-heading-sub">
          Connected as{' '}
          <span className="emerald">{truncateAddress(address, 8)}</span>
        </p>
      </div>

      {authError && (
        <DataCard accent="linear-gradient(90deg, #f87171, #f97316)">
          <div className="flex items-center justify-between">
            <p className="text-xs red">
              Authentication failed: {authError}
            </p>
            <button
              onClick={() => {
                loginAttemptedRef.current = true;
                setAuthenticating(true);
                setAuthError(null);
                login()
                  .then(() => setAuthError(null))
                  .catch((err) => setAuthError(err.message))
                  .finally(() => setAuthenticating(false));
              }}
              className="os-btn os-btn-dim ml-3"
            >
              Retry
            </button>
          </div>
        </DataCard>
      )}

      <div className="space-y-6">
        <DifficultyCard
          settings={settings}
          isLoading={isLoading}
          error={error}
          onSave={updateDifficulty}
          onClear={updateDifficulty}
        />
        <PayoutCard />
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={handleDisconnect}
          className="os-btn os-btn-dim"
        >
          Disconnect Wallet
        </button>
      </div>
    </div>
  );
}
