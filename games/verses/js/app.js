/* Vibe X Verses Ana Uygulama Modülü (app.js) */

import { 
    state, 
    STATES, 
    setTotalRounds,
    resetGame, 
    initializeGameFlow, 
    startWritingRound,
    assignRandomVerses,
    checkSpyGuess,
    syncStateFromFirebase,
    calculateScores
} from './state.js';

import { 
    views,
    showView,
    renderLobbyPhase,
    renderRoleDistribution, 
    renderWritingPhase, 
    renderReadingPhase,
    renderInterrogationPhase,
    clearInterrogationTimer,
    populateDetectiveModal,
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

import {
    loadFirebase,
    isFirebaseInitialized,
    dbCreateRoom,
    dbJoinRoom,
    dbListenToRoom,
    dbUpdateRoom,
    dbDestroyRoom,
    dbLeaveRoom
} from './firebase.js';

let categoriesData = [];
let unsubscribeRoom = null;


// ES modülleri deferred olarak çalışır — DOM her zaman hazırdır, DOMContentLoaded gerekmez.
loadCategoriesData();

try {
    setupEventListeners();
    console.log("✅ Event Listeners kuruldu.");
} catch (err) {
    console.error("❌ setupEventListeners HATA:", err);
}

// Eğer tarayıcıda aktif bir oda bilgisi kaldıysa temizle (temiz başlangıç)
sessionStorage.removeItem("verses_room_code");
sessionStorage.removeItem("verses_player_id");
sessionStorage.removeItem("verses_is_host");


/**
 * categories.json dosyasından kelime havuzunu çeker.
 */
async function loadCategoriesData() {
    try {
        const response = await fetch('./data/categories.json');
        categoriesData = await response.json();
        populateCategoriesModal(categoriesData);
        renderCategoryPills(categoriesData);
    } catch (err) {
        console.error('Kategoriler yüklenirken hata oluştu:', err);
        // Fallback
        categoriesData = [
            {
                "category": "Genel Kültür",
                "words": [
                    { "w": "Klavye", "synonyms": ["klavye", "tus", "bilgisayar"] },
                    { "w": "Futbol", "synonyms": ["futbol", "top", "kale"] },
                    { "w": "İstanbul", "synonyms": ["istanbul", "bogaz", "kopru"] }
                ]
            }
        ];
        populateCategoriesModal(categoriesData);
    }
}

/**
 * Yazma süresini (Kum Saati) başlatır.
 */
function clearWritingTimer() {
    if (state.timerIntervalId) {
        clearInterval(state.timerIntervalId);
        state.timerIntervalId = null;
    }
}

function startWritingTimer() {
    clearWritingTimer();
    
    if (state.timerLimit <= 0) return;
    
    state.secondsRemaining = state.timerLimit;
    
    state.timerIntervalId = setInterval(() => {
        if (state.secondsRemaining > 0) {
            state.secondsRemaining--;
            
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
                const timeoutVerses = [
                    "Zaman doldu, ipucu eklenemedi... ⏳",
                    "Düşünürken süre bitti, zincir koptu... ⏳",
                    "Zamanın akışında ipucu kayboldu... ⏳",
                    "Kum saati durdu, ipucum yarım kaldı... ⏳"
                ];
                finalLine = timeoutVerses[Math.floor(Math.random() * timeoutVerses.length)];
            }
            
            submitPlayerVerse(finalLine);
        }
    }, 1000);
}

/**
 * Mısrayı veritabanına gönderir.
 */
async function submitPlayerVerse(line) {
    const updates = {
        [`verses/${state.myPlayerId}`]: line.trim(),
        [`players/${state.myPlayerId}/submitted`]: true
    };
    await dbUpdateRoom(state.roomCode, updates);
}

/**
 * Setup ekranındaki kategori pill'lerini doldurur.
 */
function renderCategoryPills(categories) {
    const container = document.getElementById('setup-category-pills');
    if (!container) return;

    container.innerHTML = '';

    const randomBtn = document.createElement('button');
    randomBtn.type = 'button';
    randomBtn.dataset.category = 'random';
    randomBtn.className = 'category-pill px-sm py-xs font-label-caps text-[10px] rounded-full border border-outline-variant/30 text-on-surface-variant/70 transition-all active:scale-95 hover:border-primary/50 hover:text-on-surface';
    randomBtn.textContent = '🎲 Rastgele';
    container.appendChild(randomBtn);

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.category = cat.category;
        btn.className = 'category-pill px-sm py-xs font-label-caps text-[10px] rounded-full border border-outline-variant/30 text-on-surface-variant/70 transition-all active:scale-95 hover:border-primary/50 hover:text-on-surface';
        btn.textContent = cat.category;
        container.appendChild(btn);
    });

    container.addEventListener('click', (e) => {
        const pill = e.target.closest('.category-pill');
        if (!pill) return;
        container.querySelectorAll('.category-pill').forEach(p => {
            p.className = 'category-pill px-sm py-xs font-label-caps text-[10px] rounded-full border border-outline-variant/30 text-on-surface-variant/70 transition-all active:scale-95 hover:border-primary/50 hover:text-on-surface';
        });
        pill.className = 'category-pill px-sm py-xs font-label-caps text-[10px] rounded-full border border-primary bg-primary/20 text-primary transition-all active:scale-95';
        state.selectedCategory = (pill.dataset.category === 'random') ? null : pill.dataset.category;
    });
}

