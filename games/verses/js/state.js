/* Vibe X Verses Oyun Durum Yönetimi (state.js) */

import { isFirebaseInitialized, dbUpdateRoom } from './firebase.js';

export const STATES = {
    WELCOME: 'WELCOME',
    SETUP: 'SETUP',
    LOBBY: 'LOBBY',
    ROLE_DISTRIBUTION: 'ROLE_DISTRIBUTION',
    WRITING: 'WRITING',
    READING: 'READING',
    INTERROGATION: 'INTERROGATION',
    REVEAL: 'REVEAL',
    GAMEOVER: 'GAMEOVER'
};

// Merkezi oyun durumu nesnesi (Firebase'den gelen verilerle güncellenir)
export const state = {
    currentState: STATES.WELCOME,
    players: [], // Oyuncu isimleri listesi (unique strings)
    playerScores: {}, // Oyuncu skorları
    detectivePlayer: "", // Dedektif oyuncu adı
    informantPlayer: "", // Köstebek oyuncu adı
    hasDetectiveUsedSkill: false, // Dedektif ipucunu sorguladı mı
    spyPlayers: [], // Sahte şairler listesi (Çift casus modu)
    doubleSpyMode: false, // Çift casus modu aktif mi
    timerLimit: 0, // Düşünme süresi limiti
    secondsRemaining: 0, // Kalan saniye
    timerIntervalId: null, // Zamanlayıcı interval ID'si
    category: "", // Aktif kategori
    selectedCategory: null, // Kullanıcının seçtiği kategori
    keyword: "", // Aktif kelime
    keywordSynonyms: [], // Aktif kelimenin alternatif eş anlamlı kelimeleri
    spyGuessedCorrectly: false, // Herhangi bir sahte şair kelimeyi bildi mi
    spyGuessText: "", // Sahte şairin tahmini
    totalRounds: 2, // Ayarlanabilir Tur Sayısı
    roundNumber: 1, // Aktif tur sayısı
    writingHistory: [], // [{ player: string, line: string }]
    currentRoundVerses: {}, // Active round verses (playerId -> line)
    spyCandidateWords: [], // Casus için aday kelimeler
    
    // Multiplayer için eklenenler
    roomCode: "",
    myPlayerId: "",
    isHost: false,
    playersRaw: {}, // Firebase'den gelen ham oyuncu verileri (id -> data)
    readingAssignments: {}, // Benim okumam gereken mısra verisi
    allAssignments: {}, // Tüm oyuncuların okuma mısraları
    submittedVersesCount: 0,
    playedWordsHistory: [],
    interrogationPrompt: "",
    exposedSpyIds: []
};

/**
 * Benzersiz isim ve limit ayarlarını günceller (Host tarafında)
 */
export function setTotalRounds(count) {
    state.totalRounds = count;
}

/**
 * Tüm oyunu ve durumları sıfırlar.
 */
export function resetGame() {
    state.currentState = STATES.WELCOME;
    state.roomCode = "";
    state.myPlayerId = "";
    state.isHost = false;
    state.players = [];
    state.playerScores = {};
    state.detectivePlayer = "";
    state.informantPlayer = "";
    state.hasDetectiveUsedSkill = false;
    state.spyPlayers = [];
    state.category = "";
    state.selectedCategory = null;
    state.keyword = "";
    state.spyGuessedCorrectly = false;
    state.spyGuessText = "";
    state.roundNumber = 1;
    state.writingHistory = [];
    state.currentRoundVerses = {};
    state.playersRaw = {};
    state.readingAssignments = {};
    state.allAssignments = {};
    state.submittedVersesCount = 0;
    state.interrogationPrompt = "";
    state.exposedSpyIds = [];
    
    if (state.timerIntervalId) {
        clearInterval(state.timerIntervalId);
        state.timerIntervalId = null;
    }
}

/**
 * Firebase'den gelen verilerle yerel state'i senkronize eder.
 */
