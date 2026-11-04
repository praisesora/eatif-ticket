const fs = require('fs');
const vm = require('vm');

const scriptCode = fs.readFileSync('script.js', 'utf8');

// Mock browser environment
const localStorageMap = new Map();
const domElements = new Map();

function mockElement(id, tag = 'div') {
  if (domElements.has(id)) return domElements.get(id);
  const classes = new Set();
  const el = {
    id,
    tagName: tag.toUpperCase(),
    value: '',
    textContent: '',
    get className() {
      return Array.from(classes).join(' ');
    },
    set className(val) {
      classes.clear();
      (val || '').split(/\s+/).filter(Boolean).forEach(c => classes.add(c));
    },
    classList: {
      add: c => classes.add(c),
      remove: c => classes.delete(c),
      contains: c => classes.has(c)
    },
    style: {},
    checked: false,
    scrollTo: () => {}
  };
  domElements.set(id, el);
  return el;
}

  let currentRadioType = 'Тролейбус';
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    parseInt,
    parseFloat,
    isNaN,
    String,
    JSON,
    setRadioType: t => { currentRadioType = t; },
    localStorage: {
      getItem: k => localStorageMap.get(k) || null,
      setItem: (k, v) => localStorageMap.set(k, String(v)),
      removeItem: k => localStorageMap.delete(k)
    },
    document: {
      getElementById: id => mockElement(id),
      querySelector: sel => {
        if (sel.includes('transportType')) return { value: currentRadioType, checked: true };
        if (sel.includes('dateMode')) return { value: 'auto', checked: true };
        return { value: '', checked: true };
      },
      querySelectorAll: () => [],
      addEventListener: () => {}
    },
  window: {
    location: { hash: '', search: '' },
    scrollTo: () => {}
  }
};

vm.createContext(sandbox);
vm.runInContext(scriptCode, sandbox);

console.log('--- TEST 1: Date formatting ---');
const d1 = new Date(2026, 10, 3, 17, 4);
const r1 = sandbox.formatUkrainianDate(d1);
if (r1 !== 'Придбано 3 листопада о 17:04') throw new Error('Date format mismatch: ' + r1);
console.log('✓ Passed: ' + r1);

console.log('--- TEST 2: Ticket Number formatting ---');
if (sandbox.formatTicketNumber(205158) !== '205 158') throw new Error('Number formatting fail');
if (sandbox.formatTicketNumber(205999) !== '205 999') throw new Error('Number formatting fail');
console.log('✓ Passed: 205 158');

console.log('--- TEST 3: Countdown formatting ---');
if (sandbox.formatCountdown(2400) !== '40:00') throw new Error('Countdown fail 2400');
if (sandbox.formatCountdown(2399) !== '39:59') throw new Error('Countdown fail 2399');
if (sandbox.formatCountdown(65) !== '01:05') throw new Error('Countdown fail 65');
if (sandbox.formatCountdown(0) !== '00:00') throw new Error('Countdown fail 0');
console.log('✓ Passed: 40:00 -> 39:59 -> 01:05 -> 00:00');

console.log('--- TEST 4: Random ticket number generation in [205000, 206000] ---');
for (let i = 0; i < 200; i++) {
  sandbox.randomizeTicketNumber();
  const val = parseInt(sandbox.document.getElementById('ticketNumberInput').value, 10);
  if (val < 205000 || val > 206000) {
    throw new Error('Out of bounds ticket number: ' + val);
  }
}
console.log('✓ Passed: 200/200 random numbers in range [205000, 206000]');

console.log('--- TEST 5: Ticket creation (Trolleybus) ---');
sandbox.document.getElementById('vehicleNumberInput').value = '257';
sandbox.document.getElementById('durationInput').value = '40';
sandbox.document.getElementById('ticketNumberInput').value = '205158';
sandbox.handleCreateTicket();

let curTicket = sandbox.window.getCurrentTicket();
if (!curTicket) throw new Error('currentTicket is null');
if (curTicket.transportType !== 'Тролейбус') throw new Error('Wrong transport type');
if (curTicket.vehicleNumber !== '257') throw new Error('Wrong vehicle number');
if (sandbox.document.getElementById('vehicleNumText').textContent !== '№ 257') throw new Error('DOM vehicle mismatch');
if (sandbox.document.getElementById('ticketNumberDisplay').textContent !== '205 158') throw new Error('DOM number mismatch');
console.log('✓ Passed: Created Trolleybus № 257, ticket #205 158');

console.log('--- TEST 6: Active Countdown Pill State ---');
sandbox.updatePillState();
const pill = sandbox.document.getElementById('statusPill');
const pillText = sandbox.document.getElementById('pillText');
const pillIcon = sandbox.document.getElementById('pillIcon');
if (!pill.classList.contains('active-pill')) throw new Error('Pill missing active-pill class');
if (pill.classList.contains('expired-pill')) throw new Error('Pill has expired-pill class while active');
if (pillText.textContent !== '40:00' && pillText.textContent !== '39:59') {
  throw new Error('Active pill text expected 40:00 or 39:59, got: ' + pillText.textContent);
}
console.log('✓ Passed: Active pill shows ' + pillIcon.textContent + ' ' + pillText.textContent);

