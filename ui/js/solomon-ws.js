/* ═══════════════════════════════════════════════════════════════════════════
   SOLOMON — WebSocket Bridge (solomon-ws.js)

   Manages the persistent connection to brain.py (ws://localhost:8765).
   Exposes window.solomonWS as the single surface the rest of the frontend
   uses to interact with the AI backend.

   Responsibilities:
     ─ Open connection on load, reconnect automatically if it drops
     ─ Parse incoming JSON and dispatch to the right hook
     ─ Expose send() so callers never touch the raw socket
     ─ Track isConnected / isGenerating for UI state gating

   Loaded after warp.js in index.html. Has no Three.js dependency.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var WS_URL           = 'ws://localhost:8765';
  var RECONNECT_DELAY  = 2000;  // ms before retrying a dropped connection
  var reconnectTimeout = null;

  // ── Ring ID map ── index matches RING_DATA order in phase3.js ────────────
  var RING_ID_MAP = [
    'ars_almadel',   // 0 — warp ring, default personality
    'ars_notoria',   // 1
    'ars_paulina',   // 2
    'ars_goetia',    // 3
    'ars_theurgia',  // 4
    'ars_almiras',   // 5
    'ars_verum',     // 6
    'ars_ephesia',   // 7
    'ars_fulcanelli', // 8
    'ars_regalis',   // 9
  ];
  window.solomonRingIdMap = RING_ID_MAP;

  // ── Public API object ─────────────────────────────────────────────────────
  window.solomonWS = {
    socket:        null,
    isConnected:   false,
    activeRingId:  'ars_almadel',
    isGenerating:  false,

    // ── Core methods ──────────────────────────────────────────────────────

    connect: function () {
      // Clear any pending reconnect timer
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }

      var ws = new WebSocket(WS_URL);
      window.solomonWS.socket = ws;

      ws.onopen = function () {
        window.solomonWS.isConnected = true;
        console.log('[solomon-ws] Connected to brain.py at ' + WS_URL);
        window.solomonWS.onConnected();
      };

      ws.onmessage = function (evt) {
        var data;
        try {
          data = JSON.parse(evt.data);
        } catch (e) {
          console.warn('[solomon-ws] Non-JSON message received:', evt.data);
          return;
        }

        var event = data.event;

        if (event === 'token_stream') {
          window.solomonWS.onToken(data.token, data.done === true);

        } else if (event === 'status') {
          // Track generation state from status events
          if (data.state === 'thinking') {
            window.solomonWS.isGenerating = true;
          } else {
            window.solomonWS.isGenerating = false;
          }
          window.solomonWS.onStatus(data.state);

        } else if (event === 'ring_config') {
          window.solomonWS.onRingConfig(data.ring_id, data.config);

        } else if (event === 'models') {
          window.solomonWS.onModels(data.list);

        } else if (event === 'error') {
          console.error('[solomon-ws] Backend error:', data.message);
          window.solomonWS.onError(data.message);
        }
      };

      ws.onerror = function (err) {
        console.warn('[solomon-ws] WebSocket error:', err);
      };

      ws.onclose = function () {
        window.solomonWS.isConnected  = false;
        window.solomonWS.isGenerating = false;
        console.log('[solomon-ws] Connection closed. Reconnecting in ' + (RECONNECT_DELAY / 1000) + 's...');

        // Notify UI so it can show offline state
        window.solomonWS.onStatus('ollama_offline');

        // Attempt reconnect
        reconnectTimeout = setTimeout(function () {
          window.solomonWS.connect();
        }, RECONNECT_DELAY);
      };
    },

    // ── Send a structured event to brain.py ───────────────────────────────
    send: function (event, payload) {
      if (!window.solomonWS.socket || window.solomonWS.socket.readyState !== WebSocket.OPEN) {
        console.warn('[solomon-ws] Cannot send — socket not open. Event:', event);
        return;
      }
      var message = Object.assign({ event: event }, payload || {});
      window.solomonWS.socket.send(JSON.stringify(message));
    },

    // ── Hooks (overridden by warp.js after the invocation UI is created) ──

    onToken: function (token, done) {
      // Default no-op — overridden by warp.js
    },

    onStatus: function (state) {
      // Default no-op — overridden by warp.js
    },

    onConnected: function () {
      // Default no-op — overridden by warp.js
    },

    onRingConfig: function (ringId, config) {
      // Default no-op — warp.js can use this to update UI labels
    },

    onModels: function (modelList) {
      // Default no-op — available for a future settings UI
    },

    onError: function (message) {
      // Default: forward to status handler so the UI shows it
      window.solomonWS.onStatus('error');
    },
  };

  // ── Open connection immediately ───────────────────────────────────────────
  window.solomonWS.connect();

  console.log('[solomon-ws] WebSocket bridge initialized.');
})();
