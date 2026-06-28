/* VibeTabu Ana Uygulama Başlatıcı ve Olay Dinleyici Modülü */

import { 
    state, 
    STATES, 
    initGame, 
    startRound, 
    recordDecision, 
    updateRoundHistoryDecision, 
    confirmRoundScores, 
    resetGame,
    loadGameStateFromStorage
} from './state.js';

import { 
    views, 
    showView, 
    renderTeamInputs, 
    renderCategories, 
    renderActiveCard, 
    animateCardTransition, 
    updateTimerUI, 
    triggerFlashOverlay, 
    renderRoundReviewCard, 
    renderScoreboardUI, 
    renderGameOverUI, 
    stopConfettiEffect,
    updateSplashWordCount,
    animateReviewTransition
} from './ui.js';

import { 
    initAudio, 
    playCorrect, 
    playTabu, 
    playTimeOver,
    playTransition,
    playPass,
    playVibration
} from './audio.js';

// Global Oyun Değişkenleri
let allWords = [];
let activeTeamsCount = 2; // Başlangıçta 2 takım
let roundInterval = null;
let reviewCountdownInterval = null;
let reviewCountdownTime = 0;

// Sayfa yüklendiğinde başlat
window.addEventListener('DOMContentLoaded', () => {
    loadWordsData();
    setupEventListeners();
    registerServiceWorker();
});

/**
 * words.json dosyasından kelime havuzunu yükler.
 */
async function loadWordsData() {
    try {
        const response = await fetch('./data/words.json');
        if (!response.ok) throw new Error("Dosya yüklenemedi");
        allWords = await response.json();
        
        // İlk ekran kurulumunu yap
        initSetupScreen();
        
        // Kelime sayacını güncelle
        updateSplashWordCount(allWords.length);
    } catch (e) {
        console.error("Kelimeler yüklenirken hata oluştu:", e);
        // Fallback kelime listesi (İnternet/fetch hatası durumunda)
        allWords = [
            { "w": "Klavye", "f": ["Tuş", "Yazı", "Bilgisayar", "Ekran", "Fare"], "c": "Teknoloji", "d": "K" },
            { "w": "Titanik", "f": ["Gemi", "Buzdağı", "Okyanus", "Aşk", "Leonardo"], "c": "Sinema", "d": "K" },
            { "w": "Futbol", "f": ["Top", "Kale", "Maç", "Oyuncu", "Ayak"], "c": "Spor", "d": "K" },
            { "w": "İstanbul", "f": ["Boğaz", "Köprü", "Metropol", "Türkiye", "Cami"], "c": "Genel", "d": "K" }
        ];
        initSetupScreen();
        updateSplashWordCount(allWords.length);
    }
}

/**
 * Oyun kurulum ekranını (Adım 1) hazırlar.
 */
function initSetupScreen() {
    // Takım girişlerini oluştur
    const teamsContainer = document.getElementById('team-inputs-container');
    if (teamsContainer) {
        renderTeamInputs(teamsContainer, activeTeamsCount);
    }
    
    // Kategorileri belirle (kelime havuzundaki tüm benzersiz kategoriler)
    const uniqueCategories = [...new Set(allWords.map(w => w.c))];
    const categoriesContainer = document.getElementById('categories-container');
    if (categoriesContainer) {
        // Başlangıçta hiçbirisi seçili gelmesin
        renderCategories(categoriesContainer, uniqueCategories, []);
        state.selectedCategories = [];
    }
    updateStartButtonState();
    
    showView(views.splash);
    
    // Kayıtlı oyun varsa Devam Et butonunu göster
    const btnResume = document.getElementById('btn-splash-resume');
    if (btnResume) {
        if (localStorage.getItem('vibesave_gamestate')) {
            btnResume.classList.remove('hidden');
            btnResume.classList.add('flex');
        } else {
            btnResume.classList.remove('flex');
            btnResume.classList.add('hidden');
        }
    }
}

/**
 * Tüm DOM olay dinleyicilerini tanımlar.
 */
