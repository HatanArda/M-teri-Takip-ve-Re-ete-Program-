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
  function alanlar(kok) {
    return Array.prototype.filter.call((kok || document).querySelectorAll("input,select,textarea"), function (el) {
      return alanMi(el) && gorunur(el);
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
      var tek = Array.prototype.filter.call(kap.querySelectorAll("input,select,textarea"), function (x) { return alanMi(x) && gorunur(x); }).length === 1;
      if (!tek) break;
      var lab = kap.querySelector("label");
      if (lab) { e.push(lab.textContent); break; }
      var yazi = "";
      var w = document.createTreeWalker(kap, NodeFilter.SHOW_TEXT, null);
      while (w.nextNode()) {
        var n = w.currentNode;
        if (el.contains(n) || (n.parentElement && n.parentElement.closest("select,option,button,script,style"))) continue;
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
    var rapor = { ok: [], dolu: [], yok: [] };
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
      alan("Hastane", ["hastane", "hastane adi", "kurum", "tesis"], rx.kurum) || (rx.kurum && rapor.yok.push("Hastane"));
      alan("Doktor", ["doktor", "doktor adi", "doktor adi soyadi", "hekim"], rx.doktor) || (rx.doktor && rapor.yok.push("Doktor"));
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
      if (el.tagName === "SELECT" && el.options.length <= 15) o += " | seçenekler: " + Array.prototype.map.call(el.options, function (x) { return x.text.trim(); }).join(", ");
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
