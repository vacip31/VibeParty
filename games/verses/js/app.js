/* Vibe X Verses Ana Uygulama Modülü (app.js) */

import { 
    state, 
    STATES, 
    addPlayer, 
    removePlayer, 
    setTotalRounds,
    resetGame, 
    resetGameKeepPlayers,
    initializeGameFlow, 
    nextDistributionStep, 
    submitPoetryLine, 
    confirmWritingPass,
    checkSpyGuess,
    loadGameStateFromStorage,
    clearGameStateFromStorage
} from './state.js';

import { 
    views,
    showView,
    renderSetupPlayersList, 
    renderRoleDistribution, 
    renderWritingPhase, 
    renderRevealPhase,
    renderGameOverPhase,
    populateCategoriesModal,
    showCustomAlert,
    showCustomConfirm
} from './ui.js';

import {
    initAudio,
    playVibration,
    playSuccess,
    playFailure,
    playTick,
    playTransition
} from './audio.js';

let categoriesData = [];

// Sayfa yüklendiğinde çalıştır
window.addEventListener('DOMContentLoaded', () => {
    loadCategoriesData();
    setupEventListeners();
});

/**
 * categories.json dosyasından kelime havuzunu çeker.
 */
async function loadCategoriesData() {
    try {
        const response = await fetch('./data/categories.json');
        categoriesData = await response.json();
        // Modal listesini doldur
        populateCategoriesModal(categoriesData);
    } catch (err) {
        console.error('Kategoriler yüklenirken hata oluştu:', err);
        // Çevrimdışı/Ağ hatası durumunda fallback kategori ve kelime havuzu
        categoriesData = [
            {
                "category": "Genel Kültür",
                "words": [
                    { "w": "Klavye", "synonyms": ["klavye", "tus", "bilgisayar", "yazi", "ekran"] },
                    { "w": "Futbol", "synonyms": ["futbol", "top", "kale", "mac", "oyuncu"] },
                    { "w": "İstanbul", "synonyms": ["istanbul", "bogaz", "kopru", "turkiye", "cami"] }
                ]
            }
        ];
        populateCategoriesModal(categoriesData);
    }
}

/**
 * Zamanlayıcıyı (Kum Saati) temizler.
 */
function clearWritingTimer() {
    if (state.timerIntervalId) {
        clearInterval(state.timerIntervalId);
        state.timerIntervalId = null;
    }
}

/**
 * Yazma süresini (Kum Saati) başlatır.
 */
function startWritingTimer() {
    clearWritingTimer();
    
    if (state.timerLimit <= 0) return;
    
    state.secondsRemaining = state.timerLimit;
    
    state.timerIntervalId = setInterval(() => {
        if (state.secondsRemaining > 0) {
            state.secondsRemaining--;
            
            // Son 10 saniyede her saniye dokunsal geri bildirim ve tık sesi çal
            if (state.secondsRemaining <= 10 && state.secondsRemaining > 0) {
                playVibration(15);
                playTick();
            }
            
            renderWritingPhase();
        } else {
            // SÜRE DOLDU!
            clearWritingTimer();
            playVibration([50, 30, 50]);
            playFailure();
            
            const inputArea = document.getElementById('input-poetry-verse');
            let finalLine = inputArea ? inputArea.value.trim() : "";
            
            if (!finalLine) {
                // Zaman aşımı durumunda komik ve tematik ipuçları
                const timeoutVerses = [
                    "Zaman doldu, ipucu eklenemedi... ⏳",
                    "Düşünürken süre bitti, zincir koptu... ⏳",
                    "Zamanın akışında ipucu kayboldu... ⏳",
                    "Kum saati durdu, ipucum yarım kaldı... ⏳"
                ];
                finalLine = timeoutVerses[Math.floor(Math.random() * timeoutVerses.length)];
            }
            
            // Dizeyi otomatik kaydet
            submitPoetryLine(finalLine);
            renderWritingPhase(); // Panel C'ye geçir
        }
    }, 1000);
}

/**
 * Tüm DOM etkileşimlerini bağlar.
 */
