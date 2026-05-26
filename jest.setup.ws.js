// Polyfill WebSocket for Node so @supabase/supabase-js can construct its realtime client in tests.
globalThis.WebSocket = require('ws');
