/**
 * Dashboard Script
 * Manages dashboard functionality and user progress
 */

let isRedirecting = false;

// Check if user is logged in
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    if (!isRedirecting) {
        loadUserInfo();
        initializeLevels();
        if (typeof initStarryBackground === 'function') initStarryBackground();
    }
});

// Authentication check
function checkAuth() {
    if (!profileManager.isLoggedIn()) {
        isRedirecting = true;
        window.location.href = 'login.html';
        return;
    }
}

// Load user information
function loadUserInfo() {
    const currentUser = profileManager.getCurrentUser();
    if (currentUser) {
        // Remove language switcher on this page
        const switcher = document.querySelector('.language-switcher');
        if (switcher) switcher.style.display = 'none';

        const nameFirst = currentUser.fullName ? currentUser.fullName.split(' ')[0] : 'User';
        const userElement = document.getElementById('user-name');
        if (userElement) {
            userElement.textContent = nameFirst;
            
            // Add admin badge if user is admin
            if (profileManager.isCurrentUserAdmin()) {
                const adminBadge = document.createElement('span');
                adminBadge.textContent = ' [ADMIN]';
                adminBadge.style.color = '#e74c3c';
                adminBadge.style.fontWeight = 'bold';
                userElement.parentNode.appendChild(adminBadge);
            }
        }

        // Replace human icon with profile picture if available
        const profile = profileManager.getProfile(currentUser.username);
        const profileBtn = document.querySelector('.profile-btn');
        if (profileBtn) {
            profileBtn.innerHTML = profileManager.getAvatarHTML(profile ? profile.photo : null, profile ? profile.gender : null, 34, 0);
            profileBtn.style.display = 'flex';
            profileBtn.style.alignItems = 'center';
            profileBtn.style.justifyContent = 'center';
        }
        
        // Remove empty space in footer
        const footer = document.querySelector('.footer');
        if (footer) {
            footer.style.padding = '40px 0';
            footer.style.marginTop = '0';
            footer.style.marginBottom = '-50px';

            const p = footer.querySelector('p');
            if (p) p.style.margin = '0';
        }
        const dashboardContent = document.querySelector('.dashboard-container') || document.querySelector('.profile-container');
        if (dashboardContent) dashboardContent.style.paddingBottom = '0';
    }
}

