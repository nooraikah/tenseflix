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

    const todayStr = new Date().toISOString().split('T')[0];
    const hasCelebratedToday = localStorage.getItem(`birthday_celebrated_${currentUser.username}_${todayStr}`) === 'true';

    // Display user name with badges
    const badges = profileManager.getUserBadges(profile.dob, hasCelebratedToday);
    document.getElementById('username').innerHTML = `${profile.fullName || 'User'} ${badges}`;
    
    // Display Nametag Rank
    let titleEl = document.getElementById('user-nametag');
    if (!titleEl) {
        titleEl = document.createElement('div');
        titleEl.id = 'user-nametag';
        titleEl.style.cssText = 'color: #e2b714; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; font-size: 0.9rem; margin-top: 5px;';
        const nameHeader = document.getElementById('username');
        if (nameHeader) nameHeader.parentNode.insertBefore(titleEl, nameHeader.nextSibling);
    }
    titleEl.textContent = profile.title || 'English Learner';
    titleEl.title = 'Your current rank based on the number of tenses mastered.';
    titleEl.style.cursor = 'pointer';
    titleEl.onclick = function() { alert(this.title); };

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

    // Display Age & handle Birthday celebration
    const isBirthday = isBirthdayToday(profile.dob);

    let age = profileManager.calculateAge(profile.dob);
    if (isBirthday) {
        if (!hasCelebratedToday) age--; // Show old age until the update animation happens
        setupBirthdayButton(profile.dob, currentUser.username);
    } else {
        // Remove button if it's no longer birthday (e.g. after editing DOB)
        const existingBtn = document.getElementById('birthday-update-btn');
        if (existingBtn) existingBtn.remove();
    }

    if (age !== null) {
        document.getElementById('user-age').style.display = 'flex';
        document.getElementById('age-value').textContent = age;
    } else {
        document.getElementById('user-age').style.display = 'none';
    }

    // Display photo with gender defaults
    displayProfilePhoto(profile.photo, profile.gender, profile.dob, hasCelebratedToday);

    // Get user progress and stats
    const userProgress = profileManager.getUserProgress(currentUser.username);
    const stats = profileManager.getUserStats(currentUser.username);

    // Update stats display
    if (stats) {
        document.getElementById('tenses-learned').textContent = stats.tensesCompleted;
        document.getElementById('exercises-completed').textContent = stats.exercisesCompleted;
        document.getElementById('accuracy').textContent = stats.averageAccuracy + '%';
        document.getElementById('pronunciation-score').textContent = (stats.averagePronunciationScore || 0) + '%';

        // Time Spent
        const timeSpent = stats.totalTimeSpent || 0;
        document.getElementById('time-spent').textContent = formatTimeSpent(timeSpent);
    }

    // Load tense progress bars
    loadTenseProgress(userProgress);

    // Reveal animation logic for the first unlocked item
    const prevUnlockedCount = parseInt(localStorage.getItem('tenseflix_gallery_count') || '0');
    
    // Load Movie Gallery
    const unlockedCount = loadGallery(userProgress);

    // Remove instructions text if photos are unlocked
    const instructionText = document.getElementById('gallery-instruction');
    if (instructionText && unlockedCount > 0) {
        instructionText.style.display = 'none';
    }

    // Note: loadGallery handles its own count check, I'll rely on the localStorage flag
    if (prevUnlockedCount === 0 && unlockedCount > 0) {
        const gallerySection = document.getElementById('movie-gallery-container').parentNode;
        gallerySection.style.opacity = '0';
        gallerySection.style.transform = 'translateY(30px)';
        setTimeout(() => {
            gallerySection.style.transition = 'all 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            gallerySection.style.opacity = '1';
            gallerySection.style.transform = 'translateY(0)';
            gallerySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }
    localStorage.setItem('tenseflix_gallery_count', unlockedCount);
}

function isBirthdayToday(dobString) {
    if (!dobString) return false;
    const today = new Date();
    const birthDate = new Date(dobString);
    return today.getMonth() === birthDate.getMonth() && today.getDate() === birthDate.getDate();
}

function setupBirthdayButton(dob, username) {
    const profileInfo = document.querySelector('.profile-info');
    if (!profileInfo) return;
    
    let btn = document.getElementById('birthday-update-btn'); // Ensure btn is defined
    const todayStr = new Date().toISOString().split('T')[0];
    const hasCelebratedToday = localStorage.getItem(`birthday_celebrated_${username}_${todayStr}`) === 'true';
    const newAge = profileManager.calculateAge(dob);

    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'birthday-update-btn';
        btn.className = 'btn-edit-profile';
        profileInfo.appendChild(btn);
    }

    if (newAge === 67) {
        btn.innerHTML = hasCelebratedToday ? '🔥 Level 67 Celebration! 🔥' : '🔥 UNLEASH LEVEL 67 CELEBRATION! 🔥';
        btn.style.cssText = `
            background: linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000);
            background-size: 400%;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 50px;
            font-weight: 800;
            cursor: pointer;
            margin-top: 15px;
            animation: pulse-glow 2.5s infinite, rainbow-bg 10s linear infinite;
        `;
    } else { // For other ages, use standard birthday button styling
        btn.innerHTML = hasCelebratedToday ? '🎂 Celebration!' : '🎂 Update Age for Birthday!';
        btn.style.cssText = `
        background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
        color: #1a1a2e;
        font-weight: 800;
        margin-top: 15px;
        border: none;
        animation: pulse-gold 2s infinite;
    `;
    }

    btn.onclick = () => startBirthdayCelebration(dob, username, hasCelebratedToday);
}

