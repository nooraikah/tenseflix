/**
 * Dashboard Script
 * Manages dashboard functionality and user progress
 */

let isRedirecting = false;
let lessonsCatalog = [];

// Check if user is logged in
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    if (!isRedirecting) {
        loadUserInfo();
        await prepareLessonsPath();
        initializeLevels();
    }
});

async function prepareLessonsPath() {
    console.log('Loading lessons catalog...');
    lessonsCatalog = await loadLessonsCatalog();
    renderLessonsPath(lessonsCatalog);

    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const lessonIds = lessonsCatalog.map(lesson => lesson.id);
    ensureProgressEntries(currentUser.username, lessonIds);
}

async function loadLessonsCatalog() {
    try {
        const manifestResponse = await fetch('lessons_json/manifest.json', { cache: 'no-cache' });
        if (!manifestResponse.ok) {
            throw new Error('Failed to load lessons manifest');
        }

        const manifest = await manifestResponse.json();
        const manifestLessons = Array.isArray(manifest.lessons) ? manifest.lessons : [];
        const tenseIds = manifestLessons.length > 0
            ? manifestLessons.map(entry => entry.id).filter(Boolean)
            : (Array.isArray(manifest.tenses) ? manifest.tenses : []);
        const manifestOrderMap = {};
        manifestLessons.forEach((entry, index) => {
            if (entry && entry.id) {
                const fallbackOrder = index + 1;
                manifestOrderMap[entry.id] = Number(entry.order) || fallbackOrder;
            }
        });

        const lessons = await Promise.all(tenseIds.map(async (tenseId) => {
            try {
                const lessonResponse = await fetch(`lessons_json/${tenseId}.json`, { cache: 'no-cache' });
                if (!lessonResponse.ok) {
                    throw new Error(`Failed to load lesson ${tenseId}`);
                }
                const lessonData = await lessonResponse.json();
                return {
                    id: tenseId,
                    order: Number(lessonData.order) || manifestOrderMap[tenseId] || 999,
                    title: lessonData.title || toHumanTitle(tenseId),
                    subtitle: lessonData.russian || toHumanTitle(tenseId)
                };
            } catch (error) {
                console.warn('Lesson JSON load warning:', tenseId, error);
                return {
                    id: tenseId,
                    order: manifestOrderMap[tenseId] || 999,
                    title: toHumanTitle(tenseId),
                    subtitle: toHumanTitle(tenseId)
                };
            }
        }));

        return lessons.sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            return a.id.localeCompare(b.id);
        });
    } catch (error) {
        console.warn('Manifest load failed, fallback to progress keys:', error);
        const currentUser = profileManager.getCurrentUser();
        if (!currentUser) return [];

        const progress = profileManager.getUserProgress(currentUser.username) || {};
        return Object.keys(progress).sort().map((tenseId, index) => ({
            id: tenseId,
            order: index + 1,
            title: toHumanTitle(tenseId),
            subtitle: toHumanTitle(tenseId)
        }));
    }
}

function renderLessonsPath(lessons) {
    const pathContainer = document.querySelector('.tenses-path');
    if (!pathContainer) return;

    pathContainer.innerHTML = '';
    console.log('Rendering lessons path with lessons:', lessons);
    lessons.forEach((lesson, index) => {
        const level = index + 1;
        const levelEl = document.createElement('div');
        levelEl.className = 'tense-level';
        levelEl.setAttribute('data-level', String(level));
        levelEl.setAttribute('data-tense', lesson.id);

        levelEl.innerHTML = `
            <div class="level-number">Level ${level}</div>
            <div class="tense-card unlocked">
                <div class="level-badge">🔓</div>
                <h3>${lesson.title}</h3>
                <p class="tense-label">${lesson.subtitle}</p>
                <button class="start-btn" onclick="startLesson('${lesson.id}', ${level})">Start Lesson</button>
            </div>
        `;

        pathContainer.appendChild(levelEl);
    });
}

function ensureProgressEntries(username, lessonIds) {
    const progress = profileManager.getUserProgress(username) || {};
    lessonIds.forEach((tenseId) => {
        if (!progress[tenseId]) {
            profileManager.updateProgress(username, tenseId, {});
        }
    });
}

