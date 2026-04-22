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
    registerUser(username, password, fullName, role = 'user') {
        const profiles = this.getAllProfiles();

        // Check if username already exists
        if (profiles[username]) {
            return { success: false, message: 'A user with this username already exists' };
        }

        // Validate inputs
        if (!username || !password || !fullName) {
            return { success: false, message: 'Please fill in all fields' };
        }

        if (username.length < 3) {
            return { success: false, message: 'Username must be at least 3 characters' };
        }

        if (password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters' };
        }

        // Create new profile
        const newProfile = {
            username: username,
            password: password,
            fullName: fullName,
            role: role,
            age: null,
            photo: null,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            progress: this.initializeProgress()
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
        if (updateData.age !== undefined) {
            profiles[username].age = updateData.age;
        }
        if (updateData.photo) {
            profiles[username].photo = updateData.photo;
        }

        localStorage.setItem(this.storageKey, JSON.stringify(profiles));
        return { success: true, message: 'Profile updated' };
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
     * Get user progress
     */
    getUserProgress(username) {
        const profile = this.getProfile(username);
        return profile ? profile.progress : null;
    }

    /**
     * Get user statistics
     */
    getUserStats(username) {
        const progress = this.getUserProgress(username);
        if (!progress) return null;

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
                const correct = tense.correctCount || tense.completed;
                const accuracy = (correct / tense.completed) * 100;
                totalAccuracy += accuracy;
                tenesesWithAccuracy++;
            }
        });

        return {
            tensesCompleted: tensesCompleted,
            totalTenses: tenses.length,
            exercisesCompleted: completedExercises,
            totalExercises: totalExercises,
            averageAccuracy: tenesesWithAccuracy > 0 ? Math.round(totalAccuracy / tenesesWithAccuracy) : 0
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