function startBirthdayCelebration(dob, username, isReplay = false) {
    const newAge = profileManager.calculateAge(dob);
    const oldAge = newAge - 1;
    
    const modal = document.getElementById('birthday-celebration-modal');
    const modalContent = modal.querySelector('.birthday-modal-content');
    const celebrationTitle = document.getElementById('celebration-title');
    const celebrationMessage = document.getElementById('celebration-message');
    const closeBtn = document.getElementById('celebration-close-btn');
    const ageNum = document.getElementById('celebration-age-number');
    const avatarImg = document.getElementById('celebration-avatar-img');
    const profile = profileManager.getProfile(username);

    // Set initial avatar in modal based on old age
    if (avatarImg) {
        avatarImg.innerHTML = profileManager.getAvatarHTML(profile.photo, profile.gender, 120, 0, dob, false);
    }
    
    if (!modal || !ageNum) return;

    // Initialize starry space background
    initBirthdayStars();

    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
        if (newAge === 67) {
            // Mars-like yellowish-brownish-goldish background (Enhanced Gold)
            modal.style.background = 'radial-gradient(circle at center, #8B6B23 0%, #5D4017 50%, #1A0F00 100%)';
            if (celebrationTitle) celebrationTitle.classList.add('rainbow-text-animated');
            if (celebrationMessage) celebrationMessage.classList.add('rainbow-text-animated');
            if (ageNum) ageNum.classList.add('rainbow-text-animated', 'pulse-text-glow-animated');
            if (ageNum) ageNum.style.color = 'inherit'; // Allow rainbow animation to take effect
            // Remove the "rectangle" look and enhance the button
            if (modalContent) modalContent.style.background = 'transparent'; // Ensure no background for the content box
            if (closeBtn) closeBtn.classList.add('rainbow-btn-animated');
            triggerMarsStrikes(); // Start the comet strikes
        }
    }, 10);
    ageNum.textContent = oldAge;
    
    // Trigger initial confetti
    // Disabled for age 67 to prevent lag
    if (newAge !== 67) {
        triggerBirthdayConfetti(false);
    }
    
    // Age transition animation (only if it's not a replay)
    setTimeout(() => {
        // Fade out and shrink old age
        ageNum.style.transition = 'all 0.5s ease-in';
        ageNum.style.transform = 'scale(1.5) rotate(15deg)';
        ageNum.style.opacity = '0';
        
        if (avatarImg) {
            avatarImg.style.transform = 'scale(0.8) rotate(-10deg)';
            avatarImg.style.filter = 'blur(5px)';
            avatarImg.style.opacity = '0.5';
        }

        setTimeout(() => {
            ageNum.textContent = newAge;
            ageNum.style.transform = 'scale(0.5) rotate(-15deg)';
            
            setTimeout(() => {
                // Pop in new age
                if (ageNum) {
                    ageNum.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    ageNum.style.transform = 'scale(1) rotate(0deg)';
                }
                ageNum.style.opacity = '1';
                ageNum.style.color = '#e2b714';
                ageNum.style.textShadow = '0 0 40px rgba(226, 183, 20, 1)';
                
                // Update avatar to new age version and pop in
                if (avatarImg) {
                    avatarImg.innerHTML = profileManager.getAvatarHTML(profile.photo, profile.gender, 120, 0, dob, true);
                    avatarImg.style.transform = 'scale(1.1) rotate(0deg)';
                    avatarImg.style.filter = 'blur(0)';
                    avatarImg.style.opacity = '1';
                }
                // Only set color if not 67, otherwise rainbow animation handles it
                if (newAge !== 67) {
                    ageNum.style.color = '#e2b714';
                    ageNum.style.textShadow = '0 0 40px rgba(226, 183, 20, 1)';
                } else { // Enhanced glow for rainbow text
                    ageNum.style.textShadow = '0 0 40px rgba(255,255,255,0.8)';
                }
                // Final confetti burst
                if (newAge === 67) {
                    const duration = 5 * 1000;
                    const end = Date.now() + duration;
                    (function frame() {
                        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#ff0000', '#ff7300', '#fffb00', '#48ff00', '#00ffd5', '#002bff', '#7a00ff'] });
                        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#ff0000', '#ff7300', '#fffb00', '#48ff00', '#00ffd5', '#002bff', '#7a00ff'] });
                        if (Date.now() < end) requestAnimationFrame(frame);
                    }());
                } else {
                    confetti({
                        particleCount: 200,
                        spread: 90,
                        origin: { y: 0.6 },
                        shapes: ['star', 'circle'],
                        colors: ['#ff0a54', '#ff477e', '#ff7096', '#e2b714', '#ffffff']
                    });
                }
                
                // Update actual profile display in background
                const ageVal = document.getElementById('age-value');
                if (ageVal) ageVal.textContent = newAge;
                
                // Save status for current day
                const todayStr = new Date().toISOString().split('T')[0];
                localStorage.setItem(`birthday_celebrated_${username}_${todayStr}`, 'true');
                
                loadProfile(); // Refresh badges and main UI age
                
                // Set achievement flag for the progress page
                localStorage.setItem(`birthday_achievement_${username}`, 'true');
                
                // Transition button to "Replay" mode
                const btn = document.getElementById('birthday-update-btn');
                if (btn) {
                    btn.innerHTML = '🎂 Celebration!';
                    btn.onclick = () => startBirthdayCelebration(dob, username, true);
                }
            }, 50);
        }, 500);
    }, 1200);
}

