// --- 1. STATE & STORAGE ---
const appState = {
   user: { name: 'Jessica', createdAt: Date.now() },
   dataLoaded: { clean: false, full: false },
   cleanQuestions: [],
   fullQuestions: [],
   progress: {},
   sessions: [],
   flashcards: [],
   settings: { theme: 'dark', geminiKey: null },
   streak: { current: 0, lastStudyDate: null },

   // Temporary View State
   currentView: 'dashboard',
   activePaper: null,
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

function initStorage() {
   appState.user = loadState('user', appState.user);
   appState.settings = loadState('settings', appState.settings);
   appState.progress = loadState('progress', appState.progress);
   appState.sessions = loadState('sessions', appState.sessions);
   appState.flashcards = loadState('flashcards', appState.flashcards);
   applySettings();
}

// --- 2. UTILS ---
function showToast(message, type = 'info') {
   const container = document.getElementById('toast-container');
   const toast = document.createElement('div');
   toast.className = 'toast ' + type;
   toast.innerText = message;
   if (type === 'error') toast.style.borderLeftColor = 'var(--red)';
   if (type === 'success') toast.style.borderLeftColor = 'var(--green)';

   container.appendChild(toast);
   setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
   }, 3000);
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

// --- 3. DATA LOADING (Fetch API instead of Dropzone) ---
async function loadData() {
   document.getElementById('loader-modal').classList.remove('hidden');
   try {
      const [cleanRes, fullRes] = await Promise.all([
         fetch('./mcq_clean.json').catch(() => null),
         fetch('./mcq_full.json').catch(() => null)
      ]);

      if (cleanRes && cleanRes.ok) {
         let parsedClean = await cleanRes.json();
         appState.cleanQuestions = Array.isArray(parsedClean) ? parsedClean : (parsedClean.questions || []);
         appState.dataLoaded.clean = true;
      }
      if (fullRes && fullRes.ok) {
         let parsedFull = await fullRes.json();
         appState.fullQuestions = Array.isArray(parsedFull) ? parsedFull : (parsedFull.questions || []);
         appState.dataLoaded.full = true;
      }

      document.getElementById('loader-modal').classList.add('fade-out');
      setTimeout(() => document.getElementById('loader-modal').classList.add('hidden'), 500);

      if (!appState.dataLoaded.clean || appState.cleanQuestions.length === 0) {
         showToast('Failed to load questions! Ensure mcq_clean.json is in the same folder.', 'error');
         console.error('Data load failed. clean:', appState.dataLoaded.clean, 'questions length:', appState.cleanQuestions.length);
      } else {
         console.log('Loaded', appState.cleanQuestions.length, 'clean questions and', appState.fullQuestions.length, 'full questions.');
         showToast(`Loaded ${appState.cleanQuestions.length} questions successfully!`, 'success');
         route('dashboard');
      }
   } catch (error) {
      document.getElementById('loader-modal').classList.add('hidden');
      showToast('Network error while loading JSON.', 'error');
      console.error(error);
   }
}

// --- 4. ROUTING & VIEWS ---
function route(target) {
   document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.target === target);
   });
   document.querySelectorAll('.view-container').forEach(el => {
      if (el.id === 'view-' + target) {
         el.classList.remove('hidden');
         el.classList.add('fade-in');
      } else {
         el.classList.add('hidden');
         el.classList.remove('fade-in');
      }
   });
   appState.currentView = target;

   if (target === 'dashboard') renderDashboard();
   if (target === 'papers') renderPapersList();
   if (target === 'practice') renderPracticeConfig();
   if (target === 'progress') renderProgressCharts();
   if (target === 'flashcards') renderFlashcards();
}

window.appState = { router: route };

document.querySelectorAll('.nav-item').forEach(el => {
   el.addEventListener('click', () => route(el.dataset.target));
});

// --- 5. DASHBOARD & PAPERS RENDER ---
function renderDashboard() {
   const userLogs = Object.values(appState.progress);
   const attempted = userLogs.length;
   const correct = userLogs.filter(L => L.correct).length;
   const acc = attempted ? Math.round((correct / attempted) * 100) : 0;

   document.getElementById('stat-attempted').innerText = attempted;
   document.getElementById('stat-accuracy').innerText = acc + '%';
   document.getElementById('stat-streak').innerText = appState.streak.current + ' days';
   document.getElementById('stat-flashcards').innerText = appState.flashcards.length;

   // Quote logic could be dynamic here
}

