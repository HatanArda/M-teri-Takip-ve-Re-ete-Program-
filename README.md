# Müşteri Takip ve Reçete Programı

Optik dükkânı için müşteri dosyası: **Medula Optik'teki reçeteyi tek dokunuşla müşteri dosyasına
kaydeder**, satılan ürünleri, fiyatları, ödemeleri ve kalan borcu tutar.

- iPad'de (Safari ya da ana ekran), bilgisayarda (Chrome, Edge, Safari) ve telefonda çalışır.
- Kurulum gerektirmez; internet olmadan da açılır.
- **Veriler yalnızca sizin cihazınızda durur.** Hiçbir sunucuya gönderilmez (KVKK açısından önemli).

---

## 1. Ne yapar?

| Ekran | İçinde ne var |
|---|---|
| **Müşteriler** | Ad, soyad, TC ya da telefonla anında arama. Borcu olanlar kırmızı rozetle görünür. |
| **Müşteri dosyası** | Kişisel bilgiler, tüm reçeteler (Sağ/Sol, Uzak/Yakın, SPH/CYL/AKS, ADD, PD) ve tüm satışlar. |
| **Medula'dan al** | Medula'daki reçeteyi okur, kontrol ettirir, kaydeder. Müşteri TC'den otomatik bulunur. |
| **Satış** | Çerçeve, cam, lens, güneş gözlüğü… Adet, fiyat, indirim, **SGK/kurum ödemesi**, peşinat, kalan borç, durum (Sipariş verildi → Hazır → Teslim edildi), teslim tarihi. |
| **İşler** | Teslim bekleyen siparişler, borcu olan müşteriler, bugünkü ve bu ayki tahsilat. |
| **Ayarlar** | Dükkân adı, Medula yer işareti kurulumu, yedek indir / geri yükle, Excel'e aktar, tema. |

Ek olarak: reçete ve satış fişi **yazdırma** (AirPrint ya da PDF), reçetede **transpoze**
(CYL işaretini çevirme), aynı reçetenin iki kez kaydedilmesine karşı uyarı, geçersiz TC uyarısı.

---

## 2. Medula'dan reçete nasıl gelir?

Medula'daki göz değerleri (2,50 · 85 gibi) ve +/- seçimleri **kutuların içinde** durur.
"Tümünü seç → Kopyala" yapıldığında Safari bu kutuların içini kopyalamaz. Bu yüzden program,
bir **yer işareti düğmesi** (bookmarklet) kullanır:

1. Medula Optik'te hastanın reçete sayfasını açın.
2. Safari'de **Yer İşaretleri → Medula → Müşteri Takip**'e dokunun.
3. Çıkan kutuda **Programda aç**'a dokunun. Reçete programda açılır, kontrol edip **Kaydet** deyin.

Yer işareti Medula'ya **hiçbir şey yazmaz**, hiçbir yere bilgi göndermez. Yalnızca ekranda gördüğünüzü
okuyup bu programa taşır. Okunanlar: T.C. Kimlik No, Adı, Soyadı, Cinsiyet, Yaş, E-Reçete No,
Reçete Tarihi, Protokol No, Reçete Teşhis, Tesis Adı, Doktor Adı, Uzak/Yakın Gözlük ve Sağ/Sol cam
(+/-, Sferik, Silindirik, Aks). Kaydetmeden önce her şeyi düzeltebilirsiniz.

> **Ana ekrana eklediyseniz:** iPad, ana ekrandaki uygulamaya Safari'den bilgi aktarmaya izin vermez
> (ikisi ayrı veri tutar). O zaman yer işaretinde **Kopyala**'ya basın, programda
> **Medula'dan al → Kopyalananı yapıştır** deyin. En kısa yol: programı Safari'de açık bir sekmede
> kullanmak (yer işaretlerine ekleyin).

---

## 3. İlk kurulum (bir kez)

### 3A. Programı internete koyma (GitHub Pages, ücretsiz)

Program, `docs/` klasöründeki dosyalardan oluşur. Bu dosyaları GitHub Pages yayınlar.
Yayınlanan yalnızca programın kendisidir; **müşteri verileri yayınlanmaz**, onlar her zaman cihazınızda kalır.

