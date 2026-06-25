/* VibeTabu Arayüz Güncelleme (DOM) Modülü */

// Görünüm elementlerinin referansları
export const views = {
    splash: document.getElementById('view-splash'),
    setup: document.getElementById('view-setup'),
    setupStep2: document.getElementById('view-setup-step2'),
    roundReady: document.getElementById('view-round-ready'),
    playing: document.getElementById('view-playing'),
    roundOver: document.getElementById('view-round-over'),
    scoreboard: document.getElementById('view-scoreboard'),
    gameOver: document.getElementById('view-game-over')
};

/**
 * Belirtilen oyun ekranını gösterir, diğerlerini gizler.
 */
export function showView(activeView) {
    Object.values(views).forEach(view => {
        if (view) view.classList.remove('active-view');
    });
    if (activeView) activeView.classList.add('active-view');
}

/**
 * Dinamik takım ismi giriş alanlarını render eder.
 */
export function renderTeamInputs(container, teamsCount) {
    container.innerHTML = '';
    
    // Her takım için bir giriş alanı grubu oluştur
    for (let i = 0; i < teamsCount; i++) {
        const teamDiv = document.createElement('div');
        teamDiv.className = 'flex flex-col gap-2 relative z-10';
        
        // Takım rengi sınıfları (Mavi ve Mor temalı vurgular için)
        const textAccent = i % 2 === 0 ? 'text-primary/80' : 'text-secondary/80';
        const borderFocus = i % 2 === 0 ? 'focus-within:border-primary/40' : 'focus-within:border-secondary/40';
        
        teamDiv.innerHTML = `
            <div class="flex justify-between items-center pl-2">
                <label class="font-label-caps text-label-caps ${textAccent}" for="team-input-${i}">${i + 1}. Takım</label>
                ${teamsCount > 2 ? `
                    <button type="button" class="text-error/60 hover:text-error text-xs flex items-center gap-1 active:scale-90 transition-transform" data-remove-team="${i}">
                        <span class="material-symbols-outlined text-sm">delete</span> Kaldır
                    </button>
                ` : ''}
            </div>
            <div class="relative bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-lg flex items-center px-4 py-3 ${borderFocus} transition-colors">
                <input class="bg-transparent border-none w-full font-title-md text-white focus:ring-0 p-0 placeholder:text-white/20 team-name-input" 
                       id="team-input-${i}" 
                       placeholder="${i % 2 === 0 ? 'Alfa Takımı' : 'Beta Takımı'}" 
                       type="text" 
                       value="" />
                <span class="material-symbols-outlined text-white/30 ml-2">group</span>
            </div>
        `;
        container.appendChild(teamDiv);
    }
}

/**
 * Kelime kategorilerini buton listesi olarak render eder.
 */
export function renderCategories(container, categoriesList, selectedCategories) {
    container.innerHTML = '';
    categoriesList.forEach(cat => {
        const isSelected = selectedCategories.includes(cat);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `option-pill py-3 px-4 rounded-lg font-body-md text-body-md text-center cursor-pointer select-none transition-all active:scale-95 ${isSelected ? 'active' : ''}`;
        button.textContent = cat;
        button.dataset.category = cat;
        container.appendChild(button);
    });
}

/**
 * Aktif kelime kartını ve yasaklı kelimeleri render eder.
 */
