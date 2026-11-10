'use strict';

const KEY = 'brambleandblade.demo.bookings.v1';
const OPEN_MIN = 9 * 60;
const CLOSE_MIN = 19 * 60;
const SLOT_MIN = 30;

const BARBERS = [
  { id: 'rafa', name: 'Oliver Bennett', short: 'Oliver', role: 'Fades, clippers and scissors', initials: 'OB', busy: ['10:00', '11:30', '14:00', '16:30'] },
  { id: 'diego', name: 'Harry Clarke', short: 'Harry', role: 'Beards, razors and hot towels', initials: 'HC', busy: ['09:30', '13:00', '15:00', '17:30'] },
  { id: 'lucas', name: 'George Ellis', short: 'George', role: 'Scissor cuts, classics and children', initials: 'GE', busy: ['11:00', '12:00', '15:30', '18:00'] }
];

const SERVICES = [
  { id: 'corte', name: 'Haircut', desc: 'clippers or scissors', duration: 45, price: 35 },
  { id: 'barba', name: 'Beard trim', desc: 'razor finish and hot towel', duration: 30, price: 25 },
  { id: 'combo', name: 'Haircut & beard', desc: 'the full tidy-up', duration: 75, price: 55 },
  { id: 'sobrancelha', name: 'Eyebrow tidy', desc: 'a precise razor finish', duration: 15, price: 10 },
  { id: 'pigmentacao', name: 'Colour blending', desc: 'a fuller, more even look', duration: 30, price: 20 },
  { id: 'acabamento', name: 'Shape-up', desc: 'keep things sharp between cuts', duration: 15, price: 12 },
  { id: 'infantil', name: 'Children’s haircut', desc: 'aged 10 and under', duration: 30, price: 25 }
];

const ADDONS = [
  { id: 'sobrancelha', name: 'Eyebrow tidy', duration: 15, price: 10 },
  { id: 'pigmentacao', name: 'Colour blending', duration: 30, price: 20 },
  { id: 'acabamento', name: 'Shape-up', duration: 15, price: 12 }
];

const state = {
  step: 1,
  barberId: null,
  serviceId: null,
  addons: [],
  date: null,
  time: null,
  name: '',
  phone: '',
  consent: false,
  assignedBarberId: null
};

let savedBookings = [];
let currentBooking = null;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function londonParts(now = new Date()) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(now).map(part => [part.type, part.value]));
}
function todayKey() {
  const p = londonParts();
  return `${p.year}-${p.month}-${p.day}`;
}
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function timeToMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function minToTime(m) { return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; }
function nowMin() { const p = londonParts(); return Number(p.hour) * 60 + Number(p.minute); }
function money(n) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n); }
function durationLabel(n) {
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}
function formatFullDate(key) {
  const d = parseDateKey(key);
  const s = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: '2-digit', month: 'long' }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function formatShortDate(d) {
  const dow = new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(d).replace('.', '');
  const mon = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(d).replace('.', '');
  return `${dow}, ${pad(d.getDate())} ${mon}`;
}
function nextDates() {
  const out = [];
  const base = parseDateKey(todayKey());
  for (let i = 0; i < 14; i++) {
    const d = addDays(base, i);
    out.push({ key: dateKey(d), date: d, closed: d.getDay() === 0 });
  }
  return out;
}
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function emptyStore() { return { bookings: [], draft: null }; }
function readStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { bookings: parsed, draft: null };
    if (!parsed || typeof parsed !== 'object') return emptyStore();
    return {
      bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
      draft: parsed.draft && typeof parsed.draft === 'object' ? parsed.draft : null
    };
  } catch (err) {
    return emptyStore();
  }
}
function writeStore() {
  try {
    const draft = draftSnapshot();
    const isEmpty = !draft.barberId && !draft.serviceId && !draft.addons.length &&
      !draft.date && !draft.time && !draft.name && !draft.phone;
    localStorage.setItem(KEY, JSON.stringify({ bookings: savedBookings, draft: isEmpty ? null : draft }));
  } catch (err) { /* storage unavailable */ }
}
function draftSnapshot() {
  return {
    step: state.step,
    barberId: state.barberId,
    serviceId: state.serviceId,
    addons: state.addons.slice(),
    date: state.date,
    time: state.time,
    name: state.name,
    phone: state.phone,
    consent: state.consent
  };
}