function renderPapersList() {
   document.getElementById('paper-detail-view').classList.add('hidden');
   const grid = document.getElementById('papers-grid');
   grid.classList.remove('hidden');
   grid.innerHTML = '';

   const papersMap = {};
   appState.cleanQuestions.forEach(q => {
      if (!papersMap[q.paper]) papersMap[q.paper] = { count: 0, qs: [] };
      papersMap[q.paper].count++;
      papersMap[q.paper].qs.push(q);
   });

   Object.keys(papersMap).forEach(paperName => {
      const p = papersMap[paperName];
      const div = document.createElement('div');
      div.className = 'card paper-card';
      let completeCount = 0;
      p.qs.forEach(q => { if (appState.progress[q.id] && appState.progress[q.id].attempted) completeCount++; });
      const pct = Math.round((completeCount / p.count) * 100) || 0;

      div.innerHTML = `
        <h3>${paperName}</h3>
        <div class="paper-meta">
           <span>${p.count} Questions</span>
           <span>${pct}% Done</span>
        </div>
        <svg class="paper-ring">
           <circle class="ring-bg" cx="20" cy="20" r="16"></circle>
           <circle class="ring-fg" cx="20" cy="20" r="16" stroke-dasharray="100 100" stroke-dashoffset="${100 - pct}" stroke="${pct > 70 ? 'var(--green)' : pct > 0 ? 'var(--cyan)' : 'var(--text-muted)'}"></circle>
        </svg>
      `;
      div.onclick = () => renderPaperDetail(paperName, p.qs);
      grid.appendChild(div);
   });
}

function renderPaperDetail(paperName, questions) {
   document.getElementById('papers-grid').classList.add('hidden');
   document.getElementById('paper-detail-view').classList.remove('hidden');
   document.getElementById('paper-detail-title').innerText = paperName;
   document.getElementById('paper-detail-subtitle').innerText = `${questions.length} Questions`;

   appState.activePaper = questions;

   const list = document.getElementById('paper-questions-list');
   list.innerHTML = '';

   questions.forEach((q, idx) => {
      const div = document.createElement('div');
      div.className = `q-mini-card ${appState.activeQuestionId === q.id ? 'active' : ''}`;
      div.id = `q-list-item-${q.id}`;

      let prog = appState.progress[q.id];
      let statusClass = prog && prog.attempted ? (prog.correct ? 'correct' : 'wrong') : '';

      const words = q.question.split(' ').slice(0, 8).join(' ') + '...';
      div.innerHTML = `
        <div class="q-status-dot ${statusClass}"></div>
        <div>
           <strong>Q${q.question_number}</strong><br>
           <span class="text-muted">${words}</span>
        </div>
      `;
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
   if (activeEl) {
      activeEl.classList.add('active');
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
   }

   document.getElementById('pq-number').innerText = `Question ${q.question_number} / ${appState.activePaper.length}`;
   document.getElementById('pq-text').innerText = q.question;

   const optsContainer = document.getElementById('pq-options');
   optsContainer.innerHTML = '';

   const prog = appState.progress[q.id];
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

      if (!alreadyAttempted) {
         btn.onclick = () => handleAnswerInPaperView(q.id, optKey, q.answer, index);
      }
      optsContainer.appendChild(btn);
   });

   const expContainer = document.getElementById('pq-explanation-container');
   if (alreadyAttempted) {
      expContainer.classList.remove('hidden');
      document.getElementById('pq-explanation').innerHTML = q.explanation ? q.explanation.replace(/\n/g, '<br>') : "No explanation available.";
   } else {
      expContainer.classList.add('hidden');
   }

   document.getElementById('btn-pq-prev').onclick = () => { if (index > 0) renderSingleQuestion(appState.activePaper[index - 1], index - 1); };
   document.getElementById('btn-pq-next').onclick = () => { if (index < appState.activePaper.length - 1) renderSingleQuestion(appState.activePaper[index + 1], index + 1); };

   document.getElementById('btn-add-flashcard').onclick = () => createFlashcard(q);
   document.getElementById('btn-remove-flashcard').onclick = () => removeFlashcard(q);
   document.getElementById('btn-ai-explain').onclick = () => callGemini('explain', q);
   document.getElementById('btn-ai-similar').onclick = () => callGemini('similar', q);
   
   updateFlashcardButton(q);

   const aiBox = document.getElementById('pq-ai-response');
   if (aiBox) aiBox.classList.add('hidden'); // reset ai box
}

function handleAnswerInPaperView(qId, selectedKey, correctKey, idx) {
   const isCorrect = selectedKey === correctKey;
   appState.progress[qId] = {
      attempted: true, correct: isCorrect, selected: selectedKey, lastAttempt: Date.now()
   };
   saveState('progress', appState.progress);
   renderSingleQuestion(appState.activePaper[idx], idx);
   const dot = document.querySelector(`#q-list-item-${qId} .q-status-dot`);
   if (dot) { dot.className = `q-status-dot ${isCorrect ? 'correct' : 'wrong'}`; }
   updatePaperScore();
}

function updatePaperScore() {
   if (!appState.activePaper) return;
   let answered = 0, correct = 0;
   appState.activePaper.forEach(q => {
      if (appState.progress[q.id]) {
         answered++;
         if (appState.progress[q.id].correct) correct++;
      }
   });
   document.getElementById('paper-session-score').innerText = `${correct} / ${answered}`;
}

document.getElementById('back-to-papers').onclick = renderPapersList;

