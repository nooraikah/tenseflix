/**
 * Profile Script
 * Manages user profile information and statistics
 */

// Check authentication and load profile
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadProfile();
});

function checkAuth() {
    if (!profileManager.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
}

function logout() {
    if (confirm('Are you sure you want to log out?')) {
        profileManager.logout();
        window.location.href = 'login.html';
    }
}

function loadProfile() {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // Get full profile data
    const profile = profileManager.getProfile(currentUser.username);
    if (!profile) {
        window.location.href = 'login.html';
        return;
    }

    // Display user name
    document.getElementById('username').textContent = profile.fullName || 'User';

    // Display gender if available
    if (profile.gender) {
        document.getElementById('user-gender').style.display = 'flex';
        document.getElementById('gender-value').textContent = profile.gender;
    }

    // Display DOB if available
    if (profile.dob) {
        document.getElementById('user-dob').style.display = 'flex';
        document.getElementById('dob-value').textContent = new Date(profile.dob).toLocaleDateString();
    }

    // Display Age if DOB is available
    const age = calculateAge(profile.dob);
    if (age !== null) {
        document.getElementById('user-age').style.display = 'flex';
        document.getElementById('age-value').textContent = age;
    } else {
        document.getElementById('user-age').style.display = 'none';
    }

    // Display photo with gender defaults
    displayProfilePhoto(profile.photo, profile.gender);

    // Update small profile icon in header if it exists
    const profileBtn = document.querySelector('.profile-btn') || document.querySelector('.logout-btn')?.parentNode.querySelector('.profile-icon-nav');
    if (profileBtn) {
        profileBtn.innerHTML = profileManager.getAvatarHTML(profile.photo, profile.gender, 34, 0);
        profileBtn.style.width = '34px';
        profileBtn.style.height = '34px';
        profileBtn.style.padding = '0';
        profileBtn.style.display = 'flex';
        profileBtn.style.alignItems = 'center';
        profileBtn.style.justifyContent = 'center';
    }

    // Get user progress and stats
    const userProgress = profileManager.getUserProgress(currentUser.username);
    const stats = profileManager.getUserStats(currentUser.username);

    // Update stats display
    if (stats) {
        document.getElementById('tenses-learned').textContent = stats.tensesCompleted;
        document.getElementById('exercises-completed').textContent = stats.exercisesCompleted;
        document.getElementById('accuracy').textContent = stats.averageAccuracy + '%';

        // Time Spent
        const timeSpent = stats.totalTimeSpent || 0;
        document.getElementById('time-spent').textContent = formatTimeSpent(timeSpent);
    }

    // Load tense progress bars
    loadTenseProgress(userProgress);
}

function formatTimeSpent(seconds) {
    if (seconds < 60) return seconds + 's';
    if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return minutes + 'm ' + remainingSeconds + 's';
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours + 'h ' + minutes + 'm';
}

function calculateAge(dobString) {
    if (!dobString) return null;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function enterEditMode() {
    const profile = profileManager.getProfile(profileManager.getCurrentUser().username);
    
    // Load data into edit form
    document.getElementById('edit-name').value = profile.fullName || '';
    document.getElementById('edit-dob').value = profile.dob || '';

    // Set gender radio
    if (profile.gender === 'Male') {
        document.getElementById('gender-male').checked = true;
    } else if (profile.gender === 'Female') {
        document.getElementById('gender-female').checked = true;
    }
    
    // Clear password fields
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    
    // Synchronize photo in edit mode
    if (profile.photo) {
        displayProfilePhotoEdit(profile.photo, profile.gender);
    } else {
        // Reset to emoji avatar
        document.getElementById('edit-user-avatar').style.display = 'block';
        document.getElementById('edit-avatar-image-container').style.display = 'none';
        document.getElementById('delete-photo-btn-edit').style.display = 'none';
    }
    
    // Switch to edit mode
    document.getElementById('view-mode').style.display = 'none';
    document.getElementById('edit-mode').style.display = 'block';
    
    // Switch to basic tab by default
    switchEditTab('basic');
}

function switchEditTab(tab) {
    // Hide all tabs
    document.getElementById('tab-basic').classList.remove('active');
    document.getElementById('tab-password').classList.remove('active');
    
    // Remove active from all buttons
    document.querySelectorAll('.edit-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById('tab-' + tab).classList.add('active');
    
    // Set active button - find the button with the corresponding onclick
    document.querySelectorAll('.edit-tab').forEach(btn => {
        if ((tab === 'basic' && btn.textContent.includes('Basic Info')) ||
            (tab === 'password' && btn.textContent.includes('Password'))) {
            btn.classList.add('active');
        }
    });
}

function displayProfilePhotoEdit(photoData, gender) {
    const avatarSection = document.getElementById('edit-user-avatar');
    const imageContainer = document.getElementById('edit-avatar-image-container');
    const profilePhoto = document.getElementById('edit-profile-photo');
    const deleteBtn = document.getElementById('delete-photo-btn-edit');

    let displaySrc = photoData;
    if (!displaySrc && gender === 'Male') displaySrc = 'duopinguo.jpg';
    if (!displaySrc && gender === 'Female') displaySrc = 'penguo_w.png';

    // Hide emoji avatar, show image
    avatarSection.style.display = 'none';
    imageContainer.style.display = 'block';
    profilePhoto.src = displaySrc;

    // Show delete button
    if (deleteBtn) {
        deleteBtn.style.display = 'inline-block';
    }
}

function handlePhotoUploadEdit(event) {
    const file = event.target.files[0];
    
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must not exceed 5MB');
        return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select an image');
        return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (e) => {
        const photoData = e.target.result;
        displayProfilePhotoEdit(photoData);
    };
    reader.readAsDataURL(file);
    
    // Reset input
    event.target.value = '';
}

function deleteProfilePhotoEdit() {
    if (!confirm('Are you sure you want to delete your profile photo?')) {
        return;
    }

    // Reset display
    const avatarSection = document.getElementById('edit-user-avatar');
    const imageContainer = document.getElementById('edit-avatar-image-container');
    const deleteBtn = document.getElementById('delete-photo-btn-edit');

    avatarSection.style.display = 'block';
    imageContainer.style.display = 'none';
    
    if (deleteBtn) {
        deleteBtn.style.display = 'none';
    }
}

function displayProfilePhoto(photoData, gender) {
    const avatarSection = document.querySelector('#view-mode .user-avatar');
    const imageContainer = document.querySelector('#view-mode .avatar-image-container');
    const profilePhoto = document.querySelector('#view-mode .avatar-image');

    let displaySrc = photoData;
    if (!displaySrc) {
        if (gender === 'Male') displaySrc = 'duopinguo.jpg';
        else if (gender === 'Female') displaySrc = 'penguo_w.png';
    }

    if (displaySrc) {
        avatarSection.style.display = 'none';
        imageContainer.style.display = 'block';
        profilePhoto.src = displaySrc;
    } else {
        avatarSection.style.display = 'flex';
        imageContainer.style.display = 'none';
        profilePhoto.src = '';
    }
}

function saveProfileChanges() {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const nameInput = document.getElementById('edit-name');
    const dobInput = document.getElementById('edit-dob');
    const genderMale = document.getElementById('gender-male');
    const genderFemale = document.getElementById('gender-female');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    const fullName = nameInput.value.trim();
    const dob = dobInput.value;
    const gender = genderMale.checked ? 'Male' : (genderFemale.checked ? 'Female' : null);

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validate name
    if (!fullName) {
        alert('❌ Please enter your name');
        return;
    }

    // Update profile info
    const updateData = { fullName };
    updateData.dob = dob;
    updateData.gender = gender;

    // Handle photo update (if changed)
    const photoInput = document.getElementById('photo-input-edit');
    if (photoInput && photoInput.files.length > 0) {
        // Photo will be handled separately in the file input change event
    } else {
        // Check if photo was changed in edit mode
        const editPhotoContainer = document.getElementById('edit-avatar-image-container');
        if (editPhotoContainer.style.display === 'block') {
            const editProfilePhoto = document.getElementById('edit-profile-photo');
            if (editProfilePhoto.src) {
                updateData.photo = editProfilePhoto.src;
            }
        } else {
            // Photo was deleted
            updateData.photo = null;
        }
    }

    // Handle password change
    if (newPassword || confirmPassword || currentPassword) {
        // If any password field is filled, all must be valid
        if (!currentPassword) {
            alert('❌ Please enter your current password');
            return;
        }

        if (!newPassword) {
            alert('❌ Please enter a new password');
            return;
        }

        if (!confirmPassword) {
            alert('❌ Please confirm your new password');
            return;
        }

        if (newPassword.length < 6) {
            alert('❌ New password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('❌ Passwords do not match');
            return;
        }

        // Change password
        const passwordResult = profileManager.changePassword(currentUser.username, currentPassword, newPassword);
        if (!passwordResult.success) {
            alert('❌ ' + passwordResult.message);
            return;
        }
    }

    // Update profile (name, age, photo)
    const result = profileManager.updateProfile(currentUser.username, updateData);

    if (result.success) {
        alert('✅ Profile updated successfully!');
        
        // Reload and exit edit mode
        loadProfile();
        document.getElementById('edit-mode').style.display = 'none';
        document.getElementById('view-mode').style.display = 'block';
    } else {
        alert('❌ ' + result.message);
    }
}

function cancelProfileEdit() {
    // Return to view mode
    document.getElementById('edit-mode').style.display = 'none';
    document.getElementById('view-mode').style.display = 'block';
}

function loadTenseProgress(userProgress) {
    const container = document.getElementById('tense-progress-list');
    if (!container) return;

    container.innerHTML = '';

    // Order mirrors the dashboard level sequence
    const TENSE_ORDER = [
        { id: 'present-simple',             name: 'Present Simple' },
        { id: 'present-continuous',         name: 'Present Continuous' },
        { id: 'past-simple',                name: 'Past Simple' },
        { id: 'present-perfect',            name: 'Present Perfect' },
        { id: 'future-simple',              name: 'Future Simple' },
        { id: 'past-continuous',            name: 'Past Continuous' },
        { id: 'present-perfect-continuous', name: 'Present Perfect Continuous' },
        { id: 'past-perfect',               name: 'Past Perfect' },
        { id: 'future-perfect',             name: 'Future Perfect' },
        { id: 'future-continuous',          name: 'Future Continuous' },
        { id: 'past-perfect-continuous',    name: 'Past Perfect Continuous' },
        { id: 'future-perfect-continuous',  name: 'Future Perfect Continuous' }
    ];

    const isAdmin = profileManager.isCurrentUserAdmin ? profileManager.isCurrentUserAdmin() : false;

    TENSE_ORDER.forEach((tense, index) => {
        const tenseKey  = tense.id;
        const tenseData = userProgress[tenseKey];
        if (!tenseData) return;

        // ── Progress computation ─────────────────────────────────────────────
        // Read from direct flat key first (written by triggerSave), then nested lessonState
        const currentUser = profileManager.getCurrentUser();
        let ls = tenseData.lessonState || {};
        if (currentUser) {
            const directRaw = localStorage.getItem(`tenseflix_state_${currentUser.username}_${tenseKey}`);
            if (directRaw) {
                try { ls = JSON.parse(directRaw); } catch(e) {}
            }
        }

        const v1Count           = (ls.video1Answered || []).length;
        const v2Count           = (ls.video2Answered || []).length;
        const v3Count           = (ls.video3Answered || []).length;
        const v4Count           = (ls.video4Answered || []).length;
        const exerciseAnswers   = ls.exerciseAnswers || {};
        const taskAnswers       = ls.taskAnswers     || {};
        const fillAnswers       = ls.fillAnswers     || {};
        const practiceAnswers   = ls.practiceAnswers || {};
        const exercisesAnswered = Object.keys(exerciseAnswers).length;
        const tasksAnswered     = Object.keys(taskAnswers).length;
        const fillAnswered      = Object.values(fillAnswers).filter(f => f.value && f.value.trim()).length;
        const practiceAnswered  = Object.keys(practiceAnswers).length;

        // ── New Weighted Progress Calculation ────────────────────────────────
        const hasV3 = (tenseKey !== 'present-perfect-continuous' && tenseKey !== 'past-perfect' && tenseKey !== 'future-perfect-continuous');
        const hasV4 = (tenseKey === 'present-simple' || tenseKey === 'present-continuous');
        const totalVideos = 2 + (hasV3 ? 1 : 0) + (hasV4 ? 1 : 0);
        
        const practicePoints = (tenseData.completedAt || (tenseData.light >= 70)) ? 40 : 0;
        const pointsPerVideo = 60 / totalVideos;
        
        let videoPoints = 0;
        if (v1Count >= 5) videoPoints += pointsPerVideo;
        if (v2Count >= 5) videoPoints += pointsPerVideo;
        if (hasV3 && v3Count >= 3) videoPoints += pointsPerVideo;
        if (hasV4 && v4Count >= 5) videoPoints += pointsPerVideo;

        const computedProgress = Math.round(videoPoints + practicePoints);
        const progressPercentage = tenseData.completedAt ? 100 : Math.min(computedProgress, 99);

        // ── Has the user actually started this tense? ─────────────────────────
        const hasStarted = v1Count > 0 || exercisesAnswered > 0 || tasksAnswered > 0
                        || fillAnswered > 0 || practiceAnswered > 0;

        // ── Unlock check (same logic as dashboard) ────────────────────────────
        const isUnlocked        = true;
        const isCompleted       = !!tenseData.completedAt;

        // ── Accuracy ─────────────────────────────────────────────────────────
        const allAnswers = [
            ...Object.values(exerciseAnswers),
            ...Object.values(taskAnswers)
        ];
        const correct  = allAnswers.filter(a => a.isCorrect).length;
        const answered = allAnswers.length;
        const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : null;

        // ── Last accessed ─────────────────────────────────────────────────────
        const rawDate = ls.timestamp || tenseData.lastAccessed;
        const lastAccessedStr = rawDate
            ? new Date(rawDate).toLocaleDateString('ru-RU', { day:'2-digit', month:'short', year:'numeric' })
            : null;

        // ── Video badges ──────────────────────────────────────────────────────
        const videoBadges = (v1Count >= 5 || v2Count >= 5 || v3Count >= 3 || v4Count >= 5) ? `
            <div class="video-badges">
                <span class="vbadge ${v1Count >= 5 ? 'done' : ''}">V1${v1Count >= 5 ? ' ✔' : ''}</span>
                <span class="vbadge ${v2Count >= 5 ? 'done' : ''}">V2${v2Count >= 5 ? ' ✔' : ''}</span>
                ${hasV3 ? `<span class="vbadge ${v3Count >= 3 ? 'done' : ''}">V3${v3Count >= 3 ? ' ✔' : ''}</span>` : ''}
                ${hasV4 ? `<span class="vbadge ${v4Count >= 5 ? 'done' : ''}">V4${v4Count >= 5 ? ' ✔' : ''}</span>` : ''}
            </div>` : '';

        const accuracyHtml = accuracy !== null
            ? `<span class="progress-accuracy">${accuracy}% accuracy</span>` : '';

        const lastAccessedHtml = lastAccessedStr
            ? `<span class="last-accessed">🕐 ${lastAccessedStr}</span>` : '';

        // ── Continue / Start / Replay button ─────────────────────────────────
        let actionBtn = '';
        if (isCompleted) {
            const score = tenseData.correctCount || 0;
            const total = tenseData.completed || 1;
            const scoreInfo = `<span style="display:block; font-size:0.85rem; color:#e2b714; font-weight:600; margin-bottom:2px;">Points: ${score}/${total}</span>`;

            actionBtn = `<div style="text-align:right;">${scoreInfo}<a class="tense-action-btn replay-btn" href="lesson.html?tense=${tenseKey}">✅ Done</a></div>`;
        } else if (isUnlocked && hasStarted) {
            if (tenseData.completed > 0) {
                const score = tenseData.correctCount || 0;
                const total = tenseData.completed || 1;
                const scoreInfo = `<span style="display:block; font-size:0.85rem; color:#e74c3c; font-weight:600; margin-bottom:2px;">Points: ${score}/${total}</span>`;
                actionBtn = `<div style="text-align:right;">${scoreInfo}<a class="tense-action-btn continue-btn" href="lesson.html?tense=${tenseKey}">⚠️ Retake</a></div>`;
            } else {
                actionBtn = `<a class="tense-action-btn continue-btn" href="lesson.html?tense=${tenseKey}">▶ Continue</a>`;
            }
        } else if (isUnlocked) {
            actionBtn = `<a class="tense-action-btn start-btn" href="lesson.html?tense=${tenseKey}">🚀 Start</a>`;
        } else {
            actionBtn = ``;
        }

        const item = document.createElement('div');
        item.className = 'tense-progress-item' + (isCompleted ? ' completed' : '') + (isUnlocked ? '' : ' locked');
        item.innerHTML = `
            <div class="tense-row-top">
                <div class="tense-name">${tense.name}</div>
                <div class="tense-row-meta">
                    ${accuracyHtml}
                    ${lastAccessedHtml}
                </div>
            </div>
            <div class="tense-row-bottom">
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width:${progressPercentage}%"></div>
                </div>
                <div style="font-size: 0.85rem; color: #e2b714; font-weight: 700; margin: 0 10px; min-width: 40px;">${progressPercentage}%</div>
                ${videoBadges}
                ${actionBtn}
            </div>
        `;
        container.appendChild(item);
    });
}

function confirmResetProgress() {
    const confirmed = confirm('⚠️ Are you sure you want to delete all progress?\n\nThis action cannot be undone!');
    
    if (confirmed) {
        const doubleConfirm = confirm('🚨 FINAL WARNING!\n\nAll your progress will be permanently deleted.\n\nContinue?');
        
        if (doubleConfirm) {
            resetProgress();
        }
    }
}

function resetProgress() {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    // Reinitialize progress for all tenses
    const freshProgress = profileManager.initializeProgress();
    
    // Update each tense to reset it and remove flat storage keys
    Object.keys(freshProgress).forEach(tenseId => {
        profileManager.updateProgress(currentUser.username, tenseId, freshProgress[tenseId]);
        localStorage.removeItem(`tenseflix_state_${currentUser.username}_${tenseId}`);
    });

    // Also reset total time spent
    profileManager.updateProfile(currentUser.username, { totalTimeSpent: 0 });

    alert('✅ Progress deleted successfully!');
    
    // Reload page to show reset data
    window.location.reload();
}
