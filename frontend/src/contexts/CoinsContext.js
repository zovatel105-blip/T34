/**
 * CoinsContext — virtual coin economy (mock).
 *
 * Loads the user's balance from the backend on mount, exposes:
 *   - balance, loading
 *   - refresh()      → fetch balance again
 *   - spend(amount)  → optimistic local decrement (server is source of truth on next refresh)
 *   - topup(amount)  → calls the mock topup endpoint and updates balance
 *
 * Real coin spending happens server-side (e.g. propose-challenge endpoint deducts coins atomically).
 * After such actions, callers should call `refresh()` (or pass the fresh balance to `setBalance`).
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import liveService from '../services/liveService';
import { useAuth } from './AuthContext';

const CoinsContext = createContext({
  balance: 0,
  loading: false,
  refresh: () => Promise.resolve(0),
  setBalance: () => {},
  topup: () => Promise.resolve(0),
});

export const CoinsProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setBalance(0);
      return 0;
    }
    setLoading(true);
    try {
      const res = await liveService.getCoinBalance();
      const b = typeof res.balance === 'number' ? res.balance : 0;
      setBalance(b);
      return b;
    } catch (err) {
      console.warn('[coins] refresh failed:', err.message);
      return 0;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const topup = useCallback(
    async (amount = 100) => {
      try {
        const res = await liveService.topupMock(amount);
        if (typeof res.balance === 'number') setBalance(res.balance);
        return res.balance;
      } catch (err) {
        console.warn('[coins] topup failed:', err.message);
        return balance;
      }
    },
    [balance]
  );

  useEffect(() => {
    if (isAuthenticated) refresh();
  }, [isAuthenticated, refresh]);

  return (
    <CoinsContext.Provider value={{ balance, loading, refresh, setBalance, topup }}>
      {children}
    </CoinsContext.Provider>
  );
};

export const useCoins = () => useContext(CoinsContext);

export default CoinsContext;
