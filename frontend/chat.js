import { ChatClient, SUGGESTIONS, validateFile, fileToBase64, addMessage } from './chat-core.js';

const chatInput         = document.getElementById('chatInput');
const chatSendBtn       = document.getElementById('chatSendBtn');
const chatMessages      = document.getElementById('chatMessages');
const chatAttachBtn     = document.getElementById('chatAttachBtn');
const chatFileInput     = document.getElementById('chatFileInput');
const chatSuggestions   = document.getElementById('chatSuggestions');
const chatContainer     = document.getElementById('chatContainer');
const dropOverlay       = document.getElementById('dropOverlay');
const scrollBottomBtn   = document.getElementById('scrollBottomBtn');
const statusDot         = document.getElementById('statusDot');
const welcomeScreen     = document.getElementById('welcomeScreen');
const welcomeInput      = document.getElementById('welcomeInput');
const welcomeSendBtn    = document.getElementById('welcomeSendBtn');
const welcomeAttachBtn  = document.getElementById('welcomeAttachBtn');
const chatInputWrapper  = document.getElementById('chatInputWrapper');
const fileChipContainer = document.getElementById('fileChipContainer');
const welcomeHeading    = document.getElementById('welcomeHeading');

const HEADINGS = [
  'Ready when you are',
  'What can I help with?',
  'Your career, analyzed',
  'Paste a job description',
  'Let\'s find your match',
  'Upload your CV to start',
  'How can I help?',
  'Drop a job link and see',
];

if (welcomeHeading) {
  welcomeHeading.textContent = HEADINGS[Math.floor(Math.random() * HEADINGS.length)];
}

let hasSent = false;
// null | { name: string, base64: string|null }  (base64 is null while still converting)
let pendingFileData = null;

// ── Welcome transition ──────────────────────────────────────────────
function hideWelcome() {
  if (welcomeScreen && !hasSent) {
    hasSent = true;
    welcomeScreen.remove();
    if (chatInputWrapper) chatInputWrapper.hidden = false;
  }
}

