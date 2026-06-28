/* VibeTabu Oyun Durum Yönetimi (State Machine) Modülü */

// Oyunun olası durumları
export const STATES = {
    INIT: 'INIT',
    ROUND_READY: 'ROUND_READY',
    PLAYING: 'PLAYING',
    ROUND_OVER: 'ROUND_OVER',
    SCOREBOARD: 'SCOREBOARD',
    GAME_OVER: 'GAME_OVER'
};

// Merkezi oyun durumu nesnesi
export const state = {
    currentState: STATES.INIT,
    
    // Oyun Ayarları
    teams: [], // [{ id, name, score, corrects, tabus, passes }]
    selectedCategories: [],
    selectedDifficulty: 'ALL', // 'K', 'O', 'Z' veya 'ALL'
    timeLimit: 90,
    passLimit: 5, // Sayı veya 'unlimited'
    targetScore: 50,
    
    // Bahis / İddia Mekanizması
    isBetActive: false,
    betTarget: 5,
    nextTeamBetActive: false,
    nextTeamBetTarget: 5,
    lastBetResult: null,
    
    // Aktif Oyun Takibi
    currentTeamIndex: 0,
    currentRoundNumber: 1,
    currentTimer: 90,
    currentPassesUsed: 0,
    
    // Kelime Havuzları
    allWords: [], // data/words.json dosyasından yüklenen tüm kelimeler
    filteredWords: [], // Seçilen kategori/zorluğa göre filtrelenmiş liste
    playedWordsHistory: new Set(), // Tekrarı önlemek için oynanan kelimelerin ID'leri/kelimeleri
    activeCard: null,
    
    // Tur Sonu İnceleme Geçmişi
    roundHistory: [], // [{ word, forbidden, result: 'correct'|'tabu'|'pass', initialResult }]
    currentReviewIndex: 0,
    
    // Puanlama İstatistikleri (Düzeltmeleri yönetmek için tur içi geçici skor takibi)
    roundScoreChange: 0
};

/**
 * Bir diziyi Fisher-Yates algoritması ile karıştırır.
 */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Oyun durumunu ve ayarlarını başlatır.
 */
export function initGame(allWords, teamNames, categories, difficulty, time, passes, target) {
    state.allWords = allWords;
    state.selectedCategories = categories;
    state.selectedDifficulty = difficulty;
    state.timeLimit = time;
    state.passLimit = passes === 'Sınırsız' ? 'unlimited' : parseInt(passes, 10);
    state.targetScore = parseInt(target, 10);
    
    // Takımları oluştur
    state.teams = teamNames.map((name, index) => ({
        id: index,
        name: name.trim() || `Takım ${index + 1}`,
        score: 0,
        corrects: 0,
        tabus: 0,
        passes: 0
    }));
    
    state.currentTeamIndex = 0;
    state.currentRoundNumber = 1;
    state.playedWordsHistory.clear();
    state.isBetActive = false;
    state.nextTeamBetActive = false;
    state.lastBetResult = null;
    state.currentState = STATES.ROUND_READY;
    
    // Kelime havuzunu filtrele ve hazırla
    prepareWordPool();
    saveGameStateToStorage();
}

/**
 * Seçilen filtrelere göre kelime havuzunu hazırlar.
 */
export function prepareWordPool() {
    let pool = [...state.allWords];
    
    // Kategoriye göre filtrele
    if (state.selectedCategories.length > 0) {
        pool = pool.filter(word => state.selectedCategories.includes(word.c));
    }
    
    // Zorluğa göre filtrele
    if (state.selectedDifficulty !== 'ALL') {
        pool = pool.filter(word => word.d === state.selectedDifficulty);
    }
    
    // Eğer filtreleme sonucu kelime kalmadıysa tüm listeyi fallback olarak kullan
    if (pool.length === 0) {
        pool = [...state.allWords];
    }
    
    state.filteredWords = shuffle(pool);
}

/**
 * Yeni tur için durumları ve sayaçları sıfırlar.
 */
