// Medula Optik reçete sayfasından alınan metni okur.
// Metin, yer işareti düğmesiyle (bookmarklet) ya da elle kopyala/yapıştır ile gelir.
// Tablo hücreleri sekme (\t), tablo satırları yeni satır ile ayrılmıştır.
(function (root) {
  "use strict";

  // Türkçe harfleri sadeleştirip küçük harfe çevirir (karşılaştırma için).
  function fold(s) {
    return String(s == null ? "" : s)
      .replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase()
      .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u")
      .replace(/ö/g, "o").replace(/ç/g, "c").replace(/[âà]/g, "a").replace(/[îì]/g, "i").replace(/[ûù]/g, "u")
      .replace(/ /g, " ").replace(/\s+/g, " ").trim();
  }
  function labelKey(s) { return fold(s).replace(/[:*]+$/, "").replace(/\s*:\s*$/, "").trim(); }

  // T.C. kimlik numarası doğrulaması (resmi algoritma).
  function tcGecerli(tc) {
    tc = String(tc || "");
    if (!/^[1-9]\d{10}$/.test(tc)) return false;
    var d = tc.split("").map(Number);
    var tek = d[0] + d[2] + d[4] + d[6] + d[8], cift = d[1] + d[3] + d[5] + d[7];
    var d10 = ((tek * 7 - cift) % 10 + 10) % 10;
    if (d10 !== d[9]) return false;
    var top = 0; for (var i = 0; i < 10; i++) top += d[i];
    return top % 10 === d[10];
  }

  // "2,50" / "-0.75" / "−1" / "plano" -> sayı
  function sayi(s) {
    if (s == null) return null;
    var t = String(s).trim().replace(/−/g, "-").replace(/\s+/g, "");
    if (/^(pl|plano|0)$/i.test(t)) return 0;
    if (!/^[+-]?\d{1,3}([.,]\d{1,2})?$/.test(t)) return null;
    return Number(t.replace(",", "."));
  }

  // dd/mm/yyyy, dd.mm.yyyy -> yyyy-mm-dd
  function tarihISO(s) {
    var m = String(s || "").match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
    if (m) return m[3] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
    m = String(s || "").match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[0] : "";
  }

  var ETIKET = {
    tc: ["t.c. kimlik no", "t.c kimlik no", "tc kimlik no", "t.c. kimlik numarasi", "tc kimlik numarasi", "kimlik no", "tckn", "tc no", "t.c. no", "hasta tc", "hasta t.c. kimlik no"],
    adSoyad: ["adi soyadi", "ad soyad", "ad soyadi", "adi ve soyadi", "hasta adi soyadi", "hasta ad soyad", "hasta adi"],
    ad: ["adi", "ad"],
    soyad: ["soyadi", "soyad"],
    receteNo: ["e-recete no", "e recete no", "erecete no", "e-recete numarasi", "recete no", "recete numarasi"],
    takipNo: ["takip no", "takip numarasi"],
    protokolNo: ["protokol no", "protokol numarasi"],
    tarih: ["recete tarihi", "recete tarih", "duzenlenme tarihi", "tarih"],
    teshis: ["recete teshis", "recete teshisi", "teshis", "tani"],
    kurum: ["tesis adi", "saglik tesisi", "tesis", "kurum adi", "hastane", "hastane adi"],
    doktor: ["doktor adi", "doktor adi soyadi", "doktor ad soyad", "doktor", "hekim adi", "hekim"],
    brans: ["brans", "doktor bransi", "uzmanlik"],
    cinsiyet: ["cinsiyet", "cinsiyeti"],
    yas: ["yas", "yasi"],
    dogum: ["dogum tarihi"],
    tel: ["telefon", "telefon no", "cep telefonu", "tel", "gsm"],
    gozlukTuru: ["gozluk turu", "gozluk tipi"]
  };
  var ETIKET_ARA = {};
  Object.keys(ETIKET).forEach(function (k) { ETIKET[k].forEach(function (e) { ETIKET_ARA[e] = k; }); });

  function satirlar(metin) {
    return String(metin || "").replace(/\r/g, "").split("\n").map(function (l) {
      l = l.replace(/ /g, " ");
      var h = l.indexOf("\t") >= 0 ? l.split("\t") : l.split(/ {2,}| \| /);
      return h.map(function (c) { return c.replace(/\s+/g, " ").trim(); });
    }).filter(function (h) { return h.some(function (c) { return c; }); });
  }

  // Göz tablosu başlık hücresi: hangi değeri tutar?
  function param(c) {
    var f = fold(c).replace(/[.:]/g, "");
    if (/^\+ ?\/ ?-$|^isaret$|^\(\+\/-\)$|^\+-$|^±$/.test(f)) return "isaret";
    if (/^(sferik|sferi|sfer|sph|sf|kure|sfr)$/.test(f)) return "sph";
    if (/^(silindirik|silendirik|silindrik|silindir|cyl|cyi|sil|cly)$/.test(f)) return "cyl";
    if (/^(aks|axis|ax|eksen|aks derece)$/.test(f)) return "ax";
    if (/^(add|ilave|adisyon|addition)$/.test(f)) return "add";
    if (/^cam$/.test(f)) return "cam";
    return null;
  }
  function tarafOf(c) {
    var f = fold(c);
    if (/^(sag|sag cam|sag goz|sag goz camı|od|r|right)$/.test(f) || /^sag (cam|goz|lens)\b/.test(f)) return "sag";
    if (/^(sol|sol cam|sol goz|os|l|left)$/.test(f) || /^sol (cam|goz|lens)\b/.test(f)) return "sol";
    return null;
  }
  function mesafeOf(f) {
    if (/\buzak\b/.test(f)) return "uzak";
    if (/\byakin\b/.test(f)) return "yakin";
    return null;
  }
  function isaret(c) {
    var t = String(c || "").trim().replace(/−/g, "-");
    if (t === "+" || t === "(+)") return 1;
    if (t === "-" || t === "(-)") return -1;
    return 0;
  }

  function bosGoz() { return { uzak: { sph: null, cyl: null, ax: null }, yakin: { sph: null, cyl: null, ax: null }, add: null }; }

  function oku(metin) {
    var S = satirlar(metin);
    var alan = {}, bulunan = {};
    var goz = { sag: bosGoz(), sol: bosGoz() };
    var uyarilar = [];

    // ---- 1) Etiket / değer alanları ----
    S.forEach(function (h, si) {
      h.forEach(function (c, i) {
        var anahtar = null, deger = null, k = labelKey(c);
        if (ETIKET_ARA[k]) { anahtar = ETIKET_ARA[k]; deger = i + 1 < h.length ? h[i + 1] : (S[si + 1] && S[si + 1].length === 1 ? S[si + 1][0] : ""); }
        else {
          var m = c.match(/^([^:]{2,40}):\s*(.+)$/);
          if (m && ETIKET_ARA[labelKey(m[1])]) { anahtar = ETIKET_ARA[labelKey(m[1])]; deger = m[2]; }
        }
        if (!anahtar || bulunan[anahtar]) return;
        if (deger && ETIKET_ARA[labelKey(deger)]) deger = "";
        deger = String(deger || "").trim();
        if (deger === "[ ]" || deger === "[x]") deger = "";
        if (!deger) return;
        alan[anahtar] = deger; bulunan[anahtar] = true;
      });
    });

    var tc = String(alan.tc || "").replace(/\D/g, "");
    if (!tcGecerli(tc)) {
      var hepsi = String(metin || "").match(/\b[1-9]\d{10}\b/g) || [];
      var g = hepsi.filter(tcGecerli)[0];
      if (g) tc = g; else if (alan.tc) { uyarilar.push("T.C. kimlik numarası doğrulanamadı: " + alan.tc); tc = String(alan.tc).trim(); }
      else tc = "";
    }

    var ad = alan.ad || "", soyad = alan.soyad || "";
    if (!ad && alan.adSoyad) {
      var p = alan.adSoyad.split(" ").filter(Boolean);
      soyad = p.length > 1 ? p.pop() : ""; ad = p.join(" ");
    }

    // ---- 2) Göz değerleri ----
    var mesafe = null, taraf = null, sonTaraflar = [];
    var basliklar = null, baslikYas = 0;
    var blok = null; // başlık bulunamazsa: taraf bloğundaki değerleri sırayla toplar
    var atandi = false;

    function yaz(t, m, p, v) {
      if (!t || v == null) return;
      if (p === "add") { if (goz[t].add == null) { goz[t].add = v; atandi = true; } return; }
      m = m || "uzak";
      if (goz[t][m][p] == null) { goz[t][m][p] = v; atandi = true; }
    }
    function blokBitir() {
      if (!blok) return;
      var b = blok; blok = null;
      var sira = ["sph", "cyl", "ax"], n = 0, isr = 0;
      for (var i = 0; i < b.jetonlar.length && n < 3; i++) {
        var j = b.jetonlar[i];
        if (isaret(j)) { isr = isaret(j); continue; }
        var v = sayi(j);
        if (v == null) { isr = 0; continue; }
        var p = sira[n++];
        if (p === "ax") { if (!/^\d{1,3}$/.test(j) || v > 180) { n--; continue; } yaz(b.taraf, b.mesafe, p, v); }
        else { if (Math.abs(v) > 30) { n--; continue; } yaz(b.taraf, b.mesafe, p, isr && !/^[+-]/.test(j) ? isr * Math.abs(v) : v); }
        isr = 0;
      }
    }

    S.forEach(function (h) {
      var f = fold(h.join(" "));
      var etiketSatiri = h.some(function (c) { return ETIKET_ARA[labelKey(c)]; });
      var sayilar = h.filter(function (c) { return sayi(c) != null; }).length;

      // Bölüm başlığı: "YAKIN GÖZLÜK", "UZAK GÖZLÜK", "Gözlük Türü  Yakın"
      var ms = mesafeOf(f);
      if (ms && (/gozluk|lens|mesafe/.test(f) || h.length === 1) && !sayilar) {
        blokBitir(); mesafe = ms; basliklar = null;
        if (/lens/.test(f)) alan.lens = true;
      }

      // Taraf başlığı: "SAĞ CAM", "SAĞ CAM \t SOL CAM"
      var taraflar = h.map(tarafOf).filter(Boolean);
      if (taraflar.length && !sayilar && taraflar.length === h.filter(Boolean).length) {
        blokBitir();
        sonTaraflar = taraflar; taraf = taraflar[0]; basliklar = null;
        if (taraflar.length === 1) blok = { taraf: taraf, mesafe: mesafe, jetonlar: [] };
        return;
      }

      // Göz tablosu başlığı
      var ps = h.map(param);
      if (ps.filter(function (p) { return p && p !== "cam"; }).length >= 2 && !sayilar) {
        var grup = 0, gordu = {}, harita = [];
        ps.forEach(function (p, i) {
          var hucreTaraf = null, fc = fold(h[i]);
          var m2 = fc.match(/^(sag|sol)\s+(.+)$/);
          if (m2 && param(m2[2])) { p = param(m2[2]); hucreTaraf = m2[1]; }
          if (p && p !== "isaret" && gordu[p]) { grup++; gordu = {}; }
          if (p === "cam" && Object.keys(gordu).length) { grup++; gordu = {}; }
          if (p) gordu[p] = true;
          harita.push(p ? { p: p, grup: grup, taraf: hucreTaraf } : null);
        });
        var gt = grup > 0 && sonTaraflar.length > 1 ? sonTaraflar : null;
        harita.forEach(function (x) { if (x && !x.taraf) x.taraf = gt ? gt[x.grup] || null : null; });
        basliklar = harita; baslikYas = 0;
        if (blok) blok.baslikli = true;
        return;
      }

      if (basliklar && sayilar) {
        // Satır etiketleri: "Sağ", "Uzak" gibi
        var satirTaraf = null, satirMesafe = null;
        h.forEach(function (c) {
          if (sayi(c) != null || isaret(c)) return;
          satirTaraf = satirTaraf || tarafOf(c);
          satirMesafe = satirMesafe || (fold(c).length < 12 ? mesafeOf(fold(c)) : null);
        });
        var fark = h.length - basliklar.length;
        var bekleyenIsaret = {};
        h.forEach(function (c, i) {
          var x = basliklar[fark > 0 && !satirTaraf && !satirMesafe ? i - fark : i];
          if (!x) return;
          if (x.p === "isaret") { bekleyenIsaret[x.grup] = isaret(c); return; }
          if (x.p === "cam") return;
          var v = sayi(c);
          if (v == null) { bekleyenIsaret[x.grup] = 0; return; }
          if (x.p === "ax") { if (v < 0 || v > 180) return; }
          else if (bekleyenIsaret[x.grup] && !/^[+\-−]/.test(c.trim())) v = bekleyenIsaret[x.grup] * Math.abs(v);
          bekleyenIsaret[x.grup] = 0;
          yaz(x.taraf || satirTaraf || taraf, satirMesafe || mesafe, x.p, v);
        });
        if (blok) blok.jetonlar = [];
        baslikYas = 0;
        return;
      }
      if (basliklar && ++baslikYas > 4) basliklar = null;

      // Tek değer etiketli: "Sferik: -1,25", "ADD +2,00"
      var tekli = false;
      h.forEach(function (c, i) {
        var m3 = c.match(/^([A-Za-zİıŞşĞğÜüÖöÇç.+\/ -]{2,14}?)\s*:?\s*([+\-−]?\s?\d{1,3}(?:[.,]\d{1,2})?)$/);
        var p = null, v = null;
        if (m3 && param(m3[1])) { p = param(m3[1]); v = sayi(m3[2].replace(/\s/g, "")); }
        else if (param(c) && i + 1 < h.length && sayi(h[i + 1]) != null) { p = param(c); v = sayi(h[i + 1]); }
        if (!p || v == null || p === "cam" || p === "isaret") return;
        var t2 = tarafOf(h[0]) || (/\bsag\b/.test(f) ? "sag" : /\bsol\b/.test(f) ? "sol" : null) || taraf;
        if (p === "add" && !t2) { yaz("sag", null, "add", v); yaz("sol", null, "add", v); tekli = true; return; }
        if (t2) { yaz(t2, mesafeOf(f) || mesafe, p, v); tekli = true; }
      });
      if (tekli) return;

      // "Sağ Uzak -1,25 -0,50 180" gibi tek satır
      var satirT = tarafOf(h[0]) || (/^(sag|sol)\b/.test(f) ? f.slice(0, 3) : null);
      if (satirT && sayilar && !etiketSatiri) {
        var eski = blok;
        blok = { taraf: satirT, mesafe: mesafeOf(f) || mesafe, jetonlar: jetonla(h.slice(1)) };
        blokBitir(); blok = eski;
        return;
      }

      if (blok && !etiketSatiri && !/karekod/.test(f)) blok.jetonlar = blok.jetonlar.concat(jetonla(h));
    });
    blokBitir();

    function jetonla(hucreler) {
      var j = [];
      hucreler.forEach(function (c) {
        if (param(c) || /\d{1,2}[./]\d{1,2}[./]\d{4}/.test(c)) return;
        String(c).replace(/−/g, "-").split(/\s+/).forEach(function (t) {
          if (!t) return;
          if (t === "+" || t === "-" || t === "(+)" || t === "(-)") j.push(t);
          else if (sayi(t) != null) j.push(t);
        });
      });
      return j;
    }

    if (!atandi) uyarilar.push("Göz değerleri bulunamadı. Medula'da reçete sayfası tam açıkken deneyin ya da değerleri elle girin.");

    var tur = "";
    var gt2 = fold(alan.gozlukTuru || "");
    var uzakVar = ["sph", "cyl", "ax"].some(function (p) { return goz.sag.uzak[p] != null || goz.sol.uzak[p] != null; });
    var yakinVar = ["sph", "cyl", "ax"].some(function (p) { return goz.sag.yakin[p] != null || goz.sol.yakin[p] != null; });
    if (alan.lens) tur = "Lens";
    else if (/multi|progres/.test(gt2)) tur = "Multifokal";
    else if (uzakVar && yakinVar) tur = "Uzak + Yakın";
    else if (yakinVar || /yakin/.test(gt2)) tur = "Yakın";
    else if (uzakVar || /uzak/.test(gt2)) tur = "Uzak";

    return {
      musteri: {
        tc: tc, ad: ad, soyad: soyad,
        cinsiyet: alan.cinsiyet || "", tel: alan.tel || "", dogum: tarihISO(alan.dogum)
      },
      recete: {
        tarih: tarihISO(alan.tarih), receteNo: alan.receteNo || "", takipNo: alan.takipNo || "",
        protokolNo: alan.protokolNo || "", doktor: alan.doktor || "", brans: alan.brans || "",
        kurum: alan.kurum || "", teshis: alan.teshis || "", yas: alan.yas ? String(alan.yas).replace(/\D/g, "") : "",
        tur: tur, sag: goz.sag, sol: goz.sol
      },
      gozBulundu: atandi,
      uyarilar: uyarilar
    };
  }

  // ---------------------------------------------------------------
  // Medula sayfasını metne çevirir (yer işaretinde çalışır).
  // Kutuların içindeki değerler, +/- seçimleri ve işaret kutuları dahil.
  // Tablo hücreleri sekme, satırlar yeni satır ile ayrılır. Sayfaya hiçbir şey yazmaz.
  // ---------------------------------------------------------------
  function metinTopla(doc, win) {
    var satirlar = [], hucreler = [], hucre = "";
    function ekle(t) { t = String(t).replace(/\s+/g, " ").trim(); if (t) hucre += (hucre ? " " : "") + t; }
    function hucreBitir() { hucreler.push(hucre); hucre = ""; }
    function satirBitir() {
      if (hucre || hucreler.length) hucreBitir();
      if (hucreler.some(function (c) { return c; })) satirlar.push(hucreler.join("\t"));
      hucreler = [];
    }
    var BLOK = /^(DIV|P|TABLE|TBODY|THEAD|TFOOT|H1|H2|H3|H4|H5|H6|LI|UL|OL|FIELDSET|LEGEND|FORM|SECTION|HEADER|FOOTER|BR|HR|CENTER|DL|DT|DD)$/;
    function gorunur(el, w) {
      try { var s = w.getComputedStyle(el); return s.display !== "none" && s.visibility !== "hidden"; } catch (e) { return true; }
    }
    function gez(n, w) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) { ekle(c.nodeValue); continue; }
        if (c.nodeType !== 1) continue;
        var t = c.tagName;
        if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION|BUTTON)$/.test(t)) continue;
        if (c.id === "mt-kutu") continue;
        if (!gorunur(c, w)) continue;
        if (t === "IFRAME" || t === "FRAME") {
          try { var d = c.contentDocument; if (d && d.body) { satirBitir(); gez(d.body, c.contentWindow); satirBitir(); } } catch (e) {}
          continue;
        }
        if (t === "INPUT") {
          var ty = (c.type || "").toLowerCase();
          if (ty === "checkbox") ekle(c.checked ? "[x]" : "[ ]");
          else if (ty === "radio") { if (c.checked) ekle(c.value); }
          else if (!/^(hidden|button|submit|reset|image|file|password)$/.test(ty)) ekle(c.value);
          continue;
        }
        if (t === "SELECT") { var o = c.options[c.selectedIndex]; if (o) ekle(o.text); continue; }
        if (t === "TEXTAREA") { ekle(c.value); continue; }
        if (t === "TR") { satirBitir(); gez(c, w); satirBitir(); continue; }
        if (t === "TD" || t === "TH") { gez(c, w); hucreBitir(); continue; }
        var blok = BLOK.test(t);
        if (blok) satirBitir();
        gez(c, w);
        if (blok) satirBitir();
      }
    }
    gez(doc.body, win);
    satirBitir();
    return satirlar.join("\n").slice(0, 30000);
  }

  var API = { oku: oku, fold: fold, sayi: sayi, tcGecerli: tcGecerli, tarihISO: tarihISO, satirlar: satirlar, metinTopla: metinTopla };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.Medula = API;
})(typeof self !== "undefined" ? self : this);
