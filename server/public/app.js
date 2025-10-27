let state = {
  userId: localStorage.getItem('studentbot_userId') || null,
  persona: localStorage.getItem('studentbot_persona') || 'friendly',
  tts: false,
  pomo: { timer: null, running: false, total: 25*60, elapsed: 0, break: false }
};

const elHistory = document.getElementById('history');
const elInput = document.getElementById('input');
const elSend = document.getElementById('send');
const elSuggestions = document.getElementById('suggestions');
const elVoice = document.getElementById('voiceBtn');
const elTTS = document.getElementById('ttsBtn');
const elPersonaSwitch = document.getElementById('personaSwitch');
const elPomoBar = document.getElementById('pomoBar');
const elTodoInput = document.getElementById('todoInput');
const elTodoList = document.getElementById('todoList');

function now() { return new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }

function addBubble(text, role='bot') {
  const div = document.createElement('div');
  div.className = 'bubble ' + (role === 'user' ? 'user' : '');
  div.innerHTML = text.replace(/\n/g, '<br>');
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = role === 'user' ? 'You • ' + now() : 'Bot • ' + now();
  div.appendChild(meta);
  elHistory.appendChild(div);
  elHistory.scrollTop = elHistory.scrollHeight;
  if (state.tts && role !== 'user' && 'speechSynthesis' in window) {
    const utt = new SpeechSynthesisUtterance(div.textContent);
    speechSynthesis.speak(utt);
  }
}

function setSuggestions(arr=[]) {
  elSuggestions.innerHTML = '';
  if (!arr || arr.length === 0) { elSuggestions.classList.add('hidden'); return; }
  arr.forEach(s => {
    const b = document.createElement('button');
    b.textContent = s;
    b.onclick = () => { elInput.value = s; send(); };
    elSuggestions.appendChild(b);
  });
  elSuggestions.classList.remove('hidden');
}

// SEND FUNCTION WITH /PLAN SUPPORT
async function send() {
  const text = elInput.value.trim();
  if (!text) return;
  addBubble(text, 'user');
  elInput.value = '';

  // Handle /plan locally
  if (text.startsWith('/plan')) {
    const planText = text.replace('/plan', '').trim();
    if (!planText) { addBubble('Usage: /plan 7 DSA:2 OS:1 ML:3', 'bot'); return; }
    const tasks = planText.split(' ');
    let reply = 'Your study plan:\n';
    tasks.forEach(t => reply += '• ' + t + '\n');
    addBubble(reply, 'bot');
    return;
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: state.userId, text, persona: state.persona })
  });
  const data = await res.json();
  if (data.userId && !state.userId) {
    state.userId = data.userId;
    localStorage.setItem('studentbot_userId', state.userId);
  }
  addBubble(data.reply || '(no reply)');
  setSuggestions(data.suggestions || []);
  // refresh To-Dos immediately after first message
  listTodos();
}

elSend.onclick = send;
elInput.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

// Quick chips
document.querySelectorAll('.chip').forEach(ch => {
  ch.addEventListener('click', () => { elInput.value = ch.getAttribute('data-insert'); elInput.focus(); });
});

// Persona toggle
elPersonaSwitch.querySelectorAll('button').forEach(btn => {
  btn.onclick = () => {
    elPersonaSwitch.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.persona = btn.getAttribute('data-p');
    localStorage.setItem('studentbot_persona', state.persona);
    addBubble('Persona set to ' + state.persona + '.', 'bot');
  };
});
if (state.persona === 'formal') {
  elPersonaSwitch.querySelector('[data-p="formal"]').classList.add('active');
  elPersonaSwitch.querySelector('[data-p="friendly"]').classList.remove('active');
}

// Voice input
elVoice.onclick = async () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return addBubble('Speech recognition not supported on this browser.', 'bot');
  const r = new SR();
  r.lang = 'en-US';
  r.interimResults = false;
  r.maxAlternatives = 1;
  r.onresult = (e) => { elInput.value = e.results[0][0].transcript; send(); };
  r.onerror = () => addBubble('Voice error. Try again.', 'bot');
  r.start();
};

// TTS toggle
elTTS.onclick = () => { state.tts = !state.tts; addBubble('Text-to-speech ' + (state.tts ? 'enabled' : 'disabled') + '.', 'bot'); };

// Pomodoro
let pomoInterval = null;
function stopPomo() {
  if (pomoInterval) clearInterval(pomoInterval);
  state.pomo.running = false; state.pomo.elapsed = 0; state.pomo.break = false;
  elPomoBar.style.width = '0%';
}
function startPomo() {
  stopPomo();
  state.pomo.running = true;
  const focusTotal = 25*60, breakTotal = 5*60;
  let total = focusTotal;
  pomoInterval = setInterval(() => {
    state.pomo.elapsed++;
    const pct = Math.min(100, Math.floor(100 * state.pomo.elapsed / total));
    elPomoBar.style.width = pct + '%';
    if (state.pomo.elapsed >= total) {
      if (!state.pomo.break) { addBubble('Focus session complete! Take a 5 min break.', 'bot'); state.pomo.break = true; state.pomo.elapsed = 0; total = breakTotal; }
      else { addBubble('Break over! Ready for the next Pomodoro.', 'bot'); stopPomo(); }
    }
  }, 1000);
}
document.getElementById('startPomo').onclick = startPomo;
document.getElementById('stopPomo').onclick = stopPomo;

