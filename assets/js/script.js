// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('English Tenses Learning Website loaded successfully!');
    
    // Add click interactions to tense cards
    const cards = document.querySelectorAll('.tense-card');
    
    cards.forEach(card => {
        card.addEventListener('click', function() {
            this.classList.toggle('expanded');
        });
        
        // Add mouse enter animation
        card.addEventListener('mouseenter', function() {
            this.style.cursor = 'pointer';
        });
    });
    
    // Smooth scroll for internal links
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
    
    // Add keyboard navigation
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            cards.forEach(card => card.classList.remove('expanded'));
        }
    });
});

// Function to filter tenses
function filterTenses(type) {
    const cards = document.querySelectorAll('.tense-card');
    cards.forEach(card => {
        if (type === 'all') {
            card.style.display = 'grid';
        } else if (card.classList.contains(type)) {
            card.style.display = 'grid';
        } else {
            card.style.display = 'none';
        }
    });
}

// Print friendly version
function printPage() {
    window.print();
}

// Toggle dark mode
let darkMode = false;

function toggleDarkMode() {
    darkMode = !darkMode;
    if (darkMode) {
        document.body.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
        document.querySelectorAll('.tense-card').forEach(card => {
            card.style.background = '#0f3460';
            card.style.color = 'white';
        });
        document.querySelectorAll('.tense-info').forEach(info => {
            info.style.background = '#1a3a4a';
            info.style.color = 'white';
        });
        document.querySelectorAll('.tense-header h2').forEach(h2 => {
            h2.style.color = 'white';
        });
    } else {
        location.reload();
    }
}

// Keyboard shortcuts info
function showShortcuts() {
    alert('Клавиатурные сокращения:\n\n' +
          '🔹 Нажмите на карточку для деталей\n' +
          '🔹 ESC - закрыть все карточки\n' +
          '🔹 Прокрутите вниз для всех 12 времен');
}
