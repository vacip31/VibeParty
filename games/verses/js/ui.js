/* Vibe X Verses Arayüz Güncelleme Modülü (ui.js) */

import { state, STATES, calculateGameDuration } from './state.js';
import { playTransition, playVibration } from './audio.js';

// Görünüm Seçiciler
export const views = {
    welcome: document.getElementById('view-welcome'),
    rules: document.getElementById('view-rules'),
    setup: document.getElementById('view-setup'),
    roleDistribution: document.getElementById('view-role-distribution'),
    writing: document.getElementById('view-writing'),
    reveal: document.getElementById('view-reveal'),
    gameOver: document.getElementById('view-game-over')
};

// Mat / Pastel Tasarım Renk Paleti (Nocturne Tema Şartnamesi)
const SHAIER_COLORS = [
    { class: 'text-red-400 border-red-500/20 bg-red-500/10', dot: 'bg-red-500 shadow-red-500/20', name: 'Kırmızı Oyuncu', initials: 'Kırmızı' },
    { class: 'text-purple-400 border-purple-500/20 bg-purple-500/10', dot: 'bg-purple-500 shadow-purple-500/20', name: 'Mor Oyuncu', initials: 'Mor' },
    { class: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10', dot: 'bg-emerald-500 shadow-emerald-500/20', name: 'Yeşil Oyuncu', initials: 'Yeşil' },
    { class: 'text-amber-400 border-amber-500/20 bg-amber-500/10', dot: 'bg-amber-500 shadow-amber-500/20', name: 'Sarı Oyuncu', initials: 'Sarı' },
    { class: 'text-blue-400 border-blue-500/20 bg-blue-500/10', dot: 'bg-blue-500 shadow-blue-500/20', name: 'Mavi Oyuncu', initials: 'Mavi' },
    { class: 'text-pink-400 border-pink-500/20 bg-pink-500/10', dot: 'bg-pink-500 shadow-pink-500/20', name: 'Pembe Oyuncu', initials: 'Pembe' },
    { class: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10', dot: 'bg-cyan-500 shadow-cyan-500/20', name: 'Turkuaz Oyuncu', initials: 'Turkuaz' },
    { class: 'text-orange-400 border-orange-500/20 bg-orange-500/10', dot: 'bg-orange-500 shadow-orange-500/20', name: 'Turuncu Oyuncu', initials: 'Turuncu' }
];

let currentActiveView = null;

let isHandlingPopstate = false;

// Sayfa ilk yüklendiğinde geçmişe welcome durumunu yaz
if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
    window.history.replaceState({ view: 'welcome' }, '');
}

if (typeof window !== 'undefined') {
    window.addEventListener('popstate', (e) => {
        const stateVal = e.state;
        if (stateVal && stateVal.view && views[stateVal.view]) {
            isHandlingPopstate = true;
            showView(views[stateVal.view]);
            isHandlingPopstate = false;
        } else {
            isHandlingPopstate = true;
            showView(views.welcome);
            isHandlingPopstate = false;
        }
    });
}

/**
 * Belirtilen görünümü aktif hale getirir, diğerlerini yumuşak geçişle gizler.
 */
export function showView(activeView) {
    if (!currentActiveView) {
        currentActiveView = document.querySelector('.game-view.active-view') || views.welcome;
    }
    
    if (!activeView || activeView === currentActiveView) {
        if (activeView) activeView.classList.add('active-view');
        return;
    }
    
    // Geçmiş durumunu güncelle (Eğer popstate tetiklemediyse push et)
    if (!isHandlingPopstate && window.history && window.history.pushState) {
        const viewKey = Object.keys(views).find(key => views[key] === activeView);
        if (viewKey) {
            window.history.pushState({ view: viewKey }, '');
        }
    }

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
            oldView.style.display = 'none';
        }
        activeView.classList.remove('transitioning');
    }, 500);
}

/**
 * Oyuncu kurulum ekranındaki eklenmiş oyuncu listesini günceller.
 */
