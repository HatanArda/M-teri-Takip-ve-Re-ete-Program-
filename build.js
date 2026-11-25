// Yer işaretlerini (bookmarklet) üretir ve kurulum sayfasını yazar: docs/index.html
// Çalıştırma: npm run build
const fs = require("fs");
const path = require("path");
const { minify } = require("terser");

const oku = f => fs.readFileSync(path.join(__dirname, "src", f), "utf8");

async function paketle(govde, medulaDahil) {
  // "self" ve "module" yerel tutulur: Medula/Optik Pro sayfasına hiçbir genel değişken eklenmez.
  const kod = "(function(){var self={},module;" + (medulaDahil ? oku("medula.js") : "") + "\n" + oku("ortak.js") + "\n" + govde + "\n})();";
  const m = await minify(kod, { ecma: 2017, compress: { passes: 2 }, mangle: true, format: { comments: false, ascii_only: true } });
  // % işaretleri adreste kod çözümüne takılmasın.
  return "javascript:" + m.code.replace(/%/g, "%25");
}

function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

(async () => {
  const al = await paketle(oku("medula-al.js") + "\nmedulaAl(self.Medula);", true);
  const yaz = await paketle(oku("optikpro-yaz.js") + "\noptikProYaz();", false);
  fs.mkdirSync(path.join(__dirname, "docs"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "docs", "yer-isaretleri.json"), JSON.stringify({ medulaAl: al, optikProYaz: yaz }, null, 1));

  const kart = (no, ad, nerede, kod) => `
<section class="kart">
  <h2><span class="no">${no}</span>${ad}</h2>
  <p class="ne">${nerede}</p>
  <button class="btn" data-kopyala="k${no}">Kodu kopyala</button>
  <textarea id="k${no}" readonly>${esc(kod)}</textarea>
  <p class="pc">Bilgisayarda: bu düğmeyi yer işaretleri çubuğuna sürükleyin → <a class="yi" href="${esc(kod)}">${ad}</a></p>
</section>`;

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
<meta name="robots" content="noindex">
<title>Medula → Optik Pro</title>
<style>
:root{--bg:#f2f5f7;--card:#fff;--ink:#14212b;--mute:#5e6e77;--line:#d5dde2;--acc:#0f8f7a;--acctx:#fff;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0e161c;--card:#16222b;--ink:#e8eff3;--mute:#8da0ab;--line:#2a3a45;--acc:#2bb9a1;--acctx:#04231d;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.5 -apple-system,"Segoe UI",system-ui,sans-serif}
main{max-width:760px;margin:0 auto;padding:24px 16px 60px}
h1{font-size:26px;margin:0 0 4px}
.alt{color:var(--mute);margin:0 0 20px}
.kart{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin-bottom:16px}
h2{font-size:20px;margin:0 0 4px;display:flex;align-items:center;gap:10px}
.no{flex:none;width:30px;height:30px;border-radius:50%;background:var(--acc);color:var(--acctx);display:inline-flex;align-items:center;justify-content:center;font-size:16px}
.ne{margin:0 0 12px;color:var(--mute)}
.btn{border:0;background:var(--acc);color:var(--acctx);border-radius:10px;padding:13px 20px;font:inherit;font-weight:700;cursor:pointer}
.btn.ok{opacity:.85}
textarea{display:block;width:100%;height:64px;margin-top:10px;font:11px/1.3 ui-monospace,Menlo,monospace;color:var(--mute);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:6px;resize:none}
.pc{font-size:14px;color:var(--mute);margin:10px 0 0}
.yi{display:inline-block;margin-left:4px;padding:3px 10px;border:2px dashed var(--acc);border-radius:8px;color:var(--acc);font-weight:700;text-decoration:none}
ol{padding-left:22px;margin:8px 0}
li{margin:6px 0}
.not{font-size:15px;color:var(--mute)}
</style>
</head>
<body>
<main>
<h1>Medula → Optik Pro</h1>
<p class="alt">Medula'daki reçeteyi iki dokunuşla Optik Pro'ya aktaran iki yer işareti. Bir kez kurulur.</p>
${kart(1, "Medula'dan Al", "Medula'da reçete sayfası açıkken dokunulur. Reçeteyi okur ve kopyalar.", al)}
${kart(2, "Optik Pro'ya Yaz", "Optik Pro'da reçete (ya da yeni müşteri) ekranındayken dokunulur. Kopyalananı kutulara yazar.", yaz)}
<section class="kart">
  <h2>iPad'de kurulum (her biri için bir kez)</h2>
  <ol>
    <li>Yukarıda <b>1</b>'in <b>Kodu kopyala</b> düğmesine basın.</li>
    <li>Bu sayfadayken Safari'de <b>Paylaş</b> düğmesine dokunun (yeni iPad'lerde adres çubuğunun yanındaki <b>•••</b> menüsünde) → <b>Yer İşareti Ekle</b>.</li>
    <li>Adını <b>Medula'dan Al</b> yapın → <b>Kaydet</b>.</li>
    <li><b>Yer İşaretleri</b>ni açın (kitap simgesi) → <b>Düzenle</b> → az önce eklediğinize dokunun → <b>adres</b> satırındaki yazıyı tümüyle silin → kopyaladığınız kodu <b>yapıştırın</b> → <b>Bitti</b>.</li>
    <li>Aynısını <b>2</b> için yapın, adını <b>Optik Pro'ya Yaz</b> koyun.</li>
  </ol>
</section>
<section class="kart">
  <h2>Kullanım</h2>
  <ol>
    <li>Medula'da hastanın reçete sayfasını açın → <b>Yer İşaretleri → Medula'dan Al</b> → okunanları kontrol edin → <b>Kopyala</b>.</li>
    <li>Optik Pro'ya geçin. Müşteri yoksa <b>Yeni Müşteri Ekle</b> ekranında <b>Optik Pro'ya Yaz → Yapıştır ve doldur</b>: TC ve Ad Soyad dolar → Kaydet.</li>
    <li>Reçete / satış ekranında yine <b>Optik Pro'ya Yaz → Yapıştır ve doldur</b>: Reçete tarihi, e-Reçete No, hastane, doktor ve Sağ/Sol değerler dolar. Kontrol edip <b>Kaydet</b>.</li>
  </ol>
  <p class="not">iPad, panodan okurken küçük bir <b>Yapıştır</b> balonu gösterebilir; ona dokunun. Yer işaretleri Medula'ya ya da Optik Pro'ya kendiliğinden hiçbir şey kaydetmez, bilgileri hiçbir yere göndermez. Optik Pro'da dolu bir kutunun üzerine yazmaz.</p>
  <p class="not">Bir kutu dolmazsa: çıkan kutudaki <b>Teşhis</b> düğmesine basın ve kopyalananı Claude'a yapıştırın. Teşhis yalnızca kutuların adlarını içerir, müşteri bilgisi içermez.</p>
</section>
</main>
<script src="kurulum.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(__dirname, "docs", "index.html"), html);
  fs.writeFileSync(path.join(__dirname, "docs", "kurulum.js"), `document.addEventListener("click", function (e) {
  var b = e.target.closest("[data-kopyala]");
  if (b) {
    var t = document.getElementById(b.dataset.kopyala);
    var bitti = function () { b.textContent = "Kopyalandı ✓"; b.classList.add("ok"); setTimeout(function () { b.textContent = "Kodu kopyala"; b.classList.remove("ok"); }, 2500); };
    var eski = function () { t.focus(); t.select(); t.setSelectionRange(0, t.value.length); try { document.execCommand("copy"); } catch (x) {} bitti(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(bitti, eski); else eski();
    return;
  }
  var y = e.target.closest("a.yi");
  if (y) { e.preventDefault(); alert("Bu düğmeyi yer işaretleri çubuğuna sürükleyin."); }
});
`);
  console.log("Medula'dan Al: " + al.length + " karakter, Optik Pro'ya Yaz: " + yaz.length + " karakter");
})();
