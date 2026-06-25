/* VibeTabu Web Audio API Ses Sentez Modülü */

let audioCtx = null;

/**
 * Tarayıcı ses bağlamını (AudioContext) başlatır veya mevcut olanı döndürür.
 * Tarayıcıların otomatik ses çalma engeline takılmamak için kullanıcı etkileşimi ile çağrılmalıdır.
 */
function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

/**
 * Kullanıcının ilk etkileşiminde ses modülünü ısıtır (unlock).
 */
export function initAudio() {
    try {
        getAudioContext();
    } catch (e) {
        console.warn("Ses bağlamı başlatılamadı:", e);
    }
}

/**
 * Doğru cevap sesi: İki hızlı yükselen sinüs dalgası (C5 -> E5).
 */
export function playCorrect() {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5 (Do)
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5 (Mi)
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.25);
    } catch (e) {
        console.warn("Ses çalma hatası:", e);
    }
}

/**
 * Tabu cevap sesi: Kalın ve kirli testere dişi dalgası (140Hz).
 */
export function playTabu() {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.3);
    } catch (e) {
        console.warn("Ses çalma hatası:", e);
    }
}

/**
 * Süre bitimi alarm sesi: Çift frekanslı üçgen dalga uyarısı.
 */
export function playTimeOver() {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.setValueAtTime(280, now + 0.2);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.55);
    } catch (e) {
        console.warn("Ses çalma hatası:", e);
    }
}

/**
 * Sayfa geçiş sesi: Yumuşak ve fütüristik yükselen bir sinüs kayması (sweeping sine).
 */
export function playTransition() {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        // 300Hz'den 800Hz'e hızlı bir kayma (whoosh hissi için)
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        
        gain.gain.setValueAtTime(0.06, now); // Çok yüksek olmasın, kulağı yormasın
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.15);
    } catch (e) {
        console.warn("Ses çalma hatası:", e);
    }
}
