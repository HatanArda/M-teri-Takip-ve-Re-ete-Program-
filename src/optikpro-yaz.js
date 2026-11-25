// "Optik Pro'ya Yaz" yer işareti: "Medula'dan Al"ın panoya kopyaladığı reçeteyi
// Optik Pro'daki açık ekranın kutularına yazar. Kaydetmez; kaydı siz yaparsınız.
// Dolu bir kutunun üzerine yazmaz (yalnızca boş ya da 0 olanları doldurur).

function optikProYaz() {
  var fold = mtFold;
  var k = mtKutu("Optik Pro'ya Yaz");

  // ---------- Kutuları bulma ----------
  function gorunur(el) {
    if (!el || el.closest("#mt-kutu")) return false;
    var s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden") return false;
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }
  function alanMi(el) {
    if (el.tagName === "SELECT" || el.tagName === "TEXTAREA") return true;
    return el.tagName === "INPUT" && !/^(hidden|button|submit|reset|image|file|checkbox|radio|password|search)$/i.test(el.type);
  }
  // Arama kutusu kütüphaneleri (select2, Tom Select, Choices) asıl <select>'i gizleyip yanına kendi kutusunu koyar.
  function kabuk(el) {
    if (el.tagName !== "SELECT") return null;
    var n = el.nextElementSibling;
    if (n && /(^|\s)(select2|select2-container|ts-wrapper|chosen-container)(\s|$)/.test(n.className)) return n;
    return el.closest(".choices") || null;
  }
  function gorunurAlan(el) { if (gorunur(el)) return true; var k2 = kabuk(el); return !!(k2 && gorunur(k2)); }
  function alanlar(kok) {
    return Array.prototype.filter.call((kok || document).querySelectorAll("input,select,textarea"), function (el) {
      return alanMi(el) && gorunurAlan(el) && !(el.closest && el.closest(".select2-container,.select2-dropdown,.ts-dropdown,.choices__list"));
    });
  }
  function temiz(s) { return fold(s).replace(/[*:]/g, "").replace(/\s+/g, " ").trim(); }

  // Bir kutunun etiket(ler)i: <label>, placeholder, aria-label ve yalnız o kutuyu içeren kabın yazıları.
  function etiketler(el) {
    var e = [];
    if (el.labels) Array.prototype.forEach.call(el.labels, function (l) { e.push(l.textContent); });
    ["aria-label", "placeholder", "title"].forEach(function (a) { if (el.getAttribute(a)) e.push(el.getAttribute(a)); });
    var kap = el.parentElement;
    for (var i = 0; i < 4 && kap && kap !== document.body; i++, kap = kap.parentElement) {
      var tek = alanlar(kap).length === 1;
      if (!tek) break;
      var lab = kap.querySelector("label");
      if (lab) { e.push(lab.textContent); break; }
      var yazi = "";
      var w = document.createTreeWalker(kap, NodeFilter.SHOW_TEXT, null);
      while (w.nextNode()) {
        var n = w.currentNode;
        if (el.contains(n) || (n.parentElement && n.parentElement.closest("select,option,button,script,style,.select2-container,.select2,.ts-wrapper,.choices,.chosen-container,#mt-kutu"))) continue;
        yazi += " " + n.nodeValue;
      }
      if (yazi.trim()) { e.push(yazi); break; }
    }
    return e.map(temiz).filter(Boolean);
  }
  function bul(adaylar, haric) {
    adaylar = adaylar.map(temiz);
    var en = null, enP = 0;
    alanlar().forEach(function (el) {
      if (haric && haric.contains(el)) return;
      etiketler(el).forEach(function (et) {
        adaylar.forEach(function (a) {
          var p = et === a ? 3 : et.indexOf(a + " ") === 0 && et.length < a.length + 12 ? 1 : 0;
          if (p > enP) { en = el; enP = p; }
        });
      });
    });
    return en;
  }

  // ---------- Değer yazma (sayfanın kendi kodu da fark etsin diye olaylarla) ----------
  function olay(el, ad) { el.dispatchEvent(new Event(ad, { bubbles: true })); }
  function jq(el) { var $ = window.jQuery; if ($) { try { $(el).trigger("change"); } catch (e) {} } }
  function degerYaz(el, v) {
    var proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    var d = Object.getOwnPropertyDescriptor(proto, "value");
    if (d && d.set) d.set.call(el, v); else el.value = v;
    olay(el, "input"); olay(el, "change"); olay(el, "keyup"); olay(el, "blur");
    jq(el);
  }
  function bos(el) {
    var v = String(el.value || "").trim();
    return v === "" || (/^[+-]?0*([.,]0*)?$/.test(v));
  }
  function secimYaz(el, hedef) {
    var h = temiz(hedef), sec = null;
    Array.prototype.forEach.call(el.options, function (o) { if (!sec && (temiz(o.text) === h || temiz(o.value) === h)) sec = o; });
    if (!sec) Array.prototype.forEach.call(el.options, function (o) { if (!sec && temiz(o.text).indexOf(h) === 0) sec = o; });
    if (!sec) return false;
    if (el.value === sec.value) return true;
    degerYaz(el, sec.value);
    return true;
  }
  function secili(el) { var o = el.options && el.options[el.selectedIndex]; return o ? temiz(o.text) : temiz(el.value); }
  function tarihYaz(el, iso) {
    var fp = el._flatpickr;
    if (!fp && el.parentElement) Array.prototype.some.call(el.parentElement.querySelectorAll("input"), function (x) { if (x._flatpickr) { fp = x._flatpickr; return true; } });
    if (fp) { fp.setDate(iso, true); return true; }
    var $ = window.jQuery;
    if ($ && $(el).data && $(el).data("datepicker")) { try { $(el).datepicker("setDate", new Date(iso + "T12:00:00")); return true; } catch (e) {} }
    if (el.type === "date") { degerYaz(el, iso); return true; }
    if (el.type === "datetime-local") { degerYaz(el, iso + "T12:00"); return true; }
    degerYaz(el, mtTarihTR(iso));
    return true;
  }
  function tikla(el) { el.click(); }
  function bekle(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function dugmeBul(yazi) {
    var h = temiz(yazi);
    return Array.prototype.filter.call(document.querySelectorAll("button,a,input[type=button],[role=button]"), function (b) {
      return gorunur(b) && temiz(b.textContent || b.value).replace(/^\+\s*/, "") === h;
    })[0] || null;
  }

  // ---------- Yalnızca listeden seçim kabul eden kutular (hastane, doktor) ----------
  var GENEL = ["devlet", "hastanesi", "hastane", "egitim", "ve", "arastirma", "il", "ilce", "saglik", "merkezi", "tip", "fakultesi", "universitesi", "sehir", "ozel", "dr", "dr.", "op", "op.", "uzm", "uzm.", "prof", "prof.", "doc", "doc.", "agiz", "dis", "goz", "ici"];
  function kelimeler(s) { return temiz(s).replace(/[^a-z0-9 ]/g, " ").split(" ").filter(function (w) { return w.length > 1; }); }
  // Seçenek, hedefin kelimelerinin ne kadarını içeriyor (0-1)?
  function benzerlik(hedef, secenek) {
    var h = kelimeler(hedef), o = kelimeler(secenek);
    if (!h.length || !o.length) return 0;
    if (h.join(" ") === o.join(" ")) return 2;
    var ozel = h.filter(function (w) { return GENEL.indexOf(w) < 0; });
    var ortak = h.filter(function (w) { return o.indexOf(w) >= 0; }).length / h.length;
    var ozelOrtak = ozel.length ? ozel.filter(function (w) { return o.indexOf(w) >= 0; }).length / ozel.length : ortak;
    var fazla = o.filter(function (w) { return h.indexOf(w) < 0 && GENEL.indexOf(w) < 0; }).length;
    return ortak * 0.4 + ozelOrtak * 0.6 - fazla * 0.15;
  }
  function enIyi(hedef, liste, metin) {
    var en = null, p = 0, ikinci = 0;
    liste.forEach(function (x) {
      var b = benzerlik(hedef, metin(x));
      if (b > p) { ikinci = p; p = b; en = x; } else if (b > ikinci) ikinci = b;
    });
    return p >= 0.75 && p - ikinci > 0.05 ? en : null;
  }
  // Aranacak sözcükler: önce tam ad, sonra ayırt edici kelime(ler), en son soyad.
  function aramalar(ad) {
    var w = kelimeler(ad), ozel = w.filter(function (x) { return GENEL.indexOf(x) < 0 && x.length >= 3; });
    var asil = String(ad).trim().split(/\s+/).filter(function (x) { return x.length > 1; });
    var aslinda = function (k) { return asil.filter(function (x) { return temiz(x).replace(/[^a-z0-9]/g, "") === k; })[0] || k; };
    var a = [String(ad).trim()];
    if (ozel.length >= 2) a.push(ozel.slice(0, 2).map(aslinda).join(" "));
    ozel.slice().sort(function (x, y) { return y.length - x.length; }).slice(0, 2).forEach(function (k) { a.push(aslinda(k)); });
    if (asil.length >= 2) a.push(asil[asil.length - 1]);
    return a.filter(function (x, i) { return x && x.length >= 3 && a.indexOf(x) === i; });
  }
  function fare(el) {
    ["mouseover", "mousedown", "mouseup", "click"].forEach(function (t) { el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })); });
  }
  var ONERI = ".select2-container--open .select2-results__option, .ts-dropdown .option, .choices__list--dropdown .choices__item--selectable, .ui-autocomplete .ui-menu-item, .tt-menu .tt-suggestion, .autocomplete-suggestions .autocomplete-suggestion, .autocomplete-items > div, .dropdown-menu.show .dropdown-item, .typeahead.dropdown-menu li, [role=listbox] [role=option], .easy-autocomplete-container li, .awesomplete li";
  function oneriler() {
    return Array.prototype.filter.call(document.querySelectorAll(ONERI), function (o) {
      if (!gorunur(o) || o.closest("#mt-kutu")) return false;
      var c = String(o.className);
      return !/loading|message|load-more|disabled|no-results|has-no-choices/.test(c) && (o.textContent || "").trim().length > 1;
    });
  }
  async function onerileriBekle(once) {
    var son = null;
    for (var i = 0; i < 25; i++) {
      await bekle(160);
      var l = oneriler();
      var yukleniyor = document.querySelector(".select2-results__option.loading-results, .select2-results__option--loading, .ts-dropdown .spinner");
      if (l.length && !yukleniyor && l.map(function (x) { return x.textContent; }).join("|") === son) return l;
      son = l.length ? l.map(function (x) { return x.textContent; }).join("|") : null;
      if (!l.length && i > 12 && !yukleniyor) return [];
    }
    return oneriler();
  }
  // Arama kutusunu bulup açar; yazılacak <input>'u döndürür.
  function aramaKutusuAc(el) {
    var $ = window.jQuery;
    if (el.tagName === "SELECT") {
      if ($ && $(el).data && $(el).data("select2")) { try { $(el).select2("open"); } catch (e) {} return document.querySelector(".select2-container--open .select2-search__field, .select2-drop-active .select2-input"); }
      if (el.tomselect) { el.tomselect.open(); return el.tomselect.control_input; }
      var k2 = kabuk(el);
      if (k2) {
        var ac = k2.querySelector(".select2-selection, .choices__inner, .ts-control, .chosen-single") || k2;
        fare(ac);
        return document.querySelector(".select2-container--open .select2-search__field") || k2.querySelector("input:not([type=hidden])");
      }
      return null;
    }
    return el;
  }
  function aramaYaz(inp, terim) {
    var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    if (d && d.set) d.set.call(inp, terim); else inp.value = terim;
    inp.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: terim.slice(-1) }));
    olay(inp, "input");
    inp.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: terim.slice(-1) }));
    var $ = window.jQuery;
    if ($ && $(inp).data && $(inp).data("ui-autocomplete")) { try { $(inp).autocomplete("search", terim); } catch (e) {} }
  }
  function seciliMetin(el) {
    if (el.tagName === "SELECT") { var o = el.options[el.selectedIndex]; return o && o.value !== "" ? o.text : ""; }
    return el.value;
  }
  // Sonuç: {durum: "secildi" | "ayni" | "dolu" | "elle" | "yok", metin}
  async function listedenSec(el, hedef) {
    var mevcut = seciliMetin(el).trim();
    if (mevcut && !/^(seciniz|secin|-+)$/.test(temiz(mevcut))) return benzerlik(hedef, mevcut) >= 0.75 ? { durum: "ayni" } : { durum: "dolu", metin: mevcut };
    // 1) Seçenekler zaten sayfadaysa doğrudan seç
    if (el.tagName === "SELECT" && el.options.length > 1) {
      var o = enIyi(hedef, Array.prototype.slice.call(el.options), function (x) { return x.text; });
      if (o) {
        var $ = window.jQuery;
        if ($) { try { $(el).val(o.value).trigger("change"); } catch (e) { degerYaz(el, o.value); } } else degerYaz(el, o.value);
        if (el.tomselect) el.tomselect.setValue(o.value);
        return { durum: "secildi", metin: o.text };
      }
    }
    if (el.tagName === "INPUT" && el.list && el.list.options.length) {
      var d = enIyi(hedef, Array.prototype.slice.call(el.list.options), function (x) { return x.value; });
      if (d) { degerYaz(el, d.value); return { durum: "secildi", metin: d.value }; }
    }
    // 2) Arama yaz, listeden seç
    var inp = aramaKutusuAc(el);
    if (!inp) return { durum: "yok" };
    var son = null, terimler = aramalar(hedef);
    for (var i = 0; i < terimler.length; i++) {
      aramaYaz(inp, terimler[i]);
      var l = await onerileriBekle();
      if (!l.length) continue;
      son = terimler[i];
      var sec = enIyi(hedef, l, function (x) { return x.textContent; });
      if (sec) {
        var metin = sec.textContent.trim();
        fare(sec);
        await bekle(250);
        var $2 = window.jQuery;
        if (el.tagName === "SELECT" && !seciliMetin(el) && $2 && $2(el).data && $2(el).data("select2")) {
          try { $2(el).select2("close"); } catch (e) {}
        }
        return { durum: "secildi", metin: metin };
      }
      if (l.length) break;
    }
    if (son) aramaYaz(inp, son);
    return { durum: son ? "elle" : "yok" };
  }

  // ---------- Reçete değerleri tablosu ----------
  var SUTUN = { urun: /^urun/, mesafe: /^mesafe/, goz: /^goz$/, sph: /^(sph|sferik)/, cyl: /^(cyl|silindirik|silendirik)/, ax: /^(axis|aks|ax)$/, add: /^(add|ilave)$/ };
  function recTablosu() {
    var t = null, harita = null;
    Array.prototype.some.call(document.querySelectorAll("table"), function (tb) {
      if (!gorunur(tb) || tb.closest("#mt-kutu")) return false;
      var bas = tb.tHead ? tb.tHead.rows[tb.tHead.rows.length - 1] : tb.rows[0];
      if (!bas) return false;
      var hm = {};
      Array.prototype.forEach.call(bas.cells, function (c, i) {
        var f = temiz(c.textContent);
        Object.keys(SUTUN).forEach(function (s) { if (hm[s] == null && SUTUN[s].test(f)) hm[s] = i; });
      });
      if (hm.sph != null && hm.cyl != null) { t = tb; harita = hm; return true; }
      return false;
    });
    return t ? { tablo: t, h: harita } : null;
  }
  function satirlariAl(rt) {
    var govde = rt.tablo.tBodies[0] || rt.tablo;
    return Array.prototype.filter.call(govde.rows, function (tr) { return gorunur(tr) && tr.querySelector("input,select"); }).map(function (tr) {
      function hucre(s) { var i = rt.h[s]; if (i == null || !tr.cells[i]) return null; return tr.cells[i].querySelector("select,input,textarea"); }
      return { tr: tr, mesafe: hucre("mesafe"), goz: hucre("goz"), sph: hucre("sph"), cyl: hucre("cyl"), ax: hucre("ax"), add: hucre("add") };
    });
  }
  function satirBos(s) { return ["sph", "cyl", "ax"].every(function (p) { return !s[p] || bos(s[p]); }); }
  function eslesir(s, mesafe, goz) {
    return s.mesafe && s.goz && secili(s.mesafe) === temiz(mesafe) && secili(s.goz) === temiz(goz);
  }
  async function yeniSatirBekle(rt, eski) {
    for (var i = 0; i < 20; i++) { await bekle(150); if (satirlariAl(rt).length > eski) return true; }
    return false;
  }

  async function doldur(veri) {
    var rapor = { ok: [], dolu: [], yok: [], elle: [] };
    function alan(ad, adaylar, deger, tur) {
      if (!deger) return null;
      var el = bul(adaylar);
      if (!el) return null;
      if (tur === "secim") {
        if (el.tagName === "SELECT") { if (secimYaz(el, deger)) rapor.ok.push(ad); else rapor.yok.push(ad + " (seçenek yok)"); return el; }
      }
      if (!bos(el) && temiz(el.value) !== temiz(tur === "tarih" ? "" : deger)) { if (tur !== "tarih") { rapor.dolu.push(ad); return el; } }
      if (tur === "tarih") tarihYaz(el, deger); else degerYaz(el, deger);
      rapor.ok.push(ad);
      return el;
    }
    // Arama kutusuysa listeden seçer, düz yazı kutusuysa yazar.
    async function secmeli(ad, adaylar, deger) {
      if (!deger) return;
      var el = bul(adaylar);
      if (!el) { rapor.yok.push(ad); return; }
      var liste = el.tagName === "SELECT" || kabuk(el) || el.list || el.getAttribute("autocomplete") === "off" || el.getAttribute("role") === "combobox" ||
        /autocomplete|typeahead|tt-input|ui-autocomplete-input|select2|choices|ts-/.test(String(el.className)) || (window.jQuery && window.jQuery(el).data && window.jQuery(el).data("ui-autocomplete"));
      if (!liste) {
        if (!bos(el) && temiz(el.value) !== temiz(deger)) { rapor.dolu.push(ad); return; }
        degerYaz(el, deger); rapor.ok.push(ad); return;
      }
      var s2 = await listedenSec(el, deger);
      if (s2.durum === "secildi") rapor.ok.push(ad + ": " + s2.metin);
      else if (s2.durum === "ayni") rapor.ok.push(ad + " (zaten seçili)");
      else if (s2.durum === "dolu") rapor.dolu.push(ad + " (" + s2.metin + ")");
      else if (s2.durum === "elle") rapor.elle.push(ad + ": “" + deger + "” — birden çok benzer var, listeden seçin");
      else rapor.yok.push(ad + ": “" + deger + "” listede yok");
    }
    var mu = veri.musteri || {}, rx = veri.recete || {};
    var rt = recTablosu();
    var recEkrani = !!rt || !!bul(["recete tarih", "recete tarihi", "e-recete no", "e recete no"]);

    // Müşteri kutuları (yeni müşteri ekranı)
    var tc = alan("TC Kimlik No", ["tc kimlik no", "t.c. kimlik no", "tc no", "tc kimlik", "kimlik no"], mu.tc);
    var ad = alan("Ad Soyad", ["ad soyad", "adi soyadi", "ad soyadi", "musteri adi soyadi", "musteri adi"], mu.adSoyad);
    if ((tc || ad) && mu.cinsiyet) {
      var hedef = temiz(mu.cinsiyet);
      Array.prototype.some.call(document.querySelectorAll("input[type=radio]"), function (r) {
        var et = (r.labels && r.labels[0] ? r.labels[0].textContent : (r.parentElement && r.parentElement.textContent) || "") + " " + r.value;
        if (temiz(et).split(" ").indexOf(hedef) >= 0 && gorunur(r.labels && r.labels[0] || r.parentElement || r)) {
          if (!r.checked) { r.click(); }
          rapor.ok.push("Cinsiyet"); return true;
        }
      });
    }

    // Reçete bilgileri
    if (recEkrani) {
      alan("Reçete Tarih", ["recete tarih", "recete tarihi"], rx.tarih, "tarih") || (rx.tarih && rapor.yok.push("Reçete Tarih"));
      alan("e-Reçete No", ["e-recete no", "e recete no", "erecete no", "e-recete numarasi"], rx.receteNo) || (rx.receteNo && rapor.yok.push("e-Reçete No"));
      var tur = bul(["recete turu"]);
      if (tur && tur.tagName === "SELECT" && secili(tur) !== "sgk") { if (secimYaz(tur, "SGK")) rapor.ok.push("Reçete Türü: SGK"); }
      await secmeli("Hastane", ["hastane", "hastane adi", "kurum", "tesis"], rx.kurum);
      await secmeli("Doktor", ["doktor", "doktor adi", "doktor adi soyadi", "hekim"], rx.doktor);
    }

    // Reçete değerleri
    var gerek = veri.satirlar || [];
    if (gerek.length && !rt && recEkrani) rapor.yok.push("Reçete Değerleri tablosu");
    if (gerek.length && rt) {
      for (var i = 0; i < gerek.length; i++) {
        var g = gerek[i], ad2 = g.mesafe + " " + g.goz;
        var sat = satirlariAl(rt), s = null;
        s = sat.filter(function (x) { return eslesir(x, g.mesafe, g.goz); })[0];
        if (s && !satirBos(s)) { rapor.dolu.push(ad2); continue; }
        if (!s) {
          // Hazır satır yoksa önce Optik Pro'nun kendi düğmesini kullan
          var once = sat.length, d = g.mesafe === "Yakın" ? dugmeBul("Yakın Cam Ekle") : null;
          if (d) { tikla(d); await yeniSatirBekle(rt, once); s = satirlariAl(rt).filter(function (x) { return eslesir(x, g.mesafe, g.goz); })[0]; }
          if (!s) {
            sat = satirlariAl(rt);
            s = sat.filter(function (x) { return satirBos(x) && !gerek.some(function (y) { return eslesir(x, y.mesafe, y.goz); }); })[0];
            if (!s) {
              d = dugmeBul("Satır Ekle");
              if (d) { once = satirlariAl(rt).length; tikla(d); await yeniSatirBekle(rt, once); sat = satirlariAl(rt); s = sat[sat.length - 1]; if (s && !satirBos(s)) s = null; }
            }
            if (s) {
              if (s.mesafe) secimYaz(s.mesafe, g.mesafe);
              if (s.goz) secimYaz(s.goz, g.goz);
              await bekle(100);
              s = satirlariAl(rt).filter(function (x) { return x.tr === s.tr; })[0] || s;
            }
          }
        }
        if (!s) { rapor.yok.push(ad2 + " satırı"); continue; }
        if (s.sph && g.sph != null) degerYaz(s.sph, mtDioptri(g.sph, s.sph.type === "number"));
        if (s.cyl && g.cyl != null) degerYaz(s.cyl, mtDioptri(g.cyl, s.cyl.type === "number"));
        if (s.ax && g.ax != null) degerYaz(s.ax, mtAks(g.ax));
        if (s.add && g.add != null && bos(s.add)) degerYaz(s.add, mtDioptri(g.add, s.add.type === "number"));
        rapor.ok.push(ad2 + " " + [mtDioptri(g.sph), mtDioptri(g.cyl), mtAks(g.ax)].filter(Boolean).join(" / "));
      }
    }
    return rapor;
  }

  // ---------- Teşhis: sayfadaki kutuların yalnızca adları (müşteri bilgisi yok) ----------
  function teshis() {
    var satir = ["OPTIKPRO-TESHIS v1", "sayfa: " + location.pathname, "jquery: " + !!window.jQuery + ", flatpickr: " + !!window.flatpickr + ", select2: " + !!(window.jQuery && window.jQuery.fn && window.jQuery.fn.select2) + ", livewire: " + !!window.Livewire + ", vue: " + !!(window.Vue || document.querySelector("[data-v-app]"))];
    alanlar().slice(0, 120).forEach(function (el) {
      var o = el.tagName.toLowerCase() + (el.type && el.tagName === "INPUT" ? "[" + el.type + "]" : "") +
        (el.name ? " name=" + el.name : "") + (el.id ? " id=" + el.id : "") +
        " | etiket: " + (etiketler(el).join(" / ") || "-") + " | " + (bos(el) ? "boş" : "dolu") +
        (el._flatpickr ? " | flatpickr" : "") + (el.className ? " | class=" + String(el.className).slice(0, 60) : "");
      // Seçenek adları yalnızca tablodaki kısa listeler için (Uzak/Yakın, SAĞ/SOL); başka listelerde kişi adı olabilir.
      if (el.tagName === "SELECT") o += el.closest("table") && el.options.length <= 8 ? " | seçenekler: " + Array.prototype.map.call(el.options, function (x) { return x.text.trim(); }).join(", ") : " | " + el.options.length + " seçenek";
      if (kabuk(el)) o += " | arama kutusu: " + String(kabuk(el).className).split(" ")[0];
      satir.push(o);
    });
    Array.prototype.forEach.call(document.querySelectorAll("table"), function (tb) {
      if (!gorunur(tb)) return;
      var bas = tb.tHead ? tb.tHead.rows[0] : tb.rows[0];
      if (bas) satir.push("tablo başlık: " + Array.prototype.map.call(bas.cells, function (c) { return c.textContent.trim(); }).join(" | ") + " (satır: " + tb.rows.length + ")");
    });
    Array.prototype.forEach.call(document.querySelectorAll("button,a.btn"), function (b) {
      var t = (b.textContent || "").replace(/\s+/g, " ").trim();
      if (t && t.length < 30 && gorunur(b)) satir.push("düğme: " + t);
    });
    satir.push("radio: " + Array.prototype.map.call(document.querySelectorAll("input[type=radio]"), function (r) { return (r.name || "") + "=" + (r.value || ""); }).join(", "));
    return satir.join("\n").slice(0, 20000);
  }

  // ---------- Akış ----------
  function sonuc(r) {
    k.temizle();
    var h = "";
    if (r.ok.length) h += "<div style='color:#6fd6bd;font-weight:700;margin-bottom:4px'>Dolduruldu</div><div>" + r.ok.map(function (x) { return "✓ " + mtEsc(x); }).join("<br>") + "</div>";
    if (r.dolu.length) h += "<div style='color:#f5c869;font-weight:700;margin:8px 0 4px'>Zaten dolu, değiştirilmedi</div><div>" + r.dolu.map(mtEsc).join("<br>") + "</div>";
    if (r.elle.length) h += "<div style='color:#f5c869;font-weight:700;margin:8px 0 4px'>Siz seçin</div><div>" + r.elle.map(mtEsc).join("<br>") + "</div>";
    if (r.yok.length) h += "<div style='color:#ff9d78;font-weight:700;margin:8px 0 4px'>Bulunamadı</div><div>" + r.yok.map(mtEsc).join("<br>") + "</div>";
    if (!r.ok.length && !r.dolu.length) h += "<div style='margin-top:8px'>Bu ekranda doldurulacak kutu bulunamadı. Optik Pro'da müşteri ekleme ya da reçete ekranında olduğunuzdan emin olun.</div>";
    if (r.yok.length || !r.ok.length) h += "<div style='opacity:.75;font-size:13px;margin-top:10px'>Bir kutu dolmadıysa <b>Teşhis</b>'e basın ve kopyalananı Claude'a yapıştırın (müşteri bilgisi içermez).</div>";
    else h += "<div style='opacity:.75;font-size:13px;margin-top:10px'>Kontrol edip Optik Pro'da <b>Kaydet</b>'e basın.</div>";
    k.baslik(r.ok.length ? "Optik Pro'ya yazıldı" : "Optik Pro'ya Yaz");
    k.yaz(h);
    k.dugme("Kapat", r.ok.length ? "ana" : "", k.kapat);
    k.dugme("Teşhis", "", teshisDugme);
  }
  function teshisDugme(d) {
    mtKopyala(teshis()).then(function (ok) { d.textContent = ok ? "Teşhis kopyalandı ✓" : "Kopyalanamadı"; });
  }
  function isle(metin) {
    metin = String(metin || "").trim();
    var i = metin.indexOf(MT_ONEK);
    if (i < 0) { elle("Panoda Medula reçetesi yok. Önce Medula'da “Medula'dan Al”a dokunup Kopyala deyin."); return; }
    var veri;
    try { veri = JSON.parse(metin.slice(i + MT_ONEK.length)); } catch (e) { elle("Panodaki bilgi okunamadı. Medula'da yeniden Kopyala deyin."); return; }
    k.yaz("Yazılıyor…"); k.temizle();
    doldur(veri).then(sonuc, function (e) { k.yaz("Hata: " + mtEsc(e && e.message)); k.temizle(); k.dugme("Teşhis", "", teshisDugme); k.dugme("Kapat", "", k.kapat); });
  }
  function elle(uyari) {
    k.temizle();
    k.yaz((uyari ? "<div style='color:#f5c869;margin-bottom:8px'>" + mtEsc(uyari) + "</div>" : "") +
      "<div style='font-size:14px;opacity:.8;margin-bottom:6px'>Ya da kutuya basılı tutup Yapıştır deyin:</div>");
    var ta = document.createElement("textarea");
    ta.style.cssText = "all:initial;box-sizing:border-box;width:100%;height:70px;background:#fff;color:#000;border-radius:8px;padding:8px;font:14px -apple-system,sans-serif";
    k.govde.appendChild(ta);
    k.dugme("Doldur", "ana", function () { isle(ta.value); });
    k.dugme("Teşhis", "", teshisDugme);
    k.dugme("Kapat", "", k.kapat);
  }

  k.yaz("<div>Medula'dan kopyaladığınız reçeteyi bu ekrana yazar. Dolu kutulara dokunmaz, kaydetmez.</div>");
  k.dugme("Yapıştır ve doldur", "ana", function () {
    mtPanodanOku().then(isle, function () { elle("Panoya erişilemedi."); });
  });
  k.dugme("Teşhis", "", teshisDugme);
  k.dugme("Kapat", "", k.kapat);
}