1. GitHub'da bu repoyu açın → **Settings** → soldan **Pages**.
2. **Source:** "Deploy from a branch". **Branch:** programın bulunduğu dal (ör. `main`), klasör **`/docs`** → **Save**.
3. 1-2 dakika sonra sayfanın üstünde adres çıkar:
   `https://KULLANICIADINIZ.github.io/M-teri-Takip-ve-Re-ete-Program-/`
4. Bu adresi iPad'de Safari'de açın. **Paylaş** (yeni iPad'lerde **•••** menüsünde) → **Yer İşareti Ekle** → Konum: **Sık Kullanılanlar** → **Kaydet**.

> Repo **özel (private)** ise GitHub Pages ücretsiz planda çalışmaz. O zaman repoyu herkese açık
> yapabilirsiniz (içinde müşteri verisi yoktur, yalnızca program kodu vardır) ya da ücretli plan gerekir.

### 3B. Medula yer işaretini ekleme (iPad, Safari)

1. Programda **Ayarlar → Medula yer işareti → Kodu kopyala**.
2. Safari'de **Paylaş → Yer İşareti Ekle**. Adını **Medula → Müşteri Takip** yapın → **Kaydet**.
3. **Yer İşaretleri → Düzenle** → bu yer işaretine dokunun → adres satırını tümüyle silin →
   kopyaladığınız kodu **yapıştırın** → **Bitti**.

Bilgisayarda: yer işaretleri çubuğunu açın ve Ayarlar'daki **"Medula → Müşteri Takip"** düğmesini
sürükleyip çubuğa bırakın.

---

## 4. Verileriniz ve yedek

- Veriler, programı açtığınız **tarayıcının içinde** (IndexedDB) saklanır. Her değişiklik
  anında kaydedilir (başlıkta "Kaydedildi 14:32").
- **iPad ve bilgisayar birbirini görmez.** Her cihazın verisi ayrıdır. Taşımak için bir cihazda
  **Yedek indir**, diğerinde **Yedekten geri yükle**.
- **Otomatik günlük kopya:** Her gün ilk açılışta cihaz içinde bir kopya alınır (son 14 gün).
  Yanlışlıkla silinen bir şeyi geri almak için: **Ayarlar → Otomatik günlük kopyalar**.
- **Yedek indir (önemli):** Cihaz kaybolursa ya da Safari verileri silinirse, günlük kopyalar da gider.
  **Haftada bir** Ayarlar → **Yedek indir** ile dosyayı iCloud Drive'a ya da Dosyalar'a kaydedin.
  7 günden eski yedekte program sizi uyarır.
- **Excel'e aktar:** Müşteriler, Reçeteler, Satışlar, Ürünler ve Ödemeler ayrı sayfalarda.
- Yedekten geri yüklemeden önce o anki veriler otomatik olarak ayrıca saklanır.

---

## 5. Klasörde ne var?

| Yer | Ne işe yarar |
|---|---|
| `docs/index.html` | Ekran tasarımı |
| `docs/app.js` | Ekranlar, kayıt, yedek, yazdırma |
| `docs/logic.js` | Veri yapısı ve hesaplar (toplam, kalan borç, arama, transpoze) |
| `docs/medula.js` | Medula sayfasını okuyan bölüm ve yer işareti kodu |
| `docs/sw.js` | İnternetsiz çalışma |
| `docs/vendor/` | Excel aracı (SheetJS, Apache 2.0 lisansı) |
| `test/` | Otomatik testler |

## 6. Testler

Bilgisayarda Node.js kuruluysa proje klasöründe:

```
npm test
```

Testler Medula sayfasının farklı kopyalanma biçimlerini (ayrı tablolar, yan yana tablo, satır satır,
uzak + yakın birlikte, değerlerin gelmediği düz kopya), TC doğrulamasını, satış/borç hesaplarını,
Türkçe para biçimini, transpozeyi ve aramayı dener. Testlerdeki kişi bilgileri uydurmadır.

## 7. Program güncellenirse

Yeni dosyalar GitHub'a gönderilince program bir sonraki açılışta kendini günceller. Veriler
programın içinde değil tarayıcıda durduğu için güncellemede **kaybolmaz**.
