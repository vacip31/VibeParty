/* Vibe X Verses Firebase Entegrasyon Modülü (firebase.js) */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    set, 
    get,
    onValue, 
    push, 
    remove, 
    update, 
    onDisconnect 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Firebase Yapılandırması (Kullanıcı kendi bilgileriyle doldurmalıdır)
// NOT: Kendi Firebase projenizi oluşturup buradaki bilgileri güncelleyin.
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

try {
    // API anahtarı girilmediyse veya varsayılan değerdeyse uyarı ver ama çökme
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
        app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        isFirebaseInitialized = true;
        console.log("Firebase başarıyla başlatıldı.");
    } else {
        console.warn("Firebase yapılandırması henüz ayarlanmadı! Lütfen js/firebase.js dosyasındaki API bilgilerini doldurun.");
    }
} catch (e) {
    console.error("Firebase başlatılırken hata oluştu:", e);
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
    if (!isFirebaseInitialized) return { success: false, error: "Firebase başlatılamadı. Lütfen API bilgilerini ayarlayın." };
    
    const playerId = generateUUID();
    const roomRef = ref(db, `rooms/${roomCode}`);
    
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
        await set(roomRef, initialRoomData);
        
        // Host çıkarsa veya interneti koparsa odayı komple veritabanından temizle
        await onDisconnect(roomRef).remove();
        
        // Kendi bilgimizi yerel tarayıcıda saklayalım
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
    if (!isFirebaseInitialized) return { success: false, error: "Firebase başlatılamadı. Lütfen API bilgilerini ayarlayın." };
    
    const roomRef = ref(db, `rooms/${roomCode}`);
    
    try {
        const snapshot = await get(roomRef);
        if (!snapshot.exists()) {
            return { success: false, error: "Oda bulunamadı! Lütfen oda kodunu kontrol edin." };
        }
        
        const roomData = snapshot.val();
        if (roomData.currentState !== "LOBBY") {
            return { success: false, error: "Bu oyun zaten başlamış!" };
        }
        
        // Oyuncu adı çakışma kontrolü
        const players = roomData.players || {};
        const nameExists = Object.values(players).some(p => p.name.toLowerCase() === playerName.trim().toLowerCase());
        if (nameExists) {
            return { success: false, error: "Bu isimde bir oyuncu odada zaten var." };
        }
        
        if (Object.keys(players).length >= 8) {
            return { success: false, error: "Oda dolu! (Maksimum 8 oyuncu)" };
        }
        
        const playerId = generateUUID();
        const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);
        
        await set(playerRef, {
            name: playerName.trim(),
            score: 0,
            isReady: false,
            submitted: false,
            role: "LOBBY"
        });
        
        // Oyuncu çıkarsa odadaki kendi kaydını temizle (Host değilse sadece kendi kaydı silinir)
        await onDisconnect(playerRef).remove();
        
        // Kendi bilgimizi saklayalım
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
export function dbListenToRoom(roomCode, callback) {
    if (!isFirebaseInitialized) return null;
    const roomRef = ref(db, `rooms/${roomCode}`);
    return onValue(roomRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val());
        } else {
            callback(null); // Oda kapandıysa veya silindiyse null döner
        }
    });
}

/**
 * Odayı günceller (Sadece host veya yetkili yazar)
 */
export async function dbUpdateRoom(roomCode, updates) {
    if (!isFirebaseInitialized) return;
    const roomRef = ref(db, `rooms/${roomCode}`);
    try {
        await update(roomRef, updates);
    } catch (e) {
        console.error("Veritabanı güncelleme hatası:", e);
    }
}

/**
 * Host oyundan bilerek çıkarsa odayı tamamen siler
 */
export async function dbDestroyRoom(roomCode) {
    if (!isFirebaseInitialized) return;
    const roomRef = ref(db, `rooms/${roomCode}`);
    try {
        await remove(roomRef);
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
    const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);
    try {
        await remove(playerRef);
        sessionStorage.removeItem("verses_room_code");
        sessionStorage.removeItem("verses_player_id");
        sessionStorage.removeItem("verses_is_host");
    } catch (e) {
        console.error("Odadan ayrılırken hata:", e);
    }
}

export { isFirebaseInitialized };