export function startRound() {
    state.currentTimer = state.timeLimit;
    state.currentPassesUsed = 0;
    state.roundHistory = [];
    state.currentReviewIndex = 0;
    state.roundScoreChange = 0;
    // isBetActive ve betTarget Hazırlık Ekranında (setupRoundReadyView) kurulduğu için doğrudan kullanılıyor
    state.currentState = STATES.PLAYING;
    
    drawNextCard();
    saveGameStateToStorage();
}

/**
 * Havuzdan sıradaki kelime kartını çeker.
 */
export function drawNextCard() {
    if (state.filteredWords.length === 0) {
        // Havuz bittiğinde sıfırla ve tekrar karıştır
        prepareWordPool();
    }
    
    // Havuzdan kelimeyi çek ve geçmişe ekle
    let nextWord = state.filteredWords.pop();
    
    // Eğer kelime bu turda veya yakın zamanda oynandıysa başka kelime dene
    let attempts = 0;
    while (state.playedWordsHistory.has(nextWord.w) && attempts < 50 && state.filteredWords.length > 0) {
        state.filteredWords.unshift(nextWord); // Havuzun arkasına at
        nextWord = state.filteredWords.pop();
        attempts++;
    }
    
    state.playedWordsHistory.add(nextWord.w);
    state.activeCard = nextWord;
    return nextWord;
}

/**
 * Aktif kart için verilen kararı (Doğru, Tabu, Pas) kaydeder.
 * Geriye yeni kartı döndürür.
 */
export function recordDecision(decision) {
    if (!state.activeCard) return null;
    
    const team = state.teams[state.currentTeamIndex];
    
    // Pas limiti kontrolü
    if (decision === 'pass' && state.passLimit !== 'unlimited' && state.currentPassesUsed >= state.passLimit) {
        // Pas hakkı bittiyse karar kaydedilmez, aynı kartta kalınır
        return state.activeCard;
    }
    
    // Kararı geçmişe ekle (tur sonu incelemesi için)
    state.roundHistory.push({
        word: state.activeCard.w,
        forbidden: state.activeCard.f,
        result: decision,
        initialResult: decision
    });
    
    // Geçici puanı güncelle
    if (decision === 'correct') {
        state.roundScoreChange++;
    } else if (decision === 'tabu') {
        state.roundScoreChange -= 2;
    } else if (decision === 'pass') {
        state.currentPassesUsed++;
    }
    
    // Yeni kart çek
    return drawNextCard();
}

/**
 * Tur sonu inceleme ekranında geçmiş kararı düzeltir.
 * Puan değişimini anlık hesaplar.
 */
export function updateRoundHistoryDecision(index, newDecision) {
    const historyItem = state.roundHistory[index];
    if (!historyItem) return;
    
    const oldDecision = historyItem.result;
    if (oldDecision === newDecision) return;
    
    // Eski kararın etkisini geri al
    if (oldDecision === 'correct') {
        state.roundScoreChange--;
    } else if (oldDecision === 'tabu') {
        state.roundScoreChange += 2;
    }
    
    // Yeni kararın etkisini uygula
    if (newDecision === 'correct') {
        state.roundScoreChange++;
    } else if (newDecision === 'tabu') {
        state.roundScoreChange -= 2;
    }
    
    // Kararı güncelle
    historyItem.result = newDecision;
}

/**
 * Tur bittiğinde skorları takımların kalıcı hanesine yazar.
 * Oyunun bitip bitmediğini kontrol eder.
 */
