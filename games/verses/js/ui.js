/* Vibe X Verses Arayüz Güncelleme Modülü (ui.js) */

import { state, STATES, calculateGameDuration, calculateScores, shuffle } from './state.js';
import { playTransition, playVibration, playTick } from './audio.js';

// Görünüm Seçiciler
export const views = {
    welcome: document.getElementById('view-welcome'),
    rules: document.getElementById('view-rules'),
    setup: document.getElementById('view-setup'),
    lobby: document.getElementById('view-lobby'), // Multiplayer Lobi
    roleDistribution: document.getElementById('view-role-distribution'),
    writing: document.getElementById('view-writing'),
    reading: document.getElementById('view-reading'), // Mısra Okuma Ekranı
    interrogation: document.getElementById('view-interrogation'),
    reveal: document.getElementById('view-reveal'),
    gameOver: document.getElementById('view-game-over')
};

// Mat / Pastel Tasarım Renk Paleti (Nocturne Tema Şartnamesi)
const SHAIER_COLORS = [
    { class: 'text-red-400 border-red-500/20 bg-red-500/10', dot: 'bg-red-500 shadow-red-500/20', name: 'Kırmızı Şair', initials: 'Kırmızı' },
    { class: 'text-purple-400 border-purple-500/20 bg-purple-500/10', dot: 'bg-purple-500 shadow-purple-500/20', name: 'Mor Şair', initials: 'Mor' },
    { class: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10', dot: 'bg-emerald-500 shadow-emerald-500/20', name: 'Yeşil Şair', initials: 'Yeşil' },
    { class: 'text-amber-400 border-amber-500/20 bg-amber-500/10', dot: 'bg-amber-500 shadow-amber-500/20', name: 'Sarı Şair', initials: 'Sarı' },
    { class: 'text-blue-400 border-blue-500/20 bg-blue-500/10', dot: 'bg-blue-500 shadow-blue-500/20', name: 'Mavi Şair', initials: 'Mavi' },
    { class: 'text-pink-400 border-pink-500/20 bg-pink-500/10', dot: 'bg-pink-500 shadow-pink-500/20', name: 'Pembe Şair', initials: 'Pembe' },
    { class: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10', dot: 'bg-cyan-500 shadow-cyan-500/20', name: 'Turkuaz Şair', initials: 'Turkuaz' },
    { class: 'text-orange-400 border-orange-500/20 bg-orange-500/10', dot: 'bg-orange-500 shadow-orange-500/20', name: 'Turuncu Şair', initials: 'Turuncu' }
];

function getPlayerColor(playerName) {
    const playerObj = Object.values(state.playersRaw).find(p => p.name === playerName);
    const colorIndex = (playerObj && playerObj.colorIndex !== undefined) ? playerObj.colorIndex : 0;
    return SHAIER_COLORS[colorIndex % SHAIER_COLORS.length];
}

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
    
    // Geçmiş durumunu güncelle
    if (!isHandlingPopstate && window.history && window.history.pushState) {
        const viewKey = Object.keys(views).find(key => views[key] === activeView);
        if (viewKey) {
            window.history.pushState({ view: viewKey }, '');
        }
    }

    const oldView = currentActiveView;
    currentActiveView = activeView;
    
    playTransition();
    
    if (oldView) {
        oldView.classList.add('transitioning', 'fade-out');
        oldView.classList.remove('active-view');
    }
    
    activeView.classList.add('transitioning');
    activeView.classList.remove('fade-out', 'active-view');
    
    void activeView.offsetWidth;
    activeView.classList.add('active-view');
    
    setTimeout(() => {
        if (oldView) {
            oldView.classList.remove('transitioning', 'fade-out');
            oldView.style.display = 'none';
        }
        activeView.classList.remove('transitioning');
    }, 500);
}

/**
 * Multiplayer Lobi ekranını render eder.
 */
export function renderLobbyPhase() {
    showView(views.lobby);
    
    const codeEl = document.getElementById('lobby-room-code');
    const countEl = document.getElementById('lobby-player-count');
    const listEl = document.getElementById('lobby-player-list');
    const btnReady = document.getElementById('btn-lobby-ready');
    const btnStart = document.getElementById('btn-lobby-start');
    
    if (codeEl) codeEl.textContent = state.roomCode;
    
    const playerEntries = Object.entries(state.playersRaw);
    if (countEl) countEl.textContent = `(${playerEntries.length}/8)`;
    
    if (listEl) {
        listEl.innerHTML = '';
        playerEntries.forEach(([id, p], index) => {
            const isHostPlayer = id === state.playersRaw[state.myPlayerId]?.isHost || id === Object.keys(state.playersRaw)[0]; // İlk giren hosttur veya hostId eşleşir
            const isMe = id === state.myPlayerId;
            const readyText = p.isReady ? "HAZIR" : "BEKLİYOR";
            const readyColor = p.isReady ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-on-surface-variant/40 bg-surface-container-high/40 border-outline-variant/10";
            
            const card = document.createElement('div');
            card.className = 'flex items-center justify-between w-full bg-surface-container-high px-md py-sm rounded-lg border border-outline-variant/10 animate-fade-in';
            card.style.animationDelay = `${index * 80}ms`;
            card.style.animationFillMode = 'both';
            card.innerHTML = `
                <div class="flex flex-wrap items-center gap-xs">
                    <span class="font-h2 text-sm text-on-surface font-semibold ${isMe ? 'text-primary' : ''}">${p.name} ${isMe ? '(Sen)' : ''}</span>
                    <span class="text-xs text-primary/80 font-mono font-bold ml-xs">${p.score || 0} Puan</span>
                    ${isHostPlayer ? '<span class="text-[10px] font-label-caps bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded">HOST</span>' : ''}
                </div>
                <span class="text-[10px] font-label-caps border px-2 py-1 rounded ${readyColor}">${readyText}</span>
            `;
            listEl.appendChild(card);
        });
    }
    
    const myData = state.playersRaw[state.myPlayerId] || { isReady: false };
    const amIHost = state.isHost;
    
    if (amIHost) {
        if (btnStart) {
            btnStart.classList.remove('hidden');
            // Host hariç diğer herkes hazır mı ve en az 4 oyuncu var mı?
            const otherPlayers = playerEntries.filter(([id, p]) => id !== state.myPlayerId);
            const allOthersReady = otherPlayers.every(([id, p]) => p.isReady);
            const canStart = playerEntries.length >= 4 && allOthersReady;
            
            btnStart.disabled = !canStart;
            if (canStart) {
                btnStart.className = "w-full h-14 bg-primary text-on-primary font-h2 text-h2 rounded-lg transition-all flex items-center justify-center gap-sm active:scale-98 shadow-lg";
            } else {
                btnStart.className = "w-full h-14 bg-outline-variant/20 text-on-surface-variant/40 font-h2 text-h2 rounded-lg cursor-not-allowed transition-all flex items-center justify-center gap-sm active:scale-98";
            }
        }
        if (btnReady) btnReady.classList.add('hidden');
    } else {
        if (btnStart) btnStart.classList.add('hidden');
        if (btnReady) {
            btnReady.classList.remove('hidden');
            if (myData.isReady) {
                btnReady.textContent = "HAZIR DEĞİLİM";
                btnReady.className = "w-full h-14 bg-surface-container border border-outline-variant text-on-surface font-h2 text-h2 rounded-lg transition-all flex items-center justify-center gap-sm active:scale-98";
            } else {
                btnReady.textContent = "HAZIR OL";
                btnReady.className = "w-full h-14 bg-primary text-on-primary font-h2 text-h2 rounded-lg transition-all flex items-center justify-center gap-sm active:scale-98 shadow-lg";
            }
        }
    }
}

/**
 * Rol dağıtım ekranını render eder (Eşzamanlı sürüm).
 */
export function renderRoleDistribution() {
    showView(views.roleDistribution);
    
    const panelA = document.getElementById('dist-panel-a');
    const panelB = document.getElementById('dist-panel-b');
    const panelC = document.getElementById('dist-panel-c');
    
    // Çoklu oyuncuda Panel A (cihaz teslim) asla gösterilmez.
    panelA.classList.add('hidden');
    panelB.classList.add('hidden');
    panelB.style.display = '';
    panelC.classList.add('hidden');

    // Host değilse oyunu iptal etme butonunu gizle
    const btnDistCancel = document.getElementById('btn-dist-cancel');
    if (btnDistCancel) {
        if (state.isHost) {
            btnDistCancel.classList.remove('hidden');
        } else {
            btnDistCancel.classList.add('hidden');
        }
    }
    
    const myData = state.playersRaw[state.myPlayerId] || { role: "LOBBY", isReady: false };
    const colorIndex = (myData && myData.colorIndex !== undefined) ? myData.colorIndex : 0;
    const playerColor = SHAIER_COLORS[colorIndex % SHAIER_COLORS.length];
    
    if (!myData.isReady) {
        // Rolünü görmedi veya onaylamadıysa panel B'yi göster
        panelB.classList.remove('hidden');
        panelB.style.display = 'flex';
        
        const cardCategory = document.getElementById('dist-card-category');
        const cardKeyword = document.getElementById('dist-card-keyword');
        const cardInstruction = document.getElementById('dist-card-instruction');
        const cardColorText = document.getElementById('dist-card-color');
        const cardColorDot = document.getElementById('dist-card-color-dot');
        
        if (cardColorText) {
            cardColorText.textContent = `Rengin: ${playerColor.name}`;
            const firstColorClass = playerColor.class.split(' ')[0];
            cardColorText.className = `font-label-caps text-xs font-semibold uppercase tracking-wider ${firstColorClass}`;
        }
        if (cardColorDot) {
            cardColorDot.className = `w-3.5 h-3.5 rounded-full border border-background/30 shadow-sm ${playerColor.dot}`;
        }
        
        if (cardCategory) cardCategory.textContent = `KATEGORİ: ${state.category}`;
        
        if (myData.role === "Casus") {
            cardKeyword.innerHTML = `CASUS! 🤫`;
            cardKeyword.className = "font-verse-display text-verse-display text-glow text-error font-bold italic";
            cardInstruction.innerHTML = `Kelimeyi bilmiyorsun! Yazılan ipuçlarından kelimeyi tahmin etmeye çalış ve masadaki mısraları savunarak kendini gizle. 🤫`;
        } else if (myData.role === "Dedektif") {
            cardKeyword.innerHTML = `DEDEKTİF 🔍`;
            cardKeyword.className = "font-verse-display text-verse-display text-glow text-primary font-bold italic";
            cardInstruction.innerHTML = `Kelime: <strong>${state.keyword}</strong> 🔑<br><span class="text-xs text-on-surface-variant/80 mt-1 block">Gizli kelimeyi biliyorsun. Oyun içi yazma ekranında 1 kez bir oyuncunun rolünü sorgulayabilirsin!</span>`;
        } else if (myData.role === "Köstebek") {
            cardKeyword.innerHTML = `KÖSTEBEK 😈`;
            cardKeyword.className = "font-verse-display text-verse-display text-glow text-[#f59e0b] font-bold italic";
            cardInstruction.innerHTML = `Kelime: <strong>${state.keyword}</strong> 🔑<br><span class="text-xs text-on-surface-variant/80 mt-1 block">GİZLİ ORTAK! Amacın casusun kelimeyi tahmin etmesine yardımcı olmak ve ekibi sabote etmektir.</span>`;
        } else {
            cardKeyword.innerHTML = `Kelime: ${state.keyword} 🔑`;
            cardKeyword.className = "font-verse-display text-verse-display text-primary font-bold italic";
            cardInstruction.textContent = "Gizli kelimeyi biliyorsun. İpucu yazarken bu kelimeyi cümlede gizlice geçir.";
        }
    } else {
        // Onayladıysa bekletme paneline geç
        panelC.classList.remove('hidden');
        
        // Diğer oyuncuların durumunu gösteren bir hazır göstergesi
        const readyCount = Object.values(state.playersRaw).filter(p => p.isReady).length;
        const totalCount = Object.keys(state.playersRaw).length;
        
        const descEl = panelC.querySelector('p');
        if (descEl) {
            descEl.textContent = `Rolünü öğrendin ve hazır durumdasın. Diğer oyuncuların rolleri öğrenmesi bekleniyor... (${readyCount} / ${totalCount} Hazır)`;
        }
    }
}

/**
 * Şiir Yazma Ekranı arayüzünü günceller (Simultaneous multiplayer).
 */
export function renderWritingPhase() {
    showView(views.writing);
    
    const panelB = document.getElementById('writing-panel-b');
    const panelC = document.getElementById('writing-panel-c');
    
    panelB.classList.add('hidden');
    panelC.classList.add('hidden');

    // Host değilse yazma iptal butonunu gizle
    const btnWritingCancel = document.getElementById('btn-writing-cancel');
    if (btnWritingCancel) {
        if (state.isHost) {
            btnWritingCancel.classList.remove('hidden');
        } else {
            btnWritingCancel.classList.add('hidden');
        }
    }
    
    const myData = state.playersRaw[state.myPlayerId] || { submitted: false, role: "Masum" };
    const myName = myData.name || "...";
    
    // Süre Limiti (Kum Saati) Görsel Kontrolü
    const timerContainer = document.getElementById('writing-timer-container');
    const timerSeconds = document.getElementById('writing-timer-seconds');
    
    if (state.timerLimit > 0 && !myData.submitted) {
        if (timerContainer) {
            timerContainer.classList.remove('hidden');
            timerContainer.classList.add('flex');
        }
        if (timerSeconds) {
            timerSeconds.textContent = `00:${state.secondsRemaining < 10 ? '0' + state.secondsRemaining : state.secondsRemaining}`;
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
    
    if (!myData.submitted) {
        panelB.classList.remove('hidden');
        
        // Aktif Şair Banner (Sen)
        const writerEl = document.getElementById('writing-panel-writer');
        if (writerEl) {
            writerEl.textContent = myName;
        }
        
        // Kategori Banner
        document.getElementById('writing-panel-category').textContent = `[ ${state.category} ]`;
        
        // Gizli Kelime & Talimat Banner'ı Güncellemesi
        const keywordValEl = document.getElementById('writing-panel-keyword-val');
        const keywordLabelEl = document.getElementById('writing-panel-keyword-label');
        const keywordInstrEl = document.getElementById('writing-panel-keyword-instruction');
        
        if (myData.role === "Casus") {
            if (keywordLabelEl) keywordLabelEl.textContent = "ROLÜN:";
            if (keywordValEl) {
                keywordValEl.textContent = "CASUS 🤫";
                keywordValEl.className = "font-h2 text-lg text-error font-bold tracking-wide mt-xs text-glow";
            }
            if (keywordInstrEl) {
                keywordInstrEl.textContent = "Gizli kelimeyi bilmiyorsun! Yazılan mısralardan kelimeyi tahmin etmeye çalış ve blöf yap.";
            }
        } else {
            if (keywordLabelEl) keywordLabelEl.textContent = "GİZLİ KELİME:";
            if (keywordValEl) {
                keywordValEl.textContent = state.keyword;
                keywordValEl.className = "font-h2 text-lg text-primary font-semibold tracking-wide mt-xs text-glow";
            }
            if (keywordInstrEl) {
                keywordInstrEl.textContent = "İpucu yazarken bu gizli kelimeyi mısranızda gizlice geçirin.";
            }
        }
        
        // Sayaç ve input durumu
        const textarea = document.getElementById('input-poetry-verse');
        const counter = document.getElementById('writing-char-counter');
        const btnSubmit = document.getElementById('btn-writing-submit');
        
        const textVal = textarea ? textarea.value.trim() : "";
        const charsCount = textVal.length;
        
        if (counter) {
            counter.textContent = `${charsCount} / 35`;
            if (charsCount === 35) {
                counter.className = "font-mono-meta text-mono-meta text-error font-bold animate-pulse";
            } else if (charsCount >= 30) {
                counter.className = "font-mono-meta text-mono-meta text-primary font-semibold";
            } else {
                counter.className = "font-mono-meta text-mono-meta text-on-surface-variant/60";
            }
        }
        
        if (btnSubmit) {
            if (charsCount > 0 && charsCount <= 35) {
                btnSubmit.disabled = false;
                btnSubmit.className = "w-full py-md bg-primary text-on-primary font-h2 text-h2 font-bold uppercase tracking-widest rounded-lg active:scale-[0.98] transition-all shadow-md";
            } else {
                btnSubmit.disabled = true;
                btnSubmit.className = "w-full py-md bg-primary-container text-on-primary font-h2 text-h2 font-bold uppercase tracking-widest opacity-40 cursor-not-allowed rounded-lg active:scale-[0.98] transition-all";
            }
        }
        
        // Sahte Şair Tahmin Butonu
        const btnSpyGuess = document.getElementById('btn-writing-spy-guess');
        if (btnSpyGuess) {
            if (myData.role === "Casus") {
                btnSpyGuess.classList.remove('hidden');
                btnSpyGuess.classList.add('flex');
                
                if (state.spyGuessedCorrectly) {
                    btnSpyGuess.innerHTML = `
                        <span class="material-symbols-outlined text-[18px] text-primary">key</span>
                        <span class="font-label-caps text-label-caps uppercase text-primary font-semibold">Tüyo: ${state.keyword}</span>
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
        
        // Sahte Şair Aday Kelime İpuçları Görünürlüğü
        const candidatesHelper = document.getElementById('spy-candidates-helper');
        if (candidatesHelper) {
            candidatesHelper.classList.add('hidden');
        }
        
        // Dedektif Sorgu Yeteneği Butonu
        const btnDetectiveSkill = document.getElementById('btn-writing-detective-skill');
        if (btnDetectiveSkill) {
            if (myData.role === "Dedektif" && !state.hasDetectiveUsedSkill) {
                btnDetectiveSkill.classList.remove('hidden');
                btnDetectiveSkill.classList.add('flex');
            } else {
                btnDetectiveSkill.classList.add('hidden');
                btnDetectiveSkill.classList.remove('flex');
            }
        }
        
        // Footer bilgi
        const footerMeta = document.getElementById('writing-footer-meta');
        if (footerMeta) {
            footerMeta.textContent = `Tur ${state.roundNumber} / ${state.totalRounds} • Mısranı yazıp onayla`;
        }
        
    } else {
        // Gönderdiyse bekleme paneli
        panelC.classList.remove('hidden');
        
        const descEl = panelC.querySelector('p');
        if (descEl) {
            const submittedCount = Object.values(state.playersRaw).filter(p => p.submitted).length;
            const totalCount = Object.keys(state.playersRaw).length;
            descEl.textContent = `Mısranız başarıyla kilitlendi! Diğer şairlerin yazması bekleniyor... (${submittedCount} / ${totalCount} Tamamlandı)`;
        }
    }
}

/**
 * Mısra İnceleme (Okuma) Ekranını render eder.
 */
export function renderReadingPhase() {
    showView(views.reading);
    
    const assignedVerseEl = document.getElementById('reading-assigned-verse');
    const assignedAuthorEl = document.getElementById('reading-assigned-author-meta');
    const btnReadingReady = document.getElementById('btn-reading-ready');
    
    const myData = state.playersRaw[state.myPlayerId] || { isReady: false };
    
    if (state.readingAssignments) {
        if (assignedVerseEl) assignedVerseEl.textContent = `"${state.readingAssignments.line}"`;
        if (assignedAuthorEl) {
            const writerName = state.readingAssignments.writerName;
            const colorSet = getPlayerColor(writerName);
            assignedAuthorEl.textContent = `— ${colorSet.name}`;
        }
    } else {
        if (assignedVerseEl) assignedVerseEl.textContent = `"Hata: Atanmış mısra bulunamadı!"`;
        if (assignedAuthorEl) assignedAuthorEl.textContent = `— Sistem`;
    }
    
    if (btnReadingReady) {
        if (myData.isReady) {
            btnReadingReady.textContent = "DİĞER OYUNCULAR BEKLENİYOR...";
            btnReadingReady.disabled = true;
            btnReadingReady.className = "w-full max-w-xs py-md bg-outline-variant/20 text-on-surface-variant/40 font-h2 text-h2 rounded-lg cursor-not-allowed transition-all flex items-center justify-center gap-sm active:scale-98";
        } else {
            btnReadingReady.textContent = "OKUDUM, TARTIŞMAYA HAZIRIM";
            btnReadingReady.disabled = false;
            btnReadingReady.className = "w-full max-w-xs py-md bg-primary text-on-primary font-h2 text-h2 rounded-lg flex items-center justify-center gap-xs uppercase active:scale-[0.98] transition-all shadow-lg";
        }
    }
}

/**
 * Tartışma ve Sorgu odası zamanlayıcısını yönetir.
 */
let interrogationIntervalId = null;

export function clearInterrogationTimer() {
    if (interrogationIntervalId) {
        clearInterval(interrogationIntervalId);
        interrogationIntervalId = null;
    }
}

export function startInterrogationTimer() {
    clearInterrogationTimer();
    
    let seconds = 45;
    const textEl = document.getElementById('interrogation-timer-text');
    const circleEl = document.getElementById('interrogation-timer-circle');
    
    if (textEl) textEl.textContent = seconds;
    if (circleEl) {
        circleEl.style.strokeDashoffset = '0';
    }
    
    const dashArray = 440;
    
    interrogationIntervalId = setInterval(() => {
        if (seconds > 0) {
            seconds--;
            if (textEl) textEl.textContent = seconds;
            if (circleEl) {
                const offset = dashArray - (dashArray * seconds) / 45;
                circleEl.style.strokeDashoffset = `${offset}`;
            }
            
            if (seconds <= 10 && seconds > 0) {
                playVibration(15);
                playTick();
            }
        } else {
            clearInterrogationTimer();
            playVibration([50, 30, 50]);
            playTick();
            
            // Zaman bittiğinde host durumu REVEAL'a geçirecektir
        }
    }, 1000);
}

export function renderInterrogationPhase() {
    showView(views.interrogation);
    
    const promptTextEl = document.getElementById('interrogation-prompt-text');
    
    // Sorgu direktifini veritabanından al
    // (Bunu Host başlatırken rastgele üretip veritabanına yazar, biz sadece okuruz)
    // Eğer veritabanında yoksa fallback kullanırız.
    if (promptTextEl) {
        promptTextEl.textContent = state.interrogationPrompt || "Şairlerin mısralarını sorgulayın. Kim kendi mısrasını savunurken yalan söylüyor? 🧐";
    }
    startInterrogationTimer();
}

/**
 * Şiir Kitabı / Son ifşa ekranını render eder.
 */
export function renderRevealPhase() {
    showView(views.reveal);
    
    const poetryContainer = document.getElementById('reveal-poetry-scroll');
    if (!poetryContainer) return;
    
    poetryContainer.innerHTML = '';
    
    state.writingHistory.forEach((item, index) => {
        const colorSet = getPlayerColor(item.player);
        
        const verseBlock = document.createElement('div');
        verseBlock.className = 'flex items-start gap-md group animate-fade-in';
        verseBlock.style.animationDelay = `${index * 150}ms`;
        verseBlock.style.animationFillMode = 'both';
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
    
    // Host değilse rolleri ifşa et butonunu gizle (Sadece Host ifşa sonucunu girebilir)
    const btnRevealExpose = document.getElementById('btn-reveal-expose');
    if (btnRevealExpose) {
        if (state.isHost) {
            btnRevealExpose.classList.remove('hidden');
        } else {
            btnRevealExpose.classList.add('hidden');
        }
    }

    // Host değilse oyunu sıfırlama butonunu gizle
    const btnRevealReset = document.getElementById('btn-reveal-reset');
    if (btnRevealReset) {
        if (state.isHost) {
            btnRevealReset.classList.remove('hidden');
        } else {
            btnRevealReset.classList.add('hidden');
        }
    }
}

/**
 * Oyun Sonu liderlik ve ifşa tablosunu render eder.
 */
export function renderGameOverPhase() {
    showView(views.gameOver);
    
    // Bento stats güncelleme
    const durEl = document.getElementById('stat-game-duration');
    if (durEl) {
        // Basit bir süre hesapla
        calculateGameDuration();
        durEl.textContent = state.gameDurationString || "02:15";
    }
    document.getElementById('stat-poetry-lines').textContent = `${state.writingHistory.length} İpucu`;
    document.getElementById('gameover-keyword').textContent = `[${state.keyword}]`;
    
    const gameOverTitle = document.getElementById('gameover-title');
    const spyStatus = document.getElementById('gameover-spy-status');
    
    if (state.spyGuessedCorrectly) {
        gameOverTitle.textContent = "KAZANAN: CASUS! 🤫";
        gameOverTitle.className = "font-h1 text-[32px] md:text-h1 font-extrabold text-primary mb-xs leading-none tracking-tight text-glow";
        spyStatus.classList.remove('hidden');
        spyStatus.textContent = `Casuslardan biri anahtar kelimeyi bildi ve sıyrıldı! (Casuslar: ${state.spyPlayers.join(', ') || 'Ayrıldı'})`;
    } else if (state.spyExposedByGroup) {
        gameOverTitle.textContent = "KAZANAN: EKİP! 🏆";
        gameOverTitle.className = "font-h1 text-[32px] md:text-h1 font-extrabold text-[#10b981] mb-xs leading-none tracking-tight text-glow";
        spyStatus.classList.remove('hidden');
        spyStatus.textContent = `Ekip, Casus(lar)ın (${state.spyPlayers.join(', ') || 'Ayrıldı'}) kimliğini buldu ve casuslar kelimeyi tahmin edemedi!`;
    } else {
        gameOverTitle.textContent = "KAZANAN: CASUS! 🤫";
        gameOverTitle.className = "font-h1 text-[32px] md:text-h1 font-extrabold text-primary mb-xs leading-none tracking-tight text-glow";
        spyStatus.classList.remove('hidden');
        spyStatus.textContent = `Casus(lar) (${state.spyPlayers.join(', ') || 'Ayrıldı'}) kendini gizlemeyi başardı ve kazandı!`;
    }
    
    // Liderlik tablosunu listele
    const leaderboardContainer = document.getElementById('gameover-leaderboard-list');
    if (leaderboardContainer) {
        leaderboardContainer.innerHTML = '';
        
        // Oyuncuları skorlarına göre sırala
        const sortedPlayers = [...state.players].sort((a, b) => {
            const scoreA = state.playerScores[a] || 0;
            const scoreB = state.playerScores[b] || 0;
            return scoreB - scoreA;
        });
        
        sortedPlayers.forEach((player, index) => {
            const score = state.playerScores[player] || 0;
            const colorSet = getPlayerColor(player);
            
            let medalColor = 'text-on-surface-variant/40';
            if (index === 0) {
                medalColor = 'text-primary text-glow';
            } else if (index === 1) {
                medalColor = 'text-on-surface/80';
            } else if (index === 2) {
                medalColor = 'text-[#b45309]';
            }
            
            let roleBadge = '';
            if (state.spyPlayers.includes(player)) {
                roleBadge = '<span class="text-xs text-error font-semibold ml-xs opacity-80">(Casus)</span>';
            } else if (player === state.detectivePlayer) {
                roleBadge = '<span class="text-xs text-primary font-semibold ml-xs opacity-80">(Dedektif)</span>';
            } else if (player === state.informantPlayer) {
                roleBadge = '<span class="text-xs text-[#f59e0b] font-semibold ml-xs opacity-80">(Köstebek)</span>';
            }
            
            const playerObj = Object.values(state.playersRaw).find(p => p.name === player) || { isReady: false };
            const isReady = playerObj.isReady;
            const readyBadge = isReady ? '<span class="text-[9px] font-label-caps bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded ml-xs">DEVAM ET DEDİ</span>' : '';

            const row = document.createElement('div');
            row.className = 'flex items-center justify-between py-xs px-sm rounded-lg bg-surface/30 border border-outline-variant/5';
            
            const iconHtml = (index < 3) 
                ? `<span class="material-symbols-outlined ${medalColor} text-[18px]">workspace_premium</span>`
                : `<span class="font-mono text-xs ${medalColor} w-[18px] text-center">${index + 1}</span>`;
                
            row.innerHTML = `
                <div class="flex flex-wrap items-center gap-xs">
                    ${iconHtml}
                    <span class="font-h2 text-sm text-on-surface font-semibold uppercase tracking-wider">${player}</span>
                    ${roleBadge}
                    ${readyBadge}
                </div>
                <div class="flex items-center gap-xs font-mono-meta text-xs text-primary font-bold">
                    <span>${score}</span>
                    <span class="text-on-surface-variant/50 font-normal ml-xs">Puan</span>
                </div>
            `;
            leaderboardContainer.appendChild(row);
        });
    }

    // Şiir mısralarını gerçek isimlerle listele
    const linesContainer = document.getElementById('gameover-poetry-lines');
    if (!linesContainer) return;
    
    linesContainer.innerHTML = '';
    
    const shuffledHistory = shuffle([...state.writingHistory]);
    shuffledHistory.forEach((item) => {
        const colorSet = getPlayerColor(item.player);
        const isSpy = state.spyPlayers.includes(item.player);
        
        let roleName = 'Ekip';
        if (isSpy) roleName = 'Casus 🤫';
        else if (item.player === state.detectivePlayer) roleName = 'Dedektif 🔍';
        else if (item.player === state.informantPlayer) roleName = 'Köstebek 😈';
        
        const lineBlock = document.createElement('div');
        lineBlock.className = 'text-center py-2 border-b border-outline-variant/5 last:border-0';
        lineBlock.innerHTML = `
            <p class="font-verse-display text-verse-display italic mb-xs ${isSpy ? 'text-primary text-glow font-semibold' : 'text-on-surface'}">
                "${item.line}"
            </p>
            <div class="flex items-center justify-center gap-xs">
                <span class="h-[1px] w-4 ${isSpy ? 'bg-primary/30' : 'bg-outline-variant/30'}"></span>
                <span class="font-mono-meta text-[11px] ${isSpy ? 'text-primary font-bold tracking-widest' : 'text-secondary'} uppercase">
                    ${colorSet.name} — ${item.player} (${roleName})
                </span>
                <span class="h-[1px] w-4 ${isSpy ? 'bg-primary/30' : 'bg-outline-variant/30'}"></span>
            </div>
        `;
        linesContainer.appendChild(lineBlock);
    });
    
    const hostActions = document.getElementById('gameover-host-actions');
    const clientMessage = document.getElementById('gameover-client-message');
    const continueBtn = document.getElementById('btn-gameover-continue');
    const btnSame = document.getElementById('btn-gameover-same-players');
    
    const myData = state.playersRaw[state.myPlayerId] || { isReady: false };
    
    if (state.isHost) {
        // Host ise: Devam Et butonu ve bekleme mesajı gizli, Host paneli her zaman görünür
        if (continueBtn) continueBtn.classList.add('hidden');
        if (clientMessage) clientMessage.classList.add('hidden');
        if (hostActions) hostActions.classList.remove('hidden');
        
        const otherPlayers = playerEntries.filter(([id, p]) => id !== state.myPlayerId);
        const allOthersReady = otherPlayers.every(([id, p]) => p.isReady);
        
        if (btnSame) {
            const totalOthers = otherPlayers.length;
            const readyOthers = otherPlayers.filter(([id, p]) => p.isReady).length;
            btnSame.textContent = `Aynı Kadroyla Yeniden Oyna (${readyOthers}/${totalOthers})`;
            
            if (allOthersReady && totalOthers > 0) {
                btnSame.disabled = false;
                btnSame.className = "w-full py-md bg-primary-container text-on-primary font-h2 text-h2 uppercase rounded-lg hover:opacity-90 transition-all active:scale-[0.98] duration-200 shadow-lg shadow-primary/10";
            } else {
                btnSame.disabled = true;
                btnSame.className = "w-full py-md bg-outline-variant/20 text-on-surface-variant/40 font-h2 text-h2 uppercase rounded-lg cursor-not-allowed transition-all active:scale-[0.98] duration-200";
            }
        }
    } else {
        // Client (Misafir oyuncu) ise:
        if (hostActions) hostActions.classList.add('hidden');
        
        if (myData.isReady) {
            // Devam Et'e bastıysa bekleme mesajını göster
            if (continueBtn) continueBtn.classList.add('hidden');
            if (clientMessage) clientMessage.classList.remove('hidden');
        } else {
            // Henüz basmadıysa onay butonunu göster
            if (continueBtn) {
                continueBtn.classList.remove('hidden');
                continueBtn.disabled = false;
                continueBtn.textContent = "Devam Et (Lobiye Dön)";
            }
            if (clientMessage) clientMessage.classList.add('hidden');
        }
    }
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
            desc: "Bu kategoriye ait gizli kelimelerle ipuçları yazın ve casusu bulun.",
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
        
        alertActions.style.display = 'block';
        confirmActions.style.display = 'none';
        
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
        
        alertActions.style.display = 'none';
        confirmActions.style.display = 'flex';
        
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

/**
 * Dedektif için sorgulama listesini doldurur.
 */
export function populateDetectiveModal() {
    const selectEl = document.getElementById('stealth-detective-select');
    if (!selectEl) return;
    
    selectEl.innerHTML = '';
    
    const candidates = state.players.filter(p => p !== state.detectivePlayer);
    candidates.forEach(player => {
        const option = document.createElement('option');
        option.value = player;
        option.textContent = player;
        option.className = "bg-surface text-on-surface";
        selectEl.appendChild(option);
    });
}
