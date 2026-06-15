const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.content-card, .profile-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    observer.observe(card);
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

const nav = document.querySelector('.glass-nav');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    const isMd3 = document.body.getAttribute('data-theme') === 'md3';

    if (currentScroll > 50) {
        nav.style.background = isMd3 ? 'rgba(28, 27, 31, 1)' : 'rgba(0, 0, 0, 0.5)';
    } else {
        nav.style.background = isMd3 ? 'rgba(28, 27, 31, 0.98)' : 'rgba(0, 0, 0, 0.3)';
    }
});

const video = document.getElementById('bgVideo');
if (video) {
    video.playbackRate = 0.75;
    
    video.addEventListener('canplay', function() {
        video.classList.add('loaded');
    });
    
    video.addEventListener('error', function() {
        console.warn('Video failed to load');
    });
}

const themeToggle = document.getElementById('themeToggle');
const themeLabel = themeToggle?.querySelector('.theme-label');
const badgeText = document.getElementById('badgeText');
let currentTheme = localStorage.getItem('theme') || 'glass';
let isTransitioning = false;

function applyTheme(theme) {
    if (isTransitioning) return;
    isTransitioning = true;

    document.body.setAttribute('data-theme', theme);
    currentTheme = theme;
    localStorage.setItem('theme', theme);

    if (themeLabel) {
        themeLabel.textContent = theme === 'md3' ? 'Glass' : 'MD3';
    }

    if (badgeText) {
        badgeText.style.opacity = '0';
        badgeText.style.transform = 'translateY(-5px)';

        setTimeout(() => {
            badgeText.textContent = theme === 'md3' ? 'MD3' : 'Glass';
            badgeText.style.opacity = '1';
            badgeText.style.transform = 'translateY(0)';
        }, 200);
    }

    const isMd3 = theme === 'md3';
    if (nav) {
        nav.style.background = isMd3 ? 'rgba(28, 27, 31, 0.98)' : 'rgba(0, 0, 0, 0.3)';
    }

    const themeToggleIcon = themeToggle?.querySelector('.material-symbols-outlined');
    if (themeToggleIcon) {
        themeToggleIcon.style.transform = 'rotate(180deg) scale(0.5)';
        setTimeout(() => {
            themeToggleIcon.style.transform = 'rotate(360deg) scale(1)';
        }, 300);
    }

    setTimeout(() => {
        isTransitioning = false;
    }, 600);
}

applyTheme(currentTheme);

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const newTheme = currentTheme === 'glass' ? 'md3' : 'glass';
        applyTheme(newTheme);
    });
}

if (badgeText) {
    badgeText.textContent = currentTheme === 'md3' ? 'MD3' : 'Glass';
}
