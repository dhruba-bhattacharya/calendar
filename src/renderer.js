const categories = ['anime', 'movies', 'shows', 'personal', 'work'];
const views = ['month', 'week', 'multi-month', 'year'];
const state = JSON.parse(localStorage.calendarState || 'null') || {
  date: new Date().toISOString(), view: 'month', eventsOnly: false, selected: new Date().toISOString().slice(0, 10),
  filters: categories, settings: { accent: '#7c5cff', weekStart: 0, density: 'cozy', glow: 60, showWeekends: true }, events: seedEvents(), layout: ['side', 'calendar', 'details']
};
const $ = (id) => document.getElementById(id);
const save = () => localStorage.calendarState = JSON.stringify(state);
const iso = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmt = (d, opts) => new Intl.DateTimeFormat(undefined, opts).format(d);

function seedEvents(){return [{id:crypto.randomUUID(),title:'Sample anime premiere',category:'anime',date:new Date().toISOString().slice(0,10),time:'20:00',notes:'Click any date or use + to add more.'}];}
function occurrences(event){
  const out=[]; const start=new Date(`${event.date}T00:00`); const step=Number(event.repeat||0); const max=Number(event.count)||500; const end=event.endDate?new Date(`${event.endDate}T23:59`):null;
  for(let i=0;i<max;i++){const d=addDays(start, step*i); if(!step&&i>0) break; if(end&&d>end) break; out.push({...event, occurrenceDate: iso(d), episode: step?i+1:null}); if(!end&&i>500) break;}
  return out;
}
function allOccurrences(){return state.events.flatMap(occurrences).filter(e=>state.filters.includes(e.category)).filter(e=>!$('searchInput').value || e.title.toLowerCase().includes($('searchInput').value.toLowerCase()));}
function applySettings(){document.documentElement.style.setProperty('--accent',state.settings.accent);document.documentElement.style.setProperty('--glow',state.settings.glow);document.body.className=state.settings.density;}
function orderedWeekdays(){return Array.from({length:7},(_,i)=>(i+Number(state.settings.weekStart))%7).filter(d=>state.settings.showWeekends||![0,6].includes(d));}
function render(){applySettings(); save(); renderControls(); renderCalendar(); renderAgenda(); renderSelected();}
function renderControls(){
  $('viewButtons').innerHTML=views.map(v=>`<button class="${state.view===v?'active':''}" data-view="${v}">${v.replace('-',' ')}</button>`).join('');
  $('categoryFilters').innerHTML=categories.map(c=>`<button class="chip ${state.filters.includes(c)?'active':''}" data-cat="${c}">${c}</button>`).join('');
  $('rangeTitle').textContent=title(); $('eventsOnlyBtn').classList.toggle('toggled',state.eventsOnly);
}
function title(){const d=new Date(state.date); if(state.view==='year') return d.getFullYear(); if(state.view==='week') return `Week of ${fmt(startOfWeek(d),{month:'short',day:'numeric'})}`; return fmt(d,{month:'long',year:'numeric'});}
function startOfWeek(d){const x=new Date(d); const diff=(x.getDay()-Number(state.settings.weekStart)+7)%7; return addDays(x,-diff);}
function renderCalendar(){
  const grid=$('calendarGrid'); const weekdays=orderedWeekdays();
  if(state.view==='year'||state.view==='multi-month'){const months=state.view==='year'?12:4; const base=new Date(state.date); const start=state.view==='year'?new Date(base.getFullYear(),0,1):new Date(base.getFullYear(),base.getMonth(),1); grid.style.gridTemplateColumns='repeat(auto-fit,minmax(210px,1fr))'; grid.innerHTML=Array.from({length:months},(_,i)=>miniMonth(new Date(start.getFullYear(),start.getMonth()+i,1))).join(''); return;}
  grid.style.gridTemplateColumns=`repeat(${weekdays.length},1fr)`; const cells=[]; weekdays.forEach(d=>cells.push(`<div class="weekday">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]}</div>`));
  const base=state.view==='week'?startOfWeek(new Date(state.date)):new Date(new Date(state.date).getFullYear(),new Date(state.date).getMonth(),1); let start=state.view==='week'?base:startOfWeek(base); const count=state.view==='week'?7:42;
  for(let i=0;i<count;i++){const day=addDays(start,i); if(!weekdays.includes(day.getDay())) continue; const dayEvents=allOccurrences().filter(e=>e.occurrenceDate===iso(day)); if(state.eventsOnly&&!dayEvents.length) continue; cells.push(dayCell(day, dayEvents));}
  grid.innerHTML=cells.join('');
}
function dayCell(day, events){const current=new Date(state.date); return `<div class="day ${day.getMonth()!==current.getMonth()&&state.view==='month'?'other':''} ${iso(day)===iso(new Date())?'today':''}" data-date="${iso(day)}"><div class="day-num"><span>${day.getDate()}</span><button data-add="${iso(day)}">＋</button></div>${events.slice(0,5).map(eventPill).join('')}</div>`;}
function eventPill(e){return `<div class="pill ${e.category}" title="${e.title}">${e.time?e.time+' ':''}${e.episode?'#'+e.episode+' ':''}${e.title}</div>`;}
function miniMonth(d){const events=allOccurrences(); const days=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); return `<div class="mini-month"><h3>${fmt(d,{month:'short',year:'numeric'})}</h3><div class="mini-grid">${Array.from({length:days},(_,i)=>{const date=iso(new Date(d.getFullYear(),d.getMonth(),i+1));return `<div class="mini-day ${events.some(e=>e.occurrenceDate===date)?'has-event':''}" data-date="${date}">${i+1}</div>`}).join('')}</div></div>`;}
function renderAgenda(){const upcoming=allOccurrences().filter(e=>e.occurrenceDate>=iso(new Date())).sort((a,b)=>a.occurrenceDate.localeCompare(b.occurrenceDate)).slice(0,10); $('agendaList').innerHTML=upcoming.map(e=>`<div class="agenda-item"><b>${e.title}</b><br><span class="muted">${e.occurrenceDate} ${e.time||''} · ${e.category}</span></div>`).join('')||'<p class="muted">No upcoming events.</p>';}
function renderSelected(){const events=allOccurrences().filter(e=>e.occurrenceDate===state.selected); $('selectedDay').innerHTML=`<h3>${state.selected}</h3><button data-add="${state.selected}">Add on this date</button>${events.map(e=>`<div class="selected-event">${eventPill(e)}<p>${e.notes||''}</p></div>`).join('')}`;}
function openEvent(date=state.selected){$('eventForm').reset(); $('eventForm').date.value=date; $('eventDialog').showModal();}
function shift(n){const d=new Date(state.date); if(state.view==='week') d.setDate(d.getDate()+7*n); else if(state.view==='year') d.setFullYear(d.getFullYear()+n); else d.setMonth(d.getMonth()+n); state.date=d.toISOString(); render();}

