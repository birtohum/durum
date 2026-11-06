// Bütün canlı siteleri gerçek tarayıcıyla açar, ana işlevlerini dener, veri güncelliğine bakar.
// Yazma işlemi yapmaz, form göndermez, ücretli model çağırmaz, ziyaret sayacını çalıştırmaz.
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const G = "https://birtohum.github.io/";
const AWS = "https://51-20-66-93.sslip.io/";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const bek = (ms) => new Promise((r) => setTimeout(r, ms));
const metin = (p, s = "body") => p.$eval(s, (e) => e.innerText.replace(/\s+/g, " "));
const beklenen = (kosul, mesaj) => { if (!kosul) throw new Error(mesaj); };
const ilSec = async (p, sel, ad) => {
  const v = await p.$$eval(`${sel} option`, (o, ad) => o.find((x) => x.innerText.trim() === ad)?.value, ad);
  beklenen(v !== undefined, `${ad} seçeneği yok`);
  await p.select(sel, v);
  await bek(600);
};
const yaz = async (p, sel, v) => { await p.$eval(sel, (e) => { e.value = ""; }); await p.type(sel, v); };
const dugme = async (p, ad) => {
  const var_ = await p.evaluate((ad) => { const b = [...document.querySelectorAll("button")].find((x) => x.innerText.trim() === ad); if (b) b.click(); return !!b; }, ad);
  beklenen(var_, `"${ad}" düğmesi yok`);
  await bek(900);
};

