/**
 * Profile Management System
 * Manages user profiles, authentication, and progress storage
 */

class ProfileManager {
    constructor() {
        this.storageKey = 'tenseflix_profiles';
        this.currentUserKey = 'tenseflix_current_user';
        this.initializeStorage();
    }

    /**
     * Initialize storage with default data if needed
     */
    initializeStorage() {
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify({}));
        }
    }

    /**
     * Get all profiles
     */
    getAllProfiles() {
        return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    }

    /**
     * Register new user
     */
    registerUser(username, password, fullName, role = 'user', dob = null, gender = null) {
        const profiles = this.getAllProfiles();

        // Check if username already exists
        if (profiles[username]) {
            return { success: false, message: 'A user with this username already exists' };
        }

        // Validate inputs
        if (!username || !password || !fullName || !dob || !gender) {
            return { success: false, message: 'Please fill in all fields' };
        }

        if (username.length < 3) {
            return { success: false, message: 'Username must be at least 3 characters' };
        }

        if (password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters' };
        }

        if (gender !== 'Male' && gender !== 'Female') {
            return { success: false, message: 'Please select a valid gender' };
        }

        // Create new profile
        const newProfile = {
            username: username,
            password: password,
            fullName: fullName,
            role: role,
            dob: dob,
            gender: gender,
            age: null,
            totalTimeSpent: 0,
            photo: null,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            progress: this.initializeProgress(),
            lastPracticeResult: null,
            pronunciationScores: []
        };

        profiles[username] = newProfile;
        localStorage.setItem(this.storageKey, JSON.stringify(profiles));

        return { success: true, message: 'Account created successfully' };
    }

    /**
     * Login user
     */
    loginUser(username, password) {
        const profiles = this.getAllProfiles();

        if (!profiles[username]) {
            return { success: false, message: 'User not found' };
        }

        if (profiles[username].password !== password) {
            return { success: false, message: 'Incorrect password' };
        }

        // Update last login time
        profiles[username].lastLogin = new Date().toISOString();
        localStorage.setItem(this.storageKey, JSON.stringify(profiles));

        // Set current user
        const currentUser = {
            username: username,
            fullName: profiles[username].fullName,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem(this.currentUserKey, JSON.stringify(currentUser));

        return { success: true, message: 'Welcome back!' };
    }

    /**
     * Logout current user
     */
    logout() {
        localStorage.removeItem(this.currentUserKey);
    }

    /**
     * Get current logged in user
     */
    getCurrentUser() {
        const userStr = localStorage.getItem(this.currentUserKey);
        return userStr ? JSON.parse(userStr) : null;
    }

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return !!this.getCurrentUser();
    }

    /**
     * Get profile by username
     */
    getProfile(username) {
        const profiles = this.getAllProfiles();
        return profiles[username] || null;
    }

    /**
     * Update user profile (name, age, photo)
     */
    updateProfile(username, updateData) {
        const profiles = this.getAllProfiles();

        if (!profiles[username]) {
            return { success: false, message: 'User not found' };
        }

        if (updateData.fullName) {
            profiles[username].fullName = updateData.fullName;
        }
        if (updateData.dob !== undefined) {
            profiles[username].dob = updateData.dob;
        }
        if ('photo' in updateData) { // Исправлено: теперь корректно обрабатывает null (удаление)
            profiles[username].photo = updateData.photo;
        }
        if (updateData.gender !== undefined) {
            profiles[username].gender = updateData.gender;
        }
        if (updateData.totalTimeSpent !== undefined) {
            profiles[username].totalTimeSpent = updateData.totalTimeSpent;
        }

        localStorage.setItem(this.storageKey, JSON.stringify(profiles));
        return { success: true, message: 'Profile updated' };
    }

    /**
     * Update total time spent by user
     */
    updateTimeSpent(username, seconds) {
        const profiles = this.getAllProfiles();
        if (!profiles[username]) return;
        profiles[username].totalTimeSpent = (profiles[username].totalTimeSpent || 0) + seconds;
        localStorage.setItem(this.storageKey, JSON.stringify(profiles));
    }

    /**
     * Save a pronunciation score to user statistics
     */
    savePronunciationScore(username, score) {
        const profiles = this.getAllProfiles();
        if (!profiles[username]) return;
        
        if (!profiles[username].pronunciationScores) {
            profiles[username].pronunciationScores = [];
        }
        
        profiles[username].pronunciationScores.push({
            score: score,
            timestamp: new Date().toISOString()
        });
        
        localStorage.setItem(this.storageKey, JSON.stringify(profiles));
    }

    /**
     * Универсальный помощник для получения HTML аватара (фото или синяя иконка)
     */
    getAvatarHTML(photo, gender = null, size = 34, marginRight = 8, dob = null, celebratedToday = true) {
        const styleBase = `width: ${size}px; height: ${size}px; border-radius: 50%; object-fit: cover; vertical-align: middle; flex-shrink: 0;`;
        const marginStyle = marginRight > 0 ? `margin-right: ${marginRight}px;` : '';
        
        const realAge = this.calculateAge(dob);
        const isBirthday = dob ? (new Date().getMonth() === new Date(dob).getMonth() && new Date().getDate() === new Date(dob).getDate()) : false;
        const effectiveAge = (isBirthday && !celebratedToday) ? (realAge !== null ? realAge - 1 : null) : realAge;
        const bdayStyle = isBirthday ? `box-shadow: 0 0 0 2px #0d1b3e, 0 0 0 ${Math.max(2, size/8)}px #e2b714, 0 0 15px rgba(226, 183, 20, 0.8);` : '';

        let src = photo;
        if (!src) {
            const isSpecialAge = (effectiveAge !== null && (effectiveAge <= 16 || effectiveAge === 67));
            
            if (gender === 'Female') {
                src = isSpecialAge ? '67w.png' : 'penguo_w.png';
            } else if (gender === 'Male') {
                src = isSpecialAge ? '67m.png' : 'duopinguo.jpg';
            }
        }

        if (src) {
            return `<img src="${src}" alt="Avatar" style="${styleBase} ${marginStyle} border: 1.5px solid #7ec8f7; ${bdayStyle}">`;
        } else {
            // Дефолтная синяя иконка (градиент соответствует стилю сайта)
            const fontSize = Math.round(size * 0.5);
            const gradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            return `<div style="${styleBase} ${marginStyle} background: ${gradient}; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: ${fontSize}px; border: 1px solid rgba(255,255,255,0.2); ${bdayStyle}">👤</div>`;
        }
    }

    /**
     * Returns HTML for special badges (Birthday or Special Age)
     */
    getUserBadges(dob, celebratedToday = true) {
        if (!dob) return '';
        const realAge = this.calculateAge(dob);
        const isBirthday = (new Date().getMonth() === new Date(dob).getMonth() && new Date().getDate() === new Date(dob).getDate());
        const displayAge = (isBirthday && !celebratedToday) ? realAge - 1 : realAge;
        
        let badges = '';
        if (isBirthday) {
            const bdayTooltip = celebratedToday ? "Birthday Level Up Completed! 🎉 You've reached a new chapter in your journey." : "It's your Birthday! 🎂 You have a pending Level Up. Click the update button to celebrate!";
            badges += `<span class="user-badge bday-badge" title="${bdayTooltip}" style="cursor:pointer;" onclick="alert(this.title)">🎂</span>`;
        }
        
        if (displayAge !== null) {
            if (displayAge === 67) {
                badges += `<span class="user-badge age-badge" title="Elite 67 Member: A legendary age for cinematic mastery! 🌟 This badge honors our most experienced students." style="cursor:pointer; font-weight:900; color:#e2b714; background: rgba(226, 183, 20, 0.15); padding: 0 6px; border-radius: 4px; border: 1.5px solid #e2b714; font-size: 0.85rem; line-height: 1.4; display: inline-block;" onclick="alert(this.title)">67</span>`;
            } else if (displayAge < 17) {
                badges += `<span class="user-badge age-badge" title="Young Prodigy: Starting the path to Absolute Cinema early! 🐣 This badge is for our talented students under 17." style="cursor:pointer;" onclick="alert(this.title)">🐣</span>`;
            }
        }
        return badges;
    }

    /**
     * Helper to calculate age from DOB string
     */
    calculateAge(dobString) {
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

    /**
     * Change password
     */
    changePassword(username, oldPassword, newPassword) {
        const profiles = this.getAllProfiles();

        if (!profiles[username]) {
            return { success: false, message: 'User not found' };
        }

        if (profiles[username].password !== oldPassword) {
            return { success: false, message: 'Incorrect current password' };
        }

        if (newPassword.length < 6) {
            return { success: false, message: 'New password must be at least 6 characters' };
        }

        profiles[username].password = newPassword;
        localStorage.setItem(this.storageKey, JSON.stringify(profiles));
        return { success: true, message: 'Password changed successfully' };
    }

    /**
     * Initialize progress structure
     */
    initializeProgress() {
        const tenses = [
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

        const progress = {};
        tenses.forEach(tense => {
            progress[tense] = {
                level: 'easy',
                light: 0,
                medium: 0,
                hard: 0,
                completed: 0,
                correctCount: 0,
                total: 15,
                lastAccessed: null,
                completedAt: null,
                lessonState: {}
            };
        });

        return progress;
    }

    /**
     * Save lesson interaction state (video quiz progress, etc.) for a tense
     */
    saveLessonState(username, tenseId, stateData) {
        const profiles = this.getAllProfiles();
        if (!profiles[username]) return;
        if (!profiles[username].progress[tenseId]) {
            profiles[username].progress[tenseId] = {
                level: 'easy', light: 0, medium: 0, hard: 0,
                completed: 0, correctCount: 0, total: 15,
                lastAccessed: null, completedAt: null, lessonState: {}
            };
        }
        profiles[username].progress[tenseId].lessonState = {
            ...(profiles[username].progress[tenseId].lessonState || {}),
            ...stateData
        };
        localStorage.setItem(this.storageKey, JSON.stringify(profiles));
    }

    /**
     * Save the latest practice result for display in dashboard/profile
     */
    savePracticeResult(username, result) {
        const profiles = this.getAllProfiles();
        if (!profiles[username]) return { success: false, message: 'User not found' };

        profiles[username].lastPracticeResult = {
            ...(profiles[username].lastPracticeResult || {}),
            ...result,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem(this.storageKey, JSON.stringify(profiles));
        return { success: true };
    }

    /**
     * Get the latest practice result for the user
     */
    getPracticeResult(username) {
        const profile = this.getProfile(username);
        return profile ? profile.lastPracticeResult || null : null;
    }

    /**
     * Get saved lesson state for a tense
     */
    getLessonState(username, tenseId) {
        const profile = this.getProfile(username);
        if (!profile || !profile.progress || !profile.progress[tenseId]) return {};
        return profile.progress[tenseId].lessonState || {};
    }

    /**
     * Update user progress for a tense
     */
    updateProgress(username, tenseId, progressData) {
        const profiles = this.getAllProfiles();

        if (!profiles[username]) {
            return { success: false, message: 'User not found' };
        }

        if (!profiles[username].progress[tenseId]) {
            profiles[username].progress[tenseId] = {
                level: 'easy',
                light: 0,
                medium: 0,
                hard: 0,
                completed: 0,
                correctCount: 0,
                total: 15,
                lastAccessed: null,
                completedAt: null,
                lessonState: {}
            };
        }

        profiles[username].progress[tenseId] = {
            ...profiles[username].progress[tenseId],
            ...progressData,
            lastAccessed: new Date().toISOString()
        };

        localStorage.setItem(this.storageKey, JSON.stringify(profiles));
        return { success: true };
    }


    /**
     * Get user statistics
     */
    getUserStats(username) {
        const profile = this.getProfile(username);
        if (!profile || !profile.progress) return null;
        
        const progress = profile.progress;

        const tenses = Object.keys(progress);
        let tensesCompleted = 0;
        let totalExercises = 0;
        let completedExercises = 0;
        let totalAccuracy = 0;
        let tenesesWithAccuracy = 0;

        tenses.forEach(tenseId => {
            const tense = progress[tenseId];
            
            if (tense.completedAt) {
                tensesCompleted++;
            }

            totalExercises += tense.total;
            completedExercises += tense.completed;

            // Calculate accuracy per tense if completed
            if (tense.completed > 0) {
                const correct = tense.correctCount || 0;
                const accuracy = (correct / tense.completed) * 100;
                totalAccuracy += accuracy;
                tenesesWithAccuracy++;
            }
        });

        // Calculate pronunciation statistics
        const pronScores = profile.pronunciationScores || [];
        const avgPronScore = pronScores.length > 0 
            ? Math.round(pronScores.reduce((acc, curr) => acc + curr.score, 0) / pronScores.length)
            : 0;

        return {
            tensesCompleted: tensesCompleted,
            totalTenses: tenses.length,
            exercisesCompleted: completedExercises,
            totalExercises: totalExercises,
            averageAccuracy: tenesesWithAccuracy > 0 ? Math.round(totalAccuracy / tenesesWithAccuracy) : 0,
            totalTimeSpent: profile.totalTimeSpent || 0,
            averagePronunciationScore: avgPronScore,
            pronunciationAttempts: pronScores.length
        };
    }

    /**
     * Delete user profile
     */
    deleteProfile(username) {
        const profiles = this.getAllProfiles();

        if (!profiles[username]) {
            return { success: false, message: 'User not found' };
        }

        delete profiles[username];
        localStorage.setItem(this.storageKey, JSON.stringify(profiles));
        return { success: true, message: 'Profile deleted' };
    }

    /**
     * Check if user is admin
     */
    isAdmin(username) {
        const profile = this.getProfile(username);
        return profile && profile.role === 'admin';
    }

    /**
     * Get current user role
     */
    getCurrentUserRole() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return null;
        const profile = this.getProfile(currentUser.username);
        return profile ? profile.role : null;
    }

    /**
     * Check if current user is admin
     */
    isCurrentUserAdmin() {
        const currentUser = this.getCurrentUser();
        return currentUser && this.isAdmin(currentUser.username);
    }

    /**
     * Get user progress for a tense
     */
    getUserProgress(username) {
        const profile = this.getProfile(username);
        if (!profile) return null;
        return profile.progress || {};
    }

    /**
     * Get progress for a specific tense
     */
    getTenseProgress(username, tenseId) {
        const profile = this.getProfile(username);
        if (!profile || !profile.progress || !profile.progress[tenseId]) {
            return null;
        }
        return profile.progress[tenseId];
    }

    /**
     * Mark tense as completed
     */
    markTenseCompleted(username, tenseId) {
        const profiles = this.getAllProfiles();
        if (!profiles[username] || !profiles[username].progress[tenseId]) return;
        
        profiles[username].progress[tenseId].completedAt = new Date().toISOString();
        localStorage.setItem(this.storageKey, JSON.stringify(profiles));
    }

    /**
     * Get overall course progress statistics
     */
    getCourseStats(username) {
        const profile = this.getProfile(username);
        if (!profile || !profile.progress) return null;
        
        const progress = profile.progress;
        let totalCompleted = 0;
        let totalCorrect = 0;
        let avgLight = 0;
        let tensesCount = 0;
        
        Object.values(progress).forEach(tenseProgress => {
            if (tenseProgress.completed > 0) {
                totalCompleted += tenseProgress.completed;
                totalCorrect += (tenseProgress.correctCount || 0);
                avgLight += (tenseProgress.light || 0);
                tensesCount++;
            }
        });
        
        return {
            totalTensesEnrolled: Object.keys(progress).length,
            tensesInProgress: tensesCount,
            totalExercisesCompleted: totalCompleted,
            totalCorrect: totalCorrect,
            averageAccuracy: totalCompleted > 0 ? Math.round((totalCorrect / totalCompleted) * 100) : 0,
            averageProgress: tensesCount > 0 ? Math.round(avgLight / tensesCount) : 0
        };
    }

    /**
     * Create admin account with full access
     */
    createAdminAccount(username, password, fullName) {
        return this.registerUser(username, password, fullName, 'admin');
    }
}

// Create global instance
const profileManager = new ProfileManager();