function setupEventListeners() {
    const clickEvent = 'click';
    
    // --- GENEL DOKUNSAL GERİ BİLDİRİM VE TIKLAMA SESİ (Mechanical Click) ---
    document.addEventListener(clickEvent, (e) => {
        const button = e.target.closest('button, .option-pill, [role="button"], a');
        if (button) {
            // Sık tıklanan özel sesli butonlar hariç klik sesi ve hafif titreşim tetikle
            const id = button.id;
            if (id !== 'btn-reveal-expose' && 
                id !== 'btn-submit-spy-guess' && 
                id !== 'btn-dist-seal-hold' &&
                id !== 'btn-expose-found' &&
                id !== 'btn-expose-escaped') {
                playVibration(15);
                playTick();
            }
        }
    }, { passive: true });

    // --- POPUP MODAL YÖNETİMLERİ ---
    const categoriesModal = document.getElementById('categories-modal');
    const guessModal = document.getElementById('guess-modal');
    const exposeDecisionModal = document.getElementById('expose-decision-modal');
    
    // Kategoriler Modal Aç/Kapat
    const btnOpenCategories = document.getElementById('btn-welcome-categories');
    const btnCloseCategories = document.getElementById('btn-close-categories');
    
    if (btnOpenCategories) {
        btnOpenCategories.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            categoriesModal.classList.remove('hidden');
            categoriesModal.style.display = 'flex';
        });
    }
    if (btnCloseCategories) {
        btnCloseCategories.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            categoriesModal.classList.add('hidden');
            categoriesModal.style.display = 'none';
        });
    }
    
    // Örnek Senaryo Modal Aç/Kapat
    const scenarioModal = document.getElementById('scenario-modal');
    const btnOpenScenario = document.getElementById('btn-welcome-scenario');
    const btnCloseScenario = document.getElementById('btn-close-scenario');
    
    if (btnOpenScenario && scenarioModal) {
        btnOpenScenario.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            scenarioModal.classList.remove('hidden');
            scenarioModal.style.display = 'flex';
        });
    }
    if (btnCloseScenario && scenarioModal) {
        btnCloseScenario.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            scenarioModal.classList.add('hidden');
            scenarioModal.style.display = 'none';
        });
    }
    
    // Casus Kelime Tahmin Modalı Aç/Kapat
    const btnOpenGuess = document.getElementById('btn-writing-spy-guess');
    const btnCloseGuess = document.getElementById('btn-close-guess');
    const btnSubmitSpyGuess = document.getElementById('btn-submit-spy-guess');
    const inputSpyGuess = document.getElementById('input-spy-guess-word');
    
    if (btnOpenGuess) {
        btnOpenGuess.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            if (state.spyGuessedCorrectly || state.spyGuessAttemptsThisRound >= 1) return; 
            guessModal.classList.remove('hidden');
            guessModal.style.display = 'flex';
            if (inputSpyGuess) {
                inputSpyGuess.value = '';
                inputSpyGuess.focus();
            }
        });
    }
    if (btnCloseGuess) {
        btnCloseGuess.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            guessModal.classList.add('hidden');
            guessModal.style.display = 'none';
        });
    }
    if (btnSubmitSpyGuess) {
        btnSubmitSpyGuess.addEventListener(clickEvent, async (e) => {
            e.preventDefault();
            const guess = inputSpyGuess.value;
            if (!guess.trim()) return;
            
            // Zamanlayıcıyı tahmin yaparken durdur (odaklanma kolaylığı için)
            clearWritingTimer();
            
            const correct = checkSpyGuess(guess);
            guessModal.classList.add('hidden');
            guessModal.style.display = 'none';
            
            if (correct) {
                playSuccess();
                renderWritingPhase(); // Güncelle (kelimeyi aç)
            } else {
                playFailure();
                renderWritingPhase(); // Güncelle (hakkı kilitle ve buton durumunu göster)
                await showCustomAlert('Yanlış Tahmin', 'Yanlış tahmin! Bu tur için tahmin hakkın kilitlendi.', 'lock_clock');
                // Zamanlayıcıyı geri başlat
                startWritingTimer();
            }
        });
    }

    // --- 1. EKRAN: ANA MENÜ ---
    const btnWelcomeStart = document.getElementById('btn-welcome-start');
    const btnWelcomeRules = document.getElementById('btn-welcome-rules');
    
    const btnWelcomeResume = document.getElementById('btn-welcome-resume');
    if (btnWelcomeResume) {
        if (localStorage.getItem('vibesave_verses_gamestate')) {
            btnWelcomeResume.classList.remove('hidden');
        }
        
        btnWelcomeResume.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            initAudio();
            
            const loaded = loadGameStateFromStorage();
            if (loaded) {
                if (state.currentState === STATES.ROLE_DISTRIBUTION) {
                    showView(views.roleDistribution);
                    renderRoleDistribution();
                } else if (state.currentState === STATES.WRITING) {
                    showView(views.writing);
                    renderWritingPhase();
                } else if (state.currentState === STATES.REVEAL) {
                    showView(views.reveal);
                    renderRevealPhase();
                } else if (state.currentState === STATES.GAMEOVER) {
                    showView(views.gameOver);
                    renderGameOverPhase();
                } else {
                    showView(views.setup);
                    renderSetupPlayersList(handleRemovePlayer);
                }
            }
        });
    }

    if (btnWelcomeStart) {
        btnWelcomeStart.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            clearGameStateFromStorage();
            if (btnWelcomeResume) {
                btnWelcomeResume.classList.add('hidden');
            }
            showView(views.setup);
            renderSetupPlayersList(handleRemovePlayer);
        });
    }
    if (btnWelcomeRules) {
        btnWelcomeRules.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            showView(views.rules);
        });
    }

    // --- 2. EKRAN: KURALLAR ---
    const btnRulesBack = document.getElementById('btn-rules-back');
    const btnRulesHome = document.getElementById('btn-rules-home');
    
    if (btnRulesBack) {
        btnRulesBack.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            showView(views.welcome);
        });
    }
    if (btnRulesHome) {
        btnRulesHome.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            showView(views.welcome);
        });
    }

    // --- 3. EKRAN: KURULUM EKRANI ---
    const btnSetupBack = document.getElementById('btn-setup-back');
    const formSetupAdd = document.getElementById('form-setup-add');
    const inputSetupName = document.getElementById('input-setup-name');
    const btnSetupStart = document.getElementById('btn-setup-start');
    
    const btnRound1 = document.getElementById('btn-round-1');
    const btnRound2 = document.getElementById('btn-round-2');
    const btnRound3 = document.getElementById('btn-round-3');
    
    const btnToggleDoubleSpy = document.getElementById('btn-toggle-double-spy');
    const btnTimerOff = document.getElementById('btn-timer-off');
    const btnTimer45 = document.getElementById('btn-timer-45');
    const btnTimer90 = document.getElementById('btn-timer-90');
    
    if (btnSetupBack) {
        btnSetupBack.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            showView(views.welcome);
        });
    }
    
    // Oyuncu Ekleme
    if (formSetupAdd) {
        formSetupAdd.addEventListener('submit', async (e) => {
            e.preventDefault();
            initAudio(); // Isıt
            if (state.players.length >= 8) {
                await showCustomAlert('Limit Aşıldı', 'Maksimum 8 oyuncu sınırına ulaşıldı.', 'info');
                return;
            }
            const name = inputSetupName.value;
            const res = addPlayer(name);
            
            if (res.success) {
                inputSetupName.value = '';
                renderSetupPlayersList(handleRemovePlayer);
                playVibration(20);
                playTick();
            } else {
                await showCustomAlert('Uyarı', res.error, 'warning');
            }
        });
    }
    
    function handleRemovePlayer(playerName) {
        removePlayer(playerName);
        renderSetupPlayersList(handleRemovePlayer);
        playVibration(10);
    }
    
    // Tur Sayısı Seçicileri
    const updateRoundPills = (activeBtn) => {
        [btnRound1, btnRound2, btnRound3].forEach(btn => {
            if (btn) {
                btn.className = "px-md py-xs font-label-caps text-[10px] rounded-lg transition-all text-on-surface-variant/60 hover:text-on-surface";
            }
        });
        if (activeBtn) {
            activeBtn.className = "px-md py-xs font-label-caps text-[10px] rounded-lg transition-all tab-active";
        }
    };
    if (btnRound1) {
        btnRound1.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            setTotalRounds(1);
            updateRoundPills(btnRound1);
        });
    }
    if (btnRound2) {
        btnRound2.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            setTotalRounds(2);
            updateRoundPills(btnRound2);
        });
    }
    if (btnRound3) {
        btnRound3.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            setTotalRounds(3);
            updateRoundPills(btnRound3);
        });
    }
    
    // Çift Casus Modu Toggle Tıklaması
    if (btnToggleDoubleSpy) {
        btnToggleDoubleSpy.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            if (state.players.length < 6) return;
            state.doubleSpyMode = !state.doubleSpyMode;
            playVibration(20);
            renderSetupPlayersList(handleRemovePlayer);
        });
    }
    
    // Düşünme Süresi (Zamanlayıcı) Seçicileri
    const updateTimerPills = (activeBtn) => {
        [btnTimerOff, btnTimer45, btnTimer90].forEach(btn => {
            if (btn) {
                btn.className = "px-md py-xs font-label-caps text-[10px] rounded-lg transition-all text-on-surface-variant/60 hover:text-on-surface";
            }
        });
        if (activeBtn) {
            activeBtn.className = "px-md py-xs font-label-caps text-[10px] rounded-lg transition-all tab-active";
        }
    };
    if (btnTimerOff) {
        btnTimerOff.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            state.timerLimit = 0;
            updateTimerPills(btnTimerOff);
        });
    }
    if (btnTimer45) {
        btnTimer45.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            state.timerLimit = 45;
            updateTimerPills(btnTimer45);
        });
    }
    if (btnTimer90) {
        btnTimer90.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            state.timerLimit = 90;
            updateTimerPills(btnTimer90);
        });
    }
    
    // Setup Başlat
    if (btnSetupStart) {
        btnSetupStart.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            if (state.players.length < 4 || state.players.length > 8) return;
            
            initAudio();
            const success = initializeGameFlow(categoriesData);
            if (success) {
                playVibration(45);
                renderRoleDistribution();
            }
        });
    }

    // --- 4. EKRAN: ROL DAĞITIM TÜNELİ ---
    const btnDistCancel = document.getElementById('btn-dist-cancel');
    const btnDistRevealTrigger = document.getElementById('btn-dist-reveal-trigger');
    const btnDistSealHold = document.getElementById('btn-dist-seal-hold');
    const btnDistNext = document.getElementById('btn-dist-next');
    
    // Can Simidi: Oyunu İptal Et
    if (btnDistCancel) {
        btnDistCancel.addEventListener(clickEvent, async (e) => {
            e.preventDefault();
            if (await showCustomConfirm('Oyunu İptal Et', 'Oyunu iptal etmek ve kurulum ekranına geri dönmek istiyor musunuz?', 'help')) {
                resetGameKeepPlayers();
                showView(views.setup);
                renderSetupPlayersList(handleRemovePlayer);
            }
        });
    }
    
    // Cihazı teslim aldım onayı
    if (btnDistRevealTrigger) {
        btnDistRevealTrigger.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            state.distSubState = 'B';
            renderRoleDistribution();
        });
    }
    
    // Parmak izi basılı tutma reveal logic
    if (btnDistSealHold) {
        const fillEffect = document.getElementById('dist-fill-effect');
        const rings = document.getElementById('dist-rings');
        const sealIcon = document.getElementById('dist-seal-icon');
        const roleCard = document.getElementById('dist-role-card');
        
        let revealTimeout = null;
        let triggersFired = false;
        
        const triggerReveal = (e) => {
            e.preventDefault();
            if (triggersFired) return;
            
            // Visual active state
            btnDistSealHold.classList.add('border-primary/45');
            fillEffect.style.height = '100%';
            rings.classList.remove('opacity-0');
            rings.classList.add('opacity-100');
            sealIcon.style.fontVariationSettings = "'FILL' 1";
            sealIcon.classList.add('scale-110');
            
            playVibration(25);
            
            revealTimeout = setTimeout(() => {
                roleCard.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
                roleCard.classList.add('opacity-100', 'scale-100');
            }, 300);
        };
        
        const triggerDestroy = (e) => {
            e.preventDefault();
            if (triggersFired) return;
            triggersFired = true;
            
            // Reset visuals
            btnDistSealHold.classList.remove('border-primary/45');
            fillEffect.style.height = '0%';
            rings.classList.add('opacity-0');
            rings.classList.remove('opacity-100');
            sealIcon.style.fontVariationSettings = "'FILL' 0";
            sealIcon.classList.remove('scale-110');
            
            clearTimeout(revealTimeout);
            roleCard.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
            roleCard.classList.remove('opacity-100', 'scale-100');
            
            playVibration([20, 10, 20]);
            
            // Cihazı teslim aşamasına (C) geçir
            setTimeout(() => {
                state.distSubState = 'C';
                renderRoleDistribution();
                triggersFired = false; // Reset lock for next player
            }, 100);
        };
        
        btnDistSealHold.addEventListener('pointerdown', triggerReveal);
        btnDistSealHold.addEventListener('pointerup', triggerDestroy);
        btnDistSealHold.addEventListener('pointerleave', triggerDestroy);
        
        btnDistSealHold.addEventListener('touchstart', triggerReveal, { passive: false });
        btnDistSealHold.addEventListener('touchend', triggerDestroy, { passive: false });
    }
    
    // Sıradaki oyuncuya geç
    if (btnDistNext) {
        btnDistNext.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            nextDistributionStep();
            
            if (state.currentState === STATES.ROLE_DISTRIBUTION) {
                renderRoleDistribution();
            } else if (state.currentState === STATES.WRITING) {
                // Yazım turunu başlat
                playVibration([30, 20, 30]);
                renderWritingPhase();
            }
        });
    }

    // --- 5. EKRAN: ŞİİR YAZMA EKRANI ---
    const btnWritingStartTrigger = document.getElementById('btn-writing-start-trigger');
    const inputPoetryVerse = document.getElementById('input-poetry-verse');
    const btnWritingSubmit = document.getElementById('btn-writing-submit');
    const btnWritingConfirmPass = document.getElementById('btn-writing-confirm-pass');
    
    // Yazmaya Başla (Kurye)
    if (btnWritingStartTrigger) {
        btnWritingStartTrigger.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            initAudio();
            state.isWritingTurnActive = true;
            state.writingSubState = 'B';
            playVibration(25);
            renderWritingPhase();
            
            // Düşünme süresini (Kum Saati) başlat
            startWritingTimer();
        });
    }
    
    // Can Simidi: Oyunu İptal Et (Yazma Alanı)
    const btnWritingCancel = document.getElementById('btn-writing-cancel');
    if (btnWritingCancel) {
        btnWritingCancel.addEventListener(clickEvent, async (e) => {
            e.preventDefault();
            if (await showCustomConfirm('Oyunu İptal Et', 'Mevcut oyun silinecek ve lobiye dönülecektir, emin misiniz?', 'warning')) {
                clearWritingTimer();
                resetGameKeepPlayers();
                showView(views.setup);
                renderSetupPlayersList(handleRemovePlayer);
            }
        });
    }
    
    // Input karakter limiti & Typewriter klik
    if (inputPoetryVerse) {
        inputPoetryVerse.addEventListener('input', () => {
            playTick(); // Daktilo sesi sentezle
            
            const val = inputPoetryVerse.value;
            const text = val.trim();
            
            const charsCount = text.length;
            const counter = document.getElementById('writing-char-counter');
            
            if (counter) {
                counter.textContent = `${charsCount} / 35`;
                if (charsCount >= 35) {
                    counter.classList.add('text-primary');
                } else {
                    counter.classList.remove('text-primary');
                }
            }
            
            // Validasyon
            if (charsCount > 0 && charsCount <= 35) {
                btnWritingSubmit.disabled = false;
                btnWritingSubmit.className = "w-full py-md bg-primary text-on-primary font-h2 text-h2 font-bold uppercase tracking-widest rounded-lg active:scale-[0.98] transition-all shadow-md";
            } else {
                btnWritingSubmit.disabled = true;
                btnWritingSubmit.className = "w-full py-md bg-primary-container text-on-primary font-h2 text-h2 font-bold uppercase tracking-widest opacity-40 cursor-not-allowed rounded-lg active:scale-[0.98] transition-all";
            }
        });
    }
    
    // Dize Kaydet
    if (btnWritingSubmit) {
        btnWritingSubmit.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            if (btnWritingSubmit.disabled) return;
            
            // Süreyi temizle
            clearWritingTimer();
            
            const line = inputPoetryVerse.value;
            submitPoetryLine(line);
            playVibration(30);
            renderWritingPhase(); // Panel C'ye geçer (kilitli ekran)
        });
    }
    
    // Sıradaki şaire geç onayı
    if (btnWritingConfirmPass) {
        btnWritingConfirmPass.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            confirmWritingPass();
            playTransition();
            
            if (state.currentState === STATES.WRITING) {
                renderWritingPhase();
            } else if (state.currentState === STATES.REVEAL) {
                renderRevealPhase();
            }
        });
    }

    // --- 6. EKRAN: İFŞA VE TARTIŞMA EKRANI ---
    const btnRevealReset = document.getElementById('btn-reveal-reset');
    const btnRevealExpose = document.getElementById('btn-reveal-expose');
    
    // Can Simidi: Oyunu Sıfırla
    if (btnRevealReset) {
        btnRevealReset.addEventListener(clickEvent, async (e) => {
            e.preventDefault();
            if (await showCustomConfirm('Zinciri Sıfırla', 'İpucu zincirini silmek ve lobiyi sıfırlamak istiyor musunuz?', 'warning')) {
                resetGameKeepPlayers();
                showView(views.setup);
                renderSetupPlayersList(handleRemovePlayer);
            }
        });
    }
    
    // Rolleri ifşa et (Karar onay modalını açar)
    if (btnRevealExpose) {
        btnRevealExpose.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            playVibration(20);
            exposeDecisionModal.classList.remove('hidden');
            exposeDecisionModal.style.display = 'flex';
        });
    }

    // --- İFŞA KARAR MODALI BUTONLARI ---
    const btnExposeFound = document.getElementById('btn-expose-found');
    const btnExposeEscaped = document.getElementById('btn-expose-escaped');
    const btnCloseExposeDecision = document.getElementById('btn-close-expose-decision');
    
    if (btnExposeFound) {
        btnExposeFound.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            state.spyExposedByGroup = true;
            exposeDecisionModal.classList.add('hidden');
            exposeDecisionModal.style.display = 'none';
            playSuccess();
            renderGameOverPhase();
        });
    }
    if (btnExposeEscaped) {
        btnExposeEscaped.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            state.spyExposedByGroup = false;
            exposeDecisionModal.classList.add('hidden');
            exposeDecisionModal.style.display = 'none';
            playFailure();
            renderGameOverPhase();
        });
    }
    if (btnCloseExposeDecision) {
        btnCloseExposeDecision.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            exposeDecisionModal.classList.add('hidden');
            exposeDecisionModal.style.display = 'none';
        });
    }

    // --- 7. EKRAN: SONUÇ EKRANI ---
    const btnGameOverSame = document.getElementById('btn-gameover-same-players');
    const btnGameOverNew = document.getElementById('btn-gameover-new-players');
    const btnGameOverHome = document.getElementById('btn-gameover-home');
    
    // Aynı Kadroyla Yeniden Başla
    if (btnGameOverSame) {
        btnGameOverSame.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            playVibration(40);
            resetGameKeepPlayers();
            showView(views.setup);
            renderSetupPlayersList(handleRemovePlayer);
        });
    }
    
    // Yeni Oyuncularla Başla
    if (btnGameOverNew) {
        btnGameOverNew.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            playVibration(40);
            resetGame();
            showView(views.setup);
            renderSetupPlayersList(handleRemovePlayer);
        });
    }
    
    // Ana Menüye Dön
    if (btnGameOverHome) {
        btnGameOverHome.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            playVibration(45);
            resetGame();
            showView(views.welcome);
        });
    }
    
    // Mobil Uzun Dokunuş Menü Engelleyici (Fingerprint Seal için)
    window.oncontextmenu = function(event) {
        if (event.target.closest('#btn-dist-seal-hold')) {
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
    };

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
    
    // Geri tuşu basıldığında durum temizliklerini ve sıfırlamaları yönet
    window.addEventListener('popstate', (e) => {
        clearWritingTimer();
        const stateVal = e.state;
        if (stateVal && (stateVal.view === 'welcome' || stateVal.view === 'setup')) {
            resetGameKeepPlayers();
        }
    });
}