function getBarber(id) { return BARBERS.find(b => b.id === id) || null; }
function getService(id) { return SERVICES.find(s => s.id === id) || null; }
function getAddon(id) { return ADDONS.find(a => a.id === id) || null; }
function selectedAddons() { return state.addons.map(getAddon).filter(Boolean); }
function selectedDuration() {
  const svc = getService(state.serviceId);
  if (!svc) return 0;
  return svc.duration + selectedAddons().reduce((sum, a) => sum + a.duration, 0);
}
function selectedTotal() {
  const svc = getService(state.serviceId);
  if (!svc) return 0;
  return svc.price + selectedAddons().reduce((sum, a) => sum + a.price, 0);
}

function extrasFor(barberId, key) {
  const all = [];
  for (let m = OPEN_MIN; m < CLOSE_MIN; m += SLOT_MIN) all.push(m);
  const base = getBarber(barberId).busy.map(timeToMin);
  const candidates = all.filter(m => !base.includes(m));
  if (!candidates.length) return [];
  let seed = hashString(`${barberId}:${key}`) || 1;
  const count = 1 + (seed % 2);
  const picked = [];
  for (let i = 0; i < count && candidates.length; i++) {
    const idx = (seed >>> (i * 5)) % candidates.length;
    picked.push(candidates.splice(idx, 1)[0]);
    seed = Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0;
  }
  return picked;
}

function busyIntervals(barberId, key) {
  const intervals = [];
  const barber = getBarber(barberId);
  if (!barber) return intervals;
  barber.busy.forEach(t => {
    const s = timeToMin(t);
    intervals.push({ start: s, end: s + SLOT_MIN });
  });
  extrasFor(barberId, key).forEach(s => intervals.push({ start: s, end: s + SLOT_MIN }));
  savedBookings.forEach(b => {
    if (b && b.barberId === barberId && b.date === key) {
      const s = timeToMin(b.time);
      intervals.push({ start: s, end: s + (Number(b.duration) || SLOT_MIN) });
    }
  });
  return intervals;
}

function isAvailable(barberId, key, time, duration) {
  if (!barberId || !key || !time || !duration) return false;
  if (key < todayKey()) return false;
  const d = parseDateKey(key);
  if (d.getDay() === 0) return false;
  const start = timeToMin(time);
  const end = start + duration;
  if (start < OPEN_MIN || end > CLOSE_MIN) return false;
  if (key === todayKey() && start <= nowMin()) return false;
  const intervals = busyIntervals(barberId, key);
  return !intervals.some(b => start < b.end && end > b.start);
}

function availableBarbers(key, time, duration) {
  return BARBERS.filter(b => isAvailable(b.id, key, time, duration));
}
function firstAvailableBarber(key, time, duration) {
  const found = availableBarbers(key, time, duration);
  return found.length ? found[0] : null;
}
function barberLabel(id) {
  const b = getBarber(id);
  return b ? (b.short === b.name ? b.name : `${b.short} (${b.name})`) : 'No preference';
}
const els = {
  booking: $('#booking'),
  form: $('#booking-form'),
  status: $('#booking-status'),
  barberOptions: $('#barber-options'),
  barberError: $('#barber-error'),
  serviceOptions: $('#service-options'),
  serviceError: $('#service-error'),
  addonOptions: $('#addon-options'),
  dateOptions: $('#date-options'),
  dateHint: $('#date-hint'),
  dateError: $('#date-error'),
  timeOptions: $('#time-options'),
  timeEmpty: $('#time-empty'),
  timeError: $('#time-error'),
  assignedNote: $('#assigned-note'),
  name: $('#client-name'),
  phone: $('#client-phone'),
  nameError: $('#name-error'),
  phoneError: $('#phone-error'),
  consent: $('#consent'),
  consentError: $('#consent-error'),
  review: $('#review-list'),
  success: $('#booking-success'),
  successName: $('#success-name'),
  successReview: $('#success-review'),
  whatsapp: $('#whatsapp-link'),
  cancel: $('#cancel-booking'),
  newBooking: $('#new-booking')
};

