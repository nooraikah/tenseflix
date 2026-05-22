/**
 * Dashboard Script
 * Manages dashboard functionality and user progress
 */

let isRedirecting = false;

// Check if user is logged in
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    if (!isRedirecting) {
        loadUserInfo();
        initializeLevels();
        initTeacherGuide();
        updateWelcomeMessage(); // Call the new function here
    }
});

// Authentication check
function checkAuth() {
    if (!profileManager.isLoggedIn()) {
        isRedirecting = true;
        window.location.href = 'login.html';
        return;
    }
}

// Load user information
function loadUserInfo() {
    const currentUser = profileManager.getCurrentUser();
    if (currentUser) {
        // Remove language switcher on this page
        const switcher = document.querySelector('.language-switcher');
        if (switcher) switcher.style.display = 'none';

        const nameFirst = currentUser.fullName ? currentUser.fullName.split(' ')[0] : 'User';
        const userElement = document.getElementById('user-name');
        const profile = profileManager.getProfile(currentUser.username);

        if (userElement) {
            userElement.textContent = nameFirst;
            if (profile?.dob && isBirthdayToday(profile.dob)) {
                userElement.classList.add('birthday-shine');
            } else {
                userElement.classList.remove('birthday-shine');
            }
            
            // Add admin badge if user is admin
            if (profileManager.isCurrentUserAdmin()) {
                addTeacherGuideButton(); // Add teacher guide button for admins
            }
        }

        // Replace human icon with profile picture if available
        const profileBtn = document.querySelector('.profile-btn');
        if (profileBtn) {
            const todayStr = new Date().toISOString().split('T')[0];
            const hasCelebratedToday = localStorage.getItem(`birthday_celebrated_${currentUser.username}_${todayStr}`) === 'true';
            profileBtn.innerHTML = profileManager.getAvatarHTML(profile ? profile.photo : null, profile ? profile.gender : null, 34, 0, profile ? profile.dob : null, hasCelebratedToday);
            profileBtn.style.display = 'flex';
            profileBtn.style.alignItems = 'center';
            profileBtn.style.justifyContent = 'center';
        }
        
        // Remove empty space in footer
        const footer = document.querySelector('.footer');
        if (footer) {
            footer.style.padding = '40px 0';
            footer.style.marginTop = '0';
            footer.style.marginBottom = '-50px';

            const p = footer.querySelector('p');
            if (p) p.style.margin = '0';
        }
        const dashboardContent = document.querySelector('.dashboard-container') || document.querySelector('.profile-container');
        if (dashboardContent) dashboardContent.style.paddingBottom = '0';
    }
}