// --- 6. PRACTICE TEST LOGIC ---
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
   }
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
   const checkedSource = document.querySelector('input[name="pt-source"]:checked');
   const source = checkedSource ? checkedSource.value : 'clean';
   const count = parseInt(document.getElementById('pt-num').value);
   const mode = document.querySelector('.mode-card.active').dataset.mode;

   if (appState.cleanQuestions.length === 0) {
      showToast('Load JSON data first! Questions are empty.', 'error');
      return;
   }

   let pool = source === 'clean' ? [...appState.cleanQuestions] : [...appState.fullQuestions];
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
         if (ptState.timeLeft <= 0) {
            clearInterval(ptState.timerInterval);
            submitPracticeTest();
         } else {
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
   } else {
      document.getElementById('pt-timer').style.display = 'none';
   }

   renderPracticeQuestion();
};

document.getElementById('btn-pt-quit').onclick = () => {
   if (confirm('Are you sure you want to quit? Progress will be lost.')) {
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
   const showExplanation = (ptState.mode !== 'exam' && userAttempt);

   ['a', 'b', 'c', 'd'].forEach(optKey => {
      const optText = q.options[optKey];
      if (!optText) return;
      const btn = document.createElement('button');
      btn.className = 'option-btn';

      if (showExplanation) btn.classList.add('disabled');

      if (userAttempt) {
         if (userAttempt === optKey) {
            btn.classList.add(ptState.mode === 'exam' ? 'selected' : (optKey === q.answer ? 'correct' : 'wrong'));
         }
         if (ptState.mode !== 'exam' && optKey === q.answer) btn.classList.add('correct');
      }

      btn.innerHTML = `<span class="option-label">${optKey.toUpperCase()}</span> <span>${optText}</span>`;

      if (!userAttempt || ptState.mode === 'exam') {
         btn.onclick = () => {
            ptState.answers[q.id] = optKey;
            renderPracticeQuestion();
         };
      }
      optsContainer.appendChild(btn);
   });

   const expContainer = document.getElementById('pt-explanation-container');
   if (showExplanation && q.explanation) {
      expContainer.classList.remove('hidden');
      document.getElementById('pt-explanation').innerHTML = q.explanation;
   } else {
      expContainer.classList.add('hidden');
   }

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
      btn.style.width = '32px'; btn.style.height = '32px';
      btn.style.borderRadius = '4px'; btn.style.border = 'none'; btn.style.cursor = 'pointer';
      btn.style.fontFamily = 'var(--font-mono)'; btn.style.fontSize = '0.8rem';
      btn.innerText = idx + 1;

      if (idx === ptState.currentIndex) {
         btn.style.outline = '2px solid var(--accent-color)';
         btn.style.outlineOffset = '2px';
      }

      if (ptState.answers[q.id]) {
         if (ptState.mode === 'exam') {
            btn.style.background = 'var(--accent-color)';
            btn.style.color = '#fff';
         } else {
            btn.style.background = ptState.answers[q.id] === q.answer ? 'var(--green)' : 'var(--red)';
            btn.style.color = '#000';
         }
      } else {
         btn.style.background = 'var(--surface2-color)';
         btn.style.color = 'var(--text-main)';
      }

      btn.onclick = () => { ptState.currentIndex = idx; renderPracticeQuestion(); };
      pal.appendChild(btn);
   });
}