// Initialize levels based on user progress
function initializeLevels() {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;
    
    const userProgress = profileManager.getUserProgress(currentUser.username);
    if (!userProgress) return;
    
    const TENSE_PROGRESSION = [
        'present-simple', 'present-continuous', 'past-simple', 'present-perfect',
        'future-simple', 'past-continuous', 'present-perfect-continuous', 'past-perfect',
        'future-continuous', 'future-perfect', 'past-perfect-continuous', 'future-perfect-continuous'
    ];

    const isAdmin = profileManager.isCurrentUserAdmin();
    
    let completedCount = 0;
    let previousCompleted = true; // First tense is always unlocked

    TENSE_PROGRESSION.forEach((tenseId) => {
        const levelElement = document.querySelector(`[data-tense="${tenseId}"]`);
        if (!levelElement) return;

        const card = levelElement.querySelector('.tense-card');
        const tenseData = userProgress[tenseId];
        const startBtn = card.querySelector('.start-btn');

        // Remove old info messages to prevent duplicates on refresh
        card.querySelectorAll('.status-info-msg').forEach(el => el.remove());
        
        // Get the tense label (from h3 tag)
        const tenseName = card.querySelector('h3')?.textContent || tenseId;
        
        // Check if tense is completed
        const isCompleted = tenseData.completedAt !== null;
        const accuracy = tenseData.completed > 0
            ? Math.round((tenseData.correctCount / tenseData.completed) * 100)
            : (typeof tenseData.light === 'number' ? tenseData.light : 0);
        const isPassed = isCompleted && accuracy >= 70;
        
        const levelIdx = TENSE_PROGRESSION.indexOf(tenseId) + 1;

        // Handle Movie Frames Unlocking
        const frame = document.getElementById(`frame-${levelIdx}`);
        const frame2 = (levelIdx === 8) ? document.getElementById('frame-8_1') : null;
        
        // Reset frames first
        if (frame) frame.classList.remove('unlocked');
        if (frame2) frame2.classList.remove('unlocked');

        if (isPassed) { // Теперь строго проверяем прохождение на 70%+
            completedCount++;
            if (frame) {
                frame.classList.add('unlocked');
            }
            // Special case for level 8 extra frame
            if (levelIdx === 8) {
                if (frame2) frame2.classList.add('unlocked');
            }
        }
        
        // Unlock logic: Level 1 is always open, or the previous level must be completed
        const isUnlocked = previousCompleted || isAdmin;
        
        // Update for next iteration: a level is completed if it has a timestamp
        previousCompleted = isCompleted;
        
        // Update card status
        card.classList.remove('locked', 'unlocked', 'completed');
        
        if (isCompleted) {
            card.classList.add('completed');
            card.querySelector('.level-badge').textContent = isAdmin ? '👑' : '🚀';
            const score = tenseData.correctCount || 0;
            const total = tenseData.completed || 0;

            if (startBtn) {
                startBtn.textContent = '✅ Done';
                startBtn.classList.add('replay-btn');
                startBtn.disabled = false;
                startBtn.style.pointerEvents = 'auto';
                startBtn.style.opacity = '1';

                const infoDiv = document.createElement('div');
                infoDiv.className = 'status-info-msg';
                infoDiv.style.cssText = 'font-size: 0.85rem; color: #e2b714; margin: 8px 0; text-align: center; font-weight: 700;';
                infoDiv.innerHTML = `Points: ${score}/${total}`;
                startBtn.parentNode.insertBefore(infoDiv, startBtn);
            }
            
        } else if (isUnlocked) {
            card.classList.add('unlocked');
            card.querySelector('.level-badge').textContent = isAdmin ? '👑' : '🚀';
            
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.style.pointerEvents = 'auto';
                startBtn.style.opacity = '1';
            }

            // If attempted but not passed (score exists but not marked completed)
            const hasAttempt = tenseData && tenseData.completed > 0;
            
            // ── New Weighted Progress Calculation ────────────────────────────────
            const ls = tenseData.lessonState || {};
            const v1Count = (ls.video1Answered || []).length;
            const v2Count = (ls.video2Answered || []).length;
            const v3Count = (ls.video3Answered || []).length;
            const v4Count = (ls.video4Answered || []).length;

            const hasV3 = (tenseId !== 'present-perfect-continuous' && tenseId !== 'past-perfect' && tenseId !== 'future-perfect-continuous');
            const hasV4 = (tenseId === 'present-simple' || tenseId === 'present-continuous');
            const totalVideos = 2 + (hasV3 ? 1 : 0) + (hasV4 ? 1 : 0);

            const practicePoints = (tenseData.completedAt || (tenseData.light >= 70)) ? 40 : 0;
            const pointsPerVideo = 60 / totalVideos;
            let videoPoints = 0;
            if (v1Count >= 5) videoPoints += pointsPerVideo;
            if (v2Count >= 5) videoPoints += pointsPerVideo;
            if (hasV3 && v3Count >= 3) videoPoints += pointsPerVideo;
            if (hasV4 && v4Count >= 5) videoPoints += pointsPerVideo;

            const totalProgress = Math.round(videoPoints + practicePoints);

            if (hasAttempt && !isAdmin) {
                if (startBtn) {
                    startBtn.textContent = '⚠️ Retake';
                    startBtn.classList.add('replay-btn');
                    
                    const score = tenseData.correctCount || 0;
                    const total = tenseData.completed || 0;
                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'status-info-msg';
                    infoDiv.style.cssText = 'font-size: 0.85rem; color: #e74c3c; margin: 8px 0; text-align: center; font-weight: 700;';
                    infoDiv.innerHTML = `Points: ${score}/${total}`;
                    startBtn.parentNode.insertBefore(infoDiv, startBtn);
                }
            }
            
            // Add progress bar if lesson is in progress
            if (totalProgress > 0) {
                const progressBar = createProgressBar(totalProgress, tenseData.correctCount, tenseData.completed);
                card.appendChild(progressBar);
            }
            
            // Ensure admin sees button, not locked message
            if (isAdmin) {
                const lockedMsg = card.querySelector('.locked-msg');
                const levelNum = levelElement.getAttribute('data-level');
                if (lockedMsg) {
                    const btn = document.createElement('button');
                    btn.className = 'start-btn admin-access';
                    btn.textContent = 'Start Lesson';
                    btn.onclick = () => startLesson(tenseId, levelNum);
                    lockedMsg.replaceWith(btn);
                }
                
                // If no button exists, create one
                if (!card.querySelector('.start-btn')) {
                    const btn = document.createElement('button');
                    btn.className = 'start-btn admin-access';
                    btn.textContent = 'Start Lesson';
                    btn.onclick = () => startLesson(tenseId, levelNum);
                    card.appendChild(btn);
                }
            }
        } else {
            card.classList.add('locked');
            card.querySelector('.level-badge').textContent = '🔒';
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.style.pointerEvents = 'none';
                startBtn.style.opacity = '0.5';
            }
            
            // For admin, replace locked message with button
            if (isAdmin) {
                const lockedMsg = card.querySelector('.locked-msg');
                const levelNum = levelElement.getAttribute('data-level');
                if (lockedMsg) {
                    const btn = document.createElement('button');
                    btn.className = 'start-btn admin-access';
                    btn.textContent = 'Start Lesson';
                    btn.onclick = () => startLesson(tenseId, levelNum);
                    lockedMsg.replaceWith(btn);
                } else {
                    const btn = document.createElement('button');
                    btn.className = 'start-btn admin-access';
                    btn.textContent = 'Start Lesson';
                    btn.onclick = () => startLesson(tenseId, levelNum);
                    card.appendChild(btn);
                }
                
                // Update class to show it's unlocked for admin
                card.classList.remove('locked');
                card.classList.add('unlocked');
                card.querySelector('.level-badge').textContent = '👑';
            }
        }
    });

    // Update Counter and Final Reward
    const counterBtn = document.getElementById('tense-counter-btn');
    if (counterBtn) {
        counterBtn.textContent = `${completedCount}/12 Tenses Mastered`;
        if (completedCount === 12) {
            counterBtn.classList.add('ready-for-victory');
            counterBtn.textContent = "🏆 Claim Victory!";
            counterBtn.onclick = () => {
                triggerSaluteConfetti();
                const reward = document.getElementById('final-reward');
                if (reward) {
                    reward.style.display = 'block';
                    reward.classList.add('fire-show');
                    reward.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            };
        } else {
            // Reset button if not at 12/12
            counterBtn.classList.remove('ready-for-victory');
            counterBtn.onclick = null;
        }
    }

    updateUserRank(completedCount);
}