export function renderSetupPlayersList(onRemoveCallback) {
    const playerList = document.getElementById('setup-player-list');
    const emptyState = document.getElementById('setup-empty-state');
    const btnStart = document.getElementById('btn-setup-start');
    const playerCounter = document.getElementById('setup-player-counter');
    
    if (!playerList) return;
    
    playerList.innerHTML = '';
    
    if (state.players.length === 0) {
        playerList.appendChild(emptyState);
    } else {
        state.players.forEach((player) => {
            const chip = document.createElement('div');
            chip.className = 'flex items-center gap-xs bg-surface-container-high px-3 py-2 rounded-lg border border-outline-variant/20 animate-in zoom-in-95 duration-200';
            chip.innerHTML = `
                <span class="font-body text-sm text-on-surface">${player}</span>
                <button type="button" class="btn-remove-player text-on-surface-variant hover:text-error transition-colors flex items-center" data-name="${player}">
                    <span class="material-symbols-outlined text-sm">close</span>
                </button>
            `;
            
            // Silme olayını bağla
            const btnClose = chip.querySelector('.btn-remove-player');
            btnClose.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                onRemoveCallback(player);
            });
            
            playerList.appendChild(chip);
        });
    }
    
    // Oynatma butonu kilidini kontrol et (4-8 oyuncu)
    const minPlayers = 4;
    const maxPlayers = 8;
    
    // Ekleme kontrollerini kilitler (Maks 8)
    const inputSetupName = document.getElementById('input-setup-name');
    const formBtn = document.getElementById('form-setup-add')?.querySelector('button[type="submit"]');
    
    if (state.players.length >= maxPlayers) {
        if (inputSetupName) {
            inputSetupName.disabled = true;
            inputSetupName.placeholder = "Maksimum oyuncu sınırına ulaşıldı";
        }
        if (formBtn) formBtn.disabled = true;
    } else {
        if (inputSetupName) {
            inputSetupName.disabled = false;
            inputSetupName.placeholder = "Oyuncu ismini girin...";
        }
        if (formBtn) formBtn.disabled = false;
    }
    
    // Çift Casus Ayar Kilidi (>= 6 Oyuncu)
    const doubleSpyRow = document.getElementById('setup-double-spy-row');
    const btnToggleDoubleSpy = document.getElementById('btn-toggle-double-spy');
    const btnToggleDoubleSpyKnob = document.getElementById('btn-toggle-double-spy-knob');
    const doubleSpyDesc = document.getElementById('setup-double-spy-desc');
    
    if (state.players.length >= 6) {
        if (doubleSpyRow) doubleSpyRow.classList.remove('opacity-30');
        if (btnToggleDoubleSpy) {
            btnToggleDoubleSpy.disabled = false;
            btnToggleDoubleSpy.classList.remove('cursor-not-allowed');
        }
        if (doubleSpyDesc) doubleSpyDesc.textContent = "Herkes birbirinden habersiz mısra yazar";
    } else {
        if (doubleSpyRow) doubleSpyRow.classList.add('opacity-30');
        if (btnToggleDoubleSpy) {
            btnToggleDoubleSpy.disabled = true;
            btnToggleDoubleSpy.classList.add('cursor-not-allowed');
        }
        if (doubleSpyDesc) doubleSpyDesc.textContent = "En az 6 oyuncu gereklidir";
        state.doubleSpyMode = false; // Zorunlu kapat
    }
    
    // Çift Casus Buton Knob Durumu
    if (btnToggleDoubleSpy && btnToggleDoubleSpyKnob) {
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
    }
    
    if (playerCounter) {
        playerCounter.innerText = `(${state.players.length}/${maxPlayers})`;
    }
    
    if (btnStart) {
        // Buton içindeki metni günceller (N/8)
        btnStart.innerHTML = `<span>OYUNU BAŞLAT</span><span class="font-mono-meta text-sm font-bold">(${state.players.length}/${maxPlayers})</span>`;
        
        if (state.players.length >= minPlayers && state.players.length <= maxPlayers) {
            btnStart.disabled = false;
            btnStart.classList.remove('bg-outline-variant/20', 'text-on-surface-variant/40', 'cursor-not-allowed');
            btnStart.classList.add('bg-primary', 'text-on-primary', 'shadow-lg', 'shadow-primary/10');
        } else {
            btnStart.disabled = true;
            btnStart.classList.add('bg-outline-variant/20', 'text-on-surface-variant/40', 'cursor-not-allowed');
            btnStart.classList.remove('bg-primary', 'text-on-primary', 'shadow-lg', 'shadow-primary/10');
        }
    }
}