export function renderActiveCard(card, passesUsed, passLimit) {
    const cardContainer = document.getElementById('active-card-container');
    if (!cardContainer || !card) return;
    
    // Kart içeriğini güncelle
    cardContainer.innerHTML = `
        <h1 class="font-display text-[42px] md:text-[56px] text-white tracking-widest uppercase mb-6 text-center select-none">
            ${card.w}
        </h1>
        <div class="w-2/3 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6"></div>
        <div class="flex flex-col items-center space-y-[12px] w-full select-none">
            <span class="font-label-caps text-label-caps text-outline uppercase tracking-widest mb-1">TABU KELİMELER</span>
            <div class="w-full flex flex-col items-center space-y-[10px]">
                ${card.f.map((word, i) => `
                    <span class="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface-variant font-light tracking-wide w-full text-center ${i < 4 ? 'pb-2 border-b border-white/5' : ''}">
                        ${word}
                    </span>
                `).join('')}
            </div>
        </div>
    `;
    
    // Pas butonu durumunu güncelle
    const passBtn = document.getElementById('btn-pass');
    if (passBtn) {
        if (passLimit !== 'unlimited' && passesUsed >= passLimit) {
            passBtn.disabled = true;
            passBtn.classList.add('opacity-40', 'cursor-not-allowed');
            const passLabel = passBtn.querySelector('.pass-count-label');
            if (passLabel) passLabel.textContent = 'HAK BİTTİ';
        } else {
            passBtn.disabled = false;
            passBtn.classList.remove('opacity-40', 'cursor-not-allowed');
            const passLabel = passBtn.querySelector('.pass-count-label');
            if (passLabel) {
                passLabel.textContent = passLimit === 'unlimited' ? 'PAS' : `PAS (${passLimit - passesUsed})`;
            }
        }
    }
}

/**
 * Kart kaydırma (slide out) animasyonlarını tetikler ve callback çalıştırır.
 */
export function animateCardTransition(decision, onComplete) {
    const cardContainer = document.getElementById('active-card-container');
    if (!cardContainer) {
        onComplete();
        return;
    }
    
    // Eski animasyon sınıflarını temizle
    cardContainer.classList.remove('slide-in', 'slide-correct', 'slide-tabu', 'slide-pass');
    
    // Tarayıcı reflow tetikle (animasyonun baslamasini garantilemek icin)
    void cardContainer.offsetWidth;
    
    // Karara göre animasyon sınıfı ekle
    let animClass = '';
    if (decision === 'correct') animClass = 'slide-correct';
    else if (decision === 'tabu') animClass = 'slide-tabu';
    else if (decision === 'pass') animClass = 'slide-pass';
    
    cardContainer.classList.add(animClass);
    
    // Kilitlenmeleri onlemek icin kesin çalisan setTimeout kullan
    setTimeout(() => {
        onComplete();
        
        // Yeni kartı yukarıdan içeri süzerek getir
        cardContainer.classList.remove(animClass);
        cardContainer.classList.add('slide-in');
    }, 250);
}

/**
 * Sayaç ve ilerleme çubuğu görselleştirmelerini günceller.
 */
export function updateTimerUI(secondsLeft, totalDuration) {
    const timerText = document.getElementById('timer-text');
    const progressBar = document.getElementById('timer-progress-bar');
    const svgCircle = document.getElementById('timer-svg-circle');
    
    if (timerText) {
        timerText.textContent = secondsLeft;
        
        // Son 10 saniyede panik nabız efekti uygula ve rengi kırmızı yap
        if (secondsLeft <= 10) {
            timerText.classList.add('panic-timer', 'text-error');
            timerText.classList.remove('text-on-surface');
        } else {
            timerText.classList.remove('panic-timer', 'text-error');
            timerText.classList.add('text-on-surface');
        }
    }
    
    // Yatay ilerleme çubuğu güncellemesi
    if (progressBar) {
        const percentage = (secondsLeft / totalDuration) * 100;
        progressBar.style.width = `${percentage}%`;
        
        // Renk geçişi (Emerald -> Coral Red)
        if (secondsLeft <= 10) {
            progressBar.className = 'h-full bg-error timer-glow text-error transition-all duration-300 ease-linear';
        } else if (secondsLeft <= totalDuration * 0.3) {
            progressBar.className = 'h-full bg-amber-500 timer-glow text-amber-500 transition-all duration-1000 ease-linear';
        } else {
            progressBar.className = 'h-full bg-primary timer-glow text-primary transition-all duration-1000 ease-linear';
        }
    }
    
    // Dairesel sayaç güncellemesi
    if (svgCircle) {
        const radius = 28;
        const circumference = 2 * Math.PI * radius; // ~175.93
        const offset = circumference - (secondsLeft / totalDuration) * circumference;
        
        svgCircle.style.strokeDasharray = circumference;
        svgCircle.style.strokeDashoffset = offset;
        
        if (secondsLeft <= 10) {
            svgCircle.setAttribute('class', 'text-error transition-all duration-300 ease-linear');
        } else {
            svgCircle.setAttribute('class', 'text-primary transition-all duration-1000 ease-linear');
        }
    }
}

