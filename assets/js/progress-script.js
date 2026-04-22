/**
 * Progress Script
 * Displays user progress statistics and achievements
 */

// Check if user is logged in
function checkUserLoggedIn() {
    if (!profileManager.isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Load and display user progress
function loadUserProgress() {
    const currentUser = profileManager.getCurrentUser();
    
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    document.getElementById('user-name').textContent = currentUser.fullName || 'User';
    
    // Load progress data from profileManager
    const stats = profileManager.getUserStats(currentUser.username);
    const userProgress = profileManager.getUserProgress(currentUser.username);
    
    // Update stats
    updateStats(stats, userProgress);
    
    // Update progress bars
    updateProgressBars(userProgress);
    
    // Update achievements
    updateAchievements(stats, userProgress);
}

function updateStats(stats, userProgress) {
    if (!stats) return;
    
    // Tenses learned
    document.getElementById('tenses-learned').textContent = stats.tensesCompleted + '/12';
    
    // Exercises done
    document.getElementById('exercises-done').textContent = stats.exercisesCompleted || '0';
    
    // Accuracy
    document.getElementById('accuracy').textContent = stats.averageAccuracy + '%';
    
    // Streak
    let streak = 0;
    if (userProgress) {
        const today = new Date().toDateString();
        const touchedToday = Object.values(userProgress).some(t =>
            t.lastAccessed && new Date(t.lastAccessed).toDateString() === today
        );
        if (touchedToday) streak = 1;
    }
    document.getElementById('streak').textContent = streak;
}

function updateProgressBars(userProgress) {
    const tensList = [
        'present-simple',
        'present-continuous',
        'present-perfect',
        'present-perfect-continuous',
        'past-simple',
        'past-continuous',
        'past-perfect',
        'past-perfect-continuous',
        'future-simple',
        'future-continuous',
        'future-perfect',
        'future-perfect-continuous'
    ];
    
    tensList.forEach((tense, index) => {
        const tenseData = userProgress[tense] || {};

        // Compute progress from actual saved lesson state
        const ls               = tenseData.lessonState    || {};
        const v1Count          = (ls.video1Answered  || []).length;
        const v2Count          = (ls.video2Answered  || []).length;
        const v3Count          = (ls.video3Answered  || []).length;
        const exercisesAnswered = Object.keys(ls.exerciseAnswers || {}).length;
        const tasksAnswered     = Object.keys(ls.taskAnswers     || {}).length;
        const TOTAL_ACTIVITIES  = 6 + 4 + 3 + 5 + 15;
        const doneActivities    = Math.min(v1Count, 6) + Math.min(v2Count, 4) + Math.min(v3Count, 3)
                                + Math.min(tasksAnswered, 5) + Math.min(exercisesAnswered, 15);
        const progress = tenseData.completedAt ? 100
                       : Math.round((doneActivities / TOTAL_ACTIVITIES) * 100);
        
        const progressId = `progress-${index + 1}`;
        const percentId = `percent-${index + 1}`;
        
        const progressElement = document.getElementById(progressId);
        const percentElement = document.getElementById(percentId);
        
        if (progressElement) progressElement.style.width = progress + '%';
        if (percentElement) percentElement.textContent = progress + '%';
    });
}

function updateAchievements(stats, userProgress) {
    if (!stats) return;
    
    // Achievement 1: First lesson
    if (stats.exercisesCompleted > 0) {
        unlockAchievement(1);
    }
    
    // Achievement 2: Halfway (6 tenses)
    if (stats.tensesCompleted >= 6) {
        unlockAchievement(2);
    }
    
    // Achievement 3: Master (all 12 tenses)
    if (stats.tensesCompleted === 12) {
        unlockAchievement(3);
    }
    
    // Achievement 4: Perfect student (100% accuracy)
    if (stats.exercisesCompleted > 10 && stats.averageAccuracy === 100) {
        unlockAchievement(4);
    }
}

function unlockAchievement(id) {
    const badge = document.getElementById(`achievement-${id}`);
    if (badge) {
        badge.classList.add('unlocked');
    }
}

// Update greeting based on time of day
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Hello';
    
    if (hour < 12) {
        greeting = 'Good morning';
    } else if (hour < 18) {
        greeting = 'Good afternoon';
    } else {
        greeting = 'Good evening';
    }
    
    document.getElementById('user-greeting').textContent = greeting;
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to log out?')) {
        profileManager.logout();
        window.location.href = 'login.html';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (checkUserLoggedIn()) {
        updateGreeting();
        loadUserProgress();
        updatePageLanguage();
        updateLanguageSwitcherUI();
    }
});
