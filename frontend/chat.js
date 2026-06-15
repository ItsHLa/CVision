import { ChatClient, SUGGESTIONS } from './chat-core.js';

const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatMessages = document.getElementById('chatMessages');
const chatAttachBtn = document.getElementById('chatAttachBtn');
const chatFileInput = document.getElementById('chatFileInput');
const chatSuggestions = document.getElementById('chatSuggestions');
const chatContainer = document.getElementById('chatContainer');
const dropOverlay = document.getElementById('dropOverlay');
const scrollBottomBtn = document.getElementById('scrollBottomBtn');
const statusDot = document.getElementById('statusDot');
const welcomeScreen = document.getElementById('welcomeScreen');
const welcomeInput = document.getElementById('welcomeInput');
const welcomeSendBtn = document.getElementById('welcomeSendBtn');
const welcomeAttachBtn = document.getElementById('welcomeAttachBtn');
const chatInputWrapper = document.getElementById('chatInputWrapper');

const welcomeHeading = document.getElementById('welcomeHeading');

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

function hideWelcome() {
  if (welcomeScreen && !hasSent) {
    hasSent = true;
    welcomeScreen.remove();
    if (chatInputWrapper) chatInputWrapper.hidden = false;
  }
}

function sendFromWelcome() {
  const text = welcomeInput.value.trim();
  if (!text) return;
  hideWelcome();
  if (chatSuggestions) chatSuggestions.remove();
  chatInput.value = text;
  welcomeInput.value = '';
  if (!client.sendText(text)) {
    welcomeInput.value = text;
  }
}

function sendFromBottom() {
  const text = chatInput.value.trim();
  if (!text) return;
  if (chatSuggestions) chatSuggestions.remove();
  chatInput.value = '';
  chatInput.style.height = 'auto';
  if (!client.sendText(text)) {
    chatInput.value = text;
  }
}

const observer = new MutationObserver(() => {
  if (!hasSent && chatMessages.querySelector('.msg')) {
    hideWelcome();
  }
});
observer.observe(chatMessages, { childList: true, subtree: false });

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

if (welcomeSendBtn && welcomeInput) {
  welcomeSendBtn.addEventListener('click', sendFromWelcome);
  welcomeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendFromWelcome();
    }
  });
}

if (chatSendBtn && chatInput) {
  chatSendBtn.addEventListener('click', sendFromBottom);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendFromBottom();
    }
  });
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  });
}

if (welcomeInput) {
  welcomeInput.addEventListener('input', () => {
    welcomeInput.style.height = 'auto';
    welcomeInput.style.height = Math.min(welcomeInput.scrollHeight, 120) + 'px';
  });
}

if (welcomeAttachBtn && chatFileInput) {
  welcomeAttachBtn.addEventListener('click', () => {
    chatFileInput.click();
  });
}

if (chatAttachBtn && chatFileInput) {
  chatAttachBtn.addEventListener('click', () => {
    chatFileInput.click();
  });

  chatFileInput.addEventListener('change', () => {
    const file = chatFileInput.files && chatFileInput.files[0];
    if (file) {
      hideWelcome();
      if (chatSuggestions) chatSuggestions.remove();
      client.sendFile(file);
    }
    chatFileInput.value = '';
  });
}

let dragCounter = 0;

chatContainer.addEventListener('dragenter', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dragCounter++;
  dropOverlay.classList.add('active');
});

chatContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

chatContainer.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    dropOverlay.classList.remove('active');
  }
});

chatContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dragCounter = 0;
  dropOverlay.classList.remove('active');
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) {
    if (chatFileInput) {
      const dt = new DataTransfer();
      dt.items.add(file);
      chatFileInput.files = dt.files;
      chatFileInput.dispatchEvent(new Event('change'));
    }
  }
});

chatMessages.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = chatMessages;
  const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
  scrollBottomBtn.classList.toggle('visible', !isNearBottom);
});

scrollBottomBtn.addEventListener('click', () => {
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
});

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
        if (welcomeInput) {
          sendFromWelcome();
        } else if (chatInput) {
          sendFromBottom();
        }
      }, 300);
    }
  });
}

initSuggestions();
