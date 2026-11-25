# Medula → Optik Pro

Medula Optik'teki reçeteyi **iki dokunuşla** Optik Pro'ya aktaran iki Safari yer işareti (bookmarklet).
Kurulum gerekmez; iPad'de ve bilgisayarda çalışır.

| Yer işareti | Nerede dokunulur | Ne yapar |
|---|---|---|
| **Medula'dan Al** | Medula'da hastanın reçete sayfası | Reçeteyi okur (kutuların içindeki değerler ve +/- seçimleri dahil), özet gösterir, **Kopyala** ile panoya alır. |
| **Optik Pro'ya Yaz** | Optik Pro'da Yeni Müşteri ya da reçete ekranı | Kopyalananı kutulara yazar: TC, Ad Soyad, Cinsiyet · Reçete Tarih, e-Reçete No, Reçete Türü (SGK), Hastane, Doktor · Reçete Değerleri (Mesafe, Göz, SPH, CYL, AXİS; gerekirse “+ Yakın Cam Ekle”ye kendisi basar). |

**Güvenlik:**
- İki yer işareti de hiçbir şeyi **kaydetmez** ve bilgileri hiçbir yere **göndermez**. Bilgi yalnızca iPad'in panosundan geçer.
- Optik Pro'da **dolu bir kutunun üzerine yazmaz**. Kaydet'e siz basarsınız.

## Kurulum

1. Kurulum sayfasını açın: `docs/index.html`. GitHub Pages açıksa adresi
   `https://hatanarda.github.io/M-teri-Takip-ve-Re-ete-Program-/` olur.
   Açmak için: repo → **Settings → Pages** → Branch: programın bulunduğu dal, klasör: **/docs** → **Save**.
2. Sayfadaki talimatla iki yer işaretini ekleyin. Her biri için: **Kodu kopyala** → Paylaş → **Yer İşareti Ekle**
   → Yer İşaretleri → Düzenle → adresi silip kodu yapıştırın.

## Bir kutu dolmazsa

"Optik Pro'ya Yaz" kutusundaki **Teşhis** düğmesine basın ve kopyalananı Claude'a yapıştırın.
Teşhis yalnızca ekrandaki kutuların adlarını ve türlerini içerir, **müşteri bilgisi içermez**.

## Geliştirme

| Yer | Ne işe yarar |
|---|---|
| `src/medula.js` | Medula sayfasını metne çevirir ve reçeteyi okur |
| `src/medula-al.js` | "Medula'dan Al" yer işareti |
| `src/optikpro-yaz.js` | "Optik Pro'ya Yaz" yer işareti |
| `src/ortak.js` | Ortak parçalar (ekrandaki kutu, pano, değer biçimleri) |
| `build.js` | Yer işaretlerini paketler, `docs/index.html` kurulum sayfasını üretir |

```
npm install
npm run build   # src/ değişince
npm test
```

Testlerdeki kişi bilgileri uydurmadır.
