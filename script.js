/**
 * КП "ЕЛЕКТРОАВТОТРАНС" — Е-Квиток
 * Logic, Live Countdown, State Persistence & Identical Replication
 */

const UKRAINIAN_MONTHS_GENITIVE = [
  'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
  'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'
];

const STORAGE_KEY = 'eatif_ticket_data_v1';
const DEFAULT_QUOTE = 'Найголовніше — залишайтеся людьми і кричіть, що ви живі!';

// Global State
let currentTicket = null;
let timerInterval = null;
let autoDateInterval = null;
let currentTicketCount = 1;

/* ========================================================
   INITIALIZATION
   ======================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initAutoDateLive();
  randomizeTicketNumber();
  loadSavedTicket();
  
  // Set default manual date/time inputs to current time
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  
  const manualDateInput = document.getElementById('manualDateInput');
  const manualTimeInput = document.getElementById('manualTimeInput');
  if (manualDateInput) manualDateInput.value = dateStr;
  if (manualTimeInput) manualTimeInput.value = timeStr;

  updateCreationPreview();
});

/* ========================================================
   AUTO DATE LIVE UPDATER
   ======================================================== */
function initAutoDateLive() {
  updateAutoDatePreview();
  if (autoDateInterval) clearInterval(autoDateInterval);
  autoDateInterval = setInterval(updateAutoDatePreview, 1000);
}

function updateAutoDatePreview() {
  const previewEl = document.getElementById('autoDatePreviewText');
  if (!previewEl) return;
  const now = new Date();
  previewEl.textContent = formatUkrainianDate(now);
}

function formatUkrainianDate(date) {
  const day = date.getDate();
  const month = UKRAINIAN_MONTHS_GENITIVE[date.getMonth()];
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `Придбано ${day} ${month} о ${hours}:${minutes}`;
}

function formatTicketNumber(num) {
  const s = String(num).trim();
  if (s.length >= 6) {
    return `${s.slice(0, 3)} ${s.slice(3)}`;
  }
  return s;
}

/* ========================================================
   RANDOMIZERS & FORM HELPERS
   ======================================================== */
function randomizeTicketNumber() {
  // Random integer between 205000 and 206000
  const min = 205000;
  const max = 206000;
  const randNum = Math.floor(Math.random() * (max - min + 1)) + min;
  
  const input = document.getElementById('ticketNumberInput');
  if (input) {
    input.value = randNum;
    updateCreationPreview();
  }
}

function randomizeVehicleNumber() {
  // Random 3-4 digit number, e.g. 257, 142, 1048
  const rand = Math.random() > 0.3 
    ? Math.floor(Math.random() * 900) + 100   // 3 digits (100 - 999)
    : Math.floor(Math.random() * 9000) + 1000; // 4 digits (1000 - 9999)
  
  const input = document.getElementById('vehicleNumberInput');
  if (input) {
    input.value = rand;
    updateCreationPreview();
  }
}

function setDuration(minutes) {
  const input = document.getElementById('durationInput');
  if (input) {
    input.value = minutes;
    document.querySelectorAll('.chip-btn').forEach(btn => btn.classList.remove('active'));
    const standardChip = document.getElementById('chip' + minutes);
    if (standardChip) standardChip.classList.add('active');
    updateCreationPreview();
  }
}

function setDurationSeconds(seconds) {
  const input = document.getElementById('durationInput');
  if (input) {
    // Store custom duration in minutes decimal
    input.value = (seconds / 60).toFixed(2);
    document.querySelectorAll('.chip-btn').forEach(btn => btn.classList.remove('active'));
    updateCreationPreview();
  }
}

function toggleDateMode(mode) {
  const autoBox = document.getElementById('autoDatePreviewBox');
  const manualBox = document.getElementById('manualDateBox');
  if (mode === 'auto') {
    autoBox.style.display = 'flex';
    manualBox.style.display = 'none';
  } else {
    autoBox.style.display = 'none';
    manualBox.style.display = 'block';
  }
  updateCreationPreview();
}

function adjustCount(delta) {
  currentTicketCount = Math.max(1, Math.min(10, currentTicketCount + delta));
  const display = document.getElementById('ticketCountDisplay');
  if (display) {
    display.textContent = formatTicketCount(currentTicketCount);
  }
}

function formatTicketCount(count) {
  if (count === 1) return '1 квиток';
  if (count >= 2 && count <= 4) return `${count} квитки`;
  return `${count} квитків`;
}

function resetTickerQuote() {
  const input = document.getElementById('tickerTextInput');
  if (input) {
    input.value = DEFAULT_QUOTE;
  }
}