function triggerSaluteConfetti() {
    const duration = 7 * 1000; // Празднуем чуть дольше
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 45, spread: 360, ticks: 100, zIndex: 10000 };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        // Запускаем мощные залпы фейерверков (меньше мелкого конфетти, больше взрывов)
        const particleCount = 150 * (timeLeft / duration);
        
        // Взрывы с боков и из центра
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }, colors: ['#e2b714', '#ffffff'] });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }, colors: ['#e2b714', '#ff4500'] });
        confetti({ ...defaults, particleCount: particleCount * 1.5, origin: { x: 0.5, y: 0.7 }, gravity: 0.8, scalar: 1.2, colors: ['#e2b714', '#ffffff', '#ff4500'] });
    }, 500); // Интервал между залпами для эффекта салюта
}

// Penguin Story Data
const PENGUIN_STORY = {
    1: { title: "The Spark", desc: "Our hero finds a poster for an annual screenplay competition. The dream of making a movie begins right here!" },
    2: { title: "Nights of Creation", desc: "Nights of hard work. Coffee, focus, and a growing pile of drafts. The screenplay is taking shape." },
    3: { title: "The Pitch", desc: "Presenting the 'Little Hearts, Big Stories' treatment. It's time to convince the board that this story matters." },
    4: { title: "The Reality Check", desc: "Rejected. Three times. It's tough, and the city feels cold, but our penguin director won't quit." },
    5: { title: "The Breakthrough", desc: "A notification ding that changes everything! 'Hey! We loved your script. YOU'RE IN!' Celebration time!" },
    6: { title: "Table Read", desc: "The team gathers. 'OK, let's dive into the story.' Characters, goals, and a shared vision come to life." },
    7: { title: "Action on Set", desc: "On the rooftop at night. 'Let's keep the emotion real.' The first big scene is being filmed." },
    8: { title: "Directing the Chaos", desc: "Today's shot list is long. Tracking shots, close-ups... the director is in total control now." },
    '8_1': { title: "Movie Magic", desc: "Checking the monitor. 'Action!' Every take brings the penguin closer to their masterpiece." },
    9: { title: "The Final Cut", desc: "Editing room sessions. Color, sound, and magic. From an idea to a screen that touches hearts." },
    10: { title: "The Closed Screening", desc: "A private viewing for the team. Tears of joy in the dark theater. Stories truly connect us." },
    11: { title: "Oscar Shortlist!", desc: "The notification of a lifetime: Our film is on the Oscar shortlist! Dreams are becoming reality." },
    12: { title: "In the Spotlight", desc: "Seeing the movie poster at the exact same spot where the journey started. Trust the spark." },
    'final': { title: "Absolute Cinema", desc: "Victory! The Little Penguin has won the Oscar for Best Animated Short Film. A true adventure complete." }
};