function submitPracticeTest() {
   if (ptState.timerInterval) clearInterval(ptState.timerInterval);
   let correct = 0, wrong = 0, skipped = 0;

   ptState.questions.forEach(q => {
      const ans = ptState.answers[q.id];
      if (!ans) skipped++;
      else if (ans === q.answer) correct++;
      else wrong++;

      if (ans && (!q.flags || q.flags.length === 0)) {
         appState.progress[q.id] = {
            attempted: true, correct: ans === q.answer, selected: ans, lastAttempt: Date.now()
         };
      }
   });

   const acc = ptState.questions.length ? (correct / ptState.questions.length) * 100 : 0;

   appState.sessions.push({ date: Date.now(), score: correct, total: ptState.questions.length, mode: ptState.mode });
   saveState('progress', appState.progress);
   saveState('sessions', appState.sessions);

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
      div.className = 'card';
      div.style.padding = '16px';
      div.innerHTML = `
          <div style="display:flex; gap:16px;">
             <div style="font-family:var(--font-mono); color:var(--text-muted);">${idx + 1}.</div>
             <div>
                <div style="margin-bottom:8px;">${q.question}</div>
                <div style="font-size:0.9rem;">
                   <div><strong>Correct Answer:</strong> ${q.options[q.answer]}</div>
                   ${ans ? `<div><strong>Your Answer:</strong> <span class="${ans === q.answer ? 'text-green' : 'text-red'}">${q.options[ans]}</span></div>` : '<div class="text-muted">Skipped</div>'}
                </div>
                ${q.explanation ? `<div style="margin-top:12px; font-size:0.85rem; color:var(--text-muted); border-left: 2px solid var(--border-color); padding-left: 8px;">${q.explanation}</div>` : ''}
             </div>
          </div>
       `;
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

// --- 7. PROGRESS & SVG CHARTS ---
function renderProgressCharts() {
   const sess = [...appState.sessions].slice(-20);
   const svg = document.getElementById('chart-accuracy');
   if (svg) {
      svg.innerHTML = '';
      if (sess.length < 2) {
         svg.innerHTML = '<text x="10" y="100" fill="gray">Not enough data to plot properly.</text>';
      } else {
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
      appState.sessions.forEach(s => {
         const d = new Date(s.date).toDateString();
         datesMap[d] = (datesMap[d] || 0) + s.total;
      });

      for (let i = 29; i >= 0; i--) {
         const d = new Date(today);
         d.setDate(d.getDate() - i);
         const ds = d.toDateString();
         const count = datesMap[ds] || 0;

         const div = document.createElement('div');
         div.style.width = '100%'; div.style.paddingTop = '100%'; div.style.borderRadius = '4px';
         if (count === 0) div.style.background = 'var(--surface2-color)';
         else if (count < 20) div.style.background = 'rgba(74, 222, 128, 0.3)';
         else if (count < 50) div.style.background = 'rgba(74, 222, 128, 0.6)';
         else div.style.background = 'var(--green)';

         div.title = `${ds}: ${count} questions`;
         grid.appendChild(div);
      }
   }
}

// --- 8. FLASHCARDS & SPACED REPETITION ---
let fcSelectedIds = new Set();

function renderFlashcards() {
   const now = Date.now();
   const dueCards = appState.flashcards.filter(f => f.nextReview <= now);
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

      cardEl.onclick = () => {
         cardEl.classList.add('flipped');
         document.getElementById('fc-actions').classList.remove('hidden');
         cardEl.onclick = null;
      };
   }
   
   // Render card library
   renderFCLibrary();
}

function renderFCLibrary() {
   const lib = document.getElementById('fc-library');
   const totalEl = document.getElementById('fc-total-count');
   if(!lib) return;
   lib.innerHTML = '';
   totalEl.innerText = `(${appState.flashcards.length} cards)`;
   
   const delBtn = document.getElementById('btn-fc-delete-selected');
   delBtn.style.display = fcSelectedIds.size > 0 ? 'inline-flex' : 'none';
   delBtn.innerText = `Delete Selected (${fcSelectedIds.size})`;
   
   if(appState.flashcards.length === 0) {
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
   appState.flashcards.forEach(fc => {
      const resp = fc.lastResponse || 'none';
      if(bucketCounts[resp] !== undefined) bucketCounts[resp]++;
      else bucketCounts.none++;
   });
   
   const grid = document.createElement('div');
   grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:16px;';
   
   bucketDefs.forEach(bdef => {
      const count = bucketCounts[bdef.key];
      const tile = document.createElement('div');
      tile.className = 'card';
      tile.style.cssText = `cursor:pointer;text-align:center;padding:28px 16px;border:2px solid ${bdef.borderColor};transition:transform 0.3s,box-shadow 0.3s;`;
      tile.innerHTML = `
         <div style="font-size:2.5rem;margin-bottom:8px;">${bdef.icon}</div>
         <h3 style="margin:0 0 4px 0;color:${bdef.color};">${bdef.label}</h3>
         <div class="text-muted" style="font-size:0.8rem;margin-bottom:12px;">${bdef.subtitle}</div>
         <div style="font-size:2rem;font-weight:700;color:${bdef.color};">${count}</div>
         <div class="text-muted" style="font-size:0.75rem;">cards</div>
      `;
      tile.onmouseenter = () => { tile.style.transform = 'translateY(-6px)'; tile.style.boxShadow = `0 12px 32px ${bdef.borderColor}`; };
      tile.onmouseleave = () => { tile.style.transform = ''; tile.style.boxShadow = ''; };
      tile.onclick = () => renderBucketDetail(bdef);
      grid.appendChild(tile);
   });
   
   lib.appendChild(grid);
}

function renderBucketDetail(bdef) {
   const lib = document.getElementById('fc-library');
   lib.innerHTML = '';
   
   const cards = appState.flashcards.filter(fc => (fc.lastResponse || 'none') === bdef.key);
   
   const header = document.createElement('div');
   header.style.cssText = 'display:flex;align-items:center;gap:16px;margin-bottom:24px;';
   header.innerHTML = `
      <button class="btn" id="fc-back-to-buckets" style="padding:8px 16px;">
         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
         Back
      </button>
      <div>
         <h2 style="margin:0;color:${bdef.color};">${bdef.icon} ${bdef.label}</h2>
         <span class="text-muted" style="font-size:0.85rem;">${cards.length} cards \u00B7 ${bdef.subtitle}</span>
      </div>
   `;
   lib.appendChild(header);
   header.querySelector('#fc-back-to-buckets').onclick = () => renderFCLibrary();
   
   if(cards.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'card';
      empty.style.cssText = 'text-align:center;padding:48px;';
      empty.innerHTML = '<h3 class="text-muted">No cards in this bucket</h3><p class="text-muted" style="font-size:0.9rem;">Cards will appear here as you review them.</p>';
      lib.appendChild(empty);
      return;
   }
   
   const toolbar = document.createElement('div');
   toolbar.style.cssText = 'display:flex;gap:12px;align-items:center;margin-bottom:16px;';
   toolbar.innerHTML = `
      <label style="cursor:pointer;display:flex;align-items:center;gap:8px;font-size:0.85rem;color:var(--text-muted);">
         <input type="checkbox" id="fc-select-all" style="accent-color:var(--cyan);cursor:pointer;"> Select All
      </label>
   `;
   lib.appendChild(toolbar);
   
   toolbar.querySelector('#fc-select-all').onchange = (e) => {
      cards.forEach(fc => {
         if(e.target.checked) fcSelectedIds.add(fc.id);
         else fcSelectedIds.delete(fc.id);
      });
      renderBucketDetail(bdef);
   };
   
   const now = Date.now();
   const otherBuckets = ['hard','good','easy','none'].filter(k => k !== bdef.key);
   const bucketLabels = { hard: '\u{1F534} Hard', good: '\u{1F7E1} Good', easy: '\u{1F7E2} Easy', none: '\u26AA New' };
   const bucketColors = { hard: '#f87171', good: '#facc15', easy: '#4ade80', none: '#00d2ff' };
   
   cards.forEach(fc => {
      const rightCount = fc.rightCount || 0;
      const wrongCount = fc.wrongCount || 0;
      const isDue = fc.nextReview <= now;
      const nextDate = new Date(fc.nextReview);
      const nextStr = isDue ? 'Due Now' : nextDate.toLocaleDateString() + ' ' + nextDate.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
      const isChecked = fcSelectedIds.has(fc.id);
      
      const div = document.createElement('div');
      div.className = 'card';
      div.style.cssText = `padding:16px;border-left:4px solid ${bdef.borderColor};margin-bottom:4px;`;
      div.innerHTML = `
         <div style="display:flex;align-items:flex-start;gap:12px;">
            <input type="checkbox" style="margin-top:4px;cursor:pointer;accent-color:var(--cyan);" ${isChecked ? 'checked' : ''}>
            <div style="flex:1;min-width:0;">
               <div style="font-weight:500;font-size:0.95rem;line-height:1.4;margin-bottom:6px;">${fc.front.substring(0, 120)}${fc.front.length > 120 ? '...' : ''}</div>
               <div style="display:flex;gap:14px;font-size:0.78rem;color:var(--text-muted);flex-wrap:wrap;">
                  <span style="color:var(--green);">\u2713 ${rightCount} right</span>
                  <span style="color:var(--red);">\u2717 ${wrongCount} wrong</span>
                  <span>Next: ${nextStr}</span>
               </div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;align-items:flex-start;flex-wrap:wrap;">
               <button class="btn fc-view-btn" style="font-size:0.72rem;padding:5px 10px;">View</button>
               ${otherBuckets.map(bk => `<button class="btn fc-move-btn" data-move="${bk}" style="font-size:0.68rem;padding:4px 8px;color:${bucketColors[bk]};border-color:${bucketColors[bk]}44;">${bucketLabels[bk]}</button>`).join('')}
               <button class="btn fc-rm-btn" style="font-size:0.72rem;padding:5px 8px;color:var(--red);border-color:rgba(248,113,113,0.3);">\u2715</button>
            </div>
         </div>
      `;
      
      div.querySelector('input[type="checkbox"]').onchange = (e) => {
         if(e.target.checked) fcSelectedIds.add(fc.id);
         else fcSelectedIds.delete(fc.id);
         const delB = document.getElementById('btn-fc-delete-selected');
         delB.style.display = fcSelectedIds.size > 0 ? 'inline-flex' : 'none';
         delB.innerText = `Delete Selected (${fcSelectedIds.size})`;
      };
      
      div.querySelector('.fc-view-btn').onclick = () => openFCPreview(fc, bdef);
      
      div.querySelectorAll('.fc-move-btn').forEach(btn => {
         btn.onclick = () => {
            fc.lastResponse = btn.dataset.move;
            saveState('flashcards', appState.flashcards);
            showToast(`Moved to ${bucketLabels[btn.dataset.move]}`, 'success');
            renderBucketDetail(bdef);
         };
      });
      
      div.querySelector('.fc-rm-btn').onclick = () => {
         appState.flashcards = appState.flashcards.filter(f => f.id !== fc.id);
         fcSelectedIds.delete(fc.id);
         saveState('flashcards', appState.flashcards);
         showToast('Flashcard removed.', 'info');
         renderBucketDetail(bdef);
      };
      
      lib.appendChild(div);
   });
}

function openFCPreview(fc, bdef) {
   const overlay = document.createElement('div');
   overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);';
   
   const modal = document.createElement('div');
   modal.style.cssText = 'max-width:600px;width:90%;display:flex;flex-direction:column;align-items:center;gap:20px;';
   
   let flipped = false;
   const borderCol = bdef ? bdef.borderColor : 'var(--border-color)';
   
   const card = document.createElement('div');
   card.style.cssText = 'width:100%;min-height:300px;perspective:1000px;cursor:pointer;';
   card.innerHTML = `
      <div style="position:relative;width:100%;min-height:300px;transition:transform 0.6s;transform-style:preserve-3d;" id="fc-preview-inner">
         <div style="position:absolute;top:0;left:0;right:0;bottom:0;backface-visibility:hidden;background:var(--surface-color);backdrop-filter:blur(20px);border:2px solid ${borderCol};border-radius:16px;padding:32px;display:flex;align-items:center;justify-content:center;flex-direction:column;">
            <div style="font-size:1.3rem;line-height:1.5;text-align:center;">${fc.front}</div>
            <div class="text-muted" style="position:absolute;bottom:16px;font-size:0.8rem;">Click to flip</div>
         </div>
         <div style="position:absolute;top:0;left:0;right:0;bottom:0;backface-visibility:hidden;transform:rotateY(180deg);background:var(--surface-color);backdrop-filter:blur(20px);border:2px solid ${borderCol};border-radius:16px;padding:32px;display:flex;align-items:center;justify-content:center;overflow-y:auto;">
            <div style="font-size:1.05rem;line-height:1.6;">${fc.back}</div>
         </div>
      </div>
   `;
   
   card.onclick = () => {
      flipped = !flipped;
      card.querySelector('#fc-preview-inner').style.transform = flipped ? 'rotateY(180deg)' : '';
   };
   
   const stats = document.createElement('div');
   stats.style.cssText = 'display:flex;gap:16px;font-size:0.85rem;color:var(--text-muted);';
   stats.innerHTML = `
      <span style="color:var(--green);">\u2713 ${fc.rightCount || 0} right</span>
      <span style="color:var(--red);">\u2717 ${fc.wrongCount || 0} wrong</span>
      <span>Bucket: ${fc.lastResponse || 'new'}</span>
   `;
   
   const moveBar = document.createElement('div');
   moveBar.style.cssText = 'display:flex;gap:8px;';
   const bucketLabels = { hard: '\u{1F534} Hard', good: '\u{1F7E1} Good', easy: '\u{1F7E2} Easy' };
   const bucketColors = { hard: '#f87171', good: '#facc15', easy: '#4ade80' };
   ['hard','good','easy'].forEach(bk => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.style.cssText = `font-size:0.8rem;padding:6px 16px;color:${bucketColors[bk]};border-color:${bucketColors[bk]}66;`;
      btn.innerText = `Move to ${bucketLabels[bk]}`;
      btn.onclick = () => {
         fc.lastResponse = bk;
         saveState('flashcards', appState.flashcards);
         showToast(`Moved to ${bucketLabels[bk]}`, 'success');
         overlay.remove();
         if(bdef) renderBucketDetail(bdef);
         else renderFCLibrary();
      };
      moveBar.appendChild(btn);
   });
   
   const closeBtn = document.createElement('button');
   closeBtn.className = 'btn';
   closeBtn.innerText = 'Close';
   closeBtn.style.cssText = 'padding:10px 40px;';
   closeBtn.onclick = () => overlay.remove();
   
   modal.appendChild(card);
   modal.appendChild(stats);
   modal.appendChild(moveBar);
   modal.appendChild(closeBtn);
   overlay.appendChild(modal);
   overlay.onclick = (e) => { if(e.target === overlay) overlay.remove(); };
   document.body.appendChild(overlay);
}

