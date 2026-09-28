/**
 * ChatGPT-like UI with n8n Webhook Integration
 * Handles chat sessions, markdown rendering, code syntax highlighting,
 * typewriter streaming effects, and local storage persistence.
 */

// Default Configuration
const DEFAULT_CONFIG = {
  webhookUrl: 'https://praveenma.app.n8n.cloud/webhook/chat',
  testWebhookUrl: 'https://praveenma.app.n8n.cloud/webhook-test/chat',
  userName: 'You',
  theme: 'dark'
};

// Application State
let appState = {
  conversations: [],
  currentChatId: null,
  isGenerating: false,
  abortController: null,
  config: { ...DEFAULT_CONFIG }
};

// DOM Elements
const DOM = {
  appLayout: document.getElementById('appLayout'),
  sidebar: document.getElementById('sidebar'),
  sidebarBackdrop: document.getElementById('sidebarBackdrop'),
  sidebarCloseBtn: document.getElementById('sidebarCloseBtn'),
  sidebarOpenBtn: document.getElementById('sidebarOpenBtn'),
  newChatBtn: document.getElementById('newChatBtn'),
  chatSearchInput: document.getElementById('chatSearchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  chatHistoryContainer: document.getElementById('chatHistoryContainer'),
  historySection: document.getElementById('historySection'),
  emptyHistoryState: document.getElementById('emptyHistoryState'),
  statusIndicator: document.getElementById('statusIndicator'),
  statusUrlPreview: document.getElementById('statusUrlPreview'),
  userNameDisplay: document.getElementById('userNameDisplay'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  iconMoon: document.querySelector('.icon-moon'),
  iconSun: document.querySelector('.icon-sun'),
  
  chatScrollContainer: document.getElementById('chatScrollContainer'),
  welcomeScreen: document.getElementById('welcomeScreen'),
  messagesFeed: document.getElementById('messagesFeed'),
  typingIndicatorContainer: document.getElementById('typingIndicatorContainer'),
  scrollAnchor: document.getElementById('scrollAnchor'),
  
  chatForm: document.getElementById('chatForm'),
  messageInput: document.getElementById('messageInput'),
  sendBtn: document.getElementById('sendBtn'),
  sendIcon: document.querySelector('.send-icon'),
  stopIcon: document.querySelector('.stop-icon'),
  attachBtn: document.getElementById('attachBtn'),
  
  clearChatBtn: document.getElementById('clearChatBtn'),
  exportChatBtn: document.getElementById('exportChatBtn'),
  openSettingsBtn: document.getElementById('openSettingsBtn'),
  openSettingsQuickBtn: document.getElementById('openSettingsQuickBtn'),
  
  // Settings Modal
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
  cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  webhookUrlInput: document.getElementById('webhookUrlInput'),
  testWebhookBtn: document.getElementById('testWebhookBtn'),
  webhookTestFeedback: document.getElementById('webhookTestFeedback'),
  useProdUrlBtn: document.getElementById('useProdUrlBtn'),
  useTestUrlBtn: document.getElementById('useTestUrlBtn'),
  userNameInput: document.getElementById('userNameInput'),
  clearAllHistoryBtn: document.getElementById('clearAllHistoryBtn'),
  
  toastContainer: document.getElementById('toastContainer')
};

/* =========================================================
   Initialization & Storage
   ========================================================= */

function init() {
  loadConfig();
  loadConversations();
  setupMarkdownRenderer();
  bindEvents();
  applyTheme(appState.config.theme);

  // If no chat exists or URL has no active chat, create or select one
  if (appState.conversations.length === 0) {
    createNewChat();
  } else {
    // Select most recent conversation
    selectChat(appState.conversations[0].id);
  }

  updateUrlPreview();
  renderHistoryList();
}

function loadConfig() {
  const savedConfig = localStorage.getItem('chatgpt_n8n_config');
  if (savedConfig) {
    try {
      appState.config = { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) };
    } catch (e) {
      console.error('Failed to parse saved config:', e);
    }
  }
  DOM.userNameDisplay.textContent = appState.config.userName || 'You';
}

function saveConfig() {
  localStorage.setItem('chatgpt_n8n_config', JSON.stringify(appState.config));
  DOM.userNameDisplay.textContent = appState.config.userName || 'You';
  updateUrlPreview();
}

function loadConversations() {
  const saved = localStorage.getItem('chatgpt_n8n_conversations');
  if (saved) {
    try {
      appState.conversations = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse conversations:', e);
      appState.conversations = [];
    }
  }
}

function saveConversations() {
  localStorage.setItem('chatgpt_n8n_conversations', JSON.stringify(appState.conversations));
}

function updateUrlPreview() {
  try {
    const url = new URL(appState.config.webhookUrl);
    DOM.statusUrlPreview.textContent = url.hostname;
    DOM.statusIndicator.className = 'status-indicator online';
  } catch {
    DOM.statusUrlPreview.textContent = 'Custom Webhook';
  }
}

/* =========================================================
   Markdown & Code Formatting Configuration
   ========================================================= */

function setupMarkdownRenderer() {
  if (typeof marked === 'undefined') return;

  const renderer = new marked.Renderer();

  // Custom code block renderer with Copy button and language title
  renderer.code = function(code, language) {
    const validLang = (language && hljs.getLanguage(language)) ? language : '';
    let highlighted;
    try {
      highlighted = validLang ? hljs.highlight(code, { language: validLang }).value : hljs.highlightAuto(code).value;
    } catch {
      highlighted = escapeHtml(code);
    }

    const langLabel = validLang || 'code';
    const escapedCode = encodeURIComponent(code);

    return `
      <div class="code-block-wrapper">
        <div class="code-header">
          <span class="code-lang">${langLabel}</span>
          <button type="button" class="copy-code-btn" data-raw-code="${escapedCode}" onclick="window.copyCodeBlock(this)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
            <span>Copy code</span>
          </button>
        </div>
        <pre><code class="hljs ${validLang}">${highlighted}</code></pre>
      </div>
    `;
  };

  marked.setOptions({
    renderer: renderer,
    gfm: true,
    breaks: true,
    smartypants: true
  });
}

function renderMarkdown(content) {
  if (typeof marked === 'undefined') {
    return escapeHtml(content);
  }
  const rawHtml = marked.parse(content || '');
  return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(rawHtml) : rawHtml;
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

window.copyCodeBlock = function(btn) {
  const encoded = btn.getAttribute('data-raw-code');
  const code = decodeURIComponent(encoded);
  navigator.clipboard.writeText(code).then(() => {
    const span = btn.querySelector('span');
    const originalText = span.textContent;
    span.textContent = 'Copied!';
    btn.style.color = 'var(--success-color)';
    setTimeout(() => {
      span.textContent = originalText;
      btn.style.color = '';
    }, 2000);
  });
};

/* =========================================================
   Conversation & Session Management
   ========================================================= */

function createNewChat() {
  const newChat = {
    id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title: 'New chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: []
  };

  appState.conversations.unshift(newChat);
  saveConversations();
  selectChat(newChat.id);
  renderHistoryList();

  // Close mobile sidebar if open
  closeMobileSidebar();
  DOM.messageInput.focus();
}

function selectChat(chatId) {
  appState.currentChatId = chatId;
  const chat = appState.conversations.find(c => c.id === chatId);
  
  if (!chat) {
    if (appState.conversations.length > 0) {
      selectChat(appState.conversations[0].id);
    } else {
      createNewChat();
    }
    return;
  }

  // Render messages
  renderMessages(chat.messages);
  renderHistoryList();
}

function getCurrentChat() {
  return appState.conversations.find(c => c.id === appState.currentChatId);
}

function deleteChat(chatId, event) {
  if (event) event.stopPropagation();

  const index = appState.conversations.findIndex(c => c.id === chatId);
  if (index === -1) return;

  appState.conversations.splice(index, 1);
  saveConversations();

  if (appState.currentChatId === chatId) {
    if (appState.conversations.length > 0) {
      selectChat(appState.conversations[0].id);
    } else {
      createNewChat();
    }
  } else {
    renderHistoryList();
  }

  showToast('Conversation deleted', 'info');
}

function renameChat(chatId, event) {
  if (event) event.stopPropagation();

  const chat = appState.conversations.find(c => c.id === chatId);
  if (!chat) return;

  const newTitle = prompt('Rename conversation:', chat.title);
  if (newTitle && newTitle.trim()) {
    chat.title = newTitle.trim();
    chat.updatedAt = new Date().toISOString();
    saveConversations();
    renderHistoryList();
  }
}

/* =========================================================
   UI Rendering: Sidebar History
   ========================================================= */

function renderHistoryList(filterQuery = '') {
  DOM.historySection.innerHTML = '';
  const query = filterQuery.toLowerCase().trim();

  let filtered = appState.conversations;
  if (query) {
    filtered = appState.conversations.filter(c => 
      c.title.toLowerCase().includes(query) ||
      c.messages.some(m => m.content.toLowerCase().includes(query))
    );
  }

  if (filtered.length === 0) {
    DOM.emptyHistoryState.style.display = 'block';
    return;
  }
  DOM.emptyHistoryState.style.display = 'none';

  // Group by date: Today, Yesterday, Previous 7 Days, Older
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const sevenDaysAgo = today - 86400000 * 7;

  const groups = {
    today: [],
    yesterday: [],
    previous7Days: [],
    older: []
  };

  filtered.forEach(chat => {
    const chatTime = new Date(chat.updatedAt || chat.createdAt).getTime();
    if (chatTime >= today) {
      groups.today.push(chat);
    } else if (chatTime >= yesterday) {
      groups.yesterday.push(chat);
    } else if (chatTime >= sevenDaysAgo) {
      groups.previous7Days.push(chat);
    } else {
      groups.older.push(chat);
    }
  });

  const renderGroup = (label, list) => {
    if (list.length === 0) return;

    const labelEl = document.createElement('div');
    labelEl.className = 'history-section-label';
    labelEl.textContent = label;
    DOM.historySection.appendChild(labelEl);

    list.forEach(chat => {
      const itemEl = document.createElement('div');
      itemEl.className = `history-item ${chat.id === appState.currentChatId ? 'active' : ''}`;
      itemEl.setAttribute('data-id', chat.id);

      itemEl.innerHTML = `
        <div class="history-title-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span title="${escapeHtml(chat.title)}">${escapeHtml(chat.title)}</span>
        </div>
        <div class="history-actions">
          <button type="button" class="history-action-btn edit" title="Rename" onclick="renameChat('${chat.id}', event)">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            </svg>
          </button>
          <button type="button" class="history-action-btn delete" title="Delete" onclick="deleteChat('${chat.id}', event)">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      `;

      itemEl.addEventListener('click', () => {
        selectChat(chat.id);
        closeMobileSidebar();
      });

      DOM.historySection.appendChild(itemEl);
    });
  };

  renderGroup('Today', groups.today);
  renderGroup('Yesterday', groups.yesterday);
  renderGroup('Previous 7 Days', groups.previous7Days);
  renderGroup('Older', groups.older);
}

/* =========================================================
   UI Rendering: Messages
   ========================================================= */

function renderMessages(messages) {
  DOM.messagesFeed.innerHTML = '';

  if (!messages || messages.length === 0) {
    DOM.welcomeScreen.style.display = 'flex';
    DOM.messagesFeed.style.display = 'none';
  } else {
    DOM.welcomeScreen.style.display = 'none';
    DOM.messagesFeed.style.display = 'flex';

    messages.forEach(msg => {
      appendMessageElement(msg, false);
    });
  }

  scrollToBottom();
}

function appendMessageElement(msg, animate = true) {
  const row = document.createElement('div');
  row.className = `message-row ${msg.role}`;
  row.id = `msg-${msg.id}`;

  const timeFormatted = formatTime(msg.timestamp);

  if (msg.role === 'user') {
    row.innerHTML = `
      <div class="message-content-wrapper">
        <div class="message-bubble user-bubble">${escapeHtml(msg.content)}</div>
        <div class="message-actions-bar">
          <span class="msg-time">${timeFormatted}</span>
        </div>
      </div>
      <div class="message-avatar user-avatar-badge" title="${escapeHtml(appState.config.userName)}">
        <span>${escapeHtml((appState.config.userName || 'U')[0].toUpperCase())}</span>
      </div>
    `;
  } else {
    // Assistant message
    const renderedHtml = renderMarkdown(msg.content);
    row.innerHTML = `
      <div class="message-avatar bot" title="Assistant">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
      </div>
      <div class="message-content-wrapper">
        <div class="message-bubble assistant-bubble">${renderedHtml}</div>
        <div class="message-actions-bar">
          <button type="button" class="msg-action-btn copy-msg-btn" title="Copy response" onclick="copyMessageText('${msg.id}')">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
            <span>Copy</span>
          </button>
          <button type="button" class="msg-action-btn feedback-btn" title="Good response" onclick="handleFeedback(this, 'like')">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 10v12M15 10.5a3 3 0 0 0-3-3l-1.5-4.5A1.5 1.5 0 0 0 9 4.5v5.5H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12.3a2 2 0 0 0 2-1.6l1.4-7A2 2 0 0 0 17.7 11H15z"/>
            </svg>
          </button>
          <button type="button" class="msg-action-btn feedback-btn" title="Bad response" onclick="handleFeedback(this, 'dislike')">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 14V2M9 13.5a3 3 0 0 0 3 3l1.5 4.5a1.5 1.5 0 0 0 1.5 1.5v-5.5h5a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H7.7a2 2 0 0 0-2 1.6l-1.4 7a2 2 0 0 0 2 2.4H9z"/>
            </svg>
          </button>
          <button type="button" class="msg-action-btn retry-msg-btn" title="Regenerate response" onclick="regenerateLastAssistantMessage('${msg.id}')">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            <span>Regenerate</span>
          </button>
          <span class="msg-time">${timeFormatted}</span>
        </div>
      </div>
    `;
  }

  DOM.messagesFeed.appendChild(row);
  if (animate) {
    scrollToBottom();
  }
}

function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    DOM.chatScrollContainer.scrollTop = DOM.chatScrollContainer.scrollHeight;
  });
}

