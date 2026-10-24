const SUPABASE_URL = 'https://lprjekvgodeiourtirsx.supabase.co/';
const SUPABASE_KEY = 'sb_publishable_R7fwGex2kURTdgAkG8RhuQ_sPKHuDiI';

// Authentication → Users 中的管理員 UID
const ADMIN_USER_ID = '27a3322c-a9b0-4c48-995e-41eeb8640c0b';

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// 登入介面
const authLoading = document.getElementById('auth-loading');
const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');

const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-button');
const loginMessage = document.getElementById('login-message');
const logoutButton = document.getElementById('logout-button');

// 入住表單
const form = document.getElementById('checkin-form');
const message = document.getElementById('message');
const checkinButton = document.getElementById('checkin-button');

const roomCards = document.querySelectorAll('.room-card');
const roomInput = document.getElementById('room');

// 切換畫面
function showLogin() {
  authLoading.hidden = true;
  loginSection.hidden = false;
  adminSection.hidden = true;
}

function showAdmin() {
  authLoading.hidden = true;
  loginSection.hidden = true;
  adminSection.hidden = false;
}

// 檢查登入身分
async function checkAdminAccess() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (!error && data.user && data.user.id === ADMIN_USER_ID) {
    showAdmin();
  } else {
    showLogin();
  }
}

// 開啟頁面時檢查登入狀態
checkAdminAccess();

// 登入
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('staff-email').value.trim();
  const password = document.getElementById('staff-password').value;

  loginButton.disabled = true;
  loginButton.textContent = 'LOGGING IN...';
  loginMessage.textContent = '';

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      loginMessage.textContent = 'LOGIN FAILED. PLEASE CHECK YOUR DETAILS.';
      return;
    }

    if (!data.user || data.user.id !== ADMIN_USER_ID) {
      await supabaseClient.auth.signOut();
      loginMessage.textContent = 'ACCESS DENIED.';
      return;
    }

    loginForm.reset();
    showAdmin();

  } catch (error) {
    console.error('Login failed:', error);
    loginMessage.textContent = 'LOGIN FAILED. PLEASE TRY AGAIN.';

  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'LOG IN';
  }
});

// 登出
logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;

  const { error } = await supabaseClient.auth.signOut();

  logoutButton.disabled = false;

  if (error) {
    message.textContent = 'LOG OUT FAILED. PLEASE TRY AGAIN.';
    return;
  }

  form.reset();
  updateRoomSelection('');
  message.textContent = '';

  showLogin();
});


// 房號選擇：同步更新選取樣式及文字
function updateRoomSelection(selectedRoom) {
  roomInput.value = selectedRoom;

  roomCards.forEach(card => {
    const isSelected = card.dataset.room === selectedRoom;

    // 同時保留舊版 selected，避免影響原本樣式
    card.classList.toggle('selected', isSelected);
    card.classList.toggle('is-selected', isSelected);

    // 讓 iOS 與輔助工具都能辨識選取狀態
    card.setAttribute('aria-pressed', String(isSelected));

    // 更新按鈕下方的狀態文字
    const status = card.querySelector('.room-status');

    if (status) {
      status.textContent = isSelected ? '✓ SELECTED' : 'SELECT';
    }
  });
}

roomCards.forEach(card => {
  card.addEventListener('click', () => {
    updateRoomSelection(card.dataset.room);
  });
});


// 入住
form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const nickname = document.getElementById('nickname').value.trim();
  const room = roomInput.value;

  if (!nickname || !room) {
    message.textContent =
      'Please enter your nickname and select a room.';
    return;
  }

  checkinButton.disabled = true;
  checkinButton.textContent = 'CHECKING IN...';
  message.textContent = '';

  try {
    // 送出前重新確認管理員身分
    const { data: authData, error: authError } =
      await supabaseClient.auth.getUser();

    if (
      authError ||
      !authData.user ||
      authData.user.id !== ADMIN_USER_ID
    ) {
      message.textContent = 'STAFF SESSION EXPIRED.';
      showLogin();
      return;
    }

    const { data, error } = await supabaseClient
      .from('guests')
      .insert({
        nickname: nickname,
        room: room
      })
      .select('id')
      .single();

    if (error) {
      console.error('Check-in failed:', error);
      message.textContent = 'CHECK-IN FAILED.';
      return;
    }

    window.location.href = `guest/?id=${data.id}`;

  } catch (error) {
    console.error('Check-in failed:', error);
    message.textContent = 'CHECK-IN FAILED.';

  } finally {
    checkinButton.disabled = false;
    checkinButton.textContent = 'CHECK IN';
  }
});