document.getElementById('btn-fc-delete-selected').onclick = () => {
   if(fcSelectedIds.size === 0) return;
   if(!confirm(`Delete ${fcSelectedIds.size} selected flashcards?`)) return;
   appState.flashcards = appState.flashcards.filter(f => !fcSelectedIds.has(f.id));
   fcSelectedIds.clear();
   saveState('flashcards', appState.flashcards);
   renderFlashcards();
   showToast('Selected flashcards deleted.', 'success');
};

window.handleFCResponse = function (quality) {
   const c = appState.activeFlashcard;
   if (!c) return;

   // Track right/wrong
   c.lastResponse = quality;
   if (quality === 'hard') {
      c.wrongCount = (c.wrongCount || 0) + 1;
      c.ease = Math.max(1.3, c.ease - 0.2);
      c.interval = 0;
   } else if (quality === 'good') {
      c.rightCount = (c.rightCount || 0) + 1;
      c.interval = c.interval === 0 ? 1 : Math.round(c.interval * c.ease);
   } else if (quality === 'easy') {
      c.rightCount = (c.rightCount || 0) + 1;
      c.ease += 0.15;
      c.interval = c.interval === 0 ? 3 : Math.round(c.interval * c.ease * 1.3);
   }

   if (c.interval === 0) c.nextReview = Date.now() + 10 * 60 * 1000;
   else c.nextReview = Date.now() + c.interval * 86400000;

   saveState('flashcards', appState.flashcards);
   renderFlashcards();
}