function setupEventListeners() {
    // Mobil tıklama gecikmesini gidermek için touch/pointer olayları kullanımı
    const clickEvent = 'pointerdown';
    
    // Genel dokunsal geri bildirim (Haptic Feedback) olay dinleyicisi
    document.addEventListener(clickEvent, (e) => {
        const button = e.target.closest('button, .option-pill, [role="button"]');
        if (button) {
            // Aktif oyun butonları (Doğru, Tabu, Pas) kendi özel titreşimlerini çalacağı için
            // genel tıklama titreşimini onlar için tetiklemiyoruz.
            const id = button.id;
            if (id !== 'btn-correct' && id !== 'btn-tabu' && id !== 'btn-pass') {
                playVibration(15);
            }
        }
    }, { passive: true });
    
    // --- BAŞLANGIÇ EKRANI (SPLASH) OLAYLARI ---
    const btnSplashResume = document.getElementById('btn-splash-resume');
    if (btnSplashResume) {
        btnSplashResume.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            initAudio();
            
            const loaded = loadGameStateFromStorage(allWords);
            if (loaded) {
                // Kayıtlı duruma göre doğru ekrana geç
                if (state.currentState === STATES.ROUND_READY) {
                    setupRoundReadyView();
                } else if (state.currentState === STATES.SCOREBOARD) {
                    setupScoreboardView();
                } else if (state.currentState === STATES.GAME_OVER) {
                    setupGameOverView();
                } else {
                    setupRoundReadyView();
                }
            }
        });
    }

    const btnSplashStart = document.getElementById('btn-splash-start');
    if (btnSplashStart) {
        btnSplashStart.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            initAudio(); // Ses motorunu ilk tıklamada ısıt
            showView(views.setup);
        });
    }

    // Nasıl Oynanır? (Kurallar Ekranına Geçiş)
    const btnSplashRules = document.getElementById('btn-splash-rules');
    if (btnSplashRules) {
        btnSplashRules.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            initAudio();
            showView(views.rules);
        });
    }

    // Kurallar Ekranından Başlangıç Ekranına Dönüş
    const btnRulesBack = document.getElementById('btn-rules-back');
    if (btnRulesBack) {
        btnRulesBack.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            initAudio();
            showView(views.splash);
        });
    }
    
    // --- ADIM 1 KURULUM EKRANI OLAYLARI ---
    
    // Kurulum Adım 1 -> Başlangıç Ekranına Geri Dön
    const btnSetupHome = document.getElementById('btn-setup-home');
    if (btnSetupHome) {
        btnSetupHome.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            showView(views.splash);
        });
    }
    
    // Takım ekleme
    const btnAddTeam = document.getElementById('btn-add-team');
    if (btnAddTeam) {
        btnAddTeam.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            initAudio(); // Ses motorunu ilk tıklamada ısıt
            if (activeTeamsCount < 6) { // Maksimum 6 takım
                activeTeamsCount++;
                renderTeamInputs(document.getElementById('team-inputs-container'), activeTeamsCount);
            }
        });
    }
    
    // Takım kaldırma (Event delegation)
    const teamsContainer = document.getElementById('team-inputs-container');
    if (teamsContainer) {
        teamsContainer.addEventListener(clickEvent, (e) => {
            const removeBtn = e.target.closest('[data-remove-team]');
            if (removeBtn) {
                e.preventDefault();
                activeTeamsCount--;
                renderTeamInputs(teamsContainer, activeTeamsCount);
            }
        });
    }
    
    // Ayar Butonları (Süre, Pas, Hedef Skor) Seçimleri
    setupOptionPills('time-pills-container');
    setupOptionPills('pass-pills-container');
    setupOptionPills('score-pills-container');
    
    // Kurulum Adım 1 -> Adım 2 İleri Butonu
    const btnSetupNext = document.getElementById('btn-setup-next');
    if (btnSetupNext) {
        btnSetupNext.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            initAudio();
            
            // Girişleri doğrula
            const nameInputs = document.querySelectorAll('.team-name-input');
            let hasEmptyName = false;
            nameInputs.forEach((input, index) => {
                if (!input.value.trim()) {
                    input.value = `Takım ${index + 1}`;
                }
            });
            
            // Adım 2'ye geç
            showView(views.setupStep2);
        });
    }
    
    // --- ADIM 2 KATEGORİ VE ZORLUK SEÇİM EKRANI ---
    
    // Kategorileri seçme/kaldırma
    const categoriesContainer = document.getElementById('categories-container');
    if (categoriesContainer) {
        categoriesContainer.addEventListener(clickEvent, (e) => {
            const pill = e.target.closest('.option-pill');
            if (pill) {
                e.preventDefault();
                const cat = pill.dataset.category;
                
                if (state.selectedCategories.includes(cat)) {
                    state.selectedCategories = state.selectedCategories.filter(c => c !== cat);
                    pill.classList.remove('active');
                } else {
                    state.selectedCategories.push(cat);
                    pill.classList.add('active');
                }
                updateStartButtonState();
            }
        });
    }
    
    // Zorluk seviyesi seçimi
    const difficultyContainer = document.getElementById('difficulty-pills-container');
    if (difficultyContainer) {
        difficultyContainer.addEventListener(clickEvent, (e) => {
            const pill = e.target.closest('.option-pill');
            if (pill) {
                e.preventDefault();
                difficultyContainer.querySelectorAll('.option-pill').forEach(btn => btn.classList.remove('active'));
                pill.classList.add('active');
                state.selectedDifficulty = pill.dataset.difficulty;
            }
        });
    }
    
    // Kurulum Adım 2 -> Adım 1 Geri Butonu
    const btnSetupBack = document.getElementById('btn-setup-back');
    if (btnSetupBack) {
        btnSetupBack.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            showView(views.setup);
        });
    }
    
    // Oyunu Başlat Butonu
    const btnStartGame = document.getElementById('btn-start-game');
    if (btnStartGame) {
        btnStartGame.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            
            // Eğer kategori seçilmemişse oyunu başlatma (pointerdown engellemesi)
            if (state.selectedCategories.length === 0) return;
            
            // Ayar değerlerini topla
            const teamNames = Array.from(document.querySelectorAll('.team-name-input')).map(inp => inp.value.trim());
            
            const activeTimePill = document.querySelector('#time-pills-container .option-pill.active');
            const timeLimit = activeTimePill ? parseInt(activeTimePill.textContent, 10) : 90;
            
            const activePassPill = document.querySelector('#pass-pills-container .option-pill.active');
            const passLimit = activePassPill ? activePassPill.textContent.trim() : '5';
            
            const activeScorePill = document.querySelector('#score-pills-container .option-pill.active');
            const targetScore = activeScorePill ? parseInt(activeScorePill.textContent, 10) : 50;
            
            // State'i başlat
            initGame(
                allWords, 
                teamNames, 
                state.selectedCategories, 
                state.selectedDifficulty, 
                timeLimit, 
                passLimit, 
                targetScore
            );
            
            // Hazırlık ekranını kur ve göster
            setupRoundReadyView();
        });
    }
    
    // --- TURA HAZIR OL EKRANI ---
    
    const btnStartTurn = document.getElementById('btn-start-turn');
    if (btnStartTurn) {
        btnStartTurn.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            initAudio();
            
            // Turu başlat ve süreyi say
            startRound();
            setupPlayingView();
            startTimerLoop();
        });
    }
    
    // --- AKTİF OYUN EKRANI (TABU, PAS, DOĞRU) ---
    
    const btnCorrect = document.getElementById('btn-correct');
    if (btnCorrect) {
        btnCorrect.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            handleCardAction('correct');
        });
    }
    
    const btnTabu = document.getElementById('btn-tabu');
    if (btnTabu) {
        btnTabu.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            handleCardAction('tabu');
        });
    }
    
    const btnPass = document.getElementById('btn-pass');
    if (btnPass) {
        btnPass.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            handleCardAction('pass');
        });
    }
    
    // Sayaca tıklayarak duraklatma
    const timerClickArea = document.getElementById('timer-click-area');
    if (timerClickArea) {
        timerClickArea.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            if (state.currentState === STATES.PLAYING) {
                pauseRound();
            }
        });
    }

    // Duraklatma ekranındaki "Devam Et" butonu
    const btnPauseResume = document.getElementById('btn-pause-resume');
    if (btnPauseResume) {
        btnPauseResume.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            initAudio();
            resumeRound();
        });
    }

    // Duraklatma ekranındaki "Ana Menüye Dön" butonu
    const btnPauseHome = document.getElementById('btn-pause-home');
    if (btnPauseHome) {
        btnPauseHome.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            stopConfettiEffect();
            if (roundInterval) {
                clearInterval(roundInterval);
                roundInterval = null;
            }
            if (reviewCountdownInterval) {
                clearInterval(reviewCountdownInterval);
                reviewCountdownInterval = null;
            }
            const pauseOverlay = document.getElementById('pause-overlay');
            if (pauseOverlay) {
                pauseOverlay.classList.add('hidden');
                pauseOverlay.classList.remove('flex');
            }
            resetGame();
            initSetupScreen();
        });
    }
    
    // Klavye Kısayolları (Geliştirici ve Bilgisayarda Test Etme Kolaylığı İçin)
    window.addEventListener('keydown', (e) => {
        if (state.currentState !== STATES.PLAYING) return;
        const pauseOverlay = document.getElementById('pause-overlay');
        if (pauseOverlay && !pauseOverlay.classList.contains('hidden')) return;
        
        if (e.code === 'ArrowRight' || e.code === 'Space') {
            e.preventDefault();
            handleCardAction('correct');
        } else if (e.code === 'ArrowLeft' || e.code === 'Escape') {
            e.preventDefault();
            handleCardAction('tabu');
        } else if (e.code === 'ArrowDown') {
            e.preventDefault();
            handleCardAction('pass');
        }
    });
    
    // --- TUR SONU İNCELEME EKRANI ---
    
    const btnReviewPrev = document.getElementById('btn-review-prev');
    if (btnReviewPrev) {
        btnReviewPrev.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            if (state.currentReviewIndex > 0) {
                animateReviewTransition('right', () => {
                    state.currentReviewIndex--;
                    setupRoundOverView();
                });
            }
        });
    }

    const btnReviewNext = document.getElementById('btn-review-next');
    if (btnReviewNext) {
        btnReviewNext.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            if (state.currentReviewIndex < state.roundHistory.length - 1) {
                animateReviewTransition('left', () => {
                    state.currentReviewIndex++;
                    setupRoundOverView();
                });
            }
        });
    }

    // Sağa/Sola Kaydırma (Swipe) Algılayıcı
    const reviewCardContainer = document.getElementById('review-card-container');
    if (reviewCardContainer) {
        let touchStartX = 0;
        let touchStartY = 0;
        
        reviewCardContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        reviewCardContainer.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;
            
            // Yatay hareket belirgin bir kaydırma olmalı ve dikey hareketi geçmeli
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    // Sağa kaydırma -> Önceki kart (right animasyonu)
                    if (state.currentReviewIndex > 0) {
                        animateReviewTransition('right', () => {
                            state.currentReviewIndex--;
                            setupRoundOverView();
                        });
                    }
                } else {
                    // Sola kaydırma -> Sonraki kart (left animasyonu)
                    if (state.currentReviewIndex < state.roundHistory.length - 1) {
                        animateReviewTransition('left', () => {
                            state.currentReviewIndex++;
                            setupRoundOverView();
                        });
                    }
                }
            }
        }, { passive: true });
    }
    
    const btnConfirmReview = document.getElementById('btn-confirm-review');
    if (btnConfirmReview) {
        btnConfirmReview.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            
            // Sayaç devam ediyorsa veya zaten geçiş yapılmışsa (çift tıklama koruması) onaylamaya izin verme
            if (reviewCountdownTime > 0 || state.currentState !== STATES.ROUND_OVER) return;
            
            if (reviewCountdownInterval) {
                clearInterval(reviewCountdownInterval);
                reviewCountdownInterval = null;
            }
            
            // Skorları onayla ve sonraki ekrana geç
            confirmRoundScores();
            
            if (state.currentState === STATES.GAME_OVER) {
                setupGameOverView();
            } else {
                setupScoreboardView();
            }
        });
    }
    
    // --- SKOR TABLOSU EKRANI ---
    
    const btnScoreboardNext = document.getElementById('btn-scoreboard-next');
    if (btnScoreboardNext) {
        btnScoreboardNext.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            
            // Sıradaki tur için hazır ol ekranını kur
            state.currentState = STATES.ROUND_READY;
            setupRoundReadyView();
        });
    }

    const btnBetAccept = document.getElementById('btn-bet-accept');
    const btnBetDecline = document.getElementById('btn-bet-decline');
    if (btnBetAccept && btnBetDecline) {
        btnBetAccept.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            state.nextTeamBetActive = true;
            btnBetAccept.classList.add('active');
            btnBetDecline.classList.remove('active');
            playVibration(15);
        });
        
        btnBetDecline.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            state.nextTeamBetActive = false;
            btnBetDecline.classList.add('active');
            btnBetAccept.classList.remove('active');
            playVibration(15);
        });
    }
    
    // --- OYUN BİTTİ (WINNER) EKRANI ---
    
    const btnGameOverReplay = document.getElementById('btn-game-over-replay');
    if (btnGameOverReplay) {
        btnGameOverReplay.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            stopConfettiEffect();
            
            // Aynı takımlarla oyunu yeniden başlat
            const teamNames = state.teams.map(t => t.name);
            initGame(
                allWords, 
                teamNames, 
                state.selectedCategories, 
                state.selectedDifficulty, 
                state.timeLimit, 
                state.passLimit === 'unlimited' ? 'Sınırsız' : state.passLimit.toString(), 
                state.targetScore
            );
            setupRoundReadyView();
        });
    }
    
    const btnGameOverHome = document.getElementById('btn-game-over-home');
    if (btnGameOverHome) {
        btnGameOverHome.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            stopConfettiEffect();
            
            // Tamamen kurulum ekranına dön
            resetGame();
            initSetupScreen();
        });
    }
}

