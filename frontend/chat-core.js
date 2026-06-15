export function getWsUrl() {
  if (window.ENV_WS_URL) return window.ENV_WS_URL;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'ws://127.0.0.1:8000/ws/v1/chat/';
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws/v1/chat/`;
}

export function createSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export const SUGGESTIONS = [
  'Score my CV',
  'Find missing skills',
  'Improve summary',
  'Career advice',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export function validateFile(file) {
  if (!file) return 'No file selected.';
  if (file.size > MAX_FILE_SIZE) return 'File is too large. Maximum size is 10 MB.';
  if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.pdf') && !file.name.endsWith('.docx') && !file.name.endsWith('.txt')) {
    return 'Unsupported file type. Please upload a PDF, DOCX, or TXT file.';
  }
  return null;
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

const BOT_AVATAR_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>`;
const USER_AVATAR_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>`;

export function addMessage(container, content, isUser, { showTime = false } = {}) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `msg ${isUser ? 'user' : 'bot'}`;

  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'msg-avatar';
  avatarDiv.innerHTML = isUser ? USER_AVATAR_SVG : BOT_AVATAR_SVG;

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'msg-bubble';

  let timeHtml = '';
  if (showTime) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    timeHtml = `<span class="msg-time">${time}</span>`;
  }

  bubbleDiv.innerHTML = `<p></p>${timeHtml}`;
  bubbleDiv.querySelector('p').textContent = content;

  if (!isUser) {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.setAttribute('aria-label', 'Copy to clipboard');
    copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    copyBtn.onclick = () => {
      const textToCopy = bubbleDiv.querySelector('p').textContent;
      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => { copyBtn.innerHTML = originalHTML; }, 2000);
      });
    };
    bubbleDiv.appendChild(copyBtn);
  }

  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(bubbleDiv);
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
  return messageDiv;
}

export function showTypingIndicator(container, text = 'Thinking') {
  removeTypingIndicator(container);
  const typingIndicator = container.querySelector('.typing-indicator');

  if (typingIndicator) {
    const p = typingIndicator.querySelector('.typing-text');
    if (p) {
      const span = p.querySelector('span') || document.createElement('span');
      p.innerHTML = `${text}<span class="dots"><span></span><span></span><span></span></span>`;
    }
    container.scrollTop = container.scrollHeight;
    return typingIndicator;
  }

  const indicatorDiv = document.createElement('div');
  indicatorDiv.className = 'msg bot typing-indicator';
  indicatorDiv.innerHTML = `
    <div class="msg-avatar">${BOT_AVATAR_SVG}</div>
    <div class="msg-bubble"><p class="typing-text">${text}<span class="dots"><span></span><span></span><span></span></span></p></div>`;
  container.appendChild(indicatorDiv);
  container.scrollTop = container.scrollHeight;
  return indicatorDiv;
}

export function removeTypingIndicator(container) {
  const el = container.querySelector('.typing-indicator');
  if (el) el.remove();
}

export function updateTypingIndicator(container, text) {
  const existing = container.querySelector('.typing-indicator');
  if (existing) {
    const p = existing.querySelector('.typing-text');
    if (p) p.innerHTML = `${text}<span class="dots"><span></span><span></span><span></span></span>`;
    container.scrollTop = container.scrollHeight;
    return existing;
  }
  return showTypingIndicator(container, text);
}

export class ChatClient {
  constructor(container, options = {}) {
    this.container = container;
    this.wsUrl = options.wsUrl || getWsUrl();
    this.sessionId = options.sessionId || createSessionId();
    this.showTimestamps = options.showTimestamps || false;

    this.socket = null;
    this.streamBubble = null;
    this.streamText = '';
    this.streamActive = false;
    this.pendingMessage = null;
    this.reconnectTimer = null;
    this.intentionalClose = false;

    this.onStreamStart = options.onStreamStart || (() => {});
    this.onStreamToken = options.onStreamToken || (() => {});
    this.onStreamEnd = options.onStreamEnd || (() => {});
    this.onError = options.onError || (() => {});
    this.onConnected = options.onConnected || (() => {});
    this.onDisconnected = options.onDisconnected || (() => {});
  }

  connect() {
    if (this.socket) {
      try {
        this.socket.onopen = null;
        this.socket.onmessage = null;
        this.socket.onclose = null;
        this.socket.onerror = null;
        if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
          this.intentionalClose = true;
          this.socket.close();
        }
      } catch (e) { /* ignore */ }
    }

    if (this.streamActive) this._finishStream();

    this.intentionalClose = false;
    this.socket = new WebSocket(this.wsUrl);

    this.socket.onopen = () => {
      removeTypingIndicator(this.container);
      this.onConnected();
      this._sendPending();
    };

    this.socket.onmessage = (event) => this._handleMessage(event);
    this.socket.onclose = (event) => {
      this.onDisconnected(event);
      if (this.streamActive) {
        this._finishStream();
        addMessage(this.container, 'Connection lost.', false);
      }
      if (!this.intentionalClose) {
        this._scheduleReconnect();
      }
    };

    this.socket.onerror = () => {};
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try { this.socket.close(); } catch (e) { /* ignore */ }
      this.socket = null;
    }
  }

  sendText(text) {
    if (this.streamActive) this._finishStream();
    addMessage(this.container, text, true, { showTime: this.showTimestamps });

    const payload = { type: 'text', data: text, session_id: this.sessionId };

    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      this.pendingMessage = { payload };
      return;
    }

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.pendingMessage = { payload };
      addMessage(this.container, 'Connecting to server...', false);
      this.connect();
      return;
    }

    this.streamActive = true;
    showTypingIndicator(this.container, 'Thinking...');
    this.socket.send(JSON.stringify(payload));
  }

  async sendFile(file) {
    const error = validateFile(file);
    if (error) {
      addMessage(this.container, error, false);
      return;
    }
    if (this.streamActive) this._finishStream();
    addMessage(this.container, `Uploading ${file.name}...`, true, { showTime: this.showTimestamps });

    let base64;
    try {
      base64 = await fileToBase64(file);
    } catch (e) {
      addMessage(this.container, 'Failed to read the file. Please try again.', false);
      return;
    }

    const payload = { type: 'binary', data: base64 };

    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      this.pendingMessage = { payload };
      return;
    }

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.pendingMessage = { payload };
      addMessage(this.container, 'Connecting to server...', false);
      this.connect();
      return;
    }

    showTypingIndicator(this.container, 'Uploading and starting analysis...');
    this.streamActive = true;
    this.socket.send(JSON.stringify(payload));
  }

  destroy() {
    this.disconnect();
    this.container = null;
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  _sendPending() {
    if (!this.pendingMessage || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const msg = this.pendingMessage;
    this.pendingMessage = null;
    showTypingIndicator(this.container, 'Thinking...');
    this.streamActive = true;
    this.socket.send(JSON.stringify(msg.payload));
  }

  _ensureStreamBubble() {
    if (this.streamBubble) return this.streamBubble;
    this.streamBubble = addMessage(this.container, '', false);
    return this.streamBubble;
  }

  _appendStreamToken(token) {
    removeTypingIndicator(this.container);
    this.streamActive = true;
    const bubble = this._ensureStreamBubble();
    const textNode = bubble && bubble.querySelector('.msg-bubble p');
    if (!textNode) return;
    this.streamText += token;
    textNode.textContent = this.streamText;
    this.container.scrollTop = this.container.scrollHeight;
  }

  _finishStream() {
    this.streamBubble = null;
    this.streamText = '';
    this.streamActive = false;
    removeTypingIndicator(this.container);
  }

  _handleMessage(event) {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch (error) {
      console.error('Invalid WebSocket payload:', event.data);
      return;
    }

    const eventType = payload.event || payload.type;
    const message = payload.data || payload.message || '';

    switch (eventType) {
      case 'start':
        this._ensureStreamBubble();
        this.onStreamStart();
        return;
      case 'metadata':
        return;
      case 'status':
        updateTypingIndicator(this.container, message || 'Processing...');
        return;
      case 'token':
      case 'stream':
        this._appendStreamToken(message);
        this.onStreamToken(message);
        return;
      case 'end':
      case 'result':
        if (message && message !== '[DONE]') {
          this._appendStreamToken(message);
        }
        this._finishStream();
        this.onStreamEnd(message);
        return;
      case 'error':
        this._finishStream();
        addMessage(this.container, message || 'Something went wrong.', false);
        this.onError(message);
        return;
      default:
        if (this.streamActive) {
          const fallback = message || (typeof payload === 'string' ? payload : JSON.stringify(payload));
          if (fallback) this._appendStreamToken(fallback);
        } else {
          this._finishStream();
          addMessage(this.container, message || JSON.stringify(payload, null, 2), false);
        }
    }
  }
}