function createFlashcard(q) {
   const existing = appState.flashcards.find(f => f.qId === q.id);
   if (existing) { showToast('Flashcard already exists!', 'info'); return; }
   appState.flashcards.push({
      id: 'fc_' + Date.now(), qId: q.id, front: q.question,
      back: `<strong>${q.options[q.answer]}</strong><br><br>${q.explanation || ''}`,
      nextReview: Date.now(), ease: 2.5, interval: 0,
      rightCount: 0, wrongCount: 0, lastResponse: 'none'
   });
   saveState('flashcards', appState.flashcards);
   showToast('Added to Flashcards!', 'success');
   document.getElementById('stat-flashcards').innerText = appState.flashcards.length;
   updateFlashcardButton(q);
}

function removeFlashcard(q) {
   appState.flashcards = appState.flashcards.filter(f => f.qId !== q.id);
   saveState('flashcards', appState.flashcards);
   showToast('Removed from Flashcards.', 'info');
   document.getElementById('stat-flashcards').innerText = appState.flashcards.length;
   updateFlashcardButton(q);
}

function updateFlashcardButton(q) {
   const addBtn = document.getElementById('btn-add-flashcard');
   const removeBtn = document.getElementById('btn-remove-flashcard');
   if(!addBtn) return;
   const exists = appState.flashcards.find(f => f.qId === q.id);
   if(exists) {
      addBtn.innerText = 'âœ“ Added to Flashcards';
      addBtn.classList.add('disabled');
      addBtn.style.opacity = '0.6';
      if(removeBtn) removeBtn.classList.remove('hidden');
   } else {
      addBtn.innerText = 'Add to Flashcards';
      addBtn.classList.remove('disabled');
      addBtn.style.opacity = '1';
      if(removeBtn) removeBtn.classList.add('hidden');
   }
}