console.log('--- TEST 7: Manual Expire Toggle ---');
sandbox.toggleExpireStateManual();
if (!pill.classList.contains('expired-pill')) throw new Error('Pill missing expired-pill class after toggle');
if (pillText.textContent !== 'Квиток недійсний') throw new Error('Pill text not "Квиток недійсний": ' + pillText.textContent);
if (pillIcon.textContent !== '😐') throw new Error('Pill icon not 😐: ' + pillIcon.textContent);
console.log('✓ Passed: Expired pill shows ' + pillIcon.textContent + ' ' + pillText.textContent);

console.log('--- TEST 8: Manual Toggle Back to Active ---');
sandbox.toggleExpireStateManual();
if (!pill.classList.contains('active-pill')) throw new Error('Pill not active after second toggle');
console.log('✓ Passed: Pill resumed active state');

console.log('--- TEST 9: Automatic Expiration when time runs out ---');
curTicket.expiresAt = Date.now() - 1000;
sandbox.updatePillState();
if (!pill.classList.contains('expired-pill')) throw new Error('Pill did not expire automatically');
if (pillText.textContent !== 'Квиток недійсний') throw new Error('Expired text mismatch');
if (pillIcon.textContent !== '😐') throw new Error('Expired icon mismatch');
console.log('✓ Passed: Automatically expired after countdown ended');

console.log('--- TEST 10: Timer Restart ---');
sandbox.restartTicketTimer();
if (!pill.classList.contains('active-pill')) throw new Error('Pill did not reactivate on restart');
if (curTicket.expiresAt <= Date.now()) throw new Error('expiresAt not updated to future');
console.log('✓ Passed: Timer successfully restarted');

console.log('--- TEST 11: Bus Creation with 4 digits (e.g. 1042) ---');
sandbox.document.querySelector = (sel) => {
  if (sel.includes('transportType')) return { value: 'Автобус', checked: true };
  return { value: 'auto', checked: true };
};
sandbox.document.getElementById('vehicleNumberInput').value = '1042';
sandbox.document.getElementById('ticketNumberInput').value = '205888';
sandbox.handleCreateTicket();

curTicket = sandbox.window.getCurrentTicket();
if (curTicket.transportType !== 'Автобус') throw new Error('Bus type mismatch');
if (curTicket.vehicleNumber !== '1042') throw new Error('Bus number mismatch');
if (sandbox.document.getElementById('vehicleKindText').textContent !== 'Автобус') throw new Error('DOM Bus text mismatch');
if (sandbox.document.getElementById('vehicleNumText').textContent !== '№ 1042') throw new Error('DOM 1042 mismatch');
if (sandbox.document.getElementById('ticketNumberDisplay').textContent !== '205 888') throw new Error('DOM ticket 205 888 mismatch');
console.log('✓ Passed: Created Bus № 1042, ticket #205 888');

console.log('--- TEST 12: LocalStorage Persistence ---');
sandbox.saveTicketToStorage(curTicket);
curTicket = null;
sandbox.loadSavedTicket();
curTicket = sandbox.window.getCurrentTicket();
if (!curTicket) throw new Error('Failed to restore ticket from storage');
if (curTicket.vehicleNumber !== '1042') throw new Error('Restored wrong vehicle number');
if (curTicket.transportType !== 'Автобус') throw new Error('Restored wrong transport type');
console.log('✓ Passed: LocalStorage saved and restored ticket successfully');

console.log('--- TEST 13: Extended duration countdown formatting (>= 60 min) ---');
if (sandbox.formatCountdown(3600) !== '01:00:00') throw new Error('Failed 3600: ' + sandbox.formatCountdown(3600));
if (sandbox.formatCountdown(5430) !== '01:30:30') throw new Error('Failed 5430: ' + sandbox.formatCountdown(5430));
console.log('✓ Passed: 3600s -> 01:00:00, 5430s -> 01:30:30');

console.log('--- TEST 14: Ukrainian date across all 12 months ---');
const expectedMonths = [
  'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
  'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'
];
expectedMonths.forEach((m, idx) => {
  const d = new Date(2026, idx, 10, 12, 0);
  const formatted = sandbox.formatUkrainianDate(d);
  if (!formatted.includes(m)) throw new Error('Month mismatch for ' + m + ': ' + formatted);
});
console.log('✓ Passed: All 12 Ukrainian genitive months formatted correctly');

console.log('--- TEST 15: Seconds duration formatting in modal (< 60s) ---');
sandbox.document.getElementById('durationInput').value = '0.25'; // 15 seconds
sandbox.handleCreateTicket();
const modalDur = sandbox.document.getElementById('modalDurationVal').textContent;
if (modalDur !== '15 секунд') throw new Error('Expected "15 секунд", got: ' + modalDur);
console.log('✓ Passed: 15 seconds formatted as "15 секунд" in modal');

console.log('--- TEST 16: Initial view remains create screen on fresh visit ---');
sandbox.window.location.hash = '';
sandbox.loadSavedTicket();
if (!sandbox.document.getElementById('createView').classList.contains('active')) {
  throw new Error('Initial screen should be createView on fresh visit');
}
console.log('✓ Passed: Initial screen is createView');

console.log('--- TEST 17: Direct navigation with #ticket opens ticketView ---');
sandbox.window.location.hash = '#ticket';
sandbox.loadSavedTicket();
if (!sandbox.document.getElementById('ticketView').classList.contains('active')) {
  throw new Error('#ticket failed to activate ticketView');
}
console.log('✓ Passed: #ticket directly activates ticketView');

console.log('\n=========================================');
console.log('🎉 ALL 17 DEEP VERIFICATION TESTS PASSED!');
console.log('=========================================');

