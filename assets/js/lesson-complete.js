/**
 * Complete Lesson Functions
 * Manages lesson completion and progress saving
 */

// Load video for lesson (function to easily add video link)
function loadVideo(videoUrl) {
    const videoIframe = document.getElementById('lesson-video');
    const placeholder = document.querySelector('.video-placeholder');
    
    if (videoUrl) {
        videoIframe.src = videoUrl;
        videoIframe.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
    }
}

// Complete lesson and unlock next level
function completeLesson() {
    const currentUser = profileManager.getCurrentUser();
    
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const tense = params.get('tense') || 'present-simple';
    
    // Mark tense as completed in user's progress
    const progressUpdate = {
        completedAt: new Date().toISOString(),
        completed: 15, // Set to maximum
        total: 15
    };
    
    profileManager.updateProgress(currentUser.username, tense, progressUpdate);
    
    // Show success message
    if (confirm('🎉 Поздравляю! Вы завершили ' + tense + '!\n\nПерейти к следующему уровню?')) {
        window.location.href = 'dashboard.html';
    }
}

// Add complete lesson button after exercises
function addCompleteLessonButton() {
    const exercisesSection = document.getElementById('exercises');
    
    if (exercisesSection && !document.querySelector('.complete-lesson-btn')) {
        const btnDiv = document.createElement('div');
        btnDiv.style.textAlign = 'center';
        btnDiv.style.marginTop = '40px';
        btnDiv.style.paddingTop = '30px';
        btnDiv.style.borderTop = '2px solid #eee';
        
        const btn = document.createElement('button');
        btn.className = 'complete-lesson-btn';
        btn.textContent = '✅ Завершить урок и перейти на следующий уровень';
        btn.onclick = completeLesson;
        btn.style.cssText = `
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            border: none;
            padding: 15px 40px;
            border-radius: 10px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;
        btn.onmouseover = () => {
            btn.style.transform = 'translateY(-3px)';
            btn.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.5)';
        };
        btn.onmouseout = () => {
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '0 4px 15px rgba(40, 167, 69, 0.3)';
        };
        
        btnDiv.appendChild(btn);
        exercisesSection.appendChild(btnDiv);
    }
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', () => {
    // Add complete button after a short delay to ensure exercises are loaded
    setTimeout(addCompleteLessonButton, 1500);
    
    // Example: To add a video, call this function with YouTube embed URL
    // loadVideo('https://www.youtube.com/embed/VIDEO_ID');
});
