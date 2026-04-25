    (function () {
      'use strict';

      // === In-memory state ===
      const state = {
        usedQuestions: new Set(),       // "scenarioId:qIndex"
        usedScenarioCycles: 0,          // how many full pool resets we've done
        currentTest: null,
        currentIndex: 0,                // index into currentTest.flatItems
        startTime: null,
        sessionNumber: 1
      };

      // === Helpers ===
      function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }

      function randomOfN(n, k) {
        // pick k distinct indices from [0, n)
        const idx = Array.from({ length: n }, (_, i) => i);
        return shuffle(idx).slice(0, k);
      }

      function qKey(sid, qi) { return sid + ':' + qi; }

      // === Build test ===
      // Scenarios 7 (Official Practice), 8 (Docs Deep Dives), and 9 (Anti-Pattern Spotter)
      // are dedicated review sets accessible only via their own buttons — they do NOT
      // participate in random exam draws.
      const SPECIAL_SCENARIO_IDS = new Set([7, 8, 9, 10]);

      function buildTest() {
        const scenariosPerTest = 4;
        const qsPerScenario = 6;

        const examScenarios = SCENARIOS.filter(s => !SPECIAL_SCENARIO_IDS.has(s.id));
        const picked = shuffle(examScenarios).slice(0, scenariosPerTest);

        const sections = [];
        let poolExhaustedNote = '';

        picked.forEach(scn => {
          // Build list of question indices not yet used
          const allIdx = scn.questions.map((_, i) => i);
          const unused = allIdx.filter(i => !state.usedQuestions.has(qKey(scn.id, i)));

          let chosen;
          if (unused.length >= qsPerScenario) {
            chosen = shuffle(unused).slice(0, qsPerScenario);
          } else {
            // pool for this scenario is exhausted or short; fill from the full set
            const need = qsPerScenario - unused.length;
            const reused = shuffle(allIdx.filter(i => state.usedQuestions.has(qKey(scn.id, i)))).slice(0, need);
            chosen = [...unused, ...reused];
            if (unused.length < qsPerScenario) {
              poolExhaustedNote = 'Pool partially exhausted — some questions may repeat from earlier sessions. Use "Reset Question Pool" to fully refresh.';
            }
          }

          chosen.forEach(qi => state.usedQuestions.add(qKey(scn.id, qi)));

          // For each chosen question, randomize option order
          const items = chosen.map(qi => {
            const original = scn.questions[qi];
            const orderMap = shuffle([0, 1, 2, 3]);
            const shuffledOptions = orderMap.map(k => original.options[k]);
            const newCorrectIndex = orderMap.indexOf(original.answer);
            return {
              sid: scn.id,
              sidTitle: scn.title,
              qi: qi,
              q: original.q,
              options: shuffledOptions,
              answer: newCorrectIndex,
              explain: original.explain,
              userAnswer: null
            };
          });

          sections.push({
            scenarioId: scn.id,
            scenarioTitle: scn.title,
            scenarioContext: scn.context,
            items: items
          });
        });

        return finalizeTest({ sections, poolExhaustedNote });
      }

      // Append a flat ordered list of items with their section context attached.
      function finalizeTest(test) {
        const flat = [];
        test.sections.forEach((section, sIdx) => {
          section.items.forEach((item, iIdx) => {
            item._sectionIndex = sIdx;
            item._sectionTitle = section.scenarioTitle;
            item._sectionId = section.scenarioId;
            item._sectionContext = section.scenarioContext;
            item._flatIndex = flat.length;
            flat.push(item);
          });
        });
        test.flatItems = flat;
        return test;
      }

      // === Build a special-scenario run (Official Practice or Docs Deep Dives) ===
      // Runs through all questions in the given scenario, in shuffled order,
      // with shuffled options per question.
      function buildSpecialTest(scenarioId) {
        const scn = SCENARIOS.find(s => s.id === scenarioId);
        if (!scn || scn.questions.length === 0) {
          return { sections: [], poolExhaustedNote: 'No questions loaded for this set yet.' };
        }
        const allIdx = scn.questions.map((_, i) => i);
        const chosen = shuffle(allIdx);

        const items = chosen.map(qi => {
          const original = scn.questions[qi];
          const orderMap = shuffle([0, 1, 2, 3]);
          const shuffledOptions = orderMap.map(k => original.options[k]);
          const newCorrectIndex = orderMap.indexOf(original.answer);
          return {
            sid: scn.id,
            sidTitle: scn.title,
            qi: qi,
            q: original.q,
            options: shuffledOptions,
            answer: newCorrectIndex,
            explain: original.explain,
            userAnswer: null
          };
        });

        return finalizeTest({
          sections: [{
            scenarioId: scn.id,
            scenarioTitle: scn.title,
            scenarioContext: scn.context,
            items: items
          }],
          poolExhaustedNote: ''
        });
      }

      // === Rendering ===
      const $ = sel => document.querySelector(sel);

      function show(sectionId) {
        ['landing', 'exam', 'results'].forEach(id => {
          const el = document.getElementById(id);
          if (id === sectionId) el.classList.add('active');
          else el.classList.remove('active');
        });
        // landing uses non-class visibility
        if (sectionId === 'landing') {
          document.getElementById('landing').style.display = 'block';
          document.getElementById('exam').style.display = 'none';
          document.getElementById('results').style.display = 'none';
        } else if (sectionId === 'exam') {
          document.getElementById('landing').style.display = 'none';
          document.getElementById('exam').style.display = 'block';
          document.getElementById('results').style.display = 'none';
        } else {
          document.getElementById('landing').style.display = 'none';
          document.getElementById('exam').style.display = 'none';
          document.getElementById('results').style.display = 'block';
        }
      }

      function firstUnansweredIndex() {
        const flat = state.currentTest.flatItems;
        for (let i = 0; i < flat.length; i++) {
          if (flat[i].userAnswer === null) return i;
        }
        return flat.length; // all answered
      }

      function correctCount() {
        return state.currentTest.flatItems.filter(it => it.userAnswer === it.answer).length;
      }

      function renderTest() {
        const test = state.currentTest;
        const banner = $('#exhaustion-banner');
        if (test.poolExhaustedNote) {
          banner.textContent = test.poolExhaustedNote;
          banner.classList.add('show');
        } else {
          banner.classList.remove('show');
        }

        state.currentIndex = 0;
        $('#q-total').textContent = test.flatItems.length;

        $('#abort-btn').onclick = function () {
          if (confirm('Abandon this test? Progress will be discarded.')) {
            state.currentTest = null;
            show('landing');
          }
        };

        $('#next-btn').onclick = handleNext;

        renderProgressDots();
        renderCurrentQuestion();
      }

      function renderProgressDots() {
        const host = $('#progress-dots');
        const flat = state.currentTest.flatItems;
        const firstUnans = firstUnansweredIndex();
        host.innerHTML = '';
        flat.forEach((item, idx) => {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'dot';
          dot.setAttribute('aria-label', 'Question ' + (idx + 1));
          const answered = item.userAnswer !== null;
          const isCurrent = idx === state.currentIndex;
          if (answered) {
            dot.classList.add('answered');
            dot.classList.add(item.userAnswer === item.answer ? 'correct' : 'incorrect');
          }
          if (isCurrent) dot.classList.add('current');
          // Clickable iff already answered (revisit) or it's the active unanswered slot.
          const reachable = answered || idx === firstUnans;
          if (reachable) {
            dot.classList.add('clickable');
            dot.addEventListener('click', function () {
              if (idx === state.currentIndex) return;
              state.currentIndex = idx;
              renderProgressDots();
              renderCurrentQuestion();
            });
          } else {
            dot.disabled = true;
          }
          host.appendChild(dot);
        });
      }

      function renderCurrentQuestion() {
        const flat = state.currentTest.flatItems;
        const item = flat[state.currentIndex];
        const card = $('#question-card');
        const letters = ['A', 'B', 'C', 'D'];

        $('#q-current').textContent = state.currentIndex + 1;
        $('#exam-correct-count').textContent = correctCount();

        card.innerHTML = `
      <div class="scenario-eyebrow">
        <span class="scenario-tag">Scenario ${item._sectionId}</span>
        <span class="scenario-title">${escapeHtml(item._sectionTitle)}</span>
      </div>
      <div class="q-text">${escapeHtml(item.q)}</div>
      <div class="options">
        ${item.options.map((opt, k) => `
          <div class="option" data-choice="${k}">
            <span class="letter">${letters[k]}</span>
            <span class="body">${escapeHtml(opt)}</span>
          </div>
        `).join('')}
      </div>
      <div class="explain">
        <div class="explain-verdict">&nbsp;</div>
        <div class="explain-label">Explanation</div>
        <div class="explain-body">${escapeHtml(item.explain)}</div>
      </div>
    `;

        if (item.userAnswer !== null) {
          // Re-rendering an already-answered question: show locked state immediately.
          revealAnswer(card, item);
        } else {
          card.querySelectorAll('.option').forEach(optEl => {
            optEl.addEventListener('click', function () {
              if (item.userAnswer !== null) return;
              const choice = parseInt(this.dataset.choice, 10);
              item.userAnswer = choice;
              revealAnswer(card, item);
              $('#exam-correct-count').textContent = correctCount();
              renderProgressDots();
              updateNextButton();
            });
          });
        }

        updateNextButton();
      }

      function revealAnswer(scope, item) {
        const opts = scope.querySelectorAll('.option');
        opts.forEach(el => {
          const k = parseInt(el.dataset.choice, 10);
          el.classList.add('disabled');
          if (k === item.answer) el.classList.add('correct');
          if (k === item.userAnswer && k !== item.answer) el.classList.add('incorrect');
        });

        const correct = item.userAnswer === item.answer;
        const exp = scope.querySelector('.explain');
        exp.classList.add('show');
        exp.classList.add(correct ? 'correct' : 'incorrect');
        const verdict = exp.querySelector('.explain-verdict');
        if (verdict) verdict.textContent = correct ? '✓  Correct' : '✗  Incorrect';
      }

      function updateNextButton() {
        const btn = $('#next-btn');
        const flat = state.currentTest.flatItems;
        const item = flat[state.currentIndex];
        const isLast = state.currentIndex === flat.length - 1;
        const allAnswered = firstUnansweredIndex() === flat.length;

        if (isLast && allAnswered) {
          btn.textContent = 'Submit Test';
          btn.disabled = false;
        } else {
          btn.textContent = 'Next Question';
          // Cannot advance past current if this question is unanswered.
          btn.disabled = item.userAnswer === null || isLast;
        }
      }

      function handleNext() {
        const flat = state.currentTest.flatItems;
        const isLast = state.currentIndex === flat.length - 1;
        const allAnswered = firstUnansweredIndex() === flat.length;
        if (isLast && allAnswered) {
          finishTest();
          return;
        }
        if (state.currentIndex >= flat.length - 1) return;
        state.currentIndex++;
        renderProgressDots();
        renderCurrentQuestion();
        scrollExamIntoView();
      }

      function finishTest() {
        // Calculate stats
        const test = state.currentTest;
        const allItems = test.sections.flatMap(s => s.items.map(i => ({ ...i, scenarioTitle: s.scenarioTitle })));
        const total = allItems.length;
        const correct = allItems.filter(i => i.userAnswer === i.answer).length;
        const accuracy = Math.round(100 * correct / total);

        // Scaled score: map accuracy to 100–1000. Pass is 720 (~72% correct).
        // Simple linear with small curve: score = 100 + 900 * accuracy/100
        const scaled = Math.round(100 + 900 * (correct / total));

        const elapsedMs = Date.now() - state.startTime;
        const mins = Math.floor(elapsedMs / 60000);
        const secs = Math.floor((elapsedMs % 60000) / 1000);
        const timeStr = mins + 'm ' + String(secs).padStart(2, '0') + 's';

        $('#score-value').textContent = scaled;
        $('#score-sub').textContent = 'of 1000 possible';
        const verdictEl = $('#score-verdict');
        if (scaled >= 720) {
          verdictEl.textContent = 'Passing Mark';
          verdictEl.classList.remove('fail');
          verdictEl.classList.add('pass');
        } else {
          verdictEl.textContent = 'Below Passing';
          verdictEl.classList.remove('pass');
          verdictEl.classList.add('fail');
        }

        $('#r-correct').innerHTML = correct + '<span class="unit">/' + total + '</span>';
        $('#r-acc').textContent = accuracy + '%';
        $('#r-time').textContent = timeStr;

        // Per-scenario breakdown
        const brHost = $('#breakdown-rows');
        brHost.innerHTML = '';
        test.sections.forEach(s => {
          const sCorrect = s.items.filter(it => it.userAnswer === it.answer).length;
          const sTotal = s.items.length;
          const sPct = Math.round(100 * sCorrect / sTotal);
          const row = document.createElement('div');
          row.className = 'breakdown-row';
          row.innerHTML = `
        <div class="br-name">${escapeHtml(s.scenarioTitle)}</div>
        <div class="br-score">${sCorrect} / ${sTotal} · ${sPct}%</div>
        <div class="br-bar"><div class="br-bar-fill" style="width:${sPct}%"></div></div>
      `;
          brHost.appendChild(row);
        });

        // Review missed
        const missed = allItems.filter(i => i.userAnswer !== i.answer);
        const revHost = $('#review-rows');
        const revSection = $('#review-section');
        if (missed.length === 0) {
          revSection.innerHTML = '<h3>Review</h3><p class="note" style="margin:12px 0;">A clean sweep — no missed questions to review.</p>';
        } else {
          revSection.querySelector('h3').textContent = `Review — ${missed.length} Missed Question${missed.length === 1 ? '' : 's'}`;
          revHost.innerHTML = '';
          const letters = ['A', 'B', 'C', 'D'];
          missed.forEach(item => {
            const row = document.createElement('div');
            row.className = 'review-item';
            const yourTxt = item.userAnswer !== null ? (letters[item.userAnswer] + ' — ' + escapeHtml(item.options[item.userAnswer])) : '(no answer)';
            const rightTxt = letters[item.answer] + ' — ' + escapeHtml(item.options[item.answer]);
            row.innerHTML = `
          <div class="ri-meta">${escapeHtml(item.scenarioTitle)}</div>
          <div class="ri-q">${escapeHtml(item.q)}</div>
          <div class="ri-ans"><div><span class="label">Your Answer</span><span class="your-ans">${yourTxt}</span></div></div>
          <div class="ri-ans"><div><span class="label">Correct Answer</span><span class="correct-ans">${rightTxt}</span></div></div>
          <div class="ri-explain">${escapeHtml(item.explain)}</div>
        `;
            revHost.appendChild(row);
          });
        }

        show('results');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        $('#foot-session').textContent = 'Session · ' + state.sessionNumber + ' · complete';
      }

      function scrollExamIntoView() {
        const el = document.getElementById('exam');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      function escapeHtml(s) {
        return String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      // === Wire initial UI ===
      function startNewTest() {
        state.currentTest = buildTest();
        state.startTime = Date.now();
        state.sessionNumber++;
        $('#foot-session').textContent = 'Session · ' + state.sessionNumber + ' · in progress';
        renderTest();
        show('exam');
        scrollExamIntoView();
      }

      function startSpecialTest(scenarioId, footLabel) {
        state.currentTest = buildSpecialTest(scenarioId);
        if (!state.currentTest.sections.length) {
          alert('No questions are loaded for this set yet.');
          return;
        }
        state.startTime = Date.now();
        state.sessionNumber++;
        $('#foot-session').textContent = 'Session · ' + state.sessionNumber + ' · ' + footLabel;
        renderTest();
        show('exam');
        scrollExamIntoView();
      }

      function startOfficialTest() { startSpecialTest(7, 'official set'); }
      function startDocsTest() { startSpecialTest(8, 'docs deep dives'); }
      function startAntiPatternsTest() { startSpecialTest(9, 'anti-pattern spotter'); }
      function startSkillsTest() { startSpecialTest(10, 'intro to agent skills'); }

      function init() {
        // Populate landing stats — count only the 6 exam scenarios for the headline
        const examScenarios = SCENARIOS.filter(s => !SPECIAL_SCENARIO_IDS.has(s.id));
        const officialScenario = SCENARIOS.find(s => s.id === 7);
        const docsScenario = SCENARIOS.find(s => s.id === 8);
        const apScenario = SCENARIOS.find(s => s.id === 9);
        const skillsScenario = SCENARIOS.find(s => s.id === 10);
        const examQ = examScenarios.reduce((a, s) => a + s.questions.length, 0);
        const officialQ = officialScenario ? officialScenario.questions.length : 0;
        const docsQ = docsScenario ? docsScenario.questions.length : 0;
        const apQ = apScenario ? apScenario.questions.length : 0;
        const skillsQ = skillsScenario ? skillsScenario.questions.length : 0;

        $('#s-scenarios').innerHTML = examScenarios.length + '<span class="unit">total</span>';
        $('#s-questions').innerHTML = examQ + '<span class="unit">items</span>';
        $('#bank-total-q').textContent = examQ + ' scenario + ' + officialQ + ' official + ' + docsQ + ' docs + ' + apQ + ' anti-patterns + ' + skillsQ + ' skills';

        // Adjust special-set button labels to show counts
        const offBtn = $('#start-official-btn');
        if (offBtn) {
          if (officialQ === 0) {
            offBtn.disabled = true;
            offBtn.textContent = 'Official Questions (none loaded)';
          } else {
            offBtn.textContent = 'Practice Official Questions (' + officialQ + ')';
          }
        }
        const docsBtn = $('#start-docs-btn');
        if (docsBtn) {
          if (docsQ === 0) {
            docsBtn.disabled = true;
            docsBtn.textContent = 'Docs Deep Dives (none loaded)';
          } else {
            docsBtn.textContent = 'Docs Deep Dives (' + docsQ + ')';
          }
        }
        const apBtn = $('#start-antipatterns-btn');
        if (apBtn) {
          if (apQ === 0) {
            apBtn.disabled = true;
            apBtn.textContent = 'Anti-Pattern Spotter (none loaded)';
          } else {
            apBtn.textContent = 'Anti-Pattern Spotter (' + apQ + ')';
          }
        }
        const skillsBtn = $('#start-skills-btn');
        if (skillsBtn) {
          if (skillsQ === 0) {
            skillsBtn.disabled = true;
            skillsBtn.textContent = 'Intro to Agent Skills (none loaded)';
          } else {
            skillsBtn.textContent = 'Intro to Agent Skills (' + skillsQ + ')';
          }
        }

        $('#start-btn').addEventListener('click', startNewTest);
        if (offBtn) offBtn.addEventListener('click', startOfficialTest);
        if (docsBtn) docsBtn.addEventListener('click', startDocsTest);
        if (apBtn) apBtn.addEventListener('click', startAntiPatternsTest);
        if (skillsBtn) skillsBtn.addEventListener('click', startSkillsTest);
        $('#again-btn').addEventListener('click', startNewTest);
        $('#home-btn').addEventListener('click', function () {
          show('landing');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        $('#reset-btn').addEventListener('click', function () {
          if (confirm('Reset the question pool? All "seen" questions will be forgotten for this session.')) {
            state.usedQuestions.clear();
            alert('Pool reset — ' + examQ + ' scenario questions available.');
          }
        });

        show('landing');
      }

      document.addEventListener('DOMContentLoaded', init);
    })();
