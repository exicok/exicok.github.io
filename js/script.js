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

const GITHUB_USER = 'exicok';

async function fetchGitHubRepos() {
    const projectsList = document.getElementById('projectsList');
    if (!projectsList) return;

    try {
        const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`);
        if (!res.ok) throw new Error('API limit');
        const repos = await res.json();

        const filtered = repos
            .filter(r => !r.fork && r.name !== `${GITHUB_USER}.github.io`)
            .sort((a, b) => b.stargazers_count - a.stargazers_count);

        const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
        const repoCount = document.getElementById('repoCount');
        const starCount = document.getElementById('starCount');
        if (repoCount) repoCount.textContent = filtered.length;
        if (starCount) starCount.textContent = totalStars;

        projectsList.innerHTML = '';
        filtered.forEach(repo => {
            const item = document.createElement('a');
            item.className = 'project-item';
            item.href = repo.html_url;
            item.target = '_blank';
            item.rel = 'noopener noreferrer';

            const lang = repo.language ? `<span>${repo.language}</span>` : '';
            const stars = repo.stargazers_count > 0
                ? `<div class="project-stars">
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                       ${repo.stargazers_count}
                   </div>`
                : '';

            item.innerHTML = `
                <div class="project-header">
                    <h3>${repo.name}</h3>
                    <div class="project-tags">${lang}</div>
                </div>
                <p>${repo.description || '暂无描述'}</p>
                ${stars}
            `;
            projectsList.appendChild(item);
        });

        if (filtered.length === 0) {
            projectsList.innerHTML = '<div class="project-loading">暂无项目</div>';
        }
    } catch {
        const fallback = [
            { name: 'parcelx', lang: 'Kotlin', desc: 'ParcelX library' },
            { name: 'AmuseAI', lang: 'C#', desc: 'UI Demo of the TensorStack SDK add chinese' },
            { name: 'ANDROIDINFO', lang: 'Kotlin', desc: 'Android Info' },
            { name: 'esp32-info', lang: 'C', desc: 'ESP32 information' },
            { name: 'COPG-EXICOK', lang: 'JavaScript', desc: 'Zygisk module for device and CPU spoofing' },
        ];
        projectsList.innerHTML = '';
        const repoCount = document.getElementById('repoCount');
        const starCount = document.getElementById('starCount');
        if (repoCount) repoCount.textContent = fallback.length;
        if (starCount) starCount.textContent = '0';

        fallback.forEach(repo => {
            const item = document.createElement('a');
            item.className = 'project-item';
            item.href = `https://github.com/${GITHUB_USER}/${repo.name}`;
            item.target = '_blank';
            item.rel = 'noopener noreferrer';
            item.innerHTML = `
                <div class="project-header">
                    <h3>${repo.name}</h3>
                    <div class="project-tags"><span>${repo.lang}</span></div>
                </div>
                <p>${repo.desc}</p>
            `;
            projectsList.appendChild(item);
        });
    }
}

fetchGitHubRepos();
