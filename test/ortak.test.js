const test = require("node:test");
const assert = require("node:assert/strict");
const O = require("../src/ortak.js");
const M = require("../src/medula.js");

test("Optik Pro biçimi: dioptri, aks, tarih", () => {
  assert.equal(O.mtDioptri(2.5), "+2.50");
  assert.equal(O.mtDioptri(-1.5), "-1.50");
  assert.equal(O.mtDioptri(0), "0.00");
  assert.equal(O.mtDioptri(2.5, true), "2.50");
  assert.equal(O.mtDioptri(null), "");
  assert.equal(O.mtAks(85), "85");
  assert.equal(O.mtAks(null), "");
  assert.equal(O.mtTarihTR("2026-11-25"), "25.11.2026");
});

test("Medula reçetesinden Optik Pro satırları", () => {
  const r = M.oku([
    "T.C. Kimlik No\t10000000146", "Adı\tALİ\tSoyadı\tKAYA",
    "UZAK GÖZLÜK", "SAĞ CAM", "Cam\t+/-\tSferik\t+/-\tSilendirik\tAks", "[x]\t-\t1,50\t+\t2,50\t20",
    "SOL CAM", "Cam\t+/-\tSferik\t+/-\tSilendirik\tAks", "[x]\t+\t1,25\t+\t0,75\t170",
    "YAKIN GÖZLÜK", "SAĞ CAM", "Cam\t+/-\tSferik\t+/-\tSilendirik\tAks", "[x]\t+\t1,00\t+\t2,50\t20",
    "SOL CAM", "Cam\t+/-\tSferik\t+/-\tSilendirik\tAks", "[x]\t+\t3,75\t+\t0,75\t170"
  ].join("\n"));
  assert.deepEqual(O.mtSatirlar(r.recete), [
    { mesafe: "Uzak", goz: "SAĞ", sph: -1.5, cyl: 2.5, ax: 20, add: null },
    { mesafe: "Uzak", goz: "SOL", sph: 1.25, cyl: 0.75, ax: 170, add: null },
    { mesafe: "Yakın", goz: "SAĞ", sph: 1, cyl: 2.5, ax: 20, add: null },
    { mesafe: "Yakın", goz: "SOL", sph: 3.75, cyl: 0.75, ax: 170, add: null }
  ]);
});

test("harf sadeleştirme Medula okuyucusuyla aynı", () => {
  for (const s of ["Reçete Tarih *", "AXİS", "GÖZ", "Işık ŞÇĞÜÖ", "e-Reçete No"]) assert.equal(O.mtFold(s), M.fold(s));
});