/**
 * Firebase Realtime Database oda durum dinleyicisi
 */
async function setupRoomListener(roomCode) {
    if (unsubscribeRoom) {
        unsubscribeRoom();
    }
    
    unsubscribeRoom = await dbListenToRoom(roomCode, (roomData) => {
        if (!roomData) {
            // Oda silindiyse veya host ayrıldıysa lobiye/ana menüye at
            if (state.currentState !== STATES.WELCOME) {
                clearWritingTimer();
                clearInterrogationTimer();
                resetGame();
                showView(views.welcome);
                showCustomAlert("Oda Kapatıldı", "Oda kurucusu oyundan ayrıldı veya oda kapatıldı.", "info");
            }
            return;
        }
        
        const oldState = state.currentState;
        syncStateFromFirebase(roomData);
        
        // Host-özel otomatik durum geçişlerini yönet (Sadece Host çalıştırır)
        if (state.isHost) {
            handleHostStateTransitions();
        }
        
        // Yeni duruma göre arayüzü render et
        renderCurrentStateView(oldState);
    });
}

/**
 * Host'un otomatik durum geçişlerini yönettiği yer.
 */
function handleHostStateTransitions() {
    const playerEntries = Object.entries(state.playersRaw);
    const totalCount = playerEntries.length;
    
    if (state.currentState === STATES.ROLE_DISTRIBUTION) {
        // Herkes rolünü okuyup "hazırım" dedi mi?
        const allReady = playerEntries.every(([id, p]) => p.isReady);
        if (allReady && totalCount >= 4) {
            startWritingRound(); // Yazma aşamasını başlat
        }
    } else if (state.currentState === STATES.WRITING) {
        // Herkes mısrasını gönderdi mi?
        const allSubmitted = playerEntries.every(([id, p]) => p.submitted);
        if (allSubmitted && totalCount >= 4) {
            assignRandomVerses(); // Okuma aşamasını başlat
        }
    } else if (state.currentState === STATES.READING) {
        // Herkes mısrayı okuyup hazır oldu mu?
        const allReady = playerEntries.every(([id, p]) => p.isReady);
        if (allReady && totalCount >= 4) {
            const prompt = generateInterrogationPrompt();
            dbUpdateRoom(state.roomCode, {
                currentState: STATES.INTERROGATION,
                "interrogation/prompt": prompt
            });
        }
    }
}

/**
 * Rastgele sorgu yönlendirmesi üretir.
 */
const INTERROGATION_PROMPTS = [
    "{P1}, {P2} oyuncusunun yazdığı ipucunun gizli kelimeyle alakasını sorgulasın! 🧐",
    "{P1}, {P2} oyuncusundan ipucundaki şüpheli detayı açıklamasını istesin! 🔍",
    "{P1}, casusun ipucu zincirine nasıl sızdığına dair teorisini açıklasın! 🕵️‍♂️",
    "{P1}, {P2} oyuncusunun yazdığı cümlenin kelimeyi ele verip vermediğini tartışsın! 💬",
    "{P1}, şu an en çok kimden şüphelendiğini ve nedenini açıklasın! 🤔",
    "Casus(lar) kendini gizlemek için nasıl bir taktik izlemiş olabilir? Tartışın! 🤫",
    "{P1}, {P2} oyuncusunun son yazdığı ipucu hakkında dedektiflik yapsın! 🖋️"
];

function generateInterrogationPrompt() {
    if (state.players.length >= 2) {
        const idx1 = Math.floor(Math.random() * state.players.length);
        let idx2 = Math.floor(Math.random() * state.players.length);
        while (idx2 === idx1) {
            idx2 = Math.floor(Math.random() * state.players.length);
        }
        const p1 = state.players[idx1];
        const p2 = state.players[idx2];
        
        const randomTemplate = INTERROGATION_PROMPTS[Math.floor(Math.random() * INTERROGATION_PROMPTS.length)];
        return randomTemplate.replace(/{P1}/g, p1).replace(/{P2}/g, p2);
    }
    return "Casus(lar) kendini gizlemek için nasıl bir taktik izlemiş olabilir? Tartışın! 🤫";
}

