// Veri yapısı, hesaplar ve biçimlendirme. Arayüzden bağımsızdır, testler de bunu kullanır.
(function (root) {
  "use strict";
  var M = typeof module !== "undefined" && module.exports ? require("./medula.js") : root.Medula;

  var SURUM = 1;
  var URUN_TURLERI = ["Çerçeve", "Cam", "Lens", "Güneş gözlüğü", "Solüsyon", "Aksesuar", "Diğer"];
  var DURUMLAR = ["Sipariş verildi", "Hazır", "Teslim edildi"];
  var ODEME_YONTEMLERI = ["Nakit", "Kart", "Havale/EFT"];
  var RECETE_TURLERI = ["Uzak", "Yakın", "Uzak + Yakın", "Multifokal", "Lens"];

  function yeniId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function bugun(d) { d = d || new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  function bosDurum() {
    return { v: SURUM, musteriler: [], receteler: [], satislar: [], ayarlar: { dukkan: "", sonYedek: null } };
  }

  function str(x) { return x == null ? "" : String(x).trim(); }
  // Boş değer boş kalmalı: Number(null) = 0 olduğu için önce boşluk kontrolü.
  function num(x) { if (x == null || x === "") return null; var n = Number(x); return isFinite(n) ? n : null; }
  function gozDeger(g) {
    g = g || {};
    return { sph: num(g.sph), cyl: num(g.cyl), ax: num(g.ax) };
  }
  function goz(g) {
    g = g || {};
    return { uzak: gozDeger(g.uzak), yakin: gozDeger(g.yakin), add: num(g.add) };
  }
  function para(x) { var n = Number(x); return isFinite(n) ? Math.round(n * 100) / 100 : 0; }

  // Dosyadan/yedekten gelen veriyi güvenli biçime getirir. Geçersizse null.
  function normalize(st) {
    if (!st || typeof st !== "object" || !Array.isArray(st.musteriler)) return null;
    var out = bosDurum();
    var a = st.ayarlar || {};
    out.ayarlar = { dukkan: str(a.dukkan), sonYedek: a.sonYedek || null };
    out.musteriler = st.musteriler.filter(Boolean).map(function (m) {
      return {
        id: str(m.id) || yeniId(), ad: str(m.ad), soyad: str(m.soyad), tc: str(m.tc), tel: str(m.tel),
        dogum: str(m.dogum), cinsiyet: str(m.cinsiyet), adres: str(m.adres), not: str(m.not),
        olusturma: m.olusturma || bugun()
      };
    });
    out.receteler = (st.receteler || []).filter(Boolean).map(function (r) {
      return {
        id: str(r.id) || yeniId(), musteriId: str(r.musteriId), tarih: str(r.tarih), receteNo: str(r.receteNo),
        takipNo: str(r.takipNo), protokolNo: str(r.protokolNo), doktor: str(r.doktor), brans: str(r.brans),
        kurum: str(r.kurum), teshis: str(r.teshis), yas: str(r.yas), tur: str(r.tur),
        sag: goz(r.sag), sol: goz(r.sol), pdUzak: str(r.pdUzak), pdYakin: str(r.pdYakin),
        not: str(r.not), kaynak: r.kaynak === "medula" ? "medula" : "elle", eklenme: r.eklenme || bugun()
      };
    });
    out.satislar = (st.satislar || []).filter(Boolean).map(function (s) {
      return {
        id: str(s.id) || yeniId(), musteriId: str(s.musteriId), receteId: str(s.receteId), tarih: str(s.tarih) || bugun(),
        kalemler: (s.kalemler || []).filter(Boolean).map(function (k) {
          return { tur: URUN_TURLERI.indexOf(k.tur) >= 0 ? k.tur : "Diğer", aciklama: str(k.aciklama), adet: Math.max(1, Math.round(Number(k.adet) || 1)), fiyat: para(k.fiyat) };
        }),
        indirim: para(s.indirim), kurumPayi: para(s.kurumPayi),
        odemeler: (s.odemeler || []).filter(Boolean).map(function (o) {
          return { id: str(o.id) || yeniId(), tarih: str(o.tarih) || bugun(), tutar: para(o.tutar), yontem: ODEME_YONTEMLERI.indexOf(o.yontem) >= 0 ? o.yontem : "Nakit" };
        }),
        durum: DURUMLAR.indexOf(s.durum) >= 0 ? s.durum : DURUMLAR[0],
        teslimTarihi: str(s.teslimTarihi), not: str(s.not)
      };
    });
    return out;
  }

  // ---- Satış hesapları ----
  function araToplam(s) { return para(s.kalemler.reduce(function (t, k) { return t + k.adet * k.fiyat; }, 0)); }
  function netToplam(s) { return para(araToplam(s) - (s.indirim || 0) - (s.kurumPayi || 0)); }
  function odenen(s) { return para(s.odemeler.reduce(function (t, o) { return t + o.tutar; }, 0)); }
  function kalan(s) { return para(netToplam(s) - odenen(s)); }
  function musteriBakiye(st, musteriId) {
    return para(st.satislar.filter(function (s) { return s.musteriId === musteriId; }).reduce(function (t, s) { return t + kalan(s); }, 0));
  }

  // "1.250,50" "1250.5" "1250" -> 1250.5
  function paraOku(x) {
    var t = String(x == null ? "" : x).replace(/[₺\s]|TL/gi, "");
    if (!t) return 0;
    if (t.indexOf(",") >= 0) t = t.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
    var n = Number(t);
    return isFinite(n) ? para(n) : NaN;
  }
  function paraYaz(n) {
    n = para(n);
    var neg = n < 0; n = Math.abs(n);
    var tam = Math.floor(n), kurus = Math.round((n - tam) * 100);
    var s = String(tam).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + pad(kurus);
    return (neg ? "−" : "") + s + " ₺";
  }

  // ---- Göz değerleri ----
  function dioptriYaz(v) {
    if (v == null || v === "") return "";
    v = Number(v);
    if (v === 0) return "0,00";
    return (v > 0 ? "+" : "−") + Math.abs(v).toFixed(2).replace(".", ",");
  }
  function aksYaz(v) { return v == null || v === "" ? "" : String(Math.round(v)) + "°"; }
  // Elle girilen dioptri: "-1,25" "1.5" "+2" -> sayı; boş -> null; hatalı -> NaN
  function dioptriOku(x) {
    var t = String(x == null ? "" : x).trim().replace(/−/g, "-").replace(/\s/g, "");
    if (!t) return null;
    if (!/^[+-]?\d{1,2}([.,]\d{1,2})?$/.test(t)) return NaN;
    return Number(t.replace(",", "."));
  }
  function aksOku(x) {
    var t = String(x == null ? "" : x).trim().replace(/°/g, "");
    if (!t) return null;
    if (!/^\d{1,3}$/.test(t) || Number(t) > 180) return NaN;
    return Number(t);
  }
  // Silindir işaretini çevirir: SPH' = SPH + CYL, CYL' = −CYL, AKS' = AKS ± 90
  function transpoze(g) {
    if (!g || g.cyl == null || g.cyl === 0) return g;
    var ax = g.ax == null ? null : (g.ax <= 90 ? g.ax + 90 : g.ax - 90);
    return { sph: Math.round(((g.sph || 0) + g.cyl) * 100) / 100, cyl: -g.cyl, ax: ax };
  }
  function ceyrekMi(v) { return v == null || Math.abs(v * 4 - Math.round(v * 4)) < 1e-9; }
  function gozBos(g) { return g.sph == null && g.cyl == null && g.ax == null; }

  // ---- Müşteri ----
  function adSoyad(m) { return (m.ad + " " + m.soyad).trim() || "(adsız)"; }
  function aramaMetni(m) { return M.fold([m.ad, m.soyad, m.tc, m.tel, m.not].join(" ")) + " " + String(m.tel).replace(/\D/g, ""); }
  function ara(st, q) {
    var kelimeler = M.fold(q).split(" ").filter(Boolean);
    var rakam = String(q || "").replace(/\D/g, "");
    return st.musteriler.filter(function (m) {
      if (!kelimeler.length) return true;
      var t = aramaMetni(m);
      if (rakam.length >= 4 && t.indexOf(rakam) >= 0) return true;
      return kelimeler.every(function (k) { return t.indexOf(k) >= 0; });
    });
  }
  function sonIslem(st, musteriId) {
    var t = "";
    st.receteler.forEach(function (r) { if (r.musteriId === musteriId && r.tarih > t) t = r.tarih; });
    st.satislar.forEach(function (s) { if (s.musteriId === musteriId && s.tarih > t) t = s.tarih; });
    return t;
  }

  // Medula'dan gelen kişi için kayıtlı müşteri bulur: önce TC, sonra ad soyad.
  function eslesenler(st, kisi) {
    if (kisi.tc && M.tcGecerli(kisi.tc)) {
      var tcli = st.musteriler.filter(function (m) { return m.tc === kisi.tc; });
      if (tcli.length) return { kesin: true, liste: tcli };
    }
    var ad = M.fold(kisi.ad + " " + kisi.soyad);
    if (!ad) return { kesin: false, liste: [] };
    return { kesin: false, liste: st.musteriler.filter(function (m) { return M.fold(m.ad + " " + m.soyad) === ad && (!m.tc || !kisi.tc || m.tc === kisi.tc); }) };
  }
  // Aynı reçete daha önce kaydedilmiş mi?
  function ayniRecete(st, musteriId, r) {
    return st.receteler.filter(function (x) {
      if (x.musteriId !== musteriId) return false;
      if (r.receteNo && x.receteNo) return x.receteNo === r.receteNo && x.tarih === r.tarih && x.tur === r.tur;
      return false;
    })[0] || null;
  }

  function tarihYaz(iso) {
    var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[3] + "." + m[2] + "." + m[1] : "";
  }

  var API = {
    SURUM: SURUM, URUN_TURLERI: URUN_TURLERI, DURUMLAR: DURUMLAR, ODEME_YONTEMLERI: ODEME_YONTEMLERI, RECETE_TURLERI: RECETE_TURLERI,
    yeniId: yeniId, bugun: bugun, bosDurum: bosDurum, normalize: normalize,
    araToplam: araToplam, netToplam: netToplam, odenen: odenen, kalan: kalan, musteriBakiye: musteriBakiye,
    paraOku: paraOku, paraYaz: paraYaz, para: para,
    dioptriYaz: dioptriYaz, aksYaz: aksYaz, dioptriOku: dioptriOku, aksOku: aksOku, transpoze: transpoze, ceyrekMi: ceyrekMi, gozBos: gozBos,
    adSoyad: adSoyad, ara: ara, sonIslem: sonIslem, eslesenler: eslesenler, ayniRecete: ayniRecete, tarihYaz: tarihYaz
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.Logic = API;
})(typeof self !== "undefined" ? self : this);
