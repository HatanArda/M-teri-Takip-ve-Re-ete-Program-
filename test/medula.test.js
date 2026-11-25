// Medula okuyucu testleri. Tüm kişi bilgileri uydurmadır (10000000146 geçerli biçimde örnek bir TC'dir).
const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../src/medula.js");

const UST = [
  "HASTA BİLGİLERİ",
  "T.C. Kimlik No\t10000000146\tE-Reçete No\t1A2B3C",
  "Malzeme Teslim T.C.\t10000000146\tMalzeme Teslim Alan Yakınlık\tKendisi",
  "Adı\tAYŞE NUR\tSoyadı\tDEMİR",
  "Sosyal Güvenlik No\t1990000000001\tCinsiyet\tKadın",
  "Yakınlık\tKendisi\tSigortalı Türü\tÇalışan",
  "Katılım Muafiyet\tHayır\tYaş\t52",
  "REÇETE BİLGİLERİ",
  "Reçete Tarihi\t25/11/2026\tMüracaat Tarihi\t",
  "Malzeme Teslim Tarihi\t25/11/2026\tProtokol No\t9004",
  "Provizyon Tipi\tNormal\tReçete Tipi\tNormal",
  "Reçete Teşhis\tH52.6,H04.1",
  "Tesis Adı\tÖRNEK DEVLET HASTANESİ\tTesis kodu\t11111111",
  "Doktor Adı\tMEHMET KAYA\tDoktor Tescil No\t123456"
];

// Sağ ve Sol cam ayrı tablolarda (alt alta okunur)
const AYRI = UST.concat([
  "YAKIN GÖZLÜK",
  "Gözlük Türü\tYakın",
  "Yakın Çerçeve alacak mı?\t[ ]",
  "Yakın Çerçeve Karekod",
  "SAĞ CAM",
  "Cam\t+/-\tSferik\t+/-\tSilendirik\tAks",
  "[x]\t+\t2,50\t-\t0,50\t85",
  "Karekod Sağ Cam\t",
  "SOL CAM",
  "Cam\t+/-\tSferik\t+/-\tSilendirik\tAks",
  "[x]\t+\t2,75\t-\t0,50\t75",
  "Karekod Sol Cam\t"
]).join("\n");

// Sağ ve Sol cam aynı tabloda yan yana
const YANYANA = UST.concat([
  "UZAK GÖZLÜK",
  "Gözlük Türü\tUzak",
  "SAĞ CAM\tSOL CAM",
  "Cam\t+/-\tSferik\t+/-\tSilendirik\tAks\tCam\t+/-\tSferik\t+/-\tSilendirik\tAks",
  "[x]\t-\t1,25\t-\t0,75\t180\t[x]\t-\t1,00\t+\t0,25\t10"
]).join("\n");

// Tablo yerine kutular: her değer ayrı satırda
const SATIR_SATIR = UST.concat([
  "UZAK GÖZLÜK", "SAĞ CAM", "Cam", "+/-", "Sferik", "+/-", "Silendirik", "Aks",
  "[x]", "-", "3,00", "-", "1,25", "5", "Karekod Sağ Cam",
  "SOL CAM", "Cam", "+/-", "Sferik", "+/-", "Silendirik", "Aks",
  "[x]", "-", "2,50", "Seçiniz", "", "", "Karekod Sol Cam"
]).join("\n");

test("hasta ve reçete bilgileri", () => {
  const r = M.oku(AYRI);
  assert.equal(r.musteri.tc, "10000000146");
  assert.equal(r.musteri.ad, "AYŞE NUR");
  assert.equal(r.musteri.soyad, "DEMİR");
  assert.equal(r.musteri.cinsiyet, "Kadın");
  assert.equal(r.recete.receteNo, "1A2B3C");
  assert.equal(r.recete.tarih, "2026-11-25");
  assert.equal(r.recete.protokolNo, "9004");
  assert.equal(r.recete.teshis, "H52.6,H04.1");
  assert.equal(r.recete.kurum, "ÖRNEK DEVLET HASTANESİ");
  assert.equal(r.recete.doktor, "MEHMET KAYA");
  assert.equal(r.recete.yas, "52");
});