/* =========================================================
   Sending & Receiving Messages (n8n API)
   ========================================================= */

async function sendMessage(textToSend) {
  const text = (textToSend || DOM.messageInput.value).trim();
  if (!text || appState.isGenerating) return;

  const chat = getCurrentChat();
  if (!chat) return;

  // Clear input & reset size
  DOM.messageInput.value = '';
  resizeTextarea();
  updateSendBtnState();

  // If this is the first message, auto-title the conversation
  if (chat.messages.length === 0) {
    chat.title = text.length > 32 ? text.substring(0, 32) + '...' : text;
  }

  // Create user message
  const userMsg = {
    id: 'msg_' + Date.now(),
    role: 'user',
    content: text,
    timestamp: new Date().toISOString()
  };

  chat.messages.push(userMsg);
  chat.updatedAt = new Date().toISOString();
  saveConversations();

  DOM.welcomeScreen.style.display = 'none';
  DOM.messagesFeed.style.display = 'flex';
  appendMessageElement(userMsg, true);
  renderHistoryList();

  // UI state for generating
  setGeneratingState(true);
  showTypingIndicator(true);

  // Setup AbortController
  appState.abortController = new AbortController();

  try {
    const payload = {
      chatInput: text,
      message: text,
      text: text,
      prompt: text,
      sessionId: chat.id
    };

    const response = await fetch(appState.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      body: JSON.stringify(payload),
      signal: appState.abortController.signal
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status} ${response.statusText}`);
    }

    const rawResponse = await response.text();
    let replyText = '';

    try {
      const json = JSON.parse(rawResponse);
      replyText = json.output || json.text || json.message || json.response || json.data || (typeof json === 'string' ? json : JSON.stringify(json, null, 2));
    } catch {
      // It's raw text or HTML
      replyText = rawResponse;
    }

    showTypingIndicator(false);

    // Create assistant message placeholder
    const assistantMsg = {
      id: 'msg_' + Date.now(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };

    chat.messages.push(assistantMsg);
    saveConversations();

    // Stream the response with a typewriter effect
    await streamAssistantResponse(assistantMsg, replyText);

  } catch (error) {
    showTypingIndicator(false);

    if (error.name === 'AbortError') {
      showToast('Generation cancelled', 'info');
    } else {
      console.error('Webhook error:', error);
      const errorMsg = {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        content: `⚠️ **Unable to connect to the n8n chatbot:**\n\n\`${error.message}\`\n\n**Troubleshooting steps:**\n1. Ensure the n8n workflow is active or running.\n2. Verify the URL in **Settings** matches: \`${appState.config.webhookUrl}\`\n3. If using in browser directly, verify CORS is allowed in n8n Webhook node settings.`,
        timestamp: new Date().toISOString()
      };
      chat.messages.push(errorMsg);
      appendMessageElement(errorMsg, true);
      saveConversations();
      showToast('Error communicating with n8n webhook', 'error');
    }
  } finally {
    setGeneratingState(false);
    appState.abortController = null;
  }
}

