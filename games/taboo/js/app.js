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
    loadGameStateFromStorage,
    saveGameStateToStorage
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
    animateReviewTransition,
    translateUI,
    escapeHTML
} from './ui.js';

import { locales } from './locales.js';

import {
    initAudio,
    playCorrect,
    playTabu,
    playTimeOver,
    playTransition,
    playPass,
    playVibration
} from './audio.js';

import {
    checkForUpdates,
    getFallbackWords,
    showCustomAlert,
    checkInternetConnection,
    rateApp,
    initHardwareBackButton,
    closeModal
} from './system.js';

import {
    initAdMob,
    showInterstitialWithFrequency,
    showRewardedAd,
    setupAdsEventListeners,
    setAdFreeNudgeCallback
} from './ads.js';

import {
    initBilling,
    purchasePremium,
    restorePurchases,
    updatePremiumUI
} from './billing.js';

// Global Oyun Değişkenleri
let allWords = [];
let activeTeamsCount = 2; // Başlangıçta 2 takım
let roundInterval = null;
let reviewCountdownInterval = null;
let reviewCountdownTime = 0;
let isCardActionInProgress = false;

// Sayfa yüklendiğinde başlat
window.addEventListener('DOMContentLoaded', () => {
    // Öncelikli olarak Premium ve reklamsız tur durumunu yerel depolamadan oku (internetsiz açılış desteği için)
    state.isPremium = localStorage.getItem('vibewords_ads_removed_forever') === 'true';
    const savedAdFreeRounds = localStorage.getItem('vibewords_ad_free_rounds_remaining');
    if (savedAdFreeRounds) {
        state.adFreeRoundsRemaining = parseInt(savedAdFreeRounds, 10);
    }

    // İnternet durum dinleyicilerini kur ve ilk kontrolü yap
    const handleNetworkChange = () => {
        const isOnline = checkInternetConnection();
        if (!isOnline && state.currentState === STATES.PLAYING) {
            pauseRound();
        }
    };
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    handleNetworkChange();

    // 1. Dil seçimini belirle
    const SUPPORTED_LANGUAGES = ['tr', 'en', 'de', 'fr', 'es', 'ru', 'zh'];
    let currentLanguage = localStorage.getItem('vibewords_lang');
    if (!currentLanguage) {
        const browserLang = navigator.language.split('-')[0];
        currentLanguage = SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : 'en';
    }
    state.language = currentLanguage;

    // 2. Arayüzü çevir
    translateUI(currentLanguage);
    updateLanguageSelectorButton(currentLanguage);

    // 3. Kelimeleri yükle ve başlat
    loadWordsData(currentLanguage);
    setupEventListeners();
});

/**
 * Belirlenen dilin words_{lang}.json dosyasından kelime havuzunu yükler.
 */
async function loadWordsData(lang) {
    try {
        const badge = document.getElementById('word-count-badge');
        if (badge) {
            badge.style.opacity = '0.5';
        }

        const response = await fetch(`./data/words_${lang}.json`);
        if (!response.ok) throw new Error("Dosya yüklenemedi");
        allWords = await response.json();

        // Kelime havuzunu state'e de bildir
        state.allWords = allWords;

        // İlk ekran kurulumunu yap
        initSetupScreen();

        // Kelime sayacını güncelle
        updateSplashWordCount(allWords.length);
        if (badge) {
            badge.style.opacity = '1';
        }
    } catch (e) {
        console.error("Kelimeler yüklenirken hata oluştu:", e);
        // Fallback kelime listesi
        allWords = getFallbackWords(lang);
        state.allWords = allWords;
        initSetupScreen();
        updateSplashWordCount(allWords.length);
        const badge = document.getElementById('word-count-badge');
        if (badge) {
            badge.style.opacity = '1';
        }
    }
}

/**
 * Dil seçim butonunu ve menüdeki aktif dili günceller.
 */