/**
 * Ayar gruplarındaki (Süre, Pas, Skor) tıklamaları yönetir.
 */
function setupOptionPills(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.addEventListener('pointerdown', (e) => {
        const pill = e.target.closest('.option-pill');
        if (pill) {
            e.preventDefault();
            container.querySelectorAll('.option-pill').forEach(btn => btn.classList.remove('active'));
            pill.classList.add('active');
        }
    });
}

/**
 * Sıra Kimde / Hazırlık ekranını kurar.
 */
function setupRoundReadyView() {
    const teamNameSpan = document.getElementById('ready-team-name');
    if (teamNameSpan) {
        teamNameSpan.textContent = state.teams[state.currentTeamIndex].name;
        
        // Takım sırasına göre renk tonunu uyarla
        if (state.currentTeamIndex % 2 === 0) {
            teamNameSpan.className = 'font-medium text-primary';
        } else {
            teamNameSpan.className = 'font-medium text-secondary';
        }
    }
    showView(views.roundReady);
}

/**
 * Aktif oyun alanını kurar.
 */
function setupPlayingView() {
    // Header güncellemeleri
    const playingTeamName = document.getElementById('playing-team-name');
    const playingRoundText = document.getElementById('playing-round-text');
    const playingScoreboardText = document.getElementById('playing-scoreboard-text');
    const betBadge = document.getElementById('playing-bet-badge');
    const betTargetSpan = document.getElementById('playing-bet-target');
    
    if (playingTeamName) {
        playingTeamName.textContent = state.teams[state.currentTeamIndex].name;
        playingTeamName.className = `font-label-caps text-label-caps uppercase tracking-widest ${state.currentTeamIndex % 2 === 0 ? 'text-primary' : 'text-secondary'}`;
    }
    
    if (playingRoundText) {
        playingRoundText.textContent = `${state.currentRoundNumber}. Tur`;
    }
    
    if (playingScoreboardText) {
        // En yüksek 2 skoru veya genel durumu göster
        if (state.teams.length >= 2) {
            playingScoreboardText.textContent = state.teams.map(t => t.score).join(' - ');
        } else {
            playingScoreboardText.textContent = state.teams[0].score;
        }
    }

    if (betBadge) {
        if (state.isBetActive) {
            betBadge.classList.remove('hidden');
            betBadge.classList.add('flex');
            if (betTargetSpan) betTargetSpan.textContent = state.betTarget;
        } else {
            betBadge.classList.remove('flex');
            betBadge.classList.add('hidden');
        }
    }
    
    // Sayaç göstergesi
    updateTimerUI(state.currentTimer, state.timeLimit);
    
    // Aktif kelime kartı
    renderActiveCard(state.activeCard, state.currentPassesUsed, state.passLimit);
    
    showView(views.playing);
}