// Звуковой эффект затвора камеры
const cameraShutter = new Audio('shutter.mp3');

// Lightbox Functions
function openMovieLightbox(id) {
    const frame = document.getElementById(id === 'final' ? 'final-reward' : `frame-${id}`);
    // Only open if unlocked (or if it's the final reward which only shows when 12/12)
    if (id === 'final' || (frame && frame.classList.contains('unlocked'))) {
        const modal = document.getElementById('movie-modal');
        const modalImg = document.getElementById('modal-img');
        const modalTitle = document.getElementById('modal-title');
        const modalDesc = document.getElementById('modal-desc');
        
        const story = PENGUIN_STORY[id];
        if (story) {
            // Эффект вспышки
            const flash = document.getElementById('camera-flash');
            if (flash) {
                flash.style.opacity = '1';
                setTimeout(() => { flash.style.opacity = '0'; }, 100);
            }

            // Воспроизводим звук щелчка
            cameraShutter.currentTime = 0;
            cameraShutter.play().catch(e => console.log("Звук будет доступен после первого клика пользователя"));

            modalImg.src = `${id}.png`;
            modalTitle.textContent = story.title;
            modalDesc.textContent = story.desc;
            modal.classList.add('show');
            modal.style.display = 'flex'; // Обеспечиваем отображение перед анимацией opacity
            document.body.style.overflow = 'hidden'; // Prevent scroll
        }
    } else {
        alert("Pass this level with 70% accuracy or higher to unlock the next part of the story!");
    }
}

function closeMovieLightbox() {
    const modal = document.getElementById('movie-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        if (!modal.classList.contains('show')) modal.style.display = 'none';
    }, 300);
    document.body.style.overflow = 'auto';
}