export function syncStateFromFirebase(roomData) {
    if (!roomData) return;
    
    state.currentState = roomData.currentState;
    state.roomCode = sessionStorage.getItem("verses_room_code") || "";
    state.myPlayerId = sessionStorage.getItem("verses_player_id") || "";
    state.isHost = sessionStorage.getItem("verses_is_host") === "true";
    
    state.playersRaw = roomData.players || {};
    state.players = Object.values(state.playersRaw).map(p => p.name);
    
    // Ayarlar
    const settings = roomData.settings || {};
    state.category = settings.category || "";
    state.selectedCategory = settings.selectedCategory || null;
    state.keyword = settings.keyword || "";
    state.keywordSynonyms = settings.keywordSynonyms || [];
    state.spyCandidateWords = settings.spyCandidateWords || [];
    state.totalRounds = settings.totalRounds || 2;
    state.timerLimit = settings.timerLimit || 0;
    state.doubleSpyMode = settings.doubleSpyMode || false;
    
    state.roundNumber = roomData.roundNumber || 1;
    
    // Skorları eşle
    state.playerScores = {};
    Object.values(state.playersRaw).forEach(p => {
        state.playerScores[p.name] = p.score || 0;
    });
    
    // Rolleri eşle
    state.spyPlayers = [];
    state.detectivePlayer = "";
    state.informantPlayer = "";
    Object.entries(state.playersRaw).forEach(([id, p]) => {
        if (p.role === "Casus") state.spyPlayers.push(p.name);
        if (p.role === "Dedektif") state.detectivePlayer = p.name;
        if (p.role === "Köstebek") state.informantPlayer = p.name;
    });
    state.hasDetectiveUsedSkill = !!state.playersRaw[state.myPlayerId]?.hasDetectiveUsedSkill;
    
    // Mısra Geçmişi
    const verses = roomData.verses || {};
    const isRoundBasedVerses = Object.values(verses).some(value => value && typeof value === 'object' && !Array.isArray(value));
    state.currentRoundVerses = isRoundBasedVerses ? (verses[state.roundNumber] || {}) : verses;
    state.submittedVersesCount = Object.keys(state.currentRoundVerses).length;
    state.writingHistory = [];

    if (isRoundBasedVerses) {
        Object.entries(verses).forEach(([round, roundVerses]) => {
            Object.entries(roundVerses || {}).forEach(([id, line]) => {
                const playerObj = state.playersRaw[id] || { name: "Bilinmeyen Şair" };
                state.writingHistory.push({
                    round: Number(round),
                    playerId: id,
                    player: playerObj.name,
                    line: line
                });
            });
        });
    } else {
        state.writingHistory = Object.entries(verses).map(([id, line]) => {
            const playerObj = state.playersRaw[id] || { name: "Bilinmeyen Şair" };
            return {
                round: 1,
                playerId: id,
                player: playerObj.name,
                line: line
            };
        });
    }

    state.writingHistory.sort((a, b) => (a.round || 1) - (b.round || 1));
    
    // Atanan Okumalar
    state.allAssignments = roomData.readingAssignments || {};
    state.readingAssignments = state.allAssignments[state.myPlayerId] || null;
    
    // Sonuçlar
    const results = roomData.results || {};
    state.spyGuessedCorrectly = results.spyGuessedCorrectly || false;
    state.spyGuessText = results.spyGuessText || "";
    state.spyExposedByGroup = results.spyExposedByGroup || false;
    state.exposedSpyIds = results.exposedSpyIds || [];
    state.gameStartTime = roomData.gameStartTime || null;
    state.interrogationPrompt = roomData.interrogation?.prompt || "";
}

/**
 * Oyunu kurulan oyuncularla başlatır, kategori ve sahte şair seçer.
 * (Sadece Host çalıştırır)
 */