/**
 * Kart buton aksiyonlarını ve animasyonlarını yönetir.
 */
function handleCardAction(decision) {
    if (state.currentState !== STATES.PLAYING) return;
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay && !pauseOverlay.classList.contains('hidden')) return;
    
    // Pas limiti aşımı durumunda butonun eylemsiz kalmasını sağla
    if (decision === 'pass' && state.passLimit !== 'unlimited' && state.currentPassesUsed >= state.passLimit) {
        return;
    }
    
    // Ses ve titreşim efektini çal
    if (decision === 'correct') playCorrect();
    else if (decision === 'tabu') playTabu();
    else if (decision === 'pass') playPass();
    
    // Ekran parlama efekti
    triggerFlashOverlay(decision);
    
    // Kart kaydırma ve yenileme animasyonunu tetikle
    animateCardTransition(decision, () => {
        // Durumu güncelle ve sıradaki kelimeyi çek
        recordDecision(decision);
        
        // Yeni kartı render et
        renderActiveCard(state.activeCard, state.currentPassesUsed, state.passLimit);
    });
}

/**
 * Oyun tur sayacı döngüsünü başlatır.
 */
function startTimerLoop() {
    if (roundInterval) clearInterval(roundInterval);
    
    roundInterval = setInterval(() => {
        state.currentTimer--;
        
        // Arayüzü güncelle
        updateTimerUI(state.currentTimer, state.timeLimit);
        
        // Süre bitti mi kontrolü
        if (state.currentTimer <= 0) {
            endRound();
        }
    }, 1000);
}

