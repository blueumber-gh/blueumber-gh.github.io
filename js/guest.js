const SUPABASE_URL = 'https://lprjekvgodeiourtirsx.supabase.co/';
const SUPABASE_KEY = 'sb_publishable_R7fwGex2kURTdgAkG8RhuQ_sPKHuDiI';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const params = new URLSearchParams(window.location.search);
const guestId = params.get('id');

const guestNumber = document.getElementById('guest-number');
const guestNickname = document.getElementById('guest-nickname');
const guestRoomImage = document.getElementById('guest-room-image');
const guestBackground = document.getElementById('guest-background');
const guestStory = document.getElementById('guest-story');
const downloadButton = document.getElementById('download-guest-card');
const shareButton = document.getElementById('share-guest-card');
const downloadMessage = document.getElementById('download-message');

let currentGuest = null;
let preparedShareFile = null;
let cachedFontEmbedCSS = null;

function setMessage(message) {
  downloadMessage.textContent = message;
}

function waitForImage(img) {
  return new Promise((resolve, reject) => {
    if (img.complete) {
      return img.naturalWidth > 0 ? resolve() : reject(new Error(`Image failed: ${img.src}`));
    }
    img.addEventListener('load', () => resolve(), { once: true });
    img.addEventListener('error', () => reject(new Error(`Image failed: ${img.src}`)), { once: true });
  });
}

function waitForRender() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function waitForStoryImages() {
  const images = Array.from(guestStory.querySelectorAll('img'));
  await Promise.all(images.map(async img => {
    await waitForImage(img);
    // decode() 等待圖片解碼完成；不支援的瀏覽器使用 load 結果即可。
    if (typeof img.decode === 'function') {
      try {
        await img.decode();
      } catch (error) {
        console.warn('Image decode fallback:', img.src, error);
      }
    }
  }));
}

async function prepareFontsForImage() {
  const fonts = [
    '16px "PeP Special Elite"',
    '24px "PeP Oooh Baby"',
    '24px "PeP Cormorant"',
    '20px "PeP WenKai"'
  ];

  const results = await Promise.allSettled(fonts.map(font => document.fonts.load(font)));

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn('字體載入失敗：', fonts[index], result.reason);
    }
  });

  await document.fonts.ready;

  if (cachedFontEmbedCSS === null) {
    cachedFontEmbedCSS = await htmlToImage.getFontEmbedCSS(guestStory);
  }

  return cachedFontEmbedCSS;
}

async function generateGuestCardBlob(fontEmbedCSS) {
  await waitForStoryImages();
  await waitForRender();

  const blob = await htmlToImage.toBlob(guestStory, {
    pixelRatio: 1,
    backgroundColor: '#f7ecd4',
    canvasWidth: 1080,
    canvasHeight: 1920,
    fontEmbedCSS,
    cacheBust: true
  });

  if (!blob || blob.size === 0) {
    throw new Error('Guest card image generation failed');
  }

  return blob;
}

function guestFileName() {
  return `HOTEL-PEP-GUEST-${String(currentGuest.id).padStart(4, '0')}.png`;
}

async function prepareGuestImage() {
  // 等待頁面圖片、字體都可用，並讓瀏覽器完成至少一輪繪製。
  await waitForStoryImages();
  const fontEmbedCSS = await prepareFontsForImage();
  await waitForRender();

  // 首次 html-to-image 轉換用於預熱圖片與 SVG/canvas 資源。
  // 第二次產出的 PNG 才提供下載與分享。
  await generateGuestCardBlob(fontEmbedCSS);
  await waitForRender();

  const blob = await generateGuestCardBlob(fontEmbedCSS);

  preparedShareFile = new File(
    [blob],
    guestFileName(),
    { type: 'image/png' }
  );
}

async function loadGuest() {
  downloadButton.disabled = true;
  shareButton.disabled = true;
  preparedShareFile = null;

  if (!guestBackground) {
    setMessage('找不到背景圖片元素，請確認 guest/index.html 已加入 guest-background。');
    console.error('Missing #guest-background');
    return;
  }

  if (!guestId || !/^\d+$/.test(guestId)) {
    guestNumber.textContent = 'GUEST NOT FOUND.';
    return;
  }

  const { data, error } = await supabaseClient
    .from('guests')
    .select('id, nickname, room, created_at')
    .eq('id', guestId)
    .single();

  if (error || !data) {
    console.error('Guest load failed:', error);
    guestNumber.textContent = 'GUEST NOT FOUND.';
    return;
  }

  const validRooms = ['22', '333', '777', '999'];
  const room = String(data.room);

  if (!validRooms.includes(room)) {
    guestNumber.textContent = 'INVALID ROOM.';
    return;
  }

  currentGuest = data;
  guestNumber.textContent = `NO. ${String(data.id).padStart(4, '0')}`;

  const dateText = data.created_at
    ? new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date(data.created_at))
    : '----';

  document.getElementById('guest-date').textContent = dateText.replaceAll('-', '.');

  guestNickname.textContent = data.nickname;

  const hasChinese = /\p{Script=Han}/u.test(data.nickname);
  guestNickname.classList.toggle('chinese-name', hasChinese);
  guestNickname.classList.toggle('english-name', !hasChinese);

  // 所有房號均使用 HTML img，而非 CSS background-image。
  guestRoomImage.src = `../assets/img/${room}-img.png`;
  guestRoomImage.alt = `ROOM ${room}`;
  guestBackground.src = `../assets/img/share-bg-${room}.png`;

  setMessage('正在準備你的入住紀錄...');

  try {
    await prepareGuestImage();
    downloadButton.disabled = false;
    shareButton.disabled = false;
    setMessage('');
  } catch (prepareError) {
    console.error('Guest image preparation failed:', prepareError);
    setMessage('入住紀錄圖片準備失敗，請重新整理頁面。');
  }
}

downloadButton.addEventListener('click', () => {
  if (!currentGuest || !preparedShareFile) return;

  const imageUrl = URL.createObjectURL(preparedShareFile);
  const link = document.createElement('a');

  link.download = guestFileName();
  link.href = imageUrl;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(imageUrl), 60000);
  setMessage('您的入住紀錄已經準備好囉！');
});

shareButton.addEventListener('click', async () => {
  if (!currentGuest || !preparedShareFile) return;

  if (
    !navigator.share ||
    !navigator.canShare ||
    !navigator.canShare({ files: [preparedShareFile] })
  ) {
    setMessage('您的瀏覽器不支援直接分享，請使用下載功能。');
    return;
  }

  try {
    setMessage('');

    // 必須在點擊事件中直接呼叫，避免失去手機瀏覽器的分享權限。
    await navigator.share({ files: [preparedShareFile] });
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Share failed:', error);
      setMessage('分享失敗，請下載入住紀錄後再分享。');
    }
  }
});

loadGuest().catch(error => {
  console.error('Guest initialization failed:', error);
  setMessage('載入住客資料時發生錯誤，請重新整理頁面。');
});