// Autocomplete logic for quick testing
function autocompleteTense(tenseId, refresh = true) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const username = currentUser.username;
    
    // CRITICAL: Only create backup if the tense is NOT already in a "Magic" state.
    // We check if progress light is 100 to determine if Magic was already used.
    const currentProgress = profileManager.getTenseProgress(username, tenseId);
    if (currentProgress.light < 100 && !localStorage.getItem(`tenseflix_backup_${username}_${tenseId}`)) {
        const currentState = localStorage.getItem(`tenseflix_state_${username}_${tenseId}`);
        
        localStorage.setItem(`tenseflix_backup_${username}_${tenseId}`, JSON.stringify(currentProgress));
        if (currentState) localStorage.setItem(`tenseflix_state_backup_${username}_${tenseId}`, currentState);
    }

    // Set progress to 80% (12/15 correct)
    const progressUpdate = {
        completedAt: new Date().toISOString(),
        completed: 15,
        correctCount: 15,
        light: 100,
        lastAccessed: new Date().toISOString()
    };

    profileManager.updateProgress(currentUser.username, tenseId, progressUpdate);

    // Save lesson state to fill progress bars
    const state = {
        video1Answered: ['q1', 'q2', 'q3', 'q4', 'q5'],
        video2Answered: ['q1', 'q2', 'q3', 'q4', 'q5'],
        video3Answered: ['q1', 'q2', 'q3'],
        video4Answered: ['q1', 'q2', 'q3', 'q4', 'q5'],
        activeTab: 'practice'
    };
    profileManager.saveLessonState(currentUser.username, tenseId, state);

    if (refresh) initializeLevels();
}

function autocompleteAll() {
    const TENSE_PROGRESSION = [
        'present-simple', 'present-continuous', 'past-simple', 'present-perfect',
        'future-simple', 'past-continuous', 'present-perfect-continuous', 'past-perfect',
        'future-continuous', 'future-perfect', 'past-perfect-continuous', 'future-perfect-continuous'
    ];
    
    if (confirm('Magic will complete all 12 tenses with 80% accuracy. Continue?')) {
        TENSE_PROGRESSION.forEach(id => autocompleteTense(id, false));
        initializeLevels();
    }
}

/**
 * Unmagic logic: Restores actual version from backup or resets to 0
 */
function unmagicTense(tenseId, refresh = true) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const username = currentUser.username;
    const backupProgress = localStorage.getItem(`tenseflix_backup_${username}_${tenseId}`);
    const backupState = localStorage.getItem(`tenseflix_state_backup_${username}_${tenseId}`);

    if (backupProgress) {
        // Restore the full progress object
        profileManager.updateProgress(username, tenseId, JSON.parse(backupProgress));
        
        // Restore the lesson state
        if (backupState) {
            const stateObj = JSON.parse(backupState);
            profileManager.saveLessonState(username, tenseId, stateObj);
            localStorage.setItem(`tenseflix_state_${username}_${tenseId}`, backupState);
        } else {
            localStorage.removeItem(`tenseflix_state_${username}_${tenseId}`);
        }

        // Clean up backups after successful restoration
        localStorage.removeItem(`tenseflix_backup_${username}_${tenseId}`);
        localStorage.removeItem(`tenseflix_state_backup_${username}_${tenseId}`);
    } else {
        // If no backup exists, reset progress to zero for this tense
        const freshProgress = profileManager.initializeProgress()[tenseId];
        profileManager.updateProgress(username, tenseId, freshProgress);
        localStorage.removeItem(`tenseflix_state_${username}_${tenseId}`);
    }

    if (refresh) initializeLevels();
}

/**
 * Unmagic all tenses
 */
function unmagicAll() {
    const TENSE_PROGRESSION = [
        'present-simple', 'present-continuous', 'past-simple', 'present-perfect',
        'future-simple', 'past-continuous', 'present-perfect-continuous', 'past-perfect',
        'future-continuous', 'future-perfect', 'past-perfect-continuous', 'future-perfect-continuous'
    ];
    
    if (confirm('Unmagic will restore your actual progress or reset all tenses to 0%. Continue?')) {
        TENSE_PROGRESSION.forEach(id => unmagicTense(id, false));
        initializeLevels();
    }
}