/**
 * Doğru/Tabu basıldığında arka planda anlık siber parlama (tint) efekti tetikler.
 */
export function triggerFlashOverlay(type) {
    const overlay = document.getElementById('flash-overlay');
    if (!overlay) return;
    
    overlay.className = `view-overlay ${type} active`;
    setTimeout(() => {
        overlay.classList.remove('active');
    }, 200);
}

/**
 * Tur bittiğinde oynanan kelimelerin gözden geçirilip itiraz edilebildiği listeyi oluşturur.
 */
export function renderRoundReviewList(container, history, onDecisionChange) {
    container.innerHTML = '';
    
    if (history.length === 0) {
        container.innerHTML = `
            <div class="text-center text-white/40 py-8 font-body-md">
                Bu turda hiçbir kelime oynanmadı.
            </div>
        `;
        return;
    }
    
    history.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'relative bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:bg-white/[0.04]';
        
        // Aktif durum renkleri
        let statusTextClass = 'text-white/40';
        let statusLabel = 'Pas';
        
        if (item.result === 'correct') {
            statusTextClass = 'text-primary font-medium';
            statusLabel = 'Doğru';
        } else if (item.result === 'tabu') {
            statusTextClass = 'text-error font-medium';
            statusLabel = 'Tabu';
        }
        
        itemDiv.innerHTML = `
            <div class="flex flex-col items-center sm:items-start text-center sm:text-left">
                <span class="font-body-lg font-light text-white">${item.word}</span>
                <span class="text-[10px] uppercase tracking-wider text-white/30 mt-1">Yasaklı: ${item.forbidden.slice(0, 3).join(', ')}...</span>
            </div>
            
            <div class="flex items-center gap-2">
                <!-- Karar Butonları -->
                <button type="button" class="btn-review-opt px-3 py-1.5 rounded-full text-xs border ${item.result === 'tabu' ? 'border-error bg-error/10 text-error' : 'border-white/10 text-white/50 hover:text-white'} transition-all active:scale-95" data-idx="${index}" data-type="tabu">
                    Tabu
                </button>
                <button type="button" class="btn-review-opt px-3 py-1.5 rounded-full text-xs border ${item.result === 'pass' ? 'border-white bg-white/10 text-white' : 'border-white/10 text-white/50 hover:text-white'} transition-all active:scale-95" data-idx="${index}" data-type="pass">
                    Pas
                </button>
                <button type="button" class="btn-review-opt px-3 py-1.5 rounded-full text-xs border ${item.result === 'correct' ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 text-white/50 hover:text-white'} transition-all active:scale-95" data-idx="${index}" data-type="correct">
                    Doğru
                </button>
            </div>
        `;
        container.appendChild(itemDiv);
    });
    
    // Olay dinleyicilerini bağla
    container.querySelectorAll('.btn-review-opt').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.dataset.idx, 10);
            const type = btn.dataset.type;
            onDecisionChange(idx, type);
        });
    });
}

/**
 * Skor tablosunu render eder.
 */