function updateLanguageSelectorButton(lang) {
    const btn = document.getElementById('btn-language-selector');
    if (!btn) return;

    const flags = {
        tr: 'tr',
        en: 'en',
        de: 'de',
        fr: 'fr',
        es: 'es',
        ru: 'ru',
        zh: 'zh'
    };

    const names = {
        tr: 'Türkçe',
        en: 'English',
        de: 'Deutsch',
        fr: 'Français',
        es: 'Español',
        ru: 'Русский',
        zh: '中文'
    };

    const label = document.getElementById('current-language-label');
    const flagImg = document.getElementById('current-language-flag');
    if (label) {
        label.textContent = names[lang] || 'Türkçe';
    }
    if (flagImg) {
        flagImg.src = `assets/flags/${flags[lang] || 'tr'}.png`;
        flagImg.alt = lang.toUpperCase();
    }

    // Dropdown menüsünde aktif olan dili seçili yap
    document.querySelectorAll('.lang-option-btn').forEach(opt => {
        const optLang = opt.getAttribute('data-lang');
        const checkIcon = opt.querySelector('.material-symbols-outlined');
        if (optLang === lang) {
            opt.classList.add('bg-white/10', 'text-primary');
            if (checkIcon) checkIcon.classList.remove('hidden');
        } else {
            opt.classList.remove('bg-white/10', 'text-primary');
            if (checkIcon) checkIcon.classList.add('hidden');
        }
    });
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

    showView(views.splash, true);

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
    const clickEvent = 'click';

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

    // Mobil klavyeyi kapatmak için genel dokunma dinleyicisi (giriş alanları dışına tıklanırsa klavyeyi kapatır)
    document.addEventListener('pointerdown', (e) => {
        if (e.target.tagName !== 'INPUT' && document.activeElement && document.activeElement.tagName === 'INPUT') {
            document.activeElement.blur();
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

    // Uygulamayı Değerlendir (Google Play'e yönlendirme)
    const btnSplashRate = document.getElementById('btn-splash-rate');
    if (btnSplashRate) {
        btnSplashRate.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            initAudio();
            rateApp();
        });
    }

    // Dil Seçici Modalını Aç/Kapat
    const btnLangSelector = document.getElementById('btn-language-selector');
    const languageModal = document.getElementById('language-modal');
    const btnCloseLangModal = document.getElementById('btn-close-language-modal');

    if (btnLangSelector && languageModal) {
        btnLangSelector.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            initAudio();
            languageModal.style.display = 'flex';
        });
    }

    if (btnCloseLangModal && languageModal) {
        btnCloseLangModal.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            closeModal(languageModal);
        });
    }

    // Dil Seçimi Olayları
    document.querySelectorAll('.lang-option-btn').forEach(btn => {
        btn.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            e.stopPropagation();
            const selectedLang = btn.getAttribute('data-lang');

            // Modali gizle
            if (languageModal) {
                languageModal.style.display = 'none';
            }

            // Eğer dil değiştiyse güncelle
            if (state.language !== selectedLang) {
                state.language = selectedLang;
                localStorage.setItem('vibewords_lang', selectedLang);

                // UI Çevir
                translateUI(selectedLang);
                updateLanguageSelectorButton(selectedLang);

                // Kelime havuzunu yeni dile göre tekrar çek
                loadWordsData(selectedLang);
            }
        });
    });


    // Kurallar Ekranından Başlangıç Ekranına Dönüş
    const btnRulesBack = document.getElementById('btn-rules-back');
    if (btnRulesBack) {
        btnRulesBack.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            initAudio();
            showView(views.splash, true);
        });
    }

    // --- ADIM 1 KURULUM EKRANI OLAYLARI ---

    // Kurulum Adım 1 -> Başlangıç Ekranına Geri Dön
    const btnSetupHome = document.getElementById('btn-setup-home');
    if (btnSetupHome) {
        btnSetupHome.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            showView(views.splash, true);
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
            nameInputs.forEach((input, index) => {
                if (!input.value.trim()) {
                    input.value = `${locales[state.language || 'tr'].team_label} ${index + 1}`;
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
            showView(views.setup, true);
        });
    }

    // Oyunu Başlat Butonu
    const btnStartGame = document.getElementById('btn-start-game');
    if (btnStartGame) {
        btnStartGame.addEventListener(clickEvent, (e) => {
            e.preventDefault();

            // Eğer kategori seçilmemişse uyarı göster ve durdur
            if (state.selectedCategories.length === 0) {
                const lang = state.language || 'tr';
                const warningTitle = locales[lang].error_select_category_title || 'Kategori Seçilmedi';
                const warningMsg = locales[lang].error_select_category || 'Lütfen en az bir kategori seçin!';
                showCustomAlert(warningTitle, warningMsg, 'warning', 'text-secondary');
                return;
            }

            try {
                // Ayar değerlerini topla
                const teamNames = Array.from(document.querySelectorAll('.team-name-input')).map(inp => inp.value.trim());

                const activeTimePill = document.querySelector('#time-pills-container .option-pill.active');
                const timeLimit = activeTimePill ? parseInt(activeTimePill.textContent, 10) : 90;

                const activePassPill = document.querySelector('#pass-pills-container .option-pill.active');
                const passLimit = activePassPill ? activePassPill.dataset.passLimit : '5';

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
            } catch (err) {
                console.error('Oyun başlatma hatası:', err);
                showCustomAlert('Hata', 'Oyun başlatılırken bir sorun oluştu: ' + err.message, 'error');
            }
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

    // Aktif Oyun Kartı İçin Swipe (Kaydırma) Algılayıcı (Touch Gestures)
    const activeCardContainer = document.getElementById('active-card-container');
    if (activeCardContainer) {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        activeCardContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
            touchStartTime = Date.now();
        }, { passive: true });

        activeCardContainer.addEventListener('touchend', (e) => {
            if (state.currentState !== STATES.PLAYING) return;
            if (isCardActionInProgress) return;
            const pauseOverlay = document.getElementById('pause-overlay');
            if (pauseOverlay && !pauseOverlay.classList.contains('hidden')) return;

            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            const timeDiff = Date.now() - touchStartTime;

            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;

            // Çok uzun süren dokunmaları yoksay (800ms)
            if (timeDiff > 800) return;

            // Yatay veya dikey kaydırma
            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (Math.abs(diffX) > 60) { // En az 60px hareket
                    if (diffX > 0) {
                        handleCardAction('correct'); // Sağa kaydırma -> Doğru
                    } else {
                        handleCardAction('tabu'); // Sola kaydırma -> Tabu
                    }
                }
            } else {
                if (Math.abs(diffY) > 60) { // En az 60px hareket
                    if (diffY > 0) {
                        handleCardAction('pass'); // Aşağı kaydırma -> Pas
                    }
                }
            }
        }, { passive: true });
    }

    // Konsol üzerinden Swipe Test Simülasyon Yardımcısı
    if (typeof window !== 'undefined') {
        window.testSwipe = (direction) => {
            const card = document.getElementById('active-card-container');
            if (!card) return 'Aktif oyun ekranında değilsiniz!';
            if (state.currentState !== STATES.PLAYING) return 'Oyun başlatılmamış!';
            
            let startX = 100, startY = 100;
            let endX = 100, endY = 100;
            
            if (direction === 'right') { endX = 300; }
            else if (direction === 'left') { endX = -100; }
            else if (direction === 'down') { endY = 300; }
            else if (direction === 'up') { endY = -100; }
            
            const tStart = new Touch({ identifier: Date.now(), target: card, screenX: startX, screenY: startY });
            const tEnd = new Touch({ identifier: Date.now(), target: card, screenX: endX, screenY: endY });
            
            card.dispatchEvent(new TouchEvent('touchstart', { touches: [tStart], targetTouches: [tStart], changedTouches: [tStart], bubbles: true }));
            card.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [tEnd], bubbles: true }));
            
            return `${direction.toUpperCase()} yönlü swipe hareketi simüle edildi.`;
        };
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

            const nextViewStep = () => {
                showInterstitialWithFrequency(() => {
                    if (state.currentState === STATES.GAME_OVER) {
                        setupGameOverView();
                    } else {
                        setupScoreboardView();
                    }
                });
            };

            const showNudge = !state.isPremium
                && state.adFreeRoundsRemaining > 0
                && state.adFreeRoundsRemaining <= 2;

            if (showNudge) {
                const lang = state.language || 'tr';
                const modalDesc = document.getElementById('adfree-nudge-modal-desc');
                if (modalDesc) {
                    const countSpan = `<span class="text-secondary font-medium font-display text-sm">${state.adFreeRoundsRemaining}</span>`;
                    modalDesc.innerHTML = locales[lang].nudge_modal_desc.replace('{x}', countSpan);
                }
                const nudgeModal = document.getElementById('adfree-nudge-modal');
                if (nudgeModal) nudgeModal.style.display = 'flex';
                setAdFreeNudgeCallback(nextViewStep);
            } else {
                nextViewStep();
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

    const btnReadyBetAccept = document.getElementById('btn-ready-bet-accept');
    const btnReadyBetDecline = document.getElementById('btn-ready-bet-decline');
    if (btnReadyBetAccept && btnReadyBetDecline) {
        btnReadyBetAccept.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            state.isBetActive = true;
            btnReadyBetAccept.classList.add('active');
            btnReadyBetDecline.classList.remove('active');
            playVibration(15);
        });

        btnReadyBetDecline.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            state.isBetActive = false;
            btnReadyBetDecline.classList.add('active');
            btnReadyBetAccept.classList.remove('active');
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
                state.passLimit === 'unlimited' ? 'unlimited' : state.passLimit.toString(),
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

    // Sayfa geçiş animasyonunu bağla (Outbound)
    document.querySelectorAll('a').forEach(link => {
        if (link.href && link.hostname === window.location.hostname && !link.target && !link.href.includes('#') && !link.href.startsWith('javascript:')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetUrl = link.href;
                document.body.style.transition = 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
                document.body.style.opacity = '0';
                document.body.style.transform = 'translateY(-6px)';
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 250);
            });
        }
    });

    // Geri tuşu basıldığında aktif tur sürelerini durdur ve sıfırla
    window.addEventListener('popstate', (e) => {
        const stateVal = e.state;
        const isLeavingSavedGame = stateVal
            && (stateVal.view === 'splash' || stateVal.view === 'setup')
            && state.currentState !== STATES.INIT
            && localStorage.getItem('vibesave_gamestate');

        if (isLeavingSavedGame) {
            const lang = state.language || 'tr';
            const confirmMsg = lang === 'tr'
                ? 'Ana ekrana dönmek istiyor musunuz? Devam ederseniz mevcut oyun kaydı silinecek.'
                : 'Do you want to return to the main screen? Continuing will delete the saved game.';

            if (!confirm(confirmMsg)) {
                e.stopImmediatePropagation();
                history.forward();
                return;
            }
        }

        if (roundInterval) {
            clearInterval(roundInterval);
            roundInterval = null;
        }
        if (reviewCountdownInterval) {
            clearInterval(reviewCountdownInterval);
            reviewCountdownInterval = null;
        }
        if (stateVal && (stateVal.view === 'splash' || stateVal.view === 'setup')) {
            resetGame();
        }
    }, true);

    // --- PREMİUM VE REKLAM KALDIRMA KONTROLLERİ ---
    const btnOpenPremium = document.getElementById('btn-open-premium');
    const premiumModal = document.getElementById('premium-modal');
    const btnClosePremium = document.getElementById('btn-close-premium-modal');
    const btnPremiumBuy = document.getElementById('btn-premium-buy');
    const btnPremiumWatch = document.getElementById('btn-premium-watch');
    const btnPremiumRestore = document.getElementById('btn-premium-restore');

    if (btnOpenPremium && premiumModal) {
        btnOpenPremium.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            initAudio();
            updatePremiumUI();
            premiumModal.style.display = 'flex';
        });
    }

    // Handoff nudge butonu premium modalı açar
    const openPremiumFromNudge = (e) => {
        e.preventDefault();
        const modal = document.getElementById('premium-modal');
        if (modal) {
            updatePremiumUI();
            modal.style.display = 'flex';
        }
    };
    const btnNudgeHandoff = document.getElementById('btn-nudge-open-premium');
    if (btnNudgeHandoff) btnNudgeHandoff.addEventListener(clickEvent, openPremiumFromNudge);

    // Ad-Free Nudge Modal buton olayları
    const btnNudgeBuyPremium = document.getElementById('btn-nudge-buy-premium');

    if (btnNudgeBuyPremium) {
        btnNudgeBuyPremium.addEventListener(clickEvent, async (e) => {
            e.preventDefault();
            await purchasePremium();
        });
    }

    if (btnClosePremium && premiumModal) {
        btnClosePremium.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            closeModal(premiumModal);
        });
    }

    if (btnPremiumBuy) {
        btnPremiumBuy.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            purchasePremium();
        });
    }

    if (btnPremiumWatch) {
        btnPremiumWatch.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            if (!checkInternetConnection()) return;
            showRewardedAd();
        });
    }

    if (btnPremiumRestore) {
        btnPremiumRestore.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            if (!checkInternetConnection()) return;
            restorePurchases();
        });
    }

    // --- OTOMATİK UYGULAMAYI DEĞERLENDİR MODAL KONTROLLERİ ---
    const rateModal = document.getElementById('rate-modal');
    const btnRateConfirm = document.getElementById('btn-rate-confirm');
    const btnRateLater = document.getElementById('btn-rate-later');

    if (btnRateConfirm && rateModal) {
        btnRateConfirm.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            initAudio();
            localStorage.setItem('vibewords_already_rated', 'true');
            closeModal(rateModal);
            rateApp();
        });
    }

    if (btnRateLater && rateModal) {
        btnRateLater.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            closeModal(rateModal);
        });
    }

    // AdMob ve Reklam Engelleyici Olay Dinleyicileri
    setupAdsEventListeners(clickEvent, initAudio);
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
    const readyViewHeader = document.querySelector('#view-round-ready h1');
    if (readyViewHeader) {
        const lang = state.language || 'tr';
        const teamName = escapeHTML(state.teams[state.currentTeamIndex].name);
        const colorClass = state.currentTeamIndex % 2 === 0 ? 'text-primary' : 'text-secondary';
        const formattedTeam = `<span id="ready-team-name" class="font-medium ${colorClass}">${teamName}</span>`;
        readyViewHeader.innerHTML = locales[lang].turn_ready_title.replace('{team}', formattedTeam);
    }

    // Her tur başlamadan önce varsayılan olarak iddiayı temizle
    state.isBetActive = false;

    let betTarget = 5;
    if (state.timeLimit <= 60) betTarget = 4;
    else if (state.timeLimit >= 120) betTarget = 6;

    state.betTarget = betTarget;

    const readyBetText = document.getElementById('ready-bet-text');
    if (readyBetText) {
        const lang = state.language || 'tr';
        const correctLabel = locales[lang].correct_stat.toUpperCase();
        const targetText = `<strong>${betTarget} ${correctLabel}</strong>`;
        readyBetText.innerHTML = locales[lang].bet_desc.replace('{x}', targetText);
    }

    // Buton seçimlerini sıfırla
    const btnAccept = document.getElementById('btn-ready-bet-accept');
    const btnDecline = document.getElementById('btn-ready-bet-decline');
    if (btnAccept && btnDecline) {
        btnAccept.classList.remove('active');
        btnDecline.classList.add('active');
    }

    // --- Premium Nudge (Telefon Devir Anı) ---
    const nudgeEl = document.getElementById('round-ready-premium-nudge');
    const nudgeTextEl = document.getElementById('nudge-handoff-text');
    if (nudgeEl) {
        const lang = state.language || 'tr';

        const isEligible = !state.isPremium
            && state.adFreeRoundsRemaining === 0
            && (state.currentRoundNumber % 3 === 1)
            && state.nudgeShownCount < 5;

        if (isEligible) {
            if (nudgeTextEl && locales[lang].nudge_handoff) {
                nudgeTextEl.textContent = locales[lang].nudge_handoff;
            }
            nudgeEl.classList.remove('hidden');
            nudgeEl.classList.add('flex');
            state.nudgeShownCount++;
            saveGameStateToStorage();
        } else {
            nudgeEl.classList.add('hidden');
            nudgeEl.classList.remove('flex');
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
        const lang = state.language || 'tr';
        playingRoundText.textContent = locales[lang].round_text.replace('{x}', state.currentRoundNumber);
    }

    if (playingScoreboardText) {
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
            const lang = state.language || 'tr';
            const betPrefix = document.getElementById('playing-bet-prefix');
            if (betPrefix) {
                betPrefix.textContent = locales[lang].bet_badge_target || 'HEDEF';
            }
            const correctLabel = locales[lang].correct_stat.toUpperCase();
            if (betTargetSpan) betTargetSpan.textContent = `${state.betTarget} ${correctLabel}`;
            betBadge.className = "mt-1.5 px-2.5 py-0.5 rounded-full border border-secondary/20 bg-secondary/5 text-secondary text-[9px] tracking-wider uppercase font-medium shadow-[0_0_8px_rgba(255,155,113,0.1)] w-fit flex items-center gap-1 whitespace-nowrap";
        } else {
            betBadge.classList.remove('flex');
            betBadge.classList.add('hidden');
        }
    }

    // Sayaç göstergesi
    updateTimerUI(state.currentTimer, state.timeLimit);

    // Aktif kelime kartı
    renderActiveCard(state.activeCard, state.currentPassesUsed, state.passLimit);

    // Premium / Ad-Free rozetini güncelle
    updatePremiumUI();

    showView(views.playing);
}

