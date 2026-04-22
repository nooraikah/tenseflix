/**
 * Progress Data
 * Handles persistent saving and restoring of lesson progress:
 *   - Video quiz answers (which questions answered, section completion)
 *   - Grammar exercise answers (per-exercise: selected option, correct/incorrect)
 *   - Task exercise answers (per-task: selected option, correct/incorrect)
 *   - Active lesson tab (so the user continues where they left off)
 * All data is stored in the user's profile via ProfileManager (localStorage).
 */

// ── Record a grammar / task exercise answer (aggregate stats) ────────────────

/**
 * Called after each grammar or task exercise answer.
 * Increments the aggregate completed/correctCount counters for the tense.
 */
function recordExerciseAnswer(tenseId, isCorrect) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const progress  = profileManager.getUserProgress(currentUser.username) || {};
    const tenseData = progress[tenseId] || {};

    const total        = tenseData.total || 15;
    const completed    = Math.min((tenseData.completed || 0) + 1, total);
    const correctCount = (tenseData.correctCount || 0) + (isCorrect ? 1 : 0);
    const lightPct     = Math.round((completed / total) * 100);

    profileManager.updateProgress(currentUser.username, tenseId, {
        completed:    completed,
        correctCount: correctCount,
        light:        lightPct
    });

    // Check if lesson is now complete
    if (isLessonComplete(tenseId)) {
        updateLessonCompletion(tenseId);
    }
}

// ── Save individual grammar exercise answer ──────────────────────────────────

/**
 * Saves the specific answer for a grammar exercise so the UI can be restored
 * when the user returns to the lesson.
 * @param {string} tenseId        - tense key (e.g. 'present-simple')
 * @param {number} globalIndex    - index in the full lessonsData[tense].exercises array
 * @param {number} selectedIndex  - index of the option the user chose
 * @param {number} correctIndex   - index of the correct option
 * @param {boolean} isCorrect     - whether the user answered correctly
 */
function saveExerciseAnswer(tenseId, globalIndex, selectedIndex, correctIndex, isCorrect) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const existingState   = profileManager.getLessonState(currentUser.username, tenseId);
    const exerciseAnswers = existingState.exerciseAnswers || {};
    exerciseAnswers[globalIndex] = { selectedIndex, correctIndex, isCorrect };
    profileManager.saveLessonState(currentUser.username, tenseId, { exerciseAnswers });
}

// ── Save individual task exercise answer ────────────────────────────────────

/**
 * Saves the specific answer for a task (video-related) exercise.
 */
function saveTaskAnswer(tenseId, taskIndex, selectedIndex, correctIndex, isCorrect) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const existingState = profileManager.getLessonState(currentUser.username, tenseId);
    const taskAnswers   = existingState.taskAnswers || {};
    taskAnswers[taskIndex] = { selectedIndex, correctIndex, isCorrect };
    profileManager.saveLessonState(currentUser.username, tenseId, { taskAnswers });
}

// ── Save active lesson tab ──────────────────────────────────────────────────

/**
 * Persists which tab the user was on so they can continue where they left off.
 */
function saveActiveTab(tenseId, tabName) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;
    profileManager.saveLessonState(currentUser.username, tenseId, { activeTab: tabName });
}

// ── Save video-quiz state with full details ────────────────────────────────

/**
 * Persists the current state of all three video-quiz answer Sets with full details.
 * Called at the end of every updateVideoXProgress() so we always have
 * an up-to-date snapshot in localStorage.
 */
function saveVideoQuizState() {
    const tense       = getTenseFromURL();
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const video1Details = captureVideoQuizDetails(1, video1Answered);
    const video2Details = captureVideoQuizDetails(2, video2Answered);
    const video3Details = captureVideoQuizDetails(3, video3Answered);
    const video4Details = captureVideoQuizDetails(4, video4Answered);

    profileManager.saveLessonState(currentUser.username, tense, {
        video1Answered: [...video1Answered],
        video2Answered: [...video2Answered],
        video3Answered: [...video3Answered],
        video4Answered: [...video4Answered],
        video1Details: video1Details,
        video2Details: video2Details,
        video3Details: video3Details,
        video4Details: video4Details
    });
}