const STEP_NAMES = ['Barber', 'Service', 'Date', 'Details', 'Confirm'];

function clearChildren(node) { while (node.firstChild) node.removeChild(node.firstChild); }
function setError(node, message) {
  if (!node) return;
  if (message) {
    node.textContent = message;
    node.hidden = false;
  } else {
    node.hidden = true;
  }
}
function digitsOf(value) { return value.replace(/\D/g, ''); }
function formatPhone(value) {
  return value.replace(/[^\d+ ()-]/g, '').slice(0, 20);
}
function isUkMobile(value) {
  const compact = value.replace(/[ ()-]/g, '');
  return /^(?:07\d{9}|(?:\+44|0044)7\d{9})$/.test(compact);
}

function choiceButton({ key, name, desc, meta, selected, role = 'radio' }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `choice${selected ? ' is-selected' : ''}`;
  btn.dataset.key = key;
  btn.setAttribute('role', role);
  if (role === 'radio') btn.setAttribute('aria-checked', selected ? 'true' : 'false');

  const main = document.createElement('span');
  main.className = 'choice__main';
  const title = document.createElement('span');
  title.className = 'choice__name';
  const mark = document.createElement('span');
  mark.className = 'choice__mark';
  mark.setAttribute('aria-hidden', 'true');
  title.appendChild(mark);
  title.appendChild(document.createTextNode(name));
  const sub = document.createElement('span');
  sub.className = 'choice__desc';
  sub.textContent = desc;
  main.append(title, sub);

  const metaEl = document.createElement('span');
  metaEl.className = 'choice__meta';
  metaEl.textContent = meta;
  btn.append(main, metaEl);
  return btn;
}

function renderBarbers() {
  clearChildren(els.barberOptions);
  const anySelected = state.barberId === 'any';
  els.barberOptions.appendChild(choiceButton({
    key: 'any',
    name: 'No preference',
    desc: 'we’ll match you with an available barber',
    meta: 'First available',
    selected: anySelected
  }));
  BARBERS.forEach(b => {
    els.barberOptions.appendChild(choiceButton({
      key: b.id,
      name: b.short,
      desc: b.role,
      meta: 'Choose this barber',
      selected: state.barberId === b.id
    }));
  });
}

function renderServices() {
  clearChildren(els.serviceOptions);
  SERVICES.forEach(s => {
    els.serviceOptions.appendChild(choiceButton({
      key: s.id,
      name: s.name,
      desc: s.desc,
      meta: `${money(s.price)} · ${durationLabel(s.duration)}`,
      selected: state.serviceId === s.id
    }));
  });
}

function normalizeAddons() {
  state.addons = state.addons.filter(id => ADDONS.some(a => a.id === id) && id !== state.serviceId);
}

function renderAddons() {
  clearChildren(els.addonOptions);
  ADDONS.filter(a => a.id !== state.serviceId).forEach(a => {
    const label = document.createElement('label');
    label.className = 'addon';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'addons';
    input.value = a.id;
    input.checked = state.addons.includes(a.id);
    const text = document.createElement('span');
    text.textContent = `${a.name} +${money(a.price)} · ${durationLabel(a.duration)}`;
    label.append(input, text);
    els.addonOptions.appendChild(label);
  });
}

