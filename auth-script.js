/**
 * Authentication Script
 * Handles login and registration with new ProfileManager system
 */

// Clear message
function clearMessage() {
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.textContent = '';
        messageEl.className = 'message';
    }
}

// Show message
function showMessage(text, type = 'info') {
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
    }
}

// Switch between login and register forms
function switchForm(e) {
    e.preventDefault();
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    loginForm.classList.toggle('active');
    registerForm.classList.toggle('active');
    
    // Clear message and inputs
    clearMessage();
    document.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox' || input.type === 'radio') {
            input.checked = false;
        } else {
            input.value = '';
        }
    });
}

// Handle Login
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    const result = profileManager.loginUser(username, password);
    
    if (!result.success) {
        showMessage(result.message, 'error');
        return;
    }
    
    showMessage('Welcome! Redirecting...', 'success');
    
    // Redirect after 1 second
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1000);
}

// Handle Register
function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value.trim();
    const dob = document.getElementById('register-dob').value;
    const gender = document.querySelector('input[name="register-gender"]:checked')?.value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    
    if (!username || !dob || !gender || !password || !confirm) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (password !== confirm) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    // Используем username как имя, так как поле ввода удалено
    const result = profileManager.registerUser(username, password, username, 'user', dob, gender);
    
    if (!result.success) {
        showMessage(result.message, 'error');
        return;
    }
    
    showMessage('Account created! Redirecting to login...', 'success');
    
    // Clear form and switch to login
    setTimeout(() => {
        document.querySelectorAll('input').forEach(input => {
            if (input.type !== 'checkbox' && input.type !== 'radio') {
                input.value = '';
            }
            if (input.type === 'radio') {
                input.checked = false;
            }
        });
        switchForm({preventDefault: () => {}});
        showMessage('Enter your credentials to sign in', 'info');
    }, 1500);
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Redirect if already logged in
    if (profileManager.isLoggedIn()) {
        window.location.href = 'dashboard.html';
    }
    
    // Set up form submission
    const loginForm = document.querySelector('#login-form form');
    const registerForm = document.querySelector('#register-form form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});