// ── Capture video quiz question details ──────────────────────────────────────

/**
 * Captures all visual details of answered video quiz questions for restoration
 */
function captureVideoQuizDetails(videoNumber, answeredSet) {
    const details = {};
    
    answeredSet.forEach(questionId => {
        const card = document.getElementById(questionId);
        if (!card) return;
        
        const feedbackEl = card.querySelector('.quiz-feedback');
        const optButtons = card.querySelectorAll('.quiz-opt-btn');
        const checkboxes = card.querySelectorAll('input[type="checkbox"]');
        
        details[questionId] = {
            feedback: feedbackEl ? feedbackEl.textContent : '',
            feedbackHTML: feedbackEl ? feedbackEl.innerHTML : '',
            disabled: card.querySelector('.quiz-check-btn')?.disabled || false,
            selectedOptions: Array.from(optButtons)
                .map(btn => ({
                    text: btn.textContent,
                    hasCorrect: btn.classList.contains('correct'),
                    hasIncorrect: btn.classList.contains('incorrect'),
                    hasSelected: btn.classList.contains('selected')
                })),
            checkboxStates: Array.from(checkboxes)
                .map(cb => ({
                    value: cb.value,
                    checked: cb.checked,
                    disabled: cb.disabled,
                    labelClasses: cb.closest('.quiz-multi-label')?.className || ''
                }))
        };
    });
    
    return details;
}

// ── Restore video quiz full state ────────────────────────────────────────────

/**
 * Restores video quiz questions with all their visual details
 */
function restoreVideoQuizFullState(videoNumber) {
    const tense = getTenseFromURL();
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;
    
    const state = profileManager.getLessonState(currentUser.username, tense);
    if (!state) return;
    
    const detailsKey = `video${videoNumber}Details`;
    const answeredKey = `video${videoNumber}Answered`;
    
    const details = state[detailsKey];
    const answered = state[answeredKey];
    
    if (!details || !answered) return;
    
    answered.forEach(questionId => {
        const detail = details[questionId];
        if (!detail) return;
        
        const card = document.getElementById(questionId);
        if (!card) return;
        
        // Restore feedback
        const feedbackEl = card.querySelector('.quiz-feedback');
        if (feedbackEl) {
            feedbackEl.innerHTML = detail.feedbackHTML || detail.feedback;
        }
        
        // Restore button states
        const buttons = card.querySelectorAll('.quiz-opt-btn');
        buttons.forEach((btn, idx) => {
            btn.disabled = detail.disabled;
            if (detail.selectedOptions[idx]) {
                const opt = detail.selectedOptions[idx];
                if (opt.hasCorrect) btn.classList.add('correct');
                if (opt.hasIncorrect) btn.classList.add('incorrect');
                if (opt.hasSelected) btn.classList.add('selected');
            }
        });
        
        // Restore checkbox states
        const checkboxes = card.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((cb, idx) => {
            if (detail.checkboxStates[idx]) {
                const state = detail.checkboxStates[idx];
                cb.checked = state.checked;
                cb.disabled = state.disabled;
                const label = cb.closest('.quiz-multi-label');
                if (label && state.labelClasses) {
                    label.className = state.labelClasses;
                }
            }
        });
        
        // Disable quiz check button
        const checkBtn = card.querySelector('.quiz-check-btn');
        if (checkBtn) checkBtn.disabled = detail.disabled;
    });
}

// ── Restore grammar exercise answers onto the DOM ───────────────────────────

/**
 * After loadExercises() re-renders the exercise DOM, this function reads the
 * saved exerciseAnswers from localStorage and re-applies the visual state
 * (selected/correct/incorrect highlighting, explanation visible, options disabled).
 */