// Function to add the teacher guide button
function addTeacherGuideButton() {
    const userInfoDiv = document.querySelector('.user-info'); // Or another suitable parent
    if (!userInfoDiv) return;

    let guideButton = document.getElementById('teacher-guide-btn');
    if (!guideButton) {
        guideButton = document.createElement('button');
        guideButton.id = 'teacher-guide-btn';
        guideButton.innerHTML = '👩‍🏫 Teacher\'s Guide';
        guideButton.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
            margin-left: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap; /* Prevent text wrapping */
        `;
        guideButton.onmouseover = () => {
            guideButton.style.transform = 'translateY(-2px)';
            guideButton.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
        };
        guideButton.onmouseout = () => {
            guideButton.style.transform = 'translateY(0)';
            guideButton.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
        };
        guideButton.onclick = openTeacherGuideModal;

        userInfoDiv.appendChild(guideButton);
    }
}

// New functions for modal
function openTeacherGuideModal() {
    const modal = document.getElementById('teacher-guide-modal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10); // Add 'show' class for fade-in
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
}

function closeTeacherGuideModal() {
    const modal = document.getElementById('teacher-guide-modal');
    if (modal) {
        modal.classList.remove('show'); // Remove 'show' class for fade-out
        setTimeout(() => modal.style.display = 'none', 300); // Hide after transition
        document.body.style.overflow = 'auto'; // Restore scrolling
    }
}

// Teacher Guide Widget Functions
function initTeacherGuide() {
    const popup = document.getElementById('teacher-guide-popup');
    if (popup) {
        popup.style.display = 'none'; // Ensure it's hidden on load
    }

    const trigger = document.getElementById('teacher-guide-trigger');
    if (trigger && localStorage.getItem('teacherGuidePulsedOnce') === 'true') {
        trigger.classList.remove('pulsing'); // Hide pulse if already clicked once
    }
}

// Function to update the welcome message based on time of day
function updateWelcomeMessage() {
    const welcomeElement = document.getElementById('welcome-message');
    const currentUser = profileManager.getCurrentUser(); // Get current user
    if (!welcomeElement) return;

    const now = new Date();
    const hour = now.getHours();
    let greeting;

    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    else greeting = 'Good evening';

    let userName = '';
    if (currentUser && currentUser.fullName) {
        userName = currentUser.fullName.split(' ')[0]; // Get first name
        userName = userName.charAt(0).toUpperCase() + userName.slice(1); // Capitalize
    }
    
    let birthdayGreeting = '';
    // Check for birthday and add special greeting
    const profile = profileManager.getProfile(currentUser.username);
    if (profile && profile.dob && isBirthdayToday(profile.dob)) {
        birthdayGreeting = ' Happy Birthday! 🎉';
    }

    welcomeElement.textContent = `${greeting}${userName ? ', ' + userName : ''}!${birthdayGreeting}`;
}

function openTeacherGuidePopup(event) {
    if (event) event.stopPropagation();
    
    const popup = document.getElementById('teacher-guide-popup');
    const trigger = document.getElementById('teacher-guide-trigger');

    if (!popup || !trigger) return;

    if (popup.style.display === 'block' && !popup.classList.contains('closing')) {
        // If already open and not closing, close it
        closeTeacherGuidePopup();
    } else {
        // If closed or currently closing, open it
        popup.classList.remove('closing');
        popup.style.display = 'block';
        
        // Stop pulsing animation after first click
        if (trigger) {
            trigger.classList.remove('pulsing');
            localStorage.setItem('teacherGuidePulsedOnce', 'true');
        }
    }
}

function closeTeacherGuidePopup() {
    const popup = document.getElementById('teacher-guide-popup');
    if (!popup || popup.style.display === 'none' || popup.classList.contains('closing')) return;

    // Add closing class for fade-out animation
    popup.classList.add('closing');
    
    // Hide after animation finishes
    setTimeout(() => {
        popup.style.display = 'none';
        popup.classList.remove('closing');
    }, 300);
}

// Close popup when clicking outside the widget area
window.addEventListener('click', (event) => {
    const widget = document.getElementById('teacher-guide-widget');
    const popup = document.getElementById('teacher-guide-popup');
    if (widget && !widget.contains(event.target) && popup && popup.style.display === 'block') {
        closeTeacherGuidePopup();
    }
});

// Initialize levels based on user progress
function initializeLevels() {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;
    
    const userProgress = profileManager.getUserProgress(currentUser.username);
    if (!userProgress) return;
    
    const TENSE_PROGRESSION = [
        'present-simple', 'present-continuous', 'past-simple', 'present-perfect',
        'future-simple', 'past-continuous', 'present-perfect-continuous', 'past-perfect',
        'future-continuous', 'future-perfect', 'past-perfect-continuous', 'future-perfect-continuous'
    ];

    const isAdmin = profileManager.isCurrentUserAdmin();
    
    let completedCount = 0;
    let previousCompleted = true; // First tense is always unlocked

    TENSE_PROGRESSION.forEach((tenseId) => {
        const levelElement = document.querySelector(`[data-tense="${tenseId}"]`);
        if (!levelElement) return;

        const card = levelElement.querySelector('.tense-card');
        const tenseData = userProgress[tenseId];
        const startBtn = card.querySelector('.start-btn');

        // Remove old info messages to prevent duplicates on refresh
        card.querySelectorAll('.status-info-msg').forEach(el => el.remove());
        
        // Get the tense label (from h3 tag)
        const tenseName = card.querySelector('h3')?.textContent || tenseId;
        
        // Check if tense is completed
        const isCompleted = tenseData.completedAt !== null;
        const accuracy = tenseData.completed > 0
            ? Math.round((tenseData.correctCount / tenseData.completed) * 100)
            : (typeof tenseData.light === 'number' ? tenseData.light : 0);
        const isPassed = isCompleted && accuracy >= 70;
        
        const levelIdx = TENSE_PROGRESSION.indexOf(tenseId) + 1;

        // Handle Movie Frames Unlocking
        const frame = document.getElementById(`frame-${levelIdx}`);
        const frame2 = (levelIdx === 8) ? document.getElementById('frame-8_1') : null;
        
        // Reset frames first
        if (frame) frame.classList.remove('unlocked');
        if (frame2) frame2.classList.remove('unlocked');

        if (isPassed) { // Теперь строго проверяем прохождение на 70%+
            completedCount++;
            if (frame) {
                frame.classList.add('unlocked');
            }
            // Special case for level 8 extra frame
            if (levelIdx === 8) {
                if (frame2) frame2.classList.add('unlocked');
            }
        }
        
        // Unlock logic: Level 1 is always open, or the previous level must be completed
        const isUnlocked = previousCompleted || isAdmin;
        
        // Update for next iteration: a level is completed if it has a timestamp
        previousCompleted = isCompleted;
        
        // Update card status
        card.classList.remove('locked', 'unlocked', 'completed');
        
        if (isCompleted) {
            card.classList.add('completed');
            card.querySelector('.level-badge').textContent = isAdmin ? '👑' : '🚀';
            const score = tenseData.correctCount || 0;
            const total = tenseData.completed || 0;

            if (startBtn) {
                startBtn.textContent = '✅ Done';
                startBtn.classList.add('replay-btn');
                startBtn.disabled = false;
                startBtn.style.pointerEvents = 'auto';
                startBtn.style.opacity = '1';

                const infoDiv = document.createElement('div');
                infoDiv.className = 'status-info-msg';
                infoDiv.style.cssText = 'font-size: 0.85rem; color: #e2b714; margin: 8px 0; text-align: center; font-weight: 700;';
                infoDiv.innerHTML = `Points: ${score}/${total}`;
                startBtn.parentNode.insertBefore(infoDiv, startBtn);
            }
            
        } else if (isUnlocked) {
            card.classList.add('unlocked');
            card.querySelector('.level-badge').textContent = isAdmin ? '👑' : '🚀';
            
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.style.pointerEvents = 'auto';
                startBtn.style.opacity = '1';
            }

            // If attempted but not passed (score exists but not marked completed)
            const hasAttempt = tenseData && tenseData.completed > 0;
            
            // ── New Weighted Progress Calculation ────────────────────────────────
            const ls = tenseData.lessonState || {};
            const v1Count = (ls.video1Answered || []).length;
            const v2Count = (ls.video2Answered || []).length;
            const v3Count = (ls.video3Answered || []).length;
            const v4Count = (ls.video4Answered || []).length;

            const hasV3 = (tenseId !== 'present-perfect-continuous' && tenseId !== 'past-perfect' && tenseId !== 'future-perfect-continuous');
            const hasV4 = (tenseId === 'present-simple' || tenseId === 'present-continuous');
            const totalVideos = 2 + (hasV3 ? 1 : 0) + (hasV4 ? 1 : 0);

            const practicePoints = (tenseData.completedAt || (tenseData.light >= 70)) ? 40 : 0;
            const pointsPerVideo = 60 / totalVideos;
            let videoPoints = 0;
            videoPoints += (Math.min(v1Count, 5) / 5) * pointsPerVideo;
            videoPoints += (Math.min(v2Count, 5) / 5) * pointsPerVideo;
            if (hasV3) videoPoints += (Math.min(v3Count, 3) / 3) * pointsPerVideo;
            if (hasV4) videoPoints += (Math.min(v4Count, 5) / 5) * pointsPerVideo;

            const totalProgress = Math.round(videoPoints + practicePoints);

            if (hasAttempt && !isAdmin) {
                if (startBtn) {
                    startBtn.textContent = '⚠️ Retake';
                    startBtn.classList.add('replay-btn');
                    
                    const score = tenseData.correctCount || 0;
                    const total = tenseData.completed || 0;
                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'status-info-msg';
                    infoDiv.style.cssText = 'font-size: 0.85rem; color: #e74c3c; margin: 8px 0; text-align: center; font-weight: 700;';
                    infoDiv.innerHTML = `Points: ${score}/${total}`;
                    startBtn.parentNode.insertBefore(infoDiv, startBtn);
                }
            }
            
            // Add progress bar if lesson is in progress
            if (totalProgress > 0) {
                const progressBar = createProgressBar(totalProgress, tenseData.correctCount, tenseData.completed);
                card.appendChild(progressBar);
            }
            
            // Ensure admin sees button, not locked message
            if (isAdmin) {
                const lockedMsg = card.querySelector('.locked-msg');
                const levelNum = levelElement.getAttribute('data-level');
                if (lockedMsg) {
                    const btn = document.createElement('button');
                    btn.className = 'start-btn admin-access';
                    btn.textContent = 'Start Lesson';
                    btn.onclick = () => startLesson(tenseId, levelNum);
                    lockedMsg.replaceWith(btn);
                }
                
                // If no button exists, create one
                if (!card.querySelector('.start-btn')) {
                    const btn = document.createElement('button');
                    btn.className = 'start-btn admin-access';
                    btn.textContent = 'Start Lesson';
                    btn.onclick = () => startLesson(tenseId, levelNum);
                    card.appendChild(btn);
                }
            }
        } else {
            card.classList.add('locked');
            card.querySelector('.level-badge').textContent = '🔒';
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.style.pointerEvents = 'none';
                startBtn.style.opacity = '0.5';
            }
            
            // For admin, replace locked message with button
            if (isAdmin) {
                const lockedMsg = card.querySelector('.locked-msg');
                const levelNum = levelElement.getAttribute('data-level');
                if (lockedMsg) {
                    const btn = document.createElement('button');
                    btn.className = 'start-btn admin-access';
                    btn.textContent = 'Start Lesson';
                    btn.onclick = () => startLesson(tenseId, levelNum);
                    lockedMsg.replaceWith(btn);
                } else {
                    const btn = document.createElement('button');
                    btn.className = 'start-btn admin-access';
                    btn.textContent = 'Start Lesson';
                    btn.onclick = () => startLesson(tenseId, levelNum);
                    card.appendChild(btn);
                }
                
                // Update class to show it's unlocked for admin
                card.classList.remove('locked');
                card.classList.add('unlocked');
                card.querySelector('.level-badge').textContent = '👑';
            }
        }
    });

    // Update Counter and Final Reward
    const counterBtn = document.getElementById('tense-counter-btn');
    if (counterBtn) {
        counterBtn.textContent = `${completedCount}/12 Tenses Mastered`;
        if (completedCount === 12) {
            counterBtn.classList.add('ready-for-victory');
            counterBtn.textContent = "🏆 Claim Victory!";
            counterBtn.onclick = () => {
                triggerSaluteConfetti();
                triggerVictorySky();
                const reward = document.getElementById('final-reward');
                const speechBtnContainer = document.getElementById('oscar-speech-btn-container');
                if (reward) {
                    reward.style.display = 'block';
                    reward.classList.add('fire-show');
                    reward.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                if (speechBtnContainer) {
                    setTimeout(() => {
                        speechBtnContainer.style.display = 'block';
                    }, 1000);
                }
            };
        } else {
            // Reset button if not at 12/12
            counterBtn.classList.remove('ready-for-victory');
            counterBtn.onclick = null;
        }
    }

    updateUserRank(completedCount);
    initStarryBackground(completedCount); // Инициализируем фон с учетом прогресса
}

function triggerSaluteConfetti() {
    const duration = 3 * 1000; // Shortened to 3 seconds
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 45, spread: 360, ticks: 100, zIndex: 10000 };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            // Grand Finale Gold Star Burst
            confetti({
                ...defaults,
                particleCount: 400,
                origin: { x: 0.5, y: 0.4 },
                colors: ['#FFD700', '#FFDF00', '#DAA520', '#FFFFFF'],
                shapes: ['star'],
                scalar: 2.5
            });
            return clearInterval(interval);
        }

        const particleCount = 60 * (timeLeft / duration);

        // 1. Golden "Salute" bursts from random sky positions
        confetti({
            ...defaults,
            particleCount: particleCount * 1.5,
            origin: { x: randomInRange(0.1, 0.9), y: randomInRange(0.1, 0.4) },
            colors: ['#FFD700', '#FFDF00', '#DAA520'],
            shapes: ['star'],
            gravity: 0.6,
            scalar: randomInRange(0.7, 1.4)
        });

        // 2. FireShow Sparks shooting up from the bottom
        confetti({
            ...defaults,
            particleCount: 15,
            origin: { x: randomInRange(0.2, 0.8), y: 0.9 },
            colors: ['#FF4500', '#FF8C00', '#FF0000'],
            angle: randomInRange(70, 110),
            spread: 30,
            startVelocity: randomInRange(50, 75),
            gravity: 1.5,
            shapes: ['circle', 'star']
        });

        // 3. Constant gold glitter rain
        confetti({
            particleCount: 5,
            origin: { x: Math.random(), y: -0.1 },
            colors: ['#FFD700'],
            shapes: ['star']
        });
    }, 250);
}

/**
 * Transforms the dashboard background into a spectacular purple nebula
 */
function triggerVictorySky() {
    const container = document.getElementById('stars-container');
    if (!container) return;

    // Transition to a more vibrant purple/nebula color
    container.style.transition = 'background 3s ease-in-out';
    container.style.background = 'radial-gradient(circle at center, #3a007d 0%, #1a0033 40%, #050510 100%)';

    // Maximize star and celestial effects
    initStarryBackground(12); // Re-init with 12 completed levels to max out density
    
    // Add a periodic intense burst of shooting stars for 10 seconds
    const burstInterval = setInterval(() => {
        for(let i=0; i<3; i++) {
            const shootingStar = document.createElement('div');
            shootingStar.className = 'shooting-star';
            shootingStar.style.left = (Math.random() * 80 + 20) + '%';
            shootingStar.style.top = (Math.random() * 40) + '%';
            shootingStar.style.setProperty('--duration', (Math.random() * 0.5 + 0.3) + 's');
            container.appendChild(shootingStar);
            setTimeout(() => shootingStar.remove(), 1000);
        }
    }, 400);

    setTimeout(() => clearInterval(burstInterval), 10000);
}

// Penguin Story Data
const PENGUIN_STORY = {
    1: { title: "The Spark", desc: "Our hero finds a poster for an annual screenplay competition. The dream of making a movie begins right here!" },
    2: { title: "Nights of Creation", desc: "Nights of hard work. Coffee, focus, and a growing pile of drafts. The screenplay is taking shape." },
    3: { title: "The Pitch", desc: "Presenting the 'Little Hearts, Big Stories' treatment. It's time to convince the board that this story matters." },
    4: { title: "The Reality Check", desc: "Rejected. Three times. It's tough, and the city feels cold, but our penguin director won't quit." },
    5: { title: "The Breakthrough", desc: "A notification ding that changes everything! 'Hey! We loved your script. YOU'RE IN!' Celebration time!" },
    6: { title: "Table Read", desc: "The team gathers. 'OK, let's dive into the story.' Characters, goals, and a shared vision come to life." },
    7: { title: "Action on Set", desc: "On the rooftop at night. 'Let's keep the emotion real.' The first big scene is being filmed." },
    8: { title: "Directing the Chaos", desc: "Today's shot list is long. Tracking shots, close-ups... the director is in total control now." },
    '8_1': { title: "Movie Magic", desc: "Checking the monitor. 'Action!' Every take brings the penguin closer to their masterpiece." },
    9: { title: "The Final Cut", desc: "Editing room sessions. Color, sound, and magic. From an idea to a screen that touches hearts." },
    10: { title: "The Closed Screening", desc: "A private viewing for the team. Tears of joy in the dark theater. Stories truly connect us." },
    11: { title: "Oscar Shortlist!", desc: "The notification of a lifetime: Our film is on the Oscar shortlist! Dreams are becoming reality." },
    12: { title: "In the Spotlight", desc: "Seeing the movie poster at the exact same spot where the journey started. Trust the spark." },
    'final': { title: "Absolute Cinema", desc: "Victory! The Little Penguin has won the Oscar for Best Animated Short Film. A true adventure complete." }
};

// Звуковой эффект затвора камеры
const cameraShutter = new Audio('shutter.mp3');

// Lightbox Functions
function openMovieLightbox(id) {
    const frame = document.getElementById(id === 'final' ? 'final-reward' : `frame-${id}`);
    // Only open if unlocked (or if it's the final reward which only shows when 12/12)
    if (id === 'final' || (frame && frame.classList.contains('unlocked'))) {
        const modal = document.getElementById('movie-modal');
        const modalImg = document.getElementById('modal-img');
        const modalTitle = document.getElementById('modal-title');
        const modalDesc = document.getElementById('modal-desc');
        
        const story = PENGUIN_STORY[id];
        if (story) {
            // Эффект вспышки
            const flash = document.getElementById('camera-flash');
            if (flash) {
                flash.style.opacity = '1';
                setTimeout(() => { flash.style.opacity = '0'; }, 100);
            }

            // Воспроизводим звук щелчка
            cameraShutter.currentTime = 0;
            cameraShutter.play().catch(e => console.log("Звук будет доступен после первого клика пользователя"));

            modalImg.src = `${id}.png`;
            modalTitle.textContent = story.title;
            modalDesc.textContent = story.desc;
            modal.classList.add('show');
            modal.style.display = 'flex'; // Обеспечиваем отображение перед анимацией opacity
            document.body.style.overflow = 'hidden'; // Prevent scroll
        }
    } else {
        alert("Pass this level with 70% accuracy or higher to unlock the next part of the story!");
    }
}

function closeMovieLightbox() {
    const modal = document.getElementById('movie-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        if (!modal.classList.contains('show')) modal.style.display = 'none';
    }, 300);
    document.body.style.overflow = 'auto';
}

function openOscarSpeech() {
    const modal = document.getElementById('oscar-modal');
    const textContainer = document.getElementById('oscar-speech-p');
    
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Typewriter effect logic
        if (textContainer) {
            textContainer.textContent = ''; // Ensure it's empty initially
            
            const speechText = "Oh my goodness! I can't believe it! We did it! This Oscar isn't just mine—it's ours. Thank you so much for being with me through every draft, every rejection, and every single tense. Your dedication to learning English is what gave my story a voice. I couldn't have mastered the \"Absolute Cinema\" without your hard work. This victory belongs to both of us, my friend! We are champions!";
            
            let i = 0;
            const speed = 40; // Typing speed in milliseconds
            
            function typeChar() {
                if (i < speechText.length) {
                    textContainer.textContent += speechText.charAt(i);
                    i++;
                    setTimeout(typeChar, speed);
                } else {
                    // Speech finished! Show credits after a short pause
                    setTimeout(showCinematicCredits, 2500);
                }
            }
            
            // Start typing after a short delay to allow modal to open
            setTimeout(typeChar, 600);
        }
    }
}

function showCinematicCredits() {
    const credits = document.getElementById('cinematic-credits');
    const scroll = credits?.querySelector('.credits-scroll');
    const cert = document.getElementById('certificate-display');
    
    if (credits) {
        // Reset states
        if (cert) cert.classList.remove('show');
        if (scroll) {
            scroll.style.display = 'block';
            scroll.style.animation = 'none';
            void scroll.offsetWidth; // trigger reflow
            scroll.style.animation = 'credits-animation 25s linear forwards';
        }
        
        credits.style.display = 'flex';

        // Wait for credits animation to finish (25s) then show certificate
        setTimeout(() => {
            showFinalCertificate();
        }, 25000);
    }
}

function showFinalCertificate() {
    const cert = document.getElementById('certificate-display');
    const scroll = document.querySelector('.credits-scroll');
    const currentUser = profileManager.getCurrentUser();
    
    if (scroll) scroll.style.display = 'none'; 
    
    if (cert) {
        const nameEl = document.getElementById('cert-user-name');
        if (nameEl && currentUser) {
            nameEl.textContent = currentUser.fullName;
        }
        cert.classList.add('show');
    }
}

function downloadCertificate() {
    const currentUser = profileManager.getCurrentUser();
    const userName = currentUser?.fullName || 'Valued Learner';
    
    const tutorNames = [
        { short: 'M. Nuray', full: 'Matay Nuray' },
        { short: 'M. Anelya', full: 'Mailybay Anelya' },
        { short: 'D. Elnura', full: 'Dusenova Elnura' },
        { short: 'B. Aida', full: 'Berkinbaeva Aida' },
        { short: 'T. Aruzhan', full: 'Tuleshova Aruzhan' }
    ];
    const userStats = profileManager.getUserStats(currentUser.username);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Устанавливаем размер (альбомный формат)
    canvas.width = 1200;
    canvas.height = 840;

    // 1. Фон
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. Рамка (темно-синяя и золотая) - Улучшенный стиль
    ctx.strokeStyle = '#0d1b3e'; // Темно-синий
    ctx.lineWidth = 30;
    ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
    
    ctx.strokeStyle = '#e2b714'; // Золотой
    ctx.lineWidth = 5;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    // 3. Текст: Заголовок и подзаголовок
    ctx.fillStyle = '#e2b714';
    ctx.font = 'bold 65px "Georgia", serif'; // Slightly smaller
    ctx.textAlign = 'center';
    ctx.fillText('TENSEFLIX', canvas.width / 2, 120); // Moved up

    ctx.fillStyle = '#333';
    ctx.font = '28px "Georgia", serif'; // Slightly smaller
    ctx.fillText('CERTIFICATE OF ACHIEVEMENT', canvas.width / 2, 170); // Moved up

    // 4. Текст: Имя пользователя и описание достижения
    ctx.fillStyle = '#555';
    ctx.font = 'italic 24px "Georgia", serif'; // Slightly smaller
    ctx.fillText('This is to certify that', canvas.width / 2, 240); // Moved up
    
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 75px "Brush Script MT", cursive, serif'; // Slightly smaller
    ctx.fillText(userName, canvas.width / 2, 320); // Moved up

    ctx.fillStyle = '#333';
    ctx.font = '22px "Georgia", serif'; // Slightly smaller
    ctx.fillText('has successfully mastered all 12 English Tenses and reached the level of', canvas.width / 2, 390); // Moved up
    
    ctx.fillStyle = '#e2b714';
    ctx.font = 'bold 32px "Georgia", serif'; // Slightly smaller
    ctx.fillText('ABSOLUTE CINEMA', canvas.width / 2, 430); // Moved up

    ctx.fillStyle = '#555';
    ctx.font = '22px "Georgia", serif'; // Slightly smaller
    ctx.fillText('through dedication, practice, and a passion for learning.', canvas.width / 2, 470); // Moved up

    // 5. Статистика пользователя
    if (userStats) {
        ctx.fillStyle = '#1a1a2e';
        ctx.font = 'bold 20px "Georgia", serif';
        ctx.fillText('Your TENSEFLIX Journey:', canvas.width / 2, 530); // Moved up

        ctx.font = '18px "Georgia", serif';
        ctx.textAlign = 'left';
        const statsX = canvas.width / 2 - 200; // Adjust X position for left alignment
        let statsY = 560; // Moved up

        ctx.fillText(`Tenses Mastered: ${userStats.tensesCompleted}/12`, statsX, statsY);
        statsY += 25;
        ctx.fillText(`Exercises Completed: ${userStats.exercisesCompleted}`, statsX, statsY);
        statsY += 25;
        ctx.fillText(`Average Accuracy: ${userStats.averageAccuracy}%`, statsX, statsY);
        // Removed Time Spent as per request to simplify and make space
        
        ctx.textAlign = 'center'; // Reset text alignment
    }

    // 6. Подписи
    ctx.font = 'italic 18px "Brush Script MT", cursive';
    ctx.fillStyle = '#555';
    const sigY = 720; // Base Y for signatures
    const lineY = sigY + 10; // Line below short name
    const fullNameY = lineY + 15; // Full name below the line

    tutorNames.forEach((tutor, i) => {
        const x = 180 + (i * 210); // Spacing for 5 signatures
        ctx.fillText(tutor.short, x, sigY);
        ctx.beginPath();
        ctx.moveTo(x - 50, lineY);
        ctx.lineTo(x + 50, lineY);
        ctx.stroke();
        ctx.font = 'bold 12px "Georgia", serif'; // Smaller font for full name
        ctx.fillStyle = '#333';
        ctx.fillText(tutor.full, x, fullNameY);
    });

    // 7. Дата
    ctx.fillStyle = '#888';
    ctx.font = 'italic 18px "Georgia", serif';
    ctx.fillText(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, canvas.width / 2, canvas.height - 40); // Moved up

    // 8. Отрисовка Pinguo (берем из DOM) - Центрируем внизу
    const pinguoImg = document.querySelector('.cert-pinguo');
    if (pinguoImg) {
        ctx.save();
        const pinguoSize = 80; // Even smaller for better fit
        const pinguoY = canvas.height - 150; // Position above the date
        ctx.drawImage(pinguoImg, canvas.width / 2 - pinguoSize / 2, pinguoY, pinguoSize, pinguoSize);
        ctx.restore();
    }

    // Скачивание PNG
    const link = document.createElement('a');
    const safeName = userName.replace(/[^a-z0-9а-я]/gi, '_');
    link.download = `TENSEFLIX_Certificate_${safeName}.png`;
    
    try {
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Показываем кнопки "Поделиться"
        const shareSection = document.getElementById('cert-share-section');
        if (shareSection) shareSection.style.display = 'flex';
    } catch (e) {
        console.error('Ошибка при генерации PNG:', e);
        alert('Не удалось скачать сертификат. Если вы открыли файл напрямую через браузер, попробуйте использовать локальный сервер (например, Live Server в VS Code) или просто сделайте скриншот экрана.');
    }
}

function shareCertificate(platform) {
    const text = encodeURIComponent("I just mastered all 12 English tenses on TENSEFLIX! Check out my Absolute Cinema certificate! 🎬🏆");
    const url = platform === 'telegram' 
        ? `https://t.me/share/url?url=https://tenseflix.com&text=${text}`
        : `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, '_blank');
}

function closeOscarSpeech() {
    const modal = document.getElementById('oscar-modal');
    const textContainer = document.getElementById('oscar-speech-p');
    const credits = document.getElementById('cinematic-credits');
    
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => { 
            modal.style.display = 'none'; 
            if (textContainer) textContainer.textContent = ''; // Reset for next open
            if (credits) credits.style.display = 'none'; // Stop credits if user closes modal
        }, 300);
        document.body.style.overflow = 'auto';
    }
}

// Autocomplete logic for quick testing
function autocompleteTense(tenseId, refresh = true) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const username = currentUser.username;
    
    // CRITICAL: Only create backup if the tense is NOT already in a "Magic" state.
    // We check if progress light is 100 to determine if Magic was already used.
    const currentProgress = profileManager.getTenseProgress(username, tenseId);
    if (currentProgress.light < 100 && !localStorage.getItem(`tenseflix_backup_${username}_${tenseId}`)) {
        const currentState = localStorage.getItem(`tenseflix_state_${username}_${tenseId}`);
        
        localStorage.setItem(`tenseflix_backup_${username}_${tenseId}`, JSON.stringify(currentProgress));
        if (currentState) localStorage.setItem(`tenseflix_state_backup_${username}_${tenseId}`, currentState);
    }

    // Set progress to 80% (12/15 correct)
    const progressUpdate = {
        completedAt: new Date().toISOString(),
        completed: 15,
        correctCount: 15,
        light: 100,
        lastAccessed: new Date().toISOString()
    };

    profileManager.updateProgress(currentUser.username, tenseId, progressUpdate);

    // Save lesson state to fill progress bars
    const state = {
        video1Answered: ['q1', 'q2', 'q3', 'q4', 'q5'],
        video2Answered: ['q1', 'q2', 'q3', 'q4', 'q5'],
        video3Answered: ['q1', 'q2', 'q3'],
        video4Answered: ['q1', 'q2', 'q3', 'q4', 'q5'],
        activeTab: 'practice'
    };
    profileManager.saveLessonState(currentUser.username, tenseId, state);

    if (refresh) initializeLevels();
}

function autocompleteAll() {
    const TENSE_PROGRESSION = [
        'present-simple', 'present-continuous', 'past-simple', 'present-perfect',
        'future-simple', 'past-continuous', 'present-perfect-continuous', 'past-perfect',
        'future-continuous', 'future-perfect', 'past-perfect-continuous', 'future-perfect-continuous'
    ];
    
    if (confirm('Magic will complete all 12 tenses with 80% accuracy. Continue?')) {
        TENSE_PROGRESSION.forEach(id => autocompleteTense(id, false));
        initializeLevels();
    }
}

/**
 * Unmagic logic: Restores actual version from backup or resets to 0
 */
function unmagicTense(tenseId, refresh = true) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;

    const username = currentUser.username;
    const backupProgress = localStorage.getItem(`tenseflix_backup_${username}_${tenseId}`);
    const backupState = localStorage.getItem(`tenseflix_state_backup_${username}_${tenseId}`);

    if (backupProgress) {
        // Restore the full progress object
        profileManager.updateProgress(username, tenseId, JSON.parse(backupProgress));
        
        // Restore the lesson state
        if (backupState) {
            const stateObj = JSON.parse(backupState);
            profileManager.saveLessonState(username, tenseId, stateObj);
            localStorage.setItem(`tenseflix_state_${username}_${tenseId}`, backupState);
        } else {
            localStorage.removeItem(`tenseflix_state_${username}_${tenseId}`);
        }

        // Clean up backups after successful restoration
        localStorage.removeItem(`tenseflix_backup_${username}_${tenseId}`);
        localStorage.removeItem(`tenseflix_state_backup_${username}_${tenseId}`);
    } else {
        // If no backup exists, reset progress to zero for this tense
        const freshProgress = profileManager.initializeProgress()[tenseId];
        profileManager.updateProgress(username, tenseId, freshProgress);
        localStorage.removeItem(`tenseflix_state_${username}_${tenseId}`);
    }

    if (refresh) initializeLevels();
}

/**
 * Unmagic all tenses
 */
function unmagicAll() {
    const TENSE_PROGRESSION = [
        'present-simple', 'present-continuous', 'past-simple', 'present-perfect',
        'future-simple', 'past-continuous', 'present-perfect-continuous', 'past-perfect',
        'future-continuous', 'future-perfect', 'past-perfect-continuous', 'future-perfect-continuous'
    ];
    
    if (confirm('Unmagic will restore your actual progress or reset all tenses to 0%. Continue?')) {
        TENSE_PROGRESSION.forEach(id => unmagicTense(id, false));
        initializeLevels();
    }
}

// Update Nametag Rank based on milestones
function updateUserRank(count) {
    const RANKS = [
        "English Learner", // 0
        "Basic",          // 1
        "Builder",        // 2
        "Communicator",   // 3
        "Advanced",       // 4
        "Proficient",     // 5
        "Native"          // 6+
    ];
    const title = RANKS[Math.min(count, RANKS.length - 1)];
    const currentUser = profileManager.getCurrentUser();
    if (currentUser) {
        profileManager.updateProfile(currentUser.username, { title: title });
    }
}

// Start lesson
function startLesson(tense, level) {
    const currentUser = profileManager.getCurrentUser();
    if (!currentUser) return;
    
    const isAdmin = profileManager.isCurrentUserAdmin();
    const userProgress = profileManager.getUserProgress(currentUser.username);
    const tenses = Object.keys(userProgress);
    
    // Redirect to lesson
    window.location.href = `lesson.html?tense=${tense}&level=${level}`;
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to log out?')) {
        profileManager.logout();
        window.location.href = 'login.html';
    }
}

// Add click handlers for lesson start buttons
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('start-btn')) {
        if (e.target.disabled) return;
        const levelElement = e.target.closest('.tense-level');
        const level = parseInt(levelElement.getAttribute('data-level'));
        const tense = levelElement.getAttribute('data-tense');
        startLesson(tense, level);
    }
});

// Create progress bar for lesson in progress
function createProgressBar(progressPercent, correctCount, totalCompleted) {
    const container = document.createElement('div');
    container.style.cssText = `
        margin-top: 12px;
        padding: 8px 0;
        border-top: 1px solid rgba(255,255,255,0.1);
    `;
    
    const labelDiv = document.createElement('div');
    labelDiv.style.cssText = `
        font-size: 0.85rem;
        color: #ccc;
        margin-bottom: 4px;
        display: flex;
        justify-content: space-between;
    `;
    labelDiv.innerHTML = `
        <span>Progress: ${progressPercent}%</span>
        <span>${correctCount}/${totalCompleted} ✓</span>
    `;
    container.appendChild(labelDiv);
    
    const barDiv = document.createElement('div');
    barDiv.style.cssText = `
        width: 100%;
        height: 4px;
        background: rgba(255,255,255,0.1);
        border-radius: 2px;
        overflow: hidden;
    `;
    
    const fillDiv = document.createElement('div');
    fillDiv.style.cssText = `
        width: ${progressPercent}%;
        height: 100%;
        background: linear-gradient(90deg, #4CAF50, #45a049);
        transition: width 0.3s ease;
    `;
    barDiv.appendChild(fillDiv);
    container.appendChild(barDiv);
    
    return container;
}

// Create completion statistics display
function createCompletionStats(tenseData) {
    const container = document.createElement('div');
    container.style.cssText = `
        margin-top: 12px;
        padding: 8px 0;
        border-top: 1px solid rgba(255,255,255,0.1);
        font-size: 0.85rem;
        color: #4CAF50;
    `;
    
    const accuracy = tenseData.completed > 0 ? 
        Math.round((tenseData.correctCount / tenseData.completed) * 100) : 0;
    
    const completedDate = tenseData.completedAt ? 
        new Date(tenseData.completedAt).toLocaleDateString('ru-RU') : 'N/A';
    
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Accuracy:</span>
            <span>${accuracy}%</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>Completed:</span>
            <span>${completedDate}</span>
        </div>
    `;
    
    return container;
}

let backgroundIntervals = []; // Для очистки таймеров при обновлении

function initStarryBackground(completedLevels = 0) {
    const container = document.getElementById('stars-container');
    if (!container) return;

    // Очищаем старые элементы и интервалы
    container.innerHTML = '';
    backgroundIntervals.forEach(id => clearInterval(id));
    backgroundIntervals = [];

    // 1. Меняем цвет фона в зависимости от уровня (от черного к фиолетовому)
    const intensity = Math.min(completedLevels * 5, 60);
    container.style.background = `radial-gradient(circle at center, rgb(${10 + intensity/2}, 10, ${30 + intensity}) 0%, rgb(5, 5, 15) 100%)`;

    // 2. Генерация звезд разных типов
    const starCount = 200 + (completedLevels * 40); // Больше звезд с каждым уровнем
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        
        const typeRand = Math.random();
        if (typeRand > 0.85) star.className = 'star star-pulse';
        else if (typeRand > 0.7) star.className = 'star star-flicker';
        else star.className = 'star';

        const size = Math.random() * 2 + 1;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        
        // Уменьшаем длительность (ускоряем мерцание) с уровнем
        const duration = Math.max(1, (Math.random() * 3 + 2) - (completedLevels * 0.1));
        star.style.setProperty('--duration', duration + 's');
        container.appendChild(star);
    }

    // 3. Планеты (их количество и скорость тоже растут)
    const planetCount = 3 + Math.floor(completedLevels / 3);
    const planetColors = ['#a8dadc', '#f4a261', '#e76f51', '#2a9d8f', '#bbd0ff']; // Различные цвета
    const planetSizes = [15, 25, 35, 40, 50]; // Различные размеры

    for (let i = 0; i < planetCount; i++) {
        const planet = document.createElement('div');
        planet.className = 'planet';
        const size = planetSizes[Math.floor(Math.random() * planetSizes.length)];
        const color = planetColors[Math.floor(Math.random() * planetColors.length)];

        planet.style.width = size + 'px';
        planet.style.height = size + 'px';
        planet.style.borderRadius = '50%';
        planet.style.backgroundColor = color;
        planet.style.boxShadow = `0 0 ${size / 4}px ${size / 8}px ${color}, inset 0 0 ${size / 8}px rgba(0,0,0,0.3)`; // Нежное свечение
        planet.style.position = 'absolute';
        planet.style.left = Math.random() * 100 + '%';
        planet.style.top = Math.random() * 100 + '%';
        planet.style.zIndex = '1'; // Ниже звезд и падающих звезд
        
        // Ускоряем движение планет с уровнем
        const speed = Math.max(15, (Math.random() * 30 + 60) - (completedLevels * 3));
        planet.style.animation = `planet-drift ${speed}s linear infinite alternate`;
        planet.style.animationDelay = `-${Math.random() * 60}s`; // Начинать в случайной точке цикла анимации
        container.appendChild(planet);
    }

    // 4. Падающие звезды (частота увеличивается)
    const ssFreq = Math.max(250, 1200 - (completedLevels * 100));
    const ssId = setInterval(() => {
        const shootingStar = document.createElement('div');
        shootingStar.className = 'shooting-star';
        shootingStar.style.left = (Math.random() * 80 + 20) + '%';
        shootingStar.style.top = (Math.random() * 40) + '%';
        shootingStar.style.setProperty('--duration', (Math.random() * 1 + 0.8) + 's');
        container.appendChild(shootingStar);
        setTimeout(() => shootingStar.remove(), 2000); // Remove after animation
    }, ssFreq);
    backgroundIntervals.push(ssId);

    // 5. Кометы (Редкие, появляются раз в 15-30 секунд)
    const cometId = setInterval(() => {
        const comet = document.createElement('div');
        comet.className = 'comet';
        comet.style.top = (Math.random() * 70) + '%';
        comet.style.animation = `comet-move ${Math.random() * 2 + 3}s linear forwards`;
        container.appendChild(comet);
        setTimeout(() => comet.remove(), 5000);
    }, 15000 + Math.random() * 15000);
    backgroundIntervals.push(cometId);
}

function isBirthdayToday(dobString) {
    if (!dobString) return false;
    const today = new Date();
    const birthDate = new Date(dobString);
    return today.getMonth() === birthDate.getMonth() && today.getDate() === birthDate.getDate();
}
