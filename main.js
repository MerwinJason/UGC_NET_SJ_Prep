// === UGC NET PREP — main.js ===
// Paper I (General Aptitude) + Paper II (English Literature) + Concept Lab

// --- 1. STATE & STORAGE ---
const appState = {
   user: { name: 'Jessica', createdAt: Date.now() },
   // Paper 2 data
   cleanQuestions: [],
   fullQuestions: [],
   // Paper 1 data
   p1CleanQuestions: [],
   p1FullQuestions: [],
   dataLoaded: { p2clean: false, p2full: false, p1clean: false, p1full: false },
   // Active paper toggle
   activePaper: 'p2', // 'p1' or 'p2'
   // Per-paper progress/flashcards/sessions (loaded dynamically)
   p2Progress: {},
   p2Sessions: [],
   p2Flashcards: [],
   p1Progress: {},
   p1Sessions: [],
   p1Flashcards: [],
   // Concept Lab
   conceptProgress: {},
   // Settings
   settings: { theme: 'dark', geminiKey: null },
   streak: { current: 0, lastStudyDate: null },
   // Temporary View State
   currentView: 'dashboard',
   activePaperQuestions: null, // the questions array for current paper detail view
   activeQuestionId: null
};

const STORAGE_PREFIX = 'ugcnet_';

function saveState(key, data) {
   localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
}
function loadState(key, defaultVal) {
   const stored = localStorage.getItem(STORAGE_PREFIX + key);
   try { return stored ? JSON.parse(stored) : defaultVal; }
   catch (e) { return defaultVal; }
}

// Paper-aware getters
function getProgress() { return appState.activePaper === 'p1' ? appState.p1Progress : appState.p2Progress; }
function setProgress(p) { if (appState.activePaper === 'p1') appState.p1Progress = p; else appState.p2Progress = p; }
function getSessions() { return appState.activePaper === 'p1' ? appState.p1Sessions : appState.p2Sessions; }
function getFlashcards() { return appState.activePaper === 'p1' ? appState.p1Flashcards : appState.p2Flashcards; }
function setFlashcards(f) { if (appState.activePaper === 'p1') appState.p1Flashcards = f; else appState.p2Flashcards = f; }
function getCleanQuestions() { return appState.activePaper === 'p1' ? appState.p1CleanQuestions : appState.cleanQuestions; }
function getFullQuestions() { return appState.activePaper === 'p1' ? appState.p1FullQuestions : appState.fullQuestions; }

function progressKey() { return appState.activePaper === 'p1' ? 'p1_progress' : 'progress'; }
function sessionsKey() { return appState.activePaper === 'p1' ? 'p1_sessions' : 'sessions'; }
function flashcardsKey() { return appState.activePaper === 'p1' ? 'p1_flashcards' : 'flashcards'; }

function saveProgress() { saveState(progressKey(), getProgress()); }
function saveSessions() { saveState(sessionsKey(), getSessions()); }
function saveFlashcards() { saveState(flashcardsKey(), getFlashcards()); }

function initStorage() {
   appState.user = loadState('user', appState.user);
   appState.settings = loadState('settings', appState.settings);
   appState.p2Progress = loadState('progress', {});
   appState.p2Sessions = loadState('sessions', []);
   appState.p2Flashcards = loadState('flashcards', []);
   appState.p1Progress = loadState('p1_progress', {});
   appState.p1Sessions = loadState('p1_sessions', []);
   appState.p1Flashcards = loadState('p1_flashcards', []);
   appState.conceptProgress = loadState('concept_progress', {});
   appState.streak = loadState('streak', appState.streak);
   applySettings();
}

// --- 2. UNIT NORMALIZATION (Paper 1) ---
const UNIT_CANONICAL = {
   'teaching aptitude': 'Teaching Aptitude', 'teaching aptitude ': 'Teaching Aptitude',
   'research aptitude': 'Research Aptitude', 'research aptitude ': 'Research Aptitude',
   'communication': 'Communication',
   'mathematical aptitude': 'Mathematical Reasoning', 'mathematical reasoning': 'Mathematical Reasoning',
   'mathematical reasoning and aptitude': 'Mathematical Reasoning', 'mathematical terms and reasoning': 'Mathematical Reasoning',
   'mathematical reasoning ': 'Mathematical Reasoning',
   'logical reasoning': 'Logical Reasoning', 'logical reasoning ': 'Logical Reasoning',
   'data interpretation': 'Data Interpretation', 'data interpretation ': 'Data Interpretation',
   'information and communication technology': 'ICT', 'information communication & technology': 'ICT',
   'information communication &': 'ICT', 'information and computer technology': 'ICT',
   'information and communication': 'ICT', 'ict': 'ICT',
   'people and environment': 'People & Environment', 'people, development and environment': 'People & Environment',
   'people, development and environment ': 'People & Environment', 'people and environment ': 'People & Environment',
   'higher education system': 'Higher Education', 'higher education': 'Higher Education',
   'higher education system of india': 'Higher Education',
   'comprehension': 'Reading Comprehension', 'reading comprehension': 'Reading Comprehension',
};
function normalizeUnit(raw) {
   if (!raw) return 'Unknown';
   return UNIT_CANONICAL[raw.toLowerCase().trim()] || raw;
}

const UNIT_ORDER = [
   'Teaching Aptitude', 'Research Aptitude', 'Reading Comprehension', 'Communication',
   'Mathematical Reasoning', 'Logical Reasoning', 'Data Interpretation', 'ICT',
   'People & Environment', 'Higher Education'
];
const UNIT_ICONS = {
   'Teaching Aptitude': '🎓', 'Research Aptitude': '🔬', 'Reading Comprehension': '📖',
   'Communication': '📡', 'Mathematical Reasoning': '🔢', 'Logical Reasoning': '🧠',
   'Data Interpretation': '📊', 'ICT': '💻', 'People & Environment': '🌍', 'Higher Education': '🏛️'
};

// --- 3. UTILS ---
function showToast(message, type = 'info') {
   const container = document.getElementById('toast-container');
   const toast = document.createElement('div');
   toast.className = 'toast ' + type;
   toast.innerText = message;
   if (type === 'error') toast.style.borderLeftColor = 'var(--red)';
   if (type === 'success') toast.style.borderLeftColor = 'var(--green)';
   container.appendChild(toast);
   setTimeout(() => { toast.style.animation = 'fadeOut 0.3s forwards'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function applySettings() {
   document.getElementById('user-name-display').innerText = appState.user.name;
   document.getElementById('setting-name').value = appState.user.name;
   if (appState.settings.geminiKey) {
      document.getElementById('setting-gemini-key').value = appState.settings.geminiKey;
      document.querySelectorAll('[id^="btn-ai-"]').forEach(btn => btn.style.display = 'inline-flex');
   }
   if (appState.settings.theme === 'light') document.body.classList.add('light-theme');
   else document.body.classList.remove('light-theme');
   const aiBtn = document.getElementById('btn-generate-ai-fc');
   if (appState.settings.geminiKey) aiBtn.style.display = 'inline-flex';
   else aiBtn.style.display = 'none';
}

// --- 4. DATA LOADING ---
async function loadData() {
   document.getElementById('loader-modal').classList.remove('hidden');
   try {
      const [cleanRes, fullRes, p1CleanRes, p1FullRes] = await Promise.all([
         fetch('./mcq_clean.json').catch(() => null),
         fetch('./mcq_full.json').catch(() => null),
         fetch('./ugc_net_paper1_clean.json').catch(() => null),
         fetch('./ugc_net_paper1_full.json').catch(() => null)
      ]);

      if (cleanRes && (cleanRes.ok || cleanRes.status === 0)) {
         let d = await cleanRes.json();
         appState.cleanQuestions = Array.isArray(d) ? d : (d.questions || []);
         appState.dataLoaded.p2clean = true;
      }
      if (fullRes && (fullRes.ok || fullRes.status === 0)) {
         let d = await fullRes.json();
         appState.fullQuestions = Array.isArray(d) ? d : (d.questions || []);
         appState.dataLoaded.p2full = true;
      }
      if (p1CleanRes && (p1CleanRes.ok || p1CleanRes.status === 0)) {
         let d = await p1CleanRes.json();
         appState.p1CleanQuestions = Array.isArray(d) ? d : (d.questions || []);
         appState.p1CleanQuestions.forEach(q => { q.unit = normalizeUnit(q.unit); });
         appState.dataLoaded.p1clean = true;
      }
      if (p1FullRes && (p1FullRes.ok || p1FullRes.status === 0)) {
         let d = await p1FullRes.json();
         appState.p1FullQuestions = Array.isArray(d) ? d : (d.questions || []);
         appState.p1FullQuestions.forEach(q => { q.unit = normalizeUnit(q.unit); });
         appState.dataLoaded.p1full = true;
      }

      document.getElementById('loader-modal').classList.add('fade-out');
      setTimeout(() => document.getElementById('loader-modal').classList.add('hidden'), 500);

      let msgs = [];
      if (appState.dataLoaded.p2clean) msgs.push(`P2: ${appState.cleanQuestions.length}`);
      if (appState.dataLoaded.p1clean) msgs.push(`P1: ${appState.p1CleanQuestions.length}`);
      
      if (msgs.length) {
         showToast(`Loaded ${msgs.join(', ')} questions`, 'success');
      } else {
         if (window.location.protocol === 'file:') {
            showToast('Browsers block local file reading.', 'error');
            alert("Error: Modern browsers block local applications from reading JSON files directly from the disk for security reasons. \\n\\nPlease run this application using a local web server (like 'Live Server' extension in VS Code, or by running 'python -m http.server 8000').");
         } else {
            showToast('No question files found! Place JSON files in the same folder.', 'error');
         }
      }

      route('dashboard');
   } catch (error) {
      document.getElementById('loader-modal').classList.add('hidden');
      showToast('Error loading data.', 'error');
      console.error(error);
   }
}

// --- 5. PAPER TOGGLE ---
function switchPaper(paper) {
   appState.activePaper = paper;
   document.querySelectorAll('.paper-pill').forEach(p => p.classList.toggle('active', p.dataset.paper === paper));

   const conceptNav = document.getElementById('nav-concept-lab');
   if (paper === 'p1') conceptNav.classList.remove('hidden');
   else conceptNav.classList.add('hidden');

   // If switching to P2 while on concept lab, redirect
   if (paper === 'p2' && appState.currentView === 'concept-lab') {
      route('dashboard');
   } else {
      route(appState.currentView);
   }
}

document.querySelectorAll('.paper-pill').forEach(el => {
   el.addEventListener('click', () => switchPaper(el.dataset.paper));
});

// --- 6. ROUTING & VIEWS ---
function route(target) {
   document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.target === target);
   });
   document.querySelectorAll('.view-container').forEach(el => {
      if (el.id === 'view-' + target) { el.classList.remove('hidden'); el.classList.add('fade-in'); }
      else { el.classList.add('hidden'); el.classList.remove('fade-in'); }
   });
   appState.currentView = target;

   if (target === 'dashboard') renderDashboard();
   if (target === 'papers') renderPapersList();
   if (target === 'practice') renderPracticeConfig();
   if (target === 'progress') renderProgressCharts();
   if (target === 'flashcards') renderFlashcards();
   if (target === 'concept-lab') renderConceptLab();
}

window.appState = { router: route };

document.querySelectorAll('.nav-item').forEach(el => {
   el.addEventListener('click', () => route(el.dataset.target));
});

// --- 7. DASHBOARD ---
function renderDashboard() {
   const progress = getProgress();
   const flashcards = getFlashcards();
   const userLogs = Object.values(progress);
   const attempted = userLogs.length;
   const correct = userLogs.filter(L => L.correct).length;
   const acc = attempted ? Math.round((correct / attempted) * 100) : 0;

   document.getElementById('stat-attempted').innerText = attempted;
   document.getElementById('stat-accuracy').innerText = acc + '%';
   document.getElementById('stat-streak').innerText = appState.streak.current + ' days';
   document.getElementById('stat-flashcards').innerText = flashcards.length;

   const subtitle = document.getElementById('dashboard-subtitle');
   subtitle.innerText = appState.activePaper === 'p1'
      ? 'Paper I — General Aptitude' : 'Paper II — English Literature';

   // Recent activity
   const sessions = getSessions();
   const actList = document.getElementById('recent-activity-list');
   actList.innerHTML = '';
   if (sessions.length === 0) {
      actList.innerHTML = '<div class="text-muted" style="font-size:0.9rem;">No recent sessions yet. Start practicing!</div>';
   } else {
      sessions.slice(-5).reverse().forEach(s => {
         const d = new Date(s.date);
         const pct = s.total ? Math.round((s.score / s.total) * 100) : 0;
         const div = document.createElement('div');
         div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-color);font-size:0.9rem;';
         div.innerHTML = `<span class="text-muted">${d.toLocaleDateString()} · ${s.mode}</span><span>${s.score}/${s.total} <span style="color:${pct>=70?'var(--green)':pct>=40?'var(--cyan)':'var(--red)'}">(${pct}%)</span></span>`;
         actList.appendChild(div);
      });
   }
}

// --- 8. PAPERS VIEW ---
let papersSubtab = 'by-paper';

function renderPapersList() {
   document.getElementById('paper-detail-view').classList.add('hidden');
   const grid = document.getElementById('papers-grid');
   const unitsGrid = document.getElementById('units-grid');
   const subtabs = document.getElementById('papers-subtabs');
   grid.classList.remove('hidden');
   grid.innerHTML = '';
   unitsGrid.classList.add('hidden');

   // Show subtabs only for Paper 1
   if (appState.activePaper === 'p1') {
      subtabs.classList.remove('hidden');
   } else {
      subtabs.classList.add('hidden');
      papersSubtab = 'by-paper';
   }

   if (appState.activePaper === 'p1' && papersSubtab === 'by-unit') {
      grid.classList.add('hidden');
      renderUnitsGrid();
      return;
   }

   const qs = getCleanQuestions();
   const progress = getProgress();
   const papersMap = {};
   qs.forEach(q => {
      if (!papersMap[q.paper]) papersMap[q.paper] = { count: 0, qs: [] };
      papersMap[q.paper].count++;
      papersMap[q.paper].qs.push(q);
   });

   Object.keys(papersMap).forEach(paperName => {
      const p = papersMap[paperName];
      const div = document.createElement('div');
      div.className = 'card paper-card';
      let completeCount = 0;
      p.qs.forEach(q => { if (progress[q.id] && progress[q.id].attempted) completeCount++; });
      const pct = Math.round((completeCount / p.count) * 100) || 0;
      div.innerHTML = `
        <h3>${paperName}</h3>
        <div class="paper-meta"><span>${p.count} Questions</span><span>${pct}% Done</span></div>
        <svg class="paper-ring"><circle class="ring-bg" cx="20" cy="20" r="16"></circle>
        <circle class="ring-fg" cx="20" cy="20" r="16" stroke-dasharray="100 100" stroke-dashoffset="${100-pct}" stroke="${pct>70?'var(--green)':pct>0?'var(--cyan)':'var(--text-muted)'}"></circle></svg>`;
      div.onclick = () => renderPaperDetail(paperName, p.qs);
      grid.appendChild(div);
   });
}

// Papers subtab click handlers
document.querySelectorAll('.papers-subtab').forEach(el => {
   el.addEventListener('click', () => {
      papersSubtab = el.dataset.subtab;
      document.querySelectorAll('.papers-subtab').forEach(t => t.classList.toggle('active', t.dataset.subtab === papersSubtab));
      renderPapersList();
   });
});

// Unit grid for Paper 1
function renderUnitsGrid() {
   const unitsGrid = document.getElementById('units-grid');
   unitsGrid.classList.remove('hidden');
   unitsGrid.innerHTML = '';

   const qs = getCleanQuestions();
   const progress = getProgress();
   const unitMap = {};
   qs.forEach(q => {
      const u = q.unit || 'Unknown';
      if (!unitMap[u]) unitMap[u] = [];
      unitMap[u].push(q);
   });

   UNIT_ORDER.forEach(unitName => {
      const uqs = unitMap[unitName] || [];
      if (uqs.length === 0) return;
      let done = 0;
      uqs.forEach(q => { if (progress[q.id] && progress[q.id].attempted) done++; });
      const pct = Math.round((done / uqs.length) * 100) || 0;

      const div = document.createElement('div');
      div.className = 'card unit-card';
      div.innerHTML = `
        <div class="unit-icon">${UNIT_ICONS[unitName] || '📝'}</div>
        <h3>${unitName}</h3>
        <div class="paper-meta"><span>${uqs.length} Questions</span><span>${pct}% Done</span></div>
        <svg class="paper-ring"><circle class="ring-bg" cx="20" cy="20" r="16"></circle>
        <circle class="ring-fg" cx="20" cy="20" r="16" stroke-dasharray="100 100" stroke-dashoffset="${100-pct}" stroke="${pct>70?'var(--green)':pct>40?'var(--cyan)':'var(--text-muted)'}"></circle></svg>`;
      div.onclick = () => renderUnitDetail(unitName, uqs);
      unitsGrid.appendChild(div);
   });
}

function renderUnitDetail(unitName, questions) {
   // Sort by paper date then question number
   questions.sort((a, b) => {
      if (a.paper < b.paper) return -1;
      if (a.paper > b.paper) return 1;
      return a.question_number - b.question_number;
   });
   renderPaperDetail(unitName, questions, true);
}

function renderPaperDetail(paperName, questions, isUnit = false) {
   document.getElementById('papers-grid').classList.add('hidden');
   document.getElementById('units-grid').classList.add('hidden');
   document.getElementById('papers-subtabs').classList.add('hidden');
   document.getElementById('paper-detail-view').classList.remove('hidden');
   document.getElementById('paper-detail-title').innerText = paperName;
   document.getElementById('paper-detail-subtitle').innerText = `${questions.length} Questions`;

   appState.activePaperQuestions = questions;
   appState._isUnitView = isUnit;

   const list = document.getElementById('paper-questions-list');
   list.innerHTML = '';
   const progress = getProgress();

   questions.forEach((q, idx) => {
      const div = document.createElement('div');
      div.className = `q-mini-card ${appState.activeQuestionId === q.id ? 'active' : ''}`;
      div.id = `q-list-item-${q.id}`;
      let prog = progress[q.id];
      let statusClass = prog && prog.attempted ? (prog.correct ? 'correct' : 'wrong') : '';
      const words = q.question.split(' ').slice(0, 8).join(' ') + '...';

      let topicChip = '';
      if (isUnit && q.topic) {
         const t = q.topic.length > 30 ? q.topic.substring(0, 30) + '…' : q.topic;
         topicChip = `<span class="topic-chip">${t}</span>`;
      }

      div.innerHTML = `
        <div class="q-status-dot ${statusClass}"></div>
        <div><strong>Q${q.question_number}</strong>${topicChip}<br><span class="text-muted">${words}</span></div>`;
      div.onclick = () => renderSingleQuestion(q, idx);
      list.appendChild(div);
   });

   renderSingleQuestion(questions[0], 0);
   updatePaperScore();
}

function renderSingleQuestion(q, index) {
   appState.activeQuestionId = q.id;
   document.querySelectorAll('.q-mini-card').forEach(el => el.classList.remove('active'));
   const activeEl = document.getElementById(`q-list-item-${q.id}`);
   if (activeEl) { activeEl.classList.add('active'); activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }

   document.getElementById('pq-number').innerText = `Question ${q.question_number} / ${appState.activePaperQuestions.length}`;
   document.getElementById('pq-text').innerText = q.question;

   const optsContainer = document.getElementById('pq-options');
   optsContainer.innerHTML = '';
   const progress = getProgress();
   const prog = progress[q.id];
   const alreadyAttempted = !!prog;

   ['a', 'b', 'c', 'd'].forEach(optKey => {
      const optText = q.options[optKey];
      if (!optText) return;
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      if (alreadyAttempted) btn.classList.add('disabled');
      if (alreadyAttempted) {
         if (optKey === q.answer) btn.classList.add('correct');
         if (prog.selected === optKey && optKey !== q.answer) btn.classList.add('wrong');
      }
      btn.innerHTML = `<span class="option-label">${optKey.toUpperCase()}</span> <span>${optText}</span>`;
      if (!alreadyAttempted) btn.onclick = () => handleAnswerInPaperView(q.id, optKey, q.answer, index);
      optsContainer.appendChild(btn);
   });

   const expContainer = document.getElementById('pq-explanation-container');
   if (alreadyAttempted) {
      expContainer.classList.remove('hidden');
      document.getElementById('pq-explanation').innerHTML = q.explanation ? q.explanation.replace(/\n/g, '<br>') : "No explanation available.";
   } else { expContainer.classList.add('hidden'); }

   document.getElementById('btn-pq-prev').onclick = () => { if (index > 0) renderSingleQuestion(appState.activePaperQuestions[index - 1], index - 1); };
   document.getElementById('btn-pq-next').onclick = () => { if (index < appState.activePaperQuestions.length - 1) renderSingleQuestion(appState.activePaperQuestions[index + 1], index + 1); };

   document.getElementById('btn-add-flashcard').onclick = () => createFlashcard(q);
   document.getElementById('btn-remove-flashcard').onclick = () => removeFlashcard(q);
   document.getElementById('btn-ai-explain').onclick = () => callGemini('explain', q);
   document.getElementById('btn-ai-similar').onclick = () => callGemini('similar', q);
   updateFlashcardButton(q);

   const aiBox = document.getElementById('pq-ai-response');
   if (aiBox) aiBox.classList.add('hidden');
}

