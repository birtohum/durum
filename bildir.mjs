// Bozuk site için GitHub'da konu açar (sahibine e-posta gider), düzelince kapatır. Sayfa başına tek konu.
import { readFileSync } from "node:fs";

const DEPO = process.env.GITHUB_REPOSITORY || "birtohum/durum";
const AP = { Accept: "application/vnd.github+json", Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, "Content-Type": "application/json" };
const iste = async (yol, yontem = "GET", govde) => {
  const r = await fetch(`https://api.github.com/repos/${DEPO}/${yol}`, { method: yontem, headers: AP, body: govde ? JSON.stringify(govde) : undefined });
  if (!r.ok) throw new Error(`${yontem} ${yol}: ${r.status}`);
  return r.json();
};
const ETIKET = "site-bozuk";
const isaret = (u) => `<!-- site:${u} -->`;

const bozuk = JSON.parse(readFileSync(process.env.BOZUK_DOSYA || "veri/bozuk.json", "utf8"));
const acik = await iste(`issues?state=open&labels=${ETIKET}&per_page=100`);
for (const s of bozuk) {
  if (acik.some((k) => (k.body || "").includes(isaret(s.u)))) continue;
  await iste("issues", "POST", {
    title: `Bozuk: ${s.ad}`,
    labels: [ETIKET],
    body: `${isaret(s.u)}\n**Adres:** ${s.u}\n\n**Görülen:**\n${s.sorun.map((x) => `- ${x}`).join("\n")}\n\nHata 20 saniye sonra tekrar denendi ve yine çıktı. Düzelince bu konu kendiliğinden kapanır.\n\n[Durum Panosu](https://birtohum.github.io/durum/)`,
  });
  console.log("açıldı:", s.u);
}
for (const k of acik) {
  if (bozuk.some((s) => (k.body || "").includes(isaret(s.u)))) continue;
  await iste(`issues/${k.number}/comments`, "POST", { body: "Son denemede site çalışıyor, konu kapatıldı." });
  await iste(`issues/${k.number}`, "PATCH", { state: "closed" });
  console.log("kapandı:", k.title);
}
