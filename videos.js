/* ================================================================
   VIDEOLAR SOZLAMASI — bu faylga sen playlistlardagi video linklarni
   ketma-ket joylashtirasan. Har bir qator bitta video linki.
   Format: "https://youtu.be/VIDEO_ID" yoki faqat ID: "VIDEO_ID"

   MUHIM: tartib muhim — playlistdan 1-video, o'sha tartibda qoshasan.
   Linkni olish: YouTube da playlistni och, videoni och,
   browserdan linkni nusxalash va qo'shish.
   ================================================================ */

// Seshanba / Payshanba / Shanba ertalabgi playlist (har kuni 1 tadan)
const PREP_VIDEOS = [
  // "https://youtu.be/XXXXXXXXXXX",
];

// IELTS Listening Section 1 (https://www.youtube.com/playlist?list=PL8DYbUvKFYoAFM4tAqXc4ktm-HuKofWAN)
const SECTION_1 = [
  // "https://youtu.be/XXXXXXXXXXX",
];

// IELTS Listening Section 2 (https://www.youtube.com/playlist?list=PL8DYbUvKFYoC3gaIE6ozRmEbUEhLN8qAG)
const SECTION_2 = [
  // "https://youtu.be/XXXXXXXXXXX",
];

// IELTS Listening Section 3 (https://www.youtube.com/playlist?list=PL8DYbUvKFYoClhCCZoyYQ6TGGdBxWpawt)
const SECTION_3 = [
  // "https://youtu.be/XXXXXXXXXXX",
];

// IELTS Listening Section 4 (https://www.youtube.com/playlist?list=PL8DYbUvKFYoDWia8HXCMTDSfBtwBh19qn)
const SECTION_4 = [
  // "https://youtu.be/XXXXXXXXXXX",
];

// 5 daqiqa tanafusdagi mashq/charchaqani chiqarish videolari
// (sen keyin linklarini bersan — hozirchas bo'sh, tanafusda faqat timer chiqadi)
const BREAK_VIDEOS = [
  // "https://youtu.be/XXXXXXXXXXX",
];

// TARGET playlist (Listening + Lug'at tugagach «Target» oynasida chiqadi)
// Har listening kuni 1 ta video: bugun birinchisi, keyingi listening kuni ikkinchisi...
// https://www.youtube.com/playlist?list=PL7DT3u0hBMnINDUbCjFlhSFb87HG4LuSO
const TARGET_VIDEOS = [
  // "https://youtu.be/XXXXXXXXXXX",
];

// Site ishlatadigan obyekt (o'zgartirmaysan)
window.SITE_VIDEOS = {
  PREP_VIDEOS,
  SECTION_1,
  SECTION_2,
  SECTION_3,
  SECTION_4,
  BREAK_VIDEOS,
  TARGET_VIDEOS,
};
