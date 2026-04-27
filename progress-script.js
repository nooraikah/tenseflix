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
    
    // Time Spent (replacing streak)
    const timeSpent = stats.totalTimeSpent || 0;
    const streakEl = document.getElementById('streak');
    if (streakEl) {
        streakEl.textContent = formatTimeSeconds(timeSpent);
    }
}

function formatTimeSeconds(seconds) {
    if (seconds < 60) return seconds + 's';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
    return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm';
}

function updateProgressBars(userProgress) {
    const tensList = [
        'present-simple',
        'present-continuous',
        'past-simple',
        'present-perfect',
        'future-simple',
        'past-continuous',
        'present-perfect-continuous',
        'past-perfect',
        'future-continuous',
        'future-perfect',
        'past-perfect-continuous',
        'future-perfect-continuous'
    ];
    
    tensList.forEach((tense, index) => {
        const tenseData = userProgress[tense] || {};
        
        // Use the 'light' progress percentage from tenseData, which is updated by completeTense
        // This 'light' property represents the overall percentage from the practice tasks.
        // For a more comprehensive progress bar that includes video quizzes and tasks,
        // we need to calculate it dynamically.
        
        const ls = tenseData.lessonState || {};
        const v1Count = (ls.video1Answered || []).length;
        const v2Count = (ls.video2Answered || []).length;
        const v3Count = (ls.video3Answered || []).length;
        const v4Count = (ls.video4Answered || []).length;
        const exercisesAnswered = Object.keys(ls.exerciseAnswers || {}).length;
        const tasksAnswered     = Object.keys(ls.taskAnswers     || {}).length;

        const hasV3 = (tense !== 'present-perfect-continuous' && tense !== 'past-perfect' && tense !== 'future-perfect-continuous');
        const hasV4 = (tense === 'present-simple' || tense === 'present-continuous');
        const totalVideos = 2 + (hasV3 ? 1 : 0) + (hasV4 ? 1 : 0);
        const practicePoints = (tenseData.completedAt || (tenseData.light >= 70)) ? 40 : 0;
        const pointsPerVideo = 60 / totalVideos;
        
        let videoPoints = 0;
        if (v1Count >= 5) videoPoints += pointsPerVideo;
        if (v2Count >= 5) videoPoints += pointsPerVideo;
        if (hasV3 && v3Count >= 3) videoPoints += pointsPerVideo;
        if (hasV4 && v4Count >= 5) videoPoints += pointsPerVideo;

        const progress = Math.round(videoPoints + practicePoints);
        const finalProgress = tenseData.completedAt ? 100 : Math.min(progress, 99);
        
        const progressId = `progress-${index + 1}`;
        const percentId = `percent-${index + 1}`;
        
        const progressElement = document.getElementById(progressId); // This is the fill element
        const percentElement = document.getElementById(percentId);   // This is the text element
        
        if (progressElement) progressElement.style.width = finalProgress + '%';
        if (percentElement) percentElement.textContent = finalProgress + '%';
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
