# 🎓 IELTS Daily — static sayt

100% oddiy HTML/CSS/JS. Server kerak emas — GitHub Pages da bepul ishlaydi.

## 1. Video linklarini qo'shish

`videos.js` faylini och va har bir ro'yxatga playlistdagi video linklarini
tartib bilan qo'y (har qator bitta link):

- `PREP_VIDEOS` — Seshanba/Payshanba/Shanba ertalabgi playlist (har kuni 1 ta)
- `SECTION_1` … `SECTION_4` — IELTS Listening Section 1–4 playlistlari
- `BREAK_VIDEOS` — 5 daqiqa tanafusdagi mashq videolari
- (keyingi: Reading videolari keyinroq qo'shiladi)

Muhim: tartib playlistdagi tartib bilan bir xil bo'lishi kerak.
Linklar "https://youtu.be/ID" yoki faqat "ID" bo'lishi mumkin.

## 2. Daily routine

`daily routine.txt` faylida jadval bor:

```
[dushanba]
08:00 - Dars nomi
09:00 - Dars nomi (https://youtu.be/XXXXXXXXXXX)
```

Dushanba / Chorshanba / Juma / Yakshanba kuni site shu kun darslarini ko'rsatadi
(reading bo'limi keyinroq qo'shib turadi). Seshanba / Payshanba / Shanba kuni
avtomatik listening rejimiga o'tadi.

## 3. GitHub Pages ga joylash

1. GitHub.com da yangi repository och (masalan `ielts-daily`), Private bo'lishi mumkin (Pages uchun public yoki Pro).
2. Bu papkada barcha fayllarni repo'ga push qil:
   ```
   git init
   git add .
   git commit -m "IELTS daily site"
   git branch -M main
   git remote add origin https://github.com/USERNAME/ielts-daily.git
   git push -u origin main
   ```
3. GitHub repo → Settings → Pages → Source: `main` branch, `/ root` → Save.
4. Bir-ikki daqiqadan keyin `https://USERNAME.github.io/ielts-daily/` ishlaydi.

O'zgartirsa — qayta push, sahifada Ctrl+F5.

## Ishlashi

- **Real-time soat + kalender** tepada doim ko'rinadi; hafta kuniga qarab rejim tanlanadi.
- **Pomodoro**: har dars 25 daq video (pauza/surishta bloklangan), so'ng 5 daq tanafus
  (telefondagi mashq video). Burchakda o'chmaydigan timer turgan.
- **Video nazorati**: pauza bosilsa avtomatik yana ishga tushadi, pastki panel yopilgan.
- **Ketma-ketlik**: video tugagach «Keyingi video» bosing — navbatdagi SECTION playlistdan
  video ochiladi (ya'ni S1-1dan keyin S2-1, so'ng S3-1, S4-1, keyin S1-2...).
- **Qayta ko'rish**: barchasi tugagach site oxirgi 20 ta lugatni yashirib random test chizadi,
  natijalar saqlanadi.
- **Lug'at**: 2 ustunli; Enter = yangi raqamlangan qator; Tab yoki ikki marta Space =
  narigi ustun (tarjima); har 20 qatordan keyin 5 rangli random test, natijalar saqlanadi.
- Ma'lumotlar brauzer localStorage saqlanadi.

⚠️ Eslatma: Fayl bilan faqat `file://` orqali ochaq bo'lsa, `daily routine.txt`
o'qilmaydi (brauzer fetch bloklaydi), lekin listening rejimi to'liq ishlaydi.
GitHub Pages uchun hammasi joyında katta görinır.