/**
 * Typewriter streaming simulation for n8n webhook reply
 */
async function streamAssistantResponse(assistantMsg, fullText) {
  const row = document.createElement('div');
  row.className = 'message-row assistant';
  row.id = `msg-${assistantMsg.id}`;

  row.innerHTML = `
    <div class="message-avatar bot" title="Assistant">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    </div>
    <div class="message-content-wrapper">
      <div class="message-bubble assistant-bubble"></div>
      <div class="message-actions-bar" style="display: none;">
        <button type="button" class="msg-action-btn copy-msg-btn" title="Copy response" onclick="copyMessageText('${assistantMsg.id}')">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
          <span>Copy</span>
        </button>
        <button type="button" class="msg-action-btn feedback-btn" title="Good response" onclick="handleFeedback(this, 'like')">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M7 10v12M15 10.5a3 3 0 0 0-3-3l-1.5-4.5A1.5 1.5 0 0 0 9 4.5v5.5H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12.3a2 2 0 0 0 2-1.6l1.4-7A2 2 0 0 0 17.7 11H15z"/>
          </svg>
        </button>
        <button type="button" class="msg-action-btn feedback-btn" title="Bad response" onclick="handleFeedback(this, 'dislike')">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 14V2M9 13.5a3 3 0 0 0 3 3l1.5 4.5a1.5 1.5 0 0 0 1.5 1.5v-5.5h5a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H7.7a2 2 0 0 0-2 1.6l-1.4 7a2 2 0 0 0 2 2.4H9z"/>
          </svg>
        </button>
        <button type="button" class="msg-action-btn retry-msg-btn" title="Regenerate response" onclick="regenerateLastAssistantMessage('${assistantMsg.id}')">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          <span>Regenerate</span>
        </button>
        <span class="msg-time">${formatTime(assistantMsg.timestamp)}</span>
      </div>
    </div>
  `;

  DOM.messagesFeed.appendChild(row);
  const bubble = row.querySelector('.assistant-bubble');
  const actionsBar = row.querySelector('.message-actions-bar');

  // Stream in chunks
  const words = fullText.split(' ');
  let currentChunk = '';
  const chunkSize = Math.max(1, Math.floor(words.length / 50));

  for (let i = 0; i < words.length; i += chunkSize) {
    if (!appState.isGenerating) break; // User stopped generation
    currentChunk = words.slice(0, i + chunkSize).join(' ');
    bubble.innerHTML = renderMarkdown(currentChunk);
    scrollToBottom();
    await new Promise(r => setTimeout(r, 16));
  }

  // Final render with complete text
  assistantMsg.content = fullText;
  bubble.innerHTML = renderMarkdown(fullText);
  actionsBar.style.display = 'flex';
  saveConversations();
  scrollToBottom();
}

