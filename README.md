# 🌌 VibeParty — Mobil Parti Oyunları Portalı

<div align="center">
  <img src="./icon-192.png" width="96" height="96" alt="VibeParty Logo" style="border-radius: 24px; box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);" />
  
  <h3>Parti Gecelerinizi Dijital Şölene Dönüştürün 🎮✨</h3>

  <p align="center">
    <a href="https://vibeparty-game.vercel.app" target="_blank" style="font-weight: bold; color: #ec4899; text-decoration: none;">🎮 Canlı Oyun / Live Demo: vibeparty-game.vercel.app 🚀</a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/PWA-Supported-6366f1?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA Support" />
    <img src="https://img.shields.io/badge/Offline-First-059669?style=for-the-badge&logo=offline&logoColor=white" alt="Offline First" />
    <img src="https://img.shields.io/badge/UI/UX-Cyberpunk_Neon-ec4899?style=for-the-badge" alt="Cyberpunk Theme" />
    <img src="https://img.shields.io/badge/JavaScript-ES6+-f59e0b?style=for-the-badge&logo=javascript&logoColor=black" alt="JS Version" />
  </p>
</div>

---

VibeParty, modern tasarımları, akıcı kullanıcı deneyimleri ve yenivelikçi mekanikleriyle klasik parti oyunlarını arkadaş grupları için dijital bir şölene dönüştüren, **PWA (Progressive Web App)** destekli, tamamen çevrimdışı (offline-first) çalışan bir mobil parti oyunları portalıdır.

Cihazı elden ele gezdirerek, herhangi bir fiziksel kart veya kaleme ihtiyaç duymadan, **Obsidian Glass & Neon** tasarımlı harika bir mobil uygulama arayüzüyle arkadaşlarınızla keyifli vakit geçirebilirsiniz.

---

## 🎮 Portal İçindeki Oyunlar

<table width="100%">
  <tr>
    <td width="50%" align="center">
      <h3>🎯 VibeTabu</h3>
      <p><b>Yasak Kelimeler Oyunu</b></p>
      <p>Klasik Tabu heyecanını siber-neon tema ve modern iddia mekanikleriyle birleştiren takımsal mücadele.</p>
    </td>
    <td width="50%" align="center">
      <h3>🖋️ Vibe X Verses</h3>
      <p><b>İpucu Zinciri & Casus Oyunu</b></p>
      <p>Gizli kelimeyi açık etmeden ipucu zinciri oluştururken, ekibin arasına sızmış olan Casusu bulma veya Casus olarak hayatta kalma mücadelesi.</p>
    </td>
  </tr>
  <tr>
    <td>
      <ul>
        <li><b>🎯 Bonus Puan İddiası:</b> Her tur başında hedef doğru sayısı belirleyerek iddiaya girin (En az +5 doğru yapabilir miyim?).</li>
        <li><b>📊 Canlı İlerleme Takibi:</b> Hedefe mesafeyi gösteren animasyonlu neon barlar.</li>
        <li><b>🛡️ Çift Tıklama Koruması:</b> Hızlı onaylamalarda puanların mükerrer eklenmesini önleyen durum kilitleri.</li>
      </ul>
    </td>
    <td>
      <ul>
        <li><b>👥 Çift Casus Modu:</b> 6 oyuncu ve üzeri için iki casusun da birbirinden habersiz sızdığı paranoid mod.</li>
        <li><b>⏳ Dinamik Kum Saati:</b> 45 veya 90 saniyelik daktilo efektli geri sayım cihazı.</li>
        <li><b>🧠 Esnek Sinonim (Fuzzy Match):</b> Casus tahmin ederken kelimenin eş anlamlılarını ve çağrışımlarını (Örn: <code>Deadline</code> yerine <code>zaman</code> veya <code>is</code>) algılayan sistem.</li>
      </ul>
    </td>
  </tr>
</table>

---

## ✨ Ortak Teknik Mekanikler

*   **💾 Kaldığın Yerden Devam Et (Auto-Save & Resume):** Şarjınız bitse, sayfa kazara yenilense veya tarayıcı kapansa bile portal oyun durumunu her adımda `localStorage` üzerine kaydeder. Giriş ekranlarında beliren **"Oyuna Devam Et"** butonuyla saniyeler içinde kaldığınız yerden devam edebilirsiniz.
*   **🔄 SPA Cihaz Geri Tuşu Entegrasyonu:** Android geri jesti veya tarayıcı geri okuna tıklandığında oyunun tamamen kapanması engellenir. HTML5 History API sayesinde oyun içi görünümler arasında geri gidilir.
*   **📱 PWA Desteği & Çevrimdışı Çalışma:** Servis işçisi (Service Worker) entegrasyonu sayesinde portal bir kez açıldıktan sonra internet bağlantınız olmasa bile sıfır gecikmeyle çalışır.
*   **📳 Haptik Titreşim Geri Bildirimi:** Önemli buton tıklamalarında ve doğru tahminlerde mobil cihazınızda titreşim tetiklenir.

---

## 📱 Mobil Cihaza Ekleme Rehberi (PWA Kurulumu)

VibeParty portalını telefonunuza kurarak tarayıcı çubuklarından arınmış tam ekran modunda ve **internetsiz (çevrimdışı)** oynamak için aşağıdaki adımları takip edin:

### 🍏 iOS (iPhone & iPad - Safari)
1.  Safari tarayıcısından portal adresini açın.
2.  Ekranın altındaki **Paylaş (Share)** butonuna dokunun.
3.  Açılan menüden **Ana Ekrana Ekle (Add to Home Screen)** seçeneğini seçin.
4.  Uygulama adına "VibeParty" yazarak sağ üstteki **Ekle** butonuna dokunun.