// Update Nametag Rank based on milestones
function updateUserRank(count) {
    const RANKS = [
        "English Learner", // 0
        "Basic",          // 1
        "Builder",        // 2
        "Communicator",   // 3
        "Advanced",       // 4
        "Proficient",     // 5
        "Native"          // 6+
    ];
    const title = RANKS[Math.min(count, RANKS.length - 1)];
    const currentUser = profileManager.getCurrentUser();
    if (currentUser) {
        profileManager.updateProfile(currentUser.username, { title: title });
    }
}

// Start lesson
function startLesson(tense, level) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;
    
    const isAdmin = profileManager.isCurrentUserAdmin();
    const userProgress = profileManager.getUserProgress(currentUser.username);
    const tenses = Object.keys(userProgress);
    
    // Redirect to lesson
    window.location.href = `lesson.html?tense=${tense}&level=${level}`;
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to log out?')) {
        profileManager.logout();
        window.location.href = 'login.html';
    }
}

// Add click handlers for lesson start buttons
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('start-btn')) {
        if (e.target.disabled) return;
        const levelElement = e.target.closest('.tense-level');
        const level = parseInt(levelElement.getAttribute('data-level'));
        const tense = levelElement.getAttribute('data-tense');
        startLesson(tense, level);
    }
});

// Create progress bar for lesson in progress
function createProgressBar(progressPercent, correctCount, totalCompleted) {
    const container = document.createElement('div');
    container.style.cssText = `
        margin-top: 12px;
        padding: 8px 0;
        border-top: 1px solid rgba(255,255,255,0.1);
    `;
    
    const labelDiv = document.createElement('div');
    labelDiv.style.cssText = `
        font-size: 0.85rem;
        color: #ccc;
        margin-bottom: 4px;
        display: flex;
        justify-content: space-between;
    `;
    labelDiv.innerHTML = `
        <span>Progress: ${progressPercent}%</span>
        <span>${correctCount}/${totalCompleted} ✓</span>
    `;
    container.appendChild(labelDiv);
    
    const barDiv = document.createElement('div');
    barDiv.style.cssText = `
        width: 100%;
        height: 4px;
        background: rgba(255,255,255,0.1);
        border-radius: 2px;
        overflow: hidden;
    `;
    
    const fillDiv = document.createElement('div');
    fillDiv.style.cssText = `
        width: ${progressPercent}%;
        height: 100%;
        background: linear-gradient(90deg, #4CAF50, #45a049);
        transition: width 0.3s ease;
    `;
    barDiv.appendChild(fillDiv);
    container.appendChild(barDiv);
    
    return container;
}

// Create completion statistics display
function createCompletionStats(tenseData) {
    const container = document.createElement('div');
    container.style.cssText = `
        margin-top: 12px;
        padding: 8px 0;
        border-top: 1px solid rgba(255,255,255,0.1);
        font-size: 0.85rem;
        color: #4CAF50;
    `;
    
    const accuracy = tenseData.completed > 0 ? 
        Math.round((tenseData.correctCount / tenseData.completed) * 100) : 0;
    
    const completedDate = tenseData.completedAt ? 
        new Date(tenseData.completedAt).toLocaleDateString('ru-RU') : 'N/A';
    
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Accuracy:</span>
            <span>${accuracy}%</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>Completed:</span>
            <span>${completedDate}</span>
        </div>
    `;
    
    return container;
}

function initStarryBackground() {
    const container = document.getElementById('stars-container');
    if (!container) return;

    for (let i = 0; i < 150; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 3 + 1; // Slightly larger stars
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.setProperty('--duration', (Math.random() * 3 + 2) + 's');
        container.appendChild(star);
    }

    setInterval(() => {
        const shootingStar = document.createElement('div');
        shootingStar.className = 'shooting-star';
        shootingStar.style.left = (Math.random() * 80 + 20) + '%';
        shootingStar.style.top = (Math.random() * 40) + '%';
        shootingStar.style.setProperty('--duration', (Math.random() * 1 + 0.8) + 's');
        container.appendChild(shootingStar);
        setTimeout(() => shootingStar.remove(), 2000); // Remove after animation
    }, 1500); // Make shooting stars appear more frequently (every 1.5 seconds)
}