function handleAnswerInPaperView(qId, selectedKey, correctKey, idx) {
   const isCorrect = selectedKey === correctKey;
   const progress = getProgress();
   progress[qId] = { attempted: true, correct: isCorrect, selected: selectedKey, lastAttempt: Date.now() };
   saveProgress();
   renderSingleQuestion(appState.activePaperQuestions[idx], idx);
   const dot = document.querySelector(`#q-list-item-${qId} .q-status-dot`);
   if (dot) dot.className = `q-status-dot ${isCorrect ? 'correct' : 'wrong'}`;
   updatePaperScore();
}

function updatePaperScore() {
   if (!appState.activePaperQuestions) return;
   const progress = getProgress();
   let answered = 0, correct = 0;
   appState.activePaperQuestions.forEach(q => {
      if (progress[q.id]) { answered++; if (progress[q.id].correct) correct++; }
   });
   document.getElementById('paper-session-score').innerText = `${correct} / ${answered}`;
}

document.getElementById('back-to-papers').onclick = renderPapersList;

// --- 9. PRACTICE TEST ---
let ptState = { questions: [], currentIndex: 0, mode: 'exam', timerInterval: null, timeLeft: 0, answers: {} };

document.getElementById('pt-num').oninput = e => {
   document.getElementById('pt-num-display').innerText = e.target.value;
   updatePtTimeCalc();
};
document.querySelectorAll('.mode-card').forEach(el => {
   el.onclick = () => {
      document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      updatePtTimeCalc();
   };
});

function updatePtTimeCalc() {
   const mode = document.querySelector('.mode-card.active').dataset.mode;
   const count = parseInt(document.getElementById('pt-num').value);
   const calcEl = document.getElementById('pt-time-calc');
   if (mode === 'exam') calcEl.innerText = `Simulating exam pressure: ${Math.ceil((count * 72) / 60)} minutes for ${count} questions.`;
   else if (mode === 'relaxed') calcEl.innerText = `Relaxed pace: ${Math.ceil((count * 216) / 60)} minutes for ${count} questions.`;
   else calcEl.innerText = `No time limit. Take as long as you need.`;
}

document.getElementById('btn-start-test').onclick = () => {
   const source = (document.querySelector('input[name="pt-source"]:checked') || {}).value || 'clean';
   const count = parseInt(document.getElementById('pt-num').value);
   const mode = document.querySelector('.mode-card.active').dataset.mode;

   let pool = source === 'clean' ? [...getCleanQuestions()] : [...getFullQuestions()];
   if (pool.length === 0) { showToast('No questions loaded for this paper!', 'error'); return; }
   if (source === 'full') pool = pool.filter(q => !q.flags || (!q.flags.includes('no_answer') && !q.flags.includes('empty_opts')));

   pool.sort(() => 0.5 - Math.random());
   ptState.questions = pool.slice(0, count);
   ptState.mode = mode;
   ptState.currentIndex = 0;
   ptState.answers = {};

   if (mode === 'exam') ptState.timeLeft = count * 72;
   else if (mode === 'relaxed') ptState.timeLeft = count * 216;
   else ptState.timeLeft = null;

   document.getElementById('practice-config').classList.add('hidden');
   document.getElementById('practice-active').classList.remove('hidden');

   if (ptState.timeLeft) {
      document.getElementById('pt-timer').style.display = 'block';
      clearInterval(ptState.timerInterval);
      ptState.timerInterval = setInterval(() => {
         ptState.timeLeft--;
         if (ptState.timeLeft <= 0) { clearInterval(ptState.timerInterval); submitPracticeTest(); }
         else {
            const m = Math.floor(ptState.timeLeft / 60).toString().padStart(2, '0');
            const s = (ptState.timeLeft % 60).toString().padStart(2, '0');
            const timerEl = document.getElementById('pt-timer');
            timerEl.innerText = `${m}:${s}`;
            const totalTime = mode === 'exam' ? count * 72 : count * 216;
            if (ptState.timeLeft < totalTime * 0.1) timerEl.style.color = 'var(--red)';
            else if (ptState.timeLeft < totalTime * 0.25) timerEl.style.color = 'var(--cyan)';
            else timerEl.style.color = 'var(--green)';
         }
      }, 1000);
   } else { document.getElementById('pt-timer').style.display = 'none'; }
   renderPracticeQuestion();
};

document.getElementById('btn-pt-quit').onclick = () => {
   if (confirm('Are you sure you want to quit?')) {
      clearInterval(ptState.timerInterval);
      document.getElementById('practice-active').classList.add('hidden');
      document.getElementById('practice-config').classList.remove('hidden');
   }
};

function renderPracticeQuestion() {
   if (!ptState.questions || ptState.questions.length === 0) return;
   const q = ptState.questions[ptState.currentIndex];
   document.getElementById('pt-q-current').innerText = ptState.currentIndex + 1;
   document.getElementById('pt-q-total').innerText = ptState.questions.length;
   document.getElementById('pt-q-text').innerText = q.question;

   const optsContainer = document.getElementById('pt-q-options');
   optsContainer.innerHTML = '';
   const userAttempt = ptState.answers[q.id];
   const showExp = (ptState.mode !== 'exam' && userAttempt);

   ['a', 'b', 'c', 'd'].forEach(optKey => {
      const optText = q.options[optKey];
      if (!optText) return;
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      if (showExp) btn.classList.add('disabled');
      if (userAttempt) {
         if (userAttempt === optKey) btn.classList.add(ptState.mode === 'exam' ? 'selected' : (optKey === q.answer ? 'correct' : 'wrong'));
         if (ptState.mode !== 'exam' && optKey === q.answer) btn.classList.add('correct');
      }
      btn.innerHTML = `<span class="option-label">${optKey.toUpperCase()}</span> <span>${optText}</span>`;
      if (!userAttempt || ptState.mode === 'exam') btn.onclick = () => { ptState.answers[q.id] = optKey; renderPracticeQuestion(); };
      optsContainer.appendChild(btn);
   });

   const expContainer = document.getElementById('pt-explanation-container');
   if (showExp && q.explanation) { expContainer.classList.remove('hidden'); document.getElementById('pt-explanation').innerHTML = q.explanation; }
   else { expContainer.classList.add('hidden'); }

   document.getElementById('btn-pt-prev').disabled = ptState.currentIndex === 0;
   if (ptState.currentIndex === ptState.questions.length - 1) {
      document.getElementById('btn-pt-next').innerText = 'Submit Test';
      document.getElementById('btn-pt-next').onclick = submitPracticeTest;
   } else {
      document.getElementById('btn-pt-next').innerText = 'Next';
      document.getElementById('btn-pt-next').onclick = () => { ptState.currentIndex++; renderPracticeQuestion(); };
   }
   document.getElementById('btn-pt-prev').onclick = () => { ptState.currentIndex--; renderPracticeQuestion(); };
   renderPalette();
}

function renderPalette() {
   const pal = document.getElementById('pt-palette');
   pal.innerHTML = '';
   ptState.questions.forEach((q, idx) => {
      const btn = document.createElement('button');
      btn.style.cssText = 'width:32px;height:32px;border-radius:4px;border:none;cursor:pointer;font-family:var(--font-mono);font-size:0.8rem;';
      btn.innerText = idx + 1;
      if (idx === ptState.currentIndex) { btn.style.outline = '2px solid var(--accent-color)'; btn.style.outlineOffset = '2px'; }
      if (ptState.answers[q.id]) {
         if (ptState.mode === 'exam') { btn.style.background = 'var(--accent-color)'; btn.style.color = '#fff'; }
         else { btn.style.background = ptState.answers[q.id] === q.answer ? 'var(--green)' : 'var(--red)'; btn.style.color = '#000'; }
      } else { btn.style.background = 'var(--surface2-color)'; btn.style.color = 'var(--text-main)'; }
      btn.onclick = () => { ptState.currentIndex = idx; renderPracticeQuestion(); };
      pal.appendChild(btn);
   });
}

function submitPracticeTest() {
   if (ptState.timerInterval) clearInterval(ptState.timerInterval);
   let correct = 0, wrong = 0, skipped = 0;
   const progress = getProgress();

   ptState.questions.forEach(q => {
      const ans = ptState.answers[q.id];
      if (!ans) skipped++; else if (ans === q.answer) correct++; else wrong++;
      if (ans && (!q.flags || q.flags.length === 0)) {
         progress[q.id] = { attempted: true, correct: ans === q.answer, selected: ans, lastAttempt: Date.now() };
      }
   });

   const sessions = getSessions();
   sessions.push({ date: Date.now(), score: correct, total: ptState.questions.length, mode: ptState.mode });
   saveProgress();
   saveSessions();

   const today = new Date().toDateString();
   if (appState.streak.lastStudyDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (appState.streak.lastStudyDate === yesterday) appState.streak.current++;
      else appState.streak.current = 1;
      appState.streak.lastStudyDate = today;
      saveState('streak', appState.streak);
   }

   document.getElementById('practice-active').classList.add('hidden');
   document.getElementById('practice-results').classList.remove('hidden');

   const acc = ptState.questions.length ? (correct / ptState.questions.length) * 100 : 0;
   const scoreEl = document.getElementById('pt-res-score');
   let currScore = 0;
   const targetScore = Math.round(acc);
   if (targetScore === 0) scoreEl.innerText = '0%';
   else {
      const inv = setInterval(() => {
         if (currScore >= targetScore) { clearInterval(inv); scoreEl.innerText = targetScore + '%'; return; }
         currScore++; scoreEl.innerText = currScore + '%';
      }, 1000 / targetScore);
   }

   document.getElementById('pt-res-sub').innerText = `You scored ${correct} out of ${ptState.questions.length}`;
   document.getElementById('pt-res-correct').innerText = correct;
   document.getElementById('pt-res-wrong').innerText = wrong;
   document.getElementById('pt-res-skipped').innerText = skipped;

   const rv = document.getElementById('pt-res-review');
   rv.innerHTML = '';
   ptState.questions.forEach((q, idx) => {
      const ans = ptState.answers[q.id];
      const div = document.createElement('div');
      div.className = 'card'; div.style.padding = '16px';
      div.innerHTML = `<div style="display:flex;gap:16px;"><div style="font-family:var(--font-mono);color:var(--text-muted);">${idx+1}.</div><div><div style="margin-bottom:8px;">${q.question}</div><div style="font-size:0.9rem;"><div><strong>Correct:</strong> ${q.options[q.answer]}</div>${ans?`<div><strong>Yours:</strong> <span class="${ans===q.answer?'text-green':'text-red'}">${q.options[ans]}</span></div>`:'<div class="text-muted">Skipped</div>'}</div>${q.explanation?`<div style="margin-top:12px;font-size:0.85rem;color:var(--text-muted);border-left:2px solid var(--border-color);padding-left:8px;">${q.explanation}</div>`:''}</div></div>`;
      rv.appendChild(div);
   });
}

document.getElementById('btn-pt-submit').onclick = submitPracticeTest;
document.getElementById('btn-pt-back-dash').onclick = () => {
   document.getElementById('practice-results').classList.add('hidden');
   document.getElementById('practice-config').classList.remove('hidden');
   window.appState.router('dashboard');
};
function renderPracticeConfig() { updatePtTimeCalc(); }

// --- 10. PROGRESS CHARTS ---
function renderProgressCharts() {
   const sess = [...getSessions()].slice(-20);
   const svg = document.getElementById('chart-accuracy');
   if (svg) {
      svg.innerHTML = '';
      if (sess.length < 2) { svg.innerHTML = '<text x="10" y="100" fill="gray">Not enough data yet.</text>'; }
      else {
         const w = 400, h = 200;
         let pathD = `M 0 ${h - (sess[0].score / sess[0].total) * h} `;
         sess.forEach((s, i) => {
            const x = (i / (sess.length - 1)) * w;
            const y = h - (s.score / s.total) * h;
            pathD += `L ${x} ${y} `;
            svg.innerHTML += `<circle cx="${x}" cy="${y}" r="4" fill="var(--cyan)" />`;
         });
         svg.innerHTML += `<path d="${pathD}" fill="none" stroke="var(--accent-color)" stroke-width="2" />`;
      }
   }

   const grid = document.getElementById('chart-streak');
   if (grid) {
      grid.innerHTML = '';
      grid.style.gridTemplateColumns = 'repeat(10, 1fr)';
      const today = new Date();
      const datesMap = {};
      getSessions().forEach(s => { const d = new Date(s.date).toDateString(); datesMap[d] = (datesMap[d] || 0) + s.total; });
      for (let i = 29; i >= 0; i--) {
         const d = new Date(today); d.setDate(d.getDate() - i);
         const ds = d.toDateString();
         const count = datesMap[ds] || 0;
         const div = document.createElement('div');
         div.style.cssText = 'width:100%;padding-top:100%;border-radius:4px;';
         if (count === 0) div.style.background = 'var(--surface2-color)';
         else if (count < 20) div.style.background = 'rgba(74,222,128,0.3)';
         else if (count < 50) div.style.background = 'rgba(74,222,128,0.6)';
         else div.style.background = 'var(--green)';
         div.title = `${ds}: ${count} questions`;
         grid.appendChild(div);
      }
   }
}

// --- 11. FLASHCARDS ---
let fcSelectedIds = new Set();

function renderFlashcards() {
   const flashcards = getFlashcards();
   const now = Date.now();
   const dueCards = flashcards.filter(f => f.nextReview <= now);
   document.getElementById('fc-due-count').innerText = dueCards.length;

   if (dueCards.length === 0) {
      document.getElementById('fc-study-area').classList.add('hidden');
      document.getElementById('fc-empty-state').classList.remove('hidden');
   } else {
      document.getElementById('fc-study-area').classList.remove('hidden');
      document.getElementById('fc-empty-state').classList.add('hidden');
      const cardEl = document.getElementById('active-flashcard');
      cardEl.classList.remove('flipped');
      document.getElementById('fc-actions').classList.add('hidden');
      const c = dueCards[0];
      appState.activeFlashcard = c;
      document.getElementById('fc-front-text').innerHTML = c.front;
      document.getElementById('fc-back-text').innerHTML = c.back;
      cardEl.onclick = () => { cardEl.classList.add('flipped'); document.getElementById('fc-actions').classList.remove('hidden'); cardEl.onclick = null; };
   }
   renderFCLibrary();
}

function renderFCLibrary() {
   const flashcards = getFlashcards();
   const lib = document.getElementById('fc-library');
   const totalEl = document.getElementById('fc-total-count');
   if (!lib) return;
   lib.innerHTML = '';
   totalEl.innerText = `(${flashcards.length} cards)`;

   const delBtn = document.getElementById('btn-fc-delete-selected');
   delBtn.style.display = fcSelectedIds.size > 0 ? 'inline-flex' : 'none';
   delBtn.innerText = `Delete Selected (${fcSelectedIds.size})`;

   if (flashcards.length === 0) {
      lib.innerHTML = '<div class="text-muted" style="padding:24px;text-align:center;">No flashcards yet. Add them from the Papers view!</div>';
      return;
   }

   const bucketDefs = [
      { key: 'hard', label: 'Hard', subtitle: 'Needs more work', icon: '\u{1F534}', color: '#f87171', borderColor: 'rgba(248,113,113,0.5)' },
      { key: 'good', label: 'Good', subtitle: 'Getting there', icon: '\u{1F7E1}', color: '#facc15', borderColor: 'rgba(250,204,21,0.5)' },
      { key: 'easy', label: 'Easy', subtitle: 'Mastered', icon: '\u{1F7E2}', color: '#4ade80', borderColor: 'rgba(74,222,128,0.5)' },
      { key: 'none', label: 'New', subtitle: 'Not reviewed yet', icon: '\u26AA', color: '#00d2ff', borderColor: 'rgba(0,210,255,0.5)' }
   ];

   const bucketCounts = { hard: 0, good: 0, easy: 0, none: 0 };
   flashcards.forEach(fc => { const r = fc.lastResponse || 'none'; if (bucketCounts[r] !== undefined) bucketCounts[r]++; else bucketCounts.none++; });

   const grid = document.createElement('div');
   grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:16px;';
   bucketDefs.forEach(bdef => {
      const count = bucketCounts[bdef.key];
      const tile = document.createElement('div');
      tile.className = 'card';
      tile.style.cssText = `cursor:pointer;text-align:center;padding:28px 16px;border:2px solid ${bdef.borderColor};transition:transform 0.3s,box-shadow 0.3s;`;
      tile.innerHTML = `<div style="font-size:2.5rem;margin-bottom:8px;">${bdef.icon}</div><h3 style="margin:0 0 4px 0;color:${bdef.color};">${bdef.label}</h3><div class="text-muted" style="font-size:0.8rem;margin-bottom:12px;">${bdef.subtitle}</div><div style="font-size:2rem;font-weight:700;color:${bdef.color};">${count}</div><div class="text-muted" style="font-size:0.75rem;">cards</div>`;
      tile.onmouseenter = () => { tile.style.transform = 'translateY(-6px)'; tile.style.boxShadow = `0 12px 32px ${bdef.borderColor}`; };
      tile.onmouseleave = () => { tile.style.transform = ''; tile.style.boxShadow = ''; };
      tile.onclick = () => renderBucketDetail(bdef);
      grid.appendChild(tile);
   });
   lib.appendChild(grid);
}

function renderBucketDetail(bdef) {
   const flashcards = getFlashcards();
   const lib = document.getElementById('fc-library');
   lib.innerHTML = '';
   const cards = flashcards.filter(fc => (fc.lastResponse || 'none') === bdef.key);

   const header = document.createElement('div');
   header.style.cssText = 'display:flex;align-items:center;gap:16px;margin-bottom:24px;';
   header.innerHTML = `<button class="btn" id="fc-back-to-buckets" style="padding:8px 16px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Back</button><div><h2 style="margin:0;color:${bdef.color};">${bdef.icon} ${bdef.label}</h2><span class="text-muted" style="font-size:0.85rem;">${cards.length} cards</span></div>`;
   lib.appendChild(header);
   header.querySelector('#fc-back-to-buckets').onclick = () => renderFCLibrary();

   if (cards.length === 0) {
      const empty = document.createElement('div'); empty.className = 'card';
      empty.style.cssText = 'text-align:center;padding:48px;';
      empty.innerHTML = '<h3 class="text-muted">No cards in this bucket</h3>';
      lib.appendChild(empty); return;
   }

   const now = Date.now();
   const otherBuckets = ['hard','good','easy','none'].filter(k => k !== bdef.key);
   const bucketLabels = { hard: '\u{1F534} Hard', good: '\u{1F7E1} Good', easy: '\u{1F7E2} Easy', none: '\u26AA New' };
   const bucketColors = { hard: '#f87171', good: '#facc15', easy: '#4ade80', none: '#00d2ff' };

   cards.forEach(fc => {
      const isDue = fc.nextReview <= now;
      const nextDate = new Date(fc.nextReview);
      const nextStr = isDue ? 'Due Now' : nextDate.toLocaleDateString();
      const div = document.createElement('div'); div.className = 'card';
      div.style.cssText = `padding:16px;border-left:4px solid ${bdef.borderColor};margin-bottom:4px;`;
      div.innerHTML = `<div style="display:flex;align-items:flex-start;gap:12px;"><div style="flex:1;min-width:0;"><div style="font-weight:500;font-size:0.95rem;line-height:1.4;margin-bottom:6px;">${fc.front.substring(0,120)}${fc.front.length>120?'...':''}</div><div style="display:flex;gap:14px;font-size:0.78rem;color:var(--text-muted);"><span style="color:var(--green);">✓ ${fc.rightCount||0}</span><span style="color:var(--red);">✗ ${fc.wrongCount||0}</span><span>Next: ${nextStr}</span></div></div><div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;">${otherBuckets.map(bk=>`<button class="btn fc-move-btn" data-move="${bk}" style="font-size:0.68rem;padding:4px 8px;color:${bucketColors[bk]};border-color:${bucketColors[bk]}44;">${bucketLabels[bk]}</button>`).join('')}<button class="btn fc-rm-btn" style="font-size:0.72rem;padding:5px 8px;color:var(--red);border-color:rgba(248,113,113,0.3);">✕</button></div></div>`;

      div.querySelectorAll('.fc-move-btn').forEach(btn => {
         btn.onclick = () => { fc.lastResponse = btn.dataset.move; saveFlashcards(); showToast(`Moved to ${bucketLabels[btn.dataset.move]}`, 'success'); renderBucketDetail(bdef); };
      });
      div.querySelector('.fc-rm-btn').onclick = () => {
         const fcs = getFlashcards();
         setFlashcards(fcs.filter(f => f.id !== fc.id));
         saveFlashcards(); showToast('Removed.', 'info'); renderBucketDetail(bdef);
      };
      lib.appendChild(div);
   });
}

document.getElementById('btn-fc-delete-selected').onclick = () => {
   if (fcSelectedIds.size === 0) return;
   if (!confirm(`Delete ${fcSelectedIds.size} selected flashcards?`)) return;
   setFlashcards(getFlashcards().filter(f => !fcSelectedIds.has(f.id)));
   fcSelectedIds.clear();
   saveFlashcards(); renderFlashcards(); showToast('Deleted.', 'success');
};