function showTypingIndicator(show) {
  DOM.typingIndicatorContainer.style.display = show ? 'block' : 'none';
  if (show) scrollToBottom();
}

function setGeneratingState(generating) {
  appState.isGenerating = generating;
  if (generating) {
    DOM.sendIcon.style.display = 'none';
    DOM.stopIcon.style.display = 'block';
    DOM.sendBtn.disabled = false;
    DOM.sendBtn.setAttribute('title', 'Stop generating');
  } else {
    DOM.sendIcon.style.display = 'block';
    DOM.stopIcon.style.display = 'none';
    DOM.sendBtn.setAttribute('title', 'Send message');
    updateSendBtnState();
  }
}

/* =========================================================
   Message Actions: Copy, Feedback, Regenerate
   ========================================================= */

window.copyMessageText = function(msgId) {
  const chat = getCurrentChat();
  if (!chat) return;

  const msg = chat.messages.find(m => m.id === msgId);
  if (!msg) return;

  navigator.clipboard.writeText(msg.content).then(() => {
    showToast('Message copied to clipboard', 'success');
  }).catch(() => {
    showToast('Failed to copy text', 'error');
  });
};

window.handleFeedback = function(btn, type) {
  const row = btn.closest('.message-actions-bar');
  const allFeedbackBtns = row.querySelectorAll('.feedback-btn');
  allFeedbackBtns.forEach(b => b.classList.remove('active'));

  btn.classList.add('active');
  showToast(type === 'like' ? 'Thanks for your feedback!' : 'Feedback submitted', 'info');
};