export function initializeGameFlow(categoriesList) {
    const playerIds = Object.keys(state.playersRaw);
    if (playerIds.length < 4) return false;
    
    // Kategori seç
    let chosenCat;
    if (state.selectedCategory) {
        chosenCat = categoriesList.find(c => c.category === state.selectedCategory) || categoriesList[Math.floor(Math.random() * categoriesList.length)];
    } else {
        chosenCat = categoriesList[Math.floor(Math.random() * categoriesList.length)];
    }
    const randomCat = chosenCat;
    
    // Tekrar korumalı kelime seçimi
    if (!state.playedWordsHistory) state.playedWordsHistory = [];
    let unplayedWords = randomCat.words.filter(word => {
        const wordName = typeof word === 'string' ? word : word.w;
        return !state.playedWordsHistory.includes(wordName);
    });

    if (unplayedWords.length === 0) {
        const catWordNames = randomCat.words.map(word => typeof word === 'string' ? word : word.w);
        state.playedWordsHistory = state.playedWordsHistory.filter(wName => !catWordNames.includes(wName));
        unplayedWords = randomCat.words;
    }

    const pickedWord = unplayedWords[Math.floor(Math.random() * unplayedWords.length)];
    const wordName = typeof pickedWord === 'string' ? pickedWord : pickedWord.w;
    state.playedWordsHistory.push(wordName);
    
    let keyword = "";
    let keywordSynonyms = [];
    if (typeof pickedWord === 'string') {
        keyword = pickedWord;
    } else {
        keyword = pickedWord.w;
        keywordSynonyms = (pickedWord.synonyms || []).map(s => s.toLowerCase());
    }
    
    // Casus aday kelimeler
    const allCategoryWords = randomCat.words.map(w => typeof w === 'string' ? w : w.w);
    const decoyPool = allCategoryWords.filter(w => w !== keyword);
    const shuffledDecoys = shuffle([...decoyPool]);
    const selectedDecoys = shuffledDecoys.slice(0, Math.min(4, shuffledDecoys.length));
    const spyCandidateWords = shuffle([keyword, ...selectedDecoys]);
    
    // Rolleri Dağıt
    const shuffledIds = shuffle([...playerIds]);
    const updatedPlayers = {};
    
    // Casusları Seç
    const spyCount = (state.doubleSpyMode && playerIds.length >= 6) ? 2 : 1;
    const spyPlayerIds = shuffledIds.slice(0, spyCount);
    const remainingIds = shuffledIds.slice(spyCount);
    
    // Renk indekslerini karıştır ve dağıt (Rastgele renk atama)
    const colorIndices = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
    
    playerIds.forEach((id, idx) => {
        updatedPlayers[id] = { 
            ...state.playersRaw[id], 
            isReady: false, 
            submitted: false, 
            hasDetectiveUsedSkill: false, 
            role: "Masum",
            colorIndex: colorIndices[idx % colorIndices.length]
        };
    });
    
    spyPlayerIds.forEach(id => {
        updatedPlayers[id].role = "Casus";
    });
    
    // Dedektif ve Köstebek ata
    if (remainingIds.length > 0) {
        // En az 4 oyuncu varsa Dedektif atayalım
        const detectiveId = remainingIds[0];
        updatedPlayers[detectiveId].role = "Dedektif";
        
        // En az 5 oyuncu varsa Köstebek atayalım
        if (playerIds.length >= 5 && remainingIds.length > 1) {
            const informantId = remainingIds[1];
            updatedPlayers[informantId].role = "Köstebek";
        }
    }
    
    // Veritabanını güncelle
    const updates = {
        currentState: STATES.ROLE_DISTRIBUTION,
        gameStartTime: Date.now(),
        settings: {
            category: randomCat.category,
            selectedCategory: state.selectedCategory,
            keyword: keyword,
            keywordSynonyms: keywordSynonyms,
            spyCandidateWords: spyCandidateWords,
            totalRounds: state.totalRounds,
            timerLimit: state.timerLimit,
            doubleSpyMode: state.doubleSpyMode
        },
        players: updatedPlayers,
        roundNumber: 1,
        verses: {},
        readingAssignments: {},
        results: {
            spyExposedByGroup: false,
            spyGuessedCorrectly: false,
            spyGuessText: ""
        }
    };
    
    dbUpdateRoom(state.roomCode, updates);
    return true;
}

/**
 * Şiir yazma turunu başlatır (Eşzamanlı yazma için hazırlar)
 */
export function startWritingRound(nextRoundNumber = state.roundNumber) {
    const updatedPlayers = {};
    Object.entries(state.playersRaw).forEach(([id, p]) => {
        updatedPlayers[id] = { ...p, isReady: false, submitted: false };
    });

    const updates = {
        currentState: STATES.WRITING,
        roundNumber: nextRoundNumber,
        players: updatedPlayers,
        readingAssignments: {}
    };
    
    dbUpdateRoom(state.roomCode, updates);
}

/**
 * Herkese başkasının yazdığı rastgele bir mısrayı atar.
 * (Tüm mısralar bittiğinde Host tarafından çalıştırılır)
 */
export function assignRandomVerses() {
    const playerIds = Object.keys(state.playersRaw);
    const currentVerses = state.currentRoundVerses || {};
    const eligibleWriterIds = playerIds.filter(id => {
        const hasVerse = !!currentVerses[id];
        const isSpy = state.playersRaw[id]?.role === 'Casus';
        return hasVerse && !(state.roundNumber === 1 && isSpy);
    });

    if (eligibleWriterIds.length === 0) return;

    let assignmentsTemp = {};
    let success = false;
    let attempts = 0;

    while (!success && attempts < 200) {
        attempts++;
        assignmentsTemp = {};
        
        const shuffledReaders = shuffle([...playerIds]);
        const shuffledWriters = shuffle([...eligibleWriterIds]);
        
        let possible = true;
        
        for (const readerId of shuffledReaders) {
            const candidates = shuffledWriters.filter(wId => wId !== readerId);
            if (candidates.length === 0) {
                possible = false;
                break;
            }
            
            const minReadCount = Math.min(...candidates.map(wId => {
                return Object.values(assignmentsTemp).filter(id => id === wId).length;
            }));
            const bestCandidates = candidates.filter(wId => {
                const count = Object.values(assignmentsTemp).filter(id => id === wId).length;
                return count === minReadCount;
            });
            
            const chosenId = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
            assignmentsTemp[readerId] = chosenId;
        }
        
        if (!possible) continue;
        
        const selfRead = Object.entries(assignmentsTemp).some(([rId, wId]) => rId === wId);
        if (selfRead) continue;
        
        if (shuffledReaders.length >= shuffledWriters.length) {
            const allRead = shuffledWriters.every(wId => Object.values(assignmentsTemp).includes(wId));
            if (!allRead) continue;
        }
        
        success = true;
    }

    const assignments = {};
    Object.entries(assignmentsTemp).forEach(([readerId, writerId]) => {
        assignments[readerId] = {
            round: state.roundNumber,
            writerId,
            writerName: state.playersRaw[writerId].name,
            line: currentVerses[writerId]
        };
    });

    const updatedPlayers = {};
    playerIds.forEach(id => {
        updatedPlayers[id] = { ...state.playersRaw[id], isReady: false };
    });

    dbUpdateRoom(state.roomCode, {
        currentState: STATES.READING,
        readingAssignments: assignments,
        players: updatedPlayers
    });
}

