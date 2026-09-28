# ChatGPT-style UI for n8n Chatbot

A modern, responsive ChatGPT clone built using **HTML5, CSS3, and JavaScript (Vanilla)** connected directly to your **n8n Webhook workflow**.

---

## 🌟 Key Features

1. **ChatGPT Visual Experience**:
   - OpenAI dark mode color tokens & aesthetic palette.
   - Light / Dark theme toggle.
   - Glowing spark logo with interactive welcome screen.
   - 4 quick-start prompt suggestion cards (e.g. Account opening, Credit Cards, Loans).

2. **Backend n8n Integration**:
   - Pre-configured production webhook URL: `https://praveenma.app.n8n.cloud/webhook/chat`.
   - Settings modal allowing you to test connection latency or switch between Production and Test webhook URLs (`/webhook-test/chat`).
   - Dynamic error fallback with troubleshooting hints.

3. **Rich Chat Capabilities**:
   - **Streaming Typewriter Effect**: Simulates ChatGPT's streaming text generation when receiving answers from n8n.
   - **Full Markdown Parsing & Formatting**: Headings, lists, blockquotes, tables, links, bold, italics.
   - **Code Blocks with Syntax Highlighting**: Auto-highlights languages (JavaScript, Python, JSON, HTML, Bash, etc.) and provides a one-click "Copy code" button.
   - **Action Bar**: One-click message copying, thumbs up / thumbs down feedback, and message regeneration.

4. **Conversation Management**:
   - Sessions grouped by **Today**, **Yesterday**, **Previous 7 Days**, and **Older**.
   - Auto-titles conversation from your first query.
   - Rename and Delete conversations.
   - Search across chats in real-time.
   - Full persistence via browser `localStorage`.
   - Export conversation as a `.md` Markdown file.

5. **Responsive & Mobile Ready**:
   - Collapsible desktop sidebar and smooth mobile drawer with backdrop blur.
   - Keyboard shortcuts: `Enter` to send, `Shift+Enter` for newline, `Ctrl+K` for new chat, `Esc` to close modal.

---

## 🚀 How to Run Locally

You can run this application directly in any browser:

### Option 1: Direct File Open
Simply double-click [`index.html`](file:///c:/Users/ELCOT/OneDrive/Desktop/chatbot/index.html) in your file manager to open it in Chrome, Edge, Brave, or Firefox.

### Option 2: Local Web Server (Already Running)
A local development server is currently running at:
```
http://localhost:3000
```

To start it manually in the future using Python or Node:
```powershell
# Using Python
python -m http.server 3000

# Or using Node
npx serve .
```

---

## ⚙️ n8n Webhook Configuration

The UI sends a `POST` request with the following JSON payload:

```json
{
  "chatInput": "User message here",
  "message": "User message here",
  "text": "User message here",
  "prompt": "User message here",
  "sessionId": "chat_123456789"
}
```

The UI automatically parses responses whether returned as:
- Raw text / HTML
- JSON `{ "text": "..." }`
- JSON `{ "output": "..." }`
- JSON `{ "message": "..." }`
- JSON `{ "response": "..." }`

---

## 📁 File Structure

- [`index.html`](file:///c:/Users/ELCOT/OneDrive/Desktop/chatbot/index.html) - Application layout, sidebar, welcome cards, and modals.
- [`style.css`](file:///c:/Users/ELCOT/OneDrive/Desktop/chatbot/style.css) - ChatGPT styling tokens, dark/light themes, animations, responsive rules.
- [`app.js`](file:///c:/Users/ELCOT/OneDrive/Desktop/chatbot/app.js) - State handling, n8n webhook API, markdown rendering, and typewriter streaming.