test("yakın gözlük, sağ/sol ayrı tablolar, +/- seçimleri", () => {
  const r = M.oku(AYRI);
  assert.equal(r.gozBulundu, true);
  assert.deepEqual(r.recete.sag.yakin, { sph: 2.5, cyl: -0.5, ax: 85 });
  assert.deepEqual(r.recete.sol.yakin, { sph: 2.75, cyl: -0.5, ax: 75 });
  assert.deepEqual(r.recete.sag.uzak, { sph: null, cyl: null, ax: null });
  assert.equal(r.recete.tur, "Yakın");
  assert.deepEqual(r.uyarilar, []);
});

test("uzak gözlük, sağ/sol yan yana tek tablo", () => {
  const r = M.oku(YANYANA);
  assert.deepEqual(r.recete.sag.uzak, { sph: -1.25, cyl: -0.75, ax: 180 });
  assert.deepEqual(r.recete.sol.uzak, { sph: -1, cyl: 0.25, ax: 10 });
  assert.equal(r.recete.tur, "Uzak");
});

test("tablo olmadan, değerler satır satır", () => {
  const r = M.oku(SATIR_SATIR);
  assert.deepEqual(r.recete.sag.uzak, { sph: -3, cyl: -1.25, ax: 5 });
  assert.deepEqual(r.recete.sol.uzak, { sph: -2.5, cyl: null, ax: null });
});

test("uzak ve yakın birlikte", () => {
  const metin = UST.concat([
    "UZAK GÖZLÜK", "SAĞ CAM", "Cam\t+/-\tSferik\t+/-\tSilendirik\tAks", "[x]\t-\t0,50\t\t\t",
    "SOL CAM", "Cam\t+/-\tSferik\t+/-\tSilendirik\tAks", "[x]\t-\t0,75\t\t\t",
    "YAKIN GÖZLÜK", "SAĞ CAM", "Cam\t+/-\tSferik\t+/-\tSilendirik\tAks", "[x]\t+\t1,50\t\t\t",
    "SOL CAM", "Cam\t+/-\tSferik\t+/-\tSilendirik\tAks", "[x]\t+\t1,25\t\t\t"
  ]).join("\n");
  const r = M.oku(metin);
  assert.equal(r.recete.sag.uzak.sph, -0.5);
  assert.equal(r.recete.sol.uzak.sph, -0.75);
  assert.equal(r.recete.sag.yakin.sph, 1.5);
  assert.equal(r.recete.sol.yakin.sph, 1.25);
  assert.equal(r.recete.tur, "Uzak + Yakın");
});

test("düz kopyalamada değerler yoksa uyarı verir, bilgileri yine okur", () => {
  const metin = UST.concat(["YAKIN GÖZLÜK", "SAĞ CAM", "Cam +/- Sferik +/- Silendirik Aks", "Karekod Sağ Cam", "SOL CAM", "Karekod Sol Cam"]).join("\n");
  const r = M.oku(metin);
  assert.equal(r.gozBulundu, false);
  assert.equal(r.musteri.tc, "10000000146");
  assert.equal(r.uyarilar.length, 1);
});

test("başka biçim: etiketli değerler ve tek satır", () => {
  const r = M.oku([
    "Hasta Adı Soyadı: Ali Can Yıldız",
    "TC Kimlik No: 10000000146",
    "Sağ Uzak  -1,25  -0,50  90",
    "Sol Uzak  -1,00  -0,25  85",
    "ADD: +2,00"
  ].join("\n"));
  assert.equal(r.musteri.ad, "Ali Can");
  assert.equal(r.musteri.soyad, "Yıldız");
  assert.deepEqual(r.recete.sag.uzak, { sph: -1.25, cyl: -0.5, ax: 90 });
  assert.deepEqual(r.recete.sol.uzak, { sph: -1, cyl: -0.25, ax: 85 });
  assert.equal(r.recete.sag.add, 2);
  assert.equal(r.recete.sol.add, 2);
});

test("yardımcılar", () => {
  assert.equal(M.tcGecerli("10000000146"), true);
  assert.equal(M.tcGecerli("10000000147"), false);
  assert.equal(M.sayi("2,50"), 2.5);
  assert.equal(M.sayi("−0.75"), -0.75);
  assert.equal(M.sayi("1990000000001"), null);
  assert.equal(M.tarihISO("05.03.2026"), "2026-03-05");
  assert.equal(typeof M.metinTopla, "function");
});
