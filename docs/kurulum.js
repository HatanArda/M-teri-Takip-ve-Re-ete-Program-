document.addEventListener("click", function (e) {
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
