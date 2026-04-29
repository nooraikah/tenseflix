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
    
    const isAdmin = profileManager.isCurrentUserAdmin();
    
    // Initialize UI for each tense using data-tense attribute
    Object.keys(userProgress).forEach((tenseId) => {
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
        
        // Unlock logic: Level 1 is always open, or all previous levels must be completed
        const isUnlocked = true;
        
        // Update card status
        card.classList.remove('locked', 'unlocked', 'completed');
        
        if (isCompleted) {
            card.classList.add('completed');
            card.querySelector('.level-badge').textContent = '✅';
            const score = tenseData.correctCount || 0;
            const total = tenseData.completed || 0;

            if (startBtn) {
                startBtn.textContent = '✅ Done';
                startBtn.classList.add('replay-btn');

                const infoDiv = document.createElement('div');
                infoDiv.className = 'status-info-msg';
                infoDiv.style.cssText = 'font-size: 0.85rem; color: #e2b714; margin: 8px 0; text-align: center; font-weight: 700;';
                infoDiv.innerHTML = `Points: ${score}/${total}`;
                startBtn.parentNode.insertBefore(infoDiv, startBtn);
            }
            
        } else if (isUnlocked) {
            card.classList.add('unlocked');

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
                card.querySelector('.level-badge').textContent = '⚠️';
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
            } else {
                card.querySelector('.level-badge').textContent = isAdmin ? '👑' : '🚀';
            }
            
            // Add progress bar if lesson is in progress
            if (totalProgress > 0) {
                const progressBar = createProgressBar(totalProgress, tenseData.correctCount, tenseData.completed);
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
