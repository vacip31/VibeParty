/* VibeTabu Sistem, Platform ve Donanım Yardımcıları Modülü */

import { state } from './state.js';
import { locales } from './locales.js';
import { views, showView } from './ui.js';

/**
 * Google Play Store üzerinden yeni bir güncelleme olup olmadığını kontrol eder.
 */
export async function checkForUpdates() {
    // Disabled in Web Portal
}

/**
 * Yeni güncelleme uyarısını gösterir.
 */
export function showUpdateModal(updateResult) {
    const modal = document.getElementById('update-modal');
    if (!modal) return;
    if (modal.style.display === 'flex') return;

    modal.style.display = 'flex';

    const confirmBtn = document.getElementById('btn-update-confirm');
    const laterBtn = document.getElementById('btn-update-later');

    if (confirmBtn) {
        const freshConfirm = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(freshConfirm, confirmBtn);
        freshConfirm.onclick = async () => {
            const AppUpdate = window.Capacitor && window.Capacitor.Plugins.AppUpdate;
            modal.style.display = 'none';
            try {
                if (AppUpdate && updateResult.immediateUpdateAllowed) {
                    await AppUpdate.performImmediateUpdate();
                } else if (AppUpdate) {
                    await AppUpdate.openAppStore();
                } else {
                    rateApp();
                }
            } catch (err) {
                console.error('Failed to trigger in-app update:', err);
                rateApp();
            }
        };
    }

    if (laterBtn) {
        const freshLater = laterBtn.cloneNode(true);
        laterBtn.parentNode.replaceChild(freshLater, laterBtn);
        if (updateResult.immediateUpdateAllowed && !updateResult.flexibleUpdateAllowed) {
            freshLater.style.display = 'none';
        } else {
            freshLater.style.display = 'block';
            freshLater.onclick = () => {
                closeModal(modal);
            };
        }
    }
}

/**
 * Dile göre yedek kelime havuzunu döner (Ağ hatası durumunda).
 */
export function getFallbackWords(lang) {
    const fallbacks = {
        tr: [
            { "w": "Klavye", "f": ["Tuş", "Yazı", "Bilgisayar", "Ekran", "Fare"], "c": "Teknoloji", "d": "K" },
            { "w": "Titanik", "f": ["Gemi", "Buzdağı", "Okyanus", "Aşk", "Leonardo"], "c": "Sinema", "d": "K" },
            { "w": "Futbol", "f": ["Top", "Kale", "Maç", "Oyuncu", "Ayak"], "c": "Spor", "d": "K" },
            { "w": "İstanbul", "f": ["Boğaz", "Köprü", "Metropol", "Türkiye", "Cami"], "c": "Genel", "d": "K" }
        ],
        en: [
            { "w": "Keyboard", "f": ["Key", "Type", "Computer", "Screen", "Mouse"], "c": "Technology", "d": "K" },
            { "w": "Titanic", "f": ["Ship", "Iceberg", "Ocean", "Love", "Leonardo"], "c": "Cinema", "d": "K" },
            { "w": "Football", "f": ["Ball", "Goal", "Match", "Player", "Foot"], "c": "Sports", "d": "K" },
            { "w": "London", "f": ["Big Ben", "Bridge", "UK", "River", "Capital"], "c": "General", "d": "K" }
        ],
        de: [
            { "w": "Tastatur", "f": ["Taste", "Schreiben", "Computer", "Bildschirm", "Maus"], "c": "Technologie", "d": "K" },
            { "w": "Titanic", "f": ["Schiff", "Eisberg", "Ozean", "Liebe", "Leonardo"], "c": "Kino", "d": "K" },
            { "w": "Fußball", "f": ["Ball", "Tor", "Spiel", "Spieler", "Fuß"], "c": "Sport", "d": "K" },
            { "w": "Berlin", "f": ["Mauer", "Hauptstadt", "Deutschland", "Bär", "Brücke"], "c": "Allgemein", "d": "K" }
        ],
        fr: [
            { "w": "Clavier", "f": ["Touche", "Écrire", "Ordinateur", "Écran", "Souris"], "c": "Technologie", "d": "K" },
            { "w": "Titanic", "f": ["Bateau", "Iceberg", "Océan", "Amour", "Leonardo"], "c": "Cinéma", "d": "K" },
            { "w": "Football", "f": ["Ballon", "But", "Match", "Joueur", "Pied"], "c": "Sport", "d": "K" },
            { "w": "Paris", "f": ["Tour Eiffel", "Capitale", "France", "Seine", "Musée"], "c": "Général", "d": "K" }
        ],
        es: [
            { "w": "Teclado", "f": ["Tecla", "Escribir", "Ordenador", "Pantalla", "Ratón"], "c": "Tecnología", "d": "K" },
            { "w": "Titanic", "f": ["Barco", "Iceberg", "Océano", "Amor", "Leonardo"], "c": "Cine", "d": "K" },
            { "w": "Fútbol", "f": ["Balón", "Gol", "Partido", "Jugador", "Pie"], "c": "Deportes", "d": "K" },
            { "w": "Madrid", "f": ["Capital", "España", "Museo", "Prado", "Plaza"], "c": "General", "d": "K" }
        ],
        ru: [
            { "w": "Клавиатура", "f": ["Клавиша", "Печать", "Компьютер", "Экран", "Мышь"], "c": "Технологии", "d": "K" },
            { "w": "Титаник", "f": ["Корабль", "Айсберг", "Океан", "Любовь", "Леонардо"], "c": "Кино", "d": "K" },
            { "w": "Футбол", "f": ["Мяч", "Ворота", "Матч", "Игрок", "Нога"], "c": "Спорт", "d": "K" },
            { "w": "Москва", "f": ["Кремль", "Столица", "Россия", "Река", "Площадь"], "c": "Общие", "d": "K" }
        ],
        zh: [
            { "w": "键盘", "f": ["按键", "打字", "电脑", "屏幕", "鼠标"], "c": "科技", "d": "K" },
            { "w": "泰坦尼克号", "f": ["船", "冰山", "海洋", "爱情", "莱昂纳多"], "c": "电影", "d": "K" },
            { "w": "足球", "f": ["球", "球门", "比赛", "球员", "脚"], "c": "体育", "d": "K" },
            { "w": "北京", "f": ["长城", "首都", "中国", "故宫", "广场"], "c": "通用", "d": "K" }
        ]
    };
    return fallbacks[lang] || fallbacks.tr;
}

