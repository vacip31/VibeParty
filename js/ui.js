/* VibeTabu Arayüz Güncelleme (DOM) Modülü */

import { playTransition } from './audio.js';
import { state } from './state.js';

/**
 * Kelime uzunluğuna göre uygun yazı boyutu ve harf aralığı sınıflarını döndürür.
 * Çok uzun kelimelerin taşmasını veya kenarlarda kesilmesini engeller.
 */
function getWordFontSizeClass(word, isReview = false) {
    const len = word ? word.length : 0;
    if (isReview) {
        if (len <= 8) {
            return 'text-[30px] md:text-[36px] tracking-wide';
        } else if (len <= 12) {
            return 'text-[24px] md:text-[30px] tracking-normal';
        } else {
            return 'text-[18px] md:text-[22px] tracking-tight break-words';
        }
    } else {
        if (len <= 8) {
            return 'text-[42px] md:text-[56px] tracking-wider';
        } else if (len <= 12) {
            return 'text-[32px] md:text-[44px] tracking-wide';
        } else {
            return 'text-[24px] md:text-[32px] tracking-normal break-words';
        }
    }
}

// Görünüm elementlerinin referansları
export const views = {
    splash: document.getElementById('view-splash'),
    setup: document.getElementById('view-setup'),
    setupStep2: document.getElementById('view-setup-step2'),
    roundReady: document.getElementById('view-round-ready'),
    playing: document.getElementById('view-playing'),
    roundOver: document.getElementById('view-round-over'),
    scoreboard: document.getElementById('view-scoreboard'),
    gameOver: document.getElementById('view-game-over'),
    rules: document.getElementById('view-rules')
};

let currentActiveView = null;

/**
 * Belirtilen oyun ekranını yumuşak geçiş animasyonlarıyla gösterir.
 */