function triggerBirthdayConfetti(isMega = false) {
    const duration = isMega ? 8 * 1000 : 4 * 1000;
    const animationEnd = Date.now() + duration;
    // Optimized ticks and particle count to reduce lag
    const defaults = { startVelocity: isMega ? 50 : 30, spread: 360, ticks: 60, zIndex: 4000 };

    // Create custom heart shape for confetti
    const heart = confetti.shapeFromPath({ path: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 19.58 2 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' });
    const standardColors = ['#ff0a54', '#ff477e', '#ff7096', '#ff85a1', '#fbb1bd', '#f9bec7', '#e2b714', '#ffffff'];
    const megaColors = ['#ff7300', '#fffb00', '#e2b714', '#ffffff', '#A0522D']; // Mars-themed palette
    const colors = isMega ? megaColors : standardColors;

    function randomInRange(min, max) { return Math.random() * (max - min) + min; }

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        // Cap particle count at 40 to prevent lag
        const particleCount = Math.min(40, 30 * (timeLeft / duration));
        
        confetti({ 
            ...defaults,
            particleCount: isMega ? particleCount * 1.5 : particleCount,
            shapes: isMega ? ['star', 'circle', 'square'] : [heart, 'star', 'circle'],
            colors: colors,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            scalar: isMega ? randomInRange(1.2, 1.8) : 1,
            gravity: 0.7,
        });
        confetti({
            ...defaults,
            particleCount: isMega ? particleCount * 1.5 : particleCount,
            shapes: isMega ? ['star', 'circle', 'square'] : [heart, 'star', 'circle'],
            colors: colors,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            scalar: isMega ? randomInRange(1.2, 1.8) : 1,
            gravity: 0.7,
        });
    }, 250);
}
function triggerFullScreen67() {
    const colors = MEGA_CELEBRATION_COLORS;
    const container = document.body;
    
    for (let i = 0; i < 67; i++) {
        setTimeout(() => {
            const el = document.createElement('div');
            el.textContent = '67';
            el.style.cssText = `
                position: fixed;
                left: ${Math.random() * 90 + 5}vw;
                top: ${Math.random() * 90 + 5}vh;
                font-size: ${Math.random() * 3 + 2}rem;
                color: ${colors[Math.floor(Math.random() * colors.length)]};
                font-weight: 900;
                z-index: 5000;
                pointer-events: none;
                text-shadow: 0 0 20px rgba(0,0,0,0.8);
                opacity: 0;
                transform: scale(0) rotate(${Math.random() * 40 - 20}deg);
                transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            `;
            
            container.appendChild(el);
            
            // Trigger appearance animation
            requestAnimationFrame(() => {
                el.style.opacity = '1';
                el.style.transform = 'scale(1) rotate(0deg)';
            });
            
            // Clean up elements after a random interval
            setTimeout(() => {
                el.style.opacity = '0';
                el.style.transform = 'scale(2.5)';
                setTimeout(() => el.remove(), 800);
            }, 3500 + Math.random() * 3000);
        }, i * 60); // Controlled "typing" speed
    }
}