export function confirmRoundScores() {
    if (state.currentState !== STATES.ROUND_OVER) return;
    
    const team = state.teams[state.currentTeamIndex];
    
    // Bu turdaki istatistikleri ve nihai skoru ekle
    let roundCorrects = 0;
    let roundTabus = 0;
    let roundPasses = 0;
    
    state.roundHistory.forEach(item => {
        if (item.result === 'correct') roundCorrects++;
        else if (item.result === 'tabu') roundTabus++;
        else if (item.result === 'pass') roundPasses++;
    });
    
    // Bahis puanı hesaplama ve uygulama
    let betBonus = 0;
    state.lastBetResult = null;
    if (state.isBetActive) {
        if (roundCorrects >= state.betTarget) {
            betBonus = 1;
            state.lastBetResult = 'win';
        } else {
            betBonus = -1;
            state.lastBetResult = 'lose';
        }
    }
    
    team.score += state.roundScoreChange + betBonus;
    team.corrects += roundCorrects;
    team.tabus += roundTabus;
    team.passes += roundPasses;
    
    // Sıradaki takıma geç
    state.currentTeamIndex++;
    
    // Tüm takımlar oynadıysa bir tur tamamlanmıştır
    if (state.currentTeamIndex >= state.teams.length) {
        state.currentTeamIndex = 0;
        state.currentRoundNumber++;
    }
    
    // Oyun bitti mi kontrol et (Hedef skor aşımı veya limit kontrolü)
    const isGameOver = checkGameOver();
    if (isGameOver) {
        state.currentState = STATES.GAME_OVER;
    } else {
        state.currentState = STATES.SCOREBOARD;
    }
    saveGameStateToStorage();
}

/**
 * Kazanma koşullarını denetler.
 */
function checkGameOver() {
    // 1. Koşul: Hedef skora ulaşan var mı?
    // En yüksek skora sahip takımı bul
    const sortedTeams = [...state.teams].sort((a, b) => b.score - a.score);
    const highestScore = sortedTeams[0].score;
    
    // Eğer en yüksek skor hedef skora ulaşmışsa ve tur tamamlanmışsa (herkes eşit sayıda tur oynamışsa) oyun biter
    if (highestScore >= state.targetScore && state.currentTeamIndex === 0) {
        return true;
    }
    
    return false;
}

/**
 * Oyunu tamamen sıfırlar.
 */
export function resetGame() {
    state.currentState = STATES.INIT;
    state.teams = [];
    state.roundHistory = [];
    state.playedWordsHistory.clear();
    clearGameStateFromStorage();
}

const LOCAL_STORAGE_KEY = 'vibesave_gamestate';

export function saveGameStateToStorage() {
    try {
        const serializedState = {
            currentState: state.currentState,
            teams: state.teams,
            selectedCategories: state.selectedCategories,
            selectedDifficulty: state.selectedDifficulty,
            timeLimit: state.timeLimit,
            passLimit: state.passLimit,
            targetScore: state.targetScore,
            currentTeamIndex: state.currentTeamIndex,
            currentRoundNumber: state.currentRoundNumber,
            playedWordsHistory: Array.from(state.playedWordsHistory)
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(serializedState));
    } catch (e) {
        console.error("Save error:", e);
    }
}

export function loadGameStateFromStorage(allWords) {
    try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!saved) return false;
        
        const data = JSON.parse(saved);
        state.allWords = allWords;
        state.currentState = data.currentState;
        state.teams = data.teams;
        state.selectedCategories = data.selectedCategories;
        state.selectedDifficulty = data.selectedDifficulty;
        state.timeLimit = data.timeLimit;
        state.passLimit = data.passLimit;
        state.targetScore = data.targetScore;
        state.currentTeamIndex = data.currentTeamIndex;
        state.currentRoundNumber = data.currentRoundNumber;
        state.playedWordsHistory = new Set(data.playedWordsHistory);
        
        // Güvenlik kontrolü: Oyun oynanırken yarıda kaldıysa, o takımın hazırlık ekranına dön
        if (state.currentState === STATES.PLAYING || state.currentState === STATES.ROUND_OVER) {
            state.currentState = STATES.ROUND_READY;
        }
        
        prepareWordPool();
        return true;
    } catch (e) {
        console.error("Load error:", e);
        return false;
    }
}

export function clearGameStateFromStorage() {
    try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
        console.error("Clear error:", e);
    }
}
