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

    // Display age if available
    if (profile.age) {
        document.getElementById('user-age').style.display = 'block';
        document.getElementById('age-value').textContent = profile.age;
    }

    // Display photo if available
    if (profile.photo) {
        displayProfilePhoto(profile.photo);
    }

    // Get user progress and stats
    const userProgress = profileManager.getUserProgress(currentUser.username);
    const stats = profileManager.getUserStats(currentUser.username);

    // Update stats display
    if (stats) {
        document.getElementById('tenses-learned').textContent = stats.tensesCompleted;
        document.getElementById('exercises-completed').textContent = stats.exercisesCompleted;
        document.getElementById('accuracy').textContent = stats.averageAccuracy + '%';

        // Build streak from lastAccessed dates
        let streak = 0;
        if (userProgress) {
            const dates = Object.values(userProgress)
                .map(t => t.lastAccessed)
                .filter(Boolean)
                .map(d => new Date(d).toDateString());
            const today = new Date().toDateString();
            if (dates.includes(today)) streak = 1;
        }
        document.getElementById('streak').textContent = streak;
    }

    // Load tense progress bars
    loadTenseProgress(userProgress);
}

function enterEditMode() {
    const profile = profileManager.getProfile(profileManager.getCurrentUser().username);
    
    // Load data into edit form
    document.getElementById('edit-name').value = profile.fullName || '';
    document.getElementById('edit-age').value = profile.age || '';
    
    // Clear password fields
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    
    // Synchronize photo in edit mode
    if (profile.photo) {
        displayProfilePhotoEdit(profile.photo);
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

function displayProfilePhotoEdit(photoData) {
    const avatarSection = document.getElementById('edit-user-avatar');
    const imageContainer = document.getElementById('edit-avatar-image-container');
    const profilePhoto = document.getElementById('edit-profile-photo');
    const deleteBtn = document.getElementById('delete-photo-btn-edit');

    // Hide emoji avatar, show image
    avatarSection.style.display = 'none';
    imageContainer.style.display = 'block';
    profilePhoto.src = photoData;

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

function displayProfilePhoto(photoData) {
    const avatarSection = document.querySelector('#view-mode .user-avatar');
    const imageContainer = document.querySelector('#view-mode .avatar-image-container');
    const profilePhoto = document.querySelector('#view-mode .avatar-image');

    // Hide emoji avatar, show image
    avatarSection.style.display = 'none';
    imageContainer.style.display = 'block';
    profilePhoto.src = photoData;
}

function saveProfileChanges() {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const nameInput = document.getElementById('edit-name');
    const ageInput = document.getElementById('edit-age');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    const fullName = nameInput.value.trim();
    const age = ageInput.value ? parseInt(ageInput.value) : null;
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validate name
    if (!fullName) {
        alert('❌ Please enter your name');
        return;
    }

    // Validate age
    if (age && (age < 1 || age > 100)) {
        alert('❌ Age must be between 1 and 100');
        return;
    }

    // Update profile info
    const updateData = { fullName };
    if (age) {
        updateData.age = age;
    }

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
        const exerciseAnswers   = ls.exerciseAnswers || {};
        const taskAnswers       = ls.taskAnswers     || {};
        const fillAnswers       = ls.fillAnswers     || {};
        const practiceAnswers   = ls.practiceAnswers || {};
        const exercisesAnswered = Object.keys(exerciseAnswers).length;
        const tasksAnswered     = Object.keys(taskAnswers).length;
        const fillAnswered      = Object.values(fillAnswers).filter(f => f.value && f.value.trim()).length;
        const practiceAnswered  = Object.keys(practiceAnswers).length;

        const TOTAL_ACTIVITIES = 6 + 4 + 3 + 5 + 15;
        const doneActivities   = Math.min(v1Count, 6) + Math.min(v2Count, 4) + Math.min(v3Count, 3)
                               + Math.min(tasksAnswered, 5) + Math.min(exercisesAnswered, 15);
        const computedProgress  = Math.round((doneActivities / TOTAL_ACTIVITIES) * 100);
        const progressPercentage = tenseData.completedAt ? 100 : computedProgress;

        // ── Has the user actually started this tense? ─────────────────────────
        const hasStarted = v1Count > 0 || exercisesAnswered > 0 || tasksAnswered > 0
                        || fillAnswered > 0 || practiceAnswered > 0;

        // ── Unlock check (same logic as dashboard) ────────────────────────────
        const prevTenses        = TENSE_ORDER.slice(0, index).map(t => t.id);
        const allPrevCompleted  = prevTenses.every(id => userProgress[id] && userProgress[id].completedAt !== null);
        const isUnlocked        = isAdmin || index === 0 || allPrevCompleted;
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
        const v1done = v1Count >= 6;
        const v2done = v2Count >= 4;
        const v3done = v3Count >= 3;
        const videoBadges = (v1done || v2done || v3done) ? `
            <div class="video-badges">
                <span class="vbadge ${v1done ? 'done' : ''}">V1${v1done ? ' ✔' : ''}</span>
                <span class="vbadge ${v2done ? 'done' : ''}">V2${v2done ? ' ✔' : ''}</span>
                <span class="vbadge ${v3done ? 'done' : ''}">V3${v3done ? ' ✔' : ''}</span>
            </div>` : '';

        const accuracyHtml = accuracy !== null
            ? `<span class="progress-accuracy">${accuracy}% accuracy</span>` : '';

        const lastAccessedHtml = lastAccessedStr
            ? `<span class="last-accessed">🕐 ${lastAccessedStr}</span>` : '';

        // ── Continue / Start / Replay button ─────────────────────────────────
        let actionBtn = '';
        if (isCompleted) {
            actionBtn = `<a class="tense-action-btn replay-btn" href="lesson.html?tense=${tenseKey}">🔄 Retake</a>`;
        } else if (isUnlocked && hasStarted) {
            // Find the last active tab from saved state
            const lastTab = ls.activeTab || 'video1';
            actionBtn = `<a class="tense-action-btn continue-btn" href="lesson.html?tense=${tenseKey}">▶ Continue</a>`;
        } else if (isUnlocked && !hasStarted) {
            actionBtn = `<a class="tense-action-btn start-btn" href="lesson.html?tense=${tenseKey}">🚀 Start</a>`;
        } else {
            actionBtn = `<span class="tense-action-btn locked-btn">🔒 Locked</span>`;
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
                    <div class="progress-bar-fill" style="width:${progressPercentage}%">
                        ${progressPercentage > 15 ? progressPercentage + '%' : ''}
                    </div>
                </div>
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
    
    // Update each tense to reset it
    Object.keys(freshProgress).forEach(tenseId => {
        profileManager.updateProgress(currentUser.username, tenseId, freshProgress[tenseId]);
    });

    alert('✅ Progress deleted successfully!');
    
    // Reload page to show reset data
    window.location.reload();
}