window.regenerateLastAssistantMessage = async function(msgId) {
  if (appState.isGenerating) return;

  const chat = getCurrentChat();
  if (!chat) return;

  const msgIndex = chat.messages.findIndex(m => m.id === msgId);
  if (msgIndex === -1) return;

  // Find preceding user message
  let userPrompt = '';
  for (let i = msgIndex - 1; i >= 0; i--) {
    if (chat.messages[i].role === 'user') {
      userPrompt = chat.messages[i].content;
      break;
    }
  }

  if (!userPrompt) {
    showToast('No user prompt found to regenerate', 'info');
    return;
  }

  // Remove the assistant message
  chat.messages.splice(msgIndex, 1);
  saveConversations();
  renderMessages(chat.messages);

  // Re-send user prompt
  await sendMessage(userPrompt);
};

/* =========================================================
   Input Resizing & Keyboard Handlers
   ========================================================= */

function resizeTextarea() {
  const input = DOM.messageInput;
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 180) + 'px';
}

function updateSendBtnState() {
  if (appState.isGenerating) {
    DOM.sendBtn.disabled = false;
  } else {
    DOM.sendBtn.disabled = !DOM.messageInput.value.trim();
  }
}

/* =========================================================
   Theme Switching
   ========================================================= */

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  appState.config.theme = theme;
  saveConfig();

  if (theme === 'light') {
    DOM.iconMoon.style.display = 'none';
    DOM.iconSun.style.display = 'block';
    const hljsTheme = document.getElementById('hljs-theme');
    if (hljsTheme) hljsTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
  } else {
    DOM.iconMoon.style.display = 'block';
    DOM.iconSun.style.display = 'none';
    const hljsTheme = document.getElementById('hljs-theme');
    if (hljsTheme) hljsTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
  }
}