export function renderScoreboardUI(container, teams, currentRound) {
    container.innerHTML = '';
    
    // Takımları puana göre sırala (geçici, orijinal sıralama bozulmadan gösterim amaçlı)
    const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
    
    sortedTeams.forEach((team, index) => {
        const isLeader = index === 0 && team.score > 0;
        const cardClass = isLeader ? 'glass-card border-primary/30' : 'glass-card border-white/5';
        
        const row = document.createElement('div');
        row.className = `rounded-xl p-5 flex items-center justify-between relative overflow-hidden transition-all ${cardClass}`;
        
        row.innerHTML = `
            ${isLeader ? `<div class="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>` : ''}
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 bg-white/5 font-label-caps text-xs">
                    #${index + 1}
                </div>
                <div class="flex flex-col">
                    <span class="font-body-lg font-light text-white">${team.name}</span>
                    <span class="text-[10px] tracking-wider text-white/30 uppercase mt-0.5">D: ${team.corrects} | T: ${team.tabus} | P: ${team.passes}</span>
                </div>
            </div>
            <div class="flex items-center gap-2">
                ${isLeader ? `<span class="material-symbols-outlined text-primary text-lg animate-pulse">emoji_events</span>` : ''}
                <span class="font-display text-3xl font-light text-white">${team.score}</span>
            </div>
        `;
        container.appendChild(row);
    });
}

/**
 * Şampiyon ve son istatistikler ekranını oluşturur.
 */
export function renderGameOverUI(teams) {
    const winnerTitle = document.getElementById('winner-team-title');
    const winnerStatsContainer = document.getElementById('winner-stats-container');
    
    if (!winnerTitle || !winnerStatsContainer) return;
    
    // Takımları puanlarına göre sırala
    const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
    const winner = sortedTeams[0];
    
    winnerTitle.textContent = winner.name;
    winnerStatsContainer.innerHTML = '';
    
    // Takımları listele
    sortedTeams.forEach((team, index) => {
        const isWinner = index === 0;
        const opacityClass = isWinner ? '' : 'opacity-60';
        const cardBorder = isWinner ? 'border-primary/20 bg-primary/5' : 'border-white/5';
        const maxScore = winner.score || 1;
        const progressPercent = Math.max(10, Math.min(100, (team.score / maxScore) * 100));
        
        const card = document.createElement('div');
        card.className = `glass-card rounded-2xl p-6 flex flex-col items-center relative overflow-hidden group transition-all ${opacityClass} ${cardBorder}`;
        
        card.innerHTML = `
            ${isWinner ? `<div class="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>` : ''}
            <span class="font-label-caps text-[10px] tracking-wider text-white/50 mb-4 uppercase">${team.name}</span>
            <span class="font-display text-5xl text-white font-extralight mb-6 tracking-tighter">${team.score}</span>
            
            <!-- Grafik Çubuğu -->
            <div class="w-full h-[2px] bg-white/10 rounded-full overflow-hidden mt-auto mb-5">
                <div class="h-full bg-white/80 rounded-full animate-width" style="width: ${progressPercent}%;"></div>
            </div>
            
            <!-- Detaylı İstatistikler -->
            <div class="w-full space-y-2.5">
                <div class="flex justify-between items-center text-xs font-light">
                    <span class="text-white/40">Doğru</span>
                    <span class="text-white/90">${team.corrects}</span>
                </div>
                <div class="flex justify-between items-center text-xs font-light">
                    <span class="text-white/40">Pas</span>
                    <span class="text-white/90">${team.passes}</span>
                </div>
                <div class="flex justify-between items-center text-xs font-light">
                    <span class="text-white/40">Tabu</span>
                    <span class="text-white/90">${team.tabus}</span>
                </div>
            </div>
        `;
        winnerStatsContainer.appendChild(card);
    });
    
    // CSS Konfeti yağmuru efekti başlat
    startConfettiEffect();
}

/**
 * Şampiyon ekranında küçük bir konfeti yağmuru simüle eder.
 */
let confettiInterval = null;
function startConfettiEffect() {
    // Varsa eski animasyonu temizle
    stopConfettiEffect();
    
    const container = document.getElementById('view-game-over');
    if (!container) return;
    
    confettiInterval = setInterval(() => {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.backgroundColor = ['#b8c4ff', '#ddb7ff', '#10b981', '#f87171', '#ffb59a'][Math.floor(Math.random() * 5)];
        confetti.style.animationDuration = `${Math.random() * 2 + 2}s`; // 2s - 4s
        confetti.style.transform = `scale(${Math.random() * 0.8 + 0.4})`;
        
        container.appendChild(confetti);
        
        // Ekranda biriken konfetileri temizle
        setTimeout(() => {
            confetti.remove();
        }, 4000);
    }, 150);
}

export function stopConfettiEffect() {
    if (confettiInterval) {
        clearInterval(confettiInterval);
        confettiInterval = null;
    }
    document.querySelectorAll('.confetti').forEach(el => el.remove());
}