// --- 9. GEMINI AI ---
async function callGemini(mode, q) {
   const apiKey = appState.settings.geminiKey;
   if (!apiKey) { showToast('Please add Gemini API key in settings', 'error'); return; }

   let box = document.getElementById('pq-ai-response');
   if (box) {
      box.classList.remove('hidden');
      box.innerHTML = `<div class="ai-msg ai"><div class="ai-loader"></div> Generating ${mode === 'explain' ? 'explanation' : 'similar questions'}...</div>`;
   }

   const prompt = mode === 'explain'
      ? `Explain this UGC NET English question in simple terms, breaking down the options. Question: "${q.question}" Options: ${JSON.stringify(q.options)} Correct Answer: "${q.answer}". Original explanation: "${q.explanation}". Format response in clean HTML without markdown backticks.`
      : `Generate 1 similar multiple choice question based on this topic for UGC NET English literature. Output MUST be ONLY a valid JSON object matching exactly this schema: { "question": "...", "options": {"a": "...", "b": "...", "c": "...", "d": "..."}, "answer": "a", "explanation": "..." }. Do not include markdown ticks. Topic Question: ${q.question}`;

   try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
         method: 'POST', headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7 } })
      });
      const data = await res.json();
      let text = data.candidates[0].content.parts[0].text;

      if (box) {
         if (mode === 'explain') {
            box.innerHTML = `<div class="ai-msg ai"><strong>AI Explanation:</strong><br>${text}</div>`;
         } else {
            let parsed;
            try { parsed = JSON.parse(text); } catch (e) { parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '')); }
            box.innerHTML = `
                <div class="ai-msg ai"><strong>AI Generated Similar Question:</strong><br><br>
                <strong>Q:</strong> ${parsed.question}<br>
                a) ${parsed.options.a}<br>b) ${parsed.options.b}<br>c) ${parsed.options.c}<br>d) ${parsed.options.d}<br><br>
                <strong class="text-green">Ans: ${parsed.answer}</strong><br>${parsed.explanation}
                </div>`;
         }
      }
   } catch (err) {
      if (box) box.innerHTML = `<div class="ai-msg ai" style="border-color:var(--red);">Failed to connect to AI. Check API key.</div>`;
      else showToast('AI connection failed', 'error');
   }
}

document.getElementById('btn-generate-ai-fc').onclick = () => {
   const apiKey = appState.settings.geminiKey;
   if (!apiKey) { showToast('Please add Gemini API key in settings', 'error'); return; }
   if (appState.cleanQuestions.length === 0) { showToast('No question data loaded!', 'error'); return; }

   // Build paper list for the popup
   const papersMap = {};
   appState.cleanQuestions.forEach(q => {
      if (!papersMap[q.paper]) papersMap[q.paper] = [];
      papersMap[q.paper].push(q);
   });

   // Create modal overlay
   const overlay = document.createElement('div');
   overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

   const modal = document.createElement('div');
   modal.style.cssText = 'background:var(--surface-color);backdrop-filter:blur(20px);border:1px solid var(--border-color);border-radius:16px;padding:32px;max-width:500px;width:90%;max-height:70vh;display:flex;flex-direction:column;';
   modal.innerHTML = `
      <h2 style="margin:0 0 8px 0;color:var(--cyan);">Generate AI Flashcards</h2>
      <p class="text-muted" style="margin-bottom:16px;font-size:0.9rem;">Pick a paper to use as context for generating vocabulary flashcards.</p>
      <div id="ai-fc-paper-list" style="overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:8px;"></div>
      <button class="btn" style="margin-top:16px;width:100%;" id="ai-fc-cancel">Cancel</button>
   `;
   overlay.appendChild(modal);
   document.body.appendChild(overlay);

   const listEl = modal.querySelector('#ai-fc-paper-list');
   Object.keys(papersMap).forEach(paperName => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.style.cssText = 'text-align:left;justify-content:flex-start;width:100%;';
      btn.innerText = `${paperName} (${papersMap[paperName].length} Qs)`;
      btn.onclick = async () => {
         overlay.remove();
         await generateAIFlashcards(papersMap[paperName], apiKey);
      };
      listEl.appendChild(btn);
   });

   modal.querySelector('#ai-fc-cancel').onclick = () => overlay.remove();
   overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
};