/**
 * Turu duraklatır (Süreyi durdurur ve overlay'i gösterir).
 */
function pauseRound() {
    if (roundInterval) {
        clearInterval(roundInterval);
        roundInterval = null;
    }
    
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) {
        pauseOverlay.classList.remove('hidden');
        pauseOverlay.classList.add('flex');
    }
}

/**
 * Turu devam ettirir (Süreyi başlatır ve overlay'i gizler).
 */
function resumeRound() {
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) {
        pauseOverlay.classList.add('hidden');
        pauseOverlay.classList.remove('flex');
    }
    
    startTimerLoop();
}

/**
 * Tur süresi bittiğinde çağrılır.
 */
function endRound() {
    if (roundInterval) {
        clearInterval(roundInterval);
        roundInterval = null;
    }
    
    // Süre bitiş alarmı çal
    playTimeOver();
    
    // Durumu değiştir
    state.currentState = STATES.ROUND_OVER;
    
    // Tur sonu inceleme ekranını kur
    setupRoundOverView();
    
    // 5 saniyelik onay kilidini başlat
    startReviewCountdown();
}

/**
 * Tur sonu skorları onayla butonu için 5 saniyelik geri sayım sayacını başlatır.
 */
function startReviewCountdown() {
    const btnConfirm = document.getElementById('btn-confirm-review');
    if (!btnConfirm) return;

    reviewCountdownTime = 5;
    
    // Butonu pasifleştir ve stilini ayarla
    btnConfirm.disabled = true;
    btnConfirm.classList.add('opacity-50', 'cursor-not-allowed');
    btnConfirm.classList.remove('active:scale-95');
    
    const spanText = btnConfirm.querySelector('span:first-child');
    const icon = btnConfirm.querySelector('.material-symbols-outlined');
    if (spanText) {
        spanText.textContent = `Skorları Onayla (${reviewCountdownTime}s)`;
    }
    if (icon) {
        icon.textContent = 'hourglass_empty'; // Kum saati ikonu
        icon.classList.add('animate-spin'); // İkon dönsün
    }

    if (reviewCountdownInterval) clearInterval(reviewCountdownInterval);
    
    reviewCountdownInterval = setInterval(() => {
        reviewCountdownTime--;
        
        if (spanText) {
            spanText.textContent = `Skorları Onayla (${reviewCountdownTime}s)`;
        }
        
        if (reviewCountdownTime <= 0) {
            clearInterval(reviewCountdownInterval);
            reviewCountdownInterval = null;
            
            // Butonu tekrar aktif et
            btnConfirm.disabled = false;
            btnConfirm.classList.remove('opacity-50', 'cursor-not-allowed');
            btnConfirm.classList.add('active:scale-95');
            
            if (spanText) {
                spanText.textContent = 'Skorları Onayla';
            }
            if (icon) {
                icon.textContent = 'done_all'; // Orijinal onay işareti ikonu
                icon.classList.remove('animate-spin');
            }
        }
    }, 1000);
}