window.handleFCResponse = function (quality) {
   const c = appState.activeFlashcard;
   if (!c) return;
   c.lastResponse = quality;
   if (quality === 'hard') { c.wrongCount = (c.wrongCount || 0) + 1; c.ease = Math.max(1.3, c.ease - 0.2); c.interval = 0; }
   else if (quality === 'good') { c.rightCount = (c.rightCount || 0) + 1; c.interval = c.interval === 0 ? 1 : Math.round(c.interval * c.ease); }
   else if (quality === 'easy') { c.rightCount = (c.rightCount || 0) + 1; c.ease += 0.15; c.interval = c.interval === 0 ? 3 : Math.round(c.interval * c.ease * 1.3); }
   if (c.interval === 0) c.nextReview = Date.now() + 10 * 60 * 1000;
   else c.nextReview = Date.now() + c.interval * 86400000;
   saveFlashcards(); renderFlashcards();
};

function createFlashcard(q) {
   const flashcards = getFlashcards();
   if (flashcards.find(f => f.qId === q.id)) { showToast('Already exists!', 'info'); return; }
   flashcards.push({ id: 'fc_' + Date.now(), qId: q.id, front: q.question, back: `<strong>${q.options[q.answer]}</strong><br><br>${q.explanation || ''}`, nextReview: Date.now(), ease: 2.5, interval: 0, rightCount: 0, wrongCount: 0, lastResponse: 'none' });
   saveFlashcards(); showToast('Added to Flashcards!', 'success');
   document.getElementById('stat-flashcards').innerText = flashcards.length;
   updateFlashcardButton(q);
}

function removeFlashcard(q) {
   setFlashcards(getFlashcards().filter(f => f.qId !== q.id));
   saveFlashcards(); showToast('Removed.', 'info');
   document.getElementById('stat-flashcards').innerText = getFlashcards().length;
   updateFlashcardButton(q);
}

function updateFlashcardButton(q) {
   const addBtn = document.getElementById('btn-add-flashcard');
   const removeBtn = document.getElementById('btn-remove-flashcard');
   if (!addBtn) return;
   const exists = getFlashcards().find(f => f.qId === q.id);
   if (exists) { addBtn.innerText = '✓ Added'; addBtn.classList.add('disabled'); addBtn.style.opacity = '0.6'; if (removeBtn) removeBtn.classList.remove('hidden'); }
   else { addBtn.innerText = 'Add to Flashcards'; addBtn.classList.remove('disabled'); addBtn.style.opacity = '1'; if (removeBtn) removeBtn.classList.add('hidden'); }
}

// --- 12. GEMINI AI ---
async function callGemini(mode, q) {
   const apiKey = appState.settings.geminiKey;
   if (!apiKey) { showToast('Add Gemini API key in settings', 'error'); return; }
   let box = document.getElementById('pq-ai-response');
   if (box) { box.classList.remove('hidden'); box.innerHTML = `<div class="ai-msg ai"><div class="ai-loader"></div> Generating...</div>`; }

   const paperContext = appState.activePaper === 'p1' ? 'UGC NET Paper 1 General Aptitude' : 'UGC NET Paper 2 English Literature';
   const prompt = mode === 'explain'
      ? `Explain this ${paperContext} question simply. Question: "${q.question}" Options: ${JSON.stringify(q.options)} Answer: "${q.answer}". Explanation: "${q.explanation}". Format in clean HTML.`
      : `Generate 1 similar MCQ for ${paperContext}. Output ONLY valid JSON: { "question": "...", "options": {"a":"...", "b":"...", "c":"...", "d":"..."}, "answer": "a", "explanation": "..." }. No markdown. Topic: ${q.question}`;

   try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
         method: 'POST', headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7 } })
      });
      const data = await res.json();
      let text = data.candidates[0].content.parts[0].text;
      if (box) {
         if (mode === 'explain') { box.innerHTML = `<div class="ai-msg ai"><strong>AI Explanation:</strong><br>${text}</div>`; }
         else {
            let parsed; try { parsed = JSON.parse(text); } catch (e) { parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '')); }
            box.innerHTML = `<div class="ai-msg ai"><strong>AI Similar Q:</strong><br><br><strong>Q:</strong> ${parsed.question}<br>a) ${parsed.options.a}<br>b) ${parsed.options.b}<br>c) ${parsed.options.c}<br>d) ${parsed.options.d}<br><br><strong class="text-green">Ans: ${parsed.answer}</strong><br>${parsed.explanation}</div>`;
         }
      }
   } catch (err) { if (box) box.innerHTML = `<div class="ai-msg ai" style="border-color:var(--red);">AI failed. Check API key.</div>`; }
}

document.getElementById('btn-generate-ai-fc').onclick = () => {
   const apiKey = appState.settings.geminiKey;
   if (!apiKey) { showToast('Add Gemini API key in settings', 'error'); return; }
   const qs = getCleanQuestions();
   if (qs.length === 0) { showToast('No questions loaded!', 'error'); return; }

   const papersMap = {};
   qs.forEach(q => { if (!papersMap[q.paper]) papersMap[q.paper] = []; papersMap[q.paper].push(q); });

   const overlay = document.createElement('div');
   overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
   const modal = document.createElement('div');
   modal.style.cssText = 'background:var(--surface-color);backdrop-filter:blur(20px);border:1px solid var(--border-color);border-radius:16px;padding:32px;max-width:500px;width:90%;max-height:70vh;display:flex;flex-direction:column;';
   modal.innerHTML = `<h2 style="margin:0 0 8px 0;color:var(--cyan);">Generate AI Flashcards</h2><p class="text-muted" style="margin-bottom:16px;font-size:0.9rem;">Pick a paper for context.</p><div id="ai-fc-paper-list" style="overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:8px;"></div><button class="btn" style="margin-top:16px;width:100%;" id="ai-fc-cancel">Cancel</button>`;
   overlay.appendChild(modal);
   document.body.appendChild(overlay);

   const listEl = modal.querySelector('#ai-fc-paper-list');
   Object.keys(papersMap).forEach(paperName => {
      const btn = document.createElement('button'); btn.className = 'btn';
      btn.style.cssText = 'text-align:left;justify-content:flex-start;width:100%;';
      btn.innerText = `${paperName} (${papersMap[paperName].length} Qs)`;
      btn.onclick = async () => { overlay.remove(); await generateAIFlashcards(papersMap[paperName], apiKey); };
      listEl.appendChild(btn);
   });
   modal.querySelector('#ai-fc-cancel').onclick = () => overlay.remove();
   overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
};

async function generateAIFlashcards(questions, apiKey) {
   const withExp = questions.filter(q => q.explanation && q.explanation.length > 20);
   if (withExp.length === 0) { showToast('No explanations available.', 'error'); return; }
   const q = withExp[Math.floor(Math.random() * withExp.length)];
   showToast('Generating AI flashcards...', 'info');
   const btn = document.getElementById('btn-generate-ai-fc');
   const origText = btn.innerText; btn.innerText = 'Generating...'; btn.classList.add('disabled');
   try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
         method: 'POST', headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ contents: [{ parts: [{ text: `Generate 3 flashcards. Output ONLY valid JSON array: [{"front":"term","back":"definition"}]. No markdown. Context: ${q.explanation}` }] }], generationConfig: { temperature: 0.7 } })
      });
      const data = await res.json();
      if (data.error) { showToast('API Error: ' + data.error.message, 'error'); btn.innerText = origText; btn.classList.remove('disabled'); return; }
      if (!data.candidates || !data.candidates[0]) { showToast('Unexpected response.', 'error'); btn.innerText = origText; btn.classList.remove('disabled'); return; }
      let text = data.candidates[0].content.parts[0].text;
      let parsed; try { parsed = JSON.parse(text); } catch (e) { parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim()); }
      if (!Array.isArray(parsed)) { showToast('AI returned unexpected format.', 'error'); return; }
      const flashcards = getFlashcards();
      parsed.forEach(pc => { flashcards.push({ id: 'fc_ai_' + Date.now() + Math.random(), qId: 'ai_' + Date.now(), front: pc.front, back: pc.back, nextReview: Date.now(), ease: 2.5, interval: 0 }); });
      saveFlashcards(); renderFlashcards(); showToast(`Added ${parsed.length} AI cards!`, 'success');
   } catch (err) { showToast('Failed: ' + err.message, 'error'); }
   btn.innerText = origText; btn.classList.remove('disabled');
}

// --- 13. SETTINGS ---
document.getElementById('theme-toggle').onclick = () => {
   appState.settings.theme = appState.settings.theme === 'dark' ? 'light' : 'dark';
   applySettings(); saveState('settings', appState.settings);
};
document.getElementById('btn-save-settings').onclick = () => {
   appState.user.name = document.getElementById('setting-name').value || 'Jessica';
   appState.settings.geminiKey = document.getElementById('setting-gemini-key').value || null;
   saveState('user', appState.user); saveState('settings', appState.settings);
   applySettings(); showToast('Settings saved!', 'success');
};
document.getElementById('btn-reset-data').onclick = () => {
   if (confirm('Reset ALL progress? This cannot be undone.')) { localStorage.clear(); location.reload(); }
};

// --- 14. PARTICLES ---
function initParticles() {
   const canvas = document.getElementById('particleCanvas');
   if (!canvas) return;
   const ctx = canvas.getContext('2d');
   let width, height, particles = [];
   function resize() { width = window.innerWidth; height = window.innerHeight; canvas.width = width; canvas.height = height; }
   window.addEventListener('resize', resize); resize();
   for (let i = 0; i < 50; i++) particles.push({ x: Math.random()*width, y: Math.random()*height, vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5, radius: Math.random()*2+1 });
   function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for (let i = 0; i < particles.length; i++) {
         let p = particles[i]; p.x += p.vx; p.y += p.vy;
         if (p.x < 0 || p.x > width) p.vx *= -1;
         if (p.y < 0 || p.y > height) p.vy *= -1;
         ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
         for (let j = i + 1; j < particles.length; j++) {
            let p2 = particles[j]; let dist = Math.hypot(p.x - p2.x, p.y - p2.y);
            if (dist < 120) { ctx.beginPath(); ctx.strokeStyle = `rgba(255,255,255,${0.1 - dist/1200})`; ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); }
         }
      }
      requestAnimationFrame(draw);
   }
   draw();
}

// ============================================================================
// ==================== CONCEPT LAB (Paper I Only) ============================
// ============================================================================

let conceptLabState = { activeUnit: null, activeTab: 'learn' };

function renderConceptLab() {
   const panel = document.getElementById('concept-units-panel');
   panel.innerHTML = '';

   const qs = appState.p1CleanQuestions;
   const unitQCounts = {};
   qs.forEach(q => { const u = q.unit || 'Unknown'; unitQCounts[u] = (unitQCounts[u] || 0) + 1; });

   UNIT_ORDER.forEach((unitName, idx) => {
      const qCount = unitQCounts[unitName] || 0;
      const cp = appState.conceptProgress[unitName] || { visited: false, conceptsCompleted: [] };
      const totalConcepts = getConceptCount(unitName);
      const done = cp.conceptsCompleted ? cp.conceptsCompleted.length : 0;
      const pct = totalConcepts ? Math.round((done / totalConcepts) * 100) : 0;

      const tile = document.createElement('div');
      tile.className = `unit-tile ${conceptLabState.activeUnit === unitName ? 'active' : ''}`;
      tile.innerHTML = `
        <div class="unit-tile-icon">${UNIT_ICONS[unitName]}</div>
        <div class="unit-tile-info">
          <div class="unit-tile-name">${unitName}</div>
          <div class="unit-tile-meta">${qCount} Qs · ${pct}% learned</div>
        </div>
        <svg class="unit-tile-progress" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3"/>
          <circle cx="18" cy="18" r="14" fill="none" stroke="${pct>70?'var(--green)':pct>0?'var(--cyan)':'var(--text-muted)'}" stroke-width="3" stroke-dasharray="${pct} ${100-pct}" stroke-dashoffset="25" stroke-linecap="round" transform="rotate(-90 18 18)"/>
        </svg>`;
      tile.onclick = () => { conceptLabState.activeUnit = unitName; conceptLabState.activeTab = 'learn'; renderConceptLab(); };
      panel.appendChild(tile);
   });

   // Right panel
   const content = document.getElementById('concept-content-panel');
   if (!conceptLabState.activeUnit) {
      content.innerHTML = '<div class="card" style="text-align:center;padding:60px 24px;"><h3 class="text-muted">Select a unit from the left panel</h3><p class="text-muted" style="margin-top:12px;">Each unit has Learn modules and Practice questions.</p></div>';
      return;
   }

   const unitName = conceptLabState.activeUnit;
   content.innerHTML = '';

   // Tabs
   const tabs = document.createElement('div');
   tabs.className = 'concept-tabs';
   tabs.innerHTML = `<button class="concept-tab ${conceptLabState.activeTab==='learn'?'active':''}" data-ctab="learn">Learn</button><button class="concept-tab ${conceptLabState.activeTab==='practice'?'active':''}" data-ctab="practice">Practice</button>`;
   tabs.querySelectorAll('.concept-tab').forEach(t => {
      t.onclick = () => { conceptLabState.activeTab = t.dataset.ctab; renderConceptLab(); };
   });
   content.appendChild(tabs);

   if (conceptLabState.activeTab === 'learn') {
      renderLearnTab(unitName, content);
   } else {
      renderPracticeTab(unitName, content);
   }
}

function getConceptCount(unitName) {
   const counts = {
      'Teaching Aptitude': 4, 'Research Aptitude': 4, 'Reading Comprehension': 2,
      'Communication': 3, 'Mathematical Reasoning': 6, 'Logical Reasoning': 6,
      'Data Interpretation': 6, 'ICT': 4, 'People & Environment': 4, 'Higher Education': 4
   };
   return counts[unitName] || 0;
}

function markConceptDone(unitName, conceptName, isDone) {
   if (!appState.conceptProgress[unitName]) appState.conceptProgress[unitName] = { visited: true, conceptsCompleted: [] };
   const cp = appState.conceptProgress[unitName];
   if (isDone && !cp.conceptsCompleted.includes(conceptName)) cp.conceptsCompleted.push(conceptName);
   else if (!isDone) cp.conceptsCompleted = cp.conceptsCompleted.filter(c => c !== conceptName);
   saveState('concept_progress', appState.conceptProgress);
}

function makeConceptCard(unitName, conceptName, bodyHTML) {
   const cp = appState.conceptProgress[unitName] || { conceptsCompleted: [] };
   const isDone = cp.conceptsCompleted && cp.conceptsCompleted.includes(conceptName);
   const card = document.createElement('div');
   card.className = 'card concept-card';
   card.innerHTML = `
     <div class="concept-title">
       <span>${conceptName}</span>
       <label class="concept-done-check ${isDone?'checked':''}">
         <input type="checkbox" ${isDone?'checked':''}>Done
       </label>
     </div>
     <div class="concept-body">${bodyHTML}</div>`;
   card.querySelector('input[type="checkbox"]').onchange = (e) => {
      markConceptDone(unitName, conceptName, e.target.checked);
      const label = card.querySelector('.concept-done-check');
      label.classList.toggle('checked', e.target.checked);
      // Update unit tile progress
      const tiles = document.querySelectorAll('.unit-tile');
      renderConceptLab();
   };
   return card;
}

function renderPracticeTab(unitName, container) {
   const qs = appState.p1CleanQuestions.filter(q => q.unit === unitName);
   if (qs.length === 0) {
      container.innerHTML += '<div class="card" style="text-align:center;padding:40px;"><h3 class="text-muted">No practice questions for this unit yet.</h3></div>';
      return;
   }

   // Group by topic
   const topicMap = {};
   qs.forEach(q => {
      const t = q.topic || 'General';
      if (!topicMap[t]) topicMap[t] = [];
      topicMap[t].push(q);
   });

   const wrapper = document.createElement('div');
   wrapper.className = 'paper-detail-layout';
   wrapper.style.height = 'calc(100vh - 200px)';

   const sidebar = document.createElement('div');
   sidebar.className = 'questions-sidebar';
   const viewer = document.createElement('div');
   viewer.className = 'card question-viewer';

   let allQs = [];
   Object.keys(topicMap).forEach(topic => {
      const header = document.createElement('div');
      header.style.cssText = 'font-size:0.78rem;color:var(--cyan);font-weight:600;padding:8px 12px 4px;text-transform:uppercase;letter-spacing:0.05em;';
      header.innerText = topic;
      sidebar.appendChild(header);
      topicMap[topic].forEach(q => allQs.push(q));

      topicMap[topic].forEach(q => {
         const progress = getProgress();
         const prog = progress[q.id];
         const statusClass = prog && prog.attempted ? (prog.correct ? 'correct' : 'wrong') : '';
         const div = document.createElement('div');
         div.className = 'q-mini-card';
         div.id = `cq-list-${q.id}`;
         const words = q.question.split(' ').slice(0, 7).join(' ') + '...';
         div.innerHTML = `<div class="q-status-dot ${statusClass}"></div><div><strong>Q${q.question_number}</strong><br><span class="text-muted">${words}</span></div>`;
         div.onclick = () => renderConceptPracticeQ(q, allQs, viewer, sidebar);
         sidebar.appendChild(div);
      });
   });

   wrapper.appendChild(sidebar);
   wrapper.appendChild(viewer);
   container.appendChild(wrapper);

   if (allQs.length > 0) renderConceptPracticeQ(allQs[0], allQs, viewer, sidebar);
}

function renderConceptPracticeQ(q, allQs, viewer, sidebar) {
   const idx = allQs.indexOf(q);
   sidebar.querySelectorAll('.q-mini-card').forEach(el => el.classList.remove('active'));
   const activeEl = document.getElementById(`cq-list-${q.id}`);
   if (activeEl) { activeEl.classList.add('active'); activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }

   const progress = getProgress();
   const prog = progress[q.id];
   const attempted = !!prog;

   viewer.innerHTML = `
     <div class="text-muted" style="font-family:var(--font-mono);margin-bottom:8px;">Question ${q.question_number}</div>
     <div class="q-text">${q.question}</div>
     <div class="options-grid" id="cq-opts"></div>
     <div id="cq-exp" class="${attempted?'':'hidden'} explanation-box" style="margin-top:32px;">
       <strong class="text-cyan">Explanation:</strong>
       <p style="margin-top:8px;">${q.explanation ? q.explanation.replace(/\n/g,'<br>') : 'No explanation.'}</p>
     </div>
     <div style="display:flex;justify-content:space-between;margin-top:40px;">
       <button class="btn" id="cq-prev">Previous</button>
       <button class="btn" id="cq-next">Next</button>
     </div>`;

   const optsEl = viewer.querySelector('#cq-opts');
   ['a','b','c','d'].forEach(k => {
      if (!q.options[k]) return;
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      if (attempted) { btn.classList.add('disabled'); if (k === q.answer) btn.classList.add('correct'); if (prog.selected === k && k !== q.answer) btn.classList.add('wrong'); }
      btn.innerHTML = `<span class="option-label">${k.toUpperCase()}</span> <span>${q.options[k]}</span>`;
      if (!attempted) btn.onclick = () => {
         const p = getProgress();
         p[q.id] = { attempted: true, correct: k === q.answer, selected: k, lastAttempt: Date.now() };
         saveProgress();
         renderConceptPracticeQ(q, allQs, viewer, sidebar);
         const dot = document.querySelector(`#cq-list-${q.id} .q-status-dot`);
         if (dot) dot.className = `q-status-dot ${k === q.answer ? 'correct' : 'wrong'}`;
      };
      optsEl.appendChild(btn);
   });

   viewer.querySelector('#cq-prev').onclick = () => { if (idx > 0) renderConceptPracticeQ(allQs[idx-1], allQs, viewer, sidebar); };
   viewer.querySelector('#cq-next').onclick = () => { if (idx < allQs.length-1) renderConceptPracticeQ(allQs[idx+1], allQs, viewer, sidebar); };
}

// --- LEARN TAB RENDERERS ---
function renderLearnTab(unitName, container) {
   const renderers = {
      'Teaching Aptitude': renderTeachingAptitude,
      'Research Aptitude': renderResearchAptitude,
      'Reading Comprehension': renderReadingComprehension,
      'Communication': renderCommunication,
      'Mathematical Reasoning': renderMathReasoning,
      'Logical Reasoning': renderLogicalReasoning,
      'Data Interpretation': renderDataInterpretation,
      'ICT': renderICT,
      'People & Environment': renderEnvironment,
      'Higher Education': renderHigherEd
   };
   const fn = renderers[unitName];
   if (fn) fn(unitName, container);
   else container.innerHTML += '<div class="card"><p class="text-muted">Content coming soon.</p></div>';
}

