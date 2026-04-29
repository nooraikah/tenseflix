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

document.querySelectorAll('.feature-card, .stat, .about-us-section, #about-us').forEach(el => {
    observer.observe(el);
});

// Check if user is logged in and update navbar
document.addEventListener('DOMContentLoaded', () => {
    if (profileManager && profileManager.isLoggedIn()) {
        // User is logged in - update navbar
        const currentUser = profileManager.getCurrentUser();
        const profile = profileManager.getProfile(currentUser.username);
        const navbarRight = document.getElementById('navbar-right');
        
        if (navbarRight && currentUser) {
            const avatarHtml = profileManager.getAvatarHTML(profile ? profile.photo : null, profile ? profile.gender : null, 34, 8);
            const btnAvatarHtml = profileManager.getAvatarHTML(profile ? profile.photo : null, profile ? profile.gender : null, 28, 6);

            navbarRight.innerHTML = `
                <div class="language-switcher">
                    <button class="lang-btn" data-lang="ru" onclick="setLanguage('ru')" title="Русский">РУ</button>
                    <button class="lang-btn" data-lang="kk" onclick="setLanguage('kk')" title="Қазақ">KZ</button>
                    <button class="lang-btn" data-lang="en" onclick="setLanguage('en')" title="English">EN</button>
                </div>
                <span class="user-name">${avatarHtml} ${currentUser.fullName}</span>
                <a href="dashboard.html" class="btn-start" data-i18n="footer-course">📊 Мой курс</a>
                <a href="profile.html" class="profile-btn" data-i18n="nav-profile">${btnAvatarHtml} Профиль</a>
                <button class="logout-btn" onclick="logout()" data-i18n="nav-logout">Выход</button>
            `;
            if (typeof updatePageLanguage === 'function') updatePageLanguage();
            if (typeof updateLanguageSwitcherUI === 'function') updateLanguageSwitcherUI();
        }
    }

    // Стилизация секции "About Us"
    const aboutSection = document.getElementById('about-us') || document.querySelector('.about-us');
    if (aboutSection) {
        aboutSection.style.background = '#f8f9fa';
        aboutSection.style.color = '#2d3436';
        aboutSection.style.padding = '80px 20px 0';
        aboutSection.style.borderTop = '3px solid #667eea';
        const title = aboutSection.querySelector('h2, h3');
        if (title) title.style.color = '#667eea';
        const texts = aboutSection.querySelectorAll('p, li');
        texts.forEach(t => t.style.color = '#2d3436');
    }

    // Стилизация секции "Why TENSEFLIX?"
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
        featuresSection.style.paddingTop = '0';
    }

    // Стилизация секции "USEFUL WEBSITES"
    const usefulWebsitesSection = document.getElementById('useful-websites') || document.querySelector('.useful-websites');
    if (usefulWebsitesSection) {
        usefulWebsitesSection.style.background = '#1a1a2e';
        usefulWebsitesSection.style.color = '#ffffff';
        usefulWebsitesSection.style.padding = '80px 20px';
        usefulWebsitesSection.style.borderTop = '3px solid #667eea';
        const title = usefulWebsitesSection.querySelector('h2, h3');
        if (title) title.style.color = '#ffffff';
        const texts = usefulWebsitesSection.querySelectorAll('p, li');
        texts.forEach(t => t.style.color = '#ecf0f1');
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