/**
 * Sahte şairin kelime tahminini doğrular.
 */
export function checkSpyGuess(guess) {
    const normalizedGuess = normalizeText(guess);
    const normalizedKeyword = normalizeText(state.keyword);
    
    let isCorrect = false;
    
    if (normalizedGuess && normalizedKeyword) {
        if (normalizedGuess === normalizedKeyword || 
            normalizedGuess.includes(normalizedKeyword) || 
            normalizedKeyword.includes(normalizedGuess)) {
            isCorrect = true;
        }
    }
    
    if (!isCorrect && normalizedGuess && state.keywordSynonyms) {
        for (const syn of state.keywordSynonyms) {
            const normalizedSyn = normalizeText(syn);
            if (normalizedGuess === normalizedSyn || 
                normalizedGuess.includes(normalizedSyn) || 
                normalizedSyn.includes(normalizedGuess)) {
                isCorrect = true;
                break;
            }
        }
    }
    
    // Durumu Firebase'de güncelle
    const updates = {
        "results/spyGuessedCorrectly": isCorrect,
        "results/spyGuessText": guess.trim()
    };
    if (isCorrect) {
        updates.currentState = STATES.GAMEOVER;
        // Reset everyone's ready status
        Object.keys(state.playersRaw).forEach(id => {
            updates[`players/${id}/isReady`] = false;
        });
    }
    dbUpdateRoom(state.roomCode, updates);
    
    return isCorrect;
}

/**
 * Fisher-Yates Shuffle karıştırma algoritması
 */
export function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Karakter eşleştirme normalizasyonu
 */
function normalizeText(text) {
    if (!text) return "";
    return text.toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ş/g, 's')
        .replace(/ğ/g, 'g')
        .replace(/ç/g, 'c')
        .replace(/ö/g, 'o')
        .replace(/ü/g, 'u')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

/**
 * Oyun sonu puanlamasını hesaplar (Firebase verilerine göre)
 */
export function calculateScores() {
    const exposedSpyIds = state.exposedSpyIds || [];
    const isSpyGuessedCorrect = state.spyGuessedCorrectly;
    
    // Find all Spies in the room
    const spyEntries = Object.entries(state.playersRaw).filter(([id, p]) => p.role === "Casus");
    
    // A spy team victory happens if at least one spy escapes OR at least one spy guesses correctly
    const escapedSpiesCount = spyEntries.filter(([id, p]) => !exposedSpyIds.includes(id)).length;
    const isSpyVictory = escapedSpiesCount > 0 || isSpyGuessedCorrect;

    const updatedPlayers = { ...state.playersRaw };

    Object.entries(updatedPlayers).forEach(([id, p]) => {
        let currentScore = p.score || 0;
        const role = p.role;

        if (isSpyVictory) {
            // Casus Kazandı
            if (role === "Casus") {
                // Sadece kaçan veya kelimeyi doğru tahmin eden casus puan alır!
                const hasEscaped = !exposedSpyIds.includes(id);
                if (hasEscaped || isSpyGuessedCorrect) {
                    currentScore += 15;
                }
            } else if (role === "Köstebek") {
                currentScore += 10;
            }
        } else {
            // Ekip Kazandı (Tüm casuslar ifşa edildi ve kelimeyi bilemediler)
            if (role !== "Casus" && role !== "Köstebek") {
                currentScore += 10;
            }
        }

        // Casus kelimeyi bildiyse ekstra bonus
        if (role === "Casus" && isSpyGuessedCorrect) {
            currentScore += 10;
        }

        updatedPlayers[id].score = currentScore;
    });

    // Puanları veritabanına kaydet
    dbUpdateRoom(state.roomCode, {
        players: updatedPlayers
    });
}

/**
 * Süre hesaplamasını yapar ve string olarak kaydeder.
 */
export function calculateGameDuration() {
    if (!state.gameStartTime) return "00:00";
    
    const diffMs = Date.now() - state.gameStartTime;
    const diffSec = Math.floor(diffMs / 1000);
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    
    state.gameDurationString = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return state.gameDurationString;
}