function updateCreationPreview() {
  const numInput = document.getElementById('ticketNumberInput');
  const hint = document.getElementById('ticketNumberFormattedHint');
  if (numInput && hint) {
    hint.textContent = `Формат у квитку: Номер: ${formatTicketNumber(numInput.value)}`;
  }
}

/* ========================================================
   TICKET CREATION HANDLER
   ======================================================== */
function handleCreateTicket(event) {
  if (event) event.preventDefault();

  const transportType = document.querySelector('input[name="transportType"]:checked')?.value || 'Тролейбус';
  
  let vehicleNumber = document.getElementById('vehicleNumberInput').value.trim();
  if (!vehicleNumber || vehicleNumber.length < 3) {
    vehicleNumber = '257';
  }

  const durationMin = parseFloat(document.getElementById('durationInput').value) || 40;
  const durationMs = Math.round(durationMin * 60 * 1000);

  const dateMode = document.querySelector('input[name="dateMode"]:checked')?.value || 'auto';
  let purchasedDate;
  if (dateMode === 'auto') {
    purchasedDate = new Date();
  } else {
    const dVal = document.getElementById('manualDateInput').value;
    const tVal = document.getElementById('manualTimeInput').value;
    if (dVal && tVal) {
      purchasedDate = new Date(`${dVal}T${tVal}`);
    } else {
      purchasedDate = new Date();
    }
  }

  let ticketNumber = parseInt(document.getElementById('ticketNumberInput').value, 10);
  if (isNaN(ticketNumber) || ticketNumber < 100000) {
    ticketNumber = 205158;
  }

  const tickerText = document.getElementById('tickerTextInput').value.trim() || DEFAULT_QUOTE;

  const nowMs = Date.now();
  const ticketData = {
    transportType,
    vehicleNumber,
    durationMs,
    purchasedTimestamp: purchasedDate.getTime(),
    createdLocalTimestamp: nowMs,
    expiresAt: nowMs + durationMs,
    ticketNumber,
    ticketCount: currentTicketCount,
    tickerText,
    manualExpiredOverride: false
  };

  currentTicket = ticketData;
  if (typeof window !== 'undefined') {
    window.currentTicket = ticketData;
    window.getCurrentTicket = () => currentTicket;
  }
  saveTicketToStorage(ticketData);
  renderTicket(ticketData);
  startCountdown();
  switchView('ticket');
}

/* ========================================================
   RENDER TICKET (Pixel-Perfect)
   ======================================================== */
function renderTicket(ticket) {
  if (!ticket) return;

  // 1. Marquee Banner (fill all 6 track items for smooth infinite loop)
  const bannerQuote = ticket.tickerText + ' \u00A0—\u00A0\u00A0 ';
  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById('tickerContent' + i);
    if (el) el.textContent = bannerQuote;
  }

  // 2. Purchased Date
  const pDate = new Date(ticket.purchasedTimestamp);
  document.getElementById('ticketPurchasedDate').textContent = formatUkrainianDate(pDate);

  // 3. Ticket Count
  document.getElementById('ticketCountHeadline').textContent = formatTicketCount(ticket.ticketCount || 1);

  // 4. Vehicle Information (Тролейбус № 257)
  document.getElementById('vehicleKindText').textContent = ticket.transportType;
  document.getElementById('vehicleNumText').textContent = `№ ${ticket.vehicleNumber}`;

  // 5. Ticket Number (Номер: 205 158)
  document.getElementById('ticketNumberDisplay').textContent = formatTicketNumber(ticket.ticketNumber);

  // 6. Update Info Modal fields
  document.getElementById('modalTransportVal').textContent = `${ticket.transportType} № ${ticket.vehicleNumber}`;
  if (ticket.durationMs < 60000) {
    const durSecs = Math.max(1, Math.round(ticket.durationMs / 1000));
    document.getElementById('modalDurationVal').textContent = `${durSecs} секунд`;
  } else {
    const durMins = Math.round(ticket.durationMs / 60000);
    document.getElementById('modalDurationVal').textContent = `${durMins} хвилин`;
  }
  document.getElementById('modalNumberVal').textContent = formatTicketNumber(ticket.ticketNumber);

  // 7. Update Pill Status
  updatePillState();
}

/* ========================================================
   COUNTDOWN & TIMER
   ======================================================== */
function startCountdown() {
  if (timerInterval) clearInterval(timerInterval);
  updatePillState();
  timerInterval = setInterval(updatePillState, 1000);
}