function toggleTheme() {
  const current = appState.config.theme;
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* =========================================================
   Export Chat to Markdown
   ========================================================= */

function exportChat() {
  const chat = getCurrentChat();
  if (!chat || chat.messages.length === 0) {
    showToast('No messages to export', 'info');
    return;
  }

  let md = `# ${chat.title}\n\n`;
  md += `_Exported on ${new Date().toLocaleString()}_\n\n---\n\n`;

  chat.messages.forEach(msg => {
    const author = msg.role === 'user' ? (appState.config.userName || 'User') : 'ChatGPT';
    md += `### ${author} (${formatTime(msg.timestamp)})\n\n${msg.content}\n\n---\n\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('Chat exported as Markdown', 'success');
}

function clearCurrentChat() {
  const chat = getCurrentChat();
  if (!chat || chat.messages.length === 0) return;

  if (confirm('Clear all messages from this conversation?')) {
    chat.messages = [];
    chat.updatedAt = new Date().toISOString();
    saveConversations();
    renderMessages([]);
    showToast('Conversation cleared', 'info');
  }
}

/* =========================================================
   Settings Modal & Webhook Test
   ========================================================= */

function openSettingsModal() {
  DOM.webhookUrlInput.value = appState.config.webhookUrl;
  DOM.userNameInput.value = appState.config.userName || 'You';
  DOM.webhookTestFeedback.style.display = 'none';
  DOM.settingsModal.style.display = 'flex';
}

function closeSettingsModal() {
  DOM.settingsModal.style.display = 'none';
}

async function testWebhookConnection() {
  const url = DOM.webhookUrlInput.value.trim();
  const feedback = DOM.webhookTestFeedback;

  if (!url) {
    feedback.className = 'test-feedback error';
    feedback.textContent = 'Please enter a valid webhook URL.';
    feedback.style.display = 'block';
    return;
  }

  feedback.className = 'test-feedback';
  feedback.style.display = 'block';
  feedback.textContent = 'Pinging webhook endpoint...';
  DOM.testWebhookBtn.disabled = true;

  const startTime = Date.now();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatInput: 'Connection test ping',
        message: 'Connection test ping',
        test: true
      })
    });

    const elapsed = Date.now() - startTime;

    if (res.ok) {
      feedback.className = 'test-feedback success';
      feedback.textContent = `✓ Connected successfully! Response time: ${elapsed}ms`;
      DOM.statusIndicator.className = 'status-indicator online';
    } else {
      feedback.className = 'test-feedback error';
      feedback.textContent = `Endpoint returned status HTTP ${res.status} (${elapsed}ms)`;
      DOM.statusIndicator.className = 'status-indicator error';
    }
  } catch (err) {
    feedback.className = 'test-feedback error';
    feedback.textContent = `✗ Connection failed: ${err.message}. If running in browser, ensure n8n allows CORS or is reachable.`;
    DOM.statusIndicator.className = 'status-indicator error';
  } finally {
    DOM.testWebhookBtn.disabled = false;
  }
}

function saveSettings() {
  const newUrl = DOM.webhookUrlInput.value.trim();
  const newName = DOM.userNameInput.value.trim() || 'You';

  if (newUrl) {
    appState.config.webhookUrl = newUrl;
  }
  appState.config.userName = newName;

  saveConfig();
  closeSettingsModal();
  showToast('Settings saved successfully', 'success');

  // Re-render current messages to update user avatar name
  const chat = getCurrentChat();
  if (chat) renderMessages(chat.messages);
}

function clearAllHistory() {
  if (confirm('Are you sure you want to delete ALL conversations permanently? This cannot be undone.')) {
    appState.conversations = [];
    localStorage.removeItem('chatgpt_n8n_conversations');
    createNewChat();
    closeSettingsModal();
    showToast('All chat history cleared', 'info');
  }
}

/* =========================================================
   Toast Notifications
   ========================================================= */

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  } else {
    iconSvg = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  }

  toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3000);
}

/* =========================================================
   Mobile Sidebar & Backdrop Handlers
   ========================================================= */

function openMobileSidebar() {
  DOM.sidebar.classList.add('open');
  DOM.sidebarBackdrop.classList.add('active');
}

function closeMobileSidebar() {
  DOM.sidebar.classList.remove('open');
  DOM.sidebarBackdrop.classList.remove('active');
}

/* =========================================================
   Event Listeners
   ========================================================= */

function bindEvents() {
  // New chat
  DOM.newChatBtn.addEventListener('click', createNewChat);

  // Mobile sidebar controls
  DOM.sidebarOpenBtn.addEventListener('click', openMobileSidebar);
  DOM.sidebarCloseBtn.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      closeMobileSidebar();
    } else {
      DOM.sidebar.classList.toggle('collapsed');
    }
  });
  DOM.sidebarBackdrop.addEventListener('click', closeMobileSidebar);

  // Search input in sidebar
  DOM.chatSearchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    DOM.clearSearchBtn.style.display = val ? 'block' : 'none';
    renderHistoryList(val);
  });

  DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.chatSearchInput.value = '';
    DOM.clearSearchBtn.style.display = 'none';
    renderHistoryList('');
  });

  // Theme toggle
  DOM.themeToggleBtn.addEventListener('click', toggleTheme);

  // Clear & Export Chat
  DOM.clearChatBtn.addEventListener('click', clearCurrentChat);
  DOM.exportChatBtn.addEventListener('click', exportChat);

  // Settings Modal triggers
  DOM.openSettingsBtn.addEventListener('click', openSettingsModal);
  DOM.openSettingsQuickBtn.addEventListener('click', openSettingsModal);
  DOM.closeSettingsModalBtn.addEventListener('click', closeSettingsModal);
  DOM.cancelSettingsBtn.addEventListener('click', closeSettingsModal);
  DOM.saveSettingsBtn.addEventListener('click', saveSettings);
  DOM.testWebhookBtn.addEventListener('click', testWebhookConnection);
  DOM.clearAllHistoryBtn.addEventListener('click', clearAllHistory);

  DOM.useProdUrlBtn.addEventListener('click', () => {
    DOM.webhookUrlInput.value = DEFAULT_CONFIG.webhookUrl;
  });
  DOM.useTestUrlBtn.addEventListener('click', () => {
    DOM.webhookUrlInput.value = DEFAULT_CONFIG.testWebhookUrl;
  });

  // Prompt suggestions cards
  document.querySelectorAll('.prompt-card').forEach(card => {
    card.addEventListener('click', () => {
      const promptText = card.getAttribute('data-prompt');
      if (promptText) {
        sendMessage(promptText);
      }
    });
  });

  // Attachment button click demo
  DOM.attachBtn.addEventListener('click', () => {
    showToast('Add attachments / system context feature coming soon!', 'info');
  });

  // Form Submit / Stop button
  DOM.chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (appState.isGenerating) {
      // Stop generating
      if (appState.abortController) {
        appState.abortController.abort();
      }
      setGeneratingState(false);
    } else {
      sendMessage();
    }
  });

  // Textarea input and auto-expansion
  DOM.messageInput.addEventListener('input', () => {
    resizeTextarea();
    updateSendBtnState();
  });

  // Keyboard shortcut: Enter to submit, Shift+Enter for newline
  DOM.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!DOM.sendBtn.disabled) {
        DOM.chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    }
  });

  // Global Keyboard shortcuts (Ctrl+K for new chat, Escape to close modal)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      createNewChat();
    }
    if (e.key === 'Escape') {
      if (DOM.settingsModal.style.display === 'flex') {
        closeSettingsModal();
      }
    }
  });
}

// Start app on DOM ready
document.addEventListener('DOMContentLoaded', init);