### 🤖 Android (Chrome & Samsung Internet)
1.  Google Chrome tarayıcısından portal adresini açın.
2.  Ekranın altında beliren **"Uygulamayı Ana Ekrana Ekle"** banner'ına dokunun.
3.  Banner görünmüyorsa sağ üstteki üç noktaya tıklayıp **Uygulamayı Yükle** seçeneğini seçin.

---

## 🛠️ Yerel Kurulum ve Çalıştırma

VibeParty herhangi bir ekstra veritabanı veya sunucu dili (PHP/Node) gerektirmez. Tamamen statik HTML/JS/CSS ile oluşturulmuştur:

1.  Proje klasörünü yerel bilgisayarınıza alın.
2.  Terminalden klasörün içine girip basit bir HTTP sunucusu başlatın:
    ```bash
    # Python 3x yüklüyse:
    python -m http.server 8000
    
    # veya NodeJS / NPM yüklüyse:
    npx http-server -p 8000
    ```
3.  Tarayıcınızdan **`http://localhost:8000`** adresine gidin.

---

## ✍️ Kelime Ekleme Kılavuzları

### 🎯 VibeTabu Kelimeleri Ekleme
Proje içerisindeki [words.json](file:///e:/CakmaTabu/%C3%87akmaTabu/games/taboo/data/words.json) dosyasını açıp aşağıdaki formatta yeni objeler ekleyin:
```json
{
  "w": "HEDEF_KELİME",
  "f": ["Yasak_1", "Yasak_2", "Yasak_3", "Yasak_4", "Yasak_5"],
  "c": "Kategori_Adı",
  "d": "ALL"
}
```

### 🖋️ Vibe X Verses Kelimeleri Ekleme
Proje içerisindeki [categories.json](file:///e:/CakmaTabu/%C3%87akmaTabu/games/verses/data/categories.json) dosyasını açıp ilgili kategori altındaki `words` listesine sinonimleriyle (casus tahminleri) birlikte ekleyin:
```json
{
  "w": "Gizli Kelime",
  "synonyms": ["alternatif_tahmin_1", "alternatif_tahmin_2"]
}
```

---

## ⚡ Mobil Performans ve Çevrimdışı Optimizasyonlar

Portalın mobil cihazlarda (özellikle düşük donanımlı telefonlar ve iOS/Android tarayıcılar) akıcı çalışması ve internet bağlantısı tamamen kesildiğinde dahi kesintisiz oynanabilmesi için aşağıdaki teknik optimizasyonlar uygulanmıştır:

*   **📦 Statik Tailwind CSS Derlemesi (Play CDN Kaldırılması):** Mobil işlemciyi yoran ve açılışta gecikmeye (FOUC) yol açan dinamik Tailwind Play CDN kullanımı tamamen kaldırılmıştır. Bunun yerine, portal ana sayfası ile her oyunun özelleştirilmiş neon renk şablonları için ayrı ayrı yerel ve optimize edilmiş minified CSS dosyaları derlenmiştir. Bu sayede CSS yükü megabaytlar düzeyinden ortalama 20-30 KB seviyelerine çekilmiş ve internet bağımlılığı sıfırlanmıştır.
*   **📱 Sanal Klavye ve Dinamik Görünüm (Viewport) Uyumu:** Mobil cihazlarda sanal klavye açıldığında butonların ekranın altında kalıp tıklanamaz hale gelmesine yol açan katı dikey yükseklik sınırları esnek bir yapıya dönüştürülmüştür. İçerik panelleri, klavyenin kapladığı alana göre otomatik olarak küçülebilen ve taşma durumunda kaydırılabilen esnek bir dikey düzene kavuşturulmuştur.
*   **🖼️ PWA İkon Sıkıştırma ve Yeniden Ölçeklendirme:** PWA kurulumu ve lobi ekranı için kullanılan ana görsel ikonlar, tarayıcı performansı ve ağ tüketimini optimize etmek için kayıpsız sıkıştırma algoritmalarından (Fast Octree) geçirilmiştir. 192x192 ve 512x512 piksel standartlarına tam uyumlu hale getirilen görsellerde, görsel kaliteden ödün verilmeden dosya boyutlarında %90'ın üzerinde tasarruf sağlanmıştır.
*   **🚀 GPU Hızlandırmalı Skor Çubuğu Animasyonları:** Skor grafiklerindeki ilerleme barlarının animasyon mekanizması, tarayıcının her karede tüm sayfa düzenini yeniden hesaplamasına (layout reflow) neden olan genişlik değişimi yerine, doğrudan ekran kartı (GPU) üzerinden işlenen X eksenli ölçekleme yöntemine geçirilmiştir. Animasyonların hedef değerleri dinamik olarak CSS değişkenleri üzerinden okunarak akıcı ve 60 FPS çalışan bir animasyon performansı elde edilmiştir.
*   **🛡️ Hata Toleranslı Çevrimdışı Kategori Yönetimi:** Vibe X Verses oyununda ağ kesintileri veya çevrimdışı yükleme sorunları nedeniyle kelime veritabanına ulaşılamaması durumu için acil durum yedek kelime havuzu mekanizması kurulmuştur. Bu sayede oyunun beklenmedik şekilde kilitlenmesinin önüne geçilmiş, kısıtlı da olsa kesintisiz oynanabilirliği garanti edilmiştir.