// ==================== UNIT 1: TEACHING APTITUDE ====================
function renderTeachingAptitude(unitName, container) {
   // 1. Bloom's Taxonomy
   const bloomLevels = [
      { name: 'Create', verbs: 'design, construct, produce, invent', color: '#e74c3c', qtype: 'Design a curriculum / Propose a solution' },
      { name: 'Evaluate', verbs: 'judge, critique, justify, assess', color: '#e67e22', qtype: 'Which method is most effective?' },
      { name: 'Analyse', verbs: 'compare, contrast, examine, differentiate', color: '#f1c40f', qtype: 'Distinguish between X and Y' },
      { name: 'Apply', verbs: 'solve, use, demonstrate, implement', color: '#2ecc71', qtype: 'Calculate / Apply this principle' },
      { name: 'Understand', verbs: 'explain, summarize, paraphrase, classify', color: '#3498db', qtype: 'Explain the meaning of...' },
      { name: 'Remember', verbs: 'define, list, recall, identify', color: '#9b59b6', qtype: 'Who coined the term...?' }
   ];
   let bloomHTML = `<p>Bloom's Taxonomy is a hierarchy of cognitive skills, from basic recall to creative thinking. The revised version (Anderson & Krathwohl, 2001) rearranged the original and renamed the top level from "Synthesis" to "Create".</p>
   <div class="interactive-zone" style="position:relative;">
     <svg viewBox="0 0 500 320" style="width:100%;max-width:500px;">`;
   bloomLevels.forEach((lvl, i) => {
      const y = i * 50 + 10;
      const w = 120 + i * 60;
      const x = (500 - w) / 2;
      bloomHTML += `<rect class="pyramid-level" x="${x}" y="${y}" width="${w}" height="44" rx="6" fill="${lvl.color}" opacity="0.75" data-idx="${i}" style="cursor:pointer;"/>
        <text x="250" y="${y+27}" text-anchor="middle" fill="white" font-size="13" font-weight="600" pointer-events="none">${lvl.name}</text>`;
   });
   bloomHTML += `</svg><div id="bloom-tooltip" style="margin-top:12px;min-height:60px;"></div></div>
   <div class="trap-box">Create is the HIGHEST level. Synthesis was renamed Create in the revised taxonomy. The original (1956) had Knowledge at bottom and Evaluation at top.</div>`;
   const c1 = makeConceptCard(unitName, "Bloom's Taxonomy", bloomHTML);
   container.appendChild(c1);
   // Attach bloom interactivity
   setTimeout(() => {
      c1.querySelectorAll('.pyramid-level').forEach(rect => {
         rect.addEventListener('click', () => {
            const idx = parseInt(rect.dataset.idx);
            const lvl = bloomLevels[idx];
            const tip = c1.querySelector('#bloom-tooltip');
            tip.innerHTML = `<div class="card" style="padding:14px;border-left:3px solid ${lvl.color};"><strong style="color:${lvl.color}">${lvl.name}</strong><br><span class="text-muted">Key verbs:</span> ${lvl.verbs}<br><span class="text-muted">UGC NET Q type:</span> ${lvl.qtype}</div>`;
         });
      });
   }, 0);

   // 2. Levels of Teaching
   const levels = [
      { name: 'Memory', teacher: 'Presents facts, drills repetition', student: 'Memorises, recalls information', method: 'Lecture, rote learning' },
      { name: 'Understanding', teacher: 'Explains concepts, gives examples', student: 'Grasps meaning, relates ideas', method: 'Discussion, demonstration' },
      { name: 'Reflective', teacher: 'Poses problems, facilitates inquiry', student: 'Thinks critically, creates solutions', method: 'Problem-based learning, Socratic method' }
   ];
   let levelsHTML = `<p>Teaching operates at three levels. Memory-level teaching is the most basic — it involves rote learning. Understanding-level goes deeper, connecting ideas. Reflective-level is the highest — students think independently and solve novel problems.</p>
   <div class="interactive-zone">
     <div class="dial-container">
       <div class="dial-track">
         ${levels.map((l,i) => `<div class="dial-stop ${i===0?'active':''}" data-lidx="${i}" style="left:${i*50}%;">${i+1}</div>`).join('')}
       </div>
       <div id="level-info" class="dial-info"></div>
     </div>
   </div>`;
   const c2 = makeConceptCard(unitName, 'Levels of Teaching', levelsHTML);
   container.appendChild(c2);
   setTimeout(() => {
      const showLevel = (i) => {
         const l = levels[i];
         c2.querySelectorAll('.dial-stop').forEach((s,j) => s.classList.toggle('active', j===i));
         c2.querySelector('#level-info').innerHTML = `<strong style="color:var(--cyan);">${l.name} Level</strong><br><span class="text-muted">Teacher:</span> ${l.teacher}<br><span class="text-muted">Student:</span> ${l.student}<br><span class="text-muted">Method:</span> ${l.method}`;
      };
      showLevel(0);
      c2.querySelectorAll('.dial-stop').forEach(s => s.onclick = () => showLevel(parseInt(s.dataset.lidx)));
   }, 0);

   // 3. Types of Teaching Methods
   const methods = {
      'Teacher-centred / Individual': ['Lecture — teacher delivers content one-way', 'Programmed Instruction — self-paced modules designed by teacher'],
      'Teacher-centred / Group': ['Demonstration — teacher shows, class observes', 'Team Teaching — multiple teachers co-deliver'],
      'Student-centred / Individual': ['Tutorial — one-on-one guidance', 'Project Work — student explores independently'],
      'Student-centred / Group': ['Group Discussion — students debate topics', 'Collaborative Learning — peer-based problem solving']
   };
   let methodsHTML = `<p>Teaching methods can be classified on two axes: who controls the learning (teacher or student) and whether it targets individuals or groups. Click each cell to see examples.</p>
   <div class="interactive-zone"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
     <div style="text-align:center;font-weight:600;color:var(--cyan);grid-column:1/3;">↓ Teacher-centred vs Student-centred ↓</div>`;
   const keys = Object.keys(methods);
   keys.forEach((key, i) => {
      methodsHTML += `<div class="card" style="cursor:pointer;padding:14px;text-align:center;min-height:80px;" data-midx="${i}"><div style="font-weight:600;font-size:0.85rem;margin-bottom:6px;">${key}</div><div class="text-muted" style="font-size:0.8rem;">Click to reveal</div></div>`;
   });
   methodsHTML += `</div></div>`;
   const c3 = makeConceptCard(unitName, 'Types of Teaching Methods', methodsHTML);
   container.appendChild(c3);
   setTimeout(() => {
      c3.querySelectorAll('[data-midx]').forEach(cell => {
         cell.onclick = () => {
            const idx = parseInt(cell.dataset.midx);
            const items = methods[keys[idx]];
            cell.innerHTML = `<div style="font-weight:600;font-size:0.85rem;margin-bottom:6px;color:var(--cyan);">${keys[idx]}</div>${items.map(m => `<div style="font-size:0.82rem;text-align:left;margin-top:4px;">• ${m}</div>`).join('')}`;
            cell.style.cursor = 'default';
         };
      });
   }, 0);

   // 4. Evaluation Types
   let evalHTML = `<p>Evaluation in education falls into three types. Formative happens during learning (to improve). Summative happens after learning (to judge). Diagnostic happens before learning (to identify gaps). Drag each item to the correct bucket.</p>
   <div class="interactive-zone" id="eval-drag-zone">
     <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;" id="eval-items"></div>
     <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
       <div><div style="font-weight:600;color:var(--green);margin-bottom:8px;text-align:center;">Formative</div><div class="drop-zone" data-bucket="formative"></div></div>
       <div><div style="font-weight:600;color:var(--cyan);margin-bottom:8px;text-align:center;">Summative</div><div class="drop-zone" data-bucket="summative"></div></div>
       <div><div style="font-weight:600;color:#facc15;margin-bottom:8px;text-align:center;">Diagnostic</div><div class="drop-zone" data-bucket="diagnostic"></div></div>
     </div>
     <button class="btn" style="margin-top:12px;" id="eval-reset">Reset</button>
   </div>
   <div class="trap-box">CCE (Continuous and Comprehensive Evaluation) is FORMATIVE. Board exams and finals are SUMMATIVE. Entry tests and pre-assessments are DIAGNOSTIC.</div>`;
   const c4 = makeConceptCard(unitName, 'Evaluation: Formative vs Summative vs Diagnostic', evalHTML);
   container.appendChild(c4);

   setTimeout(() => {
      const evalItems = [
         { text: 'Class Quiz', answer: 'formative' },
         { text: 'Unit Test', answer: 'formative' },
         { text: 'Entry Test', answer: 'diagnostic' },
         { text: 'Portfolio', answer: 'formative' },
         { text: 'Final Exam', answer: 'summative' },
         { text: 'Observation', answer: 'diagnostic' }
      ];
      function setupEvalDrag() {
         const itemsEl = c4.querySelector('#eval-items');
         itemsEl.innerHTML = '';
         c4.querySelectorAll('.drop-zone').forEach(z => z.innerHTML = '');
         const shuffled = [...evalItems].sort(() => Math.random() - 0.5);
         shuffled.forEach((item, i) => {
            const el = document.createElement('div');
            el.className = 'drag-item';
            el.draggable = true;
            el.innerText = item.text;
            el.dataset.answer = item.answer;
            el.dataset.idx = i;
            el.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', i));
            itemsEl.appendChild(el);
         });

         c4.querySelectorAll('.drop-zone').forEach(zone => {
            zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
            zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
            zone.addEventListener('drop', e => {
               e.preventDefault(); zone.classList.remove('drag-over');
               const idx = e.dataTransfer.getData('text/plain');
               const dragEl = itemsEl.querySelector(`[data-idx="${idx}"]`);
               if (!dragEl) return;
               const isCorrect = dragEl.dataset.answer === zone.dataset.bucket;
               const clone = dragEl.cloneNode(true);
               clone.draggable = false;
               clone.className = `drag-item ${isCorrect ? 'correct-drop' : 'wrong-drop'}`;
               zone.appendChild(clone);
               dragEl.remove();
               if (!isCorrect) setTimeout(() => { clone.remove(); itemsEl.appendChild(dragEl); }, 1000);
            });
         });
      }
      setupEvalDrag();
      c4.querySelector('#eval-reset').onclick = setupEvalDrag;
   }, 0);
}

