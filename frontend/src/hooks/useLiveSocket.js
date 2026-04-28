/**
 * useLiveSocket — WebSocket hook for a single live room.
 *
 * Manages connection lifecycle, auto-reconnect with backoff, and exposes:
 *   - viewerCount / totalLikes
 *   - chat messages (capped buffer)
 *   - active poll + winner (when the poll ends)
 *   - hearts feed (transient)
 *   - send helpers: sendChat, sendLike, sendVote
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { buildLiveWsUrl } from '../services/liveService';

const MAX_CHAT = 80;
const MAX_HEARTS = 40;

export function useLiveSocket(roomId, { enabled = true } = {}) {
  const [status, setStatus] = useState('idle'); // idle | connecting | open | closed | error
  const [viewerCount, setViewerCount] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [chat, setChat] = useState([]);
  const [hearts, setHearts] = useState([]); // [{id, ts}] short-lived
  const [activePoll, setActivePoll] = useState(null);
  const [lastWinner, setLastWinner] = useState(null); // {poll, winner}
  const [me, setMe] = useState(null);
  const [liveEnded, setLiveEnded] = useState(false);

  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const attemptRef = useRef(0);
  const heartTimers = useRef([]);

  const cleanup = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (_) {}
      wsRef.current = null;
    }
    heartTimers.current.forEach((t) => clearTimeout(t));
    heartTimers.current = [];
  }, []);

  const connect = useCallback(() => {
    if (!roomId || !enabled) return;
    cleanup();
    setStatus('connecting');

    const url = buildLiveWsUrl(roomId);
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      console.error('[live-ws] failed to open:', err);
      setStatus('error');
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;
      setStatus('open');
    };

    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (_) {
        return;
      }
      switch (data.type) {
        case 'welcome':
          setMe(data.user || null);
          setViewerCount(data.viewer_count || 0);
          setTotalLikes(data.total_likes || 0);
          setActivePoll(data.active_poll || null);
          break;
        case 'user_joined':
        case 'user_left':
          if (typeof data.viewer_count === 'number') setViewerCount(data.viewer_count);
          break;
        case 'chat':
          setChat((prev) => {
            const next = [...prev, { id: data.id, user: data.user, text: data.text, ts: data.ts }];
            return next.length > MAX_CHAT ? next.slice(-MAX_CHAT) : next;
          });
          break;
        case 'like': {
          if (typeof data.total_likes === 'number') setTotalLikes(data.total_likes);
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          setHearts((prev) => {
            const next = [...prev, { id, ts: data.ts || Date.now() }];
            return next.length > MAX_HEARTS ? next.slice(-MAX_HEARTS) : next;
          });
          const t = setTimeout(() => {
            setHearts((prev) => prev.filter((h) => h.id !== id));
          }, 2200);
          heartTimers.current.push(t);
          break;
        }
        case 'poll_started':
          setLastWinner(null);
          setActivePoll(data.poll || null);
          break;
        case 'poll_update':
          setActivePoll(data.poll || null);
          break;
        case 'poll_ended':
          setLastWinner({ poll: data.poll, winner: data.winner });
          // Keep poll briefly visible? clear after 4s
          setActivePoll(null);
          setTimeout(() => {
            setLastWinner((w) => (w && w.poll && data.poll && w.poll.id === data.poll.id ? null : w));
          }, 4000);
          break;
        case 'live_ended':
          setLiveEnded(true);
          break;
        case 'challenge_proposed':
          // Surface as a system chat line so viewers see activity
          setChat((prev) => {
            const u = data.proposal?.user_display_name || data.proposal?.user_username || 'Alguien';
            const next = [
              ...prev,
              {
                id: `proposal-${data.proposal?.id || Date.now()}`,
                user: { display_name: 'Sistema', username: 'system' },
                text: `🚀 ${u} propuso: "${data.proposal?.text}" (${data.proposal?.donation_coins || 0}🪙)`,
                ts: Date.now(),
                system: true,
              },
            ];
            return next.length > MAX_CHAT ? next.slice(-MAX_CHAT) : next;
          });
          break;
        default:
          break;
      }
    };

    ws.onerror = () => {
      setStatus('error');
    };

    ws.onclose = () => {
      setStatus('closed');
      if (!liveEnded) scheduleReconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, enabled, liveEnded]);

  const scheduleReconnect = useCallback(() => {
    if (!enabled || liveEnded) return;
    const attempt = Math.min(attemptRef.current + 1, 6);
    attemptRef.current = attempt;
    const delay = Math.min(1000 * 2 ** attempt, 15_000);
    reconnectTimer.current = setTimeout(connect, delay);
  }, [connect, enabled, liveEnded]);

  // Send helpers
  const send = useCallback((payload) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(JSON.stringify(payload));
      return true;
    } catch (_) {
      return false;
    }
  }, []);

  const sendChat = useCallback((text) => send({ type: 'chat', text }), [send]);
  const sendLike = useCallback(() => send({ type: 'like' }), [send]);
  const sendVote = useCallback(
    (pollId, optionId) => send({ type: 'vote', poll_id: pollId, option_id: optionId }),
    [send]
  );

  // Lifecycle
  useEffect(() => {
    if (!enabled || !roomId) return undefined;
    setLiveEnded(false);
    connect();
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, enabled]);

  return {
    status,
    me,
    viewerCount,
    totalLikes,
    chat,
    hearts,
    activePoll,
    lastWinner,
    liveEnded,
    sendChat,
    sendLike,
    sendVote,
  };
}

export default useLiveSocket;
