import React from 'react';

/**
 * Wallet picker modal.
 * Props:
 *   wallets        - Array of { id, name }
 *   onSelect       - Called with the wallet object when user picks one
 *   onClose        - Called when user closes the modal
 *   connecting     - Boolean, true while wallet connection is in progress
 *   connectError   - String error message if last attempt failed
 *   connectSuccess - Boolean, true briefly after successful connection
 */
export default function WalletModal({ wallets, onSelect, onClose, connecting, connectError, connectSuccess }) {
  return (
    <div className="os-modal-overlay" onClick={connectSuccess ? undefined : onClose}>
      <div className="os-modal" onClick={(e) => e.stopPropagation()}>
        <div className="os-modal-header">
          <span className="os-modal-title">Connect Wallet</span>
          {!connectSuccess && (
            <button className="os-modal-close" onClick={onClose}>{'\u2715'}</button>
          )}
        </div>
        <div className="os-modal-body">
          {connectSuccess ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div className="os-success-check">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="22" stroke="#34d399" strokeWidth="3" fill="rgba(52,211,153,0.1)" />
                  <path d="M14 24.5L21 31.5L34 18.5" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-bold mt-3" style={{ color: '#34d399' }}>Connected!</p>
            </div>
          ) : (
            <>
              {connectError && (
                <p className="text-xs red" style={{ padding: '0.75rem 1rem', margin: 0, background: 'rgba(248,113,113,0.1)', borderRadius: '0.375rem', marginBottom: '0.5rem' }}>
                  {connectError}
                </p>
              )}
              {connecting ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div className="os-spinner" />
                  <p className="os-note mt-2">Waiting for wallet approval...</p>
                </div>
              ) : wallets.length === 0 ? (
                <p className="os-note" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  No wallet detected.<br />
                  Please install <a href="https://metamask.io" target="_blank" rel="noreferrer" className="emerald">MetaMask</a> or another Web3 wallet.
                </p>
              ) : (
                wallets.map((w) => (
                  <button
                    key={w.id}
                    className="os-wallet-option"
                    onClick={() => onSelect(w)}
                  >
                    <span className="os-wallet-option-name">{w.name}</span>
                    <span className="os-wallet-option-arrow">{'\u203A'}</span>
                  </button>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
