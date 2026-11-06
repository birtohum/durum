"use strict";
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const AD = { tamam: "ÇALIŞIYOR", uyari: "UYARI", bozuk: "BOZUK" };
const SIRA = { bozuk: 0, uyari: 1, tamam: 2 };
const GUN = 30;
const ek = (n) => (n % 10 ? { 1: "i", 2: "si", 3: "ü", 4: "ü", 5: "i", 6: "sı", 7: "si", 8: "i", 9: "u" }[n % 10] : { 10: "u", 20: "si", 30: "u", 40: "ı", 50: "si", 60: "ı", 70: "i", 80: "i", 90: "ı" }[n % 100] || "ü");

function zaman(iso) {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
}

function serit(u, gunler, gecmis) {
  return gunler.map((g) => {
    const v = gecmis[g] && gecmis[g][u];
    return `<i class="${v || ""}" title="${g}: ${v === "t" ? "çalışıyor" : v === "u" ? "uyarı" : v === "b" ? "bozuk" : "kayıt yok"}"></i>`;
  }).join("");
}

function satir(s, gunler, gecmis) {
  const n = [...s.sorun, ...s.uyari];
  const t = s.taze && !s.taze.bilinmiyor ? `<p><b>Veri:</b> son kayıt ${s.taze.saat} saat önce (sınır ${s.taze.sinir} saat)${s.taze.yerel ? ", bilgisayarımda güncelleniyor" : ""}.</p>` : "";
  return `<details class="${s.durum}"><summary class="sat"><span class="lamba" aria-hidden="true"></span><span class="ad">${esc(s.ad)}</span><span class="dur">${AD[s.durum]}</span><span class="serit" aria-hidden="true">${serit(s.u, gunler, gecmis)}</span></summary>
    <div class="ic"><p><b>Denenen:</b> ${esc(s.ne)}.</p>${t}${n.map((x) => `<p class="not">${esc(x)}</p>`).join("")}<p><a href="${esc(s.u)}" target="_blank" rel="noopener">Siteyi aç ↗</a></p></div></details>`;
}

async function baslat() {
  try {
    const [d, g] = await Promise.all(["veri/durum.json", "veri/gecmis.json"].map((u) => fetch(u, { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error(); return r.json(); })));
    $("sT").textContent = d.tamam; $("sU").textContent = d.uyari; $("sB").textContent = d.bozuk;
    $("manset").innerHTML = d.bozuk ? `<b>${d.bozuk}</b> site bozuk` : `${d.toplam} siteden <b>${d.toplam - d.bozuk}</b>'${ek(d.toplam - d.bozuk)} açık`;
    const saat = (Date.now() - new Date(d.zaman).getTime()) / 36e5;
    $("zaman").textContent = `Son deneme: ${zaman(d.zaman)}.` + (saat > 36 ? " Bu pano da gecikmiş: son denemenin üzerinden bir günden fazla geçti." : "");
    const gunler = [];
    for (let i = GUN - 1; i >= 0; i--) gunler.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
    $("gunSay").textContent = GUN;
    const l = [...d.siteler].sort((a, b) => SIRA[a.durum] - SIRA[b.durum] || a.ad.localeCompare(b.ad, "tr"));
    $("liste").innerHTML = l.map((s) => satir(s, gunler, g)).join("");
  } catch (e) {
    $("zaman").textContent = "Pano verisi yüklenemedi. Sayfayı yenilemeyi dene.";
  }
}
baslat();