// Sitelerin dışarıdan görülebilen sözü: ne yapılınca ne olmalı?
const SITE = [
  { u: G, ad: "Portfolyo", ne: "Proje kartları görünmeli", f: async (p) => beklenen((await p.$$(".site")).length >= 40, "kart sayısı 40'tan az") },
  { u: G + "cv/", ad: "CV", ne: "CV metni açılmalı", f: async (p) => beklenen((await metin(p)).includes("proje"), "CV metni yok") },
  { u: G + "il-kimligi/", ne: "Arama kutusuna \"muş\" yazınca tek il kalmalı", f: async (p) => {
    await p.type("#ara", "muş"); await bek(300);
    const n = await p.$$eval("#grid a", (a) => a.filter((x) => getComputedStyle(x).display !== "none").length);
    beklenen(n === 1, `${n} il göründü`);
  } },
  { u: G + "goc-haritasi/", ne: "İl değiştirince oklar ve liste yenilenmeli", f: async (p) => {
    await ilSec(p, "#il", "Van"); const a = await metin(p, "#liste");
    await ilSec(p, "#il", "İstanbul"); const b = await metin(p, "#liste");
    beklenen(a !== b, "liste değişmedi");
    beklenen((await p.$$("#oklar path")).length > 0, "ok yok");
  } },
  { u: G + "adin-kac-yasinda/", ne: "\"Elif\" yazınca sonuç çıkmalı", f: async (p) => { await yaz(p, "#ad", "Elif"); await p.keyboard.press("Enter"); await bek(500); beklenen((await metin(p, "#sonuc")).includes("Elif"), "sonuç yok"); } },
  { u: G + "soyadin-nereli/", ne: "\"Kaya\" yazınca sonuç çıkmalı", f: async (p) => { await yaz(p, "#soy", "Kaya"); await p.keyboard.press("Enter"); await bek(500); beklenen((await metin(p, "#ozet")).includes("Kaya"), "sonuç yok"); } },
  { u: G + "kac-kisi-senden-yasli/", ne: "1985 yazınca oran hesaplanmalı", f: async (p) => { await yaz(p, "#yil", "1985"); await p.keyboard.press("Enter"); await bek(500); beklenen((await metin(p)).includes("senden yaşlı"), "oran yok"); } },
  { u: G + "mahallen-depremde/", ne: "Türkçe harfsiz \"caferaga\" bulunmalı", f: async (p) => { await yaz(p, "#ara", "caferaga"); await p.keyboard.press("Enter"); await bek(400); beklenen((await metin(p, "#ozet")).includes("Caferağa"), "mahalle bulunamadı"); } },
  { u: G + "senin-turkiyen/", ne: "Formdan kart çıkmalı, yazılan ad hiçbir isteğe girmemeli", f: async (p) => {
    const giden = []; p.on("request", (r) => { if (/Zeynep/i.test(r.url()) || /Zeynep/i.test(r.postData() || "")) giden.push(r.url()); });
    await yaz(p, "#ad", "Zeynep"); await yaz(p, "#soy", "Yılmaz"); await yaz(p, "#yil", "2000"); await ilSec(p, "#il", "Ankara");
    await p.click("#form button"); await bek(700);
    beklenen((await p.$$("#damgalar .damga")).length >= 3, "kart yok");
    beklenen(!giden.length, "ad dışarı gitti");
  } },
  { u: G + "sokak-adlari/", ne: "İl seçince doğru ekle sonuç çıkmalı", f: async (p) => { await ilSec(p, "#il-sec", "Sivas"); beklenen((await metin(p, "#il-sonuc")).includes("Sivas'ta"), "sonuç yok"); } },
  { u: G + "maasim-kac-ekmek/", ne: "Ekmek fiyatı yazınca hesap çıkmalı", f: async (p) => { await yaz(p, "#ekmek", "15"); await bek(500); beklenen((await metin(p, "#sonuc")).includes("ekmek"), "sonuç yok"); } },
  { u: G + "gunes-kacta-doguyor/", ne: "Saat dilimi düğmesi çalışmalı", f: async (p) => { await p.click("#s2"); await bek(400); beklenen(await p.$eval("#s2", (e) => e.getAttribute("aria-checked") === "true"), "seçilmedi"); } },
  { u: G + "sehrinin-kuslari/", ne: "İl seçince o ilin kuşları çıkmalı", f: async (p) => { await ilSec(p, "#il", "Kars"); beklenen((await metin(p)).includes("Kars'ta"), "sonuç yok"); } },
  { u: G + "kelimelerin-kokeni/", ne: "Yazılan metnin kökenleri hesaplanmalı", f: async (p) => {
    await p.$eval("#metin", (e) => { e.value = "Bugün okula gittim ve kitap okudum."; e.dispatchEvent(new Event("input", { bubbles: true })); }); await bek(600);
    beklenen((await metin(p)).includes("kelimenin"), "sonuç yok");
  } },
  { u: G + "damlanin-yolu/", ne: "Erzurum'a düşen damla Basra'ya ulaşmalı", f: async (p) => { await dugme(p, "Erzurum"); beklenen((await metin(p)).includes("Basra"), "yol çizilmedi"); } },
  { u: G + "istanbul-30-dakika/", ne: "Hazır nokta seçince erişim hesaplanmalı", f: async (p) => { await dugme(p, "Silivri"); await bek(900); beklenen(/km²/.test(await metin(p)), "alan yok"); } },
  { u: G + "dogdugum-gun/?t=2020-11-06&il=34", ne: "Bir doğum günü için hava verisi gelmeli", dis: true, f: async (p) => { await bek(3000); beklenen((await metin(p, "#cumle")).length > 20, "hava verisi gelmedi"); } },
  { u: G + "gazete-ozeti/", ad: "Gazete Özeti", ne: "O günün maddeleri görünmeli", f: async (p) => beklenen((await p.$$("article.kart")).length >= 1, "madde yok") },
  { u: G + "turkce-yz-karnesi/", ne: "Sonuç tablosu görünmeli", f: async (p) => { await bek(800); beklenen((await metin(p)).includes("Muse"), "tablo yok"); } },
  ...["alti-ipucu", "barajlar-uzaydan", "bilgi-yarismasi", "bu-gece-gokyuzu", "denizler-isiniyor", "gorsel-iz", "iett-dakiklik", "istanbul-semalari", "kac-sigara", "kaynas", "mahalle-site", "masaustu-ekran", "meclisin-dili", "mevzuat-haritasi", "ne-diyor", "orman-yanginlari-uzaydan", "sepet-enflasyonu", "sesli-klasikler", "tohum", "turk-dizileri-dunyada", "turkiye-geceleri", "turkiye-merak", "turkiye-sallandi", "yapay-yasam"].map((r) => ({ u: G + r + "/" })),
  { u: G + "bizim-masa/", kisa: true, ne: "Karşılama ekranı açılmalı", f: async (p) => beklenen((await metin(p)).includes("Merhaba"), "karşılama yok") },
  { u: G + "zabita/", oyun: true, ne: "Oyun tuvali yüklenmeli (oynanışı denenmiyor)", f: async (p) => { await bek(6000); beklenen(!!(await p.$("canvas")), "tuval yok"); } },
  { u: AWS, ad: "Yorum Yanıtlayıcı" }, { u: AWS + "tisort/", ad: "Tişört Atölyesi" }, { u: "https://seslendir.site/", ad: "Seslendir" },
];