/**
 * Rol dağıtım ekranını durum aşamalarına (A, B, C) göre render eder.
 */
export function renderRoleDistribution() {
    showView(views.roleDistribution);
    
    const panelA = document.getElementById('dist-panel-a');
    const panelB = document.getElementById('dist-panel-b');
    const panelC = document.getElementById('dist-panel-c');
    
    const activePlayer = state.players[state.distIndex];
    const isSpy = state.spyPlayers.includes(activePlayer);
    
    // Panel gizleme
    panelA.classList.add('hidden');
    panelB.classList.add('hidden');
    panelC.classList.add('hidden');
    
    // Aktif sub-state kontrolü
    if (state.distSubState === 'A') {
        panelA.classList.remove('hidden');
        document.getElementById('dist-target-player').textContent = activePlayer;
        
    } else if (state.distSubState === 'B') {
        panelB.classList.remove('hidden');
        
        // Rol kartı verilerini yükle
        const cardCategory = document.getElementById('dist-card-category');
        const cardKeyword = document.getElementById('dist-card-keyword');
        const cardInstruction = document.getElementById('dist-card-instruction');
        const cardColorText = document.getElementById('dist-card-color');
        const cardColorDot = document.getElementById('dist-card-color-dot');
        
        const playerColor = SHAIER_COLORS[state.distIndex % SHAIER_COLORS.length];
        
        if (cardColorText) {
            cardColorText.textContent = `Rengin: ${playerColor.name}`;
            const firstColorClass = playerColor.class.split(' ')[0];
            cardColorText.className = `font-label-caps text-xs font-semibold uppercase tracking-wider ${firstColorClass}`;
        }
        if (cardColorDot) {
            cardColorDot.className = `w-3.5 h-3.5 rounded-full border border-background/30 shadow-sm ${playerColor.dot}`;
        }
        
        cardCategory.textContent = `KATEGORİ: ${state.category}`;
        
        if (isSpy) {
            cardKeyword.innerHTML = `CASUS! 🤫`;
            cardKeyword.className = "font-verse-display text-verse-display text-error font-bold italic";
            cardInstruction.textContent = "Kelimeyi bilmiyorsan çaktırmadan zincire uyumlu bir cümle yaz!";
        } else {
            cardKeyword.innerHTML = `Kelime: ${state.keyword} 🔑`;
            cardKeyword.className = "font-verse-display text-verse-display text-primary font-bold italic";
            cardInstruction.textContent = "İpucu yazarken bu kelimeyi cümlede gizlice geçir.";
        }
        
    } else if (state.distSubState === 'C') {
        panelC.classList.remove('hidden');
    }
    
    // Hazır oyuncu göstergesini güncelle
    const readyIndicator = document.getElementById('dist-ready-indicator');
    if (readyIndicator) {
        readyIndicator.textContent = `${state.distIndex + 1} / ${state.players.length} Oyuncu Hazırlanıyor`;
    }
}

/**
 * Şiir Yazma Ekranı arayüzünü günceller.
 */