/**
 * Tur sonu inceleme ekranını doldurur.
 */
function setupRoundOverView() {
    const reviewTeamName = document.getElementById('review-team-name');
    const cardContainer = document.getElementById('review-card-container');
    
    if (reviewTeamName) {
        reviewTeamName.textContent = state.teams[state.currentTeamIndex].name;
    }
    
    updateReviewScoreLabel();
    
    // İnceleme kartını render et
    renderRoundReviewCard(cardContainer, state.roundHistory, state.currentReviewIndex, (index, newDecision) => {
        // Kararı değiştir
        updateRoundHistoryDecision(index, newDecision);
        
        // Ses efekti çal
        if (newDecision === 'correct') playCorrect();
        else if (newDecision === 'tabu') playTabu();
        
        // Skoru ve kartı güncelle
        updateReviewScoreLabel();
        setupRoundOverView(); // Ekranı yeniden çiz
    });
    
    showView(views.roundOver);
}

/**
 * Tur sonu incelemesindeki geçici puan değişim etiketini günceller.
 */
function updateReviewScoreLabel() {
    const reviewScoreChange = document.getElementById('review-score-change');
    if (!reviewScoreChange) return;
    
    let roundCorrects = 0;
    state.roundHistory.forEach(item => {
        if (item.result === 'correct') roundCorrects++;
    });
    
    let betBonus = 0;
    let betMessage = '';
    if (state.isBetActive) {
        if (roundCorrects >= state.betTarget) {
            betBonus = 1;
            betMessage = ` (🎰 İddia Başarılı +1)`;
        } else {
            betBonus = -1;
            betMessage = ` (🎰 İddia Başarısız -1)`;
        }
    }
    
    const totalChange = state.roundScoreChange + betBonus;
    
    if (totalChange > 0) {
        reviewScoreChange.textContent = `+${totalChange} Puan${betMessage}`;
        reviewScoreChange.className = 'font-display text-3xl text-primary font-light';
    } else if (totalChange < 0) {
        reviewScoreChange.textContent = `${totalChange} Puan${betMessage}`;
        reviewScoreChange.className = 'font-display text-3xl text-error font-light';
    } else {
        reviewScoreChange.textContent = `0 Puan${betMessage}`;
        reviewScoreChange.className = 'font-display text-3xl text-white/50 font-light';
    }
}

