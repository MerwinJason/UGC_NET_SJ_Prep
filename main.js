// --- 1. STATE & STORAGE ---
const appState = {
  user: { name: 'Scholar', createdAt: Date.now() },
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
  catch(e) { return defaultVal; }
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
  if(type === 'error') toast.style.borderLeftColor = 'var(--red)';
  if(type === 'success') toast.style.borderLeftColor = 'var(--green)';
  
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function applySettings() {
   document.getElementById('user-name-display').innerText = appState.user.name;
   document.getElementById('setting-name').value = appState.user.name;
   if(appState.settings.geminiKey) {
      document.getElementById('setting-gemini-key').value = appState.settings.geminiKey;
      document.querySelectorAll('[id^="btn-ai-"]').forEach(btn => btn.style.display = 'inline-flex');
   }
   if (appState.settings.theme === 'light') document.body.classList.add('light-theme');
   else document.body.classList.remove('light-theme');
   
   const aiBtn = document.getElementById('btn-generate-ai-fc');
   if(appState.settings.geminiKey) aiBtn.style.display = 'inline-flex';
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

       if (!appState.dataLoaded.clean) {
           showToast('Failed to load JSON data! Ensure mcq_clean.json is served properly.', 'error');
           // Keep trying on screen gracefully or show error modal
       } else {
           showToast('Data loaded successfully!', 'success');
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
   
   if(target === 'dashboard') renderDashboard();
   if(target === 'papers') renderPapersList();
   if(target === 'practice') renderPracticeConfig();
   if(target === 'progress') renderProgressCharts();
   if(target === 'flashcards') renderFlashcards();
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
      if(!papersMap[q.paper]) papersMap[q.paper] = { count: 0, qs: [] };
      papersMap[q.paper].count++;
      papersMap[q.paper].qs.push(q);
   });
   
   Object.keys(papersMap).forEach(paperName => {
      const p = papersMap[paperName];
      const div = document.createElement('div');
      div.className = 'card paper-card';
      let completeCount = 0;
      p.qs.forEach(q => { if(appState.progress[q.id] && appState.progress[q.id].attempted) completeCount++; });
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
   if(activeEl) {
     activeEl.classList.add('active');
     activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
   }
   
   document.getElementById('pq-number').innerText = `Question ${q.question_number} / ${appState.activePaper.length}`;
   document.getElementById('pq-text').innerText = q.question;
   
   const optsContainer = document.getElementById('pq-options');
   optsContainer.innerHTML = '';
   
   const prog = appState.progress[q.id];
   const alreadyAttempted = !!prog;
   
   ['a','b','c','d'].forEach(optKey => {
      const optText = q.options[optKey];
      if(!optText) return;
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      if(alreadyAttempted) btn.classList.add('disabled');
      
      if(alreadyAttempted) {
         if(optKey === q.answer) btn.classList.add('correct');
         if(prog.selected === optKey && optKey !== q.answer) btn.classList.add('wrong');
      }
      
      btn.innerHTML = `<span class="option-label">${optKey.toUpperCase()}</span> <span>${optText}</span>`;
      
      if(!alreadyAttempted) {
         btn.onclick = () => handleAnswerInPaperView(q.id, optKey, q.answer, index);
      }
      optsContainer.appendChild(btn);
   });
   
   const expContainer = document.getElementById('pq-explanation-container');
   if(alreadyAttempted) {
      expContainer.classList.remove('hidden');
      document.getElementById('pq-explanation').innerHTML = q.explanation ? q.explanation.replace(/\n/g, '<br>') : "No explanation available.";
   } else {
      expContainer.classList.add('hidden');
   }
   
   document.getElementById('btn-pq-prev').onclick = () => { if(index>0) renderSingleQuestion(appState.activePaper[index-1], index-1); };
   document.getElementById('btn-pq-next').onclick = () => { if(index<appState.activePaper.length-1) renderSingleQuestion(appState.activePaper[index+1], index+1); };
   
   document.getElementById('btn-add-flashcard').onclick = () => createFlashcard(q);
   document.getElementById('btn-ai-explain').onclick = () => callGemini('explain', q);
   document.getElementById('btn-ai-similar').onclick = () => callGemini('similar', q);
   
   const aiBox = document.getElementById('pq-ai-response');
   if(aiBox) aiBox.classList.add('hidden'); // reset ai box
}

function handleAnswerInPaperView(qId, selectedKey, correctKey, idx) {
   const isCorrect = selectedKey === correctKey;
   appState.progress[qId] = {
       attempted: true, correct: isCorrect, selected: selectedKey, lastAttempt: Date.now()
   };
   saveState('progress', appState.progress);
   renderSingleQuestion(appState.activePaper[idx], idx);
   const dot = document.querySelector(`#q-list-item-${qId} .q-status-dot`);
   if(dot) { dot.className = `q-status-dot ${isCorrect ? 'correct' : 'wrong'}`; }
   updatePaperScore();
}

function updatePaperScore() {
   if(!appState.activePaper) return;
   let answered = 0, correct = 0;
   appState.activePaper.forEach(q => {
      if(appState.progress[q.id]) {
         answered++;
         if(appState.progress[q.id].correct) correct++;
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
   if(mode === 'exam') calcEl.innerText = `Simulating exam pressure: ${Math.ceil((count * 72)/60)} minutes for ${count} questions.`;
   else if(mode === 'relaxed') calcEl.innerText = `Relaxed pace: ${Math.ceil((count * 216)/60)} minutes for ${count} questions.`;
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
   if(source === 'full') pool = pool.filter(q => !q.flags || (!q.flags.includes('no_answer') && !q.flags.includes('empty_opts')));
   
   pool.sort(() => 0.5 - Math.random());
   ptState.questions = pool.slice(0, count);
   ptState.mode = mode;
   ptState.currentIndex = 0;
   ptState.answers = {};
   
   if(mode === 'exam') ptState.timeLeft = count * 72;
   else if(mode === 'relaxed') ptState.timeLeft = count * 216;
   else ptState.timeLeft = null; 
   
   document.getElementById('practice-config').classList.add('hidden');
   document.getElementById('practice-active').classList.remove('hidden');
   
   if(ptState.timeLeft) {
      document.getElementById('pt-timer').style.display = 'block';
      clearInterval(ptState.timerInterval);
      ptState.timerInterval = setInterval(() => {
         ptState.timeLeft--;
         if(ptState.timeLeft <= 0) {
             clearInterval(ptState.timerInterval);
             submitPracticeTest();
         } else {
             const m = Math.floor(ptState.timeLeft / 60).toString().padStart(2, '0');
             const s = (ptState.timeLeft % 60).toString().padStart(2, '0');
             const timerEl = document.getElementById('pt-timer');
             timerEl.innerText = `${m}:${s}`;
             
             const totalTime = mode==='exam' ? count*72 : count*216;
             if(ptState.timeLeft < totalTime*0.1) timerEl.style.color = 'var(--red)';
             else if(ptState.timeLeft < totalTime*0.25) timerEl.style.color = 'var(--cyan)';
             else timerEl.style.color = 'var(--green)';
         }
      }, 1000);
   } else {
      document.getElementById('pt-timer').style.display = 'none';
   }
   
   renderPracticeQuestion();
};

document.getElementById('btn-pt-quit').onclick = () => {
   if(confirm('Are you sure you want to quit? Progress will be lost.')) {
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
   
   ['a','b','c','d'].forEach(optKey => {
      const optText = q.options[optKey];
      if(!optText) return;
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      
      if(showExplanation) btn.classList.add('disabled');
      
      if(userAttempt) {
         if(userAttempt === optKey) {
            btn.classList.add(ptState.mode==='exam' ? 'selected' : (optKey===q.answer ? 'correct' : 'wrong'));
         }
         if(ptState.mode !== 'exam' && optKey === q.answer) btn.classList.add('correct');
      }
      
      btn.innerHTML = `<span class="option-label">${optKey.toUpperCase()}</span> <span>${optText}</span>`;
      
      if(!userAttempt || ptState.mode === 'exam') {
         btn.onclick = () => {
            ptState.answers[q.id] = optKey;
            renderPracticeQuestion();
         };
      }
      optsContainer.appendChild(btn);
   });
   
   const expContainer = document.getElementById('pt-explanation-container');
   if(showExplanation && q.explanation) {
      expContainer.classList.remove('hidden');
      document.getElementById('pt-explanation').innerHTML = q.explanation;
   } else {
      expContainer.classList.add('hidden');
   }
   
   document.getElementById('btn-pt-prev').disabled = ptState.currentIndex === 0;
   if(ptState.currentIndex === ptState.questions.length - 1) {
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
      
      if(idx === ptState.currentIndex) {
         btn.style.outline = '2px solid var(--accent-color)';
         btn.style.outlineOffset = '2px';
      }
      
      if(ptState.answers[q.id]) {
         if(ptState.mode === 'exam') {
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
   if(ptState.timerInterval) clearInterval(ptState.timerInterval);
   let correct = 0, wrong = 0, skipped = 0;
   
   ptState.questions.forEach(q => {
      const ans = ptState.answers[q.id];
      if(!ans) skipped++;
      else if(ans === q.answer) correct++;
      else wrong++;
      
      if(ans && (!q.flags || q.flags.length===0)) {
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
   if(appState.streak.lastStudyDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if(appState.streak.lastStudyDate === yesterday) appState.streak.current++;
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
        if(currScore >= targetScore) { clearInterval(inv); scoreEl.innerText = targetScore + '%'; return; }
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
             <div style="font-family:var(--font-mono); color:var(--text-muted);">${idx+1}.</div>
             <div>
                <div style="margin-bottom:8px;">${q.question}</div>
                <div style="font-size:0.9rem;">
                   <div><strong>Correct Answer:</strong> ${q.options[q.answer]}</div>
                   ${ans ? `<div><strong>Your Answer:</strong> <span class="${ans===q.answer?'text-green':'text-red'}">${q.options[ans]}</span></div>` : '<div class="text-muted">Skipped</div>'}
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
    if(svg) {
        svg.innerHTML = '';
        if(sess.length < 2) {
           svg.innerHTML = '<text x="10" y="100" fill="gray">Not enough data to plot properly.</text>';
        } else {
           const w = 400, h = 200;
           let pathD = `M 0 ${h - (sess[0].score/sess[0].total)*h} `;
           sess.forEach((s, i) => {
              const x = (i / (sess.length - 1)) * w;
              const y = h - (s.score/s.total) * h;
              pathD += `L ${x} ${y} `;
              svg.innerHTML += `<circle cx="${x}" cy="${y}" r="4" fill="var(--cyan)" />`;
           });
           svg.innerHTML += `<path d="${pathD}" fill="none" stroke="var(--accent-color)" stroke-width="2" />`;
        }
    }
    
    const grid = document.getElementById('chart-streak');
    if(grid) {
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = 'repeat(10, 1fr)';
        const today = new Date();
        const datesMap = {};
        appState.sessions.forEach(s => {
           const d = new Date(s.date).toDateString();
           datesMap[d] = (datesMap[d] || 0) + s.total;
        });
        
        for(let i=29; i>=0; i--) {
           const d = new Date(today);
           d.setDate(d.getDate() - i);
           const ds = d.toDateString();
           const count = datesMap[ds] || 0;
           
           const div = document.createElement('div');
           div.style.width = '100%'; div.style.paddingTop = '100%'; div.style.borderRadius = '4px';
           if(count === 0) div.style.background = 'var(--surface2-color)';
           else if(count < 20) div.style.background = 'rgba(74, 222, 128, 0.3)';
           else if(count < 50) div.style.background = 'rgba(74, 222, 128, 0.6)';
           else div.style.background = 'var(--green)';
           
           div.title = `${ds}: ${count} questions`;
           grid.appendChild(div);
        }
    }
}

// --- 8. FLASHCARDS & SPACED REPETITION ---
function renderFlashcards() {
   const now = Date.now();
   const dueCards = appState.flashcards.filter(f => f.nextReview <= now);
   document.getElementById('fc-due-count').innerText = dueCards.length;
   
   if(dueCards.length === 0) {
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
}

window.handleFCResponse = function(quality) {
   const c = appState.activeFlashcard;
   if(!c) return;
   
   // SM-2 Spaced Repetition simplified
   if(quality === 'hard') {
      c.ease = Math.max(1.3, c.ease - 0.2);
      c.interval = 0; 
   } else if(quality === 'good') {
      c.interval = c.interval === 0 ? 1 : Math.round(c.interval * c.ease);
   } else if(quality === 'easy') {
      c.ease += 0.15;
      c.interval = c.interval === 0 ? 3 : Math.round(c.interval * c.ease * 1.3);
   }
   
   if(c.interval === 0) c.nextReview = Date.now() + 10 * 60 * 1000;
   else c.nextReview = Date.now() + c.interval * 86400000;
   
   saveState('flashcards', appState.flashcards);
   renderFlashcards();
}

function createFlashcard(q) {
  const existing = appState.flashcards.find(f => f.qId === q.id);
  if(existing) { showToast('Flashcard already exists!', 'info'); return; }
  appState.flashcards.push({
     id: 'fc_' + Date.now(), qId: q.id, front: q.question,
     back: `<strong>${q.options[q.answer]}</strong><br><br>${q.explanation||''}`,
     nextReview: Date.now(), ease: 2.5, interval: 0
  });
  saveState('flashcards', appState.flashcards);
  showToast('Added to Flashcards!', 'success');
  document.getElementById('stat-flashcards').innerText = appState.flashcards.length;
}

// --- 9. GEMINI AI ---
async function callGemini(mode, q) {
   const apiKey = appState.settings.geminiKey;
   if(!apiKey) { showToast('Please add Gemini API key in settings', 'error'); return; }
   
   let box = document.getElementById('pq-ai-response');
   if(box) {
       box.classList.remove('hidden');
       box.innerHTML = `<div class="ai-msg ai"><div class="ai-loader"></div> Generating ${mode=== 'explain' ? 'explanation' : 'similar questions'}...</div>`;
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
       
       if(box) {
          if(mode === 'explain') {
             box.innerHTML = `<div class="ai-msg ai"><strong>AI Explanation:</strong><br>${text}</div>`;
          } else {
             let parsed;
             try { parsed = JSON.parse(text); } catch(e) { parsed = JSON.parse(text.replace(/```json/g,'').replace(/```/g,'')); }
             box.innerHTML = `
                <div class="ai-msg ai"><strong>AI Generated Similar Question:</strong><br><br>
                <strong>Q:</strong> ${parsed.question}<br>
                a) ${parsed.options.a}<br>b) ${parsed.options.b}<br>c) ${parsed.options.c}<br>d) ${parsed.options.d}<br><br>
                <strong class="text-green">Ans: ${parsed.answer}</strong><br>${parsed.explanation}
                </div>`;
          }
       }
   } catch (err) {
       if(box) box.innerHTML = `<div class="ai-msg ai" style="border-color:var(--red);">Failed to connect to AI. Check API key.</div>`;
       else showToast('AI connection failed', 'error');
   }
}

document.getElementById('btn-generate-ai-fc').onclick = async () => {
   const apiKey = appState.settings.geminiKey;
   if(!apiKey) { showToast('Please add Gemini API key in settings', 'error'); return; }
   if(!appState.activePaper) { showToast('Browse a paper first to use as context!', 'error'); return; }
   const q = appState.activePaper[Math.floor(Math.random() * appState.activePaper.length)];
   if(!q.explanation) { showToast('Selected question lacks explanation context. Try again.', 'error'); return; }
   
   showToast('Generating AI cards...', 'info');
   const btn = document.getElementById('btn-generate-ai-fc');
   btn.innerText = 'Generating...'; btn.classList.add('disabled');
   
   try {
       const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: `Generate 3 vocabulary flashcards based on this context. Output MUST be ONLY a valid JSON array of objects, schema: [{ "front": "term", "back": "definition" }]. Context: ${q.explanation}` }] }], generationConfig: { temperature: 0.7 } })
       });
       const data = await res.json();
       let text = data.candidates[0].content.parts[0].text;
       let parsed;
       try { parsed = JSON.parse(text); } catch(e) { parsed = JSON.parse(text.replace(/```json/g,'').replace(/```/g,'')); }
       
       parsed.forEach(pc => {
          appState.flashcards.push({ id: 'fc_ai_' + Date.now() + Math.random(), qId: 'ai_' + Date.now(), front: pc.front, back: pc.back, nextReview: Date.now(), ease: 2.5,  interval: 0 });
       });
       saveState('flashcards', appState.flashcards);
       renderFlashcards();
       showToast('Added 3 AI generated flashcards!', 'success');
   } catch (err) { showToast('Failed to generate cards.', 'error'); }
   btn.innerText = 'Generate AI Cards'; btn.classList.remove('disabled');
};

// --- SETTINGS BINDINGS ---
document.getElementById('theme-toggle').onclick = () => {
   appState.settings.theme = appState.settings.theme === 'dark' ? 'light' : 'dark';
   applySettings();
   saveState('settings', appState.settings);
};

document.getElementById('btn-save-settings').onclick = () => {
   appState.user.name = document.getElementById('setting-name').value || 'Scholar';
   appState.settings.geminiKey = document.getElementById('setting-gemini-key').value || null;
   saveState('user', appState.user); saveState('settings', appState.settings);
   applySettings(); showToast('Settings saved successfully!', 'success');
};

document.getElementById('btn-reset-data').onclick = () => {
   if(confirm('Are you SURE you want to reset all progress? This cannot be undone.')) {
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
    
    for(let i = 0; i < 50; i++) {
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
        
        for(let i = 0; i < particles.length; i++) {
            let p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            
            if(p.x < 0 || p.x > width) p.vx *= -1;
            if(p.y < 0 || p.y > height) p.vy *= -1;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            
            for(let j = i + 1; j < particles.length; j++) {
                let p2 = particles[j];
                let dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                if(dist < 120) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 - dist/1200})`;
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
