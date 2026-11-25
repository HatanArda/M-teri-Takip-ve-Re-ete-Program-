// İki yer işaretinin ortak parçaları: ekrandaki kutu, pano, değer biçimleri.
// Yer işaretine paketlenirken diğer dosyalarla aynı kapsamda çalışır.

var MT_ONEK = "MEDULA>OPTIKPRO:1:";

// Türkçe harfleri sadeleştirip küçük harfe çevirir (karşılaştırma için).
function mtFold(s) {
  return String(s == null ? "" : s).replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase()
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function mtEsc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
}

// Sayfanın üstünde koyu bir kutu açar.
function mtKutu(baslik) {
  var eski = document.getElementById("mt-kutu");
  if (eski) eski.parentNode.removeChild(eski);
  var k = document.createElement("div");
  k.id = "mt-kutu";
  k.style.cssText = "all:initial;position:fixed;z-index:2147483647;left:50%;top:16px;transform:translateX(-50%);box-sizing:border-box;width:min(560px,94vw);max-height:88vh;overflow:auto;background:#14212b;color:#fff;font:15px/1.45 -apple-system,Segoe UI,sans-serif;padding:16px 18px;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.45);text-align:left";
  var b = document.createElement("div");
  b.style.cssText = "font-weight:700;font-size:17px;margin-bottom:8px";
  b.textContent = baslik;
  var govde = document.createElement("div");
  var dugmeler = document.createElement("div");
  dugmeler.style.cssText = "margin-top:12px;display:flex;flex-wrap:wrap;gap:8px";
  k.appendChild(b); k.appendChild(govde); k.appendChild(dugmeler);
  document.body.appendChild(k);
  var api = {
    kutu: k, govde: govde,
    baslik: function (t) { b.textContent = t; },
    yaz: function (html) { govde.innerHTML = html; },
    temizle: function () { dugmeler.innerHTML = ""; },
    dugme: function (ad, tur, fn) {
      var d = document.createElement("button");
      d.type = "button";
      d.textContent = ad;
      d.style.cssText = "all:initial;font:inherit;font-weight:700;padding:11px 16px;border-radius:10px;cursor:pointer;" +
        (tur === "ana" ? "background:#0f8f7a;color:#fff" : tur === "acik" ? "background:#fff;color:#14212b" : "color:#fff;border:1px solid rgba(255,255,255,.4)");
      d.onclick = function () { fn(d); };
      dugmeler.appendChild(d);
      return d;
    },
    kapat: function () { if (k.parentNode) k.parentNode.removeChild(k); }
  };
  return api;
}

function mtKopyala(metin) {
  function eskiYol() {
    var ta = document.createElement("textarea");
    ta.value = metin; ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, metin.length);
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(metin).then(function () { return true; }, function () { return eskiYol(); });
  }
  return Promise.resolve(eskiYol());
}

function mtPanodanOku() {
  if (navigator.clipboard && navigator.clipboard.readText) return navigator.clipboard.readText();
  return Promise.reject(new Error("pano yok"));
}

// Dioptri: +2.50 / -1.25 / 0.00. Sayı kutusu (type=number) "+" kabul etmez.
function mtDioptri(v, sayiKutusu) {
  if (v == null || v === "" || isNaN(v)) return "";
  v = Number(v);
  var s = Math.abs(v).toFixed(2);
  if (v < 0) return "-" + s;
  return v > 0 && !sayiKutusu ? "+" + s : s;
}
function mtAks(v) { return v == null || v === "" || isNaN(v) ? "" : String(Math.round(Number(v))); }
function mtTarihTR(iso) {
  var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[3] + "." + m[2] + "." + m[1] : "";
}

// Medula sonucundan Optik Pro'ya gidecek reçete satırları (dolu olanlar).
function mtSatirlar(r) {
  var out = [];
  [["uzak", "Uzak"], ["yakin", "Yakın"]].forEach(function (ms) {
    [["sag", "SAĞ"], ["sol", "SOL"]].forEach(function (t) {
      var g = r[t[0]][ms[0]];
      if (!g || (g.sph == null && g.cyl == null && g.ax == null)) return;
      out.push({ mesafe: ms[1], goz: t[1], sph: g.sph, cyl: g.cyl, ax: g.ax, add: ms[0] === "uzak" ? r[t[0]].add : null });
    });
  });
  return out;
}

if (typeof module !== "undefined" && module && module.exports) {
  module.exports = { MT_ONEK: MT_ONEK, mtFold: mtFold, mtDioptri: mtDioptri, mtAks: mtAks, mtTarihTR: mtTarihTR, mtSatirlar: mtSatirlar, mtEsc: mtEsc };
}