/**
 * Skor tablosu ekranını hazırlar.
 */
function setupScoreboardView() {
    const listContainer = document.getElementById('scoreboard-list-container');
    if (listContainer) {
        renderScoreboardUI(listContainer, state.teams, state.currentRoundNumber);
    }
    showView(views.scoreboard);
}

/**
 * Şampiyon kutlama ekranını kurar.
 */
function setupGameOverView() {
    renderGameOverUI(state.teams);
    showView(views.gameOver);
}

/**
 * Service Worker kaydını yapar (PWA).
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW Başarıyla Kaydedildi. Kapsam:', reg.scope))
                .catch(err => console.warn('SW Kayıt Hatası:', err));
        });
    }
}

/**
 * Kategori seçim durumuna göre oyunu başlatma butonunun durumunu günceller.
 */
function updateStartButtonState() {
    const btnStart = document.getElementById('btn-start-game');
    if (btnStart) {
        if (state.selectedCategories.length > 0) {
            btnStart.disabled = false;
            btnStart.classList.remove('opacity-40', 'cursor-not-allowed');
            btnStart.classList.add('active:scale-95');
        } else {
            btnStart.disabled = true;
            btnStart.classList.add('opacity-40', 'cursor-not-allowed');
            btnStart.classList.remove('active:scale-95');
        }
    }
}