// To-Dos
async function listTodos() {
  if (!state.userId) { elTodoList.textContent = 'Login or chat first to create your userId.'; return; }
  const res = await fetch('/api/todo/' + state.userId);
  const items = await res.json();
  if (!Array.isArray(items) || items.length === 0) { elTodoList.textContent = 'No To-Dos yet.'; return; }
  elTodoList.innerHTML = '<div class="stack">' + items.map(t => '• ' + t.text).join('<br>') + '</div>';
}
document.getElementById('addTodo').onclick = async () => {
  const t = elTodoInput.value.trim();
  if (!t || !state.userId) return;
  await fetch('/api/todo/' + state.userId, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: t }) });
  elTodoInput.value=''; listTodos();
};
document.getElementById('listTodo').onclick = listTodos;
document.getElementById('clearTodo').onclick = async () => {
  if (!state.userId) return;
  await fetch('/api/todo/' + state.userId, { method:'DELETE' });
  listTodos();
};

// Welcome
addBubble('Welcome! Try /help, /plan, or press a quick action on the left.', 'bot');

// Service worker
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').catch(()=>{}); }

// --- Reviews widget client logic ---
const openReview = document.getElementById('openReview');
const reviewModal = document.getElementById('reviewModal');
const closeReview = document.getElementById('closeReview');
const starRow = document.getElementById('starRow');
const reviewComment = document.getElementById('reviewComment');
const submitReview = document.getElementById('submitReview');
const reviewList = document.getElementById('reviewList');
const reviewBadge = document.getElementById('reviewBadge');

let selectedStars = 0;

// --- On-screen debug logger ---
const _dbg = document.createElement('div');
_dbg.id = 'debugLog';
_dbg.style.position = 'fixed';
_dbg.style.left = '12px';
_dbg.style.bottom = '12px';
_dbg.style.maxWidth = '320px';
_dbg.style.zIndex = '9999';
_dbg.style.fontSize = '12px';
_dbg.style.color = 'var(--text)';
document.body.appendChild(_dbg);

function logDebug(msg, level='info'){
  try{
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    line.style.marginTop = '4px';
    line.style.padding = '6px 8px';
    line.style.borderRadius = '8px';
    line.style.pointerEvents = 'auto';
    if(level === 'error') { line.style.background = 'rgba(239,68,68,0.12)'; line.style.color = '#ffcccc'; }
    else { line.style.background = 'rgba(2,6,23,0.25)'; }
    _dbg.appendChild(line);
    setTimeout(()=>{ try{ line.remove(); } catch{} }, 12000);
  }catch(e){ console.error('logDebug failed', e); }
}

function toggleModal(show){ reviewModal.classList.toggle('hidden', !show); }
openReview.onclick = async () => { toggleModal(true); await loadReviews(); };
closeReview.onclick = () => toggleModal(false);

starRow.querySelectorAll('button').forEach(btn => {
  btn.onclick = () => {
    selectedStars = Number(btn.getAttribute('data-star'));
    starRow.querySelectorAll('button').forEach(b => {
      b.style.opacity = (Number(b.getAttribute('data-star')) <= selectedStars) ? '1' : '0.35';
    });
  };
});

async function loadReviews(){
  try {
    const res = await fetch('/api/reviews');
    const data = await res.json();
    reviewBadge.textContent = Math.round((data.avg || 0) * 10) / 10 + ' (' + (data.count || 0) + ')';
    reviewList.innerHTML = '';
    (data.reviews || []).forEach(r => {
      const d = document.createElement('div'); d.className = 'review-item';
      d.innerHTML = '<strong>' + '★'.repeat(r.rating) + '</strong><div class="tiny">' + (new Date(r.createdAt)).toLocaleString() + '</div><div style="margin-top:6px">' + (r.comment || '') + '</div>';
      reviewList.appendChild(d);
    });
    logDebug(`Loaded ${data.count || 0} reviews (avg=${Math.round((data.avg||0)*10)/10})`);
  } catch (err) { console.error(err); }
}

submitReview.onclick = async () => {
  if (!selectedStars) return alert('Please select 1-5 stars');
  try {
    const payload = { userId: state.userId, rating: selectedStars, comment: reviewComment.value.trim() };
    const res = await fetch('/api/reviews', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    let data;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      data = await res.json();
    } else {
      // Non-JSON (likely HTML error page) - read as text and show to user
      const txt = await res.text();
      logDebug('Non-JSON response on /api/reviews: ' + (txt.slice(0,200).replace(/\n/g,' ')), 'error');
      return alert('Server returned an unexpected response. Check server logs.');
    }
    if (data && data.success) {
      reviewComment.value = '';
      selectedStars = 0;
      starRow.querySelectorAll('button').forEach(b => b.style.opacity = '0.35');
      await loadReviews();
      toggleModal(false);
      addBubble('Thanks for your review!', 'bot');
    } else {
      alert(data.error || 'Error submitting review');
    }
  } catch (err) { alert(err.message); }
};


// Load review summary on startup
loadReviews().catch(()=>{});

// Auto-refresh reviews every 30 seconds so badge stays updated
setInterval(()=>{ loadReviews().catch(e=>logDebug('Auto-refresh failed: '+(e && e.message), 'error')); }, 30000);