document.addEventListener('click', e=>{const view=e.target.dataset.view, cat=e.target.dataset.cat, date=e.target.dataset.date, add=e.target.dataset.add; if(view){state.view=view; render();} if(cat){state.filters=state.filters.includes(cat)?state.filters.filter(c=>c!==cat):[...state.filters,cat]; render();} if(date){state.selected=date; render();} if(add) openEvent(add);});
$('addEventBtn').onclick=()=>openEvent(); $('prevBtn').onclick=()=>shift(-1); $('nextBtn').onclick=()=>shift(1); $('todayBtn').onclick=()=>{state.date=new Date().toISOString();state.selected=iso(new Date());render();}; $('eventsOnlyBtn').onclick=()=>{state.eventsOnly=!state.eventsOnly;render();}; $('searchInput').oninput=render;
$('settingsBtn').onclick=()=>{Object.assign($('settingsForm'),{}); $('settingsForm').accent.value=state.settings.accent; $('settingsForm').weekStart.value=state.settings.weekStart; $('settingsForm').density.value=state.settings.density; $('settingsForm').glow.value=state.settings.glow; $('settingsForm').showWeekends.checked=state.settings.showWeekends; $('settingsDialog').showModal();};
$('settingsForm').onsubmit=e=>{const f=new FormData(e.target); state.settings={accent:f.get('accent'),weekStart:Number(f.get('weekStart')),density:f.get('density'),glow:f.get('glow'),showWeekends:f.has('showWeekends')}; render();};
$('eventForm').category.innerHTML=categories.map(c=>`<option>${c}</option>`).join(''); $('cancelDialog').onclick=()=>$('eventDialog').close();
$('eventForm').onsubmit=e=>{const f=new FormData(e.target); state.events.push({id:crypto.randomUUID(),title:f.get('title'),category:f.get('category'),date:f.get('date'),time:f.get('time'),repeat:f.get('repeat')==='none'?0:Number(f.get('repeat')),count:f.get('count'),endDate:f.get('endDate'),notes:f.get('notes')}); render();};
let wallpaper=false; $('wallpaperBtn').onclick=async()=>{wallpaper=!wallpaper; await window.calendarShell?.setWallpaperMode(wallpaper); $('wallpaperBtn').textContent=wallpaper?'Exit desktop mode':'Toggle desktop mode';};
let drag; document.querySelectorAll('[draggable]').forEach(p=>{p.ondragstart=()=>drag=p; p.ondragover=e=>e.preventDefault(); p.ondrop=e=>{e.preventDefault(); if(drag&&drag!==p){p.after(drag); state.layout=[...document.querySelectorAll('[data-module]')].map(x=>x.dataset.module); save();}}});
state.layout.forEach(m=>{const el=document.querySelector(`[data-module="${m}"]`); if(el) $('app').appendChild(el);}); render();