function restoreExerciseAnswers(tenseId) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const state = profileManager.getLessonState(currentUser.username, tenseId);
    if (!state || !state.exerciseAnswers) return;

    document.querySelectorAll('#exercises-content .exercise').forEach(exDiv => {
        const globalIndex = exDiv.dataset.globalIndex;
        if (globalIndex === undefined) return;

        const saved = state.exerciseAnswers[globalIndex];
        if (!saved) return;

        const optionsContainer = exDiv.querySelector('.exercise-options');
        const explanation      = exDiv.querySelector('.exercise-explanation');
        if (!optionsContainer) return;

        const options = Array.from(optionsContainer.querySelectorAll('.option'));

        // Disable all options — question already answered
        options.forEach(opt => {
            opt.style.pointerEvents = 'none';
            opt.style.opacity       = '0.7';
            opt.onclick             = null;
        });

        // Highlight the chosen option
        if (options[saved.selectedIndex]) {
            options[saved.selectedIndex].classList.add('selected');
            if (saved.isCorrect) {
                options[saved.selectedIndex].classList.add('correct');
            } else {
                options[saved.selectedIndex].classList.add('incorrect');
                // Also highlight the correct answer
                if (saved.correctIndex !== undefined && options[saved.correctIndex]) {
                    options[saved.correctIndex].classList.add('correct');
                }
            }
        }

        // Show explanation
        if (explanation) explanation.classList.add('show');
    });
}

// ── Restore task exercise answers onto the DOM ────────────────────────────────

/**
 * After loadTaskExercises() re-renders the task DOM, this function reads the
 * saved taskAnswers from localStorage and re-applies the visual state.
 */
function restoreTaskAnswers(tenseId) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const state = profileManager.getLessonState(currentUser.username, tenseId);
    if (!state || !state.taskAnswers) return;

    Object.keys(state.taskAnswers).forEach(taskIndex => {
        const saved           = state.taskAnswers[taskIndex];
        const optionsContainer = document.getElementById(`task-options-${taskIndex}`);
        const explanation      = document.getElementById(`task-explanation-${taskIndex}`);
        if (!optionsContainer) return;

        const options = Array.from(optionsContainer.querySelectorAll('.option'));

        options.forEach(opt => {
            opt.style.pointerEvents = 'none';
            opt.style.opacity       = '0.7';
            opt.onclick             = null;
        });

        if (options[saved.selectedIndex]) {
            options[saved.selectedIndex].classList.add('selected');
            if (saved.isCorrect) {
                options[saved.selectedIndex].classList.add('correct');
            } else {
                options[saved.selectedIndex].classList.add('incorrect');
                if (saved.correctIndex !== undefined && options[saved.correctIndex]) {
                    options[saved.correctIndex].classList.add('correct');
                }
            }
        }

        if (explanation) explanation.classList.add('show');
    });
}

// ── Disable already-answered video quiz questions ────────────────────────────

/**
 * For each answered video-quiz question ID, disables all interactive controls
 * and shows a subtle "already answered" label if no feedback is present yet.
 */
function restoreVideoQuizAnsweredState(answeredIds) {
    answeredIds.forEach(qId => {
        const card = document.getElementById(qId);
        if (!card) return;

        // Disable buttons and checkboxes
        card.querySelectorAll('.quiz-opt-btn, .quiz-check-btn').forEach(b => {
            b.disabled = true;
        });
        card.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(inp => {
            inp.disabled = true;
        });

        // Show indicator if feedback area is empty
        const feedbackEl = document.getElementById(qId + '-feedback');
        if (feedbackEl && !feedbackEl.textContent.trim()) {
            feedbackEl.innerHTML =
                '<span style="color:#888;font-style:italic;font-size:0.85rem;">✓ Уже отвечено</span>';
        }
    });
}

// ── Restore video-quiz state on page load ────────────────────────────────────

/**
 * Reads the saved lesson state and:
 *  1. Re-populates video-quiz Sets (restores progress bars & unlock states)
 *  2. Disables already-answered video quiz questions
 *  3. Restores grammar exercise visual answers
 *  4. Restores task exercise visual answers
 *  5. Navigates to the last active tab (so the user continues where they left off)
 */
let _isRestoringState = false;