/**
 * Yeni duruma göre arayüz görünümlerini kontrol eder.
 */
function renderCurrentStateView(oldState) {
    switch (state.currentState) {
        case STATES.WELCOME:
            showView(views.welcome);
            break;
        case STATES.SETUP:
            showView(views.setup);
            break;
        case STATES.LOBBY:
            renderLobbyPhase();
            break;
        case STATES.ROLE_DISTRIBUTION:
            renderRoleDistribution();
            break;
        case STATES.WRITING:
            renderWritingPhase();
            // Yeni yazma aşamasına geçildiyse ve ben henüz yazmadıysam zamanlayıcıyı başlat
            if (oldState !== STATES.WRITING) {
                const myData = state.playersRaw[state.myPlayerId];
                if (myData && !myData.submitted) {
                    const textarea = document.getElementById('input-poetry-verse');
                    if (textarea) textarea.value = '';
                    startWritingTimer();
                }
            }
            break;
        case STATES.READING:
            renderReadingPhase();
            break;
        case STATES.INTERROGATION:
            renderInterrogationPhase();
            break;
        case STATES.REVEAL:
            renderRevealPhase();
            break;
        case STATES.GAMEOVER:
            renderGameOverPhase();
            break;
    }
}

/**
 * Tüm DOM etkileşimlerini bağlar.
 */