function renderDates() {
  clearChildren(els.dateOptions);
  const dates = nextDates();
  if (state.date && !dates.some(d => d.key === state.date)) state.date = null;
  dates.forEach(item => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `date${state.date === item.key ? ' is-selected' : ''}${item.closed ? ' is-closed' : ''}`;
    btn.dataset.date = item.key;
    btn.disabled = item.closed;
    btn.setAttribute('aria-pressed', state.date === item.key ? 'true' : 'false');
    btn.setAttribute('aria-label', `${formatFullDate(item.key)}${item.closed ? ', closed' : ''}`);

    const dow = document.createElement('span');
    dow.className = 'date__dow';
    dow.textContent = new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(item.date).replace('.', '');
    const day = document.createElement('span');
    day.className = 'date__day';
    day.textContent = pad(item.date.getDate());
    const mon = document.createElement('span');
    mon.className = 'date__mon';
    mon.textContent = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(item.date).replace('.', '');
    btn.append(dow, day, mon);
    els.dateOptions.appendChild(btn);
  });
}

function renderTimes() {
  clearChildren(els.timeOptions);
  setError(els.timeError, '');
  els.assignedNote.hidden = true;
  els.timeEmpty.hidden = true;

  if (!state.date) {
    els.timeEmpty.textContent = 'Choose a date to see available times.';
    els.timeEmpty.hidden = false;
    return;
  }
  const duration = selectedDuration();
  if (!duration) {
    els.timeEmpty.textContent = 'Choose a service to see available times.';
    els.timeEmpty.hidden = false;
    return;
  }

  if (state.time) {
    const stillFree = state.barberId === 'any'
      ? availableBarbers(state.date, state.time, duration).length > 0
      : isAvailable(state.barberId, state.date, state.time, duration);
    if (!stillFree) {
      state.time = null;
      state.assignedBarberId = null;
      writeStore();
    }
  }

  let anyEnabled = false;

  for (let m = OPEN_MIN; m <= CLOSE_MIN - SLOT_MIN; m += SLOT_MIN) {
    const time = minToTime(m);
    const available = availableBarbers(state.date, time, duration);
    const usable = state.barberId === 'any'
      ? available.length > 0
      : available.some(b => b.id === state.barberId);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `time${state.time === time ? ' is-selected' : ''}`;
    btn.dataset.time = time;
    btn.textContent = time;
    btn.disabled = !usable;
    btn.setAttribute('aria-pressed', state.time === time ? 'true' : 'false');
    if (!usable) btn.setAttribute('aria-label', `${time}, unavailable`);
    if (usable) anyEnabled = true;
    els.timeOptions.appendChild(btn);
  }

  if (state.barberId === 'any' && state.time) {
    const assigned = firstAvailableBarber(state.date, state.time, duration);
    state.assignedBarberId = assigned ? assigned.id : null;
    if (assigned) {
      els.assignedNote.textContent = `Appointment with ${assigned.short} — first available.`;
      els.assignedNote.hidden = false;
    }
  } else {
    state.assignedBarberId = null;
  }

  if (!anyEnabled) {
    els.timeEmpty.textContent = 'No times available for this service that day. Try another date or barber.';
    els.timeEmpty.hidden = false;
  }
}

function addReviewRow(dl, label, value) {
  const row = document.createElement('div');
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = label;
  dd.textContent = value;
  row.append(dt, dd);
  dl.appendChild(row);
}

function reviewData() {
  const svc = getService(state.serviceId);
  const addons = selectedAddons();
  const barberId = state.barberId === 'any'
    ? (state.assignedBarberId || (state.date && state.time ? (firstAvailableBarber(state.date, state.time, selectedDuration()) || {}).id : null))
    : state.barberId;
  return {
    barberId,
    barber: barberLabel(barberId),
    service: svc ? svc.name : '—',
    addons: addons.length ? addons.map(a => a.name).join(', ') : 'None',
    date: state.date ? formatFullDate(state.date) : '—',
    time: state.time || '—',
    duration: selectedDuration(),
    total: selectedTotal(),
    name: state.name.trim(),
    phone: state.phone
  };
}

