# VibeTabu - Sadede Gel! 🎯

VibeTabu, modern tasarımı, akıcı oynanışı ve yenilikçi mekanikleriyle klasik Tabu oyununu arkadaş grupları için dijital bir şölene dönüştüren, PWA (Progressive Web App) destekli, tamamen çevrimdışı çalışan bir mobil/web parti oyunudur.

Fütüristik derin lacivert teması, buzlu cam (glassmorphism) panelleri ve neon ışımalarıyla tasarlanan VibeTabu, hem göze hitap eder hem de sunduğu taktiksel oynanışla partilerinizin vazgeçilmezi olur.

---

## ✨ Öne Çıkan Özellikler

*   **🌌 Obsidian Glass & Neon Tasarım Arayüzü:** Flat tasarımlardan uzak, neon geçişleri, siber parlama efektleri, iOS tarzı buzlu cam arka planlar (`backdrop-blur`) ve görsel şölen sunan akıcı animasyonlar.
*   **💾 Kaldığın Yerden Devam Et (Auto-Save):** Şarjınız bitse, internetiniz kesilse veya sekme kazara yenilense bile oyun kaldığı yerden aynen devam eder! Oyun oynanırken cihaz kapanırsa, hak kaybı olmaması için sistem otomatik olarak o turun aktif anlatıcı ekranından geri yüklenir.
*   **🎰 Bonus Puan İddiası:** Her tur başlamadan önce takımlar hedef doğru sayısı belirleyerek iddiaya girebilir (Örn: *"Bu tur en az 5 doğru yapabilir miyim?"*). Hedefe ulaşılırsa +1 bonus puan kazanılır, ulaşılamazsa -1 ceza puanı düşülür.
*   **📈 Canlı İlerleme & Skor Takibi:** Skor tablosunda takımların hedef skora olan mesafesini gösteren dinamik ilerleme barları, lider ile aradaki farkı gösteren istatistikler ve tur içi aktif doğru geri sayım rozetleri.
*   **📱 PWA & Çevrimdışı Desteği:** İnternet bağlantınız olmasa dahi oyunu tamamen yerel bir mobil uygulama gibi sıfır gecikmeyle oynayabilirsiniz.
*   **📳 Haptik Geri Bildirim:** Doğru, Tabu veya Pas butonlarına tıklandığında cihazınızda gerçekçi ve tatmin edici titreşim efektleri tetiklenir.
*   **🛡️ Çift Tıklama Koruması:** Tur sonlarında skorları onaylarken peş peşe yapılan hızlı tıklamaların skoru mükerrer eklemesini önleyen durum güvenlik kilitleri.
*   **🔍 Akıllı Kelime Taşma Koruması:** Çok uzun kelimelerin kart sınırlarından taşmasını veya kesilmesini önlemek amacıyla, kelime uzunluğuna göre dinamik yazı boyutu ayarlama sistemi.

---

## 📱 Mobil Cihaza Ekleme Rehberi (PWA Kurulumu)

VibeTabu'yu telefonunuza kurarak tarayıcı çubuklarından arınmış tam ekran modunda ve **internetsiz (çevrimdışı)** oynamak için aşağıdaki adımları takip edin:

### 🍏 iOS (iPhone & iPad - Safari)
1.  Telefonunuzdan **Safari** tarayıcısını açın ve oyun adresine gidin.
2.  Ekranın alt kısmındaki **Paylaş (Share)** butonuna (yukarı yönlü ok içeren kare simgesi) dokunun.
3.  Açılan menüyü aşağı kaydırıp **Ana Ekrana Ekle (Add to Home Screen)** seçeneğini seçin.
4.  Uygulama adına "VibeTabu" yazarak sağ üstteki **Ekle (Add)** butonuna dokunun.
5.  Oyun, uygulama ikonunuz olarak ana ekranınıza eklenecektir. Dokunarak tam ekran oynayabilirsiniz!

### 🤖 Android (Chrome & Samsung Internet)
1.  **Google Chrome** tarayıcısından oyun adresine gidin.
2.  Ekranın altında beliren **"VibeTabu uygulamasını ana ekrana ekleyin"** banner'ına dokunun.
3.  Eğer banner görünmüyorsa, sağ üstteki **üç nokta** menüsüne dokunun ve **Uygulamayı Yükle** veya **Ana Ekrana Ekle** seçeneğini seçin.
4.  Açılan pencerede **Yükle** butonuna onay verin. Oyun artık uygulama çekmecenizde ve ana ekranınızda yer alacaktır!

---

## 🛠️ Yerel Kurulum ve Çalıştırma

VibeTabu'yu bilgisayarınızda veya yerel ağınızda çalıştırmak oldukça basittir. Herhangi bir ekstra veritabanı veya karmaşık sunucu kurulumu gerektirmez.

1.  Proje klasörünü bilgisayarınıza indirin.
2.  Terminal veya komut satırını açıp proje klasörüne gidin.
3.  Basit bir HTTP web sunucusu başlatın:
    ```bash
    # Python 3x yüklüyse:
    python -m http.server 8000
    
    # veya NodeJS / NPM yüklüyse:
    npx http-server -p 8000
    ```
4.  Tarayıcınızdan **`http://localhost:8000`** adresini açarak oynamaya başlayın!

---

## ✍️ Yeni Kelimeler Ekleme Kılavuzu

Oyuna kendi özel kelimelerinizi veya yeni kategorileri dahil etmek isterseniz, tek yapmanız gereken data/words.json dosyasını bir metin editörüyle açıp aşağıdaki formatta yeni kelimeler eklemektir:

```json
[
  {
    "w": "HEDEF_KELİME",
    "f": [
      "Yasaklı_Kelime_1",
      "Yasaklı_Kelime_2",
      "Yasaklı_Kelime_3",
      "Yasaklı_Kelime_4",
      "Yasaklı_Kelime_5"
    ],
    "c": "Kategori_Adı",
    "d": "ALL"
  }
]
```

*   `w`: Anlatılması gereken hedef kelime.
*   `f`: Kullanılması kesinlikle yasak olan 5 adet tabu kelime.
*   `c`: Kelimenin ait olduğu kategori adı (Örn: *Genel*, *Popüler Kültür*, *Spor*, *Yemek* vb.).
*   `d`: Zorluk derecesi (*"K"* (Kolay), *"O"* (Orta), *"Z"* (Zor) veya karışık havuz için *"ALL"*).
