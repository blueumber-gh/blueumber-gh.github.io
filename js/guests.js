const SUPABASE_URL = 'https://lprjekvgodeiourtirsx.supabase.co/';
const SUPABASE_KEY = 'sb_publishable_R7fwGex2kURTdgAkG8RhuQ_sPKHuDiI';

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


const GUESTS_PER_PAGE = 1;

let guests = [];
let currentPage = 0;

const leftPage = document.getElementById('guest-page-left');
const rightPage = document.getElementById('guest-page-right');
const prevButton = document.getElementById('prev-page');
const nextButton = document.getElementById('next-page');
const pageIndicator = document.getElementById('page-indicator');

function isMobile() {
  return window.matchMedia('(max-width: 767px)').matches;
}

// 建立單一住客的卡片
function createGuestCard(guest) {
  const card = document.createElement('a');
  card.className = 'guest-entry';
  card.href = `guest/?id=${guest.id}`;

  // 住客編號
  const number = document.createElement('span');
  number.className = 'guest-number';
  number.textContent =
    `GUEST No. ${String(guest.id).padStart(4, '0')}`;

  // 住客暱稱
  const nickname = document.createElement('strong');
  nickname.className = 'guest-name';
  nickname.textContent = guest.nickname;

  // 判斷是否包含中文字
  const hasChinese = /\p{Script=Han}/u.test(guest.nickname);

  if (hasChinese) {
    nickname.classList.add('chinese-name');
  } else {
    nickname.classList.add('english-name');
  }

  // 金色裝飾
  const divider = document.createElement('div');
  divider.className = 'guest-divider';

  const star = document.createElement('img');
  star.className = 'guest-divider-star';
  star.src = 'assets/img/star-p.png';
  star.alt = '';

  divider.appendChild(star);

  // ROOM 標題
  const room = document.createElement('span');
  room.className = 'guest-room';
  room.textContent = 'ROOM';

  // 根據房號自動載入圖片
  const roomImage = document.createElement('img');
  roomImage.className = 'guest-room-image';
  roomImage.src = `assets/img/${guest.room}-img.png?20261023-04`;
  roomImage.alt = `ROOM ${guest.room}`;
  roomImage.loading = 'lazy';

  // 依照排版順序加入
  card.append(
    number,
    nickname,
    divider,
    room,
    roomImage
  );

  return card;
}

// 在指定書頁顯示最多 1 位住客
function renderPage(container, pageIndex) {
  container.replaceChildren();

  const start = pageIndex * GUESTS_PER_PAGE;
  const pageGuests = guests.slice(start, start + GUESTS_PER_PAGE);

  pageGuests.forEach(guest => {
    container.appendChild(createGuestCard(guest));
  });
}

// 更新書本內容與頁碼
function renderBook() {
  const mobile = isMobile();
  const totalPages = Math.max(
    1,
    Math.ceil(guests.length / GUESTS_PER_PAGE)
  );

  const pagesPerView = mobile ? 1 : 2;
  const maxStartPage = mobile
    ? totalPages - 1
    : Math.max(0, Math.ceil(totalPages / 2) * 2 - 2);

  currentPage = Math.min(currentPage, maxStartPage);

  // 桌機每次從偶數頁開始顯示左右雙頁
  if (!mobile) {
    currentPage = Math.floor(currentPage / 2) * 2;
  }

  renderPage(leftPage, currentPage);

  if (mobile) {
    rightPage.replaceChildren();
  } else {
    renderPage(rightPage, currentPage + 1);
  }

  const first = String(currentPage + 1).padStart(2, '0');

  if (mobile) {
    pageIndicator.textContent = `PAGE ${first}`;
  } else {
    const second = String(currentPage + 2).padStart(2, '0');
    pageIndicator.textContent = `PAGE ${first} — ${second}`;
  }

  prevButton.disabled = currentPage === 0;
  nextButton.disabled = currentPage + pagesPerView >= totalPages;
}

// 淡入淡出切換設定
const FADE_DURATION = 350;
let isChangingPage = false;

function changePage(direction) {
  // 動畫進行中，不接受重複點擊
  if (isChangingPage) return;

  const step = isMobile() ? 1 : 2;

  const totalPages = Math.max(
    1,
    Math.ceil(guests.length / GUESTS_PER_PAGE)
  );

  const maxStartPage = isMobile()
    ? totalPages - 1
    : Math.max(0, Math.ceil(totalPages / 2) * 2 - 2);

  const nextPage = Math.max(
    0,
    Math.min(currentPage + direction * step, maxStartPage)
  );

  // 沒有其他頁面就不切換
  if (nextPage === currentPage) return;

  isChangingPage = true;

  // 先淡出目前內容
  leftPage.classList.add('is-fading');
  rightPage.classList.add('is-fading');

  setTimeout(() => {
    // 淡出完成後更換資料
    currentPage = nextPage;
    renderBook();

    // 下一個畫面影格開始淡入
    requestAnimationFrame(() => {
      leftPage.classList.remove('is-fading');
      rightPage.classList.remove('is-fading');
    });

    // 動畫結束後恢復操作
    setTimeout(() => {
      isChangingPage = false;
    }, FADE_DURATION);

  }, FADE_DURATION);
}

// 上一頁
prevButton.addEventListener('click', () => {
  changePage(-1);
});

// 下一頁
nextButton.addEventListener('click', () => {
  changePage(1);
});

// 視窗大小改變時重新排版
window.addEventListener('resize', renderBook);

// 從 Supabase 取得住客資料
async function loadGuests() {
  const { data, error } = await supabaseClient
    .from('guests')
    .select('id, nickname, room')
    .order('id', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('Guest register load failed:', error);
    leftPage.textContent = 'GUEST REGISTER COULD NOT BE LOADED.';
    rightPage.replaceChildren();
    prevButton.disabled = true;
    nextButton.disabled = true;
    return;
  }

  guests = data || [];
  renderBook();
}

loadGuests();
