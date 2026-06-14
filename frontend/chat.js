import { ChatClient, SUGGESTIONS } from './chat-core.js';

const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatMessages = document.getElementById('chatMessages');
const chatAttachBtn = document.getElementById('chatAttachBtn');
const chatFileInput = document.getElementById('chatFileInput');
const chatSuggestions = document.getElementById('chatSuggestions');

const client = new ChatClient(chatMessages, {
  showTimestamps: true,
});

client.connect();

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  if (chatSuggestions) chatSuggestions.remove();
  chatInput.value = '';
  client.sendText(text);
}

chatSendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

if (chatAttachBtn && chatFileInput) {
  chatAttachBtn.addEventListener('click', () => {
    chatFileInput.click();
  });

  chatFileInput.addEventListener('change', () => {
    const file = chatFileInput.files && chatFileInput.files[0];
    if (file) {
      if (chatSuggestions) chatSuggestions.remove();
      client.sendFile(file);
    }
    chatFileInput.value = '';
  });
}

function initSuggestions() {
  if (!chatSuggestions) return;
  chatSuggestions.innerHTML = SUGGESTIONS.map(text => `<span>${text}</span>`).join('');
  chatSuggestions.addEventListener('click', (e) => {
    if (e.target.tagName === 'SPAN') {
      chatInput.value = e.target.textContent;
      chatSuggestions.classList.add('fade-out');
      setTimeout(() => chatSuggestions.remove(), 300);
      sendMessage();
    }
  });
}

initSuggestions();