export function showView(activeView) {
    if (!currentActiveView) {
        currentActiveView = document.querySelector('.game-view.active-view') || views.splash;
    }
    
    if (!activeView || activeView === currentActiveView) return;
    
    const oldView = currentActiveView;
    currentActiveView = activeView;
    
    // Geçiş sesini çal
    playTransition();
    
    // Eski ekranın çıkış animasyonunu başlat
    if (oldView) {
        oldView.classList.add('transitioning', 'fade-out');
        oldView.classList.remove('active-view');
    }
    
    // Yeni ekranı hazırla
    activeView.classList.add('transitioning');
    activeView.classList.remove('fade-out', 'active-view');
    
    // Tarayıcı reflow tetikle
    void activeView.offsetWidth;
    
    // Yeni ekranı görünür yap
    activeView.classList.add('active-view');
    
    // Animasyon tamamlandığında durum sınıflarını temizle
    setTimeout(() => {
        if (oldView) {
            oldView.classList.remove('transitioning', 'fade-out');
        }
        activeView.classList.remove('transitioning');
    }, 500);
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
    
    const titleClass = getWordFontSizeClass(card.w, false);
    
    // Kart içeriğini güncelle
    cardContainer.innerHTML = `
        <h1 class="font-display ${titleClass} text-white uppercase mb-6 text-center select-none target-word">
            ${card.w}
        </h1>
        <div class="w-2/3 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6"></div>
        <div class="flex flex-col items-center space-y-[12px] w-full select-none">
            <span class="font-label-caps text-label-caps text-outline uppercase tracking-widest mb-2">TABU KELİMELER</span>
            <div class="w-full flex flex-col items-center space-y-[8px]">
                ${card.f.map((word) => `
                    <div class="w-full py-3 px-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] text-on-surface-variant font-light tracking-wide text-center text-base md:text-lg shadow-sm">
                        ${word}
                    </div>
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
 * Tur bittiğinde oynanan kelimelerin tek bir kart halinde incelenip düzeltilebildiği kart-kart arayüzünü oluşturur.
 */
export function renderRoundReviewCard(container, history, currentIndex, onDecisionChange) {
    container.innerHTML = '';
    
    const navControls = document.getElementById('review-nav-controls');
    const indicator = document.getElementById('review-card-indicator');
    const prevBtn = document.getElementById('btn-review-prev');
    const nextBtn = document.getElementById('btn-review-next');
    
    if (history.length === 0) {
        container.innerHTML = `
            <div class="text-center text-white/40 py-12 font-body-md glass-card rounded-2xl p-8 border border-white/5">
                <span class="material-symbols-outlined text-4xl text-white/20 mb-3 block">history_toggle_off</span>
                Bu turda hiçbir kelime oynanmadı.
            </div>
        `;
        if (navControls) navControls.classList.add('hidden');
        return;
    }
    
    if (navControls) {
        navControls.classList.remove('hidden');
        navControls.classList.add('flex');
    }
    
    // Aktif kart verisini al
    const item = history[currentIndex];
    if (!item) return;
    
    // Kart HTML yapısı (Siber minimalist tabu kartı şeklinde)
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card-container w-full liquid-glass rounded-3xl py-5 px-6 flex flex-col items-center justify-center inner-glow relative overflow-hidden';
    
    // Karar durum renkleri ve buton sınıfları
    const btnTabuClass = item.result === 'tabu' 
        ? 'border-error bg-error/15 text-error shadow-[0_0_15px_rgba(237,33,124,0.3)]' 
        : 'border-error/20 text-error/40 hover:text-error hover:border-error/40';
        
    const btnPassClass = item.result === 'pass' 
        ? 'border-secondary bg-secondary/15 text-secondary shadow-[0_0_15px_rgba(255,155,113,0.3)]' 
        : 'border-secondary/20 text-secondary/40 hover:text-secondary hover:border-secondary/40';
        
    const btnCorrectClass = item.result === 'correct' 
        ? 'border-primary bg-primary/15 text-primary shadow-[0_0_15px_rgba(27,153,139,0.3)]' 
        : 'border-primary/20 text-primary/40 hover:text-primary hover:border-primary/40';

    const titleClass = getWordFontSizeClass(item.word, true);

    cardDiv.innerHTML = `
        <h1 class="font-display ${titleClass} text-white uppercase mb-4 text-center select-none font-medium target-word">
            ${item.word}
        </h1>
        <div class="w-2/3 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-4"></div>
        
        <div class="flex flex-col items-center space-y-[4px] w-full select-none mb-4">
            <span class="font-label-caps text-[10px] text-white/40 tracking-wider mb-2">YASAKLI KELİMELER</span>
            <div class="w-full flex flex-col items-center space-y-[3px]">
                ${item.forbidden.map((word) => `
                    <div class="w-full py-2 px-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-on-surface-variant font-light tracking-wide text-center text-sm md:text-base">
                        ${word}
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="w-full grid grid-cols-3 gap-3">
            <button type="button" class="btn-review-opt py-3.5 rounded-2xl border font-label-caps text-[10px] tracking-widest font-semibold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${btnTabuClass}" data-type="tabu">
                <span class="material-symbols-outlined text-lg">close</span> TABU
            </button>
            <button type="button" class="btn-review-opt py-3.5 rounded-2xl border font-label-caps text-[10px] tracking-widest font-semibold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${btnPassClass}" data-type="pass">
                <span class="material-symbols-outlined text-lg">fast_forward</span> PAS
            </button>
            <button type="button" class="btn-review-opt py-3.5 rounded-2xl border font-label-caps text-[10px] tracking-widest font-semibold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${btnCorrectClass}" data-type="correct">
                <span class="material-symbols-outlined text-lg">check</span> DOĞRU
            </button>
        </div>
    `;
    
    container.appendChild(cardDiv);
    
    // Karar Değiştirme Dinleyicileri
    cardDiv.querySelectorAll('.btn-review-opt').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const type = btn.dataset.type;
            onDecisionChange(currentIndex, type);
        });
    });
    
    // Göstergeyi güncelle
    if (indicator) {
        indicator.textContent = `${currentIndex + 1} / ${history.length}`;
    }
    
    // Navigasyon Butonlarının Aktiflik Durumları
    if (prevBtn) {
        if (currentIndex === 0) {
            prevBtn.disabled = true;
            prevBtn.classList.add('opacity-30', 'cursor-not-allowed');
        } else {
            prevBtn.disabled = false;
            prevBtn.classList.remove('opacity-30', 'cursor-not-allowed');
        }
    }
    
    if (nextBtn) {
        if (currentIndex === history.length - 1) {
            nextBtn.disabled = true;
            nextBtn.classList.add('opacity-30', 'cursor-not-allowed');
        } else {
            nextBtn.disabled = false;
            nextBtn.classList.remove('opacity-30', 'cursor-not-allowed');
        }
    }
}

/**
 * Skor tablosunu render eder.
 */
export function renderScoreboardUI(container, teams, currentRound) {
    container.innerHTML = '';
    
    // Takımları puana göre sırala
    const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
    const leader = sortedTeams[0];
    const targetScore = state.targetScore || 50;
    
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

    // 2. Hedef Skor Bilgilerini Güncelle
    const targetLabel = document.getElementById('scoreboard-target-label');
    if (targetLabel) targetLabel.textContent = targetScore;
    
    const leaderDist = document.getElementById('scoreboard-leader-dist');
    if (leaderDist) {
        if (leader.score >= targetScore) {
            leaderDist.textContent = 'Hedefe Ulaşıldı!';
        } else {
            const remaining = targetScore - leader.score;
            leaderDist.textContent = `${leader.name} Bitime ${remaining} Puan Yakın`;
        }
    }
    
    // 3. İlerleme Çubuklarını Çiz
    const progressContainer = document.getElementById('scoreboard-progress-container');
    if (progressContainer) {
        progressContainer.innerHTML = '';
        sortedTeams.forEach((team, index) => {
            const percentage = Math.max(0, Math.min(100, (team.score / targetScore) * 100));
            const barColor = index % 2 === 0 ? 'bg-primary' : 'bg-secondary';
            
            const progressRow = document.createElement('div');
            progressRow.className = 'flex flex-col gap-1.5';
            progressRow.innerHTML = `
                <div class="flex justify-between items-center text-[10px] tracking-wider text-white/50 uppercase">
                    <span>${team.name}</span>
                    <span>%${Math.round(percentage)}</span>
                </div>
                <div class="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/[0.02]">
                    <div class="h-full ${barColor} rounded-full animate-width" style="width: ${percentage}%;"></div>
                </div>
            `;
            progressContainer.appendChild(progressRow);
        });
    }
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
        confetti.style.backgroundColor = ['#1b998b', '#ff9b71', '#ed217c', '#fffd82', '#2d3047'][Math.floor(Math.random() * 5)];
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

/**
 * Anasayfadaki toplam kelime sayacını günceller ve gösterir.
 */
export function updateSplashWordCount(count) {
    const wordCountEl = document.getElementById('splash-word-count');
    const badgeEl = document.getElementById('word-count-badge');
    if (wordCountEl && badgeEl) {
        wordCountEl.textContent = count;
        badgeEl.classList.remove('opacity-0');
    }
}

/**
 * Tur sonu inceleme kartları arasında geçiş yaparken yatay kayma animasyonu uygular.
 */
export function animateReviewTransition(direction, onComplete) {
    const card = document.querySelector('#review-card-container .card-container');
    if (!card) {
        onComplete();
        return;
    }
    
    // direction: 'left' (sola kayar, sonraki kart) veya 'right' (sağa kayar, önceki kart)
    card.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
    card.style.transform = direction === 'left' ? 'translate3d(-100%, 0, 0)' : 'translate3d(100%, 0, 0)';
    card.style.opacity = '0';
    
    setTimeout(() => {
        onComplete();
        
        // Yeni render edilen kartı ters yönden içeri getir
        const newCard = document.querySelector('#review-card-container .card-container');
        if (newCard) {
            newCard.style.transition = 'none';
            newCard.style.transform = direction === 'left' ? 'translate3d(100%, 0, 0)' : 'translate3d(-100%, 0, 0)';
            newCard.style.opacity = '0';
            
            // Reflow tetikle
            void newCard.offsetWidth;
            
            newCard.style.transition = 'transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.25s ease';
            newCard.style.transform = 'translate3d(0, 0, 0)';
            newCard.style.opacity = '1';
        }
    }, 200);
}

