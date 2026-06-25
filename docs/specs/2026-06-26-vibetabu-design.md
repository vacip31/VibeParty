# VibeTabu Tasarım Dokümanı (Specification)

Mobil öncelikli, siber-minimalist tasarımlı ve çevrimdışı (PWA) çalışabilen modern bir Tabu oyunu.

---

## 🚀 Oyun Akışı ve Durum Makinesi (State Machine)

Oyunun tüm yaşam döngüsü Vanilla JS ile yazılmış merkezi bir durum kontrol mekanizması ile yönetilir. Durumlar (States):

1.  **`INIT` (Kurulum Ekranı):**
    *   **Takım Yönetimi:** En az 2 olmak üzere dinamik takım ekleme/çıkarma (takım isimleri özelleştirilebilir).
    *   **Kategori Seçimi:** Çoklu kategori seçimi (kullanıcı istediği kategorileri işaretler).
    *   **Zorluk Seçimi:** Kolay, Orta, Zor veya Hepsi Karışık seçimi.
    *   **Oyun Ayarları:** Hedef Skor (örn. 50), Tur Sayısı (örn. 3) veya her ikisi birden. Süre (sn) ve Pas hakkı ayarları.
2.  **`ROUND_READY` (Hazırlık Ekranı):**
    *   Sıradaki takımı ve tura başlayacak olan anlatıcıyı hazırlar.
    *   Cihazı anlatıcıya teslim etme uyarısı ve devasa bir "Tura Başla" butonu.
3.  **`PLAYING` (Aktif Oyun Ekranı):**
    *   Zamanlayıcı (Countdown) geriye doğru sayar.
    *   Kart Gösterimi: Üstte hedef kelime (büyük ve kalın), altta 5 adet yasaklı kelime.
    *   Kontrol Butonları (Parmak hizasında, ekranın en altında):
        *   **[TABU]** (Neon Kırmızı - Puan eksiltir, yeni kart getirir)
        *   **[PAS]** (Kehribar - Puanı etkilemez/pas hakkı harcar, yeni kart getirir)
        *   **[DOĞRU]** (Turkuaz - Puan artırır, yeni kart getirir)
    *   Geri sayım bitmeye yaklaştığında (son 10 saniye) sayaç rengi kırmızıya döner ve nabız (pulse) efekti başlar.
4.  **`ROUND_OVER` (Tur Sonu İnceleme Ekranı):**
    *   Tur süresi bittiğinde açılır.
    *   O tur boyunca basılan tüm kelimeler sırasıyla listelenir (örn. *Ayna -> Doğru*, *Gözlük -> Tabu*).
    *   Takımlar kararlara itiraz ederse, kararlar listeden değiştirilebilir (Doğru -> Tabu veya Pas vb.). Skor anlık olarak yeniden hesaplanır.
    *   "Sonuçları Onayla" butonu ile tur resmi olarak biter.
5.  **`SCOREBOARD` (Skor Tablosu Ekranı):**
    *   Tüm takımların güncel puan tablosu ve sıralaması gösterilir.
    *   Eğer oyun kazanma kriteri (hedef skor veya tur sayısı) sağlanmışsa doğrudan **`GAME_OVER`** ekranına geçilir.
    *   Sağlanmadıysa "Sonraki Tur" butonu ile **`ROUND_READY`** ekranına dönülür.
6.  **`GAME_OVER` (Oyun Bitti / Şampiyon Ekranı):**
    *   Kazanan takım konfeti efekti (CSS ile) ve siber-punk neon efektleriyle ilan edilir.
    *   Detaylı oyun istatistikleri sunulur (en çok doğru bilen takım, en çok tabu yapan takım vb.).
    *   "Yeni Oyun" butonu ile **`INIT`** ekranına dönülür.

---

## 🎨 Arayüz ve Tasarım Sistemi (Cyber-Minimalism)

### Renk Paleti (CSS Variables)
*   **Arka Plan (Background):** `#0B0F19` (Derin, karanlık uzay mavisi/siyah)
*   **Kart Arka Planı (Card Background):** `rgba(30, 41, 59, 0.7)` (Buzlu cam/Glassmorphism efekti, `backdrop-filter: blur(10px)`)
*   **Doğru / Başarı (Turkuaz):** `#00F2FE` (Neon Turkuaz siber neon ışıma efektiyle)
*   **Tabu / Hata (Neon Kırmızı):** `#FF0055` (Neon Pembe/Kırmızı siber ışıma)
*   **Pas / Uyarı (Kehribar):** `#FFB300` (Sıcak turuncu/sarı siber neon)
*   **Yazı Renkleri:**
    *   Birincil: `#FFFFFF`
    *   İkincil (Yasaklı Kelimeler): `#94A3B8` (Açık slate gri)
    *   Süre / Sayaç: Neon Yeşil/Sarı veya son 10 saniye için Kırmızı.