function fillReview(dl, data) {
  clearChildren(dl);
  addReviewRow(dl, 'Barber', data.barber);
  addReviewRow(dl, 'Service', data.service);
  if (data.addons !== 'None') addReviewRow(dl, 'Extras', data.addons);
  addReviewRow(dl, 'Date', data.date);
  addReviewRow(dl, 'Time', `${data.time} · ${durationLabel(data.duration)}`);
  addReviewRow(dl, 'Total', money(data.total));
  addReviewRow(dl, 'Name', data.name || '—');
  addReviewRow(dl, 'UK mobile', data.phone || '—');
}

function renderReview() {
  fillReview(els.review, reviewData());
}

function whatsappMessage(booking) {
  return [
    'Demo confirmation — Bramble & Blade. This message has not been sent.',
    '',
    `Name: ${booking.name}`,
    `Barber: ${barberLabel(booking.barberId)}`,
    `Service: ${booking.service}${booking.addons.length ? ` + ${booking.addons.map(a => getAddon(a).name).join(', ')}` : ''}`,
    `Date: ${formatFullDate(booking.date)}`,
    `Time: ${booking.time} London time (${durationLabel(booking.duration)})`,
    `Total: ${money(booking.total)}`,
    '',
    'Portfolio preview only — no real appointment has been made.'
  ].join('\n');
}

function showSuccess(booking) {
  const data = {
    barber: barberLabel(booking.barberId),
    service: booking.service,
    addons: booking.addons.length ? booking.addons.map(a => getAddon(a).name).join(', ') : 'None',
    date: formatFullDate(booking.date),
    time: booking.time,
    duration: booking.duration,
    total: booking.total,
    name: booking.name,
    phone: booking.phone
  };
  fillReview(els.successReview, data);
  els.successName.textContent = booking.name.split(/\s+/)[0] || 'friend';
  $('#message-preview').textContent = whatsappMessage(booking);
  $('#message-preview').hidden = true;
  els.whatsapp.setAttribute('aria-expanded', 'false');
  els.form.hidden = true;
  els.success.hidden = false;
  els.booking.classList.add('is-complete');
  writeStore();
  els.booking.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const title = $('.success__title', els.success);
  if (title) {
    title.setAttribute('tabindex', '-1');
    title.focus({ preventScroll: true });
  }
}

function goToStep(n, opts = {}) {
  const step = Math.max(1, Math.min(5, n));
  state.step = step;
  $$('.step', els.form).forEach(section => {
    const active = Number(section.dataset.step) === step;
    section.hidden = !active;
    section.classList.toggle('is-active', active);
  });
  $$('[data-step-dot]').forEach(dot => {
    const value = Number(dot.dataset.stepDot);
    dot.classList.toggle('is-active', value === step);
    dot.classList.toggle('is-done', value < step);
  });
  els.status.textContent = `Step ${step} of 5 · ${STEP_NAMES[step - 1]}`;
  if (step === 5) renderReview();
  writeStore();
  if (opts.scroll) els.booking.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (opts.focus !== false) {
    const heading = $(`.step[data-step="${step}"] .step__title`, els.form);
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }
}

