/* Vibe X Verses Firebase Entegrasyon Modülü (firebase.js) */

// Firebase Yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSyB-GxsGGIU43pvd_Xc0t-k2xUx66WmhdL8",
    authDomain: "vibeverses.firebaseapp.com",
    databaseURL: "https://vibeverses-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "vibeverses",
    storageBucket: "vibeverses.firebasestorage.app",
    messagingSenderId: "770186191882",
    appId: "1:770186191882:web:233ab18a3ae0bc4ff32bf3"
};

let app;
let db;
let isFirebaseInitialized = false;

// Firebase SDK fonksiyonları (dinamik olarak yüklenecek)
let _initializeApp, _getDatabase, _ref, _set, _get, _onValue, _push, _remove, _update, _onDisconnect;

/**
 * Firebase SDK'yı dinamik olarak yükler.
 * CDN erişilemezse uygulama çökmez, sadece Firebase özellikleri devre dışı kalır.
 */
export async function loadFirebase() {
    if (isFirebaseInitialized) return true;
    try {
        const appModule = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
        const dbModule = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js");

        _initializeApp = appModule.initializeApp;
        _getDatabase = dbModule.getDatabase;
        _ref = dbModule.ref;
        _set = dbModule.set;
        _get = dbModule.get;
        _onValue = dbModule.onValue;
        _push = dbModule.push;
        _remove = dbModule.remove;
        _update = dbModule.update;
        _onDisconnect = dbModule.onDisconnect;

        app = _initializeApp(firebaseConfig);
        db = _getDatabase(app);
        isFirebaseInitialized = true;
        console.log("Firebase başarıyla başlatıldı.");
        return true;
    } catch (e) {
        console.error("Firebase yüklenemedi:", e);
        return false;
    }
}


/**
 * UUID üreten yardımcı fonksiyon
 */
function generateUUID() {
    return 'p_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36).substr(-4);
}

/**
 * Yeni bir oda oluşturur (Host)
 */
export async function dbCreateRoom(roomCode, hostName, settings) {
    const ok = await loadFirebase();
    if (!ok) return { success: false, error: "Firebase yüklenemedi. İnternet bağlantınızı kontrol edin." };
    
    const playerId = generateUUID();
    const roomRef = _ref(db, `rooms/${roomCode}`);
    
    const initialRoomData = {
        hostId: playerId,
        currentState: "LOBBY",
        settings: {
            category: settings.category || "",
            selectedCategory: settings.selectedCategory || null,
            keyword: settings.keyword || "",
            keywordSynonyms: settings.keywordSynonyms || [],
            spyCandidateWords: settings.spyCandidateWords || [],
            totalRounds: settings.totalRounds || 2,
            timerLimit: settings.timerLimit || 0,
            doubleSpyMode: settings.doubleSpyMode || false
        },
        players: {
            [playerId]: {
                name: hostName,
                score: 0,
                isReady: true,
                submitted: false,
                role: "LOBBY"
            }
        },
        roundNumber: 1,
        verses: {},
        readingAssignments: {},
        results: {
            spyExposedByGroup: false,
            spyGuessedCorrectly: false,
            spyGuessText: ""
        }
    };

    try {
        await _set(roomRef, initialRoomData);
        await _onDisconnect(roomRef).remove();
        sessionStorage.setItem("verses_room_code", roomCode);
        sessionStorage.setItem("verses_player_id", playerId);
        sessionStorage.setItem("verses_is_host", "true");
        return { success: true, playerId };
    } catch (e) {
        console.error("Oda oluşturulurken hata:", e);
        return { success: false, error: e.message };
    }
}

/**
 * Mevcut bir odaya katılır (Player)
 */
export async function dbJoinRoom(roomCode, playerName) {
    const ok = await loadFirebase();
    if (!ok) return { success: false, error: "Firebase yüklenemedi. İnternet bağlantınızı kontrol edin." };
    
    const roomRef = _ref(db, `rooms/${roomCode}`);
    
    try {
        const snapshot = await _get(roomRef);
        if (!snapshot.exists()) {
            return { success: false, error: "Oda bulunamadı! Lütfen oda kodunu kontrol edin." };
        }
        
        const roomData = snapshot.val();
        if (roomData.currentState !== "LOBBY") {
            return { success: false, error: "Bu oyun zaten başlamış!" };
        }
        
        const players = roomData.players || {};
        const nameExists = Object.values(players).some(p => p.name.toLowerCase() === playerName.trim().toLowerCase());
        if (nameExists) {
            return { success: false, error: "Bu isimde bir oyuncu odada zaten var." };
        }
        
        if (Object.keys(players).length >= 8) {
            return { success: false, error: "Oda dolu! (Maksimum 8 oyuncu)" };
        }
        
        const playerId = generateUUID();
        const playerRef = _ref(db, `rooms/${roomCode}/players/${playerId}`);
        
        await _set(playerRef, {
            name: playerName.trim(),
            score: 0,
            isReady: false,
            submitted: false,
            role: "LOBBY"
        });
        
        await _onDisconnect(playerRef).remove();
        sessionStorage.setItem("verses_room_code", roomCode);
        sessionStorage.setItem("verses_player_id", playerId);
        sessionStorage.setItem("verses_is_host", "false");
        return { success: true, playerId };
    } catch (e) {
        console.error("Odaya katılırken hata:", e);
        return { success: false, error: e.message };
    }
}

/**
 * Oda verilerini gerçek zamanlı dinler
 */
export async function dbListenToRoom(roomCode, callback) {
    const ok = await loadFirebase();
    if (!ok) return null;
    const roomRef = _ref(db, `rooms/${roomCode}`);
    return _onValue(roomRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val());
        } else {
            callback(null);
        }
    });
}

/**
 * Odayı günceller (Sadece host veya yetkili yazar)
 */
export async function dbUpdateRoom(roomCode, updates) {
    if (!isFirebaseInitialized) return;
    const roomRef = _ref(db, `rooms/${roomCode}`);
    try {
        await _update(roomRef, updates);
    } catch (e) {
        console.error("Veritabanı güncelleme hatası:", e);
    }
}

/**
 * Host oyundan bilerek çıkarsa odayı tamamen siler
 */
export async function dbDestroyRoom(roomCode) {
    if (!isFirebaseInitialized) return;
    const roomRef = _ref(db, `rooms/${roomCode}`);
    try {
        await _remove(roomRef);
        sessionStorage.removeItem("verses_room_code");
        sessionStorage.removeItem("verses_player_id");
        sessionStorage.removeItem("verses_is_host");
    } catch (e) {
        console.error("Oda silinirken hata:", e);
    }
}

/**
 * Oyuncu kendi isteğiyle odadan çıkarsa
 */
export async function dbLeaveRoom(roomCode, playerId) {
    if (!isFirebaseInitialized) return;
    const playerRef = _ref(db, `rooms/${roomCode}/players/${playerId}`);
    try {
        await _remove(playerRef);
        sessionStorage.removeItem("verses_room_code");
        sessionStorage.removeItem("verses_player_id");
        sessionStorage.removeItem("verses_is_host");
    } catch (e) {
        console.error("Odadan ayrılırken hata:", e);
    }
}

export { isFirebaseInitialized };
