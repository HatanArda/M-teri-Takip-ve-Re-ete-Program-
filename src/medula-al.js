// "Medula'dan Al" yer işareti: Medula'daki reçete sayfasını okur, özet gösterir, panoya kopyalar.
// Medula'ya hiçbir şey yazmaz, hiçbir yere göndermez.

function medulaAl(M) {
  var metin = M.metinTopla(document, window);
  var r = M.oku(metin);
  var k = mtKutu("Medula'dan Al");
  var mu = r.musteri, rx = r.recete;

  if (!mu.tc && !mu.ad && !r.gozBulundu && !rx.receteNo) {
    k.yaz("<div>Bu sayfada reçete bilgisi bulunamadı.<br><span style='opacity:.7'>Medula'da hastanın reçete sayfası açıkken dokunun.</span></div>");
    k.dugme("Kapat", "", k.kapat);
    return;
  }

  var veri = {
    musteri: { tc: mu.tc, adSoyad: (mu.ad + " " + mu.soyad).trim(), cinsiyet: mu.cinsiyet },
    recete: { tarih: rx.tarih, receteNo: rx.receteNo, protokolNo: rx.protokolNo, doktor: rx.doktor, kurum: rx.kurum, teshis: rx.teshis, tur: rx.tur },
    satirlar: mtSatirlar(rx)
  };

  var h = "<div style='font-size:16px'><b>" + mtEsc(veri.musteri.adSoyad || "(ad okunamadı)") + "</b>" +
    (mu.tc ? " · TC " + mtEsc(mu.tc) : "") + "</div>" +
    "<div style='opacity:.75;font-size:13px;margin:2px 0 8px'>" +
    mtEsc([rx.receteNo && "e-Reçete " + rx.receteNo, mtTarihTR(rx.tarih), rx.doktor, rx.kurum].filter(Boolean).join(" · ")) + "</div>";
  if (veri.satirlar.length) {
    var td = "padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.15);text-align:center";
    h += "<table style='border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums'><tr style='opacity:.7'><td style='" + td + "'></td><td style='" + td + "'>SPH</td><td style='" + td + "'>CYL</td><td style='" + td + "'>AKS</td></tr>" +
      veri.satirlar.map(function (s) {
        return "<tr><td style='" + td + ";text-align:left;font-weight:700'>" + s.mesafe + " " + s.goz + "</td><td style='" + td + "'>" + mtDioptri(s.sph) + "</td><td style='" + td + "'>" + mtDioptri(s.cyl) + "</td><td style='" + td + "'>" + mtAks(s.ax) + "</td></tr>";
      }).join("") + "</table>";
  }
  if (r.uyarilar.length) h += "<div style='margin-top:8px;color:#f5c869;font-size:14px'>" + r.uyarilar.map(mtEsc).join("<br>") + "</div>";
  k.yaz(h);

  k.dugme("Kopyala", "ana", function (d) {
    mtKopyala(MT_ONEK + JSON.stringify(veri)).then(function (ok) {
      if (!ok) { d.textContent = "Kopyalanamadı"; return; }
      k.temizle();
      k.baslik("Kopyalandı ✓");
      k.govde.insertAdjacentHTML("beforeend", "<div style='margin-top:10px'>Şimdi Optik Pro'ya geçin ve reçete ekranında <b>“Optik Pro'ya Yaz”</b> yer işaretine dokunun.</div>");
      k.dugme("Kapat", "", k.kapat);
    });
  });
  k.dugme("Kapat", "", k.kapat);
}
