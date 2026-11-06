# Durum Panosu

**Site:** https://birtohum.github.io/durum/

Sitelerim her gün gerçek bir tarayıcıyla açılıyor: sayfa hatası var mı, ana düğmeler çalışıyor mu, verisi eskimiş mi? Sonuç herkese açık. Bir site bozulursa GitHub'da otomatik konu açılıyor, düzelince kapanıyor.

- `kontrol.mjs`: siteleri ve senaryoları dener, `veri/durum.json` ile `veri/gecmis.json` dosyalarını yazar.
- `bildir.mjs`: bozuk siteler için konu açar ve kapatır.
- `.github/workflows/denetle.yml`: her gün çalışır, sonucu depoya işler.

**Sınırlar:** Deneme günde bir kez yapılır, araya düşen kısa kesintiyi görmez. Yaklaşık 20 sitede özel senaryo var; diğerlerinde "sayfa açılıyor, hata vermiyor" denetlenir. Form gönderilmez, ücretli model çağrılmaz, ziyaret sayacı çalıştırılmaz.

Yerelde: `npm ci`, sonra `CHROME_PATH=<tarayıcı yolu> node kontrol.mjs`.

Lisans: MIT.