export function renderWritingPhase() {
    showView(views.writing);
    
    const panelA = document.getElementById('writing-panel-a');
    const panelB = document.getElementById('writing-panel-b');
    const panelC = document.getElementById('writing-panel-c');
    
    panelA.classList.add('hidden');
    panelB.classList.add('hidden');
    panelC.classList.add('hidden');
    
    const currentWriter = state.shuffledWritingQueue[state.currentWriterIndex];
    
    // Süre Limiti (Kum Saati) Görsel Kontrolü
    const timerContainer = document.getElementById('writing-timer-container');
    const timerSeconds = document.getElementById('writing-timer-seconds');
    
    if (state.timerLimit > 0 && state.writingSubState === 'B') {
        if (timerContainer) {
            timerContainer.classList.remove('hidden');
            timerContainer.classList.add('flex');
        }
        if (timerSeconds) {
            timerSeconds.textContent = `00:${state.secondsRemaining < 10 ? '0' + state.secondsRemaining : state.secondsRemaining}`;
            // Son 10 saniye uyarı rengi
            if (state.secondsRemaining <= 10) {
                timerContainer.classList.add('border-error/45', 'bg-error/15');
            } else {
                timerContainer.classList.remove('border-error/45', 'bg-error/15');
            }
        }
    } else {
        if (timerContainer) {
            timerContainer.classList.add('hidden');
            timerContainer.classList.remove('flex');
        }
    }
    
    if (state.writingSubState === 'A') {
        panelA.classList.remove('hidden');
        document.getElementById('writing-target-player').textContent = currentWriter;
        
    } else if (state.writingSubState === 'B') {
        panelB.classList.remove('hidden');
        
        // Kategori Banner
        document.getElementById('writing-panel-category').textContent = `[ ${state.category} ]`;
        
        // Exquisite Corpse (Körleme Şiir Geçmişi)
        const censordFeed = document.getElementById('writing-censored-feed');
        const prevLineText = document.getElementById('writing-previous-line-text');
        
        if (state.writingHistory.length === 0) {
            censordFeed.classList.add('hidden');
            prevLineText.textContent = "Zincirin ilk cümlesini sen yazıyorsun. Başarılar! 🖋️";
        } else {
            censordFeed.classList.remove('hidden');
            const lastPoem = state.writingHistory[state.writingHistory.length - 1];
            prevLineText.textContent = `"${lastPoem.line}"`;
        }
        
        // Sayaç ve input sıfırlama
        const textarea = document.getElementById('input-poetry-verse');
        const counter = document.getElementById('writing-char-counter');
        const btnSubmit = document.getElementById('btn-writing-submit');
        
        if (textarea) {
            textarea.value = '';
            textarea.focus();
        }
        if (counter) {
            counter.textContent = '0 / 35';
            counter.classList.remove('text-primary');
        }
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.className = "w-full py-md bg-primary-container text-on-primary font-h2 text-h2 font-bold uppercase tracking-widest opacity-40 cursor-not-allowed rounded-lg active:scale-[0.98] transition-all";
        }
        
        // Sahte Şair Tahmin Butonu (Tur Başına Sadece 1 Tahmin Hakkı)
        const btnSpyGuess = document.getElementById('btn-writing-spy-guess');
        if (btnSpyGuess) {
            if (state.spyPlayers.includes(currentWriter)) {
                btnSpyGuess.classList.remove('hidden');
                btnSpyGuess.classList.add('flex');
                
                if (state.spyGuessedCorrectly) {
                    btnSpyGuess.innerHTML = `
                        <span class="material-symbols-outlined text-[18px] text-primary">key</span>
                        <span class="font-label-caps text-label-caps uppercase text-primary font-semibold">Tüyo: ${state.keyword}</span>
                    `;
                    btnSpyGuess.disabled = true;
                } else if (state.spyGuessAttemptsThisRound >= 1) {
                    // Yanlış tahmin ettiyse bu tur hakkını kilitler
                    btnSpyGuess.innerHTML = `
                        <span class="material-symbols-outlined text-[18px] text-error">lock_clock</span>
                        <span class="font-label-caps text-label-caps uppercase text-error font-semibold">Tahmin Hakkın Tükendi (Bu Tur)</span>
                    `;
                    btnSpyGuess.disabled = true;
                } else {
                    btnSpyGuess.innerHTML = `
                        <span class="material-symbols-outlined text-[18px]">visibility_off</span>
                        <span class="font-label-caps text-label-caps uppercase group-hover:underline decoration-primary underline-offset-4">Anahtar Kelimeyi Tahmin Et</span>
                    `;
                    btnSpyGuess.disabled = false;
                }
            } else {
                btnSpyGuess.classList.add('hidden');
                btnSpyGuess.classList.remove('flex');
            }
        }
        
        // Footer bilgi
        const footerMeta = document.getElementById('writing-footer-meta');
        if (footerMeta) {
            footerMeta.textContent = `Sıra oyuncuda. Tur ${state.roundNumber} / ${state.totalRounds}`;
        }
        
    } else if (state.writingSubState === 'C') {
        panelC.classList.remove('hidden');
    }
}