// ── File chip ───────────────────────────────────────────────────────
const FILE_SVG = `<svg class="file-chip-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
const X_SVG   = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

function showFileChip(name, loading) {
  fileChipContainer.innerHTML = `
    <div class="file-chip${loading ? '' : ' ready'}">
      ${loading ? '<span class="file-chip-spinner"></span>' : FILE_SVG}
      <span class="file-chip-name" title="${name}">${name}</span>
      <button class="file-chip-remove" type="button" aria-label="Remove attachment">${X_SVG}</button>
    </div>`;
  fileChipContainer.hidden = false;
  fileChipContainer.querySelector('.file-chip-remove').addEventListener('click', clearFileChip);
  chatInput.focus();
}

function clearFileChip() {
  pendingFileData = null;
  fileChipContainer.hidden = true;
  fileChipContainer.innerHTML = '';
  chatFileInput.value = '';
}

// ── Attach file: show chip immediately, convert in background ───────
async function attachFile(file) {
  const error = validateFile(file);
  if (error) {
    addMessage(chatMessages, error, false);
    chatFileInput.value = '';
    return;
  }

  hideWelcome();
  if (chatSuggestions) chatSuggestions.remove();

  pendingFileData = { name: file.name, base64: null };
  showFileChip(file.name, true); // spinner while converting

  try {
    const base64 = await fileToBase64(file);
    // Guard: user may have removed the chip while it was loading
    if (pendingFileData && pendingFileData.name === file.name) {
      pendingFileData.base64 = base64;
      showFileChip(file.name, false); // ready
    }
  } catch (e) {
    clearFileChip();
    addMessage(chatMessages, 'Failed to read the file. Please try again.', false);
  }
  chatFileInput.value = '';
}

// ── Send from welcome screen ─────────────────────────────────────────
function sendFromWelcome() {
  const text = welcomeInput.value.trim();
  if (!text) return;
  hideWelcome();
  if (chatSuggestions) chatSuggestions.remove();
  welcomeInput.value = '';
  if (!client.sendText(text)) {
    chatInput.value = text;
  }
}

// ── Send from bottom input ───────────────────────────────────────────
function sendFromBottom() {
  const text = chatInput.value.trim();

  if (!text && !pendingFileData) return;

  // File still converting — block send
  if (pendingFileData && !pendingFileData.base64) return;

  chatInput.value = '';
  chatInput.style.height = 'auto';

  if (pendingFileData) {
    const { name, base64 } = pendingFileData;
    clearFileChip();
    client.sendBinary(base64, text, name); // file + optional message
    return;
  }

  if (!client.sendText(text)) {
    chatInput.value = text;
  }
}

// ── MutationObserver: hide welcome when first message appears ─────────
const observer = new MutationObserver(() => {
  if (!hasSent && chatMessages.querySelector('.msg')) {
    hideWelcome();
  }
});
observer.observe(chatMessages, { childList: true, subtree: false });

// ── ChatClient ────────────────────────────────────────────────────────
const client = new ChatClient(chatMessages, {
  showTimestamps: true,
  onConnected: () => {
    statusDot.textContent = 'Connected';
    statusDot.classList.remove('disconnected');
  },
  onDisconnected: () => {
    statusDot.textContent = 'Disconnected';
    statusDot.classList.add('disconnected');
  },
});

client.connect();

// ── Welcome input events ──────────────────────────────────────────────
if (welcomeSendBtn && welcomeInput) {
  welcomeSendBtn.addEventListener('click', sendFromWelcome);
  welcomeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendFromWelcome(); }
  });
}

if (welcomeAttachBtn && chatFileInput) {
  welcomeAttachBtn.addEventListener('click', () => chatFileInput.click());
}

if (welcomeInput) {
  welcomeInput.addEventListener('input', () => {
    welcomeInput.style.height = 'auto';
    welcomeInput.style.height = Math.min(welcomeInput.scrollHeight, 120) + 'px';
  });
}

// ── Bottom input events ───────────────────────────────────────────────
if (chatSendBtn && chatInput) {
  chatSendBtn.addEventListener('click', sendFromBottom);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendFromBottom(); }
  });
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  });
}

// ── File attach button ────────────────────────────────────────────────
if (chatAttachBtn && chatFileInput) {
  chatAttachBtn.addEventListener('click', () => chatFileInput.click());

  chatFileInput.addEventListener('change', () => {
    const file = chatFileInput.files && chatFileInput.files[0];
    if (file) attachFile(file);
  });
}

// ── Drag & Drop ───────────────────────────────────────────────────────
let dragCounter = 0;

chatContainer.addEventListener('dragenter', (e) => {
  e.preventDefault(); e.stopPropagation();
  dragCounter++;
  dropOverlay.classList.add('active');
});

chatContainer.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); });

chatContainer.addEventListener('dragleave', (e) => {
  e.preventDefault(); e.stopPropagation();
  dragCounter--;
  if (dragCounter <= 0) { dragCounter = 0; dropOverlay.classList.remove('active'); }
});

chatContainer.addEventListener('drop', (e) => {
  e.preventDefault(); e.stopPropagation();
  dragCounter = 0;
  dropOverlay.classList.remove('active');
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) attachFile(file);
});

// ── Scroll to bottom ──────────────────────────────────────────────────
chatMessages.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = chatMessages;
  const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
  scrollBottomBtn.classList.toggle('visible', !isNearBottom);
});

scrollBottomBtn.addEventListener('click', () => {
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
});

// ── Suggestions ───────────────────────────────────────────────────────
function initSuggestions() {
  if (!chatSuggestions) return;
  chatSuggestions.innerHTML = SUGGESTIONS.map(text => `<span>${text}</span>`).join('');
  chatSuggestions.addEventListener('click', (e) => {
    if (e.target.tagName === 'SPAN') {
      hideWelcome();
      if (welcomeInput) welcomeInput.value = e.target.textContent;
      if (chatInput) chatInput.value = e.target.textContent;
      if (chatSuggestions) chatSuggestions.classList.add('fade-out');
      setTimeout(() => {
        if (chatSuggestions) chatSuggestions.remove();
        if (welcomeInput) sendFromWelcome();
        else if (chatInput) sendFromBottom();
      }, 300);
    }
  });
}

initSuggestions();