function toHumanTitle(tenseId) {
    return tenseId
        .split('-')
        .map(chunk => chunk.charAt(0).toUpperCase() + chunk.slice(1))
        .join(' ');
}

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
    }
}

// Initialize levels based on user progress
function initializeLevels() {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;
    
    const userProgress = profileManager.getUserProgress(currentUser.username);
    if (!userProgress) return;
    
    const isAdmin = profileManager.isCurrentUserAdmin();

    const levels = document.querySelectorAll('.tense-level');

    // Initialize UI for each rendered lesson
    levels.forEach((levelElement, index) => {
        const level = index + 1;
        const tenseId = levelElement.getAttribute('data-tense');
        
        if (!levelElement) return;
        
        const card = levelElement.querySelector('.tense-card');
        if (!card) return;

        const tenseData = userProgress[tenseId] || {
            light: 0,
            completed: 0,
            correctCount: 0,
            completedAt: null
        };

        card.querySelectorAll('.auto-progress-extra').forEach(el => el.remove());
        
        // Get the tense label (from h3 tag)
        const tenseName = card.querySelector('h3')?.textContent || tenseId;
        
        // Check if tense is completed
        const isCompleted = tenseData.completedAt !== null;
        const isAvailable = true;
        
        // Update card status
        card.classList.remove('locked', 'unlocked', 'completed');
        
        if (isCompleted) {
            card.classList.add('completed');
            card.querySelector('.level-badge').textContent = '✅';
            const startBtn = card.querySelector('.start-btn');
            if (startBtn) {
                startBtn.textContent = 'Retake';
                startBtn.classList.add('replay-btn');
            }
            
            // Show completion stats
            if (tenseData) {
                const statsDiv = createCompletionStats(tenseData);
                card.appendChild(statsDiv);
            }
        } else if (isAvailable) {
            card.classList.add('unlocked');
            card.querySelector('.level-badge').textContent = isAdmin ? '👑' : '🔓';
            
            // Add progress bar if lesson is in progress
            if (tenseData && tenseData.light > 0) {
                const progressBar = createProgressBar(tenseData.light, tenseData.correctCount, tenseData.completed);
                card.appendChild(progressBar);
            }
            
            // Ensure admin sees button, not locked message
            if (isAdmin) {
                const lockedMsg = card.querySelector('.locked-msg');
                if (lockedMsg) {
                    const btn = document.createElement('button');
                    btn.className = 'start-btn admin-access';
                    btn.textContent = 'Start Lesson';
                    btn.onclick = () => startLesson(tenseId, level);
                    lockedMsg.replaceWith(btn);
                }
                
                // If no button exists, create one
                if (!card.querySelector('.start-btn')) {
                    const btn = document.createElement('button');
                    btn.className = 'start-btn admin-access';
                    btn.textContent = 'Start Lesson';
                    btn.onclick = () => startLesson(tenseId, level);
                    card.appendChild(btn);
                }
            }
        } else {
            card.classList.add('locked');
            card.querySelector('.level-badge').textContent = '🔒';
            
            // For admin, replace locked message with button
            if (isAdmin) {
                const lockedMsg = card.querySelector('.locked-msg');
                if (lockedMsg) {
                    const btn = document.createElement('button');
                    btn.className = 'start-btn admin-access';
                    btn.textContent = 'Start Lesson';
                    btn.onclick = () => startLesson(tenseId, level);
                    lockedMsg.replaceWith(btn);
                } else {
                    const btn = document.createElement('button');
                    btn.className = 'start-btn admin-access';
                    btn.textContent = 'Start Lesson';
                    btn.onclick = () => startLesson(tenseId, level);
                    card.appendChild(btn);
                }
                
                // Update class to show it's unlocked for admin
                card.classList.remove('locked');
                card.classList.add('unlocked');
                card.querySelector('.level-badge').textContent = '👑';
            }
        }
    });
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
        const levelElement = e.target.closest('.tense-level');
        const level = parseInt(levelElement.getAttribute('data-level'));
        const tense = levelElement.getAttribute('data-tense');
        startLesson(tense, level);
    }
});

// Create progress bar for lesson in progress
function createProgressBar(progressPercent, correctCount, totalCompleted) {
    const container = document.createElement('div');
    container.className = 'auto-progress-extra';
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
    container.className = 'auto-progress-extra';
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