// ==================== UNIT 2: RESEARCH APTITUDE ====================
function renderResearchAptitude(unitName, container) {
   // 1. Types of Research — Decision Tree
   let dtHTML = `<p>Research types are classified by purpose and method. This decision tree helps you identify the type quickly — follow the questions from top to bottom.</p>
   <div class="interactive-zone">
     <svg viewBox="0 0 600 350" style="width:100%;max-width:600px;">
       <rect x="200" y="10" width="200" height="40" rx="8" fill="var(--accent-color)" class="pyramid-level" data-dtip="start"/>
       <text x="300" y="35" text-anchor="middle" fill="white" font-size="12" pointer-events="none">Is it testing a hypothesis?</text>
       <line x1="250" y1="50" x2="150" y2="90" stroke="var(--cyan)" stroke-width="2"/>
       <text x="180" y="75" fill="var(--green)" font-size="11">No</text>
       <line x1="350" y1="50" x2="450" y2="90" stroke="var(--cyan)" stroke-width="2"/>
       <text x="420" y="75" fill="var(--green)" font-size="11">Yes</text>
       <rect x="50" y="90" width="200" height="40" rx="8" fill="var(--accent2-color)" class="pyramid-level" data-dtip="descriptive"/>
       <text x="150" y="115" text-anchor="middle" fill="white" font-size="12" pointer-events="none">Descriptive / Exploratory</text>
       <rect x="350" y="90" width="200" height="40" rx="8" fill="var(--accent2-color)" class="pyramid-level" data-dtip="experimental"/>
       <text x="450" y="115" text-anchor="middle" fill="white" font-size="12" pointer-events="none">Experimental / Survey</text>
       <line x1="150" y1="130" x2="100" y2="170" stroke="var(--cyan)" stroke-width="2"/>
       <line x1="150" y1="130" x2="200" y2="170" stroke="var(--cyan)" stroke-width="2"/>
       <rect x="20" y="170" width="160" height="36" rx="8" fill="rgba(0,210,255,0.2)" class="pyramid-level" data-dtip="historical"/>
       <text x="100" y="193" text-anchor="middle" fill="var(--cyan)" font-size="11" pointer-events="none">Historical Research</text>
       <rect x="200" y="170" width="160" height="36" rx="8" fill="rgba(0,210,255,0.2)" class="pyramid-level" data-dtip="case"/>
       <text x="280" y="193" text-anchor="middle" fill="var(--cyan)" font-size="11" pointer-events="none">Case Study</text>
       <line x1="450" y1="130" x2="400" y2="170" stroke="var(--cyan)" stroke-width="2"/>
       <line x1="450" y1="130" x2="500" y2="170" stroke="var(--cyan)" stroke-width="2"/>
       <rect x="320" y="170" width="160" height="36" rx="8" fill="rgba(74,222,128,0.2)" class="pyramid-level" data-dtip="true_exp"/>
       <text x="400" y="193" text-anchor="middle" fill="var(--green)" font-size="11" pointer-events="none">True Experimental</text>
       <rect x="500" y="170" width="95" height="36" rx="8" fill="rgba(74,222,128,0.2)" class="pyramid-level" data-dtip="quasi"/>
       <text x="548" y="193" text-anchor="middle" fill="var(--green)" font-size="10" pointer-events="none">Quasi-Exp</text>
     </svg>
     <div id="dt-tooltip" style="margin-top:12px;min-height:40px;"></div>
   </div>`;
   const dtTips = {
      start: 'Start here: Does the research aim to test a cause-and-effect relationship?',
      descriptive: 'Descriptive research observes and describes — surveys, case studies, content analysis. No manipulation of variables.',
      experimental: 'Experimental research manipulates an independent variable to observe its effect on a dependent variable.',
      historical: 'Historical research studies past events using documents, records, and artifacts to understand patterns.',
      'case': 'Case study research examines a single unit (person, group, institution) in depth.',
      true_exp: 'True experimental: Random assignment, control group, manipulation of IV. Gold standard for causal claims.',
      quasi: 'Quasi-experimental: Like experimental but without random assignment. Uses intact groups.'
   };
   const c1 = makeConceptCard(unitName, 'Types of Research', dtHTML);
   container.appendChild(c1);
   setTimeout(() => {
      c1.querySelectorAll('[data-dtip]').forEach(el => {
         el.addEventListener('click', () => {
            c1.querySelector('#dt-tooltip').innerHTML = `<div class="card" style="padding:12px;">${dtTips[el.dataset.dtip]}</div>`;
         });
      });
   }, 0);

   // 2. Variables
   let varsHTML = `<p>Every experiment has three types of variables. The <strong>Independent Variable (IV)</strong> is what you change. The <strong>Dependent Variable (DV)</strong> is what you measure. <strong>Extraneous Variables</strong> are everything else that could affect the result — you must control them.</p>
   <div class="interactive-zone">
     <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;" id="var-cards">
       <div class="card" style="border-left:3px solid var(--cyan);cursor:pointer;padding:14px;" data-vidx="0"><strong style="color:var(--cyan);">Independent Variable</strong><div class="text-muted" style="font-size:0.82rem;margin-top:4px;">The cause — what you manipulate</div></div>
       <div class="card" style="border-left:3px solid var(--green);cursor:pointer;padding:14px;" data-vidx="1"><strong style="color:var(--green);">Dependent Variable</strong><div class="text-muted" style="font-size:0.82rem;margin-top:4px;">The effect — what you measure</div></div>
       <div class="card" style="border-left:3px solid var(--red);cursor:pointer;padding:14px;" data-vidx="2"><strong style="color:var(--red);">Extraneous Variable</strong><div class="text-muted" style="font-size:0.82rem;margin-top:4px;">Controlled — kept constant</div></div>
     </div>
     <div id="var-examples" style="margin-top:12px;"></div>
   </div>
   <div class="trap-box">The IV is what you CHANGE. The DV is what you MEASURE. Extraneous variables are controlled, not ignored.</div>`;
   const varExamples = [
      ['Study time (hours per day)', 'Test scores (marks)', 'Age, IQ, previous knowledge'],
      ['Teaching method (lecture vs discussion)', 'Student engagement (participation count)', 'Class size, time of day'],
      ['Fertilizer type', 'Plant growth (cm)', 'Sunlight, water, soil type']
   ];
   const c2 = makeConceptCard(unitName, 'Variables in Research', varsHTML);
   container.appendChild(c2);
   setTimeout(() => {
      let exIdx = 0;
      const showVarEx = () => {
         const ex = varExamples[exIdx];
         c2.querySelector('#var-examples').innerHTML = `<div class="card" style="padding:12px;"><div style="font-size:0.82rem;"><strong>Example ${exIdx+1}:</strong><br>IV: <span style="color:var(--cyan);">${ex[0]}</span><br>DV: <span style="color:var(--green);">${ex[1]}</span><br>Extraneous: <span style="color:var(--red);">${ex[2]}</span></div></div>`;
      };
      showVarEx();
      c2.querySelectorAll('[data-vidx]').forEach(el => {
         el.onclick = () => { exIdx = (exIdx + 1) % varExamples.length; showVarEx(); };
      });
   }, 0);

   // 3. Sampling Methods
   let sampHTML = `<p>Sampling determines how you select participants. The method affects whether your results can be generalised. Click the buttons to see each method animate on the dot grid below.</p>
   <div class="interactive-zone">
     <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
       <button class="btn filter-btn active" data-samp="random">Random</button>
       <button class="btn filter-btn" data-samp="stratified">Stratified</button>
       <button class="btn filter-btn" data-samp="systematic">Systematic</button>
       <button class="btn filter-btn" data-samp="purposive">Purposive</button>
     </div>
     <div id="samp-grid" class="cell-grid" style="grid-template-columns:repeat(10,1fr);max-width:320px;"></div>
     <div id="samp-desc" style="margin-top:12px;font-size:0.88rem;color:var(--text-muted);"></div>
   </div>`;
   const c3 = makeConceptCard(unitName, 'Sampling Methods', sampHTML);
   container.appendChild(c3);
   setTimeout(() => {
      const grid = c3.querySelector('#samp-grid');
      for (let i = 0; i < 50; i++) { const d = document.createElement('div'); d.className = 'cell'; d.style.width = '28px'; d.style.height = '28px'; grid.appendChild(d); }
      const cells = grid.querySelectorAll('.cell');
      const descEl = c3.querySelector('#samp-desc');
      const descs = {
         random: 'Random Sampling: Every member has equal chance. Selected using random numbers.',
         stratified: 'Stratified Sampling: Population divided into groups (strata), then random within each.',
         systematic: 'Systematic Sampling: Select every k-th member (e.g., every 5th person).',
         purposive: 'Purposive Sampling: Researcher handpicks based on specific criteria (non-random).'
      };
      function animateSamp(type) {
         cells.forEach(c => { c.className = 'cell'; c.style.background = ''; });
         descEl.innerText = descs[type];
         if (type === 'random') {
            const indices = []; while (indices.length < 12) { const r = Math.floor(Math.random()*50); if (!indices.includes(r)) indices.push(r); }
            indices.forEach((idx, i) => setTimeout(() => cells[idx].classList.add('filled'), i * 80));
         } else if (type === 'stratified') {
            // 3 groups
            for (let i = 0; i < 50; i++) {
               const g = i < 17 ? 'highlight-a' : i < 34 ? 'highlight-b' : 'highlight-c';
               setTimeout(() => cells[i].classList.add(g), i * 20);
            }
            setTimeout(() => {
               [3, 8, 14, 20, 25, 30, 36, 41, 47].forEach((idx, i) => setTimeout(() => cells[idx].classList.add('filled'), i * 100));
            }, 1200);
         } else if (type === 'systematic') {
            for (let i = 0; i < 50; i += 5) setTimeout(() => cells[i].classList.add('filled'), (i/5) * 150);
         } else if (type === 'purposive') {
            [0,1,2,3,4,5,6,7,8,9].forEach((idx, i) => setTimeout(() => cells[idx].classList.add('filled'), i * 100));
         }
      }
      animateSamp('random');
      c3.querySelectorAll('[data-samp]').forEach(btn => {
         btn.onclick = () => {
            c3.querySelectorAll('[data-samp]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            animateSamp(btn.dataset.samp);
         };
      });
   }, 0);

   // 4. Hypothesis
   let hypHTML = `<p>A hypothesis is a testable prediction about the relationship between variables.</p>
   <table class="compare-table">
     <tr><th></th><th>Null Hypothesis (H₀)</th><th>Alternative Hypothesis (H₁)</th></tr>
     <tr><td><strong>Definition</strong></td><td>States there is NO significant difference or relationship</td><td>States there IS a significant difference or relationship</td></tr>
     <tr><td><strong>Notation</strong></td><td>H₀: μ₁ = μ₂</td><td>H₁: μ₁ ≠ μ₂</td></tr>
     <tr><td><strong>When rejected</strong></td><td>When p-value < significance level (usually 0.05)</td><td>Cannot be "rejected" — it's accepted when H₀ is rejected</td></tr>
     <tr><td><strong>Example</strong></td><td>"Caffeine has no effect on test scores"</td><td>"Caffeine improves test scores"</td></tr>
   </table>
   <div class="trap-box">We REJECT or FAIL TO REJECT H₀ — we never 'accept' H₀. This is the most tested nuance in UGC NET research methodology questions.</div>`;
   container.appendChild(makeConceptCard(unitName, 'Hypothesis Testing', hypHTML));
}

// ==================== UNIT 3: READING COMPREHENSION ====================
function renderReadingComprehension(unitName, container) {
   // 1. Passage Strategy
   let stratHTML = `<p>Reading comprehension questions carry 10+ marks. Speed and accuracy come from a systematic approach, not raw reading speed.</p>
   <div class="interactive-zone">
     <div style="display:flex;flex-direction:column;gap:12px;">
       ${['1. Read the questions first — know what you\'re looking for before reading the passage',
         '2. Skim the passage — get the main idea, note paragraph themes in 60 seconds',
         '3. Locate keywords — match question keywords to passage paragraphs',
         '4. Eliminate wrong options — usually 2 are obviously wrong, 1 is a trap',
         '5. Verify your answer — re-read the specific sentence, don\'t rely on memory'].map((step, i) => `
         <div class="card" style="padding:12px 16px;border-left:3px solid ${['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db'][i]};">
           <div style="font-weight:600;font-size:0.9rem;">${step}</div>
         </div>`).join('')}
     </div>
   </div>`;
   container.appendChild(makeConceptCard(unitName, '5-Step Passage Strategy', stratHTML));

   // 2. Common Question Types — Flip cards
   const qTypes = [
      { front: 'Main Idea', back: 'What is the passage primarily about? Look for the thesis in the first/last paragraph. Avoid options that are too narrow (one detail) or too broad.' },
      { front: 'Inference', back: 'What can be inferred? The answer is NOT stated directly — it\'s implied. Eliminate anything explicitly stated or contradicted.' },
      { front: 'Vocabulary in Context', back: 'What does X mean here? Ignore dictionary meaning. Re-read the sentence with each option substituted. The one that preserves meaning is correct.' },
      { front: 'Author\'s Tone', back: 'What is the author\'s attitude? Look for adjectives and adverbs. Common tones: critical, optimistic, neutral, sarcastic, didactic, laudatory.' },
      { front: 'Title Selection', back: 'Best title for the passage? Must capture the MAIN theme, not just a detail. Too specific = wrong. Too vague = wrong.' },
      { front: 'Specific Detail', back: 'According to the passage... This is a locate-and-match question. Find the exact sentence. Don\'t paraphrase beyond what\'s stated.' }
   ];
   let flipHTML = `<p>Each comprehension question falls into one of these types. Recognising the type instantly tells you where and how to find the answer. Click each card to reveal the strategy.</p>
   <div class="flip-card-grid">
     ${qTypes.map((qt, i) => `
     <div class="flip-card" onclick="this.classList.toggle('flipped')">
       <div class="flip-card-inner">
         <div class="flip-card-face" style="border-left:3px solid var(--accent-color);"><div style="font-weight:600;font-size:1.1rem;">${qt.front}</div><div class="text-muted" style="font-size:0.75rem;position:absolute;bottom:12px;">Click to flip</div></div>
         <div class="flip-card-face flip-card-back"><div>${qt.back}</div></div>
       </div>
     </div>`).join('')}
   </div>`;
   container.appendChild(makeConceptCard(unitName, 'Question Type Recognition', flipHTML));
}

// ==================== UNIT 4: COMMUNICATION ====================
function renderCommunication(unitName, container) {
   // 1. Shannon-Weaver Model
   let swHTML = `<p>The Shannon-Weaver Model (1948) is the most asked communication model in UGC NET. It describes communication as a linear process from sender to receiver, with noise that can distort the message.</p>
   <div class="interactive-zone" style="position:relative;">
     <svg viewBox="0 0 650 200" style="width:100%;max-width:650px;">
       ${[{x:10,y:70,w:90,h:50,label:'Source',id:'sw-source',color:'var(--accent-color)'},
         {x:130,y:70,w:90,h:50,label:'Encoder',id:'sw-encoder',color:'var(--accent2-color)'},
         {x:270,y:70,w:100,h:50,label:'Channel',id:'sw-channel',color:'rgba(0,210,255,0.3)'},
         {x:410,y:70,w:90,h:50,label:'Decoder',id:'sw-decoder',color:'var(--accent2-color)'},
         {x:540,y:70,w:90,h:50,label:'Receiver',id:'sw-receiver',color:'var(--accent-color)'},
         {x:270,y:5,w:100,h:40,label:'Noise',id:'sw-noise',color:'rgba(248,113,113,0.3)'}].map(c => `
         <rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="8" fill="${c.color}" class="pyramid-level" data-swid="${c.id}" style="cursor:pointer;"/>
         <text x="${c.x+c.w/2}" y="${c.y+c.h/2+5}" text-anchor="middle" fill="var(--text-main)" font-size="12" font-weight="600" pointer-events="none">${c.label}</text>`).join('')}
       <line x1="100" y1="95" x2="130" y2="95" stroke="var(--cyan)" stroke-width="2" marker-end="url(#arrow)"/>
       <line x1="220" y1="95" x2="270" y2="95" stroke="var(--cyan)" stroke-width="2" marker-end="url(#arrow)"/>
       <line x1="370" y1="95" x2="410" y2="95" stroke="var(--cyan)" stroke-width="2" marker-end="url(#arrow)"/>
       <line x1="500" y1="95" x2="540" y2="95" stroke="var(--cyan)" stroke-width="2" marker-end="url(#arrow)"/>
       <line x1="320" y1="45" x2="320" y2="70" stroke="var(--red)" stroke-width="2" stroke-dasharray="4"/>
       <rect x="170" y="155" width="300" height="35" rx="8" fill="rgba(74,222,128,0.15)" class="pyramid-level" data-swid="sw-feedback" style="cursor:pointer;"/>
       <text x="320" y="177" text-anchor="middle" fill="var(--green)" font-size="11" font-weight="600" pointer-events="none">← Feedback →</text>
       <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--cyan)"/></marker></defs>
     </svg>
     <div id="sw-tooltip" style="margin-top:12px;min-height:40px;"></div>
   </div>`;
   const swTips = {
      'sw-source': '<strong>Source:</strong> The person or entity who originates the message. Example: A teacher planning a lecture.',
      'sw-encoder': '<strong>Encoder:</strong> Converts the message into signals (words, gestures, code). Example: Putting thoughts into spoken language.',
      'sw-channel': '<strong>Channel:</strong> The medium through which the message travels. Example: Air (speech), paper (letter), internet (email).',
      'sw-decoder': '<strong>Decoder:</strong> Converts received signals back into a message. Example: The ear and brain processing spoken words.',
      'sw-receiver': '<strong>Receiver:</strong> The person who receives and interprets the message. Example: Students listening to a lecture.',
      'sw-noise': '<strong>Noise:</strong> Any interference that distorts the message. Example: Background chatter, unclear handwriting, jargon.',
      'sw-feedback': '<strong>Feedback:</strong> The receiver\'s response back to the source. Not in the original 1948 model — added later by Weaver. Makes communication two-way.'
   };
   const c1 = makeConceptCard(unitName, 'Shannon-Weaver Model', swHTML);
   container.appendChild(c1);
   setTimeout(() => {
      c1.querySelectorAll('[data-swid]').forEach(el => {
         el.onclick = () => { c1.querySelector('#sw-tooltip').innerHTML = `<div class="card" style="padding:12px;">${swTips[el.dataset.swid]}</div>`; };
      });
   }, 0);

   // 2. Types of Communication
   const commTypes = [
      { name: 'Verbal', tags: ['Mode'], desc: 'Uses words — spoken or written' },
      { name: 'Non-verbal', tags: ['Mode'], desc: 'Body language, facial expressions, gestures' },
      { name: 'Written', tags: ['Channel'], desc: 'Letters, emails, reports, notices' },
      { name: 'Oral', tags: ['Channel'], desc: 'Face-to-face, phone, speech' },
      { name: 'Formal', tags: ['Mode'], desc: 'Official channels — memos, reports' },
      { name: 'Informal', tags: ['Mode'], desc: 'Grapevine, casual conversations' },
      { name: 'Upward', tags: ['Direction'], desc: 'Subordinate → Superior' },
      { name: 'Downward', tags: ['Direction'], desc: 'Superior → Subordinate' },
      { name: 'Lateral', tags: ['Direction'], desc: 'Same level — peer to peer' },
      { name: 'Diagonal', tags: ['Direction'], desc: 'Across levels and departments' }
   ];
   const tagColors = { Mode: 'var(--cyan)', Channel: 'var(--green)', Direction: '#facc15' };
   let commHTML = `<p>Communication is classified by mode (how), channel (through what), and direction (which way). Use the filters to sort.</p>
   <div class="interactive-zone">
     <div class="filter-bar">
       <button class="filter-btn active" data-cfilter="all">All</button>
       <button class="filter-btn" data-cfilter="Mode">By Mode</button>
       <button class="filter-btn" data-cfilter="Channel">By Channel</button>
       <button class="filter-btn" data-cfilter="Direction">By Direction</button>
     </div>
     <div id="comm-cards" class="ref-grid"></div>
   </div>`;
   const c2 = makeConceptCard(unitName, 'Types of Communication', commHTML);
   container.appendChild(c2);
   setTimeout(() => {
      function renderCommCards(filter) {
         const grid = c2.querySelector('#comm-cards');
         grid.innerHTML = '';
         commTypes.filter(ct => filter === 'all' || ct.tags.includes(filter)).forEach(ct => {
            const card = document.createElement('div');
            card.className = 'ref-card';
            card.innerHTML = `<h4>${ct.name}</h4><div style="margin-bottom:6px;">${ct.tags.map(t => `<span style="font-size:0.72rem;padding:2px 8px;border-radius:4px;background:${tagColors[t]}22;color:${tagColors[t]};border:1px solid ${tagColors[t]}44;">${t}</span>`).join(' ')}</div><div class="text-muted" style="font-size:0.85rem;">${ct.desc}</div>`;
            grid.appendChild(card);
         });
      }
      renderCommCards('all');
      c2.querySelectorAll('[data-cfilter]').forEach(btn => {
         btn.onclick = () => {
            c2.querySelectorAll('[data-cfilter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderCommCards(btn.dataset.cfilter);
         };
      });
   }, 0);

   // 3. Barriers to Communication
   const barriers = [
      { icon: '📝', name: 'Semantic', def: 'Misunderstanding due to language, jargon, or ambiguity', hook: 'Words' },
      { icon: '🧠', name: 'Psychological', def: 'Emotions, prejudice, stress blocking reception', hook: 'Mind' },
      { icon: '🔊', name: 'Physical', def: 'Noise, distance, poor equipment', hook: 'Environment' },
      { icon: '🏢', name: 'Organisational', def: 'Hierarchy, red tape, information overload', hook: 'Structure' },
      { icon: '🌐', name: 'Cultural', def: 'Differences in values, customs, norms', hook: 'Culture' },
      { icon: '🗣️', name: 'Linguistic', def: 'Different languages, accents, dialects', hook: 'Language' }
   ];
   let barrHTML = `<p>Six major barriers can block effective communication. Each barrier type has a one-word memory hook.</p>
   <div class="ref-grid" style="grid-template-columns:repeat(3,1fr);">
     ${barriers.map(b => `<div class="ref-card" style="text-align:center;"><div style="font-size:2rem;margin-bottom:8px;">${b.icon}</div><h4>${b.name}</h4><div class="text-muted" style="font-size:0.82rem;margin-bottom:6px;">${b.def}</div><div style="font-family:var(--font-mono);font-size:0.78rem;color:var(--cyan);">Hook: ${b.hook}</div></div>`).join('')}
   </div>`;
   container.appendChild(makeConceptCard(unitName, 'Barriers to Communication', barrHTML));
}

// ==================== UNIT 5: MATHEMATICAL REASONING ====================
function renderMathReasoning(unitName, container) {
   // 1. Percentage Visual
   let pctHTML = `<p>Percentage means "per hundred." If you can visualise 100 cells, you can visualise any percentage. Type a number below to see it fill up.</p>
   <div class="interactive-zone">
     <div class="input-group-compact">
       <label>Fill %:</label>
       <input type="number" id="pct-input" value="35" min="0" max="100">
       <button class="btn" id="pct-go" style="padding:8px 16px;">Show</button>
     </div>
     <div id="pct-grid" class="cell-grid" style="grid-template-columns:repeat(10,1fr);max-width:300px;margin-top:12px;"></div>
     <div id="pct-label" style="text-align:center;margin-top:8px;font-family:var(--font-mono);"></div>
     <div class="input-group-compact" style="margin-top:16px;">
       <label>% of:</label>
       <input type="number" id="pct-of" value="200" min="1">
       <span id="pct-result" style="font-family:var(--font-mono);color:var(--cyan);"></span>
     </div>
   </div>
   <div class="trap-box">+20% then −20% ≠ 0%. It's −4%. Proof: 100 → 120 → 96. The base changes after the first operation!</div>`;
   const c1 = makeConceptCard(unitName, 'Percentage — Visual Intuition', pctHTML);
   container.appendChild(c1);
   setTimeout(() => {
      const grid = c1.querySelector('#pct-grid');
      for (let i = 0; i < 100; i++) { const d = document.createElement('div'); d.className = 'cell'; d.style.cssText = 'width:26px;height:26px;'; grid.appendChild(d); }
      const cells = grid.querySelectorAll('.cell');
      function updatePct() {
         const v = parseInt(c1.querySelector('#pct-input').value) || 0;
         const ofVal = parseInt(c1.querySelector('#pct-of').value) || 100;
         cells.forEach((c, i) => c.classList.toggle('filled', i < v));
         c1.querySelector('#pct-label').innerText = `${v} cells out of 100 = ${v}%`;
         c1.querySelector('#pct-result').innerText = `= ${(v / 100 * ofVal).toFixed(1)}`;
      }
      updatePct();
      c1.querySelector('#pct-go').onclick = updatePct;
      c1.querySelector('#pct-input').onchange = updatePct;
      c1.querySelector('#pct-of').onchange = updatePct;
   }, 0);

   // 2. Number Series
   let seriesHTML = `<p>Number series questions ask you to find the pattern and predict the next term. Type a comma-separated series below, or click an example.</p>
   <div class="interactive-zone">
     <div class="input-group-compact">
       <input type="text" id="series-input" placeholder="e.g. 2, 4, 8, 16" style="width:280px;">
       <button class="btn" id="series-detect" style="padding:8px 16px;">Detect Pattern</button>
     </div>
     <div id="series-result" style="margin-top:12px;"></div>
     <div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:6px;">
       ${['2,6,18,54','3,7,11,15,19','1,4,9,16,25','1,1,2,3,5,8','2,3,5,7,11,13','4,9,16,25,36'].map(s => `<button class="btn filter-btn" data-series="${s}" style="font-family:var(--font-mono);font-size:0.78rem;">${s}</button>`).join('')}
     </div>
   </div>`;
   const c2 = makeConceptCard(unitName, 'Number Series — Pattern Lab', seriesHTML);
   container.appendChild(c2);
   setTimeout(() => {
      function detectPattern(arr) {
         if (arr.length < 3) return { type: 'Too few terms', rule: '', next: [] };
         // Arithmetic
         const diffs = []; for (let i = 1; i < arr.length; i++) diffs.push(arr[i] - arr[i-1]);
         if (diffs.every(d => d === diffs[0])) return { type: 'Arithmetic', rule: `Common difference = ${diffs[0]}`, next: [arr[arr.length-1]+diffs[0], arr[arr.length-1]+2*diffs[0], arr[arr.length-1]+3*diffs[0]] };
         // Geometric
         const ratios = []; for (let i = 1; i < arr.length; i++) ratios.push(arr[i] / arr[i-1]);
         if (ratios.every(r => Math.abs(r - ratios[0]) < 0.001)) return { type: 'Geometric', rule: `Common ratio = ${ratios[0]}`, next: [Math.round(arr[arr.length-1]*ratios[0]), Math.round(arr[arr.length-1]*ratios[0]**2), Math.round(arr[arr.length-1]*ratios[0]**3)] };
         // Squares
         const sqCheck = arr.every((v, i) => v === (i+1)*(i+1));
         if (sqCheck) { const n = arr.length; return { type: 'Perfect Squares', rule: `n²`, next: [(n+1)**2, (n+2)**2, (n+3)**2] }; }
         // Fibonacci
         if (arr.length >= 3) {
            let isFib = true; for (let i = 2; i < arr.length; i++) { if (arr[i] !== arr[i-1] + arr[i-2]) { isFib = false; break; } }
            if (isFib) { const n = arr.length; return { type: 'Fibonacci-like', rule: `Each term = sum of previous two`, next: [arr[n-1]+arr[n-2], arr[n-1]+arr[n-2]+arr[n-1], 0].slice(0,3) }; }
         }
         // Differences of differences
         const d2 = []; for (let i = 1; i < diffs.length; i++) d2.push(diffs[i] - diffs[i-1]);
         if (d2.length > 0 && d2.every(d => d === d2[0])) {
            const nextDiff = diffs[diffs.length-1] + d2[0];
            const n1 = arr[arr.length-1] + nextDiff;
            return { type: 'Quadratic', rule: `Second differences constant = ${d2[0]}`, next: [n1] };
         }
         // Primes check
         function isPrime(n) { if (n < 2) return false; for (let i = 2; i <= Math.sqrt(n); i++) if (n%i===0) return false; return true; }
         if (arr.every(isPrime)) {
            let next = arr[arr.length-1]+1; const primes = []; while(primes.length < 3) { if(isPrime(next)) primes.push(next); next++; }
            return { type: 'Prime Numbers', rule: 'Sequence of prime numbers', next: primes };
         }
         return { type: 'No clear pattern', rule: 'Try computing differences between consecutive terms.', next: [] };
      }
      function runDetect() {
         const val = c2.querySelector('#series-input').value;
         const arr = val.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
         const result = detectPattern(arr);
         c2.querySelector('#series-result').innerHTML = `<div class="card" style="padding:14px;"><strong style="color:var(--cyan);">Pattern: ${result.type}</strong><br><span class="text-muted">${result.rule}</span>${result.next.length ? `<br><strong>Next terms:</strong> <span style="color:var(--green);">${result.next.join(', ')}</span>` : ''}</div>`;
      }
      c2.querySelector('#series-detect').onclick = runDetect;
      c2.querySelectorAll('[data-series]').forEach(btn => {
         btn.onclick = () => { c2.querySelector('#series-input').value = btn.dataset.series; runDetect(); };
      });
   }, 0);

   // 3. Ratio & Proportion
   let ratioHTML = `<p>A ratio compares two quantities. Enter a ratio to see it visualised as a proportional bar.</p>
   <div class="interactive-zone">
     <div class="input-group-compact">
       <label>Ratio:</label><input type="number" id="ratio-a" value="3" min="1" style="width:60px;"> <span>:</span> <input type="number" id="ratio-b" value="5" min="1" style="width:60px;">
       <label style="margin-left:16px;">Total =</label><input type="number" id="ratio-total" value="240" min="1" style="width:80px;">
       <button class="btn" id="ratio-calc" style="padding:8px 16px;">Calculate</button>
     </div>
     <div id="ratio-bar" style="display:flex;height:40px;border-radius:8px;overflow:hidden;margin-top:12px;"></div>
     <div id="ratio-result" style="margin-top:8px;font-family:var(--font-mono);font-size:0.9rem;"></div>
   </div>
   <div class="trap-box">Ratio is a:b, not a/b. In 3:5 the total parts are 8, not 5. Part A = (3/8) × Total.</div>`;
   const c3 = makeConceptCard(unitName, 'Ratio & Proportion', ratioHTML);
   container.appendChild(c3);
   setTimeout(() => {
      function calcRatio() {
         const a = parseInt(c3.querySelector('#ratio-a').value) || 1;
         const b = parseInt(c3.querySelector('#ratio-b').value) || 1;
         const total = parseInt(c3.querySelector('#ratio-total').value) || 100;
         const pctA = (a / (a + b)) * 100;
         c3.querySelector('#ratio-bar').innerHTML = `<div style="width:${pctA}%;background:var(--cyan);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.85rem;color:#000;">A: ${a}</div><div style="flex:1;background:var(--green);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.85rem;color:#000;">B: ${b}</div>`;
         const partA = (a / (a + b)) * total;
         const partB = (b / (a + b)) * total;
         c3.querySelector('#ratio-result').innerHTML = `Total parts = ${a+b} → Part A = ${a}/${a+b} × ${total} = <span style="color:var(--cyan);">${partA.toFixed(1)}</span> | Part B = <span style="color:var(--green);">${partB.toFixed(1)}</span>`;
      }
      calcRatio();
      c3.querySelector('#ratio-calc').onclick = calcRatio;
   }, 0);

   // 4. Profit & Loss
   let plHTML = `<p>The five key formulas for profit and loss problems. Click any formula for a worked example.</p>
   <div id="pl-formulas"></div>`;
   const plFormulas = [
      { name: 'Profit', formula: 'Profit = SP − CP', example: 'CP = ₹400, SP = ₹500 → Profit = ₹100' },
      { name: 'Loss', formula: 'Loss = CP − SP', example: 'CP = ₹400, SP = ₹350 → Loss = ₹50' },
      { name: 'Profit %', formula: 'Profit% = (Profit/CP) × 100', example: 'Profit = ₹100, CP = ₹400 → Profit% = 25%' },
      { name: 'Loss %', formula: 'Loss% = (Loss/CP) × 100', example: 'Loss = ₹50, CP = ₹400 → Loss% = 12.5%' },
      { name: 'Discount', formula: 'Discount = MP − SP', example: 'MP = ₹600, Discount = 20% → SP = ₹480' }
   ];
   const c4 = makeConceptCard(unitName, 'Profit & Loss Formulas', plHTML);
   container.appendChild(c4);
   setTimeout(() => {
      const el = c4.querySelector('#pl-formulas');
      plFormulas.forEach(f => {
         const div = document.createElement('div');
         div.className = 'formula-box';
         div.style.cursor = 'pointer';
         div.innerHTML = `<strong>${f.name}:</strong> ${f.formula}`;
         div.onclick = () => { div.innerHTML = `<strong>${f.name}:</strong> ${f.formula}<br><span style="color:var(--green);font-size:0.82rem;">${f.example}</span>`; };
         el.appendChild(div);
      });
   }, 0);

   // 5. Time-Distance-Work
   let tdwHTML = `<p>Speed = Distance / Time. These problems become easy once you can visualise the relationship.</p>
   <div class="interactive-zone">
     <div class="input-group-compact">
       <label>Speed:</label><input type="number" id="tdw-speed" value="60" min="1" style="width:80px;"> km/h
       <label style="margin-left:12px;">Distance:</label><input type="number" id="tdw-dist" value="180" min="1" style="width:80px;"> km
       <button class="btn" id="tdw-calc" style="padding:8px 16px;">Calculate Time</button>
     </div>
     <div id="tdw-result" style="margin-top:12px;font-family:var(--font-mono);font-size:1.1rem;color:var(--cyan);"></div>
     <hr style="border-color:var(--border-color);margin:16px 0;">
     <h4 style="margin-bottom:8px;">Work Problem</h4>
     <div class="input-group-compact">
       <label>A alone:</label><input type="number" id="work-a" value="10" min="1" style="width:60px;"> days
       <label style="margin-left:8px;">B alone:</label><input type="number" id="work-b" value="15" min="1" style="width:60px;"> days
       <button class="btn" id="work-calc" style="padding:8px 16px;">Together?</button>
     </div>
     <div id="work-result" style="margin-top:8px;font-family:var(--font-mono);color:var(--green);"></div>
   </div>`;
   const c5 = makeConceptCard(unitName, 'Time, Distance & Work', tdwHTML);
   container.appendChild(c5);
   setTimeout(() => {
      c5.querySelector('#tdw-calc').onclick = () => {
         const s = parseFloat(c5.querySelector('#tdw-speed').value); const d = parseFloat(c5.querySelector('#tdw-dist').value);
         const t = d / s; c5.querySelector('#tdw-result').innerText = `Time = ${d}/${s} = ${t.toFixed(2)} hours (${Math.floor(t)}h ${Math.round((t%1)*60)}m)`;
      };
      c5.querySelector('#work-calc').onclick = () => {
         const a = parseFloat(c5.querySelector('#work-a').value); const b = parseFloat(c5.querySelector('#work-b').value);
         const combined = (a * b) / (a + b);
         c5.querySelector('#work-result').innerText = `Combined = (${a}×${b})/(${a}+${b}) = ${combined.toFixed(2)} days`;
      };
      c5.querySelector('#tdw-calc').click();
   }, 0);

   // 6. Coding-Decoding
   let codeHTML = `<p>Coding-decoding questions test pattern recognition. The four most common UGC NET patterns:</p>
   <div class="interactive-zone">
     ${[{ title: 'Position Value', desc: 'Each letter = its position. A=1, B=2, ... Z=26. CAT = 3+1+20 = 24', example: 'DOG = 4+15+7 = 26' },
       { title: 'Reverse Alphabet', desc: 'A=26, B=25, ... Z=1. Each letter mapped to its mirror.', example: 'CAT → XZG (C=24, A=26, T=7)' },
       { title: 'Shift Cipher', desc: 'Each letter shifted by N positions. If shift=+2, A→C, B→D.', example: 'BOOK (+3) → ERRN' },
       { title: 'Number Substitution', desc: 'Letters replaced by numbers in a pattern. Often position × 2 or position².', example: 'AB = 1×2, 2×2 = 24' }
     ].map(p => `<div class="formula-box"><strong style="color:var(--cyan);">${p.title}</strong><br>${p.desc}<br><span style="color:var(--green);font-size:0.82rem;">Example: ${p.example}</span></div>`).join('')}
   </div>`;
   container.appendChild(makeConceptCard(unitName, 'Coding-Decoding Patterns', codeHTML));
}

// ==================== UNIT 6: LOGICAL REASONING ====================
function renderLogicalReasoning(unitName, container) {
   // 1. Venn Diagram Constructor
   let vennHTML = `<p>Venn diagrams show set relationships. Enter two sets (comma-separated items) to see the diagram drawn automatically.</p>
   <div class="interactive-zone venn-container">
     <div class="venn-input-row">
       <input type="text" id="venn-a" placeholder="Set A: apple, banana, cherry, date">
       <input type="text" id="venn-b" placeholder="Set B: banana, elderberry, date, fig">
       <button class="btn" id="venn-draw" style="padding:10px 20px;">Draw</button>
     </div>
     <div id="venn-svg-container"></div>
     <div id="venn-counts" class="venn-result"></div>
   </div>
   <div class="trap-box">In Venn diagram questions: draw first, answer second. NEVER trust intuition on set problems.</div>`;
   const c1 = makeConceptCard(unitName, 'Venn Diagram Constructor', vennHTML);
   container.appendChild(c1);
   setTimeout(() => {
      c1.querySelector('#venn-draw').onclick = () => {
         const aItems = c1.querySelector('#venn-a').value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
         const bItems = c1.querySelector('#venn-b').value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
         const both = aItems.filter(x => bItems.includes(x));
         const onlyA = aItems.filter(x => !bItems.includes(x));
         const onlyB = bItems.filter(x => !aItems.includes(x));
         const svgContainer = c1.querySelector('#venn-svg-container');
         svgContainer.innerHTML = `<svg viewBox="0 0 400 250" style="width:100%;max-width:400px;">
           <circle cx="150" cy="125" r="100" fill="rgba(0,210,255,0.15)" stroke="var(--cyan)" stroke-width="2"/>
           <circle cx="250" cy="125" r="100" fill="rgba(74,222,128,0.15)" stroke="var(--green)" stroke-width="2"/>
           <text x="100" y="80" fill="var(--cyan)" font-size="11" font-weight="600">A only (${onlyA.length})</text>
           <text x="175" y="80" fill="var(--text-main)" font-size="11" font-weight="600">Both (${both.length})</text>
           <text x="280" y="80" fill="var(--green)" font-size="11" font-weight="600">B only (${onlyB.length})</text>
           <text x="100" y="135" fill="var(--text-muted)" font-size="9">${onlyA.slice(0,4).join(', ')}</text>
           <text x="175" y="135" fill="var(--text-main)" font-size="9">${both.slice(0,4).join(', ')}</text>
           <text x="270" y="135" fill="var(--text-muted)" font-size="9">${onlyB.slice(0,4).join(', ')}</text>
           <text x="150" y="20" text-anchor="middle" fill="var(--cyan)" font-size="12" font-weight="700">Set A</text>
           <text x="250" y="20" text-anchor="middle" fill="var(--green)" font-size="12" font-weight="700">Set B</text>
         </svg>`;
         c1.querySelector('#venn-counts').innerHTML = `Only A: <strong>${onlyA.length}</strong> | Both: <strong>${both.length}</strong> | Only B: <strong>${onlyB.length}</strong> | Total unique: <strong>${onlyA.length + both.length + onlyB.length}</strong>`;
      };
   }, 0);

   // 2. Syllogism Solver
   let sylHTML = `<p>A syllogism has two premises and a conclusion. Select the premises and conclusion to check validity.</p>
   <div class="interactive-zone">
     <div class="venn-input-row">
       <select id="syl-p1"><option>All A are B</option><option>Some A are B</option><option>No A is B</option><option>Some A are not B</option></select>
       <select id="syl-p2"><option>All B are C</option><option>Some B are C</option><option>No B is C</option><option>Some B are not C</option></select>
     </div>
     <div class="venn-input-row">
       <select id="syl-conc"><option>All A are C</option><option>Some A are C</option><option>No A is C</option><option>Some A are not C</option></select>
       <button class="btn btn-primary" id="syl-check" style="padding:10px 20px;">Check Validity</button>
     </div>
     <div id="syl-result" style="margin-top:12px;"></div>
   </div>
   <div class="trap-box">Real-world knowledge is BANNED in syllogisms. "All chairs are trees" — if the premises say so, it's valid. Only the LOGICAL structure matters.</div>`;
   const c2 = makeConceptCard(unitName, 'Syllogism Solver', sylHTML);
   container.appendChild(c2);
   setTimeout(() => {
      c2.querySelector('#syl-check').onclick = () => {
         const p1 = c2.querySelector('#syl-p1').value;
         const p2 = c2.querySelector('#syl-p2').value;
         const conc = c2.querySelector('#syl-conc').value;
         // Simplified validity check for common syllogism patterns
         let valid = false;
         let reason = '';
         if (p1 === 'All A are B' && p2 === 'All B are C') {
            if (conc === 'All A are C') { valid = true; reason = 'Barbara (AAA-1): If all A⊆B and all B⊆C, then all A⊆C.'; }
            else if (conc === 'Some A are C') { valid = true; reason = 'Valid by subalternation: If all A are C, then some A are C.'; }
         } else if (p1 === 'All A are B' && p2 === 'No B is C') {
            if (conc === 'No A is C') { valid = true; reason = 'Celarent (EAE-1): All A⊆B and B∩C=∅ means A∩C=∅.'; }
         } else if (p1 === 'Some A are B' && p2 === 'All B are C') {
            if (conc === 'Some A are C') { valid = true; reason = 'Darii (AII-1): Some A overlap B, and all B⊆C, so some A are in C.'; }
         } else if (p1 === 'No A is B' && p2.startsWith('All B')) {
            if (conc === 'Some A are not C' || conc === 'No A is C') { valid = true; reason = 'This conclusion can follow depending on the specific terms.'; }
         }
         if (!valid) reason = 'This conclusion does not necessarily follow from the given premises. Try drawing a Venn diagram with the given constraints — you\'ll find a counter-example.';
         c2.querySelector('#syl-result').innerHTML = `<div class="card" style="padding:14px;border-left:3px solid ${valid?'var(--green)':'var(--red)'};"><strong style="color:${valid?'var(--green)':'var(--red)'};">${valid?'VALID ✓':'INVALID ✗'}</strong><br><span class="text-muted" style="font-size:0.88rem;">${reason}</span></div>`;
      };
   }, 0);

   // 3. Deductive vs Inductive
   const diCards = [
      { arg: 'All mammals are warm-blooded. A whale is a mammal. Therefore, a whale is warm-blooded.', type: 'Deductive', why: 'General rule → specific conclusion. If premises are true, conclusion MUST be true.' },
      { arg: 'Every swan I\'ve seen is white. Therefore, all swans are white.', type: 'Inductive', why: 'Specific observations → general conclusion. Conclusion is PROBABLE but not certain.' },
      { arg: 'All students in this class passed. Ram is in this class. Therefore, Ram passed.', type: 'Deductive', why: 'Syllogistic: universal premise + specific case = certain conclusion.' },
      { arg: 'The sun has risen every day so far. Therefore, it will rise tomorrow.', type: 'Inductive', why: 'Past pattern → future prediction. Strong but not logically certain.' },
      { arg: 'If it rains, the ground is wet. It rained. Therefore, the ground is wet.', type: 'Deductive', why: 'Modus Ponens: If P then Q, P is true, therefore Q.' },
      { arg: '8 out of 10 doctors surveyed recommend this brand. Therefore, most doctors prefer it.', type: 'Inductive', why: 'Sample → generalisation. The sample may not represent all doctors.' },
      { arg: 'No reptiles have fur. A snake is a reptile. Therefore, snakes have no fur.', type: 'Deductive', why: 'Universal negative + specific case = certain negative conclusion.' },
      { arg: 'This coin landed heads 7 times in a row. It must be biased.', type: 'Inductive', why: 'Observation pattern → probable explanation. Could be coincidence.' }
   ];
   let diHTML = `<p>Read each argument. Classify it as Deductive (certain) or Inductive (probable). Click to reveal the answer.</p>
   <div class="flip-card-grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));">
     ${diCards.map((c,i) => `<div class="flip-card" style="height:220px;" onclick="this.classList.toggle('flipped')"><div class="flip-card-inner"><div class="flip-card-face" style="padding:16px;"><div style="font-size:0.85rem;line-height:1.5;">"${c.arg}"</div><div class="text-muted" style="position:absolute;bottom:10px;font-size:0.72rem;">Click to classify</div></div><div class="flip-card-face flip-card-back" style="padding:16px;"><div><strong style="color:${c.type==='Deductive'?'var(--cyan)':'var(--green)'};">${c.type}</strong><br><span style="font-size:0.82rem;">${c.why}</span></div></div></div></div>`).join('')}
   </div>`;
   container.appendChild(makeConceptCard(unitName, 'Deductive vs Inductive Reasoning', diHTML));

   // 4. Argument Strength
   let argHTML = `<p>In UGC NET, you're asked if an argument is "strong" or "weak." A strong argument is directly relevant, logical, and not a vague generalisation.</p>
   <div class="interactive-zone">
     <div class="formula-box"><strong>Criteria for STRONG:</strong> (1) Directly addresses the issue (2) Based on facts or logical consequence (3) Not a sweeping generalisation</div>
     ${[{ statement: 'Should computers be used in schools?', arg: 'Yes, because computers help students learn faster through interactive content.', verdict: 'STRONG', reason: 'Directly relevant, specific benefit stated.' },
       { statement: 'Should computers be used in schools?', arg: 'Yes, because everyone uses computers nowadays.', verdict: 'WEAK', reason: 'Vague appeal to popularity. Doesn\'t address educational benefit.' },
       { statement: 'Should India ban plastic bags?', arg: 'Yes, because plastic pollution kills marine life and takes 500 years to decompose.', verdict: 'STRONG', reason: 'Specific facts directly supporting the position.' },
       { statement: 'Should India ban plastic bags?', arg: 'No, because banning things never works.', verdict: 'WEAK', reason: 'Sweeping generalisation. No evidence for this claim.' }
     ].map(ex => `<div class="card" style="padding:14px;margin-bottom:8px;"><div class="text-muted" style="font-size:0.8rem;margin-bottom:4px;">Statement: ${ex.statement}</div><div style="margin-bottom:6px;">"${ex.arg}"</div><div><strong style="color:${ex.verdict==='STRONG'?'var(--green)':'var(--red)'};">${ex.verdict}</strong> — <span class="text-muted" style="font-size:0.85rem;">${ex.reason}</span></div></div>`).join('')}
   </div>`;
   container.appendChild(makeConceptCard(unitName, 'Argument Strength', argHTML));

   // 5. Logical Fallacies Museum
   const fallacies = [
      { name: 'Ad Hominem', latin: 'Argumentum ad hominem', def: 'Attacking the person instead of the argument.', funny: '"You can\'t trust his climate research — he drives an SUV!"', ugc: 'Statement + Assumption questions where the argument targets the speaker.' },
      { name: 'Straw Man', latin: '', def: 'Misrepresenting someone\'s argument to make it easier to attack.', funny: '"You want less military spending? So you want us to be invaded?"', ugc: 'Questions asking to identify the actual vs distorted argument.' },
      { name: 'False Dichotomy', latin: 'Aut...aut', def: 'Presenting only two options when more exist.', funny: '"You\'re either with us or against us."', ugc: 'Questions with "either...or" framing that ignore middle ground.' },
      { name: 'Hasty Generalisation', latin: '', def: 'Drawing broad conclusions from too few examples.', funny: '"I met two rude taxi drivers. All taxi drivers are rude."', ugc: 'Inductive reasoning questions testing sample size awareness.' },
      { name: 'Circular Reasoning', latin: 'Petitio principii', def: 'Using the conclusion as a premise.', funny: '"The Bible is true because it says so in the Bible."', ugc: 'Questions where the \'reason\' just restates the claim.' },
      { name: 'Appeal to Authority', latin: 'Argumentum ad verecundiam', def: 'Citing an authority outside their expertise.', funny: '"A famous actor says this medicine works!"', ugc: 'Questions testing whether the cited authority is relevant.' }
   ];
   let fallHTML = `<p>Logical fallacies are errors in reasoning that make arguments invalid. Scroll through the exhibits to learn the six most tested fallacies.</p>
   <div class="museum-strip">
     ${fallacies.map(f => `<div class="museum-exhibit"><h4>${f.name}</h4>${f.latin ? `<div class="latin">${f.latin}</div>` : ''}<p style="font-size:0.85rem;margin-bottom:8px;">${f.def}</p><div style="font-size:0.82rem;padding:8px;background:rgba(0,0,0,0.15);border-radius:6px;margin-bottom:8px;"><span style="color:var(--green);">😄</span> ${f.funny}</div><div style="font-size:0.78rem;color:var(--text-muted);"><strong>UGC NET:</strong> ${f.ugc}</div></div>`).join('')}
   </div>`;
   container.appendChild(makeConceptCard(unitName, 'Logical Fallacies Museum', fallHTML));

   // 6. Indian Logic — PAUSAA
   const pramanas = [
      { letter: 'P', name: 'Pratyaksha', english: 'Perception', def: 'Direct sensory experience — seeing, hearing, touching.', example: 'Seeing fire on a hill.', schools: 'All schools (Nyaya, Vaisheshika, Samkhya, Buddhism, Jainism, Advaita)' },
      { letter: 'A', name: 'Anumana', english: 'Inference', def: 'Drawing conclusions from observed signs.', example: 'Seeing smoke on the hill → inferring fire.', schools: 'All schools' },
      { letter: 'U', name: 'Upamana', english: 'Comparison', def: 'Knowledge through analogy or comparison.', example: '"A gavaya looks like a cow" — recognising it in a forest.', schools: 'Nyaya, Mimamsa, Advaita' },
      { letter: 'S', name: 'Shabda', english: 'Testimony', def: 'Knowledge from reliable verbal testimony (scripture or expert).', example: 'A doctor telling you your diagnosis.', schools: 'Nyaya, Samkhya, Mimamsa, Vedanta' },
      { letter: 'A', name: 'Arthapatti', english: 'Postulation', def: 'Inferring an unseen fact to explain an observed one.', example: 'Devadatta is fat but doesn\'t eat during the day → he must eat at night.', schools: 'Mimamsa, Advaita' },
      { letter: 'A', name: 'Anupalabdhi', english: 'Non-perception', def: 'Knowledge of absence through not perceiving something.', example: '"There is no pot on the table" — known by not seeing it.', schools: 'Kumarila Bhatta, Advaita' }
   ];
   let pausaaHTML = `<p>Indian logic (Pramana-shastra) recognises up to 6 valid means of knowledge. Remember: <strong style="color:var(--cyan);">PAUSAA</strong>. Click each hexagon for details.</p>
   <div class="hex-grid">
     ${pramanas.map((p, i) => `<div class="hex-item" data-pidx="${i}"><div class="hex-letter">${p.letter}</div><div class="hex-name">${p.name}</div></div>`).join('')}
   </div>
   <div id="pausaa-detail"></div>
   <table class="compare-table" style="margin-top:16px;font-size:0.78rem;">
     <tr><th>Pramana</th><th>Nyaya (6)</th><th>Advaita (6)</th><th>Samkhya (3)</th><th>Buddhism (2)</th></tr>
     ${pramanas.map(p => `<tr><td><strong>${p.name}</strong></td><td>${['P','A','U','S','A','A'].includes(p.letter)?'✓':''}</td><td>✓</td><td>${['Pratyaksha','Anumana','Shabda'].includes(p.name)?'✓':'—'}</td><td>${['Pratyaksha','Anumana'].includes(p.name)?'✓':'—'}</td></tr>`).join('')}
   </table>
   <div class="trap-box">Nyaya accepts ALL 6 pramanas. This is the most asked fact. Buddhism accepts only 2 (Pratyaksha & Anumana). Memorise PAUSAA.</div>`;
   const c6 = makeConceptCard(unitName, 'Indian Logic — PAUSAA', pausaaHTML);
   container.appendChild(c6);
   setTimeout(() => {
      c6.querySelectorAll('.hex-item').forEach(hex => {
         hex.onclick = () => {
            c6.querySelectorAll('.hex-item').forEach(h => h.classList.remove('active'));
            hex.classList.add('active');
            const p = pramanas[parseInt(hex.dataset.pidx)];
            c6.querySelector('#pausaa-detail').innerHTML = `<div class="hex-detail"><strong style="color:var(--cyan);">${p.name}</strong> (${p.english})<br>${p.def}<br><span class="text-muted">Example:</span> ${p.example}<br><span class="text-muted">Accepted by:</span> ${p.schools}</div>`;
         };
      });
   }, 0);
}

// ==================== UNIT 7: DATA INTERPRETATION ====================
function renderDataInterpretation(unitName, container) {
   // 1. Approximation Lab
   let approxHTML = `<p>Most DI questions can be solved faster by rounding. Only calculate precisely if two answer choices are within 5% of each other.</p>
   <div class="interactive-zone">
     <div class="input-group-compact">
       <input type="text" id="approx-input" value="247 * 18 / 52" style="width:240px;" placeholder="e.g. 247 * 18 / 52">
       <button class="btn" id="approx-precise" style="padding:8px 12px;">Precise</button>
       <button class="btn btn-cyan" id="approx-round" style="padding:8px 12px;">Approximate</button>
     </div>
     <div id="approx-result" style="margin-top:12px;"></div>
   </div>`;
   const c1 = makeConceptCard(unitName, 'Approximation Lab', approxHTML);
   container.appendChild(c1);
   setTimeout(() => {
      c1.querySelector('#approx-precise').onclick = () => {
         try { const v = eval(c1.querySelector('#approx-input').value); c1.querySelector('#approx-result').innerHTML = `<div class="formula-box">Precise: <strong style="color:var(--green);">${v.toFixed(2)}</strong></div>`; } catch(e) { c1.querySelector('#approx-result').innerHTML = '<div class="text-red">Invalid expression</div>'; }
      };
      c1.querySelector('#approx-round').onclick = () => {
         const expr = c1.querySelector('#approx-input').value;
         const nums = expr.match(/[\d.]+/g).map(Number);
         const rounded = nums.map(n => { if (n > 100) return Math.round(n/10)*10; if (n > 10) return Math.round(n/5)*5; return Math.round(n); });
         const ops = expr.match(/[+\-*/]/g) || [];
         let approxExpr = '' + rounded[0]; for (let i = 0; i < ops.length; i++) approxExpr += ` ${ops[i]} ${rounded[i+1]}`;
         try {
            const precise = eval(expr); const approx = eval(approxExpr);
            const error = Math.abs((approx - precise) / precise * 100).toFixed(1);
            c1.querySelector('#approx-result').innerHTML = `<div class="formula-box">${nums.map((n,i)=>`${n} ≈ ${rounded[i]}`).join(', ')}<br>Approx: <strong style="color:var(--cyan);">${approx.toFixed(1)}</strong> | Precise: ${precise.toFixed(1)} | Error: ${error}%</div>`;
         } catch(e) { c1.querySelector('#approx-result').innerHTML = '<div class="text-red">Error</div>'; }
      };
   }, 0);

   // 2. Anchor Percentages Drill
   const anchors = [
      { deg: 36, pct: 10 }, { deg: 72, pct: 20 }, { deg: 90, pct: 25 }, { deg: 108, pct: 30 },
      { deg: 144, pct: 40 }, { deg: 180, pct: 50 }, { deg: 270, pct: 75 }, { deg: 360, pct: 100 }
   ];
   let anchorHTML = `<p>Pie charts use degrees. Memorise these 8 anchors and you'll never need to calculate degree-to-percentage again.</p>
   <div class="interactive-zone drill-zone">
     <div class="drill-timer" id="anchor-timer">30</div>
     <div id="anchor-question" style="font-size:1.8rem;font-weight:700;margin-bottom:16px;"></div>
     <div class="input-group-compact" style="justify-content:center;">
       <input type="number" id="anchor-answer" style="width:100px;text-align:center;font-size:1.2rem;" placeholder="%">
       <button class="btn btn-primary" id="anchor-submit" style="padding:10px 20px;">Submit</button>
     </div>
     <div class="drill-score" id="anchor-score">Score: 0/0</div>
     <button class="btn" id="anchor-start" style="margin-top:12px;">Start 30s Drill</button>
   </div>`;
   const c2 = makeConceptCard(unitName, 'Anchor Percentages Drill', anchorHTML);
   container.appendChild(c2);
   setTimeout(() => {
      let drillActive = false, drillScore = 0, drillTotal = 0, drillTimer = null, currentAnchor = null;
      function nextAnchorQ() {
         currentAnchor = anchors[Math.floor(Math.random() * anchors.length)];
         c2.querySelector('#anchor-question').innerText = `${currentAnchor.deg}° = ? %`;
         c2.querySelector('#anchor-answer').value = '';
         c2.querySelector('#anchor-answer').focus();
      }
      function checkAnchor() {
         if (!drillActive) return;
         const ans = parseInt(c2.querySelector('#anchor-answer').value);
         drillTotal++;
         if (ans === currentAnchor.pct) { drillScore++; c2.querySelector('#anchor-question').style.color = 'var(--green)'; }
         else { c2.querySelector('#anchor-question').style.color = 'var(--red)'; c2.querySelector('#anchor-question').innerText += ` → ${currentAnchor.pct}%`; }
         c2.querySelector('#anchor-score').innerText = `Score: ${drillScore}/${drillTotal}`;
         setTimeout(() => { c2.querySelector('#anchor-question').style.color = ''; nextAnchorQ(); }, 500);
      }
      c2.querySelector('#anchor-submit').onclick = checkAnchor;
      c2.querySelector('#anchor-answer').onkeydown = (e) => { if (e.key === 'Enter') checkAnchor(); };
      c2.querySelector('#anchor-start').onclick = () => {
         drillActive = true; drillScore = 0; drillTotal = 0;
         let timeLeft = 30;
         c2.querySelector('#anchor-timer').innerText = timeLeft;
         nextAnchorQ();
         if (drillTimer) clearInterval(drillTimer);
         drillTimer = setInterval(() => {
            timeLeft--;
            c2.querySelector('#anchor-timer').innerText = timeLeft;
            if (timeLeft <= 0) { clearInterval(drillTimer); drillActive = false; c2.querySelector('#anchor-question').innerText = `Done! ${drillScore}/${drillTotal}`; }
         }, 1000);
      };
   }, 0);

   // 3-6: Chart Readers (Bar, Pie, Line, Table)
   // Bar Chart Reader
   let barHTML = `<p>Practice reading bar charts. Click "New Chart" to generate a fresh set of data and questions.</p>
   <div class="interactive-zone">
     <button class="btn btn-cyan" id="bar-new">New Chart</button>
     <div id="bar-svg" style="margin:16px 0;"></div>
     <div id="bar-questions"></div>
   </div>`;
   const c3 = makeConceptCard(unitName, 'Bar Chart Reader', barHTML);
   container.appendChild(c3);
   setTimeout(() => {
      function genBarChart() {
         const labels = ['A', 'B', 'C', 'D', 'E'];
         const values = labels.map(() => Math.floor(Math.random() * 80) + 20);
         const maxV = Math.max(...values);
         const svgEl = c3.querySelector('#bar-svg');
         let bars = ''; const barW = 50, gap = 30, chartH = 200;
         values.forEach((v, i) => {
            const h = (v / maxV) * chartH;
            const x = i * (barW + gap) + 40;
            bars += `<rect x="${x}" y="${chartH - h + 20}" width="${barW}" height="${h}" fill="var(--cyan)" rx="4" opacity="0.8"/>
            <text x="${x + barW/2}" y="${chartH + 40}" text-anchor="middle" fill="var(--text-muted)" font-size="12">${labels[i]}</text>
            <text x="${x + barW/2}" y="${chartH - h + 15}" text-anchor="middle" fill="var(--text-main)" font-size="11">${v}</text>`;
         });
         svgEl.innerHTML = `<svg viewBox="0 0 ${labels.length*(barW+gap)+40} ${chartH+60}" style="width:100%;max-width:500px;">${bars}</svg>`;

         const maxIdx = values.indexOf(Math.max(...values));
         const minIdx = values.indexOf(Math.min(...values));
         const diff = values[0] - values[1];
         const questions = [
            { q: `Which category has the highest value?`, a: labels[maxIdx] },
            { q: `What is the difference between ${labels[0]} and ${labels[1]}?`, a: Math.abs(diff).toString() },
            { q: `What is the value of ${labels[2]}?`, a: values[2].toString() },
            { q: `Which category has the lowest value?`, a: labels[minIdx] }
         ];
         const qEl = c3.querySelector('#bar-questions');
         qEl.innerHTML = '';
         questions.forEach((qn, i) => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;';
            div.innerHTML = `<span style="font-size:0.88rem;">${i+1}. ${qn.q}</span><input type="text" style="width:80px;padding:6px;" data-ans="${qn.a}"><button class="btn" style="padding:4px 12px;font-size:0.78rem;">Check</button>`;
            div.querySelector('button').onclick = () => {
               const inp = div.querySelector('input');
               if (inp.value.trim().toLowerCase() === qn.a.toLowerCase()) { inp.style.borderColor = 'var(--green)'; inp.style.color = 'var(--green)'; }
               else { inp.style.borderColor = 'var(--red)'; inp.value = qn.a; inp.style.color = 'var(--red)'; }
            };
            qEl.appendChild(div);
         });
      }
      genBarChart();
      c3.querySelector('#bar-new').onclick = genBarChart;
   }, 0);

   // Pie Chart Reader
   let pieHTML = `<p>Pie chart segments are measured in degrees (total = 360°). Hover segments to see degree-to-percentage conversion.</p>
   <div class="interactive-zone">
     <button class="btn btn-cyan" id="pie-new">New Chart</button>
     <div id="pie-svg" style="margin:16px 0;"></div>
     <div id="pie-questions"></div>
   </div>`;
   const c4 = makeConceptCard(unitName, 'Pie Chart Reader', pieHTML);
   container.appendChild(c4);
   setTimeout(() => {
      const pieColors = ['#e74c3c','#3498db','#2ecc71','#f1c40f','#9b59b6'];
      function genPieChart() {
         const labels = ['A','B','C','D','E'];
         let vals = labels.map(() => Math.floor(Math.random() * 30) + 10);
         const sum = vals.reduce((a,b) => a+b, 0);
         vals = vals.map(v => Math.round(v/sum*360));
         // Adjust last to make sum 360
         vals[vals.length-1] = 360 - vals.slice(0,-1).reduce((a,b)=>a+b,0);

         let paths = '', startAngle = 0;
         const cx = 150, cy = 150, r = 120;
         vals.forEach((deg, i) => {
            const endAngle = startAngle + deg;
            const startRad = (startAngle - 90) * Math.PI / 180;
            const endRad = (endAngle - 90) * Math.PI / 180;
            const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad);
            const x2 = cx + r * Math.cos(endRad), y2 = cy + r * Math.sin(endRad);
            const largeArc = deg > 180 ? 1 : 0;
            paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z" fill="${pieColors[i]}" opacity="0.75" class="sdg-segment"><title>${labels[i]}: ${deg}° = ${(deg/360*100).toFixed(1)}%</title></path>`;
            const midRad = ((startAngle + endAngle) / 2 - 90) * Math.PI / 180;
            const lx = cx + r * 0.6 * Math.cos(midRad), ly = cy + r * 0.6 * Math.sin(midRad);
            paths += `<text x="${lx}" y="${ly}" text-anchor="middle" fill="white" font-size="11" font-weight="600" pointer-events="none">${labels[i]}</text>`;
            startAngle = endAngle;
         });
         c4.querySelector('#pie-svg').innerHTML = `<svg viewBox="0 0 300 300" style="width:100%;max-width:300px;">${paths}</svg>
         <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;">${labels.map((l,i) => `<span style="font-size:0.82rem;"><span style="display:inline-block;width:10px;height:10px;background:${pieColors[i]};border-radius:2px;margin-right:4px;"></span>${l}: ${vals[i]}° (${(vals[i]/360*100).toFixed(1)}%)</span>`).join('')}</div>`;

         // Questions
         const maxIdx = vals.indexOf(Math.max(...vals));
         const qEl = c4.querySelector('#pie-questions');
         qEl.innerHTML = '';
         const qs = [
            { q: `Which segment is largest?`, a: labels[maxIdx] },
            { q: `What percentage does ${labels[0]} represent?`, a: (vals[0]/360*100).toFixed(1) },
            { q: `How many degrees does ${labels[2]} cover?`, a: vals[2].toString() }
         ];
         qs.forEach((qn, i) => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;';
            div.innerHTML = `<span style="font-size:0.88rem;">${i+1}. ${qn.q}</span><input type="text" style="width:80px;padding:6px;" data-ans="${qn.a}"><button class="btn" style="padding:4px 12px;font-size:0.78rem;">Check</button>`;
            div.querySelector('button').onclick = () => {
               const inp = div.querySelector('input');
               if (Math.abs(parseFloat(inp.value) - parseFloat(qn.a)) < 1 || inp.value.trim().toLowerCase() === qn.a.toLowerCase()) { inp.style.borderColor = 'var(--green)'; inp.style.color = 'var(--green)'; }
               else { inp.style.borderColor = 'var(--red)'; inp.value = qn.a; inp.style.color = 'var(--red)'; }
            };
            qEl.appendChild(div);
         });
      }
      genPieChart();
      c4.querySelector('#pie-new').onclick = genPieChart;
   }, 0);

   // Line Graph + Table (simplified for space)
   let lineHTML = `<p>Line graphs show trends over time. Read the direction (up/down), the rate of change, and comparison between lines.</p>
   <div class="interactive-zone">
     <button class="btn btn-cyan" id="line-new">New Graph</button>
     <div id="line-svg" style="margin:16px 0;"></div>
     <div id="line-questions"></div>
   </div>`;
   const c5 = makeConceptCard(unitName, 'Line Graph Reader', lineHTML);
   container.appendChild(c5);
   setTimeout(() => {
      function genLineGraph() {
         const months = ['Jan','Feb','Mar','Apr','May','Jun'];
         const line1 = months.map(() => Math.floor(Math.random()*60)+20);
         const line2 = months.map(() => Math.floor(Math.random()*60)+20);
         const maxV = Math.max(...line1, ...line2);
         const w = 400, h = 200;
         let svg = `<line x1="40" y1="10" x2="40" y2="${h}" stroke="var(--border-color)" stroke-width="1"/><line x1="40" y1="${h}" x2="${w}" y2="${h}" stroke="var(--border-color)" stroke-width="1"/>`;
         const pts1 = [], pts2 = [];
         months.forEach((m, i) => {
            const x = 40 + i * ((w-60)/(months.length-1));
            const y1 = h - (line1[i]/maxV)*(h-20);
            const y2 = h - (line2[i]/maxV)*(h-20);
            pts1.push(`${x},${y1}`); pts2.push(`${x},${y2}`);
            svg += `<circle cx="${x}" cy="${y1}" r="4" fill="var(--cyan)"/><circle cx="${x}" cy="${y2}" r="4" fill="var(--green)"/>`;
            svg += `<text x="${x}" y="${h+15}" text-anchor="middle" fill="var(--text-muted)" font-size="10">${m}</text>`;
         });
         svg += `<polyline points="${pts1.join(' ')}" fill="none" stroke="var(--cyan)" stroke-width="2"/>`;
         svg += `<polyline points="${pts2.join(' ')}" fill="none" stroke="var(--green)" stroke-width="2"/>`;
         svg += `<text x="${w-30}" y="25" fill="var(--cyan)" font-size="10">Year 1</text><text x="${w-30}" y="40" fill="var(--green)" font-size="10">Year 2</text>`;
         c5.querySelector('#line-svg').innerHTML = `<svg viewBox="0 0 ${w} ${h+25}" style="width:100%;max-width:${w}px;">${svg}</svg>`;

         const maxMonth1 = months[line1.indexOf(Math.max(...line1))];
         const diff = line1[line1.length-1] - line1[0];
         const qEl = c5.querySelector('#line-questions');
         qEl.innerHTML = '';
         [{ q: `In which month was Year 1 highest?`, a: maxMonth1 },
          { q: `Year 1 change from Jan to Jun?`, a: (diff>0?'+':'')+diff },
          { q: `Year 2 value in Mar?`, a: line2[2].toString() }
         ].forEach((qn,i) => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;';
            div.innerHTML = `<span style="font-size:0.88rem;">${i+1}. ${qn.q}</span><input type="text" style="width:80px;padding:6px;"><button class="btn" style="padding:4px 12px;font-size:0.78rem;">Check</button>`;
            div.querySelector('button').onclick = () => {
               const inp = div.querySelector('input');
               if (inp.value.trim().toLowerCase() === qn.a.toLowerCase()) { inp.style.borderColor = 'var(--green)'; }
               else { inp.style.borderColor = 'var(--red)'; inp.value = qn.a; inp.style.color = 'var(--red)'; }
            };
            qEl.appendChild(div);
         });
      }
      genLineGraph();
      c5.querySelector('#line-new').onclick = genLineGraph;
   }, 0);

   // Table DI
   let tableHTML = `<p>Table-based DI is the most common format. Read ROW and COLUMN headers FIRST before touching numbers.</p>
   <div class="interactive-zone">
     <table class="compare-table" style="margin-bottom:16px;">
       <tr><th>Department</th><th>2019</th><th>2020</th><th>2021</th><th>2022</th></tr>
       <tr><td>Sales</td><td>120</td><td>150</td><td>135</td><td>180</td></tr>
       <tr><td>Marketing</td><td>80</td><td>95</td><td>110</td><td>100</td></tr>
       <tr><td>R&D</td><td>200</td><td>220</td><td>250</td><td>280</td></tr>
       <tr><td>HR</td><td>50</td><td>55</td><td>60</td><td>65</td></tr>
     </table>
     <div id="table-qs">
       ${[{ q: '1. Total employees in 2020?', a: '520', work: '150+95+220+55 = 520' },
         { q: '2. % increase in R&D from 2019 to 2022?', a: '40', work: '(280-200)/200 × 100 = 40%' },
         { q: '3. Which dept had highest growth 2019→2022?', a: 'Sales', work: 'Sales: 50%, Marketing: 25%, R&D: 40%, HR: 30%' },
         { q: '4. Ratio of Sales to HR in 2021?', a: '9:4', work: '135:60 = 9:4' },
         { q: '5. Average Marketing employees across 4 years?', a: '96.25', work: '(80+95+110+100)/4 = 96.25' }
       ].map(qn => `<div style="margin-bottom:12px;"><span style="font-size:0.88rem;">${qn.q}</span><br><input type="text" style="width:120px;padding:6px;margin-top:4px;font-size:0.85rem;" placeholder="Answer"><button class="btn" style="padding:4px 12px;font-size:0.78rem;margin-left:8px;" onclick="const i=this.previousElementSibling;if(i.value.trim().replace('%','').toLowerCase()==='${qn.a.toLowerCase()}'){i.style.borderColor='var(--green)';i.style.color='var(--green)';}else{i.style.borderColor='var(--red)';i.value='${qn.a}';i.style.color='var(--red)';}">Check</button><div class="text-muted" style="font-size:0.78rem;margin-top:2px;display:none;" id="tw-${qn.a}">Working: ${qn.work}</div></div>`).join('')}
     </div>
   </div>`;
   container.appendChild(makeConceptCard(unitName, 'Table-Based DI Practice', tableHTML));
}

