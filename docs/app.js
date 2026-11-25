// Müşteri Takip: ekranlar ve kayıt. Veriler yalnızca bu cihazda (tarayıcının IndexedDB'sinde) durur.
(function () {
  "use strict";
  var L = window.Logic, M = window.Medula;
  var S = L.bosDurum();
  var yol = { ekran: "liste", id: null };
  var aramaQ = "";
  var medulaSonuc = null, medulaHedef = null;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function toast(t) {
    var e = $("#toast"); e.textContent = t; e.classList.add("show");
    clearTimeout(toast.z); toast.z = setTimeout(function () { e.classList.remove("show"); }, 2600);
  }

  // ================= Kayıt (IndexedDB) =================
  var DB = null;
  function dbAc() {
    return new Promise(function (res) {
      try {
        var r = indexedDB.open("musteri-takip", 1);
        r.onupgradeneeded = function () { r.result.createObjectStore("kv"); };
        r.onsuccess = function () { DB = r.result; res(); };
        r.onerror = function () { res(); };
      } catch (e) { res(); }
    });
  }
  function dbAl(k) {
    return new Promise(function (res) {
      if (!DB) { try { var v = localStorage.getItem("mt-" + k); res(v ? JSON.parse(v) : null); } catch (e) { res(null); } return; }
      var q = DB.transaction("kv").objectStore("kv").get(k);
      q.onsuccess = function () { res(q.result == null ? null : q.result); };
      q.onerror = function () { res(null); };
    });
  }
  function dbYaz(k, v) {
    return new Promise(function (res, rej) {
      if (!DB) { try { localStorage.setItem("mt-" + k, JSON.stringify(v)); res(); } catch (e) { rej(e); } return; }
      var t = DB.transaction("kv", "readwrite");
      t.objectStore("kv").put(v, k);
      t.oncomplete = function () { res(); };
      t.onerror = t.onabort = function () { rej(t.error); };
    });
  }
  function dbSil(k) {
    return new Promise(function (res) {
      if (!DB) { try { localStorage.removeItem("mt-" + k); } catch (e) {} res(); return; }
      var t = DB.transaction("kv", "readwrite"); t.objectStore("kv").delete(k);
      t.oncomplete = t.onerror = function () { res(); };
    });
  }
  function dbAnahtarlar() {
    return new Promise(function (res) {
      if (!DB) { var a = []; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf("mt-") === 0) a.push(k.slice(3)); } } catch (e) {} res(a); return; }
      var q = DB.transaction("kv").objectStore("kv").getAllKeys();
      q.onsuccess = function () { res(q.result || []); }; q.onerror = function () { res([]); };
    });
  }

  var kayitZ = null;
  function kaydet() {
    $("#durum").textContent = "Kaydediliyor…";
    clearTimeout(kayitZ);
    kayitZ = setTimeout(function () {
      dbYaz("durum", JSON.parse(JSON.stringify(S))).then(function () {
        var d = new Date();
        $("#durum").textContent = "Kaydedildi " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      }, function (e) {
        $("#durum").textContent = "KAYDEDİLEMEDİ";
        alert("Veriler kaydedilemedi: " + (e && e.message || e) + "\n\nLütfen hemen Ayarlar → Yedek indir ile yedek alın.");
      });
    }, 250);
  }
  window.addEventListener("pagehide", function () { if (kayitZ) { clearTimeout(kayitZ); dbYaz("durum", JSON.parse(JSON.stringify(S))); } });

  // Günde bir otomatik kopya (cihaz içinde, son 14 gün). Yanlış silmeye karşı.
  function gunlukKopya() {
    if (!S.musteriler.length) return;
    var k = "kopya-" + L.bugun();
    dbAl(k).then(function (v) {
      if (v) return;
      dbYaz(k, JSON.parse(JSON.stringify(S))).then(function () {
        dbAnahtarlar().then(function (ks) {
          ks.filter(function (x) { return /^kopya-/.test(x); }).sort().reverse().slice(14).forEach(dbSil);
        });
      });
    });
  }

  // ================= Yardımcılar =================
  function musteri(id) { return S.musteriler.filter(function (m) { return m.id === id; })[0] || null; }
  function recete(id) { return S.receteler.filter(function (r) { return r.id === id; })[0] || null; }
  function satis(id) { return S.satislar.filter(function (s) { return s.id === id; })[0] || null; }
  function tarihSirala(a, b) { return (b.tarih || "").localeCompare(a.tarih || "") || (b.id > a.id ? 1 : -1); }
  function secenekler(liste, secili) {
    return liste.map(function (x) { var v = typeof x === "string" ? x : x[0], t = typeof x === "string" ? x : x[1]; return "<option value=\"" + esc(v) + "\"" + (v === secili ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("");
  }
  function durumRozet(d) { return "<span class=\"rozet " + (d === "Teslim edildi" ? "ok" : d === "Hazır" ? "bekle" : "") + "\">" + esc(d) + "</span>"; }
  function gunFarki(iso) { if (!iso) return Infinity; return Math.floor((new Date(L.bugun()) - new Date(iso.slice(0, 10))) / 864e5); }

  function rxTablo(r) {
    var satirlar = [];
    [["uzak", "Uzak"], ["yakin", "Yakın"]].forEach(function (ms) {
      [["sag", "Sağ"], ["sol", "Sol"]].forEach(function (t) {
        var g = r[t[0]][ms[0]];
        if (L.gozBos(g)) return;
        satirlar.push("<tr><th>" + t[1] + " " + ms[1] + "</th><td>" + esc(L.dioptriYaz(g.sph)) + "</td><td>" + esc(L.dioptriYaz(g.cyl)) + "</td><td>" + esc(L.aksYaz(g.ax)) + "</td></tr>");
      });
    });
    if (r.sag.add != null || r.sol.add != null) satirlar.push("<tr><th>ADD</th><td colspan=\"3\">Sağ " + esc(L.dioptriYaz(r.sag.add) || "-") + " · Sol " + esc(L.dioptriYaz(r.sol.add) || "-") + "</td></tr>");
    if (r.pdUzak || r.pdYakin) satirlar.push("<tr><th>PD</th><td colspan=\"3\">" + (r.pdUzak ? "Uzak " + esc(r.pdUzak) : "") + (r.pdUzak && r.pdYakin ? " · " : "") + (r.pdYakin ? "Yakın " + esc(r.pdYakin) : "") + "</td></tr>");
    if (!satirlar.length) return "<div class=\"hint\">Göz değeri girilmemiş.</div>";
    return "<table class=\"rx\"><thead><tr><th></th><th>SPH</th><th>CYL</th><th>AKS</th></tr></thead><tbody>" + satirlar.join("") + "</tbody></table>";
  }
  function receteBaslik(r) {
    return L.tarihYaz(r.tarih) + (r.tur ? " · " + r.tur : "") + (r.receteNo ? " · No " + r.receteNo : "");
  }

  // ================= Ekranlar =================
  function git(ekran, id) {
    yol = { ekran: ekran, id: id || null };
    if (ekran !== "medula") { medulaSonuc = null; medulaHedef = null; }
    ciz();
    window.scrollTo(0, 0);
  }

  function ciz() {
    $$("#nav button").forEach(function (b) { b.classList.toggle("on", b.dataset.git === yol.ekran || (yol.ekran === "musteri" && b.dataset.git === "liste")); });
    var e = $("#ekran");
    if (yol.ekran === "musteri" && musteri(yol.id)) e.innerHTML = musteriEkrani(musteri(yol.id));
    else if (yol.ekran === "medula") e.innerHTML = medulaEkrani();
    else if (yol.ekran === "isler") e.innerHTML = islerEkrani();
    else if (yol.ekran === "ayarlar") e.innerHTML = ayarlarEkrani();
    else { yol.ekran = "liste"; e.innerHTML = listeEkrani(); }
    $("#baslik").textContent = S.ayarlar.dukkan ? S.ayarlar.dukkan : "Müşteri Takip";
    if (yol.ekran === "liste") { var a = $("#ara"); if (a) { a.value = aramaQ; listeyiGuncelle(); } }
  }

  // ---------- Müşteri listesi ----------
  function yedekUyarisi() {
    if (!S.musteriler.length) return "";
    var g = gunFarki(S.ayarlar.sonYedek);
    if (g <= 7) return "";
    return "<div class=\"uyarilar row\"><span class=\"sp\">" + (S.ayarlar.sonYedek ? "Son yedek " + g + " gün önce alındı." : "Henüz yedek alınmadı.") + " Veriler yalnızca bu cihazda duruyor.</span><button class=\"btn sm\" data-a=\"yedekIndir\">Yedek indir</button></div>";
  }
  function listeEkrani() {
    return yedekUyarisi() +
      "<div class=\"row\" style=\"margin-bottom:12px\"><div class=\"ara sp\"><input id=\"ara\" type=\"search\" placeholder=\"Ad, soyad, TC ya da telefon ile ara\" autocomplete=\"off\" autocorrect=\"off\" spellcheck=\"false\"></div>" +
      "<button class=\"btn\" data-a=\"yeniMusteri\">+ Yeni müşteri</button></div>" +
      "<div id=\"listeSonuc\"></div>";
  }
  function listeyiGuncelle() {
    var q = aramaQ.trim();
    var bulunan = L.ara(S, q).map(function (m) { return { m: m, son: L.sonIslem(S, m.id), bak: L.musteriBakiye(S, m.id) }; });
    bulunan.sort(function (a, b) { return (b.son || b.m.olusturma).localeCompare(a.son || a.m.olusturma) || L.adSoyad(a.m).localeCompare(L.adSoyad(b.m), "tr"); });
    var el = $("#listeSonuc"); if (!el) return;
    if (!S.musteriler.length) {
      el.innerHTML = "<div class=\"card bos\"><p style=\"font-size:17px;color:var(--ink)\"><b>Henüz müşteri yok.</b></p><p>Medula'dan ilk reçeteyi alın ya da elle müşteri ekleyin.</p><div class=\"row\" style=\"justify-content:center\"><button class=\"btn\" data-git=\"medula\">Medula'dan al</button><button class=\"btn alt\" data-a=\"yeniMusteri\">+ Yeni müşteri</button></div></div>";
      return;
    }
    if (!bulunan.length) { el.innerHTML = "<div class=\"card bos\">“" + esc(q) + "” ile eşleşen müşteri yok.<div class=\"row\" style=\"justify-content:center;margin-top:10px\"><button class=\"btn alt\" data-a=\"yeniMusteri\">+ Yeni müşteri</button></div></div>"; return; }
    var goster = bulunan.slice(0, 150);
    el.innerHTML = "<div class=\"hint\" style=\"margin:0 0 6px 4px\">" + (q ? bulunan.length + " sonuç" : S.musteriler.length + " müşteri · son işleme göre") + (bulunan.length > goster.length ? " · ilk " + goster.length + " gösteriliyor" : "") + "</div>" +
      "<div class=\"card liste\">" + goster.map(function (x) {
        var m = x.m;
        return "<div class=\"oge\" data-a=\"musteriAc\" data-id=\"" + esc(m.id) + "\"><div class=\"sp\"><div class=\"ad\">" + esc(L.adSoyad(m)) + "</div><div class=\"alt\">" +
          [m.tc ? "TC " + esc(m.tc) : "", m.tel ? esc(m.tel) : "", x.son ? "Son işlem " + L.tarihYaz(x.son) : ""].filter(Boolean).join(" · ") + "</div></div>" +
          (x.bak > 0 ? "<span class=\"rozet borc\">Borç " + esc(L.paraYaz(x.bak)) + "</span>" : "") + "</div>";
      }).join("") + "</div>";
  }

  // ---------- Müşteri dosyası ----------
  function musteriEkrani(m) {
    var rs = S.receteler.filter(function (r) { return r.musteriId === m.id; }).sort(tarihSirala);
    var ss = S.satislar.filter(function (s) { return s.musteriId === m.id; }).sort(tarihSirala);
    var bak = L.musteriBakiye(S, m.id);
    var h = "<div class=\"row\" style=\"margin-bottom:10px\"><button class=\"btn alt sm\" data-git=\"liste\">‹ Müşteriler</button></div>";
    h += "<div class=\"card\"><div class=\"row\"><h2 class=\"sp\" style=\"margin:0\">" + esc(L.adSoyad(m)) + "</h2>" +
      (bak > 0 ? "<span class=\"rozet borc\">Borç " + esc(L.paraYaz(bak)) + "</span>" : ss.length ? "<span class=\"rozet ok\">Borcu yok</span>" : "") +
      "<button class=\"btn alt sm\" data-a=\"musteriDuzenle\" data-id=\"" + esc(m.id) + "\">Düzenle</button></div><div class=\"bilgi\">" +
      [["T.C. Kimlik No", m.tc], ["Telefon", m.tel], ["Doğum tarihi", L.tarihYaz(m.dogum)], ["Cinsiyet", m.cinsiyet], ["Adres", m.adres], ["Not", m.not], ["Kayıt", L.tarihYaz(m.olusturma)]]
        .filter(function (x) { return x[1]; }).map(function (x) { return "<div><b>" + x[0] + "</b>" + esc(x[1]) + "</div>"; }).join("") + "</div></div>";
    h += "<div class=\"row\"><button class=\"btn\" data-a=\"medulaIcin\" data-id=\"" + esc(m.id) + "\">Medula'dan reçete</button><button class=\"btn alt\" data-a=\"yeniRecete\" data-id=\"" + esc(m.id) + "\">+ Reçete (elle)</button><button class=\"btn alt\" data-a=\"yeniSatis\" data-id=\"" + esc(m.id) + "\">+ Satış</button></div>";

    h += "<h3>Reçeteler <span class=\"say\">" + rs.length + "</span></h3>";
    if (!rs.length) h += "<div class=\"card hint\">Reçete yok.</div>";
    rs.forEach(function (r) {
      h += "<div class=\"card\"><div class=\"row\"><b class=\"sp\">" + esc(receteBaslik(r)) + "</b>" + (r.kaynak === "medula" ? "<span class=\"rozet\">Medula</span>" : "") + "</div>" +
        "<div class=\"hint\">" + esc([r.doktor && "Dr. " + r.doktor, r.kurum, r.teshis && "Teşhis " + r.teshis, r.protokolNo && "Protokol " + r.protokolNo].filter(Boolean).join(" · ")) + "</div>" +
        rxTablo(r) + (r.not ? "<div class=\"hint\" style=\"margin-top:6px\">Not: " + esc(r.not) + "</div>" : "") +
        "<div class=\"row end\" style=\"margin-top:10px\"><button class=\"btn sm\" data-a=\"yeniSatis\" data-id=\"" + esc(m.id) + "\" data-recete=\"" + esc(r.id) + "\">Bu reçeteyle satış</button><button class=\"btn alt sm\" data-a=\"receteYazdir\" data-id=\"" + esc(r.id) + "\">Yazdır</button><button class=\"btn alt sm\" data-a=\"receteDuzenle\" data-id=\"" + esc(r.id) + "\">Düzenle</button></div></div>";
    });

    h += "<h3>Satışlar <span class=\"say\">" + ss.length + "</span></h3>";
    if (!ss.length) h += "<div class=\"card hint\">Satış yok.</div>";
    ss.forEach(function (s) { h += satisKart(s); });
    return h;
  }

  function toplamlar(s) {
    var k = L.kalan(s);
    return "<div class=\"top\"><div><span>Ara toplam</span><span>" + L.paraYaz(L.araToplam(s)) + "</span></div>" +
      (s.indirim ? "<div><span>İndirim</span><span>−" + L.paraYaz(s.indirim) + "</span></div>" : "") +
      (s.kurumPayi ? "<div><span>SGK / kurum ödemesi</span><span>−" + L.paraYaz(s.kurumPayi) + "</span></div>" : "") +
      "<div class=\"net\"><span>Müşteriden alınacak</span><span>" + L.paraYaz(L.netToplam(s)) + "</span></div>" +
      "<div><span>Ödenen</span><span>" + L.paraYaz(L.odenen(s)) + "</span></div>" +
      "<div class=\"kalan" + (k <= 0 ? " sifir" : "") + "\"><span>Kalan</span><span>" + L.paraYaz(k) + "</span></div></div>";
  }
  function satisKart(s, musteriAdi) {
    var r = recete(s.receteId);
    return "<div class=\"card\"><div class=\"row\"><b class=\"sp\">" + (musteriAdi ? "<a href=\"#\" data-a=\"musteriAc\" data-id=\"" + esc(s.musteriId) + "\" style=\"color:inherit\">" + esc(musteriAdi) + "</a> · " : "") + L.tarihYaz(s.tarih) + "</b>" +
      "<select data-a=\"durumDegis\" data-id=\"" + esc(s.id) + "\" style=\"width:auto\">" + secenekler(L.DURUMLAR, s.durum) + "</select></div>" +
      "<div class=\"hint\">" + [r ? "Reçete: " + esc(receteBaslik(r)) : "", s.teslimTarihi && s.durum !== "Teslim edildi" ? "Teslim: " + L.tarihYaz(s.teslimTarihi) : ""].filter(Boolean).join(" · ") + "</div>" +
      "<table class=\"kalem\" style=\"margin-top:6px\"><thead><tr><th>Ürün</th><th>Açıklama</th><th class=\"r\">Adet</th><th class=\"r\">Fiyat</th><th class=\"r\">Tutar</th></tr></thead><tbody>" +
      s.kalemler.map(function (k) { return "<tr><td>" + esc(k.tur) + "</td><td>" + esc(k.aciklama) + "</td><td class=\"r\">" + k.adet + "</td><td class=\"r\">" + L.paraYaz(k.fiyat) + "</td><td class=\"r\">" + L.paraYaz(k.adet * k.fiyat) + "</td></tr>"; }).join("") +
      "</tbody></table>" + toplamlar(s) +
      (s.odemeler.length ? "<div class=\"hint\" style=\"margin-top:6px\">Ödemeler: " + s.odemeler.map(function (o) { return L.tarihYaz(o.tarih) + " " + L.paraYaz(o.tutar) + " (" + esc(o.yontem) + ")"; }).join(" · ") + "</div>" : "") +
      (s.not ? "<div class=\"hint\">Not: " + esc(s.not) + "</div>" : "") +
      "<div class=\"row end\" style=\"margin-top:10px\">" + (L.kalan(s) > 0 ? "<button class=\"btn sm\" data-a=\"odemeAl\" data-id=\"" + esc(s.id) + "\">Ödeme al</button>" : "") +
      "<button class=\"btn alt sm\" data-a=\"satisYazdir\" data-id=\"" + esc(s.id) + "\">Yazdır</button><button class=\"btn alt sm\" data-a=\"satisDuzenle\" data-id=\"" + esc(s.id) + "\">Düzenle</button></div></div>";
  }

  // ---------- İşler ----------
  function islerEkrani() {
    var bekleyen = S.satislar.filter(function (s) { return s.durum !== "Teslim edildi"; }).sort(function (a, b) { return (a.teslimTarihi || a.tarih).localeCompare(b.teslimTarihi || b.tarih); });
    var borclu = S.musteriler.map(function (m) { return { m: m, b: L.musteriBakiye(S, m.id) }; }).filter(function (x) { return x.b > 0; }).sort(function (a, b) { return b.b - a.b; });
    var bugun = L.bugun(), ayBasi = bugun.slice(0, 8);
    var tahsilBugun = 0, tahsilAy = 0, satisAy = 0;
    S.satislar.forEach(function (s) {
      s.odemeler.forEach(function (o) { if (o.tarih === bugun) tahsilBugun += o.tutar; if (o.tarih.slice(0, 8) === ayBasi) tahsilAy += o.tutar; });
      if (s.tarih.slice(0, 8) === ayBasi) satisAy += L.netToplam(s);
    });
    var toplamBorc = borclu.reduce(function (t, x) { return t + x.b; }, 0);
    var h = "<h2>İşler</h2><div class=\"ozet\">" +
      "<div class=\"card\"><b>" + bekleyen.length + "</b><span>Teslim bekleyen</span></div>" +
      "<div class=\"card\"><b>" + L.paraYaz(toplamBorc) + "</b><span>Açık borç (" + borclu.length + " müşteri)</span></div>" +
      "<div class=\"card\"><b>" + L.paraYaz(tahsilBugun) + "</b><span>Bugün tahsilat</span></div>" +
      "<div class=\"card\"><b>" + L.paraYaz(tahsilAy) + "</b><span>Bu ay tahsilat</span></div>" +
      "<div class=\"card\"><b>" + L.paraYaz(satisAy) + "</b><span>Bu ay satış (net)</span></div></div>";
    h += "<h3>Teslim bekleyenler <span class=\"say\">" + bekleyen.length + "</span></h3>";
    if (!bekleyen.length) h += "<div class=\"card hint\">Bekleyen iş yok.</div>";
    bekleyen.forEach(function (s) { var m = musteri(s.musteriId); h += satisKart(s, m ? L.adSoyad(m) : "?"); });
    h += "<h3>Borcu olanlar <span class=\"say\">" + borclu.length + "</span></h3>";
    if (!borclu.length) h += "<div class=\"card hint\">Borcu olan müşteri yok.</div>";
    else h += "<div class=\"card liste\">" + borclu.map(function (x) {
      return "<div class=\"oge\" data-a=\"musteriAc\" data-id=\"" + esc(x.m.id) + "\"><div class=\"sp\"><div class=\"ad\">" + esc(L.adSoyad(x.m)) + "</div><div class=\"alt\">" + esc(x.m.tel || "") + "</div></div><span class=\"rozet borc\">" + L.paraYaz(x.b) + "</span></div>";
    }).join("") + "</div>";
    return h;
  }

  // ---------- Medula ----------
  function uygulamaAdresi() { return location.href.split("#")[0].split("?")[0]; }
  function anaEkranda() { return window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches); }

  function medulaEkrani() {
    if (medulaSonuc) return medulaInceleme();
    var hedef = medulaHedef && musteri(medulaHedef);
    var h = "<h2>Medula'dan reçete al</h2>";
    if (hedef) h += "<div class=\"basari\">Reçete <b>" + esc(L.adSoyad(hedef)) + "</b> dosyasına eklenecek.</div>";
    h += "<div class=\"card\">" +
      "<div class=\"adim\"><b class=\"n\">1</b><div>Medula Optik'te hastanın <b>reçete sayfasını</b> açın.</div></div>" +
      "<div class=\"adim\"><b class=\"n\">2</b><div>Safari'de yer imlerinden <b>“Medula → Müşteri Takip”</b>e dokunun. <span class=\"hint\">(Henüz eklemediyseniz: <a href=\"#\" data-git=\"ayarlar\">Ayarlar → Medula yer imi</a>)</span></div></div>" +
      "<div class=\"adim\"><b class=\"n\">3</b><div>" + (anaEkranda()
        ? "Açılan kutuda <b>Kopyala</b>'ya dokunun, sonra buraya dönüp aşağıdaki düğmeye basın."
        : "Açılan kutuda <b>Programda aç</b>'a dokunun. Bilgiler burada kendiliğinden açılır. (Ya da <b>Kopyala</b> deyip aşağıdaki düğmeye basın.)") + "</div></div>" +
      "<div class=\"row\" style=\"margin-top:14px\"><button class=\"btn big\" data-a=\"panodan\">Kopyalananı yapıştır</button></div></div>";
    h += "<div class=\"card\"><b>Ya da metni buraya yapıştırın</b><p class=\"hint\" style=\"margin:4px 0 8px\">Basılı tutup “Yapıştır” deyin. Düz kopyalamada Medula'nın kutularındaki göz değerleri gelmez; o zaman değerleri sonraki ekranda elle tamamlayın.</p>" +
      "<textarea id=\"medulaMetin\" placeholder=\"Medula'dan kopyalanan metin…\"></textarea><div class=\"row end\" style=\"margin-top:8px\"><button class=\"btn\" data-a=\"medulaOku\">Oku</button></div></div>";
    return h;
  }

  function medulaIsle(metin) {
    metin = String(metin || "");
    if (!metin.trim()) { toast("Metin boş"); return; }
    var r = M.oku(metin);
    if (!r.musteri.tc && !r.musteri.ad && !r.gozBulundu && !r.recete.receteNo) {
      alert("Bu metinde reçete bilgisi bulunamadı.\n\nMedula'da reçete sayfası açıkken yer imine dokunduğunuzdan emin olun.");
      return;
    }
    medulaSonuc = r;
    yol = { ekran: "medula", id: null };
    ciz(); window.scrollTo(0, 0);
  }

  function medulaInceleme() {
    var r = medulaSonuc, k = r.musteri;
    var es = L.eslesenler(S, k);
    var secili = medulaHedef && musteri(medulaHedef) ? medulaHedef : (es.kesin ? es.liste[0].id : "yeni");
    var adaylar = es.liste.slice();
    if (medulaHedef && musteri(medulaHedef) && adaylar.indexOf(musteri(medulaHedef)) < 0) adaylar.unshift(musteri(medulaHedef));
    var h = "<div class=\"row\" style=\"margin-bottom:10px\"><h2 class=\"sp\" style=\"margin:0\">Reçeteyi kontrol edin</h2><button class=\"btn alt sm\" data-a=\"medulaVazgec\">Vazgeç</button></div>";
    if (r.uyarilar.length) h += "<div class=\"uyarilar\">" + r.uyarilar.map(esc).join("<br>") + "</div>";
    else h += "<div class=\"basari\">Medula'dan okundu. Değerleri kontrol edip kaydedin.</div>";

    h += "<div class=\"card\"><b>Müşteri</b><div class=\"hedef\" style=\"margin-top:8px\">" +
      adaylar.map(function (m) {
        return "<label><input type=\"radio\" name=\"hedef\" value=\"" + esc(m.id) + "\"" + (secili === m.id ? " checked" : "") + "><span><b>" + esc(L.adSoyad(m)) + "</b> dosyasına ekle<br><span class=\"hint\">" + esc([m.tc && "TC " + m.tc, m.tel].filter(Boolean).join(" · ") || "Kayıtlı müşteri") + (es.kesin && m.tc === k.tc ? " · TC eşleşti" : "") + "</span></span></label>";
      }).join("") +
      "<label><input type=\"radio\" name=\"hedef\" value=\"yeni\"" + (secili === "yeni" ? " checked" : "") + "><span><b>Yeni müşteri</b> olarak kaydet</span></label></div>" +
      "<div class=\"grid\" id=\"yeniKisi\" style=\"margin-top:8px" + (secili === "yeni" ? "" : ";display:none") + "\">" +
      "<label>Adı<input name=\"ad\" value=\"" + esc(k.ad) + "\"></label><label>Soyadı<input name=\"soyad\" value=\"" + esc(k.soyad) + "\"></label>" +
      "<label>T.C. Kimlik No<input name=\"tc\" inputmode=\"numeric\" value=\"" + esc(k.tc) + "\"></label><label>Telefon<input name=\"tel\" type=\"tel\" value=\"" + esc(k.tel) + "\" placeholder=\"05xx xxx xx xx\"></label>" +
      "<label>Cinsiyet<input name=\"cinsiyet\" value=\"" + esc(k.cinsiyet) + "\"></label></div></div>";

    h += "<div class=\"card\"><b>Reçete</b><div id=\"receteForm\" style=\"margin-top:8px\">" + receteAlanlari(r.recete) + "</div><div id=\"ayniUyari\"></div></div>";
    h += "<div class=\"row end\"><button class=\"btn alt\" data-a=\"medulaVazgec\">Vazgeç</button><button class=\"btn alt\" data-a=\"medulaKaydet\" data-sonra=\"satis\">Kaydet ve satış ekle</button><button class=\"btn big\" data-a=\"medulaKaydet\">Kaydet</button></div>";
    return h;
  }

  function medulaKaydet(sonra) {
    var kok = $("#ekran");
    var rx = receteTopla($("#receteForm", kok));
    if (!rx) return;
    var hedef = ($("input[name=hedef]:checked", kok) || {}).value || "yeni";
    var m;
    if (hedef === "yeni") {
      var ad = $("input[name=ad]", kok).value.trim(), soyad = $("input[name=soyad]", kok).value.trim();
      if (!ad && !soyad) { alert("Müşterinin adını yazın."); return; }
      var tc = $("input[name=tc]", kok).value.replace(/\s/g, "");
      if (tc && !M.tcGecerli(tc) && !confirm("T.C. kimlik numarası geçersiz görünüyor (" + tc + "). Yine de kaydedilsin mi?")) return;
      m = { id: L.yeniId(), ad: ad, soyad: soyad, tc: tc, tel: $("input[name=tel]", kok).value.trim(), cinsiyet: $("input[name=cinsiyet]", kok).value.trim(), dogum: medulaSonuc.musteri.dogum || "", adres: "", not: "", olusturma: L.bugun() };
      S.musteriler.push(m);
    } else m = musteri(hedef);
    if (!m) return;
    var ayni = L.ayniRecete(S, m.id, rx);
    if (ayni && !confirm("Bu reçete (" + receteBaslik(ayni) + ") bu müşteride zaten kayıtlı. Yine de ikinci kez eklensin mi?")) return;
    rx.id = L.yeniId(); rx.musteriId = m.id; rx.kaynak = "medula"; rx.eklenme = L.bugun();
    S.receteler.push(rx);
    S = L.normalize(S);
    kaydet();
    medulaSonuc = null; medulaHedef = null;
    git("musteri", m.id);
    toast("Reçete kaydedildi");
    if (sonra === "satis") satisFormu(null, m.id, rx.id);
  }

  // ---------- Reçete formu (hem Medula incelemesinde hem elle girişte) ----------
  function v(x) { if (x == null || x === "") return ""; x = Number(x); return (x % 1 ? x.toFixed(2) : String(x)).replace(".", ","); }
  function dv(x) { return x == null ? "" : L.dioptriYaz(x); }
  function receteAlanlari(r) {
    var h = "<div class=\"grid\">" +
      "<label>Reçete tarihi<input type=\"date\" data-f=\"tarih\" value=\"" + esc(r.tarih || L.bugun()) + "\"></label>" +
      "<label>Reçete türü<select data-f=\"tur\"><option value=\"\">—</option>" + secenekler(L.RECETE_TURLERI, r.tur) + "</select></label>" +
      "<label>E-Reçete No<input data-f=\"receteNo\" value=\"" + esc(r.receteNo) + "\"></label>" +
      "<label>Protokol No<input data-f=\"protokolNo\" value=\"" + esc(r.protokolNo) + "\"></label>" +
      "<label>Doktor<input data-f=\"doktor\" value=\"" + esc(r.doktor) + "\"></label>" +
      "<label>Hastane / tesis<input data-f=\"kurum\" value=\"" + esc(r.kurum) + "\"></label>" +
      "<label>Teşhis<input data-f=\"teshis\" value=\"" + esc(r.teshis) + "\"></label>" +
      "<label>Yaş (reçetede)<input data-f=\"yas\" inputmode=\"numeric\" value=\"" + esc(r.yas) + "\"></label></div>";
    h += "<div style=\"overflow-x:auto;margin-top:10px\"><table class=\"rxf\"><thead><tr><th></th><th>SPH (sferik)</th><th>CYL (silindirik)</th><th>AKS</th></tr></thead><tbody>";
    [["uzak", "Uzak"], ["yakin", "Yakın"]].forEach(function (ms) {
      h += "<tr><td class=\"mesafe\" colspan=\"4\">" + ms[1] + "</td></tr>";
      [["sag", "Sağ"], ["sol", "Sol"]].forEach(function (t) {
        var g = (r[t[0]] && r[t[0]][ms[0]]) || {};
        var yol2 = t[0] + "." + ms[0] + ".";
        h += "<tr><th>" + t[1] + "</th>" +
          "<td><div class=\"pm\"><button type=\"button\" data-a=\"isaret\" title=\"İşareti çevir\">±</button><input data-g=\"" + yol2 + "sph\" inputmode=\"decimal\" value=\"" + esc(dv(g.sph)) + "\"></div></td>" +
          "<td><div class=\"pm\"><button type=\"button\" data-a=\"isaret\" title=\"İşareti çevir\">±</button><input data-g=\"" + yol2 + "cyl\" inputmode=\"decimal\" value=\"" + esc(dv(g.cyl)) + "\"></div></td>" +
          "<td><input data-g=\"" + yol2 + "ax\" inputmode=\"numeric\" value=\"" + esc(g.ax == null ? "" : g.ax) + "\" style=\"text-align:center\"></td></tr>";
      });
    });
    h += "<tr><td class=\"mesafe\" colspan=\"4\">Diğer</td></tr>" +
      "<tr><th>ADD</th><td><input data-g=\"sag.add\" inputmode=\"decimal\" placeholder=\"Sağ\" value=\"" + esc(dv(r.sag && r.sag.add)) + "\" style=\"text-align:center\"></td><td><input data-g=\"sol.add\" inputmode=\"decimal\" placeholder=\"Sol\" value=\"" + esc(dv(r.sol && r.sol.add)) + "\" style=\"text-align:center\"></td><td></td></tr>" +
      "<tr><th>PD</th><td><input data-f=\"pdUzak\" inputmode=\"decimal\" placeholder=\"Uzak (ör. 64)\" value=\"" + esc(r.pdUzak) + "\" style=\"text-align:center\"></td><td><input data-f=\"pdYakin\" inputmode=\"decimal\" placeholder=\"Yakın (ör. 61)\" value=\"" + esc(r.pdYakin) + "\" style=\"text-align:center\"></td><td></td></tr>" +
      "</tbody></table></div>";
    h += "<div class=\"row\" style=\"margin-top:8px\"><button type=\"button\" class=\"btn alt sm\" data-a=\"transpoze\">Transpoze (CYL işaretini çevir)</button><span class=\"hint\">± düğmesi tek değerin işaretini çevirir.</span></div>";
    h += "<label class=\"f\" style=\"margin-top:10px\">Not<textarea data-f=\"not\" style=\"min-height:60px\">" + esc(r.not) + "</textarea></label>";
    return h;
  }
  // Formdaki reçeteyi okur; hata varsa işaretler ve null döner.
  function receteTopla(kok) {
    var r = { sag: { uzak: {}, yakin: {}, add: null }, sol: { uzak: {}, yakin: {}, add: null } };
    $$("[data-f]", kok).forEach(function (e) { r[e.dataset.f] = e.value.trim(); });
    var hata = false, ceyrek = false;
    $$("[data-g]", kok).forEach(function (e) {
      var p = e.dataset.g.split("."), aks = p[2] === "ax";
      var d = aks ? L.aksOku(e.value) : L.dioptriOku(e.value);
      e.classList.toggle("hata", Number.isNaN(d));
      e.classList.toggle("uyari", !Number.isNaN(d) && !aks && !L.ceyrekMi(d));
      if (Number.isNaN(d)) hata = true; else if (!aks && !L.ceyrekMi(d)) ceyrek = true;
      if (p.length === 2) r[p[0]].add = Number.isNaN(d) ? null : d; else r[p[0]][p[1]][p[2]] = Number.isNaN(d) ? null : d;
    });
    if (hata) { alert("Kırmızı işaretli değerler okunamadı.\nDioptri örnek: -1,25  +2,50  0\nAks: 0 ile 180 arası tam sayı."); return null; }
    if (ceyrek && !confirm("Sarı işaretli değerler 0,25'in katı değil. Yine de kaydedilsin mi?")) return null;
    return r;
  }

  // ================= Pencereler (formlar) =================
  function pencere(baslik, govde) {
    $("#panel").innerHTML = "<h2>" + esc(baslik) + "<button class=\"x\" data-a=\"kapat\" aria-label=\"Kapat\">×</button></h2>" + govde;
    $("#sheet").classList.add("show");
    $("#sheet").scrollTop = 0;
  }
  function kapat() { $("#sheet").classList.remove("show"); $("#panel").innerHTML = ""; }

  function musteriFormu(m) {
    var yeni = !m;
    m = m || { ad: "", soyad: "", tc: "", tel: "", dogum: "", cinsiyet: "", adres: "", not: "" };
    pencere(yeni ? "Yeni müşteri" : "Müşteriyi düzenle",
      "<div class=\"grid\" id=\"mf\">" +
      "<label>Adı<input data-f=\"ad\" value=\"" + esc(m.ad) + "\" autocapitalize=\"words\"></label>" +
      "<label>Soyadı<input data-f=\"soyad\" value=\"" + esc(m.soyad) + "\" autocapitalize=\"words\"></label>" +
      "<label>T.C. Kimlik No<input data-f=\"tc\" inputmode=\"numeric\" maxlength=\"11\" value=\"" + esc(m.tc) + "\"></label>" +
      "<label>Telefon<input data-f=\"tel\" type=\"tel\" value=\"" + esc(m.tel) + "\" placeholder=\"05xx xxx xx xx\"></label>" +
      "<label>Doğum tarihi<input data-f=\"dogum\" type=\"date\" value=\"" + esc(m.dogum) + "\"></label>" +
      "<label>Cinsiyet<select data-f=\"cinsiyet\"><option value=\"\">—</option>" + secenekler(["Kadın", "Erkek"], m.cinsiyet) + "</select></label>" +
      "<label class=\"genis\">Adres<input data-f=\"adres\" value=\"" + esc(m.adres) + "\"></label>" +
      "<label class=\"genis\">Not<textarea data-f=\"not\" style=\"min-height:60px\">" + esc(m.not) + "</textarea></label></div>" +
      "<div class=\"row\" style=\"margin-top:14px\">" + (yeni ? "" : "<button class=\"btn del\" data-a=\"musteriSil\" data-id=\"" + esc(m.id) + "\">Müşteriyi sil</button>") +
      "<span class=\"sp\"></span><button class=\"btn alt\" data-a=\"kapat\">Vazgeç</button><button class=\"btn\" data-a=\"musteriKaydet\" data-id=\"" + esc(m.id || "") + "\">Kaydet</button></div>");
    if (yeni) setTimeout(function () { var a = $("#mf [data-f=ad]"); if (a) a.focus(); }, 50);
  }
  function musteriKaydet(id) {
    var d = {};
    $$("#mf [data-f]").forEach(function (e) { d[e.dataset.f] = e.value.trim(); });
    if (!d.ad && !d.soyad) { alert("Ad ya da soyad yazın."); return; }
    d.tc = d.tc.replace(/\s/g, "");
    if (d.tc && !M.tcGecerli(d.tc) && !confirm("T.C. kimlik numarası geçersiz görünüyor. Yine de kaydedilsin mi?")) return;
    var cift = d.tc && S.musteriler.filter(function (x) { return x.tc === d.tc && x.id !== id; })[0];
    if (cift && !confirm("Bu TC ile kayıtlı başka bir müşteri var: " + L.adSoyad(cift) + ". Yine de kaydedilsin mi?")) return;
    var m = id ? musteri(id) : null;
    if (m) Object.assign(m, d);
    else { m = Object.assign({ id: L.yeniId(), olusturma: L.bugun() }, d); S.musteriler.push(m); }
    kaydet(); kapat(); git("musteri", m.id); toast("Kaydedildi");
  }
  function musteriSil(id) {
    var m = musteri(id); if (!m) return;
    var nr = S.receteler.filter(function (r) { return r.musteriId === id; }).length, ns = S.satislar.filter(function (s) { return s.musteriId === id; }).length;
    if (!confirm(L.adSoyad(m) + " silinsin mi?" + (nr || ns ? "\n\n" + nr + " reçete ve " + ns + " satış da silinecek." : ""))) return;
    if ((nr || ns) && prompt("Onaylamak için SİL yazın") !== "SİL") return;
    S.musteriler = S.musteriler.filter(function (x) { return x.id !== id; });
    S.receteler = S.receteler.filter(function (x) { return x.musteriId !== id; });
    S.satislar = S.satislar.filter(function (x) { return x.musteriId !== id; });
    kaydet(); kapat(); git("liste"); toast("Silindi");
  }

  function receteFormu(r, musteriId) {
    var yeni = !r;
    r = r || { tarih: L.bugun(), sag: {}, sol: {} };
    pencere(yeni ? "Yeni reçete" : "Reçeteyi düzenle",
      "<div id=\"rf\">" + receteAlanlari(r) + "</div><div class=\"row\" style=\"margin-top:14px\">" +
      (yeni ? "" : "<button class=\"btn del\" data-a=\"receteSil\" data-id=\"" + esc(r.id) + "\">Sil</button>") +
      "<span class=\"sp\"></span><button class=\"btn alt\" data-a=\"kapat\">Vazgeç</button><button class=\"btn\" data-a=\"receteKaydet\" data-id=\"" + esc(r.id || "") + "\" data-musteri=\"" + esc(musteriId || r.musteriId) + "\">Kaydet</button></div>");
  }
  function receteKaydet(id, musteriId) {
    var d = receteTopla($("#rf")); if (!d) return;
    var r = id ? recete(id) : null;
    if (r) Object.assign(r, d);
    else { d.id = L.yeniId(); d.musteriId = musteriId; d.kaynak = "elle"; d.eklenme = L.bugun(); S.receteler.push(d); }
    S = L.normalize(S); kaydet(); kapat(); ciz(); toast("Reçete kaydedildi");
  }
  function receteSil(id) {
    var r = recete(id); if (!r) return;
    var bagli = S.satislar.filter(function (s) { return s.receteId === id; }).length;
    if (!confirm("Bu reçete silinsin mi?" + (bagli ? "\n\n" + bagli + " satışta bu reçete seçili; satışlar kalır, reçete bağlantısı kalkar." : ""))) return;
    S.receteler = S.receteler.filter(function (x) { return x.id !== id; });
    S.satislar.forEach(function (s) { if (s.receteId === id) s.receteId = ""; });
    kaydet(); kapat(); ciz(); toast("Silindi");
  }

  // ---------- Satış formu ----------
  function kalemSatiri(k) {
    return "<tr><td><select data-k=\"tur\">" + secenekler(L.URUN_TURLERI, k.tur) + "</select></td>" +
      "<td style=\"width:100%\"><input data-k=\"aciklama\" value=\"" + esc(k.aciklama) + "\" placeholder=\"Marka, model, renk, cam cinsi…\"></td>" +
      "<td><input class=\"adet\" data-k=\"adet\" inputmode=\"numeric\" value=\"" + esc(k.adet || 1) + "\"></td>" +
      "<td><input class=\"fiyat\" data-k=\"fiyat\" inputmode=\"decimal\" value=\"" + esc(k.fiyat ? v(k.fiyat) : "") + "\" placeholder=\"Fiyat\"></td>" +
      "<td class=\"tut\"></td><td><button type=\"button\" class=\"x\" data-a=\"kalemSil\" aria-label=\"Kalemi sil\">×</button></td></tr>";
  }
  function satisFormu(s, musteriId, receteId) {
    var yeni = !s;
    s = s || { tarih: L.bugun(), receteId: receteId || "", kalemler: [], indirim: 0, kurumPayi: 0, odemeler: [], durum: L.DURUMLAR[0], teslimTarihi: "", not: "" };
    musteriId = musteriId || s.musteriId;
    var rs = S.receteler.filter(function (r) { return r.musteriId === musteriId; }).sort(tarihSirala);
    if (yeni && !receteId && rs.length) s.receteId = rs[0].id;
    var kalemler = s.kalemler.length ? s.kalemler : [{ tur: "Çerçeve", adet: 1 }, { tur: "Cam", adet: 2 }];
    var h = "<div id=\"sf\"><div class=\"grid\">" +
      "<label>Tarih<input type=\"date\" data-f=\"tarih\" value=\"" + esc(s.tarih) + "\"></label>" +
      "<label>Reçete<select data-f=\"receteId\"><option value=\"\">Reçetesiz</option>" + secenekler(rs.map(function (r) { return [r.id, receteBaslik(r)]; }), s.receteId) + "</select></label>" +
      "<label>Durum<select data-f=\"durum\">" + secenekler(L.DURUMLAR, s.durum) + "</select></label>" +
      "<label>Teslim tarihi<input type=\"date\" data-f=\"teslimTarihi\" value=\"" + esc(s.teslimTarihi) + "\"></label></div>" +
      "<div style=\"overflow-x:auto;margin-top:12px\"><table class=\"kf\" style=\"width:100%\"><thead><tr><th class=\"hint\" style=\"text-align:left\">Ürün</th><th class=\"hint\" style=\"text-align:left\">Açıklama</th><th class=\"hint\">Adet</th><th class=\"hint\">Birim fiyat</th><th class=\"hint\" style=\"text-align:right\">Tutar</th><th></th></tr></thead><tbody id=\"kalemler\">" +
      kalemler.map(kalemSatiri).join("") + "</tbody></table></div>" +
      "<div class=\"row\" style=\"margin-top:6px\"><span class=\"hint\">Ekle:</span>" + ["Çerçeve", "Cam", "Lens", "Güneş gözlüğü", "Diğer"].map(function (t) { return "<button type=\"button\" class=\"btn alt sm\" data-a=\"kalemEkle\" data-tur=\"" + esc(t) + "\">+ " + esc(t) + "</button>"; }).join("") + "</div>" +
      "<div class=\"grid\" style=\"margin-top:12px\">" +
      "<label>İndirim (₺)<input data-f=\"indirim\" inputmode=\"decimal\" value=\"" + esc(s.indirim ? v(s.indirim) : "") + "\" placeholder=\"0\"></label>" +
      "<label>SGK / kurum ödemesi (₺)<input data-f=\"kurumPayi\" inputmode=\"decimal\" value=\"" + esc(s.kurumPayi ? v(s.kurumPayi) : "") + "\" placeholder=\"0\"></label>" +
      (yeni ? "<label>Şimdi alınan ödeme (₺)<input data-f=\"ilkOdeme\" inputmode=\"decimal\" placeholder=\"0\"></label><label>Ödeme şekli<select data-f=\"ilkYontem\">" + secenekler(L.ODEME_YONTEMLERI, "Nakit") + "</select></label>" : "") +
      "<label class=\"genis\">Not<input data-f=\"not\" value=\"" + esc(s.not) + "\"></label></div>" +
      "<div id=\"sfTop\"></div>" +
      (!yeni && s.odemeler.length ? "<h3>Ödemeler</h3><div class=\"card liste\">" + s.odemeler.map(function (o) { return "<div class=\"oge\" style=\"cursor:default\"><span class=\"sp\">" + L.tarihYaz(o.tarih) + " · " + esc(o.yontem) + "</span><b>" + L.paraYaz(o.tutar) + "</b><button type=\"button\" class=\"x\" data-a=\"odemeSil\" data-id=\"" + esc(s.id) + "\" data-odeme=\"" + esc(o.id) + "\" aria-label=\"Ödemeyi sil\">×</button></div>"; }).join("") + "</div>" : "") +
      "</div><div class=\"row\" style=\"margin-top:14px\">" + (yeni ? "" : "<button class=\"btn del\" data-a=\"satisSil\" data-id=\"" + esc(s.id) + "\">Sil</button>") +
      "<span class=\"sp\"></span><button class=\"btn alt\" data-a=\"kapat\">Vazgeç</button><button class=\"btn\" data-a=\"satisKaydet\" data-id=\"" + esc(s.id || "") + "\" data-musteri=\"" + esc(musteriId) + "\">Kaydet</button></div>";
    var m = musteri(musteriId);
    pencere((yeni ? "Yeni satış" : "Satışı düzenle") + (m ? " · " + L.adSoyad(m) : ""), h);
    satisHesapla();
  }
  // Formu okur. hataGoster: geçersiz kutuları işaretle.
  function satisOku(hataGoster) {
    var kok = $("#sf"); if (!kok) return null;
    var d = { kalemler: [] }, hata = false;
    $$("[data-f]", kok).forEach(function (e) { d[e.dataset.f] = e.value.trim(); });
    function p(e) { var n = L.paraOku(e.value); var bad = Number.isNaN(n) || n < 0; if (hataGoster || !bad) e.classList.toggle("hata", bad); if (bad) hata = true; return bad ? 0 : n; }
    $$("#kalemler tr", kok).forEach(function (tr) {
      var k = { tur: $("[data-k=tur]", tr).value, aciklama: $("[data-k=aciklama]", tr).value.trim(), adet: Math.max(1, parseInt($("[data-k=adet]", tr).value, 10) || 1), fiyat: p($("[data-k=fiyat]", tr)) };
      $(".tut", tr).textContent = k.fiyat ? L.paraYaz(k.adet * k.fiyat) : "";
      if (k.aciklama || k.fiyat) d.kalemler.push(k);
    });
    d.indirim = p($("[data-f=indirim]", kok)); d.kurumPayi = p($("[data-f=kurumPayi]", kok));
    var ilk = $("[data-f=ilkOdeme]", kok); d.ilkOdeme = ilk ? p(ilk) : 0;
    d.hata = hata;
    return d;
  }
  function satisHesapla() {
    var d = satisOku(false); if (!d) return;
    var idEl = $("#sf ~ .row [data-a=satisKaydet]") || $("[data-a=satisKaydet]");
    var eski = idEl && idEl.dataset.id ? satis(idEl.dataset.id) : null;
    var s = { kalemler: d.kalemler, indirim: d.indirim, kurumPayi: d.kurumPayi, odemeler: (eski ? eski.odemeler : []).concat(d.ilkOdeme ? [{ tutar: d.ilkOdeme }] : []) };
    $("#sfTop").innerHTML = toplamlar(s);
  }
  function satisKaydet(id, musteriId) {
    var d = satisOku(true);
    if (d.hata) { alert("Kırmızı işaretli tutarlar okunamadı. Örnek: 1.250,00 ya da 1250"); return; }
    if (!d.kalemler.length) { alert("En az bir ürün yazın (açıklama ya da fiyat)."); return; }
    var s = id ? satis(id) : null;
    var veri = { tarih: d.tarih || L.bugun(), receteId: d.receteId, durum: d.durum, teslimTarihi: d.teslimTarihi, not: d.not, kalemler: d.kalemler, indirim: d.indirim, kurumPayi: d.kurumPayi };
    if (s) Object.assign(s, veri);
    else {
      s = Object.assign({ id: L.yeniId(), musteriId: musteriId, odemeler: [] }, veri);
      if (d.ilkOdeme > 0) s.odemeler.push({ id: L.yeniId(), tarih: s.tarih, tutar: d.ilkOdeme, yontem: d.ilkYontem });
      S.satislar.push(s);
    }
    if (L.netToplam(s) < 0) { alert("İndirim ve kurum ödemesi toplamı geçiyor. Lütfen kontrol edin."); if (!id) S.satislar.pop(); return; }
    S = L.normalize(S); kaydet(); kapat(); ciz(); toast("Satış kaydedildi");
  }
  function satisSil(id) {
    if (!confirm("Bu satış ve ödemeleri silinsin mi?")) return;
    S.satislar = S.satislar.filter(function (x) { return x.id !== id; });
    kaydet(); kapat(); ciz(); toast("Silindi");
  }
  function odemeFormu(s) {
    pencere("Ödeme al", "<div id=\"of\"><p>Kalan: <b>" + L.paraYaz(L.kalan(s)) + "</b></p><div class=\"grid\">" +
      "<label>Tutar (₺)<input data-f=\"tutar\" inputmode=\"decimal\" value=\"" + esc(v(L.kalan(s))) + "\"></label>" +
      "<label>Ödeme şekli<select data-f=\"yontem\">" + secenekler(L.ODEME_YONTEMLERI, "Nakit") + "</select></label>" +
      "<label>Tarih<input type=\"date\" data-f=\"tarih\" value=\"" + L.bugun() + "\"></label></div></div>" +
      "<div class=\"row end\" style=\"margin-top:14px\"><button class=\"btn alt\" data-a=\"kapat\">Vazgeç</button><button class=\"btn\" data-a=\"odemeKaydet\" data-id=\"" + esc(s.id) + "\">Kaydet</button></div>");
    setTimeout(function () { var e = $("#of [data-f=tutar]"); if (e) e.select(); }, 50);
  }

  // ================= Yazdırma =================
  function yazdir(html) {
    $("#yazdir").innerHTML = html;
    setTimeout(function () { window.print(); }, 50);
  }
  function yazdirRx(r) {
    var h = "<table><tr><th></th><th>SPH</th><th>CYL</th><th>AKS</th><th>ADD</th></tr>";
    [["uzak", "Uzak"], ["yakin", "Yakın"]].forEach(function (ms) {
      [["sag", "Sağ"], ["sol", "Sol"]].forEach(function (t) {
        var g = r[t[0]][ms[0]]; if (L.gozBos(g)) return;
        h += "<tr><th class=\"sol\">" + t[1] + " " + ms[1] + "</th><td>" + esc(L.dioptriYaz(g.sph)) + "</td><td>" + esc(L.dioptriYaz(g.cyl)) + "</td><td>" + esc(L.aksYaz(g.ax)) + "</td><td>" + esc(L.dioptriYaz(r[t[0]].add)) + "</td></tr>";
      });
    });
    h += "</table>";
    if (r.pdUzak || r.pdYakin) h += "<p>PD: " + esc([r.pdUzak && "Uzak " + r.pdUzak, r.pdYakin && "Yakın " + r.pdYakin].filter(Boolean).join(" · ")) + "</p>";
    return h;
  }
  function yazdirBaslik(m, baslik) {
    return "<h1>" + esc(S.ayarlar.dukkan || "Müşteri Takip") + "</h1><p><b>" + esc(baslik) + "</b> · " + L.tarihYaz(L.bugun()) + "</p>" +
      "<p>Müşteri: <b>" + esc(L.adSoyad(m)) + "</b>" + (m.tel ? " · Tel: " + esc(m.tel) : "") + "</p>";
  }
  function receteYazdir(r) {
    var m = musteri(r.musteriId) || {};
    yazdir(yazdirBaslik(m, "Reçete / İş emri") + "<p>" + esc(receteBaslik(r)) + (r.doktor ? " · Dr. " + esc(r.doktor) : "") + (r.kurum ? " · " + esc(r.kurum) : "") + "</p>" + yazdirRx(r) + (r.not ? "<p>Not: " + esc(r.not) + "</p>" : ""));
  }
  function satisYazdir(s) {
    var m = musteri(s.musteriId) || {}, r = recete(s.receteId);
    var h = yazdirBaslik(m, "Satış fişi") + "<p>Satış tarihi: " + L.tarihYaz(s.tarih) + " · Durum: " + esc(s.durum) + (s.teslimTarihi ? " · Teslim: " + L.tarihYaz(s.teslimTarihi) : "") + "</p>";
    if (r) h += "<p>Reçete: " + esc(receteBaslik(r)) + "</p>" + yazdirRx(r);
    h += "<table><tr><th class=\"sol\">Ürün</th><th class=\"sol\">Açıklama</th><th>Adet</th><th class=\"sag\">Fiyat</th><th class=\"sag\">Tutar</th></tr>" +
      s.kalemler.map(function (k) { return "<tr><td class=\"sol\">" + esc(k.tur) + "</td><td class=\"sol\">" + esc(k.aciklama) + "</td><td>" + k.adet + "</td><td class=\"sag\">" + L.paraYaz(k.fiyat) + "</td><td class=\"sag\">" + L.paraYaz(k.adet * k.fiyat) + "</td></tr>"; }).join("") + "</table>";
    h += "<table style=\"width:50%;margin-left:auto\">" +
      "<tr><td class=\"sol\">Ara toplam</td><td class=\"sag\">" + L.paraYaz(L.araToplam(s)) + "</td></tr>" +
      (s.indirim ? "<tr><td class=\"sol\">İndirim</td><td class=\"sag\">−" + L.paraYaz(s.indirim) + "</td></tr>" : "") +
      (s.kurumPayi ? "<tr><td class=\"sol\">SGK / kurum ödemesi</td><td class=\"sag\">−" + L.paraYaz(s.kurumPayi) + "</td></tr>" : "") +
      "<tr><th class=\"sol\">Toplam</th><th class=\"sag\">" + L.paraYaz(L.netToplam(s)) + "</th></tr>" +
      "<tr><td class=\"sol\">Ödenen</td><td class=\"sag\">" + L.paraYaz(L.odenen(s)) + "</td></tr>" +
      "<tr><th class=\"sol\">Kalan</th><th class=\"sag\">" + L.paraYaz(L.kalan(s)) + "</th></tr></table>";
    if (s.not) h += "<p>Not: " + esc(s.not) + "</p>";
    h += "<div class=\"imza\"><span>Teslim eden</span><span>Teslim alan</span></div>";
    yazdir(h);
  }

  // ================= Ayarlar, yedek =================
  function ayarlarEkrani() {
    var kod = M.yerImiKodu(uygulamaAdresi());
    var yerel = !/^https:/.test(location.protocol);
    var tema = lsAl("mt-tema") || "auto";
    var h = "<h2>Ayarlar</h2>";
    h += "<div class=\"card\"><b>Dükkan</b><div class=\"grid\" style=\"margin-top:8px\"><label class=\"genis\">Dükkan adı (fişlerde ve başlıkta görünür)<input id=\"dukkan\" value=\"" + esc(S.ayarlar.dukkan) + "\" placeholder=\"Örn. Yıldız Optik\"></label></div></div>";

    h += "<div class=\"card\" id=\"yerimi\"><b>Medula yer imi (bir kez kurulur)</b>" +
      (yerel ? "<div class=\"uyarilar\" style=\"margin-top:8px\">Bu sayfa şu an internet adresinden değil, dosyadan açılmış. Yer imi, programın internet adresiyle (https://…) kurulmalı. README'deki “Yayınlama” adımına bakın.</div>" : "") +
      "<p class=\"hint\">Bu yer imi, Medula'daki reçete sayfasını (kutuların ve +/- seçimlerinin içindekiler dahil) okuyup bu programa getirir. Medula'ya hiçbir şey yazmaz, hiçbir yere göndermez.</p>" +
      "<b>iPad / iPhone (Safari)</b>" +
      "<div class=\"adim\"><b class=\"n\">1</b><div>Aşağıdaki <b>Kodu kopyala</b> düğmesine basın.</div></div>" +
      "<div class=\"adim\"><b class=\"n\">2</b><div>Safari'de bu sayfadayken adres çubuğundaki <b>Paylaş</b> düğmesine dokunun → <b>Yer İmi Ekle</b>. Adını <b>Medula → Müşteri Takip</b> yapın → <b>Kaydet</b>.</div></div>" +
      "<div class=\"adim\"><b class=\"n\">3</b><div><b>Yer İmleri</b>ni açın → <b>Düzenle</b> → az önce eklediğiniz yer imine dokunun → adres satırındaki yazıyı tümüyle silin → kopyaladığınız kodu <b>yapıştırın</b> → <b>Bitti</b>.</div></div>" +
      "<div class=\"adim\"><b class=\"n\">4</b><div>Kullanım: Medula'da reçete sayfası açıkken <b>Yer İmleri → Medula → Müşteri Takip</b>.</div></div>" +
      "<div class=\"row\" style=\"margin:8px 0\"><button class=\"btn\" data-a=\"kodKopyala\">Kodu kopyala</button></div>" +
      "<textarea class=\"kod\" id=\"kod\" readonly>" + esc(kod) + "</textarea>" +
      "<p style=\"margin-top:12px\"><b>Bilgisayar (Chrome, Edge, Safari)</b><br><span class=\"hint\">Yer imleri çubuğunu açın ve şu düğmeyi sürükleyip çubuğa bırakın:</span></p>" +
      "<a class=\"yerimi\" draggable=\"true\" href=\"" + esc(kod) + "\" data-a=\"yerimiTik\">Medula → Müşteri Takip</a>" +
      "<p class=\"hint\" style=\"margin-top:12px\">" + (anaEkranda()
        ? "Not: Programı ana ekrandan açtınız. iPad, ana ekrandaki uygulamaya Safari'den bilgi aktarmaya izin vermez. Bu yüzden yer iminde <b>Kopyala</b>'ya basın, sonra burada <b>Medula'dan al → Kopyalananı yapıştır</b> deyin."
        : "İpucu: Yer iminde <b>Programda aç</b> derseniz bilgiler Safari'de bu programa kendiliğinden gelir. Programı iPad'in ana ekranına eklediyseniz, o uygulama Safari'den ayrı veri tutar; orada <b>Kopyala</b> → <b>Kopyalananı yapıştır</b> yolunu kullanın.") + "</p></div>";

    h += "<div class=\"card\"><b>Veri ve yedek</b><p class=\"hint\">Veriler yalnızca bu cihazda saklanır, internete gönderilmez. Cihaz kaybolursa ya da Safari verileri silinirse kaybolmamaları için düzenli yedek alın (iCloud Drive'a, Dosyalar'a ya da e-postaya).</p>" +
      "<p>" + S.musteriler.length + " müşteri · " + S.receteler.length + " reçete · " + S.satislar.length + " satış<br><span class=\"hint\">Son yedek: " + (S.ayarlar.sonYedek ? L.tarihYaz(S.ayarlar.sonYedek) : "hiç alınmadı") + "</span></p>" +
      "<div class=\"row\"><button class=\"btn\" data-a=\"yedekIndir\">Yedek indir</button><button class=\"btn alt\" data-a=\"yedekYukle\">Yedekten geri yükle</button><button class=\"btn alt\" data-a=\"excel\">Excel'e aktar</button></div>" +
      "<p style=\"margin-top:14px\"><b>Otomatik günlük kopyalar</b> <span class=\"hint\">(bu cihazda, son 14 gün; yanlışlıkla silinenleri geri almak için)</span></p><div id=\"kopyalar\" class=\"hint\">…</div></div>";

    h += "<div class=\"card\"><b>Görünüm</b><div class=\"row\" style=\"margin-top:8px\"><div class=\"seg\">" +
      [["auto", "Otomatik"], ["light", "Açık"], ["dark", "Koyu"]].map(function (t) { return "<button data-a=\"tema\" data-t=\"" + t[0] + "\" class=\"" + (tema === t[0] ? "on" : "") + "\">" + t[1] + "</button>"; }).join("") + "</div></div></div>";
    setTimeout(kopyalariGoster, 0);
    return h;
  }
  function kopyalariGoster() {
    dbAnahtarlar().then(function (ks) {
      var el = $("#kopyalar"); if (!el) return;
      ks = ks.filter(function (k) { return /^kopya-/.test(k); }).sort().reverse();
      el.innerHTML = ks.length ? ks.map(function (k) { return "<div class=\"row\" style=\"padding:4px 0\"><span class=\"sp\">" + L.tarihYaz(k.slice(6, 16)) + (k.length > 16 ? " <span class=\"hint\">(geri yükleme öncesi)</span>" : "") + "</span><button class=\"btn alt sm\" data-a=\"kopyaYukle\" data-k=\"" + esc(k) + "\">Geri yükle</button></div>"; }).join("") : "Henüz yok.";
    });
  }
  function lsAl(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsYaz(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function temaUygula() {
    var t = lsAl("mt-tema");
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme");
  }

  function dosyaVer(blob, ad, sonra) {
    var file = null;
    try { file = new File([blob], ad, { type: blob.type }); } catch (e) {}
    var mobil = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    function indir() {
      var u = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = u; a.download = ad; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 4000);
      if (sonra) sonra();
    }
    try {
      if (mobil && file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file] }).then(function () { if (sonra) sonra(); }, function (e) { if (e && e.name === "AbortError") return; indir(); });
        return;
      }
    } catch (e) {}
    indir();
  }
  function yedekIndir() {
    var ad = "musteri-takip-yedek-" + L.bugun() + ".json";
    dosyaVer(new Blob([JSON.stringify(S, null, 1)], { type: "application/json" }), ad, function () {
      S.ayarlar.sonYedek = L.bugun(); kaydet(); ciz(); toast("Yedek kaydedildi");
    });
  }
  function yedekYukle() { var f = $("#dosya"); f.value = ""; f.click(); }
  function yedektenYukle(st, ad) {
    st = L.normalize(st);
    if (!st) { alert("Bu dosya geçerli bir Müşteri Takip yedeği değil."); return; }
    if (!confirm(ad + "\n\n" + st.musteriler.length + " müşteri, " + st.receteler.length + " reçete, " + st.satislar.length + " satış.\n\nŞu anki veriler bununla DEĞİŞTİRİLECEK. (Şu anki hali önce cihaz içinde ayrıca saklanır.) Devam edilsin mi?")) return;
    dbYaz("kopya-" + L.bugun() + "-geri-yukleme-oncesi-" + Date.now(), JSON.parse(JSON.stringify(S))).then(function () {
      st.ayarlar.sonYedek = st.ayarlar.sonYedek || S.ayarlar.sonYedek;
      S = st; kaydet(); git("liste"); toast("Geri yüklendi");
    });
  }

  function excel() {
    function yap() {
      var X = window.XLSX, wb = X.utils.book_new();
      function sayfa(ad, satirlar) { X.utils.book_append_sheet(wb, X.utils.json_to_sheet(satirlar), ad); }
      var mAd = {}; S.musteriler.forEach(function (m) { mAd[m.id] = L.adSoyad(m); });
      sayfa("Müşteriler", S.musteriler.map(function (m) { return { "Ad": m.ad, "Soyad": m.soyad, "TC": m.tc, "Telefon": m.tel, "Doğum": L.tarihYaz(m.dogum), "Cinsiyet": m.cinsiyet, "Adres": m.adres, "Not": m.not, "Bakiye": L.musteriBakiye(S, m.id) }; }));
      sayfa("Reçeteler", S.receteler.map(function (r) {
        var o = { "Müşteri": mAd[r.musteriId] || "", "Tarih": L.tarihYaz(r.tarih), "Tür": r.tur, "E-Reçete No": r.receteNo, "Protokol": r.protokolNo, "Doktor": r.doktor, "Tesis": r.kurum, "Teşhis": r.teshis };
        ["sag", "sol"].forEach(function (t) { ["uzak", "yakin"].forEach(function (ms) { ["sph", "cyl", "ax"].forEach(function (p) { o[(t === "sag" ? "Sağ " : "Sol ") + (ms === "uzak" ? "Uzak " : "Yakın ") + p.toUpperCase()] = r[t][ms][p]; }); }); o[(t === "sag" ? "Sağ" : "Sol") + " ADD"] = r[t].add; });
        o["PD Uzak"] = r.pdUzak; o["PD Yakın"] = r.pdYakin; o["Not"] = r.not; return o;
      }));
      sayfa("Satışlar", S.satislar.map(function (s) { return { "Müşteri": mAd[s.musteriId] || "", "Tarih": L.tarihYaz(s.tarih), "Ürünler": s.kalemler.map(function (k) { return k.adet + "× " + k.tur + (k.aciklama ? " (" + k.aciklama + ")" : ""); }).join(", "), "Ara toplam": L.araToplam(s), "İndirim": s.indirim, "SGK/Kurum": s.kurumPayi, "Toplam": L.netToplam(s), "Ödenen": L.odenen(s), "Kalan": L.kalan(s), "Durum": s.durum, "Teslim": L.tarihYaz(s.teslimTarihi), "Not": s.not }; }));
      var kalemler = [], odemeler = [];
      S.satislar.forEach(function (s) {
        s.kalemler.forEach(function (k) { kalemler.push({ "Müşteri": mAd[s.musteriId] || "", "Satış tarihi": L.tarihYaz(s.tarih), "Ürün": k.tur, "Açıklama": k.aciklama, "Adet": k.adet, "Birim fiyat": k.fiyat, "Tutar": L.para(k.adet * k.fiyat) }); });
        s.odemeler.forEach(function (o) { odemeler.push({ "Müşteri": mAd[s.musteriId] || "", "Tarih": L.tarihYaz(o.tarih), "Tutar": o.tutar, "Şekil": o.yontem }); });
      });
      sayfa("Ürünler", kalemler); sayfa("Ödemeler", odemeler);
      var out = X.write(wb, { bookType: "xlsx", type: "array" });
      dosyaVer(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "musteri-takip-" + L.bugun() + ".xlsx", function () { toast("Excel dosyası hazır"); });
    }
    if (window.XLSX) return yap();
    var sc = document.createElement("script"); sc.src = "vendor/xlsx.full.min.js";
    sc.onload = yap; sc.onerror = function () { alert("Excel aracı yüklenemedi."); };
    document.head.appendChild(sc);
  }

  // ================= Olaylar =================
  var EYLEM = {
    kapat: kapat,
    yeniMusteri: function () { musteriFormu(null); },
    musteriAc: function (e) { kapat(); git("musteri", e.dataset.id); },
    musteriDuzenle: function (e) { musteriFormu(musteri(e.dataset.id)); },
    musteriKaydet: function (e) { musteriKaydet(e.dataset.id); },
    musteriSil: function (e) { musteriSil(e.dataset.id); },
    yeniRecete: function (e) { receteFormu(null, e.dataset.id); },
    receteDuzenle: function (e) { receteFormu(recete(e.dataset.id)); },
    receteKaydet: function (e) { receteKaydet(e.dataset.id, e.dataset.musteri); },
    receteSil: function (e) { receteSil(e.dataset.id); },
    receteYazdir: function (e) { receteYazdir(recete(e.dataset.id)); },
    yeniSatis: function (e) { satisFormu(null, e.dataset.id, e.dataset.recete); },
    satisDuzenle: function (e) { satisFormu(satis(e.dataset.id)); },
    satisKaydet: function (e) { satisKaydet(e.dataset.id, e.dataset.musteri); },
    satisSil: function (e) { satisSil(e.dataset.id); },
    satisYazdir: function (e) { satisYazdir(satis(e.dataset.id)); },
    kalemEkle: function (e) {
      var tb = $("#kalemler"); tb.insertAdjacentHTML("beforeend", kalemSatiri({ tur: e.dataset.tur, adet: e.dataset.tur === "Cam" ? 2 : 1 }));
      var son = tb.lastElementChild; $("[data-k=aciklama]", son).focus(); satisHesapla();
    },
    kalemSil: function (e) { e.closest("tr").remove(); satisHesapla(); },
    odemeAl: function (e) { odemeFormu(satis(e.dataset.id)); },
    odemeKaydet: function (e) {
      var s = satis(e.dataset.id), kok = $("#of");
      var t = L.paraOku($("[data-f=tutar]", kok).value);
      if (Number.isNaN(t) || t <= 0) { $("[data-f=tutar]", kok).classList.add("hata"); return; }
      if (t > L.kalan(s) + 0.001 && !confirm("Tutar kalan borçtan fazla (" + L.paraYaz(L.kalan(s)) + "). Yine de kaydedilsin mi?")) return;
      s.odemeler.push({ id: L.yeniId(), tarih: $("[data-f=tarih]", kok).value || L.bugun(), tutar: t, yontem: $("[data-f=yontem]", kok).value });
      kaydet(); kapat(); ciz(); toast("Ödeme kaydedildi");
    },
    odemeSil: function (e) {
      var s = satis(e.dataset.id); if (!s || !confirm("Bu ödeme silinsin mi?")) return;
      s.odemeler = s.odemeler.filter(function (o) { return o.id !== e.dataset.odeme; });
      kaydet(); satisFormu(s); ciz();
    },
    isaret: function (e) {
      var i = e.parentNode.querySelector("input"), d = L.dioptriOku(i.value);
      if (d == null || Number.isNaN(d)) { i.value = i.value.trim().charAt(0) === "-" ? i.value.trim().slice(1) : "-" + i.value.trim(); i.focus(); return; }
      i.value = L.dioptriYaz(-d);
    },
    transpoze: function (e) {
      var kok = e.closest("#rf, #receteForm") || document;
      var degisti = false;
      ["sag", "sol"].forEach(function (t) {
        ["uzak", "yakin"].forEach(function (ms) {
          var el = function (p) { return $("[data-g='" + t + "." + ms + "." + p + "']", kok); };
          var g = { sph: L.dioptriOku(el("sph").value), cyl: L.dioptriOku(el("cyl").value), ax: L.aksOku(el("ax").value) };
          if (g.cyl == null || Number.isNaN(g.cyl) || g.cyl === 0 || Number.isNaN(g.sph) || Number.isNaN(g.ax)) return;
          var y = L.transpoze(g);
          el("sph").value = L.dioptriYaz(y.sph); el("cyl").value = L.dioptriYaz(y.cyl); el("ax").value = y.ax == null ? "" : y.ax;
          degisti = true;
        });
      });
      toast(degisti ? "Transpoze edildi" : "Silindir değeri olan göz yok");
    },
    medulaIcin: function (e) { medulaHedef = e.dataset.id; medulaSonuc = null; yol = { ekran: "medula" }; ciz(); window.scrollTo(0, 0); },
    medulaOku: function () { medulaIsle($("#medulaMetin").value); },
    panodan: function () {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(medulaIsle, function () { toast("Panoya erişilemedi; metni kutuya yapıştırın"); $("#medulaMetin").focus(); });
      } else { toast("Metni kutuya yapıştırın"); $("#medulaMetin").focus(); }
    },
    medulaVazgec: function () { var h = medulaHedef; medulaSonuc = null; if (h && musteri(h)) git("musteri", h); else git("medula"); },
    medulaKaydet: function (e) { medulaKaydet(e.dataset.sonra); },
    yedekIndir: yedekIndir,
    yedekYukle: yedekYukle,
    excel: excel,
    kopyaYukle: function (e) { dbAl(e.dataset.k).then(function (st) { yedektenYukle(st, "Otomatik kopya: " + L.tarihYaz(e.dataset.k.slice(6, 16))); }); },
    kodKopyala: function () {
      var t = $("#kod");
      function eski() { t.focus(); t.select(); t.setSelectionRange(0, t.value.length); try { document.execCommand("copy"); } catch (x) {} toast("Kod kopyalandı"); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(function () { toast("Kod kopyalandı"); }, eski); else eski();
    },
    yerimiTik: function () { toast("Bu düğmeyi yer imleri çubuğuna sürükleyin"); },
    tema: function (e) { lsYaz("mt-tema", e.dataset.t); temaUygula(); ciz(); }
  };

  document.addEventListener("click", function (ev) {
    var g = ev.target.closest("[data-git]");
    if (g) { ev.preventDefault(); kapat(); if (g.dataset.git === "medula") { medulaHedef = null; medulaSonuc = null; } git(g.dataset.git); return; }
    var a = ev.target.closest("[data-a]");
    if (!a || a.tagName === "SELECT") return;
    if (a.tagName === "A" || a.tagName === "BUTTON") ev.preventDefault();
    var f = EYLEM[a.dataset.a]; if (f) f(a);
  });
  $("#sheet").addEventListener("click", function (ev) { if (ev.target.id === "sheet") kapat(); });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && $("#sheet").classList.contains("show")) kapat();
  });
  document.addEventListener("input", function (ev) {
    var t = ev.target;
    if (t.id === "ara") { aramaQ = t.value; listeyiGuncelle(); return; }
    if (t.id === "dukkan") { S.ayarlar.dukkan = t.value.trim(); $("#baslik").textContent = S.ayarlar.dukkan || "Müşteri Takip"; kaydet(); return; }
    if (t.closest && t.closest("#sf")) satisHesapla();
    if (t.classList && (t.classList.contains("hata") || t.classList.contains("uyari"))) t.classList.remove("hata", "uyari");
  });
  document.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.dataset && t.dataset.a === "durumDegis") {
      var s = satis(t.dataset.id); if (!s) return;
      s.durum = t.value; kaydet(); toast("Durum: " + t.value);
      if (yol.ekran === "isler") ciz();
      return;
    }
    if (t.name === "hedef") { var y = $("#yeniKisi"); if (y) y.style.display = t.value === "yeni" ? "" : "none"; }
    if (t.closest && t.closest("#sf")) satisHesapla();
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && ev.target.id === "ara") {
      var ilk = $("#listeSonuc .oge"); if (ilk) { ev.target.blur(); git("musteri", ilk.dataset.id); }
    }
  });
  $("#dosya").addEventListener("change", function () {
    var f = this.files && this.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () { var st = null; try { st = JSON.parse(r.result); } catch (e) {} yedektenYukle(st, f.name); };
    r.readAsText(f);
  });

  // Yer iminden "Programda aç" ile gelen reçete: adres#medula=...
  function adrestenAl() {
    var h = location.hash;
    if (h.indexOf("#medula=") !== 0) return false;
    var metin = "";
    try { metin = decodeURIComponent(h.slice(8)); } catch (e) {}
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { location.hash = ""; }
    medulaHedef = null;
    medulaIsle(metin);
    return true;
  }
  window.addEventListener("hashchange", adrestenAl);

  // ================= Başlangıç =================
  temaUygula();
  dbAc().then(function () { return dbAl("durum"); }).then(function (st) {
    var n = L.normalize(st);
    if (n) S = n;
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    gunlukKopya();
    if (!adrestenAl()) ciz();
    if (st && !n) {
      dbYaz("bozuk-" + Date.now(), st).catch(function () {});
      alert("Kayıtlı veri okunamadı (kenara ayrıldı). Ayarlar → Otomatik günlük kopyalar ya da Yedekten geri yükle ile geri alabilirsiniz.");
    }
  });
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(function () {});
})();
