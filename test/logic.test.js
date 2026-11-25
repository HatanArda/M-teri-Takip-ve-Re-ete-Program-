const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../docs/logic.js");

function ornek() {
  return L.normalize({
    musteriler: [
      { id: "m1", ad: "Ayşe Nur", soyad: "Demir", tc: "10000000146", tel: "0532 111 22 33" },
      { id: "m2", ad: "Ali", soyad: "Işık", tel: "05441234567" }
    ],
    receteler: [{ id: "r1", musteriId: "m1", tarih: "2026-11-25", receteNo: "1A2B3C", tur: "Yakın", sag: { yakin: { sph: 2.5, cyl: -0.5, ax: 85 } } }],
    satislar: [{
      id: "s1", musteriId: "m1", receteId: "r1", tarih: "2026-11-25",
      kalemler: [{ tur: "Çerçeve", aciklama: "Ray-Ban", adet: 1, fiyat: 2500 }, { tur: "Cam", aciklama: "1.56 HMC", adet: 2, fiyat: 450.5 }],
      indirim: 100, kurumPayi: 340.79,
      odemeler: [{ tarih: "2026-11-25", tutar: 1000, yontem: "Kart" }]
    }]
  });
}

test("satış toplamları ve kalan borç", () => {
  const st = ornek(), s = st.satislar[0];
  assert.equal(L.araToplam(s), 3401);
  assert.equal(L.netToplam(s), 2960.21);
  assert.equal(L.odenen(s), 1000);
  assert.equal(L.kalan(s), 1960.21);
  assert.equal(L.musteriBakiye(st, "m1"), 1960.21);
  assert.equal(L.musteriBakiye(st, "m2"), 0);
});

test("para okuma ve yazma (Türkçe biçim)", () => {
  assert.equal(L.paraOku("1.250,50"), 1250.5);
  assert.equal(L.paraOku("1250.5"), 1250.5);
  assert.equal(L.paraOku("1.250"), 1250);
  assert.equal(L.paraOku("2500 ₺"), 2500);
  assert.equal(L.paraOku(""), 0);
  assert.ok(Number.isNaN(L.paraOku("abc")));
  assert.equal(L.paraYaz(1960.21), "1.960,21 ₺");
  assert.equal(L.paraYaz(-5), "−5,00 ₺");
});

test("dioptri ve aks", () => {
  assert.equal(L.dioptriOku("-1,25"), -1.25);
  assert.equal(L.dioptriOku("+2"), 2);
  assert.equal(L.dioptriOku(""), null);
  assert.ok(Number.isNaN(L.dioptriOku("1-2")));
  assert.equal(L.aksOku("180"), 180);
  assert.ok(Number.isNaN(L.aksOku("190")));
  assert.equal(L.dioptriYaz(2.5), "+2,50");
  assert.equal(L.dioptriYaz(-0.75), "−0,75");
  assert.equal(L.dioptriYaz(0), "0,00");
  assert.equal(L.ceyrekMi(1.25), true);
  assert.equal(L.ceyrekMi(1.3), false);
});

test("transpoze", () => {
  assert.deepEqual(L.transpoze({ sph: 2.5, cyl: -0.5, ax: 85 }), { sph: 2, cyl: 0.5, ax: 175 });
  assert.deepEqual(L.transpoze({ sph: -1, cyl: 0.25, ax: 100 }), { sph: -0.75, cyl: -0.25, ax: 10 });
  assert.deepEqual(L.transpoze(L.transpoze({ sph: -1, cyl: -0.75, ax: 180 })), { sph: -1, cyl: -0.75, ax: 180 });
});

test("arama: ad, Türkçe harf, TC, telefon", () => {
  const st = ornek();
  assert.deepEqual(L.ara(st, "ayse").map(m => m.id), ["m1"]);
  assert.deepEqual(L.ara(st, "IŞIK").map(m => m.id), ["m2"]);
  assert.deepEqual(L.ara(st, "isik ali").map(m => m.id), ["m2"]);
  assert.deepEqual(L.ara(st, "1000000").map(m => m.id), ["m1"]);
  assert.deepEqual(L.ara(st, "544 123").map(m => m.id), ["m2"]);
  assert.equal(L.ara(st, "").length, 2);
});

test("Medula kişisini kayıtlı müşteriyle eşleştirme ve aynı reçete", () => {
  const st = ornek();
  assert.deepEqual(L.eslesenler(st, { tc: "10000000146", ad: "X", soyad: "Y" }), { kesin: true, liste: [st.musteriler[0]] });
  assert.equal(L.eslesenler(st, { tc: "", ad: "ALİ", soyad: "IŞIK" }).liste[0].id, "m2");
  assert.equal(L.eslesenler(st, { tc: "", ad: "Veli", soyad: "Kara" }).liste.length, 0);
  assert.ok(L.ayniRecete(st, "m1", { receteNo: "1A2B3C", tarih: "2026-11-25", tur: "Yakın" }));
  assert.equal(L.ayniRecete(st, "m1", { receteNo: "1A2B3C", tarih: "2026-11-25", tur: "Uzak" }), null);
});

test("normalize: bozuk veriyi reddeder, eksikleri tamamlar", () => {
  assert.equal(L.normalize(null), null);
  assert.equal(L.normalize({ foo: 1 }), null);
  const st = L.normalize({ musteriler: [{ ad: "A" }], satislar: [{ musteriId: "x", kalemler: [{ tur: "?", fiyat: "12.345" }], durum: "?" }] });
  assert.ok(st.musteriler[0].id);
  assert.equal(st.satislar[0].kalemler[0].tur, "Diğer");
  assert.equal(st.satislar[0].kalemler[0].adet, 1);
  assert.equal(st.satislar[0].durum, "Sipariş verildi");
  assert.deepEqual(st.receteler, []);
});

test("normalize: boş göz değerleri boş kalır, 0 sıfır kalır", () => {
  const st = L.normalize({ musteriler: [], receteler: [{ sag: { uzak: { sph: null, cyl: "", ax: undefined }, yakin: { sph: 0, cyl: -0.5, ax: 0 }, add: null }, sol: {} }] });
  const r = st.receteler[0];
  assert.deepEqual(r.sag.uzak, { sph: null, cyl: null, ax: null });
  assert.deepEqual(r.sag.yakin, { sph: 0, cyl: -0.5, ax: 0 });
  assert.equal(r.sag.add, null);
  assert.deepEqual(r.sol.uzak, { sph: null, cyl: null, ax: null });
  assert.equal(L.gozBos(r.sag.uzak), true);
});