### Mobil Uyum ve Yerleşim (Layout)
*   **Dinamik Viewport Yükseklik Kontrolü:** `height: 100dvh; overflow: hidden;` kullanılarak tarayıcı alt/üst çubuklarının kaydırma yapması engellenir.
*   **Alt Kontroller (Safe Area):** Telefonlarda tek elle (baş parmakla) rahatça basılabilecek büyüklükte ve ekranın en altında konumlandırılmış buton grubu.
*   **Animasyonlar:**
    *   **Doğru Basıldığında:** Kart sağa doğru uçarak kaybolur (`transform: translateX(120%) rotate(10deg); opacity: 0;`).
    *   **Tabu Basıldığında:** Kart sola doğru uçarak kaybolur (`transform: translateX(-120%) rotate(-10deg); opacity: 0;`).
    *   **Pas Basıldığında:** Kart aşağı doğru süzülür (`transform: translateY(120%); opacity: 0;`).

---

## 🔊 Ses Efektleri (Web Audio API)

Dışarıdan büyük `.mp3` dosyaları yükleyip internet bağımlılığı yaratmamak adına tarayıcının yerleşik **Web Audio API** aracı kullanılacaktır. Kod içinde sentezlenecek sesler:
1.  **Doğru Sesi:** Hızlıca yükselen iki temiz sinüs dalgası tonu (örneğin 523Hz -> 659Hz - C5'ten E5'e neşeli geçiş).
2.  **Tabu Sesi:** Alçak frekanslı testere dişi (sawtooth) dalga tonu (örneğin 150Hz, 0.2 saniye süren kalın "dızz" sesi).
3.  **Süre Bitiş Sesi:** 0.5 saniyelik çift tonlu acil durum uyarısı.

---

## 📂 Kelime Veri Yapısı (words.json)

Uygulamanın 5000+ kelimeyi destekleyebilmesi için ölçeklenebilir ve performanslı bir JSON şeması tasarlanmıştır:

```json
[
  {
    "w": "Klavye",
    "f": ["Tuş", "Yazı", "Bilgisayar", "Ekran", "Fare"],
    "c": "Teknoloji",
    "d": "K"
  },
  {
    "w": "Titanik",
    "f": ["Gemi", "Buzdağı", "Okyanus", "Sinema", "Aşk"],
    "c": "Genel",
    "d": "O"
  }
]
```

### Şema Kısaltmaları (Veri Boyutunu Küçültmek İçin):
*   `w`: Word (Hedef Kelime)
*   `f`: Forbidden (5 adet Yasaklı Kelime dizisi)
*   `c`: Category (Kategori ismi: örn. "Teknoloji", "Genel", "Sinema", "Spor", "Tarih", "Coğrafya")
*   `d`: Difficulty (Zorluk Seviyesi: "K" -> Kolay, "O" -> Orta, "Z" -> Zor)

*Not: Kısaltılmış anahtarlar sayesinde 5000 kelimelik veri dosyasının boyutu ~400KB'den ~250KB'ye düşürülerek ağ yükü ve bellek tüketimi en aza indirilecektir.*

---

## 🛠️ Çevrimdışı Çalışma ve PWA Yapısı

Uygulamanın telefona uygulama gibi kurulabilmesi (PWA) ve uçak modunda dahi çalışabilmesi için şu dosyalar eklenecektir:
1.  **`manifest.json`:** Uygulama adı, ikonları, tema renkleri ve ekran yönü ayarları.
2.  **`sw.js` (Service Worker):** `index.html`, `app.js`, `styles.css` ve `words.json` dosyalarını ilk açılışta önbelleğe alacak ve sonraki tüm açılışlarda internet olmasa bile önbellekten sunacaktır.

---

## 🧪 Doğrulama ve Test Planı

1.  **Mobil Tarayıcı Testleri:** Chrome DevTools ile farklı ekran boyutlarında (iPhone SE, iPhone 12 Pro, iPad Air) `100dvh` ve safe-area uyumluluğu doğrulanacak.
2.  **State Machine Testleri:** Kurulum -> Başlama -> Oynama -> Tur Sonu İtirazı -> Skor Güncelleme -> Oyun Kazanma adımlarının tutarlılığı manuel olarak adım adım test edilecek.
3.  **Çevrimdışı (Offline) Doğrulama:** Tarayıcıda Network -> Offline moduna alınıp oyunun kelime listesi dahil sorunsuz açıldığı test edilecek.