// ==================== UNIT 8: ICT ====================
function renderICT(unitName, container) {
   // 1. Computer Anatomy
   let compHTML = `<p>The basic architecture of a computer, as tested in UGC NET. Click each component.</p>
   <div class="interactive-zone">
     <svg viewBox="0 0 600 280" style="width:100%;max-width:600px;">
       <rect x="180" y="20" width="240" height="120" rx="10" fill="rgba(83,52,131,0.3)" stroke="var(--accent-color)" stroke-width="2"/>
       <text x="300" y="42" text-anchor="middle" fill="var(--accent-color)" font-size="11" font-weight="600">CPU</text>
       <rect x="200" y="50" width="100" height="40" rx="6" fill="var(--accent2-color)" class="pyramid-level" data-comp="alu"/>
       <text x="250" y="75" text-anchor="middle" fill="white" font-size="11" pointer-events="none">ALU</text>
       <rect x="310" y="50" width="100" height="40" rx="6" fill="var(--accent2-color)" class="pyramid-level" data-comp="cu"/>
       <text x="360" y="75" text-anchor="middle" fill="white" font-size="11" pointer-events="none">Control Unit</text>
       <rect x="200" y="100" width="210" height="30" rx="6" fill="rgba(0,210,255,0.2)" class="pyramid-level" data-comp="reg"/>
       <text x="305" y="120" text-anchor="middle" fill="var(--cyan)" font-size="10" pointer-events="none">Registers / Cache</text>
       <rect x="40" y="170" width="100" height="40" rx="6" fill="rgba(74,222,128,0.2)" class="pyramid-level" data-comp="ram"/>
       <text x="90" y="195" text-anchor="middle" fill="var(--green)" font-size="11" pointer-events="none">RAM</text>
       <rect x="160" y="170" width="100" height="40" rx="6" fill="rgba(248,113,113,0.2)" class="pyramid-level" data-comp="rom"/>
       <text x="210" y="195" text-anchor="middle" fill="var(--red)" font-size="11" pointer-events="none">ROM</text>
       <rect x="20" y="240" width="120" height="30" rx="6" fill="rgba(250,204,21,0.15)" class="pyramid-level" data-comp="input"/>
       <text x="80" y="260" text-anchor="middle" fill="#facc15" font-size="10" pointer-events="none">Input Devices</text>
       <rect x="460" y="240" width="120" height="30" rx="6" fill="rgba(250,204,21,0.15)" class="pyramid-level" data-comp="output"/>
       <text x="520" y="260" text-anchor="middle" fill="#facc15" font-size="10" pointer-events="none">Output Devices</text>
       <rect x="340" y="170" width="120" height="40" rx="6" fill="rgba(0,210,255,0.1)" class="pyramid-level" data-comp="storage"/>
       <text x="400" y="195" text-anchor="middle" fill="var(--cyan)" font-size="10" pointer-events="none">Storage (HDD/SSD)</text>
     </svg>
     <div id="comp-detail" style="margin-top:12px;min-height:40px;"></div>
   </div>`;
   const compTips = {
      alu: '<strong>ALU (Arithmetic Logic Unit):</strong> Performs all arithmetic (+, −, ×, ÷) and logical (AND, OR, NOT) operations.',
      cu: '<strong>Control Unit:</strong> Directs all operations. Fetches instructions, decodes them, coordinates execution. Does NOT process data itself.',
      reg: '<strong>Registers/Cache:</strong> Ultra-fast temporary storage inside the CPU. Cache = L1, L2, L3 (fastest to slowest). UGC NET fact: Cache is the fastest memory.',
      ram: '<strong>RAM (Random Access Memory):</strong> Volatile — loses data when power off. Used for currently running programs. UGC NET: RAM is volatile, ROM is non-volatile.',
      rom: '<strong>ROM (Read Only Memory):</strong> Non-volatile — retains data without power. Contains BIOS/firmware. Types: PROM, EPROM, EEPROM.',
      input: '<strong>Input Devices:</strong> Keyboard, mouse, scanner, microphone, webcam, joystick, touchscreen, OCR reader.',
      output: '<strong>Output Devices:</strong> Monitor, printer, speaker, projector, plotter.',
      storage: '<strong>Secondary Storage:</strong> Non-volatile, large capacity. HDD (magnetic), SSD (flash), CD/DVD (optical), USB drives.'
   };
   const c1 = makeConceptCard(unitName, 'Computer Architecture', compHTML);
   container.appendChild(c1);
   setTimeout(() => {
      c1.querySelectorAll('[data-comp]').forEach(el => {
         el.onclick = () => { c1.querySelector('#comp-detail').innerHTML = `<div class="card" style="padding:12px;">${compTips[el.dataset.comp]}</div>`; };
      });
   }, 0);

   // 2. Network Types
   const nets = [
      { name: 'PAN', full: 'Personal Area Network', range: '~10m', speed: 'Low-Medium', example: 'Bluetooth headphones, smartwatch', size: 60 },
      { name: 'LAN', full: 'Local Area Network', range: '~1km', speed: 'High (1Gbps+)', example: 'Office network, school lab', size: 120 },
      { name: 'MAN', full: 'Metropolitan Area Network', range: '~100km', speed: 'Medium-High', example: 'City-wide cable TV network', size: 180 },
      { name: 'WAN', full: 'Wide Area Network', range: 'Global', speed: 'Variable', example: 'Internet backbone, BSNL network', size: 240 },
      { name: 'Internet', full: 'Network of Networks', range: 'Worldwide', speed: 'Variable', example: 'The global internet', size: 300 }
   ];
   let netHTML = `<p>Networks are classified by geographical range. Click each ring to learn more.</p>
   <div class="interactive-zone" style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;">
     <div class="network-rings" style="width:320px;height:320px;">
       ${nets.map((n, i) => {
         const s = n.size; const offset = (320-s)/2;
         return `<div class="network-ring" data-nidx="${i}" style="width:${s}px;height:${s}px;top:${offset}px;left:${offset}px;"><span class="network-ring-label" style="top:${s/2-10}px;">${n.name}</span></div>`;
       }).reverse().join('')}
     </div>
     <div id="net-detail" style="flex:1;min-width:200px;"></div>
   </div>`;
   const c2 = makeConceptCard(unitName, 'Network Types', netHTML);
   container.appendChild(c2);
   setTimeout(() => {
      c2.querySelectorAll('[data-nidx]').forEach(ring => {
         ring.onclick = () => {
            c2.querySelectorAll('.network-ring').forEach(r => r.classList.remove('active'));
            ring.classList.add('active');
            const n = nets[parseInt(ring.dataset.nidx)];
            c2.querySelector('#net-detail').innerHTML = `<div class="card" style="padding:14px;"><h4 style="color:var(--cyan);margin-bottom:8px;">${n.name} — ${n.full}</h4><div style="font-size:0.88rem;"><strong>Range:</strong> ${n.range}<br><strong>Speed:</strong> ${n.speed}<br><strong>Example:</strong> ${n.example}</div></div>`;
         };
      });
   }, 0);

   // 3. Digital India Timeline
   const digiEvents = [
      { year: '2009', name: 'Aadhaar', desc: 'Unique 12-digit biometric ID for all residents. UIDAI.' },
      { year: '2014', name: 'Digital India', desc: 'Umbrella programme by MeitY. 3 pillars: infrastructure, governance, empowerment.' },
      { year: '2015', name: 'DigiLocker', desc: 'Cloud storage for verified documents. Linked to Aadhaar.' },
      { year: '2016', name: 'UPI', desc: 'Unified Payments Interface by NPCI. Real-time bank transfers via mobile.' },
      { year: '2017', name: 'PMGDISHA', desc: 'Digital literacy for 6 crore rural households. Ministry of Electronics.' },
      { year: '2017', name: 'UMANG', desc: 'Unified Mobile App for e-governance services. 1200+ services.' },
      { year: '2017', name: 'BharatNet', desc: 'Optical fibre to 2.5 lakh gram panchayats. Dept of Telecom.' },
      { year: '2020', name: 'e-Hospital', desc: 'Online registration, payment, and reports for govt hospitals.' }
   ];
   let digiHTML = `<p>Key Digital India initiatives frequently tested in UGC NET. Click each node for details.</p>
   <div class="timeline-container"><div class="timeline-h">
     ${digiEvents.map(e => `<div class="timeline-node" data-dname="${e.name}"><div class="node-year">${e.year}</div><div class="node-dot"></div><div class="node-label">${e.name}</div></div>`).join('')}
   </div></div>
   <div id="digi-detail"></div>`;
   const c3 = makeConceptCard(unitName, 'Digital India Initiatives', digiHTML);
   container.appendChild(c3);
   setTimeout(() => {
      c3.querySelectorAll('.timeline-node').forEach(node => {
         node.onclick = () => {
            const e = digiEvents.find(d => d.name === node.dataset.dname);
            if (e) c3.querySelector('#digi-detail').innerHTML = `<div class="timeline-detail"><strong style="color:var(--cyan);">${e.name} (${e.year})</strong><br>${e.desc}</div>`;
         };
      });
   }, 0);

   // 4. Cyber Security
   let cyberHTML = `<p>Quick reference for cybersecurity terms tested in UGC NET.</p>
   <table class="compare-table">
     <tr><th>Term</th><th>Definition</th><th>Example</th></tr>
     <tr><td><strong>Phishing</strong></td><td>Fraudulent emails/sites that trick users into revealing credentials</td><td>Fake bank email asking for OTP</td></tr>
     <tr><td><strong>Malware</strong></td><td>Malicious software: viruses, worms, trojans</td><td>Trojan hidden in a free download</td></tr>
     <tr><td><strong>Ransomware</strong></td><td>Encrypts files and demands payment for decryption</td><td>WannaCry attack (2017)</td></tr>
     <tr><td><strong>Firewall</strong></td><td>Monitors and filters network traffic based on rules</td><td>Windows Defender Firewall</td></tr>
     <tr><td><strong>VPN</strong></td><td>Creates encrypted tunnel for private communication over public network</td><td>Corporate remote access</td></tr>
     <tr><td><strong>Encryption</strong></td><td>Converting plaintext to ciphertext using an algorithm + key</td><td>AES-256, RSA</td></tr>
     <tr><td><strong>2FA</strong></td><td>Two-factor authentication: password + second factor</td><td>Password + OTP on phone</td></tr>
     <tr><td><strong>DoS Attack</strong></td><td>Overwhelming a server with traffic to make it unavailable</td><td>DDoS attack on a website</td></tr>
   </table>`;
   container.appendChild(makeConceptCard(unitName, 'Cyber Security Quick Reference', cyberHTML));
}