/**
 * Kart buton aksiyonlarını ve animasyonlarını yönetir.
 */
function handleCardAction(decision) {
    if (state.currentState !== STATES.PLAYING) return;
    if (isCardActionInProgress) return;
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay && !pauseOverlay.classList.contains('hidden')) return;

    if (decision === 'pass' && state.passLimit !== 'unlimited' && state.currentPassesUsed >= state.passLimit) {
        return;
    }

    if (decision === 'correct') playCorrect();
    else if (decision === 'tabu') playTabu();
    else if (decision === 'pass') playPass();

    triggerFlashOverlay(decision);
    isCardActionInProgress = true;

    animateCardTransition(decision, () => {
        try {
            if (state.currentState !== STATES.PLAYING) return;
            recordDecision(decision);
            renderActiveCard(state.activeCard, state.currentPassesUsed, state.passLimit);
            updatePlayingBetBadge();
        } finally {
            isCardActionInProgress = false;
        }
    });
}

/**
 * Oyun tur sayacı döngüsünü başlatır.
 */
function startTimerLoop() {
    if (roundInterval) clearInterval(roundInterval);

    roundInterval = setInterval(() => {
        state.currentTimer--;
        updateTimerUI(state.currentTimer, state.timeLimit);

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
    isCardActionInProgress = false;
    if (roundInterval) {
        clearInterval(roundInterval);
        roundInterval = null;
    }

    playTimeOver();
    state.currentState = STATES.ROUND_OVER;

    setupRoundOverView();
    startReviewCountdown();
}

/**
 * Tur sonu skorları onayla butonu için 5 saniyelik geri sayım sayacını başlatır.
 */
function startReviewCountdown() {
    const btnConfirm = document.getElementById('btn-confirm-review');
    if (!btnConfirm) return;

    reviewCountdownTime = 5;

    btnConfirm.disabled = true;
    btnConfirm.classList.add('opacity-50', 'cursor-not-allowed');
    btnConfirm.classList.remove('active:scale-95');

    const spanText = btnConfirm.querySelector('span:first-child');
    const icon = btnConfirm.querySelector('.material-symbols-outlined');
    if (spanText) {
        spanText.textContent = `Skorları Onayla (${reviewCountdownTime}s)`;
    }
    if (icon) {
        icon.textContent = 'hourglass_empty';
        icon.classList.add('animate-spin');
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

            btnConfirm.disabled = false;
            btnConfirm.classList.remove('opacity-50', 'cursor-not-allowed');
            btnConfirm.classList.add('active:scale-95');

            if (spanText) {
                spanText.textContent = 'Skorları Onayla';
            }
            if (icon) {
                icon.textContent = 'done_all';
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

    renderRoundReviewCard(cardContainer, state.roundHistory, state.currentReviewIndex, (index, newDecision) => {
        const success = updateRoundHistoryDecision(index, newDecision);

        if (!success) {
            const lang = state.language || 'tr';
            const alertTitle = locales[lang].pass_limit_reached || 'HAK BİTTİ';
            const alertMsg = locales[lang].rules_score_pas_desc || 'Pas sınırını aştınız!';
            showCustomAlert(alertTitle, alertMsg, 'warning', 'text-secondary');
            return;
        }

        if (newDecision === 'correct') playCorrect();
        else if (newDecision === 'tabu') playTabu();

        updateReviewScoreLabel();
        setupRoundOverView();
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
    const lang = state.language || 'tr';
    if (state.isBetActive) {
        if (roundCorrects >= state.betTarget) {
            betBonus = 1;
            betMessage = locales[lang].bet_success;
        } else {
            betBonus = -1;
            betMessage = locales[lang].bet_failed;
        }
    }

    const totalChange = state.roundScoreChange + betBonus;
    const ptsSuffix = locales[lang].points_suffix;

    if (totalChange > 0) {
        reviewScoreChange.textContent = `+${totalChange} ${ptsSuffix}${betMessage}`;
        reviewScoreChange.className = 'font-display text-3xl text-primary font-light';
    } else if (totalChange < 0) {
        reviewScoreChange.textContent = `${totalChange} ${ptsSuffix}${betMessage}`;
        reviewScoreChange.className = 'font-display text-3xl text-error font-light';
    } else {
        reviewScoreChange.textContent = `0 ${ptsSuffix}${betMessage}`;
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

    // Tamamlanan oyun sayacını artır
    let completedGames = parseInt(localStorage.getItem('vibewords_completed_games_count') || '0', 10);
    completedGames++;
    localStorage.setItem('vibewords_completed_games_count', completedGames.toString());

    setTimeout(() => {
        const rateModal = document.getElementById('rate-modal');
        if (rateModal) {
            const isAlreadyRated = localStorage.getItem('vibewords_already_rated') === 'true';
            let promptCount = parseInt(localStorage.getItem('vibewords_rate_prompt_count') || '0', 10);

            // Her oyun sonunda sormamak için: Sadece 1. oyun, 4. oyun ve 8. oyun sonunda sor (en fazla 3 kez)
            const shouldPromptThisGame = (completedGames === 1 || completedGames === 4 || completedGames === 8);

            if (!isAlreadyRated && promptCount < 3 && shouldPromptThisGame) {
                rateModal.style.display = 'flex';
                promptCount++;
                localStorage.setItem('vibewords_rate_prompt_count', promptCount.toString());
            }
        }
    }, 1500);
}

/**
 * Kategori seçim durumuna göre oyunu başlatma butonunun durumunu günceller.
 */
function updateStartButtonState() {
    const btnStart = document.getElementById('btn-start-game');
    if (btnStart) {
        if (state.selectedCategories.length > 0) {
            btnStart.classList.remove('opacity-40', 'cursor-not-allowed');
            btnStart.classList.add('active:scale-95');
        } else {
            btnStart.classList.add('opacity-40', 'cursor-not-allowed');
            btnStart.classList.remove('active:scale-95');
        }
    }
}

/**
 * Aktif oyun sırasında bahis hedefindeki kalan doğru sayısını günceller.
 */
function updatePlayingBetBadge() {
    if (!state.isBetActive) return;

    const betBadge = document.getElementById('playing-bet-badge');
    const betTargetSpan = document.getElementById('playing-bet-target');

    if (betBadge) {
        let roundCorrects = 0;
        state.roundHistory.forEach(item => {
            if (item.result === 'correct') roundCorrects++;
        });

        const remaining = state.betTarget - roundCorrects;

        const lang = state.language || 'tr';
        if (remaining > 0) {
            if (betTargetSpan) {
                betTargetSpan.textContent = locales[lang].bet_target_remaining.replace('{x}', remaining);
            }
            betBadge.className = "mt-1.5 px-2.5 py-0.5 rounded-full border border-secondary/20 bg-secondary/5 text-secondary text-[9px] tracking-wider uppercase font-medium shadow-[0_0_8px_rgba(255,155,113,0.1)] w-fit flex items-center gap-1";
        } else {
            if (betTargetSpan) {
                betTargetSpan.textContent = locales[lang].bet_target_completed;
            }
            betBadge.className = "mt-1.5 px-2.5 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-[9px] tracking-wider uppercase font-medium shadow-[0_0_12px_rgba(27,153,139,0.3)] w-fit flex items-center gap-1 animate-pulse";
        }
    }
}