/**
 * Oyun içi özel ve şık uyarı modalı gösterir.
 */
export function showCustomAlert(title, message, icon = 'check_circle', iconColorClass = 'text-primary') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-alert-modal');
        const titleEl = document.getElementById('custom-alert-title');
        const messageEl = document.getElementById('custom-alert-message');
        const iconEl = document.getElementById('custom-alert-icon');
        const iconContainer = document.getElementById('custom-alert-icon-container');
        const btnOk = document.getElementById('btn-custom-alert-ok');

        if (!modal) {
            console.warn('custom-alert-modal element is missing. Falling back to native alert.');
            alert(message);
            resolve();
            return;
        }

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        if (iconEl) {
            iconEl.textContent = icon;
            iconEl.style.fontSize = '22px';
            iconEl.style.color = iconColorClass.includes('primary') ? 'rgb(27, 153, 139)' : 
                                 iconColorClass.includes('secondary') ? 'rgb(255, 155, 113)' : 
                                 'rgba(255, 255, 255, 0.8)';
        }
        
        if (iconContainer) {
            if (iconColorClass.includes('primary')) {
                iconContainer.style.background = 'rgba(27, 153, 139, 0.12)';
            } else if (iconColorClass.includes('secondary')) {
                iconContainer.style.background = 'rgba(255, 155, 113, 0.12)';
            } else {
                iconContainer.style.background = 'rgba(255, 255, 255, 0.08)';
            }
        }

        // Arka plan ortam ışığını ikona göre güncelle
        const glowEl = document.getElementById('custom-alert-glow');
        if (glowEl) {
            if (iconColorClass.includes('primary')) {
                glowEl.style.background = 'rgba(27, 153, 139, 0.15)';
            } else if (iconColorClass.includes('secondary')) {
                glowEl.style.background = 'rgba(255, 155, 113, 0.15)';
            } else {
                glowEl.style.background = 'rgba(255, 255, 255, 0.05)';
            }
        }

        // Modalı göster
        modal.style.display = 'flex';

        const toastPanel = modal.querySelector('.glass-panel');
        let autoDismissTimeout = null;

        const onClick = () => {
            if (autoDismissTimeout) clearTimeout(autoDismissTimeout);
            closeModal(modal);
            if (btnOk) btnOk.removeEventListener('click', onBtnClick);
            if (toastPanel) toastPanel.removeEventListener('click', onClick);
            resolve();
        };

        const onBtnClick = (e) => {
            e.stopPropagation(); // Panel tıklama tetikleyicisini durdur
            onClick();
        };

        // 3.5 saniye sonra otomatik kapanış
        autoDismissTimeout = setTimeout(onClick, 3500);

        // Tıklayarak anında kapatma dinleyicileri
        if (btnOk) btnOk.addEventListener('click', onBtnClick);
        if (toastPanel) toastPanel.addEventListener('click', onClick);
    });
}

/**
 * Cihazın internet bağlantısını kontrol eder.
 */
export function checkInternetConnection() {
    const internetModal = document.getElementById('internet-modal');
    if (!internetModal) return true;

    if (state.isPremium) {
        closeModal(internetModal);
        return true;
    }

    if (!navigator.onLine) {
        internetModal.style.display = 'flex';
        return false;
    } else {
        closeModal(internetModal);
        return true;
    }
}

/**
 * Kullanıcıyı Google Play Store sayfasına yönlendirir.
 */
export function rateApp() {
    // Disabled in Web Portal
}

function getExitGameConfirmMessage(lang) {
    return lang === 'tr'
        ? 'Oyundan çıkıp ana menüye dönmek istiyor musunuz? Devam ederseniz mevcut oyun kaydı silinecek.'
        : 'Do you want to exit the game and return to the main menu? Continuing will delete the saved game.';
}

/**
 * Android fiziksel geri tuşunu Capacitor App eklentisiyle dinler ve yönetir.
 */
export function initHardwareBackButton(actions) {
    // Disabled in Web Portal
}

/**
 * Modalları yumuşak bir fade-out veya toast-out animasyonuyla kapatır.
 */
export function closeModal(modal) {
    if (!modal) return;
    
    // Tost bildirimi veya standart modal için uygun çıkış sınıfını seç
    const isToast = modal.id === 'custom-alert-modal';
    const exitClass = isToast ? 'animate-toast-out' : 'animate-fade-out';
    
    modal.classList.add(exitClass);
    
    // Animasyon süresi (200ms) sonunda modalı gizle ve sınıfı temizle
    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove(exitClass);
    }, 200);
}

// Global test utilities
if (typeof window !== 'undefined') {
    window.closeModal = closeModal;
}
