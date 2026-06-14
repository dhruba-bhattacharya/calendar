const categories = ['anime', 'movies', 'shows', 'personal', 'work'];
const views = ['month', 'week', 'multi-month', 'year'];
const defaultSettings = { accent: '#7c5cff', weekStart: 0, density: 'cozy', glow: 60, showWeekends: true, showEventImages: true };
const storedState = JSON.parse(localStorage.calendarState || 'null');
const state = storedState || {
  date: new Date().toISOString(), view: 'month', eventsOnly: false, selected: localIso(new Date()),
  filters: categories, settings: defaultSettings, events: seedEvents(), layout: ['side', 'calendar', 'details']
};
state.settings = { ...defaultSettings, ...state.settings };
state.filters = state.filters?.length ? state.filters : categories;

const $ = (id) => document.getElementById(id);
const save = () => localStorage.calendarState = JSON.stringify(state);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmt = (d, opts) => new Intl.DateTimeFormat(undefined, opts).format(d);
const parseDate = (value) => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day); };
function localIso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function seedEvents() { return [{ id: crypto.randomUUID(), title: 'Sample anime premiere', category: 'anime', date: localIso(new Date()), time: '20:00', notes: 'Click any date or use + to add more.', showImage: false }]; }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }

function occurrences(event) {
  const out = [];
  const start = parseDate(event.date);
  const step = Number(event.repeat || 0);
  const max = Number(event.count) || (event.endDate ? 500 : 1);
  const end = event.endDate ? addDays(parseDate(event.endDate), 1) : null;
  for (let i = 0; i < max; i++) {
    const d = addDays(start, step * i);
    if (!step && i > 0) break;
    if (end && d >= end) break;
    out.push({ ...event, occurrenceDate: localIso(d), episode: step ? i + 1 : null });
  }
  return out;
}
function allOccurrences() {
  const query = $('searchInput').value.trim().toLowerCase();
  return state.events.flatMap(occurrences)
    .filter((e) => state.filters.includes(e.category))
    .filter((e) => !query || `${e.title} ${e.notes || ''}`.toLowerCase().includes(query));
}
function applySettings() {
  document.documentElement.style.setProperty('--accent', state.settings.accent);
  document.documentElement.style.setProperty('--glow', state.settings.glow);
  document.body.className = state.settings.density;
}
function orderedWeekdays() { return Array.from({ length: 7 }, (_, i) => (i + Number(state.settings.weekStart)) % 7).filter((d) => state.settings.showWeekends || ![0, 6].includes(d)); }
function render() { applySettings(); save(); renderControls(); renderCalendar(); renderAgenda(); renderSelected(); }
function renderControls() {
  $('viewButtons').innerHTML = views.map((v) => `<button class="${state.view === v ? 'active' : ''}" data-view="${v}">${v.replace('-', ' ')}</button>`).join('');
  $('categoryFilters').innerHTML = categories.map((c) => `<button class="chip ${state.filters.includes(c) ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('');
  $('rangeTitle').textContent = title();
  $('eventsOnlyBtn').classList.toggle('toggled', state.eventsOnly);
}
function title() { const d = new Date(state.date); if (state.view === 'year') return d.getFullYear(); if (state.view === 'week') return `Week of ${fmt(startOfWeek(d), { month: 'short', day: 'numeric' })}`; return fmt(d, { month: 'long', year: 'numeric' }); }
function startOfWeek(d) { const x = new Date(d); const diff = (x.getDay() - Number(state.settings.weekStart) + 7) % 7; return addDays(x, -diff); }
function renderCalendar() {
  const grid = $('calendarGrid');
  const weekdays = orderedWeekdays();
  if (state.view === 'year' || state.view === 'multi-month') {
    const months = state.view === 'year' ? 12 : 4;
    const base = new Date(state.date);
    const start = state.view === 'year' ? new Date(base.getFullYear(), 0, 1) : new Date(base.getFullYear(), base.getMonth(), 1);
    grid.style.gridTemplateColumns = 'repeat(auto-fit,minmax(210px,1fr))';
    grid.innerHTML = Array.from({ length: months }, (_, i) => miniMonth(new Date(start.getFullYear(), start.getMonth() + i, 1))).join('');
    return;
  }
  grid.style.gridTemplateColumns = `repeat(${weekdays.length},1fr)`;
  const cells = weekdays.map((d) => `<div class="weekday">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]}</div>`);
  const active = new Date(state.date);
  const base = state.view === 'week' ? startOfWeek(active) : new Date(active.getFullYear(), active.getMonth(), 1);
  const start = state.view === 'week' ? base : startOfWeek(base);
  const count = state.view === 'week' ? 7 : 42;
  for (let i = 0; i < count; i++) {
    const day = addDays(start, i);
    if (!weekdays.includes(day.getDay())) continue;
    const dayEvents = allOccurrences().filter((e) => e.occurrenceDate === localIso(day));
    if (state.eventsOnly && !dayEvents.length) continue;
    cells.push(dayCell(day, dayEvents));
  }
  grid.innerHTML = cells.join('');
}
function dayCell(day, events) {
  const current = new Date(state.date);
  const date = localIso(day);
  return `<div class="day ${day.getMonth() !== current.getMonth() && state.view === 'month' ? 'other' : ''} ${date === localIso(new Date()) ? 'today' : ''}" data-date="${date}"><div class="day-num"><span>${day.getDate()}</span><button data-add="${date}" title="Add event">＋</button></div>${events.slice(0, 5).map(eventPill).join('')}</div>`;
}
function eventPill(e) {
  const image = state.settings.showEventImages && e.showImage && e.image ? `<img class="event-thumb" src="${e.image}" alt="">` : '';
  return `<div class="pill ${e.category}" title="${escapeHtml(e.title)}">${image}<span>${e.time ? `${e.time} ` : ''}${e.episode ? `#${e.episode} ` : ''}${escapeHtml(e.title)}</span></div>`;
}
function miniMonth(d) { const events = allOccurrences(); const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); return `<div class="mini-month"><h3>${fmt(d, { month: 'short', year: 'numeric' })}</h3><div class="mini-grid">${Array.from({ length: days }, (_, i) => { const date = localIso(new Date(d.getFullYear(), d.getMonth(), i + 1)); return `<div class="mini-day ${events.some((e) => e.occurrenceDate === date) ? 'has-event' : ''}" data-date="${date}">${i + 1}</div>`; }).join('')}</div></div>`; }
function renderAgenda() { const upcoming = allOccurrences().filter((e) => e.occurrenceDate >= localIso(new Date())).sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate)).slice(0, 10); $('agendaList').innerHTML = upcoming.map((e) => `<div class="agenda-item"><b>${escapeHtml(e.title)}</b><br><span class="muted">${e.occurrenceDate} ${e.time || ''} · ${e.category}</span></div>`).join('') || '<p class="muted">No upcoming events.</p>'; }
function renderSelected() { const events = allOccurrences().filter((e) => e.occurrenceDate === state.selected); $('selectedDay').innerHTML = `<h3>${state.selected}</h3><button data-add="${state.selected}">Add on this date</button>${events.map((e) => `<div class="selected-event">${eventPill(e)}<p>${escapeHtml(e.notes || '')}</p></div>`).join('')}`; }
function openEvent(date = state.selected) { $('eventForm').reset(); $('imagePreview').innerHTML = ''; $('eventForm').date.value = date; $('eventForm').showImage.checked = true; $('eventDialog').showModal(); }
function shift(n) { const d = new Date(state.date); if (state.view === 'week') d.setDate(d.getDate() + 7 * n); else if (state.view === 'year') d.setFullYear(d.getFullYear() + n); else d.setMonth(d.getMonth() + n); state.date = d.toISOString(); render(); }
function fileToDataUrl(file) { return new Promise((resolve) => { if (!file) return resolve(''); const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); }); }

document.addEventListener('click', (e) => { const view = e.target.dataset.view, cat = e.target.dataset.cat, date = e.target.dataset.date, add = e.target.dataset.add; if (view) { state.view = view; render(); } if (cat) { state.filters = state.filters.includes(cat) ? state.filters.filter((c) => c !== cat) : [...state.filters, cat]; render(); } if (date) { state.selected = date; render(); } if (add) openEvent(add); });
$('addEventBtn').onclick = () => openEvent(); $('prevBtn').onclick = () => shift(-1); $('nextBtn').onclick = () => shift(1); $('todayBtn').onclick = () => { state.date = new Date().toISOString(); state.selected = localIso(new Date()); render(); }; $('eventsOnlyBtn').onclick = () => { state.eventsOnly = !state.eventsOnly; render(); }; $('searchInput').oninput = render;
$('settingsBtn').onclick = () => { $('settingsForm').accent.value = state.settings.accent; $('settingsForm').weekStart.value = state.settings.weekStart; $('settingsForm').density.value = state.settings.density; $('settingsForm').glow.value = state.settings.glow; $('settingsForm').showWeekends.checked = state.settings.showWeekends; $('settingsForm').showEventImages.checked = state.settings.showEventImages; $('settingsDialog').showModal(); };
$('settingsForm').onsubmit = (e) => { const f = new FormData(e.target); state.settings = { accent: f.get('accent'), weekStart: Number(f.get('weekStart')), density: f.get('density'), glow: f.get('glow'), showWeekends: f.has('showWeekends'), showEventImages: f.has('showEventImages') }; render(); };
$('eventForm').category.innerHTML = categories.map((c) => `<option>${c}</option>`).join(''); $('cancelDialog').onclick = () => $('eventDialog').close();
$('eventImage').onchange = () => { const file = $('eventImage').files[0]; $('imagePreview').textContent = file ? `Selected: ${file.name}` : ''; };
$('eventForm').onsubmit = async (e) => { e.preventDefault(); const f = new FormData(e.target); const image = await fileToDataUrl($('eventImage').files[0]); const event = { id: crypto.randomUUID(), title: f.get('title'), category: f.get('category'), date: f.get('date'), time: f.get('time'), repeat: f.get('repeat') === 'none' ? 0 : Number(f.get('repeat')), count: f.get('count'), endDate: f.get('endDate'), notes: f.get('notes'), image, showImage: f.has('showImage') }; state.events.push(event); state.date = parseDate(event.date).toISOString(); state.selected = event.date; $('eventDialog').close(); render(); };
let wallpaper = false; $('wallpaperBtn').onclick = async () => { wallpaper = !wallpaper; await window.calendarShell?.setWallpaperMode(wallpaper); $('wallpaperBtn').textContent = wallpaper ? 'Exit desktop mode' : 'Toggle desktop mode'; };
let drag; document.querySelectorAll('[draggable]').forEach((p) => { p.ondragstart = () => drag = p; p.ondragover = (e) => e.preventDefault(); p.ondrop = (e) => { e.preventDefault(); if (drag && drag !== p) { p.after(drag); state.layout = [...document.querySelectorAll('[data-module]')].map((x) => x.dataset.module); save(); } }; });
state.layout.forEach((m) => { const el = document.querySelector(`[data-module="${m}"]`); if (el) $('app').appendChild(el); }); render();