function setupEventListeners() {
    const clickEvent = 'click';
    
    // Genel tık sesi
    document.addEventListener(clickEvent, (e) => {
        const button = e.target.closest('button, .option-pill, [role="button"], a');
        if (button) {
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

    // Popuplar
    const categoriesModal = document.getElementById('categories-modal');
    const guessModal = document.getElementById('guess-modal');
    const exposeDecisionModal = document.getElementById('expose-decision-modal');
    const scenarioModal = document.getElementById('scenario-modal');
    
    // Kategoriler
    const btnOpenCategories = document.getElementById('btn-welcome-categories');
    const btnCloseCategories = document.getElementById('btn-close-categories');
    if (btnOpenCategories && categoriesModal) {
        btnOpenCategories.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            categoriesModal.classList.remove('hidden');
            categoriesModal.style.display = 'flex';
        });
    } else if (btnOpenCategories) {
        // Modal yok ama butona basıldı - debug
        console.warn('categories-modal elementi bulunamadı!');
        btnOpenCategories.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            alert('Kategori modalı yüklenemedi.');
        });
    }
    if (btnCloseCategories && categoriesModal) {
        btnCloseCategories.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            categoriesModal.classList.add('hidden');
            categoriesModal.style.display = 'none';
        });
    }
    
    // Örnek Senaryo
    const btnOpenScenario = document.getElementById('btn-welcome-scenario');
    const btnCloseScenario = document.getElementById('btn-close-scenario');
    if (btnOpenScenario && scenarioModal) {
        btnOpenScenario.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            scenarioModal.classList.remove('hidden');
            scenarioModal.style.display = 'flex';
        });
    } else if (btnOpenScenario) {
        console.warn('scenario-modal elementi bulunamadı!');
        btnOpenScenario.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            alert('Senaryo modalı yüklenemedi.');
        });
    }
    if (btnCloseScenario && scenarioModal) {
        btnCloseScenario.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            scenarioModal.classList.add('hidden');
            scenarioModal.style.display = 'none';
        });
    }
    
    // Casus Kelime Tahmin Modalı
    const btnOpenGuess = document.getElementById('btn-writing-spy-guess');
    const btnCloseGuess = document.getElementById('btn-close-guess');
    const btnSubmitSpyGuess = document.getElementById('btn-submit-spy-guess');
    const inputSpyGuess = document.getElementById('input-spy-guess-word');
    
    if (btnOpenGuess) {
        btnOpenGuess.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            if (state.spyGuessedCorrectly) return; 
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
            guessModal.style.display = 'none';
        });
    }
    const btnCloseGuessCancel = document.getElementById('btn-close-guess-cancel');
    if (btnCloseGuessCancel) {
        btnCloseGuessCancel.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            guessModal.style.display = 'none';
        });
    }
    if (btnSubmitSpyGuess) {
        btnSubmitSpyGuess.addEventListener(clickEvent, async (e) => {
            e.preventDefault();
            const guess = inputSpyGuess.value;
            if (!guess.trim()) return;
            
            clearWritingTimer();
            const correct = checkSpyGuess(guess);
            guessModal.classList.add('hidden');
            guessModal.style.display = 'none';
            
            if (correct) {
                playSuccess();
                await showCustomAlert('Tebrikler', 'Gizli kelimeyi doğru tahmin ettin!', 'emoji_emotions');
            } else {
                await showCustomAlert('Yanlış Tahmin', 'Yanlış tahmin! Casus blöf yapmaya devam etmeli.', 'warning');
                startWritingTimer();
            }
        });
    }

    // Dedektif Sorgu Ekranı olayları
    const btnOpenDetective = document.getElementById('btn-writing-detective-skill');
    const btnCloseDetective = document.getElementById('btn-stealth-detective-cancel');
    const btnSubmitDetectiveQuery = document.getElementById('btn-stealth-detective-query');
    const selectDetectivePlayer = document.getElementById('stealth-detective-select');
    const boxDetectiveResult = document.getElementById('stealth-detective-result');
    
    const writingInputWrapper = document.getElementById('writing-input-wrapper');
    const writingDetectiveWrapper = document.getElementById('writing-detective-wrapper');
    const btnWritingSubmit = document.getElementById('btn-writing-submit');
    const writingDetectiveActions = document.getElementById('writing-detective-actions');

    if (btnOpenDetective) {
        btnOpenDetective.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            playVibration(20);
            populateDetectiveModal();
            
            if (writingInputWrapper) writingInputWrapper.classList.add('hidden');
            if (writingDetectiveWrapper) writingDetectiveWrapper.classList.remove('hidden');
            if (btnWritingSubmit) btnWritingSubmit.classList.add('hidden');
            if (writingDetectiveActions) writingDetectiveActions.classList.remove('hidden');
            
            if (boxDetectiveResult) {
                boxDetectiveResult.classList.add('hidden');
                boxDetectiveResult.textContent = 'Sorgulanıyor...';
            }
        });
    }

    if (btnCloseDetective) {
        btnCloseDetective.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            if (writingInputWrapper) writingInputWrapper.classList.remove('hidden');
            if (writingDetectiveWrapper) writingDetectiveWrapper.classList.add('hidden');
            if (btnWritingSubmit) btnWritingSubmit.classList.remove('hidden');
            if (writingDetectiveActions) writingDetectiveActions.classList.add('hidden');
        });
    }

    if (btnSubmitDetectiveQuery) {
        btnSubmitDetectiveQuery.addEventListener(clickEvent, async (e) => {
            e.preventDefault();
            const targetPlayerName = selectDetectivePlayer.value;
            if (!targetPlayerName) return;

            playVibration([40, 20, 40]);
            
            state.hasDetectiveUsedSkill = true;
            
            // Firebase'de yeteneği kullanıldı işaretle
            dbUpdateRoom(state.roomCode, {
                [`players/${state.myPlayerId}/hasDetectiveUsedSkill`]: true
            });
            
            // İsme karşılık gelen oyuncunun verisini bul
            const targetPlayerId = Object.keys(state.playersRaw).find(id => state.playersRaw[id].name === targetPlayerName);
            const targetData = state.playersRaw[targetPlayerId] || {};
            
            const isSpy = targetData.role === "Casus";
            const isInformant = targetData.role === "Köstebek";
            
            if (boxDetectiveResult) {
                boxDetectiveResult.classList.remove('hidden');
                if (isSpy) {
                    boxDetectiveResult.innerHTML = `⚠️ <span class="text-error font-bold">${targetPlayerName}</span> şüpheli bulundu! (Rolü: Casus 🤫)`;
                    boxDetectiveResult.className = "text-sm font-semibold tracking-wide py-xs px-md rounded-lg animate-pulse text-error bg-error/10 border border-error/20";
                } else if (isInformant) {
                    boxDetectiveResult.innerHTML = `⚠️ <span class="text-error font-bold">${targetPlayerName}</span> şüpheli bulundu! (Rolü: Köstebek 😈)`;
                    boxDetectiveResult.className = "text-sm font-semibold tracking-wide py-xs px-md rounded-lg animate-pulse text-error bg-error/10 border border-error/20";
                } else {
                    boxDetectiveResult.innerHTML = `✅ <span class="text-[#10b981] font-bold">${targetPlayerName}</span> temiz bulundu. (Rolü: Güvenilir)`;
                    boxDetectiveResult.className = "text-sm font-semibold tracking-wide py-xs px-md rounded-lg text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20";
                }
            }

            if (btnOpenDetective) {
                btnOpenDetective.classList.add('hidden');
            }

            setTimeout(() => {
                if (writingInputWrapper) writingInputWrapper.classList.remove('hidden');
                if (writingDetectiveWrapper) writingDetectiveWrapper.classList.add('hidden');
                if (btnWritingSubmit) btnWritingSubmit.classList.remove('hidden');
                if (writingDetectiveActions) writingDetectiveActions.classList.add('hidden');
            }, 3500);
        });
    }

    // --- EKRAN 1: WELCOME / GİRİŞ ---
    const btnCreateRoom = document.getElementById('btn-welcome-create-room');
    const btnJoinRoom = document.getElementById('btn-welcome-join-room');
    const btnRules = document.getElementById('btn-welcome-rules');
    const inputWelcomeName = document.getElementById('input-welcome-name');
    const inputWelcomeRoomCode = document.getElementById('input-welcome-room-code');

    if (btnCreateRoom) {
        btnCreateRoom.addEventListener(clickEvent, async (e) => {
            e.preventDefault();
            const name = inputWelcomeName.value.trim();
            if (!name) {
                await showCustomAlert('Giriş Hatası', 'Lütfen oda kurmak için önce adınızı yazın.', 'warning');
                inputWelcomeName.focus();
                return;
            }
            
            const firebaseReady = isFirebaseInitialized || await loadFirebase();
            if (!firebaseReady) {
                await showCustomAlert('Bağlantı Yok', 'Firebase bağlantısı kurulamadı. Lütfen API bilgilerini ayarlayın.', 'cloud_off');
                return;
            }
            
            initAudio();
            // Ayarlar ekranına (view-setup) yönlendir. Host burada oda ayarlarını seçecek.
            showView(views.setup);
        });
    }

    if (btnJoinRoom) {
        btnJoinRoom.addEventListener(clickEvent, async (e) => {
            e.preventDefault();
            const name = inputWelcomeName.value.trim();
            const code = inputWelcomeRoomCode.value.trim().toUpperCase();
            
            if (!name) {
                await showCustomAlert('Giriş Hatası', 'Lütfen odaya katılmak için adınızı yazın.', 'warning');
                inputWelcomeName.focus();
                return;
            }
            if (code.length !== 4) {
                await showCustomAlert('Giriş Hatası', 'Lütfen 4 haneli oda kodunu girin.', 'warning');
                inputWelcomeRoomCode.focus();
                return;
            }
            
            initAudio();
            const res = await dbJoinRoom(code, name);
            if (res.success) {
                setupRoomListener(code);
            } else {
                await showCustomAlert('Katılım Başarısız', res.error, 'error');
            }
        });
    }

    if (btnRules) {
        btnRules.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            showView(views.rules);
        });
    }

    // --- EKRAN 2: NASIL OYNANIR ---
    const btnRulesBack = document.getElementById('btn-rules-back');
    const btnRulesHome = document.getElementById('btn-rules-home');
    if (btnRulesBack) btnRulesBack.addEventListener(clickEvent, (e) => { e.preventDefault(); showView(views.welcome); });
    if (btnRulesHome) btnRulesHome.addEventListener(clickEvent, (e) => { e.preventDefault(); showView(views.welcome); });

    // --- EKRAN 3: KURULUM AYARLARI (Sadece Host) ---
    const btnSetupBack = document.getElementById('btn-setup-back');
    const btnSetupCreateRoom = document.getElementById('btn-setup-create-room');
    const btnRound1 = document.getElementById('btn-round-1');
    const btnRound2 = document.getElementById('btn-round-2');
    const btnRound3 = document.getElementById('btn-round-3');
    const btnToggleDoubleSpy = document.getElementById('btn-toggle-double-spy');
    const btnTimerOff = document.getElementById('btn-timer-off');
    const btnTimer45 = document.getElementById('btn-timer-45');
    const btnTimer90 = document.getElementById('btn-timer-90');

    if (btnSetupBack) btnSetupBack.addEventListener(clickEvent, (e) => { e.preventDefault(); showView(views.welcome); });

    const updateRoundPills = (activeBtn) => {
        [btnRound1, btnRound2, btnRound3].forEach(btn => {
            if (btn) btn.className = "px-md py-xs font-label-caps text-[10px] rounded-lg transition-all text-on-surface-variant/60 hover:text-on-surface";
        });
        if (activeBtn) activeBtn.className = "px-md py-xs font-label-caps text-[10px] rounded-lg transition-all tab-active";
    };
    if (btnRound1) btnRound1.addEventListener(clickEvent, (e) => { e.preventDefault(); setTotalRounds(1); updateRoundPills(btnRound1); });
    if (btnRound2) btnRound2.addEventListener(clickEvent, (e) => { e.preventDefault(); setTotalRounds(2); updateRoundPills(btnRound2); });
    if (btnRound3) btnRound3.addEventListener(clickEvent, (e) => { e.preventDefault(); setTotalRounds(3); updateRoundPills(btnRound3); });

    // Çift casus butonu (Görsel toggle işlemi)
    if (btnToggleDoubleSpy) {
        btnToggleDoubleSpy.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            state.doubleSpyMode = !state.doubleSpyMode;
            playVibration(20);
            
            const btnToggleDoubleSpyKnob = document.getElementById('btn-toggle-double-spy-knob');
            if (state.doubleSpyMode) {
                btnToggleDoubleSpy.classList.remove('bg-outline-variant/30');
                btnToggleDoubleSpy.classList.add('bg-primary');
                btnToggleDoubleSpyKnob.classList.remove('translate-x-0', 'bg-on-surface-variant/60');
                btnToggleDoubleSpyKnob.classList.add('translate-x-6', 'bg-on-primary');
            } else {
                btnToggleDoubleSpy.classList.add('bg-outline-variant/30');
                btnToggleDoubleSpy.classList.remove('bg-primary');
                btnToggleDoubleSpyKnob.classList.add('translate-x-0', 'bg-on-surface-variant/60');
                btnToggleDoubleSpyKnob.classList.remove('translate-x-6', 'bg-on-primary');
            }
        });
    }

    const updateTimerPills = (activeBtn) => {
        [btnTimerOff, btnTimer45, btnTimer90].forEach(btn => {
            if (btn) btn.className = "px-md py-xs font-label-caps text-[10px] rounded-lg transition-all text-on-surface-variant/60 hover:text-on-surface";
        });
        if (activeBtn) activeBtn.className = "px-md py-xs font-label-caps text-[10px] rounded-lg transition-all tab-active";
    };
    if (btnTimerOff) btnTimerOff.addEventListener(clickEvent, (e) => { e.preventDefault(); state.timerLimit = 0; updateTimerPills(btnTimerOff); });
    if (btnTimer45) btnTimer45.addEventListener(clickEvent, (e) => { e.preventDefault(); state.timerLimit = 45; updateTimerPills(btnTimer45); });
    if (btnTimer90) btnTimer90.addEventListener(clickEvent, (e) => { e.preventDefault(); state.timerLimit = 90; updateTimerPills(btnTimer90); });

    if (btnSetupCreateRoom) {
        btnSetupCreateRoom.addEventListener(clickEvent, async (e) => {
            e.preventDefault();
            const hostName = inputWelcomeName.value.trim();
            
            // 4 Haneli rastgele oda kodu üret
            const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
            
            // Firebase'de odayı başlat
            const res = await dbCreateRoom(roomCode, hostName, {
                category: state.category || "Ofis Çilesi & Beyaz Yaka",
                selectedCategory: state.selectedCategory,
                totalRounds: state.totalRounds || 2,
                timerLimit: state.timerLimit || 0,
                doubleSpyMode: state.doubleSpyMode || false
            });
            
            if (res.success) {
                setupRoomListener(roomCode);
            } else {
                await showCustomAlert('Hata', res.error, 'error');
            }
        });
    }

    // --- EKRAN 3.5: LOBİ İŞLEMLERİ ---
    const btnLobbyLeave = document.getElementById('btn-lobby-leave');
    const btnLobbyReady = document.getElementById('btn-lobby-ready');
    const btnLobbyStart = document.getElementById('btn-lobby-start');

    if (btnLobbyLeave) {
        btnLobbyLeave.addEventListener(clickEvent, async (e) => {
            e.preventDefault();
            if (await showCustomConfirm('Lobiden Ayrıl', 'Odayı kapatmak veya ayrılmak istediğinizden emin misiniz?', 'warning')) {
                if (unsubscribeRoom) unsubscribeRoom();
                if (state.isHost) {
                    await dbDestroyRoom(state.roomCode);
                } else {
                    await dbLeaveRoom(state.roomCode, state.myPlayerId);
                }
                resetGame();
                showView(views.welcome);
            }
        });
    }

    if (btnLobbyReady) {
        btnLobbyReady.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            const currentReady = state.playersRaw[state.myPlayerId]?.isReady || false;
            dbUpdateRoom(state.roomCode, {
                [`players/${state.myPlayerId}/isReady`]: !currentReady
            });
        });
    }

    if (btnLobbyStart) {
        btnLobbyStart.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            // Host oyunu resmen başlatır, rolleri dağıtır
            initializeGameFlow(categoriesData);
        });
    }

    // --- EKRAN 4: ROL DAĞITIM EKLEMLERİ ---
    const btnDistSealHold = document.getElementById('btn-dist-seal-hold');
    const btnDistReady = document.getElementById('btn-dist-ready');
    const btnDistCancel = document.getElementById('btn-dist-cancel');

    if (btnDistCancel) {
        btnDistCancel.addEventListener(clickEvent, async (e) => {
            e.preventDefault();
            if (await showCustomConfirm('Oyunu İptal Et', 'Oyun sonlandırılacak ve lobiye dönülecektir, emin misiniz?', 'warning')) {
                if (state.isHost) {
                    dbUpdateRoom(state.roomCode, { currentState: STATES.LOBBY });
                }
            }
        });
    }

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
            
            btnDistSealHold.classList.add('border-primary/45');
            if (fillEffect) fillEffect.style.height = '100%';
            if (rings) {
                rings.classList.remove('opacity-0');
                rings.classList.add('opacity-100');
            }
            if (sealIcon) {
                sealIcon.style.fontVariationSettings = "'FILL' 1";
                sealIcon.classList.add('scale-110');
            }
            
            playVibration(25);
            
            revealTimeout = setTimeout(() => {
                if (roleCard) {
                    roleCard.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
                    roleCard.classList.add('opacity-100', 'scale-100');
                }
                const hint = document.getElementById('dist-hold-hint');
                if (hint) hint.style.visibility = 'hidden';
            }, 300);
        };
        
        const triggerDestroy = (e) => {
            e.preventDefault();
            if (triggersFired) return;
            triggersFired = true;
            
            btnDistSealHold.classList.remove('border-primary/45');
            if (fillEffect) fillEffect.style.height = '0%';
            if (rings) {
                rings.classList.add('opacity-0');
                rings.classList.remove('opacity-100');
            }
            if (sealIcon) {
                sealIcon.style.fontVariationSettings = "'FILL' 0";
                sealIcon.classList.remove('scale-110');
            }
            
            clearTimeout(revealTimeout);
            if (roleCard) {
                roleCard.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
                roleCard.classList.remove('opacity-100', 'scale-100');
            }
            const hint = document.getElementById('dist-hold-hint');
            if (hint) hint.style.visibility = 'visible';
            
            playVibration([20, 10, 20]);
            
            // Parmağını bıraktığı an Panel C'ye geçir
            setTimeout(() => {
                const panelB = document.getElementById('dist-panel-b');
                const panelC = document.getElementById('dist-panel-c');
                if (panelB) panelB.classList.add('hidden');
                if (panelC) panelC.classList.remove('hidden');
                triggersFired = false;
            }, 100);
        };
        
        btnDistSealHold.addEventListener('pointerdown', triggerReveal);
        btnDistSealHold.addEventListener('pointerup', triggerDestroy);
        btnDistSealHold.addEventListener('pointerleave', triggerDestroy);
        btnDistSealHold.addEventListener('touchstart', triggerReveal, { passive: false });
        btnDistSealHold.addEventListener('touchend', triggerDestroy, { passive: false });
    }

    if (btnDistReady) {
        btnDistReady.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            dbUpdateRoom(state.roomCode, {
                [`players/${state.myPlayerId}/isReady`]: true
            });
        });
    }

    // --- EKRAN 5: ŞİİR YAZMA ---
    const inputPoetryVerse = document.getElementById('input-poetry-verse');
    const btnWritingCancel = document.getElementById('btn-writing-cancel');

    if (btnWritingCancel) {
        btnWritingCancel.addEventListener(clickEvent, async (e) => {
            e.preventDefault();
            if (await showCustomConfirm('Oyunu İptal Et', 'Oyun iptal edilecek ve lobiye dönülecektir, emin misiniz?', 'warning')) {
                clearWritingTimer();
                if (state.isHost) {
                    dbUpdateRoom(state.roomCode, { currentState: STATES.LOBBY });
                }
            }
        });
    }

    if (inputPoetryVerse) {
        inputPoetryVerse.addEventListener('input', () => {
            playTick();
            const text = inputPoetryVerse.value.trim();
            const charsCount = text.length;
            const counter = document.getElementById('writing-char-counter');
            
            if (counter) {
                counter.textContent = `${charsCount} / 35`;
                if (charsCount >= 35) counter.classList.add('text-primary');
                else counter.classList.remove('text-primary');
            }
            
            if (btnWritingSubmit) {
                if (charsCount > 0 && charsCount <= 35) {
                    btnWritingSubmit.disabled = false;
                    btnWritingSubmit.className = "w-full py-md bg-primary text-on-primary font-h2 text-h2 font-bold uppercase tracking-widest rounded-lg active:scale-[0.98] transition-all shadow-md";
                } else {
                    btnWritingSubmit.disabled = true;
                    btnWritingSubmit.className = "w-full py-md bg-primary-container text-on-primary font-h2 text-h2 font-bold uppercase tracking-widest opacity-40 cursor-not-allowed rounded-lg active:scale-[0.98] transition-all";
                }
            }
        });
    }

    if (btnWritingSubmit) {
        btnWritingSubmit.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            if (btnWritingSubmit.disabled) return;
            
            clearWritingTimer();
            const line = inputPoetryVerse.value;
            submitPlayerVerse(line);
            playVibration(30);
        });
    }

    // --- EKRAN 5.2: MISRA İNCELEME (OKUMA) ---
    const btnReadingReady = document.getElementById('btn-reading-ready');
    if (btnReadingReady) {
        btnReadingReady.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            dbUpdateRoom(state.roomCode, {
                [`players/${state.myPlayerId}/isReady`]: true
            });
        });
    }

    // --- EKRAN 5.5: SORGU ODASI ---
    const btnInterrogationSkip = document.getElementById('btn-interrogation-skip');
    if (btnInterrogationSkip) {
        btnInterrogationSkip.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            if (state.isHost) {
                clearInterrogationTimer();
                dbUpdateRoom(state.roomCode, { currentState: STATES.REVEAL });
            }
        });
    }

    // --- EKRAN 6: İFŞA VE TARTIŞMA ---
    const btnRevealReset = document.getElementById('btn-reveal-reset');
    const btnRevealExpose = document.getElementById('btn-reveal-expose');
    const btnExposeFound = document.getElementById('btn-expose-found');
    const btnExposeEscaped = document.getElementById('btn-expose-escaped');
    const btnCloseExposeDecision = document.getElementById('btn-close-expose-decision');

    if (btnRevealReset) {
        btnRevealReset.addEventListener(clickEvent, async (e) => {
            e.preventDefault();
            if (await showCustomConfirm('Zinciri Sıfırla', 'Lobiye dönmek istiyor musunuz?', 'warning')) {
                if (state.isHost) {
                    dbUpdateRoom(state.roomCode, { currentState: STATES.LOBBY });
                }
            }
        });
    }

    if (btnRevealExpose) {
        btnRevealExpose.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            if (!state.isHost) return;
            playVibration(20);
            if (exposeDecisionModal) {
                exposeDecisionModal.classList.remove('hidden');
                exposeDecisionModal.style.display = 'flex';
            }
        });
    }

    if (btnExposeFound) {
        btnExposeFound.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            if (!state.isHost) return;
            
            exposeDecisionModal.classList.add('hidden');
            exposeDecisionModal.style.display = 'none';
            
            // Firebase'de oylama sonucunu kaydet
            dbUpdateRoom(state.roomCode, {
                "results/spyExposedByGroup": true,
                currentState: STATES.GAMEOVER
            });
            playSuccess();
        });
    }
    
    if (btnExposeEscaped) {
        btnExposeEscaped.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            if (!state.isHost) return;
            
            exposeDecisionModal.classList.add('hidden');
            exposeDecisionModal.style.display = 'none';
            
            dbUpdateRoom(state.roomCode, {
                "results/spyExposedByGroup": false,
                currentState: STATES.GAMEOVER
            });
            playFailure();
        });
    }
    
    if (btnCloseExposeDecision) {
        btnCloseExposeDecision.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            exposeDecisionModal.classList.add('hidden');
            exposeDecisionModal.style.display = 'none';
        });
    }

    // --- EKRAN 7: OYUN SONU (GAMEOVER) ---
    const btnGameOverSame = document.getElementById('btn-gameover-same-players');
    const btnGameOverNew = document.getElementById('btn-gameover-new-players');
    const btnGameOverHome = document.getElementById('btn-gameover-home');

    if (btnGameOverSame) {
        btnGameOverSame.addEventListener(clickEvent, (e) => {
            e.preventDefault();
            if (!state.isHost) return;
            
            playVibration(40);
            
            // Oyuncu durumlarını sıfırla
            const updatedPlayers = {};
            Object.entries(state.playersRaw).forEach(([id, p]) => {
                updatedPlayers[id] = {
                    name: p.name,
                    score: p.score || 0,
                    isReady: false,
                    submitted: false,
                    role: "LOBBY"
                };
            });
            
            dbUpdateRoom(state.roomCode, {
                currentState: STATES.LOBBY,
                players: updatedPlayers,
                verses: {},
                readingAssignments: {},
                results: {
                    spyExposedByGroup: false,
                    spyGuessedCorrectly: false,
                    spyGuessText: ""
                }
            });
        });
    }

    if (btnGameOverNew) {
        btnGameOverNew.addEventListener(clickEvent, async (e) => {
            e.preventDefault();
            if (!state.isHost) return;
            
            playVibration(40);
            await dbDestroyRoom(state.roomCode);
            if (unsubscribeRoom) unsubscribeRoom();
            resetGame();
            showView(views.welcome);
        });
    }

    if (btnGameOverHome) {
        btnGameOverHome.addEventListener(clickEvent, async (e) => {
            e.preventDefault();
            playVibration(45);
            
            if (state.isHost) {
                await dbDestroyRoom(state.roomCode);
            } else {
                await dbLeaveRoom(state.roomCode, state.myPlayerId);
            }
            
            if (unsubscribeRoom) unsubscribeRoom();
            resetGame();
            showView(views.welcome);
        });
    }

    // Context Menu Engelleyici
    window.oncontextmenu = function(event) {
        if (event.target.closest('#btn-dist-seal-hold')) {
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
    };
}