// ==================== UNIT 9: PEOPLE & ENVIRONMENT ====================
function renderEnvironment(unitName, container) {
   // 1. SDG Wheel
   const sdgColors = ['#E5243B','#DDA63A','#4C9F38','#C5192D','#FF3A21','#26BDE2','#FCC30B','#A21942','#FD6925','#DD1367','#FD9D24','#BF8B2E','#3F7E44','#0A97D9','#56C02B','#00689D','#19486A'];
   const sdgNames = ['No Poverty','Zero Hunger','Good Health','Quality Education','Gender Equality','Clean Water','Affordable Energy','Decent Work','Industry & Innovation','Reduced Inequalities','Sustainable Cities','Responsible Consumption','Climate Action','Life Below Water','Life on Land','Peace & Justice','Partnerships'];
   let sdgHTML = `<p>The 17 Sustainable Development Goals (SDGs) were adopted by the UN in 2015. UGC NET frequently tests specific SDG numbers and their focus areas. Click any segment.</p>
   <div class="interactive-zone">
     <svg viewBox="0 0 320 320" style="width:100%;max-width:320px;">
       ${sdgColors.map((color, i) => {
         const angle = (360 / 17) * i - 90;
         const endAngle = angle + 360 / 17;
         const r = 140, cx = 160, cy = 160;
         const startRad = angle * Math.PI / 180;
         const endRad = endAngle * Math.PI / 180;
         const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad);
         const x2 = cx + r * Math.cos(endRad), y2 = cy + r * Math.sin(endRad);
         const midRad = (angle + endAngle) / 2 * Math.PI / 180;
         const lx = cx + (r * 0.7) * Math.cos(midRad), ly = cy + (r * 0.7) * Math.sin(midRad);
         return `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z" fill="${color}" class="sdg-segment" data-sdg="${i}"/>
         <text x="${lx}" y="${ly+4}" text-anchor="middle" fill="white" font-size="9" font-weight="700" pointer-events="none">${i+1}</text>`;
       }).join('')}
     </svg>
     <div id="sdg-detail" style="margin-top:12px;"></div>
   </div>`;
   const c1 = makeConceptCard(unitName, 'SDG Wheel', sdgHTML);
   container.appendChild(c1);
   setTimeout(() => {
      c1.querySelectorAll('.sdg-segment').forEach(seg => {
         seg.onclick = () => {
            const i = parseInt(seg.dataset.sdg);
            c1.querySelector('#sdg-detail').innerHTML = `<div class="card" style="padding:12px;border-left:3px solid ${sdgColors[i]};"><strong style="color:${sdgColors[i]};">SDG ${i+1}: ${sdgNames[i]}</strong></div>`;
         };
      });
   }, 0);

   // 2. Biodiversity Hotspots
   let bioHTML = `<p>India is part of 4 biodiversity hotspots (out of 36 globally). These are areas with high species richness and high threat of habitat loss.</p>
   <div class="ref-grid">
     ${[{ name: 'Western Ghats', states: 'Kerala, TN, Karnataka, Goa, Maharashtra, Gujarat', species: 'Lion-tailed macaque, Nilgiri tahr, Malabar civet', threat: 'Deforestation, mining, urbanisation', color: '#2ecc71' },
       { name: 'Eastern Himalaya', states: 'NE India, Nepal, Bhutan', species: 'Red panda, snow leopard, golden langur', threat: 'Climate change, road building', color: '#3498db' },
       { name: 'Indo-Burma', states: 'NE India, Myanmar, Thailand', species: 'Hoolock gibbon, Asian elephant', threat: 'Logging, shifting cultivation', color: '#e67e22' },
       { name: 'Sundaland (edge)', states: 'Nicobar Islands', species: 'Nicobar pigeon, saltwater crocodile', threat: 'Coastal development, tourism', color: '#e74c3c' }
     ].map(h => `<div class="ref-card" style="border-top:3px solid ${h.color};"><h4 style="color:${h.color};">${h.name}</h4><div style="font-size:0.82rem;"><strong>States:</strong> ${h.states}<br><strong>Key species:</strong> ${h.species}<br><strong>Threat:</strong> ${h.threat}</div></div>`).join('')}
   </div>`;
   container.appendChild(makeConceptCard(unitName, 'Biodiversity Hotspots of India', bioHTML));

   // 3. Environmental Agreements Timeline
   const envEvents = [
      { year: '1972', name: 'Stockholm Conference', detail: 'First UN conference on environment. Created UNEP. "Only One Earth" slogan.' },
      { year: '1987', name: 'Brundtland Report', detail: 'Defined "sustainable development" — meeting present needs without compromising future generations.' },
      { year: '1992', name: 'Rio Earth Summit', detail: 'Agenda 21, UNFCCC, Convention on Biodiversity. Principle of "common but differentiated responsibilities."' },
      { year: '1997', name: 'Kyoto Protocol', detail: 'Binding emission reduction targets for developed nations. Introduced carbon credits.' },
      { year: '2009', name: 'Copenhagen Accord', detail: 'Aimed to limit warming to 2°C. Non-binding. Considered a failure by many.' },
      { year: '2015', name: 'Paris Agreement', detail: 'Limit warming to 1.5°C. All nations submit NDCs. India pledged 33-35% emission intensity reduction.' },
      { year: '2022', name: 'CBD COP15', detail: 'Kunming-Montreal framework. Protect 30% of land and sea by 2030 ("30×30").' }
   ];
   let envHTML = `<p>Key international environmental agreements. Click each node for details.</p>
   <div class="timeline-container"><div class="timeline-h">
     ${envEvents.map(e => `<div class="timeline-node" data-ename="${e.name}"><div class="node-year">${e.year}</div><div class="node-dot"></div><div class="node-label">${e.name}</div></div>`).join('')}
   </div></div><div id="env-detail"></div>`;
   const c3 = makeConceptCard(unitName, 'Environmental Agreements Timeline', envHTML);
   container.appendChild(c3);
   setTimeout(() => {
      c3.querySelectorAll('.timeline-node').forEach(node => {
         node.onclick = () => {
            const e = envEvents.find(ev => ev.name === node.dataset.ename);
            if (e) c3.querySelector('#env-detail').innerHTML = `<div class="timeline-detail"><strong style="color:var(--cyan);">${e.name} (${e.year})</strong><br>${e.detail}</div>`;
         };
      });
   }, 0);

   // 4. Pollution Types
   let pollHTML = `<p>Quick reference for pollution types, sources, effects, and relevant Indian legislation.</p>
   <div class="ref-grid" style="grid-template-columns:repeat(2,1fr);">
     ${[{ type: 'Air', icon: '💨', sources: 'Vehicles, factories, burning', pollutants: 'CO, SO₂, NOₓ, PM2.5, PM10', effects: 'Asthma, lung cancer, acid rain', law: 'Air (Prevention & Control) Act, 1981' },
       { type: 'Water', icon: '💧', sources: 'Sewage, industrial effluents, pesticides', pollutants: 'BOD, COD, heavy metals, pathogens', effects: 'Cholera, eutrophication, Minamata disease', law: 'Water (Prevention & Control) Act, 1974' },
       { type: 'Soil', icon: '🌱', sources: 'Pesticides, industrial waste, mining', pollutants: 'Heavy metals, plastic, chemicals', effects: 'Reduced fertility, bioaccumulation', law: 'Environment Protection Act, 1986' },
       { type: 'Noise', icon: '🔊', sources: 'Traffic, construction, loudspeakers', pollutants: 'Decibels > 85 dB prolonged exposure', effects: 'Hearing loss, stress, hypertension', law: 'Noise Pollution Rules, 2000 (EPA)' }
     ].map(p => `<div class="ref-card"><div style="font-size:1.5rem;margin-bottom:8px;">${p.icon}</div><h4>${p.type} Pollution</h4><div style="font-size:0.82rem;line-height:1.6;"><strong>Sources:</strong> ${p.sources}<br><strong>Pollutants:</strong> ${p.pollutants}<br><strong>Effects:</strong> ${p.effects}<br><strong style="color:var(--cyan);">Law:</strong> ${p.law}</div></div>`).join('')}
   </div>`;
   container.appendChild(makeConceptCard(unitName, 'Pollution Types', pollHTML));
}