// Kendini güncelleyen siteler. Veri güncellenince depoya kayıt düşer; saat: son kayıt bundan eskiyse bayat.
const TAZE = {
  "turkiye-sallandi": 12, "istanbul-semalari": 8, "bu-gece-gokyuzu": 26, "barajlar-uzaydan": 96, "denizler-isiniyor": 96,
  "sepet-enflasyonu": 72, "turkiye-merak": 72, "orman-yanginlari-uzaydan": 96, "turk-dizileri-dunyada": 24 * 40,
  "il-kimligi": 24 * 10, "maasim-kac-ekmek": 24 * 40, "birtohum.github.io": 72,
};
const YAYIN = { "alti-ipucu": 50, "masaustu-ekran": 26 }; // Depoya kayıt düşmez, yalnız yayın çalışması olur.
const YEREL = { "gazete-ozeti": 96, "iett-dakiklik": 96, "kac-sigara": 96 }; // Ege'nin bilgisayarında çalışıyor; kapalıysa eskir, site bozuk sayılmaz.

const AP = { Accept: "application/vnd.github+json", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
const saatOnce = (t) => (Date.now() - new Date(t).getTime()) / 36e5;
const api = async (y) => (await fetch(`https://api.github.com/repos/birtohum/${y}`, { headers: AP })).json();
async function tazelik(repo) {
  try {
    const sinir = TAZE[repo] || YAYIN[repo] || YEREL[repo];
    const zam = await api(`${repo}/actions/runs?event=schedule&per_page=1`);
    const son = (zam.workflow_runs || []).find((x) => x.status === "completed");
    let t;
    if (YAYIN[repo]) t = (await api(`${repo}/actions/runs?status=success&per_page=1`)).workflow_runs[0].created_at;
    else t = (await api(`${repo}/commits?per_page=1`))[0].commit.committer.date;
    const s = saatOnce(t), yerel = !!YEREL[repo];
    const hatali = son && son.conclusion === "failure"; // cancelled: sıraya giren çalışma atlandı, hata değil.
    return { saat: Math.round(s), sinir, tamam: s <= sinir && !hatali, yerel, not: s > sinir ? (yerel ? "Bilgisayar kapalıyken güncellenmiyor" : "Güncelleme gecikti") : hatali ? "Son zamanlanmış çalışma başarısız" : "" };
  } catch (e) { return { tamam: true, not: "", bilinmiyor: true }; }
}
const AD = { "istanbul-semalari": "İstanbul Semaları", "turkiye-merak": "Türkiye Merak", "turkiye-sallandi": "Türkiye Sallandı", "alti-ipucu": "Altı İpucu" }; // Başlığı her gün değişen siteler.
const repoAdi = (u) => (u === G ? "birtohum.github.io" : u.startsWith(G) ? u.slice(G.length).split(/[/?]/)[0] : null);

async function dene(tar, s) {
  const p = await tar.newPage();
  const sorun = [], uyari = [];
  const kendi = (x) => x.startsWith(G) || x.startsWith(AWS) || x.startsWith("https://seslendir.site");
  await p.setRequestInterception(true);
  p.on("request", (r) => (/zgo\.at|goatcounter\.com/.test(r.url()) ? r.abort() : r.continue()));
  p.on("pageerror", (e) => sorun.push("Sayfa hatası: " + e.message.slice(0, 110)));
  p.on("response", (r) => {
    const u = r.url(), st = r.status(), tur = r.request().resourceType();
    if (st < 400 || !kendi(u) || /favicon/.test(u) || /[?&]_rsc=/.test(u)) return; // _rsc: Next.js'in önceden yüklemesi, boşa düşünce sayfa yine açılır.
    if ((st === 401 || st === 403) && /\/api\//.test(u)) return; // Giriş yapmamış ziyaretçi için beklenen yanıt.
    (["image", "media", "font", "other"].includes(tur) ? uyari : sorun).push(`${st}: ${u.replace(G, "/").slice(0, 80)}`);
  });
  p.on("requestfailed", (r) => { const u = r.url(); if (!/zgo\.at|goatcounter/.test(u) && kendi(u) && !/ERR_ABORTED/.test(r.failure()?.errorText || "")) sorun.push(`Yüklenemedi: ${u.replace(G, "/").slice(0, 80)}`); });
  let baslik = s.ad || AD[repoAdi(s.u)] || s.u;
  const t0 = Date.now();
  try {
    await p.setViewport({ width: 1280, height: 850 });
    const y = await p.goto(s.u, { waitUntil: s.oyun ? "domcontentloaded" : "networkidle2", timeout: 60000 });
    beklenen(!y || y.status() < 400, `Sayfa açılmadı (${y?.status()})`);
    await bek(800);
    baslik = s.ad || AD[repoAdi(s.u)] || (await p.title()).trim() || s.u;
    if (!s.oyun) beklenen((await metin(p)).length > (s.kisa ? 30 : 120), "Sayfa neredeyse boş");
    if (s.f) await s.f(p);
    await p.setViewport({ width: 390, height: 844 });
    await bek(500);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    if (sw > 392) uyari.push(`Telefonda yatay taşma (${sw} px)`);
  } catch (e) {
    (s.dis ? uyari : sorun).push(e.message.slice(0, 120) + (s.dis ? " (dış servis)" : ""));
  }
  await p.close();
  return { u: s.u, ad: baslik, ne: s.ne || "Sayfa açılıyor, hata vermiyor", sn: +((Date.now() - t0) / 1000).toFixed(1), sorun: [...new Set(sorun)], uyari };
}

async function ana() {
  const tar = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const sonuc = [];
  for (const s of SITE) {
    let r = await dene(tar, s);
    if (r.sorun.length) { await bek(20000); r = await dene(tar, s); r.tekrar = true; } // Anlık aksaklık bozuk sayılmasın.
    const repo = repoAdi(s.u);
    if (repo && (TAZE[repo] || YAYIN[repo] || YEREL[repo])) {
      r.taze = await tazelik(repo);
      if (!r.taze.tamam) r.uyari.push(`${r.taze.not} (son kayıt ${r.taze.saat} saat önce)`);
    }
    r.durum = r.sorun.length ? "bozuk" : r.uyari.length ? "uyari" : "tamam";
    console.log(r.durum.padEnd(6), String(r.sn).padStart(5), s.u, r.sorun.concat(r.uyari).join(" | "));
    sonuc.push(r);
  }
  await tar.close();
  const say = (d) => sonuc.filter((x) => x.durum === d).length;
  const simdi = new Date();
  const ozet = { zaman: simdi.toISOString(), toplam: sonuc.length, tamam: say("tamam"), uyari: say("uyari"), bozuk: say("bozuk"), siteler: sonuc };
  if (!existsSync("veri")) mkdirSync("veri");
  writeFileSync("veri/durum.json", JSON.stringify(ozet, null, 1));
  const gYol = "veri/gecmis.json";
  const g = existsSync(gYol) ? JSON.parse(readFileSync(gYol, "utf8")) : {};
  const gun = simdi.toISOString().slice(0, 10);
  g[gun] = Object.fromEntries(sonuc.map((x) => [x.u, x.durum[0]]));
  for (const k of Object.keys(g).sort().slice(0, -60)) delete g[k];
  writeFileSync(gYol, JSON.stringify(g));
  writeFileSync("veri/bozuk.json", JSON.stringify(sonuc.filter((x) => x.durum === "bozuk").map((x) => ({ u: x.u, ad: x.ad, sorun: x.sorun }))));
  console.log(`\n${ozet.tamam} tamam, ${ozet.uyari} uyarı, ${ozet.bozuk} bozuk / ${ozet.toplam}`);
}
ana().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