async function generateAIFlashcards(questions, apiKey) {
   // Pick a random question with an explanation
   const withExp = questions.filter(q => q.explanation && q.explanation.length > 20);
   if (withExp.length === 0) { showToast('No questions with explanations in this paper.', 'error'); return; }
   const q = withExp[Math.floor(Math.random() * withExp.length)];

   showToast('Generating AI flashcards...', 'info');
   const btn = document.getElementById('btn-generate-ai-fc');
   const origText = btn.innerText;
   btn.innerText = 'Generating...'; btn.classList.add('disabled');

   try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
         method: 'POST', headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ contents: [{ parts: [{ text: `Generate 3 vocabulary flashcards based on this context. Output MUST be ONLY a valid JSON array of objects, schema: [{ "front": "term", "back": "definition" }]. No markdown, no code fences, just the raw JSON array. Context: ${q.explanation}` }] }], generationConfig: { temperature: 0.7 } })
      });
      const data = await res.json();

      // Check for API errors
      if (data.error) {
         showToast('API Error: ' + data.error.message, 'error');
         console.error('Gemini API Error:', data.error);
         btn.innerText = origText; btn.classList.remove('disabled');
         return;
      }
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
         showToast('Unexpected API response. Check console for details.', 'error');
         console.error('Unexpected Gemini response:', JSON.stringify(data));
         btn.innerText = origText; btn.classList.remove('disabled');
         return;
      }

      let text = data.candidates[0].content.parts[0].text;
      let parsed;
      try { parsed = JSON.parse(text); } catch (e) { parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim()); }

      if (!Array.isArray(parsed)) { showToast('AI returned unexpected format.', 'error'); return; }

      parsed.forEach(pc => {
         appState.flashcards.push({ id: 'fc_ai_' + Date.now() + Math.random(), qId: 'ai_' + Date.now(), front: pc.front, back: pc.back, nextReview: Date.now(), ease: 2.5, interval: 0 });
      });
      saveState('flashcards', appState.flashcards);
      renderFlashcards();
      showToast(`Added ${parsed.length} AI generated flashcards!`, 'success');
   } catch (err) {
      console.error('AI Card Generation Error:', err);
      showToast('Failed: ' + err.message, 'error');
   }
   btn.innerText = origText; btn.classList.remove('disabled');
}

// --- SETTINGS BINDINGS ---
document.getElementById('theme-toggle').onclick = () => {
   appState.settings.theme = appState.settings.theme === 'dark' ? 'light' : 'dark';
   applySettings();
   saveState('settings', appState.settings);
};

document.getElementById('btn-save-settings').onclick = () => {
   appState.user.name = document.getElementById('setting-name').value || 'Jessica';
   appState.settings.geminiKey = document.getElementById('setting-gemini-key').value || null;
   saveState('user', appState.user); saveState('settings', appState.settings);
   applySettings(); showToast('Settings saved successfully!', 'success');
};

document.getElementById('btn-reset-data').onclick = () => {
   if (confirm('Are you SURE you want to reset all progress? This cannot be undone.')) {
      localStorage.clear(); location.reload();
   }
};

// --- 10. PARTICLE BACKGROUND ---
function initParticles() {
   const canvas = document.getElementById('particleCanvas');
   if (!canvas) return;
   const ctx = canvas.getContext('2d');
   let width, height;
   let particles = [];

   function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
   }

   window.addEventListener('resize', resize);
   resize();

   for (let i = 0; i < 50; i++) {
      particles.push({
         x: Math.random() * width,
         y: Math.random() * height,
         vx: (Math.random() - 0.5) * 0.5,
         vy: (Math.random() - 0.5) * 0.5,
         radius: Math.random() * 2 + 1
      });
   }

   function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';

      for (let i = 0; i < particles.length; i++) {
         let p = particles[i];
         p.x += p.vx;
         p.y += p.vy;

         if (p.x < 0 || p.x > width) p.vx *= -1;
         if (p.y < 0 || p.y > height) p.vy *= -1;

         ctx.beginPath();
         ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
         ctx.fill();

         for (let j = i + 1; j < particles.length; j++) {
            let p2 = particles[j];
            let dist = Math.hypot(p.x - p2.x, p.y - p2.y);
            if (dist < 120) {
               ctx.beginPath();
               ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 - dist / 1200})`;
               ctx.moveTo(p.x, p.y);
               ctx.lineTo(p2.x, p2.y);
               ctx.stroke();
            }
         }
      }
      requestAnimationFrame(draw);
   }
   draw();
}

// INIT
window.onload = () => {
   initStorage();
   initParticles();
   loadData(); // This handles fetch sequence now
};