function triggerMarsStrikes() {
    const container = document.getElementById('birthday-stars-container');
    if (!container) return;

    const strikeInterval = setInterval(() => {
        const modal = document.getElementById('birthday-celebration-modal');
        if (!modal || modal.style.display === 'none') {
            clearInterval(strikeInterval);
            return;
        }

        // Spawn More Mars Comets
        for(let i=0; i<2; i++) {
            const comet = document.createElement('div');
            comet.className = 'mars-comet';
            comet.style.left = Math.random() * 100 + '%';
            comet.style.top = Math.random() * 30 + '%';
            comet.style.animation = `comet-strike ${Math.random() * 0.4 + 0.3}s linear forwards`;
            container.appendChild(comet);
            setTimeout(() => comet.remove(), 1000);
        }

        // Make random stars "strike" more frequently
        const stars = container.querySelectorAll('div:not(.mars-comet)');
        if (stars.length > 0) {
            for(let i=0; i<3; i++) {
                const randomStar = stars[Math.floor(Math.random() * stars.length)];
                randomStar.classList.add('striking-star');
                setTimeout(() => randomStar.classList.remove('striking-star'), 600);
            }
        }
    }, 400); // Increased frequency
}

function initBirthdayStars() {
    const container = document.getElementById('birthday-stars-container');
    if (!container) return;
    container.innerHTML = '';

    // Create 100 flickering stars
    for (let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        const size = Math.random() * 2 + 1;
        star.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: #fff;
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            opacity: ${Math.random()};
            animation: flicker ${Math.random() * 3 + 2}s infinite alternate;
        `;
        container.appendChild(star);
    }

    // Add floating golden particles
    for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        const size = Math.random() * 4 + 2;
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: rgba(226, 183, 20, 0.3);
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: float-slow ${Math.random() * 20 + 10}s infinite linear;
        `;
        container.appendChild(particle);
    }
}

function closeBirthdayModal() {
    const modal = document.getElementById('birthday-celebration-modal');
    const modalContent = modal.querySelector('.birthday-modal-content');
    const celebrationTitle = document.getElementById('celebration-title');
    const celebrationMessage = document.getElementById('celebration-message');
    const closeBtn = document.getElementById('celebration-close-btn');
    const ageNum = document.getElementById('celebration-age-number');

    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            const ageNum = document.getElementById('celebration-age-number');
            if (ageNum) ageNum.style.cssText = ''; // Reset for next time
            if (celebrationTitle) celebrationTitle.classList.remove('rainbow-text-animated');
            if (celebrationMessage) celebrationMessage.classList.remove('rainbow-text-animated');
            if (ageNum) ageNum.classList.remove('rainbow-text-animated', 'pulse-text-glow-animated');
            if (closeBtn) closeBtn.classList.remove('rainbow-btn-animated');
            if (modalContent) modalContent.style.background = ''; // Reset background
            modal.style.background = ''; // Reset modal background
        }, 500); // Ensure this matches the transition duration
    }
}

