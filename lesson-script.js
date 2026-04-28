// Global Tense Order for progression and score overlays
const TENSE_ORDER = [
    { id: 'present-simple',             label: 'Present Simple',             level: 1 },
    { id: 'present-continuous',         label: 'Present Continuous',         level: 2 },
    { id: 'past-simple',                label: 'Past Simple',                level: 3 },
    { id: 'present-perfect',            label: 'Present Perfect',            level: 4 },
    { id: 'future-simple',              label: 'Future Simple',              level: 5 },
    { id: 'past-continuous',            label: 'Past Continuous',            level: 6 },
    { id: 'present-perfect-continuous', label: 'Present Perfect Continuous', level: 7 },
    { id: 'past-perfect',               label: 'Past Perfect',               level: 8 },
    { id: 'future-continuous',          label: 'Future Continuous',          level: 9 },
    { id: 'future-perfect',             label: 'Future Perfect',             level: 10 },
    { id: 'past-perfect-continuous',    label: 'Past Perfect Continuous',    level: 11 },
    { id: 'future-perfect-continuous',  label: 'Future Perfect Continuous',  level: 12 }
];

// State for difficulty and sentence form
let currentDifficulty = 'light';
let currentSentenceForm = 'all';

// Time tracking
window.lastTimeUpdate = Date.now(); // Make lastTimeUpdate explicitly global

function saveTimeSpent() {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;
    
    const now = Date.now();
    const seconds = Math.floor((now - lastTimeUpdate) / 1000);
    if (seconds > 0) {
        profileManager.updateTimeSpent(currentUser.username, seconds);
        lastTimeUpdate = now;
    }
}

// ===================== SAVE / TOAST SYSTEM =====================

/**
 * Shows a floating toast notification at the top of the screen.
 * type: 'success' | 'info' | 'error'
 */
function showSaveToast(message, type) {
    type = type || 'success';
    let toast = document.getElementById('save-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'save-toast';
        toast.style.cssText = [
            'position:fixed', 'top:80px', 'left:50%', 'transform:translateX(-50%)',
            'padding:12px 28px', 'border-radius:10px', 'font-size:1rem',
            'font-weight:600', 'z-index:99999', 'pointer-events:none',
            'box-shadow:0 4px 20px rgba(0,0,0,0.4)',
            'transition:opacity 0.4s ease', 'opacity:0',
            'letter-spacing:0.02em'
        ].join(';');
        document.body.appendChild(toast);
    }
    const colors = {
        success: { bg: '#22c55e', color: '#fff' },
        info:    { bg: '#3b82f6', color: '#fff' },
        error:   { bg: '#ef4444', color: '#fff' }
    };
    const c = colors[type] || colors.success;
    toast.style.background = c.bg;
    toast.style.color = c.color;
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2600);
}

/**
 * Collects ALL current answers from fill-in-the-blank inputs
 * and saves them to localStorage under the lesson state.
 */
function saveFillAnswers(tenseId) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const fillAnswers = {};
    document.querySelectorAll('.fill-input').forEach(input => {
        if (input.id) {
            fillAnswers[input.id] = {
                value: input.value,
                disabled: input.disabled,
                resultText: (document.getElementById(input.id + '-res') || {}).textContent || ''
            };
        }
    });

    profileManager.saveLessonState(currentUser.username, tenseId, { fillAnswers });
}

/**
 * Collects all multiple-choice Practice block answers (aff/neg/int) and saves them.
 */
function savePracticeMultiChoice(tenseId) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const practiceAnswers = {};
    ['aff', 'neg', 'int', 'pca', 'pcn', 'pci', 'psa', 'psn', 'psi', 'ppa', 'ppn', 'ppi', 'fsa', 'fsn', 'fsi', 'fpa', 'fpn', 'fpi', 'fca', 'fcn', 'fci', 'ppca', 'ppcn', 'ppci', 'ppastpa', 'ppastpn', 'ppastpi', 'ppastca', 'ppastcn', 'ppastci', 'fpca', 'fpcn', 'fpci'].forEach(prefix => {
        let i = 0;
        while (true) {
            const cont = document.getElementById(`${prefix}-opts-${i}`);
            if (!cont) break;
            const selected = cont.querySelector('.option.selected, .option.correct, .option.incorrect');
            if (selected) {
                const opts = Array.from(cont.querySelectorAll('.option'));
                const selectedIdx = opts.indexOf(selected);
                const correctIdx = opts.findIndex(o => o.classList.contains('correct') && !o.classList.contains('incorrect'));
                practiceAnswers[`${prefix}-${i}`] = {
                    selectedIdx,
                    correctIdx: correctIdx >= 0 ? correctIdx : selectedIdx,
                    isCorrect: selected.classList.contains('correct'),
                    disabled: (opts[0] || {}).style && opts[0].style.pointerEvents === 'none'
                };
            }
            i++;
        }
    });

    profileManager.saveLessonState(currentUser.username, tenseId, { practiceAnswers });
}



/**
 * Master save function — collects ALL lesson state into ONE atomic snapshot
 * and writes it to a direct localStorage key for reliable restoration.
 * Also mirrors to the nested profileManager path as a secondary backup.
 *
 * @param {string}  contextLabel   - label shown in the toast, e.g. 'Video 1'
 * @param {boolean} suppressToast  - if true, no toast is shown (for auto-saves)
 * @returns {boolean} true if save succeeded
 */
function triggerSave(contextLabel, suppressToast) {
    const tense       = getTenseFromURL();
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) {
        if (!suppressToast) showSaveToast('❌ Войдите в аккаунт для сохранения', 'error');
        return false;
    }

    // ── Active tab ───────────────────────────────────────────────────────────
    const activeTabBtn = document.querySelector('.lesson-tab-btn.active');
    const activeTabId  = activeTabBtn ? activeTabBtn.id.replace('tab-btn-', '') : null;

    // ── Fill-in-the-blank answers ────────────────────────────────────────────
    const fillAnswers = {};
    document.querySelectorAll('.fill-input').forEach(input => {
        if (input.id) {
            fillAnswers[input.id] = {
                value:      input.value,
                disabled:   input.disabled,
                resultText: (document.getElementById(input.id + '-res') || {}).textContent || ''
            };
        }
    });

    // ── Multiple-choice practice answers (aff / neg / int) ───────────────────
    const practiceAnswers = {};
    ['aff', 'neg', 'int', 'pca', 'pcn', 'pci', 'psa', 'psn', 'psi', 'ppa', 'ppn', 'ppi', 'fsa', 'fsn', 'fsi', 'fpa', 'fpn', 'fpi', 'fca', 'fcn', 'fci', 'ppca', 'ppcn', 'ppci', 'ppastpa', 'ppastpn', 'ppastpi', 'ppastca', 'ppastcn', 'ppastci', 'fpca', 'fpcn', 'fpci'].forEach(prefix => {
        let i = 0;
        while (true) {
            const cont = document.getElementById(`${prefix}-opts-${i}`);
            if (!cont) break;
            const opts     = Array.from(cont.querySelectorAll('.option'));
            const selected = opts.find(o =>
                o.classList.contains('selected') ||
                o.classList.contains('correct')  ||
                o.classList.contains('incorrect')
            );
            if (selected) {
                const selectedIdx = opts.indexOf(selected);
                const correctIdx  = opts.findIndex(o => o.classList.contains('correct'));
                practiceAnswers[`${prefix}-${i}`] = {
                    selectedIdx,
                    correctIdx:  correctIdx >= 0 ? correctIdx : selectedIdx,
                    isCorrect:   selected.classList.contains('correct'),
                    disabled:    opts[0] && opts[0].style.pointerEvents === 'none'
                };
            }
            i++;
        }
    });

    // ── Video quiz answered-question sets ────────────────────────────────────
    const v1 = typeof video1Answered !== 'undefined' ? [...video1Answered] : [];
    const v2 = typeof video2Answered !== 'undefined' ? [...video2Answered] : [];
    const v3 = typeof video3Answered !== 'undefined' ? [...video3Answered] : [];
    const v4 = typeof video4Answered !== 'undefined' ? [...video4Answered] : [];

    // ── Build full snapshot ───────────────────────────────────────────────────
    // Start with existing state from profileManager to avoid losing data
    const state = profileManager.getLessonState(currentUser.username, tense) || {};

    state.timestamp = new Date().toISOString();
    state.tense = tense;
    state.activeTab = activeTabId;
    state.video1Answered = v1;
    state.video2Answered = v2;
    state.video3Answered = v3;
    state.video4Answered = v4;
    state.fillAnswers = fillAnswers;
    state.practiceAnswers = practiceAnswers;
    
    // Add filter states and quiz visual details
    state.currentDifficulty = currentDifficulty;
    state.currentSentenceForm = currentSentenceForm;

    if (typeof captureVideoQuizDetails === 'function') {
        state.video1Details = captureVideoQuizDetails(1, video1Answered);
        state.video2Details = captureVideoQuizDetails(2, video2Answered);
        state.video3Details = captureVideoQuizDetails(3, video3Answered);
        state.video4Details = captureVideoQuizDetails(4, video4Answered);
    }

    // ── Primary save: direct flat key (most reliable) ─────────────────────────
    const directKey = `tenseflix_state_${currentUser.username}_${tense}`;
    try {
        localStorage.setItem(directKey, JSON.stringify(state));
    } catch (e) {
        if (!suppressToast) showSaveToast('❌ Ошибка сохранения: недостаточно места', 'error');
        return false;
    }

    // ── Secondary save: nested profileManager path (backup) ───────────────────
    try {
        profileManager.saveLessonState(currentUser.username, tense, state);
    } catch (e) { /* non-critical */ }

    if (!suppressToast) {
        const label = contextLabel ? ` (${contextLabel})` : '';
        showSaveToast(`✅ Прогресс сохранён${label}`, 'success');
    }
    return true;
}

function setupAutoSave() {
    // Auto-save every 15 seconds (including time spent)
    setInterval(() => { 
        saveTimeSpent();
        triggerSave(null, true); 
    }, 15000);

    // Save everything before the page unloads
    window.addEventListener('beforeunload', () => { 
        saveTimeSpent();
        triggerSave(null, true); 
    });

    // Save when the tab loses focus
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            saveTimeSpent();
            triggerSave(null, true);
        }
    });

    // Instant save when typing in any input field
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('fill-input') || e.target.classList.contains('quiz-fill-input')) {
            saveFillAnswers(getTenseFromURL());
        }
    });
}

function calculatePracticeScore() {
    // Use the visible practice container
    var dynEx = document.getElementById('tense-dynamic-exercises');
    const practiceTab = (dynEx && dynEx.style.display !== 'none')
        ? dynEx
        : (document.getElementById('lesson-tab-check') || document);

    let correct = 0;
    let total   = 0;

    // 1. Multiple-choice blocks (Practice 1)
    ['aff', 'neg', 'int', 'pca', 'pcn', 'pci', 'psa', 'psn', 'psi', 'ppa', 'ppn', 'ppi', 'fsa', 'fsn', 'fsi', 'fpa', 'fpn', 'fpi', 'fca', 'fcn', 'fci', 'ppca', 'ppcn', 'ppci', 'ppastpa', 'ppastpn', 'ppastpi', 'ppastca', 'ppastcn', 'ppastci', 'fpca', 'fpcn', 'fpci'].forEach(prefix => {
        let i = 0;
        while (true) {
            const cont = practiceTab.querySelector(`#${prefix}-opts-${i}`);
            if (!cont) break;
            total++;
            if (cont.querySelector('.option.selected.correct:not(.incorrect)')) correct++;
            i++;
        }
    });

    // 2. Fill-in-the-blank inputs (Practice 2)
    practiceTab.querySelectorAll('.fill-input').forEach(input => {
        total++;
        if (input.classList.contains('fill-correct')) correct++;
    });

    // 3. Drag-and-drop sentences (Practice 3)
    practiceTab.querySelectorAll('.word-bank[id]').forEach(function(bank) {
        total++;
        var qId = bank.id.replace('bank-', '');
        var resultEl = document.getElementById('drag-result-' + qId);
        if (resultEl && resultEl.classList.contains('drag-res-ok')) correct++;
    });

    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { correct, total, percent };
}

/**
 * Resets only the INCORRECT Practice Tasks answers so the user can try again.
 * Correctly-answered items stay locked with green highlighting.
 * Scoped to #lesson-tab-check — video quiz elements are untouched.
 *
 * Rules per exercise type:
 *   Multiple-choice : skip if .option.selected.correct is present, else reset options.
 *   Fill-in-blank   : skip if input has .fill-correct, else clear & re-enable.
 *   Drag-drop       : skip if drag-result has .drag-res-ok, else call resetDragQ.
 */
function resetPracticeTasks() {
    var dynEx = document.getElementById('tense-dynamic-exercises');
    const practiceTab = (dynEx && dynEx.style.display !== 'none')
        ? dynEx
        : (document.getElementById('lesson-tab-check') || document);
    let firstIncorrectEl = null;

    // ── 1. Multiple-choice (Practice 1) ──────────────────────────────────────
    ['aff', 'neg', 'int', 'pca', 'pcn', 'pci', 'psa', 'psn', 'psi', 'ppa', 'ppn', 'ppi', 'fsa', 'fsn', 'fsi', 'fpa', 'fpn', 'fpi', 'fca', 'fcn', 'fci', 'ppca', 'ppcn', 'ppci', 'ppastpa', 'ppastpn', 'ppastpi', 'ppastca', 'ppastcn', 'ppastci', 'fpca', 'fpcn', 'fpci'].forEach(prefix => {
        let i = 0;
        while (true) {
            const cont = practiceTab.querySelector(`#${prefix}-opts-${i}`);
            if (!cont) break;

            // Always reset this question for retry, regardless of whether it was correct
            {
                cont.querySelectorAll('.option').forEach(opt => {
                    opt.classList.remove('selected', 'correct', 'incorrect');
                    opt.style.pointerEvents = '';
                    opt.style.opacity       = '';
                    // onclick handlers are never nullified now, so no need to restore
                });
                // Remove badge from incorrect exercise so it can be re-answered
                const exerciseBlock = cont.closest('.exercise');
                const badge = exerciseBlock && exerciseBlock.querySelector('.practice-mc-badge');
                if (badge) badge.remove();
                if (!firstIncorrectEl) firstIncorrectEl = exerciseBlock || cont;
            } // End of unconditional reset block
            i++;
        }
    });

    // ── 2. Fill-in-blank (Practice 2) ────────────────────────────────────────
    practiceTab.querySelectorAll('.fill-input').forEach(input => {

        // Reset incorrect / unanswered input
        input.value               = '';
        input.disabled            = false;
        input.style.pointerEvents = '';
        input.classList.remove('fill-correct', 'fill-incorrect');
        const resEl = document.getElementById(input.id + '-res');
        if (resEl) { resEl.textContent = ''; resEl.className = 'fill-result'; }
        if (!firstIncorrectEl) firstIncorrectEl = input.closest('.fill-exercise') || input;
    });

    // ── 3. Drag-drop (Practice 3) ─────────────────────────────────────────────
    practiceTab.querySelectorAll('.word-bank[id]').forEach(function(bank) {
        var qId = bank.id.replace('bank-', '');
        // Always reset drag-and-drop questions
        if (typeof resetDragQ === 'function') resetDragQ(qId);
        if (!firstIncorrectEl) firstIncorrectEl = practiceTab.querySelector('#drag-' + qId) || bank;
    });

    // Reset all attempts for all drag questions
    return firstIncorrectEl; // caller uses this for scroll target
}

/**
 * Marks the current tense as completed after checking the practice score.
 * - Shows a score result overlay (%).
 * - ≥ 70%: celebrates, marks complete, offers "Next Tense" redirect.
 * -  < 70%: shows failure message + "Try Again" button.
 */
function completeTense() {
    const tense       = getTenseFromURL();
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) {
        showSaveToast('❌ Войдите в аккаунт', 'error');
        return;
    }

    const MIN_PERCENT  = 70;
    const score        = calculatePracticeScore();
    const passed       = score.percent >= MIN_PERCENT;
    const currentIdx   = TENSE_ORDER.findIndex(t => t.id === tense);
    const currentTense = TENSE_ORDER[currentIdx] || { label: tense, level: currentIdx + 1 };
    const next         = TENSE_ORDER[currentIdx + 1] || null;

    // Auto-save current progress
    triggerSave(null, true);

    // Always update the profile progress with the latest score
    profileManager.updateProgress(currentUser.username, tense, {
        completed: score.total,
        correctCount: score.correct,
        light: score.percent
    });
    profileManager.savePracticeResult(currentUser.username, {
        score: score.percent,
        status: passed ? 'done' : 'retake',
        tense: tense
    });

    // Remove any existing overlay
    const old = document.getElementById('score-result-overlay');
    if (old) old.remove();

    // ── Build overlay ────────────────────────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.id = 'score-result-overlay';
    overlay.className = 'score-overlay';

    // Score ring colour
    const ringColor  = passed ? '#22c55e' : '#ef4444';
    const ringBg     = passed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)';

    // ── Passed branch ─────────────────────────────────────────────────────────
    if (passed) {
        // Блокируем все элементы практики, чтобы нельзя было перепройти
        lockPracticeSection();
        triggerSave(null, true);

        const unlockMsg = next
            ? `<p class="score-unlock">🔓 Level ${next.level} — <strong>${next.label}</strong> unlocked!</p>`
            : `<p class="score-unlock">🏆 All tenses completed!</p>`;

        overlay.innerHTML = `
            <div class="score-card">
                <div class="score-emoji">🎉</div>
                <h2 class="score-title">✅ Done</h2>
                <p class="score-tense-name">${currentTense.label}</p>

                <div class="score-ring" style="--ring-color:${ringColor};--ring-bg:${ringBg}">
                    <span class="score-percent">${score.percent}%</span>
                    <span class="score-fraction">${score.correct} / ${score.total} correct</span>
                </div>

                ${unlockMsg}

                <div class="score-btn-row">
                    <button class="score-btn score-btn-next" onclick="finishAndRedirect()">
                        Next Tense →
                    </button>
                </div>
            </div>
        `;

        // Mark completed only when passed
        profileManager.markTenseCompleted(currentUser.username, tense);

    // ── Failed branch ─────────────────────────────────────────────────────────
    } else {
        overlay.innerHTML = `
            <div class="score-card">
                <div class="score-emoji">😕</div>
                <h2 class="score-title">⚠️ Retake</h2>
                <p class="score-tense-name">${currentTense.label}</p>

                <div class="score-ring" style="--ring-color:${ringColor};--ring-bg:${ringBg}">
                    <span class="score-percent">${score.percent}%</span>
                    <span class="score-fraction">${score.correct} / ${score.total} correct</span>
                </div>

                <p class="score-need-msg">You need at least ${MIN_PERCENT}% to continue</p>

                <div class="score-btn-row">
                    <button class="score-btn score-btn-retry" onclick="retryPractice()">
                        ⚠️ Retake
                    </button>
                    <button class="score-btn score-btn-dashboard" onclick="window.location.href='dashboard.html'">
                        ← Dashboard
                    </button>
                </div>
            </div>
        `;
    }

    document.body.appendChild(overlay);
    // small delay so the CSS animation fires
    requestAnimationFrame(() => overlay.classList.add('score-overlay-visible'));
}

/** Called from the "Next Tense →" button inside the score overlay. */
function finishAndRedirect() {
    const overlay = document.getElementById('score-result-overlay');
    if (overlay) overlay.classList.remove('score-overlay-visible');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 350);
}

function forcePracticeResult(percent) {
    const tense = getTenseFromURL();
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) {
        showSaveToast('❌ Войдите в аккаунт', 'error');
        return;
    }

    const passed = percent >= 70;
    const resultData = {
        completed: passed ? 10 : 3,
        correctCount: passed ? 7 : 2,
        light: percent,
        lastAccessed: new Date().toISOString()
    };

    profileManager.updateProgress(currentUser.username, tense, resultData);
    profileManager.savePracticeResult(currentUser.username, {
        score: percent,
        status: passed ? 'done' : 'retake',
        tense: tense
    });
    if (passed) {
        profileManager.markTenseCompleted(currentUser.username, tense);
        lockPracticeSection();
    }

    triggerSave(null, true);
    showForcedResultOverlay(percent, resultData.correctCount, resultData.completed, passed);
}

function showForcedResultOverlay(percent, correct, total, passed) {
    const tense = getTenseFromURL();
    const currentIdx = TENSE_ORDER.findIndex(t => t.id === tense);
    const currentTense = TENSE_ORDER[currentIdx] || { label: tense, level: currentIdx + 1 };
    const next = TENSE_ORDER[currentIdx + 1] || null;

    const old = document.getElementById('score-result-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'score-result-overlay';
    overlay.className = 'score-overlay';
    const ringColor = passed ? '#22c55e' : '#ef4444';
    const ringBg = passed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)';

    if (passed) {
        overlay.innerHTML = `
            <div class="score-card">
                <div class="score-emoji">🎉</div>
                <h2 class="score-title">✅ Done</h2>
                <p class="score-tense-name">${currentTense.label}</p>

                <div class="score-ring" style="--ring-color:${ringColor};--ring-bg:${ringBg}">
                    <span class="score-percent">${percent}%</span>
                    <span class="score-fraction">${correct} / ${total} correct</span>
                </div>

                <p class="score-unlock">${next ? `🔓 Level ${next.level} — <strong>${next.label}</strong> unlocked!` : '🏆 All tenses completed!'}</p>

                <div class="score-btn-row">
                    <button class="score-btn score-btn-next" onclick="finishAndRedirect()">
                        Next Tense →
                    </button>
                </div>
            </div>
        `;
    } else {
        overlay.innerHTML = `
            <div class="score-card">
                <div class="score-emoji">😕</div>
                <h2 class="score-title">⚠️ Retake</h2>
                <p class="score-tense-name">${currentTense.label}</p>

                <div class="score-ring" style="--ring-color:${ringColor};--ring-bg:${ringBg}">
                    <span class="score-percent">${percent}%</span>
                    <span class="score-fraction">${correct} / ${total} correct</span>
                </div>

                <p class="score-need-msg">You need at least 70% to continue</p>

                <div class="score-btn-row">
                    <button class="score-btn score-btn-retry" onclick="retryPractice()">
                        ⚠️ Retake
                    </button>
                    <button class="score-btn score-btn-dashboard" onclick="window.location.href='dashboard.html'">
                        ← Dashboard
                    </button>
                </div>
            </div>
        `;
    }

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('score-overlay-visible'));
}

/** Блокирует секцию практики (инпуты, кнопки, варианты), если урок завершен. */
function lockPracticeSection() {
    const pTab = document.getElementById('lesson-tab-check') || document;
    
    pTab.querySelectorAll('.fill-input').forEach(input => {
        input.disabled = true;
        input.style.opacity = '0.75';
    });
    pTab.querySelectorAll('.option').forEach(opt => {
        opt.style.pointerEvents = 'none';
        opt.style.opacity = '0.7';
    });
    pTab.querySelectorAll('.word-bank, .answer-zone').forEach(el => {
        el.style.pointerEvents = 'none';
    });
    pTab.querySelectorAll('.get-result-btn, .quiz-check-btn, .drag-reset-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });
}

/**
 * Validates and calculates the final score for the Practice tab.
 */
function getResult() {
    const tense = getTenseFromURL();
    let practiceTab = null;
    if (tense === 'present-simple') practiceTab = document.getElementById('tense-dynamic-exercises');
    else if (tense === 'present-continuous') practiceTab = document.getElementById('pc-practice-static');
    else practiceTab = document.getElementById('tense-dynamic-exercises');
    if (!practiceTab) practiceTab = document.getElementById('lesson-tab-check') || document;

    // ── Pass 1: Check for unanswered questions ──────────────────────────────
    let firstUnanswered = null;
    
    // Remove old error labels
    practiceTab.querySelectorAll('.q-unanswered-label').forEach(el => el.remove());
    practiceTab.querySelectorAll('.q-unanswered').forEach(el => el.classList.remove('q-unanswered'));

    // Check Multiple Choice (Section 1)
    ['psa', 'psn', 'psi', 'aff', 'neg', 'int', 'pca', 'pcn', 'pci', 'ppa', 'ppn', 'ppi', 'fsa', 'fsn', 'fsi', 'fpa', 'fpn', 'fpi', 'fca', 'fcn', 'fci', 'ppca', 'ppcn', 'ppci', 'ppastpa', 'ppastpn', 'ppastpi', 'ppastca', 'ppastcn', 'ppastci', 'fpca', 'fpcn', 'fpci'].forEach(prefix => {
        let i = 0;
        while (true) {
            const cont = practiceTab.querySelector(`#${prefix}-opts-${i}`);
            if (!cont) break;
            const hasSelection = cont.querySelector('.option.selected');
            if (!hasSelection) {
                const ex = cont.closest('.exercise');
                if (ex) {
                    ex.classList.add('q-unanswered');
                    if (!firstUnanswered) firstUnanswered = ex;
                }
            }
            i++;
        }
    });

    // Check Fill-in-the-blank (Section 2 & 3)
    practiceTab.querySelectorAll('.fill-input').forEach(input => {
        if (!input.disabled && input.value.trim() === '') {
            const ex = input.closest('.fill-exercise');
            if (ex) {
                ex.classList.add('q-unanswered');
                if (!firstUnanswered) firstUnanswered = ex;
            }
        }
    });

    if (firstUnanswered) {
        // Auto-switch to hidden section if the unanswered question is inside one
        const section = firstUnanswered.closest('[id$="-section-1"], [id$="-section-2"], [id$="-section-3"], [id$="-section-4"], [id$="-section-5"]');
        if (section && section.style.display === 'none') {
            const match = section.id.match(/\d+$/);
            if (match) {
                const num = parseInt(match[0]);
                if (tense === 'present-simple') switchPresentSimpleSection(num);
                else if (tense === 'past-simple') switchPSSection(num);
                else if (tense === 'present-continuous') switchPCSection(num);
                else if (tense === 'past-continuous') switchPContSection(num);
                else if (tense === 'present-perfect-continuous') switchPPContSection(num);
                else if (tense === 'present-perfect') switchPPSection(num);
                else if (tense === 'future-simple') switchFSSection(num);
                else if (tense === 'future-perfect') switchFPSection(num);
                else if (tense === 'past-perfect') switchPPastPSection(num);
                else if (tense === 'future-continuous') switchFCSection(num);
                else if (tense === 'past-perfect-continuous') switchPPastContSection(num);
                else if (tense === 'future-perfect-continuous') switchFPCSection(num);
            }
        }

        const msg = document.createElement('div');
        msg.className = 'q-unanswered-label';
        msg.style.cssText = 'color:#ef4444; font-weight:700; margin-bottom:10px; text-align:center;';
        msg.textContent = '⚠ Please answer all questions before getting results';
        firstUnanswered.prepend(msg);
        firstUnanswered.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    // ── Pass 2: Auto-submit remaining items ─────────────────────────────────

    // Auto-check fill inputs that have a value but weren't submitted yet
    practiceTab.querySelectorAll('.fill-input').forEach(input => {
        if (!input.disabled && input.value.trim() !== '') {
            checkFill(input.id);
        }
    });

    // Auto-check all drag exercises using stored data-correct attribute
    practiceTab.querySelectorAll('.answer-zone[data-correct]').forEach(function(zone) {
        const qId = zone.id.replace('answer-', '');
        const resultEl = document.getElementById('drag-result-' + qId);
        if (!resultEl || !resultEl.classList.contains('drag-res-ok')) {
            const correctAnswer = zone.dataset.correct || '';
            if (correctAnswer) checkWordOrder(qId, correctAnswer);
        }
    });

    // Save then show score overlay
    triggerSave(null, true);
    completeTense();
}

/** Called from the "Try Again" button — resets only incorrect practice answers & closes overlay. */
function retryPractice() {
    const overlay = document.getElementById('score-result-overlay');
    if (overlay) {
        overlay.classList.remove('score-overlay-visible');
        setTimeout(() => overlay.remove(), 350);
    }
    // Clear any unanswered highlights from previous Get Result attempt
    const practiceTab = document.getElementById('lesson-tab-check') || document;
    practiceTab.querySelectorAll('.q-unanswered').forEach(el => el.classList.remove('q-unanswered'));
    practiceTab.querySelectorAll('.q-unanswered-label').forEach(el => el.remove());
    const firstIncorrect = resetPracticeTasks();
    // Scroll to the first question that was reset (first incorrect), or top of practice section
    const scrollTarget = firstIncorrect || document.querySelector('.practice-tasks-container');
    if (scrollTarget) {
        setTimeout(() => scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
    }
}

/**
 * Restores fill-in-the-blank answers from saved state.
 */
function restoreFillAnswers(tenseId) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const state = profileManager.getLessonState(currentUser.username, tenseId);
    if (!state || !state.fillAnswers) return;

    Object.entries(state.fillAnswers).forEach(([inputId, saved]) => {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.value = saved.value || '';
        if (saved.disabled) {
            input.disabled = true;
            input.style.opacity = '0.75';
        } else {
            input.disabled = false;
            input.style.opacity = '';
        }
        const resEl = document.getElementById(inputId + '-res');
        if (resEl && saved.resultText) resEl.textContent = saved.resultText;
    });
}

/**
 * Restores multiple-choice practice answers (aff/neg/int) from saved state.
 */
function restorePracticeMultiChoice(tenseId) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const state = profileManager.getLessonState(currentUser.username, tenseId);
    if (!state || !state.practiceAnswers) return;

    Object.entries(state.practiceAnswers).forEach(([key, saved]) => {
        const [prefix, idxStr] = key.split('-');
        const cont = document.getElementById(`${prefix}-opts-${idxStr}`);
        if (!cont) return;

        const opts = Array.from(cont.querySelectorAll('.option'));

        if (opts[saved.selectedIdx]) {
            opts[saved.selectedIdx].classList.add('selected');
            if (saved.isCorrect) {
                opts[saved.selectedIdx].classList.add('correct');
            } else {
                opts[saved.selectedIdx].classList.add('incorrect');
                if (opts[saved.correctIdx]) opts[saved.correctIdx].classList.add('correct');
            }
        }

        if (saved.disabled) {
            opts.forEach(o => { o.style.pointerEvents = 'none'; o.style.opacity = '0.7'; });
        }
    });
}

// ===================== END SAVE SYSTEM =====================

// Check authentication
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadUserInfo();
    loadLesson();
    initializeExerciseControls();
    setupAutoSave();
});

function loadUserInfo() {
    const currentUser = profileManager.getCurrentUser();
    if (currentUser) {
        const nameFirst = currentUser.fullName ? currentUser.fullName.split(' ')[0] : 'User';
        const userElement = document.getElementById('user-name');
        if (userElement) {
            userElement.textContent = nameFirst;
        }
    }
}

function setupAutoSave() {
    // Auto-save every 15 seconds (including time spent)
    setInterval(() => { 
        saveTimeSpent();
        triggerSave(null, true); 
    }, 15000);

    // Save everything before the page unloads
    window.addEventListener('beforeunload', () => { 
        saveTimeSpent();
        triggerSave(null, true); 
    });

    // Save when the tab loses focus (user switches windows/apps)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            saveTimeSpent();
            triggerSave(null, true);
        }
    });
}

function checkAuth() {
    if (!profileManager.isLoggedIn()) {
        window.location.href = 'login.html';
    }
}

function logout() {
    if (confirm('Are you sure you want to log out?')) {
        profileManager.logout();
        window.location.href = 'login.html';
    }
}

// Get tense from URL
function getTenseFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('tense');
}

/** Checks if the user has access to the given tense based on progression */
function checkLessonAccess(tense) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser || profileManager.isCurrentUserAdmin()) return true;

    const targetIdx = TENSE_ORDER.findIndex(t => t.id === tense);
    if (targetIdx <= 0) return true; // First tense is always open

    // Check if the previous tense is marked as completed
    const prevTenseId = TENSE_ORDER[targetIdx - 1].id;
    const progress = profileManager.getUserProgress(currentUser.username);
    return progress[prevTenseId] && progress[prevTenseId].completedAt !== null;
}

// Lesson Data
window.lessonsData = { // Make lessonsData explicitly global
    'present-simple': {
        title: 'Present Simple',
        russian: 'Настоящее простое',
        videoUrl: 'https://www.youtube.com/embed/B8UquHzbMmE',
        videoFile: 'present simple 1.mp4',
        videoFile2: 'present simple 2.1.mp4',
        videoFile3: 'present simple 3.1.mp4',
        videoFile4: 'present simple video 4.mp4',
        videoQuiz1: [
            {
                text: 'Is this action happening right now or does it happen every day?',
                options: ['Right now', 'Every day'],
                correct: 1,
                explanation: 'We use Present Simple to talk about everyday actions, habits, and routines.<br>Examples: <em>I brush my teeth everyday.</em> <em>He washes the dishes everyday.</em>'
            },
            {
                text: 'Do Peppa and Jack sleep with their toys every day?',
                options: ['Yes', 'No'],
                correct: 0,
                explanation: 'Examples: <em>When Peppa goes to bed, she always has her teddy.</em>'
            },
            {
                text: 'Does the video show a routine or habits?',
                options: ['Yes', 'No'],
                correct: 0,
                explanation: '<em>When Peppa go<strong>ES</strong> to bed, she always ha<strong>S</strong> her teddy</em> (always, repetitively), which means she does this everyday.'
            },
            {
                type: 'drag',
                text: 'Reorder the words to form a correct sentence:',
                words: ['goes', 'Peppa', 'to bed', 'everyday.', 'with her toy'],
                correct: 'Peppa goes to bed with her toy everyday.',
                explanation: 'The correct word order: <em><strong>Peppa goes to bed with her toy everyday.</strong></em> In Present Simple affirmative sentences: Subject + verb (+<em>-s</em> for he/she/it) + the rest.'
            },
            {
                type: 'drag',
                text: 'Reorder the words to form a correct sentence:',
                words: ['Jack', 'everyday.', 'with his dinosaur', 'goes', 'to bed'],
                correct: 'Jack goes to bed with his dinosaur everyday.',
                explanation: 'The correct word order: <em><strong>Jack goes to bed with his dinosaur everyday.</strong></em> Subject + verb + object/phrase.'
            },
            {
                text: 'Do the verbs change their form when we talk about <em>he / she / it</em>?',
                options: ['Yes', 'No'],
                correct: 0,
                explanation: 'In Present Simple we add "-s/-es" to verbs for 3rd person singular in affirmative sentences.<br>Example: <em>When Peppa goes to bed, she always ha<strong>S</strong> her teddy.</em>'
            },
            {
                text: 'Do the verbs change their form if the subjects are not &ldquo;he/she/it&rdquo;?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'In Present Simple verbs do not change their form when we talk about two or more people. In Present Simple verbs also do not change their form for &ldquo;I&rdquo; and &ldquo;You&rdquo;.<br>Example: <em>I like stories.</em> <em>Peppa and Jack like stories.</em>'
            }
        ],
        videoQuiz1b: [
            { type: 'intro', text: 'Choose the correct option:' },
            { text: 'Peppa and Jack _________ their teeth in the bathroom.', options: ['brushes', 'brush', 'brushing'], correct: 1, wrongOnly: true, explanation: 'Peppa and Jack = they (plural) &rarr; use the base form: <strong>brush</strong>, no -s ending.' },
            { text: 'Peppa _________ to bed in the evening.', options: ['go', 'goes', 'going'], correct: 1, wrongOnly: true, explanation: 'Peppa = she (3rd person singular) &rarr; add <strong>-s</strong>: go &rarr; go<strong>es</strong>.' },
            { text: 'Peppa and Jack _________ stories.', options: ['like', 'likes', 'liking'], correct: 0, wrongOnly: true, explanation: 'Peppa and Jack = they (plural) &rarr; base form: <strong>like</strong>, no -s.' },
            { text: 'When Peppa goes to bed, she always _________ her teddy with her.', options: ['have', 'has', 'having'], correct: 1, wrongOnly: true, explanation: 'She = 3rd person singular &rarr; <strong>has</strong> (irregular: have &rarr; has).' },
            { text: 'Jack _________ Mr. Dinosaur tucked up with him.', options: ['has', 'have', 'is having'], correct: 0, wrongOnly: true, explanation: 'Jack = he (3rd person singular) &rarr; <strong>has</strong> (irregular: have &rarr; has).' },
            { text: 'Jack _________ in the top bunk bed.', options: ['sleep', 'sleeps', 'sleeping'], correct: 1, wrongOnly: true, explanation: 'Jack = he &rarr; <strong>sleeps</strong> (add -s).' },
            { text: 'Peppa _________ in the bottom bunk bed.', options: ['sleep', 'sleeps', 'sleeping'], correct: 1, wrongOnly: true, explanation: 'Peppa = she &rarr; <strong>sleeps</strong> (add -s).' },
            { text: 'Mummy Pig and Daddy Pig _________ the children get ready for bed.', options: ['helps', 'help', 'helping'], correct: 1, wrongOnly: true, explanation: 'Mummy Pig and Daddy Pig = they (plural) &rarr; base form: <strong>help</strong>.' },
            { text: 'Daddy Pig _________ glasses every day.', options: ['wear', 'wears', 'wearing'], correct: 1, wrongOnly: true, explanation: 'Daddy Pig = he &rarr; <strong>wears</strong> (add -s).' },
            { text: 'Mummy Pig _________ an orange dress.', options: ['wear', 'wears', 'wearing'], correct: 1, wrongOnly: true, explanation: 'Mummy Pig = she &rarr; <strong>wears</strong> (add -s).' }
        ],
        grammarBank1: {
            title: 'Present Simple +',
            intro: 'We use the present simple for things that are <strong>generally true</strong> or are <strong>habits</strong>.',
            structure: 'The word order for present simple is <strong>SV</strong> = Subject&nbsp;+&nbsp;verb',
            examples: [
                'I <strong>speak</strong> English.',
                'Kids <strong>like</strong> stories.',
                'We add <strong>-s</strong> to the verbs when the subjects are 3rd person singular.',
                'Jack <strong>goes</strong> to bed with his dinosaur.',
                '<table style="border-collapse:collapse;margin:6px 0;font-size:0.95rem;"><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">I</td><td>like an apple</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">You</td><td>like an apple</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">He</td><td>like<strong>s</strong> an apple</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">She</td><td>like<strong>s</strong> an apple</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">It</td><td>like<strong>s</strong> an apple</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">We</td><td>like an apple</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">They</td><td>like an apple</td></tr></table>'
            ]
        },
        videoQuiz2: [
            {
                type: 'intro',
                text: 'Pay attention to the example: &ldquo;I do not remember him&rdquo;, &ldquo;He doesn&rsquo;t have a problem with me&rdquo;.'
            },
            {
                type: 'fill',
                text: 'What auxiliary verbs do we add to make the sentence negative?',
                answer: "don't / doesn't",
                placeholder: 'type here...',
                explanation: 'We use auxiliary verbs &ldquo;don&rsquo;t&rdquo; and &ldquo;doesn&rsquo;t&rdquo; to make negative statements in the Present Simple.<br><table style="border-collapse:collapse;margin:8px 0;font-size:0.93rem;"><tr><td style="padding:2px 14px 2px 0;font-weight:600;color:#e2b714;">I</td><td>don&rsquo;t like apples</td></tr><tr><td style="padding:2px 14px 2px 0;font-weight:600;color:#e2b714;">You</td><td>don&rsquo;t like</td></tr><tr><td style="padding:2px 14px 2px 0;font-weight:600;color:#e2b714;">He</td><td>doesn&rsquo;t like</td></tr><tr><td style="padding:2px 14px 2px 0;font-weight:600;color:#e2b714;">She</td><td>doesn&rsquo;t like</td></tr><tr><td style="padding:2px 14px 2px 0;font-weight:600;color:#e2b714;">It</td><td>doesn&rsquo;t like</td></tr><tr><td style="padding:2px 14px 2px 0;font-weight:600;color:#e2b714;">We</td><td>don&rsquo;t like</td></tr><tr><td style="padding:2px 14px 2px 0;font-weight:600;color:#e2b714;">They</td><td>don&rsquo;t like</td></tr></table>'
            },
            {
                text: 'Where do we put auxiliary verbs &ldquo;don&rsquo;t&rdquo; and &ldquo;doesn&rsquo;t&rdquo; in the sentence?',
                options: ['After the main verb', 'Before the main verb'],
                correct: 1,
                explanation: 'Examples: <em>I don&rsquo;t eat breakfast.</em> <em>She doesn&rsquo;t go to school.</em>'
            },
            {
                type: 'drag',
                text: 'Put the words in correct order:',
                words: ['remember', 'Will.', 'They', "don't"],
                correct: "They don't remember Will.",
                explanation: 'Word order: <strong>Subject + don&rsquo;t/doesn&rsquo;t + verb + object</strong>. <em>They don&rsquo;t remember Will.</em>'
            },
            {
                type: 'drag',
                text: 'Put the words in correct order:',
                words: ["doesn't", 'Rachel', 'him.', 'like'],
                correct: "Rachel doesn't like him.",
                explanation: 'Rachel = she (3rd person singular) &rarr; <strong>doesn&rsquo;t</strong> + verb (no -s on the main verb). <em>Rachel doesn&rsquo;t like him.</em>'
            },
            {
                text: 'Look at the sentence &ldquo;He doesn&rsquo;t have a problem with me&rdquo;. What is the form of the main verb in a negative sentence in the Present Simple?',
                options: ['Base form', 'Verb+s'],
                correct: 0,
                explanation: 'In negative sentences we use the base form of the verbs for all subjects.<br><em>George doesn&rsquo;t drive a car.</em> <em>Peppa doesn&rsquo;t ride a bicycle.</em>'
            },
            {
                type: 'intro',
                text: 'Look at the dialogue:<br><strong>Ross:</strong> Does he have a problem with you?<br><strong>Rachel:</strong> I don&rsquo;t know. Do you have a problem with me?<br><strong>Will:</strong> I don&rsquo;t know. Do I? Do I?'
            },
            {
                type: 'fill',
                text: 'What auxiliary verbs start the question?',
                answer: 'do / does',
                placeholder: 'type here...',
                explanation: 'Example: <em>Do you go to school?</em>'
            },
            {
                text: 'Where is the subject in the question?',
                options: ['Before auxiliary verb', 'After auxiliary verb'],
                correct: 1,
                explanation: 'Example: <em>Does he have a phone?</em>'
            },
            {
                type: 'drag',
                text: 'Put the words in correct order:',
                words: ['you', 'Do', 'a problem', 'have', 'with me?'],
                correct: 'Do you have a problem with me?',
                explanation: 'Word order for questions: <strong>Do/Does + subject + verb + &hellip;?</strong> <em>Do you have a problem with me?</em>'
            },
            {
                type: 'drag',
                text: 'Put the words in correct order:',
                words: ['Will', 'Does', 'Rachel?', 'remember'],
                correct: 'Does Will remember Rachel?',
                explanation: 'Will = he (3rd singular) &rarr; <strong>Does</strong> + subject + verb (no -s). <em>Does Will remember Rachel?</em>'
            },
            {
                text: 'Look at the question &ldquo;Does he have a problem with you?&rdquo;. The main verb is &hellip;',
                options: ['Bare infinitive', 'Verb+s'],
                correct: 0,
                explanation: 'The main verbs don&rsquo;t change their form in negative and interrogative sentences.<br>Examples: <em>Does he walk to school?</em> <em>He doesn&rsquo;t walk to school.</em>'
            },
            {
                text: 'Which auxiliary verb goes with &ldquo;I / You / We / They&rdquo;?',
                options: ['Do', 'Does'],
                correct: 0
            },
            {
                text: 'Which auxiliary verb goes with &ldquo;He / She / It&rdquo;?',
                options: ['Do', 'Does'],
                correct: 1
            },
            {
                type: 'intro',
                text: 'Look at the dialogue between Rachel, Will and Phoebe:<br><strong>Rachel:</strong> Excuse me, do you have a problem with me?<br><strong>Will:</strong> I don&rsquo;t know. Do I? Do I?<br><strong>Phoebe:</strong> I think you do.'
            },
            {
                text: 'Does Phoebe repeat the whole sentence to give a short answer?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'Example: <em>I think you do.</em>'
            },
            {
                type: 'fill',
                text: 'What auxiliary word does Phoebe use to give a short answer?',
                answer: 'do',
                placeholder: 'type here...',
                explanation: 'To give short answers we use only subject and auxiliary verbs.<br>Example: <em>Do you have a problem with me? Yes, I <strong>do</strong>. / No, I <strong>don&rsquo;t</strong>.</em><br><em>Does Rachel remember Will? Yes, she <strong>does</strong>. / No, she <strong>doesn&rsquo;t</strong>.</em>'
            }
        ],
        grammarBank2: {
            blocks: [
                {
                    intro: '<strong>NEGATIVE SENTENCES</strong><br>To make negatives in Present Simple we use <strong>don&rsquo;t / doesn&rsquo;t + verb (infinitive)</strong>.<br>The word order for negatives is <strong>SAI</strong> = Subject + auxiliary verb/not + infinitive<br><br>Contractions: <strong>do not = don&rsquo;t</strong> &nbsp;&nbsp; <strong>does not = doesn&rsquo;t</strong>',
                    table: [
                        ['I', "don't work"],
                        ['You', "don't work"],
                        ['He', "doesn't work"],
                        ['She', "doesn't work"],
                        ['It', "doesn't work"],
                        ['We', "don't work"],
                        ['They', "don't work"]
                    ],
                    examples: [
                        'Rachel <strong>doesn&rsquo;t</strong> remember him.',
                        'They <strong>don&rsquo;t</strong> like each other.'
                    ]
                },
                {
                    intro: '<strong>QUESTIONS</strong><br>To make questions in Present Simple we start the sentence with <strong>Do / Does</strong>.<br>The word order for interrogatives is <strong>ASI</strong> = Auxiliary verb + Subject + Infinitive?<br><br><strong>Do</strong> and <strong>does</strong> can be: the auxiliary verb to make negatives and questions: <em>Do you like him? Does he remember you?</em> &mdash; or a normal verb: <em>He does his homework every day.</em>',
                    table: [
                        ['Do', 'I work?'],
                        ['Do', 'you work?'],
                        ['Does', 'she work?'],
                        ['Does', 'he work?'],
                        ['Does', 'it work?'],
                        ['Do', 'we work?'],
                        ['Do', 'they work?']
                    ],
                    examples: [
                        '<strong>Do</strong> you remember him?',
                        '<strong>Does</strong> he have a problem with Rachel?'
                    ]
                }
            ]
        },
        videoQuiz2b: [
            { type: 'intro', text: '<strong>Negative sentences</strong> — Choose the correct option:' },
            { text: 'Rachel _________ Will from high school.', options: ['do not remember', 'does not remember', 'not remember'], correct: 1, wrongOnly: true, explanation: 'Rachel = she (3rd singular) &rarr; <strong>does not</strong> remember.' },
            { text: 'Joey _________ who the man is.', options: ['does not know', 'do not know', 'not know'], correct: 0, wrongOnly: true, explanation: 'Joey = he (3rd singular) &rarr; <strong>does not</strong> know.' },
            { text: 'Will _________ Rachel at all.', options: ['do not like', 'does not likes', 'does not like'], correct: 2, wrongOnly: true, explanation: 'Will = he (3rd singular) &rarr; <strong>does not</strong> like (no -s on the main verb).' },
            { text: 'Rachel _________ why Will is angry.', options: ['do not understand', 'does not understand', 'does not understands'], correct: 1, wrongOnly: true, explanation: 'Rachel = she &rarr; <strong>does not</strong> understand (no -s on the main verb).' },
            { text: 'Phoebe _________ that everything is fine between them.', options: ['does not think', 'do not think', 'not think'], correct: 0, wrongOnly: true, explanation: 'Phoebe = she (3rd singular) &rarr; <strong>does not</strong> think.' },
            { text: 'Monica _________ Will\'s identity a secret.', options: ['do not keep', 'does not keeps', 'does not keep'], correct: 2, wrongOnly: true, explanation: 'Monica = she (3rd singular) &rarr; <strong>does not</strong> keep (no -s on the main verb).' },
            { text: 'Will and Rachel _________ along well.', options: ['does not get', 'do not get', 'not get'], correct: 1, wrongOnly: true, explanation: 'Will and Rachel = they (plural) &rarr; <strong>do not</strong> get.' },
            { text: 'Ross _________ the situation to Joey.', options: ['does not explain', 'do not explain', 'does not explains'], correct: 0, wrongOnly: true, explanation: 'Ross = he (3rd singular) &rarr; <strong>does not</strong> explain (no -s on the main verb).' },
            { text: 'Will _________ friendly to Rachel.', options: ['do not act', 'does not acts', 'does not act'], correct: 2, wrongOnly: true, explanation: 'Will = he (3rd singular) &rarr; <strong>does not</strong> act (no -s on the main verb).' },
            { text: 'Rachel _________ a problem with Will.', options: ['do not have', 'does not have', 'does not has'], correct: 1, wrongOnly: true, explanation: 'Rachel = she &rarr; <strong>does not</strong> have (irregular: not &ldquo;has&rdquo;).' },
            { type: 'intro', text: '<strong>Interrogative sentences</strong> — Choose the correct option:' },
            { text: '_________ Rachel remember Will from high school?', options: ['Does', 'Do', 'Is'], correct: 0, wrongOnly: true, explanation: 'Rachel = she (3rd singular) &rarr; <strong>Does</strong>.' },
            { text: '_________ Joey know the man at the table?', options: ['Do', 'Does', 'Are'], correct: 1, wrongOnly: true, explanation: 'Joey = he (3rd singular) &rarr; <strong>Does</strong>.' },
            { text: '_________ Will have a problem with Rachel?', options: ['Do', 'Has', 'Does'], correct: 2, wrongOnly: true, explanation: 'Will = he (3rd singular) &rarr; <strong>Does</strong>.' },
            { text: '_________ Monica know Will?', options: ['Do', 'Does', 'Is'], correct: 1, wrongOnly: true, explanation: 'Monica = she (3rd singular) &rarr; <strong>Does</strong>.' },
            { text: '_________ Phoebe think Will is mad?', options: ['Does', 'Do', 'Are'], correct: 0, wrongOnly: true, explanation: 'Phoebe = she (3rd singular) &rarr; <strong>Does</strong>.' },
            { text: '_________ Will and Rachel like each other?', options: ['Do', 'Does', 'Are'], correct: 0, wrongOnly: true, explanation: 'Will and Rachel = they (plural) &rarr; <strong>Do</strong>.' },
            { text: '_________ the friends eat dinner together?', options: ['Do', 'Does', 'Are'], correct: 0, wrongOnly: true, explanation: 'The friends = they (plural) &rarr; <strong>Do</strong>.' },
            { text: '_________ Will wear a blue sweater?', options: ['Do', 'Does', 'Is'], correct: 1, wrongOnly: true, explanation: 'Will = he (3rd singular) &rarr; <strong>Does</strong>.' },
            { text: '_________ Rachel wear a white shirt?', options: ['Do', 'Is', 'Does'], correct: 2, wrongOnly: true, explanation: 'Rachel = she (3rd singular) &rarr; <strong>Does</strong>.' },
            { text: '_________ Monica tell Rachel the truth?', options: ['Do', 'Does', 'Are'], correct: 1, wrongOnly: true, explanation: 'Monica = she (3rd singular) &rarr; <strong>Does</strong>.' }
        ],
        videoQuiz3: [
            {
                type: 'intro', num: 1,
                text: 'Look at the timetable examples from the video:<br><strong>Guard&rsquo;s doors open at 8:15. &nbsp;Train leaves at 10.</strong>'
            },
            {
                subLetter: 'a',
                text: 'Are these actions happening right now, or are they scheduled for the future?',
                options: ['Happening right now', 'Scheduled for the future'],
                correct: 1,
                explanation: 'We use Present Simple for fixed, scheduled future events — like timetables and official programmes.'
            },
            {
                subLetter: 'b',
                text: 'Are these plans flexible (like &ldquo;I might see a movie&rdquo;), or fixed official schedules?',
                options: ['Flexible plans', 'Fixed official schedules'],
                correct: 1,
                explanation: 'We use the Present Simple to talk about guaranteed, scheduled facts in the future.'
            },
            {
                type: 'intro', num: 2,
                text: 'Look at the affirmative sentence:<br><strong>Train leave<u>s</u> at 10.</strong>'
            },
            {
                subLetter: 'a',
                text: 'What ending does the verb get because &ldquo;train&rdquo; is 3rd person singular (it)?',
                options: ['-s', 'No ending'],
                correct: 0,
                explanation: 'Train leave<strong>s</strong> — in affirmative sentences we add <strong>-s</strong> to the verb for he / she / it.'
            },
            {
                type: 'intro', num: 3,
                text: 'Now look at negative and question forms:<br><strong>The train does not leave at 10. &nbsp;Does the train leave at 10?</strong>'
            },
            {
                subLetter: 'a',
                text: 'What auxiliary verbs do we use to make a negative sentence?',
                options: ['does not / doesn\'t &nbsp;·&nbsp; do not / don\'t', 'am not / is not / are not'],
                correct: 0,
                explanation: 'We use <strong>do not / don\'t</strong> with I, you, we, they — and <strong>does not / doesn\'t</strong> with he, she, it.'
            },
            {
                subLetter: 'b',
                text: 'In questions and negatives with a 3rd person singular subject, does the verb still need an <strong>-s</strong>?',
                options: ['No — the -s moves to &ldquo;does&rdquo;', 'Yes — the verb keeps -s'],
                correct: 0,
                explanation: 'The <strong>-s</strong> moves to the auxiliary: <em>does</em>. The main verb stays in base form — <em>The train does not <strong>leave</strong></em> (not &ldquo;leaves&rdquo;).'
            }
        ],
        videoQuiz3b: [
            {
                type: 'intro',
                text: '<strong>Affirmative sentences</strong> — Choose the correct option:'
            },
            {
                text: 'Train _________ at 8 am in the morning.',
                options: ['arrive', 'arrives', 'arrived'],
                correct: 1,
                wrongOnly: true,
                explanation: 'Train = it (3rd person singular) &rarr; add <strong>-s</strong>: arriv<strong>es</strong>.'
            },
            {
                text: 'Guard&rsquo;s doors ________ at 8.30.',
                options: ['opens', 'opened', 'open'],
                correct: 2,
                wrongOnly: true,
                explanation: 'Guard&rsquo;s doors = they (plural) &rarr; base form: <strong>open</strong>, no -s.'
            },
            {
                text: 'Train _________ at 10 am.',
                options: ['leaves', 'leave', 'left'],
                correct: 0,
                wrongOnly: true,
                explanation: 'Train = it (3rd person singular) &rarr; add <strong>-s</strong>: leav<strong>es</strong>.'
            },
            {
                type: 'intro',
                text: '<strong>Negative sentences</strong> — Choose the correct option:'
            },
            {
                text: 'Train ________ leave at 10 am.',
                options: ['does not', 'do not', 'not'],
                correct: 0,
                wrongOnly: true,
                explanation: 'Train = it (3rd person singular) &rarr; <strong>does not</strong> + infinitive (no -s on the main verb).'
            },
            {
                text: 'Doors ________ open at 8 am.',
                options: ['not', 'does not', 'do not'],
                correct: 2,
                wrongOnly: true,
                explanation: 'Doors = they (plural) &rarr; <strong>do not</strong> + infinitive.'
            },
            {
                type: 'intro',
                text: '<strong>Interrogative sentences</strong> — Choose the correct option:'
            },
            {
                text: '__________ the train arrive at 10 am?',
                options: ['Do', 'Does', 'Is'],
                correct: 1,
                wrongOnly: true,
                explanation: 'Train = it (3rd person singular) &rarr; <strong>Does</strong> + subject + infinitive (no -s on the main verb).'
            },
            {
                text: '_________ the doors open at 8 am?',
                options: ['Do', 'Does', 'Are'],
                correct: 0,
                wrongOnly: true,
                explanation: 'Doors = they (plural) &rarr; <strong>Do</strong> + subject + infinitive.'
            }
        ],
        videoQuiz4: [
            // 1)
            {
                type: 'intro', num: 1,
                text: 'Look at the sentences: &ldquo;I am Yu&rdquo;, &ldquo;Yu is blind&rdquo;, &ldquo;I am not deaf&rdquo;.'
            },
            {
                subLetter: 'a',
                text: 'Do they describe an action or a quality?',
                options: ['An action', 'A quality'],
                correct: 1,
                explanation: 'In Present Simple we use &ldquo;to be&rdquo; (am, is, are) verbs to describe qualities and characteristics like age, color, place, identity, or a state.<br>Examples: <em>I&rsquo;m 13.</em> <em>He is tall.</em> <em>They are at school.</em>'
            },
            {
                subLetter: 'b',
                text: 'Do these characteristics refer to the past, present or future?',
                options: ['To present', 'To past', 'To future'],
                correct: 0
            },
            {
                subLetter: 'c',
                text: 'Do the &ldquo;to be&rdquo; verbs change their form according to the subjects (I, He, We)?',
                options: ['Yes', 'No'],
                correct: 0,
                explanation: 'In Present Simple &ldquo;to be&rdquo; verbs change according to the subjects.<br><table style="border-collapse:collapse;margin:6px 0;font-size:0.93rem;"><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">I</td><td>am a student</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">You</td><td>are a student</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">He</td><td>is a student</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">She</td><td>is a student</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">It</td><td>is a book</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">They</td><td>are pencils</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">We</td><td>are teachers</td></tr></table>'
            },
            // 2)
            {
                type: 'intro', num: 2,
                text: 'Reorder the words to make sentences:'
            },
            {
                type: 'drag', subLetter: 'a',
                text: 'Put the words in the correct order:',
                words: ['am', 'I', 'Yu.'],
                correct: 'I am Yu.'
            },
            {
                type: 'drag', subLetter: 'b',
                text: 'Put the words in the correct order:',
                words: ['deaf.', 'You', 'are'],
                correct: 'You are deaf.'
            },
            {
                type: 'drag', subLetter: 'c',
                text: 'Put the words in the correct order:',
                words: ['is', 'blind.', 'Yu'],
                correct: 'Yu is blind.'
            },
            // 3)
            {
                subLetter: '3',
                text: 'Do we use verbs after &ldquo;am / is / are&rdquo; in Present Simple?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'We do not use verbs after to be verbs in Present Simple. We use nouns, adjectives and other words to describe qualities and characteristics like age, color, place, identity, or a state.<br>Examples: <em>I am fine.</em> <em>You are not tired.</em> <em>We are kids.</em>'
            },
            // 4)
            {
                subLetter: '4',
                text: 'Choose the correct sentence:',
                options: ['Yu is blind', 'You isn&rsquo;t see'],
                correct: 0
            },
            // 5)
            {
                subLetter: '5',
                text: 'Choose the correct sentence:',
                options: ['Mi is deaf', 'Mi isn&rsquo;t hear'],
                correct: 0
            },
            // 6)
            {
                type: 'intro', num: 6,
                text: 'Now look at negative sentences:<br><strong>I am not blind. &nbsp; Yu is not deaf.</strong>'
            },
            {
                subLetter: 'a',
                text: '&ldquo;Not&rdquo; in the negative sentences stays&hellip;',
                options: ['Before the to be verb (not am, not is, not are)', 'After the to be verb (am not, is not, are not)'],
                correct: 1,
                explanation: '&ldquo;Not&rdquo; stays after the to be verbs (am, is, are) in negative sentences.<br>Examples: <em>You are <strong>NOT</strong> a doctor.</em> <em>She is <strong>NOT</strong> thirsty.</em>'
            },
            {
                type: 'drag', subLetter: 'b',
                text: 'Put the words in the correct order:',
                words: ['not', 'Yu', 'deaf.', 'is'],
                correct: 'Yu is not deaf.'
            },
            {
                type: 'drag', subLetter: 'c',
                text: 'Put the words in the correct order:',
                words: ['Mi', 'not', 'is', 'blind.'],
                correct: 'Mi is not blind.'
            },
            // 7)
            {
                type: 'intro', num: 7,
                text: 'Look at the dialogue:<br><strong>&ndash; Are you deaf?<br>&ndash; No, I am blind.</strong>'
            },
            {
                type: 'fill', subLetter: 'a',
                text: 'What word starts the question? Fill in the blank:',
                answer: 'Are',
                placeholder: 'type here...',
                explanation: 'To make interrogative sentences with to be verbs we start the questions with &ldquo;Am / Is / Are&rdquo;.<br>Example: <strong>ARE</strong> you deaf? &nbsp; What <strong>IS</strong> your name?'
            },
            {
                subLetter: 'b',
                text: 'Where is the subject in the question?',
                options: ['Before auxiliary verb', 'After auxiliary verb'],
                correct: 1
            },
            // 8)
            {
                type: 'intro', num: 8,
                text: 'Put the words in the correct order:'
            },
            {
                type: 'drag', subLetter: 'a',
                text: 'Put the words in the correct order:',
                words: ['you', 'Are', 'blind?'],
                correct: 'Are you blind?',
                explanation: 'The word order for interrogatives with to be verbs is <strong>ASI</strong> = Auxiliary verb + Subject + quality words?'
            },
            {
                type: 'drag', subLetter: 'b',
                text: 'Put the words in the correct order:',
                words: ['Is', 'deaf?', 'he'],
                correct: 'Is he deaf?',
                explanation: 'The word order for interrogatives with to be verbs is <strong>ASI</strong> = Auxiliary verb + Subject + quality words?'
            }
        ],
        grammarBank4: {
            blocks: [
                {
                    intro: 'In English, the verbs <strong>to be</strong> are used to describe a person, thing, or state. Verbs to be change according to subjects.<br><strong>am</strong> &mdash; &ldquo;I&rdquo;<br><strong>is</strong> &mdash; 3rd person singular<br><strong>are</strong> &mdash; two or more people and &ldquo;you&rdquo;',
                    table: [
                        ['I', 'am a student'],
                        ['You', 'are a student'],
                        ['He', 'is a student'],
                        ['She', 'is a student'],
                        ['It', 'is a book'],
                        ['They', 'are pencils'],
                        ['We', 'are teachers']
                    ],
                    examples: [
                        'I <strong>am</strong> a student.',
                        'He <strong>is</strong> a polyglot.',
                        'They <strong>are</strong> nice people.'
                    ]
                },
                {
                    intro: 'We make <strong>negative</strong> sentences by adding <strong>not</strong> to &ldquo;am, is, are&rdquo;.<br>Contractions: &nbsp;<strong>is not = isn&rsquo;t</strong> &nbsp;&nbsp; <strong>are not = aren&rsquo;t</strong>',
                    examples: [
                        'I <strong>am not</strong> a student.',
                        'He <strong>isn&rsquo;t</strong> a polyglot.',
                        'They <strong>aren&rsquo;t</strong> nice people.'
                    ]
                },
                {
                    intro: 'Questions start with to be verbs <strong>&ldquo;Am, Is, Are&rdquo;</strong>.',
                    examples: [
                        '<strong>Am</strong> I a student?',
                        '<strong>Is</strong> he a polyglot?',
                        '<strong>Are</strong> they nice people?'
                    ]
                }
            ]
        },
        videoQuiz4b: [
            { type: 'intro', text: 'Choose the correct option:' },
            { text: 'I ______ Yu.', options: ['is', 'are', 'am'], correct: 2, wrongOnly: true, explanation: 'With <strong>I</strong> we use <strong>am</strong>.' },
            { text: 'He ______ Mi.', options: ['is', 'am', 'are'], correct: 0, wrongOnly: true, explanation: 'With <strong>He</strong> (3rd person singular) we use <strong>is</strong>.' },
            { text: 'Yu _______ blind.', options: ['is', 'am', 'are'], correct: 0, wrongOnly: true, explanation: 'Yu = he/she (3rd person singular) → <strong>is</strong>.' },
            { text: 'Yu _______ deaf.', options: ['am not', 'is not', 'are not'], correct: 1, wrongOnly: true, explanation: 'Yu = he/she (3rd person singular) → <strong>is not</strong>.' },
            { text: 'I _______ Mi.', options: ['is not', 'are not', 'am not'], correct: 2, wrongOnly: true, explanation: 'With <strong>I</strong> we use <strong>am not</strong>.' },
            { text: 'I _____ Yu, he ______ Mi.', options: ['am, is', 'is, is', 'are, is'], correct: 0, wrongOnly: true, explanation: 'I → <strong>am</strong>  |  He → <strong>is</strong>.' },
            { text: 'Who ______ you?', options: ['is', 'are', 'am'], correct: 1, wrongOnly: true, explanation: 'With <strong>you</strong> we use <strong>are</strong>.' },
            { text: 'What _______ your name?', options: ['is', 'am', 'are'], correct: 0, wrongOnly: true, explanation: '"Your name" = it (3rd person singular) → <strong>is</strong>.' },
            { text: 'Who ________ deaf?', options: ['are', 'am', 'is'], correct: 2, wrongOnly: true, explanation: 'Asking about one person → <strong>is</strong>.' },
            { text: '________ you Yu?', options: ['Are', 'Am', 'Is'], correct: 0, wrongOnly: true, explanation: 'With <strong>you</strong> questions start with <strong>Are</strong>.' }
        ],
        taskDescription: 'Посмотрите на примеры из видео и ответьте на вопросы — они помогут лучше понять Present Simple в живой речи.',
        structure: 'I/You/We/They + V | He/She/It + V+s',
        usage: [
            'Факты и общие истины',
            'Привычки и регулярные действия',
            'Профессия и способности',
            'Расписания и тарифы'
        ],
        rules: [
            { type: 'Утверждение', example: 'He works as a doctor.' },
            { type: 'Отрицание', example: 'She doesn\'t like coffee.' },
            { type: 'Вопрос', example: 'Do you understand?' }
        ],
        examples: [
            {
                source: 'Forrest Gump',
                dialogue: '"My mama always said life was like a box of chocolates."',
                translation: 'Моя мама всегда говорила, что жизнь - это как коробка конфет.'
            },
            {
                source: 'The Office',
                dialogue: '"I don\'t usually do this, but I like you."',
                translation: 'Я обычно так не делаю, но ты мне нравишься.'
            },
            {
                source: 'Friends',
                dialogue: '"We don\'t have a lot of friends in common."',
                translation: 'У нас нет много общих друзей.'
            }
        ],
        taskExercises: [
            {
                question: 'В видео персонаж говорит о своей ежедневной рутине. Какое время правильно описывает привычные действия?',
                options: [
                    'Present Continuous — I am eating breakfast',
                    'Present Simple — I eat breakfast every morning',
                    'Past Simple — I ate breakfast',
                    'Future Simple — I will eat breakfast'
                ],
                correct: 1,
                explanation: 'Present Simple используется для регулярных, привычных действий: "I eat breakfast every morning."'
            },
            {
                question: 'В видео прозвучала фраза "She works at a hospital." Почему глагол "works", а не "work"?',
                options: [
                    'Потому что это прошедшее время',
                    'Потому что "she" — третье лицо ед. числа, добавляется -s',
                    'Потому что это вопрос',
                    'Потому что это отрицание'
                ],
                correct: 1,
                explanation: 'С подлежащими he / she / it в Present Simple глагол получает окончание -s или -es.'
            },
            {
                question: 'Какое слово из видео является маркером (сигнальным словом) Present Simple?',
                options: [
                    'now — сейчас',
                    'yesterday — вчера',
                    'always — всегда',
                    'tomorrow — завтра'
                ],
                correct: 2,
                explanation: 'Слова always, usually, often, every day — типичные маркеры Present Simple, обозначающие регулярность.'
            },
            {
                question: 'В видео прозвучало отрицание. Выберите правильный вариант отрицания Present Simple для "he":',
                options: [
                    'He not like coffee.',
                    'He doesn\'t likes coffee.',
                    'He doesn\'t like coffee.',
                    'He don\'t like coffee.'
                ],
                correct: 2,
                explanation: 'Для he/she/it отрицание строится: does not (doesn\'t) + базовая форма глагола без -s.'
            },
            {
                question: 'В видео задаётся вопрос о работе. Какой вспомогательный глагол нужен в вопросе с "she"?',
                options: [
                    'Do — "Do she work here?"',
                    'Does — "Does she work here?"',
                    'Is — "Is she work here?"',
                    'Did — "Did she work here?"'
                ],
                correct: 1,
                explanation: 'В вопросе с he/she/it используется вспомогательный глагол "does": Does she work here?'
            }
        ],
        exercises: [
            {
                question: 'Выберите правильное предложение:',
                options: [
                    'He go to school every day.',
                    'He goes to school every day.',
                    'He going to school every day.',
                    'He is go to school every day.'
                ],
                correct: 1,
                explanation: 'С подлежащим "He" (третье лицо единственное число) глагол приобретает окончание -s: "goes"',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Дополните предложение: "I __ breakfast at 7 AM."',
                options: [
                    'am eating',
                    'eat',
                    'eats',
                    'am eat'
                ],
                correct: 1,
                explanation: 'Present Simple используется для описания регулярного действия. "I" не требует окончания -s.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Какое предложение верно?',
                options: [
                    'Does she work here?',
                    'Do she work here?',
                    'She does work here?',
                    'Work she does here?'
                ],
                correct: 0,
                explanation: 'С "she" (третье лицо) используется "does" для вопроса в Present Simple.',
                difficulty: 'light',
                sentenceForm: 'question'
            },
            {
                question: 'Завершите предложение: "She __ like coffee."',
                options: [
                    'don\'t',
                    'doesn\'t',
                    'do not like',
                    'not like'
                ],
                correct: 1,
                explanation: 'With "she" (third person singular), use "doesn\'t" or "does not" for negation.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Выберите правильный вариант: "They __ in the park on Sundays."',
                options: [
                    'play',
                    'plays',
                    'is playing',
                    'are play'
                ],
                correct: 0,
                explanation: 'С "they" (множественное число) глагол не получает окончания -s: "play"',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Какой вспомогательный глагол используется? "__ you understand English?"',
                options: [
                    'Does',
                    'Do',
                    'Are',
                    'Is'
                ],
                correct: 1,
                explanation: 'С "you" используется "Do" для вопроса в Present Simple.',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Дополните в отрицание: "He __ watch movies every night."',
                options: [
                    'not watches',
                    'doesn\'t watch',
                    'do not watch',
                    'not watch'
                ],
                correct: 1,
                explanation: 'Для отрицания с третьим лицом: doesn\'t (does not) + базовая форма глагола.',
                difficulty: 'medium',
                sentenceForm: 'negative'
            },
            {
                question: 'Выберите грамотное предложение:',
                options: [
                    'We doesn\'t go to school on Sundays.',
                    'We don\'t go to school on Sundays.',
                    'We not go to school on Sundays.',
                    'We aren\'t go to school on Sundays.'
                ],
                correct: 1,
                explanation: 'С "we" используется "don\'t" (do not), не "doesn\'t".',
                difficulty: 'medium',
                sentenceForm: 'negative'
            },
            {
                question: 'Какое утверждение правильно?',
                options: [
                    'She write letters to her friend.',
                    'She writes letters to her friend.',
                    'She is writing letters to her friend.',
                    'She does writes letters to her friend.'
                ],
                correct: 1,
                explanation: 'С "she" (третье лицо единственное) глагол приобретает -s: "writes".',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Продолжите вопрос: "Where __ they __ on weekends?"',
                options: [
                    'do, go',
                    'does, go',
                    'do, goes',
                    'does, goes'
                ],
                correct: 0,
                explanation: 'С "they" = Do + базовая форма глагола "go".',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Какой вариант содержит ошибку в грамматике?',
                options: [
                    'The team play football twice a week.',
                    'Does your brother like pizza?',
                    'I don\'t understand the lesson.',
                    'She works as a doctor in the hospital.'
                ],
                correct: 0,
                explanation: '"Team" может быть единственным или множественным. В американском английском "team plays" (единственное).',
                difficulty: 'hard',
                sentenceForm: 'positive'
            },
            {
                question: 'Составьте правильное отрицательное предложение:',
                options: [
                    'They doesn\'t like swimming in winter.',
                    'They don\'t likes swimming in winter.',
                    'They don\'t like swimming in winter.',
                    'They not like swimming in winter.'
                ],
                correct: 2,
                explanation: 'С "they" используется "don\'t like", а не "doesn\'t like".',
                difficulty: 'hard',
                sentenceForm: 'negative'
            },
            {
                question: 'Выберите правильное соответствие подлежащего и глагола:',
                options: [
                    'He don\'t play chess.',
                    'She don\'t like tea.',
                    'I doesn\'t understand.',
                    'You don\'t want to come.'
                ],
                correct: 3,
                explanation: '"You" требует "don\'t", не "doesn\'t". "I" требует "don\'t", не "doesn\'t".',
                difficulty: 'hard',
                sentenceForm: 'negative'
            },
            {
                question: 'Какое предложение содержит правильный порядок слов в вопросе?',
                options: [
                    'What time does start the class?',
                    'What time does the class start?',
                    'What time the class does start?',
                    'What time starts the class?'
                ],
                correct: 1,
                explanation: 'Порядок слов в вопросе с вспомогательным глаголом: Does + подлежащее + глагол.',
                difficulty: 'hard',
                sentenceForm: 'question'
            },
            {
                question: 'Дополните: "Why __ she __ to work by bus?"',
                options: [
                    'do, goes',
                    'does, goes',
                    'does, go',
                    'do, go'
                ],
                correct: 2,
                explanation: 'С "she" в вопросе: Does + she + базовая форма "go".',
                difficulty: 'hard',
                sentenceForm: 'question'
            }
        ]
    },

    'present-continuous': {
        title: 'Present Continuous',
        russian: 'Настоящее длительное',
        videoFile: 'present cont 1.mp4',
        videoFile2: 'present cont 2.1.mp4',
        videoFile3: 'present cont 3.1.mp4',
        videoFile4: 'present cont video 3.mp4',
        videoQuiz1: [
            {
                text: 'Does Victor go for the front door every day or is he doing it at this exact moment?',
                options: ['Every day', 'At this moment'],
                correct: 1,
                explanation: 'Victor is currently in the process of going to the front door, not something he does regularly.<br>Example: <em>I am studying English right now.</em>'
            },
            {
                text: 'Is the action complete, or is it in progress?',
                options: ['Yes, he reached the front door', 'No, he is still walking'],
                correct: 1,
                explanation: 'The action is still in progress because Present Continuous shows something happening right now, so Victor has not reached the front door yet.'
            },
            {
                text: 'Is this a permanent state (like his job) or a temporary action happening right now?',
                options: ['Temporary action', 'Permanent state'],
                correct: 0,
                explanation: 'Present Continuous describes something happening right now and not permanent, so it is a temporary action, not a fixed state like a job or habit.'
            },
            {
                text: 'Look at the word &ldquo;is&rdquo; in the example: <em>Victor is going home.</em> Is it a main verb or a &ldquo;helping&rdquo; (auxiliary) verb?',
                options: ['Main verb', 'Auxiliary verb'],
                correct: 1,
                explanation: '&ldquo;is&rdquo; is an auxiliary verb because it helps form the Present Continuous tense with the main verb &ldquo;going&rdquo;.'
            },
            {
                text: 'If the subject is &ldquo;I&rdquo;, what auxiliary verb do we use?',
                options: ['am', 'is', 'are'],
                correct: 0,
                explanation: 'Example: <em>I am doing my homework at the moment.</em>'
            },
            {
                text: 'If the subject is &ldquo;They&rdquo;, what auxiliary verb do we use?',
                options: ['am', 'is', 'are'],
                correct: 2,
                explanation: 'Example: <em>They are playing football right now.</em><br>In the Present Continuous the auxiliary verbs change according to the subject.<br><table style="border-collapse:collapse;margin:6px 0;font-size:0.93rem;"><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">I</td><td>am</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">You</td><td>are</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">He</td><td>is</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">She</td><td>is</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">It</td><td>is</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">They</td><td>are</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">We</td><td>are</td></tr></table>'
            },
            {
                type: 'fill',
                text: 'Look at the end of the verbs &ldquo;leaving&rdquo; and &ldquo;going&rdquo;. What is the ending of these verbs? (3 letters)',
                answer: 'ing',
                placeholder: 'type...',
                explanation: 'We add &ldquo;-ing&rdquo; to the verbs in the Present Continuous.<br><em>I am leav<strong>ING</strong> for India.</em> <em>He is stay<strong>ING</strong> in the US.</em>'
            },
            {
                type: 'drag',
                text: 'Based on the examples, what is the sentence structure for Present Continuous?<br><em>I am listening. &nbsp; Victor is leaving. &nbsp; They are running after Victor.</em><br>Put in correct order:',
                words: ['verb+ing', 'Subject', 'am/is/are'],
                correct: 'Subject am/is/are verb+ing',
                explanation: 'The word order in Present Continuous is <strong>SAV</strong> (Subject + Auxiliary verb + Verb+ing)'
            },
            {
                type: 'drag',
                text: 'Put the words in correct order:',
                words: ['is', 'Victor', 'going', 'for the front door.'],
                correct: 'Victor is going for the front door.'
            },
            {
                type: 'drag',
                text: 'Put the words in correct order:',
                words: ['People', 'running', 'after Victor.', 'are'],
                correct: 'People are running after Victor.'
            }
        ],
        grammarBank1: {
            title: 'Present Continuous',
            intro: 'We use the present continuous for things that are <strong>happening now / at the moment</strong>.<br><br>It is <strong>raining</strong> outside.<br><br>&ldquo;At the moment&rdquo; can mean <em>around now</em>. Ex: I am reading a good book. (not exactly right now)',
            structure: 'The word order in Present Continuous is <strong>SAV</strong> = Subject&nbsp;+&nbsp;Auxiliary verb&nbsp;+&nbsp;Verb+ing',
            examples: [
                'I <strong>am reading</strong> a book.',
                'You <strong>are drawing</strong> a picture.',
                'He <strong>is playing</strong> football.',
                '<table style="border-collapse:collapse;margin:6px 0;font-size:0.93rem;"><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">I</td><td>am dancing</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">You</td><td>are dancing</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">He</td><td>is dancing</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">She</td><td>is dancing</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">It</td><td>is dancing</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">They</td><td>are dancing</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">We</td><td>are dancing</td></tr></table>'
            ]
        },
        videoQuiz1b: [
            { type: 'intro', text: '<strong>Choose the correct option:</strong>' },
            {
                text: 'In the video, the three people ______ in a store.',
                options: ['are standing', 'is standing', 'are stand'],
                correct: 0,
                wrongOnly: true,
                explanation: '"The three people" = they (plural) &rarr; <strong>are standing</strong>. Use <em>are</em> with plural subjects; <em>is</em> is for he/she/it only; the verb must have <em>-ing</em>.'
            },
            {
                text: 'The man in the mask ______ a sleep mask on.',
                options: ['is putting', 'are putting', 'is put'],
                correct: 0,
                wrongOnly: true,
                explanation: '"The man" = he (3rd person singular) &rarr; <strong>is putting</strong>. The auxiliary must be <em>is</em>, and the verb needs <em>-ing</em>.'
            },
            {
                text: 'The man and the woman ______ standing.',
                options: ['is', 'are', 'am'],
                correct: 1,
                wrongOnly: true,
                explanation: '"The man and the woman" = they (plural) &rarr; <strong>are</strong>. <em>Is</em> is for he/she/it; <em>am</em> is only for I.'
            },
            {
                text: 'The man in the mask ______ a brown jacket.',
                options: ['is wearing', 'are wearing', 'am wearing'],
                correct: 0,
                wrongOnly: true,
                explanation: '"The man" = he (3rd person singular) &rarr; <strong>is wearing</strong>. Use <em>is</em> with he/she/it.'
            },
            {
                text: 'Monica ______ her hands to explain something.',
                options: ['is using', 'are using', 'is use'],
                correct: 0,
                wrongOnly: true,
                explanation: '"Monica" = she (3rd person singular) &rarr; <strong>is using</strong>. The verb must have <em>-ing</em>; <em>is use</em> is not a valid form.'
            },
            {
                text: 'Look at the other people in the store. They ______ around.',
                options: ['is walking', 'are walking', 'are walk'],
                correct: 1,
                wrongOnly: true,
                explanation: '"They" (plural) &rarr; <strong>are walking</strong>. <em>Is</em> is incorrect with <em>they</em>; the verb always needs <em>-ing</em> in Present Continuous.'
            },
            {
                text: 'The bald man ______ a small black device in his hand.',
                options: ['is hold', 'is holding', 'are holding'],
                correct: 1,
                wrongOnly: true,
                explanation: '"The bald man" = he (3rd person singular) &rarr; <strong>is holding</strong>. <em>Is hold</em> is missing <em>-ing</em>; <em>are</em> is incorrect for a singular subject.'
            },
            {
                text: 'Monica and the bald man ______ at the man in the mask.',
                options: ['is looking', 'are looking', 'am looking'],
                correct: 1,
                wrongOnly: true,
                explanation: '"Monica and the bald man" = they (plural) &rarr; <strong>are looking</strong>. <em>Is</em> and <em>am</em> are for singular subjects only.'
            },
            {
                text: 'The man with the mask ______ his hands behind his head.',
                options: ['is put', 'are putting', 'is putting'],
                correct: 2,
                wrongOnly: true,
                explanation: '"The man" = he (3rd person singular) &rarr; <strong>is putting</strong>. <em>Is put</em> is missing <em>-ing</em>; <em>are</em> is incorrect for a singular subject.'
            },
            {
                text: 'What is happening in the store? People ______ in it.',
                options: ['is shopping', 'are shop', 'are shopping'],
                correct: 2,
                wrongOnly: true,
                explanation: '"People" = they (plural) &rarr; <strong>are shopping</strong>. <em>Is</em> is for singular; the verb must always end in <em>-ing</em> in Present Continuous.'
            }
        ],
        videoQuiz2: [
            {
                type: 'intro', num: 1,
                text: 'Look at the examples: &ldquo;She is not calling.&rdquo; &ldquo;Ross&rsquo;s phone is not working.&rdquo;'
            },
            {
                subLetter: 'a',
                text: 'Are these sentences negative or positive?',
                options: ['negative', 'positive'],
                correct: 0
            },
            {
                type: 'fill', subLetter: 'b',
                text: 'What extra word do we add to make the sentence negative?',
                answer: 'not',
                placeholder: 'type...'
            },
            {
                subLetter: 'c',
                text: 'Where do we put &ldquo;not&rdquo; in the sentence to make negative sentences?',
                options: ['before the auxiliary verb (not am, not is, not are)', 'after the auxiliary verb (am not, is not, are not)'],
                correct: 1,
                explanation: '&ldquo;Not&rdquo; comes after the auxiliary verb in Present Continuous negativity: <em>am not</em>, <em>is not</em>, <em>are not</em>.'
            },
            {
                type: 'intro', num: 2,
                text: 'Put the words in correct order:'
            },
            {
                type: 'drag', subLetter: 'a',
                text: 'Put the words in correct order:',
                words: ['isn\'t', 'sleeping.', 'Rachel'],
                correct: 'Rachel isn\'t sleeping.'
            },
            {
                type: 'drag', subLetter: 'b',
                text: 'Put the words in correct order:',
                words: ['Ross', 'calling', 'isn\'t', 'her.'],
                correct: 'Ross isn\'t calling her.'
            },
            {
                type: 'intro', num: 3,
                text: 'Look at the examples: &ldquo;Why aren&rsquo;t you calling?&rdquo; &ldquo;Is the phone working?&rdquo; &ldquo;Am I waiting for her call?&rdquo;'
            },
            {
                subLetter: 'a',
                text: 'What words start the question?',
                options: ['Am, Is, Are', 'Do, Does'],
                correct: 0
            },
            {
                subLetter: 'b',
                text: 'Where is the subject in the question?',
                options: ['before auxiliary verbs (am, is, are)', 'after auxiliary verbs (am, is, are)'],
                correct: 1
            },
            {
                type: 'intro', num: 4,
                text: 'Put the words in correct order:'
            },
            {
                type: 'drag', subLetter: 'a',
                text: 'Put the words in correct order:',
                words: ['they', 'Are', 'taking', 'a picture?'],
                correct: 'Are they taking a picture?'
            },
            {
                type: 'drag', subLetter: 'b',
                text: 'Put the words in correct order:',
                words: ['Why', 'she', 'calling?', 'isn\'t'],
                correct: 'Why isn\'t she calling?'
            }
        ],
        grammarBank2: {
            blocks: [
                {
                    intro: '<strong>NEGATIVE</strong><br>Word order: <strong>S + am not / isn&rsquo;t / aren&rsquo;t + V+ing</strong>',
                    table: [
                        ['I', 'am not'],
                        ['He / She / It', 'isn&rsquo;t &nbsp;<em>(= is not)</em>'],
                        ['You / We / They', 'aren&rsquo;t &nbsp;<em>(= are not)</em>']
                    ],
                    examples: [
                        'I <strong>am not</strong> reading a classic book.',
                        'You <strong>aren&rsquo;t</strong> studying biology.',
                        'She <strong>isn&rsquo;t</strong> drawing a picture.'
                    ]
                },
                {
                    intro: '<strong>INTERROGATIVE</strong><br>Word order: <strong>Am / Is / Are + S + V+ing?</strong>',
                    table: [
                        ['I', 'Am I'],
                        ['He / She / It', 'Is he / she / it'],
                        ['You / We / They', 'Are you / we / they']
                    ],
                    examples: [
                        '<strong>Am</strong> I reading a classic book?',
                        '<strong>Are</strong> you studying biology?',
                        '<strong>Is</strong> she drawing a picture?'
                    ]
                }
            ]
        },
        videoQuiz2b: [
            { type: 'intro', text: '<strong>Negative sentences</strong> — Choose the correct option:' },
            {
                text: 'Chandler ______ his boss right now; he is waiting for a girl to call.',
                options: ['is not calling', 'am not calling', 'are not calling'],
                correct: 0, wrongOnly: true,
                explanation: 'Chandler = he (3rd person singular) &rarr; <strong>is not calling</strong>.'
            },
            {
                text: 'The girl ______ Chandler&rsquo;s phone calls yet.',
                options: ['are not returning', 'is not returning', 'not returning'],
                correct: 1, wrongOnly: true,
                explanation: '"The girl" = she (3rd person singular) &rarr; <strong>is not returning</strong>. "not returning" alone is missing the auxiliary verb.'
            },
            {
                text: 'The friends ______ dinner in this scene; they are just hanging out.',
                options: ['are not eating', 'is not eating', 'am not eating'],
                correct: 0, wrongOnly: true,
                explanation: '"The friends" = they (plural) &rarr; <strong>are not eating</strong>.'
            },
            {
                text: 'Monica ______ the board game with the others; she has a magazine.',
                options: ['are not playing', 'am not playing', 'is not playing'],
                correct: 2, wrongOnly: true,
                explanation: '"Monica" = she (3rd person singular) &rarr; <strong>is not playing</strong>.'
            },
            {
                text: 'Joey ______ a jacket inside the apartment; he has a white sweater on.',
                options: ['is not wearing', 'are not wearing', 'not wearing'],
                correct: 0, wrongOnly: true,
                explanation: '"Joey" = he (3rd person singular) &rarr; <strong>is not wearing</strong>. "not wearing" is missing the auxiliary verb.'
            },
            {
                text: 'Phoebe ______ at Chandler; she is speaking calmly to him.',
                options: ['are not shouting', 'is not shouting', 'am not shouting'],
                correct: 1, wrongOnly: true,
                explanation: '"Phoebe" = she (3rd person singular) &rarr; <strong>is not shouting</strong>.'
            },
            {
                text: 'They ______ television in the background.',
                options: ['is not watching', 'am not watching', 'are not watching'],
                correct: 2, wrongOnly: true,
                explanation: '"They" (plural) &rarr; <strong>are not watching</strong>.'
            },
            {
                text: 'Chandler ______ because he is anxious about the phone call.',
                options: ['are not smiling', 'is not smiling', 'am not smiling'],
                correct: 1, wrongOnly: true,
                explanation: '"Chandler" = he (3rd person singular) &rarr; <strong>is not smiling</strong>.'
            },
            {
                text: 'Ross ______ in this specific clip; he is just listening.',
                options: ['are not talking', 'is not talking', 'am not talking'],
                correct: 1, wrongOnly: true,
                explanation: '"Ross" = he (3rd person singular) &rarr; <strong>is not talking</strong>.'
            },
            {
                text: 'The phone ______ with a call from the girl.',
                options: ['is not ringing', 'are not ringing', 'am not ringing'],
                correct: 0, wrongOnly: true,
                explanation: '"The phone" = it (3rd person singular) &rarr; <strong>is not ringing</strong>.'
            },
            { type: 'intro', text: '<strong>Interrogative sentences</strong> — Choose the correct option:' },
            {
                text: '______ Chandler ______ a very large cell phone?',
                options: ['Are / holding', 'Is / holding', 'Is / hold'],
                correct: 1, wrongOnly: true,
                explanation: '"Chandler" = he (3rd person singular) &rarr; <strong>Is</strong> + holding (-ing form).'
            },
            {
                text: '______ the friends ______ a board game?',
                options: ['Is / playing', 'Are / playing', 'Are / play'],
                correct: 1, wrongOnly: true,
                explanation: '"The friends" = they (plural) &rarr; <strong>Are</strong> + playing (-ing form).'
            },
            {
                text: '______ Monica ______ Chandler advice about the phone?',
                options: ['Is / giving', 'Are / giving', 'Is / give'],
                correct: 0, wrongOnly: true,
                explanation: '"Monica" = she (3rd person singular) &rarr; <strong>Is</strong> + giving (-ing form).'
            },
            {
                text: '______ they ______ in the living room?',
                options: ['Is / sitting', 'Are / sitting', 'Are / sit'],
                correct: 1, wrongOnly: true,
                explanation: '"They" (plural) &rarr; <strong>Are</strong> + sitting (-ing form).'
            },
            {
                text: '______ Chandler ______ about his date?',
                options: ['Are / worrying', 'Is / worrying', 'Am / worrying'],
                correct: 1, wrongOnly: true,
                explanation: '"Chandler" = he (3rd person singular) &rarr; <strong>Is</strong> + worrying (-ing form).'
            },
            {
                text: '______ Phoebe ______ her finger while she speaks?',
                options: ['Is / pointing', 'Are / pointing', 'Is / point'],
                correct: 0, wrongOnly: true,
                explanation: '"Phoebe" = she (3rd person singular) &rarr; <strong>Is</strong> + pointing (-ing form).'
            },
            {
                text: '______ Joey and Ross ______ to Chandler&rsquo;s problem?',
                options: ['Is / listening', 'Are / listening', 'Are / listen'],
                correct: 1, wrongOnly: true,
                explanation: '"Joey and Ross" = they (plural) &rarr; <strong>Are</strong> + listening (-ing form).'
            },
            {
                text: '______ the phone ______ correctly?',
                options: ['Are / working', 'Is / working', 'Is / work'],
                correct: 1, wrongOnly: true,
                explanation: '"The phone" = it (3rd person singular) &rarr; <strong>Is</strong> + working (-ing form).'
            },
            {
                text: '______ Chandler ______ back and forth in the kitchen?',
                options: ['Is / pacing', 'Are / pacing', 'Am / pacing'],
                correct: 0, wrongOnly: true,
                explanation: '"Chandler" = he (3rd person singular) &rarr; <strong>Is</strong> + pacing (-ing form).'
            },
            {
                text: '______ they ______ a conversation about answering machines?',
                options: ['Is / having', 'Are / having', 'Are / have'],
                correct: 1, wrongOnly: true,
                explanation: '"They" (plural) &rarr; <strong>Are</strong> + having (-ing form).'
            }
        ],
        videoQuiz3: [
            {
                text: 'Are her parents taking her brother to see his new college right now?',
                options: ['yes', 'no'],
                correct: 1,
                explanation: 'The parents are not heading there at this exact moment — this is a <strong>future arrangement</strong>: a fixed plan already organized for this weekend.'
            },
            {
                text: 'Is this happening in the past, the present, or the future?',
                options: ['past', 'present', 'future'],
                correct: 2,
                explanation: 'This sentence uses Present Continuous to describe a <strong>future arrangement</strong> — a fixed plan that has already been organized and confirmed.'
            },
            {
                text: 'Are the parents going to the college randomly or is it a fixed arrangement?',
                options: ['random', 'a fixed arrangement'],
                correct: 1,
                explanation: 'It is a <strong>fixed arrangement</strong>. Present Continuous used for the future always refers to plans that are already <em>organized and confirmed</em> — never spontaneous.'
            }
        ],
        grammarBank3: {
            blocks: [
                {
                    intro: '<strong>FUTURE ARRANGEMENTS</strong><br>We also use Present Continuous to talk about fixed plans that are already organized, scheduled, or confirmed with at least one other person.',
                    table: [],
                    examples: [
                        'I&rsquo;m flying to New York tomorrow. <em>(I have the ticket.)</em>',
                        'You are seeing the dentist at 6:00. <em>(the appointment is made.)</em>',
                        'We&rsquo;re having a party on Saturday. <em>(we invited the guests.)</em>'
                    ]
                }
            ]
        },
        videoQuiz3b: [
            { type: 'intro', text: '<strong>Choose the correct option:</strong>' },
            {
                text: 'What are your parents doing this weekend? The girl wants to know&hellip;',
                options: ['What they do every weekend.', 'Their specific, ready plan for this Saturday and Sunday.', 'What they are doing right now in this video.'],
                correct: 1, wrongOnly: true,
                explanation: 'The question asks about a <strong>specific future plan</strong> — what is organized for this weekend.'
            },
            {
                text: 'When the man says &ldquo;They are taking my brother to a college station&rdquo;, he means:',
                options: ['They are driving to the station right now.', 'They go there to see him every week.', 'This trip is already a fixed plan for this weekend.'],
                correct: 2, wrongOnly: true,
                explanation: 'Present Continuous here describes a <strong>fixed future arrangement</strong> — not an action happening at this moment.'
            },
            {
                text: '&ldquo;They are visiting the school&rdquo; is a FUTURE PLAN if:',
                options: ['It is an organized part of their trip this weekend.', 'They are inside the school building now.', 'They like to visit different schools.'],
                correct: 0, wrongOnly: true,
                explanation: 'A future arrangement means the event is <strong>already organized</strong> — it is a confirmed part of their plan.'
            },
            {
                text: 'According to the video, when the man says &ldquo;We are looking at dorms&rdquo;, he means:',
                options: ['They are looking at pictures of dorms now.', 'They have a planned time to look at dorms during this trip.', 'He wants to look at dorms sometime in the future.'],
                correct: 1, wrongOnly: true,
                explanation: 'The phrase describes a <strong>planned activity within the trip</strong> — a fixed arrangement, not a vague wish.'
            },
            {
                text: 'How is &ldquo;They are getting him acquainted with the school&rdquo; used?',
                options: ['As a long activity that happens all year.', 'As a specific, planned activity for this weekend.', 'As a general fact about parents.'],
                correct: 1, wrongOnly: true,
                explanation: 'This is a <strong>specific, organized activity</strong> — part of the fixed plan for this weekend visit.'
            },
            {
                text: 'Which sentence below shows a fixed FUTURE plan?',
                options: ['&ldquo;Everything is decided. They are going to the college station this weekend.&rdquo;', '&ldquo;They are going to the college station to meet friends now.&rdquo;', '&ldquo;They may go to the college station.&rdquo;'],
                correct: 0, wrongOnly: true,
                explanation: 'Only the first sentence describes an event that is <strong>already decided and organized</strong> — the hallmark of a future arrangement in Present Continuous.'
            }
        ],
        videoQuiz4: [
            {
                text: 'In the video, does a young man usually live there?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'No — he does <strong>not</strong> usually live there. He is only staying there temporarily for a short period.'
            },
            {
                text: 'Does the man live at the house for a short time period?',
                options: ['Yes', 'No'],
                correct: 0,
                explanation: 'We use Present Continuous to talk about actions or situations that last for a <strong>certain time period</strong>. The man is staying there temporarily — not living there permanently.'
            },
            {
                type: 'intro',
                text: '<strong>Compare these two sentences:</strong><br><br>&nbsp;&nbsp;🔵 <strong>A:</strong> I live here.&nbsp;&nbsp;&nbsp;&nbsp;🟡 <strong>B:</strong> I am staying here for a few days.'
            },
            {
                text: 'In which sentence is the place a permanent home?',
                options: ['A', 'B'],
                correct: 0,
                explanation: '<strong>A: &ldquo;I live here&rdquo;</strong> uses Present Simple — this describes a <em>permanent</em> fact or state.'
            },
            {
                text: 'In which sentence is the place a temporary place for a vacation or a short time period?',
                options: ['A', 'B'],
                correct: 1,
                explanation: '<strong>B: &ldquo;I am staying here for a few days&rdquo;</strong> uses Present Continuous — a <em>temporary</em> situation with a defined short duration.'
            }
        ],
        grammarBank4: {
            blocks: [
                {
                    intro: '<strong>TEMPORARY SITUATIONS</strong><br>We also use Present Continuous with longer periods of time for temporary situations. It emphasizes that the action is temporary — not a routine or habit.',
                    table: [],
                    examples: [
                        'I am not driving her car this month, because I broke my leg.',
                        'He is staying at this house for a few days.'
                    ]
                }
            ]
        },
        videoQuiz4b: [
            { type: 'intro', text: '<strong>Choose the correct option:</strong>' },
            {
                text: 'Is the blond man living in the house forever?',
                options: ['Yes, he is living there forever.', 'No, he is only staying there for a few days.', 'No, he is moving out today.', 'Yes, he just bought the house.'],
                correct: 1, wrongOnly: true,
                explanation: 'The blond man is there <strong>temporarily</strong> — Present Continuous signals a short-term stay, not a permanent home.'
            },
            {
                text: 'What is the man in the cap asking about?',
                options: ['He is asking if the man is working here.', 'He is asking if the man is playing the piano.', 'He is asking if the man is living here.', 'He is asking if the man is selling the house.'],
                correct: 2, wrongOnly: true,
                explanation: 'The man in the cap is asking whether the blond man <strong>lives there</strong> — he is curious about his temporary presence.'
            },
            {
                text: 'Choose the correct sentence based on the blond man&rsquo;s response:',
                options: ['He isn&rsquo;t staying there for long.', 'He isn&rsquo;t visiting his parents.', 'He isn&rsquo;t playing the piano.', 'He isn&rsquo;t wearing a hat.'],
                correct: 0, wrongOnly: true,
                explanation: 'The blond man confirms he is only there temporarily — <strong>he isn&rsquo;t staying for long</strong>.'
            },
            {
                text: 'Why is the man in the cap hitting the piano?',
                options: ['He is practicing a song.', 'He is trying to wake someone up.', 'He is testing the sound.', 'He is showing off his skills.'],
                correct: 2, wrongOnly: true,
                explanation: 'He hits the piano to <strong>test the sound</strong> — he is checking whether it works properly.'
            },
            {
                text: 'Is the man in the cap being polite while he is speaking?',
                options: ['Yes, he is being very respectful.', 'No, he is shouting at the blond man.', 'Yes, he is offering the other man a drink.', 'No, he is acting a bit suspicious.'],
                correct: 3, wrongOnly: true,
                explanation: 'The man in the cap behaves in a <strong>suspicious</strong> way — he is not being straightforwardly polite.'
            }
        ],
        structure: 'am/is/are + V+ing',
        usage: [
            'Действие происходит в данный момент',
            'Временные ситуации',
            'Раздражающие привычки с "always"',
            'План на ближайшее будущее'
        ],
        rules: [
            { type: 'Утверждение', example: 'She is reading a book right now.' },
            { type: 'Отрицание', example: 'They are not watching TV.' },
            { type: 'Вопрос', example: 'Are you studying?' }
        ],
        examples: [
            {
                source: 'Friends',
                dialogue: '"I\'m getting married!"',
                translation: 'Я выхожу замуж!'
            },
            {
                source: 'Inception',
                dialogue: '"He\'s coming back to me."',
                translation: 'Он возвращается ко мне.'
            }
        ],
        exercises: [
            {
                question: 'Что происходит прямо сейчас?',
                options: [
                    'I watch television.',
                    'I\'m watching television.',
                    'I watches television.',
                    'I am watch television.'
                ],
                correct: 1,
                explanation: 'Present Continuous описывает действие в данный момент: am/is/are + глагол + ing',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильное отрицание:',
                options: [
                    'She not is working.',
                    'She is not working.',
                    'She don\'t working.',
                    'She isn\'t work.'
                ],
                correct: 1,
                explanation: 'Отрицание в Present Continuous: am/is/are + not + глагол + ing',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Правильное предложение в Present Continuous:',
                options: [
                    'He is studying French.',
                    'He studying French.',
                    'He study French.',
                    'He are studying French.'
                ],
                correct: 0,
                explanation: 'С "he" (третье лицо единственное) используется "is": is + studying.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите утвердительное предложение:',
                options: [
                    'They are not playing football.',
                    'We\'re cooking dinner right now.',
                    'I\'m not reading the book.',
                    'She isn\'t drinking coffee.'
                ],
                correct: 1,
                explanation: 'Это утвердительное предложение: We\'re cooking. Остальные - отрицательные.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Дополните: "The children __ playing in the yard."',
                options: [
                    'is',
                    'are',
                    'am',
                    'be'
                ],
                correct: 1,
                explanation: '"Children" (множественное число) требует "are".',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Какой вопрос грамматически верен?',
                options: [
                    'Are you listening?',
                    'You are listening?',
                    'Do you are listening?',
                    'Is you listening?'
                ],
                correct: 0,
                explanation: 'Вопрос в Present Continuous: Are + you + listening?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Выберите отрицательное предложение:',
                options: [
                    'He is buying a new car.',
                    'They are not staying at home.',
                    'I\'m writing a letter.',
                    'She is working now.'
                ],
                correct: 1,
                explanation: 'Это единственное отрицательное предложение: are not staying.',
                difficulty: 'medium',
                sentenceForm: 'negative'
            },
            {
                question: 'Дополните отрицание: "I __ wearing glasses."',
                options: [
                    'am not',
                    'is not',
                    'are not',
                    'not am'
                ],
                correct: 0,
                explanation: 'С "I" используется "am not" в Present Continuous.',
                difficulty: 'medium',
                sentenceForm: 'negative'
            },
            {
                question: 'Найдите ошибку в грамматике:',
                options: [
                    'She is reading a novel.',
                    'They are watching a film.',
                    'He are playing tennis.',
                    'I\'m eating breakfast.'
                ],
                correct: 2,
                explanation: '"He" требует "is", не "are": He is playing.',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Завершите вопрос: "What __ you __? Are you busy?"',
                options: [
                    'are, doing',
                    'is, doing',
                    'do, do',
                    'are, do'
                ],
                correct: 0,
                explanation: 'С "you": What are you doing?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Какое предложение верно выражает текущий процесс?',
                options: [
                    'Right now, she is studying mathematics.',
                    'Right now, she studies mathematics.',
                    'Right now, she will study mathematics.',
                    'Right now, she studied mathematics.'
                ],
                correct: 0,
                explanation: 'Present Continuous выражает действие в текущий момент: is studying.',
                difficulty: 'hard',
                sentenceForm: 'positive'
            },
            {
                question: 'Какое отрицание выражено неправильно?',
                options: [
                    'They are not coming to the party.',
                    'She isn\'t sleeping.',
                    'I\'m not listening to you.',
                    'We no are waiting for him.'
                ],
                correct: 3,
                explanation: 'Правильно: We are not waiting. Неправильно: We no are waiting.',
                difficulty: 'hard',
                sentenceForm: 'negative'
            },
            {
                question: 'Выберите правильный вопрос:',
                options: [
                    'Is they going to the cinema?',
                    'Are they going to the cinema?',
                    'Do they going to the cinema?',
                    'They are going to the cinema?'
                ],
                correct: 1,
                explanation: 'С "they": Are they going...?',
                difficulty: 'hard',
                sentenceForm: 'question'
            },
            {
                question: 'Дополните: "__ he __ his homework right now?"',
                options: [
                    'Do, do',
                    'Does, do',
                    'Is, doing',
                    'Are, doing'
                ],
                correct: 2,
                explanation: 'В Present Continuous вопрос: Is + he + doing?',
                difficulty: 'hard',
                sentenceForm: 'question'
            },
            {
                question: 'Найдите предложение с ошибкой:',
                options: [
                    'The students are building a project.',
                    'She is not feeling well today.',
                    'We are watching the movie and enjoying them.',
                    'I\'m staying at my friend\'s place this week.'
                ],
                correct: 2,
                explanation: '"Movie" (единственное число) требует "it", не "them".',
                difficulty: 'hard',
                sentenceForm: 'positive'
            },
            {
                question: 'Какой вопрос требует ответа "Yes, I am"?',
                options: [
                    'Were you sleeping?',
                    'Are you reading a book?',
                    'Did you go to the store?',
                    'Do you like pizza?'
                ],
                correct: 1,
                explanation: 'Present Continuous вопрос "Are you reading?" = "Yes, I am reading."',
                difficulty: 'hard',
                sentenceForm: 'question'
            }
        ]
    },

    'present-perfect': {
        title: 'Present Perfect',
        russian: 'Настоящее совершенное',
        structure: 'have/has + V3 (Past Participle)',
        videoFile: 'present perfect 1.1.mp4',
        videoFile2: 'present perfect 2 new.mp4',
        videoFile3: 'present perfect 3.1.mp4',
        videoQuiz1: [
            {
                type: 'intro', num: 1,
                text: 'Focus on Rachel\'s line: <em>&ldquo;I was with Josh for an hour today and he has not asked me out.&rdquo;</em>'
            },
            {
                subLetter: 'a',
                text: 'Is the &ldquo;today&rdquo; period over?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'No, it is still today — the period has not ended, which is why we use Present Perfect.'
            },
            {
                subLetter: 'b',
                text: 'Is it still possible for Josh to ask Rachel out today?',
                options: ['Yes', 'No'],
                correct: 0,
                explanation: 'Yes — because &ldquo;today&rdquo; is still ongoing. Present Perfect is used when the time period is not finished yet.'
            },
            {
                subLetter: 'c',
                text: 'Does Rachel care about <em>when</em> Josh did not ask her out, or the result right now?',
                options: ['When Josh did not ask her out', 'The result that Josh has not asked her out'],
                correct: 1,
                explanation: 'Present Perfect focuses on the <strong>result in the present</strong>, not the exact time in the past.'
            },
            {
                type: 'intro', num: 2,
                text: 'Focus on Rachel\'s and Phoebe\'s lines:<br><em>&ldquo;Rachel: I have never asked a guy out before.<br>Phoebe: You have never asked a guy before?<br>Rachel: No. Have you?<br>Phoebe: Yes, thousands of times.&rdquo;</em>'
            },
            {
                subLetter: 'a',
                text: 'Is Rachel talking about something that happened once, or an experience of her whole life?',
                options: ['Something that happened once', 'An experience of her whole life'],
                correct: 1,
                explanation: 'Rachel is talking about her whole life — she has <strong>never</strong> asked a guy out at any point in her entire life. This is a life experience, not a single past event.'
            },
            {
                subLetter: 'b',
                text: 'Did Rachel ask a guy out in her life at least once?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: '&ldquo;Never&rdquo; means zero times — Rachel has never done it.'
            },
            {
                subLetter: 'c',
                text: 'Is Rachel\'s life finished? Could she ask a guy out in the future?',
                options: ['Yes, she can', 'No, she can\'t'],
                correct: 0,
                explanation: 'Yes — Rachel is still alive, so she <em>could</em> ask a guy out in the future. Present Perfect life experiences are always about a period up to now, not a closed, finished life.'
            },
            {
                type: 'intro', num: 3,
                text: 'Compare these two sentences:<br>&nbsp;&nbsp;\uD83D\uDD35 <strong>A:</strong> John did not ask Rachel yesterday.<br>&nbsp;&nbsp;\uD83D\uDFE1 <strong>B:</strong> John has never asked Rachel out.'
            },
            {
                subLetter: 'a',
                text: 'Which one is a finished action at a specific time?',
                options: ['A', 'B'],
                correct: 0,
                explanation: '<strong>A: &ldquo;John did not ask Rachel yesterday.&rdquo;</strong> — Past Simple is used for finished actions at a specific time (&ldquo;yesterday&rdquo;).'
            },
            {
                subLetter: 'b',
                text: 'Which one is a life experience?',
                options: ['A', 'B'],
                correct: 1,
                explanation: '<strong>B: &ldquo;John has never asked Rachel out.&rdquo;</strong> — Present Perfect with &ldquo;never&rdquo; expresses a life experience: it has not happened at any point in his life.'
            },
            {
                type: 'intro', num: 4,
                text: 'Look at the sentences:<br><em>Josh has not asked me out. &nbsp; I have never asked a guy before. &nbsp; You have never asked a guy before?</em>'
            },
            {
                subLetter: 'a',
                text: 'What verb is the main verb in the sentences?',
                options: ['asked', 'have'],
                correct: 0,
                explanation: 'In Present Perfect we use verbs in the third form (past participle). Regular verbs follow the &ldquo;-ed&rdquo; rule: ask &rarr; asked, promise &rarr; promised. Irregular verbs change their form: think &rarr; thought, tell &rarr; told.'
            },
            {
                subLetter: 'b',
                text: 'What auxiliary verb comes before the main verb &ldquo;asked&rdquo;?',
                options: ['have / has', 'do / does', 'am / is / are', 'did'],
                correct: 0,
                explanation: 'In Present Perfect the auxiliary verbs are <strong>have</strong> and <strong>has</strong>. They come before the main verb (past participle). &ldquo;Do/does&rdquo; belongs to Present Simple; &ldquo;am/is/are&rdquo; to Present Continuous; &ldquo;did&rdquo; to Past Simple.'
            },
            {
                subLetter: 'c',
                text: 'What is the auxiliary verb when the subject is &ldquo;John&rdquo;?',
                options: ['has', 'have'],
                correct: 0,
                explanation: '&ldquo;John&rdquo; = he (3rd person singular) &rarr; <strong>has</strong>. We use &ldquo;has&rdquo; with He, She, It.'
            },
            {
                subLetter: 'd',
                text: 'What is the auxiliary verb when the subjects are &ldquo;I&rdquo; and &ldquo;You&rdquo;?',
                options: ['has', 'have'],
                correct: 1,
                explanation: 'In Present Perfect auxiliary verbs change according to the subject: I &rarr; <strong>have</strong> &nbsp; You &rarr; <strong>have</strong> &nbsp; He &rarr; <strong>has</strong> &nbsp; She &rarr; <strong>has</strong> &nbsp; It &rarr; <strong>has</strong> &nbsp; We &rarr; <strong>have</strong> &nbsp; They &rarr; <strong>have</strong>'
            },
            {
                type: 'intro', num: 5,
                text: 'Put the words in the correct order:'
            },
            {
                type: 'drag', subLetter: 'a',
                text: 'Put the words in the correct order:',
                words: ['have', 'I', 'called', 'him', 'today.'],
                correct: 'I have called him today.',
                explanation: 'Word order in Present Perfect: <strong>Subject + have/has + V3</strong>. I have called him today.'
            },
            {
                type: 'drag', subLetter: 'b',
                text: 'Put the words in the correct order:',
                words: ['You', 'never', 'visited', 'have', 'Almaty.'],
                correct: 'You have never visited Almaty.',
                explanation: 'With <strong>never</strong> the order is: Subject + have/has + never + V3. You have never visited Almaty.'
            },
            {
                type: 'intro', num: 6,
                text: 'Look at the sentence: <em>John has not asked me out today.</em>'
            },
            {
                subLetter: 'a',
                text: 'What do we add to the auxiliary verb to make negative sentences?',
                options: ['no', 'not'],
                correct: 1,
                explanation: 'We add <strong>not</strong> after the auxiliary verb: <em>has <strong>not</strong> asked</em> / <em>have <strong>not</strong> seen</em>. Contractions: hasn&rsquo;t, haven&rsquo;t.'
            },
            {
                subLetter: 'b',
                text: 'Is the main verb the same in positive and negative sentences?',
                options: ['Yes', 'No'],
                correct: 0,
                explanation: 'The main verb (past participle) stays the same. Only &ldquo;not&rdquo; is added after the auxiliary verb: <em>has <strong>not</strong> asked</em>.'
            },
            {
                type: 'intro', num: 7,
                text: 'Look at the sentence: <em>I have never asked a guy out before.</em>'
            },
            {
                subLetter: 'a',
                text: 'Is this sentence positive or negative?',
                options: ['Positive', 'Negative'],
                correct: 1,
                explanation: 'This sentence is <strong>negative</strong> — the word &ldquo;never&rdquo; makes it negative, even though there is no &ldquo;not&rdquo; in the sentence.'
            },
            {
                subLetter: 'b',
                text: 'Is this a recent action with no specific time, or a life experience?',
                options: ['Recent action with no specific time', 'A life experience'],
                correct: 1,
                explanation: 'This is a <strong>life experience</strong> — &ldquo;I have never asked a guy out <em>before</em>&rdquo; refers to Rachel&rsquo;s entire life up to now, not a specific recent event.'
            },
            {
                subLetter: 'c',
                text: 'What word makes this sentence negative?',
                options: ['not', 'never'],
                correct: 1,
                explanation: 'We use &ldquo;never&rdquo; when we talk about life experiences to make negative statements instead of &ldquo;not&rdquo;.<br>Examples: I have <strong>never</strong> been to France. &nbsp; He has <strong>never</strong> had a real job. &nbsp; They have <strong>never</strong> tried Slavic cuisine.'
            },
            {
                type: 'intro', num: 8,
                text: 'Put the words in the correct order:'
            },
            {
                type: 'drag', subLetter: 'a',
                text: 'Put the words in the correct order:',
                words: ['never', 'I', 'a', 'mountain.', 'climbed', 'have'],
                correct: 'I have never climbed a mountain.',
                explanation: 'Negative life experience: <strong>Subject + have/has + never + V3</strong>. I have never climbed a mountain.'
            },
            {
                type: 'drag', subLetter: 'b',
                text: 'Put the words in the correct order:',
                words: ['has', 'she', 'sushi.', 'eaten', 'never'],
                correct: 'She has never eaten sushi.',
                explanation: 'With she: <strong>She + has + never + V3</strong>. She has never eaten sushi.'
            }
        ],
        grammarBank1: {
            title: 'Present Perfect +',
            intro: 'We use Present Perfect for events in the past but with present results; life experiences; recent events — but we don\'t say or ask exactly when they happened.<br><br>We often use the present perfect with <strong>ever</strong> (at any time in your life) and <strong>never</strong> (at no time in your life) when we talk about experiences.',
            structure: 'The word order for positive Present Perfect sentences is <strong>SAV3</strong> (Subject + auxiliary verb + V3 / past participle).<br><br>In Present Perfect auxiliary verbs change according to the subjects:<br><table style="border-collapse:collapse;margin:8px 0 10px;font-size:0.93rem;"><tr><td style="padding:3px 14px 3px 0;font-weight:600;color:#e2b714;">I</td><td>have asked</td></tr><tr><td style="padding:3px 14px 3px 0;font-weight:600;color:#e2b714;">You</td><td>have asked</td></tr><tr><td style="padding:3px 14px 3px 0;font-weight:600;color:#e2b714;">He</td><td>has asked</td></tr><tr><td style="padding:3px 14px 3px 0;font-weight:600;color:#e2b714;">She</td><td>has asked</td></tr><tr><td style="padding:3px 14px 3px 0;font-weight:600;color:#e2b714;">It</td><td>has asked</td></tr><tr><td style="padding:3px 14px 3px 0;font-weight:600;color:#e2b714;">We</td><td>have asked</td></tr><tr><td style="padding:3px 14px 3px 0;font-weight:600;color:#e2b714;">They</td><td>have asked</td></tr></table>',
            examples: [
                'I <strong>have lost</strong> my keys — I can\'t open the door.',
                'You <strong>have visited</strong> Las Vegas.',
                'They <strong>have finished</strong> their exams recently.'
            ]
        },
        videoQuiz1b: [
            { type: 'intro', text: '<strong>Practice Affirmative</strong> — Choose the correct option:' },
            { text: 'Monica ___&nbsp; Richard before she started dating Chandler.', options: ['have dated', 'has dated', 'has date'], correct: 1, wrongOnly: true, explanation: 'Monica = she (3rd person singular) &rarr; <strong>has dated</strong>.' },
            { text: 'Chandler ___&nbsp; the name Richard many times recently.', options: ['has heard', 'have heard', 'has hears'], correct: 0, wrongOnly: true, explanation: 'Chandler = he (3rd person singular) &rarr; <strong>has heard</strong>.' },
            { text: 'Monica says: &ldquo;I ___&nbsp; his name only twice.&rdquo;', options: ['mention', 'has mentioned', 'have mentioned'], correct: 2, wrongOnly: true, explanation: 'Subject is &ldquo;I&rdquo; &rarr; <strong>have mentioned</strong>.' },
            { text: 'Rachel and Ross ___&nbsp; to Chandler\'s complaints.', options: ['have listened', 'has listened', 'have listen'], correct: 0, wrongOnly: true, explanation: 'Rachel and Ross = they (plural) &rarr; <strong>have listened</strong>.' },
            { text: 'We ___&nbsp; this episode of &ldquo;Friends&rdquo; before.', options: ['have saw', 'have seen', 'has seen'], correct: 1, wrongOnly: true, explanation: '&ldquo;We&rdquo; &rarr; <strong>have seen</strong> (irregular: see &rarr; seen).' },
            { text: 'The friends ___&nbsp; on the orange couch for a long time.', options: ['has sat', 'have sit', 'have sat'], correct: 2, wrongOnly: true, explanation: '&ldquo;The friends&rdquo; = they (plural) &rarr; <strong>have sat</strong> (irregular: sit &rarr; sat).' },
            { text: 'Richard ___&nbsp; a sensitive topic for Chandler.', options: ['has became', 'has become', 'have become'], correct: 1, wrongOnly: true, explanation: 'Richard = he (3rd person singular) &rarr; <strong>has become</strong> (irregular: become &rarr; become).' },
            { text: 'You ___&nbsp; the video and noticed Chandler\'s tie.', options: ['have watched', 'has watched', 'watched'], correct: 0, wrongOnly: true, explanation: '&ldquo;You&rdquo; &rarr; <strong>have watched</strong>.' },
            { text: 'It ___&nbsp; again: Chandler is jealous.', options: ['have happened', 'has happen', 'has happened'], correct: 2, wrongOnly: true, explanation: '&ldquo;It&rdquo; (3rd person singular) &rarr; <strong>has happened</strong>.' },
            { text: 'Joey ___&nbsp; his book during the conversation.', options: ['have read', 'has read', 'has reading'], correct: 1, wrongOnly: true, explanation: 'Joey = he (3rd person singular) &rarr; <strong>has read</strong> (irregular: read &rarr; read).' }
        ],
        grammarBank1b: {
            blocks: [
                {
                    intro: '<strong>NEGATIVE</strong><br>In negative present perfect sentences we use &ldquo;hasn\'t&rdquo;, &ldquo;haven\'t&rdquo;, or &ldquo;never&rdquo;.<br>The word order for negative sentences is <strong>SAV3</strong> (Subject + auxiliary verb + not + V3 / past participle).<br>We use &ldquo;never&rdquo; when we talk about life experiences to make negative statements instead of &ldquo;not&rdquo;.<br><br>Contractions: <strong>haven\'t = have not</strong> &nbsp;&nbsp; <strong>hasn\'t = has not</strong>',
                    table: [],
                    examples: [
                        'I <strong>have never</strong> asked a guy out.',
                        'She <strong>hasn\'t</strong> finished her writing.',
                        'They <strong>have never</strong> lived in LA.'
                    ]
                }
            ]
        },
        videoQuiz1d: [
            { type: 'intro', text: '<strong>Practice Negative</strong> — Choose the correct option:' },
            { text: 'Joshua ___&nbsp; Rachel out yet, even though they spent an hour together.', options: ['haven\'t asked', 'hasn\'t asked', 'hasn\'t ask'], correct: 1, wrongOnly: true, explanation: 'Joshua = he (3rd person singular) &rarr; <strong>hasn\'t asked</strong>.' },
            { text: 'Rachel says: &ldquo;I ___&nbsp; a guy out before.&rdquo;', options: ['haven\'t asked', 'hasn\'t asked', 'haven\'t ask'], correct: 0, wrongOnly: true, explanation: '&ldquo;I&rdquo; &rarr; <strong>haven\'t asked</strong>.' },
            { text: 'Joey and Phoebe ___&nbsp; Rachel much with her problem yet.', options: ['hasn\'t helped', 'haven\'t help', 'haven\'t helped'], correct: 2, wrongOnly: true, explanation: 'Joey and Phoebe = they (plural) &rarr; <strong>haven\'t helped</strong>.' },
            { text: 'Phoebe\'s experience ___&nbsp; a secret; she\'s asked guys out thousands of times.', options: ['haven\'t been', 'hasn\'t been', 'hasn\'t be'], correct: 1, wrongOnly: true, explanation: '&ldquo;Phoebe\'s experience&rdquo; = it (3rd person singular) &rarr; <strong>hasn\'t been</strong>.' },
            { text: 'We ___&nbsp; watching the scene yet, but it\'s already funny.', options: ['haven\'t finished', 'hasn\'t finished', 'haven\'t finish'], correct: 0, wrongOnly: true, explanation: '&ldquo;We&rdquo; &rarr; <strong>haven\'t finished</strong>.' }
        ],
        videoQuiz2: [
            {
                type: 'intro', num: 1,
                text: 'Look at the sentences:<br><em>Have you ever had a dream of&hellip;? &nbsp; Have you ever listened to your heart?</em>'
            },
            {
                subLetter: 'a',
                text: 'What word starts the questions?',
                options: ['have', 'did', 'do'],
                correct: 0,
                explanation: 'The word order in interrogative Present Perfect sentences is <strong>ASV3</strong> (Auxiliary verb + Subject + V3 / past participle). The auxiliary verb <strong>have / has</strong> comes first.'
            },
            {
                type: 'intro', num: 2,
                text: 'Look at the sentence: <em>Where have you been?</em>'
            },
            {
                subLetter: 'a',
                text: 'What word starts the question?',
                options: ['where', 'have'],
                correct: 0,
                explanation: 'WH-question words (<strong>where, what, who, how, when</strong>) come before auxiliary verbs in interrogative sentences.'
            },
            {
                subLetter: 'b',
                text: '&ldquo;Where&rdquo; is a &hellip;',
                options: ['Question word', 'Auxiliary verb'],
                correct: 0,
                explanation: 'WH-question words come before auxiliary verbs in interrogative sentences.'
            },
            {
                type: 'intro', num: 3,
                text: 'Put the words in the correct order:'
            },
            {
                type: 'drag', subLetter: 'a',
                text: 'Put the words in the correct order:',
                words: ['you', 'Have', 'ever', 'dreamt of', 'a holiday?'],
                correct: 'Have you ever dreamt of a holiday?',
                explanation: 'Word order: <strong>Have + you + ever + V3</strong>. Have you ever dreamt of a holiday?'
            },
            {
                type: 'drag', subLetter: 'b',
                text: 'Put the words in the correct order:',
                words: ['listened to', 'your heart?', 'ever', 'Have', 'you'],
                correct: 'Have you ever listened to your heart?',
                explanation: 'Word order: <strong>Have + you + ever + V3</strong>. Have you ever listened to your heart?'
            }
        ],
        grammarBank2: {
            blocks: [
                {
                    intro: '<strong>INTERROGATIVE</strong><br>The word order in interrogative Present Perfect sentences is <strong>ASV3</strong> (Auxiliary verb + Subject + V3 / past participle).<br>WH-question words come before auxiliary verbs in interrogative sentences.',
                    table: [],
                    examples: [
                        '<strong>Have</strong> you ever read a Russian novel?',
                        '<strong>Have</strong> you finished the exercise?',
                        '<strong>Have</strong> you seen the Eiffel Tower?'
                    ]
                }
            ]
        },
        videoQuiz2b: [
            { type: 'intro', text: '<strong>Practice Interrogative</strong> — Choose the correct option:' },
            { text: '___ you ever ___&nbsp; to your heart?', options: ['Has you ever listened', 'Have you ever listened', 'Have you ever listen'], correct: 1, wrongOnly: true, explanation: '&ldquo;You&rdquo; &rarr; <strong>Have you ever listened</strong>. Use &ldquo;have&rdquo; with I, you, we, they; the verb must be in past participle form.' },
            { text: '___ Dora ___&nbsp; us a stethoscope?', options: ['Has Dora shown', 'Have Dora shown', 'Has Dora show'], correct: 0, wrongOnly: true, explanation: 'Dora = she (3rd person singular) &rarr; <strong>Has Dora shown</strong>. Use &ldquo;has&rdquo; with he, she, it; &ldquo;shown&rdquo; is the past participle of &ldquo;show&rdquo;.' },
            { text: '___ the doctors ___&nbsp; this tool to hear the heart?', options: ['Has the doctors used', 'Have the doctors use', 'Have the doctors used'], correct: 2, wrongOnly: true, explanation: '&ldquo;The doctors&rdquo; = they (plural) &rarr; <strong>Have the doctors used</strong>. Use &ldquo;have&rdquo; with plural subjects; past participle of &ldquo;use&rdquo; is &ldquo;used&rdquo;.' },
            { text: '___ it ___&nbsp; louder with the stethoscope?', options: ['Have it become', 'Has it become', 'Has it became'], correct: 1, wrongOnly: true, explanation: '&ldquo;It&rdquo; (3rd person singular) &rarr; <strong>Has it become</strong>. &ldquo;Become&rdquo; is an irregular verb: become &rarr; become (past participle stays the same).' },
            { text: '___ we ___&nbsp; how to name this medical instrument?', options: ['Have we learned', 'Has we learned', 'Have we learn'], correct: 0, wrongOnly: true, explanation: '&ldquo;We&rdquo; &rarr; <strong>Have we learned</strong>. Use &ldquo;have&rdquo; with we; past participle of &ldquo;learn&rdquo; is &ldquo;learned&rdquo;.' }
        ],
        videoQuiz3: [
            {
                type: 'intro', num: 1,
                text: 'Look at the sentences:<br><em>Edmund has got the medal. &nbsp; Richard has got the medal. &nbsp; George has got the medal.</em>'
            },
            {
                subLetter: 'a',
                text: 'When did Edmund, Richard, and George get their medals?',
                options: ['Long time ago', 'Recently'],
                correct: 1,
                explanation: 'Present Perfect is used for <strong>recent actions</strong> whose result is visible or relevant right now.'
            },
            {
                subLetter: 'b',
                text: 'Are they wearing the medals now?',
                options: ['Yes', 'No'],
                correct: 0,
                explanation: 'Yes — the medals are on them <strong>now</strong>. The past action (getting the medal) has a clear present result.'
            },
            {
                subLetter: 'c',
                text: 'Do we know exactly when Edmund, Richard, and George got their medals?',
                options: ['Yes, the exact time is clear.', 'Yes, it is happening right now.', 'No, time is not important.'],
                correct: 2,
                explanation: 'In Present Perfect the <strong>exact time is not mentioned or important</strong>. The focus is on the result, not when it happened.'
            },
            {
                subLetter: 'd',
                text: 'What do all three sentences show?',
                options: ['They got medals in the past and they have medals now.', 'They got medals in the past but we can\'t see the medals now.'],
                correct: 0,
                explanation: 'Present Perfect connects a past action with its <strong>present result</strong>: they got medals &rarr; they have medals now.'
            },
            {
                subLetter: 'e',
                text: 'What is the main focus of these sentences?',
                options: ['The exact time when they got medals', 'The result — they have medals now'],
                correct: 1,
                explanation: 'Present Perfect focuses on the <strong>present result</strong> of a past action, not on when exactly it happened.'
            }
        ],
        grammarBank3: {
            blocks: [
                {
                    intro: '<strong>PRESENT RESULT</strong><br>We use Present Perfect for recent actions and for actions that happened in the past but have <strong>results in the present</strong>.',
                    table: [],
                    examples: [
                        'I <strong>have lost</strong> my keys — I can\'t open the door.',
                        'Edmund <strong>has got</strong> the medal — he has it now.',
                        'Edmund <strong>hasn\'t got</strong> the medal — now he is upset.'
                    ]
                }
            ]
        },
        videoQuiz3b: [
            { type: 'intro', text: '<strong>Practice Video 3</strong> — Choose the correct option:' },
            { text: 'Edmund looks very happy! He ________ a medal.', options: ['have got', 'has got', 'hasn\'t got', 'have gotting'], correct: 1, wrongOnly: true, explanation: 'Edmund = he (3rd person singular) &rarr; <strong>has got</strong>. Use &ldquo;has&rdquo; with he, she, it.' },
            { text: 'Richard ________ his homework yet, so he can\'t go out to play.', options: ['hasn\'t finished', 'haven\'t finished', 'didn\'t finished', 'hasn\'t finish'], correct: 0, wrongOnly: true, explanation: 'Richard = he (3rd person singular), negative &rarr; <strong>hasn\'t finished</strong>. Use &ldquo;hasn\'t&rdquo; (= has not) with he, she, it + past participle.' },
            { text: '________ George ________ his dinner yet? He must be hungry.', options: ['Has / finish', 'Have / finished', 'Has / finished', 'Is / finishing'], correct: 2, wrongOnly: true, explanation: 'George = he (3rd person singular), question &rarr; <strong>Has George finished</strong>. Use &ldquo;has&rdquo; in questions with he, she, it + past participle.' },
            { text: 'Be careful! Peppa ________ some water on the floor. It\'s still wet.', options: ['has spilled', 'have spilled', 'spilled', 'has spill'], correct: 0, wrongOnly: true, explanation: 'Peppa = she (3rd person singular) &rarr; <strong>has spilled</strong>. The wet floor is the present result of the past action.' },
            { text: 'Edmund and Richard are exhausted because they ________ the whole day.', options: ['has played', 'have played', 'played', 'have play'], correct: 1, wrongOnly: true, explanation: '&ldquo;Edmund and Richard&rdquo; = they (plural) &rarr; <strong>have played</strong>. Use &ldquo;have&rdquo; with plural subjects.' },
            { text: '&ldquo;Can I speak to George?&rdquo; — &ldquo;I\'m sorry, he ________ to bed.&rdquo;', options: ['have gone', 'has went', 'has gone', 'goes'], correct: 2, wrongOnly: true, explanation: 'He (3rd person singular) &rarr; <strong>has gone</strong>. &ldquo;Go&rdquo; is an irregular verb: go &rarr; gone (past participle).' }
        ],
        usage: [
            'Действие завершено, но результат важен сейчас',
            'Жизненный опыт (когда-либо)',
            'Последние события с "just"',
            'Период времени все еще не закончился'
        ],
        rules: [
            { type: 'Утверждение', example: 'I have finished my homework.' },
            { type: 'Отрицание', example: 'He hasn\'t seen this movie.' },
            { type: 'Вопрос', example: 'Have you ever traveled?' }
        ],
        examples: [
            {
                source: 'The Godfather',
                dialogue: '"I have come to ask a favor."',
                translation: 'Я пришел попросить одолжение.'
            },
            {
                source: 'Titanic',
                dialogue: '"I\'ve never been first class before."',
                translation: 'Я никогда раньше не путешествовал первым классом.'
            }
        ],
        exercises: [] // This array will be empty as custom rendering is used
    },

    'present-perfect-continuous': {
        title: 'Present Perfect Continuous',
        russian: 'Настоящее совершенное длительное',
        videoFile: 'present perfect cont 1.mp4',
        videoFile2: 'present perfect cont 2.mp4',
        structure: 'have/has + been + V+ing',
        usage: [
            'Действие началось в прошлом и продолжается сейчас',
            'Подчеркивание длительности',
            'Последние события, которые еще продолжаются'
        ],
        rules: [
            { type: 'Утверждение', example: 'They have been playing for 2 hours.' },
            { type: 'Отрицание', example: 'I haven\'t been waiting long.' },
            { type: 'Вопрос', example: 'How long have you been working here?' }
        ],
        examples: [
            {
                source: 'Breaking Bad',
                dialogue: '"I have been working my whole life."',
                translation: 'Я работал всю свою жизнь.'
            }
        ],
        videoQuiz1: [
            {
                type: 'intro',
                text: 'Look at the sentence: <em>&ldquo;You have been missing all the fun.&rdquo;</em>'
            },
            {
                noNum: true,
                text: '1. Is the &ldquo;fun&rdquo; over, or is it still happening at the moment the character speaks?',
                options: ['The fun is finished.', 'The fun is still happening.'],
                correct: 1,
                explanation: 'The Present Perfect Continuous (<strong>have been missing</strong>) connects a past start point to the present moment. Mr. Conrad is saying that from the start of the party until now, Tim has not been part of the fun.'
            },
            {
                noNum: true,
                text: '2. Look at the sentence: &ldquo;I have been telling Sir Lance a lot that you deserve a promotion.&rdquo;<br>Did Barry say this once, or did he repeat this action several times leading up to now?',
                options: ['He said it once.', 'He said it multiple times over a period of time.'],
                correct: 1,
                explanation: 'Barry didn&rsquo;t speak once; he has been talking and talking about it.'
            },
            {
                noNum: true,
                text: '3. Look at the sentence: &ldquo;He&rsquo;s been making a pretty persuasive case, Tim.&rdquo;<br>This action&hellip;',
                options: ['started and finished a long time ago and has no result in the present.', 'started in the recent past and is still happening now and the result is visible in the present.'],
                correct: 1,
                explanation: 'We often use Present Perfect Continuous for recent activities that have a clear result in the present. In this case, Sir Lance is convinced <em>now</em> because of Barry&rsquo;s continuous talking.'
            },
            {
                type: 'intro',
                text: '4. Compare these two sentences:<br><em>A: Barry told Sir Lance about the promotion.</em><br><em>B: Barry has been telling Sir Lance about the promotion.</em>'
            },
            {
                noNum: true,
                text: 'Which sentence is a completed report of a past event?',
                options: ['A', 'B'],
                correct: 0,
                explanation: 'The Past Simple (A) simply reports a completed past action with no connection to now.'
            },
            {
                noNum: true,
                text: 'Which sentence is an action in progress?',
                options: ['A', 'B'],
                correct: 1,
                explanation: 'The Present Perfect Continuous (B) shows an ongoing action that started in the past and continues up to the present.'
            },
            {
                type: 'intro',
                text: '5. Look at the sentences:<br><em>You <strong>have been</strong> missing all the fun.</em><br><em>I <strong>have been</strong> telling Sir Lance&hellip;</em><br><em>He <strong>has been</strong> making a case.</em>'
            },
            {
                noNum: true,
                type: 'fill',
                text: 'What are the two auxiliary (helping) verbs used in every sentence?',
                answer: 'have been',
                altAnswers: ['has been', 'have been / has been', 'has been / have been'],
                placeholder: 'type here...',
                explanation: 'Present Perfect Continuous auxiliary verbs are <strong>have been</strong> and <strong>has been</strong>.<br><em>have been</em> &rarr; I, You, We, They<br><em>has been</em> &rarr; He, She, It'
            },
            {
                noNum: true,
                text: 'Does the first auxiliary verb change depending on the subject?',
                options: ['Yes.', 'No.'],
                correct: 0,
                explanation: '<strong>have been</strong> is used with I, You, We, They.<br><strong>has been</strong> is used with He, She, It.<br><em>&ldquo;We <strong>have been</strong> working on this project.&rdquo;</em><br><em>&ldquo;She <strong>has been</strong> eating lunch.&rdquo;</em>'
            },
            {
                noNum: true,
                text: 'What form is the main verb (<em>missing, telling, making</em>) in?',
                options: ['Past Participle (3rd form)', 'Present Participle (&minus;ing form)'],
                correct: 1,
                explanation: 'Because it is a continuous tense, we must use the <strong>&minus;ing</strong> form to show the action is in progress.'
            },
            {
                type: 'intro',
                text: '6. Look at the contraction: <em>&ldquo;He&rsquo;s been making&hellip;&rdquo;</em>'
            },
            {
                noNum: true,
                text: 'What does the &rsquo;s stand for?',
                options: ['He is', 'He has'],
                correct: 1,
                explanation: '<strong>&rsquo;s</strong> stands for <strong>has</strong> in this context.<br><em>He <strong>has</strong> been making dinner.</em><br><em>She <strong>has</strong> been doing her homework.</em>'
            },
            {
                type: 'intro',
                text: '<strong>7. Practice: Word Order</strong>'
            },
            {
                type: 'drag',
                subLetter: 'a',
                text: 'Put the words in the correct order:',
                words: ['Barry', 'has', 'been', 'talking', 'all', 'night.'],
                correct: 'Barry has been talking all night.'
            }
        ],
        grammarBank1: {
            blocks: [
                {
                    intro: 'We use the <strong>Present Perfect Continuous</strong> to talk about:<br><ul style="margin:8px 0 0 0;padding-left:18px;"><li>Actions that <strong>started in the past and are still continuing</strong>;</li><li>Recently finished actions with duration.</li></ul><br>The word order for positive sentences is <strong>SAV</strong><br><strong>Subject + have/has + been + Verb-ing</strong><br>Contractions: <strong>&rsquo;ve = have &nbsp; &rsquo;s = has</strong><br><br><table style="border-collapse:collapse;margin:10px 0;font-size:0.93rem;"><tr><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Subject</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Auxiliary Verb</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Continuous Marker</th><th style="padding:4px 0;color:#e2b714;text-align:left;">Main Verb (&minus;ing)</th></tr><tr><td style="padding:3px 14px 3px 0;">I</td><td style="padding:3px 14px 3px 0;">have</td><td style="padding:3px 14px 3px 0;">been</td><td>telling</td></tr><tr><td style="padding:3px 14px 3px 0;">You</td><td style="padding:3px 14px 3px 0;">have</td><td style="padding:3px 14px 3px 0;">been</td><td>telling</td></tr><tr><td style="padding:3px 14px 3px 0;">He / She / It</td><td style="padding:3px 14px 3px 0;">has</td><td style="padding:3px 14px 3px 0;">been</td><td>telling</td></tr><tr><td style="padding:3px 14px 3px 0;">We</td><td style="padding:3px 14px 3px 0;">have</td><td style="padding:3px 14px 3px 0;">been</td><td>telling</td></tr><tr><td style="padding:3px 14px 3px 0;">They</td><td style="padding:3px 14px 3px 0;">have</td><td style="padding:3px 14px 3px 0;">been</td><td>telling</td></tr></table><br>We use <strong>&ldquo;since&rdquo;</strong> and <strong>&ldquo;for&rdquo;</strong> to show the length of the period between past and present.<br><ul style="margin:6px 0 0 0;padding-left:18px;"><li><strong>for</strong> + period of time: <em>for 20 minutes, for two weeks, for a long time</em><br><em>I have been sleeping <strong>for</strong> two hours.</em></li><li><strong>since</strong> + specific time: <em>since Monday, since 9:00 AM, since I arrived</em><br><em>She has been waiting <strong>since</strong> you left.</em></li></ul><br><strong>Important &mdash; Stative Verbs</strong><br>Do not use Continuous tenses with stative verbs (verbs of feeling, thinking, or belonging).<table style="border-collapse:collapse;margin:10px 0;font-size:0.92rem;"><tr><th style="padding:4px 14px 4px 0;color:#e05555;text-align:left;">&times; Incorrect</th><th style="padding:4px 0;color:#4caf50;text-align:left;">&checkmark; Correct</th></tr><tr><td style="padding:3px 14px 3px 0;">I have been knowing her.</td><td>I have known her.</td></tr><tr><td style="padding:3px 14px 3px 0;">He has been having a car.</td><td>He has had a car.</td></tr><tr><td style="padding:3px 14px 3px 0;">I have been liking this.</td><td>I have liked this.</td></tr></table>',
                    table: [],
                    examples: [
                        'I <strong>have been watching</strong> a movie since I came home.',
                        'He <strong>has been cooking</strong> dinner for two hours.',
                        'Barry <strong>has been telling</strong> Sir Lance about the promotion.',
                        'You <strong>have been missing</strong> all the fun.'
                    ]
                }
            ]
        },
        videoQuiz1b: [
            { type: 'intro', text: '<strong>Practice Affirmative &mdash; Choose the correct option:</strong>' },
            {
                noNum: true,
                text: '1. Barry says: &ldquo;I ______ (tell) Sir Lance a lot that you deserve a promotion.&rdquo;',
                options: ['have been tell', 'have been telling', 'has been telling'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>have been telling</strong> &mdash; Subject <em>I</em> takes <strong>have been</strong> + V-ing.'
            },
            {
                noNum: true,
                text: '2. Sir Lance says: &ldquo;He ______ (make) a pretty persuasive case, Tim.&rdquo;',
                options: ['have been making', 'has been make', 'has been making'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>has been making</strong> &mdash; Subject <em>He</em> takes <strong>has been</strong> + V-ing.'
            },
            {
                noNum: true,
                text: '3. Mr. Conrad says: &ldquo;You ______ (miss) all the fun!&rdquo;',
                options: ['have been missing', 'has been missing', 'have been miss'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>have been missing</strong> &mdash; Subject <em>You</em> takes <strong>have been</strong> + V-ing.'
            },
            {
                noNum: true,
                text: '4. Tim ______ (wait) for this promotion for a long time.',
                options: ['have been waiting', 'has been waiting', 'has been wait'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>has been waiting</strong> &mdash; Subject <em>Tim</em> (He) takes <strong>has been</strong> + V-ing.'
            },
            {
                noNum: true,
                text: '5. Barry and Sir Lance ______ (talk) about Tim&rsquo;s career during the party.',
                options: ['have been talking', 'has been talking', 'have been talk'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>have been talking</strong> &mdash; Plural subject takes <strong>have been</strong> + V-ing.'
            },
            {
                noNum: true,
                text: '6. Barry ______ (carry) the diary with him since he arrived.',
                options: ['have been carrying', 'has been carrying', 'has been carry'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>has been carrying</strong> &mdash; Subject <em>Barry</em> (He) takes <strong>has been</strong> + V-ing.'
            },
            {
                noNum: true,
                text: '7. Sir Lance ______ (listen) to Barry&rsquo;s stories for several minutes.',
                options: ['has been listening', 'have been listening', 'has being listening'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>has been listening</strong> &mdash; Subject <em>Sir Lance</em> (He) takes <strong>has been</strong> + V-ing.'
            },
            {
                noNum: true,
                text: '8. Tim and Barry ______ (stand) in the middle of the room during the talk.',
                options: ['has been standing', 'have been stand', 'have been standing'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>have been standing</strong> &mdash; Plural subject takes <strong>have been</strong> + V-ing.'
            },
            {
                noNum: true,
                text: '9. The guests ______ (look) at the painting on the wall behind Tim.',
                options: ['have been looking', 'has been looking', 'have been look'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>have been looking</strong> &mdash; Plural subject takes <strong>have been</strong> + V-ing.'
            },
            {
                noNum: true,
                text: '10. Tim ______ (feel) very awkward because of Barry&rsquo;s words.',
                options: ['have been feeling', 'has been feeling', 'has been feel'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>has been feeling</strong> &mdash; Subject <em>Tim</em> (He) takes <strong>has been</strong> + V-ing.'
            }
        ],
        videoQuiz2: [
            {
                type: 'intro',
                text: 'Look at the sentence: <em>&ldquo;Guess what we&rsquo;ve been doing!&rdquo;</em>'
            },
            {
                noNum: true,
                text: 'Peppa is talking about an action that&hellip;',
                options: ['finished a long time ago and not connected to the present.', 'has been happening and is connected to the present.'],
                correct: 1,
                explanation: 'The Present Perfect Continuous (<strong>have been &minus;ing</strong>) is used to talk about an activity that started in the past and has only just stopped, or is still happening. Peppa and George have been playing in the mud, that is why they are still covered in mud!'
            },
            {
                type: 'intro',
                text: '2. Look at the sentences: <em>&ldquo;They have <strong>not</strong> been watching TV. They have been playing in the mud.&rdquo;</em>'
            },
            {
                noNum: true,
                type: 'fill',
                text: 'What word do we use to negate the Present Perfect Continuous sentences?',
                answer: 'not',
                placeholder: 'type here...',
                explanation: 'We add <strong>not</strong> between <em>have/has</em> and <em>been</em> to make the sentence negative.<br><em>I <strong>haven&rsquo;t</strong> been playing football.</em><br><em>She <strong>hasn&rsquo;t</strong> been dancing in the rain.</em>'
            },
            {
                noNum: true,
                text: '&ldquo;Not&rdquo; in the negative sentences stays&hellip;',
                options: ['after &ldquo;have/has&rdquo;', 'after &ldquo;have been / has been&rdquo;'],
                correct: 0,
                explanation: '&ldquo;Not&rdquo; in negative Present Perfect Continuous sentences stays <strong>between</strong> &ldquo;have / has&rdquo; and &ldquo;been&rdquo;.<br><em>I <strong>haven&rsquo;t</strong> been playing football.</em><br><em>She <strong>hasn&rsquo;t</strong> been dancing in the rain.</em>'
            },
            {
                type: 'drag',
                noNum: true,
                subLetter: '3',
                text: 'Put the words in the correct order:',
                words: ['Peppa', 'has', 'not', 'been', 'playing', 'in', 'the', 'mud.'],
                correct: 'Peppa has not been playing in the mud.'
            },
            {
                type: 'intro',
                text: '4. Look at the sentence: <em>&ldquo;Have you been watching television?&rdquo;</em>'
            },
            {
                noNum: true,
                text: 'Daddy Pig is asking about the activity&hellip;',
                options: ['Peppa and George are doing right now.', 'Peppa and George were doing until they came into the kitchen.'],
                correct: 1,
                explanation: 'The Past Perfect Continuous question refers to an activity that was in progress before the current moment &mdash; leading up to now.'
            },
            {
                type: 'intro',
                text: '5. Compare these two sentences:<br><em>A: &ldquo;Have you just had a bath?&rdquo;</em><br><em>B: &ldquo;Have you been having a bath?&rdquo;</em>'
            },
            {
                noNum: true,
                text: 'Which sentence focuses on the recent completed action and on the fact that the action is finished?',
                options: ['A', 'B'],
                correct: 0,
                explanation: 'The Present Perfect Simple (A) focuses on the completed result. The Present Perfect Continuous (B) emphasises the duration of the ongoing activity.<br><em>Peppa and George are playing in the mud right now.</em> (not finished, still continuing)<br><em>Peppa and George have been playing in the mud all day!</em> (finished, was in progress until now, has a result in present, focuses on duration)'
            },
            {
                noNum: true,
                text: 'Which sentence focuses on the fact that the activity was in progress and lasted for some time?',
                options: ['A', 'B'],
                correct: 1,
                explanation: 'The Present Perfect Continuous emphasises the duration of the ongoing activity. Unlike the Present Continuous, the action is just finished and often has a visible result in the present.'
            },
            {
                type: 'intro',
                text: '6. Look at Daddy Pig&rsquo;s question: <em>&ldquo;Have you been watching television?&rdquo;</em>'
            },
            {
                noNum: true,
                text: 'What auxiliary verb starts the question?',
                options: ['have / has', 'been', 'have been / has been'],
                correct: 0,
                explanation: 'Only the first auxiliary verb (<strong>have / has</strong>) moves to the front to create the question. The rest (<em>been + &minus;ing</em>) stays together.'
            },
            {
                noNum: true,
                text: 'The structure of interrogative sentences in Present Perfect Continuous is&hellip;',
                options: ['Have/Has + subject + been + V-ing?', 'Have/Has been + subject + V-ing?'],
                correct: 0,
                explanation: '<strong>Have/Has + subject + been + V-ing?</strong><br><em>Have you been cooking dinner?</em><br><em>Have they been watching television?</em>'
            },
            {
                noNum: true,
                text: 'The word &ldquo;been&rdquo; in interrogative sentences stays&hellip;',
                options: ['after the subject', 'before the subject'],
                correct: 1,
                explanation: 'Only <strong>have/has</strong> moves to the front. &ldquo;Been&rdquo; stays after the subject, directly before the main verb:<br><em>Have <u>you</u> <strong>been</strong> cooking?</em>'
            },
            {
                type: 'intro',
                text: '<strong>7. Practice: Forming the Question</strong>'
            },
            {
                type: 'drag',
                subLetter: 'a',
                text: 'Put the words in the correct order:',
                words: ['Have', 'they', 'been', 'jumping', 'in', 'puddles?'],
                correct: 'Have they been jumping in puddles?'
            },
            {
                noNum: true,
                subLetter: 'b',
                text: 'If Daddy Pig was asking only about George (He), how would the question start?',
                options: ['Have George been&hellip;?', 'Has George been&hellip;?'],
                correct: 1,
                explanation: 'The auxiliary verb changes according to the subject:<br><strong>I, You, We, They &rarr; Have</strong><br><strong>He, She, It &rarr; Has</strong>'
            }
        ],
        grammarBank2: {
            blocks: [
                {
                    intro: '<strong>Negative: Subject + haven&rsquo;t / hasn&rsquo;t + been + V-ing</strong><br>Contractions: <strong>haven&rsquo;t = have not &nbsp; hasn&rsquo;t = has not</strong><br><table style="border-collapse:collapse;margin:10px 0;font-size:0.93rem;"><tr><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Subject</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Auxiliary</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Been</th><th style="padding:4px 0;color:#e2b714;text-align:left;">Main Verb (&minus;ing)</th></tr><tr><td style="padding:3px 14px 3px 0;">I / You / We / They</td><td style="padding:3px 14px 3px 0;">haven&rsquo;t</td><td style="padding:3px 14px 3px 0;">been</td><td>working</td></tr><tr><td style="padding:3px 14px 3px 0;">He / She / It</td><td style="padding:3px 14px 3px 0;">hasn&rsquo;t</td><td style="padding:3px 14px 3px 0;">been</td><td>playing</td></tr></table><br><strong>Questions: Have/Has + subject + been + V-ing?</strong><br>We use the question form to ask about the duration or the cause of a current situation.<br><table style="border-collapse:collapse;margin:10px 0;font-size:0.93rem;"><tr><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Auxiliary</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Subject</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Been</th><th style="padding:4px 0;color:#e2b714;text-align:left;">Main Verb (&minus;ing)</th></tr><tr><td style="padding:3px 14px 3px 0;">Have</td><td style="padding:3px 14px 3px 0;">I / you / we / they</td><td style="padding:3px 14px 3px 0;">been</td><td>working?</td></tr><tr><td style="padding:3px 14px 3px 0;">Has</td><td style="padding:3px 14px 3px 0;">he / she / it</td><td style="padding:3px 14px 3px 0;">been</td><td>playing?</td></tr></table><strong>Short Answers</strong><br>Yes, I <strong>have</strong>. &nbsp; No, I <strong>haven&rsquo;t</strong>.<br>Yes, she <strong>has</strong>. &nbsp; No, she <strong>hasn&rsquo;t</strong>.',
                    table: [],
                    examples: [
                        'I <strong>haven&rsquo;t been living</strong> here for a while.',
                        'She <strong>hasn&rsquo;t been waiting</strong> for the bus very long.',
                        'They <strong>haven&rsquo;t been eating</strong> chocolate &mdash; they have been eating cake.',
                        '<strong>Have you been watching</strong> television? &nbsp; &ldquo;Your hands are blue! <strong>Have you been painting?</strong>&rdquo;',
                        '&ldquo;How long <strong>have you been waiting</strong> for the bus?&rdquo;'
                    ]
                }
            ]
        },
        videoQuiz2b: [
            { type: 'intro', text: '<strong>Practice Negative &mdash; Choose the correct option:</strong>' },
            {
                noNum: true,
                text: '1. Even though they are messy, Daddy Pig says: &ldquo;You ______ (clean) the house, I see!&rdquo;',
                options: ['hasn\'t been cleaning', 'haven\'t been cleaning', 'haven\'t been clean'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>haven&rsquo;t been cleaning</strong> &mdash; Subject <em>You</em> takes <strong>haven&rsquo;t been</strong> + V-ing.'
            },
            {
                noNum: true,
                text: '2. Peppa and George are covered in mud, so they ______ (stay) inside all day.',
                options: ['hasn\'t been staying', 'haven\'t being staying', 'haven\'t been staying'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>haven&rsquo;t been staying</strong> &mdash; Plural subject takes <strong>haven&rsquo;t been</strong> + V-ing.'
            },
            {
                noNum: true,
                text: '3. Since it was raining, the sun ______ (shine) on the muddy puddles.',
                options: ['hasn\'t been shining', 'haven\'t been shining', 'hasn\'t been shine'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>hasn&rsquo;t been shining</strong> &mdash; Subject <em>the sun</em> (It) takes <strong>hasn&rsquo;t been</strong> + V-ing.'
            },
            {
                noNum: true,
                text: '4. George is quiet, so he ______ (cry) while jumping in the mud.',
                options: ['haven\'t been crying', 'hasn\'t been crying', 'hasn\'t been cry'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>hasn&rsquo;t been crying</strong> &mdash; Subject <em>he</em> takes <strong>hasn&rsquo;t been</strong> + V-ing.'
            },
            {
                noNum: true,
                text: '5. We can see that the kids ______ (wash) their clothes yet.',
                options: ['haven\'t been washing', 'hasn\'t been washing', 'haven\'t being washing'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>haven&rsquo;t been washing</strong> &mdash; Plural subject takes <strong>haven&rsquo;t been</strong> + V-ing.'
            },
            { type: 'intro', text: '<strong>Practice Interrogative &mdash; Choose the correct option:</strong>' },
            {
                noNum: true,
                text: '1. Daddy Pig looks at the kids and asks: &ldquo;___ you ___ (watch) television?&rdquo;',
                options: ['Have &hellip; been watching', 'Has &hellip; been watching', 'Have &hellip; been watch'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>Have &hellip; been watching</strong> &mdash; Subject <em>you</em> takes <strong>Have</strong> + subject + <strong>been</strong> + V-ing?'
            },
            {
                noNum: true,
                text: '2. To find out about their day, he asks: &ldquo;___ you ___ (jump) in muddy puddles?&rdquo;',
                options: ['Has &hellip; been jumping', 'Have &hellip; being jumping', 'Have &hellip; been jumping'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>Have &hellip; been jumping</strong> &mdash; Subject <em>you</em> takes <strong>Have</strong> + subject + <strong>been</strong> + V-ing?'
            },
            {
                noNum: true,
                text: '3. When Daddy Pig sees the mud on the floor, he asks: &ldquo;___ you ___ (play) outside in the rain?&rdquo;',
                options: ['Have &hellip; been play', 'Have &hellip; been playing', 'Has &hellip; been playing'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>Have &hellip; been playing</strong> &mdash; Subject <em>you</em> takes <strong>Have</strong> + subject + <strong>been</strong> + V-ing?'
            },
            {
                noNum: true,
                text: '4. Seeing George all dirty, Daddy Pig asks: &ldquo;___ George ___ (run) through the garden?&rdquo;',
                options: ['Has &hellip; been running', 'Have &hellip; been running', 'Has &hellip; been run'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>Has &hellip; been running</strong> &mdash; Subject <em>George</em> (He) takes <strong>Has</strong> + subject + <strong>been</strong> + V-ing?'
            },
            {
                noNum: true,
                text: '5. At the end, he might ask: &ldquo;___ Peppa ___ (get) herself into a mess again?&rdquo;',
                options: ['Have &hellip; been getting', 'Has &hellip; being getting', 'Has &hellip; been getting'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>Has &hellip; been getting</strong> &mdash; Subject <em>Peppa</em> (She) takes <strong>Has</strong> + subject + <strong>been</strong> + V-ing?'
            }
        ],
        exercises: [
            {
                question: 'Недавно он приехал. Насколько давно?',
                options: [
                    'He arrived 10 minutes ago.',
                    'He has arrived 10 minutes ago.',
                    'He has been arriving for 10 minutes.',
                    'A и B верны'
                ],
                correct: 0,
                explanation: 'Когда указан точный момент, используется Past Simple.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Дополните: "They __ __ working on this project for hours."',
                options: [
                    'have, been',
                    'has, been',
                    'are, being',
                    'is, working'
                ],
                correct: 0,
                explanation: 'Present Perfect Continuous: have/has + been + V+ing.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильное предложение:',
                options: [
                    'She has been studying for two hours.',
                    'She has studying for two hours.',
                    'She been studying for two hours.',
                    'She is studied for two hours.'
                ],
                correct: 0,
                explanation: 'Present Perfect Continuous: has been studying.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите отрицание:',
                options: [
                    'I have not been waiting.',
                    'I haven\'t been waiting.',
                    'Оба варианта верны.',
                    'Ни один не верен.'
                ],
                correct: 2,
                explanation: 'Оба варианта - have not been / haven\'t been - верны.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Дополните: "He __ not __ playing tennis."',
                options: [
                    'has, been',
                    'have, been',
                    'is, been',
                    'has, be'
                ],
                correct: 0,
                explanation: 'С "he": has not been.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Какой вопрос грамматически верен?',
                options: [
                    'How long you have been working?',
                    'How long have you been working?',
                    'How long has you been working?',
                    'How long you been working?'
                ],
                correct: 1,
                explanation: 'Present Perfect Continuous вопрос: Have/Has + подлежащее + been + V+ing?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Завершите: "__ she __ living here for years?"',
                options: [
                    'Does, been',
                    'Have, been',
                    'Has, been',
                    'Is, been'
                ],
                correct: 2,
                explanation: 'С "she": Has she been living?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Выберите правильное выражение длительности:',
                options: [
                    'They have been running for 30 minutes.',
                    'They have been running since 30 minutes.',
                    'They running for 30 minutes.',
                    'They are been running for 30 minutes.'
                ],
                correct: 0,
                explanation: 'Present Perfect Continuous: have been + V+ing + for/since + длительность.',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Дополните: "She __ __ reading the book all day."',
                options: [
                    'has, been',
                    'is, been',
                    'have, being',
                    'does, be'
                ],
                correct: 0,
                explanation: 'С "she": has been reading.',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Найдите ошибку в предложении:',
                options: [
                    'We have been waiting for two hours.',
                    'I haven\'t been sleeping well.',
                    'They have been working hard.',
                    'He has been studies mathematics.'
                ],
                correct: 3,
                explanation: 'Ошибка: "has been studies" должно быть "has been studying".',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Какой вариант содержит ошибку?',
                options: [
                    'She has been waiting for an hour.',
                    'They have not been listening to me.',
                    'We have been living here for years.',
                    'He hasn\'t been finishing his work.'
                ],
                correct: 3,
                explanation: '"Finishing" - неправильное слово. Должно быть "finished" (Past Participle).',
                difficulty: 'hard',
                sentenceForm: 'negative'
            },
            {
                question: 'Какой вопрос требует ответа "Yes, I have"?',
                options: [
                    'Are you working today?',
                    'Have you been working all day?',
                    'Have you working today?',
                    'Has you been working?'
                ],
                correct: 1,
                explanation: '"Have you been working?" = "Yes, I have (been working)."',
                difficulty: 'hard',
                sentenceForm: 'question'
            },
            {
                question: 'Выберите правильное использование since/for:',
                options: [
                    'I have been working since 8 hours.',
                    'I have been working for 8 hours.',
                    'I have been working since hours.',
                    'I have been working for morning.'
                ],
                correct: 1,
                explanation: 'for + длительность (8 hours); since + начало точки (8 o\'clock).',
                difficulty: 'hard',
                sentenceForm: 'positive'
            },
            {
                question: 'Дополните: "How long __ they __ __ in Paris?"',
                options: [
                    'have, been, staying',
                    'has, been, staying',
                    'do, staying, be',
                    'are, being, stay'
                ],
                correct: 0,
                explanation: 'Present Perfect Continuous: have they been staying?',
                difficulty: 'hard',
                sentenceForm: 'question'
            },
            {
                question: 'Какой вариант выражает действие, которое началось в прошлом и продолжается?',
                options: [
                    'She worked all day.',
                    'She was working all day.',
                    'She has been working all day.',
                    'She will work all day.'
                ],
                correct: 2,
                explanation: '"Has been working" подчеркивает, что действие началось и продолжается сейчас.',
                difficulty: 'hard',
                sentenceForm: 'positive'
            }
        ]
    },

    'past-simple': {
        title: 'Past Simple',
        russian: 'Прошедшее простое',
        videoFile:  'past simple video 1.mp4',
        videoFile2: 'past simple video 2.mp4',
        videoFile3: 'past simple 3.1.mp4',
        videoQuiz1: [
            {
                text: 'Is Joey proposing to Rachel right now?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'No — the proposal is not happening <em>right now</em>. The conversation is about something that <strong>already happened</strong> in the past.'
            },
            {
                text: 'Are Ross and Rachel talking about something that happened earlier?',
                options: ['Yes', 'No'],
                correct: 0,
                explanation: 'Yes — they are discussing a <strong>past event</strong>. Past Simple is used for actions that were completed at a specific moment in the past.'
            },
            {
                type: 'intro',
                text: 'Look at the sentence: <em>&ldquo;You were down on one knee.&rdquo;</em>'
            },
            {
                text: 'Is Joey still on one knee right now, or is that action finished?',
                options: ["It's finished", 'He is still on one knee'],
                correct: 0,
                explanation: 'The action is <strong>finished</strong>. Past Simple describes completed actions — they started and ended in the past.'
            },
            {
                type: 'intro',
                text: 'Look at the dialogue:<br><br><em>Ross: &ldquo;Did you propose to her?&rdquo;<br>Joey: &ldquo;No.&rdquo;<br>Rachel: &ldquo;Yes, you did.&rdquo;<br>Joey: &ldquo;Actually, technically, I didn&rsquo;t.&rdquo;<br>Rachel: &ldquo;Well, then, why did you give me a ring?&rdquo;</em>'
            },
            {
                text: 'Are they talking about a general habit<br>(Joey proposes to Rachel and gives her a ring every day)<br>or one specific moment in the past?',
                options: ['Joey proposes every day', 'One specific moment in the past'],
                correct: 1,
                explanation: 'Past Simple refers to a <strong>specific moment</strong> in the past — not a habit or routine.'
            },
            {
                type: 'intro',
                text: 'Look at the verb <strong>proposed</strong> in the sentence: <em>&ldquo;He got down on one knee and he proposed.&rdquo;</em>'
            },
            {
                text: 'What letters do we add to the end?',
                options: ['sed', 'ed', 'd'],
                correct: 1,
                explanation: 'When we make a positive statement in the past, <strong>regular verbs</strong> change to the past form by adding <strong>“-ed”</strong> to the end.'
            },
            {
                text: 'Look at the verbs <strong>gave</strong> and <strong>got</strong> in:<br><em>&ldquo;He gave her a ring. He got down on one knee.&rdquo;</em><br>Do these verbs end in “-ed”?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: '<strong>Irregular verbs</strong> do not follow the “-ed” rule. “Give” and “get” change their form completely: give → <strong>gave</strong>, get → <strong>got</strong>.'
            },
            {
                text: 'Look at the verbs <strong>fell</strong>, <strong>went</strong>, <strong>thought</strong>, <strong>said</strong> in the dialogue:<br><em>&ldquo;The ring fell on the floor. And I went down to pick it up and you thought I was proposing.&rdquo;</em><br><em>&ldquo;But you said ‘Will you marry me?’&rdquo;</em><br>Do these verbs end in “-ed”?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'When we make a positive statement in the past, <strong>irregular verbs</strong> change completely: fall → <strong>fell</strong>, go → <strong>went</strong>, think → <strong>thought</strong>, say → <strong>said</strong>.'
            }
        ],
        grammarBank1: {
            title: 'Past Simple — Positive',
            intro: 'We use the past simple for <strong>finished actions</strong> that happened in the past.<br><br>Word order: <strong>SV2</strong> = Subject + verb in past form<br><br><strong>Regular verbs</strong> end in <strong>‑ed</strong>: work<strong>ed</strong>, live<strong>d</strong>, propos<strong>ed</strong>, travel<strong>led</strong><br><br><strong>Irregular verbs</strong> change form completely: give → <strong>gave</strong> &nbsp; fall → <strong>fell</strong> &nbsp; get → <strong>got</strong> &nbsp; say → <strong>said</strong>',
            structure: 'Past Simple is the <strong>same for all persons</strong>',
            examples: [
                'I / You <strong>proposed</strong>',
                'He / She / It <strong>proposed</strong>',
                'We / They <strong>proposed</strong>'
            ]
        },
        videoQuiz1b: [
            { type: 'intro', text: '<strong>Practice — Affirmative:</strong> Choose the correct past simple form.' },
            {
                text: 'The ring ______ on the floor during the scene.',
                options: ['fall', 'falled', 'fell'],
                correct: 2, wrongOnly: true,
                explanation: '<em>Fall</em> is irregular: fall → <strong>fell</strong>. It does not take -ed.'
            },
            {
                text: 'The man ______ down to pick it up.',
                options: ['go', 'went', 'goed'],
                correct: 1, wrongOnly: true,
                explanation: '<em>Go</em> is irregular: go → <strong>went</strong>. It does not take -ed.'
            },
            {
                text: 'The woman ______ that he wanted to marry her.',
                options: ['think', 'thought', 'thinks'],
                correct: 1, wrongOnly: true,
                explanation: '<em>Think</em> is irregular: think → <strong>thought</strong>. It does not take -ed.'
            },
            {
                text: 'He ______ her the ring by accident.',
                options: ['give', 'gived', 'gave'],
                correct: 2, wrongOnly: true,
                explanation: '<em>Give</em> is irregular: give → <strong>gave</strong>. It does not take -ed.'
            },
            {
                text: 'The other man ______ if he proposed to her.',
                options: ['ask', 'asked', 'asks'],
                correct: 1, wrongOnly: true,
                explanation: '<em>Ask</em> is regular: ask → <strong>asked</strong> (+ ed).'
            },
            {
                text: 'The guy ______ down on one knee.',
                options: ['get', 'got', 'getted'],
                correct: 1, wrongOnly: true,
                explanation: '<em>Get</em> is irregular: get → <strong>got</strong>. It does not take -ed.'
            },
            {
                text: 'She ______ that he said “Will you marry me?”.',
                options: ['say', 'sayed', 'said'],
                correct: 2, wrongOnly: true,
                explanation: '<em>Say</em> is irregular: say → <strong>said</strong>. It does not take -ed.'
            },
            {
                text: 'The situation ______ very complicated.',
                options: ['look', 'looked', 'looks'],
                correct: 1, wrongOnly: true,
                explanation: '<em>Look</em> is regular: look → <strong>looked</strong> (+ ed).'
            },
            {
                text: 'The friend ______ surprised by the news.',
                options: ['be', 'is', 'was'],
                correct: 2, wrongOnly: true,
                explanation: '<em>Be</em> is irregular: be → <strong>was</strong> (singular). It does not take -ed.'
            },
            {
                text: 'Everything ______ so fast in that room.',
                options: ['happen', 'happens', 'happened'],
                correct: 2, wrongOnly: true,
                explanation: '<em>Happen</em> is regular: happen → <strong>happened</strong> (+ ed).'
            }
        ],
        videoQuiz1c: [
            {
                text: 'When Joey wants to say &ldquo;he did not propose,&rdquo; what word does he add to &ldquo;did&rdquo;?',
                options: ['not', 'no'],
                correct: 0,
                explanation: 'In negative Past Simple we use <strong>did + not</strong> (= didn\'t) before the infinitive.'
            },
            {
                type: 'intro',
                text: 'Compare two sentences: <em>&ldquo;He proposed to me&rdquo;</em> vs <em>&ldquo;No, I didn\'t propose to her&rdquo;</em>.'
            },
            {
                text: 'Do we add &ldquo;-ed&rdquo; to the verb in negative past simple sentences?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'No! In the negative form we use <strong>didn\'t + infinitive</strong> (base form). No &ldquo;-ed&rdquo; is added to the main verb.'
            },
            {
                type: 'intro',
                text: 'Focus on the lines:<br><em>Ross: Did you propose to her?<br>Joey: I didn\'t propose. I did not ask her.</em>'
            },
            {
                text: 'To ask a question about the past, what word did Ross use at the beginning of the sentence?',
                options: ['Does', 'Did'],
                correct: 1,
                explanation: 'In Past Simple questions we use <strong>Did</strong> as the auxiliary verb at the start of the sentence.'
            },
            {
                text: 'When we use &ldquo;did&rdquo; or &ldquo;didn\'t,&rdquo;<br>does the main verb change into the past form,<br>or does it stay in the base/present form?',
                options: ['It stays in the infinitives form.', 'It changes into the past form'],
                correct: 0,
                explanation: 'The main verb stays in the <strong>infinitive (base) form</strong>. The auxiliary &ldquo;did/didn\'t&rdquo; already shows the past tense.'
            },
            {
                type: 'intro',
                text: 'Focus on the lines:<br><em>&ldquo;Ross: Did you propose to her?<br>Joey: No<br>Rachel: Yes, you did.<br>Joey: No, I didn\'t.&rdquo;</em>'
            },
            {
                text: 'To agree, what shorter version does Rachel use?',
                options: ['Yes, you did.', 'No, I didn\'t.'],
                correct: 0,
                explanation: '<strong>Yes, you did.</strong> — a short affirmative answer using the auxiliary &ldquo;did&rdquo;.'
            },
            {
                text: 'To disagree, what shorter version does Joey use?',
                options: ['Yes, you did.', 'No, I didn\'t.'],
                correct: 1,
                explanation: '<strong>No, I didn\'t.</strong> — a short negative answer using the contraction &ldquo;didn\'t&rdquo;.'
            }
        ],
        grammarBank1b: {
            blocks: [
                {
                    intro: 'We only use the past forms of verbs in <strong>positive</strong> sentences.<br>In <strong>negative</strong> sentences we use <strong>didn\'t + infinitive</strong>.<br>The word order in negative past simple sentences is <strong>SAI</strong> (Subject + auxiliary verb + infinitive)<br>Contraction: <strong>did not = didn\'t</strong>',
                    examples: [
                        'I didn\'t say anything.',
                        'He didn\'t propose.',
                        'They didn\'t come.'
                    ]
                },
                {
                    intro: 'The word order in <strong>interrogative</strong> past simple sentences is <strong>ASI</strong> (Auxiliary verb + subject + infinitive?)',
                    examples: [
                        'Did I say something?',
                        'Did he propose?',
                        'Did they come?'
                    ]
                }
            ]
        },
        videoQuiz1d: [
            { type: 'intro', text: '<strong>Practice — Negative:</strong> Choose the correct negative past simple form.' },
            {
                text: 'The man insisted that he ___ to marry her.',
                options: ['didn\'t ask', 'didn\'t asked', 'not asked'],
                correct: 0, wrongOnly: true,
                explanation: 'Negative Past Simple: <strong>didn\'t + infinitive</strong>. &ldquo;ask&rdquo; stays in base form.'
            },
            {
                text: 'Actually, he ___ to propose at all.',
                options: ['didn\'t mean', 'didn\'t meant', 'not mean'],
                correct: 0, wrongOnly: true,
                explanation: '<strong>didn\'t + infinitive</strong>. &ldquo;mean&rdquo; stays in base form.'
            },
            {
                text: 'They ___ why he was on one knee at first.',
                options: ['didn\'t understood', 'didn\'t understand', 'wasn\'t understand'],
                correct: 1, wrongOnly: true,
                explanation: '<strong>didn\'t + infinitive</strong>. &ldquo;understand&rdquo; stays in base form — never &ldquo;understood&rdquo; after didn\'t.'
            },
            {
                text: 'The woman ___ that it was just an accident.',
                options: ['didn\'t knew', 'didn\'t know', 'not knew'],
                correct: 1, wrongOnly: true,
                explanation: '<strong>didn\'t + infinitive</strong>. &ldquo;know&rdquo; stays in base form.'
            },
            {
                text: 'The man ___ the ring on purpose.',
                options: ['didn\'t drop', 'didn\'t dropped', 'wasn\'t drop'],
                correct: 0, wrongOnly: true,
                explanation: '<strong>didn\'t + infinitive</strong>. &ldquo;drop&rdquo; stays in base form.'
            },
            { type: 'intro', text: '<strong>Practice — Interrogative:</strong> Choose the correct interrogative past simple form.' },
            {
                text: '&ldquo;___ he ___ to her?&rdquo; the friend asked.',
                options: ['Does / propose', 'Did / proposed', 'Did / propose'],
                correct: 2, wrongOnly: true,
                explanation: 'Past Simple question: <strong>Did + subject + infinitive</strong>. The verb stays in base form.'
            },
            {
                text: '&ldquo;___ you ___ me a ring?&rdquo; she asked.',
                options: ['Did / give', 'Did / gave', 'Gived / you'],
                correct: 0, wrongOnly: true,
                explanation: '<strong>Did + subject + infinitive</strong>. &ldquo;give&rdquo; stays in base form.'
            },
            {
                text: '&ldquo;___ the ring ___ on the floor?&rdquo; he explained.',
                options: ['Did / fell', 'Did / fall', 'Was / fall'],
                correct: 1, wrongOnly: true,
                explanation: '<strong>Did + subject + infinitive</strong>. &ldquo;fall&rdquo; stays in base form.'
            },
            {
                text: '___ the man ___ angry during the talk?',
                options: ['Did / look', 'Did / looked', 'Looked / he'],
                correct: 0, wrongOnly: true,
                explanation: '<strong>Did + subject + infinitive</strong>. &ldquo;look&rdquo; stays in base form.'
            },
            {
                text: '___ the woman ___ shocked in the end?',
                options: ['Did / looks', 'Was / looked', 'Did / look'],
                correct: 2, wrongOnly: true,
                explanation: '<strong>Did + subject + infinitive</strong>. &ldquo;look&rdquo; stays in base form.'
            }
        ],
        videoQuiz2: [
            {
                text: 'Did all these events (delivering vegetables, finding the baby, giving a bath) happen at the same time, or one after another?',
                options: ['one after another', 'happen at the same time'],
                correct: 0,
                explanation: 'Past Simple is used to describe a <strong>series of actions or events occurring one after another</strong> in the past. Each action was completed before the next one began.'
            },
            {
                text: 'What happened first: finding the panda or giving the bath?',
                options: ['Giving the bath', 'Finding the panda'],
                correct: 1,
                explanation: 'We use Past Simple for the <strong>series of actions and events occurring one after another</strong>.'
            },
            {
                text: 'Is Mr. Ping still giving the baby a bath, or is that part of the finished story?',
                options: ['Finished to give the baby the bath', 'still giving the baby a bath'],
                correct: 0,
                explanation: 'That part of the story is <strong>finished</strong>. Past Simple always describes <em>completed</em> actions — the action started and ended in the past.'
            }
        ],
        grammarBank2: {
            title: 'Past Simple — Sequence of Actions',
            intro: 'We use the past simple for <strong>finished actions that happened more than once in the past</strong> (sequence of actions).',
            structure: '',
            examples: [
                'First I washed the vegetables and peeled them.',
                'Then I chopped the carrots, sliced the cucumbers, and minced the garlic.'
            ]
        },
        videoQuiz2b: [
            { type: 'intro', text: '<strong>Practice Video 2:</strong> Choose the correct answer.' },
            {
                text: 'Mr. Ping says:<br>&ldquo;I went out... there were no radishes... I waited.&rdquo;<br>Did these things happen at the same time?',
                options: ['Yes, they all happened simultaneously.', 'No, they happened one after another.', 'No, he is doing all this right now.'],
                correct: 1, wrongOnly: true,
                explanation: 'Past Simple describes actions that happened <strong>one after another</strong> — not simultaneously.'
            },
            {
                text: 'When the man says &ldquo;I brought you inside, fed you, gave you a bath&rdquo;, which action happened first?',
                options: ['Bringing the panda inside.', 'Feeding the panda.', 'Giving a bath.'],
                correct: 0, wrongOnly: true,
                explanation: '<strong>Bringing the panda inside</strong> came first — the actions are listed in sequence.'
            },
            {
                text: '&ldquo;I brought you inside&rdquo;<br>→ &ldquo;Fed you&rdquo;<br>→ &ldquo;Gave you a bath&rdquo;<br>Why is Past Simple used for all these actions?',
                options: ['Because the actions are still continuing now.', 'Because it is a completed sequence of events in the past.', 'Because the order of actions doesn\'t matter.'],
                correct: 1, wrongOnly: true,
                explanation: 'Past Simple is used because it is a <strong>completed sequence of events in the past</strong>.'
            },
            {
                text: 'When he says &ldquo;I waited for someone... but no one did [come]&rdquo;,<br>does he mean he is still waiting?',
                options: ['Yes, he is waiting for the parents to show up now.', 'No, the period started and finished in the past.', 'He plans to wait again tomorrow.'],
                correct: 1, wrongOnly: true,
                explanation: 'No — the period <strong>started and finished in the past</strong>. Past Simple is always completed.'
            }
        ],
        videoQuiz3: [
            {
                type: 'intro', num: 1,
                text: 'Look at the sentences:<br><em>&ldquo;I was a baby.&rdquo;</em><br><em>&ldquo;In the olden days you were a baby, too, Peppa.&rdquo;</em>'
            },
            {
                subLetter: 'a',
                text: 'Do they describe an action or a quality?',
                options: ['An action', 'A quality'],
                correct: 1,
                explanation: 'We use <strong>&ldquo;to be&rdquo;</strong> verbs (was, were) in past form to describe <strong>qualities and characteristics</strong> like age, colour, place, identity, or a state that were true in the past.'
            },
            {
                subLetter: 'b',
                text: 'Do these characteristics refer to past, present or future?',
                options: ['to present', 'to past', 'to future'],
                correct: 1
            },
            {
                subLetter: 'c',
                text: 'Do the &ldquo;to be&rdquo; verbs in past change their form according to the subjects?',
                options: ['Yes', 'No'],
                correct: 0,
                explanation: 'In Past Simple <strong>&ldquo;to be&rdquo;</strong> verbs change according to the subject:<br><br><table style="border-collapse:collapse;font-size:0.93rem;"><tr><td style="padding:2px 16px 2px 0;font-weight:600;color:#e2b714;">I</td><td><strong>was</strong></td></tr><tr><td style="padding:2px 16px 2px 0;font-weight:600;color:#e2b714;">You</td><td><strong>were</strong></td></tr><tr><td style="padding:2px 16px 2px 0;font-weight:600;color:#e2b714;">He / She / It</td><td><strong>was</strong></td></tr><tr><td style="padding:2px 16px 2px 0;font-weight:600;color:#e2b714;">We / They</td><td><strong>were</strong></td></tr></table>'
            },
            {
                type: 'intro', num: 2,
                text: 'Reorder the words to make sentences:'
            },
            {
                type: 'drag', subLetter: 'a',
                text: 'Put the words in correct order:',
                words: ['was', 'I', 'a baby.'],
                correct: 'I was a baby.'
            },
            {
                type: 'drag', subLetter: 'b',
                text: 'Put the words in correct order:',
                words: ['a baby,', 'too.', 'You', 'were'],
                correct: 'You were a baby, too.'
            },
            {
                text: 'Do we use verbs after &ldquo;was/were&rdquo; in Past Simple to describe qualities and states?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'We do <strong>not</strong> use verbs after <strong>was, were</strong> in Past Simple. We use other words that describe qualities and characteristics like age, colour, place, identity, or a state.'
            },
            {
                text: 'Choose the correct sentence:',
                options: ['I was a baby.', 'I was cry.'],
                correct: 0
            },
            {
                type: 'intro', num: 5,
                text: 'Now look at negative sentences:<br><em>&ldquo;No, I was not a baby.&rdquo; &nbsp; &ldquo;And you were not a baby, too.&rdquo;</em>'
            },
            {
                subLetter: 'a',
                text: 'Where do we put &ldquo;not&rdquo; in the sentence to make negative sentences?',
                options: ['before the to be verb (not was, not were)', 'after the to be verb (was not, were not)'],
                correct: 1,
                explanation: 'We put <strong>&ldquo;not&rdquo;</strong> <strong>after</strong> the verb &ldquo;to be&rdquo; to make negatives: <em>was not, were not</em>.'
            },
            {
                type: 'drag', subLetter: 'b',
                text: 'Put the words in correct order:',
                words: ['not', 'I', 'a baby.', 'was'],
                correct: 'I was not a baby.'
            },
            {
                type: 'drag', subLetter: 'c',
                text: 'Put the words in correct order:',
                words: ['You', 'not', 'were', 'a baby.'],
                correct: 'You were not a baby.'
            },
            {
                type: 'intro', num: 7,
                text: 'Look at the dialogue:<br><em>&ldquo;Were you a baby in the olden days?&rdquo;</em><br><em>&ldquo;No, I was not a baby in the olden days.&rdquo;</em>'
            },
            {
                subLetter: 'a',
                text: 'What word starts the question?',
                options: ['was / were', 'am / is / are'],
                correct: 0,
                explanation: 'To make interrogative sentences with <strong>to be</strong> verbs we start the question with <strong>Was / Were</strong>.<br>Example: <em>Were we babies? &nbsp; Was she a baby, too?</em>'
            },
            {
                subLetter: 'b',
                text: 'Where is the subject in the question?',
                options: ['before auxiliary verb', 'after auxiliary verb'],
                correct: 1
            },
            {
                type: 'intro', num: 8,
                text: 'Put the words in correct order:'
            },
            {
                type: 'drag', subLetter: 'a',
                text: 'Put the words in correct order:',
                words: ['you', 'Were', 'a baby', 'in the olden days?'],
                correct: 'Were you a baby in the olden days?'
            },
            {
                type: 'drag', subLetter: 'b',
                text: 'Put the words in correct order:',
                words: ['Was', 'in the olden days?', 'a baby', 'she'],
                correct: 'Was she a baby in the olden days?',
                explanation: 'The word order for interrogatives with <strong>to be</strong> verbs in Past Simple is <strong>ASI</strong> = Auxiliary verb + Subject + quality words?'
            }
        ],
        grammarBank3: {
            blocks: [
                {
                    intro: '<strong>AFFIRMATIVE</strong><br>In English, the verbs <strong>was</strong> and <strong>were</strong> are used to talk about a <strong>past state or quality</strong>. Verbs to be change according to subjects.<br><br><strong>was</strong> &mdash; &ldquo;I&rdquo; and 3rd person singular<br><strong>were</strong> &mdash; two or more people and &ldquo;you&rdquo;',
                    table: [
                        ['I', 'was'],
                        ['You', 'were'],
                        ['He / She / It', 'was'],
                        ['We / They', 'were']
                    ],
                    examples: [
                        'I <strong>was</strong> a baby.',
                        'He <strong>was</strong> a pilot.',
                        'They <strong>were</strong> friends.'
                    ]
                },
                {
                    intro: '<strong>NEGATIVE</strong><br>We make negative sentences by adding <strong>not</strong> to &ldquo;was, were&rdquo;.<br>Contractions: <strong>was not = wasn&rsquo;t</strong> &nbsp; <strong>were not = weren&rsquo;t</strong>',
                    examples: [
                        'I <strong>wasn&rsquo;t</strong> a student.',
                        'He <strong>wasn&rsquo;t</strong> a pilot.',
                        'They <strong>weren&rsquo;t</strong> friends.'
                    ]
                },
                {
                    intro: '<strong>INTERROGATIVE</strong><br>Questions start with <strong>Was / Were</strong>.<br><br><em>&ldquo;was, were&rdquo;</em> are the past form of <em>&ldquo;am, is, are&rdquo;</em>',
                    examples: [
                        '<strong>Was</strong> I a student?',
                        '<strong>Was</strong> he a pilot?',
                        '<strong>Were</strong> they friends?'
                    ]
                }
            ]
        },
        videoQuiz3b: [
            { type: 'intro', text: '<strong>Practice — Affirmative:</strong> Choose the correct form.' },
            { text: 'Susie ___ a baby in the old photo.', options: ['was', 'were'], correct: 0, wrongOnly: true, explanation: 'Susie = she (3rd person singular) &rarr; <strong>was</strong>.' },
            { text: 'The photo ___ very cute.', options: ['was', 'were'], correct: 0, wrongOnly: true, explanation: 'The photo = it (3rd person singular) &rarr; <strong>was</strong>.' },
            { text: 'Peppa and Susie ___ friends many years ago too.', options: ['was', 'were'], correct: 1, wrongOnly: true, explanation: 'Peppa and Susie = they (plural) &rarr; <strong>were</strong>.' },
            { text: '&ldquo;It ___ me!&rdquo; said Susie about the baby in the picture.', options: ['was', 'were'], correct: 0, wrongOnly: true, explanation: 'It (3rd person singular) &rarr; <strong>was</strong>.' },
            { text: 'The grass in the photo ___ green.', options: ['was', 'were'], correct: 0, wrongOnly: true, explanation: 'The grass = it (3rd person singular) &rarr; <strong>was</strong>.' },
            { text: 'Peppa&rsquo;s dress ___ red in the olden days.', options: ['was', 'were'], correct: 0, wrongOnly: true, explanation: 'Peppa&rsquo;s dress = it (3rd person singular) &rarr; <strong>was</strong>.' },
            { text: 'You ___ a baby too, Peppa!', options: ['was', 'were'], correct: 1, wrongOnly: true, explanation: 'You &rarr; <strong>were</strong>.' },
            { text: 'The characters ___ smaller in the past.', options: ['was', 'were'], correct: 1, wrongOnly: true, explanation: 'The characters = they (plural) &rarr; <strong>were</strong>.' },
            { text: 'Mommy Pig ___ at the computer.', options: ['was', 'were'], correct: 0, wrongOnly: true, explanation: 'Mommy Pig = she (3rd person singular) &rarr; <strong>was</strong>.' },
            { text: 'The flowers in the garden ___ yellow.', options: ['was', 'were'], correct: 1, wrongOnly: true, explanation: 'The flowers = they (plural) &rarr; <strong>were</strong>.' },
            { type: 'intro', text: '<strong>Practice — Negative:</strong> Choose the correct form.' },
            { text: 'Peppa said: &ldquo;No, I ___ a baby!&rdquo;', options: ["wasn't", "weren't"], correct: 0, wrongOnly: true, explanation: 'I &rarr; <strong>wasn\'t</strong>.' },
            { text: 'The baby in the photo ___ Peppa.', options: ["wasn't", "weren't"], correct: 0, wrongOnly: true, explanation: 'The baby = it (3rd person singular) &rarr; <strong>wasn\'t</strong>.' },
            { text: 'Susie and Peppa ___ angry; they were just talking.', options: ["wasn't", "weren't"], correct: 1, wrongOnly: true, explanation: 'Susie and Peppa = they (plural) &rarr; <strong>weren\'t</strong>.' },
            { text: 'It ___ a new photo; it was an old one.', options: ["wasn't", "weren't"], correct: 0, wrongOnly: true, explanation: 'It (3rd person singular) &rarr; <strong>wasn\'t</strong>.' },
            { text: 'The parents ___ in the room at that moment.', options: ["wasn't", "weren't"], correct: 1, wrongOnly: true, explanation: 'The parents = they (plural) &rarr; <strong>weren\'t</strong>.' },
            { type: 'intro', text: '<strong>Practice — Interrogative:</strong> Choose the correct form.' },
            { text: '&ldquo;___ I really a baby?&rdquo; Peppa asked her mommy.', options: ['Was', 'Were'], correct: 0, wrongOnly: true, explanation: 'I &rarr; <strong>Was</strong>.' },
            { text: '___ Susie a baby sheep in the picture?', options: ['Was', 'Were'], correct: 0, wrongOnly: true, explanation: 'Susie = she (3rd person singular) &rarr; <strong>Was</strong>.' },
            { text: '___ they happy to look at old photos?', options: ['Was', 'Were'], correct: 1, wrongOnly: true, explanation: 'They (plural) &rarr; <strong>Were</strong>.' },
            { text: '___ the photo in Susie&rsquo;s hands?', options: ['Was', 'Were'], correct: 0, wrongOnly: true, explanation: 'The photo = it (3rd person singular) &rarr; <strong>Was</strong>.' },
            { text: '___ you surprised by the old photo, Peppa?', options: ['Was', 'Were'], correct: 1, wrongOnly: true, explanation: 'You &rarr; <strong>Were</strong>.' }
        ],
        structure: 'V2 (правильные и неправильные глаголы)',
        usage: [
            'Действие произошло и закончилось в прошлом',
            'Последовательные события в прошлом',
            'Исторические события'
        ],
        rules: [
            { type: 'Утверждение правильные', example: 'I worked yesterday.' },
            { type: 'Утверждение неправильные', example: 'I went yesterday.' },
            { type: 'Отрицание', example: 'She didn\'t call me.' },
            { type: 'Вопрос', example: 'Did you see him?' }
        ],
        examples: [
            {
                source: 'Back to the Future',
                dialogue: '"I came back in time."',
                translation: 'Я вернулся во времени.'
            }
        ],
        exercises: [
            {
                question: 'Выберите правильную форму Past Simple:',
                options: [
                    'I goed to the store.',
                    'I went to the store.',
                    'I goes to the store.',
                    'I am going to the store.'
                ],
                correct: 1,
                explanation: '"Go" - неправильный глагол. Past Simple: went.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Дополните: "She __ breakfast this morning."',
                options: [
                    'eat',
                    'eaten',
                    'ate',
                    'eats'
                ],
                correct: 2,
                explanation: 'Правильный глагол в Past Simple: eat → ate.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильное предложение:',
                options: [
                    'They play football yesterday.',
                    'They played football yesterday.',
                    'They are playing football yesterday.',
                    'They have played football yesterday.'
                ],
                correct: 1,
                explanation: 'Past Simple для действия, которое произошло вчера: played.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите отрицание в Past Simple:',
                options: [
                    'He not worked yesterday.',
                    'He didn\'t work yesterday.',
                    'He doesn\'t work yesterday.',
                    'He wasn\'t working yesterday.'
                ],
                correct: 1,
                explanation: 'Отрицание в Past Simple: did + not + базовая форма глагола.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Дополните отрицание: "I __ see him at the party."',
                options: [
                    'did not',
                    'did',
                    'was not',
                    'were not'
                ],
                correct: 0,
                explanation: 'Отрицание: did not see.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Какой вопрос грамматически верен?',
                options: [
                    'Did you went to the cinema?',
                    'Did you go to the cinema?',
                    'You went to the cinema?',
                    'Did you going to the cinema?'
                ],
                correct: 1,
                explanation: 'Вопрос в Past Simple: Did + подлежащее + базовая форма глагола?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Завершите вопрос: "What __ she __ last weekend?"',
                options: [
                    'did, do',
                    'does, do',
                    'did, did',
                    'does, did'
                ],
                correct: 0,
                explanation: 'Past Simple вопрос: Did she do...?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Выберите правильное использование неправильных глаголов:',
                options: [
                    'He writed the letter.',
                    'He wrote the letter.',
                    'He writes the letter.',
                    'He was writing the letter.'
                ],
                correct: 1,
                explanation: '"Write" - неправильный глагол. Past form: wrote.',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Найдите ошибку в предложении:',
                options: [
                    'We visited Paris last summer.',
                    'They spent all day at the beach.',
                    'She did not came to the meeting.',
                    'I saw him yesterday.'
                ],
                correct: 2,
                explanation: 'Ошибка: "did not came" должно быть "did not come".',
                difficulty: 'medium',
                sentenceForm: 'negative'
            },
            {
                question: 'Какой вариант верен?',
                options: [
                    'How much money did they spent?',
                    'How much money did they spend?',
                    'How much money they spent?',
                    'How much money did spend they?'
                ],
                correct: 1,
                explanation: 'Past Simple вопрос: did + подлежащее + базовая форма (spend).',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Какой вариант содержит ошибку?',
                options: [
                    'They did not understand the problem.',
                    'He didn\'t remember his name.',
                    'We didn\'t returned home on time.',
                    'I didn\'t know the answer.'
                ],
                correct: 2,
                explanation: 'Ошибка: "didn\'t returned" должно быть "didn\'t return".',
                difficulty: 'hard',
                sentenceForm: 'negative'
            },
            {
                question: 'Выберите правильное выражение прошедшего времени:',
                options: [
                    'They finished the project and left.',
                    'They have finished the project and left.',
                    'They finish the project and left.',
                    'They are finishing the project and leaving.'
                ],
                correct: 0,
                explanation: 'Past Simple для последовательных действий: finished...left.',
                difficulty: 'hard',
                sentenceForm: 'positive'
            },
            {
                question: 'Какой вопрос требует ответа "No, I didn\'t"?',
                options: [
                    'Do you like pizza?',
                    'Does he work here?',
                    'Did you call me yesterday?',
                    'Are you learning English?'
                ],
                correct: 2,
                explanation: '"Did you call...?" требует ответа "No, I did not (didn\'t)."',
                difficulty: 'hard',
                sentenceForm: 'question'
            },
            {
                question: 'Дополните: "She __ __ to Paris twice in her life."',
                options: [
                    'went, was',
                    'did, go',
                    'has, been',
                    'was, going'
                ],
                correct: 2,
                explanation: 'Это Present Perfect, не Past Simple - обозначает жизненный опыт.',
                difficulty: 'hard',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильный порядок слов в Past Simple вопросе:',
                options: [
                    'When did you arrive at the station?',
                    'When you did arrive at the station?',
                    'You did arrive when at the station?',
                    'When arrive did you at the station?'
                ],
                correct: 0,
                explanation: 'Past Simple вопрос: Вопросное слово + did + подлежащее + глагол?',
                difficulty: 'hard',
                sentenceForm: 'question'
            }
        ]
    },

    'past-continuous': {
        title: 'Past Continuous',
        russian: 'Прошедшее длительное',
        videoFile: 'past cont 1.1.mp4',
        videoFile2: 'past cont 2.mp4',
        videoFile3: 'past cont 3.mp4',
        structure: 'was/were + V+ing',
        usage: [
            'Действие продолжалось в определенный момент в прошлом',
            'Два действия: одно прерывалось другим',
            'Фоновые действия в рассказе'
        ],
        rules: [
            { type: 'Утверждение', example: 'I was reading when you called.' },
            { type: 'Отрицание', example: 'They weren\'t sleeping.' },
            { type: 'Вопрос', example: 'What were you doing?' }
        ],
        examples: [
            {
                source: 'Jaws',
                dialogue: '"We were drinking rum and singing."',
                translation: 'Мы пили ром и пели.'
            }
        ],
        videoQuiz1: [
            {
                type: 'intro',
                text: 'Look at Rachel\'s lines:<br><em>&ldquo;We were saying goodbye. Well, we were shaking our hands. And he kind of leaned towards me, you know, maybe he was going to open the door, but I totally misread him.&rdquo;</em>'
            },
            {
                noNum: true,
                text: '1. Are they shaking their hands right now?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'Rachel is describing something that happened in the past.'
            },
            {
                noNum: true,
                text: '2. The &ldquo;saying goodbye and shaking hands&rdquo; refers to&hellip;',
                options: ['present', 'past', 'future'],
                correct: 1,
                explanation: 'Rachel is describing something that happened in the past.'
            },
            {
                noNum: true,
                text: '3. &ldquo;Saying goodbye&rdquo; happened at once or it lasted for a certain period?',
                options: ['happened at once', 'lasted for a certain time period'],
                correct: 1,
                explanation: 'They were saying goodbye and shaking hands for a couple of minutes at least. We use Past Continuous to talk about actions that were in progress in the past.<br>Example: <em>I was driving home yesterday at 2 pm.</em>'
            },
            {
                noNum: true,
                text: '4. When the interviewer leaned towards Rachel&hellip;',
                options: ['they were still shaking their hands', 'they stopped shaking their hands'],
                correct: 0,
                explanation: 'We also use Past Continuous to talk about actions that were interrupted by another action in the past.<br>Example: <em>I was washing my hands when the water suddenly stopped pouring.</em>'
            }
        ],
        grammarBank1: {
            title: 'Past Continuous',
            intro: 'We use Past Continuous to:<br><ul style="margin:8px 0 0 0;padding-left:18px;"><li>talk about actions that were in progress in past;</li><li>describe an event happened in the past;</li><li>show that one action in progress was interrupted by another short action.</li></ul>',
            structure: '',
            examples: [
                '1) We <strong>were saying</strong> goodbye and we <strong>were shaking</strong> our hands.',
                '2) It was summer. The sun <strong>was shining</strong>. The birds <strong>were singing</strong>.',
                '3) He leaned towards me when we <strong>were shaking</strong> our hands.'
            ]
        },
        videoQuiz1b: [
            { type: 'intro', text: '<strong>5. Look at the sentences:</strong><br><em>We were shaking hands. &nbsp; He was going to open the door.</em>' },
            {
                noNum: true,
                text: 'Which are the main verbs in the sentence?',
                options: ['was, were', 'shaking, going'],
                correct: 1,
                explanation: '<strong>shaking</strong> and <strong>going</strong> are the main verbs. <em>was</em> and <em>were</em> are auxiliary verbs.'
            },
            {
                noNum: true,
                type: 'fill',
                text: 'What is the ending of the main verbs in the sentences?',
                answer: 'ing',
                placeholder: 'Type here: ________',
                explanation: 'In Past Continuous we make sentences by adding <strong>-ing</strong> to the verbs.<br><em>Rachel was talkING.</em>'
            },
            {
                noNum: true,
                type: 'fill',
                text: 'What are the auxiliary verbs in Past Continuous?',
                answer: 'was, were',
                altAnswers: ['were, was'],
                placeholder: 'Type here: __________',
                explanation: 'The auxiliary verbs in Past Continuous are <strong>was</strong> and <strong>were</strong>.<br><table style="border-collapse:collapse;margin:6px 0;font-size:0.93rem;"><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">I</td><td>was sleeping</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">You</td><td>were running</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">He</td><td>was exercising</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">She</td><td>was working</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">It</td><td>was raining</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">We</td><td>were dancing</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">They</td><td>were eating</td></tr></table>'
            },
            {
                type: 'intro',
                text: '6. Put the words in correct order:'
            },
            {
                noNum: true,
                type: 'drag',
                text: 'Rachel / about her interview. / talking / was',
                words: ['Rachel', 'was', 'talking', 'about her interview.'],
                correct: 'Rachel was talking about her interview.'
            },
            {
                noNum: true,
                type: 'drag',
                text: 'were / They / at midnight. / dancing',
                words: ['They', 'were', 'dancing', 'at midnight.'],
                correct: 'They were dancing at midnight.'
            }
        ],
        grammarBank1b: {
            blocks: [
                {
                    intro: 'Grammar bank:<br>The word order in positive Past Continuous sentences is <strong>SAV</strong>.<br><strong>Subject + was/were + verb(ing).</strong>',
                    table: [],
                    examples: [
                        'I <strong>was cooking</strong>.',
                        'You <strong>were studying</strong>.',
                        'It <strong>was raining</strong>.'
                    ]
                }
            ]
        },
        videoQuiz1d: [
            { type: 'intro', text: '<strong>Practice Affirmative (video 1)</strong>' },
            {
                noNum: true,
                text: '1. Rachel said that they ______ goodbye when the situation became awkward.',
                options: ['were saying', 'was saying', 'were say'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>were saying</strong> &mdash; plural subject + were + V-ing.'
            },
            {
                noNum: true,
                text: '2. At the meeting, Rachel and the man ______ hands.',
                options: ['was shaking', 'were shaking', 'were shake'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>were shaking</strong> &mdash; plural subject + were + V-ing.'
            },
            {
                noNum: true,
                text: '3. The man ______ in toward Rachel before she kissed him.',
                options: ['was leaning', 'were leaning', 'was lean'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>was leaning</strong> &mdash; singular subject + was + V-ing.'
            },
            {
                noNum: true,
                text: '4. Rachel thought the man ______ the door for her.',
                options: ['were opening', 'was open', 'was opening'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>was opening</strong> &mdash; singular subject + was + V-ing.'
            },
            {
                noNum: true,
                text: '5. While Rachel ______ her story, Joey and Chandler were listening carefully.',
                options: ['was telling', 'were telling', 'was tell'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>was telling</strong> &mdash; Rachel (she) + was + V-ing.'
            },
            {
                noNum: true,
                text: '6. In the flashback, Rachel ______ a black dress.',
                options: ['were wearing', 'was wear', 'was wearing'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>was wearing</strong> &mdash; singular subject + was + V-ing.'
            },
            {
                noNum: true,
                text: '7. Joey and Chandler ______ at the table during the conversation.',
                options: ['was sitting', 'were sitting', 'were sit'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>were sitting</strong> &mdash; plural subject + were + V-ing.'
            },
            {
                noNum: true,
                text: '8. Rachel ______ her hands a lot while she was talking.',
                options: ['was using', 'were using', 'was used'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>was using</strong> &mdash; singular subject + was + V-ing.'
            },
            {
                noNum: true,
                text: '9. Monica ______ into the room when Rachel finished her story.',
                options: ['were coming', 'was come', 'was coming'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>was coming</strong> &mdash; singular subject + was + V-ing.'
            },
            {
                noNum: true,
                text: '10. The friends ______ a quiet morning before Rachel started talking.',
                options: ['was having', 'were having', 'were have'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>were having</strong> &mdash; plural subject + were + V-ing.'
            }
        ],
        videoQuiz2: [
            {
                type: 'fill',
                text: 'Focus on the sentence: <em>&ldquo;You sure you weren&rsquo;t looking at my man Randy?&rdquo;</em><br>Which word makes this sentence negative?',
                answer: 'not',
                placeholder: 'type...',
                explanation: 'We add <strong>not</strong> to the auxiliary verbs to make negative sentences.<br>Example: <em>We were <strong>NOT</strong> looking at the boys.</em>'
            },
            {
                type: 'fill',
                text: 'Look at the word &ldquo;weren&rsquo;t&rdquo;. What is the full form of this contraction?',
                answer: 'were not',
                placeholder: 'type...',
                explanation: '<strong>weren&rsquo;t</strong> = <strong>were not</strong> &nbsp;&nbsp; <strong>wasn&rsquo;t</strong> = <strong>was not</strong>'
            },
            {
                text: '&ldquo;NOT&rdquo; in the sentence stays&hellip;',
                options: ['after auxiliary verb (was not, were not)', 'before auxiliary verb (not was, not were)'],
                correct: 0,
                explanation: 'NOT always comes <strong>after</strong> the auxiliary verb: <em>was not / were not</em> (or contractions: wasn&rsquo;t / weren&rsquo;t).'
            },
            {
                text: 'Are the forms of main verbs the same in positive and negative sentences?',
                options: ['Yes', 'No'],
                correct: 0,
                explanation: 'In Continuous tenses we always add <strong>-ing</strong> ending to the verbs in all types of sentences.<br><em>They <strong>were arguing</strong>.</em><br><em>They <strong>weren&rsquo;t arguing</strong>.</em><br><em>Were they <strong>arguing</strong>?</em>'
            },
            {
                text: 'The auxiliary verbs in Past Continuous&hellip;',
                options: ['change according to the subjects (I, You, He, etc)', 'is same for all subjects (I, You, He, etc)'],
                correct: 0,
                explanation: 'The auxiliary verbs in Past Continuous change according to the subjects.<br><table style="border-collapse:collapse;margin:6px 0;font-size:0.93rem;"><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">I</td><td>wasn&rsquo;t playing</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">You</td><td>weren&rsquo;t playing</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">He</td><td>wasn&rsquo;t playing</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">She</td><td>wasn&rsquo;t playing</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">It</td><td>wasn&rsquo;t playing</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">We</td><td>weren&rsquo;t playing</td></tr><tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#e2b714;">They</td><td>weren&rsquo;t playing</td></tr></table>'
            }
        ],
        grammarBank2: {
            blocks: [
                {
                    intro: 'The word order in <strong>negative</strong> Past Continuous sentences is <strong>SAV</strong>.<br><strong>Subject + wasn&rsquo;t/weren&rsquo;t + verb(ing)</strong><br><br>Contractions: <strong>wasn&rsquo;t</strong> = was not &nbsp;&nbsp; <strong>weren&rsquo;t</strong> = were not',
                    table: [],
                    examples: [
                        'They <strong>weren&rsquo;t looking</strong> at Randy.',
                        'She <strong>wasn&rsquo;t talking</strong> to the boys.'
                    ]
                }
            ]
        },
        videoQuiz2b: [
            { type: 'intro', text: '<strong>Choose the correct option:</strong>' },
            {
                text: 'The two girls in glasses ______ at Randy.',
                options: ['wasn\'t looking', 'weren\'t looking', 'weren\'t look'],
                correct: 1,
                wrongOnly: true,
                explanation: '"The two girls" = they (plural) &rarr; <strong>weren&rsquo;t looking</strong>. Use <em>weren&rsquo;t</em> with plural subjects; <em>wasn&rsquo;t</em> is for I/he/she/it; the verb must have <em>-ing</em>.'
            },
            {
                text: 'The girl in the blue shirt ______ to be mean.',
                options: ['wasn\'t trying', 'weren\'t trying', 'wasn\'t try'],
                correct: 0,
                wrongOnly: true,
                explanation: '"The girl" = she (3rd person singular) &rarr; <strong>wasn&rsquo;t trying</strong>. Use <em>wasn&rsquo;t</em> with he/she/it; the verb needs <em>-ing</em>.'
            },
            {
                text: 'The football team ______ the field yet, so the girls had to wait.',
                options: ['wasn\'t leaving', 'weren\'t leaving', 'wasn\'t leave'],
                correct: 0,
                wrongOnly: true,
                explanation: '"The football team" = it (singular collective) &rarr; <strong>wasn&rsquo;t leaving</strong>. Use <em>wasn&rsquo;t</em> for a singular noun; the verb needs <em>-ing</em>.'
            },
            {
                text: 'The girl in the purple top ______ a blue shirt like the others.',
                options: ['wasn\'t wear', 'weren\'t wearing', 'wasn\'t wearing'],
                correct: 2,
                wrongOnly: true,
                explanation: '"The girl" = she (3rd person singular) &rarr; <strong>wasn&rsquo;t wearing</strong>. <em>Wasn&rsquo;t wear</em> is missing <em>-ing</em>; <em>weren&rsquo;t</em> is incorrect for a singular subject.'
            },
            {
                text: 'The girls ______ at each other; they were looking at the popular girl.',
                options: ['wasn\'t looking', 'weren\'t looking', 'weren\'t look'],
                correct: 1,
                wrongOnly: true,
                explanation: '"The girls" = they (plural) &rarr; <strong>weren&rsquo;t looking</strong>. <em>Wasn&rsquo;t</em> is for singular; the verb always needs <em>-ing</em>.'
            }
        ],
        videoQuiz3: [
            {
                type: 'match',
                text: 'Focus on the question that the interviewer asks Chris: <em>&ldquo;What were you doing before you were arrested?&rdquo;</em><br>Match the verbs with their definitions:',
                pairs: [
                    { left: 'what Chris <strong>was doing</strong>', rightIdx: 0 },
                    { left: 'Chris <strong>were arrested</strong>', rightIdx: 1 }
                ],
                definitions: [
                    'i. the action in progress that was interrupted by another short action',
                    'ii. the short action that interrupted another action in progress'
                ],
                explanation: 'We also use the Past Continuous to show that one action in progress was interrupted by another short action.<br><em>Chris <strong>was painting</strong> his house when he <strong>got arrested</strong>.</em>'
            },
            {
                type: 'fill',
                text: 'What word starts the question?<br><em>&ldquo;What were you doing before you were arrested?&rdquo;</em>',
                answer: 'What',
                placeholder: 'Type here...',
                explanation: '<strong>What</strong> is a WH-question word. WH-question words stay at the beginning of interrogative sentences.<br><em>What were you doing yesterday evening?</em><br><em>What was she doing when you saw her?</em>'
            },
            {
                text: 'The auxiliary verbs in interrogative Past Continuous sentences stay&hellip;',
                options: ['before the subject &nbsp;<em>(Was I, Were you, etc.)</em>', 'after the subject &nbsp;<em>(I was, You were, etc.)</em>'],
                correct: 0,
                explanation: 'In questions the auxiliary verb comes <strong>before</strong> the subject.<br>Word order: <strong>Was/Were + subject + verb+ing?</strong>'
            },
            {
                type: 'drag',
                text: 'Put the words in the correct order:',
                words: ['John', 'Was', 'calling', 'you?'],
                correct: 'Was John calling you?'
            },
            {
                type: 'drag',
                text: 'Put the words in the correct order:',
                words: ['you', 'were', 'What', 'drawing', 'at your art lesson?'],
                correct: 'What were you drawing at your art lesson?',
                explanation: 'The word order in interrogative Past Continuous sentences is <strong>ASV</strong> (Was/Were + subject + verb+ing).<br><em>Were you dancing? &nbsp; Was he crying?</em>'
            }
        ],
        grammarBank3: {
            blocks: [
                {
                    intro: 'We also use the Past Continuous to show that one action in progress was <strong>interrupted</strong> by another short action.<br><em>I <strong>was sleeping</strong> when the door knocked.</em><br><em>My mom <strong>was still cooking</strong> dinner when I came home.</em>',
                    table: [],
                    examples: [
                        'The word order for <strong>interrogative</strong> Past Continuous sentences is <strong>ASV</strong>: Was/Were + subject + verb+ing?',
                        'WH-questions stay at the <strong>beginning</strong> of interrogative sentences.'
                    ]
                },
                {
                    intro: '<strong>Was/Were + subject + verb+ing?</strong>',
                    table: [
                        ['Was', 'I working?'],
                        ['Were', 'you working?'],
                        ['Was', 'he working?'],
                        ['Was', 'she working?'],
                        ['Was', 'it working?'],
                        ['Were', 'we working?'],
                        ['Were', 'they working?']
                    ],
                    examples: [
                        '<strong>Was</strong> I snoring when I was sleeping?',
                        'What <strong>were</strong> you talking to the teacher?'
                    ]
                }
            ]
        },
        videoQuiz3b: [
            {
                type: 'intro',
                text: `
<div class="pronunciation-box" style="display:block; margin: 10px 0 20px 0;">
    <div class="pronunciation-header">
        <span class="pronunciation-icon">🔊</span>
        <div>
            <h3 class="pronunciation-title">Pronunciation</h3>
            <p class="pronunciation-subtitle">Past Continuous Sentences</p>
        </div>
    </div>

    <div class="pron-section">
        <p class="pronunciation-listen-label">Listen and repeat the sentences.</p>
        <audio class="pronunciation-audio" controls style="margin-bottom: 15px;">
            <source src="past cont audio 1.mp3" type="audio/mpeg">
        </audio>
        <ul class="sound-sentences" style="list-style:none; padding-left:0; font-size: 1.05rem; line-height: 1.8;">
            <li style="margin-bottom: 8px; border-left: 3px solid #667eea; padding-left: 12px; background: #f0f4ff; border-radius: 4px; padding-top: 4px; padding-bottom: 4px;">I <strong>was sleeping</strong> when you called.</li>
            <li style="margin-bottom: 8px; border-left: 3px solid #667eea; padding-left: 12px; background: #f0f4ff; border-radius: 4px; padding-top: 4px; padding-bottom: 4px;">She <strong>was cooking</strong> while he <strong>was working</strong>.</li>
            <li style="margin-bottom: 8px; border-left: 3px solid #667eea; padding-left: 12px; background: #f0f4ff; border-radius: 4px; padding-top: 4px; padding-bottom: 4px;">They <strong>weren't looking</strong> at me.</li>
            <li style="margin-bottom: 8px; border-left: 3px solid #667eea; padding-left: 12px; background: #f0f4ff; border-radius: 4px; padding-top: 4px; padding-bottom: 4px;">We <strong>were walking</strong> when it started to rain.</li>
            <li style="border-left: 3px solid #667eea; padding-left: 12px; background: #f0f4ff; border-radius: 4px; padding-top: 4px; padding-bottom: 4px;">He <strong>wasn’t sleeping</strong> at that moment.</li>
        </ul>
    </div>
</div>
`
            },
            { type: 'intro', text: '<strong>Practice Interrogative &mdash; Choose the correct option:</strong>' },
            {
                text: '______ Chris ______ his apartment before he was arrested?',
                options: ['Was / painting', 'Were / painting', 'Was / paint'],
                correct: 0,
                wrongOnly: true,
                explanation: '"Chris" = he (3rd person singular) &rarr; <strong>Was</strong>; the verb needs <em>-ing</em> &rarr; <strong>painting</strong>.'
            },
            {
                text: '______ the men in suits ______ to Chris&rsquo;s story?',
                options: ['Was / listening', 'Were / listening', 'Are / listening'],
                correct: 1,
                wrongOnly: true,
                explanation: '"The men in suits" = they (plural) &rarr; <strong>Were</strong>; verb+ing &rarr; <strong>listening</strong>.'
            },
            {
                text: '______ Chris ______ his hands while he explained the situation?',
                options: ['Is / using', 'Were / using', 'Was / using'],
                correct: 2,
                wrongOnly: true,
                explanation: '"Chris" = he (singular) &rarr; <strong>Was</strong>; verb+ing &rarr; <strong>using</strong>.'
            },
            {
                text: '______ everyone ______ at the table during the interview?',
                options: ['Were / sitting', 'Was / sitting', 'Are / sitting'],
                correct: 1,
                wrongOnly: true,
                explanation: '"Everyone" is treated as singular &rarr; <strong>Was</strong>; verb+ing &rarr; <strong>sitting</strong>.'
            },
            {
                text: '______ other people ______ behind the glass?',
                options: ['Was / working', 'Were / working', 'Are / working'],
                correct: 1,
                wrongOnly: true,
                explanation: '"Other people" = they (plural) &rarr; <strong>Were</strong>; verb+ing &rarr; <strong>working</strong>.'
            },
            {
                text: '______ Chris ______ from the police station to the office?',
                options: ['Was / running', 'Were / running', 'Was / run'],
                correct: 0,
                wrongOnly: true,
                explanation: '"Chris" = he (singular) &rarr; <strong>Was</strong>; verb+ing &rarr; <strong>running</strong>.'
            },
            {
                text: '______ the interviewers ______ Chris&rsquo;s determination?',
                options: ['Was / discussing', 'Is / discussing', 'Were / discussing'],
                correct: 2,
                wrongOnly: true,
                explanation: '"The interviewers" = they (plural) &rarr; <strong>Were</strong>; verb+ing &rarr; <strong>discussing</strong>.'
            },
            {
                text: '______ Chris ______ a suit during the interview?',
                options: ['Does / wearing', 'Was / wearing', 'Were / wearing'],
                correct: 1,
                wrongOnly: true,
                explanation: '"Chris" = he (singular) &rarr; <strong>Was</strong>; verb+ing &rarr; <strong>wearing</strong>.'
            },
            {
                text: '______ Chris ______ about his chances of getting the job?',
                options: ['Are / worrying', 'Were / worrying', 'Was / worrying'],
                correct: 2,
                wrongOnly: true,
                explanation: '"Chris" = he (singular) &rarr; <strong>Was</strong>; verb+ing &rarr; <strong>worrying</strong>.'
            },
            {
                text: '______ the men ______ Chris&rsquo;s intelligence?',
                options: ['Was / questioning', 'Were / questioning', 'Are / questioning'],
                correct: 1,
                wrongOnly: true,
                explanation: '"The men" = they (plural) &rarr; <strong>Were</strong>; verb+ing &rarr; <strong>questioning</strong>.'
            }
        ],
        exercises: [
            {
                question: 'Выберите правильное предложение:',
                options: [
                    'I was working when he arrived.',
                    'I were working when he arrived.',
                    'I am working when he arrived.',
                    'I work when he arrived.'
                ],
                correct: 0,
                explanation: 'С "I" используется "was", "were" - с "you/they/we".',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Дополните: "She __ sleeping when the phone rang."',
                options: [
                    'is',
                    'was',
                    'were',
                    'am'
                ],
                correct: 1,
                explanation: 'С "she" в Past Continuous: was sleeping.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильное предложение:',
                options: [
                    'They were playing chess all evening.',
                    'They was playing chess all evening.',
                    'They are playing chess all evening.',
                    'They have been playing chess all evening.'
                ],
                correct: 0,
                explanation: 'С "they" в Past Continuous: were playing.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите отрицание в Past Continuous:',
                options: [
                    'He was not watching TV.',
                    'He wasn\'t watch TV.',
                    'He wasn\'t watching TV.',
                    'Оба варианта верны.'
                ],
                correct: 3,
                explanation: 'Оба - "was not" и "wasn\'t" - верны.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Дополните отрицание: "They __ not __ cooking when I came."',
                options: [
                    'was, cooking',
                    'were, cooking',
                    'did, cook',
                    'have, cooked'
                ],
                correct: 1,
                explanation: 'С "they" в отрицании: were not cooking.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Какой вопрос грамматически верен?',
                options: [
                    'What was you doing?',
                    'What were you doing?',
                    'What you were doing?',
                    'What are you doing?'
                ],
                correct: 1,
                explanation: 'Past Continuous вопрос: Were + you + doing?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Завершите вопрос: "__ she __ reading when you called?"',
                options: [
                    'Was, reading',
                    'Were, reading',
                    'Is, reading',
                    'Does, read'
                ],
                correct: 0,
                explanation: 'С "she" в Past Continuous вопросе: Was she reading?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Выберите правильное использование Past Continuous:',
                options: [
                    'When I arrived, they were eating dinner.',
                    'When I arrived, they eat dinner.',
                    'When I arrive, they were eating dinner.',
                    'When I arrive, they eating dinner.'
                ],
                correct: 0,
                explanation: 'Past Continuous для фонового действия: were eating.',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Найдите ошибку:',
                options: [
                    'He was driving the car.',
                    'We were studying hard.',
                    'They was waiting for the bus.',
                    'I was getting ready for work.'
                ],
                correct: 2,
                explanation: 'Ошибка: "They was" должно быть "They were".',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильный вариант:',
                options: [
                    'What were they talking about at 5 PM?',
                    'What they were talking about at 5 PM?',
                    'They were talking what at 5 PM?',
                    'What was they talking about at 5 PM?'
                ],
                correct: 0,
                explanation: 'Past Continuous вопрос: What were they talking about?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Какой вариант содержит ошибку?',
                options: [
                    'While I was working, she called me.',
                    'It was raining when we left.',
                    'They were not sleeping all night.',
                    'He were building a house for months.'
                ],
                correct: 3,
                explanation: 'Ошибка: "He were" должно быть "He was".',
                difficulty: 'hard',
                sentenceForm: 'positive'
            },
            {
                question: 'Какое предложение правильно использует Past Continuous?',
                options: [
                    'I was watch a movie when the doorbell rang.',
                    'I was watching a movie when the doorbell rang.',
                    'I watched a movie when the doorbell rang.',
                    'I were watching a movie when the doorbell rang.'
                ],
                correct: 1,
                explanation: 'Правильная форма: was watching.',
                difficulty: 'hard',
                sentenceForm: 'positive'
            },
            {
                question: 'Какой вопрос требует ответа "Yes, I was"?',
                options: [
                    'Did you work yesterday?',
                    'Were you working when I called?',
                    'Are you working now?',
                    'Have you been working?'
                ],
                correct: 1,
                explanation: '"Were you working?" = "Yes, I was (working)."',
                difficulty: 'hard',
                sentenceForm: 'question'
            },
            {
                question: 'Дополните: "While they __ __ football, it __ to rain."',
                options: [
                    'was, playing, started',
                    'were, playing, started',
                    'were, playing, was starting',
                    'was, playing, was starting'
                ],
                correct: 1,
                explanation: 'Фоновое действие (were playing) + прерывающее (started).',
                difficulty: 'hard',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильный порядок в Past Continuous вопросе:',
                options: [
                    'How long were you waiting for me?',
                    'How long you were waiting for me?',
                    'How long were waiting for me you?',
                    'Wait how long were you for me?'
                ],
                correct: 0,
                explanation: 'Past Continuous вопрос: Question word + Were + you + V+ing?',
                difficulty: 'hard',
                sentenceForm: 'question'
            }
        ]
    },

    'past-perfect': {
        title: 'Past Perfect',
        russian: 'Прошедшее совершенное',
        videoFile: 'past perfect 1.mp4',
        videoFile2: 'past perfect 2.1.mp4',
        structure: 'had + V3 (Past Participle)',
        usage: [
            'Одно действие произошло раньше другого в прошлом',
            'Подчеркивание предшествующего события',
            'Косвенная речь о прошедших событиях'
        ],
        rules: [
            { type: 'Утверждение', example: 'I had eaten before he arrived.' },
            { type: 'Отрицание', example: 'She hadn\'t seen the movie.' },
            { type: 'Вопрос', example: 'Had you finished?' }
        ],
        examples: [
            {
                source: 'The Sixth Sense',
                dialogue: '"I had never told anyone about them before."',
                translation: 'Я никогда никому об этом не рассказывал.'
            }
        ],
        // New exercises for Past Perfect
        exercises: [
            // These are placeholders. The actual exercises will be rendered by renderPastPerfectPracticeTasks
            // and will use the ppastpa, ppastpn, ppastpi prefixes.
            // This array is kept for compatibility with the old loadExercises function if it were to be used.
            // However, the handlePracticeTab function will now directly call renderPastPerfectPracticeTasks.
            // So, this array will not be directly used for the practice sections.
            // It's good practice to keep it empty or with dummy data if not used.
        ],
        videoQuiz1: [
            {
                text: '&ldquo;It was a Thursday afternoon. We had made a pact.&rdquo;<br>Did they make the pact on that Thursday afternoon, or before that afternoon arrived?',
                options: ['On Thursday', 'Before Thursday'],
                correct: 1,
                explanation: 'When the speaker says, &ldquo;It was a Thursday (Past Simple)&hellip; we had made a pact (Past Perfect),&rdquo; he is looking back from that Thursday to an even earlier time. The Past Perfect acts like a &ldquo;super past,&rdquo; indicating the agreement was already in place before the story began.<br><em>She <strong>had already eaten</strong> lunch before he arrived.</em>'
            },
            {
                text: 'The speaker is talking about&hellip;',
                options: ['The present', 'A story in the past'],
                correct: 1,
                explanation: 'The speaker is using past tenses.<br><em>&ldquo;It was Thursday afternoon. We had made a pact. Your mother had just received her first Harper Avery nomination. She was so excited.&rdquo;</em>'
            },
            {
                text: '&ldquo;Your mother had just received her nomination. She was so excited. And I was jealous.&rdquo;<br>Did the nomination happen first, or did the speaker&rsquo;s jealousy happen first?',
                options: ['The nomination', 'The jealousy'],
                correct: 0,
                explanation: 'We use the Past Perfect to show which of two past actions happened first.<br><strong>FIRST</strong> Your mother had just received her nomination and <strong>THEN</strong> I was jealous.'
            },
            {
                type: 'intro',
                text: 'Compare these two sentences:<br><em>A: She received a nomination.</em><br><em>B: She had received a nomination.</em>'
            },
            {
                text: 'Which sentence simply states a past fact without connecting it to another past event?',
                options: ['A', 'B'],
                correct: 0,
                explanation: 'The Past Simple is a straightforward &ldquo;point&rdquo; on a timeline. It tells us what happened, but it doesn&rsquo;t necessarily link it to the timing of other events.'
            },
            {
                text: 'Which sentence shows that the action was already finished by the time the other action started?',
                options: ['A', 'B'],
                correct: 1,
                explanation: 'The Past Perfect creates a &ldquo;background&rdquo; effect and shows that the action was even before another action.'
            },
            {
                type: 'intro',
                text: 'Look at the sentences:<br><em>We <strong>had made</strong> a pact.</em><br><em>Your mother <strong>had just received</strong> her nomination.</em><br><em>I <strong>hadn&rsquo;t yet accomplished</strong>.</em>'
            },
            {
                type: 'fill',
                text: 'What auxiliary (helping) verb is used in every sentence?',
                answer: 'had',
                placeholder: 'type...',
                explanation: 'The auxiliary verb in Past Perfect is always <strong>had</strong>, regardless of the subject.<br><em>I <strong>had</strong> prepared dinner when my mom came from work.</em><br><em>She <strong>had</strong> received a nomination.</em>'
            },
            {
                text: 'Does the auxiliary verb &ldquo;had&rdquo; change if the subject is &ldquo;I&rdquo;, &ldquo;We&rdquo;, or &ldquo;She&rdquo;?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'Unlike the Present Perfect (have/has), the Past Perfect always uses <strong>had</strong> regardless of the subject.<br><em>I <strong>had</strong> prepared dinner when my mom came from work.</em><br><em>She <strong>had</strong> received a nomination.</em>'
            },
            {
                text: 'What form is the main verb (<em>made, received, accomplished</em>) in?',
                options: ['Present (Base form)', 'Past Participle (3rd form)'],
                correct: 1,
                explanation: 'All &ldquo;Perfect&rdquo; tenses need verbs in the Past Participle. We add <em>-ed/-d</em> to regular verbs (<em>receive &rarr; received</em>), irregular verbs change their form (<em>make &rarr; made &rarr; made</em>).'
            },
            {
                type: 'intro',
                text: 'Look at the sentence: <em>&ldquo;Everything I <strong>hadn&rsquo;t</strong> yet accomplished.&rdquo;</em>'
            },
            {
                type: 'fill',
                text: 'a) What word is added to &ldquo;had&rdquo; to make the sentence negative?',
                answer: 'not',
                altAnswers: ["n't", "not"],
                placeholder: 'type...',
                explanation: 'To negate the Past Perfect, we attach <strong>not</strong> to the auxiliary verb: <em>had not</em> or the contraction <em>hadn&rsquo;t</em>.<br><em>I <strong>had not</strong> finished my meal.</em><br><em>He <strong>hadn&rsquo;t</strong> completed the form.</em>'
            },
            {
                text: 'In the sentence &ldquo;Your mother had <strong>just</strong> received her nomination,&rdquo; what does the word &ldquo;just&rdquo; imply?',
                options: ['It happened a long time before Thursday.', 'It happened a very short time before the Thursday.'],
                correct: 1,
                explanation: '&ldquo;Just&rdquo; is used to emphasize that the past action occurred very recently before the second past action.<br><em>I <strong>had just finished</strong> cleaning when she came into the room.</em>'
            },
            {
                type: 'drag',
                text: 'a) Put the words in the correct order:',
                words: ['the pact', 'they', 'made', 'had', 'before', 'that day.'],
                correct: 'They had made the pact before that day.'
            },
            {
                type: 'drag',
                text: 'b) Put the words in the correct order:',
                words: ['not', 'he', 'anything', 'had', 'accomplished', 'yet.'],
                correct: 'He had not accomplished anything yet.'
            }
        ],
        grammarBank1: {
            blocks: [
                {
                    intro: 'We use Past Perfect for:<br><ul style="margin:8px 0 0 0;padding-left:18px;"><li>completed action <strong>before another action</strong> in the past;</li><li>completed action before a <strong>specific time</strong>;</li><li>states continuing up to a past moment.</li></ul>We often use Past Perfect adverbs <strong>just</strong>, <strong>already</strong> to emphasise how long ago the first event had happened.<br><br>The word order for positive Past Perfect sentences is <strong>SAV3</strong><br>(<strong>S</strong>ubject + <strong>had</strong> + <strong>Past Participle</strong>).<br>The auxiliary verb is the same for all subjects.<br><table style="border-collapse:collapse;margin:10px 0;font-size:0.93rem;"><tr><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Subject</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Auxiliary Verb</th><th style="padding:4px 0;color:#e2b714;text-align:left;">Main Verb (V3/past participle)</th></tr><tr><td style="padding:3px 14px 3px 0;">I</td><td style="padding:3px 14px 3px 0;">had</td><td>asked</td></tr><tr><td style="padding:3px 14px 3px 0;">You</td><td style="padding:3px 14px 3px 0;">had</td><td>asked</td></tr><tr><td style="padding:3px 14px 3px 0;">He / She / It</td><td style="padding:3px 14px 3px 0;">had</td><td>asked</td></tr><tr><td style="padding:3px 14px 3px 0;">We</td><td style="padding:3px 14px 3px 0;">had</td><td>asked</td></tr><tr><td style="padding:3px 14px 3px 0;">They</td><td style="padding:3px 14px 3px 0;">had</td><td>asked</td></tr></table>',
                    table: [],
                    examples: [
                        'They <strong>had made</strong> a pact before that day.',
                        'She <strong>had just received</strong> a nomination when I saw her.',
                        'I <strong>had finished</strong> my work by 5 PM yesterday.',
                        'He <strong>had felt</strong> tired until he saw his daughter.'
                    ]
                },
                {
                    intro: '<strong>Negative Sentences</strong><br>The word order for negative Past Perfect sentences is <strong>SAV3</strong><br><strong>Subject + hadn&rsquo;t + V3 (past participle)</strong>.<br>We also can use <strong>&ldquo;never&rdquo;</strong> in negative sentences to say that something happened zero times in the past.<br>Contraction: <strong>hadn&rsquo;t</strong> = had not.<br><br>We use <strong>&ldquo;yet&rdquo;</strong> to emphasise that the action was expected to happen before a specific time but not completed.',
                    table: [],
                    examples: [
                        'I <strong>hadn&rsquo;t yet accomplished</strong> my goals.',
                        'They <strong>had never seen</strong> that movie before last night.',
                        'He <strong>had not finished</strong> the report when the meeting started.',
                        'I <strong>hadn&rsquo;t completed</strong> my homework yet.'
                    ]
                },
                {
                    intro: '<strong>V3 Reference (Irregular Verbs)</strong><br>For regular verbs, add <em>-ed</em>. For irregular verbs, use the 3rd form (Past Participle).<br><table style="border-collapse:collapse;margin:10px 0;font-size:0.93rem;"><tr><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Base (V1)</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Past Simple (V2)</th><th style="padding:4px 0;color:#e2b714;text-align:left;">Past Participle (V3)</th></tr><tr><td style="padding:3px 14px 3px 0;">Make</td><td style="padding:3px 14px 3px 0;">made</td><td>made</td></tr><tr><td style="padding:3px 14px 3px 0;">Go</td><td style="padding:3px 14px 3px 0;">went</td><td>gone</td></tr><tr><td style="padding:3px 14px 3px 0;">See</td><td style="padding:3px 14px 3px 0;">saw</td><td>seen</td></tr><tr><td style="padding:3px 14px 3px 0;">Do</td><td style="padding:3px 14px 3px 0;">did</td><td>done</td></tr><tr><td style="padding:3px 14px 3px 0;">Have</td><td style="padding:3px 14px 3px 0;">had</td><td>had</td></tr></table><div id="v3-extra" style="display:none;"><table style="border-collapse:collapse;margin:4px 0 10px;font-size:0.93rem;"><tr><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Base (V1)</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Past Simple (V2)</th><th style="padding:4px 0;color:#e2b714;text-align:left;">Past Participle (V3)</th></tr><tr><td style="padding:3px 14px 3px 0;">Give</td><td style="padding:3px 14px 3px 0;">gave</td><td>given</td></tr><tr><td style="padding:3px 14px 3px 0;">Eat</td><td style="padding:3px 14px 3px 0;">ate</td><td>eaten</td></tr><tr><td style="padding:3px 14px 3px 0;">Come</td><td style="padding:3px 14px 3px 0;">came</td><td>come</td></tr><tr><td style="padding:3px 14px 3px 0;">Take</td><td style="padding:3px 14px 3px 0;">took</td><td>taken</td></tr><tr><td style="padding:3px 14px 3px 0;">Write</td><td style="padding:3px 14px 3px 0;">wrote</td><td>written</td></tr><tr><td style="padding:3px 14px 3px 0;">Know</td><td style="padding:3px 14px 3px 0;">knew</td><td>known</td></tr><tr><td style="padding:3px 14px 3px 0;">Think</td><td style="padding:3px 14px 3px 0;">thought</td><td>thought</td></tr><tr><td style="padding:3px 14px 3px 0;">Speak</td><td style="padding:3px 14px 3px 0;">spoke</td><td>spoken</td></tr><tr><td style="padding:3px 14px 3px 0;">Find</td><td style="padding:3px 14px 3px 0;">found</td><td>found</td></tr><tr><td style="padding:3px 14px 3px 0;">Run</td><td style="padding:3px 14px 3px 0;">ran</td><td>run</td></tr><tr><td style="padding:3px 14px 3px 0;">Become</td><td style="padding:3px 14px 3px 0;">became</td><td>become</td></tr><tr><td style="padding:3px 14px 3px 0;">Begin</td><td style="padding:3px 14px 3px 0;">began</td><td>begun</td></tr><tr><td style="padding:3px 14px 3px 0;">Break</td><td style="padding:3px 14px 3px 0;">broke</td><td>broken</td></tr><tr><td style="padding:3px 14px 3px 0;">Bring</td><td style="padding:3px 14px 3px 0;">brought</td><td>brought</td></tr><tr><td style="padding:3px 14px 3px 0;">Buy</td><td style="padding:3px 14px 3px 0;">bought</td><td>bought</td></tr><tr><td style="padding:3px 14px 3px 0;">Choose</td><td style="padding:3px 14px 3px 0;">chose</td><td>chosen</td></tr><tr><td style="padding:3px 14px 3px 0;">Drive</td><td style="padding:3px 14px 3px 0;">drove</td><td>driven</td></tr><tr><td style="padding:3px 14px 3px 0;">Fall</td><td style="padding:3px 14px 3px 0;">fell</td><td>fallen</td></tr><tr><td style="padding:3px 14px 3px 0;">Feel</td><td style="padding:3px 14px 3px 0;">felt</td><td>felt</td></tr><tr><td style="padding:3px 14px 3px 0;">Forget</td><td style="padding:3px 14px 3px 0;">forgot</td><td>forgotten</td></tr><tr><td style="padding:3px 14px 3px 0;">Get</td><td style="padding:3px 14px 3px 0;">got</td><td>gotten / got</td></tr><tr><td style="padding:3px 14px 3px 0;">Grow</td><td style="padding:3px 14px 3px 0;">grew</td><td>grown</td></tr><tr><td style="padding:3px 14px 3px 0;">Hear</td><td style="padding:3px 14px 3px 0;">heard</td><td>heard</td></tr><tr><td style="padding:3px 14px 3px 0;">Hold</td><td style="padding:3px 14px 3px 0;">held</td><td>held</td></tr><tr><td style="padding:3px 14px 3px 0;">Keep</td><td style="padding:3px 14px 3px 0;">kept</td><td>kept</td></tr><tr><td style="padding:3px 14px 3px 0;">Leave</td><td style="padding:3px 14px 3px 0;">left</td><td>left</td></tr><tr><td style="padding:3px 14px 3px 0;">Lose</td><td style="padding:3px 14px 3px 0;">lost</td><td>lost</td></tr><tr><td style="padding:3px 14px 3px 0;">Meet</td><td style="padding:3px 14px 3px 0;">met</td><td>met</td></tr><tr><td style="padding:3px 14px 3px 0;">Pay</td><td style="padding:3px 14px 3px 0;">paid</td><td>paid</td></tr><tr><td style="padding:3px 14px 3px 0;">Put</td><td style="padding:3px 14px 3px 0;">put</td><td>put</td></tr><tr><td style="padding:3px 14px 3px 0;">Read</td><td style="padding:3px 14px 3px 0;">read</td><td>read</td></tr><tr><td style="padding:3px 14px 3px 0;">Rise</td><td style="padding:3px 14px 3px 0;">rose</td><td>risen</td></tr><tr><td style="padding:3px 14px 3px 0;">Say</td><td style="padding:3px 14px 3px 0;">said</td><td>said</td></tr><tr><td style="padding:3px 14px 3px 0;">Send</td><td style="padding:3px 14px 3px 0;">sent</td><td>sent</td></tr><tr><td style="padding:3px 14px 3px 0;">Show</td><td style="padding:3px 14px 3px 0;">showed</td><td>shown</td></tr><tr><td style="padding:3px 14px 3px 0;">Sit</td><td style="padding:3px 14px 3px 0;">sat</td><td>sat</td></tr><tr><td style="padding:3px 14px 3px 0;">Sleep</td><td style="padding:3px 14px 3px 0;">slept</td><td>slept</td></tr><tr><td style="padding:3px 14px 3px 0;">Stand</td><td style="padding:3px 14px 3px 0;">stood</td><td>stood</td></tr><tr><td style="padding:3px 14px 3px 0;">Teach</td><td style="padding:3px 14px 3px 0;">taught</td><td>taught</td></tr><tr><td style="padding:3px 14px 3px 0;">Tell</td><td style="padding:3px 14px 3px 0;">told</td><td>told</td></tr><tr><td style="padding:3px 14px 3px 0;">Win</td><td style="padding:3px 14px 3px 0;">won</td><td>won</td></tr></table></div><button onclick="(function(b){var d=document.getElementById(\'v3-extra\');if(d.style.display===\'none\'){d.style.display=\'block\';b.textContent=\'Show less ▲\';}else{d.style.display=\'none\';b.textContent=\'Show more ▼\';}})(this)" style="margin:4px 0 2px;padding:6px 18px;background:#2a2a3e;color:#e2b714;border:1.5px solid #e2b714;border-radius:8px;cursor:pointer;font-size:0.92rem;font-weight:600;">Show more ▼</button>',
                    table: [],
                    examples: []
                }
            ]
        },
        videoQuiz1b: [
            { type: 'intro', text: '<strong>Practice Affirmative &mdash; Choose the correct option:</strong>' },
            {
                text: 'Richard and Meredith\'s mother ______ a pact before things changed.',
                options: ['had made', 'had make', 'have made'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>had made</strong> &mdash; Past Perfect: had + Past Participle. <em>make &rarr; made</em>'
            },
            {
                text: 'By that Thursday afternoon, Meredith\'s mother ______ her first Harper Avery nomination.',
                options: ['had receive', 'had received', 'has received'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>had received</strong> &mdash; Past Perfect: had + Past Participle. <em>receive &rarr; received</em>'
            },
            {
                text: 'Richard realized that she ______ far ahead of him in her career.',
                options: ['had gone', 'had went', 'has gone'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>had gone</strong> &mdash; irregular verb: <em>go &rarr; went &rarr; gone</em>'
            },
            {
                text: 'Before he felt jealous, they ______ to leave their partners for each other.',
                options: ['had decide', 'have decided', 'had decided'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>had decided</strong> &mdash; Past Perfect: had + Past Participle. <em>decide &rarr; decided</em>'
            },
            {
                text: 'Her success illuminated everything that Richard ______ yet.',
                options: ['hadn\'t accomplish', 'had accomplished', 'had accomplishing'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>had accomplished</strong> &mdash; Past Perfect: had + Past Participle. <em>accomplish &rarr; accomplished</em>'
            },
            {
                text: 'By the time they talked, she ______ very excited about her nomination.',
                options: ['had been', 'had was', 'have been'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>had been</strong> &mdash; irregular verb: <em>be &rarr; was/were &rarr; been</em>'
            },
            {
                text: 'Richard felt that she ______ too far ahead to catch up to.',
                options: ['had stepped', 'had step', 'has stepped'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>had stepped</strong> &mdash; Past Perfect: had + Past Participle. <em>step &rarr; stepped</em>'
            },
            {
                text: 'Before that day, Richard ______ a strong connection with her.',
                options: ['have felt', 'had feel', 'had felt'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>had felt</strong> &mdash; irregular verb: <em>feel &rarr; felt &rarr; felt</em>'
            },
            {
                text: 'He admitted that his jealousy ______ from a hateful place.',
                options: ['had came', 'had come', 'has come'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>had come</strong> &mdash; irregular verb: <em>come &rarr; came &rarr; come</em>'
            },
            {
                text: 'The situation ______ clear to him only after her success.',
                options: ['had became', 'had become', 'has become'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>had become</strong> &mdash; irregular verb: <em>become &rarr; became &rarr; become</em>'
            }
        ],
        videoQuiz2: [
            {
                type: 'intro',
                text: 'Focus on Elle Woods&rsquo; lines: <em>&ldquo;What had you done earlier that day?&rdquo;</em> and <em>&ldquo;Had you ever gotten a perm before?&rdquo;</em>'
            },
            {
                text: 'a) When Elle asks <em>&ldquo;What had you done earlier that day?&rdquo;</em>, she is asking about:',
                options: ['What the witness is doing right now', 'What the witness was doing or did when the crime happened', 'What the witness had done the day before the crime happened'],
                correct: 2,
                noNum: true,
                explanation: 'Past Perfect looks back from a past moment to an even earlier time &mdash; the action happened <em>before</em> another past event.'
            },
            {
                text: 'b) In the question <em>&ldquo;Had you ever gotten a perm before?&rdquo;</em> Elle is asking about:',
                options: ['If the witness got a perm before the crime happened', 'If the witness got a perm in her life overall'],
                correct: 0,
                noNum: true,
                explanation: 'She isn&rsquo;t asking if the witness has ever had a perm in her entire life up until now (Present Perfect); she is asking if the witness had experience with perms before the day the crime happened.'
            },
            {
                type: 'intro',
                text: 'Look at the sentence: <em>&ldquo;Had you ever gotten a perm before?&rdquo;</em>'
            },
            {
                type: 'fill',
                text: 'a) What is the first word of the question?',
                answer: 'Had',
                placeholder: 'type...',
                noNum: true,
                explanation: 'In English, we create questions by moving the auxiliary verb to the front. For Past Perfect, that word is always <strong>had</strong>.'
            },
            {
                text: 'b) The subject (&ldquo;you&rdquo;) in interrogative sentences stays?',
                options: ['Before the auxiliary verb <em>(He had eaten?)</em>', 'After the auxiliary verb <em>(Had he eaten?)</em>'],
                correct: 1,
                noNum: true,
                explanation: 'In questions, auxiliary verbs and subjects change their places.<br><em>Had you gotten a perm before the crime?</em><br><em>Had she entered the house before she heard the gunshot?</em>'
            },
            {
                type: 'intro',
                text: 'Look at the sentence: <em>&ldquo;What had you done earlier that day?&rdquo;</em>'
            },
            {
                text: 'a) When we use a question word (What, Where, Why) in interrogative sentences, it stays&hellip;',
                options: ['At the beginning of the sentence', 'After auxiliary verbs'],
                correct: 0,
                noNum: true,
                explanation: 'Question words (WH- words) always take the &ldquo;priority position&rdquo; at the start of a sentence, even before the auxiliary verb.<br><em>Example: <strong>What</strong> had you done earlier that day?</em>'
            },
            {
                type: 'intro',
                text: 'In the sentence <em>&ldquo;Had you ever gotten a perm before?&rdquo;</em>'
            },
            {
                text: 'a) What does &ldquo;ever&rdquo; mean?',
                options: ['At any time before the crime.', 'At any time in the witness&rsquo;s life.'],
                correct: 0,
                noNum: true,
                explanation: 'We use &ldquo;ever&rdquo; to talk about the &ldquo;experience&rdquo; within a time frame. In Past Perfect, that time frame is &ldquo;any time in your life up until a specific past event.&rdquo;<br><em>Had you ever tried alcohol before your 21st birthday party?</em>'
            },
            {
                text: 'b) &ldquo;Ever&rdquo; is used in&hellip;',
                options: ['Positive statements.', 'Questions about experiences.'],
                correct: 1,
                noNum: true,
                explanation: 'We use &ldquo;never&rdquo; for negative statements; &ldquo;ever&rdquo; is the standard way to ask if an experience existed at any point in time.'
            },
            {
                type: 'drag',
                text: 'Put the words in the correct order:',
                words: ['she', 'had', 'finished', 'her', 'coffee', '?'],
                correct: 'Had she finished her coffee?',
                noNum: true
            },
            {
                type: 'drag',
                text: 'Put the words in the correct order for a WH- question:',
                words: ['they', 'where', 'gone', 'had', '?'],
                correct: 'Where had they gone?',
                noNum: true
            }
        ],
        grammarBank2: {
            blocks: [
                {
                    intro: '<strong>1. Yes/No Questions</strong><br>The word order for yes/no interrogative Past Perfect sentences is <strong>ASV3?</strong><br><strong>Had + Subject + V3?</strong><br><br>We use <strong>had</strong> or <strong>hadn&rsquo;t</strong> for short answers.',
                    table: [],
                    examples: [
                        '&ldquo;Had you gotten a perm before the crime?&rdquo;',
                        '&ldquo;Had they eaten before the movie?&rdquo;',
                        '&ldquo;Had you seen him before that day?&rdquo; &mdash; &ldquo;Yes, I <strong>had</strong>.&rdquo; / &ldquo;No, I <strong>hadn&rsquo;t</strong>.&rdquo;'
                    ]
                },
                {
                    intro: '<strong>2. WH- Questions</strong><br>The word order for specific questions in Past Perfect is <strong>ASV3?</strong><br><strong>WH- word + had + Subject + V3?</strong>',
                    table: [],
                    examples: [
                        '&ldquo;What had you done before the crime?&rdquo;',
                        '&ldquo;Where had she hidden the letter?&rdquo;'
                    ]
                }
            ]
        },
        videoQuiz2b: [
            { type: 'intro', text: '<strong>Practice Negative &mdash; Choose the correct option:</strong>' },
            {
                text: 'Richard was jealous because he ______ as much success as Meredith&rsquo;s mother by that time.',
                options: ['hadn\'t have', 'hadn\'t had', 'hasn\'t'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>hadn\'t had</strong> &mdash; negative Past Perfect: hadn\'t + Past Participle. <em>have &rarr; had</em>'
            },
            {
                text: 'At that point in his life, Richard ______ any Harper Avery nominations yet.',
                options: ['hadn\'t received', 'hadn\'t receive', 'hasn\'t received'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>hadn\'t received</strong> &mdash; negative Past Perfect: hadn\'t + Past Participle. <em>receive &rarr; received</em>'
            },
            {
                text: 'Richard realized that he ______ as much in his career as Meredith&rsquo;s mother.',
                options: ['hadn\'t accomplish', 'hadn\'t accomplished', 'hasn\'t accomplished'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>hadn\'t accomplished</strong> &mdash; negative Past Perfect: hadn\'t + Past Participle. <em>accomplish &rarr; accomplished</em>'
            },
            {
                text: 'Before that Thursday, Richard ______ how far ahead Meredith&rsquo;s mother had moved.',
                options: ['hadn\'t notice', 'hasn\'t noticed', 'hadn\'t noticed'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>hadn\'t noticed</strong> &mdash; negative Past Perfect: hadn\'t + Past Participle. <em>notice &rarr; noticed</em>'
            },
            {
                text: 'By the time of the nomination, Richard ______ how to deal with his jealousy.',
                options: ['hadn\'t learned', 'hadn\'t learn', 'hasn\'t learned'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>hadn\'t learned</strong> &mdash; negative Past Perfect: hadn\'t + Past Participle. <em>learn &rarr; learned</em>'
            },
            { type: 'intro', text: '<strong>Practice Interrogative &mdash; Choose the correct option:</strong>' },
            {
                text: 'What ______ Chutney Wyndham ______ earlier that day before coming home?',
                options: ['Did / do', 'Has / done', 'Had / done'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>Had / done</strong> &mdash; Past Perfect question: Had + subject + V3. <em>do &rarr; did &rarr; done</em>'
            },
            {
                text: '______ she ______ a latte before she went to the gym?',
                options: ['Had / gotten', 'Has / got', 'Had / get'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>Had / gotten</strong> &mdash; Past Perfect question: Had + subject + V3. <em>get &rarr; got &rarr; gotten</em>'
            },
            {
                text: 'Before Chutney came home, ______ she ______ a perm?',
                options: ['had / getted', 'had / gotten', 'has / gotten'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>had / gotten</strong> &mdash; Past Perfect question: had + subject + V3. <em>getted</em> is not a real word.'
            },
            {
                text: 'Why did Elle Woods ask: &ldquo;______ you ever ______ a perm before?&rdquo;',
                options: ['Had / have', 'Have / had', 'Had / had'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>Had / had</strong> &mdash; Past Perfect question: Had + subject + V3. <em>have &rarr; had &rarr; had</em>'
            },
            {
                text: '______ the witness ______ in the shower before the incident happened?',
                options: ['had / was', 'Had / been', 'had / be'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>Had / been</strong> &mdash; Past Perfect question: Had + subject + V3. <em>be &rarr; was/were &rarr; been</em>'
            }
        ],
        exercises: [
            {
                question: 'Он пришел после того, как я закончил работу. Выберите верно:',
                options: [
                    'He came after I finished work.',
                    'He came after I had finished work.',
                    'He comes after I had finished work.',
                    'He had come after I finished work.'
                ],
                correct: 1,
                explanation: 'Более раннее действие: Past Perfect (had finished), позже: Past Simple (came).',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Дополните: "She __ already left when we arrived."',
                options: [
                    'was',
                    'had',
                    'has',
                    'have'
                ],
                correct: 1,
                explanation: 'Past Perfect: had + Past Participle.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильное предложение:',
                options: [
                    'They had gone home before I called.',
                    'They go home before I called.',
                    'They were going home before I called.',
                    'They have gone home before I called.'
                ],
                correct: 0,
                explanation: 'Past Perfect для более раннего действия: had gone.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите отрицание в Past Perfect:',
                options: [
                    'I not had finished my homework.',
                    'I hadn\'t finished my homework.',
                    'I didn\'t had finished my homework.',
                    'I have not finished my homework.'
                ],
                correct: 1,
                explanation: 'Past Perfect отрицание: had + not + Past Participle.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Дополните отрицание: "He __ not __ the message before noon."',
                options: [
                    'has, received',
                    'did, receive',
                    'had, received',
                    'was, receiving'
                ],
                correct: 2,
                explanation: 'Past Perfect отрицание: had not received.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Какой вопрос грамматически верен?',
                options: [
                    'Had you ever seen a ghost?',
                    'Have you ever seen a ghost?',
                    'Did you ever see a ghost?',
                    'Had you seen a ghost before?'
                ],
                correct: 0,
                explanation: 'Past Perfect вопрос: Had + подлежащее + Past Participle?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Завершите вопрос: "__ they __ the agreement before the meeting?"',
                options: [
                    'Did, sign',
                    'Had, signed',
                    'Have, signed',
                    'Were, signing'
                ],
                correct: 1,
                explanation: 'Past Perfect вопрос: Had they signed?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Выберите правильное использование двух прошедших времен:',
                options: [
                    'By the time he arrived, I finish eating.',
                    'By the time he arrived, I had finished eating.',
                    'By the time he arrives, I finish eating.',
                    'By the time he arrives, I had finished eating.'
                ],
                correct: 1,
                explanation: 'Past Perfect обозначает действие, завершенное до другого действия.',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Найдите ошибку:',
                options: [
                    'They had already arrived when we got there.',
                    'I hadn\'t met her before that day.',
                    'She had finish her work before 5 PM.',
                    'We had never been to Paris before.'
                ],
                correct: 2,
                explanation: 'Ошибка: "had finish" должно быть "had finished".',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильный вариант:',
                options: [
                    'After he had left, she started crying.',
                    'After he left, she had started crying.',
                    'After he has left, she started crying.',
                    'After he leaves, she starts crying.'
                ],
                correct: 0,
                explanation: 'Past Perfect (had left) → Past Simple (started).',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Какой вариант содержит ошибку?',
                options: [
                    'She had never seen snow before.',
                    'They hadn\'t finished the project.',
                    'I had go away before you arrived.',
                    'We had already eaten dinner.'
                ],
                correct: 2,
                explanation: 'Ошибка: "had go" должноbee "had gone".',
                difficulty: 'hard',
                sentenceForm: 'positive'
            },
            {
                question: 'Какое предложение правильно выражает последовательность?',
                options: [
                    'He left the room and then I saw the document.',
                    'He had left the room and then I saw the document.',
                    'He had left the room before I saw the document.',
                    'He leaves the room before I see the document.'
                ],
                correct: 2,
                explanation: 'Past Perfect подчеркивает, что первое действие произошло ДО второго.',
                difficulty: 'hard',
                sentenceForm: 'positive'
            },
            {
                question: 'Какой вопрос требует ответа "Yes, I had"?',
                options: [
                    'Have you ever traveled abroad?',
                    'Did you ever travel abroad?',
                    'Had you already finished by midnight?',
                    'Are you finished with your work?'
                ],
                correct: 2,
                explanation: '"Had you...?" = "Yes, I had."',
                difficulty: 'hard',
                sentenceForm: 'question'
            },
            {
                question: 'Дополните: "By the time she called, I __ __ the email."',
                options: [
                    'sent',
                    'had sent',
                    'have sent',
                    'was sending'
                ],
                correct: 1,
                explanation: 'Past Perfect для действия, завершившегося до другого: had sent.',
                difficulty: 'hard',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильный порядок слов в Past Perfect вопросе:',
                options: [
                    'What had they done before that?',
                    'What they had done before that?',
                    'Had they what done before that?',
                    'They had done what before that?'
                ],
                correct: 0,
                explanation: 'Past Perfect вопрос: Question word + Had + подлежащее + Past Participle?',
                difficulty: 'hard',
                sentenceForm: 'question'
            }
        ]
    },

    'past-perfect-continuous': {
        title: 'Past Perfect Continuous',
        russian: 'Прошедшее совершенное длительное',
        videoFile: 'past perfect cont 1.mp4', 
        videoFile2: 'past perfect cont 2 new.mp4',
        videoFile3: 'past perfect cont 3.mp4',
        structure: 'had + been + V+ing',
        usage: [
            'Действие длилось до определенного момента в прошлом',
            'Подчеркивание длительности предшествующего действия',
            'Причина следующего действия'
        ],
        rules: [
            { type: 'Утверждение', example: 'I had been working for 5 hours when he arrived.' },
            { type: 'Отрицание', example: 'They hadn\'t been waiting long.' },
            { type: 'Вопрос', example: 'How long had you been studying?' }
        ],
        examples: [
            {
                source: 'The Pursuit of Happyness',
                dialogue: '"I had been trying for so long to make it."',
                translation: 'Я так долго пытался добиться успеха.'
            }
        ],
        videoQuiz1: [
            {
                noNum: true,
                text: '1. Look at the sentence: &ldquo;She had been waiting for a friend and asked to borrow my phone.&rdquo; Which action happened first?',
                options: ['She asked to borrow a phone', 'She had been waiting.'],
                correct: 1,
                explanation: 'The Past Perfect Continuous (<strong>had been waiting</strong>) describes an action that was in progress until another past event happened (<em>asked to borrow a phone</em>).'
            },
            {
                noNum: true,
                text: '2. &ldquo;She had been waiting for a friend.&rdquo; This sentence emphasizes the&hellip;',
                options: ['completion of her waiting for a friend', 'the duration and waiting process itself.'],
                correct: 1,
                explanation: 'We use this tense to show that a past action continued over a period of time leading up to another specific action or time in the past.'
            },
            {
                type: 'intro',
                text: '3. Look at these two descriptions of the scene:<br><em>A: She was using the laptop when the agent saw her.</em><br><em>B: She had been using the laptop for an hour before the agent saw her.</em>'
            },
            {
                noNum: true,
                text: 'Which sentence emphasizes the duration of action until the agent saw her?',
                options: ['A', 'B'],
                correct: 1,
                explanation: 'The B sentence emphasizes how long she had been using the laptop (<em>for an hour</em>) before another action (<em>agent saw her</em>) happened. We use the Past Perfect Continuous to show the duration of an activity that was in progress until another event happened.'
            },
            {
                noNum: true,
                text: 'Which sentence simply emphasizes the fact that the action was in progress?',
                options: ['A', 'B'],
                correct: 0,
                explanation: 'We use the Past Continuous for actions that were in progress in the past, without much focus on the duration. Often they happen at the same time as other actions take place.'
            },
            {
                type: 'intro',
                text: '4. Look at the phrase: <em>&ldquo;She had been waiting&hellip;&rdquo;</em>'
            },
            {
                noNum: true,
                type: 'fill',
                text: 'What is the auxiliary (helping) verb?',
                answer: 'had',
                placeholder: 'Type here: __________',
                explanation: 'The auxiliary verbs do not change in Past Perfect Continuous.<br><em>He had been waiting for the bus for 20 minutes when the bus finally arrived.</em><br><em>We had been playing football for 2 years when they invited us to play against their team.</em>'
            },
            {
                noNum: true,
                type: 'fill',
                text: 'What is the second auxiliary verb?',
                answer: 'been',
                placeholder: 'Type here: _________',
                explanation: 'Past Perfect Continuous structure: <strong>had + been + V-ing</strong>.'
            },
            {
                noNum: true,
                text: 'Do the auxiliary verbs &ldquo;had been&rdquo; change according to the subjects?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'The auxiliary verbs do not change in Past Perfect Continuous.<br><em>He had been waiting for the bus for 20 minutes when the bus finally arrived.</em><br><em>We had been playing football for 2 years when they invited us to play against their team.</em>'
            },
            {
                noNum: true,
                text: 'What form is the main verb (<em>waiting, using</em>) in?',
                options: ['Past Participle (V3)', 'Present Participle (&minus;ing form)'],
                correct: 1,
                explanation: 'To show that the action was &ldquo;continuous&rdquo; or in progress, we always use the &minus;ing form.<br><em>I had been walking for an hour until I saw him.</em>'
            },
            {
                type: 'intro',
                text: '<strong>5. Put the words in correct order to describe the scene:</strong>'
            },
            {
                type: 'drag',
                noNum: true,
                text: 'laptop / she / using / been / had / his.',
                words: ['She', 'had', 'been', 'using', 'his', 'laptop.'],
                correct: 'She had been using his laptop.'
            }
        ],
        grammarBank1: {
            blocks: [
                {
                    intro: 'We use the <strong>Past Perfect Continuous</strong>:<br><ul style="margin:8px 0 0 0;padding-left:18px;"><li>to show that actions were in process until a specific time in the past;</li><li>to emphasize how long an action had been happening.</li></ul><br>The word order in positive Past Perfect Continuous sentences is:<br><strong>Subject + had + been + V-ing</strong><br><em>He had been eating a sandwich when I brought him a cup of coffee.</em><br><em>You had been calling him for 5 minutes when he finally answered the phone.</em><br><table style="border-collapse:collapse;margin:10px 0;font-size:0.93rem;"><tr><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Subject</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Auxiliary</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Marker</th><th style="padding:4px 0;color:#e2b714;text-align:left;">Main Verb (&minus;ing)</th></tr><tr><td style="padding:3px 14px 3px 0;">I / You / We / They</td><td style="padding:3px 14px 3px 0;">had</td><td style="padding:3px 14px 3px 0;">been</td><td>waiting</td></tr><tr><td style="padding:3px 14px 3px 0;">He / She / It</td><td style="padding:3px 14px 3px 0;">had</td><td style="padding:3px 14px 3px 0;">been</td><td>using</td></tr></table>',
                    table: [],
                    examples: [
                        'He <strong>had been eating</strong> a sandwich when I brought him a cup of coffee.',
                        'You <strong>had been calling</strong> him for 5 minutes when he finally answered the phone.'
                    ]
                }
            ]
        },
        videoQuiz1b: [
            { type: 'intro', text: '<strong>Practice Affirmative &mdash; Choose the correct option:</strong>' },
            {
                noNum: true,
                text: '1. The man explained that the woman ______ (wait) for a friend before she asked for his phone.',
                options: ['has been waiting', 'had been waiting', 'had been wait'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>had been waiting</strong> &mdash; Past Perfect Continuous: had + been + V-ing.'
            },
            {
                noNum: true,
                text: '2. Before they met at the gym, the man ______ (exercise) there for some time.',
                options: ['had been exercising', 'had been exercise', 'has been exercising'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>had been exercising</strong> &mdash; Past Perfect Continuous: had + been + V-ing.'
            },
            {
                noNum: true,
                text: '3. The woman said she ______ (look) for her lost phone for a while before she saw the man.',
                options: ['had being looking', 'has been looking', 'had been looking'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>had been looking</strong> &mdash; Past Perfect Continuous: had + been + V-ing.'
            },
            {
                noNum: true,
                text: '4. Before the trouble started, the man and the woman ______ (date) for three months.',
                options: ['had been dating', 'had been date', 'were been dating'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>had been dating</strong> &mdash; Past Perfect Continuous: had + been + V-ing.'
            },
            {
                noNum: true,
                text: '5. It turned out the woman ______ (use) the man\'s laptop to access secret data.',
                options: ['has been using', 'had been using', 'had been use'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>had been using</strong> &mdash; Past Perfect Continuous: had + been + V-ing.'
            },
            {
                noNum: true,
                text: '6. The man realized that the woman ______ (target) him for information all along.',
                options: ['had been targeting', 'had targeting', 'has been targeting'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>had been targeting</strong> &mdash; Past Perfect Continuous: had + been + V-ing.'
            },
            {
                noNum: true,
                text: '7. Before he found out the truth, the man ______ (work) for the agency for years.',
                options: ['had been work', 'has been working', 'had been working'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>had been working</strong> &mdash; Past Perfect Continuous: had + been + V-ing.'
            },
            {
                noNum: true,
                text: '8. Before she was caught, the woman ______ (prepare) her plan for a long time.',
                options: ['had been preparing', 'had being preparing', 'had been prepare'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>had been preparing</strong> &mdash; Past Perfect Continuous: had + been + V-ing.'
            },
            {
                noNum: true,
                text: '9. The man ______ (lead) a normal life before he met that woman.',
                options: ['has been leading', 'had been leading', 'had been lead'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>had been leading</strong> &mdash; Past Perfect Continuous: had + been + V-ing.'
            },
            {
                noNum: true,
                text: '10. Before the laptop incident, they ______ (talk) about their future together.',
                options: ['had been talking', 'had being talking', 'had been talk'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>had been talking</strong> &mdash; Past Perfect Continuous: had + been + V-ing.'
            }
        ],
        exercises: [
            {
                question: 'Правильное предложение:',
                options: [
                    'She had been working there for 10 years when she quit.',
                    'She has been working there for 10 years when she quit.',
                    'She was working there for 10 years when she quit.',
                    'She had worked there for 10 years when she quit.'
                ],
                correct: 0,
                explanation: 'Past Perfect Continuous для действия, которое длилось и закончилось в прошлом.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Дополните: "He __ __ __ French before moving to Paris."',
                options: [
                    'had studying',
                    'had been studying',
                    'was studying',
                    'has been studying'
                ],
                correct: 1,
                explanation: 'Past Perfect Continuous: had been + V+ing.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильное предложение:',
                options: [
                    'By the time we arrived, they play here for hours.',
                    'By the time we arrived, they had been playing here for hours.',
                    'By the time we arrived, they were playing here for hours.',
                    'By the time we arrived, they have been playing for hours.'
                ],
                correct: 1,
                explanation: 'Past Perfect Continuous: had been playing.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите отрицание в Past Perfect Continuous:',
                options: [
                    'I had not been waiting.',
                    'I hadn\'t been waiting.',
                    'Оба варианта верны.',
                    'Ни один не верен.'
                ],
                correct: 2,
                explanation: 'Оба - "had not been" и "hadn\'t been" - верны.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Дополните отрицание: "They __ not __ __ the project before the deadline."',
                options: [
                    'had, been, working on',
                    'had been, working',
                    'were not, working',
                    'had not, worked'
                ],
                correct: 0,
                explanation: 'Past Perfect Continuous отрицание: had not been working on.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Какой вопрос грамматически верен?',
                options: [
                    'Had you been studying long?',
                    'You had been studying long?',
                    'Had been you studying long?',
                    'Been you had studying?'
                ],
                correct: 0,
                explanation: 'Past Perfect Continuous вопрос: Had + подлежащее + been + V+ing?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Завершите вопрос: "How long __ she __ __ at the hospital?"',
                options: [
                    'had, working',
                    'had been, worked',
                    'had been, working',
                    'was, working'
                ],
                correct: 2,
                explanation: 'Past Perfect Continuous вопрос: How long had she been working?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Выберите правильное использование Past Perfect Continuous:',
                options: [
                    'The students studied for 3 hours before the exam started.',
                    'The students had been studying for 3 hours before the exam started.',
                    'The students are studying for 3 hours before the exam starts.',
                    'The students have been studying for 3 hours before the exam starts.'
                ],
                correct: 1,
                explanation: 'Past Perfect Continuous для длительного действия, завершившегося до другого события: had been studying.',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Найдите ошибку:',
                options: [
                    'By the time I arrived, they had been waiting for hours.',
                    'She hadn\'t been feeling well all week.',
                    'We had been worked on the project when the power went out.',
                    'They had been traveling for weeks before settling down.'
                ],
                correct: 2,
                explanation: 'Ошибка: "had been worked" должно быть "had been working".',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильный вариант:',
                options: [
                    'When she called, I was writing for hours.',
                    'When she called, I had been writing for hours.',
                    'When she called, I written for hours.',
                    'When she called, I been writing for hours.'
                ],
                correct: 1,
                explanation: 'Past Perfect Continuous: had been writing.',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Какой вариант содержит ошибку?',
                options: [
                    'They had been training hard for the competition.',
                    'Before the accident, he hadn\'t been feeling right.',
                    'She had been searching for the job during weeks.',
                    'We had been living there for 5 years before moving.'
                ],
                correct: 2,
                explanation: 'Ошибка: "during weeks" должно быть "for weeks".',
                difficulty: 'hard',
                sentenceForm: 'negative'
            },
            {
                question: 'Какое предложение правильно использует Past Perfect Continuous?',
                options: [
                    'He worked as a teacher for 20 years when he retired.',
                    'He had worked as a teacher for 20 years when he retired.',
                    'He had been working as a teacher for 20 years when he retired.',
                    'He was working as a teacher for 20 years when he retired.'
                ],
                correct: 2,
                explanation: 'Past Perfect Continuous подчеркивает длительность: had been working.',
                difficulty: 'hard',
                sentenceForm: 'positive'
            },
            {
                question: 'Какой вопрос требует ответа "Yes, I had been"?',
                options: [
                    'Did you study hard?',
                    'Have you been working long?',
                    'Had you been working there before that?',
                    'Were you working yesterday?'
                ],
                correct: 2,
                explanation: '"Had you been working...?" = "Yes, I had (been)."',
                difficulty: 'hard',
                sentenceForm: 'question'
            },
            {
                question: 'Дополните: "How long __ they __ __ __ their business?"',
                options: [
                    'had, been, running',
                    'had, running',
                    'were, running',
                    'had been run'
                ],
                correct: 0,
                explanation: 'Past Perfect Continuous вопрос: How long had they been running?',
                difficulty: 'hard',
                sentenceForm: 'question'
            },
            {
                question: 'Выберите правильный порядок слов в Past Perfect Continuous вопросе:',
                options: [
                    'How long had you been playing before I arrived?',
                    'How long you had been playing before I arrived?',
                    'You had been playing how long before I arrived?',
                    'Had you been playing how long before I arrived?'
                ],
                correct: 0,
                explanation: 'Past Perfect Continuous вопрос: Question word + Had + подлежащее + been + V+ing?',
                difficulty: 'hard',
                sentenceForm: 'question'
            }
        ],
        videoQuiz2: [
            {
                noNum: true,
                text: '1. When Peppa says &ldquo;you hadn&rsquo;t been talking,&rdquo; she is talking about&hellip;',
                options: ['a quick action in the past at a specific moment', 'an action that continued for a period of time during the race'],
                correct: 1,
                explanation: 'Peppa uses the Past Perfect Continuous negative to describe an ongoing action (talking) that she wishes to be different. Suzy had been talking during the race, but Peppa wanted her not to talk.'
            },
            {
                type: 'intro',
                text: '2. Look at the construction: <em>&ldquo;&hellip;if you hadn&rsquo;t been talking to me.&rdquo;</em>'
            },
            {
                noNum: true,
                type: 'fill',
                text: 'What word is added to the auxiliary &ldquo;had&rdquo; to make it negative?',
                answer: 'not',
                altAnswers: ["n't"],
                placeholder: 'Type here: _____________',
                explanation: '&ldquo;Not&rdquo; comes after <strong>had</strong> in the sentence.<br><em>I had not been playing guitar.</em><br><em>They had not been waiting for the show.</em>'
            },
            {
                noNum: true,
                text: '&ldquo;Not&rdquo; in the sentence stays&hellip;',
                options: ['after &ldquo;had&rdquo;', 'after &ldquo;been&rdquo;'],
                correct: 0,
                explanation: '&ldquo;Not&rdquo; stays after <strong>had</strong> and before <strong>been</strong>.<br><em>I had not been playing guitar.</em><br><em>They had not been waiting for the show.</em>'
            },
            {
                noNum: true,
                text: '4. Does the auxiliary verb &ldquo;hadn&rsquo;t been&rdquo; change according to the subject?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'The Past Perfect Continuous negative always uses <strong>hadn&rsquo;t been</strong> regardless of the subject.'
            }
        ],
        grammarBank2: {
            blocks: [
                {
                    intro: '<strong>Grammar Bank: Past Perfect Continuous Negative</strong><br>The word order for negative sentences is:<br><strong>Subject + had + not + been + V-ing</strong><br>Contraction: <strong>had not = hadn&rsquo;t</strong><br><em>I would have won if you hadn&rsquo;t been talking to me.</em><br><table style="border-collapse:collapse;margin:10px 0;font-size:0.93rem;"><tr><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Subject</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Auxiliary + Not</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Marker</th><th style="padding:4px 0;color:#e2b714;text-align:left;">Main Verb (&minus;ing)</th></tr><tr><td style="padding:3px 14px 3px 0;">I</td><td style="padding:3px 14px 3px 0;">hadn&rsquo;t</td><td style="padding:3px 14px 3px 0;">been</td><td>talking</td></tr><tr><td style="padding:3px 14px 3px 0;">You</td><td style="padding:3px 14px 3px 0;">hadn&rsquo;t</td><td style="padding:3px 14px 3px 0;">been</td><td>talking</td></tr><tr><td style="padding:3px 14px 3px 0;">He / She / It</td><td style="padding:3px 14px 3px 0;">hadn&rsquo;t</td><td style="padding:3px 14px 3px 0;">been</td><td>talking</td></tr><tr><td style="padding:3px 14px 3px 0;">We</td><td style="padding:3px 14px 3px 0;">hadn&rsquo;t</td><td style="padding:3px 14px 3px 0;">been</td><td>talking</td></tr><tr><td style="padding:3px 14px 3px 0;">They</td><td style="padding:3px 14px 3px 0;">hadn&rsquo;t</td><td style="padding:3px 14px 3px 0;">been</td><td>talking</td></tr></table>',
                    table: [],
                    examples: [
                        'I would have won if you <strong>hadn&rsquo;t been talking</strong> to me.',
                        'She <strong>hadn&rsquo;t been focusing</strong> on the race before they reached the end.',
                        'They <strong>hadn&rsquo;t been running</strong> fast enough during the race.',
                        'He <strong>hadn&rsquo;t been listening</strong> to the advice about the race.'
                    ]
                }
            ]
        },
        videoQuiz2b: [
            { type: 'intro', text: '<strong>Practice Negative &mdash; Choose the correct option:</strong>' },
            {
                noNum: true,
                text: '1. The girls finished last because they ______ (run) fast enough during the race.',
                options: ['hadn\'t been run', 'hadn\'t been running', 'wasn\'t been running'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>hadn&rsquo;t been running</strong> &mdash; Past Perfect Continuous negative: hadn\'t been + V-ing.'
            },
            {
                noNum: true,
                text: '2. Susie was distracted because she ______ (look) at the finish line; she was looking at Peppa instead.',
                options: ['hadn\'t been looking', 'hadn\'t been look', 'haven\'t been looking'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>hadn&rsquo;t been looking</strong> &mdash; Past Perfect Continuous negative: hadn\'t been + V-ing.'
            },
            {
                noNum: true,
                text: '3. Before they reached the end, the two friends ______ (focus) on the competition.',
                options: ['hadn\'t being focusing', 'hadn\'t been focusing', 'hadn\'t been focus'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>hadn&rsquo;t been focusing</strong> &mdash; Past Perfect Continuous negative: hadn\'t been + V-ing.'
            },
            {
                noNum: true,
                text: '4. Rebecca Rabbit won because the other kids ______ (not / move) as quickly as her.',
                options: ['hadn\'t been moving', 'hadn\'t be moving', 'hasn\'t been moving'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>hadn&rsquo;t been moving</strong> &mdash; Past Perfect Continuous negative: hadn\'t been + V-ing.'
            },
            {
                noNum: true,
                text: '5. Daddy Pig noticed that Peppa ______ (not / listen) to his advice about the race earlier.',
                options: ['hadn\'t been listen', 'wasn\'t been listening', 'hadn\'t been listening'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>hadn&rsquo;t been listening</strong> &mdash; Past Perfect Continuous negative: hadn\'t been + V-ing.'
            }
        ],
        videoQuiz3: [
            {
                noNum: true,
                text: '1. Look at the question: &ldquo;Had you been drinking when you operated on his father?&rdquo; The &ldquo;drinking&rdquo; happened&hellip;',
                options: ['at the exact same moment as the surgery', 'it started before the surgery and continued up until the surgery'],
                correct: 1,
                explanation: 'Past Perfect Continuous shows an action that started earlier and continued up to another point in the past.'
            },
            {
                noNum: true,
                text: '2. Why does she use &ldquo;drinking&rdquo; (&minus;ing) instead of &ldquo;drunk&rdquo;?',
                options: ['to show a single, quick action.', 'to emphasize an ongoing action over a period of time.'],
                correct: 1,
                explanation: 'The &minus;ing form emphasizes duration and continuity of the action.'
            },
            {
                type: 'intro',
                text: '3. Look at the word order: <em>&ldquo;Had you been drinking&hellip;?&rdquo;</em><br>Statement: <em>You had been drinking.</em><br>Question: <em>Had you been drinking?</em>'
            },
            {
                noNum: true,
                text: 'Which word starts the question?',
                options: ['Been', 'Had'],
                correct: 1,
                explanation: 'In interrogative Past Perfect Continuous sentences, subject and auxiliary verbs change their places.'
            },
            {
                noNum: true,
                text: '4. The word &ldquo;been&rdquo; in the interrogative sentences stays&hellip;',
                options: ['after &ldquo;Had&rdquo;', 'after subject'],
                correct: 1,
                explanation: 'Word order is: <strong>Had + subject + been + V-ing</strong>.'
            },
            {
                type: 'intro',
                text: '<strong>5. Put the words in correct order</strong>'
            },
            {
                type: 'drag',
                noNum: true,
                text: 'you / Had / doing / for 3 hours? / been / surgery',
                words: ['Had', 'you', 'been', 'doing', 'surgery', 'for 3 hours?'],
                correct: 'Had you been doing surgery for 3 hours?'
            }
        ],
        grammarBank3: {
            blocks: [
                {
                    intro: '<strong>GRAMMAR BANK: Past Perfect Continuous (Questions)</strong><br>We use the Past Perfect Continuous Question Form to ask about the duration or cause of an action that was in progress before another action in the past.<br>The word order for interrogative Past Perfect Continuous sentences is:<br><strong>Had + subject + been + Verb-ing?</strong><br><em>Had they been arguing for a long time?</em><br><em>Had you been waiting for the bus for a while until it arrived?</em><br><table style="border-collapse:collapse;margin:10px 0;font-size:0.93rem;"><tr><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Had</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Subject</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Been</th><th style="padding:4px 0;color:#e2b714;text-align:left;">Main Verb (&minus;ing)</th></tr><tr><td style="padding:3px 14px 3px 0;">Had</td><td style="padding:3px 14px 3px 0;">I</td><td style="padding:3px 14px 3px 0;">been</td><td>waiting?</td></tr><tr><td style="padding:3px 14px 3px 0;">Had</td><td style="padding:3px 14px 3px 0;">you</td><td style="padding:3px 14px 3px 0;">been</td><td>drinking?</td></tr><tr><td style="padding:3px 14px 3px 0;">Had</td><td style="padding:3px 14px 3px 0;">he / she / it</td><td style="padding:3px 14px 3px 0;">been</td><td>working?</td></tr><tr><td style="padding:3px 14px 3px 0;">Had</td><td style="padding:3px 14px 3px 0;">we</td><td style="padding:3px 14px 3px 0;">been</td><td>studying?</td></tr><tr><td style="padding:3px 14px 3px 0;">Had</td><td style="padding:3px 14px 3px 0;">they</td><td style="padding:3px 14px 3px 0;">been</td><td>talking?</td></tr></table><strong>Short Answers</strong><br>Yes, I had.<br>No, he hadn&rsquo;t.',
                    table: [],
                    examples: [
                        '<strong>Had you been drinking</strong> when you operated on his father?',
                        '<strong>Had they been arguing</strong> for a long time?',
                        '<strong>Had you been waiting</strong> for the bus for a while until it arrived?',
                        'How long <strong>had the woman been worrying</strong> before this meeting?'
                    ]
                }
            ]
        },
        videoQuiz3b: [
            { type: 'intro', text: '<strong>Practice Interrogative &mdash; Choose the correct option:</strong>' },
            {
                noNum: true,
                text: '1. ___ the man ___ (smoke) for a long time before the woman started talking to him?',
                options: ['Had been the man smoking', 'Had the man been smoking', 'Has the man been smoking'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>Had the man been smoking</strong> &mdash; Past Perfect Continuous question: Had + subject + been + V-ing?'
            },
            {
                noNum: true,
                text: '2. ___ the man (the surgeon) ___ (drink) before he performed the operation?',
                options: ['Had the man been drinking', 'Had the man being drinking', 'Did the man had been drinking'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>Had the man been drinking</strong> &mdash; Past Perfect Continuous question: Had + subject + been + V-ing?'
            },
            {
                noNum: true,
                text: '3. How long ___ the woman ___ (worry) about the incident before this meeting?',
                options: ['had been the woman worrying', 'had the woman been worrying', 'was the woman been worrying'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>had the woman been worrying</strong> &mdash; Past Perfect Continuous question: How long + had + subject + been + V-ing?'
            },
            {
                noNum: true,
                text: '4. ___ the medical team ___ (work) for many hours before they made the mistake?',
                options: ['Had the team been working', 'Had the team been work', 'Had being the team working'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>Had the team been working</strong> &mdash; Past Perfect Continuous question: Had + subject + been + V-ing?'
            },
            {
                noNum: true,
                text: '5. ___ the two people ___ (discuss) the truth before the man decided to speak out?',
                options: ['Had they being discussing', 'Had been they discussing', 'Had they been discussing'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>Had they been discussing</strong> &mdash; Past Perfect Continuous question: Had + subject + been + V-ing?'
            }
        ]
    },

    'future-simple': {
        title: 'Future Simple',
        russian: 'Будущее простое',
        structure: 'will + V',
        videoFile: 'future simple 1.1.mp4',
        videoFile2: 'future simple 2.mp4',
        videoFile3: 'future simple 3.1.mp4',
        usage: [
            'Решение в момент говорения',
            'Предположения о будущем',
            'Обещания и предложения',
            'Простые будущие события'
        ],
        rules: [
            { type: 'Утверждение', example: 'I will help you.' },
            { type: 'Отрицание', example: 'She won\'t come tomorrow.' },
            { type: 'Вопрос', example: 'Will you see me?' }
        ],
        examples: [
            {
                source: 'Terminator 2',
                dialogue: '"I\'ll be back."',
                translation: 'Я вернусь.'
            }
        ],
        exercises: [
            {
                question: 'Выберите правильное предложение:',
                options: [
                    'I will goes to the party.',
                    'I will go to the party.',
                    'I going to go to the party.',
                    'I will to go to the party.'
                ],
                correct: 1,
                explanation: 'Future Simple: will + инфинитив без "to"',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Дополните: "She __ finish the project tomorrow."',
                options: [
                    'will',
                    'shall',
                    'will be',
                    'is going to'
                ],
                correct: 0,
                explanation: 'Future Simple: will + базовая форма глагола.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильное предложение:',
                options: [
                    'They will come next week.',
                    'They will comes next week.',
                    'They will to come next week.',
                    'They will coming next week.'
                ],
                correct: 0,
                explanation: 'Future Simple: will + базовая форма (come).',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите отрицание в Future Simple:',
                options: [
                    'He will not come.',
                    'He won\'t come.',
                    'Оба варианта верны.',
                    'Ни один не верен.'
                ],
                correct: 2,
                explanation: 'Оба - "will not" и "won\'t" - верны.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Дополните отрицание: "I __ not eat meat tomorrow."',
                options: [
                    'will',
                    'shall',
                    'would',
                    'need'
                ],
                correct: 0,
                explanation: 'Future Simple отрицание: will not / won\'t.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Какой вопрос грамматически верен?',
                options: [
                    'Will you help me?',
                    'You will help me?',
                    'Will help you me?',
                    'Help will you me?'
                ],
                correct: 0,
                explanation: 'Future Simple вопрос: Will + подлежащее + глагол?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Завершите вопрос: "__ he __ to the concert next Saturday?"',
                options: [
                    'Does, go',
                    'Will, go',
                    'Is, going',
                    'Would, go'
                ],
                correct: 1,
                explanation: 'Future Simple вопрос: Will he go?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Выберите правильное использование Future Simple:',
                options: [
                    'I am sure she will arrive on time.',
                    'I am sure she arrived on time.',
                    'I was sure she will arrive on time.',
                    'I am sure she is arriving on time.'
                ],
                correct: 0,
                explanation: 'Future Simple для предположения: will arrive.',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Найдите ошибку:',
                options: [
                    'They will open a new store next month.',
                    'I won\'t be home this evening.',
                    'He will to call you later.',
                    'You will see the results soon.'
                ],
                correct: 2,
                explanation: 'Ошибка: "will to call" должно быть "will call".',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильный вариант:',
                options: [
                    'When you arrive, I will prepare dinner.',
                    'When you will arrive, I prepare dinner.',
                    'When you arrive, I prepare dinner.',
                    'When you will arrive, I will prepare dinner.'
                ],
                correct: 0,
                explanation: 'В придаточном предложении времени: Present Simple, в главном: Future Simple.',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Какой вариант содержит ошибку?',
                options: [
                    'She won\'t forget this moment.',
                    'They will not arrive on time.',
                    'I will wait for you.',
                    'He not will come tomorrow.'
                ],
                correct: 3,
                explanation: 'Ошибка: "not will" должно быть "will not / won\'t".',
                difficulty: 'hard',
                sentenceForm: 'negative'
            },
            {
                question: 'Какое предложение правильно использует Future Simple?',
                options: [
                    'I think he will succeed.',
                    'I think he succeeds.',
                    'I think he succeeded.',
                    'I think he is succeeding.'
                ],
                correct: 0,
                explanation: 'Future Simple для предположений: will succeed.',
                difficulty: 'hard',
                sentenceForm: 'positive'
            },
            {
                question: 'Какой вопрос требует ответа "Yes, I will"?',
                options: [
                    'Do you like coffee?',
                    'Did you call me?',
                    'Will you come to the party?',
                    'Are you working tomorrow?'
                ],
                correct: 2,
                explanation: '"Will you come...?" = "Yes, I will."',
                difficulty: 'hard',
                sentenceForm: 'question'
            },
            {
                question: 'Дополните: "__ you __ with me next weekend?"',
                options: [
                    'Do, go',
                    'Did, go',
                    'Will, go',
                    'Are, going'
                ],
                correct: 2,
                explanation: 'Future Simple вопрос: Will you go?',
                difficulty: 'hard',
                sentenceForm: 'question'
            },
            {
                question: 'Выберите правильный порядок слов в Future Simple вопросе:',
                options: [
                    'When will they arrive at the airport?',
                    'When they will arrive at the airport?',
                    'They will arrive when at the airport?',
                    'Will arrive they when at the airport?'
                ],
                correct: 0,
                explanation: 'Future Simple вопрос: Question word + Will + подлежащее + глагол?',
                difficulty: 'hard',
                sentenceForm: 'question'
            }
        ],
        videoQuiz1: [
            { type: 'intro', text: 'Look at the dialogue:<br><em>Peppa: In the future we will have a yellow car.<br>Suzy: No, blue.<br>Peppa: Yellow and blue.<br>Suzy: I will drive.<br>Peppa: So, will I.</em>' },
            {
                text: 'Are they driving a yellow car right now?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'They are talking about the future — the car does not exist yet. They are <strong>not</strong> driving right now.'
            },
            {
                text: 'Do Peppa and Suzy have the car now?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'The car is a future plan. Peppa and Suzy do <strong>not</strong> have it now.'
            },
            {
                text: 'Did they have the car in the past?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'The car is only a plan for the future — it did not exist in the past.'
            },
            {
                text: 'The car is real in the…',
                options: ['past', 'present', 'future'],
                correct: 2,
                explanation: 'The car is a <strong>future</strong> dream — it will exist one day, but not now and not in the past.'
            },
            {
                text: 'Is this a plan for tomorrow morning, or for a long time from now?',
                options: ['For tomorrow morning', 'A long time &ldquo;in the future&rdquo;'],
                correct: 1,
                explanation: 'Peppa says &ldquo;in the future&rdquo; — this is a dream about a distant future, not a specific plan for tomorrow.'
            },
            { type: 'intro', text: 'Look at the sentences:<br><em>Daddy dog will be a spaceman.<br>And George will be a dinosaur.</em>' },
            {
                text: 'What auxiliary verb do we use to talk about the future?',
                options: ['do', 'did', 'will'],
                correct: 2,
                explanation: 'We use <strong>will</strong> to talk about actions and events that will happen in the future.'
            },
            {
                text: 'Look at the main verbs in the sentences. Are they in infinitive form?',
                options: ['Yes', 'No'],
                correct: 0,
                explanation: 'Yes — after <strong>will</strong> we always use the base (infinitive) form of the verb: <em>will be</em>, <em>will drive</em>, <em>will have</em>.'
            },
            { type: 'intro', text: 'Look at the sentences:<br><em>I will drive.<br>In the future we will have a yellow car.<br>Daddy will be a spaceman.</em>' },
            {
                text: 'Does &ldquo;will&rdquo; change if the person changes?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'The Future Simple auxiliary <strong>will</strong> is the same for all persons — I will, you will, he will, she will, we will, they will.'
            },
            {
                type: 'drag',
                text: 'Put the words in the correct order:',
                words: ['Peppa Pig', 'will', 'have', 'a yellow', 'car.'],
                correct: 'Peppa Pig will have a yellow car.',
                explanation: 'The word order in the Future Simple is <strong>SAI</strong> (Subject + auxiliary verb + infinitive): <em>Peppa Pig <strong>will have</strong> a yellow car.</em>'
            }
        ],
        grammarBank1: {
            title: 'Future Simple +',
            intro: 'We use the Future Simple for <strong>future predictions, promises, and future plans.</strong><br><br>Word order: <strong>SAI</strong> = Subject&nbsp;+&nbsp;<strong>will</strong>&nbsp;+&nbsp;infinitive',
            structure: 'The Future Simple auxiliary verb <strong>will</strong> is the same for all persons.<br><br><table style="border-collapse:collapse;margin:8px 0;font-size:0.95rem;"><tr><td style="padding:4px 14px 4px 0;font-weight:600;color:#e2b714;white-space:nowrap;">I</td><td style="padding:4px 0;">will</td></tr><tr><td style="padding:4px 14px 4px 0;font-weight:600;color:#e2b714;white-space:nowrap;">You</td><td style="padding:4px 0;">will</td></tr><tr><td style="padding:4px 14px 4px 0;font-weight:600;color:#e2b714;white-space:nowrap;">He</td><td style="padding:4px 0;">will</td></tr><tr><td style="padding:4px 14px 4px 0;font-weight:600;color:#e2b714;white-space:nowrap;">She</td><td style="padding:4px 0;">will</td></tr><tr><td style="padding:4px 14px 4px 0;font-weight:600;color:#e2b714;white-space:nowrap;">It</td><td style="padding:4px 0;">will</td></tr><tr><td style="padding:4px 14px 4px 0;font-weight:600;color:#e2b714;white-space:nowrap;">We</td><td style="padding:4px 0;">will</td></tr><tr><td style="padding:4px 14px 4px 0;font-weight:600;color:#e2b714;white-space:nowrap;">They</td><td style="padding:4px 0;">will</td></tr></table><br><strong>Contractions:</strong> I&rsquo;ll = I will &nbsp;&bull;&nbsp; You&rsquo;ll = You will &nbsp;&bull;&nbsp; He&rsquo;ll = He will &nbsp;&bull;&nbsp; She&rsquo;ll = She will &nbsp;&bull;&nbsp; It&rsquo;ll = It will &nbsp;&bull;&nbsp; We&rsquo;ll = We will &nbsp;&bull;&nbsp; They&rsquo;ll = They will',
            examples: [
                'I&rsquo;ll study maths at university.',
                'Peppa <strong>will</strong> go on a holiday.',
                'They&rsquo;ll buy a new house.'
            ]
        },
        videoQuiz1b: [
            { type: 'intro', text: '<strong>Practice — Affirmative:</strong> Choose the correct option.' },
            { text: 'In the future, Susie and Peppa _________ a car.', options: ['will have', 'will having', 'will has'], correct: 0, wrongOnly: true, explanation: 'After <strong>will</strong> we always use the infinitive (base form): <strong>will have</strong>.' },
            { text: 'In the future, Peppa _________ a car.', options: ['will driving', 'will drive', 'will drove'], correct: 1, wrongOnly: true, explanation: 'After <strong>will</strong> we always use the base form: <strong>will drive</strong>.' },
            { text: 'Daddy dog _________ a spaceman.', options: ['will has', 'will be', 'will gets'], correct: 1, wrongOnly: true, explanation: 'After <strong>will</strong> use the base form: <strong>will be</strong>.' },
            { text: 'George __________ a dinosaur.', options: ['will had', 'will was', 'will be'], correct: 2, wrongOnly: true, explanation: 'After <strong>will</strong> use the base form: <strong>will be</strong>.' },
            { text: 'Peppa _________ have a yellow car.', options: ['have', 'will', 'did'], correct: 1, wrongOnly: true, explanation: 'We need the auxiliary <strong>will</strong> before the infinitive to form the Future Simple.' },
            { text: 'Susie _________ have a blue car.', options: ['have', 'will', 'did'], correct: 1, wrongOnly: true, explanation: 'We need the auxiliary <strong>will</strong> before the infinitive to form the Future Simple.' },
            { text: 'They _________ the cars in the future.', options: ['will drive', 'will drives', 'will driving'], correct: 0, wrongOnly: true, explanation: 'After <strong>will</strong> the verb stays in the base form: <strong>will drive</strong> — no -s or -ing.' },
            { text: 'Peppa and Susie _________ old.', options: ['will been', 'will be', 'will was'], correct: 1, wrongOnly: true, explanation: 'After <strong>will</strong> use the base form: <strong>will be</strong>.' },
            { text: 'Suzy Sheep _________ a doctor.', options: ['will become', 'will becomes', 'will becoming'], correct: 0, wrongOnly: true, explanation: 'After <strong>will</strong> use the base form: <strong>will become</strong> — no -s or -ing.' },
            { text: 'In the future, everything _________ different.', options: ['will is', 'will be', 'will are'], correct: 1, wrongOnly: true, explanation: 'After <strong>will</strong> use the base form: <strong>will be</strong> — not &ldquo;is&rdquo; or &ldquo;are&rdquo;.' }
        ],
        videoQuiz2: [
            { type: 'intro', text: 'Look at the dialogue:<br><em>Rachel: What happened?<br>Phoebe: Hummus. I got the hummus.<br>Rachel: Honey, we will find you something. Do you want to wear my black jacket?<br>Phoebe: That won&rsquo;t go with this dress, though.<br>Rachel: No, you are right. Well, we will find you something.</em>' },
            {
                text: 'Did Rachel plan to find Phoebe something before she saw the stain on her dress?',
                options: ['Yes, it was planned', 'No, it was spontaneous'],
                correct: 1,
                explanation: 'We use <strong>will + infinitive</strong> to talk about <strong>spontaneous decisions</strong> or quick reactions to something.<br>Examples: <em>Someone knocked. I will open the door.</em> &nbsp; <em>Stop shouting. He will cry.</em> &nbsp; <em>They will stay. The weather is getting worse.</em>'
            },
            {
                text: 'Finding Phoebe a new outfit — is it a long-term plan or a quick reaction to solve the problem?',
                options: ['A long-term plan', 'A quick reaction'],
                correct: 1,
                explanation: 'Rachel makes a <strong>spontaneous decision</strong> in the moment. We use <strong>will</strong> for such quick reactions, not pre-planned arrangements.'
            },
            { type: 'intro', text: 'Look at the dialogue again:<br><em>Rachel: Honey, do you want to wear my black jacket?<br>Phoebe: That won&rsquo;t go with this dress, though.<br>Rachel: No, you are right. Well, we will find you something.</em>' },
            {
                text: 'When Phoebe says the black jacket won&rsquo;t suit the dress — is she 100% sure, or is she predicting?',
                options: ['She is 100% sure', 'She is predicting'],
                correct: 1,
                explanation: 'We also use <strong>will + infinitive</strong> for <strong>predictions</strong> and <strong>promises</strong>.<br>Examples: <em>I will be late, I guess.</em> &nbsp; <em>I will help you with that later, I promise.</em>'
            },
            {
                text: 'When Rachel says &ldquo;we will find you something&rdquo; — is she stating a fact or making a promise?',
                options: ['Stating a fact', 'Making a promise'],
                correct: 1,
                explanation: '<strong>Will</strong> is used to make <strong>promises</strong>. Rachel is assuring Phoebe she will definitely help her.'
            },
            { type: 'intro', text: 'Look at Phoebe&rsquo;s line: <em>It won&rsquo;t go with this dress, though.</em>' },
            {
                text: 'Is she giving a positive or a negative comment about the black jacket?',
                options: ['Positive', 'Negative'],
                correct: 1,
                explanation: '<strong>Won&rsquo;t</strong> makes the sentence negative. Contraction: <strong>won&rsquo;t = will + not</strong>.'
            },
            {
                text: 'What word is making the sentence negative?',
                options: ['won&rsquo;t', 'go', 'though'],
                correct: 0,
                explanation: '<strong>Won&rsquo;t = will + not</strong>. It is the negative form of will used in Future Simple.'
            },
            {
                type: 'drag',
                text: 'Put the words in the correct order:',
                words: ['It', 'will', 'not', 'rain', 'today.'],
                correct: 'It will not rain today.',
                explanation: 'Negative Future Simple word order: <strong>Subject + will not + infinitive</strong>: <em>It will not rain today.</em>'
            },
            {
                type: 'drag',
                text: 'Put the words in the correct order:',
                words: ['The black jacket', 'won&rsquo;t', 'suit', 'the yellow dress.'],
                correct: 'The black jacket won\'t suit the yellow dress.',
                explanation: 'Negative Future Simple with contraction: <strong>Subject + won&rsquo;t + infinitive</strong>: <em>The black jacket won&rsquo;t suit the yellow dress.</em>'
            }
        ],
        grammarBank2: {
            title: 'Future Simple —',
            intro: 'We use <strong>will + infinitive</strong> to give <strong>promises</strong>, to state <strong>predictions</strong>, or when we make <strong>spontaneous decisions</strong>.<br><br>Word order for <strong>negative</strong> Future Simple: <strong>SAI</strong> = Subject&nbsp;+&nbsp;<strong>won&rsquo;t</strong>&nbsp;+&nbsp;infinitive<br><br>Contraction: <strong>won&rsquo;t = will + not</strong>',
            structure: '',
            examples: [
                'It <strong>won&rsquo;t</strong> snow today, I guess.',
                'He <strong>won&rsquo;t</strong> be noisy anymore, he promises.',
                'We <strong>won&rsquo;t</strong> go outside, it started to rain.'
            ]
        },
        videoQuiz2b: [
            { type: 'intro', text: '<strong>Practice — Usage &amp; Negative:</strong> Choose the correct option.' },
            { text: 'Continue the sentence: &ldquo;Someone is knocking at the door, _________.&rdquo;', options: ['I will open the door', 'I opened the door', 'I open the door'], correct: 0, wrongOnly: true, explanation: 'We use <strong>will</strong> for spontaneous decisions made at the moment of speaking.' },
            { text: 'Joey says &ldquo;I&rsquo;m really hungry.&rdquo; How will you answer?', options: ['I make you a sandwich', 'I made you a sandwich', 'I will make you a sandwich'], correct: 2, wrongOnly: true, explanation: 'A spontaneous reaction to what Joey just said — we use <strong>will</strong> for decisions made on the spot.' },
            { text: 'The phone is ringing in the apartment.', options: ['I answered it', 'I will answer it', 'I answer it'], correct: 1, wrongOnly: true, explanation: 'Spontaneous decision in the moment: <strong>I will answer it</strong>.' },
            { text: 'Someone spilled the water. Can somebody clean it?', options: ['I will clean it', 'I cleaned it', 'I am going to clean it'], correct: 0, wrongOnly: true, explanation: 'A spontaneous offer or decision: <strong>I will clean it</strong>.' },
            { text: 'Finish the sentence: &ldquo;I&rsquo;m busy now, _________ later.&rdquo;', options: ['I call you', 'I will call you', 'I called you'], correct: 1, wrongOnly: true, explanation: 'A promise made in the moment: <strong>I will call you</strong> later.' },
            { type: 'intro', text: '<strong>Negative — choose the correct option:</strong>' },
            { text: 'Phoebe _________ her yellow dress to the event because it has a stain.', options: ['will not wearing', 'will not wear', 'not will wear'], correct: 1, wrongOnly: true, explanation: 'Negative Future Simple: <strong>Subject + will not + infinitive</strong>. The main verb stays in the base form: <strong>will not wear</strong>.' },
            { text: 'Ross _________ calm if they don&rsquo;t find a new outfit soon.', options: ['will not being', 'not will be', 'will not be'], correct: 2, wrongOnly: true, explanation: '<strong>Will not be</strong> — after will not the verb stays in the base form: <em>be</em>, not <em>being</em>.' },
            { text: 'Rachel _________ Phoebe wear a dirty dress to the party.', options: ['will not let', 'will no let', 'not will let'], correct: 0, wrongOnly: true, explanation: 'Negative: <strong>will not let</strong>. &ldquo;Will no&rdquo; and &ldquo;not will&rdquo; are not correct forms.' },
            { text: 'Phoebe _________ the black jacket because it doesn&rsquo;t match her dress.', options: ['will no use', 'will not use', 'not will use'], correct: 1, wrongOnly: true, explanation: 'Negative Future Simple: <strong>will not use</strong>. Only &ldquo;will not&rdquo; or &ldquo;won&rsquo;t&rdquo; are correct.' },
            { text: 'They _________ for the party until Phoebe is ready.', options: ['will not leave', 'will no leave', 'not will leave'], correct: 0, wrongOnly: true, explanation: 'Negative Future Simple: <strong>will not leave</strong>. &ldquo;Will no&rdquo; and &ldquo;not will&rdquo; are incorrect.' }
        ],
        videoQuiz3: [
            { type: 'intro', text: 'Look at the dialogue:<br><em>Peppa: What will we do at the castle, Mummy?<br>Mama Pig: Let me see what the guidebook says.<br>Peppa: Will the castle be good or will it be boring?<br>Mamma Pig: It will be good.<br>Peppa: Will we see the knights in armour?</em>' },
            {
                text: 'What word starts the questions?',
                options: ['Do', 'Did', 'Will'],
                correct: 2,
                explanation: 'The word order in <strong>interrogative</strong> Future Simple sentences is <strong>ASI</strong> (Auxiliary verb + Subject + Infinitive).<br>Examples: <em>Will the castle be good? &nbsp; Will the castle be boring? &nbsp; Will we see the knights in armour?</em>'
            },
            {
                text: 'The subject in the questions stays…',
                options: ['After the auxiliary verb', 'Before the auxiliary verb'],
                correct: 0,
                explanation: 'In Future Simple questions <strong>will</strong> comes first, then the subject: <strong>Will + subject + infinitive</strong>.'
            },
            { type: 'intro', text: 'Look at the dialogue:<br><em>Peppa: What will your job be?<br>Suzy: I will be a nurse. But in my lunch break I will fly a plane.<br>What will your job be, Peppa?<br>Peppa: My job will be doing important work on my computer.</em>' },
            {
                text: 'What word starts the questions in this dialogue?',
                options: ['What', 'Will'],
                correct: 0,
                explanation: '<strong>What</strong> is a WH-question word. WH-question words stay at the <strong>beginning</strong> of the sentence.<br>Examples: <em>What will your job be? &nbsp; What will we do at the castle?</em>'
            },
            {
                type: 'drag',
                text: 'Put the words in the correct order:',
                words: ['Will', 'Daddy Dog', 'be', 'a spaceman?'],
                correct: 'Will Daddy Dog be a spaceman?',
                explanation: 'Yes/No question word order: <strong>Will + subject + infinitive?</strong> &rarr; <em>Will Daddy Dog be a spaceman?</em>'
            },
            {
                type: 'drag',
                text: 'Put the words in the correct order:',
                words: ['What', 'will', 'we', 'do', 'at school?'],
                correct: 'What will we do at school?',
                explanation: 'WH-question word order: <strong>WH-word + will + subject + infinitive?</strong> &rarr; <em>What will we do at school?</em>'
            }
        ],
        grammarBank3: {
            blocks: [
                {
                    intro: '<strong>INTERROGATIVE Future Simple</strong><br>The word order for yes/no questions: <strong>Will + subject + infinitive?</strong>',
                    table: [],
                    examples: [
                        'Will I see the dinosaurs at the zoo?',
                        'Will Peppa swim in the pool?',
                        'Will they go to watch the dolphins?'
                    ]
                },
                {
                    intro: 'The <strong>WH-question words</strong> (who, what, why, when, where, etc.) stay at the <strong>beginning</strong> of interrogative sentences.<br>Word order: <strong>WH-word + will + subject + infinitive?</strong>',
                    table: [],
                    examples: [
                        'Where will I sleep tonight?',
                        'What will George eat for lunch?',
                        'What will we do at the castle?'
                    ]
                }
            ]
        },
        videoQuiz3b: [
            {
                type: 'intro',
                text: `
<div class="pronunciation-box" style="display:block; margin: 10px 0 20px 0;">
    <div class="pronunciation-header">
        <span class="pronunciation-icon">🔊</span>
        <div>
            <h3 class="pronunciation-title">Pronunciation</h3>
            <p class="pronunciation-subtitle">Future Simple <strong>'ll</strong> and <strong>won't</strong></p>
        </div>
    </div>

    <div class="pron-section">
        <p class="pronunciation-listen-label">Listen and repeat the words and phrases. Copy the rhythm.</p>
        <audio class="pronunciation-audio" controls>
            <source src="future simple audio 1.mp3" type="audio/mpeg">
        </audio>
        <div class="pron-rhythm-list" style="line-height: 1.8; font-size: 1.05rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px;">
            <p style="margin:0; padding:10px; background:#f8f9ff; border-radius:8px; border-left:3px solid #667eea;"><strong>I’ll</strong> &gt; I’ll be late &gt; I’ll be late for work.</p>
            <p style="margin:0; padding:10px; background:#f8f9ff; border-radius:8px; border-left:3px solid #667eea;"><strong>You’ll</strong> &gt; You’ll never &gt; You’ll never learn.</p>
            <p style="margin:0; padding:10px; background:#f8f9ff; border-radius:8px; border-left:3px solid #667eea;"><strong>He’ll</strong> &gt; He’ll pay &gt; He’ll pay you back.</p>
            <p style="margin:0; padding:10px; background:#f8f9ff; border-radius:8px; border-left:3px solid #667eea;"><strong>It’ll</strong> &gt; It’ll go &gt; It’ll go well</p>
            <p style="margin:0; padding:10px; background:#f8f9ff; border-radius:8px; border-left:3px solid #667eea;"><strong>We’ll</strong> &gt; We’ll miss &gt; We’ll miss the flight.</p>
            <p style="margin:0; padding:10px; background:#f8f9ff; border-radius:8px; border-left:3px solid #667eea;"><strong>They’ll</strong> &gt; They’ll read &gt; They’ll read the paper.</p>
        </div>
    </div>

    <div class="pron-section" style="margin-top:25px; padding-top:20px; border-top:1px solid rgba(0,0,0,0.05);">
        <p class="pronunciation-listen-label">Listen and repeat. Copy the rhythm. Pay attention to “won’t”</p>
        <p style="margin-bottom:10px; color:#e2b714; font-weight: 600;">will not &gt; won’t</p>
        <audio class="pronunciation-audio" controls>
            <source src="future simple audio 2.mp3" type="audio/mpeg">
        </audio>
        <ul class="sound-sentences" style="list-style:none; padding-left:0; font-size: 1.05rem;">
            <li style="margin-bottom: 8px;">I <strong>won’t</strong> be late for work.</li>
            <li style="margin-bottom: 8px;">You <strong>won’t</strong> miss the train.</li>
            <li>They <strong>won’t</strong> call us back.</li>
        </ul>
    </div>
</div>
`
            },
            { type: 'intro', text: '<strong>Practice — Interrogative:</strong> Choose the correct option.' },
            { text: '______ Suzy ______ a nurse when she grows up?', options: ['Will / be', 'Will / being', 'Does / will be'], correct: 0, wrongOnly: true, explanation: 'Future Simple question: <strong>Will + subject + infinitive</strong>. The main verb stays in the base form: <em>be</em>.' },
            { text: '______ she ______ a plane during her lunch break?', options: ['Is / will fly', 'Will / flies', 'Will / fly'], correct: 2, wrongOnly: true, explanation: 'After <strong>will</strong> the verb is always in the base (infinitive) form: <strong>Will she fly</strong>.' },
            { text: '______ Peppa ______ a job on a computer?', options: ['Does / will have', 'Will / have', 'Will / has'], correct: 1, wrongOnly: true, explanation: '<strong>Will + subject + infinitive</strong>: <em>Will Peppa <strong>have</strong></em> — no -s after will.' },
            { text: '______ they ______ in a house with fountains?', options: ['Do / will live', 'Will / living', 'Will / live'], correct: 2, wrongOnly: true, explanation: 'Future Simple question: <strong>Will they live</strong> — base form, no -ing.' },
            { text: '______ Peppa ______ important work?', options: ['Will / do', 'Will / doing', 'Does / will do'], correct: 0, wrongOnly: true, explanation: '<strong>Will Peppa do</strong> — base form after will.' },
            { text: '______ the family ______ to a castle in their car?', options: ['Will / go', 'Will / going', 'Does / will go'], correct: 0, wrongOnly: true, explanation: '<strong>Will + subject + infinitive</strong>: <em>Will the family <strong>go</strong></em>.' },
            { text: '______ Mummy Pig ______ the guidebook to see what to do?', options: ['Will / looks', 'Will / look', 'Is / will look'], correct: 1, wrongOnly: true, explanation: 'After <strong>will</strong> the verb stays in the base form: <strong>look</strong>, not <em>looks</em>.' },
            { text: '______ the castle ______ boring for Peppa and George?', options: ['Is / will be', 'Will / being', 'Will / be'], correct: 2, wrongOnly: true, explanation: '<strong>Will the castle be</strong> — base form <em>be</em>, not <em>being</em>.' },
            { text: '______ they ______ knights in armour at the castle?', options: ['Will / seeing', 'Will / see', 'Do / will see'], correct: 1, wrongOnly: true, explanation: '<strong>Will they see</strong> — base form <em>see</em>, not <em>seeing</em>.' },
            { text: '______ Peppa ______ what the guidebook says?', options: ['Will / hear', 'Will / hears', 'Does / will hear'], correct: 0, wrongOnly: true, explanation: '<strong>Will Peppa hear</strong> — base form after will, no -s.' }
        ]
    },

    'future-continuous': {
        title: 'Future Continuous',
        russian: 'Будущее длительное',
        videoFile: 'future cont 1.mp4',
        videoFile2: 'future cont 2.mp4',
        videoFile3: 'future cont 3.mp4',
        structure: 'will + be + V+ing',
        usage: [
            'Действие будет происходить в определенный момент в будущем',
            'Неопределенное будущее действие',
            'То, что будет происходить когда произойдет другое действие'
        ],
        rules: [
            { type: 'Утверждение', example: 'I will be studying this time tomorrow.' },
            { type: 'Отрицание', example: 'They won\'t be sleeping.' },
            { type: 'Вопрос', example: 'Will you be working then?' }
        ],
        examples: [
            {
                source: 'Top Gun',
                dialogue: '"I will be flying tomorrow."',
                translation: 'Я буду летать завтра.'
            }
        ],
        videoQuiz1: [
            {
                text: '&ldquo;I guess I&rsquo;ll be practicing for another half hour.&rdquo; William means&hellip;',
                options: ['He will spend another half hour practicing.', 'He will start practicing in 30 minutes.'],
                correct: 0,
                explanation: 'When he says &ldquo;I&rsquo;ll be practicing,&rdquo; he is describing an activity that will be <strong>in progress</strong> in the future.'
            },
            {
                text: 'Is the speaker talking about a completed action or a continuous action?',
                options: ['A completed action', 'A continuous action'],
                correct: 1,
                explanation: 'The Future Continuous describes an action that will be <strong>ongoing</strong> at a specific point in the future &mdash; not finished, but in progress.'
            },
            {
                type: 'intro',
                text: 'Compare these two sentences:<br><em>A: I will practice for an hour.</em><br><em>B: I will be practicing for an hour.</em>'
            },
            {
                text: 'Which sentence sounds like a promise or a decision made at the moment?',
                options: ['A', 'B'],
                correct: 0,
                explanation: 'The Future Simple (<strong>will</strong>) is often used for facts, promises, or quick decisions.'
            },
            {
                text: 'Which sentence emphasizes the duration or the &ldquo;process&rdquo; of the activity?',
                options: ['A', 'B'],
                correct: 1,
                explanation: 'The Future Continuous (<strong>will be -ing</strong>) focuses on the activity itself taking place over a period of time.'
            },
            {
                type: 'intro',
                text: 'Look at the sentences:<br><em>&ldquo;How much longer <strong>will you be practicing</strong>? I <strong>will be practicing</strong> for another half hour.&rdquo;</em>'
            },
            {
                type: 'fill',
                text: 'What two &ldquo;helping&rdquo; verbs are repeated in each sentence?',
                answer: 'will be',
                placeholder: 'type...',
                explanation: 'The auxiliary phrase in the Future Continuous is always <strong>will be</strong>.'
            },
            {
                text: 'Does &ldquo;will be&rdquo; change according to the subjects (I, You, He, or They)?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'In the Future Continuous, the auxiliary verbs &ldquo;will be&rdquo; stay the same for every person.<br><em>I <strong>will be</strong> driving home after 2 hours.</em><br><em>They <strong>will be</strong> eating dinner tomorrow at this time.</em>'
            },
            {
                text: 'What form is the main verb in the sentences?',
                options: ['Base form (infinitive)', 'Past Participle (3rd form)', 'Present Participle (-ing form)'],
                correct: 2,
                explanation: 'We use the <strong>-ing form</strong> of the verb for all continuous tenses (Past, Present, and Future).<br><em>I am driv<strong>ing</strong> &nbsp;&bull;&nbsp; I was driv<strong>ing</strong> &nbsp;&bull;&nbsp; I will be driv<strong>ing</strong></em>'
            },
            {
                type: 'drag',
                text: 'Put the words in the correct order to describe William&rsquo;s afternoon:',
                words: ['will', 'he', 'playing', 'be', 'the', 'violin', 'at 4:00 PM.'],
                correct: 'He will be playing the violin at 4:00 PM.'
            }
        ],
        grammarBank1: {
            blocks: [
                {
                    intro: 'We use the Future Continuous for:<br><ul style="margin:8px 0 0 0;padding-left:18px;"><li>Actions <strong>in progress at a specific time</strong> in the future;</li><li><strong>Parallel</strong> future actions.</li></ul><br>The word order for positive Future Continuous sentences is <strong>SAV-ing</strong><br>(<strong>S</strong>ubject + <strong>will be</strong> + <strong>verb+ing</strong> / present participle).<br><br>In the Future Continuous, the auxiliary phrase <strong>&ldquo;will be&rdquo; never changes</strong>. It remains the same regardless of the subject.<br><table style="border-collapse:collapse;margin:10px 0;font-size:0.93rem;"><tr><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Subject</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Auxiliary Verbs</th><th style="padding:4px 0;color:#e2b714;text-align:left;">Main Verb (V-ing)</th></tr><tr><td style="padding:3px 14px 3px 0;">I</td><td style="padding:3px 14px 3px 0;">will be</td><td>practicing</td></tr><tr><td style="padding:3px 14px 3px 0;">You</td><td style="padding:3px 14px 3px 0;">will be</td><td>practicing</td></tr><tr><td style="padding:3px 14px 3px 0;">He / She / It</td><td style="padding:3px 14px 3px 0;">will be</td><td>practicing</td></tr><tr><td style="padding:3px 14px 3px 0;">We</td><td style="padding:3px 14px 3px 0;">will be</td><td>practicing</td></tr><tr><td style="padding:3px 14px 3px 0;">They</td><td style="padding:3px 14px 3px 0;">will be</td><td>practicing</td></tr></table>',
                    table: [],
                    examples: [
                        'I <strong>will be practicing</strong> for another half hour.',
                        'They <strong>will be waiting</strong> for us at the station.',
                        'I <strong>will be cooking</strong> when you will be sleeping.'
                    ]
                }
            ]
        },
        videoQuiz1c: [
            {
                type: 'fill',
                text: 'What do we add to the auxiliary verb to negate the sentences in the Future Continuous?',
                answer: 'will not be',
                altAnswers: ["won't be", 'not'],
                placeholder: 'type...',
                explanation: 'To make the Future Continuous negative, insert <strong>not</strong> between &ldquo;will&rdquo; and &ldquo;be&rdquo;: <strong>will not be</strong> (or the contraction <strong>won&rsquo;t be</strong>).'
            },
            {
                text: 'Choose the correct negative sentence in the Future Continuous:',
                options: ['I will be not practicing.', 'I will not (won&rsquo;t) be practicing.'],
                correct: 1,
                explanation: 'In negative Future Continuous sentences, <strong>not</strong> stays between &ldquo;will&rdquo; and &ldquo;be&rdquo;.<br><em>I <strong>will not be</strong> sleeping at 11 pm.</em>'
            },
            {
                type: 'drag',
                text: 'Put the words in the correct order for a question:',
                words: ['be', 'dinner', 'will', 'you', 'having', 'soon?'],
                correct: 'Will you be having dinner soon?'
            },
            {
                text: 'Look at the question &ldquo;How much longer <strong>will you be</strong> practicing?&rdquo;<br>In interrogative Future Continuous sentences the subject stays&hellip;',
                options: ['Between &ldquo;will&rdquo; and &ldquo;be&rdquo;.', 'After &ldquo;will be&rdquo;.', 'Before &ldquo;will be&rdquo;.'],
                correct: 0,
                explanation: 'In questions, the subject always &ldquo;sandwiches&rdquo; itself between &ldquo;will&rdquo; and &ldquo;be&rdquo;.<br><em><strong>Will you be</strong> swimming in the pool tomorrow afternoon?</em>'
            }
        ],
        grammarBank1b: {
            blocks: [
                {
                    intro: '<strong>Negative Sentences</strong><br>The word order for negative Future Continuous sentences is <strong>SAV-ing</strong><br><strong>Subject + will not be + verb+ing</strong> (present participle).<br>Contraction: <strong>won&rsquo;t</strong> = will not.',
                    table: [],
                    examples: [
                        'I <strong>won&rsquo;t be practicing</strong> the violin tomorrow.',
                        'They <strong>will not be joining</strong> us for dinner.',
                        'He <strong>won&rsquo;t be working</strong> this weekend.'
                    ]
                },
                {
                    intro: '<strong>Questions</strong><br>The word order for interrogative Future Continuous sentences is:<br><strong>Will + subject + be + verb+ing (present participle)?</strong><br>WH-question words stay at the beginning of the sentence.',
                    table: [],
                    examples: [
                        '<strong>Will</strong> you <strong>be practicing</strong> all afternoon?',
                        '<strong>Will</strong> they <strong>be staying</strong> at a hotel?',
                        'How much longer <strong>will</strong> he <strong>be playing</strong>?'
                    ]
                },
                {
                    intro: '<strong>Present Participle</strong><br>For the Future Continuous, you always use the <strong>-ing form</strong> of the verb.<br><table style="border-collapse:collapse;margin:10px 0;font-size:0.93rem;"><tr><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Base Form (V1)</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Present Participle (V-ing)</th><th style="padding:4px 0;color:#e2b714;text-align:left;">Spelling Note</th></tr><tr><td style="padding:3px 14px 3px 0;">play &nbsp;/&nbsp; watch</td><td style="padding:3px 14px 3px 0;">playing &nbsp;/&nbsp; watching</td><td>Just add -ing</td></tr><tr><td style="padding:3px 14px 3px 0;">practice &nbsp;/&nbsp; develop</td><td style="padding:3px 14px 3px 0;">practicing &nbsp;/&nbsp; developing</td><td>Remove the &lsquo;e&rsquo;, add -ing</td></tr><tr><td style="padding:3px 14px 3px 0;">study &nbsp;/&nbsp; enjoy</td><td style="padding:3px 14px 3px 0;">studying &nbsp;/&nbsp; enjoying</td><td>Keep the &lsquo;y&rsquo;, add -ing</td></tr><tr><td style="padding:3px 14px 3px 0;">sit &nbsp;/&nbsp; run</td><td style="padding:3px 14px 3px 0;">sitting &nbsp;/&nbsp; running</td><td>Double the consonant</td></tr></table>',
                    table: [],
                    examples: []
                }
            ]
        },
        videoQuiz1d: [
            { type: 'intro', text: '<strong>Practice Affirmative &mdash; Choose the correct option:</strong>' },
            {
                text: 'William says: &ldquo;I ______ (practice) for another half hour.&rdquo;',
                options: ['will practicing', 'will be practicing', 'will be practice'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>will be practicing</strong> &mdash; Future Continuous: will be + V-ing.'
            },
            {
                text: 'While Dad is in the room, William ______ (hold) his violin.',
                options: ['will be holding', 'will be hold', 'will holding'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>will be holding</strong> &mdash; Future Continuous: will be + V-ing.'
            },
            {
                text: 'At 5 o&rsquo;clock today, the boy ______ (play) the same melody.',
                options: ['will playing', 'is be playing', 'will be playing'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>will be playing</strong> &mdash; Future Continuous: will be + V-ing.'
            },
            {
                text: 'Dad ______ (stand) near the door during the whole practice.',
                options: ['will be stand', 'will be standing', 'will standing'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>will be standing</strong> &mdash; Future Continuous: will be + V-ing.'
            },
            {
                text: 'They ______ (talk) about the music for a while.',
                options: ['will be talking', 'will be talk', 'will talking'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>will be talking</strong> &mdash; Future Continuous: will be + V-ing.'
            },
            {
                text: 'If you watch the video again, you ______ (listen) to the violin once more.',
                options: ['will be listen', 'will listening', 'will be listening'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>will be listening</strong> &mdash; Future Continuous: will be + V-ing.'
            },
            {
                text: 'William ______ (look) at his music notes for thirty more minutes.',
                options: ['will looking', 'will be looking', 'will be look'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>will be looking</strong> &mdash; Future Continuous: will be + V-ing.'
            },
            {
                text: 'Dad ______ (wait) for his son to finish the lesson.',
                options: ['will be waiting', 'will be wait', 'will waiting'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>will be waiting</strong> &mdash; Future Continuous: will be + V-ing.'
            },
            {
                text: 'The violin ______ (make) a loud sound all evening.',
                options: ['will be make', 'will making', 'will be making'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>will be making</strong> &mdash; Future Continuous: will be + V-ing.'
            },
            {
                text: 'After Dad leaves the room, William ______ (stay) there to finish his task.',
                options: ['will be stay', 'will be staying', 'will staying'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>will be staying</strong> &mdash; Future Continuous: will be + V-ing.'
            },
            { type: 'intro', text: '<strong>Practice Negative &mdash; Choose the correct option:</strong>' },
            {
                text: 'In a year, the girl ______ with her family anymore.',
                options: ['won&rsquo;t be live', 'won&rsquo;t be living', 'won&rsquo;t living'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>won&rsquo;t be living</strong> &mdash; negative Future Continuous: won&rsquo;t be + V-ing.'
            },
            {
                text: 'The student ______ her math homework at home once she is in college.',
                options: ['won&rsquo;t be doing', 'won&rsquo;t be do', 'won&rsquo;t doing'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>won&rsquo;t be doing</strong> &mdash; negative Future Continuous: won&rsquo;t be + V-ing.'
            },
            {
                text: 'She ______ Harry Potter with her sister every evening next year.',
                options: ['won&rsquo;t be read', 'won&rsquo;t be reading', 'won&rsquo;t reading'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>won&rsquo;t be reading</strong> &mdash; negative Future Continuous: won&rsquo;t be + V-ing.'
            },
            {
                text: 'The family ______ at the TV together as often after she moves out.',
                options: ['won&rsquo;t be laughing', 'won&rsquo;t laugh', 'won&rsquo;t laughing'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>won&rsquo;t be laughing</strong> &mdash; negative Future Continuous: won&rsquo;t be + V-ing.'
            },
            {
                text: 'In college, there ______ any family bonding time for her.',
                options: ['won&rsquo;t be happen', 'won&rsquo;t happening', 'won&rsquo;t be happening'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>won&rsquo;t be happening</strong> &mdash; negative Future Continuous: won&rsquo;t be + V-ing.'
            },
            { type: 'intro', text: '<strong>Practice Interrogative &mdash; Choose the correct option:</strong>' },
            {
                text: '______ William ______ the violin for another half hour?',
                options: ['Will / practice', 'Will / be practicing', 'Is / be practicing'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>Will / be practicing</strong> &mdash; Future Continuous question: Will + subject + be + V-ing?'
            },
            {
                text: 'How much longer ______ the boy ______ the instrument?',
                options: ['will / be playing', 'will / playing', 'will / be play'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>will / be playing</strong> &mdash; WH- Future Continuous question: WH- word + will + subject + be + V-ing?'
            },
            {
                text: '______ the father ______ to the violin music for the whole half hour?',
                options: ['Is / be listening', 'Will / listening', 'Will / be listening'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>Will / be listening</strong> &mdash; Future Continuous question: Will + subject + be + V-ing?'
            },
            {
                text: '______ the boy ______ his practice in the living room all afternoon?',
                options: ['Will / be continuing', 'Will / continuing', 'Does / be continuing'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>Will / be continuing</strong> &mdash; Future Continuous question: Will + subject + be + V-ing?'
            },
            {
                text: '______ they ______ the music lesson later today?',
                options: ['Will / finishing', 'Will / be finishing', 'Will / be finish'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>Will / be finishing</strong> &mdash; Future Continuous question: Will + subject + be + V-ing?'
            }
        ],
        videoQuiz2: [
            {
                type: 'intro',
                text: '&ldquo;We&rsquo;ll be eating and, of course, you&rsquo;ll be wearing that.&rdquo;'
            },
            {
                text: 'The speaker is talking about two actions which will happen&hellip;',
                options: ['One after the other', 'At the same time'],
                correct: 1,
                explanation: 'The eating and the wearing of the outfit are <strong>parallel actions</strong> that will be happening at the same time in the future.'
            },
            {
                type: 'intro',
                text: 'Compare these two ways of planning:<br><em>A: We will eat and then you will put that on.</em><br><em>B: We will be eating and you will be wearing that.</em>'
            },
            {
                text: 'Which sentence sounds like a step-by-step list of events?',
                options: ['A', 'B'],
                correct: 0,
                explanation: 'Future Simple lists events one by one &mdash; first eat, then put on the outfit.'
            },
            {
                text: 'Which sentence describes a &ldquo;simultaneous&rdquo; picture of the future?',
                options: ['A', 'B'],
                correct: 1,
                explanation: 'Future Continuous paints a picture of two ongoing actions happening at the same time.'
            },
            {
                text: 'In this context, is the &ldquo;wearing&rdquo; a short action that starts and stops quickly?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: '&ldquo;Wearing&rdquo; is a state that continues throughout the entire dinner.'
            },
            {
                type: 'drag',
                text: 'Put the words in the correct order:',
                words: ['be', 'watching', 'I', 'will', 'the', 'movie', 'and', 'be', 'you', 'will', 'sleeping.'],
                correct: 'I will be watching the movie and you will be sleeping.'
            },
            {
                type: 'drag',
                text: 'Create a parallel action based on the video:',
                words: ['We', 'be', 'eating', 'will', 'and', 'wearing', 'you', 'will', 'be', 'that dress.'],
                correct: 'We will be eating and you will be wearing that dress.'
            }
        ],
        grammarBank2: {
            blocks: [
                {
                    intro: 'We use the Future Continuous for <strong>Parallel Actions</strong> to describe two or more actions that will be happening <strong>at the same time</strong> in the future.<br><br>We use <strong>and</strong> and <strong>while</strong> to connect two actions.<br><br><em>At the party tonight, the band <strong>will be playing</strong> and everyone <strong>will be dancing</strong>.</em><br><table style="border-collapse:collapse;margin:10px 0;font-size:0.93rem;"><tr><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Action 1</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Connector</th><th style="padding:4px 0;color:#e2b714;text-align:left;">Action 2</th></tr><tr><td style="padding:3px 14px 3px 0;">I <strong>will be studying</strong></td><td style="padding:3px 14px 3px 0;">and</td><td>she <strong>will be working</strong>.</td></tr><tr><td style="padding:3px 14px 3px 0;">They <strong>will be flying</strong></td><td style="padding:3px 14px 3px 0;">while</td><td>we <strong>will be driving</strong>.</td></tr></table>',
                    table: [],
                    examples: []
                }
            ]
        },
        videoQuiz3: [
            {
                type: 'intro',
                text: '&ldquo;I won&rsquo;t be living with my family anymore.&rdquo;'
            },
            {
                text: 'Is the speaker saying she will move out at one specific moment, or is she describing her ongoing situation in a year&rsquo;s time?',
                options: ['A single, quick event.', 'An ongoing situation.'],
                correct: 1,
                explanation: 'By using &ldquo;won&rsquo;t be living,&rdquo; she is describing the <strong>state</strong> of her life a year from now. It emphasizes that the continuous action of &ldquo;living with family&rdquo; will no longer be in progress.'
            },
            {
                type: 'intro',
                text: '&ldquo;There won&rsquo;t be any family bonding time.&rdquo;'
            },
            {
                text: 'When the speaker says this, is she making a prediction about her future schedule?',
                options: ['Yes.', 'No.'],
                correct: 0,
                explanation: 'She is predicting that her future (college life) will be missing a specific continuous activity: bonding with her family.'
            },
            {
                type: 'intro',
                text: '<strong>Sentence Structure: The &ldquo;Not&rdquo; Rule</strong>'
            },
            {
                text: 'Where do we put &ldquo;not&rdquo; to make a Future Continuous sentence negative?',
                options: ['After &ldquo;be&rdquo; &mdash; <em>will be not living</em>', 'Between &ldquo;will&rdquo; and &ldquo;be&rdquo; &mdash; <em>will not be living</em>'],
                correct: 1,
                explanation: 'In English, the negative &ldquo;not&rdquo; always attaches to the <strong>first auxiliary verb</strong> in the chain &mdash; which, in this case, is <strong>will</strong>.'
            },
            {
                type: 'intro',
                text: '<strong>Contractions</strong>'
            },
            {
                text: 'In the video, the speaker says &ldquo;I won&rsquo;t be living&hellip;&rdquo; What is &ldquo;won&rsquo;t&rdquo; a short version of?',
                options: ['will not', 'would not', 'was not'],
                correct: 0,
                explanation: '<strong>won&rsquo;t</strong> = <strong>will not</strong>. It is the standard contraction used in spoken and informal written English.'
            },
            {
                type: 'drag',
                text: 'Put the words in the correct order to describe a student who has finished their exams:',
                words: ['be', 'I', 'studying', "won't", 'this', 'weekend.'],
                correct: "I won't be studying this weekend."
            },
            {
                type: 'fill',
                text: 'Transform this positive sentence into a negative one:<br>&ldquo;Next year, I will be attending high school.&rdquo; Type the negative version:',
                answer: "Next year, I won't be attending high school.",
                altAnswers: ["Next year, I will not be attending high school."],
                placeholder: 'type here...',
                explanation: 'Replace <strong>will be</strong> with <strong>won&rsquo;t be</strong> (or <strong>will not be</strong>) to negate: <em>Next year, I <strong>won&rsquo;t be attending</strong> high school.</em>'
            }
        ],
        grammarBank3: {
            blocks: [
                {
                    intro: 'We use the <strong>Future Continuous Negative</strong> to state that an action <strong>will not be in progress</strong> at a specific time in the future.<br><br><strong>The Formula</strong><br>Subject + <strong>will</strong> + <strong>not</strong> + <strong>be</strong> + V-ing<br>&nbsp;&nbsp;&nbsp;&nbsp;(or Subject + <strong>won&rsquo;t</strong> + <strong>be</strong> + V-ing)<br><br><strong>Common Uses:</strong><br><ul style="margin:6px 0 0 0;padding-left:18px;"><li>Predicting an absence: <em>&ldquo;I won&rsquo;t be working tomorrow, so let&rsquo;s grab coffee.&rdquo;</em></li><li>Polite refusal: <em>&ldquo;I&rsquo;m sorry, I won&rsquo;t be attending the meeting on Friday.&rdquo;</em></li><li>Contrast: <em>&ldquo;I&rsquo;ll be studying for finals, so I won&rsquo;t be going to the party.&rdquo;</em></li></ul><br><table style="border-collapse:collapse;margin:10px 0;font-size:0.93rem;"><tr><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Subject</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Auxiliary (Neg)</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Continuous Marker</th><th style="padding:4px 0;color:#e2b714;text-align:left;">Verb (-ing)</th></tr><tr><td style="padding:3px 14px 3px 0;">I</td><td style="padding:3px 14px 3px 0;">won&rsquo;t</td><td style="padding:3px 14px 3px 0;">be</td><td>living</td></tr><tr><td style="padding:3px 14px 3px 0;">You</td><td style="padding:3px 14px 3px 0;">won&rsquo;t</td><td style="padding:3px 14px 3px 0;">be</td><td>doing</td></tr><tr><td style="padding:3px 14px 3px 0;">She</td><td style="padding:3px 14px 3px 0;">won&rsquo;t</td><td style="padding:3px 14px 3px 0;">be</td><td>bonding</td></tr><tr><td style="padding:3px 14px 3px 0;">They</td><td style="padding:3px 14px 3px 0;">won&rsquo;t</td><td style="padding:3px 14px 3px 0;">be</td><td>coming</td></tr></table>',
                    table: [],
                    examples: [
                        'I <strong>won&rsquo;t be living</strong> with my family anymore.',
                        'There <strong>won&rsquo;t be</strong> any family bonding time.',
                        'We <strong>won&rsquo;t be seeing</strong> each other every day in college.'
                    ]
                }
            ]
        },
        exercises: [
            {
                question: 'Завтра в 3 часа я буду учиться. Выберите верно:',
                options: [
                    'I will study at 3 PM tomorrow.',
                    'I will be studying at 3 PM tomorrow.',
                    'I am studying at 3 PM tomorrow.',
                    'I will studying at 3 PM tomorrow.'
                ],
                correct: 1,
                explanation: 'Future Continuous: будут активно происходить в определенный момент в будущем.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Дополните: "This time next week, she __ __ on vacation."',
                options: [
                    'will, relax',
                    'will be, relaxing',
                    'will, relaxing',
                    'will be, relax'
                ],
                correct: 1,
                explanation: 'Future Continuous: will be + V+ing.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильное предложение:',
                options: [
                    'They will be playing tennis all afternoon.',
                    'They will playing tennis all afternoon.',
                    'They will be play tennis all afternoon.',
                    'They are being play tennis.'
                ],
                correct: 0,
                explanation: 'Future Continuous: will be playing.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите отрицание в Future Continuous:',
                options: [
                    'He will not be working.',
                    'He won\'t be working.',
                    'Оба варианта верны.',
                    'Ни один не верен.'
                ],
                correct: 2,
                explanation: 'Оба - "will not be" и "won\'t be" - верны.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Дополните отрицание: "I __ not __ reading a book at 7 PM."',
                options: [
                    'will, being',
                    'will be, reading',
                    'will, be',
                    'being, will'
                ],
                correct: 1,
                explanation: 'Future Continuous отрицание: will not be reading.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Какой вопрос грамматически верен?',
                options: [
                    'Will you be working tomorrow?',
                    'You will be working tomorrow?',
                    'Will be you working tomorrow?',
                    'You being will work tomorrow?'
                ],
                correct: 0,
                explanation: 'Future Continuous вопрос: Will + подлежащее + be + V+ing?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Завершите вопрос: "__ they __ __ tennis at noon?"',
                options: [
                    'Will, playing',
                    'Will be, playing',
                    'Are, playing',
                    'Will, be playing'
                ],
                correct: 1,
                explanation: 'Future Continuous вопрос: Will they be playing?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Выберите правильное использование Future Continuous:',
                options: [
                    'When you call me, I will eat dinner.',
                    'When you call me, I will be eating dinner.',
                    'When you will call me, I eating dinner.',
                    'When you call me, I eating dinner.'
                ],
                correct: 1,
                explanation: 'Future Continuous для действия в определенный момент: will be eating.',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Найдите ошибку:',
                options: [
                    'She will be finishing her work soon.',
                    'They will be traveling to Paris.',
                    'I will be sleep all night.',
                    'You will be studying hard next week.'
                ],
                correct: 2,
                explanation: 'Ошибка: "will be sleep" должно быть "will be sleeping".',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильный вариант:',
                options: [
                    'At this time tomorrow, I will study mathematics.',
                    'At this time tomorrow, I am studying mathematics.',
                    'At this time tomorrow, I will be studying mathematics.',
                    'At this time tomorrow, I studied mathematics.'
                ],
                correct: 2,
                explanation: 'Future Continuous для действия в определенный момент: will be studying.',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Какой вариант содержит ошибку?',
                options: [
                    'They will be waiting for you.',
                    'I won\'t be watching TV tonight.',
                    'She will be work here next month.',
                    'We will be celebrating the victory.'
                ],
                correct: 2,
                explanation: 'Ошибка: "will be work" должно быть "will be working".',
                difficulty: 'hard',
                sentenceForm: 'positive'
            },
            {
                question: 'Какое предложение правильно использует Future Continuous?',
                options: [
                    'Next year, we will live in Europe.',
                    'Next year, we will be living in Europe.',
                    'Next year, we lived in Europe.',
                    'Next year, we live in Europe.'
                ],
                correct: 1,
                explanation: 'Future Continuous подчеркивает длительность в будущем: will be living.',
                difficulty: 'hard',
                sentenceForm: 'positive'
            },
            {
                question: 'Какой вопрос требует ответа "Yes, I will be"?',
                options: [
                    'Do you work tomorrow?',
                    'Will you work tomorrow?',
                    'Will you be working tomorrow?',
                    'Did you work today?'
                ],
                correct: 2,
                explanation: '"Will you be working?" = "Yes, I will (be)."',
                difficulty: 'hard',
                sentenceForm: 'question'
            },
            {
                question: 'Дополните: "__ you __ __ when I arrive?"',
                options: [
                    'Will, study',
                    'Will, be studying',
                    'Are, studying',
                    'Will be, study'
                ],
                correct: 1,
                explanation: 'Future Continuous вопрос: Will you be studying?',
                difficulty: 'hard',
                sentenceForm: 'question'
            },
            {
                question: 'Выберите правильный порядок слов в Future Continuous вопросе:',
                options: [
                    'What will you be doing at 6 PM?',
                    'What you will be doing at 6 PM?',
                    'You will be doing what at 6 PM?',
                    'Will be doing you what at 6 PM?'
                ],
                correct: 0,
                explanation: 'Future Continuous вопрос: Question word + Will + подлежащее + be + V+ing?',
                difficulty: 'hard',
                sentenceForm: 'question'
            }
        ]
    },

    'future-perfect': {
        title: 'Future Perfect',
        russian: 'Будущее совершенное',
        videoFile: 'future perfect 1.mp4',
        videoFile2: 'future perfect 2.mp4',
        videoFile3: 'future perfect 3.mp4',
        structure: 'will + have + V3',
        usage: [
            'Действие завершится к определенному моменту в будущем',
            'До наступления другого события в будущем',
            'Выражение полноты действия'
        ],
        rules: [
            { type: 'Утверждение', example: 'I will have finished by 5 PM.' },
            { type: 'Отрицание', example: 'They won\'t have arrived yet.' },
            { type: 'Вопрос', example: 'Will you have completed it?' }
        ],
        examples: [
            {
                source: 'Rocky',
                dialogue: '"By tomorrow, I will have trained hard."',
                translation: 'К завтрашнему дню я хорошо потренируюсь.'
            }
        ],
        videoQuiz1: [
            {
                type: 'intro',
                text: 'In the video, Grandpa Pig says: <em>&ldquo;Next time you come, the seed will have grown into a plant.&rdquo;</em>'
            },
            {
                noNum: true,
                text: '1. Will the seed be still underground when Peppa comes back?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'The seed growing into a plant is an action that will happen between now and the future visit, and it will be completed by the time Peppa comes back.'
            },
            {
                noNum: true,
                text: 'Will the seed become a plant when Peppa comes back to the garden in the future?',
                options: ['Yes', 'No'],
                correct: 0,
                explanation: 'The seed growing into a plant is an action that will happen between now and the future visit, and it will be completed by the time Peppa comes back.'
            },
            {
                noNum: true,
                text: '2. Look at the sentence one more time: &ldquo;Next time you come, the seed will have grown into a plant.&rdquo; Grandpa Pig means&hellip;',
                options: ['The seed will be still growing by the time Peppa comes back.', 'The growth process will be finished by the time Peppa returns.'],
                correct: 1,
                explanation: 'The Future Perfect describes an action that will be <strong>completed before</strong> a specific point in the future. By the time Peppa comes back, the growing process will be completed.'
            },
            {
                type: 'intro',
                text: '3. Look at the sentences:<br><em>A: The seed will grow into a plant.</em><br><em>B: Peppa and George arrive at the garden.</em>'
            },
            {
                noNum: true,
                text: 'Which event happens first?',
                options: ['A', 'B'],
                correct: 0,
                explanation: 'The seed <strong>will have grown</strong> into a plant <strong>BY THE TIME</strong> Peppa comes back. So the growing finishes first.'
            },
            {
                noNum: true,
                text: '4. Look at what Grandpa Pig says: &ldquo;The plant will have grown by next week.&rdquo;<br>This means&hellip;',
                options: ['The plant will grow starting from next week.', 'The plant will finish growth before next week begins.'],
                correct: 1,
                explanation: '&ldquo;<strong>By</strong>&rdquo; is the most common word used with the Future Perfect. It means &ldquo;at any time before, but not later than.&rdquo;<br><em>I will have dressed by 3 pm.</em><br><em>They will have gathered by tomorrow morning.</em>'
            },
            {
                type: 'intro',
                text: '5. Compare these two sentences:<br><em>A: Next time you come, the seed <strong>will be growing</strong>.</em><br><em>B: Next time you come, the seed <strong>will have grown</strong>.</em>'
            },
            {
                noNum: true,
                text: 'Which sentence tells that Peppa can see the plant growing?',
                options: ['A', 'B'],
                correct: 0,
                explanation: 'Future Continuous (A) shows the action is <em>in progress</em> at the future moment &mdash; Peppa can watch it grow.'
            },
            {
                noNum: true,
                text: 'Which sentence emphasizes that the plant will already have grown by the time she arrives?',
                options: ['A', 'B'],
                correct: 1,
                explanation: 'Future Perfect (B) shows the action will be <em>completed</em> before the future moment.'
            },
            {
                type: 'intro',
                text: '6. Look at the sentence: <em>&ldquo;I will have eaten all the strawberries by tea time.&rdquo;</em>'
            },
            {
                noNum: true,
                type: 'fill',
                text: 'What two &ldquo;helping&rdquo; verbs are used together here?',
                answer: 'will have',
                placeholder: 'type here...',
                explanation: 'The Future Perfect always uses <strong>will have</strong> + Past Participle, for every subject.'
            },
            {
                type: 'intro',
                text: '7. Look at the sentences:<br><em>&ldquo;The seeds <strong>will have grown</strong> into plants.&rdquo;</em><br><em>&ldquo;She <strong>will have eaten</strong> all the strawberries by tea time.&rdquo;</em>'
            },
            {
                noNum: true,
                text: 'Does &ldquo;will have&rdquo; change according to the subjects?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'In Future tenses the auxiliary <strong>will have</strong> does not change. It is the same for all subjects: I / You / He / She / We / They.'
            },
            {
                noNum: true,
                text: 'What form is the main verb (<em>grown, eaten, finished</em>) in these sentences?',
                options: ['Base form (infinitive)', 'Present Participle (&minus;ing form)', 'Past Participle (3rd form)'],
                correct: 2,
                explanation: 'All Simple Perfect tenses always use the <strong>Past Participle</strong> form.<br><em>I have just <strong>finished</strong> my homework.</em><br><em>She had <strong>prepared</strong> dinner before she left.</em><br><em>They will have <strong>decided</strong> by the next meeting.</em>'
            },
            {
                type: 'intro',
                text: '<strong>8. Put the words in the correct order:</strong>'
            },
            {
                type: 'drag',
                noNum: true,
                text: '',
                words: ['The', 'seed', 'will', 'have', 'grown', 'by', 'the', 'time', 'Peppa', 'arrives.'],
                correct: 'The seed will have grown by the time Peppa arrives.'
            }
        ],
        grammarBank1: {
            blocks: [
                {
                    intro: 'We use the <strong>Future Perfect</strong> for actions that will be <strong>finished before a certain time in the future</strong>.<br>We often use it with <strong>&ldquo;by&rdquo;</strong> to indicate the deadline (<em>by tomorrow, by next week, by 5 o&rsquo;clock</em>).<br><br><strong>Word Order: Subject + will have + Past Participle (V3)</strong><br><table style="border-collapse:collapse;margin:10px 0;font-size:0.93rem;"><tr><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Subject</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Auxiliary Verbs</th><th style="padding:4px 0;color:#e2b714;text-align:left;">Main Verb (V3)</th></tr><tr><td style="padding:3px 14px 3px 0;">I</td><td style="padding:3px 14px 3px 0;">will have</td><td>planted</td></tr><tr><td style="padding:3px 14px 3px 0;">You</td><td style="padding:3px 14px 3px 0;">will have</td><td>planted</td></tr><tr><td style="padding:3px 14px 3px 0;">He / She / It</td><td style="padding:3px 14px 3px 0;">will have</td><td>planted</td></tr><tr><td style="padding:3px 14px 3px 0;">We / They</td><td style="padding:3px 14px 3px 0;">will have</td><td>planted</td></tr></table>',
                    table: [],
                    examples: [
                        'They <strong>will have gathered</strong> by tomorrow morning.',
                        'The seeds <strong>will have grown</strong> into plants by next month.',
                        'I <strong>will have dressed</strong> by 3 pm.',
                        'She <strong>will have eaten</strong> all the strawberries by tea time.'
                    ]
                }
            ]
        },
        videoQuiz1b: [
            { type: 'intro', text: '<strong>Practice Positive &mdash; Choose the correct option:</strong>' },
            {
                noNum: true,
                text: '1. By the time Peppa and George come back next time, the seed ______ into a plant.',
                options: ['will grow', 'will have grown', 'has grown'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>will have grown</strong> &mdash; Future Perfect: will have + V3, completed before a future moment.'
            },
            {
                noNum: true,
                text: '2. Grandpa Pig is sure that the plant ______ strawberries by their next visit.',
                options: ['will have produced', 'will produce', 'is producing'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>will have produced</strong> &mdash; Future Perfect: will have + V3.'
            },
            {
                noNum: true,
                text: '3. Before they arrive again, the sun and rain ______ the little seed.',
                options: ['will help', 'will has help', 'will have helped'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>will have helped</strong> &mdash; Future Perfect: will have + V3.'
            },
            {
                noNum: true,
                text: '4. Peppa thinks that by tea time, she ______ all the strawberries.',
                options: ['will have eaten', 'will eat', 'is going to eat'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>will have eaten</strong> &mdash; Future Perfect: will have + V3.'
            },
            {
                noNum: true,
                text: '5. Look at the garden! By tomorrow, the soil ______ even more water.',
                options: ['will absorb', 'will have absorbed', 'absorbs'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>will have absorbed</strong> &mdash; Future Perfect: will have + V3.'
            },
            {
                noNum: true,
                text: '6. By the end of the week, the children ______ about how plants grow.',
                options: ['will have learned', 'will learn', 'are learning'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>will have learned</strong> &mdash; Future Perfect: will have + V3.'
            },
            {
                noNum: true,
                text: '7. By the time Mommy Pig sees the garden, Grandpa ______ everything ready.',
                options: ['will have made', 'will make', 'has made'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>will have made</strong> &mdash; Future Perfect: will have + V3.'
            },
            {
                noNum: true,
                text: '8. When the seasons change, the strawberry plant ______ its first fruits.',
                options: ['will have', 'will have given', 'gives'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>will have given</strong> &mdash; Future Perfect: will have + V3.'
            },
            {
                noNum: true,
                text: '9. By the time they finish their play, the day ______ to an end.',
                options: ['will come', 'comes', 'will have come'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>will have come</strong> &mdash; Future Perfect: will have + V3.'
            },
            {
                noNum: true,
                text: '10. Before the next episode starts, Peppa ______ &ldquo;bye-bye&rdquo; to the strawberry.',
                options: ['will say', 'will have said', 'says'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>will have said</strong> &mdash; Future Perfect: will have + V3.'
            }
        ],
        videoQuiz2: [
            {
                type: 'intro',
                text: '1. In the video, Aunt Lucy says: <em>&ldquo;They will not have forgotten how to treat a stranger.&rdquo;</em>'
            },
            {
                noNum: true,
                text: 'Does Aunt Lucy believe the people in London will still remember how to be kind?',
                options: ['Yes', 'No'],
                correct: 0,
                explanation: 'We use the Future Perfect Negative to say that an action will <strong>not</strong> be finished or a state will not have changed by a certain point in the future.'
            },
            {
                noNum: true,
                text: '2. Why does Aunt Lucy use the Future Perfect instead of just saying &ldquo;They won&rsquo;t forget&rdquo;?',
                options: ['She is making a prediction about the future without much focus on time.', 'She is focusing on the future time &mdash; specifically Paddington&rsquo;s arrival in London.'],
                correct: 1,
                explanation: 'The Future Perfect emphasises a specific future deadline or moment &mdash; in this case, the moment Paddington arrives in London.'
            },
            {
                type: 'intro',
                text: '3. Look at the sentence: <em>&ldquo;They will <strong>not</strong> have forgotten&hellip;&rdquo;</em>'
            },
            {
                noNum: true,
                text: 'The word &ldquo;not&rdquo; in the sentence stays&hellip;',
                options: ['After &ldquo;will&rdquo;', 'After &ldquo;have&rdquo;'],
                correct: 0,
                explanation: '&ldquo;Not&rdquo; comes after the <strong>first</strong> auxiliary verb.<br><em>I <strong>will not</strong> have finished my job by the time you come.</em>'
            },
            {
                noNum: true,
                type: 'fill',
                text: '4. What is the short (contracted) form of &ldquo;will not&rdquo;?',
                answer: "won't",
                altAnswers: ['wont'],
                placeholder: 'type here...',
                explanation: 'The contraction of <strong>will not</strong> is <strong>won&rsquo;t</strong>.<br><em>They <strong>won&rsquo;t</strong> have forgotten kindness.</em>'
            },
            {
                type: 'intro',
                text: '<strong>5. Put the words in the correct order:</strong>'
            },
            {
                type: 'drag',
                noNum: true,
                text: '',
                words: ['The', 'Londoners', "won't", 'have', 'forgotten', 'kindness.'],
                correct: "The Londoners won't have forgotten kindness."
            }
        ],
        grammarBank2: {
            blocks: [
                {
                    intro: 'We use the <strong>Future Perfect Negative</strong> to:<br><ul style="margin:8px 0 0 0;padding-left:18px;"><li>Predict that an action will <strong>not</strong> be finished by a specific time.</li><li>Express confidence that a state or knowledge will <strong>still exist</strong> in the future.</li></ul><br><strong>Word Order: Subject + will not (won&rsquo;t) + have + Past Participle (V3)</strong><br>Contraction: <strong>won&rsquo;t = will not</strong>',
                    table: [],
                    examples: [
                        'I <strong>will not have finished</strong> my report by the time the meeting starts.',
                        'She <strong>won&rsquo;t have saved</strong> enough money to buy a car by next summer.',
                        'They <strong>will not have arrived</strong> at the station before the train leaves.',
                        'They <strong>won&rsquo;t have forgotten</strong> how to treat a stranger.'
                    ]
                }
            ]
        },
        videoQuiz2b: [
            {
                type: 'intro',
                text: `
<div class="pronunciation-box" style="display:block; margin: 10px 0 20px 0;">
    <div class="pronunciation-header">
        <span class="pronunciation-icon">🔊</span>
        <div>
            <h3 class="pronunciation-title">Pronunciation</h3>
            <p class="pronunciation-subtitle">Present Perfect Continuous Rhythm</p>
        </div>
    </div>

    <div class="pron-section">
        <p class="pronunciation-listen-label">Listen and repeat the sentences. Copy the rhythm.</p>
        <audio class="pronunciation-audio" controls style="margin-bottom: 15px;">
            <source src="present perfect audio 1.mp3" type="audio/mpeg">
        </audio>
        <div class="sound-sentences" style="line-height: 1.6; font-size: 1.05rem;">
            <p style="margin-bottom: 8px; border-left: 3px solid #667eea; padding-left: 12px; background: #f0f4ff; border-radius: 4px; padding-top: 6px; padding-bottom: 6px;"><strong>A:</strong> What <strong>have you been doing</strong>?</p>
            <p style="margin-bottom: 8px; border-left: 3px solid #667eea; padding-left: 12px; background: #f0f4ff; border-radius: 4px; padding-top: 6px; padding-bottom: 6px;"><strong>B:</strong> I’ve been <strong>studying</strong> for my exam.</p>
            <p style="margin-bottom: 8px; border-left: 3px solid #667eea; padding-left: 12px; background: #f0f4ff; border-radius: 4px; padding-top: 6px; padding-bottom: 6px;"><strong>A:</strong> Have you been studying <strong>all day</strong>?</p>
            <p style="margin-bottom: 8px; border-left: 3px solid #667eea; padding-left: 12px; background: #f0f4ff; border-radius: 4px; padding-top: 6px; padding-bottom: 6px;"><strong>B:</strong> Yes, I have. I’ve been <strong>working</strong> really hard.</p>
            <p style="margin-bottom: 8px; border-left: 3px solid #667eea; padding-left: 12px; background: #f0f4ff; border-radius: 4px; padding-top: 6px; padding-bottom: 6px;"><strong>A:</strong> Has your sister been studying too?</p>
            <p style="border-left: 3px solid #667eea; padding-left: 12px; background: #f0f4ff; border-radius: 4px; padding-top: 6px; padding-bottom: 6px;"><strong>B:</strong> No, she hasn’t. She’s been <strong>watching</strong> TV.</p>
        </div>
    </div>
</div>
`
            },
            { type: 'intro', text: '<strong>Practice Negative &mdash; Choose the correct option:</strong>' },
            {
                noNum: true,
                text: '1. By the time he arrives in London, the bear ______ (meet) his new family.',
                options: ['will have not met', "won't have met", "won't have meet"],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>won&rsquo;t have met</strong> &mdash; Future Perfect Negative: won&rsquo;t have + V3.'
            },
            {
                noNum: true,
                text: '2. Aunt Lucy believes that people in London ______ (forget) how to treat a stranger.',
                options: ["won't have forgotten", 'will not forgotten', "won't have forgot"],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>won&rsquo;t have forgotten</strong> &mdash; Future Perfect Negative: won&rsquo;t have + V3.'
            },
            {
                noNum: true,
                text: '3. Before the ship reaches the port, he ______ (eat) all of his marmalade.',
                options: ["won't have ate", 'will not have eat', "won't have eaten"],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>won&rsquo;t have eaten</strong> &mdash; Future Perfect Negative: won&rsquo;t have + V3. Irregular: <em>eat &rarr; eaten</em>.'
            },
            {
                noNum: true,
                text: '4. The bear ______ (find) a home if he stays hidden in the lifeboat forever.',
                options: ["won't has found", "won't have found", "will haven't found"],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>won&rsquo;t have found</strong> &mdash; Future Perfect Negative: won&rsquo;t have + V3.'
            },
            {
                noNum: true,
                text: '5. Aunt Lucy ______ (change) her mind about sending him to England.',
                options: ["won't have changed", "won't have change", 'will not changed'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>won&rsquo;t have changed</strong> &mdash; Future Perfect Negative: won&rsquo;t have + V3.'
            }
        ],
        videoQuiz3: [
            {
                type: 'intro',
                text: 'Look at the question: <em>&ldquo;Will you have accomplished anything&hellip;&rdquo;</em>'
            },
            {
                noNum: true,
                type: 'fill',
                text: '1. What is the auxiliary (helping) verb that starts the question?',
                answer: 'Will',
                altAnswers: ['will'],
                placeholder: 'type here...',
                explanation: 'In the Future Perfect question, <strong>Will</strong> moves to the front: <em>Will + subject + have + V3?</em>'
            },
            {
                noNum: true,
                text: 'The helping word &ldquo;have&rdquo; in the interrogative Future Perfect sentences stays&hellip;',
                options: ['after the subject (Will you <strong>have</strong> accomplished?)', 'before the subject (Will <strong>have</strong> you accomplished?)'],
                correct: 0,
                explanation: 'Only the first auxiliary <strong>will</strong> moves to the front. &ldquo;Have&rdquo; stays after the subject: <em>Will you <strong>have</strong> accomplished?</em>'
            },
            {
                noNum: true,
                text: '2. What is the form of the main verbs (<em>accomplished, finished, completed</em>) in the Future Perfect sentences?',
                options: ['Present (&minus;ing form)', 'Past Participle (3rd form)'],
                correct: 1,
                explanation: 'All perfect tenses require the <strong>Past Participle</strong>.'
            },
            {
                type: 'intro',
                text: '<strong>3. Put the words in the correct order to ask a question about the future:</strong>'
            },
            {
                type: 'drag',
                noNum: true,
                text: '',
                words: ['Will', 'you', 'have', 'finished', 'by', 'tomorrow?'],
                correct: 'Will you have finished by tomorrow?'
            }
        ],
        grammarBank3: {
            blocks: [
                {
                    intro: 'The word order for <strong>interrogative Future Perfect</strong> sentences is:<br><strong>Will + subject + have + Past Participle (V3)?</strong><br><table style="border-collapse:collapse;margin:10px 0;font-size:0.93rem;"><tr><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Will</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Subject</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Have</th><th style="padding:4px 0;color:#e2b714;text-align:left;">Main Verb (V3)</th></tr><tr><td style="padding:3px 14px 3px 0;">Will</td><td style="padding:3px 14px 3px 0;">I</td><td style="padding:3px 14px 3px 0;">have</td><td>finished?</td></tr><tr><td style="padding:3px 14px 3px 0;">Will</td><td style="padding:3px 14px 3px 0;">you</td><td style="padding:3px 14px 3px 0;">have</td><td>accomplished?</td></tr><tr><td style="padding:3px 14px 3px 0;">Will</td><td style="padding:3px 14px 3px 0;">he / she / it</td><td style="padding:3px 14px 3px 0;">have</td><td>completed?</td></tr><tr><td style="padding:3px 14px 3px 0;">Will</td><td style="padding:3px 14px 3px 0;">we</td><td style="padding:3px 14px 3px 0;">have</td><td>arrived?</td></tr><tr><td style="padding:3px 14px 3px 0;">Will</td><td style="padding:3px 14px 3px 0;">they</td><td style="padding:3px 14px 3px 0;">have</td><td>gone?</td></tr></table><strong>Common time markers:</strong><ul style="margin:6px 0 0 0;padding-left:18px;"><li><strong>by&hellip;</strong> (by dinner time, by tomorrow, by Monday)</li><li><strong>by the time&hellip;</strong> (by the time you arrive)</li></ul>',
                    table: [],
                    examples: [
                        '<strong>Will you have graduated</strong> from University by 2027?',
                        '<strong>Will he have finished</strong> his project by next week?',
                        '<strong>Will you have accomplished</strong> anything of any value?',
                        '<strong>Will you have finished</strong> by tomorrow?'
                    ]
                }
            ]
        },
        videoQuiz3b: [
            { type: 'intro', text: '<strong>Practice Interrogative &mdash; Choose the correct option:</strong>' },
            {
                noNum: true,
                text: '1. &ldquo;___ you ___ (accomplish) anything of any value?&rdquo; &mdash; asks the director.',
                options: ['Will you had accomplished', 'Have you will accomplished', 'Will you have accomplished'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>Will you have accomplished</strong> &mdash; Future Perfect question: Will + subject + have + V3?'
            },
            {
                noNum: true,
                text: '2. ___ the actor ___ (memorize) all his lines by the end of the audition?',
                options: ['Will / have memorized', 'Will / has memorized', 'Does / have memorized'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>Will / have memorized</strong> &mdash; Future Perfect question: Will + subject + have + V3?'
            },
            {
                noNum: true,
                text: '3. By the time he leaves the stage, ___ he ___ (prove) his talent to the committee?',
                options: ['will / has proved', 'is / have proven', 'will / have proven'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>will / have proven</strong> &mdash; Future Perfect question: Will + subject + have + V3?'
            },
            {
                noNum: true,
                text: '4. ___ the director ___ (change) his mind after this speech?',
                options: ['Will / changed', 'Will / have changed', 'Will / has changed'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>Will / have changed</strong> &mdash; Future Perfect question: Will + subject + have + V3?'
            },
            {
                noNum: true,
                text: '5. How many minutes ___ (pass) since the actor started his performance?',
                options: ['will have passed', 'will passed', 'will have pass'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>will have passed</strong> &mdash; Future Perfect question: Will + have + V3?'
            }
        ],
        exercises: [
            {
                question: 'К концу дня я закончу проект. Выберите верно:',
                options: [
                    'I will finish the project by the end of the day.',
                    'I will have finished the project by the end of the day.',
                    'I have finished the project by the end of the day.',
                    'I am finishing the project by the end of the day.'
                ],
                correct: 1,
                explanation: 'Future Perfect: к определенному моменту в будущем действие будет завершено.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Дополните: "By 5 PM, she __ __ her homework."',
                options: [
                    'will finish',
                    'will have finished',
                    'has finished',
                    'is finishing'
                ],
                correct: 1,
                explanation: 'Future Perfect: will have + Past Participle.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильное предложение:',
                options: [
                    'By next month, they will arrive in Paris.',
                    'By next month, they will have arrived in Paris.',
                    'By next month, they arrive in Paris.',
                    'By next month, they have arrived in Paris.'
                ],
                correct: 1,
                explanation: 'Future Perfect: will have arrived.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите отрицание в Future Perfect:',
                options: [
                    'He will not have finished.',
                    'He won\'t have finished.',
                    'Оба варианта верны.',
                    'Ни один не верен.'
                ],
                correct: 2,
                explanation: 'Оба - "will not have" и "won\'t have" - верны.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Дополните отрицание: "I __ not __ my studies by graduation."',
                options: [
                    'will finish',
                    'will have finished',
                    'have finished',
                    'will have to finish'
                ],
                correct: 1,
                explanation: 'Future Perfect отрицание: will not have finished.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Какой вопрос грамматически верен?',
                options: [
                    'Will you have completed the work?',
                    'You will have completed the work?',
                    'Will have you completed the work?',
                    'Have you will complete the work?'
                ],
                correct: 0,
                explanation: 'Future Perfect вопрос: Will + подлежащее + have + Past Participle?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Завершите вопрос: "__ they __ __ the project by Friday?"',
                options: [
                    'Will, finished',
                    'Will have, finished',
                    'Have, finished',
                    'Will, have finishing'
                ],
                correct: 1,
                explanation: 'Future Perfect вопрос: Will they have finished?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Выберите правильное использование Future Perfect:',
                options: [
                    'By the time you arrive, I will prepare dinner.',
                    'By the time you arrive, I will have prepared dinner.',
                    'By the time you arrive, I prepare dinner.',
                    'By the time you arrive, I have prepared dinner.'
                ],
                correct: 1,
                explanation: 'Future Perfect для действия, завершившегося к определенному моменту: will have prepared.',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Найдите ошибку:',
                options: [
                    'By next year, we will have lived here for 10 years.',
                    'She won\'t have finished by 5 PM.',
                    'By the end of the month, I will have traveled to Europe.',
                    'They will finish all assignments by then.'
                ],
                correct: 3,
                explanation: 'Ошибка: "will finish" должно быть "will have finished" (Future Perfect).',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильный вариант:',
                options: [
                    'By 2030, scientists will discover a cure.',
                    'By 2030, scientists will have discovered a cure.',
                    'By 2030, scientists discover a cure.',
                    'By 2030, scientists have discovered a cure.'
                ],
                correct: 1,
                explanation: 'Future Perfect: will have discovered.',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Какой вариант содержит ошибку?',
                options: [
                    'By tomorrow, I will have completed the task.',
                    'She won\'t have arrived by midnight.',
                    'By the end of this year, we will have save enough money.',
                    'You will have learned English by then.'
                ],
                correct: 2,
                explanation: 'Ошибка: "will have save" должно быть "will have saved".',
                difficulty: 'hard',
                sentenceForm: 'negative'
            },
            {
                question: 'Какое предложение правильно использует Future Perfect?',
                options: [
                    'By next week, she will work here for 3 years.',
                    'By next week, she will have worked here for 3 years.',
                    'By next week, she works here for 3 years.',
                    'By next week, she has worked here for 3 years.'
                ],
                correct: 1,
                explanation: 'Future Perfect подчеркивает полноту действия к моменту: will have worked.',
                difficulty: 'hard',
                sentenceForm: 'positive'
            },
            {
                question: 'Какой вопрос требует ответа "Yes, I will have"?',
                options: [
                    'Have you finished your work?',
                    'Did you finish your work?',
                    'Will you finish your work by 5 PM?',
                    'Will you have finished your work by 5 PM?'
                ],
                correct: 3,
                explanation: '"Will you have finished...?" = "Yes, I will (have)."',
                difficulty: 'hard',
                sentenceForm: 'question'
            },
            {
                question: 'Дополните: "__ you __ __ __ school by the end of next year?"',
                options: [
                    'Will, complete',
                    'Will have, complete',
                    'Will, have completed',
                    'Will have, completed'
                ],
                correct: 3,
                explanation: 'Future Perfect вопрос: Will you have completed?',
                difficulty: 'hard',
                sentenceForm: 'question'
            },
            {
                question: 'Выберите правильный порядок слов в Future Perfect вопросе:',
                options: [
                    'How many books will you have read by Christmas?',
                    'How many books you will have read by Christmas?',
                    'You will have read by Christmas how many books?',
                    'Will have you read how many books by Christmas?'
                ],
                correct: 0,
                explanation: 'Future Perfect вопрос: Question word + Will + подлежащее + have + Past Participle?',
                difficulty: 'hard',
                sentenceForm: 'question'
            }
        ]
    },

    'future-perfect-continuous': {
        title: 'Future Perfect Continuous',
        russian: 'Будущее совершенное длительное',
        videoFile: 'future perfect cont 1.mp4',
        videoFile2: 'future perfect cont 2.mp4',
        structure: 'will + have + been + V+ing',
        usage: [
            'Действие будет длиться до определенного момента в будущем',
            'Подчеркивание длительности будущего действия',
            'Как долго что-то будет происходить'
        ],
        rules: [
            { type: 'Утверждение', example: 'I will have been working for 3 hours by 6 PM.' },
            { type: 'Отрицание', example: 'She won\'t have been waiting long.' },
            { type: 'Вопрос', example: 'How long will you have been studying?' }
        ],
        examples: [
            {
                source: 'The Notebook',
                dialogue: '"By next year, I will have been waiting for you for a long time."',
                translation: 'К следующему году я буду ждать тебя уже долгое время.'
            }
        ],
        videoQuiz1: [
            {
                noNum: true,
                text: '1. Is the speaker currently doing stage combat?',
                options: ['Yes', 'No'],
                correct: 0,
                explanation: 'The speaker says, <em>&ldquo;I will have been doing stage combat,&rdquo;</em> which implies she is currently involved in the activity. The Future Perfect Continuous is used for actions that are already in progress and will continue into the future.'
            },
            {
                type: 'intro',
                text: '2. Look at the sentence: <em>&ldquo;By the end of this week, I will have been doing stage combat for 53 weeks.&rdquo;</em>'
            },
            {
                noNum: true,
                text: 'The &ldquo;53 weeks&rdquo; &hellip;',
                options: ['happened in the past', 'will happen in the future'],
                correct: 1,
                explanation: 'The phrase <em>&ldquo;By the end of this week&rdquo;</em> sets a time in the future for an action that started in the past, is continuing in the present, and will be in progress until a specific time in the future. The speaker is standing in the &ldquo;now&rdquo; and looking forward to that specific time in the future.'
            },
            {
                noNum: true,
                text: 'At the &ldquo;end of this week,&rdquo; her stage combat training &hellip;',
                options: ['will be finished', 'will still be in progress'],
                correct: 1,
                explanation: '<em>I will have been learning English for 9 years by the end of 2026.</em><br>I started learning English in the past. Now I am still learning English. It will be 9 years by the end of 2026 that I will be learning English.'
            },
            {
                noNum: true,
                type: 'fill',
                text: '4. Look at the structure: <em>&ldquo;I will have been doing...&rdquo;</em> What three auxiliary (helping) verbs are used before the main verb?',
                answer: 'will have been',
                placeholder: 'Type here: _____________',
                explanation: 'The Future Perfect Continuous is unique because it requires three helpers: <strong>will</strong> (future), <strong>have</strong> (perfect), and <strong>been</strong> (continuous).<br><em>We will have been practicing football for 6 years by the end of this month.</em>'
            },
            {
                noNum: true,
                text: '5. What form is the main verb (<em>doing</em>) in?',
                options: ['Past Participle (V3)', 'Present Participle (&minus;ing form)'],
                correct: 1,
                explanation: 'Every Continuous tense in English&mdash;whether past, present, or future&mdash;requires the &minus;ing form of the verb to show that the action has duration.<br><em>I will have been cooking for two hours by the time I finish this.</em>'
            },
            {
                noNum: true,
                text: '6. Does the phrase &ldquo;will have been&rdquo; change according to the subject?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'The auxiliary phrase <strong>will have been</strong> is the same for all subjects. Because <strong>will</strong> is a modal verb, the verb following it (<strong>have</strong>) stays in its base form regardless of who the subject is.<br><em>He will have been playing for half an hour by 2pm.</em>'
            },
            {
                type: 'intro',
                text: '<strong>7. Put the words in correct order:</strong>'
            },
            {
                type: 'drag',
                noNum: true,
                text: '',
                words: ['will', 'She', 'studying', 'been', 'for 2 hours.', 'have', 'for the exam'],
                correct: 'She will have been studying for the exam for 2 hours.'
            }
        ],
        grammarBank1: {
            blocks: [
                {
                    intro: '<strong>GRAMMAR BANK: Future Perfect Continuous</strong><br><br>We use the Future Perfect Continuous to show an action that starts before now and continues up to a specific point in the future. It is usually used with duration phrases (<em>for 53 weeks, for ten years</em>).<br><br><strong>Form (Positive):</strong><br><span style="display:inline-block;padding:6px 10px;border:1px solid rgba(226,183,20,.45);border-radius:8px;background:rgba(226,183,20,.08);margin-top:4px;">Subject + will + have + been + V-ing</span><br><br><strong>Time Markers:</strong><ul style="margin:8px 0 10px 18px;padding:0;"><li><strong>By</strong> &mdash; <em>by the end of the year</em></li><li><strong>When</strong> &mdash; <em>when I finally graduate</em></li><li><strong>For</strong> &mdash; <em>for two months</em></li></ul><strong>Example Pattern:</strong><br><em>I will have been practicing the piano for 3 years by the end of the year.</em><br><br><table style="border-collapse:collapse;margin:10px 0;font-size:0.93rem;"><tr><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Subject</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Auxiliary</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Main Verb (&minus;ing)</th><th style="padding:4px 0;color:#e2b714;text-align:left;">Time markers</th></tr><tr><td style="padding:3px 14px 3px 0;">I</td><td style="padding:3px 14px 3px 0;">will have been</td><td style="padding:3px 14px 3px 0;">doing</td><td>...for 53 weeks.</td></tr><tr><td style="padding:3px 14px 3px 0;">He / She / It</td><td style="padding:3px 14px 3px 0;">will have been</td><td style="padding:3px 14px 3px 0;">practicing</td><td>...for an hour.</td></tr><tr><td style="padding:3px 14px 3px 0;">You / We / They</td><td style="padding:3px 14px 3px 0;">will have been</td><td style="padding:3px 14px 3px 0;">working</td><td>...all day since morning.</td></tr></table>',
                    table: [],
                    examples: [
                        '<strong>By + future time:</strong> I will have been doing stage combat for 53 weeks by the end of this week.',
                        '<strong>For + duration:</strong> She will have been training with a sword for over a year by next month.',
                        '<strong>When + future event:</strong> We will have been practicing football for 6 years when the tournament begins.'
                    ]
                }
            ]
        },
        videoQuiz1b: [
            { type: 'intro', text: '<strong>Practice Affirmative</strong>' },
            {
                noNum: true,
                text: '1. By the end of this week, the woman ___ (do) stage combat for 53 weeks.',
                options: ['will have been doing', 'will have been done', 'will be doing'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>will have been doing</strong> &mdash; Future Perfect Continuous uses <strong>will have been + V-ing</strong>.'
            },
            {
                noNum: true,
                text: '2. By next month, she ___ (train) with a sword for over a year.',
                options: ['will have been train', 'will have been training', 'has been training'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>will have been training</strong> &mdash; use the &minus;ing form after <strong>will have been</strong>.'
            },
            {
                noNum: true,
                text: '3. When she finishes the course, the woman ___ (practice) different combat levels for many months.',
                options: ['will have been practicing', 'will have practiced', 'will been practicing'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>will have been practicing</strong> &mdash; this emphasizes duration up to a future point.'
            },
            {
                noNum: true,
                text: '4. By the time of the exam, she ___ (work) on her basic and intermediate skills.',
                options: ['will have being working', 'will working', 'will have been working'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>will have been working</strong> is the correct Future Perfect Continuous form.'
            },
            {
                noNum: true,
                text: '5. By the end of the day, the woman and her partner ___ (fight) for several hours.',
                options: ['will have been fighting', 'will been fighting', 'will have been fight'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>will have been fighting</strong> &mdash; keep the main verb in the &minus;ing form.'
            },
            {
                noNum: true,
                text: '6. Next year, she ___ (learn) how to use 11 different types of weapons.',
                options: ['will have been learn', 'will be learning', 'will have been learning'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>will have been learning</strong> is the correct structure here.'
            },
            {
                noNum: true,
                text: '7. By the time she gets her advanced qualification, she ___ (improve) her technique for a long time.',
                options: ['will have been improving', 'will have improved', 'will have being improving'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>will have been improving</strong> emphasizes an ongoing action over time.'
            },
            {
                noNum: true,
                text: '8. By the end of the session, the woman ___ (perform) the same sequence dozens of times.',
                options: ['will been performing', 'will have been performing', 'will have perform'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>will have been performing</strong> matches the Future Perfect Continuous pattern.'
            },
            {
                noNum: true,
                text: '9. In December, she ___ (attend) these classes for more than a year.',
                options: ['will have been attending', 'will be attending', 'will have been attend'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>will have been attending</strong> is correct because duration is emphasized.'
            },
            {
                noNum: true,
                text: '10. By the time the video ends, we realize she ___ (strive) for excellence in combat for 53 weeks.',
                options: ['will have been strive', 'will have being striving', 'will have been striving'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>will have been striving</strong> is the correct form.'
            }
        ],
        videoQuiz2: [
            {
                type: 'intro',
                text: '1. Look at the sentence: <em>&ldquo;A lot of people in the RMT won&rsquo;t have been working.&rdquo;</em>'
            },
            {
                noNum: true,
                text: 'Does this sentence say that people will still be working till a specific time in the future?',
                options: ['Yes', 'No'],
                correct: 1,
                explanation: 'This sentence has a negative meaning (<strong>won&rsquo;t have been working</strong>). By using the negative form, the speaker highlights that the ongoing process of working will be interrupted or stopped in the future.'
            },
            {
                type: 'intro',
                text: '2. Compare these two sentences:<br><em>A: They won&rsquo;t work</em><br><em>B: They won&rsquo;t have been working</em>'
            },
            {
                noNum: true,
                text: 'Which sentence simply states a fact or prediction in the future without focus on time or continuity?',
                options: ['A', 'B'],
                correct: 0,
                explanation: 'Sentence A is a simple future statement. Sentence B uses a continuous perfect form and focuses on duration.'
            },
            {
                noNum: true,
                text: 'Which sentence focuses on continuity and duration of the process in the future?',
                options: ['A', 'B'],
                correct: 1,
                explanation: 'The continuous form (&minus;ing) shifts attention to the passage of time rather than just the event itself.'
            },
            {
                type: 'intro',
                text: '3. Look at the sentence: <em>&ldquo;A lot of people in the RMT won&rsquo;t have been working.&rdquo;</em>'
            },
            {
                noNum: true,
                type: 'fill',
                text: 'a) What word is added to make the sentence negative?',
                answer: 'not',
                placeholder: 'Type here: _________',
                explanation: 'In negative sentences, we add <strong>not</strong> to the first auxiliary verb.'
            },
            {
                noNum: true,
                text: 'b) The word &ldquo;not&rdquo; in negative sentences stays&hellip;',
                options: ['After &ldquo;have&rdquo;', 'After &ldquo;been&rdquo;', 'After &ldquo;will&rdquo;'],
                correct: 2,
                explanation: 'In negative sentences we add <strong>not</strong> to the first auxiliary verb.<br>Positive: <em>I will have been working</em><br>Negative: <em>I will not (won&rsquo;t) have been working</em>'
            },
            {
                type: 'intro',
                text: '<strong>4. Put the words in correct order:</strong>'
            },
            {
                type: 'drag',
                noNum: true,
                text: '',
                words: ['will', 'She', 'studying', 'been', 'not', 'for 2 hours.', 'have', 'for the exam'],
                correct: 'She will not have been studying for the exam for 2 hours.'
            },
            {
                type: 'intro',
                text: '5. Look at the sentence: <em>&ldquo;Will they have been working in the RMT?&rdquo;</em>'
            },
            {
                noNum: true,
                type: 'fill',
                text: 'What word starts the question?',
                answer: 'will',
                altAnswers: ['Will'],
                placeholder: 'type here: ______',
                explanation: 'In interrogative Future Perfect Continuous sentences, the question starts with <strong>Will</strong>.'
            },
            {
                noNum: true,
                text: 'The subject in interrogative Future Perfect Continuous sentences stays&hellip;',
                options: ['after &ldquo;Will&rdquo;', 'after &ldquo;have&rdquo;', 'after &ldquo;been&rdquo;'],
                correct: 0,
                explanation: 'In interrogative Future Perfect Continuous sentences, the subject and only the first auxiliary verb change their places.<br><em>I will have been dancing for 5 months by the end of this week.</em><br><em>Will I have been dancing for 5 months by the end of this week?</em>'
            },
            {
                type: 'intro',
                text: '<strong>6. Put the words in the correct order:</strong>'
            },
            {
                type: 'drag',
                noNum: true,
                text: '',
                words: ['Will', 'she', 'studying', 'been', 'for 2 hours?', 'have', 'for the exam'],
                correct: 'Will she have been studying for the exam for 2 hours?'
            }
        ],
        grammarBank2: {
            blocks: [
                {
                    intro: '<strong>Grammar Bank: Future Perfect Continuous (Negative)</strong><br><br><strong>Form (Negative):</strong><br><span style="display:inline-block;padding:6px 10px;border:1px solid rgba(226,183,20,.45);border-radius:8px;background:rgba(226,183,20,.08);margin-top:4px;">Subject + won&rsquo;t (will not) + have + been + V-ing</span><br><br><strong>Contraction:</strong> won&rsquo;t = will not<br><br><em>She won&rsquo;t have been preparing dinner by the time she goes to sleep.</em><br><em>They won&rsquo;t have been discussing the topic for 2 hours by the end of the meeting.</em><br><br><table style="border-collapse:collapse;margin:10px 0;font-size:0.93rem;"><tr><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Subject</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Auxiliary + Neg</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Marker</th><th style="padding:4px 0;color:#e2b714;text-align:left;">Main Verb (&minus;ing)</th></tr><tr><td style="padding:3px 14px 3px 0;">I</td><td style="padding:3px 14px 3px 0;">won&rsquo;t have</td><td style="padding:3px 14px 3px 0;">been</td><td>sleeping</td></tr><tr><td style="padding:3px 14px 3px 0;">You / We / They</td><td style="padding:3px 14px 3px 0;">won&rsquo;t have</td><td style="padding:3px 14px 3px 0;">been</td><td>running</td></tr><tr><td style="padding:3px 14px 3px 0;">He / She / It</td><td style="padding:3px 14px 3px 0;">won&rsquo;t have</td><td style="padding:3px 14px 3px 0;">been</td><td>practicing</td></tr></table>',
                    table: [],
                    examples: [
                        'They won&rsquo;t have been working for long if a deal is not reached.',
                        'The rail industry won&rsquo;t have been operating smoothly if the strikes continue.'
                    ]
                },
                {
                    intro: '<strong>Grammar Bank: Future Perfect Continuous (Interrogative)</strong><br><br><strong>Form (Interrogative):</strong><br><span style="display:inline-block;padding:6px 10px;border:1px solid rgba(226,183,20,.45);border-radius:8px;background:rgba(226,183,20,.08);margin-top:4px;">Will + Subject + have + been + V-ing?</span><br><br><em>Will they have been waiting for a long time when we arrive?</em><br><em>Will you have been studying for an hour by 5:30?</em><br><br><table style="border-collapse:collapse;margin:10px 0;font-size:0.93rem;"><tr><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Will</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Subject</th><th style="padding:4px 14px 4px 0;color:#e2b714;text-align:left;">Have Been</th><th style="padding:4px 0;color:#e2b714;text-align:left;">Main Verb (&minus;ing)</th></tr><tr><td style="padding:3px 14px 3px 0;">Will</td><td style="padding:3px 14px 3px 0;">I</td><td style="padding:3px 14px 3px 0;">have been</td><td>practicing</td></tr><tr><td style="padding:3px 14px 3px 0;">Will</td><td style="padding:3px 14px 3px 0;">you / we / they</td><td style="padding:3px 14px 3px 0;">have been</td><td>studying</td></tr><tr><td style="padding:3px 14px 3px 0;">Will</td><td style="padding:3px 14px 3px 0;">he / she / it</td><td style="padding:3px 14px 3px 0;">have been</td><td>working</td></tr></table>',
                    table: [],
                    examples: [
                        'Will they have been asking for a pay rise for a long time by the next budget announcement?',
                        'Will she have been studying for the exam for 2 hours?'
                    ]
                }
            ]
        },
        videoQuiz2b: [
            {
                type: 'intro',
                text: `
<div class="pronunciation-box" style="display:block; margin: 10px 0 20px 0;">
    <div class="pronunciation-header">
        <span class="pronunciation-icon">🔊</span>
        <div>
            <h3 class="pronunciation-title">Pronunciation</h3>
            <p class="pronunciation-subtitle">Future Perfect Continuous Rhythm</p>
        </div>
    </div>

    <div class="pron-section">
        <p class="pronunciation-listen-label">Listen and repeat the dialogue. Copy the rhythm.</p>
        <audio class="pronunciation-audio" controls style="margin-bottom: 15px;">
            <source src="future perfect cont audio.wav" type="audio/wav">
        </audio>
        <div class="pron-dialogue">
            <div class="dialogue-line">
                <span class="dialogue-speaker speaker-a">A</span>
                <div class="dialogue-text">What <strong>will you have been doing</strong> by 8 p.m. tomorrow?</div>
            </div>
            <div class="dialogue-line">
                <span class="dialogue-speaker speaker-b">B</span>
                <div class="dialogue-text">I’ll <strong>have been studying</strong> for two hours.</div>
            </div>
            <div class="dialogue-line">
                <span class="dialogue-speaker speaker-a">A</span>
                <div class="dialogue-text"><strong>Will you have been studying</strong> all day?</div>
            </div>
            <div class="dialogue-line">
                <span class="dialogue-speaker speaker-b">B</span>
                <div class="dialogue-text">No, I <strong>won’t</strong>. I’ll <strong>have been working</strong> in the morning.</div>
            </div>
            <div class="dialogue-line">
                <span class="dialogue-speaker speaker-a">A</span>
                <div class="dialogue-text"><strong>Will your friends have been waiting</strong> long?</div>
            </div>
            <div class="dialogue-line">
                <span class="dialogue-speaker speaker-b">B</span>
                <div class="dialogue-text">Yes, they <strong>will</strong>. They’ll <strong>have been waiting</strong> for an hour.</div>
            </div>
        </div>
    </div>

    <div class="pron-section" style="margin-top:25px; padding-top:20px; border-top:1px solid rgba(0,0,0,0.05);">
        <p class="pronunciation-listen-label">Listen and repeat. Copy the rhythm.</p>
        <audio class="pronunciation-audio" controls style="margin-bottom: 15px;">
            <source src="future perfect cont 2 new.wav" type="audio/wav">
        </audio>
        <div class="pron-dialogue">
            <div class="dialogue-line">
                <span class="dialogue-speaker speaker-a">A</span>
                <div class="dialogue-text"><strong>Will you have been studying</strong> for a long time by tomorrow?</div>
            </div>
            <div class="dialogue-line">
                <span class="dialogue-speaker speaker-b">B</span>
                <div class="dialogue-text">No, I <strong>won’t</strong>.</div>
            </div>
            <div style="margin: 10px 0;"></div>
            <div class="dialogue-line">
                <span class="dialogue-speaker speaker-a">A</span>
                <div class="dialogue-text"><strong>Will she have been working</strong> all day?</div>
            </div>
            <div class="dialogue-line">
                <span class="dialogue-speaker speaker-b">B</span>
                <div class="dialogue-text">Yes, she <strong>will</strong>.</div>
            </div>
            <div style="margin: 10px 0;"></div>
            <div class="dialogue-line">
                <span class="dialogue-speaker speaker-a">A</span>
                <div class="dialogue-text"><strong>Will they have been living</strong> here for a long time by next year?</div>
            </div>
            <div class="dialogue-line">
                <span class="dialogue-speaker speaker-b">B</span>
                <div class="dialogue-text">No, they <strong>won’t</strong>.</div>
            </div>
        </div>
    </div>
</div>
`
            },
            { type: 'intro', text: '<strong>Practice Negative video2</strong>' },
            {
                noNum: true,
                text: '1. By the end of this month, the workers ______ for a fair salary for long if a deal isn&rsquo;t reached.',
                options: ["won't have fighted", "won't have been fighting", 'will have not been fight', "wouldn't have been fighting"],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>won&rsquo;t have been fighting</strong> &mdash; Future Perfect Continuous Negative: <strong>won&rsquo;t have been + V-ing</strong>.'
            },
            {
                noNum: true,
                text: '2. The rail industry ______ smoothly if the strikes continue into next year.',
                options: ["won't have been operating", "won't have operating", "won't be having operated", 'will have not operating'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>won&rsquo;t have been operating</strong> is the correct negative continuous form.'
            },
            {
                noNum: true,
                text: '3. They ______ for many hours by the time the management agrees to a meeting.',
                options: ["won't have been waited", "won't have waiting", "won't have been waiting", "haven't been waiting"],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>won&rsquo;t have been waiting</strong> follows the pattern <strong>won&rsquo;t have been + V-ing</strong>.'
            },
            {
                noNum: true,
                text: '4. The commuters ______ easily by the time the strike actions are finally resolved.',
                options: ["won't have traveled", "won't have been traveled", 'will not be traveling', "won't have been traveling"],
                correct: 3,
                wrongOnly: true,
                explanation: '<strong>won&rsquo;t have been traveling</strong> is correct for ongoing action in negative form.'
            },
            {
                noNum: true,
                text: '5. If they refuse to negotiate, the union ______ effectively with the government by next spring.',
                options: ["won't have work", "won't have been working", "won't have been worked", "haven't been working"],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>won&rsquo;t have been working</strong> is the correct Future Perfect Continuous Negative form.'
            },
            { type: 'intro', text: '<strong>Practice Interrogative video2</strong>' },
            {
                noNum: true,
                text: '1. ______ for a pay rise for a long time by the time the next budget is announced?',
                options: ['Will they have been asking', 'Will they have asking', 'Have they been asking', 'Will they have been asked'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>Will they have been asking</strong> follows interrogative Future Perfect Continuous word order.'
            },
            {
                noNum: true,
                text: '2. ______ the railway company ______ money for months if this dispute continues?',
                options: ['Will / be losing', 'Will / have been lost', 'Will / have been losing', 'Have / been losing'],
                correct: 2,
                wrongOnly: true,
                explanation: '<strong>Will / have been losing</strong> is the correct interrogative structure.'
            },
            {
                noNum: true,
                text: '3. By next week, ______ the union ______ their protest for a whole month?',
                options: ['will / have been hold', 'will / have been holding', 'have / been holding', 'will / be holding'],
                correct: 1,
                wrongOnly: true,
                explanation: '<strong>will / have been holding</strong> is correct: <strong>Will + subject + have been + V-ing</strong>.'
            },
            {
                noNum: true,
                text: '4. How long ______ the media ______ on the strike situation by the end of the year?',
                options: ['will / have been reporting', 'will / have been reported', 'will / be reporting', 'have / been reporting'],
                correct: 0,
                wrongOnly: true,
                explanation: '<strong>will / have been reporting</strong> correctly expresses duration in a future question.'
            },
            {
                noNum: true,
                text: '5. ______ the government ______ a resolution for years by the time the next election comes?',
                options: ['Have / been seeking', 'Will / have been seek', 'Will / be seeking', 'Will / have been seeking'],
                correct: 3,
                wrongOnly: true,
                explanation: '<strong>Will / have been seeking</strong> is the correct interrogative Future Perfect Continuous form.'
            }
        ],
        exercises: [
            {
                question: 'К концу года я буду работать здесь 5 лет. Выберите верно:',
                options: [
                    'By the end of the year, I will work here for 5 years.',
                    'By the end of the year, I will be working here for 5 years.',
                    'By the end of the year, I will have been working here for 5 years.',
                    'By the end of the year, I have been working here for 5 years.'
                ],
                correct: 2,
                explanation: 'Future Perfect Continuous: длительное действие, которое будет продолжаться до момента в будущем.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Дополните: "By 6 PM, she __ __ __ for 8 hours."',
                options: [
                    'will working',
                    'will be working',
                    'will have been working',
                    'has been working'
                ],
                correct: 2,
                explanation: 'Future Perfect Continuous: will have been + V+ing.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильное предложение:',
                options: [
                    'By next month, they will study here for 2 years.',
                    'By next month, they will have been studying here for 2 years.',
                    'By next month, they are studying here for 2 years.',
                    'By next month, they will be study here for 2 years.'
                ],
                correct: 1,
                explanation: 'Future Perfect Continuous: will have been studying.',
                difficulty: 'light',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите отрицание в Future Perfect Continuous:',
                options: [
                    'He will not have been working.',
                    'He won\'t have been working.',
                    'Оба варианта верны.',
                    'Ни один не верен.'
                ],
                correct: 2,
                explanation: 'Оба - "will not have been" и "won\'t have been" - верны.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Дополните отрицание: "I __ not __ __ waiting long when you arrive."',
                options: [
                    'will, been, waiting',
                    'will have, been waiting',
                    'will have been, waiting',
                    'will not, have been, wait'
                ],
                correct: 2,
                explanation: 'Future Perfect Continuous отрицание: will not have been waiting.',
                difficulty: 'light',
                sentenceForm: 'negative'
            },
            {
                question: 'Какой вопрос грамматически верен?',
                options: [
                    'Will you have been working by 5 PM?',
                    'You will have been working by 5 PM?',
                    'Will have you been working by 5 PM?',
                    'Been you will working by 5 PM?'
                ],
                correct: 0,
                explanation: 'Future Perfect Continuous вопрос: Will + подлежащее + have been + V+ing?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Завершите вопрос: "__ she __ __ __ on this project for a month?"',
                options: [
                    'Will, working',
                    'Will have, been working',
                    'Will, have been working',
                    'Will have been, working'
                ],
                correct: 1,
                explanation: 'Future Perfect Continuous вопрос: Will she have been working?',
                difficulty: 'medium',
                sentenceForm: 'question'
            },
            {
                question: 'Выберите правильное использование Future Perfect Continuous:',
                options: [
                    'By December, we will live here for a year.',
                    'By December, we will be living here for a year.',
                    'By December, we will have been living here for a year.',
                    'By December, we have been living here for a year.'
                ],
                correct: 2,
                explanation: 'Future Perfect Continuous для подчеркивания длительности: will have been living.',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Найдите ошибку:',
                options: [
                    'By next week, he will have been working there for 5 years.',
                    'She won\'t have been studying for long.',
                    'By summer, we will have been traveling for a month.',
                    'They will be living there for 10 years by 2030.'
                ],
                correct: 3,
                explanation: 'Ошибка: "will be living" должно быть "will have been living" (Future Perfect Continuous).',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Выберите правильный вариант:',
                options: [
                    'By the time you finish, I will have been waiting 2 hours.',
                    'By the time you finish, I will wait 2 hours.',
                    'By the time you finish, I am waiting 2 hours.',
                    'By the time you finish, I have been waiting 2 hours.'
                ],
                correct: 0,
                explanation: 'Future Perfect Continuous: will have been waiting.',
                difficulty: 'medium',
                sentenceForm: 'positive'
            },
            {
                question: 'Какой вариант содержит ошибку?',
                options: [
                    'By tomorrow, she will have been practicing for hours.',
                    'He won\'t have been waiting for you.',
                    'By 2025, we will have been married for 10 years.',
                    'They will have been study French by then.'
                ],
                correct: 3,
                explanation: 'Ошибка: "will have been study" должно быть "will have been studying".',
                difficulty: 'hard',
                sentenceForm: 'negative'
            },
            {
                question: 'Какое предложение правильно использует Future Perfect Continuous?',
                options: [
                    'By midnight, he will work for 12 hours.',
                    'By midnight, he will have worked for 12 hours.',
                    'By midnight, he will have been working for 12 hours.',
                    'By midnight, he is working for 12 hours.'
                ],
                correct: 2,
                explanation: 'Future Perfect Continuous подчеркивает длительность: will have been working.',
                difficulty: 'hard',
                sentenceForm: 'positive'
            },
            {
                question: 'Какой вопрос требует ответа "Yes, I will have been"?',
                options: [
                    'Will you work here by 2025?',
                    'Have you been working hard?',
                    'Will you have been working here for 10 years by 2025?',
                    'Are you working hard now?'
                ],
                correct: 2,
                explanation: '"Will you have been working...?" = "Yes, I will (have been)."',
                difficulty: 'hard',
                sentenceForm: 'question'
            },
            {
                question: 'Дополните: "How long __ you __ __ __ this course by graduation?"',
                options: [
                    'will, studying',
                    'will be, studying',
                    'will have, studied',
                    'will have been, studying'
                ],
                correct: 3,
                explanation: 'Future Perfect Continuous вопрос: How long will you have been studying?',
                difficulty: 'hard',
                sentenceForm: 'question'
            },
            {
                question: 'Выберите правильный порядок слов в Future Perfect Continuous вопросе:',
                options: [
                    'How long will you have been working by then?',
                    'How long you will have been working by then?',
                    'You will have been working how long by then?',
                    'Will have you been working how long by then?'
                ],
                correct: 0,
                explanation: 'Future Perfect Continuous вопрос: Question word + Will + подлежащее + have been + V+ing?',
                difficulty: 'hard',
                sentenceForm: 'question'
            }
        ]
    }
};

function loadLesson() {
    const tense = getTenseFromURL();
    const lesson = lessonsData[tense];

    if (!lesson || !checkLessonAccess(tense)) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Load header
    document.getElementById('tense-title').textContent = lesson.title;
    document.getElementById('tense-russian').textContent = lesson.russian;

    // Load all video sources (Tab 1, 2, 3) with tense-specific files
    loadAllVideos(lesson);

    // Render video quiz questions dynamically for the current tense
    renderVideoQuizzes(lesson);

    // Initialise progress bars (handles auto-unlock when total === 0)
    updateVideo1Progress();
    updateVideo2Progress();
    updateVideo3Progress();
    updateVideo4Progress();

    // Update progress bar labels with tense title
    ['quiz1-label', 'quiz2-label', 'quiz3-label', 'quiz4-label'].forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) el.textContent = lesson.title + ' \u2014 Video ' + (idx + 1) + ' Progress';
    });

    // Hide Video 4 tab if this tense only has 3 videos
    if (!lesson.videoFile4 && !lesson.videoQuiz4) {
        const tab4Btn = document.getElementById('tab-btn-video4');
        const arrow02 = document.getElementById('arrow-02');
        if (tab4Btn) tab4Btn.style.display = 'none';
        if (arrow02) arrow02.style.display  = 'none';
        // Reroute Video 3’s “Next” button directly to Practice Tasks
        const btnGoVideo4 = document.getElementById('btn-go-video4');
        if (btnGoVideo4) {
            btnGoVideo4.textContent = 'Practice Tasks →';
            btnGoVideo4.onclick = function() { triggerSave('Video 3'); unlockAndGo('check', 'tab-btn-check'); };
        }
        const quiz3Hint     = document.getElementById('quiz3-hint');
        const quiz3DoneHint = document.getElementById('quiz3-done-hint');
        if (quiz3Hint)     quiz3Hint.textContent     = 'Answer all questions to unlock Practice Tasks 🔒';
        if (quiz3DoneHint) quiz3DoneHint.textContent = '🔒 Answer all questions to unlock Practice Tasks';
    }

    // Hide Video 3 tab if this tense only has 2 videos
    if (!lesson.videoFile3 && !lesson.videoQuiz3) {
        const tab3Btn = document.getElementById('tab-btn-video3');
        const arrow1  = document.getElementById('arrow-1');
        if (tab3Btn) tab3Btn.style.display = 'none';
        if (arrow1)  arrow1.style.display  = 'none';
        // Reroute Video 2's "Next" button directly to Practice Tasks
        const btnGoVideo3 = document.getElementById('btn-go-video3');
        if (btnGoVideo3) {
            btnGoVideo3.textContent = 'Practice Tasks \u2192';
            btnGoVideo3.onclick = function() { triggerSave('Video 2'); unlockAndGo('check', 'tab-btn-check'); };
        }
        const quiz2Hint     = document.getElementById('quiz2-hint');
        const quiz2DoneHint = document.getElementById('quiz2-done-hint');
        if (quiz2Hint)     quiz2Hint.textContent     = 'Answer all questions to unlock Practice Tasks \uD83D\uDD12';
        if (quiz2DoneHint) quiz2DoneHint.textContent = '\uD83D\uDD12 Answer all questions to unlock Practice Tasks';
    }

    // Load task exercises (video-related Task tab)
    loadTaskExercises(lesson);

    // Load theory into Check tab
    loadTheory(lesson);

    // Handle Practice tab per tense (PS uses static HTML; others use dynamic exercises)
    handlePracticeTab(tense, lesson);

    // Restore previously-saved progress (tab locks, video quiz states)
    if (typeof restoreFromSavedState === 'function') {
        restoreFromSavedState();
    }

    // Если время уже изучено (есть дата завершения), блокируем практику при загрузке
    const currentUser = profileManager.getCurrentUser();
    if (currentUser) {
        const progress = profileManager.getUserProgress(currentUser.username);
        if (progress && progress[tense] && progress[tense].completedAt) {
            setTimeout(() => lockPracticeSection(), 800);
        }
    }
}

// ---- Load all video players with tense-specific sources ----
function loadAllVideos(lesson) {
    // Video 1
    const player1 = document.getElementById('lesson-video-player');
    if (player1) {
        if (lesson.videoFile) {
            const s = player1.querySelector('source');
            if (s) s.src = lesson.videoFile;
            player1.load();
        }
        setupVideoProgressTracking(player1);
    }

    // Video 2
    const player2 = document.getElementById('lesson-video-player-2');
    if (player2 && lesson.videoFile2) {
        const s = player2.querySelector('source');
        if (s) s.src = lesson.videoFile2;
        player2.load();
    }

    // Video 3
    const player3 = document.getElementById('lesson-video-player-3');
    if (player3 && lesson.videoFile3) {
        const s = player3.querySelector('source');
        if (s) s.src = lesson.videoFile3;
        player3.load();
    }

    // Video 4
    const player4 = document.getElementById('lesson-video-player-4');
    if (player4 && lesson.videoFile4) {
        const s = player4.querySelector('source');
        if (s) s.src = lesson.videoFile4;
        player4.load();
    }
}

// Keep loadVideo as an alias for backward compatibility
function loadVideo(lesson) { loadAllVideos(lesson); }

// ---- Render video quiz questions dynamically for all video tabs ----
function renderVideoQuizzes(lesson) {
    renderVideoQuiz(1, lesson.videoQuiz1);
    if (lesson.grammarBank1) {
        if (lesson.grammarBank1.blocks) renderGrammarBank4('video1-grammar-bank', lesson.grammarBank1);
        else renderGrammarBank('video1-grammar-bank', lesson.grammarBank1);
    }
    if (lesson.videoQuiz1b) renderVideoQuiz(1, lesson.videoQuiz1b, 'video1-practice-questions', 'vq1b');

    // Hide NEGATIVE AND INTERROGATIVE block for all tenses except Past Simple and Future Continuous
    const _tense = getTenseFromURL();
    if (_tense !== 'past-simple' && _tense !== 'future-continuous') {
        const _q2 = document.getElementById('video1-quiz2');
        if (_q2) _q2.style.display = 'none';
    }
    // For future-continuous: update heading of video1-quiz2 block
    if (_tense === 'future-continuous') {
        const _q2heading = document.querySelector('#video1-quiz2 .quiz-heading');
        if (_q2heading) _q2heading.textContent = '\uD83C\uDFAF NEGATIVE & QUESTIONS';
    }

    if (lesson.videoQuiz1c) renderVideoQuiz(1, lesson.videoQuiz1c, 'video1-quiz-questions2', 'vq1c');
    if (lesson.grammarBank1b) renderGrammarBank4('video1-grammar-bank2', lesson.grammarBank1b);
    if (lesson.videoQuiz1d) renderVideoQuiz(1, lesson.videoQuiz1d, 'video1-practice-questions2', 'vq1d');
    renderVideoQuiz(2, lesson.videoQuiz2);
    if (lesson.grammarBank2) {
        if (lesson.grammarBank2.blocks) renderGrammarBank4('video2-grammar-bank', lesson.grammarBank2);
        else renderGrammarBank('video2-grammar-bank', lesson.grammarBank2);
    }
    if (lesson.videoQuiz2b) renderVideoQuiz(2, lesson.videoQuiz2b, 'video2-practice-questions', 'v2qb');
    renderVideoQuiz(3, lesson.videoQuiz3);
    if (lesson.grammarBank3) renderGrammarBank4('video3-grammar-bank', lesson.grammarBank3);
    // Show pronunciation block per tense
    (function() {
        var _t = getTenseFromURL();
        var _pb = document.getElementById('video3-pronunciation-block');
        var _pbpp = document.getElementById('video3-pronunciation-block-pp');
        if (_pbpp && _t === 'present-perfect') _pbpp.style.display = 'block';
        var _pbps = document.getElementById('video3-pronunciation-block-ps');
        if (_pbps && _t === 'past-simple') _pbps.style.display = 'block';
        var _pbfs = document.getElementById('video3-pronunciation-block-fs');
        if (_pbfs && _t === 'future-simple') _pbfs.style.display = 'block';
        var _pbfc = document.getElementById('video3-pronunciation-block-fc');
        if (_pbfc && _t === 'future-continuous') _pbfc.style.display = 'block';
        var _pbfp = document.getElementById('video3-pronunciation-block-fp');
        if (_pbfp && _t === 'future-perfect') _pbfp.style.display = 'block';
        var _pbppc = document.getElementById('video3-pronunciation-block-ppc');
        if (_pbppc && _t === 'past-perfect-continuous') _pbppc.style.display = 'block';
    })();
    if (lesson.videoQuiz3b) renderVideoQuiz(3, lesson.videoQuiz3b, 'video3-practice-questions', 'v3qb');
    renderVideoQuiz(4, lesson.videoQuiz4);
    if (lesson.grammarBank4) renderGrammarBank4('video4-grammar-bank', lesson.grammarBank4);
    // Show pronunciation block for present-continuous only
    (function() {
        var _t = getTenseFromURL();
        var _pb4 = document.getElementById('video4-pronunciation-block');
        if (_pb4 && _t === 'present-continuous') _pb4.style.display = 'block';
            var _pb4ps = document.getElementById('video4-pronunciation-block-ps');
            if (_pb4ps && _t === 'present-simple') _pb4ps.style.display = 'block'; 
        var _pb2ppc = document.getElementById('video2-pronunciation-block');
        if (_pb2ppc && _t === 'present-perfect-continuous') _pb2ppc.style.display = 'block';
        var _pb2pp = document.getElementById('video2-pronunciation-block-ppast');
        if (_pb2pp && _t === 'past-perfect') _pb2pp.style.display = 'block';
    })();
    if (lesson.videoQuiz4b) renderVideoQuiz(4, lesson.videoQuiz4b, 'video4-practice-questions', 'v4qb');
}

function renderGrammarBank(containerId, data) {
    var el = document.getElementById(containerId);
    if (!el || !data) return;

    var examplesHtml = data.examples.map(function(ex) {
        return '<li class="grammar-bank-example">' + ex + '</li>';
    }).join('');

    el.innerHTML =
        '<div class="grammar-bank-block">' +
            '<div class="grammar-bank-header">' +
                '<span class="grammar-bank-icon">📚</span>' +
                '<span class="grammar-bank-label">Grammar Bank</span>' +
            '</div>' +
            '<h3 class="grammar-bank-title">' + data.title + '</h3>' +
            '<p class="grammar-bank-intro">' + data.intro + '</p>' +
            '<div class="grammar-bank-structure">' + data.structure + '</div>' +
            '<ul class="grammar-bank-examples">' + examplesHtml + '</ul>' +
        '</div>';
}

function renderGrammarBank4(containerId, data) {
    var el = document.getElementById(containerId);
    if (!el || !data) return;

    var blocksHtml = data.blocks.map(function(block) {
        var rows = (block.table || []).map(function(row) {
            return '<tr><td style="padding:4px 14px 4px 0;font-weight:600;color:#e2b714;white-space:nowrap;">' + row[0] + '</td>' +
                   '<td style="padding:4px 0;">' + row[1] + '</td></tr>';
        }).join('');
        var tableHtml = rows ? '<table style="border-collapse:collapse;margin:10px 0 12px;font-size:0.95rem;">' + rows + '</table>' : '';
        var exHtml = (block.examples || []).map(function(ex) {
            return '<li class="grammar-bank-example">' + ex + '</li>';
        }).join('');
        return '<div class="grammar-bank-block" style="margin-bottom:14px;">' +
            '<div class="grammar-bank-header">' +
                '<span class="grammar-bank-icon">📚</span>' +
                '<span class="grammar-bank-label">Grammar Bank</span>' +
            '</div>' +
            '<p class="grammar-bank-intro" style="margin-bottom:6px;">' + block.intro + '</p>' +
            tableHtml +
            (exHtml ? '<ul class="grammar-bank-examples">' + exHtml + '</ul>' : '') +
        '</div>';
    }).join('');

    el.innerHTML = blocksHtml;
}

function renderVideoQuiz(videoNum, questions, containerId, idPrefix) {
    const container = document.getElementById(containerId || 'video' + videoNum + '-quiz-questions');
    if (!container) return;

    if (!questions || questions.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:16px;color:#888;font-style:italic;">Exercises for this video are coming soon.</p>';
        // No questions = nothing required to complete this section
        if (!idPrefix) videoQuizTotals[videoNum] = 0;
        return;
    }

    container.innerHTML = '';
    // ID prefix per video number to match existing save/restore infrastructure
    var prefix = idPrefix || (videoNum === 1 ? 'vq' : videoNum === 2 ? 'v2q' : videoNum === 3 ? 'v3q' : 'v4q');

    var qNum = 0; // counts only real questions (not intro blocks)

    questions.forEach(function(q, idx) {

        // ── Intro / context block (not a question, not counted) ──────────
        if (q.type === 'intro') {
            var introBox = document.createElement('div');
            introBox.style.cssText = [
                'background:#fdf8e1',
                'border-left:4px solid #e2b714',
                'border-radius:10px',
                'padding:14px 18px',
                'margin:14px 0 6px',
                'font-size:0.97rem',
                'line-height:1.8',
                'color:#1a1a1a'
            ].join(';');
            introBox.innerHTML = (q.num ? q.num + '. ' : '') + q.text;
            container.appendChild(introBox);
            return; // skip question rendering
        }

        qNum++;
        var qId  = prefix + qNum;
        var card = document.createElement('div');
        card.className = 'quiz-card';
        card.id        = qId;

        var qText = document.createElement('p');
        qText.className = 'quiz-q-text';
        qText.innerHTML = (q.noNum ? '' : q.subLetter ? q.subLetter + ') ' : qNum + '. ') + q.text;
        card.appendChild(qText);

        var feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'quiz-feedback';
        feedbackDiv.id = qId + '-feedback';

        if (q.type === 'fill') {
            // ── Single fill-in-the-blank ──────────────────────────────────
            var fillWrap = document.createElement('div');
            fillWrap.className = 'quiz-single-opts';
            fillWrap.style.alignItems = 'center';
            fillWrap.style.flexWrap  = 'wrap';
            fillWrap.style.gap       = '10px';

            var inp = document.createElement('input');
            inp.type        = 'text';
            inp.placeholder = q.placeholder || 'type here...';
            inp.className   = 'quiz-fill-input';
            inp.style.cssText = 'padding:8px 12px;border-radius:8px;border:2px solid #444;' +
                'background:#1a1a2e;color:#fff;font-size:1rem;width:180px;outline:none;';

            var checkBtn = document.createElement('button');
            checkBtn.className   = 'quiz-opt-btn';
            checkBtn.textContent = 'Check ✓';
            checkBtn.style.padding = '8px 20px';

            (function(capturedQId, capturedInp, capturedAnswer, capturedAlt, capturedExpl) {
                checkBtn.addEventListener('click', function() {
                    checkDynVideoFill(videoNum, capturedQId, capturedInp, capturedAnswer, capturedExpl, capturedAlt);
                });
                capturedInp.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') checkDynVideoFill(videoNum, capturedQId, capturedInp, capturedAnswer, capturedExpl, capturedAlt);
                });
            })(qId, inp, q.answer, q.altAnswers || [], q.explanation || '');

            fillWrap.appendChild(inp);
            fillWrap.appendChild(checkBtn);
            card.appendChild(fillWrap);

        } else if (q.type === 'fill3') {
            // ── Three fill-in-the-blank boxes (structure question) ────────
            var f3Wrap = document.createElement('div');
            f3Wrap.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:12px 0;';

            var inputs3 = [];
            q.answers.forEach(function(ans, aIdx) {
                if (aIdx > 0) {
                    var plus = document.createElement('span');
                    plus.textContent = '+';
                    plus.style.cssText = 'font-size:1.2rem;font-weight:700;color:#e2b714;';
                    f3Wrap.appendChild(plus);
                }
                var inp3 = document.createElement('input');
                inp3.type        = 'text';
                inp3.placeholder = (q.placeholders && q.placeholders[aIdx]) || '...';
                inp3.className   = 'quiz-fill-input';
                inp3.style.cssText = 'padding:8px 10px;border-radius:8px;border:2px solid #444;' +
                    'background:#1a1a2e;color:#fff;font-size:0.95rem;width:140px;outline:none;';
                inputs3.push(inp3);
                f3Wrap.appendChild(inp3);
            });

            var checkBtn3 = document.createElement('button');
            checkBtn3.className   = 'quiz-opt-btn';
            checkBtn3.textContent = 'Check ✓';
            checkBtn3.style.cssText = 'margin-left:8px;padding:8px 20px;';

            (function(capturedQId, capturedInputs, capturedAnswers, capturedExpl) {
                checkBtn3.addEventListener('click', function() {
                    checkDynVideoFill3(videoNum, capturedQId, capturedInputs, capturedAnswers, capturedExpl);
                });
            })(qId, inputs3, q.answers, q.explanation || '');

            f3Wrap.appendChild(checkBtn3);
            card.appendChild(f3Wrap);

        } else if (q.type === 'drag') {
            // ── Drag-and-drop word ordering ───────────────────────────────
            var dragBody = document.createElement('div');
            dragBody.className = 'drag-exercise-body';

            var bankDiv = document.createElement('div');
            bankDiv.className = 'word-bank';
            bankDiv.id = 'bank-' + qId;

            (q.words || []).forEach(function(word, wIdx) {
                var chipEl = document.createElement('span');
                chipEl.className = 'word-chip';
                chipEl.dataset.word = word;
                chipEl.dataset.chipId = qId + '-' + wIdx;
                chipEl.dataset.qid = qId;
                chipEl.textContent = word;
                chipEl.style.cursor = 'pointer';
                chipEl.addEventListener('click', function() { chipClickHandler(this); });
                bankDiv.appendChild(chipEl);
            });

            var zoneDiv = document.createElement('div');
            zoneDiv.className = 'answer-zone';
            zoneDiv.id = 'answer-' + qId;
            var phEl = document.createElement('span');
            phEl.className = 'answer-zone-placeholder';
            phEl.textContent = 'Click words to build the sentence\u2026';
            zoneDiv.appendChild(phEl);

            var checkRow = document.createElement('div');
            checkRow.className = 'drag-check-row';
            var dragResEl = document.createElement('span');
            dragResEl.className = 'drag-result';
            dragResEl.id = 'drag-result-' + qId;
            var attBadge = document.createElement('span');
            attBadge.id = 'drag-att-' + qId;
            attBadge.style.cssText = 'font-size:0.82rem;color:#aaa;margin-left:6px;';
            attBadge.textContent = '1 attempt';

            var checkDragBtn = document.createElement('button');
            checkDragBtn.className = 'quiz-opt-btn';
            checkDragBtn.textContent = 'Check \u2713';
            checkDragBtn.style.cssText = 'margin-left:8px;padding:8px 20px;';
            (function(capturedQId, capturedVN, capturedCorrect, capturedExpl) {
                checkDragBtn.addEventListener('click', function() {
                    checkDynVideoDrag(capturedVN, capturedQId, capturedCorrect, capturedExpl);
                });
            })(qId, videoNum, q.correct, q.explanation || '');

            checkRow.appendChild(dragResEl);
            checkRow.appendChild(checkDragBtn);
            checkRow.appendChild(attBadge);
            dragBody.appendChild(bankDiv);
            dragBody.appendChild(zoneDiv);
            dragBody.appendChild(checkRow);
            card.appendChild(dragBody);

        } else if (q.type === 'match') {
            // ── Matching exercise ─────────────────────────────────────────
            var matchWrap = document.createElement('div');
            matchWrap.style.cssText = 'margin:10px 0;';

            q.pairs.forEach(function(pair, pIdx) {
                var row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:10px;margin:8px 0;flex-wrap:wrap;';

                var leftLabel = document.createElement('span');
                leftLabel.innerHTML = pair.left;
                leftLabel.style.cssText = 'min-width:160px;font-size:0.97rem;color:#1a1a1a;';

                var arrow = document.createElement('span');
                arrow.textContent = '\u2192';
                arrow.style.cssText = 'color:#e2b714;font-size:1.1rem;';

                var sel = document.createElement('select');
                sel.id = qId + '-match-' + pIdx;

                var defaultOpt = document.createElement('option');
                defaultOpt.value = '';
                defaultOpt.textContent = '\u2014 choose \u2014';
                defaultOpt.disabled = true;
                defaultOpt.selected = true;
                sel.appendChild(defaultOpt);

                q.definitions.forEach(function(def, dIdx) {
                    var opt = document.createElement('option');
                    opt.value = dIdx;
                    opt.textContent = def;
                    sel.appendChild(opt);
                });

                row.appendChild(leftLabel);
                row.appendChild(arrow);
                row.appendChild(sel);
                matchWrap.appendChild(row);
            });

            var checkMatchBtn = document.createElement('button');
            checkMatchBtn.className = 'quiz-opt-btn';
            checkMatchBtn.textContent = 'Check \u2713';
            checkMatchBtn.style.cssText = 'margin-top:10px;padding:8px 20px;';
            (function(capturedQId, capturedVN, capturedPairs, capturedExpl) {
                checkMatchBtn.addEventListener('click', function() {
                    checkDynVideoMatch(capturedVN, capturedQId, capturedPairs, capturedExpl);
                });
            })(qId, videoNum, q.pairs, q.explanation || '');

            matchWrap.appendChild(checkMatchBtn);
            card.appendChild(matchWrap);

        } else {
            // ── Standard single-choice buttons ────────────────────────────
            var optsDiv = document.createElement('div');
            optsDiv.className = 'quiz-single-opts';

            q.options.forEach(function(optText, optIdx) {
                var isCorrect   = (optIdx === q.correct);
                var explanation = q.explanation || '';
                var btn = document.createElement('button');
                btn.className = 'quiz-opt-btn';
                btn.innerHTML = optText;
                if (isCorrect) btn.setAttribute('data-correct', 'true');
                (function(capturedQId, capturedIsCorrect, capturedExpl, capturedWrongOnly) {
                    btn.addEventListener('click', function() {
                        checkDynVideoSingle(videoNum, capturedQId, btn, capturedIsCorrect, capturedExpl, capturedWrongOnly);
                    });
                })(qId, isCorrect, explanation, q.wrongOnly || false);
                optsDiv.appendChild(btn);
            });

            card.appendChild(optsDiv);
        }

        card.appendChild(feedbackDiv);
        container.appendChild(card);
    });

    // Update dynamic total — count only real questions (exclude intro blocks)
    var qCount = questions.filter(function(q) { return q.type !== 'intro'; }).length;
    if (idPrefix) {
        videoQuizTotals[videoNum] = (videoQuizTotals[videoNum] || 0) + qCount;
    } else {
        videoQuizTotals[videoNum] = qCount;
    }
}

// ---- Drag-and-drop answer handler for video quiz ----
function checkDynVideoDrag(videoNum, questionId, correctAnswer, explanation) {
    var MAX_ATT = 1;
    if (_videoDragAttempts[questionId] === undefined) _videoDragAttempts[questionId] = 0;

    var zone    = document.getElementById('answer-' + questionId);
    var card    = document.getElementById(questionId);
    if (!zone || !card) return;
    var chipEls = zone.querySelectorAll('.word-chip');
    if (!chipEls.length) return;

    var userAnswer = Array.from(chipEls).map(function(c) { return c.dataset.word; }).join(' ');
    var normalize  = function(s) { return s.replace(/[.!?,]/g, '').trim().toLowerCase(); };
    var isCorrect  = normalize(userAnswer) === normalize(correctAnswer);

    var resultEl = document.getElementById('drag-result-' + questionId);
    var feedback = document.getElementById(questionId + '-feedback');
    var attEl    = document.getElementById('drag-att-' + questionId);
    var checkBtn = card.querySelector('.quiz-opt-btn');
    var resetBtn = card.querySelector('.drag-reset-btn');

    function lockQuestion() {
        if (checkBtn) checkBtn.disabled = true;
        if (resetBtn) resetBtn.disabled = true;
        if (attEl)   attEl.style.display = 'none';
        Array.from(zone.querySelectorAll('.word-chip')).forEach(function(c) {
            c.onclick = null;
            c.style.cursor = 'default';
        });
        if (videoNum === 1) { video1Answered.add(questionId); updateVideo1Progress(); }
        else if (videoNum === 2) { video2Answered.add(questionId); updateVideo2Progress(); }
        else if (videoNum === 3) { video3Answered.add(questionId); updateVideo3Progress(); }
        else if (videoNum === 4) { video4Answered.add(questionId); updateVideo4Progress(); }
    }

    if (isCorrect) {
        Array.from(chipEls).forEach(function(c) { c.classList.add('chip-correct'); });
        if (resultEl) { resultEl.textContent = '\u2713 Correct!'; resultEl.className = 'drag-result drag-res-ok'; }
        var html = '<span class="quiz-correct-msg">\u2713 Correct!</span>';
        if (explanation) html += '<div class="quiz-explanation-box">\uD83D\uDCA1 ' + explanation + '</div>';
        if (feedback) feedback.innerHTML = html;
        lockQuestion();
    } else {
        _videoDragAttempts[questionId]++;
        zone.classList.add('zone-shake');
        setTimeout(function() { zone.classList.remove('zone-shake'); }, 500);

        var attLeft = MAX_ATT - _videoDragAttempts[questionId];

        if (attLeft <= 0) {
            if (resultEl) { resultEl.textContent = '\u2717 Incorrect'; resultEl.className = 'drag-result drag-res-err'; }
            var html2 = '<span class="quiz-wrong-msg">\u2717 Incorrect.</span>';
            if (explanation) html2 += '<div class="quiz-explanation-box">\uD83D\uDCA1 ' + explanation + '</div>';
            if (feedback) feedback.innerHTML = html2;
            lockQuestion();
        } else {
            if (resultEl) { resultEl.textContent = '\u2717 Incorrect'; resultEl.className = 'drag-result drag-res-err'; }
            if (feedback) feedback.innerHTML = '<span class="quiz-wrong-msg">\u2717 Incorrect \u2014 try again.</span>';
            if (attEl) {
                attEl.textContent = attLeft + (attLeft === 1 ? ' attempt' : ' attempts') + ' left';
                attEl.style.color  = attLeft === 1 ? '#ef4444' : '';
            }
        }
    }
}

// ---- Dynamic video quiz answer handler ----
// Uses the existing video1Answered / updateVideo1Progress infrastructure
function checkDynVideoSingle(videoNum, questionId, btn, isCorrect, explanation, wrongOnly) {
    var card = document.getElementById(questionId);
    if (!card) return;
    var allBtns = card.querySelectorAll('.quiz-opt-btn');
    allBtns.forEach(function(b) { b.disabled = true; });

    var feedback = document.getElementById(questionId + '-feedback');

    if (isCorrect) {
        btn.classList.add('quiz-opt-correct');
        var html = '<span class="quiz-correct-msg">\u2713 Correct!</span>';
        if (explanation && !wrongOnly) html += '<div class="quiz-explanation-box">\uD83D\uDCA1 ' + explanation + '</div>';
        if (feedback) feedback.innerHTML = html;
    } else {
        btn.classList.add('quiz-opt-wrong');
        var correctBtn = card.querySelector('.quiz-opt-btn[data-correct="true"]');
        if (correctBtn) correctBtn.classList.add('quiz-opt-correct-show');
        var html2 = '<span class="quiz-wrong-msg">\u2717 ' + (wrongOnly ? 'Incorrect.' : 'Not quite.') + '</span>';
        if (explanation) html2 += '<div class="quiz-explanation-box">\uD83D\uDCA1 ' + explanation + '</div>';
        if (feedback) feedback.innerHTML = html2;
    }

    // Delegate to the appropriate Set + progress function
    if (videoNum === 1) {
        video1Answered.add(questionId);
        updateVideo1Progress();
    } else if (videoNum === 2) {
        video2Answered.add(questionId);
        updateVideo2Progress();
    } else if (videoNum === 3) {
        video3Answered.add(questionId);
        updateVideo3Progress();
    } else if (videoNum === 4) {
        video4Answered.add(questionId);
        updateVideo4Progress();
    }
}

// ---- Matching exercise answer handler ----
function checkDynVideoMatch(videoNum, questionId, pairs, explanation) {
    var card     = document.getElementById(questionId);
    var feedback = document.getElementById(questionId + '-feedback');
    if (!card || !feedback) return;

    var allCorrect = true;
    var anyBlank   = false;
    pairs.forEach(function(pair, pIdx) {
        var sel = document.getElementById(questionId + '-match-' + pIdx);
        if (!sel) return;
        if (sel.value === '') { anyBlank = true; return; }
        var val = parseInt(sel.value, 10);
        if (val !== pair.rightIdx) {
            allCorrect = false;
            sel.style.border = '2px solid #e74c3c';
        } else {
            sel.style.border = '2px solid #22c55e';
        }
    });

    if (anyBlank) {
        feedback.style.display = 'block';
        feedback.innerHTML = '<span style="color:#e2b714;font-weight:700;">Please match all items first.</span>';
        return;
    }

    if (allCorrect) {
        pairs.forEach(function(pair, pIdx) {
            var sel = document.getElementById(questionId + '-match-' + pIdx);
            if (sel) { sel.disabled = true; sel.style.border = '2px solid #22c55e'; }
        });
        var checkBtn = card.querySelector('.quiz-opt-btn');
        if (checkBtn) { checkBtn.disabled = true; checkBtn.style.opacity = '0.5'; }
        feedback.style.display = 'block';
        feedback.innerHTML = '<span class="quiz-correct-msg">\u2713 Correct!</span>' +
            (explanation ? '<div class="quiz-explanation-box">\uD83D\uDCA1 ' + explanation + '</div>' : '');
        if (videoNum === 1) { video1Answered.add(questionId); updateVideo1Progress(); }
        else if (videoNum === 2) { video2Answered.add(questionId); updateVideo2Progress(); }
        else if (videoNum === 3) { video3Answered.add(questionId); updateVideo3Progress(); }
        else if (videoNum === 4) { video4Answered.add(questionId); updateVideo4Progress(); }
    } else {
        feedback.style.display = 'block';
        feedback.innerHTML = '<span class="quiz-wrong-msg">\u2717 Not quite. Try again.</span>';
        pairs.forEach(function(pair, pIdx) {
            var sel = document.getElementById(questionId + '-match-' + pIdx);
            if (sel && parseInt(sel.value, 10) !== pair.rightIdx) {
                sel.disabled = false;
                sel.style.border = '2px solid #e74c3c';
            }
        });
    }
}

// ---- Fill-in-the-blank answer handler (single input) ----
function checkDynVideoFill(videoNum, questionId, inputEl, correctAnswer, explanation, altAnswers) {
    var feedback = document.getElementById(questionId + '-feedback');
    var card     = document.getElementById(questionId);
    if (!card) return;

    // Disable the input and the Check button
    inputEl.disabled = true;
    var checkBtn = card.querySelector('.quiz-opt-btn');
    if (checkBtn) checkBtn.disabled = true;

    // Normalise: remove leading/trailing dash, lowercase, trim spaces
    var supplied = inputEl.value.trim().toLowerCase().replace(/^-/, '');
    var expected = correctAnswer.trim().toLowerCase().replace(/^-/, '');
    var alts = (altAnswers || []).map(function(a) { return a.trim().toLowerCase().replace(/^-/, ''); });
    var isCorrect = (supplied === expected) || (alts.length > 0 && alts.indexOf(supplied) !== -1);

    if (isCorrect) {
        inputEl.style.border = '2px solid #22c55e';
        var html = '<span class="quiz-correct-msg">\u2713 Correct!</span>';
        if (explanation) html += '<div class="quiz-explanation-box">\uD83D\uDCA1 ' + explanation + '</div>';
        if (feedback) feedback.innerHTML = html;
    } else {
        inputEl.style.border = '2px solid #ef4444';
        var html2 = '<span class="quiz-wrong-msg">\u2717 Not quite. The answer is: <strong>-' + correctAnswer + '</strong></span>';
        if (explanation) html2 += '<div class="quiz-explanation-box">\uD83D\uDCA1 ' + explanation + '</div>';
        if (feedback) feedback.innerHTML = html2;
    }

    if (videoNum === 1) { video1Answered.add(questionId); updateVideo1Progress(); }
    else if (videoNum === 2) { video2Answered.add(questionId); updateVideo2Progress(); }
    else if (videoNum === 3) { video3Answered.add(questionId); updateVideo3Progress(); }
    else if (videoNum === 4) { video4Answered.add(questionId); updateVideo4Progress(); }
}

// ---- Fill-in-the-blank answer handler (3 boxes — structure question) ----
function checkDynVideoFill3(videoNum, questionId, inputEls, correctAnswers, explanation) {
    var feedback = document.getElementById(questionId + '-feedback');
    var card     = document.getElementById(questionId);
    if (!card) return;

    inputEls.forEach(function(inp) { inp.disabled = true; });
    var checkBtn = card.querySelector('.quiz-opt-btn');
    if (checkBtn) checkBtn.disabled = true;

    // Accept common spelling variations (verb+ing / verb-ing / v+ing etc.)
    function normalise(s) {
        return s.trim().toLowerCase()
            .replace(/\s+/g, '')
            .replace(/verb\+ing|verb-ing|v\+ing/g, 'verb+ing')
            .replace(/am\/is\/are|am-is-are|amisare/g, 'am/is/are');
    }

    var allCorrect = inputEls.every(function(inp, i) {
        return normalise(inp.value) === normalise(correctAnswers[i]);
    });

    // Colour each box
    inputEls.forEach(function(inp, i) {
        var ok = normalise(inp.value) === normalise(correctAnswers[i]);
        inp.style.border = ok ? '2px solid #22c55e' : '2px solid #ef4444';
        if (!ok) inp.value = correctAnswers[i]; // show correct answer in wrong box
    });

    if (allCorrect) {
        var html = '<span class="quiz-correct-msg">\u2713 Correct!</span>';
        if (explanation) html += '<div class="quiz-explanation-box">\uD83D\uDCA1 ' + explanation + '</div>';
        if (feedback) feedback.innerHTML = html;
    } else {
        var html2 = '<span class="quiz-wrong-msg">\u2717 Not quite \u2014 see the corrected boxes above.</span>';
        if (explanation) html2 += '<div class="quiz-explanation-box">\uD83D\uDCA1 ' + explanation + '</div>';
        if (feedback) feedback.innerHTML = html2;
    }

    if (videoNum === 1) { video1Answered.add(questionId); updateVideo1Progress(); }
    else if (videoNum === 2) { video2Answered.add(questionId); updateVideo2Progress(); }
    else if (videoNum === 3) { video3Answered.add(questionId); updateVideo3Progress(); }
    else if (videoNum === 4) { video4Answered.add(questionId); updateVideo4Progress(); }
}

// ---- Handle Practice Tasks tab visibility per tense ----
/**
 * Switch between practice sections for Past Simple
 */
function switchPSSection(num) {
    const sectionTitles = ["Multiple Choice", "Find Errors", "Fill in the Gaps", "Rewrite the Sentences"];

    const dropdown = document.getElementById('ps-practice-dropdown');
    if (dropdown) dropdown.classList.remove('open');

    const sections = ['ps-section-1', 'ps-section-2', 'ps-section-3', 'ps-section-4'];
    sections.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) el.style.display = (idx + 1 === num) ? 'block' : 'none';
    });

    const currentSectionTitle = document.getElementById('ps-current-section');
    if (currentSectionTitle) currentSectionTitle.textContent = `Practice ${num}: ${sectionTitles[num - 1]}`;
}

/**
 * Switch between practice sections for Present Continuous
 */
function switchPCSection(num) {
    const sectionTitles = ["Multiple Choice", "Find Errors", "Fill in the Gaps", "Rewrite the Sentences", "Present Simple vs. Present Continuous"];

    const dropdown = document.getElementById('pc-practice-dropdown');
    if (dropdown) dropdown.classList.remove('open');

    const sections = ['pc-section-1', 'pc-section-2', 'pc-section-3', 'pc-section-4', 'pc-section-5'];
    sections.forEach((id, idx) => { // idx is 0-based, num is 1-based
        const el = document.getElementById(id);
        if (el) el.style.display = (idx + 1 === num) ? 'block' : 'none';
    });

    const currentSectionTitle = document.getElementById('pc-current-section');
    if (currentSectionTitle) currentSectionTitle.textContent = `Practice ${num}: ${sectionTitles[num - 1]}`;
}

/**
 * Switch between practice sections for Past Continuous
 */
function switchPContSection(num) {
    const sectionTitles = ["Multiple Choice", "Find Errors", "Fill in the Blanks", "Rewrite the Sentences"];

    const dropdown = document.getElementById('pcont-practice-dropdown');
    if (dropdown) dropdown.classList.remove('open');

    const sections = ['pcont-section-1', 'pcont-section-2', 'pcont-section-3', 'pcont-section-4'];
    sections.forEach((id, idx) => { // idx is 0-based, num is 1-based
        const el = document.getElementById(id);
        if (el) el.style.display = (idx + 1 === num) ? 'block' : 'none';
    });

    const currentSectionTitle = document.getElementById('pcont-current-section');
    if (currentSectionTitle) currentSectionTitle.textContent = `Practice ${num}: ${sectionTitles[num - 1]}`;
}

/**
 * Switch between practice sections for Present Perfect Continuous
 */
function switchPPContSection(num) {
    const sectionTitles = ["Multiple Choice", "Find Errors", "Fill in the Blanks", "Rewrite the Sentences"];

    const dropdown = document.getElementById('ppcont-practice-dropdown');
    if (dropdown) dropdown.classList.remove('open');

    const sections = ['ppcont-section-1', 'ppcont-section-2', 'ppcont-section-3', 'ppcont-section-4'];
    sections.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) el.style.display = (idx + 1 === num) ? 'block' : 'none';
    });

    const currentSectionTitle = document.getElementById('ppcont-current-section');
    if (currentSectionTitle) {
        currentSectionTitle.textContent = `Practice ${num}: ${sectionTitles[num - 1]}`;
    }
}

function handlePracticeTab(tense, lesson) {
    var psStatic    = document.getElementById('ps-practice-static');
    var pcStatic    = document.getElementById('pc-practice-static');
    var dynExercises = document.getElementById('tense-dynamic-exercises');

    if (psStatic) psStatic.style.display = 'none';
    if (pcStatic) pcStatic.style.display = 'none';
    if (dynExercises) dynExercises.style.display = 'none';

    const filtersBlock = document.querySelector('.exercises-header');
    
    if (filtersBlock) filtersBlock.style.display = '';

    let useDynamicRenderer = false; // Initialize to false

    if (tense === 'present-simple') {
        if (dynExercises) renderPresentSimplePracticeTasks(dynExercises);
        useDynamicRenderer = true;
    } else if (tense === 'present-continuous') {
        if (pcStatic) {
            pcStatic.style.display = '';
            switchPCSection(1);
        }
    } else if (tense === 'past-simple') {
        if (dynExercises) renderPastSimplePracticeTasks(dynExercises);
        useDynamicRenderer = true;
    } else if (tense === 'past-continuous') {
        if (dynExercises) renderPastContinuousPracticeTasks(dynExercises);
        useDynamicRenderer = true;
    } else if (tense === 'present-perfect-continuous') {
        if (dynExercises) renderPresentPerfectContinuousPracticeTasks(dynExercises);
        useDynamicRenderer = true;
    } else if (tense === 'past-perfect') {
        if (dynExercises) renderPastPerfectPracticeTasks(dynExercises);
        useDynamicRenderer = true;
    } else if (tense === 'past-perfect-continuous') {
        if (dynExercises) renderPastPerfectContinuousPracticeTasks(dynExercises);
        useDynamicRenderer = true;
    } else if (tense === 'future-perfect-continuous') {
        if (dynExercises) renderFuturePerfectContinuousPracticeTasks(dynExercises);
        useDynamicRenderer = true;
    } else if (tense === 'present-perfect') {
        if (dynExercises) renderPresentPerfectPracticeTasks(dynExercises);
        useDynamicRenderer = true;
    } else if (tense === 'future-simple') {
        if (dynExercises) renderFutureSimplePracticeTasks(dynExercises);
        useDynamicRenderer = true;
    } else if (tense === 'future-perfect') {
        if (dynExercises) renderFuturePerfectPracticeTasks(dynExercises);
        useDynamicRenderer = true;
    } else if (tense === 'future-continuous') {
        if (dynExercises) renderFutureContinuousPracticeTasks(dynExercises);
        useDynamicRenderer = true;
    } else {
        // Hide hardcoded PS practice; show dynamic exercises for this tense
        if (dynExercises) {
            dynExercises.style.display = '';
            loadDynamicPractice(lesson, dynExercises);
        }
    }

    if (useDynamicRenderer && dynExercises) {
        dynExercises.style.display = ''; // Ensure it's visible if used
        if (filtersBlock) filtersBlock.style.display = 'none';
    }
}

// ── Present Continuous Practice Tasks (template — exercises coming soon) ────────
function renderPCPracticeTasks(container) {
    container.innerHTML =
        '<div class="check-intro" style="text-align:center;padding:40px 20px;">' +
            '<h3 style="margin-bottom:12px;">&#128221; Present Continuous</h3>' +
            '<p style="font-size:1.05em;color:#aaa;margin:0;">Practice Tasks for this tense are coming soon.</p>' +
        '</div>';
}

// ── Past Continuous Practice Tasks ───────────────────────────────────────────

/**
 * Switch between practice sections for Present Perfect
 */
function switchPPSection(num) {
    const sectionTitles = ["Multiple Choice", "Find Errors", "Fill in the Gaps", "Rewrite the Sentences"];
    const dropdown = document.getElementById('pp-practice-dropdown');
    if (dropdown) dropdown.classList.remove('open');

    const sections = ['pp-section-1', 'pp-section-2', 'pp-section-3', 'pp-section-4'];
    sections.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) el.style.display = (idx + 1 === num) ? 'block' : 'none';
    });

    const currentSectionTitle = document.getElementById('pp-current-section');
    if (currentSectionTitle) currentSectionTitle.textContent = `Practice ${num}: ${sectionTitles[num - 1]}`;
}

function renderPresentPerfectPracticeTasks(container) {
    container.innerHTML = `
<div class="practice-tasks-container">
    <div class="pc-practice-header" style="margin-bottom: 25px;">
        <div class="pc-dropdown-container" id="pp-practice-dropdown">
            <div class="pc-dropdown-trigger" onclick="this.parentElement.classList.toggle('open')">
                <span id="pp-current-section">Practice 1: Multiple Choice</span>
                <span class="dropdown-arrow">▼</span>
            </div>
            <div class="pc-dropdown-menu">
                <div class="pc-dropdown-item" onclick="switchPPSection(1)">Practice 1: Multiple Choice</div>
                <div class="pc-dropdown-item" onclick="switchPPSection(2)">Practice 2: Find Errors</div>
                <div class="pc-dropdown-item" onclick="switchPPSection(3)">Practice 3: Fill in the Blanks</div>
                <div class="pc-dropdown-item" onclick="switchPPSection(4)">Practice 4: Rewrite the Sentences</div>
            </div>
        </div>
    </div>

    <div id="pp-section-1">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 1</span>
            <span class="practice-section-title">Multiple Choice</span>
        </div>

        <!-- ✅ Affirmative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Affirmative</span></div>
                <h4>Choose the correct affirmative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="ppa-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'ppa',0,0,2)">A) I have finish my homework.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppa',0,1,2)">B) I has finished my homework.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppa',0,2,2)">C) I have finished my homework.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppa',0,3,2)">D) I have finishing my homework.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="ppa-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'ppa',1,0,1)">A) They has visited Paris twice.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppa',1,1,1)">B) They have visited Paris twice.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppa',1,2,1)">C) They have visiting Paris twice.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppa',1,3,1)">D) They have visit Paris twice.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="ppa-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'ppa',2,0,0)">A) She has seen that movie before.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppa',2,1,0)">B) She has saw that movie before.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppa',2,2,0)">C) She have seen that movie before.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppa',2,3,0)">D) She has seeing that movie before.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">4</div>
                <div class="exercise-options" id="ppa-opts-3">
                    <div class="option" onclick="selectPracticeOption(event,'ppa',3,0,1)">A) We has lived here since 2010.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppa',3,1,1)">B) We have lived here since 2010.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppa',3,2,1)">C) We have living here since 2010.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppa',3,3,1)">D) We have live here since 2010.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">5</div>
                <div class="exercise-options" id="ppa-opts-4">
                    <div class="option" onclick="selectPracticeOption(event,'ppa',4,0,3)">A) He have finished reading the book.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppa',4,1,3)">B) He has finishing reading the book.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppa',4,2,3)">C) He has finish reading the book.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppa',4,3,3)">D) He has finished reading the book.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">6</div>
                <div class="exercise-options" id="ppa-opts-5">
                    <div class="option" onclick="selectPracticeOption(event,'ppa',5,0,2)">A) I has never tried sushi before.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppa',5,1,2)">B) I have never try sushi before.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppa',5,2,2)">C) I have never tried sushi before.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppa',5,3,2)">D) I never have tried sushi before.</div>
                </div>
            </div>
        </div>

        <!-- ❌ Negative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">Negative</span></div>
                <h4>Choose the correct negative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="ppn-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'ppn',0,0,1)">A) She hasn’t buy the tickets yet.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppn',0,1,1)">B) She hasn’t bought the tickets yet.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppn',0,2,1)">C) She didn’t bought the tickets yet.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppn',0,3,1)">D) She not has bought the tickets yet.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="ppn-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'ppn',1,0,0)">A) I haven’t read that book before.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppn',1,1,0)">B) I haven’t readed that book before.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppn',1,2,0)">C) I didn’t read that book before.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppn',1,3,0)">D) I not have read that book before.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="ppn-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'ppn',2,0,1)">A) They hasn’t completed the project yet.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppn',2,1,1)">B) They haven’t completed the project yet.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppn',2,2,1)">C) They didn’t completed the project yet.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppn',2,3,1)">D) They not have completed the project yet.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">4</div>
                <div class="exercise-options" id="ppn-opts-3">
                    <div class="option" onclick="selectPracticeOption(event,'ppn',3,0,1)">A) He hasn’t drove a car before.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppn',3,1,1)">B) He hasn’t driven a car before.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppn',3,2,1)">C) He didn’t driven a car before.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppn',3,3,1)">D) He not has driven a car before.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">5</div>
                <div class="exercise-options" id="ppn-opts-4">
                    <div class="option" onclick="selectPracticeOption(event,'ppn',4,0,3)">A) We haven’t chose a topic yet.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppn',4,1,3)">B) We not have chosen a topic yet.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppn',4,2,3)">C) We didn’t chosen a topic yet.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppn',4,3,3)">D) We haven’t chosen a topic yet.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">6</div>
                <div class="exercise-options" id="ppn-opts-5">
                    <div class="option" onclick="selectPracticeOption(event,'ppn',5,0,2)">A) She didn’t sent the message yet.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppn',5,1,2)">B) She hasn’t send the message yet.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppn',5,2,2)">C) She hasn’t sent the message yet.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppn',5,3,2)">D) She not has sent the message yet.</div>
                </div>
            </div>
        </div>

        <!-- ❓ Interrogative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">Interrogative</span></div>
                <h4>Choose the correct question form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="ppi-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'ppi',0,0,1)">A) Have you ever saw this film?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppi',0,1,1)">B) Have you ever seen this film?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppi',0,2,1)">C) Did you ever seen this film?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppi',0,3,1)">D) Have you ever see this film?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="ppi-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'ppi',1,0,0)">A) Has she finished her homework?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppi',1,1,0)">B) Have she finished her homework?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppi',1,2,0)">C) Did she finished her homework?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppi',1,3,0)">D) Has she finish her homework?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="ppi-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'ppi',2,0,0)">A) Have they visited their grandparents recently?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppi',2,1,0)">B) Has they visited their grandparents recently?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppi',2,2,0)">C) Did they visited their grandparents recently?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppi',2,3,0)">D) Have they visit their grandparents recently?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">4</div>
                <div class="exercise-options" id="ppi-opts-3">
                    <div class="option" onclick="selectPracticeOption(event,'ppi',3,0,2)">A) Have you ever ate sushi?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppi',3,1,2)">B) Did you ever eaten sushi?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppi',3,2,2)">C) Have you ever eaten sushi?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppi',3,3,2)">D) Have you ever eat sushi?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">5</div>
                <div class="exercise-options" id="ppi-opts-4">
                    <div class="option" onclick="selectPracticeOption(event,'ppi',4,0,1)">A) Has he took the test yet?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppi',4,1,1)">B) Has he taken the test yet?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppi',4,2,1)">C) Did he taken the test yet?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppi',4,3,1)">D) Has he take the test yet?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">6</div>
                <div class="exercise-options" id="ppi-opts-5">
                    <div class="option" onclick="selectPracticeOption(event,'ppi',5,0,3)">A) Have we complete the task already?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppi',5,1,3)">B) Has we completed the task already?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppi',5,2,3)">C) Did we completed the task already?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppi',5,3,3)">D) Have we completed the task already?</div>
                </div>
            </div>
        </div>
    </div>

    <div id="pp-section-2" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 2</span>
            <span class="practice-section-title">Find Errors</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Error Correction</span></div>
                <h4>Find the error and type the correct form.</h4>
            </div>
            <div class="fill-exercise">
                <div class="fill-q-num">1</div>
                <div class="fill-dialogue">
                    <div class="fill-line">He <strong style="color:#e04040;text-decoration:underline;">gone</strong> to the gym already.</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pp-p2-1" placeholder="..." data-answer="has gone" onkeydown="if(event.key==='Enter')checkFill('pp-p2-1')"><span class="fill-result" id="pp-p2-1-res"></span></div>
                </div>
            </div>
            <div class="fill-exercise">
                <div class="fill-q-num">2</div>
                <div class="fill-dialogue">
                    <div class="fill-line">She has <strong style="color:#e04040;text-decoration:underline;">eat</strong> dinner just now.</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pp-p2-2" placeholder="..." data-answer="eaten" onkeydown="if(event.key==='Enter')checkFill('pp-p2-2')"><span class="fill-result" id="pp-p2-2-res"></span></div>
                </div>
            </div>
            <div class="fill-exercise">
                <div class="fill-q-num">3</div>
                <div class="fill-dialogue">
                    <div class="fill-line">I have <strong style="color:#e04040;text-decoration:underline;">saw</strong> that movie before.</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pp-p2-3" placeholder="..." data-answer="seen" onkeydown="if(event.key==='Enter')checkFill('pp-p2-3')"><span class="fill-result" id="pp-p2-3-res"></span></div>
                </div>
            </div>
            <div class="fill-exercise">
                <div class="fill-q-num">4</div>
                <div class="fill-dialogue">
                    <div class="fill-line">They <strong style="color:#e04040;text-decoration:underline;">has</strong> finished their homework.</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pp-p2-4" placeholder="..." data-answer="have" onkeydown="if(event.key==='Enter')checkFill('pp-p2-4')"><span class="fill-result" id="pp-p2-4-res"></span></div>
                </div>
            </div>
            <div class="fill-exercise">
                <div class="fill-q-num">5</div>
                <div class="fill-dialogue">
                    <div class="fill-line">He <strong style="color:#e04040;text-decoration:underline;">don’t finished</strong> his work yet.</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pp-p2-5" placeholder="..." data-answer="hasn't finished|has not finished" onkeydown="if(event.key==='Enter')checkFill('pp-p2-5')"><span class="fill-result" id="pp-p2-5-res"></span></div>
                </div>
            </div>
            <div class="fill-exercise">
                <div class="fill-q-num">6</div>
                <div class="fill-dialogue">
                    <div class="fill-line">She <strong style="color:#e04040;text-decoration:underline;">have</strong> seen that film.</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pp-p2-6" placeholder="..." data-answer="has" onkeydown="if(event.key==='Enter')checkFill('pp-p2-6')"><span class="fill-result" id="pp-p2-6-res"></span></div>
                </div>
            </div>
            <div class="fill-exercise">
                <div class="fill-q-num">7</div>
                <div class="fill-dialogue">
                    <div class="fill-line">We have <strong style="color:#e04040;text-decoration:underline;">went</strong> to that place before.</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pp-p2-7" placeholder="..." data-answer="gone" onkeydown="if(event.key==='Enter')checkFill('pp-p2-7')"><span class="fill-result" id="pp-p2-7-res"></span></div>
                </div>
            </div>
            <div class="fill-exercise">
                <div class="fill-q-num">8</div>
                <div class="fill-dialogue">
                    <div class="fill-line">I <strong style="color:#e04040;text-decoration:underline;">hasn’t</strong> done my homework yet.</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pp-p2-8" placeholder="..." data-answer="haven't" onkeydown="if(event.key==='Enter')checkFill('pp-p2-8')"><span class="fill-result" id="pp-p2-8-res"></span></div>
                </div>
            </div>
            <div class="fill-exercise">
                <div class="fill-q-num">9</div>
                <div class="fill-dialogue">
                    <div class="fill-line"><strong style="color:#e04040;text-decoration:underline;">Has</strong> they written the report yet?</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pp-p2-9" placeholder="..." data-answer="have" onkeydown="if(event.key==='Enter')checkFill('pp-p2-9')"><span class="fill-result" id="pp-p2-9-res"></span></div>
                </div>
            </div>
            <div class="fill-exercise">
                <div class="fill-q-num">10</div>
                <div class="fill-dialogue">
                    <div class="fill-line">Has he ever <strong style="color:#e04040;text-decoration:underline;">ate</strong> sushi?</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pp-p2-10" placeholder="..." data-answer="eaten" onkeydown="if(event.key==='Enter')checkFill('pp-p2-10')"><span class="fill-result" id="pp-p2-10-res"></span></div>
                </div>
            </div>
            <div class="fill-exercise">
                <div class="fill-q-num">11</div>
                <div class="fill-dialogue">
                    <div class="fill-line">Have you ever <strong style="color:#e04040;text-decoration:underline;">watch</strong> this movie?</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pp-p2-11" placeholder="..." data-answer="watched" onkeydown="if(event.key==='Enter')checkFill('pp-p2-11')"><span class="fill-result" id="pp-p2-11-res"></span></div>
                </div>
            </div>
            <div class="fill-exercise">
                <div class="fill-q-num">12</div>
                <div class="fill-dialogue">
                    <div class="fill-line">Has she ever <strong style="color:#e04040;text-decoration:underline;">go</strong> abroad?</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pp-p2-12" placeholder="..." data-answer="gone" onkeydown="if(event.key==='Enter')checkFill('pp-p2-12')"><span class="fill-result" id="pp-p2-12-res"></span></div>
                </div>
            </div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;">
                <button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button>
            </div>
        </div>
    </div>

    <div id="pp-section-3" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 3</span>
            <span class="practice-section-title">Fill in the Gaps</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) Affirmative</span></div>
                <h4>Use correct Present Perfect affirmative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="pp-p3a-1a" placeholder="finish" data-answer="have finished" onkeydown="if(event.key==='Enter')checkFill('pp-p3a-1a')"> my homework.<span class="fill-result" id="pp-p3a-1a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Well done! I <input class="fill-input" id="pp-p3a-1b" placeholder="complete" data-answer="have completed" onkeydown="if(event.key==='Enter')checkFill('pp-p3a-1b')"> my project too.<span class="fill-result" id="pp-p3a-1b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="pp-p3a-2a" placeholder="see" data-answer="has seen" onkeydown="if(event.key==='Enter')checkFill('pp-p3a-2a')"> that movie already.<span class="fill-result" id="pp-p3a-2a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Really? I <input class="fill-input" id="pp-p3a-2b" placeholder="watch" data-answer="have watched" onkeydown="if(event.key==='Enter')checkFill('pp-p3a-2b')"> it last week.<span class="fill-result" id="pp-p3a-2b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="pp-p3a-3a" placeholder="visit" data-answer="have visited" onkeydown="if(event.key==='Enter')checkFill('pp-p3a-3a')"> the museum twice.<span class="fill-result" id="pp-p3a-3a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> That’s nice! We <input class="fill-input" id="pp-p3a-3b" placeholder="go" data-answer="have gone" onkeydown="if(event.key==='Enter')checkFill('pp-p3a-3b')"> there three times.<span class="fill-result" id="pp-p3a-3b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> He <input class="fill-input" id="pp-p3a-4a" placeholder="read" data-answer="has read" onkeydown="if(event.key==='Enter')checkFill('pp-p3a-4a')"> five books this month.<span class="fill-result" id="pp-p3a-4a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Amazing! I <input class="fill-input" id="pp-p3a-4b" placeholder="finish" data-answer="have finished" onkeydown="if(event.key==='Enter')checkFill('pp-p3a-4b')"> four books so far.<span class="fill-result" id="pp-p3a-4b-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>

        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) Negative</span></div>
                <h4>Use correct Present Perfect negative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> We <input class="fill-input" id="pp-p3b-1a" placeholder="not eat" data-answer="have not eaten|haven't eaten" onkeydown="if(event.key==='Enter')checkFill('pp-p3b-1a')"> at that restaurant before.<span class="fill-result" id="pp-p3b-1a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> True! I <input class="fill-input" id="pp-p3b-1b" placeholder="not try" data-answer="have not tried|haven't tried" onkeydown="if(event.key==='Enter')checkFill('pp-p3b-1b')"> their special pizza either.<span class="fill-result" id="pp-p3b-1b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="pp-p3b-2a" placeholder="not see" data-answer="has not seen|hasn't seen" onkeydown="if(event.key==='Enter')checkFill('pp-p3b-2a')"> that movie yet.<span class="fill-result" id="pp-p3b-2a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Really? I <input class="fill-input" id="pp-p3b-2b" placeholder="not watch" data-answer="have not watched|haven't watched" onkeydown="if(event.key==='Enter')checkFill('pp-p3b-2b')"> it either.<span class="fill-result" id="pp-p3b-2b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="pp-p3b-3a" placeholder="not visit" data-answer="have not visited|haven't visited" onkeydown="if(event.key==='Enter')checkFill('pp-p3b-3a')"> the museum this year.<span class="fill-result" id="pp-p3b-3a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Me neither! We <input class="fill-input" id="pp-p3b-3b" placeholder="not go" data-answer="have not gone|haven't gone" onkeydown="if(event.key==='Enter')checkFill('pp-p3b-3b')"> there yet.<span class="fill-result" id="pp-p3b-3b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> You <input class="fill-input" id="pp-p3b-4a" placeholder="not learn" data-answer="have not learnt|have not learned|haven't learnt|haven't learned" onkeydown="if(event.key==='Enter')checkFill('pp-p3b-4a')"> a lot this year.<span class="fill-result" id="pp-p3b-4a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> I know. I <input class="fill-input" id="pp-p3b-4b" placeholder="not improve" data-answer="have not improved|haven't improved" onkeydown="if(event.key==='Enter')checkFill('pp-p3b-4b')"> my English much.<span class="fill-result" id="pp-p3b-4b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">5</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="pp-p3b-5a" placeholder="Has she finished" data-answer="Has she finished" onkeydown="if(event.key==='Enter')checkFill('pp-p3b-5a')"> her homework yet?<span class="fill-result" id="pp-p3b-5a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> No, she <input class="fill-input" id="pp-p3b-5b" placeholder="not complete" data-answer="has not completed|hasn't completed" onkeydown="if(event.key==='Enter')checkFill('pp-p3b-5b')"> it yet.<span class="fill-result" id="pp-p3b-5b-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>

        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">c) Question</span></div>
                <h4>Use correct Present Perfect question forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" style="width:80px;" id="pp-p3c-1a" placeholder="Have/Has" data-answer="Have" onkeydown="if(event.key==='Enter')checkFill('pp-p3c-1a')"> they <input class="fill-input" id="pp-p3c-1b" placeholder="see" data-answer="seen" onkeydown="if(event.key==='Enter')checkFill('pp-p3c-1b')"> this teacher before?<span class="fill-result" id="pp-p3c-1a-res"></span><span class="fill-result" id="pp-p3c-1b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes! They <input class="fill-input" id="pp-p3c-1c" placeholder="meet" data-answer="have met" onkeydown="if(event.key==='Enter')checkFill('pp-p3c-1c')"> him last year.<span class="fill-result" id="pp-p3c-1c-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" style="width:80px;" id="pp-p3c-2a" placeholder="Have/Has" data-answer="Has" onkeydown="if(event.key==='Enter')checkFill('pp-p3c-2a')"> he <input class="fill-input" id="pp-p3c-2b" placeholder="write" data-answer="written" onkeydown="if(event.key==='Enter')checkFill('pp-p3c-2b')"> the report already?<span class="fill-result" id="pp-p3c-2a-res"></span><span class="fill-result" id="pp-p3c-2b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> No, he <input class="fill-input" id="pp-p3c-2c" placeholder="not start" data-answer="has not started|hasn't started" onkeydown="if(event.key==='Enter')checkFill('pp-p3c-2c')"> it yet.<span class="fill-result" id="pp-p3c-2c-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" style="width:80px;" id="pp-p3c-3a" placeholder="Have/Has" data-answer="Have" onkeydown="if(event.key==='Enter')checkFill('pp-p3c-3a')"> you ever <input class="fill-input" id="pp-p3c-3b" placeholder="try" data-answer="tried" onkeydown="if(event.key==='Enter')checkFill('pp-p3c-3b')"> Chinese food?<span class="fill-result" id="pp-p3c-3a-res"></span><span class="fill-result" id="pp-p3c-3b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes! I <input class="fill-input" id="pp-p3c-3c" placeholder="eat" data-answer="have eaten" onkeydown="if(event.key==='Enter')checkFill('pp-p3c-3c')"> it many times.<span class="fill-result" id="pp-p3c-3c-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" style="width:80px;" id="pp-p3c-4a" placeholder="Have/Has" data-answer="Has" onkeydown="if(event.key==='Enter')checkFill('pp-p3c-4a')"> he ever <input class="fill-input" id="pp-p3c-4b" placeholder="break" data-answer="broken" onkeydown="if(event.key==='Enter')checkFill('pp-p3c-4b')"> his phone?<span class="fill-result" id="pp-p3c-4a-res"></span><span class="fill-result" id="pp-p3c-4b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, he <input class="fill-input" id="pp-p3c-4c" placeholder="damage" data-answer="has damaged" onkeydown="if(event.key==='Enter')checkFill('pp-p3c-4c')"> it twice.<span class="fill-result" id="pp-p3c-4c-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div id="pp-section-4" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 4</span>
            <span class="practice-section-title">Rewrite the Sentences</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) To Affirmative</span></div>
                <h4>Rewrite the sentence in affirmative form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She hasn’t finished her homework yet.</div>
                <div class="fill-line"><input class="fill-input" id="pp-p4a-1" placeholder="rewrite..." data-answer="she has finished her homework." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pp-p4a-1')"><span class="fill-result" id="pp-p4a-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">They haven’t visited their relatives this month.</div>
                <div class="fill-line"><input class="fill-input" id="pp-p4a-2" placeholder="rewrite..." data-answer="they have visited their relatives this month." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pp-p4a-2')"><span class="fill-result" id="pp-p4a-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">He hasn’t called his friend today.</div>
                <div class="fill-line"><input class="fill-input" id="pp-p4a-3" placeholder="rewrite..." data-answer="he has called his friend today." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pp-p4a-3')"><span class="fill-result" id="pp-p4a-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She hasn’t been to school this week.</div>
                <div class="fill-line"><input class="fill-input" id="pp-p4a-4" placeholder="rewrite..." data-answer="she has been to school this week." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pp-p4a-4')"><span class="fill-result" id="pp-p4a-4-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>

        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) To Negative</span></div>
                <h4>Rewrite the sentence in negative form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She has cleaned her room already.</div>
                <div class="fill-line"><input class="fill-input" id="pp-p4b-1" placeholder="rewrite..." data-answer="she hasn't cleaned her room yet.|she has not cleaned her room yet." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pp-p4b-1')"><span class="fill-result" id="pp-p4b-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">They have watched that movie before.</div>
                <div class="fill-line"><input class="fill-input" id="pp-p4b-2" placeholder="rewrite..." data-answer="they haven't watched that movie before.|they have not watched that movie before." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pp-p4b-2')"><span class="fill-result" id="pp-p4b-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">They have felt very happy recently.</div>
                <div class="fill-line"><input class="fill-input" id="pp-p4b-3" placeholder="rewrite..." data-answer="they haven't felt very happy recently.|they have not felt very happy recently." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pp-p4b-3')"><span class="fill-result" id="pp-p4b-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">I have been very busy this week.</div>
                <div class="fill-line"><input class="fill-input" id="pp-p4b-4" placeholder="rewrite..." data-answer="i haven't been very busy this week.|i have not been very busy this week." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pp-p4b-4')"><span class="fill-result" id="pp-p4b-4-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>

        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">c) To Question</span></div>
                <h4>Rewrite the sentence in question form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">I have opened the window.</div>
                <div class="fill-line"><input class="fill-input" id="pp-p4c-1" placeholder="rewrite..." data-answer="have i opened the window?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pp-p4c-1')"><span class="fill-result" id="pp-p4c-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">He has finished his project.</div>
                <div class="fill-line"><input class="fill-input" id="pp-p4c-2" placeholder="rewrite..." data-answer="has he finished his project?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pp-p4c-2')"><span class="fill-result" id="pp-p4c-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">We have visited that museum.</div>
                <div class="fill-line"><input class="fill-input" id="pp-p4c-3" placeholder="rewrite..." data-answer="have we visited that museum?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pp-p4c-3')"><span class="fill-result" id="pp-p4c-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">We have been at home all day.</div>
                <div class="fill-line"><input class="fill-input" id="pp-p4c-4" placeholder="rewrite..." data-answer="have we been at home all day?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pp-p4c-4')"><span class="fill-result" id="pp-p4c-4-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <!-- ✅ GET RESULT BUTTON -->
    <div class="get-result-bar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button class="get-result-btn" onclick="getResult()">
            📊 Get Result
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(70)" style="background:#22c55e;color:#ffffff;border:none;">
            ✅ Done
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(67)" style="background:#ef4444;color:#ffffff;border:none;">
            ⚠️ Retake
        </button>
    </div>
</div>
`;
}

/**
 * Switch between practice sections for Future Simple
 */
function switchFSSection(num) {
    const sectionTitles = ["Multiple Choice", "Find Errors", "Fill in the Gaps", "Rewrite the Sentences"];
    const dropdown = document.getElementById('fs-practice-dropdown');
    if (dropdown) dropdown.classList.remove('open');

    const sections = ['fs-section-1', 'fs-section-2', 'fs-section-3', 'fs-section-4'];
    sections.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) el.style.display = (idx + 1 === num) ? 'block' : 'none';
    });

    const currentSectionTitle = document.getElementById('fs-current-section');
    if (currentSectionTitle) currentSectionTitle.textContent = `Practice ${num}: ${sectionTitles[num - 1]}`;
}

function renderFutureSimplePracticeTasks(container) {
    container.innerHTML = `
<div class="practice-tasks-container">
    <div class="pc-practice-header" style="margin-bottom: 25px;">
        <div class="pc-dropdown-container" id="fs-practice-dropdown">
            <div class="pc-dropdown-trigger" onclick="this.parentElement.classList.toggle('open')">
                <span id="fs-current-section">Practice 1: Multiple Choice</span>
                <span class="dropdown-arrow">▼</span>
            </div>
            <div class="pc-dropdown-menu">
                <div class="pc-dropdown-item" onclick="switchFSSection(1)">Practice 1: Multiple Choice</div>
                <div class="pc-dropdown-item" onclick="switchFSSection(2)">Practice 2: Find Errors</div>
                <div class="pc-dropdown-item" onclick="switchFSSection(3)">Practice 3: Fill in the Blanks</div>
                <div class="pc-dropdown-item" onclick="switchFSSection(4)">Practice 4: Rewrite the Sentences</div>
            </div>
        </div>
    </div>
    
    <div id="fs-section-1">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 1</span>
            <span class="practice-section-title">Multiple Choice</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Affirmative</span></div>
                <h4>Choose the correct affirmative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="fsa-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'fsa',0,2,2)">A) I will goes to the meeting tomorrow.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',0,2,2)">B) I will going to the meeting tomorrow.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',0,2,2)">C) I will go to the meeting tomorrow.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',0,3,2)">D) I will went to the meeting tomorrow.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="fsa-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'fsa',1,0,0)">A) They will visit their grandparents next week.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',1,1,0)">B) They will visiting their grandparents next week.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',1,2,0)">C) They will visits their grandparents next week.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',1,3,0)">D) They will visited their grandparents next week.</div>
                </div>
            </div>
        </div>
    </div>

    <div id="fs-section-2" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 2</span>
            <span class="practice-section-title">Find Errors</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Error Correction</span></div>
                <h4>Type the correct word.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line">He will <strong style="color:#e04040;">goes</strong> to the gym tomorrow.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fs-p2e1" data-answer="go" onkeydown="if(event.key==='Enter')checkFill('fs-p2e1')"><span class="fill-result" id="fs-p2e1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line">She will <strong style="color:#e04040;">buys</strong> a new laptop.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fs-p2e2" data-answer="buy" onkeydown="if(event.key==='Enter')checkFill('fs-p2e2')"><span class="fill-result" id="fs-p2e2-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:10px 24px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div id="fs-section-3" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 3</span>
            <span class="practice-section-title">Fill in the Blanks</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) Affirmative</span></div>
                <h4>Fill in the correct forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="fs-p3a-1a" data-answer="will call" onkeydown="if(event.key==='Enter')checkFill('fs-p3a-1a')"> you later.</div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Great! I <input class="fill-input" id="fs-p3a-1b" data-answer="will wait" onkeydown="if(event.key==='Enter')checkFill('fs-p3a-1b')"> for you.</div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:10px 24px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div id="fs-section-4" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 4</span>
            <span class="practice-section-title">Rewrite the Sentences</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) To Affirmative</span></div>
                <h4>Rewrite the sentence.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="font-style:italic;color:#666;">She won’t attend the meeting tomorrow.</div>
                <div class="fill-line"><input class="fill-input" id="fs-p4a-1" style="width:100%;" data-answer="she will attend the meeting tomorrow" onkeydown="if(event.key==='Enter')checkFill('fs-p4a-1')"><span class="fill-result" id="fs-p4a-1-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:10px 24px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div class="get-result-bar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button class="get-result-btn" onclick="getResult()">
            📊 Get Result
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(70)" style="background:#22c55e;color:#ffffff;border:none;">
            ✅ Done
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(67)" style="background:#ef4444;color:#ffffff;border:none;">
            ⚠️ Retake
        </button>
    </div>
</div>
`;
}

function renderPastContinuousPracticeTasks(container) {
    container.innerHTML = `
<div class="practice-tasks-container">
    <div class="pc-practice-header" style="margin-bottom: 25px;">
        <div class="pc-dropdown-container" id="pcont-practice-dropdown">
            <div class="pc-dropdown-trigger" onclick="this.parentElement.classList.toggle('open')">
                <span id="pcont-current-section">Practice 1: Multiple Choice</span>
                <span class="dropdown-arrow">▼</span>
            </div>
            <div class="pc-dropdown-menu">
                <div class="pc-dropdown-item" onclick="switchPContSection(1)">Practice 1: Multiple Choice</div>
                <div class="pc-dropdown-item" onclick="switchPContSection(2)">Practice 2: Find Errors</div>
                <div class="pc-dropdown-item" onclick="switchPContSection(3)">Practice 3: Fill in the Blanks</div>
                <div class="pc-dropdown-item" onclick="switchPContSection(4)">Practice 4: Rewrite the Sentences</div>
            </div>
        </div>
    </div>

    <div id="pcont-section-1">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 1</span>
            <span class="practice-section-title">Multiple Choice</span>
        </div>

        <!-- Affirmative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Affirmative</span></div>
                <h4>Choose the correct affirmative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="pca-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'pca',0,0,2)">A) I was study for my exam last night.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pca',0,1,2)">B) I was studied for my exam last night.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pca',0,2,2)">C) I was studying for my exam last night.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pca',0,3,2)">D) I studying for my exam last night.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="pca-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'pca',1,0,3)">A) They were play football at 6 p.m.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pca',1,1,3)">B) They were played football at 6 p.m.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pca',1,2,3)">C) They was playing football at 6 p.m.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pca',1,3,3)">D) They were playing football at 6 p.m.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="pca-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'pca',2,0,1)">A) She was cook dinner when I arrived.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pca',2,1,1)">B) She was cooking dinner when I arrived.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pca',2,2,1)">C) She were cooking dinner when I arrived.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pca',2,3,1)">D) She cooking dinner when I arrived.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">4</div>
                <div class="exercise-options" id="pca-opts-3">
                    <div class="option" onclick="selectPracticeOption(event,'pca',3,0,0)">A) We were watching a movie at that time.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pca',3,1,0)">B) We was watching a movie at that time.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pca',3,2,0)">C) We were watch a movie at that time.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pca',3,3,0)">D) We were watched a movie at that time.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">5</div>
                <div class="exercise-options" id="pca-opts-4">
                    <div class="option" onclick="selectPracticeOption(event,'pca',4,0,0)">A) He was doing his homework in the evening.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pca',4,1,0)">B) He were doing his homework in the evening.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pca',4,2,0)">C) He was do his homework in the evening.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pca',4,3,0)">D) He was did his homework in the evening.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">6</div>
                <div class="exercise-options" id="pca-opts-5">
                    <div class="option" onclick="selectPracticeOption(event,'pca',5,0,3)">A) I was reads a book yesterday afternoon.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pca',5,1,3)">B) I were reading a book yesterday afternoon.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pca',5,2,3)">C) I was read a book yesterday afternoon.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pca',5,3,3)">D) I was reading a book yesterday afternoon.</div>
                </div>
            </div>
        </div>

        <!-- Negative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">Negative</span></div>
                <h4>Choose the correct negative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="pcn-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'pcn',0,0,0)">A) She wasn’t going to school yesterday.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pcn',0,1,0)">B) She wasn’t go to school yesterday.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pcn',0,2,0)">C) She not was going to school yesterday.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pcn',0,3,0)">D) She wasn’t went to school yesterday.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="pcn-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'pcn',1,0,0)">A) I wasn’t watching TV at that moment.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pcn',1,1,0)">B) I wasn’t watch TV at that moment.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pcn',1,2,0)">C) I not was watching TV at that moment.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pcn',1,3,0)">D) I wasn’t watched TV at that moment.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="pcn-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'pcn',2,0,2)">A) They weren’t play outside.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pcn',2,1,2)">B) They wasn’t playing outside.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pcn',2,2,2)">C) They weren’t playing outside.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pcn',2,3,2)">D) They not were playing outside.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">4</div>
                <div class="exercise-options" id="pcn-opts-3">
                    <div class="option" onclick="selectPracticeOption(event,'pcn',3,0,1)">A) He wasn’t use his phone.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pcn',3,1,1)">B) He wasn’t using his phone.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pcn',3,2,1)">C) He not was using his phone.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pcn',3,3,1)">D) He wasn’t used his phone.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">5</div>
                <div class="exercise-options" id="pcn-opts-4">
                    <div class="option" onclick="selectPracticeOption(event,'pcn',4,0,3)">A) We not were studying in the library.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pcn',4,1,3)">B) We wasn’t studying in the library.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pcn',4,2,3)">C) We weren’t study in the library.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pcn',4,3,3)">D) We weren’t studying in the library.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">6</div>
                <div class="exercise-options" id="pcn-opts-5">
                    <div class="option" onclick="selectPracticeOption(event,'pcn',5,0,0)">A) She wasn’t listening to music.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pcn',5,1,0)">B) She wasn’t listen to music.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pcn',5,2,0)">C) She not was listening to music.</div>
                    <div class="option" onclick="selectPracticeOption(event,'pcn',5,3,0)">D) She wasn’t listened to music.</div>
                </div>
            </div>
        </div>

        <!-- Interrogative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">Interrogative</span></div>
                <h4>Choose the correct question form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="pci-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'pci',0,0,2)">A) Was you reading a book?</div>
                    <div class="option" onclick="selectPracticeOption(event,'pci',0,1,2)">B) Did you reading a book?</div>
                    <div class="option" onclick="selectPracticeOption(event,'pci',0,2,2)">C) Were you reading a book?</div>
                    <div class="option" onclick="selectPracticeOption(event,'pci',0,3,2)">D) Were you read a book?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="pci-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'pci',1,0,0)">A) Was she cooking dinner?</div>
                    <div class="option" onclick="selectPracticeOption(event,'pci',1,1,0)">B) Did she cooking dinner?</div>
                    <div class="option" onclick="selectPracticeOption(event,'pci',1,2,0)">C) Was she cook dinner?</div>
                    <div class="option" onclick="selectPracticeOption(event,'pci',1,3,0)">D) Was she cooked dinner?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="pci-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'pci',2,0,2)">A) Were they play football?</div>
                    <div class="option" onclick="selectPracticeOption(event,'pci',2,1,2)">B) Did they playing football?</div>
                    <div class="option" onclick="selectPracticeOption(event,'pci',2,2,2)">C) Were they playing football?</div>
                    <div class="option" onclick="selectPracticeOption(event,'pci',2,3,2)">D) Were they played football?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">4</div>
                <div class="exercise-options" id="pci-opts-3">
                    <div class="option" onclick="selectPracticeOption(event,'pci',3,0,0)">A) Was he doing his homework?</div>
                    <div class="option" onclick="selectPracticeOption(event,'pci',3,1,0)">B) Did he doing his homework?</div>
                    <div class="option" onclick="selectPracticeOption(event,'pci',3,2,0)">C) Was he do his homework?</div>
                    <div class="option" onclick="selectPracticeOption(event,'pci',3,3,0)">D) Was he did his homework?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">5</div>
                <div class="exercise-options" id="pci-opts-4">
                    <div class="option" onclick="selectPracticeOption(event,'pci',4,0,1)">A) Did we studying together?</div>
                    <div class="option" onclick="selectPracticeOption(event,'pci',4,1,1)">B) Were we studying together?</div>
                    <div class="option" onclick="selectPracticeOption(event,'pci',4,2,1)">C) Were we study together?</div>
                    <div class="option" onclick="selectPracticeOption(event,'pci',4,3,1)">D) Were we studied together?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">6</div>
                <div class="exercise-options" id="pci-opts-5">
                    <div class="option" onclick="selectPracticeOption(event,'pci',5,0,3)">A) Was she used her laptop?</div>
                    <div class="option" onclick="selectPracticeOption(event,'pci',5,1,3)">B) Did she using her laptop?</div>
                    <div class="option" onclick="selectPracticeOption(event,'pci',5,2,3)">C) Was she use her laptop?</div>
                    <div class="option" onclick="selectPracticeOption(event,'pci',5,3,3)">D) Was she using her laptop?</div>
                </div>
            </div>
        </div>
    </div>

    <div id="pcont-section-2" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 2</span>
            <span class="practice-section-title">Find Errors</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Error Correction</span></div>
                <h4>Find the error and type the correct word.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line">He was <strong style="color:#e04040;text-decoration:underline;">play</strong> football at 5 p.m.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pcont-p2-1" placeholder="..." data-answer="playing" onkeydown="if(event.key==='Enter')checkFill('pcont-p2-1')"><span class="fill-result" id="pcont-p2-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line">She <strong style="color:#e04040;text-decoration:underline;">were</strong> cooking dinner.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pcont-p2-2" placeholder="..." data-answer="was" onkeydown="if(event.key==='Enter')checkFill('pcont-p2-2')"><span class="fill-result" id="pcont-p2-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line">I was <strong style="color:#e04040;text-decoration:underline;">watch</strong> TV last night.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pcont-p2-3" placeholder="..." data-answer="watching" onkeydown="if(event.key==='Enter')checkFill('pcont-p2-3')"><span class="fill-result" id="pcont-p2-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line">They <strong style="color:#e04040;text-decoration:underline;">was</strong> studying for the test.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pcont-p2-4" placeholder="..." data-answer="were" onkeydown="if(event.key==='Enter')checkFill('pcont-p2-4')"><span class="fill-result" id="pcont-p2-4-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">5</div><div class="fill-dialogue">
                <div class="fill-line">He <strong style="color:#e04040;text-decoration:underline;">not was</strong> sleeping.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pcont-p2-5" placeholder="..." data-answer="was not" onkeydown="if(event.key==='Enter')checkFill('pcont-p2-5')"><span class="fill-result" id="pcont-p2-5-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">6</div><div class="fill-dialogue">
                <div class="fill-line">She wasn’t <strong style="color:#e04040;text-decoration:underline;">cook</strong> dinner.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pcont-p2-6" placeholder="..." data-answer="cooking" onkeydown="if(event.key==='Enter')checkFill('pcont-p2-6')"><span class="fill-result" id="pcont-p2-6-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">7</div><div class="fill-dialogue">
                <div class="fill-line">We were not <strong style="color:#e04040;text-decoration:underline;">study</strong> in the classroom.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pcont-p2-7" placeholder="..." data-answer="studying" onkeydown="if(event.key==='Enter')checkFill('pcont-p2-7')"><span class="fill-result" id="pcont-p2-7-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">8</div><div class="fill-dialogue">
                <div class="fill-line">I wasn’t <strong style="color:#e04040;text-decoration:underline;">went</strong> to school.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pcont-p2-8" placeholder="..." data-answer="going" onkeydown="if(event.key==='Enter')checkFill('pcont-p2-8')"><span class="fill-result" id="pcont-p2-8-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">9</div><div class="fill-dialogue">
                <div class="fill-line">Was he <strong style="color:#e04040;text-decoration:underline;">go</strong> to work?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pcont-p2-9" placeholder="..." data-answer="going" onkeydown="if(event.key==='Enter')checkFill('pcont-p2-9')"><span class="fill-result" id="pcont-p2-9-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">10</div><div class="fill-dialogue">
                <div class="fill-line">Were they <strong style="color:#e04040;text-decoration:underline;">play</strong> outside?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pcont-p2-10" placeholder="..." data-answer="playing" onkeydown="if(event.key==='Enter')checkFill('pcont-p2-10')"><span class="fill-result" id="pcont-p2-10-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">11</div><div class="fill-dialogue">
                <div class="fill-line"><strong style="color:#e04040;text-decoration:underline;">Was</strong> you reading a book?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pcont-p2-11" placeholder="..." data-answer="were" onkeydown="if(event.key==='Enter')checkFill('pcont-p2-11')"><span class="fill-result" id="pcont-p2-11-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">12</div><div class="fill-dialogue">
                <div class="fill-line">Was she <strong style="color:#e04040;text-decoration:underline;">write</strong> a message?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="pcont-p2-12" placeholder="..." data-answer="writing" onkeydown="if(event.key==='Enter')checkFill('pcont-p2-12')"><span class="fill-result" id="pcont-p2-12-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>
    </div>

    <div id="pcont-section-3" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 3</span>
            <span class="practice-section-title">Fill in the Blanks</span>
        </div>

        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) Affirmative</span></div>
                <h4>Use correct Past Continuous affirmative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="pcont-p3a-1a" placeholder="do" data-answer="was doing" onkeydown="if(event.key==='Enter')checkFill('pcont-p3a-1a')"> my homework at 7 p.m.<span class="fill-result" id="pcont-p3a-1a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Great! I <input class="fill-input" id="pcont-p3a-1b" placeholder="study" data-answer="was studying" onkeydown="if(event.key==='Enter')checkFill('pcont-p3a-1b')"> at that time too.<span class="fill-result" id="pcont-p3a-1b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="pcont-p3a-2a" placeholder="clean" data-answer="was cleaning" onkeydown="if(event.key==='Enter')checkFill('pcont-p3a-2a')"> the house yesterday afternoon.<span class="fill-result" id="pcont-p3a-2a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Nice! I <input class="fill-input" id="pcont-p3a-2b" placeholder="help" data-answer="was helping" onkeydown="if(event.key==='Enter')checkFill('pcont-p3a-2b')"> my mother.<span class="fill-result" id="pcont-p3a-2b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="pcont-p3a-3a" placeholder="play" data-answer="were playing" onkeydown="if(event.key==='Enter')checkFill('pcont-p3a-3a')"> basketball in the evening.<span class="fill-result" id="pcont-p3a-3a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> I know. We <input class="fill-input" id="pcont-p3a-3b" placeholder="watch" data-answer="were watching" onkeydown="if(event.key==='Enter')checkFill('pcont-p3a-3b')"> them.<span class="fill-result" id="pcont-p3a-3b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> He <input class="fill-input" id="pcont-p3a-4a" placeholder="work" data-answer="was working" onkeydown="if(event.key==='Enter')checkFill('pcont-p3a-4a')"> on his project last night.<span class="fill-result" id="pcont-p3a-4a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Good! I <input class="fill-input" id="pcont-p3a-4b" placeholder="prepare" data-answer="was preparing" onkeydown="if(event.key==='Enter')checkFill('pcont-p3a-4b')"> for the test.<span class="fill-result" id="pcont-p3a-4b-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>

        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) Negative</span></div>
                <h4>Use correct Past Continuous negative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="pcont-p3b-1a" placeholder="not sleep" data-answer="was not sleeping|wasn't sleeping" onkeydown="if(event.key==='Enter')checkFill('pcont-p3b-1a')"> at midnight.<span class="fill-result" id="pcont-p3b-1a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Me too! I <input class="fill-input" id="pcont-p3b-1b" placeholder="not rest" data-answer="was not resting|wasn't resting" onkeydown="if(event.key==='Enter')checkFill('pcont-p3b-1b')"> at that time.<span class="fill-result" id="pcont-p3b-1b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="pcont-p3b-2a" placeholder="not study" data-answer="was not studying|wasn't studying" onkeydown="if(event.key==='Enter')checkFill('pcont-p3b-2a')"> yesterday evening.<span class="fill-result" id="pcont-p3b-2a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Right! She <input class="fill-input" id="pcont-p3b-2b" placeholder="not read" data-answer="was not reading|wasn't reading" onkeydown="if(event.key==='Enter')checkFill('pcont-p3b-2b')"> anything.<span class="fill-result" id="pcont-p3b-2b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="pcont-p3b-3a" placeholder="not play" data-answer="were not playing|weren't playing" onkeydown="if(event.key==='Enter')checkFill('pcont-p3b-3a')"> outside.<span class="fill-result" id="pcont-p3b-3a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, they <input class="fill-input" id="pcont-p3b-3b" placeholder="not stay" data-answer="were not staying|weren't staying" onkeydown="if(event.key==='Enter')checkFill('pcont-p3b-3b')"> at home.<span class="fill-result" id="pcont-p3b-3b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> He <input class="fill-input" id="pcont-p3b-4a" placeholder="not listen" data-answer="was not listening|wasn't listening" onkeydown="if(event.key==='Enter')checkFill('pcont-p3b-4a')"> to the teacher.<span class="fill-result" id="pcont-p3b-4a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> I noticed. He <input class="fill-input" id="pcont-p3b-4b" placeholder="not pay" data-answer="was not paying|wasn't paying" onkeydown="if(event.key==='Enter')checkFill('pcont-p3b-4b')"> attention.<span class="fill-result" id="pcont-p3b-4b-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>

        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">c) Question</span></div>
                <h4>Use correct Past Continuous question forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" style="width:80px;" id="pcont-p3c-1a" placeholder="Was/Were" data-answer="Were" onkeydown="if(event.key==='Enter')checkFill('pcont-p3c-1a')"> you <input class="fill-input" id="pcont-p3c-1b" placeholder="study" data-answer="studying" onkeydown="if(event.key==='Enter')checkFill('pcont-p3c-1b')"> at 8 p.m.?<span class="fill-result" id="pcont-p3c-1a-res"></span><span class="fill-result" id="pcont-p3c-1b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, I was.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" style="width:80px;" id="pcont-p3c-2a" placeholder="Was/Were" data-answer="Was" onkeydown="if(event.key==='Enter')checkFill('pcont-p3c-2a')"> she <input class="fill-input" id="pcont-p3c-2b" placeholder="cook" data-answer="cooking" onkeydown="if(event.key==='Enter')checkFill('pcont-p3c-2b')"> dinner?<span class="fill-result" id="pcont-p3c-2a-res"></span><span class="fill-result" id="pcont-p3c-2b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> No, she wasn’t.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" style="width:80px;" id="pcont-p3c-3a" placeholder="Was/Were" data-answer="Were" onkeydown="if(event.key==='Enter')checkFill('pcont-p3c-3a')"> they <input class="fill-input" id="pcont-p3c-3b" placeholder="watch" data-answer="watching" onkeydown="if(event.key==='Enter')checkFill('pcont-p3c-3b')"> TV?<span class="fill-result" id="pcont-p3c-3a-res"></span><span class="fill-result" id="pcont-p3c-3b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, they were.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" style="width:80px;" id="pcont-p3c-4a" placeholder="Was/Were" data-answer="Was" onkeydown="if(event.key==='Enter')checkFill('pcont-p3c-4a')"> he <input class="fill-input" id="pcont-p3c-4b" placeholder="work" data-answer="working" onkeydown="if(event.key==='Enter')checkFill('pcont-p3c-4b')"> late?<span class="fill-result" id="pcont-p3c-4a-res"></span><span class="fill-result" id="pcont-p3c-4b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> No, he wasn’t.</div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div id="pcont-section-4" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 4</span>
            <span class="practice-section-title">Rewrite the Sentences</span>
        </div>

        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) To Affirmative</span></div>
                <h4>Rewrite the sentence in affirmative form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She wasn’t watching TV.</div>
                <div class="fill-line"><input class="fill-input" id="pcont-p4a-1" placeholder="rewrite..." data-answer="she was watching tv" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pcont-p4a-1')"><span class="fill-result" id="pcont-p4a-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">They weren’t playing outside.</div>
                <div class="fill-line"><input class="fill-input" id="pcont-p4a-2" placeholder="rewrite..." data-answer="they were playing outside" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pcont-p4a-2')"><span class="fill-result" id="pcont-p4a-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">He wasn’t studying for the test.</div>
                <div class="fill-line"><input class="fill-input" id="pcont-p4a-3" placeholder="rewrite..." data-answer="he was studying for the test" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pcont-p4a-3')"><span class="fill-result" id="pcont-p4a-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">We weren’t talking in class.</div>
                <div class="fill-line"><input class="fill-input" id="pcont-p4a-4" placeholder="rewrite..." data-answer="we were talking in class" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pcont-p4a-4')"><span class="fill-result" id="pcont-p4a-4-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>

        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) To Negative</span></div>
                <h4>Rewrite the sentence in negative form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She was reading a book.</div>
                <div class="fill-line"><input class="fill-input" id="pcont-p4b-1" placeholder="rewrite..." data-answer="she wasn't reading a book|she was not reading a book" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pcont-p4b-1')"><span class="fill-result" id="pcont-p4b-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">They were playing football.</div>
                <div class="fill-line"><input class="fill-input" id="pcont-p4b-2" placeholder="rewrite..." data-answer="they weren't playing football|they were not playing football" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pcont-p4b-2')"><span class="fill-result" id="pcont-p4b-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">He was writing a message.</div>
                <div class="fill-line"><input class="fill-input" id="pcont-p4b-3" placeholder="rewrite..." data-answer="he wasn't writing a message|he was not writing a message" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pcont-p4b-3')"><span class="fill-result" id="pcont-p4b-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">We were listening to music.</div>
                <div class="fill-line"><input class="fill-input" id="pcont-p4b-4" placeholder="rewrite..." data-answer="we weren't listening to music|we were not listening to music" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pcont-p4b-4')"><span class="fill-result" id="pcont-p4b-4-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>

        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">c) To Question</span></div>
                <h4>Rewrite the sentence in question form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">I was doing my homework.</div>
                <div class="fill-line"><input class="fill-input" id="pcont-p4c-1" placeholder="rewrite..." data-answer="was i doing my homework?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pcont-p4c-1')"><span class="fill-result" id="pcont-p4c-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">He was working late.</div>
                <div class="fill-line"><input class="fill-input" id="pcont-p4c-2" placeholder="rewrite..." data-answer="was he working late?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pcont-p4c-2')"><span class="fill-result" id="pcont-p4c-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">We were studying together.</div>
                <div class="fill-line"><input class="fill-input" id="pcont-p4c-3" placeholder="rewrite..." data-answer="were we studying together?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pcont-p4c-3')"><span class="fill-result" id="pcont-p4c-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She was cooking dinner.</div>
                <div class="fill-line"><input class="fill-input" id="pcont-p4c-4" placeholder="rewrite..." data-answer="was she cooking dinner?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('pcont-p4c-4')"><span class="fill-result" id="pcont-p4c-4-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div class="get-result-bar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button class="get-result-btn" onclick="getResult()">
            📊 Get Result
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(70)" style="background:#22c55e;color:#ffffff;border:none;">
            ✅ Done
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(67)" style="background:#ef4444;color:#ffffff;border:none;">
            ⚠️ Retake
        </button>
    </div>
</div>
`;
}

// ── Past Simple Practice Tasks ───────────────────────────────────────────────
function renderPastSimplePracticeTasks(container) {
    container.innerHTML = `
<div class="practice-tasks-container">
    <div class="pc-practice-header" style="margin-bottom: 25px;">
        <div class="pc-dropdown-container" id="ps-practice-dropdown">
            <div class="pc-dropdown-trigger" onclick="this.parentElement.classList.toggle('open')">
                <span id="ps-current-section">Practice 1: Multiple Choice</span>
                <span class="dropdown-arrow">▼</span>
            </div>
            <div class="pc-dropdown-menu">
                <div class="pc-dropdown-item" onclick="switchPSSection(1)">Practice 1: Multiple Choice</div>
                <div class="pc-dropdown-item" onclick="switchPSSection(2)">Practice 2: Find Errors</div>
                <div class="pc-dropdown-item" onclick="switchPSSection(3)">Practice 3: Fill in the Blanks</div>
                <div class="pc-dropdown-item" onclick="switchPSSection(4)">Practice 4: Rewrite the Sentences</div>
            </div>
        </div>
    </div>

<!-- ══════════════════════════════════════════════════════
     PS SECTION 1 — Multiple Choice
══════════════════════════════════════════════════════ -->
<div id="ps-section-1">

<!-- ══════════════════════════════════════════════════════
     PRACTICE 1 — Multiple Choice
══════════════════════════════════════════════════════ -->
<div class="practice-section-label">
    <span class="practice-section-badge">Practice 1</span>
    <span class="practice-section-title">Multiple Choice</span>
</div>

<!-- ✅ Affirmative -->
<div class="practice-form-block">
    <div class="practice-form-header practice-affirmative">
        <div class="practice-header-top"><span class="practice-form-tag aff-tag">Affirmative</span></div>
        <h4>Choose the correct affirmative form.</h4>
    </div>

    <div class="exercise"><div class="exercise-number">1</div>
        <div class="exercise-options" id="psa-opts-0">
            <div class="option" onclick="selectPracticeOption(event,'psa',0,0,0)">A) I finished my homework yesterday.</div>
            <div class="option" onclick="selectPracticeOption(event,'psa',0,1,0)">B) I have finished my homework yesterday.</div>
            <div class="option" onclick="selectPracticeOption(event,'psa',0,2,0)">C) I finish my homework yesterday.</div>
            <div class="option" onclick="selectPracticeOption(event,'psa',0,3,0)">D) I have finishing my homework yesterday.</div>
        </div>
    </div>

    <div class="exercise"><div class="exercise-number">2</div>
        <div class="exercise-options" id="psa-opts-1">
            <div class="option" onclick="selectPracticeOption(event,'psa',1,0,0)">A) She visited her grandmother last weekend.</div>
            <div class="option" onclick="selectPracticeOption(event,'psa',1,1,0)">B) She has visited her grandmother last weekend.</div>
            <div class="option" onclick="selectPracticeOption(event,'psa',1,2,0)">C) She visits her grandmother last weekend.</div>
            <div class="option" onclick="selectPracticeOption(event,'psa',1,3,0)">D) She has visiting her grandmother last weekend.</div>
        </div>
    </div>

    <div class="exercise"><div class="exercise-number">3</div>
        <div class="exercise-options" id="psa-opts-2">
            <div class="option" onclick="selectPracticeOption(event,'psa',2,0,2)">A) He has been at the party on Saturday.</div>
            <div class="option" onclick="selectPracticeOption(event,'psa',2,1,2)">B) He is at the party on Saturday.</div>
            <div class="option" onclick="selectPracticeOption(event,'psa',2,2,2)">C) He was at the party on Saturday.</div>
            <div class="option" onclick="selectPracticeOption(event,'psa',2,3,2)">D) He were at the party on Saturday.</div>
        </div>
    </div>

    <div class="exercise"><div class="exercise-number">4</div>
        <div class="exercise-options" id="psa-opts-3">
            <div class="option" onclick="selectPracticeOption(event,'psa',3,0,2)">A) We travel to London last year.</div>
            <div class="option" onclick="selectPracticeOption(event,'psa',3,1,2)">B) We have traveled to London last year.</div>
            <div class="option" onclick="selectPracticeOption(event,'psa',3,2,2)">C) We traveled to London last year.</div>
            <div class="option" onclick="selectPracticeOption(event,'psa',3,3,2)">D) We have traveling to London last year.</div>
        </div>
    </div>

    <div class="exercise"><div class="exercise-number">5</div>
        <div class="exercise-options" id="psa-opts-4">
            <div class="option" onclick="selectPracticeOption(event,'psa',4,0,1)">A) He were late for class yesterday.</div>
            <div class="option" onclick="selectPracticeOption(event,'psa',4,1,1)">B) He was late for class yesterday.</div>
            <div class="option" onclick="selectPracticeOption(event,'psa',4,2,1)">C) He is late for class yesterday.</div>
            <div class="option" onclick="selectPracticeOption(event,'psa',4,3,1)">D) He be late for class yesterday.</div>
        </div>
    </div>

    <div class="exercise"><div class="exercise-number">6</div>
        <div class="exercise-options" id="psa-opts-5">
            <div class="option" onclick="selectPracticeOption(event,'psa',5,0,0)">A) I was very busy yesterday.</div>
            <div class="option" onclick="selectPracticeOption(event,'psa',5,1,0)">B) I were very busy yesterday.</div>
            <div class="option" onclick="selectPracticeOption(event,'psa',5,2,0)">C) I am very busy yesterday.</div>
            <div class="option" onclick="selectPracticeOption(event,'psa',5,3,0)">D) I be very busy yesterday.</div>
        </div>
    </div>
</div><!-- end aff block -->

<!-- ❌ Negative -->
<div class="practice-form-block">
    <div class="practice-form-header practice-negative">
        <div class="practice-header-top"><span class="practice-form-tag neg-tag">Negative</span></div>
        <h4>Choose the correct negative form.</h4>
    </div>

    <div class="exercise"><div class="exercise-number">1</div>
        <div class="exercise-options" id="psn-opts-0">
            <div class="option" onclick="selectPracticeOption(event,'psn',0,0,3)">A) I have not finish my homework yesterday.</div>
            <div class="option" onclick="selectPracticeOption(event,'psn',0,1,3)">B) I did not finished my homework yesterday.</div>
            <div class="option" onclick="selectPracticeOption(event,'psn',0,2,3)">C) I not finished my homework yesterday.</div>
            <div class="option" onclick="selectPracticeOption(event,'psn',0,3,3)">D) I did not finish my homework yesterday.</div>
        </div>
    </div>

    <div class="exercise"><div class="exercise-number">2</div>
        <div class="exercise-options" id="psn-opts-1">
            <div class="option" onclick="selectPracticeOption(event,'psn',1,0,0)">A) She did not visit her grandmother last weekend.</div>
            <div class="option" onclick="selectPracticeOption(event,'psn',1,1,0)">B) She did not visited her grandmother last weekend.</div>
            <div class="option" onclick="selectPracticeOption(event,'psn',1,2,0)">C) She not visited her grandmother last weekend.</div>
            <div class="option" onclick="selectPracticeOption(event,'psn',1,3,0)">D) She has not visited her grandmother last weekend.</div>
        </div>
    </div>

    <div class="exercise"><div class="exercise-number">3</div>
        <div class="exercise-options" id="psn-opts-2">
            <div class="option" onclick="selectPracticeOption(event,'psn',2,0,0)">A) I wasn’t very happy yesterday.</div>
            <div class="option" onclick="selectPracticeOption(event,'psn',2,1,0)">B) I didn’t was very happy yesterday.</div>
            <div class="option" onclick="selectPracticeOption(event,'psn',2,2,0)">C) I not was very happy yesterday.</div>
            <div class="option" onclick="selectPracticeOption(event,'psn',2,3,0)">D) I doesn’t was very happy yesterday.</div>
        </div>
    </div>

    <div class="exercise"><div class="exercise-number">4</div>
        <div class="exercise-options" id="psn-opts-3">
            <div class="option" onclick="selectPracticeOption(event,'psn',3,0,2)">A) We not traveled to London last year.</div>
            <div class="option" onclick="selectPracticeOption(event,'psn',3,1,2)">B) We did not traveled to London last year.</div>
            <div class="option" onclick="selectPracticeOption(event,'psn',3,2,2)">C) We did not travel to London last year.</div>
            <div class="option" onclick="selectPracticeOption(event,'psn',3,3,2)">D) We have not traveled to London last year.</div>
        </div>
    </div>

    <div class="exercise"><div class="exercise-number">5</div>
        <div class="exercise-options" id="psn-opts-4">
            <div class="option" onclick="selectPracticeOption(event,'psn',4,0,1)">A) They was not happy with the results.</div>
            <div class="option" onclick="selectPracticeOption(event,'psn',4,1,1)">B) They were not happy with the results.</div>
            <div class="option" onclick="selectPracticeOption(event,'psn',4,2,1)">C) They did not were happy with the results.</div>
            <div class="option" onclick="selectPracticeOption(event,'psn',4,3,1)">D) They is not happy with the results.</div>
        </div>
    </div>

    <div class="exercise"><div class="exercise-number">6</div>
        <div class="exercise-options" id="psn-opts-5">
            <div class="option" onclick="selectPracticeOption(event,'psn',5,0,1)">A) We was not very tired after the trip.</div>
            <div class="option" onclick="selectPracticeOption(event,'psn',5,1,1)">B) We were not very tired after the trip.</div>
            <div class="option" onclick="selectPracticeOption(event,'psn',5,2,1)">C) We not very tired after the trip.</div>
            <div class="option" onclick="selectPracticeOption(event,'psn',5,3,1)">D) We did not happy very tired after the trip.</div>
        </div>
    </div>
</div><!-- end neg block -->

<!-- ❓ Interrogative -->
<div class="practice-form-block">
    <div class="practice-form-header practice-interrogative">
        <div class="practice-header-top"><span class="practice-form-tag int-tag">Interrogative</span></div>
        <h4>Choose the correct question form.</h4>
    </div>

    <div class="exercise"><div class="exercise-number">1</div>
        <div class="exercise-options" id="psi-opts-0">
            <div class="option" onclick="selectPracticeOption(event,'psi',0,0,0)">A) Did you finish your homework yesterday?</div>
            <div class="option" onclick="selectPracticeOption(event,'psi',0,1,0)">B) Do you finished your homework yesterday?</div>
            <div class="option" onclick="selectPracticeOption(event,'psi',0,2,0)">C) Did you finished your homework yesterday?</div>
            <div class="option" onclick="selectPracticeOption(event,'psi',0,3,0)">D) Did you finishing your homework yesterday?</div>
        </div>
    </div>

    <div class="exercise"><div class="exercise-number">2</div>
        <div class="exercise-options" id="psi-opts-1">
            <div class="option" onclick="selectPracticeOption(event,'psi',1,0,3)">A) Did she was at the party on Saturday?</div>
            <div class="option" onclick="selectPracticeOption(event,'psi',1,1,3)">B) Were she at the party on Saturday?</div>
            <div class="option" onclick="selectPracticeOption(event,'psi',1,2,3)">C) Was she been at the party on Saturday?</div>
            <div class="option" onclick="selectPracticeOption(event,'psi',1,3,3)">D) Was she at the party on Saturday?</div>
        </div>
    </div>

    <div class="exercise"><div class="exercise-number">3</div>
        <div class="exercise-options" id="psi-opts-2">
            <div class="option" onclick="selectPracticeOption(event,'psi',2,0,3)">A) Did they visiting Paris last year?</div>
            <div class="option" onclick="selectPracticeOption(event,'psi',2,1,3)">B) Do they visited Paris last year?</div>
            <div class="option" onclick="selectPracticeOption(event,'psi',2,2,3)">C) Did they visited Paris last year?</div>
            <div class="option" onclick="selectPracticeOption(event,'psi',2,3,3)">D) Did they visit Paris last year?</div>
        </div>
    </div>

    <div class="exercise"><div class="exercise-number">4</div>
        <div class="exercise-options" id="psi-opts-3">
            <div class="option" onclick="selectPracticeOption(event,'psi',3,0,0)">A) Were they happy with the results?</div>
            <div class="option" onclick="selectPracticeOption(event,'psi',3,1,0)">B) Was they happy with the results?</div>
            <div class="option" onclick="selectPracticeOption(event,'psi',3,2,0)">C) Did they were happy with the results?</div>
            <div class="option" onclick="selectPracticeOption(event,'psi',3,3,0)">D) Were they been happy with the results?</div>
        </div>
    </div>

    <div class="exercise"><div class="exercise-number">5</div>
        <div class="exercise-options" id="psi-opts-4">
            <div class="option" onclick="selectPracticeOption(event,'psi',4,0,2)">A) Does he call his friend yesterday?</div>
            <div class="option" onclick="selectPracticeOption(event,'psi',4,1,2)">B) Did he called his friend yesterday?</div>
            <div class="option" onclick="selectPracticeOption(event,'psi',4,2,2)">C) Did he call his friend yesterday?</div>
            <div class="option" onclick="selectPracticeOption(event,'psi',4,3,2)">D) Did he calling his friend yesterday?</div>
        </div>
    </div>

    <div class="exercise"><div class="exercise-number">6</div>
        <div class="exercise-options" id="psi-opts-5">
            <div class="option" onclick="selectPracticeOption(event,'psi',5,0,0)">A) Were they tired after the trip?</div>
            <div class="option" onclick="selectPracticeOption(event,'psi',5,1,0)">B) Was they tired after the trip?</div>
            <div class="option" onclick="selectPracticeOption(event,'psi',5,2,0)">C) Did they were tired after the trip?</div>
            <div class="option" onclick="selectPracticeOption(event,'psi',5,3,0)">D) They were tired after the trip?</div>
        </div>
    </div>
</div><!-- end int block -->
</div><!-- end ps-section-1 -->

<div id="ps-section-2" style="display:none;">
<!-- ══════════════════════════════════════════════════════
     PRACTICE 2 — Find Errors
══════════════════════════════════════════════════════ -->
<div class="practice-section-label" style="margin-top:12px;">
    <span class="practice-section-badge">Practice 2</span>
    <span class="practice-section-title">Find Errors</span>
</div>

<div id="ps-block-fill" class="practice-form-block">
    <div class="practice-form-header practice-affirmative">
        <div class="practice-header-top"><span class="practice-form-tag aff-tag">Error Correction</span></div>
        <h4>Find the error (shown in bold) and type the correct word.</h4>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">1</div>
        <div class="fill-dialogue">
            <div class="fill-line">He <strong style="color:#e04040;text-decoration:underline;">go</strong> to the gym yesterday to stay fit.</div>
            <div class="fill-line" style="margin-top:6px;">
                <span class="speaker-label">Correct:</span>
                <input class="fill-input" id="ps-p2e1" placeholder="type correction..." data-answer="went" onkeydown="if(event.key==='Enter')checkFill('ps-p2e1')">
                <span class="fill-result" id="ps-p2e1-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">2</div>
        <div class="fill-dialogue">
            <div class="fill-line">She <strong style="color:#e04040;text-decoration:underline;">eat</strong> dinner very late last night.</div>
            <div class="fill-line" style="margin-top:6px;">
                <span class="speaker-label">Correct:</span>
                <input class="fill-input" id="ps-p2e2" placeholder="type correction..." data-answer="ate" onkeydown="if(event.key==='Enter')checkFill('ps-p2e2')">
                <span class="fill-result" id="ps-p2e2-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">3</div>
        <div class="fill-dialogue">
            <div class="fill-line">I <strong style="color:#e04040;text-decoration:underline;">were</strong> happy with my test results.</div>
            <div class="fill-line" style="margin-top:6px;">
                <span class="speaker-label">Correct:</span>
                <input class="fill-input" id="ps-p2e3" placeholder="type correction..." data-answer="was" onkeydown="if(event.key==='Enter')checkFill('ps-p2e3')">
                <span class="fill-result" id="ps-p2e3-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">4</div>
        <div class="fill-dialogue">
            <div class="fill-line">They <strong style="color:#e04040;text-decoration:underline;">was</strong> very happy after the lesson.</div>
            <div class="fill-line" style="margin-top:6px;">
                <span class="speaker-label">Correct:</span>
                <input class="fill-input" id="ps-p2e4" placeholder="type correction..." data-answer="were" onkeydown="if(event.key==='Enter')checkFill('ps-p2e4')">
                <span class="fill-result" id="ps-p2e4-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">5</div>
        <div class="fill-dialogue">
            <div class="fill-line">He <strong style="color:#e04040;text-decoration:underline;">don't</strong> call me yesterday.</div>
            <div class="fill-line" style="margin-top:6px;">
                <span class="speaker-label">Correct:</span>
                <input class="fill-input" id="ps-p2e5" placeholder="type correction..." data-answer="didn't" onkeydown="if(event.key==='Enter')checkFill('ps-p2e5')">
                <span class="fill-result" id="ps-p2e5-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">6</div>
        <div class="fill-dialogue">
            <div class="fill-line">She didn't <strong style="color:#e04040;text-decoration:underline;">saw</strong> that movie last week.</div>
            <div class="fill-line" style="margin-top:6px;">
                <span class="speaker-label">Correct:</span>
                <input class="fill-input" id="ps-p2e6" placeholder="type correction..." data-answer="see" onkeydown="if(event.key==='Enter')checkFill('ps-p2e6')">
                <span class="fill-result" id="ps-p2e6-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">7</div>
        <div class="fill-dialogue">
            <div class="fill-line">They didn't <strong style="color:#e04040;text-decoration:underline;">finished</strong> their project on time.</div>
            <div class="fill-line" style="margin-top:6px;">
                <span class="speaker-label">Correct:</span>
                <input class="fill-input" id="ps-p2e7" placeholder="type correction..." data-answer="finish" onkeydown="if(event.key==='Enter')checkFill('ps-p2e7')">
                <span class="fill-result" id="ps-p2e7-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">8</div>
        <div class="fill-dialogue">
            <div class="fill-line">I <strong style="color:#e04040;text-decoration:underline;">didn't was</strong> at home yesterday evening.</div>
            <div class="fill-line" style="margin-top:6px;">
                <span class="speaker-label">Correct:</span>
                <input class="fill-input" id="ps-p2e8" placeholder="type correction..." data-answer="wasn't|was not" onkeydown="if(event.key==='Enter')checkFill('ps-p2e8')">
                <span class="fill-result" id="ps-p2e8-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">9</div>
        <div class="fill-dialogue">
            <div class="fill-line">Did she <strong style="color:#e04040;text-decoration:underline;">went</strong> to school 2 days ago?</div>
            <div class="fill-line" style="margin-top:6px;">
                <span class="speaker-label">Correct:</span>
                <input class="fill-input" id="ps-p2e9" placeholder="type correction..." data-answer="go" onkeydown="if(event.key==='Enter')checkFill('ps-p2e9')">
                <span class="fill-result" id="ps-p2e9-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">10</div>
        <div class="fill-dialogue">
            <div class="fill-line">Did he <strong style="color:#e04040;text-decoration:underline;">wrote</strong> the email yesterday?</div>
            <div class="fill-line" style="margin-top:6px;">
                <span class="speaker-label">Correct:</span>
                <input class="fill-input" id="ps-p2e10" placeholder="type correction..." data-answer="write" onkeydown="if(event.key==='Enter')checkFill('ps-p2e10')">
                <span class="fill-result" id="ps-p2e10-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">11</div>
        <div class="fill-dialogue">
            <div class="fill-line"><strong style="color:#e04040;text-decoration:underline;">Was</strong> they at the party last night?</div>
            <div class="fill-line" style="margin-top:6px;">
                <span class="speaker-label">Correct:</span>
                <input class="fill-input" id="ps-p2e11" placeholder="type correction..." data-answer="were" onkeydown="if(event.key==='Enter')checkFill('ps-p2e11')">
                <span class="fill-result" id="ps-p2e11-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">12</div>
        <div class="fill-dialogue">
            <div class="fill-line"><strong style="color:#e04040;text-decoration:underline;">Were</strong> she at home at night?</div>
            <div class="fill-line" style="margin-top:6px;">
                <span class="speaker-label">Correct:</span>
                <input class="fill-input" id="ps-p2e12" placeholder="type correction..." data-answer="was" onkeydown="if(event.key==='Enter')checkFill('ps-p2e12')">
                <span class="fill-result" id="ps-p2e12-res"></span>
            </div>
        </div>
    </div>

    <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;">
        <button class="quiz-check-btn" onclick="checkPracticeBlock(this)">&#10003; Check</button>
    </div>
</div><!-- end practice 2 block -->
</div><!-- end ps-section-2 -->

<div id="ps-section-3" style="display:none;">
<!-- ══════════════════════════════════════════════════════
     PRACTICE 3 — Fill in the Blanks
══════════════════════════════════════════════════════ -->
<div class="practice-section-label" style="margin-top:12px;">
    <span class="practice-section-badge">Practice 3</span>
    <span class="practice-section-title">Fill in the Blanks</span>
</div>

<!-- 3a Affirmative -->
<div class="practice-form-block">
    <div class="practice-form-header practice-affirmative">
        <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) Affirmative</span></div>
        <h4>Fill in the gaps using Past Simple affirmative forms.</h4>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">1</div>
        <div class="fill-dialogue">
            <div class="fill-line speaker-a">
                <span class="speaker-label">A:</span>
                <span>I </span><input class="fill-input" id="ps-p3a-1a" placeholder="finish" data-answer="finished" onkeydown="if(event.key==='Enter')checkFill('ps-p3a-1a')"><span> my homework yesterday.</span>
                <span class="fill-result" id="ps-p3a-1a-res"></span>
            </div>
            <div class="fill-line speaker-b">
                <span class="speaker-label">B:</span>
                <span>That's great! I </span><input class="fill-input" id="ps-p3a-1b" placeholder="complete" data-answer="completed" onkeydown="if(event.key==='Enter')checkFill('ps-p3a-1b')"><span> my project too.</span>
                <span class="fill-result" id="ps-p3a-1b-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">2</div>
        <div class="fill-dialogue">
            <div class="fill-line speaker-a">
                <span class="speaker-label">A:</span>
                <span>She </span><input class="fill-input" id="ps-p3a-2a" placeholder="visit" data-answer="visited" onkeydown="if(event.key==='Enter')checkFill('ps-p3a-2a')"><span> her grandmother last weekend.</span>
                <span class="fill-result" id="ps-p3a-2a-res"></span>
            </div>
            <div class="fill-line speaker-b">
                <span class="speaker-label">B:</span>
                <span>Really? I </span><input class="fill-input" id="ps-p3a-2b" placeholder="see" data-answer="saw" onkeydown="if(event.key==='Enter')checkFill('ps-p3a-2b')"><span> her too.</span>
                <span class="fill-result" id="ps-p3a-2b-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">3</div>
        <div class="fill-dialogue">
            <div class="fill-line speaker-a">
                <span class="speaker-label">A:</span>
                <span>They </span><input class="fill-input" id="ps-p3a-3a" placeholder="be" data-answer="were" onkeydown="if(event.key==='Enter')checkFill('ps-p3a-3a')"><span> happy yesterday.</span>
                <span class="fill-result" id="ps-p3a-3a-res"></span>
            </div>
            <div class="fill-line speaker-b">
                <span class="speaker-label">B:</span>
                <span>Yes, I </span><input class="fill-input" id="ps-p3a-3b" placeholder="notice" data-answer="noticed" onkeydown="if(event.key==='Enter')checkFill('ps-p3a-3b')"><span> it too.</span>
                <span class="fill-result" id="ps-p3a-3b-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">4</div>
        <div class="fill-dialogue">
            <div class="fill-line speaker-a">
                <span class="speaker-label">A:</span>
                <span>He </span><input class="fill-input" id="ps-p3a-4a" placeholder="be" data-answer="was" onkeydown="if(event.key==='Enter')checkFill('ps-p3a-4a')"><span> at the party on Saturday.</span>
                <span class="fill-result" id="ps-p3a-4a-res"></span>
            </div>
            <div class="fill-line speaker-b">
                <span class="speaker-label">B:</span>
                <span>That's nice! My friends </span><input class="fill-input" id="ps-p3a-4b" placeholder="be" data-answer="were" onkeydown="if(event.key==='Enter')checkFill('ps-p3a-4b')"><span> there too.</span>
                <span class="fill-result" id="ps-p3a-4b-res"></span>
            </div>
        </div>
    </div>

    <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;">
        <button class="quiz-check-btn" onclick="checkPracticeBlock(this)">&#10003; Check</button>
    </div>
</div><!-- end 3a block -->

<!-- 3b Negative -->
<div class="practice-form-block">
    <div class="practice-form-header practice-negative">
        <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) Negative</span></div>
        <h4>Fill in the gaps using Past Simple negative forms.</h4>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">1</div>
        <div class="fill-dialogue">
            <div class="fill-line speaker-a">
                <span class="speaker-label">A:</span>
                <span>I </span><input class="fill-input" id="ps-p3b-1a" placeholder="not/watch" data-answer="didn't watch|did not watch" onkeydown="if(event.key==='Enter')checkFill('ps-p3b-1a')"><span> the news last night.</span>
                <span class="fill-result" id="ps-p3b-1a-res"></span>
            </div>
            <div class="fill-line speaker-b">
                <span class="speaker-label">B:</span>
                <span>Really? I </span><input class="fill-input" id="ps-p3b-1b" placeholder="not/see" data-answer="didn't see|did not see" onkeydown="if(event.key==='Enter')checkFill('ps-p3b-1b')"><span> it either.</span>
                <span class="fill-result" id="ps-p3b-1b-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">2</div>
        <div class="fill-dialogue">
            <div class="fill-line speaker-a">
                <span class="speaker-label">A:</span>
                <span>She </span><input class="fill-input" id="ps-p3b-2a" placeholder="not/answer" data-answer="didn't answer|did not answer" onkeydown="if(event.key==='Enter')checkFill('ps-p3b-2a')"><span> my email yesterday.</span>
                <span class="fill-result" id="ps-p3b-2a-res"></span>
            </div>
            <div class="fill-line speaker-b">
                <span class="speaker-label">B:</span>
                <span>Oh, I </span><input class="fill-input" id="ps-p3b-2b" placeholder="not/receive" data-answer="didn't receive|did not receive" onkeydown="if(event.key==='Enter')checkFill('ps-p3b-2b')"><span> her reply either.</span>
                <span class="fill-result" id="ps-p3b-2b-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">3</div>
        <div class="fill-dialogue">
            <div class="fill-line speaker-a">
                <span class="speaker-label">A:</span>
                <span>They </span><input class="fill-input" id="ps-p3b-3a" placeholder="not/be" data-answer="weren't|were not" onkeydown="if(event.key==='Enter')checkFill('ps-p3b-3a')"><span> happy with the test results.</span>
                <span class="fill-result" id="ps-p3b-3a-res"></span>
            </div>
            <div class="fill-line speaker-b">
                <span class="speaker-label">B:</span>
                <span>True, I </span><input class="fill-input" id="ps-p3b-3b" placeholder="not/be" data-answer="wasn't|was not" onkeydown="if(event.key==='Enter')checkFill('ps-p3b-3b')"><span> satisfied either.</span>
                <span class="fill-result" id="ps-p3b-3b-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">4</div>
        <div class="fill-dialogue">
            <div class="fill-line speaker-a">
                <span class="speaker-label">A:</span>
                <span>He </span><input class="fill-input" id="ps-p3b-4a" placeholder="not/be" data-answer="wasn't|was not" onkeydown="if(event.key==='Enter')checkFill('ps-p3b-4a')"><span> at the office yesterday.</span>
                <span class="fill-result" id="ps-p3b-4a-res"></span>
            </div>
            <div class="fill-line speaker-b">
                <span class="speaker-label">B:</span>
                <span>Yes, because he </span><input class="fill-input" id="ps-p3b-4b" placeholder="not/be" data-answer="wasn't|was not" onkeydown="if(event.key==='Enter')checkFill('ps-p3b-4b')"><span> ill yesterday.</span>
                <span class="fill-result" id="ps-p3b-4b-res"></span>
            </div>
        </div>
    </div>

    <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;">
        <button class="quiz-check-btn" onclick="checkPracticeBlock(this)">&#10003; Check</button>
    </div>
</div><!-- end 3b block -->

<!-- 3c Questions -->
<div class="practice-form-block">
    <div class="practice-form-header practice-interrogative">
        <div class="practice-header-top"><span class="practice-form-tag int-tag">c) Questions</span></div>
        <h4>Fill in the gaps to form questions and answers in Past Simple.</h4>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">1</div>
        <div class="fill-dialogue">
            <div class="fill-line speaker-a">
                <span class="speaker-label">A:</span>
                <input class="fill-input" id="ps-p3c-1a" placeholder="Did/Was/Were" data-answer="did" onkeydown="if(event.key==='Enter')checkFill('ps-p3c-1a')">
                <span> he </span>
                <input class="fill-input" id="ps-p3c-1b" placeholder="finish" data-answer="finish" onkeydown="if(event.key==='Enter')checkFill('ps-p3c-1b')">
                <span> the report yesterday?</span>
                <span class="fill-result" id="ps-p3c-1a-res"></span>
                <span class="fill-result" id="ps-p3c-1b-res"></span>
            </div>
            <div class="fill-line speaker-b">
                <span class="speaker-label">B:</span>
                <span>No, he </span><input class="fill-input" id="ps-p3c-1c" placeholder="not/finish" data-answer="didn't|did not" onkeydown="if(event.key==='Enter')checkFill('ps-p3c-1c')"><span> it.</span>
                <span class="fill-result" id="ps-p3c-1c-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">2</div>
        <div class="fill-dialogue">
            <div class="fill-line speaker-a">
                <span class="speaker-label">A:</span>
                <input class="fill-input" id="ps-p3c-2a" placeholder="Did/Was/Were" data-answer="did" onkeydown="if(event.key==='Enter')checkFill('ps-p3c-2a')">
                <span> they </span>
                <input class="fill-input" id="ps-p3c-2b" placeholder="clean" data-answer="clean" onkeydown="if(event.key==='Enter')checkFill('ps-p3c-2b')">
                <span> the classroom this morning?</span>
                <span class="fill-result" id="ps-p3c-2a-res"></span>
                <span class="fill-result" id="ps-p3c-2b-res"></span>
            </div>
            <div class="fill-line speaker-b">
                <span class="speaker-label">B:</span>
                <span>Yes, they </span><input class="fill-input" id="ps-p3c-2c" placeholder="clean" data-answer="cleaned" onkeydown="if(event.key==='Enter')checkFill('ps-p3c-2c')"><span> it very well.</span>
                <span class="fill-result" id="ps-p3c-2c-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">3</div>
        <div class="fill-dialogue">
            <div class="fill-line speaker-a">
                <span class="speaker-label">A:</span>
                <input class="fill-input" id="ps-p3c-3a" placeholder="Did/Was/Were" data-answer="was" onkeydown="if(event.key==='Enter')checkFill('ps-p3c-3a')">
                <span> she at the meeting yesterday?</span>
                <span class="fill-result" id="ps-p3c-3a-res"></span>
            </div>
            <div class="fill-line speaker-b">
                <span class="speaker-label">B:</span>
                <span>No, she </span><input class="fill-input" id="ps-p3c-3b" placeholder="not/be" data-answer="wasn't|was not" onkeydown="if(event.key==='Enter')checkFill('ps-p3c-3b')"><span>.</span>
                <span class="fill-result" id="ps-p3c-3b-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">4</div>
        <div class="fill-dialogue">
            <div class="fill-line speaker-a">
                <span class="speaker-label">A:</span>
                <input class="fill-input" id="ps-p3c-4a" placeholder="Did/Was/Were" data-answer="were" onkeydown="if(event.key==='Enter')checkFill('ps-p3c-4a')">
                <span> the children at school last Monday?</span>
                <span class="fill-result" id="ps-p3c-4a-res"></span>
            </div>
            <div class="fill-line speaker-b">
                <span class="speaker-label">B:</span>
                <span>Yes, they </span><input class="fill-input" id="ps-p3c-4b" placeholder="be" data-answer="were" onkeydown="if(event.key==='Enter')checkFill('ps-p3c-4b')"><span>.</span>
                <span class="fill-result" id="ps-p3c-4b-res"></span>
            </div>
        </div>
    </div>

    <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;">
        <button class="quiz-check-btn" onclick="checkPracticeBlock(this)">&#10003; Check</button>
    </div>
</div><!-- end 3c block -->
</div><!-- end ps-section-3 -->

<div id="ps-section-4" style="display:none;">
<!-- ══════════════════════════════════════════════════════
     PRACTICE 4 — Rewrite the Sentences
══════════════════════════════════════════════════════ -->
<div class="practice-section-label" style="margin-top:12px;">
    <span class="practice-section-badge">Practice 4</span>
    <span class="practice-section-title">Rewrite the Sentences</span>
</div>

<!-- 4a Affirmative -->
<div class="practice-form-block">
    <div class="practice-form-header practice-affirmative">
        <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) Affirmative</span></div>
        <h4>Rewrite the sentence in affirmative form.</h4>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">1</div>
        <div class="fill-dialogue">
            <div class="fill-line" style="color:#555;font-style:italic;">She didn't finish her homework last night because she was tired.</div>
            <div class="fill-line" style="margin-top:6px;">
                <input class="fill-input" id="ps-p4a-1" placeholder="rewrite..." data-answer="she finished her homework last night because she was tired." style="width:100%;min-width:280px;" onkeydown="if(event.key==='Enter')checkFill('ps-p4a-1')">
                <span class="fill-result" id="ps-p4a-1-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">2</div>
        <div class="fill-dialogue">
            <div class="fill-line" style="color:#555;font-style:italic;">They didn't visit their grandparents last weekend because they were busy.</div>
            <div class="fill-line" style="margin-top:6px;">
                <input class="fill-input" id="ps-p4a-2" placeholder="rewrite..." data-answer="they visited their grandparents last weekend because they were busy." style="width:100%;min-width:280px;" onkeydown="if(event.key==='Enter')checkFill('ps-p4a-2')">
                <span class="fill-result" id="ps-p4a-2-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">3</div>
        <div class="fill-dialogue">
            <div class="fill-line" style="color:#555;font-style:italic;">He didn't call his friend yesterday; he sent a message instead.</div>
            <div class="fill-line" style="margin-top:6px;">
                <input class="fill-input" id="ps-p4a-3" placeholder="rewrite..." data-answer="he called his friend yesterday; he sent a message instead." style="width:100%;min-width:280px;" onkeydown="if(event.key==='Enter')checkFill('ps-p4a-3')">
                <span class="fill-result" id="ps-p4a-3-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">4</div>
        <div class="fill-dialogue">
            <div class="fill-line" style="color:#555;font-style:italic;">She wasn't at school yesterday.</div>
            <div class="fill-line" style="margin-top:6px;">
                <input class="fill-input" id="ps-p4a-4" placeholder="rewrite..." data-answer="she was at school yesterday." style="width:100%;min-width:280px;" onkeydown="if(event.key==='Enter')checkFill('ps-p4a-4')">
                <span class="fill-result" id="ps-p4a-4-res"></span>
            </div>
        </div>
    </div>

    <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;">
        <button class="quiz-check-btn" onclick="checkPracticeBlock(this)">&#10003; Check</button>
    </div>
</div><!-- end 4a block -->

<!-- 4b Negative -->
<div class="practice-form-block">
    <div class="practice-form-header practice-negative">
        <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) Negative</span></div>
        <h4>Rewrite the sentence in negative form.</h4>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">1</div>
        <div class="fill-dialogue">
            <div class="fill-line" style="color:#555;font-style:italic;">She cleaned her room yesterday afternoon.</div>
            <div class="fill-line" style="margin-top:6px;">
                <input class="fill-input" id="ps-p4b-1" placeholder="rewrite..." data-answer="she didn't clean her room yesterday afternoon.|she did not clean her room yesterday afternoon." style="width:100%;min-width:280px;" onkeydown="if(event.key==='Enter')checkFill('ps-p4b-1')">
                <span class="fill-result" id="ps-p4b-1-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">2</div>
        <div class="fill-dialogue">
            <div class="fill-line" style="color:#555;font-style:italic;">They watched a movie last night.</div>
            <div class="fill-line" style="margin-top:6px;">
                <input class="fill-input" id="ps-p4b-2" placeholder="rewrite..." data-answer="they didn't watch a movie last night.|they did not watch a movie last night." style="width:100%;min-width:280px;" onkeydown="if(event.key==='Enter')checkFill('ps-p4b-2')">
                <span class="fill-result" id="ps-p4b-2-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">3</div>
        <div class="fill-dialogue">
            <div class="fill-line" style="color:#555;font-style:italic;">They were sad because it was raining.</div>
            <div class="fill-line" style="margin-top:6px;">
                <input class="fill-input" id="ps-p4b-3" placeholder="rewrite..." data-answer="they weren't sad because it was raining.|they were not sad because it was raining." style="width:100%;min-width:280px;" onkeydown="if(event.key==='Enter')checkFill('ps-p4b-3')">
                <span class="fill-result" id="ps-p4b-3-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">4</div>
        <div class="fill-dialogue">
            <div class="fill-line" style="color:#555;font-style:italic;">I was very happy after the lesson.</div>
            <div class="fill-line" style="margin-top:6px;">
                <input class="fill-input" id="ps-p4b-4" placeholder="rewrite..." data-answer="i wasn't very happy after the lesson.|i was not very happy after the lesson." style="width:100%;min-width:280px;" onkeydown="if(event.key==='Enter')checkFill('ps-p4b-4')">
                <span class="fill-result" id="ps-p4b-4-res"></span>
            </div>
        </div>
    </div>

    <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;">
        <button class="quiz-check-btn" onclick="checkPracticeBlock(this)">&#10003; Check</button>
    </div>
</div><!-- end 4b block -->

<!-- 4c Questions -->
<div class="practice-form-block">
    <div class="practice-form-header practice-interrogative">
        <div class="practice-header-top"><span class="practice-form-tag int-tag">c) Questions</span></div>
        <h4>Rewrite the sentence in question form.</h4>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">1</div>
        <div class="fill-dialogue">
            <div class="fill-line" style="color:#555;font-style:italic;">I opened the window in the morning.</div>
            <div class="fill-line" style="margin-top:6px;">
                <input class="fill-input" id="ps-p4c-1" placeholder="rewrite..." data-answer="did i open the window in the morning?" style="width:100%;min-width:280px;" onkeydown="if(event.key==='Enter')checkFill('ps-p4c-1')">
                <span class="fill-result" id="ps-p4c-1-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">2</div>
        <div class="fill-dialogue">
            <div class="fill-line" style="color:#555;font-style:italic;">He finished his project last week.</div>
            <div class="fill-line" style="margin-top:6px;">
                <input class="fill-input" id="ps-p4c-2" placeholder="rewrite..." data-answer="did he finish his project last week?" style="width:100%;min-width:280px;" onkeydown="if(event.key==='Enter')checkFill('ps-p4c-2')">
                <span class="fill-result" id="ps-p4c-2-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">3</div>
        <div class="fill-dialogue">
            <div class="fill-line" style="color:#555;font-style:italic;">We visited the museum on Sunday.</div>
            <div class="fill-line" style="margin-top:6px;">
                <input class="fill-input" id="ps-p4c-3" placeholder="rewrite..." data-answer="did we visit the museum on sunday?" style="width:100%;min-width:280px;" onkeydown="if(event.key==='Enter')checkFill('ps-p4c-3')">
                <span class="fill-result" id="ps-p4c-3-res"></span>
            </div>
        </div>
    </div>

    <div class="fill-exercise">
        <div class="fill-q-num">4</div>
        <div class="fill-dialogue">
            <div class="fill-line" style="color:#555;font-style:italic;">We were at home yesterday evening.</div>
            <div class="fill-line" style="margin-top:6px;">
                <input class="fill-input" id="ps-p4c-4" placeholder="rewrite..." data-answer="were we at home yesterday evening?" style="width:100%;min-width:280px;" onkeydown="if(event.key==='Enter')checkFill('ps-p4c-4')">
                <span class="fill-result" id="ps-p4c-4-res"></span>
            </div>
        </div>
    </div>

    <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;">
        <button class="quiz-check-btn" onclick="checkPracticeBlock(this)">&#10003; Check</button>
    </div>
</div><!-- end 4c block -->
</div><!-- end ps-section-4 -->

<!-- ✅ GET RESULT BUTTON -->
<div class="get-result-bar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button class="get-result-btn" onclick="getResult()">
            📊 Get Result
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(70)" style="background:#22c55e;color:#ffffff;border:none;">
            ✅ Done
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(67)" style="background:#ef4444;color:#ffffff;border:none;">
            ⚠️ Retake
        </button>
    </div>

</div><!-- end practice-tasks-container -->
    `;
}

/**
 * Switch between practice sections for Future Simple
 */
function switchFSSection(num) {
    const sectionTitles = ["Multiple Choice", "Find Errors", "Fill in the Gaps", "Rewrite the Sentences"];
    const dropdown = document.getElementById('fs-practice-dropdown');
    if (dropdown) dropdown.classList.remove('open');

    const sections = ['fs-section-1', 'fs-section-2', 'fs-section-3', 'fs-section-4'];
    sections.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) el.style.display = (idx + 1 === num) ? 'block' : 'none';
    });

    const currentSectionTitle = document.getElementById('fs-current-section');
    if (currentSectionTitle) currentSectionTitle.textContent = `Practice ${num}: ${sectionTitles[num - 1]}`;
}

function renderFutureSimplePracticeTasks(container) {
    container.innerHTML = `
<div class="practice-tasks-container">
    <div class="pc-practice-header" style="margin-bottom: 25px;">
        <div class="pc-dropdown-container" id="fs-practice-dropdown">
            <div class="pc-dropdown-trigger" onclick="this.parentElement.classList.toggle('open')">
                <span id="fs-current-section">Practice 1: Multiple Choice</span>
                <span class="dropdown-arrow">▼</span>
            </div>
            <div class="pc-dropdown-menu">
                <div class="pc-dropdown-item" onclick="switchFSSection(1)">Practice 1: Multiple Choice</div>
                <div class="pc-dropdown-item" onclick="switchFSSection(2)">Practice 2: Find Errors</div>
                <div class="pc-dropdown-item" onclick="switchFSSection(3)">Practice 3: Fill in the Blanks</div>
                <div class="pc-dropdown-item" onclick="switchFSSection(4)">Practice 4: Rewrite the Sentences</div>
            </div>
        </div>
    </div>

    <!-- ══════════════════════════════════════════════════════
         FS SECTION 1 — Multiple Choice
    ══════════════════════════════════════════════════════ -->
    <div id="fs-section-1">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 1</span>
            <span class="practice-section-title">Multiple Choice</span>
        </div>

        <!-- ✅ Affirmative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Affirmative</span></div>
                <h4>Choose the correct affirmative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="fsa-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'fsa',0,0,2)">A) I will goes to the meeting tomorrow.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',0,1,2)">B) I will going to the meeting tomorrow.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',0,2,2)">C) I will go to the meeting tomorrow.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',0,3,2)">D) I will went to the meeting tomorrow.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="fsa-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'fsa',1,0,0)">A) They will visit their grandparents next week.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',1,1,0)">B) They will visiting their grandparents next week.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',1,2,0)">C) They will visits their grandparents next week.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',1,3,0)">D) They will visited their grandparents next week.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="fsa-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'fsa',2,0,3)">A) She will buys a new dress.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',2,1,3)">B) She will buying a new dress.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',2,2,3)">C) She will bought a new dress.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',2,3,3)">D) She will buy a new dress.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">4</div>
                <div class="exercise-options" id="fsa-opts-3">
                    <div class="option" onclick="selectPracticeOption(event,'fsa',3,0,2)">A) We will starts the lesson soon.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',3,1,2)">B) We will starting the lesson soon.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',3,2,2)">C) We will start the lesson soon.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',3,3,2)">D) We will started the lesson soon.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">5</div>
                <div class="exercise-options" id="fsa-opts-4">
                    <div class="option" onclick="selectPracticeOption(event,'fsa',4,0,1)">A) He will finishes his work later.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',4,1,1)">B) He will finish his work later.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',4,2,1)">C) He will finished his work later.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',4,3,1)">D) He will finishing his work later.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">6</div>
                <div class="exercise-options" id="fsa-opts-5">
                    <div class="option" onclick="selectPracticeOption(event,'fsa',5,0,2)">A) I will calls you tonight.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',5,1,2)">B) I will calling you tonight.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',5,2,2)">C) I will call you tonight.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsa',5,3,2)">D) I will called you tonight.</div>
                </div>
            </div>
        </div>

        <!-- ❌ Negative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">Negative</span></div>
                <h4>Choose the correct negative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="fsn-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'fsn',0,0,0)">A) She won’t go to the party.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsn',0,1,0)">B) She won’t going to the party.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsn',0,2,0)">C) She will not goes to the party.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsn',0,3,0)">D) She not will go to the party.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="fsn-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'fsn',1,0,2)">A) I won’t watches that movie.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsn',1,1,2)">B) I will not watching that movie.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsn',1,2,2)">C) I won’t watch that movie.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsn',1,3,2)">D) I not will watch that movie.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="fsn-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'fsn',2,0,2)">A) They won’t plays football tomorrow.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsn',2,1,2)">B) They will not playing football tomorrow.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsn',2,2,2)">C) They won’t play football tomorrow.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsn',2,3,2)">D) They not will play football tomorrow.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">4</div>
                <div class="exercise-options" id="fsn-opts-3">
                    <div class="option" onclick="selectPracticeOption(event,'fsn',3,0,1)">A) He won’t eats breakfast.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsn',3,1,1)">B) He won’t eat breakfast.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsn',3,2,1)">C) He will not eating breakfast.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsn',3,3,1)">D) He not will eat breakfast.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">5</div>
                <div class="exercise-options" id="fsn-opts-4">
                    <div class="option" onclick="selectPracticeOption(event,'fsn',4,0,3)">A) We won’t goes there next week.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsn',4,1,3)">B) We will not going there next week.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsn',4,2,3)">C) We not will go there next week.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsn',4,3,3)">D) We won’t go there next week.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">6</div>
                <div class="exercise-options" id="fsn-opts-5">
                    <div class="option" onclick="selectPracticeOption(event,'fsn',5,0,2)">A) She won’t sends the email.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsn',5,1,2)">B) She will not sending the email.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsn',5,2,2)">C) She won’t send the email.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsn',5,3,2)">D) She not will send the email.</div>
                </div>
            </div>
        </div>

        <!-- ❓ Interrogative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">Interrogative</span></div>
                <h4>Choose the correct question form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="fsi-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'fsi',0,0,3)">A) Will you goes to the party?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsi',0,1,3)">B) Do you will go to the party?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsi',0,2,3)">C) Will you going to the party?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsi',0,3,3)">D) Will you go to the party?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="fsi-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'fsi',1,0,3)">A) Will she buys a new phone?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsi',1,1,3)">B) Does she will buy a new phone?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsi',1,2,3)">C) Will she buying a new phone?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsi',1,3,3)">D) Will she buy a new phone?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="fsi-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'fsi',2,0,0)">A) Will they play tomorrow?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsi',2,1,0)">B) Do they will play tomorrow?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsi',2,2,0)">C) Will they plays tomorrow?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsi',2,3,0)">D) Will they playing tomorrow?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">4</div>
                <div class="exercise-options" id="fsi-opts-3">
                    <div class="option" onclick="selectPracticeOption(event,'fsi',3,0,1)">A) Will he takes the test?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsi',3,1,1)">B) Will he take the test?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsi',3,2,1)">C) Will he taking the test?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsi',3,3,1)">D) Does he will take the test?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">5</div>
                <div class="exercise-options" id="fsi-opts-4">
                    <div class="option" onclick="selectPracticeOption(event,'fsi',4,0,2)">A) Will we starts the lesson?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsi',4,1,2)">B) Do we will start the lesson?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsi',4,2,2)">C) Will we start the lesson?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsi',4,3,2)">D) Will we starting the lesson?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">6</div>
                <div class="exercise-options" id="fsi-opts-5">
                    <div class="option" onclick="selectPracticeOption(event,'fsi',5,0,0)">A) Will she send the message?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsi',5,1,0)">B) Does she will send the message?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsi',5,2,0)">C) Will she sending the message?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fsi',5,3,0)">D) Will she sends the message?</div>
                </div>
            </div>
        </div>
    </div>

    <!-- ══════════════════════════════════════════════════════
         FS SECTION 2 — Find Errors
    ══════════════════════════════════════════════════════ -->
    <div id="fs-section-2" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 2</span>
            <span class="practice-section-title">Find Errors</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Error Correction</span></div>
                <h4>Find the error and type the correct word.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line">He will <strong style="color:#e04040;text-decoration:underline;">goes</strong> to the gym tomorrow.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fs-p2e1" placeholder="correction..." data-answer="go" onkeydown="if(event.key==='Enter')checkFill('fs-p2e1')"><span class="fill-result" id="fs-p2e1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line">She will <strong style="color:#e04040;text-decoration:underline;">buys</strong> a new laptop.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fs-p2e2" placeholder="correction..." data-answer="buy" onkeydown="if(event.key==='Enter')checkFill('fs-p2e2')"><span class="fill-result" id="fs-p2e2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line">I will <strong style="color:#e04040;text-decoration:underline;">watching</strong> that movie tonight.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fs-p2e3" placeholder="correction..." data-answer="watch" onkeydown="if(event.key==='Enter')checkFill('fs-p2e3')"><span class="fill-result" id="fs-p2e3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line">They will <strong style="color:#e04040;text-decoration:underline;">plays</strong> football later.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fs-p2e4" placeholder="correction..." data-answer="play" onkeydown="if(event.key==='Enter')checkFill('fs-p2e4')"><span class="fill-result" id="fs-p2e4-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">5</div><div class="fill-dialogue">
                <div class="fill-line">He <strong style="color:#e04040;text-decoration:underline;">not will</strong> come to the meeting.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fs-p2e5" placeholder="correction..." data-answer="will not" onkeydown="if(event.key==='Enter')checkFill('fs-p2e5')"><span class="fill-result" id="fs-p2e5-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">6</div><div class="fill-dialogue">
                <div class="fill-line">She will not <strong style="color:#e04040;text-decoration:underline;">cooking</strong> dinner tonight.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fs-p2e6" placeholder="correction..." data-answer="cook" onkeydown="if(event.key==='Enter')checkFill('fs-p2e6')"><span class="fill-result" id="fs-p2e6-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">7</div><div class="fill-dialogue">
                <div class="fill-line">We will not <strong style="color:#e04040;text-decoration:underline;">starts</strong> the lesson soon.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fs-p2e7" placeholder="correction..." data-answer="start" onkeydown="if(event.key==='Enter')checkFill('fs-p2e7')"><span class="fill-result" id="fs-p2e7-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">8</div><div class="fill-dialogue">
                <div class="fill-line">I won’t <strong style="color:#e04040;text-decoration:underline;">goes</strong> there.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fs-p2e8" placeholder="correction..." data-answer="go" onkeydown="if(event.key==='Enter')checkFill('fs-p2e8')"><span class="fill-result" id="fs-p2e8-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">9</div><div class="fill-dialogue">
                <div class="fill-line">Will he <strong style="color:#e04040;text-decoration:underline;">goes</strong> to school tomorrow?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fs-p2e9" placeholder="correction..." data-answer="go" onkeydown="if(event.key==='Enter')checkFill('fs-p2e9')"><span class="fill-result" id="fs-p2e9-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">10</div><div class="fill-dialogue">
                <div class="fill-line">Will they <strong style="color:#e04040;text-decoration:underline;">plays</strong> in the match?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fs-p2e10" placeholder="correction..." data-answer="play" onkeydown="if(event.key==='Enter')checkFill('fs-p2e10')"><span class="fill-result" id="fs-p2e10-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">11</div><div class="fill-dialogue">
                <div class="fill-line">Will you <strong style="color:#e04040;text-decoration:underline;">watching</strong> TV tonight?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fs-p2e11" placeholder="correction..." data-answer="watch" onkeydown="if(event.key==='Enter')checkFill('fs-p2e11')"><span class="fill-result" id="fs-p2e11-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">12</div><div class="fill-dialogue">
                <div class="fill-line">Will she <strong style="color:#e04040;text-decoration:underline;">buys</strong> a new dress?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fs-p2e12" placeholder="correction..." data-answer="buy" onkeydown="if(event.key==='Enter')checkFill('fs-p2e12')"><span class="fill-result" id="fs-p2e12-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;">
                <button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button>
            </div>
        </div>
    </div>

    <div id="fs-section-3" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 3</span>
            <span class="practice-section-title">Fill in the Gaps</span>
        </div>

        <!-- Affirmative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) Affirmative</span></div>
                <h4>Fill in the correct Future Simple affirmative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="fs-p3a-1a" placeholder="call" data-answer="will call" onkeydown="if(event.key==='Enter')checkFill('fs-p3a-1a')"> you later.<span class="fill-result" id="fs-p3a-1a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Great! I <input class="fill-input" id="fs-p3a-1b" placeholder="wait" data-answer="will wait" onkeydown="if(event.key==='Enter')checkFill('fs-p3a-1b')"> for your call.<span class="fill-result" id="fs-p3a-1b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="fs-p3a-2a" placeholder="visit" data-answer="will visit" onkeydown="if(event.key==='Enter')checkFill('fs-p3a-2a')"> her grandmother tomorrow.<span class="fill-result" id="fs-p3a-2a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Nice! I <input class="fill-input" id="fs-p3a-2b" placeholder="see" data-answer="will see" onkeydown="if(event.key==='Enter')checkFill('fs-p3a-2b')"> mine next week.<span class="fill-result" id="fs-p3a-2b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="fs-p3a-3a" placeholder="travel" data-answer="will travel" onkeydown="if(event.key==='Enter')checkFill('fs-p3a-3a')"> to Turkey next summer.<span class="fill-result" id="fs-p3a-3a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Amazing! We <input class="fill-input" id="fs-p3a-3b" placeholder="go" data-answer="will go" onkeydown="if(event.key==='Enter')checkFill('fs-p3a-3b')"> there too.<span class="fill-result" id="fs-p3a-3b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> He <input class="fill-input" id="fs-p3a-4a" placeholder="finish" data-answer="will finish" onkeydown="if(event.key==='Enter')checkFill('fs-p3a-4a')"> his homework soon.<span class="fill-result" id="fs-p3a-4a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Good! I <input class="fill-input" id="fs-p3a-4b" placeholder="start" data-answer="will start" onkeydown="if(event.key==='Enter')checkFill('fs-p3a-4b')"> mine now.<span class="fill-result" id="fs-p3a-4b-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>

        <!-- Negative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) Negative</span></div>
                <h4>Use correct Future Simple negative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="fs-p3b-1a" placeholder="not go" data-answer="will not go|won't go" onkeydown="if(event.key==='Enter')checkFill('fs-p3b-1a')"> to the party tonight.<span class="fill-result" id="fs-p3b-1a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Me too! I <input class="fill-input" id="fs-p3b-1b" placeholder="not attend" data-answer="will not attend|won't attend" onkeydown="if(event.key==='Enter')checkFill('fs-p3b-1b')"> it either.<span class="fill-result" id="fs-p3b-1b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="fs-p3b-2a" placeholder="not buy" data-answer="will not buy|won't buy" onkeydown="if(event.key==='Enter')checkFill('fs-p3b-2a')"> that dress.<span class="fill-result" id="fs-p3b-2a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Right! She <input class="fill-input" id="fs-p3b-2b" placeholder="not spend" data-answer="will not spend|won't spend" onkeydown="if(event.key==='Enter')checkFill('fs-p3b-2b')"> money on it.<span class="fill-result" id="fs-p3b-2b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="fs-p3b-3a" placeholder="not play" data-answer="will not play|won't play" onkeydown="if(event.key==='Enter')checkFill('fs-p3b-3a')"> the match tomorrow.<span class="fill-result" id="fs-p3b-3a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, they <input class="fill-input" id="fs-p3b-3b" placeholder="not come" data-answer="will not come|won't come" onkeydown="if(event.key==='Enter')checkFill('fs-p3b-3b')"> at all.<span class="fill-result" id="fs-p3b-3b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> He <input class="fill-input" id="fs-p3b-4a" placeholder="not help" data-answer="will not help|won't help" onkeydown="if(event.key==='Enter')checkFill('fs-p3b-4a')"> us today.<span class="fill-result" id="fs-p3b-4a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> I know. He <input class="fill-input" id="fs-p3b-4b" placeholder="not join" data-answer="will not join|won't join" onkeydown="if(event.key==='Enter')checkFill('fs-p3b-4b')"> the team.<span class="fill-result" id="fs-p3b-4b-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>

        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">c) Question</span></div>
                <h4>Use correct Future Simple question forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="fs-p3c-1a" placeholder="Will... call" data-answer="Will you call" onkeydown="if(event.key==='Enter')checkFill('fs-p3c-1a')"> me later?<span class="fill-result" id="fs-p3c-1a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, I will.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="fs-p3c-2a" placeholder="Will... come" data-answer="Will she come" onkeydown="if(event.key==='Enter')checkFill('fs-p3c-2a')"> to the meeting?<span class="fill-result" id="fs-p3c-2a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> No, she won’t.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="fs-p3c-3a" placeholder="Will... travel" data-answer="Will they travel" onkeydown="if(event.key==='Enter')checkFill('fs-p3c-3a')"> this summer?<span class="fill-result" id="fs-p3c-3a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, they will.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="fs-p3c-4a" placeholder="Will... finish" data-answer="Will he finish" onkeydown="if(event.key==='Enter')checkFill('fs-p3c-4a')"> his work today?<span class="fill-result" id="fs-p3c-4a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> No, he won’t.</div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div id="fs-section-4" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 4</span>
            <span class="practice-section-title">Rewrite the Sentences</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) To Affirmative</span></div>
                <h4>Rewrite the sentence in affirmative form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She won’t attend the meeting tomorrow.</div>
                <div class="fill-line"><input class="fill-input" id="fs-p4a-1" placeholder="rewrite..." data-answer="she will attend the meeting tomorrow." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('fs-p4a-1')"><span class="fill-result" id="fs-p4a-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">They won’t travel next month.</div>
                <div class="fill-line"><input class="fill-input" id="fs-p4a-2" placeholder="rewrite..." data-answer="they will travel next month." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('fs-p4a-2')"><span class="fill-result" id="fs-p4a-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">He won’t call his friend tonight.</div>
                <div class="fill-line"><input class="fill-input" id="fs-p4a-3" placeholder="rewrite..." data-answer="he will call his friend tonight." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('fs-p4a-3')"><span class="fill-result" id="fs-p4a-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She won’t join the class later.</div>
                <div class="fill-line"><input class="fill-input" id="fs-p4a-4" placeholder="rewrite..." data-answer="she will join the class later." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('fs-p4a-4')"><span class="fill-result" id="fs-p4a-4-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) To Negative</span></div>
                <h4>Rewrite the sentence in negative form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She will buy a new phone.</div>
                <div class="fill-line"><input class="fill-input" id="fs-p4b-1" placeholder="rewrite..." data-answer="she won't buy a new phone.|she will not buy a new phone." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('fs-p4b-1')"><span class="fill-result" id="fs-p4b-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">They will visit their relatives.</div>
                <div class="fill-line"><input class="fill-input" id="fs-p4b-2" placeholder="rewrite..." data-answer="they won't visit their relatives.|they will not visit their relatives." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('fs-p4b-2')"><span class="fill-result" id="fs-p4b-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">He will finish his homework.</div>
                <div class="fill-line"><input class="fill-input" id="fs-p4b-3" placeholder="rewrite..." data-answer="he won't finish his homework.|he will not finish his homework." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('fs-p4b-3')"><span class="fill-result" id="fs-p4b-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">We will start the lesson soon.</div>
                <div class="fill-line"><input class="fill-input" id="fs-p4b-4" placeholder="rewrite..." data-answer="we won't start the lesson soon.|we will not start the lesson soon." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('fs-p4b-4')"><span class="fill-result" id="fs-p4b-4-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">c) To Question</span></div>
                <h4>Rewrite the sentence in question form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">I will call you later.</div>
                <div class="fill-line"><input class="fill-input" id="fs-p4c-1" placeholder="rewrite..." data-answer="will i call you later?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('fs-p4c-1')"><span class="fill-result" id="fs-p4c-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">He will complete the task.</div>
                <div class="fill-line"><input class="fill-input" id="fs-p4c-2" placeholder="rewrite..." data-answer="will he complete the task?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('fs-p4c-2')"><span class="fill-result" id="fs-p4c-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">We will visit that place.</div>
                <div class="fill-line"><input class="fill-input" id="fs-p4c-3" placeholder="rewrite..." data-answer="will we visit that place?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('fs-p4c-3')"><span class="fill-result" id="fs-p4c-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She will join us tomorrow.</div>
                <div class="fill-line"><input class="fill-input" id="fs-p4c-4" placeholder="rewrite..." data-answer="will she join us tomorrow?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('fs-p4c-4')"><span class="fill-result" id="fs-p4c-4-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div class="get-result-bar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button class="get-result-btn" onclick="getResult()">
            📊 Get Result
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(70)" style="background:#22c55e;color:#ffffff;border:none;">
            ✅ Done
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(67)" style="background:#ef4444;color:#ffffff;border:none;">
            ⚠️ Retake
        </button>
    </div>
</div>
`;
}

/**
 * Switch between practice sections for Past Perfect
 */
function switchPPastPSection(num) {
    const sectionTitles = ["Multiple Choice", "Find Errors", "Fill in the Blanks", "Rewrite the Sentences"];

    const dropdown = document.getElementById('ppastp-practice-dropdown');
    if (dropdown) dropdown.classList.remove('open');

    const sections = ['ppastp-section-1', 'ppastp-section-2', 'ppastp-section-3', 'ppastp-section-4'];
    sections.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) el.style.display = (idx + 1 === num) ? 'block' : 'none';
    });

    const currentSectionTitle = document.getElementById('ppastp-current-section');
    if (currentSectionTitle) currentSectionTitle.textContent = `Practice ${num}: ${sectionTitles[num - 1]}`;
    
}

function renderPastPerfectPracticeTasks(container) {
    container.innerHTML = `
<div class="practice-tasks-container">
    <div class="pc-practice-header" style="margin-bottom: 25px;">
        <div class="pc-dropdown-container" id="ppastp-practice-dropdown">
            <div class="pc-dropdown-trigger" onclick="this.parentElement.classList.toggle('open')">
                <span id="ppastp-current-section">Practice 1: Multiple Choice</span>
                <span class="dropdown-arrow">▼</span>
            </div>
            <div class="pc-dropdown-menu">
                <div class="pc-dropdown-item" onclick="switchPPastPSection(1)">Practice 1: Multiple Choice</div>
                <div class="pc-dropdown-item" onclick="switchPPastPSection(2)">Practice 2: Find Errors</div>
                <div class="pc-dropdown-item" onclick="switchPPastPSection(3)">Practice 3: Fill in the Blanks</div>
                <div class="pc-dropdown-item" onclick="switchPPastPSection(4)">Practice 4: Rewrite the Sentences</div>
            </div>
        </div>
    </div>

    <div id="ppastp-section-1">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 1</span>
            <span class="practice-section-title">Multiple Choice</span>
        </div>

        <!-- Affirmative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Affirmative</span></div>
                <h4>Choose the correct affirmative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="ppastpa-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',0,0,0)">A) I had finished my homework before dinner.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',0,1,0)">B) I have finished my homework before dinner.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',0,2,0)">C) I had finish my homework before dinner.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',0,3,0)">D) I was finished my homework before dinner.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="ppastpa-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',1,0,3)">A) They has left the school before the rain started.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',1,1,3)">B) They had leave the school before the rain started.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',1,2,3)">C) They have left the school before the rain started.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',1,3,3)">D) They had left the school before the rain started.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="ppastpa-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',2,0,1)">A) She has eaten breakfast before she went to school.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',2,1,1)">B) She had eaten breakfast before she went to school.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',2,2,1)">C) She had eat breakfast before she went to school.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',2,3,1)">D) She was eaten breakfast before she went to school.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">4</div>
                <div class="exercise-options" id="ppastpa-opts-3">
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',3,0,3)">A) We has arrived at the station before the train came.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',3,1,3)">B) We had arrive at the station before the train came.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',3,2,3)">C) We have arrived at the station before the train came.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',3,3,3)">D) We had arrived at the station before the train came.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">5</div>
                <div class="exercise-options" id="ppastpa-opts-4">
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',4,0,0)">A) He had done his project before the deadline.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',4,1,0)">B) He has done his project before the deadline.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',4,2,0)">C) He had do his project before the deadline.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',4,3,0)">D) He was done his project before the deadline.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">6</div>
                <div class="exercise-options" id="ppastpa-opts-5">
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',5,0,2)">A) I had saw that movie before yesterday.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',5,1,2)">B) I have seen that movie before yesterday.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',5,2,2)">C) I had seen that movie before yesterday.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpa',5,3,2)">D) I was seeing that movie before yesterday.</div>
                </div>
            </div>
        </div>

        <!-- Negative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">Negative</span></div>
                <h4>Choose the correct negative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="ppastpn-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',0,0,3)">A) She hadn’t finishes her work before the lesson.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',0,1,3)">B) She hadn’t finish her work before the lesson.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',0,2,3)">C) She hadn’t been finishing her work before the lesson.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',0,3,3)">D) She hadn’t finished her work before the lesson.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="ppastpn-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',1,0,0)">A) I hadn’t seen him before the party.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',1,1,0)">B) I hadn’t see him before the party.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',1,2,0)">C) I didn’t had seen him before the party.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',1,3,0)">D) I hadn’t seeing him before the party.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="ppastpn-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',2,0,0)">A) They hadn’t left when I arrived.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',2,1,0)">B) They hadn’t leave when I arrived.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',2,2,0)">C) They didn’t had left when I arrived.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',2,3,0)">D) They hadn’t been leaving when I arrived.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">4</div>
                <div class="exercise-options" id="ppastpn-opts-3">
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',3,0,3)">A) He had done his homework before school.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',3,1,3)">B) He hadn’t do his homework before school.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',3,2,3)">C) He hadn’t did his homework before school.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',3,3,3)">D) He hadn’t done his homework before school.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">5</div>
                <div class="exercise-options" id="ppastpn-opts-4">
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',4,0,1)">A) We hadn’t meet before the meeting.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',4,1,1)">B) We hadn’t met before the meeting.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',4,2,1)">C) We didn’t had met before the meeting.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',4,3,1)">D) We hadn’t been meeting before the meeting.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">6</div>
                <div class="exercise-options" id="ppastpn-opts-5">
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',5,0,2)">A) She haven’t bought a ticket before the trip.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',5,1,2)">B) She hadn’t buy a ticket before the trip.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',5,2,2)">C) She hadn’t bought a ticket before the trip.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpn',5,3,2)">D) She hadn’t been buying a ticket before the trip.</div>
                </div>
            </div>
        </div>

        <!-- Interrogative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">Interrogative</span></div>
                <h4>Choose the correct question form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="ppastpi-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',0,0,0)">A) Had you finished your homework before dinner?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',0,1,0)">B) Did you had finished your homework before dinner?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',0,2,0)">C) Have you had finished your homework before dinner?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',0,3,0)">D) Had you finish your homework before dinner?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="ppastpi-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',1,0,0)">A) Had she eaten breakfast before school?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',1,1,0)">B) Did she had eaten breakfast before school?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',1,2,0)">C) Has she had eaten breakfast before school?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',1,3,0)">D) Had she eat breakfast before school?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="ppastpi-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',2,0,3)">A) Have they been left before the rain started?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',2,1,3)">B) Did they had left before the rain started?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',2,2,3)">C) Had they been leaving before the rain started?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',2,3,3)">D) Had they left before the rain started?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">4</div>
                <div class="exercise-options" id="ppastpi-opts-3">
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',3,0,0)">A) Had he done his project before the deadline?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',3,1,0)">B) Did he had done his project before the deadline?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',3,2,0)">C) Has he had done his project before the deadline?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',3,3,0)">D) Had he do his project before the deadline.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">5</div>
                <div class="exercise-options" id="ppastpi-opts-4">
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',4,0,2)">A) Had we have arrived before the teacher came?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',4,1,2)">B) Did we had arrived before the teacher came?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',4,2,2)">C) Had we arrived before the teacher came?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',4,3,2)">D) Had we arrive before the teacher came?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">6</div>
                <div class="exercise-options" id="ppastpi-opts-5">
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',5,0,0)">A) Had she seen that film before yesterday?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',5,1,0)">B) Has she seen that film before yesterday?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',5,2,0)">C) Did she had seen that film before yesterday?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastpi',5,3,0)">D) Had she been seeing that film before yesterday?</div>
                </div>
            </div>
        </div>
    </div>

    <div id="ppastp-section-2" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 2</span>
            <span class="practice-section-title">Find Errors</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Error Correction</span></div>
                <h4>Find the error and type the correct form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line">I had <strong style="color:#e04040;text-decoration:underline;">went</strong> to bed early.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastp-p2-1" data-answer="gone" onkeydown="if(event.key==='Enter')checkFill('ppastp-p2-1')"><span class="fill-result" id="ppastp-p2-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line">She had <strong style="color:#e04040;text-decoration:underline;">finish</strong> her project on time.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastp-p2-2" data-answer="finished" onkeydown="if(event.key==='Enter')checkFill('ppastp-p2-2')"><span class="fill-result" id="ppastp-p2-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line">They had <strong style="color:#e04040;text-decoration:underline;">saw</strong> the accident.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastp-p2-3" data-answer="seen" onkeydown="if(event.key==='Enter')checkFill('ppastp-p2-3')"><span class="fill-result" id="ppastp-p2-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line">He had <strong style="color:#e04040;text-decoration:underline;">did</strong> his homework before the teacher entered.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastp-p2-4" data-answer="done" onkeydown="if(event.key==='Enter')checkFill('ppastp-p2-4')"><span class="fill-result" id="ppastp-p2-4-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">5</div><div class="fill-dialogue">
                <div class="fill-line">We had <strong style="color:#e04040;text-decoration:underline;">ate</strong> lunch before the meeting started.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastp-p2-5" data-answer="eaten" onkeydown="if(event.key==='Enter')checkFill('ppastp-p2-5')"><span class="fill-result" id="ppastp-p2-5-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">6</div><div class="fill-dialogue">
                <div class="fill-line">I hadn’t <strong style="color:#e04040;text-decoration:underline;">saw</strong> him for a long time.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastp-p2-6" data-answer="seen" onkeydown="if(event.key==='Enter')checkFill('ppastp-p2-6')"><span class="fill-result" id="ppastp-p2-6-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">7</div><div class="fill-dialogue">
                <div class="fill-line">She had <strong style="color:#e04040;text-decoration:underline;">write</strong> the message before she left.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastp-p2-7" data-answer="written" onkeydown="if(event.key==='Enter')checkFill('ppastp-p2-7')"><span class="fill-result" id="ppastp-p2-7-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">8</div><div class="fill-dialogue">
                <div class="fill-line">They had <strong style="color:#e04040;text-decoration:underline;">be</strong> in London before 2020.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastp-p2-8" data-answer="been" onkeydown="if(event.key==='Enter')checkFill('ppastp-p2-8')"><span class="fill-result" id="ppastp-p2-8-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">9</div><div class="fill-dialogue">
                <div class="fill-line">Had you ever <strong style="color:#e04040;text-decoration:underline;">visit</strong> Paris before?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastp-p2-9" data-answer="visited" onkeydown="if(event.key==='Enter')checkFill('ppastp-p2-9')"><span class="fill-result" id="ppastp-p2-9-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">10</div><div class="fill-dialogue">
                <div class="fill-line">Had he <strong style="color:#e04040;text-decoration:underline;">finish</strong> the test before the bell?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastp-p2-10" data-answer="finished" onkeydown="if(event.key==='Enter')checkFill('ppastp-p2-10')"><span class="fill-result" id="ppastp-p2-10-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">11</div><div class="fill-dialogue">
                <div class="fill-line">She hadn’t <strong style="color:#e04040;text-decoration:underline;">took</strong> the bus that day.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastp-p2-11" data-answer="taken" onkeydown="if(event.key==='Enter')checkFill('ppastp-p2-11')"><span class="fill-result" id="ppastp-p2-11-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">12</div><div class="fill-dialogue">
                <div class="fill-line">We had already <strong style="color:#e04040;text-decoration:underline;">leave</strong> when she arrived.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastp-p2-12" data-answer="left" onkeydown="if(event.key==='Enter')checkFill('ppastp-p2-12')"><span class="fill-result" id="ppastp-p2-12-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div id="ppastp-section-3" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 3</span>
            <span class="practice-section-title">Fill in the Blanks</span>
        </div>
        <!-- Affirmative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) Affirmative</span></div>
                <h4>Use correct Past Perfect affirmative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="ppastp-p3a-1a" placeholder="finish" data-answer="had finished" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3a-1a')"> my homework before dinner.<span class="fill-result" id="ppastp-p3a-1a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Great! I <input class="fill-input" id="ppastp-p3a-1b" placeholder="complete" data-answer="had completed" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3a-1b')"> mine earlier too.<span class="fill-result" id="ppastp-p3a-1b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="ppastp-p3a-2a" placeholder="clean" data-answer="had cleaned" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3a-2a')"> the house before the guests arrived.<span class="fill-result" id="ppastp-p3a-2a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Nice! I <input class="fill-input" id="ppastp-p3a-2b" placeholder="help" data-answer="had helped" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3a-2b')"> my mother before that.<span class="fill-result" id="ppastp-p3a-2b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="ppastp-p3a-3a" placeholder="leave" data-answer="had left" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3a-3a')"> the school before it started raining.<span class="fill-result" id="ppastp-p3a-3a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> I know. We <input class="fill-input" id="ppastp-p3a-3b" placeholder="go" data-answer="had gone" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3a-3b')"> home earlier.<span class="fill-result" id="ppastp-p3a-3b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> He <input class="fill-input" id="ppastp-p3a-4a" placeholder="do" data-answer="had done" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3a-4a')"> his project before the deadline.<span class="fill-result" id="ppastp-p3a-4a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Good! I <input class="fill-input" id="ppastp-p3a-4b" placeholder="prepare" data-answer="had prepared" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3a-4b')"> everything in advance.<span class="fill-result" id="ppastp-p3a-4b-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
        <!-- Negative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) Negative</span></div>
                <h4>Use correct Past Perfect negative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="ppastp-p3b-1a" placeholder="not finish" data-answer="had not finished|hadn't finished" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3b-1a')"> my homework before dinner.<span class="fill-result" id="ppastp-p3b-1a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Me too! I <input class="fill-input" id="ppastp-p3b-1b" placeholder="not complete" data-answer="had not completed|hadn't completed" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3b-1b')"> it on time.<span class="fill-result" id="ppastp-p3b-1b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="ppastp-p3b-2a" placeholder="not study" data-answer="had not studied|hadn't studied" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3b-2a')"> before the test.<span class="fill-result" id="ppastp-p3b-2a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Right! She <input class="fill-input" id="ppastp-p3b-2b" placeholder="not revise" data-answer="had not revised|hadn't revised" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3b-2b')"> anything.<span class="fill-result" id="ppastp-p3b-2b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="ppastp-p3b-3a" placeholder="not leave" data-answer="had not left|hadn't left" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3b-3a')"> when I arrived.<span class="fill-result" id="ppastp-p3b-3a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, they <input class="fill-input" id="ppastp-p3b-3b" placeholder="not go" data-answer="had not gone|hadn't gone" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3b-3b')"> home yet.<span class="fill-result" id="ppastp-p3b-3b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> He <input class="fill-input" id="ppastp-p3b-4a" placeholder="not listen" data-answer="had not listened|hadn't listened" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3b-4a')"> to the instructions.<span class="fill-result" id="ppastp-p3b-4a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> I noticed. He <input class="fill-input" id="ppastp-p3b-4b" placeholder="not understand" data-answer="had not understood|hadn't understood" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3b-4b')"> the task.<span class="fill-result" id="ppastp-p3b-4b-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
        <!-- Questions -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">c) Questions</span></div>
                <h4>Use correct Past Perfect question forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="ppastp-p3c-1a" placeholder="Had" data-answer="Had" style="width:70px;" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3c-1a')"> you <input class="fill-input" id="ppastp-p3c-1b" placeholder="finish" data-answer="finished" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3c-1b')"> your homework before dinner?<span class="fill-result" id="ppastp-p3c-1a-res"></span><span class="fill-result" id="ppastp-p3c-1b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, I had.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="ppastp-p3c-2a" placeholder="Had" data-answer="Had" style="width:70px;" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3c-2a')"> she <input class="fill-input" id="ppastp-p3c-2b" placeholder="clean" data-answer="cleaned" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3c-2b')"> the room before the guests arrived?<span class="fill-result" id="ppastp-p3c-2a-res"></span><span class="fill-result" id="ppastp-p3c-2b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> No, she hadn’t.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="ppastp-p3c-3a" placeholder="Had" data-answer="Had" style="width:70px;" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3c-3a')"> they <input class="fill-input" id="ppastp-p3c-3b" placeholder="leave" data-answer="left" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3c-3b')"> before the rain started?<span class="fill-result" id="ppastp-p3c-3a-res"></span><span class="fill-result" id="ppastp-p3c-3b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, they had.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="ppastp-p3c-4a" placeholder="Had" data-answer="Had" style="width:70px;" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3c-4a')"> he <input class="fill-input" id="ppastp-p3c-4b" placeholder="do" data-answer="done" onkeydown="if(event.key==='Enter')checkFill('ppastp-p3c-4b')"> his project before the deadline?<span class="fill-result" id="ppastp-p3c-4a-res"></span><span class="fill-result" id="ppastp-p3c-4b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> No, he hadn’t.</div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div id="ppastp-section-4" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 4</span>
            <span class="practice-section-title">Rewrite the Sentences</span>
        </div>
        <!-- To Affirmative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) To Affirmative</span></div>
                <h4>Rewrite the sentence in affirmative form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She hadn’t finished her homework.</div>
                <div class="fill-line"><input class="fill-input" id="ppastp-p4a-1" placeholder="rewrite..." data-answer="she had finished her homework." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppastp-p4a-1')"><span class="fill-result" id="ppastp-p4a-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">They hadn’t left the school.</div>
                <div class="fill-line"><input class="fill-input" id="ppastp-p4a-2" placeholder="rewrite..." data-answer="they had left the school." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppastp-p4a-2')"><span class="fill-result" id="ppastp-p4a-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">He hadn’t done his project.</div>
                <div class="fill-line"><input class="fill-input" id="ppastp-p4a-3" placeholder="rewrite..." data-answer="he had done his project." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppastp-p4a-3')"><span class="fill-result" id="ppastp-p4a-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">We hadn’t met before the party.</div>
                <div class="fill-line"><input class="fill-input" id="ppastp-p4a-4" placeholder="rewrite..." data-answer="we had met before the party." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppastp-p4a-4')"><span class="fill-result" id="ppastp-p4a-4-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>

        <!-- To Negative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) To Negative</span></div>
                <h4>Rewrite the sentence in negative form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She had eaten breakfast.</div>
                <div class="fill-line"><input class="fill-input" id="ppastp-p4b-1" placeholder="rewrite..." data-answer="she hadn't eaten breakfast.|she had not eaten breakfast." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppastp-p4b-1')"><span class="fill-result" id="ppastp-p4b-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">They had arrived early.</div>
                <div class="fill-line"><input class="fill-input" id="ppastp-p4b-2" placeholder="rewrite..." data-answer="they hadn't arrived early.|they had not arrived early." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppastp-p4b-2')"><span class="fill-result" id="ppastp-p4b-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">He had seen that film before.</div>
                <div class="fill-line"><input class="fill-input" id="ppastp-p4b-3" placeholder="rewrite..." data-answer="he hadn't seen that film before.|he had not seen that film before." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppastp-p4b-3')"><span class="fill-result" id="ppastp-p4b-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">We had finished the test.</div>
                <div class="fill-line"><input class="fill-input" id="ppastp-p4b-4" placeholder="rewrite..." data-answer="we hadn't finished the test.|we had not finished the test." style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppastp-p4b-4')"><span class="fill-result" id="ppastp-p4b-4-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>

        <!-- To Question -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">c) To Question</span></div>
                <h4>Rewrite the sentence in question form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">I had done my homework.</div>
                <div class="fill-line"><input class="fill-input" id="ppastp-p4c-1" placeholder="rewrite..." data-answer="had i done my homework?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppastp-p4c-1')"><span class="fill-result" id="ppastp-p4c-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">He had left the house.</div>
                <div class="fill-line"><input class="fill-input" id="ppastp-p4c-2" placeholder="rewrite..." data-answer="had he left the house?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppastp-p4c-2')"><span class="fill-result" id="ppastp-p4c-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">We had studied for the test.</div>
                <div class="fill-line"><input class="fill-input" id="ppastp-p4c-3" placeholder="rewrite..." data-answer="had we studied for the test?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppastp-p4c-3')"><span class="fill-result" id="ppastp-p4c-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She had cooked dinner.</div>
                <div class="fill-line"><input class="fill-input" id="ppastp-p4c-4" placeholder="rewrite..." data-answer="had she cooked dinner?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppastp-p4c-4')"><span class="fill-result" id="ppastp-p4c-4-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div class="get-result-bar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button class="get-result-btn" onclick="getResult()">
            📊 Get Result
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(70)" style="background:#22c55e;color:#ffffff;border:none;">
            ✅ Done
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(67)" style="background:#ef4444;color:#ffffff;border:none;">
            ⚠️ Retake
        </button>
    </div>
</div>
`;
}

/**
 * Switch between practice sections for Present Simple
 */
function switchPresentSimpleSection(num) {
    const sectionTitles = ["Multiple Choice", "Find Errors", "Fill in the Blanks", "Rewrite the Sentences"];

    const dropdown = document.getElementById('ps-pres-practice-dropdown');
    if (dropdown) dropdown.classList.remove('open');

    const sections = ['ps-pres-section-1', 'ps-pres-section-2', 'ps-pres-section-3', 'ps-pres-section-4'];
    sections.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) el.style.display = (idx + 1 === num) ? 'block' : 'none';
    });

    const currentSectionTitle = document.getElementById('ps-pres-current-section');
    if (currentSectionTitle) currentSectionTitle.textContent = `Practice ${num}: ${sectionTitles[num - 1]}`;
    
}

function renderPresentSimplePracticeTasks(container) {
    container.innerHTML = `
<div class="practice-tasks-container">
    <div class="pc-practice-header" style="margin-bottom: 25px;">
        <div class="pc-dropdown-container" id="ps-pres-practice-dropdown">
            <div class="pc-dropdown-trigger" onclick="this.parentElement.classList.toggle('open')">
                <span id="ps-pres-current-section">Practice 1: Multiple Choice</span>
                <span class="dropdown-arrow">▼</span>
            </div>
            <div class="pc-dropdown-menu">
                <div class="pc-dropdown-item" onclick="switchPresentSimpleSection(1)">Practice 1: Multiple Choice</div>
                <div class="pc-dropdown-item" onclick="switchPresentSimpleSection(2)">Practice 2: Find Errors</div>
                <div class="pc-dropdown-item" onclick="switchPresentSimpleSection(3)">Practice 3: Fill in the Blanks</div>
                <div class="pc-dropdown-item" onclick="switchPresentSimpleSection(4)">Practice 4: Rewrite the Sentences</div>
            </div>
        </div>
    </div>

    <div id="ps-pres-section-1">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 1</span>
            <span class="practice-section-title">Multiple Choice</span>
        </div>

        <!-- Affirmative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Affirmative</span></div>
                <h4>Choose the correct affirmative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="aff-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'aff',0,0,1)">A) She go to school every day.</div>
                    <div class="option" onclick="selectPracticeOption(event,'aff',0,1,1)">B) She goes to school every day.</div>
                    <div class="option" onclick="selectPracticeOption(event,'aff',0,2,1)">C) She going to school every day.</div>
                    <div class="option" onclick="selectPracticeOption(event,'aff',0,3,1)">D) She gone to school every day.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="aff-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'aff',1,0,3)">A) He play football on weekends.</div>
                    <div class="option" onclick="selectPracticeOption(event,'aff',1,1,3)">B) He played football on weekends.</div>
                    <div class="option" onclick="selectPracticeOption(event,'aff',1,2,3)">C) He playing football on weekends.</div>
                    <div class="option" onclick="selectPracticeOption(event,'aff',1,3,3)">D) He plays football on weekends.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="aff-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'aff',2,0,0)">A) They watch TV every evening.</div>
                    <div class="option" onclick="selectPracticeOption(event,'aff',2,1,0)">B) They watches TV every evening.</div>
                    <div class="option" onclick="selectPracticeOption(event,'aff',2,2,0)">C) They watching TV every evening.</div>
                    <div class="option" onclick="selectPracticeOption(event,'aff',2,3,0)">D) They watched TV every evening.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">4</div>
                <div class="exercise-options" id="aff-opts-3">
                    <div class="option" onclick="selectPracticeOption(event,'aff',3,0,2)">A) I is a student.</div>
                    <div class="option" onclick="selectPracticeOption(event,'aff',3,1,2)">B) I are a student.</div>
                    <div class="option" onclick="selectPracticeOption(event,'aff',3,2,2)">C) I am a student.</div>
                    <div class="option" onclick="selectPracticeOption(event,'aff',3,3,2)">D) I be a student.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">5</div>
                <div class="exercise-options" id="aff-opts-4">
                    <div class="option" onclick="selectPracticeOption(event,'aff',4,0,1)">A) They is very happy today.</div>
                    <div class="option" onclick="selectPracticeOption(event,'aff',4,1,1)">B) They are very happy today.</div>
                    <div class="option" onclick="selectPracticeOption(event,'aff',4,2,1)">C) They am very happy today.</div>
                    <div class="option" onclick="selectPracticeOption(event,'aff',4,3,1)">D) They be very happy today.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">6</div>
                <div class="exercise-options" id="aff-opts-5">
                    <div class="option" onclick="selectPracticeOption(event,'aff',5,0,3)">A) He are a great doctor.</div>
                    <div class="option" onclick="selectPracticeOption(event,'aff',5,1,3)">B) He am a great doctor.</div>
                    <div class="option" onclick="selectPracticeOption(event,'aff',5,2,3)">C) He be a great doctor.</div>
                    <div class="option" onclick="selectPracticeOption(event,'aff',5,3,3)">D) He is a great doctor.</div>
                </div>
            </div>
        </div>

        <!-- Negative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">Negative</span></div>
                <h4>Choose the correct negative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="neg-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'neg',0,0,1)">A) We doesn’t study every day.</div>
                    <div class="option" onclick="selectPracticeOption(event,'neg',0,1,1)">B) We don’t study every day.</div>
                    <div class="option" onclick="selectPracticeOption(event,'neg',0,2,1)">C) We not study every day.</div>
                    <div class="option" onclick="selectPracticeOption(event,'neg',0,3,1)">D) We don’t studies every day.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="neg-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'neg',1,0,3)">A) She don’t eat vegetables.</div>
                    <div class="option" onclick="selectPracticeOption(event,'neg',1,1,3)">B) She doesn’t eats vegetables.</div>
                    <div class="option" onclick="selectPracticeOption(event,'neg',1,2,3)">C) She not eats vegetables.</div>
                    <div class="option" onclick="selectPracticeOption(event,'neg',1,3,3)">D) She doesn’t eat vegetables.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="neg-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'neg',2,0,2)">A) You doesn’t live here.</div>
                    <div class="option" onclick="selectPracticeOption(event,'neg',2,1,2)">B) You not live here.</div>
                    <div class="option" onclick="selectPracticeOption(event,'neg',2,2,2)">C) You don't live here.</div>
                    <div class="option" onclick="selectPracticeOption(event,'neg',2,3,2)">D) You don’t lives here.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">4</div>
                <div class="exercise-options" id="neg-opts-3">
                    <div class="option" onclick="selectPracticeOption(event,'neg',3,0,2)">A) I not am a student.</div>
                    <div class="option" onclick="selectPracticeOption(event,'neg',3,1,2)">B) I don’t am a student.</div>
                    <div class="option" onclick="selectPracticeOption(event,'neg',3,2,2)">C) I am not a student.</div>
                    <div class="option" onclick="selectPracticeOption(event,'neg',3,3,2)">D) I amn’t a student.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">5</div>
                <div class="exercise-options" id="neg-opts-4">
                    <div class="option" onclick="selectPracticeOption(event,'neg',4,0,1)">A) She doesn’t is my friend.</div>
                    <div class="option" onclick="selectPracticeOption(event,'neg',4,1,1)">B) She is not my friend.</div>
                    <div class="option" onclick="selectPracticeOption(event,'neg',4,2,1)">C) She not is my friend.</div>
                    <div class="option" onclick="selectPracticeOption(event,'neg',4,3,1)">D) She isn’t be my friend.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">6</div>
                <div class="exercise-options" id="neg-opts-5">
                    <div class="option" onclick="selectPracticeOption(event,'neg',5,0,1)">A) They aren’t be at home.</div>
                    <div class="option" onclick="selectPracticeOption(event,'neg',5,1,1)">B) They are not at home.</div>
                    <div class="option" onclick="selectPracticeOption(event,'neg',5,2,1)">C) They don’t are at home.</div>
                    <div class="option" onclick="selectPracticeOption(event,'neg',5,3,1)">D) They not are at home.</div>
                </div>
            </div>
        </div>

        <!-- Interrogative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">Interrogative</span></div>
                <h4>Choose the correct question form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="int-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'int',0,0,3)">A) Do they lives here?</div>
                    <div class="option" onclick="selectPracticeOption(event,'int',0,1,3)">B) Are they live here?</div>
                    <div class="option" onclick="selectPracticeOption(event,'int',0,2,3)">C) Does they live here?</div>
                    <div class="option" onclick="selectPracticeOption(event,'int',0,3,3)">D) Do they live here?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="int-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'int',1,0,2)">A) Does you play football?</div>
                    <div class="option" onclick="selectPracticeOption(event,'int',1,1,2)">B) Do you plays football?</div>
                    <div class="option" onclick="selectPracticeOption(event,'int',1,2,2)">C) Do you play football?</div>
                    <div class="option" onclick="selectPracticeOption(event,'int',1,3,2)">D) Are you play football?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="int-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'int',2,0,0)">A) Does she drive a car?</div>
                    <div class="option" onclick="selectPracticeOption(event,'int',2,1,0)">B) Does she drives a car?</div>
                    <div class="option" onclick="selectPracticeOption(event,'int',2,2,0)">C) Do she drive a car?</div>
                    <div class="option" onclick="selectPracticeOption(event,'int',2,3,0)">D) Is she drive a car?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">4</div>
                <div class="exercise-options" id="int-opts-3">
                    <div class="option" onclick="selectPracticeOption(event,'int',3,0,2)">A) I am ready for the lesson?</div>
                    <div class="option" onclick="selectPracticeOption(event,'int',3,1,2)">B) Do I am ready for the lesson?</div>
                    <div class="option" onclick="selectPracticeOption(event,'int',3,2,2)">C) Am I ready for the lesson?</div>
                    <div class="option" onclick="selectPracticeOption(event,'int',3,3,2)">D) Am I is ready for the lesson?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">5</div>
                <div class="exercise-options" id="int-opts-4">
                    <div class="option" onclick="selectPracticeOption(event,'int',4,0,3)">A) Does she is happy today?</div>
                    <div class="option" onclick="selectPracticeOption(event,'int',4,1,3)">B) She is happy today?</div>
                    <div class="option" onclick="selectPracticeOption(event,'int',4,2,3)">C) She is happy today?</div>
                    <div class="option" onclick="selectPracticeOption(event,'int',4,3,3)">D) Is she happy today?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">6</div>
                <div class="exercise-options" id="int-opts-5">
                    <div class="option" onclick="selectPracticeOption(event,'int',5,0,2)">A) Are they is at home now?</div>
                    <div class="option" onclick="selectPracticeOption(event,'int',5,1,2)">B) Do they are at home now?</div>
                    <div class="option" onclick="selectPracticeOption(event,'int',5,2,2)">C) Are they at home now?</div>
                    <div class="option" onclick="selectPracticeOption(event,'int',5,3,2)">D) They are at home now?</div>
                </div>
            </div>
        </div>
    </div>

    <div id="ps-pres-section-2" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 2</span>
            <span class="practice-section-title">Find Errors</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Error Correction</span></div>
                <h4>Find the error and type the correct word.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line">He <strong style="color:#e04040;text-decoration:underline;">go</strong> to the gym every morning to stay healthy and strong.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ps-pres-p2-1" data-answer="goes" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p2-1')"><span class="fill-result" id="ps-pres-p2-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line">She <strong style="color:#e04040;text-decoration:underline;">enjoy</strong> reading novels before going to bed every night.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ps-pres-p2-2" data-answer="enjoys" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p2-2')"><span class="fill-result" id="ps-pres-p2-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line">I <strong style="color:#e04040;text-decoration:underline;">is</strong> a teacher at a local school.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ps-pres-p2-3" data-answer="am" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p2-3')"><span class="fill-result" id="ps-pres-p2-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line">She <strong style="color:#e04040;text-decoration:underline;">are</strong> very good at playing the piano.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ps-pres-p2-4" data-answer="is" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p2-4')"><span class="fill-result" id="ps-pres-p2-4-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">5</div><div class="fill-dialogue">
                <div class="fill-line">He <strong style="color:#e04040;text-decoration:underline;">don’t</strong> eat breakfast at home because he is always late for school.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ps-pres-p2-5" data-answer="doesn't" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p2-5')"><span class="fill-result" id="ps-pres-p2-5-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">6</div><div class="fill-dialogue">
                <div class="fill-line">She <strong style="color:#e04040;text-decoration:underline;">not</strong> like spicy food, so she avoids it in every meal.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ps-pres-p2-6" data-answer="doesn't" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p2-6')"><span class="fill-result" id="ps-pres-p2-6-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">7</div><div class="fill-dialogue">
                <div class="fill-line">They <strong style="color:#e04040;text-decoration:underline;">doesn’t</strong> go to the park on weekends because it often rains.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ps-pres-p2-7" data-answer="don't" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p2-7')"><span class="fill-result" id="ps-pres-p2-7-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">8</div><div class="fill-dialogue">
                <div class="fill-line">I <strong style="color:#e04040;text-decoration:underline;">isn’t</strong> a student anymore, I work for a company now.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ps-pres-p2-8" data-answer="am not" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p2-8')"><span class="fill-result" id="ps-pres-p2-8-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">9</div><div class="fill-dialogue">
                <div class="fill-line"><strong style="color:#e04040;text-decoration:underline;">Do</strong> she go to the gym every morning to stay fit?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ps-pres-p2-9" data-answer="Does" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p2-9')"><span class="fill-result" id="ps-pres-p2-9-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">10</div><div class="fill-dialogue">
                <div class="fill-line"><strong style="color:#e04040;text-decoration:underline;">Does</strong> they play football after school on Fridays?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ps-pres-p2-10" data-answer="Do" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p2-10')"><span class="fill-result" id="ps-pres-p2-10-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">11</div><div class="fill-dialogue">
                <div class="fill-line"><strong style="color:#e04040;text-decoration:underline;">Am</strong> she a teacher at a local school?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ps-pres-p2-11" data-answer="Is" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p2-11')"><span class="fill-result" id="ps-pres-p2-11-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">12</div><div class="fill-dialogue">
                <div class="fill-line"><strong style="color:#e04040;text-decoration:underline;">Is</strong> they from Italy?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ps-pres-p2-12" data-answer="Are" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p2-12')"><span class="fill-result" id="ps-pres-p2-12-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div id="ps-pres-section-3" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 3</span>
            <span class="practice-section-title">Fill in the Blanks</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) Affirmative</span></div>
                <h4>Use correct Present Simple affirmative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="ps-pres-p3a-1a" placeholder="read" data-answer="read" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3a-1a')"> a book every evening.<span class="fill-result" id="ps-pres-p3a-1a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> That’s great! I <input class="fill-input" id="ps-pres-p3a-1b" placeholder="listen" data-answer="listen" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3a-1b')"> to music while reading.<span class="fill-result" id="ps-pres-p3a-1b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="ps-pres-p3a-2a" placeholder="teach" data-answer="teaches" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3a-2a')"> French at school.<span class="fill-result" id="ps-pres-p3a-2a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Wow! She <input class="fill-input" id="ps-pres-p3a-2b" placeholder="help" data-answer="helps" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3a-2b')"> many students learn the language.<span class="fill-result" id="ps-pres-p3a-2b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="ps-pres-p3a-3a" placeholder="walk" data-answer="walk" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3a-3a')"> to school together.<span class="fill-result" id="ps-pres-p3a-3a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, they <input class="fill-input" id="ps-pres-p3a-3b" placeholder="talk" data-answer="talk" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3a-3b')"> and <input class="fill-input" id="ps-pres-p3a-3c" placeholder="laugh" data-answer="laugh" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3a-3c')"> on the way.<span class="fill-result" id="ps-pres-p3a-3b-res"></span><span class="fill-result" id="ps-pres-p3a-3c-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> He <input class="fill-input" id="ps-pres-p3a-4a" placeholder="play" data-answer="plays" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3a-4a')"> the guitar in a band.<span class="fill-result" id="ps-pres-p3a-4a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Cool! He <input class="fill-input" id="ps-pres-p3a-4b" placeholder="practice" data-answer="practices" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3a-4b')"> every afternoon.<span class="fill-result" id="ps-pres-p3a-4b-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) Negative</span></div>
                <h4>Use correct Present Simple negative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="ps-pres-p3b-1a" placeholder="not drink" data-answer="don't drink|do not drink" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3b-1a')"> anything in the morning.<span class="fill-result" id="ps-pres-p3b-1a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> My brother too! He <input class="fill-input" id="ps-pres-p3b-1b" placeholder="not eat" data-answer="doesn't eat|does not eat" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3b-1b')"> breakfast in the mornings.<span class="fill-result" id="ps-pres-p3b-1b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> My parents <input class="fill-input" id="ps-pres-p3b-2a" placeholder="not work" data-answer="don't work|do not work" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3b-2a')"> in an office.<span class="fill-result" id="ps-pres-p3b-2a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Mine neither, and they <input class="fill-input" id="ps-pres-p3b-2b" placeholder="not leave" data-answer="don't leave|do not leave" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3b-2b')"> early in the mornings.<span class="fill-result" id="ps-pres-p3b-2b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="ps-pres-p3b-3a" placeholder="not be" data-answer="am not" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3b-3a')"> a student.<span class="fill-result" id="ps-pres-p3b-3a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> That’s interesting! I <input class="fill-input" id="ps-pres-p3b-3b" placeholder="not be" data-answer="am not" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3b-3b')"> a student either.<span class="fill-result" id="ps-pres-p3b-3b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="ps-pres-p3b-4a" placeholder="not be" data-answer="isn't|is not" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3b-4a')"> good at playing the piano.<span class="fill-result" id="ps-pres-p3b-4a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> You are right! She <input class="fill-input" id="ps-pres-p3b-4b" placeholder="not be" data-answer="isn't|is not" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3b-4b')"> a good player.<span class="fill-result" id="ps-pres-p3b-4b-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">c) Questions</span></div>
                <h4>Fill in the blanks to form questions.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="ps-pres-p3c-1a" style="width:70px;" placeholder="Do/Does" data-answer="Do" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3c-1a')"> you <input class="fill-input" id="ps-pres-p3c-1b" placeholder="like" data-answer="like" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3c-1b')"> reading novels?</div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, I do.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="ps-pres-p3c-2a" style="width:70px;" placeholder="Do/Does" data-answer="Does" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3c-2a')"> he <input class="fill-input" id="ps-pres-p3c-2b" placeholder="play" data-answer="play" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3c-2b')"> football on weekends?</div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> No, he doesn’t.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="ps-pres-p3c-3a" style="width:70px;" placeholder="Do/Does" data-answer="Do" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3c-3a')"> they <input class="fill-input" id="ps-pres-p3c-3b" placeholder="go" data-answer="go" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3c-3b')"> to school by bus?</div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, they do.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="ps-pres-p3c-4a" style="width:70px;" placeholder="Do/Does" data-answer="Does" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3c-4a')"> she <input class="fill-input" id="ps-pres-p3c-4b" placeholder="work" data-answer="work" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p3c-4b')"> in a restaurant?</div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> No, she doesn’t.</div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div id="ps-pres-section-4" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 4</span>
            <span class="practice-section-title">Rewrite the Sentences</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) To Affirmative</span></div>
                <h4>Rewrite in affirmative form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She doesn’t eat breakfast in the morning because she wakes up early.</div>
                <div class="fill-line"><input class="fill-input" id="ps-pres-p4a-1" data-answer="she eats breakfast in the morning because she wakes up early." style="width:100%;" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p4a-1')"><span class="fill-result" id="ps-pres-p4a-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">They don’t play football on weekends because it is often sunny.</div>
                <div class="fill-line"><input class="fill-input" id="ps-pres-p4a-2" data-answer="they play football on weekends because it is often sunny." style="width:100%;" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p4a-2')"><span class="fill-result" id="ps-pres-p4a-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">He doesn’t watch TV after school; he doesn’t like reading books.</div>
                <div class="fill-line"><input class="fill-input" id="ps-pres-p4a-3" data-answer="he watches tv after school; he likes reading books." style="width:100%;" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p4a-3')"><span class="fill-result" id="ps-pres-p4a-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She isn’t happy today.</div>
                <div class="fill-line"><input class="fill-input" id="ps-pres-p4a-4" data-answer="she is happy today." style="width:100%;" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p4a-4')"><span class="fill-result" id="ps-pres-p4a-4-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) To Negative</span></div>
                <h4>Rewrite in negative form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She drinks coffee every morning before school.</div>
                <div class="fill-line"><input class="fill-input" id="ps-pres-p4b-1" data-answer="she doesn't drink coffee every morning before school." style="width:100%;" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p4b-1')"><span class="fill-result" id="ps-pres-p4b-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">They play football on Saturdays in the park.</div>
                <div class="fill-line"><input class="fill-input" id="ps-pres-p4b-2" data-answer="they don't play football on saturdays in the park." style="width:100%;" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p4b-2')"><span class="fill-result" id="ps-pres-p4b-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">He watches TV after finishing his homework.</div>
                <div class="fill-line"><input class="fill-input" id="ps-pres-p4b-3" data-answer="he doesn't watch tv after finishing his homework." style="width:100%;" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p4b-3')"><span class="fill-result" id="ps-pres-p4b-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">I am ready for the lesson.</div>
                <div class="fill-line"><input class="fill-input" id="ps-pres-p4b-4" data-answer="i am not ready for the lesson." style="width:100%;" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p4b-4')"><span class="fill-result" id="ps-pres-p4b-4-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">c) To Question</span></div>
                <h4>Rewrite in question form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She studies English at school every day.</div>
                <div class="fill-line"><input class="fill-input" id="ps-pres-p4c-1" data-answer="does she study english at school every day?" style="width:100%;" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p4c-1')"><span class="fill-result" id="ps-pres-p4c-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">He walks to work in the morning.</div>
                <div class="fill-line"><input class="fill-input" id="ps-pres-p4c-2" data-answer="does he walk to work in the morning?" style="width:100%;" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p4c-2')"><span class="fill-result" id="ps-pres-p4c-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">We clean our classroom after the lessons finish.</div>
                <div class="fill-line"><input class="fill-input" id="ps-pres-p4c-3" data-answer="do we clean our classroom after the lessons finish?" style="width:100%;" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p4c-3')"><span class="fill-result" id="ps-pres-p4c-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">They are in the park now.</div>
                <div class="fill-line"><input class="fill-input" id="ps-pres-p4c-4" data-answer="are they in the park now?" style="width:100%;" onkeydown="if(event.key==='Enter')checkFill('ps-pres-p4c-4')"><span class="fill-result" id="ps-pres-p4c-4-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div class="get-result-bar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button class="get-result-btn" onclick="getResult()">
            📊 Get Result
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(70)" style="background:#22c55e;color:#ffffff;border:none;">
            ✅ Done
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(67)" style="background:#ef4444;color:#ffffff;border:none;">
            ⚠️ Retake
        </button>
    </div>
</div>
`;
}

function renderPresentPerfectContinuousPracticeTasks(container) {
    container.innerHTML = `
<div class="practice-tasks-container">
    <div class="pc-practice-header" style="margin-bottom: 25px;">
        <div class="pc-dropdown-container" id="ppcont-practice-dropdown">
            <div class="pc-dropdown-trigger" onclick="this.parentElement.classList.toggle('open')">
                <span id="ppcont-current-section">Practice 1: Multiple Choice</span>
                <span class="dropdown-arrow">▼</span>
            </div>
            <div class="pc-dropdown-menu">
                <div class="pc-dropdown-item" onclick="switchPPContSection(1)">Practice 1: Multiple Choice</div>
                <div class="pc-dropdown-item" onclick="switchPPContSection(2)">Practice 2: Find Errors</div>
                <div class="pc-dropdown-item" onclick="switchPPContSection(3)">Practice 3: Fill in the Blanks</div>
                <div class="pc-dropdown-item" onclick="switchPPContSection(4)">Practice 4: Rewrite the Sentences</div>
            </div>
        </div>
    </div>

        <div id="ppcont-section-1">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 1</span>
            <span class="practice-section-title">Multiple Choice</span>
        </div>

        <!-- Affirmative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Affirmative</span></div>
                <h4>Choose the correct affirmative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="ppca-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'ppca',0,0,1)">A) I have been draw for two hours.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppca',0,1,1)">B) I have been drawing for two hours.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppca',0,2,1)">C) I has been drawing for two hours.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppca',0,3,1)">D) I am been drawing for two hours.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="ppca-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'ppca',1,0,0)">A) They have been building a house since June.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppca',1,1,0)">B) They has been building a house since June.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppca',1,2,0)">C) They have been build a house since June.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppca',1,3,0)">D) They are been building a house since June.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="ppca-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'ppca',2,0,2)">A) She have been practicing the piano all day.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppca',2,1,2)">B) She has been practice the piano all day.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppca',2,2,2)">C) She has been practicing the piano all day.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppca',2,3,2)">D) She is been practicing the piano all day.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">4</div>
                <div class="exercise-options" id="ppca-opts-3">
                    <div class="option" onclick="selectPracticeOption(event,'ppca',3,0,3)">A) We were traveling since morning.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppca',3,1,3)">B) We has been traveling since morning.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppca',3,2,3)">C) We have been travel since morning.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppca',3,3,3)">D) We have been traveling since morning.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">5</div>
                <div class="exercise-options" id="ppca-opts-4">
                    <div class="option" onclick="selectPracticeOption(event,'ppca',4,0,2)">A) He was been fixing his bike for two hours.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppca',4,1,2)">B) He have been fixing his bike for two hours.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppca',4,2,2)">C) He has been fixing his bike for two hours.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppca',4,3,2)">D) He has been fix his bike for two hours.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">6</div>
                <div class="exercise-options" id="ppca-opts-5">
                    <div class="option" onclick="selectPracticeOption(event,'ppca',5,0,3)">A) I am been learning Spanish recently.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppca',5,1,3)">B) I has been learning Spanish recently.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppca',5,2,3)">C) I have been learn Spanish recently.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppca',5,3,3)">D) I have been learning Spanish recently.</div>
                </div>
            </div>
        </div>

        <!-- Negative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">Negative</span></div>
                <h4>Choose the correct negative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="ppcn-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',0,0,2)">A) She hasn’t working today.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',0,1,2)">B) She hasn’t been worked today.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',0,2,2)">C) She hasn’t been working today.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',0,3,2)">D) She not has been working today.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="ppcn-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',1,0,0)">A) I haven’t been sleeping well lately.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',1,1,0)">B) I not have been sleeping well lately.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',1,2,0)">C) I haven’t sleeping well lately.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',1,3,0)">D) I haven’t been slept well lately.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="ppcn-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',2,0,1)">A) They hasn’t been cleaning the room.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',2,1,1)">B) They haven’t been cleaning the room.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',2,2,1)">C) They not have been cleaning the room.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',2,3,1)">D) They haven’t been clean the room.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">4</div>
                <div class="exercise-options" id="ppcn-opts-3">
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',3,0,1)">A) He not has been exercising this week.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',3,1,1)">B) He hasn’t been exercising this week.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',3,2,1)">C) He hasn’t exercising this week.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',3,3,1)">D) He hasn’t been exercised this week.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">5</div>
                <div class="exercise-options" id="ppcn-opts-4">
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',4,0,0)">A) We haven’t been preparing for the test.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',4,1,0)">B) We hasn’t been preparing for the test.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',4,2,0)">C) We not have been preparing for the test.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',4,3,0)">D) We haven’t been prepare for the test.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">6</div>
                <div class="exercise-options" id="ppcn-opts-5">
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',5,0,2)">A) She hasn’t painting lately.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',5,1,2)">B) She not has been painting lately.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',5,2,2)">C) She hasn’t been painting lately.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppcn',5,3,2)">D) She hasn’t been painted lately.</div>
                </div>
            </div>
        </div>

        <!-- Interrogative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">Interrogative</span></div>
                <h4>Choose the correct question form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="ppci-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'ppci',0,0,1)">A) Did you been drawing?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppci',0,1,1)">B) Have you been drawing?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppci',0,2,1)">C) Have you drawing?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppci',0,3,1)">D) Are you been drawing?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="ppci-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'ppci',1,0,3)">A) Did she been practicing the piano?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppci',1,1,3)">B) Has she practicing the piano?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppci',1,2,3)">C) Is she been practicing the piano?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppci',1,3,3)">D) Has she been practicing the piano?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="ppci-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'ppci',2,0,2)">A) Have they building a house?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppci',2,1,2)">B) Are they been building a house?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppci',2,2,2)">C) Have they been building a house?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppci',2,3,2)">D) Did they been building a house?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">4</div>
                <div class="exercise-options" id="ppci-opts-3">
                    <div class="option" onclick="selectPracticeOption(event,'ppci',3,0,0)">A) Has he been fixing his bike?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppci',3,1,0)">B) Did he been fixing his bike?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppci',3,2,0)">C) Has he fixing his bike?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppci',3,3,0)">D) Is he been fixing his bike?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">5</div>
                <div class="exercise-options" id="ppci-opts-4">
                    <div class="option" onclick="selectPracticeOption(event,'ppci',4,0,3)">A) Have we traveling?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppci',4,1,3)">B) Are we been traveling?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppci',4,2,3)">C) Did we been traveling?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppci',4,3,3)">D) Have we been traveling?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">6</div>
                <div class="exercise-options" id="ppci-opts-5">
                    <div class="option" onclick="selectPracticeOption(event,'ppci',5,0,2)">A) Has she using her laptop?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppci',5,1,2)">B) Did she been using her laptop?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppci',5,2,2)">C) Has she been using her laptop?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppci',5,3,2)">D) Is she been using her laptop?</div>
                </div>
            </div>
        </div>
    </div>

    <div id="ppcont-section-2" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 2</span>
            <span class="practice-section-title">Find Errors</span>
        </div>

        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Error Correction</span></div>
                <h4>Find the error and type the correct form.</h4>
            </div>

            <div class="fill-exercise">
                <div class="fill-q-num">1</div>
                <div class="fill-dialogue">
                    <div class="fill-line">I have been <strong style="color:#e04040;text-decoration:underline;">drive</strong> for three hours.</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppcont-p2-1" placeholder="correction..." data-answer="driving" onkeydown="if(event.key==='Enter')checkFill('ppcont-p2-1')"><span class="fill-result" id="ppcont-p2-1-res"></span></div>
                </div>
            </div>

            <div class="fill-exercise">
                <div class="fill-q-num">2</div>
                <div class="fill-dialogue">
                    <div class="fill-line">She <strong style="color:#e04040;text-decoration:underline;">have paint</strong> her room since morning.</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppcont-p2-2" placeholder="correction..." data-answer="has been painting" onkeydown="if(event.key==='Enter')checkFill('ppcont-p2-2')"><span class="fill-result" id="ppcont-p2-2-res"></span></div>
                </div>
            </div>

            <div class="fill-exercise">
                <div class="fill-q-num">3</div>
                <div class="fill-dialogue">
                    <div class="fill-line">They have been <strong style="color:#e04040;text-decoration:underline;">build</strong> a new house this year.</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppcont-p2-3" placeholder="correction..." data-answer="building" onkeydown="if(event.key==='Enter')checkFill('ppcont-p2-3')"><span class="fill-result" id="ppcont-p2-3-res"></span></div>
                </div>
            </div>

            <div class="fill-exercise">
                <div class="fill-q-num">4</div>
                <div class="fill-dialogue">
                    <div class="fill-line">He has been <strong style="color:#e04040;text-decoration:underline;">fix</strong> his bike all afternoon.</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppcont-p2-4" placeholder="correction..." data-answer="fixing" onkeydown="if(event.key==='Enter')checkFill('ppcont-p2-4')"><span class="fill-result" id="ppcont-p2-4-res"></span></div>
                </div>
            </div>

            <div class="fill-exercise">
                <div class="fill-q-num">5</div>
                <div class="fill-dialogue">
                    <div class="fill-line">We <strong style="color:#e04040;text-decoration:underline;">has be learn</strong> French recently.</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppcont-p2-5" placeholder="correction..." data-answer="have been learning" onkeydown="if(event.key==='Enter')checkFill('ppcont-p2-5')"><span class="fill-result" id="ppcont-p2-5-res"></span></div>
                </div>
            </div>

            <div class="fill-exercise">
                <div class="fill-q-num">6</div>
                <div class="fill-dialogue">
                    <div class="fill-line">I <strong style="color:#e04040;text-decoration:underline;">hasn’t being eat</strong> well lately.</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppcont-p2-6" placeholder="correction..." data-answer="haven't been eating|have not been eating" onkeydown="if(event.key==='Enter')checkFill('ppcont-p2-6')"><span class="fill-result" id="ppcont-p2-6-res"></span></div>
                </div>
            </div>

            <div class="fill-exercise">
                <div class="fill-q-num">7</div>
                <div class="fill-dialogue">
                    <div class="fill-line">She hasn’t been <strong style="color:#e04040;text-decoration:underline;">wear</strong> her glasses today.</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppcont-p2-7" placeholder="correction..." data-answer="wearing" onkeydown="if(event.key==='Enter')checkFill('ppcont-p2-7')"><span class="fill-result" id="ppcont-p2-7-res"></span></div>
                </div>
            </div>

            <div class="fill-exercise">
                <div class="fill-q-num">8</div>
                <div class="fill-dialogue">
                    <div class="fill-line">They haven’t been <strong style="color:#e04040;text-decoration:underline;">practiced</strong> for the competition.</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppcont-p2-8" placeholder="correction..." data-answer="practicing" onkeydown="if(event.key==='Enter')checkFill('ppcont-p2-8')"><span class="fill-result" id="ppcont-p2-8-res"></span></div>
                </div>
            </div>

            <div class="fill-exercise">
                <div class="fill-q-num">9</div>
                <div class="fill-dialogue">
                    <div class="fill-line">He hasn’t been <strong style="color:#e04040;text-decoration:underline;">write</strong> emails this week.</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppcont-p2-9" placeholder="correction..." data-answer="writing" onkeydown="if(event.key==='Enter')checkFill('ppcont-p2-9')"><span class="fill-result" id="ppcont-p2-9-res"></span></div>
                </div>
            </div>

            <div class="fill-exercise">
                <div class="fill-q-num">10</div>
                <div class="fill-dialogue">
                    <div class="fill-line">Have you been <strong style="color:#e04040;text-decoration:underline;">listen</strong> to this song all day?</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppcont-p2-10" placeholder="correction..." data-answer="listening" onkeydown="if(event.key==='Enter')checkFill('ppcont-p2-10')"><span class="fill-result" id="ppcont-p2-10-res"></span></div>
                </div>
            </div>

            <div class="fill-exercise">
                <div class="fill-q-num">11</div>
                <div class="fill-dialogue">
                    <div class="fill-line"><strong style="color:#e04040;text-decoration:underline;">Have she been travel</strong> a lot this year?</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppcont-p2-11" placeholder="correction..." data-answer="Has she been traveling" onkeydown="if(event.key==='Enter')checkFill('ppcont-p2-11')"><span class="fill-result" id="ppcont-p2-11-res"></span></div>
                </div>
            </div>

            <div class="fill-exercise">
                <div class="fill-q-num">12</div>
                <div class="fill-dialogue">
                    <div class="fill-line"><strong style="color:#e04040;text-decoration:underline;">Has they were repair</strong> the road since June?</div>
                    <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppcont-p2-12" placeholder="correction..." data-answer="Have they been repairing" onkeydown="if(event.key==='Enter')checkFill('ppcont-p2-12')"><span class="fill-result" id="ppcont-p2-12-res"></span></div>
                </div>
            </div>

            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;">
                <button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button>
            </div>
        </div>
    </div>

    <div id="ppcont-section-3" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 3</span>
            <span class="practice-section-title">Fill in the Blanks</span>
        </div>

        <!-- Affirmative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) Affirmative</span></div>
                <h4>Use correct Present Perfect Continuous affirmative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="ppcont-p3a-1a" placeholder="work" data-answer="have been working" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3a-1a')"> on this project for three hours.<span class="fill-result" id="ppcont-p3a-1a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Nice! I <input class="fill-input" id="ppcont-p3a-1b" placeholder="prepare" data-answer="have been preparing" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3a-1b')"> the presentation too.<span class="fill-result" id="ppcont-p3a-1b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="ppcont-p3a-2a" placeholder="paint" data-answer="has been painting" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3a-2a')"> her room since morning.<span class="fill-result" id="ppcont-p3a-2a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Wow! I <input class="fill-input" id="ppcont-p3a-2b" placeholder="help" data-answer="have been helping" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3a-2b')"> my brother all day.<span class="fill-result" id="ppcont-p3a-2b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="ppcont-p3a-3a" placeholder="build" data-answer="have been building" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3a-3a')"> a new house this year.<span class="fill-result" id="ppcont-p3a-3a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> I know. We <input class="fill-input" id="ppcont-p3a-3b" placeholder="watch" data-answer="have been watching" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3a-3b')"> their progress.<span class="fill-result" id="ppcont-p3a-3b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> He <input class="fill-input" id="ppcont-p3a-4a" placeholder="train" data-answer="has been training" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3a-4a')"> for the competition recently.<span class="fill-result" id="ppcont-p3a-4a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Good! I <input class="fill-input" id="ppcont-p3a-4b" placeholder="exercise" data-answer="have been exercising" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3a-4b')"> a lot too.<span class="fill-result" id="ppcont-p3a-4b-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>

        <!-- Negative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) Negative</span></div>
                <h4>Use correct Present Perfect Continuous negative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="ppcont-p3b-1a" placeholder="not sleep" data-answer="have not been sleeping|haven't been sleeping" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3b-1a')"> well lately.<span class="fill-result" id="ppcont-p3b-1a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Me too! I <input class="fill-input" id="ppcont-p3b-1b" placeholder="not rest" data-answer="have not been resting|haven't been resting" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3b-1b')"> enough.<span class="fill-result" id="ppcont-p3b-1b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="ppcont-p3b-2a" placeholder="not study" data-answer="has not been studying|hasn't been studying" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3b-2a')"> this week.<span class="fill-result" id="ppcont-p3b-2a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Right! She <input class="fill-input" id="ppcont-p3b-2b" placeholder="not focus" data-answer="has not been focusing|hasn't been focusing" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3b-2b')"> on her lessons.<span class="fill-result" id="ppcont-p3b-2b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="ppcont-p3b-3a" placeholder="not practice" data-answer="have not been practicing|haven't been practicing" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3b-3a')"> for the match.<span class="fill-result" id="ppcont-p3b-3a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, they <input class="fill-input" id="ppcont-p3b-3b" placeholder="not train" data-answer="have not been training|haven't been training" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3b-3b')"> regularly.<span class="fill-result" id="ppcont-p3b-3b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> He <input class="fill-input" id="ppcont-p3b-4a" placeholder="not work" data-answer="has not been working|hasn't been working" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3b-4a')"> on his project recently.<span class="fill-result" id="ppcont-p3b-4a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> I noticed. He <input class="fill-input" id="ppcont-p3b-4b" placeholder="not try" data-answer="has not been trying|hasn't been trying" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3b-4b')"> hard.<span class="fill-result" id="ppcont-p3b-4b-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>

        <!-- Questions -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">c) Question</span></div>
                <h4>Use correct Present Perfect Continuous question forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" style="width:80px;" id="ppcont-p3c-1a" placeholder="Have/Has" data-answer="Have" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3c-1a')"> you <input class="fill-input" id="ppcont-p3c-1b" placeholder="work" data-answer="been working" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3c-1b')"> on this task all day?<span class="fill-result" id="ppcont-p3c-1a-res"></span><span class="fill-result" id="ppcont-p3c-1b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, I have.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" style="width:80px;" id="ppcont-p3c-2a" placeholder="Have/Has" data-answer="Has" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3c-2a')"> she <input class="fill-input" id="ppcont-p3c-2b" placeholder="study" data-answer="been studying" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3c-2b')"> for the exam recently?<span class="fill-result" id="ppcont-p3c-2a-res"></span><span class="fill-result" id="ppcont-p3c-2b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> No, she hasn’t.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" style="width:80px;" id="ppcont-p3c-3a" placeholder="Have/Has" data-answer="Have" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3c-3a')"> they <input class="fill-input" id="ppcont-p3c-3b" placeholder="play" data-answer="been playing" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3c-3b')"> football for a long time?<span class="fill-result" id="ppcont-p3c-3a-res"></span><span class="fill-result" id="ppcont-p3c-3b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, they have.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" style="width:80px;" id="ppcont-p3c-4a" placeholder="Have/Has" data-answer="Has" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3c-4a')"> he <input class="fill-input" id="ppcont-p3c-4b" placeholder="use" data-answer="been using" onkeydown="if(event.key==='Enter')checkFill('ppcont-p3c-4b')"> his laptop all evening?<span class="fill-result" id="ppcont-p3c-4a-res"></span><span class="fill-result" id="ppcont-p3c-4b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> No, he hasn’t.</div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div id="ppcont-section-4" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 4</span>
            <span class="practice-section-title">Rewrite the Sentences</span>
        </div>

        <!-- To Affirmative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) To Affirmative</span></div>
                <h4>Rewrite the sentence in affirmative form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She hasn’t been working today.</div>
                <div class="fill-line"><input class="fill-input" id="ppcont-p4a-1" placeholder="rewrite..." data-answer="she has been working today" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppcont-p4a-1')"><span class="fill-result" id="ppcont-p4a-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">They haven’t been playing football.</div>
                <div class="fill-line"><input class="fill-input" id="ppcont-p4a-2" placeholder="rewrite..." data-answer="they have been playing football" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppcont-p4a-2')"><span class="fill-result" id="ppcont-p4a-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">He hasn’t been studying for the test.</div>
                <div class="fill-line"><input class="fill-input" id="ppcont-p4a-3" placeholder="rewrite..." data-answer="he has been studying for the test" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppcont-p4a-3')"><span class="fill-result" id="ppcont-p4a-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">We haven’t been talking much lately.</div>
                <div class="fill-line"><input class="fill-input" id="ppcont-p4a-4" placeholder="rewrite..." data-answer="we have been talking much lately" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppcont-p4a-4')"><span class="fill-result" id="ppcont-p4a-4-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>

        <!-- To Negative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) To Negative</span></div>
                <h4>Rewrite the sentence in negative form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She has been reading a book.</div>
                <div class="fill-line"><input class="fill-input" id="ppcont-p4b-1" placeholder="rewrite..." data-answer="she hasn't been reading a book|she has not been reading a book" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppcont-p4b-1')"><span class="fill-result" id="ppcont-p4b-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">They have been building a house.</div>
                <div class="fill-line"><input class="fill-input" id="ppcont-p4b-2" placeholder="rewrite..." data-answer="they haven't been building a house|they have not been building a house" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppcont-p4b-2')"><span class="fill-result" id="ppcont-p4b-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">He has been fixing his bike.</div>
                <div class="fill-line"><input class="fill-input" id="ppcont-p4b-3" placeholder="rewrite..." data-answer="he hasn't been fixing his bike|he has not been fixing his bike" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppcont-p4b-3')"><span class="fill-result" id="ppcont-p4b-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">We have been listening to music.</div>
                <div class="fill-line"><input class="fill-input" id="ppcont-p4b-4" placeholder="rewrite..." data-answer="we haven't been listening to music|we have not been listening to music" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppcont-p4b-4')"><span class="fill-result" id="ppcont-p4b-4-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>

        <!-- To Question -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">c) To Question</span></div>
                <h4>Rewrite the sentence in question form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">I have been doing my homework.</div>
                <div class="fill-line"><input class="fill-input" id="ppcont-p4c-1" placeholder="rewrite..." data-answer="have i been doing my homework?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppcont-p4c-1')"><span class="fill-result" id="ppcont-p4c-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">He has been working all day.</div>
                <div class="fill-line"><input class="fill-input" id="ppcont-p4c-2" placeholder="rewrite..." data-answer="has he been working all day?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppcont-p4c-2')"><span class="fill-result" id="ppcont-p4c-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">We have been studying together.</div>
                <div class="fill-line"><input class="fill-input" id="ppcont-p4c-3" placeholder="rewrite..." data-answer="have we been studying together?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppcont-p4c-3')"><span class="fill-result" id="ppcont-p4c-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She has been cooking dinner.</div>
                <div class="fill-line"><input class="fill-input" id="ppcont-p4c-4" placeholder="rewrite..." data-answer="has she been cooking dinner?" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppcont-p4c-4')"><span class="fill-result" id="ppcont-p4c-4-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>
    <div class="get-result-bar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button class="get-result-btn" onclick="getResult()">
            📊 Get Result
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(70)" style="background:#22c55e;color:#ffffff;border:none;">
            ✅ Done
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(67)" style="background:#ef4444;color:#ffffff;border:none;">
            ⚠️ Retake
        </button>
    </div>
</div>`;
}

function renderPastPerfectContinuousPracticeTasks(container) {
    container.innerHTML = `
<div class="practice-tasks-container">
    <div class="pc-practice-header" style="margin-bottom: 25px;">
        <div class="pc-dropdown-container" id="ppastcont-practice-dropdown">
            <div class="pc-dropdown-trigger" onclick="this.parentElement.classList.toggle('open')">
                <span id="ppastcont-current-section">Practice 1: Multiple Choice</span>
                <span class="dropdown-arrow">▼</span>
            </div>
            <div class="pc-dropdown-menu">
                <div class="pc-dropdown-item" onclick="switchPPastContSection(1)">Practice 1: Multiple Choice</div>
                <div class="pc-dropdown-item" onclick="switchPPastContSection(2)">Practice 2: Find Errors</div>
                <div class="pc-dropdown-item" onclick="switchPPastContSection(3)">Practice 3: Fill in the Blanks</div>
            </div>
        </div>
    </div>

    <div id="ppastcont-section-1">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 1</span>
            <span class="practice-section-title">Multiple Choice</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Affirmative</span></div>
                <h4>Choose the correct affirmative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="ppastca-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'ppastca',0,0,1)">A) I had been go to the meeting before you arrived.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastca',0,1,1)">B) I had been going to the meeting before you arrived.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastca',0,2,1)">C) I had being going to the meeting before you arrived.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastca',0,3,1)">D) I had go to the meeting before you arrived.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="ppastca-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'ppastca',1,0,0)">A) They had been visiting their grandparents before they left.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastca',1,1,0)">B) They had visiting their grandparents before they left.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastca',1,2,0)">C) They had been visits their grandparents before they left.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastca',1,3,0)">D) They had been visited their grandparents before they left.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="ppastca-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'ppastca',2,0,1)">A) She had been buys a new dress before the party.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastca',2,1,1)">B) She had been buying a new dress before the party.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastca',2,2,1)">C) She had being buying a new dress before the party.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastca',2,3,1)">D) She had been bought a new dress before the party.</div>
                </div>
            </div>
        </div>

        <!-- Negative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">Negative</span></div>
                <h4>Choose the correct negative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="ppastcn-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'ppastcn',0,0,0)">A) She hadn’t been going to the party, so she was tired.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastcn',0,1,0)">B) She hadn’t been go to the party, so she was tired.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastcn',0,2,0)">C) She had not being going to the party, so she was tired.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastcn',0,3,0)">D) She not had been going to the party, so she was tired.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="ppastcn-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'ppastcn',1,0,1)">A) I hadn’t been watch that movie when you called.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastcn',1,1,1)">B) I had not been watching that movie when you called.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastcn',1,2,1)">C) I hadn’t watching that movie when you called.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastcn',1,3,1)">D) I not had been watching that movie when you called.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="ppastcn-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'ppastcn',2,0,2)">A) They hadn’t been plays football all day.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastcn',2,1,2)">B) They had not been play football all day.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastcn',2,2,2)">C) They hadn’t been playing football all day.</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastcn',2,3,2)">D) They not had been playing football all day.</div>
                </div>
            </div>
        </div>

        <!-- Interrogative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">Interrogative</span></div>
                <h4>Choose the correct question form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="ppastci-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'ppastci',0,0,2)">A) Had you been goes to the party before that?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastci',0,1,2)">B) Did you had been going to the party before that?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastci',0,2,2)">C) Had you been going to the party before that?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastci',0,3,2)">D) Had you been go to the party before that?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="ppastci-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'ppastci',1,0,1)">A) Did she had been buying a new phone before she called?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastci',1,1,1)">B) Had she been buying a new phone before she called?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastci',1,2,1)">C) Had she being buying a new phone before she called?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastci',1,3,1)">D) Had she been buy a new phone before she called?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="ppastci-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'ppastci',2,0,0)">A) Had they been playing before the rain started?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastci',2,1,0)">B) Did they had been playing before the rain started?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastci',2,2,0)">C) Had they been plays before the rain started?</div>
                    <div class="option" onclick="selectPracticeOption(event,'ppastci',2,3,0)">D) Had they playing before the rain started?</div>
                </div>
            </div>
        </div>
    </div>

    <div id="ppastcont-section-2" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 2</span>
            <span class="practice-section-title">Find Errors</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Error Correction</span></div>
                <h4>Find the error and type the correct form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line">He had been <strong style="color:#e04040;text-decoration:underline;">goes</strong> to the gym for an hour.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastcont-p2-1" data-answer="going" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p2-1')"><span class="fill-result" id="ppastcont-p2-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line">She had been <strong style="color:#e04040;text-decoration:underline;">buys</strong> a new laptop before it broke.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastcont-p2-2" data-answer="buying" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p2-2')"><span class="fill-result" id="ppastcont-p2-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line">I <strong style="color:#e04040;text-decoration:underline;">had watching</strong> that movie when the power went out.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastcont-p2-3" data-answer="had been watching" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p2-3')"><span class="fill-result" id="ppastcont-p2-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line">They had been <strong style="color:#e04040;text-decoration:underline;">plays</strong> football until it rained.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastcont-p2-4" data-answer="playing" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p2-4')"><span class="fill-result" id="ppastcont-p2-4-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">5</div><div class="fill-dialogue">
                <div class="fill-line"><strong style="color:#e04040;text-decoration:underline;">He not had been</strong> coming to the meeting.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastcont-p2-5" data-answer="He hadn't been|He had not been" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p2-5')"><span class="fill-result" id="ppastcont-p2-5-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">6</div><div class="fill-dialogue">
                <div class="fill-line">She <strong style="color:#e04040;text-decoration:underline;">had not cooking</strong> dinner when I arrived.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastcont-p2-6" data-answer="had not been cooking|hadn't been cooking" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p2-6')"><span class="fill-result" id="ppastcont-p2-6-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">7</div><div class="fill-dialogue">
                <div class="fill-line">Had he been <strong style="color:#e04040;text-decoration:underline;">goes</strong> to school before he got sick?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastcont-p2-7" data-answer="going" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p2-7')"><span class="fill-result" id="ppastcont-p2-7-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">8</div><div class="fill-dialogue">
                <div class="fill-line"><strong style="color:#e04040;text-decoration:underline;">Had you watching</strong> TV before I knocked?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="ppastcont-p2-8" data-answer="Had you been watching" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p2-8')"><span class="fill-result" id="ppastcont-p2-8-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div id="ppastcont-section-3" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 3</span>
            <span class="practice-section-title">Fill in the Blanks</span>
        </div>
        <!-- Affirmative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) Affirmative</span></div>
                <h4>Use correct Past Perfect Continuous affirmative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="ppastcont-p3a-1a" placeholder="call" data-answer="had been calling" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p3a-1a')"> you for an hour before you answered.</div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Sorry! I <input class="fill-input" id="ppastcont-p3a-1b" placeholder="wait" data-answer="had been waiting" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p3a-1b')"> for your call all day.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="ppastcont-p3a-2a" placeholder="visit" data-answer="had been visiting" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p3a-2a')"> her grandmother all afternoon.</div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Nice! I <input class="fill-input" id="ppastcont-p3a-2b" placeholder="see" data-answer="had been seeing" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p3a-2b')"> mine that morning too.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="ppastcont-p3a-3a" placeholder="travel" data-answer="had been traveling" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p3a-3a')"> to Turkey all summer.</div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Amazing! We <input class="fill-input" id="ppastcont-p3a-3b" placeholder="go" data-answer="had been going" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p3a-3b')"> there too.</div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
        <!-- Negative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) Negative</span></div>
                <h4>Use correct Past Perfect Continuous negative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="ppastcont-p3b-1a" placeholder="not go" data-answer="had not been going|hadn't been going" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p3b-1a')"> to the gym for a long time.</div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Me too! I <input class="fill-input" id="ppastcont-p3b-1b" placeholder="not attend" data-answer="had not been attending|hadn't been attending" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p3b-1b')"> it either.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="ppastcont-p3b-2a" placeholder="not buy" data-answer="had not been buying|hadn't been buying" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p3b-2a')"> that expensive dress.</div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Right! She <input class="fill-input" id="ppastcont-p3b-2b" placeholder="not spend" data-answer="had not been spending|hadn't been spending" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p3b-2b')"> money on it.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="ppastcont-p3b-3a" placeholder="not play" data-answer="had not been playing|hadn't been playing" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p3b-3a')"> the match well.</div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, they <input class="fill-input" id="ppastcont-p3b-3b" placeholder="not come" data-answer="had not been coming|hadn't been coming" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p3b-3b')"> to practice at all.</div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
        <!-- Questions -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">c) Questions</span></div>
                <h4>Use correct Past Perfect Continuous question forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="ppastcont-p3c-1a" style="width:70px;" placeholder="Had" data-answer="Had" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p3c-1a')"> you <input class="fill-input" id="ppastcont-p3c-1b" placeholder="call" data-answer="been calling" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p3c-1b')"> me all morning?<span class="fill-result" id="ppastcont-p3c-1a-res"></span><span class="fill-result" id="ppastcont-p3c-1b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, I had.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="ppastcont-p3c-2a" style="width:70px;" placeholder="Had" data-answer="Had" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p3c-2a')"> she <input class="fill-input" id="ppastcont-p3c-2b" placeholder="come" data-answer="been coming" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p3c-2b')"> to the meeting on time?<span class="fill-result" id="ppastcont-p3c-2a-res"></span><span class="fill-result" id="ppastcont-p3c-2b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> No, she hadn’t.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="ppastcont-p3c-3a" style="width:70px;" placeholder="Had" data-answer="Had" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p3c-3a')"> they <input class="fill-input" id="ppastcont-p3c-3b" placeholder="travel" data-answer="been traveling" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p3c-3b')"> a lot that year?<span class="fill-result" id="ppastcont-p3c-3a-res"></span><span class="fill-result" id="ppastcont-p3c-3b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, they had.</div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div id="ppastcont-section-4" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 4</span>
            <span class="practice-section-title">Rewrite the Sentences</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) To Affirmative</span></div>
                <h4>Rewrite the sentence in affirmative form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">She hadn’t been working all day.</div>
                <div class="fill-line"><input class="fill-input" id="ppastcont-p4a-1" placeholder="rewrite..." data-answer="she had been working all day" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p4a-1')"><span class="fill-result" id="ppastcont-p4a-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">They hadn’t been playing for long.</div>
                <div class="fill-line"><input class="fill-input" id="ppastcont-p4a-2" placeholder="rewrite..." data-answer="they had been playing for long" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p4a-2')"><span class="fill-result" id="ppastcont-p4a-2-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) To Negative</span></div>
                <h4>Rewrite the sentence in negative form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line" style="color:#555;font-style:italic;">He had been waiting since morning.</div>
                <div class="fill-line"><input class="fill-input" id="ppastcont-p4b-1" placeholder="rewrite..." data-answer="he hadn't been waiting since morning|he had not been waiting since morning" style="width:100%;min-width:320px;" onkeydown="if(event.key==='Enter')checkFill('ppastcont-p4b-1')"><span class="fill-result" id="ppastcont-p4b-1-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div class="get-result-bar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button class="get-result-btn" onclick="getResult()">
            📊 Get Result
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(70)" style="background:#22c55e;color:#ffffff;border:none;">
            ✅ Done
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(67)" style="background:#ef4444;color:#ffffff;border:none;">
            ⚠️ Retake
        </button>
    </div>
</div>`;
}

/**
 * Switch between practice sections for Future Perfect
 */
function switchFPSection(num) {
    const sectionTitles = ["Multiple Choice", "Find Errors", "Fill in the Blanks"];

    const dropdown = document.getElementById('fp-practice-dropdown');
    if (dropdown) dropdown.classList.remove('open');

    const sections = ['fp-section-1', 'fp-section-2', 'fp-section-3'];
    sections.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) el.style.display = (idx + 1 === num) ? 'block' : 'none';
    });

    const currentSectionTitle = document.getElementById('fp-current-section');
    if (currentSectionTitle) currentSectionTitle.textContent = `Practice ${num}: ${sectionTitles[num - 1]}`;
}

/**
 * Switch between practice sections for Future Continuous
 */
function switchFCSection(num) {
    const sectionTitles = ["Multiple Choice", "Find Errors", "Fill in the Blanks"];

    const dropdown = document.getElementById('fc-practice-dropdown');
    if (dropdown) dropdown.classList.remove('open');

    const sections = ['fc-section-1', 'fc-section-2', 'fc-section-3'];
    sections.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) el.style.display = (idx + 1 === num) ? 'block' : 'none';
    });

    const currentSectionTitle = document.getElementById('fc-current-section');
    if (currentSectionTitle) currentSectionTitle.textContent = `Practice ${num}: ${sectionTitles[num - 1]}`;
}

function renderFutureContinuousPracticeTasks(container) {
    container.innerHTML = `
<div class="practice-tasks-container">
    <div class="pc-practice-header" style="margin-bottom: 25px;">
        <div class="pc-dropdown-container" id="fc-practice-dropdown">
            <div class="pc-dropdown-trigger" onclick="this.parentElement.classList.toggle('open')">
                <span id="fc-current-section">Practice 1: Multiple Choice</span>
                <span class="dropdown-arrow">▼</span>
            </div>
            <div class="pc-dropdown-menu">
                <div class="pc-dropdown-item" onclick="switchFCSection(1)">Practice 1: Multiple Choice</div>
                <div class="pc-dropdown-item" onclick="switchFCSection(2)">Practice 2: Find Errors</div>
                <div class="pc-dropdown-item" onclick="switchFCSection(3)">Practice 3: Fill in the Blanks</div>
            </div>
        </div>
    </div>

    <div id="fc-section-1">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 1</span>
            <span class="practice-section-title">Multiple Choice</span>
        </div>

        <!-- Affirmative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Affirmative</span></div>
                <h4>Choose the correct affirmative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="fca-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'fca',0,0,2)">A) I will be goes to the meeting at 10 AM.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fca',0,1,2)">B) I will being going to the meeting at 10 AM.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fca',0,2,2)">C) I will be going to the meeting at 10 AM.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fca',0,3,2)">D) I will be go to the meeting at 10 AM.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="fca-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'fca',1,0,0)">A) They will be visiting their grandparents this time next week.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fca',1,1,0)">B) They will visiting their grandparents this time next week.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fca',1,2,0)">C) They will be visits their grandparents this time next week.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fca',1,3,0)">D) They will been visiting their grandparents this time next week.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="fca-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'fca',2,0,3)">A) She will be buys a new dress.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fca',2,1,3)">B) She will being buying a new dress.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fca',2,2,3)">C) She will be bought a new dress.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fca',2,3,3)">D) She will be buying a new dress.</div>
                </div>
            </div>
        </div>

        <!-- Negative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">Negative</span></div>
                <h4>Choose the correct negative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="fcn-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'fcn',0,0,0)">A) She won’t be going to the party.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fcn',0,1,0)">B) She won’t be go to the party.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fcn',0,2,0)">C) She will not being going to the party.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fcn',0,3,0)">D) She not will be going to the party.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="fcn-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'fcn',1,0,1)">A) I won’t be watches that movie.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fcn',1,1,1)">B) I will not be watching that movie.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fcn',1,2,1)">C) I won’t watching that movie.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fcn',1,3,1)">D) I not will be watching that movie.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="fcn-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'fcn',2,0,2)">A) They won’t be plays football.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fcn',2,1,2)">B) They will not be play football.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fcn',2,2,2)">C) They won’t be playing football.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fcn',2,3,2)">D) They not will be playing football.</div>
                </div>
            </div>
        </div>

        <!-- Interrogative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">Interrogative</span></div>
                <h4>Choose the correct question form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="fci-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'fci',0,0,2)">A) Will you be goes to the party?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fci',0,1,2)">B) Do you will be going to the party?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fci',0,2,2)">C) Will you be going to the party?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fci',0,3,2)">D) Will you be go to the party?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="fci-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'fci',1,0,0)">A) Will she be buying a new phone?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fci',1,1,0)">B) Does she will be buying a new phone?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fci',1,2,0)">C) Will she being buying a new phone?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fci',1,3,0)">D) Will she be buy a new phone?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="fci-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'fci',2,0,0)">A) Will they be playing tomorrow?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fci',2,1,0)">B) Do they will be playing tomorrow?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fci',2,2,0)">C) Will they be plays tomorrow?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fci',2,3,0)">D) Will they playing tomorrow?</div>
                </div>
            </div>
        </div>
    </div>

    <div id="fc-section-2" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 2</span>
            <span class="practice-section-title">Find Errors</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Error Correction</span></div>
                <h4>Find the error and type the correct form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line">He will be <strong style="color:#e04040;text-decoration:underline;">goes</strong> to the gym tomorrow at 5.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fc-p2-1" data-answer="going" onkeydown="if(event.key==='Enter')checkFill('fc-p2-1')"><span class="fill-result" id="fc-p2-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line">She will be <strong style="color:#e04040;text-decoration:underline;">buys</strong> a new laptop this afternoon.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fc-p2-2" data-answer="buying" onkeydown="if(event.key==='Enter')checkFill('fc-p2-2')"><span class="fill-result" id="fc-p2-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line">I <strong style="color:#e04040;text-decoration:underline;">will watching</strong> that movie tonight.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fc-p2-3" data-answer="will be watching" onkeydown="if(event.key==='Enter')checkFill('fc-p2-3')"><span class="fill-result" id="fc-p2-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line">They will be <strong style="color:#e04040;text-decoration:underline;">plays</strong> football later.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fc-p2-4" data-answer="playing" onkeydown="if(event.key==='Enter')checkFill('fc-p2-4')"><span class="fill-result" id="fc-p2-4-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">5</div><div class="fill-dialogue">
                <div class="fill-line">He <strong style="color:#e04040;text-decoration:underline;">not will be</strong> coming to the meeting.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fc-p2-5" data-answer="will not be|won't be" onkeydown="if(event.key==='Enter')checkFill('fc-p2-5')"><span class="fill-result" id="fc-p2-5-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">6</div><div class="fill-dialogue">
                <div class="fill-line">She <strong style="color:#e04040;text-decoration:underline;">will not cooking</strong> dinner tonight.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fc-p2-6" data-answer="will not be cooking|won't be cooking" onkeydown="if(event.key==='Enter')checkFill('fc-p2-6')"><span class="fill-result" id="fc-p2-6-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">7</div><div class="fill-dialogue">
                <div class="fill-line">Will he be <strong style="color:#e04040;text-decoration:underline;">goes</strong> to school tomorrow?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fc-p2-7" data-answer="going" onkeydown="if(event.key==='Enter')checkFill('fc-p2-7')"><span class="fill-result" id="fc-p2-7-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">8</div><div class="fill-dialogue">
                <div class="fill-line"><strong style="color:#e04040;text-decoration:underline;">Will you watching</strong> TV tonight?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fc-p2-8" data-answer="Will you be watching" onkeydown="if(event.key==='Enter')checkFill('fc-p2-8')"><span class="fill-result" id="fc-p2-8-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div id="fc-section-3" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 3</span>
            <span class="practice-section-title">Fill in the Blanks</span>
        </div>
        <!-- Affirmative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) Affirmative</span></div>
                <h4>Use correct Future Continuous affirmative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="fc-p3a-1a" placeholder="call" data-answer="will be calling" onkeydown="if(event.key==='Enter')checkFill('fc-p3a-1a')"> you later today.<span class="fill-result" id="fc-p3a-1a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Great! I <input class="fill-input" id="fc-p3a-1b" placeholder="wait" data-answer="will be waiting" onkeydown="if(event.key==='Enter')checkFill('fc-p3a-1b')"> for your call.<span class="fill-result" id="fc-p3a-1b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="fc-p3a-2a" placeholder="visit" data-answer="will be visiting" onkeydown="if(event.key==='Enter')checkFill('fc-p3a-2a')"> her grandmother all afternoon.<span class="fill-result" id="fc-p3a-2a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Nice! I <input class="fill-input" id="fc-p3a-2b" placeholder="see" data-answer="will be seeing" onkeydown="if(event.key==='Enter')checkFill('fc-p3a-2b')"> mine next week.<span class="fill-result" id="fc-p3a-2b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                
            <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="fc-p3a-3a" placeholder="travel" data-answer="will be traveling" onkeydown="if(event.key==='Enter')checkFill('fc-p3a-3a')"> to Turkey next summer.<span class="fill-result" id="fc-p3a-3a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Amazing! We <input class="fill-input" id="fc-p3a-3b" placeholder="go" data-answer="will be going" onkeydown="if(event.key==='Enter')checkFill('fc-p3a-3b')"> there too.<span class="fill-result" id="fc-p3a-3b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> He <input class="fill-input" id="fc-p3a-4a" placeholder="finish" data-answer="will be finishing" onkeydown="if(event.key==='Enter')checkFill('fc-p3a-4a')"> his homework soon.<span class="fill-result" id="fc-p3a-4a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Good! I <input class="fill-input" id="fc-p3a-4b" placeholder="start" data-answer="will be starting" onkeydown="if(event.key==='Enter')checkFill('fc-p3a-4b')"> mine now.<span class="fill-result" id="fc-p3a-4b-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
        <!-- Negative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) Negative</span></div>
                <h4>Use correct Future Continuous negative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="fc-p3b-1a" placeholder="not go" data-answer="will not be going|won't be going" onkeydown="if(event.key==='Enter')checkFill('fc-p3b-1a')"> to the party tonight.<span class="fill-result" id="fc-p3b-1a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Me too! I <input class="fill-input" id="fc-p3b-1b" placeholder="not attend" data-answer="will not be attending|won't be attending" onkeydown="if(event.key==='Enter')checkFill('fc-p3b-1b')"> it either.<span class="fill-result" id="fc-p3b-1b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="fc-p3b-2a" placeholder="not buy" data-answer="will not be buying|won't be buying" onkeydown="if(event.key==='Enter')checkFill('fc-p3b-2a')"> that expensive dress.<span class="fill-result" id="fc-p3b-2a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Right! She <input class="fill-input" id="fc-p3b-2b" placeholder="not spend" data-answer="will not be spending|won't be spending" onkeydown="if(event.key==='Enter')checkFill('fc-p3b-2b')"> money on it yet.<span class="fill-result" id="fc-p3b-2b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="fc-p3b-3a" placeholder="not play" data-answer="will not be playing|won't be playing" onkeydown="if(event.key==='Enter')checkFill('fc-p3b-3a')"> the match tomorrow.<span class="fill-result" id="fc-p3b-3a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, they <input class="fill-input" id="fc-p3b-3b" placeholder="not come" data-answer="will not be coming|won't be coming" onkeydown="if(event.key==='Enter')checkFill('fc-p3b-3b')"> at all.<span class="fill-result" id="fc-p3b-3b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> He <input class="fill-input" id="fc-p3b-4a" placeholder="not help" data-answer="will not be helping|won't be helping" onkeydown="if(event.key==='Enter')checkFill('fc-p3b-4a')"> us today.<span class="fill-result" id="fc-p3b-4a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> I know. He <input class="fill-input" id="fc-p3b-4b" placeholder="not join" data-answer="will not be joining|won't be joining" onkeydown="if(event.key==='Enter')checkFill('fc-p3b-4b')"> the team.<span class="fill-result" id="fc-p3b-4b-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
        <!-- Questions -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">c) Questions</span></div>
                <h4>Use correct Future Continuous question forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="fc-p3c-1a" placeholder="..." data-answer="Will" style="width:70px;" onkeydown="if(event.key==='Enter')checkFill('fc-p3c-1a')"> you <input class="fill-input" id="fc-p3c-1b" placeholder="call" data-answer="be calling" onkeydown="if(event.key==='Enter')checkFill('fc-p3c-1b')"> me around 6 PM?<span class="fill-result" id="fc-p3c-1a-res"></span><span class="fill-result" id="fc-p3c-1b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, I will.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="fc-p3c-2a" placeholder="..." data-answer="Will" style="width:70px;" onkeydown="if(event.key==='Enter')checkFill('fc-p3c-2a')"> she <input class="fill-input" id="fc-p3c-2b" placeholder="come" data-answer="be coming" onkeydown="if(event.key==='Enter')checkFill('fc-p3c-2b')"> to the meeting at noon?<span class="fill-result" id="fc-p3c-2a-res"></span><span class="fill-result" id="fc-p3c-2b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> No, she won’t.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="fc-p3c-3a" placeholder="..." data-answer="Will" style="width:70px;" onkeydown="if(event.key==='Enter')checkFill('fc-p3c-3a')"> they <input class="fill-input" id="fc-p3c-3b" placeholder="travel" data-answer="be traveling" onkeydown="if(event.key==='Enter')checkFill('fc-p3c-3b')"> this summer?<span class="fill-result" id="fc-p3c-3a-res"></span><span class="fill-result" id="fc-p3c-3b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, they will.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="fc-p3c-4a" placeholder="..." data-answer="Will" style="width:70px;" onkeydown="if(event.key==='Enter')checkFill('fc-p3c-4a')"> he <input class="fill-input" id="fc-p3c-4b" placeholder="finish" data-answer="be finishing" onkeydown="if(event.key==='Enter')checkFill('fc-p3c-4b')"> his work today?<span class="fill-result" id="fc-p3c-4a-res"></span><span class="fill-result" id="fc-p3c-4b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> No, he won’t.</div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div class="get-result-bar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button class="get-result-btn" onclick="getResult()">
            📊 Get Result
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(70)" style="background:#22c55e;color:#ffffff;border:none;">
            ✅ Done
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(67)" style="background:#ef4444;color:#ffffff;border:none;">
            ⚠️ Retake
        </button>
    </div>
</div>
`;
}


function renderFuturePerfectPracticeTasks(container) {
    container.innerHTML = `
<div class="practice-tasks-container">
    <div class="section-nav-header">
        <div class="section-dropdown" id="fp-practice-dropdown">
            <button class="section-dropbtn" onclick="this.parentElement.classList.toggle('open')">
                <span id="fp-current-section">Practice 1: Multiple Choice</span>
                <span>▼</span>
            </button>
            <div class="section-dropdown-content">
                <a href="javascript:void(0)" onclick="switchFPSection(1)">Practice 1: Multiple Choice</a>
                <a href="javascript:void(0)" onclick="switchFPSection(2)">Practice 2: Find Errors</a>
                <a href="javascript:void(0)" onclick="switchFPSection(3)">Practice 3: Fill in the Blanks</a>
            </div>
        </div>
    </div>

    <div id="fp-section-1">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 1</span>
            <span class="practice-section-title">Multiple Choice</span>
        </div>

        <!-- Affirmative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Affirmative</span></div>
                <h4>Choose the correct affirmative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="fpa-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'fpa',0,0,1)">A) I will have go to the meeting by 10 AM.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpa',0,1,1)">B) I will have gone to the meeting by 10 AM.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpa',0,2,1)">C) I will has gone to the meeting by 10 AM.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpa',0,3,1)">D) I will having gone to the meeting by 10 AM.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="fpa-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'fpa',1,0,2)">A) They will have visiting their grandparents by next week.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpa',1,1,2)">B) They will has visited their grandparents by next week.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpa',1,2,2)">C) They will have visited their grandparents by next week.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpa',1,3,2)">D) They will been visited their grandparents by next week.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="fpa-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'fpa',2,0,0)">A) She will have bought a new dress by tomorrow.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpa',2,1,0)">B) She will have buy a new dress by tomorrow.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpa',2,2,0)">C) She will has bought a new dress by tomorrow.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpa',2,3,0)">D) She will having bought a new dress by tomorrow.</div>
                </div>
            </div>
        </div>

        <!-- Negative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">Negative</span></div>
                <h4>Choose the correct negative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="fpn-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'fpn',0,0,0)">A) She won’t have gone to the party by then.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpn',0,1,0)">B) She won’t have go to the party by then.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpn',0,2,0)">C) She will not have went to the party by then.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpn',0,3,0)">D) She not will have gone to the party by then.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="fpn-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'fpn',1,0,1)">A) I won’t have watch that movie by tonight.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpn',1,1,1)">B) I will not have watched that movie by tonight.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpn',1,2,1)">C) I won’t have watching that movie by tonight.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpn',1,3,1)">D) I not will have watched that movie by tonight.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="option" onclick="selectPracticeOption(event,'fpn',2,0,2)">A) They won’t have play football by 5 PM.</div>
                <div class="option" onclick="selectPracticeOption(event,'fpn',2,1,2)">B) They will not have plays football by 5 PM.</div>
                <div class="option" onclick="selectPracticeOption(event,'fpn',2,2,2)">C) They won’t have played football by 5 PM.</div>
                <div class="option" onclick="selectPracticeOption(event,'fpn',2,3,2)">D) They not will have played football by 5 PM.</div>
            </div>
        </div>

        <!-- Interrogative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">Interrogative</span></div>
                <h4>Choose the correct question form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="fpi-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'fpi',0,0,0)">A) Will you have gone to the party by 8 PM?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpi',0,1,0)">B) Do you will have gone to the party by 8 PM?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpi',0,2,0)">C) Will you have go to the party by 8 PM?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpi',0,3,0)">D) Will you have went to the party by 8 PM?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="fpi-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'fpi',1,0,1)">A) Does she will have bought a new phone by Friday?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpi',1,1,1)">B) Will she have bought a new phone by Friday?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpi',1,2,1)">C) Will she have buying a new phone by Friday?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpi',1,3,1)">D) Will she have buy a new phone by Friday?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="fpi-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'fpi',2,0,0)">A) Will they have played the game by tomorrow?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpi',2,1,0)">B) Do they will have played the game by tomorrow?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpi',2,2,0)">C) Will they have plays the game by tomorrow?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpi',2,3,0)">D) Will they playing have the game by tomorrow?</div>
                </div>
            </div>
        </div>
    </div>

    <div id="fp-section-2" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 2</span>
            <span class="practice-section-title">Find Errors</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Error Correction</span></div>
                <h4>Find the error and type the correct form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line">He will have <strong style="color:#e04040;text-decoration:underline;">finish</strong> his work by 5 PM.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fp-p2-1" data-answer="finished" onkeydown="if(event.key==='Enter')checkFill('fp-p2-1')"><span class="fill-result" id="fp-p2-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line">She will have <strong style="color:#e04040;text-decoration:underline;">buy</strong> a new laptop by this afternoon.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fp-p2-2" data-answer="bought" onkeydown="if(event.key==='Enter')checkFill('fp-p2-2')"><span class="fill-result" id="fp-p2-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line">I will have <strong style="color:#e04040;text-decoration:underline;">watch</strong> that movie by tonight.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fp-p2-3" data-answer="watched" onkeydown="if(event.key==='Enter')checkFill('fp-p2-3')"><span class="fill-result" id="fp-p2-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line">They will <strong style="color:#e04040;text-decoration:underline;">has</strong> played football by tomorrow.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fp-p2-4" data-answer="have" onkeydown="if(event.key==='Enter')checkFill('fp-p2-4')"><span class="fill-result" id="fp-p2-4-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">5</div><div class="fill-dialogue">
                <div class="fill-line">He <strong style="color:#e04040;text-decoration:underline;">not will</strong> have come to the meeting by noon.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fp-p2-5" data-answer="will not|won't" onkeydown="if(event.key==='Enter')checkFill('fp-p2-5')"><span class="fill-result" id="fp-p2-5-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">6</div><div class="fill-dialogue">
                <div class="fill-line">She will not have <strong style="color:#e04040;text-decoration:underline;">cooks</strong> dinner by 8 PM.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fp-p2-6" data-answer="cooked" onkeydown="if(event.key==='Enter')checkFill('fp-p2-6')"><span class="fill-result" id="fp-p2-6-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">7</div><div class="fill-dialogue">
                <div class="fill-line">Will he have <strong style="color:#e04040;text-decoration:underline;">go</strong> to school by tomorrow morning?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fp-p2-7" data-answer="gone" onkeydown="if(event.key==='Enter')checkFill('fp-p2-7')"><span class="fill-result" id="fp-p2-7-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">8</div><div class="fill-dialogue">
                <div class="fill-line">Will you have <strong style="color:#e04040;text-decoration:underline;">watch</strong> TV by tonight?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fp-p2-8" data-answer="watched" onkeydown="if(event.key==='Enter')checkFill('fp-p2-8')"><span class="fill-result" id="fp-p2-8-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div id="fp-section-3" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 3</span>
            <span class="practice-section-title">Fill in the Blanks</span>
        </div>
        <!-- Affirmative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) Affirmative</span></div>
                <h4>Use correct Future Perfect affirmative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="fp-p3a-1a" placeholder="finish" data-answer="will have finished" onkeydown="if(event.key==='Enter')checkFill('fp-p3a-1a')"> my homework by 5 PM today.<span class="fill-result" id="fp-p3a-1a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Great! I <input class="fill-input" id="fp-p3a-1b" placeholder="clean" data-answer="will have cleaned" onkeydown="if(event.key==='Enter')checkFill('fp-p3a-1b')"> my room by then.<span class="fill-result" id="fp-p3a-1b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="fp-p3a-2a" placeholder="visit" data-answer="will have visited" onkeydown="if(event.key==='Enter')checkFill('fp-p3a-2a')"> her grandmother by this afternoon.<span class="fill-result" id="fp-p3a-2a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Nice! I <input class="fill-input" id="fp-p3a-2b" placeholder="see" data-answer="will have seen" onkeydown="if(event.key==='Enter')checkFill('fp-p3a-2b')"> mine by next week.<span class="fill-result" id="fp-p3a-2b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="fp-p3a-3a" placeholder="travel" data-answer="will have traveled" onkeydown="if(event.key==='Enter')checkFill('fp-p3a-3a')"> to Turkey by next summer.<span class="fill-result" id="fp-p3a-3a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Amazing! We <input class="fill-input" id="fp-p3a-3b" placeholder="go" data-answer="will have gone" onkeydown="if(event.key==='Enter')checkFill('fp-p3a-3b')"> there by then too.<span class="fill-result" id="fp-p3a-3b-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
        <!-- Negative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) Negative</span></div>
                <h4>Use correct Future Perfect negative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="fp-p3b-1a" placeholder="not finish" data-answer="will not have finished|won't have finished" onkeydown="if(event.key==='Enter')checkFill('fp-p3b-1a')"> the project by tonight.<span class="fill-result" id="fp-p3b-1a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Me too! I <input class="fill-input" id="fp-p3b-1b" placeholder="not start" data-answer="will not have started|won't have started" onkeydown="if(event.key==='Enter')checkFill('fp-p3b-1b')"> it either.<span class="fill-result" id="fp-p3b-1b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="fp-p3b-2a" placeholder="not buy" data-answer="will not have bought|won't have bought" onkeydown="if(event.key==='Enter')checkFill('fp-p3b-2a')"> that expensive dress by tomorrow.<span class="fill-result" id="fp-p3b-2a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Right! She <input class="fill-input" id="fp-p3b-2b" placeholder="not spend" data-answer="will not have spent|won't have spent" onkeydown="if(event.key==='Enter')checkFill('fp-p3b-2b')"> money on it yet.<span class="fill-result" id="fp-p3b-2b-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="fp-p3b-3a" placeholder="not play" data-answer="will not have played|won't have played" onkeydown="if(event.key==='Enter')checkFill('fp-p3b-3a')"> the match by tomorrow.<span class="fill-result" id="fp-p3b-3a-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, they <input class="fill-input" id="fp-p3b-3b" placeholder="not come" data-answer="will not have come|won't have come" onkeydown="if(event.key==='Enter')checkFill('fp-p3b-3b')"> at all.<span class="fill-result" id="fp-p3b-3b-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
        <!-- Questions -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">c) Questions</span></div>
                <h4>Use correct Future Perfect question forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="fp-p3c-1a" placeholder="..." data-answer="Will" style="width:70px;" onkeydown="if(event.key==='Enter')checkFill('fp-p3c-1a')"> you <input class="fill-input" id="fp-p3c-1b" placeholder="finish" data-answer="have finished" onkeydown="if(event.key==='Enter')checkFill('fp-p3c-1b')"> the report by 6 PM?<span class="fill-result" id="fp-p3c-1a-res"></span><span class="fill-result" id="fp-p3c-1b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, I will.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="fp-p3c-2a" placeholder="..." data-answer="Will" style="width:70px;" onkeydown="if(event.key==='Enter')checkFill('fp-p3c-2a')"> she <input class="fill-input" id="fp-p3c-2b" placeholder="arrive" data-answer="have arrived" onkeydown="if(event.key==='Enter')checkFill('fp-p3c-2b')"> at the meeting by noon?<span class="fill-result" id="fp-p3c-2a-res"></span><span class="fill-result" id="fp-p3c-2b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> No, she won’t.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="fp-p3c-3a" placeholder="..." data-answer="Will" style="width:70px;" onkeydown="if(event.key==='Enter')checkFill('fp-p3c-3a')"> they <input class="fill-input" id="fp-p3c-3b" placeholder="travel" data-answer="have traveled" onkeydown="if(event.key==='Enter')checkFill('fp-p3c-3b')"> home by summer?<span class="fill-result" id="fp-p3c-3a-res"></span><span class="fill-result" id="fp-p3c-3b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, they will.</div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div class="get-result-bar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button class="get-result-btn" onclick="getResult()">
            📊 Get Result
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(70)" style="background:#22c55e;color:#ffffff;border:none;">
            ✅ Done
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(67)" style="background:#ef4444;color:#ffffff;border:none;">
            ⚠️ Retake
        </button>
    </div>
</div>
`;
}


function switchFPCSection(num) {
    const sectionTitles = ["Multiple Choice", "Find Errors", "Fill in the Blanks", "Rewrite the Sentences"];
    const dropdown = document.getElementById('fpc-practice-dropdown');
    if (dropdown) {
        dropdown.classList.remove('open');
        console.log('Dropdown closed.'); // Debugging log
    }

    const sections = ['fpc-section-1', 'fpc-section-2', 'fpc-section-3', 'fpc-section-4'];
    sections.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = (idx + 1 === num) ? 'block' : 'none';
            console.log((idx + 1 === num ? 'Showing' : 'Hiding') + ' section:', id, 'Current display:', el.style.display); // Debugging log
        } else {
            console.warn('Element not found for ID:', id); // Debugging log
        }
    });

    const currentSectionTitle = document.getElementById('fpc-current-section');
    if (currentSectionTitle) currentSectionTitle.textContent = `Practice ${num}: ${sectionTitles[num - 1]}`; // Debugging log
}

/**
 * Switch between practice sections for Past Perfect Continuous
 */
function switchPPastContSection(num) {
    const sectionTitles = ["Multiple Choice", "Find Errors", "Fill in the Blanks"];

    const dropdown = document.getElementById('ppastcont-practice-dropdown');
    if (dropdown) dropdown.classList.remove('open');

    const sections = ['ppastcont-section-1', 'ppastcont-section-2', 'ppastcont-section-3'];
    sections.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) el.style.display = (idx + 1 === num) ? 'block' : 'none';
    });

    const currentSectionTitle = document.getElementById('ppastcont-current-section');
    if (currentSectionTitle) currentSectionTitle.textContent = `Practice ${num}: ${sectionTitles[num - 1]}`;
}

function renderFuturePerfectContinuousPracticeTasks(container) {
    container.innerHTML = `
<div class="practice-tasks-container">
    <div class="pc-practice-header" style="margin-bottom: 25px;">
        <div class="pc-dropdown-container" id="fpc-practice-dropdown">
            <div class="pc-dropdown-trigger" onclick="this.parentElement.classList.toggle('open')">
                <span id="fpc-current-section">Practice 1: Multiple Choice</span>
                <span class="dropdown-arrow">▼</span>
            </div>
            <div class="pc-dropdown-menu">
                <div class="pc-dropdown-item" onclick="switchFPCSection(1)">Practice 1: Multiple Choice</div>
                <div class="pc-dropdown-item" onclick="switchFPCSection(2)">Practice 2: Find Errors</div>
                <div class="pc-dropdown-item" onclick="switchFPCSection(3)">Practice 3: Fill in the Blanks</div>
            </div>
        </div>
    </div>

    <div id="fpc-section-1">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 1</span>
            <span class="practice-section-title">Multiple Choice</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Affirmative</span></div>
                <h4>Choose the correct affirmative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="fpca-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'fpca',0,0,1)">A) I will have be working for 8 hours by 5 PM.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpca',0,1,1)">B) I will have been working for 8 hours by 5 PM.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpca',0,2,1)">C) I will have working for 8 hours by 5 PM.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpca',0,3,1)">D) I will have been work for 8 hours by 5 PM.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="fpca-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'fpca',1,0,3)">A) They will have been played for two hours by then.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpca',1,1,3)">B) They will have been play for two hours by then.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpca',1,2,3)">C) They will have playing for two hours by then.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpca',1,3,3)">D) They will have been playing for two hours by then.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="fpca-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'fpca',2,0,0)">A) She will have been studying English all day.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpca',2,1,0)">B) She will have being studying English all day.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpca',2,2,0)">C) She will have been study English all day.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpca',2,3,0)">D) She will have study English all day.</div>
                </div>
            </div>
        </div>

        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">Negative</span></div>
                <h4>Choose the correct negative form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="fpcn-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'fpcn',0,0,0)">A) I won’t have been sleeping long by 8 AM.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpcn',0,1,0)">B) I won’t have be sleeping long by 8 AM.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpcn',0,2,0)">C) I will not have sleeping long by 8 AM.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpcn',0,3,0)">D) I not will have been sleeping long by 8 AM.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="fpcn-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'fpcn',1,0,0)">A) They won’t have been waiting for very long.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpcn',1,1,0)">B) They won’t have be waiting for very long.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpcn',1,2,0)">C) They won’t have wait for very long.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpcn',1,3,0)">D) They not will have been waiting for very long.</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="fpcn-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'fpcn',2,0,2)">A) She won’t have be cook dinner for hours.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpcn',2,1,2)">B) She will not have being cooking dinner for hours.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpcn',2,2,2)">C) She won’t have been cooking dinner for hours.</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpcn',2,3,2)">D) She not will have been cooking dinner for hours.</div>
                </div>
            </div>
        </div>

        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">Interrogative</span></div>
                <h4>Choose the correct question form.</h4>
            </div>
            <div class="exercise"><div class="exercise-number">1</div>
                <div class="exercise-options" id="fpci-opts-0">
                    <div class="option" onclick="selectPracticeOption(event,'fpci',0,0,1)">A) Will you have be waiting for long?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpci',0,1,1)">B) Will you have been waiting for long?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpci',0,2,1)">C) Do you will have been waiting for long?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpci',0,3,1)">D) Will you have wait for long?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">2</div>
                <div class="exercise-options" id="fpci-opts-1">
                    <div class="option" onclick="selectPracticeOption(event,'fpci',1,0,0)">A) Will she have been studying for three hours?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpci',1,1,0)">B) Do she will have been studying for three hours?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpci',1,2,0)">C) Will she have be studying for three hours?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpci',1,3,0)">D) Will she have being studying for three hours?</div>
                </div>
            </div>
            <div class="exercise"><div class="exercise-number">3</div>
                <div class="exercise-options" id="fpci-opts-2">
                    <div class="option" onclick="selectPracticeOption(event,'fpci',2,0,0)">A) Will they have been working all day?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpci',2,1,0)">B) Will they have be working all day?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpci',2,2,0)">C) Do they will have been working all day?</div>
                    <div class="option" onclick="selectPracticeOption(event,'fpci',2,3,0)">D) Will they have work all day?</div>
                </div>
            </div>
        </div>
    </div>

    <div id="fpc-section-2" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 2</span>
            <span class="practice-section-title">Find Errors</span>
        </div>
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">Error Correction</span></div>
                <h4>Type the correct form.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line">He will have <strong style="color:#e04040;">be running</strong> for an hour by 5 PM.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fpc-p2-1" data-answer="been running" onkeydown="if(event.key==='Enter')checkFill('fpc-p2-1')"><span class="fill-result" id="fpc-p2-1-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line">She will have been <strong style="color:#e04040;">study</strong> English for five years.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fpc-p2-2" data-answer="studying" onkeydown="if(event.key==='Enter')checkFill('fpc-p2-2')"><span class="fill-result" id="fpc-p2-2-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line">I will have been <strong style="color:#e04040;">watch</strong> that movie for an hour.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fpc-p2-3" data-answer="watching" onkeydown="if(event.key==='Enter')checkFill('fpc-p2-3')"><span class="fill-result" id="fpc-p2-3-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">4</div><div class="fill-dialogue">
                <div class="fill-line">They will have <strong style="color:#e04040;">be playing</strong> football.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fpc-p2-4" data-answer="been playing" onkeydown="if(event.key==='Enter')checkFill('fpc-p2-4')"><span class="fill-result" id="fpc-p2-4-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">5</div><div class="fill-dialogue">
                <div class="fill-line">He <strong style="color:#e04040;">not will have been</strong> coming to this gym.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fpc-p2-5" data-answer="won't have been|will not have been" onkeydown="if(event.key==='Enter')checkFill('fpc-p2-5')"><span class="fill-result" id="fpc-p2-5-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">6</div><div class="fill-dialogue">
                <div class="fill-line">She will not have <strong style="color:#e04040;">being cooking</strong> for long.</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fpc-p2-6" data-answer="been cooking" onkeydown="if(event.key==='Enter')checkFill('fpc-p2-6')"><span class="fill-result" id="fpc-p2-6-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">7</div><div class="fill-dialogue">
                <div class="fill-line">Will he have <strong style="color:#e04040;">be going</strong> to school for 10 years?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fpc-p2-7" data-answer="been going" onkeydown="if(event.key==='Enter')checkFill('fpc-p2-7')"><span class="fill-result" id="fpc-p2-7-res"></span></div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">8</div><div class="fill-dialogue">
                <div class="fill-line">Will you <strong style="color:#e04040;">have watching</strong> TV for hours?</div>
                <div class="fill-line"><span class="speaker-label">Correct:</span> <input class="fill-input" id="fpc-p2-8" data-answer="have been watching" onkeydown="if(event.key==='Enter')checkFill('fpc-p2-8')"><span class="fill-result" id="fpc-p2-8-res"></span></div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div id="fpc-section-3" style="display:none;">
        <div class="practice-section-label">
            <span class="practice-section-badge">Practice 3</span>
            <span class="practice-section-title">Fill in the Blanks</span>
        </div>
        <!-- Affirmative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-affirmative">
                <div class="practice-header-top"><span class="practice-form-tag aff-tag">a) Affirmative</span></div>
                <h4>Use Future Perfect Continuous affirmative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> By 5 PM, I <input class="fill-input" id="fpc-p3a-1a" placeholder="work" data-answer="will have been working" onkeydown="if(event.key==='Enter')checkFill('fpc-p3a-1a')"> for 8 hours.</div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> That's a lot! I <input class="fill-input" id="fpc-p3a-1b" placeholder="rest" data-answer="will have been resting" onkeydown="if(event.key==='Enter')checkFill('fpc-p3a-1b')"> by then.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="fpc-p3a-2a" placeholder="study" data-answer="will have been studying" onkeydown="if(event.key==='Enter')checkFill('fpc-p3a-2a')"> for 4 hours by noon.</div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Nice! I <input class="fill-input" id="fpc-p3a-2b" placeholder="read" data-answer="will have been reading" onkeydown="if(event.key==='Enter')checkFill('fpc-p3a-2b')"> my book by then too.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="fpc-p3a-3a" placeholder="travel" data-answer="will have been traveling" onkeydown="if(event.key==='Enter')checkFill('fpc-p3a-3a')"> for weeks by July.</div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Amazing! We <input class="fill-input" id="fpc-p3a-3b" placeholder="plan" data-answer="will have been planning" onkeydown="if(event.key==='Enter')checkFill('fpc-p3a-3b')"> our trip too.</div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
        <!-- Negative -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-negative">
                <div class="practice-header-top"><span class="practice-form-tag neg-tag">b) Negative</span></div>
                <h4>Use Future Perfect Continuous negative forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> I <input class="fill-input" id="fpc-p3b-1a" placeholder="not / study" data-answer="will not have been studying|won't have been studying" onkeydown="if(event.key==='Enter')checkFill('fpc-p3b-1a')"> for long by 3 PM.</div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Me too! I <input class="fill-input" id="fpc-p3b-1b" placeholder="not / wait" data-answer="will not have been waiting|won't have been waiting" onkeydown="if(event.key==='Enter')checkFill('fpc-p3b-1b')"> for long either.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> She <input class="fill-input" id="fpc-p3b-2a" placeholder="not / cook" data-answer="will not have been cooking|won't have been cooking" onkeydown="if(event.key==='Enter')checkFill('fpc-p3b-2a')"> for hours when you arrive.</div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Right! She <input class="fill-input" id="fpc-p3b-2b" placeholder="not / stand" data-answer="will not have been standing|won't have been standing" onkeydown="if(event.key==='Enter')checkFill('fpc-p3b-2b')"> in the kitchen.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> They <input class="fill-input" id="fpc-p3b-3a" placeholder="not / play" data-answer="will not have been playing|won't have been playing" onkeydown="if(event.key==='Enter')checkFill('fpc-p3b-3a')"> for the whole match.</div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, they <input class="fill-input" id="fpc-p3b-3b" placeholder="not / practice" data-answer="will not have been practicing|won't have been practicing" onkeydown="if(event.key==='Enter')checkFill('fpc-p3b-3b')"> at all.</div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
        <!-- Questions -->
        <div class="practice-form-block">
            <div class="practice-form-header practice-interrogative">
                <div class="practice-header-top"><span class="practice-form-tag int-tag">c) Questions</span></div>
                <h4>Use Future Perfect Continuous question forms.</h4>
            </div>
            <div class="fill-exercise"><div class="fill-q-num">1</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="fpc-p3c-1a" placeholder="..." data-answer="Will" style="width:70px;" onkeydown="if(event.key==='Enter')checkFill('fpc-p3c-1a')"> you <input class="fill-input" id="fpc-p3c-1b" placeholder="wait" data-answer="have been waiting" onkeydown="if(event.key==='Enter')checkFill('fpc-p3c-1b')"> for long by 6 PM?<span class="fill-result" id="fpc-p3c-1a-res"></span><span class="fill-result" id="fpc-p3c-1b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, I will.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">2</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="fpc-p3c-2a" placeholder="..." data-answer="Will" style="width:70px;" onkeydown="if(event.key==='Enter')checkFill('fpc-p3c-2a')"> she <input class="fill-input" id="fpc-p3c-2b" placeholder="come" data-answer="have been coming" onkeydown="if(event.key==='Enter')checkFill('fpc-p3c-2b')"> to this school for long?<span class="fill-result" id="fpc-p3c-2a-res"></span><span class="fill-result" id="fpc-p3c-2b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> No, she won’t.</div>
            </div></div>
            <div class="fill-exercise"><div class="fill-q-num">3</div><div class="fill-dialogue">
                <div class="fill-line speaker-a"><span class="speaker-label">A:</span> <input class="fill-input" id="fpc-p3c-3a" placeholder="..." data-answer="Will" style="width:70px;" onkeydown="if(event.key==='Enter')checkFill('fpc-p3c-3a')"> they <input class="fill-input" id="fpc-p3c-3b" placeholder="travel" data-answer="have been traveling" onkeydown="if(event.key==='Enter')checkFill('fpc-p3c-3b')"> for a month by then?<span class="fill-result" id="fpc-p3c-3a-res"></span><span class="fill-result" id="fpc-p3c-3b-res"></span></div>
                <div class="fill-line speaker-b"><span class="speaker-label">B:</span> Yes, they will.</div>
            </div></div>
            <div style="display:flex;justify-content:flex-end;padding:6px 24px 10px;"><button class="quiz-check-btn" onclick="checkPracticeBlock(this)">Check ✓</button></div>
        </div>
    </div>

    <div class="get-result-bar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button class="get-result-btn" onclick="getResult()">
            📊 Get Result
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(70)" style="background:#22c55e;color:#ffffff;border:none;">
            ✅ Done
        </button>
        <button class="get-result-btn" onclick="forcePracticeResult(67)" style="background:#ef4444;color:#ffffff;border:none;">
            ⚠️ Retake
        </button>
    </div>
</div>`;
}


function loadDynamicPractice(lesson, container) {
    const contentArea = document.getElementById('exercises-content');
    if (contentArea) contentArea.innerHTML = '';

    var tense = getTenseFromURL();
    
    // Use data-driven approach for all tenses - render exercises from the lesson.exercises array
    if (!lesson.exercises || lesson.exercises.length === 0) {
        if (contentArea) contentArea.innerHTML = '<p style="text-align:center;padding:30px;color:#888;">Grammar practice exercises coming soon.</p>';
        return;
    }
    
    loadExercises(lesson);

    // Remove existing result bar if it exists to avoid duplicates
    const oldBar = container.querySelector('.get-result-bar');
    if (oldBar) oldBar.remove();

    // Add "Complete Lesson" button for all non-PS tenses
    var resultBar = document.createElement('div');
    resultBar.className = 'get-result-bar';
    resultBar.style.marginTop = '24px';
    resultBar.innerHTML = `
        <button class="get-result-btn" onclick="completeDynamicLesson()">📊 Complete Lesson</button>
        <button type="button" onclick="skipWithPassword(5)" style="margin-left:10px; background:rgba(255,255,255,0.05); color:#666; border:1px solid #333; padding:8px 12px; border-radius:8px; cursor:pointer; font-size:0.8rem;">Skip ⚡</button>
    `;
    container.appendChild(resultBar);
}

// Called when user clicks "Complete Lesson" in dynamic (non-PS) practice tab
function completeDynamicLesson() {
    var tense       = getTenseFromURL();
    var currentUser = profileManager.getCurrentUser();
    if (!currentUser) { showSaveToast('❌ Please log in', 'error'); return; }

    // Блокируем ввод перед сохранением
    lockPracticeSection();

    triggerSave(null, true);
    profileManager.markTenseCompleted(currentUser.username, tense);

    var currentIdx  = TENSE_ORDER.findIndex(function(t) { return t.id === tense; });
    var tenseLabel  = currentIdx >= 0 ? TENSE_ORDER[currentIdx].label : tense;
    var next        = TENSE_ORDER[currentIdx + 1] || null;

    showSaveToast('🎉 ' + tenseLabel + ' completed!', 'success');
    setTimeout(function() {
        var msg = next
            ? ('Well done! Go to next lesson: ' + next.label + '?')
            : 'Congratulations! You have completed all available tenses!';
        if (next && confirm(msg)) {
            window.location.href = 'lesson.html?tense=' + next.id + '&level=' + next.level;
        } else if (!next) {
            alert(msg);
        }
    }, 1200);
}


// ---- Setup video progress tracking ----
function setupVideoProgressTracking(player) {
    if (!player) return;
    // Video time tracking and restoration disabled. 
    // Videos always start from 0:00 per requirement.
    player.currentTime = 0;
}

// ---- Load video-related Task exercises ----
function loadTaskExercises(lesson) {
    const container = document.getElementById('task-exercises-content');
    if (!container) return;

    container.innerHTML = '';

    // Update task description if present
    const descEl = document.getElementById('task-description');
    if (descEl && lesson.taskDescription) {
        descEl.textContent = lesson.taskDescription;
    }

    const tasks = lesson.taskExercises || [];

    if (tasks.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:24px;color:#888;">Video exercises for this lesson are coming soon.</p>';
        return;
    }

    tasks.forEach((exercise, index) => {
        const div = document.createElement('div');
        div.className = 'exercise';

        let optionsHTML = '';
        exercise.options.forEach((option, optIndex) => {
            optionsHTML += `
                <div class="option" onclick="selectTaskOption(event, ${index}, ${optIndex}, ${exercise.correct})">
                    ${option}
                </div>
            `;
        });

        div.innerHTML = `
            <div class="exercise-number">Task ${index + 1}</div>
            <div class="exercise-question">${exercise.question}</div>
            <div class="exercise-options" id="task-options-${index}">${optionsHTML}</div>
            <div class="exercise-explanation" id="task-explanation-${index}">
                <strong>Explanation:</strong> ${exercise.explanation}
            </div>
        `;
        container.appendChild(div);
    });

    // Re-apply saved task answer highlights after rendering
    if (typeof restoreTaskAnswers === 'function') {
        restoreTaskAnswers(getTenseFromURL());
    }
}

// ---- Handle Task exercise option click ----
function selectTaskOption(event, exerciseIndex, optionIndex, correctIndex) {
    const option = event.currentTarget;
    const optionsContainer = document.getElementById(`task-options-${exerciseIndex}`);
    const explanation = document.getElementById(`task-explanation-${exerciseIndex}`);

    // Lock container after first click
    if (optionsContainer.classList.contains('locked')) return;

    // Remove previous selections (keep onclick handlers so user can re-answer)
    optionsContainer.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected', 'correct', 'incorrect');
    });

    option.classList.add('selected');
    const isCorrect = (optionIndex === correctIndex);

    if (isCorrect) {
        option.classList.add('correct');
        explanation.classList.add('show');
        explanation.innerHTML = '<strong>✓ Correct!</strong><br>' + explanation.innerHTML.replace('<strong>Explanation:</strong> ', '');
    } else {
        option.classList.add('incorrect');
        optionsContainer.children[correctIndex].classList.add('correct');
        explanation.classList.add('show');
    }

    optionsContainer.classList.add('locked');
    optionsContainer.style.pointerEvents = 'none';

    // Options remain clickable — user can change their answer at any time

    // Save aggregate progress stats
    if (typeof recordExerciseAnswer === 'function') {
        recordExerciseAnswer(getTenseFromURL(), isCorrect);
    }

    // Save individual task answer for UI restoration
    if (typeof saveTaskAnswer === 'function') {
        saveTaskAnswer(getTenseFromURL(), exerciseIndex, optionIndex, correctIndex, isCorrect);
    }
}

// ---- Switch between Video / Task / Check tabs ----
function switchLessonTab(tabName) {
    // Check if tab is locked
    const targetBtn = document.getElementById(`tab-btn-${tabName}`);
    if (targetBtn && targetBtn.classList.contains('locked')) {
        // Show a brief shake/warning without navigating
        targetBtn.style.transition = 'transform 0.1s';
        targetBtn.style.transform = 'scale(0.95)';
        setTimeout(() => { targetBtn.style.transform = ''; }, 200);

        // Show hint tooltip
        let hint = document.getElementById('tab-lock-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'tab-lock-hint';
            hint.style.cssText = 'position:fixed;top:140px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:8px;font-size:0.9rem;z-index:9999;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,0.5);';
            document.body.appendChild(hint);
        }
        if (tabName === 'video2') {
            hint.textContent = '🔒 Сначала выполните задания Видео 1';
        } else if (tabName === 'video3') {
            hint.textContent = '🔒 Сначала выполните задания Видео 2';
        } else if (tabName === 'video4') {
            hint.textContent = '🔒 Сначала выполните задания Видео 3';
        } else if (tabName === 'check') {
            hint.textContent = '🔒 Сначала выполните задания по видео';
        } else {
            hint.textContent = '🔒 Сначала выполните предыдущие задания';
        }
        hint.style.opacity = '1';
        clearTimeout(hint._hideTimer);
        hint._hideTimer = setTimeout(() => { hint.style.opacity = '0'; }, 2000);
        return;
    }

    // Hide all tab panels
    document.querySelectorAll('.lesson-tab-content').forEach(panel => {
        panel.classList.remove('active');
        // Pause any video inside the panel being hidden
        const video = panel.querySelector('video');
        if (video) {
            video.pause();
        }
    });

    // Deactivate all tab buttons
    document.querySelectorAll('.lesson-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected panel
    const panel = document.getElementById(`lesson-tab-${tabName}`);
    if (panel) {
        panel.classList.add('active');
        // Reset video to start when tab is opened
        const video = panel.querySelector('video');
        if (video) {
            video.currentTime = 0;
        }
    }

    // Activate corresponding button
    if (targetBtn) targetBtn.classList.add('active');

    // Persist the active tab so the user can continue where they left off
    if (typeof saveActiveTab === 'function') {
        saveActiveTab(getTenseFromURL(), tabName);
    }
}

// Unlock a tab in the nav and switch to it (used by "Next Video" buttons)
function unlockAndGo(tabName, tabBtnId) {
    const tabBtn = document.getElementById(tabBtnId);
    if (tabBtn) {
        tabBtn.classList.remove('locked');
        const icon = tabBtn.querySelector('.tab-icon');
        if (icon) {
            icon.textContent = tabName === 'check' ? '✅' : '🎬';
        }
    }
    switchLessonTab(tabName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loadTheory(lesson) {
    const structEl = document.getElementById('structure');
    if (structEl) structEl.textContent = lesson.structure || '';

    const usageList = document.getElementById('usage');
    if (usageList) {
        usageList.innerHTML = '';
        (lesson.usage || []).forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        usageList.appendChild(li);
    });
    }

    const rulesDiv = document.getElementById('rules');
    if (rulesDiv) {
        rulesDiv.innerHTML = '';
        (lesson.rules || []).forEach(rule => {
        const div = document.createElement('div');
        div.className = 'rule';
        div.innerHTML = `<strong>${rule.type}:</strong> ${rule.example}`;
        rulesDiv.appendChild(div);
    });
    }
}

function loadExercises(lesson) {
    const container = document.getElementById('exercises-content');
    if (!container) return;
    container.innerHTML = '';

    // Full unfiltered exercise list for stable global indices
    const allExercises = (lesson && lesson.exercises) ? lesson.exercises : [];

    // Use filtered exercises based on difficulty and sentence form
    const exercises = getFilteredExercises();

    if (exercises.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px;">No exercises match the selected filters</p>';
        return;
    }

    exercises.forEach((exercise, index) => {
        // globalIndex = stable position in the full (unfiltered) array
        const globalIndex = allExercises.indexOf(exercise);
        const gIdx = globalIndex >= 0 ? globalIndex : index;

        const div = document.createElement('div');
        div.className = 'exercise';
        div.dataset.globalIndex = gIdx;
        
        let optionsHTML = '';
        exercise.options.forEach((option, optIndex) => {
            optionsHTML += `
                <div class="option" onclick="selectOption(event, ${index}, ${optIndex}, ${exercise.correct}, ${gIdx})">
                    ${option}
                </div>
            `;
        });

        div.innerHTML = `
            <div class="exercise-number">Exercise ${index + 1}</div>
            <div class="exercise-question">${exercise.question}</div>
            <div class="exercise-options" id="options-${index}">
                ${optionsHTML}
            </div>
            <div class="exercise-explanation" id="explanation-${index}">
                <strong>Explanation:</strong> ${exercise.explanation}
            </div>
        `;
        
        container.appendChild(div);
    });

    // Re-apply saved answer highlights after rendering
    if (typeof restoreExerciseAnswers === 'function') {
        restoreExerciseAnswers(getTenseFromURL());
    }
}

function selectOption(event, exerciseIndex, optionIndex, correctIndex, globalIndex) {
    const option = event.currentTarget;
    const optionsContainer = document.getElementById(`options-${exerciseIndex}`);
    const explanation = document.getElementById(`explanation-${exerciseIndex}`);

    // Lock container after first click
    if (optionsContainer.classList.contains('locked')) return;

    // Remove previous selections (keep onclick handlers so user can re-answer)
    optionsContainer.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected', 'correct', 'incorrect');
    });

    // Mark selected
    option.classList.add('selected');

    // Check answer
    const isCorrect = (optionIndex === correctIndex);

    // Use globalIndex (stable) for explanation lookup; fall back to exerciseIndex
    const exLookup = (globalIndex !== undefined && globalIndex >= 0) ? globalIndex : exerciseIndex;
    const tense = getTenseFromURL();

    if (isCorrect) {
        option.classList.add('correct');
        explanation.classList.add('show');
        explanation.innerHTML = '<strong>✓ Correct!</strong><br>' + explanation.innerHTML.replace('<strong>Explanation:</strong> ', '');
    } else {
        option.classList.add('incorrect');
        explanation.classList.add('show');
        explanation.innerHTML = '<strong>✗ Incorrect</strong>';
    }

    optionsContainer.classList.add('locked');
    optionsContainer.style.pointerEvents = 'none';

    // Save aggregate progress stats
    if (typeof recordExerciseAnswer === 'function') {
        recordExerciseAnswer(tense, isCorrect);
    }

    // Save individual answer for UI restoration
    if (typeof saveExerciseAnswer === 'function') {
        saveExerciseAnswer(tense, exLookup, optionIndex, correctIndex, isCorrect);
    }

    // Options remain clickable — user can change their answer at any time
}

// ---- Handle static practice task option click (Affirmative / Negative / Interrogative) ----
// prefix: 'aff' | 'neg' | 'int'
function selectPracticeOption(event, prefix, qIndex, optIndex, correctIndex) {
    const option = event.currentTarget;
    const optionsContainer = document.getElementById(`${prefix}-opts-${qIndex}`);
    if (!optionsContainer) return;

    // Lock container after first click
    if (optionsContainer.classList.contains('locked')) return;

    // Remove previous selections (keep onclick handlers so user can re-answer)
    optionsContainer.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected', 'correct', 'incorrect');
        opt.style.pointerEvents = '';
        opt.style.opacity = '';
    });

    option.classList.add('selected');
    const isCorrect = (optIndex === correctIndex);

    if (isCorrect) {
        option.classList.add('correct');
    } else {
        option.classList.add('incorrect');
    }

    // Options remain clickable — user can change their answer at any time

    // Add / update a persistent feedback badge on the exercise block
    const exerciseBlock = optionsContainer.closest('.exercise');
    if (exerciseBlock) {
        let badge = exerciseBlock.querySelector('.practice-mc-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'practice-mc-badge';
            exerciseBlock.appendChild(badge);
        }
        if (isCorrect) {
            badge.textContent = '✓ Correct!';
            badge.className = 'practice-mc-badge practice-mc-badge-ok';
        } else {
            badge.textContent = '✗ Incorrect';
            badge.className = 'practice-mc-badge practice-mc-badge-err';
        }
    }

    // Save progress
    if (typeof recordExerciseAnswer === 'function') {
        recordExerciseAnswer(getTenseFromURL(), isCorrect);
    }

    // Auto-save practice answers to localStorage after each selection
    if (typeof savePracticeMultiChoice === 'function') {
        savePracticeMultiChoice(getTenseFromURL());
    }
}

// ---- Drag-and-drop Practice 3 ----
let _dragSrc = null;

function practiceWordDragStart(e) {
    _dragSrc = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.chipId);
    setTimeout(() => { if (_dragSrc) _dragSrc.classList.add('chip-dragging'); }, 0);
}

function practiceWordDragEnd(e) {
    e.currentTarget.classList.remove('chip-dragging');
}

function practiceZoneDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('zone-drag-over');
}

function practiceZoneDragLeave(e) {
    e.currentTarget.classList.remove('zone-drag-over');
}

function _getInsertPoint(container, x) {
    const chips = [...container.querySelectorAll('.word-chip:not(.chip-dragging)')];
    return chips.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: child };
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function practiceDropOnAnswer(e, qId) {
    e.preventDefault();
    e.currentTarget.classList.remove('zone-drag-over');
    if (!_dragSrc) return;
    const zone = document.getElementById('answer-' + qId);
    const placeholder = zone.querySelector('.answer-zone-placeholder');
    if (placeholder) placeholder.remove();
    const after = _getInsertPoint(zone, e.clientX);
    after ? zone.insertBefore(_dragSrc, after) : zone.appendChild(_dragSrc);
}

function practiceDropOnBank(e, qId) {
    e.preventDefault();
    e.currentTarget.classList.remove('zone-drag-over');
    if (!_dragSrc) return;
    const bank = document.getElementById('bank-' + qId);
    bank.appendChild(_dragSrc);
    const zone = document.getElementById('answer-' + qId);
    if (!zone.querySelector('.word-chip') && !zone.querySelector('.answer-zone-placeholder')) {
        const ph = document.createElement('span');
        ph.className = 'answer-zone-placeholder';
        ph.textContent = 'Drop words here in the correct order\u2026';
        zone.appendChild(ph);
    }
}

function checkWordOrder(qId, correctAnswer) {
    const zone = document.getElementById('answer-' + qId);
    const chips = [...zone.querySelectorAll('.word-chip')];
    if (chips.length === 0) return;
    const userAnswer = chips.map(c => c.dataset.word).join(' ');
    const normalize = s => s.replace(/[.!?,]/g, '').trim();
    const resultEl = document.getElementById('drag-result-' + qId);
    if (normalize(userAnswer) === normalize(correctAnswer)) {
        resultEl.textContent = '\u2713 Correct!';
        resultEl.className = 'drag-result drag-res-ok';
        chips.forEach(c => {
            c.classList.add('chip-correct');
            // Chips remain draggable — user can reset and try differently
        });
    } else {
        resultEl.textContent = '\u2717 Try again';
        resultEl.className = 'drag-result drag-res-err';
        zone.classList.add('zone-shake');
        setTimeout(() => zone.classList.remove('zone-shake'), 500);
    }
}

function chipClickHandler(chip) {
    const qId = chip.dataset.qid;
    const bank = document.getElementById('bank-' + qId);
    const zone = document.getElementById('answer-' + qId);
    if (!bank || !zone) return;
    const inBank = bank.contains(chip);
    if (inBank) {
        // Move chip from bank to answer zone
        const ph = zone.querySelector('.answer-zone-placeholder');
        if (ph) ph.remove();
        zone.appendChild(chip);
    } else {
        // Move chip from answer zone back to bank
        bank.appendChild(chip);
        if (!zone.querySelector('.word-chip') && !zone.querySelector('.answer-zone-placeholder')) {
            const ph = document.createElement('span');
            ph.className = 'answer-zone-placeholder';
            ph.textContent = 'Click words to build the sentence\u2026';
            zone.appendChild(ph);
        }
    }
}

function resetDragQ(qId) {
    const zone = document.getElementById('answer-' + qId);
    const bank = document.getElementById('bank-' + qId);
    if (!zone || !bank) return;

    // Move chips back to the bank and restore click behavior.
    [...zone.querySelectorAll('.word-chip')].forEach(c => {
        c.classList.remove('chip-correct', 'chip-dragging');
        c.style.cursor = 'pointer';
        c.style.pointerEvents = '';
        c.style.opacity = '';
        c.onclick = function() { chipClickHandler(this); };
        bank.appendChild(c);
    });
    // Also re-enable chips still in bank (in case they were locked)
    [...bank.querySelectorAll('.word-chip')].forEach(c => {
        c.classList.remove('chip-correct', 'chip-dragging');
        c.style.cursor = 'pointer';
        c.style.pointerEvents = '';
        c.style.opacity = '';
        c.onclick = function() { chipClickHandler(this); };
    });
    // Restore placeholder
    if (!zone.querySelector('.answer-zone-placeholder')) {
        const ph = document.createElement('span');
        ph.className = 'answer-zone-placeholder';
        ph.textContent = 'Click words to build the sentence\u2026';
        zone.appendChild(ph);
    }
    const resultEl = document.getElementById('drag-result-' + qId);
    if (resultEl) { resultEl.textContent = ''; resultEl.className = 'drag-result'; }
}

// ---- Handle fill-in-the-blank practice answers ----
function checkFill(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const userVal = input.value.trim().toLowerCase().replace(/[.?!]$/, ''); // Remove trailing punctuation
    const correct = (input.dataset.answer || '').toLowerCase();
    const resEl = document.getElementById(inputId + '-res');

    if (!userVal) return;

    // Support pipe-separated alternatives, e.g. "wasn't|was not"
    const alternatives = correct.split('|').map(s => s.trim().replace(/[.?!]$/, '')).filter(Boolean);
    const isCorrect = alternatives.includes(userVal);

    // Input stays editable — user can re-check at any time
    input.disabled = false;
    input.style.pointerEvents = '';

    if (isCorrect) {
        input.classList.add('fill-correct');
        if (resEl) { resEl.textContent = '✓'; resEl.className = 'fill-result fill-res-ok'; }
    } else {
        input.classList.add('fill-incorrect');
        if (resEl) { resEl.innerHTML = `✗`; resEl.className = 'fill-result fill-res-err'; }
    }

    if (typeof recordExerciseAnswer === 'function') {
        recordExerciseAnswer(getTenseFromURL(), isCorrect);
    }

    // Auto-save fill answers to localStorage after each check
    if (typeof saveFillAnswers === 'function') {
        saveFillAnswers(getTenseFromURL());
    }
}

function checkPracticeBlock(btn) {
    const block = btn.closest('.practice-form-block');
    if (!block) return;

    // Validate: all fill inputs in this block must be filled
    const emptyInputs = [];
    block.querySelectorAll('.fill-input').forEach(function(input) {
        if (!input.disabled && input.value.trim() === '') {
            emptyInputs.push(input);
        }
    });

    // Remove any previous warning message
    const btnParent = btn.parentElement;
    const oldMsg = btnParent.querySelector('.check-required-msg');
    if (oldMsg) oldMsg.remove();

    if (emptyInputs.length > 0) {
        // Show warning and focus the first empty field
        const msg = document.createElement('span');
        msg.className = 'check-required-msg';
        msg.style.cssText = 'color:#e04040;font-size:0.88em;font-weight:600;margin-right:10px;';
        msg.textContent = '⚠ Answer is required';
        btnParent.insertBefore(msg, btn);
        emptyInputs[0].focus();
        return;
    }

    // All fields filled — run checks
    block.querySelectorAll('.fill-input').forEach(function(input) {
        if (input.id) checkFill(input.id);
    });
}

// Initialize exercise controls with event listeners
function initializeExerciseControls() {
    // Add event listeners to difficulty buttons
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const level = this.getAttribute('data-level');
            setDifficulty(level);
        });
    });

    // Add event listeners to form buttons
    document.querySelectorAll('.form-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const form = this.getAttribute('data-form');
            setSentenceForm(form);
        });
    });
}

// Set current difficulty level and filter exercises
function setDifficulty(level) {
    const tense = getTenseFromURL();
    const currentUser = profileManager.getCurrentUser();
    const allProgress = currentUser ? (profileManager.getUserProgress(currentUser.username) || {}) : {};
    const tenseProgress = allProgress[tense] || {};

    // Check if user can access this difficulty level
    if (level === 'medium' && (!tenseProgress.light || tenseProgress.light < 100)) {
        alert('Please reach 100% on Light before unlocking Medium');
        return;
    }

    if (level === 'hard' && (!tenseProgress.medium || tenseProgress.medium < 100)) {
        alert('Please reach 100% on Medium before unlocking Hard');
        return;
    }

    currentDifficulty = level;

    // Update active button styling
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        if (btn.getAttribute('data-level') === level) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Re-render exercises with new filter
    const lesson = lessonsData[tense];
    loadExercises(lesson);
}

// Set current sentence form and filter exercises
function setSentenceForm(form) {
    currentSentenceForm = form;

    // Update active button styling
    document.querySelectorAll('.form-btn').forEach(btn => {
        if (btn.getAttribute('data-form') === form) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Re-render exercises with new filter
    const tense = getTenseFromURL();
    const lesson = lessonsData[tense];
    loadExercises(lesson);
}

// Filter exercises based on current difficulty and sentence form
function getFilteredExercises() {
    const tense = getTenseFromURL();
    const tenseData = lessonsData[tense];

    if (!tenseData || !tenseData.exercises) {
        return [];
    }

    return tenseData.exercises.filter(exercise => {
        const difficultyMatch = !exercise.difficulty || exercise.difficulty === currentDifficulty;
        const formMatch = currentSentenceForm === 'all' || !exercise.sentenceForm || exercise.sentenceForm === currentSentenceForm;
        return difficultyMatch && formMatch;
    });
}
// ===================== VIDEO QUIZ FUNCTIONS =====================

// Tracks which quiz questions have been answered (answered = submitted, regardless of right/wrong)
const video1Answered = new Set();
const VIDEO1_TOTAL = 5; // legacy — kept for backward compat
// Dynamic totals — updated by renderVideoQuiz() when questions are rendered
var videoQuizTotals = { 1: 5, 2: 5, 3: 5, 4: 5 };
// Tracks remaining attempts for drag-type video quiz questions (per questionId)
var _videoDragAttempts = {};

/** Update the progress bar based on how many questions have been answered */
function updateVideo1Progress() {
    const count = video1Answered.size;
    const total = videoQuizTotals[1];
    const pct = Math.round((count / total) * 100);

    const fill = document.getElementById('quiz1-fill');
    const countEl = document.getElementById('quiz1-count');
    const hint = document.getElementById('quiz1-hint');

    if (fill) fill.style.width = pct + '%';
    if (countEl) countEl.textContent = count + ' / ' + total;

    if (hint) {
        if (count >= total) {
            hint.textContent = '🎉 All done! Ready for Video 2 →';
            hint.classList.add('quiz-progress-done');
        } else {
            const left = total - count;
            hint.textContent = left + ' question' + (left > 1 ? 's' : '') + ' left — keep going!';
            hint.classList.remove('quiz-progress-done');
        }
    }

    // Unlock / lock the Video 2 button
    const goBtn = document.getElementById('btn-go-video2');
    const doneHint = document.getElementById('quiz1-done-hint');
    if (goBtn) {
        if (count >= total) {
            goBtn.disabled = false;
            if (doneHint) doneHint.textContent = '👇 All done! Head to Video 2';
        } else {
            goBtn.disabled = true;
        }
    }

    // Unlock Video 2 tab button in top nav
    if (count >= total) {
        const tab2Btn = document.getElementById('tab-btn-video2');
        if (tab2Btn && tab2Btn.classList.contains('locked')) {
            tab2Btn.classList.remove('locked');
            const icon = tab2Btn.querySelector('.tab-icon');
            if (icon) icon.textContent = '🎬';
        }
    }

    // Persist state so it survives page navigation / tab close
    if (typeof saveVideoQuizState === 'function') saveVideoQuizState();
}

// ===============================================================

// ===================== VIDEO 2 QUIZ FUNCTIONS =====================

const video2Answered = new Set();

function updateVideo2Progress() {
    const count = video2Answered.size;
    const total = videoQuizTotals[2] || 3;
    const pct = Math.round((count / total) * 100);

    const fill = document.getElementById('quiz2-fill');
    const countEl = document.getElementById('quiz2-count');
    const hint = document.getElementById('quiz2-hint');

    // Detect if Video 3 tab is hidden (tense only has 2 videos, e.g. Present Continuous)
    const tab3Btn = document.getElementById('tab-btn-video3');
    const hasVideo3 = tab3Btn && tab3Btn.style.display !== 'none';

    if (fill) fill.style.width = pct + '%';
    if (countEl) countEl.textContent = count + ' / ' + total;

    if (hint) {
        if (count >= total) {
            hint.textContent = hasVideo3 ? '🎉 All done! Ready for Video 3 →' : '🎉 All done! Ready for Practice Tasks →';
            hint.classList.add('quiz-progress-done');
        } else {
            const left = total - count;
            hint.textContent = left + ' question' + (left > 1 ? 's' : '') + ' left — keep going!';
            hint.classList.remove('quiz-progress-done');
        }
    }

    const goBtn = document.getElementById('btn-go-video3');
    const doneHint = document.getElementById('quiz2-done-hint');
    if (goBtn) {
        if (count >= total) {
            goBtn.disabled = false;
            if (doneHint) doneHint.textContent = hasVideo3 ? '👇 All done! Head to Video 3' : '👇 All done! Head to Practice Tasks';
        } else {
            goBtn.disabled = true;
        }
    }

    // Unlock Video 3 tab button in top nav (only if it exists and is visible)
    if (count >= total && hasVideo3) {
        if (tab3Btn && tab3Btn.classList.contains('locked')) {
            tab3Btn.classList.remove('locked');
            const icon = tab3Btn.querySelector('.tab-icon');
            if (icon) icon.textContent = '🎬';
        }
    }

    // If no Video 3, unlock Practice Tasks tab directly
    if (count >= total && !hasVideo3) {
        const checkTabBtn = document.getElementById('tab-btn-check');
        if (checkTabBtn && checkTabBtn.classList.contains('locked')) {
            checkTabBtn.classList.remove('locked');
            const icon = checkTabBtn.querySelector('.tab-icon');
            if (icon) icon.textContent = '✅';
        }
    }

    // Persist state so it survives page navigation / tab close
    if (typeof saveVideoQuizState === 'function') saveVideoQuizState();
}

// ==================================================================

// ===================== VIDEO 3 QUIZ FUNCTIONS =====================

const video3Answered = new Set();

function updateVideo3Progress() {
    const count = video3Answered.size;
    const total = videoQuizTotals[3] > 0 ? videoQuizTotals[3] : 0;
    const pct = total === 0 ? 100 : Math.round((count / total) * 100);

    const fill = document.getElementById('quiz3-fill');
    const countEl = document.getElementById('quiz3-count');
    const hint = document.getElementById('quiz3-hint');

    if (fill) fill.style.width = pct + '%';
    if (countEl) countEl.textContent = total === 0 ? '✓' : count + ' / ' + total;

    if (hint) {
        if (count >= total) {
            hint.textContent = '🎉 All done! Ready for Practice Tasks →';
            hint.classList.add('quiz-progress-done');
        } else {
            const left = total - count;
            hint.textContent = left + ' question' + (left > 1 ? 's' : '') + ' left — keep going!';
            hint.classList.remove('quiz-progress-done');
        }
    }

    const goBtn = document.getElementById('btn-go-video4');
    const doneHint = document.getElementById('quiz3-done-hint');

    // Determine whether Video 4 tab is visible (present-simple) or hidden (other tenses)
    const tab4Btn = document.getElementById('tab-btn-video4');
    const hasVideo4 = tab4Btn && tab4Btn.style.display !== 'none';

    if (count >= total) {
        // Enable the "Next" button
        if (goBtn) goBtn.disabled = false;

        if (hasVideo4) {
            if (doneHint) doneHint.textContent = '👇 All done! Head to Video 4 →';
            // Unlock Video 4 tab in top nav
            if (tab4Btn) {
                tab4Btn.classList.remove('locked');
                const icon = tab4Btn.querySelector('.tab-icon');
                if (icon) icon.textContent = '🎬';
            }
        } else {
            if (doneHint) doneHint.textContent = '👇 All done! Head to Practice Tasks';
            // Unlock the Practice Tasks tab in top nav
            const checkTabBtn = document.getElementById('tab-btn-check');
            if (checkTabBtn) {
                checkTabBtn.classList.remove('locked');
                const icon = checkTabBtn.querySelector('.tab-icon');
                if (icon) icon.textContent = '✅';
            }
        }
    } else {
        if (goBtn) goBtn.disabled = true;
    }

    // Persist state so it survives page navigation / tab close
    if (typeof saveVideoQuizState === 'function') saveVideoQuizState();
}

// ==================================================================

// ===================== VIDEO 4 QUIZ FUNCTIONS =====================

const video4Answered = new Set();

function updateVideo4Progress() {
    const count = video4Answered.size;
    const total = videoQuizTotals[4] || 5;
    const pct = Math.round((count / total) * 100);

    const fill    = document.getElementById('quiz4-fill');
    const countEl = document.getElementById('quiz4-count');
    const hint    = document.getElementById('quiz4-hint');

    if (fill)    fill.style.width    = pct + '%';
    if (countEl) countEl.textContent = count + ' / ' + total;

    if (hint) {
        if (count >= total) {
            hint.textContent = '🎉 All done! Ready for Practice Tasks →';
            hint.classList.add('quiz-progress-done');
        } else {
            const left = total - count;
            hint.textContent = left + ' question' + (left > 1 ? 's' : '') + ' left — keep going!';
            hint.classList.remove('quiz-progress-done');
        }
    }

    const goBtn    = document.getElementById('btn-go-check-from-v4');
    const doneHint = document.getElementById('quiz4-done-hint');

    if (count >= total) {
        if (goBtn)    goBtn.disabled   = false;
        if (doneHint) doneHint.textContent = '👇 All done! Head to Practice Tasks';

        // Unlock the Practice Tasks tab in top nav
        const checkTabBtn = document.getElementById('tab-btn-check');
        if (checkTabBtn) {
            checkTabBtn.classList.remove('locked');
            const icon = checkTabBtn.querySelector('.tab-icon');
            if (icon) icon.textContent = '✅';
        }
    } else {
        if (goBtn) goBtn.disabled = true;
    }

    if (typeof saveVideoQuizState === 'function') saveVideoQuizState();
}

// ==================================================================