function restoreFromSavedState() {
    const tense       = getTenseFromURL();
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    // ── Read state: direct flat key first (most reliable), then nested fallback ─
    let state = null;
    const directKey = `tenseflix_state_${currentUser.username}_${tense}`;
    const directRaw = localStorage.getItem(directKey);
    if (directRaw) {
        try { state = JSON.parse(directRaw); } catch (e) {}
    }
    if (!state || Object.keys(state).length === 0) {
        state = profileManager.getLessonState(currentUser.username, tense);
    }
    if (!state || Object.keys(state).length === 0) return;

    _isRestoringState = true;

    // ── Restore video quiz answered sets ─────────────────────────────────────
    if (Array.isArray(state.video1Answered) && state.video1Answered.length > 0) {
        state.video1Answered.forEach(id => video1Answered.add(id));
        updateVideo1Progress();
        restoreVideoQuizFullState(1);
    }

    if (Array.isArray(state.video2Answered) && state.video2Answered.length > 0) {
        state.video2Answered.forEach(id => video2Answered.add(id));
        updateVideo2Progress();
        restoreVideoQuizFullState(2);
    }

    if (Array.isArray(state.video3Answered) && state.video3Answered.length > 0) {
        state.video3Answered.forEach(id => video3Answered.add(id));
        updateVideo3Progress();
        restoreVideoQuizFullState(3);
    }

    if (Array.isArray(state.video4Answered) && state.video4Answered.length > 0) {
        state.video4Answered.forEach(id => video4Answered.add(id));
        updateVideo4Progress();
        restoreVideoQuizFullState(4);
    }

    _isRestoringState = false;

    // ── Restore exercise / task answer visuals ───────────────────────────────
    restoreExerciseAnswers(tense);
    restoreTaskAnswers(tense);

    // ── Restore fill-in-the-blank answers ────────────────────────────────────
    if (state.fillAnswers && Object.keys(state.fillAnswers).length > 0) {
        Object.entries(state.fillAnswers).forEach(([inputId, saved]) => {
            const input = document.getElementById(inputId);
            if (!input) return;
            input.value = saved.value || '';
            if (saved.disabled) {
                input.disabled = true;
                input.style.opacity = '0.75';
            }
            const resEl = document.getElementById(inputId + '-res');
            if (resEl && saved.resultText) resEl.textContent = saved.resultText;
        });
    } else if (typeof restoreFillAnswers === 'function') {
        restoreFillAnswers(tense);
    }

    // ── Restore multiple-choice practice answers ──────────────────────────────
    if (state.practiceAnswers && Object.keys(state.practiceAnswers).length > 0) {
        Object.entries(state.practiceAnswers).forEach(([key, saved]) => {
            const [prefix, idxStr] = key.split('-');
            const cont = document.getElementById(`${prefix}-opts-${idxStr}`);
            if (!cont) return;
            const opts = Array.from(cont.querySelectorAll('.option'));
            opts.forEach(o => { o.onclick = null; });
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
    } else if (typeof restorePracticeMultiChoice === 'function') {
        restorePracticeMultiChoice(tense);
    }

    // ── Restore video playback positions ─────────────────────────────────────
    if (state.videoTimes) {
        Object.entries(state.videoTimes).forEach(([key, time]) => {
            if (!time || time <= 0) return;
            const n        = parseInt(key.replace('video', ''));
            const playerId = n === 1 ? 'lesson-video-player' : `lesson-video-player-${n}`;
            const player   = document.getElementById(playerId);
            if (player) {
                // Set immediately, and also on loadedmetadata in case video hasn't loaded yet
                player.currentTime = time;
                player.addEventListener('loadedmetadata', () => { player.currentTime = time; }, { once: true });
            }
        });
    }

    // ── Navigate to last active tab ───────────────────────────────────────────
    if (state.activeTab) {
        const tabBtn = document.getElementById(`tab-btn-${state.activeTab}`);
        if (tabBtn && !tabBtn.classList.contains('locked')) {
            setTimeout(() => switchLessonTab(state.activeTab), 200);
        }
    }
}

// ── Save video current time ──────────────────────────────────────────────────

/**
 * Saves the current playback time of the video so the user can resume from where they left off
 */
function saveVideoTime(tenseId, videoNumber, currentTime) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const existingState = profileManager.getLessonState(currentUser.username, tenseId);
    const videoTimes = existingState.videoTimes || {};
    videoTimes[`video${videoNumber}`] = currentTime;
    profileManager.saveLessonState(currentUser.username, tenseId, { videoTimes });
}

// ── Restore video current time ──────────────────────────────────────────────

/**
 * Restores the video to the last saved time
 */
function restoreVideoTime(tenseId, videoNumber, player) {
    if (!player) return;

    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const state = profileManager.getLessonState(currentUser.username, tenseId);
    if (!state || !state.videoTimes) return;

    const savedTime = state.videoTimes[`video${videoNumber}`];
    if (savedTime !== undefined && savedTime > 0) {
        player.currentTime = savedTime;
    }
}

// ── Save video quiz individual answers ──────────────────────────────────────

/**
 * Saves an individual video quiz answer so it can be restored with proper visual state
 */
function saveVideoQuizAnswer(tenseId, videoNumber, questionId, selected, correct, feedbackText) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const existingState = profileManager.getLessonState(currentUser.username, tenseId);
    const videoAnswers = existingState.videoAnswers || {};
    
    if (!videoAnswers[`video${videoNumber}`]) {
        videoAnswers[`video${videoNumber}`] = {};
    }
    
    videoAnswers[`video${videoNumber}`][questionId] = {
        selected,
        correct,
        feedbackText
    };
    
    profileManager.saveLessonState(currentUser.username, tenseId, { videoAnswers });
}