function updatePillState() {
  if (!currentTicket) return;

  const pill = document.getElementById('statusPill');
  const pillIcon = document.getElementById('pillIcon');
  const pillText = document.getElementById('pillText');
  const modalStatus = document.getElementById('modalStatusVal');
  const quickExpireIcon = document.getElementById('quickToggleExpireIcon');

  const now = Date.now();
  const remainingMs = currentTicket.expiresAt - now;
  const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));

  const isExpired = currentTicket.manualExpiredOverride === true || remainingSec <= 0;

  const ticketCard = document.getElementById('ticketCard');
  if (ticketCard) {
    if (isExpired) {
      ticketCard.classList.add('expired');
    } else {
      ticketCard.classList.remove('expired');
    }
  }

  if (isExpired) {
    // Expired State (1:1 identical to reference image with outline & smiley)
    pill.className = 'status-pill expired-pill';
    if (pillIcon) {
      pillIcon.style.display = '';
      pillIcon.textContent = '😐';
    }
    pillText.textContent = 'Квиток недійсний';
    if (modalStatus) modalStatus.textContent = 'Недійсний (термін вийшов)';
    if (quickExpireIcon) quickExpireIcon.textContent = '🟢';
  } else {
    // Active State (Clean timer without outline, no icon, black font)
    pill.className = 'status-pill active-pill';
    if (pillIcon) {
      pillIcon.style.display = 'none';
      pillIcon.textContent = '';
    }
    pillText.textContent = formatCountdown(remainingSec);
    if (modalStatus) modalStatus.textContent = `Дійсний (${formatCountdown(remainingSec)})`;
    if (quickExpireIcon) quickExpireIcon.textContent = '🛑';
  }
}

function formatCountdown(totalSeconds) {
  const total = Math.max(0, Math.floor(totalSeconds));
  if (total >= 3600) {
    const hours = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function restartTicketTimer() {
  if (!currentTicket) return;
  const now = Date.now();
  currentTicket.expiresAt = now + currentTicket.durationMs;
  currentTicket.manualExpiredOverride = false;
  saveTicketToStorage(currentTicket);
  updatePillState();
}

function toggleExpireStateManual() {
  if (!currentTicket) return;
  if (currentTicket.manualExpiredOverride) {
    // Make active
    currentTicket.manualExpiredOverride = false;
    // ensure there is remaining time
    if (currentTicket.expiresAt <= Date.now()) {
      currentTicket.expiresAt = Date.now() + currentTicket.durationMs;
    }
  } else {
    // Make expired
    currentTicket.manualExpiredOverride = true;
  }
  saveTicketToStorage(currentTicket);
  updatePillState();
}

/* ========================================================
   LOCAL STORAGE PERSISTENCE
   ======================================================== */
function saveTicketToStorage(ticket) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ticket));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

function loadSavedTicket() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.ticketNumber) {
        currentTicket = data;
        if (typeof window !== 'undefined') {
          window.currentTicket = data;
          window.getCurrentTicket = () => currentTicket;
        }
        currentTicketCount = data.ticketCount || 1;
        renderTicket(data);
        startCountdown();
      }
    }
  } catch (e) {
    console.warn('LocalStorage load failed:', e);
  }

  // Check URL hash/query for direct navigation
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();

  if (hash.includes('ticket') || search.includes('ticket')) {
    switchView('ticket');
    return;
  }
  if (hash.includes('expired') || search.includes('expired')) {
    if (!currentTicket) handleCreateTicket();
    currentTicket.manualExpiredOverride = true;
    updatePillState();
    switchView('ticket');
    return;
  }

  // Default initial screen is always the creation view
  switchView('create');
}

/* ========================================================
   NAVIGATION & VIEW SWITCHING
   ======================================================== */
function switchView(viewName) {
  const container = document.getElementById('deviceContainer');
  const createView = document.getElementById('createView');
  const ticketView = document.getElementById('ticketView');
  const tabCreateBtn = document.getElementById('tabCreateBtn');
  const tabTicketBtn = document.getElementById('tabTicketBtn');

  if (viewName === 'ticket') {
    if (!currentTicket) {
      // If no ticket yet, create default ticket first
      handleCreateTicket();
    }
    if (container) {
      container.classList.add('ticket-mode');
    }
    createView.classList.remove('active');
    ticketView.classList.add('active');
    tabCreateBtn.classList.remove('active');
    tabTicketBtn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    if (container) container.classList.remove('ticket-mode');
    createView.classList.add('active');
    ticketView.classList.remove('active');
    tabCreateBtn.classList.add('active');
    tabTicketBtn.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }
}

/* ========================================================
   INFO MODAL
   ======================================================== */
function openInfoModal() {
  const modal = document.getElementById('infoModal');
  if (modal) modal.classList.add('open');
}

function closeInfoModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('modal-close-btn')) {
    return;
  }
  const modal = document.getElementById('infoModal');
  if (modal) modal.classList.remove('open');
}

// Global Keyboard Shortcut: Escape to close modal or switch view
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('infoModal');
    if (modal && modal.classList.contains('open')) {
      closeInfoModal();
    } else {
      switchView('create');
    }
  }
});