function loadGallery(userProgress) {
    let container = document.getElementById('movie-gallery-container');
    
    // If container doesn't exist in HTML, create it ABOVE the statistics
    if (!container) {
        const statsGrid = document.querySelector('.stats-grid');
        if (statsGrid && statsGrid.parentNode) {
            const gallerySection = document.createElement('div');
            gallerySection.className = 'profile-section';
            gallerySection.style.marginBottom = '50px';
            gallerySection.innerHTML = `
                <h2 style="color: #e2b714; margin-bottom: 20px; border-bottom: 2px solid #e2b714; padding-bottom: 10px;">🎬 Movie Collection</h2>
                
                <!-- About the Film Block -->
                <div style="background: rgba(226, 183, 20, 0.05); border: 1.5px solid rgba(226, 183, 20, 0.3); border-radius: 15px; padding: 25px; margin-bottom: 30px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #e2b714;"></div>
                    <h4 style="color: #e2b714; margin: 0 0 10px 0; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 2px; font-weight: 800;">🎥 About the Film</h4>
                    <p style="color: #ffffff; font-size: 1.05rem; line-height: 1.6; margin: 0; font-weight: 400; font-style: italic; opacity: 0.9;">
                        This film is created especially for practicing English tenses. 
                        <span style="color: #e2b714; font-weight: 700; border-bottom: 1px dashed #e2b714;">Make choices</span>, 
                        influence the story, and learn through interactive scenes!
                    </p>
                </div>

                <div id="movie-gallery-container"></div>
                <p id="gallery-instruction" style="margin-top: 15px; color: #888; font-size: 0.9rem;">
                    * Pass each tense with <strong>70% accuracy</strong> to unlock a new frame of the Penguin's movie story!
                </p>
            `;
            statsGrid.parentNode.insertBefore(gallerySection, statsGrid);
            container = document.getElementById('movie-gallery-container');
        }
    }

    if (!container) return;

    const PENGUIN_STORY = {
        1: { title: "The Spark", desc: "Our hero finds a poster for a competition." },
        2: { title: "Nights of Creation", desc: "Nights of hard work writing the script." },
        3: { title: "The Pitch", desc: "Presenting the treatment to the board." },
        4: { title: "The Reality Check", desc: "Dealing with rejections." },
        5: { title: "The Breakthrough", desc: "Getting the big 'You're In' call!" },
        6: { title: "Table Read", desc: "The team gathers to dive into the story." },
        7: { title: "Action on Set", desc: "Filming the first emotional scenes." },
        '8_1': { title: "Movie Magic", desc: "Checking the monitor. Every take brings perfection." },
        9: { title: "The Final Cut", desc: "Magic happens in the editing room." },
        10: { title: "The Closed Screening", desc: "A private viewing for the crew." },
        11: { title: "Oscar Shortlist!", desc: "The film makes the big list!" },
        12: { title: "In the Spotlight", desc: "Seeing the poster where it all began." }
    };

    const DISPLAY_ORDER = [
        { key: 'present-simple', id: '1' },
        { key: 'present-continuous', id: '2' },
        { key: 'past-simple', id: '3' },
        { key: 'present-perfect', id: '4' },
        { key: 'future-simple', id: '5' },
        { key: 'past-continuous', id: '6' },
        { key: 'present-perfect-continuous', id: '7' },
        { key: 'past-perfect', id: '8_1' }, // Show the extra frame for level 8
        { key: 'future-continuous', id: '9' },
        { key: 'future-perfect', id: '10' },
        { key: 'past-perfect-continuous', id: '11' },
        { key: 'future-perfect-continuous', id: '12' }
    ];

    let unlockedCount = 0;
    DISPLAY_ORDER.forEach(item => {
        if (userProgress[item.key] && (userProgress[item.key].completedAt || userProgress[item.key].light >= 70)) {
            unlockedCount++;
        }
    });

    // If NO tasks passed at all, show the empty state
    if (unlockedCount === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 60px 20px; background: rgba(15, 15, 30, 0.6); border-radius: 15px; border: 2px dashed rgba(226, 183, 20, 0.3); margin: 20px 0;">
                <p style="color: #e2b714; font-size: 1.2rem; font-weight: 800; margin-bottom: 10px;">Your collection is empty!</p>
                <p style="color: #aaa; font-size: 0.95rem;">Complete lesson tasks with 70% accuracy or more to unlock movie scenes and build your gallery.</p>
            </div>`;
        return;
    }

    // If at least ONE task is passed, show the full grid of 13 items
    let galleryHTML = '<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 35px; padding: 20px 0;">';
    
    DISPLAY_ORDER.forEach((item) => {
        const isUnlocked = userProgress[item.key] && (userProgress[item.key].completedAt || userProgress[item.key].light >= 70);
        const story = PENGUIN_STORY[item.id];
        
        galleryHTML += `
            <div class="gallery-item" style="background:#0f0f1e; border-radius:15px; overflow:hidden; border: 3px solid ${isUnlocked ? '#e2b714' : '#1a1a2e'}; opacity: ${isUnlocked ? '1' : '0.2'}; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" onclick="${isUnlocked ? `openMovieLightbox('${item.id}')` : ''}">
                <img src="${isUnlocked ? item.id + '.png' : 'workout.png'}" style="width:100%; height:220px; object-fit:cover; background:#000; display:block; transition: transform 0.5s ease;">
                <div style="padding:25px; background: linear-gradient(to bottom, #0f0f1e, #050510);">
                    <h4 style="color:#e2b714; margin:0; font-size:1.3rem; font-weight:900; letter-spacing: 0.5px;">${isUnlocked ? story.title : 'Locked Episode'}</h4>
                    <p style="font-size:1rem; color:#e0e0e0; margin:12px 0 0; line-height:1.6; font-weight: 400;">${isUnlocked ? story.desc : 'Finish this level with a high score to reveal this chapter.'}</p>
                </div>
            </div>
        `;
    });

    galleryHTML += '</div>';
    container.innerHTML = galleryHTML;

    return unlockedCount;
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

function enterEditMode() {
    const currentUser = profileManager.getCurrentUser();
    const profile = profileManager.getProfile(currentUser.username);
    
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
        displayProfilePhotoEdit(profile.photo, profile.gender, profile.dob);
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

function displayProfilePhotoEdit(photoData, gender, dob) {
    const avatarSection = document.getElementById('edit-user-avatar');
    const imageContainer = document.getElementById('edit-avatar-image-container');
    const profilePhoto = document.getElementById('edit-profile-photo');
    const deleteBtn = document.getElementById('delete-photo-btn-edit');

    let displaySrc = photoData;
    if (!displaySrc) {
        const age = profileManager.calculateAge(dob);
        const isSpecial = (age !== null && (age <= 16 || age === 67));
        if (gender === 'Female') displaySrc = isSpecial ? '67w.png' : 'penguo_w.png';
        else if (gender === 'Male') displaySrc = isSpecial ? '67m.png' : 'duopinguo.jpg';
    }

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
        const gender = document.querySelector('input[name="gender"]:checked')?.value;
        const dob = document.getElementById('edit-dob').value;
        displayProfilePhotoEdit(photoData, gender, dob);
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

function displayProfilePhoto(photoData, gender, dob, celebratedToday = true) {
    const avatarSection = document.querySelector('#view-mode .user-avatar');
    const imageContainer = document.querySelector('#view-mode .avatar-image-container');
    const profilePhoto = document.querySelector('#view-mode .avatar-image');

    const isBirthday = isBirthdayToday(dob);

    let displaySrc = photoData;
    if (!displaySrc) {
        const realAge = profileManager.calculateAge(dob);
        const effectiveAge = (isBirthday && !celebratedToday) ? realAge - 1 : realAge;
        const isSpecial = (effectiveAge !== null && (effectiveAge <= 16 || effectiveAge === 67));
        if (gender === 'Female') displaySrc = isSpecial ? '67w.png' : 'penguo_w.png';
        else if (gender === 'Male') displaySrc = isSpecial ? '67m.png' : 'duopinguo.jpg';
    }

    if (displaySrc) {
        avatarSection.style.display = 'none';
        imageContainer.style.display = 'block';
        profilePhoto.src = displaySrc;
        if (isBirthday) {
            imageContainer.classList.add('birthday-border');
        } else {
            imageContainer.classList.remove('birthday-border');
        }
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
        { id: 'future-continuous',          name: 'Future Continuous' },
        { id: 'future-perfect',             name: 'Future Perfect' },
        { id: 'past-perfect-continuous',    name: 'Past Perfect Continuous' },
        { id: 'future-perfect-continuous',  name: 'Future Perfect Continuous' }
    ];

    const isAdmin = profileManager.isCurrentUserAdmin ? profileManager.isCurrentUserAdmin() : false;
    let previousCompleted = true;

    TENSE_ORDER.forEach((tense) => {
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
        videoPoints += (Math.min(v1Count, 5) / 5) * pointsPerVideo;
        videoPoints += (Math.min(v2Count, 5) / 5) * pointsPerVideo;
        if (hasV3) videoPoints += (Math.min(v3Count, 3) / 3) * pointsPerVideo;
        if (hasV4) videoPoints += (Math.min(v4Count, 5) / 5) * pointsPerVideo;

        const computedProgress = Math.round(videoPoints + practicePoints);
        const progressPercentage = tenseData.completedAt ? 100 : Math.min(computedProgress, 99);

        // ── Has the user actually started this tense? ─────────────────────────
        const hasStarted = v1Count > 0 || exercisesAnswered > 0 || tasksAnswered > 0
                        || fillAnswered > 0 || practiceAnswered > 0
                        || tenseData.completed > 0
                        || (typeof tenseData.light === 'number' && tenseData.light > 0);

        // ── Unlock check (same logic as dashboard) ────────────────────────────
        const isUnlocked        = previousCompleted || isAdmin;
        const isCompleted       = !!tenseData.completedAt;

        // Update previous status for next card
        previousCompleted = isCompleted;

        // ── Accuracy ─────────────────────────────────────────────────────────
        const allAnswers = [
            ...Object.values(exerciseAnswers),
            ...Object.values(taskAnswers)
        ];
        const correct  = allAnswers.filter(a => a.isCorrect).length;
        const answered = allAnswers.length;
        let accuracy = null;
        if (answered > 0) {
            accuracy = Math.round((correct / answered) * 100);
        } else if (typeof tenseData.light === 'number') {
            accuracy = tenseData.light;
        }

        // ── Last accessed ─────────────────────────────────────────────────────
        const rawDate = ls.timestamp || tenseData.lastAccessed;
        const lastAccessedStr = rawDate
            ? new Date(rawDate).toLocaleDateString('ru-RU', { day:'2-digit', month:'short', year:'numeric' })
            : null;

        // ── Video badges ──────────────────────────────────────────────────────
        const videoBadges = (v1Count >= 5 || v2Count >= 5 || v3Count >= 3 || v4Count >= 5) ? `
            <div class="video-badges">
                <span class="vbadge ${v1Count >= 5 ? 'done' : ''}" title="Video 1 Progress: Introduction and Basic concepts." onclick="alert(this.title)">V1${v1Count >= 5 ? ' ✔' : ''}</span>
                <span class="vbadge ${v2Count >= 5 ? 'done' : ''}" title="Video 2 Progress: Negative and Question forms." onclick="alert(this.title)">V2${v2Count >= 5 ? ' ✔' : ''}</span>
                ${hasV3 ? `<span class="vbadge ${v3Count >= 3 ? 'done' : ''}" title="Video 3 Progress: Nuances and advanced context." onclick="alert(this.title)">V3${v3Count >= 3 ? ' ✔' : ''}</span>` : ''}
                ${hasV4 ? `<span class="vbadge ${v4Count >= 5 ? 'done' : ''}" title="Video 4 Progress: Dialogue practice and review." onclick="alert(this.title)">V4${v4Count >= 5 ? ' ✔' : ''}</span>` : ''}
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
