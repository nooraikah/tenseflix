// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add active class to navbar links on scroll
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section');
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });
});

// Animations on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeIn 0.6s ease forwards';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .stat, .tense-group').forEach(el => {
    observer.observe(el);
});

// Check if user is logged in and update navbar
document.addEventListener('DOMContentLoaded', () => {
    if (profileManager && profileManager.isLoggedIn()) {
        // User is logged in - update navbar
        const currentUser = profileManager.getCurrentUser();
        const navbarRight = document.getElementById('navbar-right');
        
        if (navbarRight && currentUser) {
            navbarRight.innerHTML = `
                <span class="user-name">👤 ${currentUser.fullName}</span>
                <a href="dashboard.html" class="btn-start">📊 Мой курс</a>
                <a href="profile.html" class="profile-btn">👤 Профиль</a>
                <button class="logout-btn" onclick="logout()">Выход</button>
            `;
        }
    }
    
    // Add smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
});

// Logout function for navbar
function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        profileManager.logout();
        window.location.href = 'login.html';
    }
}

// Add parallax effect to hero section
window.addEventListener('scroll', () => {
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.style.backgroundPosition = `center ${window.scrollY * 0.5}px`;
    }
});
