const SUPABASE_URL = 'https://lprjekvgodeiourtirsx.supabase.co/';
const SUPABASE_KEY = 'sb_publishable_R7fwGex2kURTdgAkG8RhuQ_sPKHuDiI';

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const params = new URLSearchParams(window.location.search);
const guestId = params.get('id');

const guestCard = document.getElementById('guest-card');
const guestNumber = document.getElementById('guest-number');
const guestNickname = document.getElementById('guest-nickname');
const guestRoomImage = document.getElementById('guest-room-image');

const downloadButton =
  document.getElementById('download-guest-card');

const downloadMessage =
  document.getElementById('download-message');

let currentGuest = null;

const shareButton =
  document.getElementById('share-guest-card');

// 先準備好圖片，避免按分享時等待產圖
let preparedShareFile = null;

async function prepareShareImage() {
  const blob = await generateGuestCardBlob();

  return new File(
    [blob],
    `HOTEL-PEP-GUEST-${String(currentGuest.id).padStart(4, '0')}.png`,
    { type: 'image/png' }
  );
}

// 載入圖片完成後再繼續
function waitForImage(img) {
  return new Promise((resolve, reject) => {
    if (img.complete) {
      if (img.naturalWidth > 0) resolve();
      else reject(new Error('Image failed to load'));
      return;
    }

    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', () => {
      reject(new Error('Image failed to load'));
    }, { once: true });
  });
}

// 讀取住客資料
async function loadGuest() {

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

  currentGuest = data;

  guestNumber.textContent =
  `NO. ${String(data.id).padStart(4, '0')}`;

  // 以台灣時間顯示入住日期
  const dateText = data.created_at
    ? new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date(data.created_at))
    : '----';

  document.getElementById('guest-date').textContent =
    dateText.replaceAll('-', '.');

  guestNickname.textContent = data.nickname;

  // 判斷中文或英文字體
  const hasChinese = /\p{Script=Han}/u.test(data.nickname);

  guestNickname.classList.toggle(
    'chinese-name',
    hasChinese
  );

  guestNickname.classList.toggle(
    'english-name',
    !hasChinese
  );

  // 依照房號載入對應圖片
  const validRooms = ['22', '333', '777', '999'];
  const room = String(data.room);

  if (!validRooms.includes(room)) {
    guestNumber.textContent = 'INVALID ROOM.';
    currentGuest = null;
    return;
  }

  guestRoomImage.src =
    `/assets/img/${room}-img.png`;

  guestRoomImage.alt = `ROOM ${room}`;

  // 依照房號自動切換截圖背景
  const guestStory = document.getElementById('guest-story');

  // 先預載對應房號的背景圖片
  const backgroundUrl = `../assets/img/share-bg-${room}.png`;

  const backgroundImage = new Image();
  backgroundImage.src = backgroundUrl;

  try {
    await waitForImage(backgroundImage);

    guestStory.style.backgroundImage =
      `url("${backgroundUrl}")`;

  } catch (error) {
    console.error('Background image failed:', error);

    downloadMessage.textContent =
      '背景圖片載入失敗，請重新整理頁面。';

    return;
  }

  try {
    await waitForImage(guestRoomImage);

    downloadButton.disabled = false;

    // 背景預先準備分享圖片
    try {
      preparedShareFile = await prepareShareImage();
      shareButton.disabled = false;
    } catch (error) {
      console.error('Share image preparation failed:', error);
    }

  } catch (error) {
    console.error(
      'Room image failed:',
      guestRoomImage.src,
      error
    );

    downloadMessage.textContent =
      'ROOM IMAGE COULD NOT BE LOADED.';

    downloadButton.disabled = true;
  }
}

// 下載入住紀念卡
downloadButton.addEventListener('click', async () => {

  if (!currentGuest) return;

  downloadButton.disabled = true;
  downloadButton.textContent = '房卡準備中...';
  downloadMessage.textContent = '';

  try {
    // 使用與手機分享相同的圖片產生流程
    const blob = await generateGuestCardBlob();
    const imageData = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.download =
      `HOTEL-PEP-GUEST-${String(currentGuest.id).padStart(4, '0')}.png`;

    link.href = imageData;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(imageData), 60000);

    downloadMessage.textContent =
      '您的房卡已經準備好囉!';

  } catch (error) {
    console.error('Image export failed:', error);

    downloadMessage.textContent =
      '很抱歉，房卡準備失敗，請重試一次。';

  } finally {
    downloadButton.disabled = false;
    downloadButton.innerHTML =
      '<i class="bi bi-download" aria-hidden="true"></i> 下載你的房卡';
  }
});

shareButton.addEventListener('click', async () => {
  if (!preparedShareFile) return;

  if (
    !navigator.share ||
    !navigator.canShare ||
    !navigator.canShare({ files: [preparedShareFile] })
  ) {
    downloadMessage.textContent =
      '很抱歉您的瀏覽器不支援分享，請直接下載圖片';
    return;
  }

  try {
    await navigator.share({
      files: [preparedShareFile]
    });
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Share failed:', error);
      downloadMessage.textContent =
        '很抱歉分享失敗了，建議直接下載圖片或重試一次';
    }
  }
});

// 等待字體載入，並準備 html-to-image 使用的字體 CSS
let cachedFontEmbedCSS = null;

async function prepareFontsForImage() {
  const fonts = [
    '16px "PeP Special Elite"',
    '24px "PeP Oooh Baby"',
    '24px "PeP Cormorant"',
    '20px "PeP WenKai"'
  ];

  const results = await Promise.allSettled(
    fonts.map(font => document.fonts.load(font))
  );

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn('字體載入失敗：', fonts[index], result.reason);
    }
  });

  await document.fonts.ready;

  if (cachedFontEmbedCSS === null) {
    cachedFontEmbedCSS =
      await htmlToImage.getFontEmbedCSS(
        document.getElementById('guest-story')
      );
  }

  return cachedFontEmbedCSS;
}

// 統一產生房卡圖片
async function generateGuestCardBlob() {
  const story = document.getElementById('guest-story');

  const fontEmbedCSS = await prepareFontsForImage();

  const blob = await htmlToImage.toBlob(story, {
    pixelRatio: 1,
    backgroundColor: '#f7ecd4',
    canvasWidth: 1080,
    canvasHeight: 1920,
    fontEmbedCSS: fontEmbedCSS
  });

  if (!blob) {
    throw new Error('Guest card image generation failed');
  }

  return blob;
}

loadGuest();