function validateStep(step) {
  if (step === 1) {
    setError(els.barberError, state.barberId ? '' : 'Choose a barber to continue.');
    return Boolean(state.barberId);
  }
  if (step === 2) {
    setError(els.serviceError, state.serviceId ? '' : 'Choose a service to continue.');
    return Boolean(state.serviceId);
  }
  if (step === 3) {
    setError(els.dateError, state.date ? '' : 'Choose a date to see available times.');
    const free = state.date && state.time && state.barberId && isAvailable(state.barberId === 'any' ? (state.assignedBarberId || (firstAvailableBarber(state.date, state.time, selectedDuration()) || {}).id) : state.barberId, state.date, state.time, selectedDuration());
    if (state.date && state.time && !free) {
      setError(els.timeError, 'That time is no longer available. Please choose another.');
    } else {
      setError(els.timeError, state.time ? '' : 'Choose a time to continue.');
    }
    return Boolean(state.date && state.time && free);
  }
  if (step === 4) {
    const nameOk = state.name.trim().length >= 2;
    const phoneOk = isUkMobile(state.phone);
    setError(els.nameError, nameOk ? '' : 'Enter a name with at least 2 characters.');
    setError(els.phoneError, phoneOk ? '' : 'Enter a UK mobile number, such as 07700 900123 or +44 7700 900123.');
    setError(els.consentError, state.consent ? '' : 'Please tick the box to continue.');
    els.name.setAttribute('aria-invalid', nameOk ? 'false' : 'true');
    els.phone.setAttribute('aria-invalid', phoneOk ? 'false' : 'true');
    return nameOk && phoneOk && state.consent;
  }
  return true;
}
function uid() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  return `bk-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
function resetState() {
  state.step = 1;
  state.barberId = null;
  state.serviceId = null;
  state.addons = [];
  state.date = null;
  state.time = null;
  state.name = '';
  state.phone = '';
  state.consent = false;
  state.assignedBarberId = null;
}

function createBooking() {
  const svc = getService(state.serviceId);
  const duration = selectedDuration();
  const barberId = state.barberId === 'any'
    ? (state.assignedBarberId || (firstAvailableBarber(state.date, state.time, duration) || {}).id)
    : state.barberId;

  const free = svc && barberId && state.date && state.time && isAvailable(barberId, state.date, state.time, duration);
  if (!free) {
    goToStep(3, { scroll: true, focus: false });
    renderTimes();
    setError(els.timeError, 'That time has just been taken. Please choose another.');
    return;
  }

  const booking = {
    id: uid(),
    barberId,
    serviceId: svc.id,
    service: svc.name,
    addons: state.addons.slice(),
    date: state.date,
    time: state.time,
    duration,
    total: selectedTotal(),
    name: state.name.trim(),
    phone: state.phone,
    createdAt: new Date().toISOString()
  };

  savedBookings.push(booking);
  currentBooking = booking;
  resetState();
  writeStore();
  showSuccess(booking);
}

function resetBookingUI() {
  els.form.hidden = false;
  els.success.hidden = true;
  els.booking.classList.remove('is-complete');
  resetState();
}

function handleCancel() {
  if (currentBooking) {
    savedBookings = savedBookings.filter(b => b.id !== currentBooking.id);
    currentBooking = null;
    writeStore();
  }
  resetBookingUI();
  renderAll();
  goToStep(1, { focus: false, scroll: true });
  els.status.textContent = 'Demo booking cancelled. You can make another whenever you like.';
  writeStore();
}

function handleNewBooking() {
  currentBooking = null;
  resetBookingUI();
  renderAll();
  goToStep(1, { focus: false, scroll: true });
  els.status.textContent = 'New booking · start by choosing a barber.';
}

function restore() {
  const store = readStore();
  savedBookings = store.bookings.filter(b => b && b.id && b.barberId && b.date && b.time);
  const d = store.draft;
  if (!d) return;

  if (d.barberId === 'any' || getBarber(d.barberId)) state.barberId = d.barberId;
  if (getService(d.serviceId)) state.serviceId = d.serviceId;
  if (Array.isArray(d.addons)) {
    state.addons = d.addons.filter(id => getAddon(id) && id !== state.serviceId);
  }
  if (typeof d.date === 'string' && nextDates().some(x => x.key === d.date && !x.closed)) state.date = d.date;
  if (typeof d.time === 'string' && /^\d{2}:\d{2}$/.test(d.time)) state.time = d.time;
  if (typeof d.name === 'string') state.name = d.name.slice(0, 60);
  if (typeof d.phone === 'string') state.phone = formatPhone(d.phone);
  state.consent = Boolean(d.consent);

  let step = Number(d.step) || 1;
  if (!state.barberId) {
    step = 1;
  } else if (!state.serviceId) {
    step = Math.min(step, 2);
  } else if (!state.date || !state.time) {
    step = Math.min(step, 3);
  } else {
    const bid = state.barberId === 'any'
      ? (firstAvailableBarber(state.date, state.time, selectedDuration()) || {}).id
      : state.barberId;
    if (!bid || !isAvailable(bid, state.date, state.time, selectedDuration())) {
      state.time = null;
      state.assignedBarberId = null;
      step = Math.min(step, 3);
    } else {
      const complete = state.name.trim().length >= 2 && isUkMobile(state.phone) && state.consent;
      if (!complete) step = Math.min(step, 4);
    }
  }
  state.step = Math.max(1, Math.min(5, step));
}

function renderAll() {
  renderBarbers();
  renderServices();
  normalizeAddons();
  renderAddons();
  renderDates();
  renderTimes();
  els.name.value = state.name;
  els.phone.value = state.phone;
  els.consent.checked = state.consent;
  setError(els.barberError, '');
  setError(els.serviceError, '');
  setError(els.dateError, '');
  setError(els.nameError, '');
  setError(els.phoneError, '');
  setError(els.consentError, '');
  if (state.step === 5) renderReview();
}

function wireBooking() {
  els.form.addEventListener('click', event => {
    const barberBtn = event.target.closest('#barber-options .choice');
    const serviceBtn = event.target.closest('#service-options .choice');
    const dateBtn = event.target.closest('#date-options .date');
    const timeBtn = event.target.closest('#time-options .time');
    const nextBtn = event.target.closest('[data-next]');
    const backBtn = event.target.closest('[data-back]');

    if (barberBtn) {
      const key = barberBtn.dataset.key;
      if (state.barberId !== key) {
        state.barberId = key;
        state.time = null;
        state.assignedBarberId = null;
        renderBarbers();
        renderTimes();
        setError(els.barberError, '');
        writeStore();
      }
      return;
    }
    if (serviceBtn) {
      const key = serviceBtn.dataset.key;
      if (state.serviceId !== key) {
        state.serviceId = key;
        state.time = null;
        state.assignedBarberId = null;
        normalizeAddons();
        renderServices();
        renderAddons();
        renderTimes();
        setError(els.serviceError, '');
        writeStore();
      }
      return;
    }
    if (dateBtn) {
      if (dateBtn.disabled) return;
      const key = dateBtn.dataset.date;
      if (state.date !== key) {
        state.date = key;
        state.time = null;
        state.assignedBarberId = null;
        renderDates();
        renderTimes();
        setError(els.dateError, '');
        writeStore();
      }
      return;
    }
    if (timeBtn) {
      if (timeBtn.disabled) return;
      state.time = timeBtn.dataset.time;
      renderTimes();
      writeStore();
      return;
    }
    if (nextBtn) {
      const step = state.step;
      if (validateStep(step) && step < 5) goToStep(step + 1, { scroll: true });
      return;
    }
    if (backBtn) {
      goToStep(state.step - 1, { scroll: true });
    }
  });

  const setupRadioKeys = container => {
    container.addEventListener('keydown', event => {
      const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      const items = $$('.choice', container);
      const current = items.indexOf(document.activeElement);
      if (current < 0) return;
      event.preventDefault();
      let next;
      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = items.length - 1;
      else {
        const dir = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
        next = (current + dir + items.length) % items.length;
      }
      const key = items[next].dataset.key;
      items[next].click();
      const restored = $(`.choice[data-key="${key}"]`, container);
      if (restored) restored.focus();
    });
  };
  setupRadioKeys(els.barberOptions);
  setupRadioKeys(els.serviceOptions);

  els.addonOptions.addEventListener('change', event => {
    const input = event.target.closest('input[name="addons"]');
    if (!input) return;
    state.addons = $$('input[name="addons"]:checked', els.addonOptions).map(i => i.value);
    state.time = null;
    state.assignedBarberId = null;
    renderTimes();
    writeStore();
  });

  els.name.addEventListener('input', () => {
    state.name = els.name.value;
    if (state.name.trim().length >= 2) setError(els.nameError, '');
    writeStore();
  });
  els.phone.addEventListener('input', () => {
    els.phone.value = formatPhone(els.phone.value);
    state.phone = els.phone.value;
    if (isUkMobile(state.phone)) setError(els.phoneError, '');
    writeStore();
  });
  els.consent.addEventListener('change', () => {
    state.consent = els.consent.checked;
    if (state.consent) setError(els.consentError, '');
    writeStore();
  });

  els.form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 5) return;
    if (!validateStep(1)) { goToStep(1, { scroll: true }); return; }
    if (!validateStep(2)) { goToStep(2, { scroll: true }); return; }
    if (!validateStep(3)) { goToStep(3, { scroll: true }); renderTimes(); return; }
    if (!validateStep(4)) { goToStep(4, { scroll: true }); return; }
    createBooking();
  });

  els.cancel.addEventListener('click', handleCancel);
  els.newBooking.addEventListener('click', handleNewBooking);
  els.whatsapp.addEventListener('click', () => {
    const preview = $('#message-preview');
    preview.hidden = !preview.hidden;
    els.whatsapp.setAttribute('aria-expanded', String(!preview.hidden));
  });

  document.addEventListener('click', event => {
    const shortcut = event.target.closest('[data-barber-shortcut]');
    if (!shortcut) return;
    event.preventDefault();
    if (els.booking.classList.contains('is-complete')) {
      currentBooking = null;
      resetBookingUI();
      renderAll();
    }
    state.barberId = shortcut.dataset.barberShortcut;
    state.time = null;
    state.assignedBarberId = null;
    renderBarbers();
    renderTimes();
    goToStep(2, { scroll: true });
  });
}

function setupMenu() {
  const menuBtn = $('.menu-btn');
  const nav = $('#menu-principal');
  if (!menuBtn || !nav) return;
  const close = () => {
    nav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  };
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  nav.addEventListener('click', event => { if (event.target.closest('a')) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 760) close(); });
}

function setupLightbox() {
  const dialog = $('#lightbox');
  const frame = $('#lightbox-frame');
  const closeBtn = $('#lightbox-close');
  const caption = $('#lightbox-title');
  if (!dialog || !frame) return;

  const closeDialog = () => {
    if (typeof dialog.close === 'function') dialog.close();
    else {
      dialog.removeAttribute('open');
      document.documentElement.classList.remove('no-scroll');
    }
  };

  $$('.shot').forEach(btn => {
    btn.addEventListener('click', () => {
      const src = btn.dataset.lightboxSrc || '';
      const title = btn.dataset.lightboxTitle || 'Gallery';
      clearChildren(frame);
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = title;
        frame.appendChild(img);
      } else {
        const plate = btn.querySelector('.plate__big');
        const wrap = document.createElement('div');
        wrap.className = 'lightbox__placeholder';
        const num = document.createElement('strong');
        num.textContent = plate ? plate.textContent : '—';
        const note = document.createElement('span');
        note.textContent = 'Placeholder image';
        wrap.append(num, note);
        frame.appendChild(wrap);
      }
      caption.textContent = title;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      document.documentElement.classList.add('no-scroll');
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeDialog);
  dialog.addEventListener('close', () => document.documentElement.classList.remove('no-scroll'));
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(); });
}

function setupReveal() {
  const items = $$('.reveal');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || reduced) {
    items.forEach(item => item.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px' });
  items.forEach(item => observer.observe(item));
}

function setupScrollUI() {
  const header = document.querySelector('.site-header');
  const bar = document.getElementById('progress-bar');
  let lastY = window.scrollY;
  let ticking = false;

  function update() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    if (header) {
      header.classList.toggle('is-scrolled', y > 24);
      header.classList.toggle('is-hidden', y > 320 && y > lastY);
      if (y <= 320) header.classList.remove('is-hidden');
    }
    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

function init() {
  restore();
  renderAll();
  wireBooking();
  setupMenu();
  setupLightbox();
  setupReveal();
  setupScrollUI();
  goToStep(state.step, { focus: false });
}

init();