// ── Restore video quiz individual answers ───────────────────────────────────

/**
 * Restores visual state of individual video quiz answers with full details
 */
function restoreVideoQuizAnswer(tenseId, videoNumber, questionId) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const state = profileManager.getLessonState(currentUser.username, tenseId);
    if (!state || !state.videoAnswers || !state.videoAnswers[`video${videoNumber}`]) return;

    const answer = state.videoAnswers[`video${videoNumber}`][questionId];
    if (!answer) return;

    return answer;
}

// ── Check if lesson is complete ──────────────────────────────────────────────

/**
 * Checks if all tasks in a lesson have been completed
 */
function isLessonComplete(tenseId) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return false;

    const state = profileManager.getLessonState(currentUser.username, tenseId);
    if (!state) return false;

    // Check if all video quiz sections are complete
    const totalVideoQuestions = 6 + 6 + 6; // Assuming 6 questions per video
    const answered = (state.video1Answered?.length || 0) + 
                    (state.video2Answered?.length || 0) + 
                    (state.video3Answered?.length || 0);
    
    if (answered < totalVideoQuestions) return false;

    // Check if all exercises are complete (15 exercises)
    const exerciseAnswers = state.exerciseAnswers || {};
    if (Object.keys(exerciseAnswers).length < 15) return false;

    // Check if all tasks are complete (5 tasks)
    const taskAnswers = state.taskAnswers || {};
    if (Object.keys(taskAnswers).length < 5) return false;

    return true;
}

// ── Mark lesson as complete and update profile ────────────────────────────────

/**
 * Updates profile with lesson completion status and detailed statistics
 */
function updateLessonCompletion(tenseId) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const state = profileManager.getLessonState(currentUser.username, tenseId);
    if (!state) return;

    // Calculate statistics
    const exerciseAnswers = state.exerciseAnswers || {};
    const taskAnswers = state.taskAnswers || {};
    
    let correctExercises = 0;
    Object.values(exerciseAnswers).forEach(answer => {
        if (answer.isCorrect) correctExercises++;
    });

    let correctTasks = 0;
    Object.values(taskAnswers).forEach(answer => {
        if (answer.isCorrect) correctTasks++;
    });

    // Update progress
    const totalAnswers = Object.keys(exerciseAnswers).length + 
                        Object.keys(taskAnswers).length;
    const totalCorrect = correctExercises + correctTasks;
    
    const progressData = {
        completed: totalAnswers,
        correctCount: totalCorrect,
        light: Math.round((totalCorrect / totalAnswers) * 100),
        completedAt: new Date().toISOString()
    };

    profileManager.updateProgress(currentUser.username, tenseId, progressData);
    profileManager.markTenseCompleted(currentUser.username, tenseId);
}