/**
 * Şiir Kitabı / Son ifşa ekranını render eder.
 */
export function renderRevealPhase() {
    showView(views.reveal);
    
    const poetryContainer = document.getElementById('reveal-poetry-scroll');
    if (!poetryContainer) return;
    
    poetryContainer.innerHTML = '';
    
    state.writingHistory.forEach((item) => {
        const playerIndex = state.players.indexOf(item.player);
        const colorSet = SHAIER_COLORS[playerIndex % SHAIER_COLORS.length];
        
        const verseBlock = document.createElement('div');
        verseBlock.className = 'flex items-start gap-md group animate-fade-in';
        verseBlock.innerHTML = `
            <div class="shrink-0 pt-2.5">
                <div class="w-5 h-5 rounded-full ${colorSet.dot} border-2 border-background/50 shadow-sm"></div>
            </div>
            <div class="flex-grow space-y-xs">
                <blockquote class="font-verse-body text-verse-body text-on-surface leading-relaxed italic border-l border-primary/20 pl-sm py-xs">
                    "${item.line}"
                </blockquote>
                <p class="font-mono-meta text-[11px] text-on-surface-variant opacity-50 uppercase tracking-wider">— ${colorSet.name}</p>
            </div>
        `;
        poetryContainer.appendChild(verseBlock);
    });
}

/**
 * Oyun Sonu liderlik ve ifşa tablosunu render eder.
 */
export function renderGameOverPhase() {
    showView(views.gameOver);
    
    // Zamanı hesapla
    calculateGameDuration();
    
    // Bento stats güncelleme
    document.getElementById('stat-game-duration').textContent = state.gameDurationString;
    document.getElementById('stat-poetry-lines').textContent = `${state.writingHistory.length} İpucu`;
    document.getElementById('gameover-keyword').textContent = `[${state.keyword}]`;
    
    const gameOverTitle = document.getElementById('gameover-title');
    const spyStatus = document.getElementById('gameover-spy-status');
    
    if (state.spyGuessedCorrectly) {
        gameOverTitle.textContent = "KAZANAN: CASUS! 🤫";
        gameOverTitle.className = "font-h1 text-[32px] md:text-h1 font-extrabold text-primary mb-xs leading-none tracking-tight text-glow";
        spyStatus.classList.remove('hidden');
        spyStatus.textContent = `Casuslardan biri anahtar kelimeyi bildi ve sıyrıldı! (Casuslar: ${state.spyPlayers.join(', ')})`;
    } else if (state.spyExposedByGroup) {
        gameOverTitle.textContent = "KAZANAN: EKİP! 🏆";
        gameOverTitle.className = "font-h1 text-[32px] md:text-h1 font-extrabold text-[#10b981] mb-xs leading-none tracking-tight text-glow";
        spyStatus.classList.remove('hidden');
        spyStatus.textContent = `Ekip, Casus(lar)ın (${state.spyPlayers.join(', ')}) kimliğini buldu ve casuslar kelimeyi tahmin edemedi!`;
    } else {
        gameOverTitle.textContent = "KAZANAN: CASUS! 🤫";
        gameOverTitle.className = "font-h1 text-[32px] md:text-h1 font-extrabold text-primary mb-xs leading-none tracking-tight text-glow";
        spyStatus.classList.remove('hidden');
        spyStatus.textContent = `Casus(lar) (${state.spyPlayers.join(', ')}) kendini gizlemeyi başardı ve kelimeyi deşifre edememiş olsa da kazandı!`;
    }
    
    // Şiir mısralarını gerçek isimlerle listele
    const linesContainer = document.getElementById('gameover-poetry-lines');
    if (!linesContainer) return;
    
    linesContainer.innerHTML = '';
    
    state.writingHistory.forEach((item) => {
        const playerIndex = state.players.indexOf(item.player);
        const colorSet = SHAIER_COLORS[playerIndex % SHAIER_COLORS.length];
        const isSpy = state.spyPlayers.includes(item.player);
        
        const lineBlock = document.createElement('div');
        lineBlock.className = 'text-center py-2 border-b border-outline-variant/5 last:border-0';
        lineBlock.innerHTML = `
            <p class="font-verse-display text-verse-display italic mb-xs ${isSpy ? 'text-primary text-glow font-semibold' : 'text-on-surface'}">
                "${item.line}"
            </p>
            <div class="flex items-center justify-center gap-xs">
                <span class="h-[1px] w-4 ${isSpy ? 'bg-primary/30' : 'bg-outline-variant/30'}"></span>
                <span class="font-mono-meta text-[11px] ${isSpy ? 'text-primary font-bold tracking-widest' : 'text-secondary'} uppercase">
                    ${colorSet.name} — ${item.player} (${isSpy ? 'Casus 🤫' : 'Ekip'})
                </span>
                <span class="h-[1px] w-4 ${isSpy ? 'bg-primary/30' : 'bg-outline-variant/30'}"></span>
            </div>
        `;
        linesContainer.appendChild(lineBlock);
    });
}