// ==================== UNIT 10: HIGHER EDUCATION ====================
function renderHigherEd(unitName, container) {
   // 1. Education Commissions Timeline
   const commissions = [
      { year: '1854', name: "Wood's Despatch", detail: 'Called the "Magna Carta of English Education in India." Recommended graded schools, universities, teacher training, women\'s education.' },
      { year: '1882', name: 'Hunter Commission', detail: 'Focused on primary education. Recommended transfer of primary ed to district boards. First commission after Wood\'s Despatch.' },
      { year: '1917', name: 'Sadler Commission', detail: 'Recommended 12 years of schooling before university. Intermediate colleges. Calcutta University reform.' },
      { year: '1944', name: 'Sargent Report', detail: 'Planned 40-year roadmap for education. Universal free education ages 6-14. Pre-primary from age 3.' },
      { year: '1948', name: 'Radhakrishnan Commission', detail: 'First commission on university education post-independence. Recommended UGC creation. 3-year degree.' },
      { year: '1952', name: 'Mudaliar Commission', detail: 'Secondary education reform. Recommended diversified curriculum, 3-language formula.' },
      { year: '1964', name: 'Kothari Commission', detail: '"Destiny of India is being shaped in her classrooms." Recommended 6% GDP for education. 10+2+3 structure. Common school system.' },
      { year: '1986', name: 'NPE 1986', detail: 'National Policy on Education. Operation Blackboard. Navodaya Vidyalayas. Open University (IGNOU).' },
      { year: '1992', name: 'NPE Revised', detail: 'Programme of Action 1992. Common entrance tests. Minimum levels of learning.' },
      { year: '2020', name: 'NEP 2020', detail: '5+3+3+4 structure. Multidisciplinary. 4-year UG with exit options. Academic Bank of Credits. HECI replacing UGC.' }
   ];
   let commHTML = `<p>The timeline of major education commissions and policies in India. Click each node for details.</p>
   <div class="timeline-v">
     ${commissions.map(c => `<div class="timeline-v-node" data-cname="${c.name}"><div class="v-dot"></div><div class="v-year">${c.year}</div><div class="v-title">${c.name}</div><div class="v-detail">${c.detail}</div></div>`).join('')}
   </div>
   <div class="trap-box">Kothari Commission 1964-66 = "Destiny of India shaped in classrooms." Most asked. Also: recommended 6% of GDP for education (India still hasn't reached it).</div>`;
   const c1 = makeConceptCard(unitName, 'Education Commissions Timeline', commHTML);
   container.appendChild(c1);
   setTimeout(() => {
      c1.querySelectorAll('.timeline-v-node').forEach(node => {
         node.onclick = () => { node.classList.toggle('open'); };
      });
   }, 0);

   // 2. NEP 2020 Comparison
   let nepHTML = `<p>NEP 2020 brings the biggest structural changes to Indian education in decades. Compare old vs new.</p>
   <table class="compare-table">
     <tr><th>Aspect</th><th>Old Policy</th><th class="highlight-col">NEP 2020</th></tr>
     <tr><td><strong>School Structure</strong></td><td>10+2</td><td class="highlight-col">5+3+3+4 (Foundational, Preparatory, Middle, Secondary)</td></tr>
     <tr><td><strong>UG Duration</strong></td><td>3 years (fixed)</td><td class="highlight-col">4 years with multiple exit: Certificate (1yr), Diploma (2yr), Degree (3yr), Honours (4yr)</td></tr>
     <tr><td><strong>Language</strong></td><td>3-language formula</td><td class="highlight-col">Mother tongue/local language as medium of instruction till Class 5</td></tr>
     <tr><td><strong>Vocational</strong></td><td>Separate stream</td><td class="highlight-col">Integrated from Class 6. Internships from Class 6-8.</td></tr>
     <tr><td><strong>Regulator</strong></td><td>UGC, AICTE, NCTE (separate)</td><td class="highlight-col">Single body: HECI (Higher Education Commission of India)</td></tr>
     <tr><td><strong>Assessment</strong></td><td>Board exams stress</td><td class="highlight-col">Competency-based, 360° holistic report card, board exams redesigned</td></tr>
     <tr><td><strong>Teacher Ed</strong></td><td>B.Ed (2yr after UG)</td><td class="highlight-col">4-year integrated B.Ed. Standalone B.Ed phased out by 2030.</td></tr>
     <tr><td><strong>GDP Target</strong></td><td>6% (never reached)</td><td class="highlight-col">6% of GDP reaffirmed</td></tr>
   </table>`;
   container.appendChild(makeConceptCard(unitName, 'NEP 2020 — Old vs New', nepHTML));

   // 3. University Types
   let uniHTML = `<p>Indian universities are classified by who establishes, funds, and controls them.</p>
   <div class="ref-grid" style="grid-template-columns:repeat(2,1fr);">
     ${[{ type: 'Central University', est: 'Act of Parliament', fund: 'Central Govt (UGC)', degrees: 'Grants own degrees', examples: 'JNU, DU, BHU, AMU', color: 'var(--cyan)' },
       { type: 'State University', est: 'State Legislature Act', fund: 'State Govt + UGC', degrees: 'Grants own degrees', examples: 'Mumbai Univ, Calcutta Univ', color: 'var(--green)' },
       { type: 'Deemed University', est: 'UGC recommendation + Govt notification (Sec 3 of UGC Act)', fund: 'Self/Govt', degrees: 'Grants own degrees', examples: 'BITS, Manipal, TISS', color: '#facc15' },
       { type: 'Private University', est: 'State Legislature Act', fund: 'Private bodies', degrees: 'Grants own degrees (within state)', examples: 'Amity, Ashoka, Shiv Nadar', color: 'var(--red)' }
     ].map(u => `<div class="ref-card" style="border-top:3px solid ${u.color};"><h4 style="color:${u.color};">${u.type}</h4><div style="font-size:0.82rem;line-height:1.6;"><strong>Established by:</strong> ${u.est}<br><strong>Funded by:</strong> ${u.fund}<br><strong>Degrees:</strong> ${u.degrees}<br><strong>Examples:</strong> ${u.examples}</div></div>`).join('')}
   </div>`;
   container.appendChild(makeConceptCard(unitName, 'University Types in India', uniHTML));

   // 4. Regulatory Bodies
   let regHTML = `<p>Quick reference for the four major regulatory bodies in Indian higher education.</p>
   <table class="compare-table">
     <tr><th>Body</th><th>Full Name</th><th>Est.</th><th>Function</th><th>NEP 2020 Change</th></tr>
     <tr><td><strong>UGC</strong></td><td>University Grants Commission</td><td>1956</td><td>Funding & standards for universities</td><td>To be replaced by HECI</td></tr>
     <tr><td><strong>AICTE</strong></td><td>All India Council for Technical Education</td><td>1945</td><td>Technical education standards & approval</td><td>Subsumed under HECI</td></tr>
     <tr><td><strong>NCTE</strong></td><td>National Council for Teacher Education</td><td>1993</td><td>Teacher education norms & recognition</td><td>Subsumed under HECI</td></tr>
     <tr><td><strong>NAAC</strong></td><td>National Assessment and Accreditation Council</td><td>1994</td><td>Quality assessment & accreditation of HEIs</td><td>Continues under NAC (proposed)</td></tr>
   </table>`;
   container.appendChild(makeConceptCard(unitName, 'NAAC, UGC, AICTE, NCTE', regHTML));
}

// --- INIT ---
window.onload = () => {
   initStorage();
   initParticles();
   loadData();
};