/**
 * Kategoriler Modalını doldurur.
 */
export function populateCategoriesModal(categoriesList) {
    const listContainer = document.getElementById('categories-modal-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    listContainer.className = 'flex flex-col gap-sm mt-2';
    
    const CATEGORY_METADATA = {
        "Ofis Çilesi & Beyaz Yaka": {
            desc: "Plaza dili, kurumsal kavramlar, beyaz yaka çileleri ve ofis yaşamına dair popüler kelimeler.",
            examples: ["Deadline", "LinkedIn", "Yıllık İzin"]
        },
        "Milenyum Nostaljisi & Çocukluk": {
            desc: "90'lar ve 2000'lerin başındaki çocukluk anıları, eski teknolojiler, sokak oyunları ve unutulmaz nostaljik ögeler.",
            examples: ["MSN Messenger", "Sanal Bebek", "Taso"]
        },
        "Kült Türk Dizileri": {
            desc: "Türk televizyon tarihine damga vurmuş efsanevi diziler, unutulmaz karakterler ve fenomen replikler.",
            examples: ["Aşk-ı Memnu", "Kurtlar Vadisi", "Avrupa Yakası"]
        },
        "Modern İlişkiler & Dating": {
            desc: "Günümüz flört kültürü, sosyal medya jargonu, ilişki durumları ve dating uygulamalarındaki popüler kavramlar.",
            examples: ["Ghosting", "Red Flag", "İlk Buluşma"]
        },
        "Günlük Hayat & Popüler Kültür": {
            desc: "Gündelik yaşamın koşturmacası, esnaf kültürü, popüler alışkanlıklar ve sokak lezzetlerine dair tanıdık kelimeler.",
            examples: ["Airfryer", "Kadıköy Sahil", "Halı Saha Maçı"]
        }
    };

    categoriesList.forEach((cat) => {
        const item = document.createElement('div');
        item.className = 'category-accordion-item bg-surface-container rounded-lg border border-outline-variant/10 overflow-hidden transition-all duration-200';
        
        const meta = CATEGORY_METADATA[cat.category] || {
            desc: "Bu kategoriye ait gizli kelimelerle ipucu zinciri oluşturun.",
            examples: cat.words.slice(0, 3).map(w => typeof w === 'string' ? w : w.w)
        };
        
        const examplesHtml = meta.examples.map(w => `
            <span class="inline-block text-[11px] bg-primary/5 text-primary px-2.5 py-1 rounded-md border border-primary/20 select-none">
                ${w}
            </span>
        `).join('');

        item.innerHTML = `
            <button class="w-full flex items-center justify-between p-sm text-left focus:outline-none hover:bg-surface-container-high/40 transition-colors group" type="button">
                <div class="flex items-center gap-xs">
                    <span class="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider group-hover:text-primary transition-colors">${cat.category}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono-meta text-on-surface-variant/40 bg-surface-container-highest/80 px-2 py-0.5 rounded-full border border-outline-variant/10">${cat.words.length} Kelime</span>
                    <span class="material-symbols-outlined text-primary text-[18px] transition-transform duration-200 accordion-icon">chevron_right</span>
                </div>
            </button>
            <div class="max-h-0 overflow-hidden transition-all duration-300 ease-out accordion-content">
                <div class="p-sm pt-0 border-t border-outline-variant/5 mt-xs pt-sm flex flex-col gap-sm">
                    <p class="font-body text-xs text-on-surface-variant/80 leading-relaxed">
                        ${meta.desc}
                    </p>
                    <div class="flex flex-col gap-1.5">
                        <span class="text-[9px] font-mono-meta text-white/30 uppercase tracking-widest">Örnek Kelimeler</span>
                        <div class="flex flex-wrap gap-xs">
                            ${examplesHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const button = item.querySelector('button');
        const content = item.querySelector('.accordion-content');
        const icon = item.querySelector('.accordion-icon');
        
        button.addEventListener('click', () => {
            const isOpen = item.classList.contains('accordion-open');
            if (isOpen) {
                item.classList.remove('accordion-open');
                content.style.maxHeight = '0px';
                icon.style.transform = 'rotate(0deg)';
            } else {
                item.classList.add('accordion-open');
                content.style.maxHeight = `${content.scrollHeight}px`;
                icon.style.transform = 'rotate(90deg)';
            }
        });
        
        listContainer.appendChild(item);
    });
}

/**
 * Özel Alert Modalı gösterir.
 */
export function showCustomAlert(title, message, icon = 'info') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-dialog-modal');
        const iconEl = document.getElementById('custom-dialog-icon');
        const titleEl = document.getElementById('custom-dialog-title');
        const messageEl = document.getElementById('custom-dialog-message');
        const alertActions = document.getElementById('custom-dialog-alert-actions');
        const confirmActions = document.getElementById('custom-dialog-confirm-actions');
        const okBtn = document.getElementById('btn-custom-alert-ok');
        
        if (!modal) {
            alert(message);
            resolve();
            return;
        }
        
        iconEl.textContent = icon;
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        alertActions.classList.remove('hidden');
        confirmActions.classList.add('hidden');
        
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        const cleanup = () => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            okBtn.removeEventListener('click', handler);
            resolve();
        };
        
        const handler = (e) => {
            e.preventDefault();
            cleanup();
        };
        
        okBtn.addEventListener('click', handler);
    });
}

/**
 * Özel Confirm Modalı gösterir.
 */
export function showCustomConfirm(title, message, icon = 'help') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-dialog-modal');
        const iconEl = document.getElementById('custom-dialog-icon');
        const titleEl = document.getElementById('custom-dialog-title');
        const messageEl = document.getElementById('custom-dialog-message');
        const alertActions = document.getElementById('custom-dialog-alert-actions');
        const confirmActions = document.getElementById('custom-dialog-confirm-actions');
        const cancelBtn = document.getElementById('btn-custom-confirm-cancel');
        const okBtn = document.getElementById('btn-custom-confirm-ok');
        
        if (!modal) {
            const res = confirm(message);
            resolve(res);
            return;
        }
        
        iconEl.textContent = icon;
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        alertActions.classList.add('hidden');
        confirmActions.classList.remove('hidden');
        
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        const cleanup = (result) => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            okBtn.removeEventListener('click', okHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
            resolve(result);
        };
        
        const okHandler = (e) => {
            e.preventDefault();
            cleanup(true);
        };
        
        const cancelHandler = (e) => {
            e.preventDefault();
            cleanup(false);
        };
        
        okBtn.addEventListener('click', okHandler);
        cancelBtn.addEventListener('click', cancelHandler);
    });
}
