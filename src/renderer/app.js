'use strict';
const $ = (id) => document.getElementById(id);
let profiles = [];
let presets = {};
let st = { status: 'disconnected', ip: '', since: 0, profileId: null };
let pending = null; // { id, username, password, token, remember } during connect flow

const statusText = (s) => (s === 'connected' ? 'Povezan' : s === 'connecting' ? 'Povezivanje…' : s === 'error' ? 'Greška' : 'Nije povezano');
const statusClass = (s) => (s === 'connected' ? 'ok' : s === 'connecting' ? 'warn' : s === 'error' ? 'bad' : 'off');

function dur(since) {
  const s = Math.max(0, Math.floor((Date.now() - since) / 1000));
  const p = (n) => String(n).padStart(2, '0');
  return p(Math.floor(s / 3600)) + ':' + p(Math.floor((s % 3600) / 60)) + ':' + p(s % 60);
}

function render() {
  const list = $('list'); list.innerHTML = '';
  profiles.forEach((p) => {
    const active = (st.status === 'connected' || st.status === 'connecting');
    const scls = active ? statusClass(st.status) : 'off';
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML =
      '<span class="dot ' + (scls === 'off' ? '' : scls) + '"></span>' +
      '<div class="meta"><div class="nm"></div><div class="srv"></div><div class="st ' + scls + '"></div></div>' +
      '<div class="row-actions"></div>';
    card.querySelector('.nm').textContent = p.name;
    card.querySelector('.srv').textContent = p.url;
    card.querySelector('.st').textContent = (active ? statusText(st.status) : 'Nije povezano') + (active && st.ip ? ' • ' + st.ip : '');
    const acts = card.querySelector('.row-actions');
    const btn = document.createElement('button');
    if (active) { btn.className = 'btn danger'; btn.textContent = st.status === 'connecting' ? 'Prekini' : 'Disconnect'; btn.onclick = () => window.vpn.disconnect(); }
    else { btn.className = 'btn primary'; btn.textContent = 'Connect'; btn.onclick = () => startConnect(p.id); }
    acts.appendChild(btn);
    const edit = document.createElement('span'); edit.className = 'icn'; edit.textContent = '✎'; edit.title = 'Izmijeni'; edit.onclick = () => openEdit(p); acts.appendChild(edit);
    const del = document.createElement('span'); del.className = 'icn'; del.textContent = '🗑'; del.title = 'Obriši';
    del.onclick = async () => { if (confirm('Obrisati „' + p.name + '"?')) { profiles = await window.vpn.deleteProfile(p.id); render(); } };
    acts.appendChild(del);
    list.appendChild(card);
  });
  $('fdot').style.background = ({ connected: 'var(--ok)', connecting: 'var(--warn)', error: 'var(--bad)' })[st.status] || '#c2c6cf';
  let f = statusText(st.status);
  if (st.status === 'connected') { if (st.ip) f += ' • ' + st.ip; if (st.since) f += ' • ' + dur(st.since); }
  $('ftxt').textContent = f;
}

// ---------- connect flow ----------
async function startConnect(id) {
  const n = await window.vpn.needs(id);
  if (!n.ok) return;
  pending = { id, username: '', password: '', token: '', remember: false };
  if (n.needUser) { const u = prompt('VPN korisničko ime:'); if (!u) { pending = null; return; } pending.username = u; }
  if (n.needPass) { $('passTitle').textContent = 'Lozinka — ' + n.name; $('pPass').value = ''; $('pRemember').checked = false; show('ovPass'); focus('pPass'); }
  else if (n.need2fa) ask2fa();
  else doConnect();
}
function ask2fa() { $('tCode').value = ''; show('ov2fa'); focus('tCode'); }
async function doConnect() { const p = { ...pending }; hideAll(); await window.vpn.connect(p); pending = null; }

$('passOk').onclick = async () => {
  pending.password = $('pPass').value; pending.remember = $('pRemember').checked;
  const n = await window.vpn.needs(pending.id); hide('ovPass');
  if (n.need2fa) ask2fa(); else doConnect();
};
$('passCancel').onclick = () => { hide('ovPass'); pending = null; };
$('tfaOk').onclick = () => { pending.token = $('tCode').value; doConnect(); };
$('tfaCancel').onclick = () => { hideAll(); pending = null; };

// ---------- add / edit ----------
function fillPresetDropdown() {
  const sel = $('fPreset');
  sel.innerHTML = '<option value="">— ručno —</option>';
  Object.keys(presets).forEach((k) => { const o = document.createElement('option'); o.value = k; o.textContent = k; sel.appendChild(o); });
}
$('fPreset') && ($('fPreset').onchange = () => {
  const k = $('fPreset').value; if (!k || !presets[k]) return;
  const pr = presets[k];
  if (pr.url) $('fUrl').value = pr.url;
  if (pr.pin) $('fPin').value = pr.pin;
  if (pr.protocol) $('fProto').value = pr.protocol;
  $('f2fa').checked = !!pr.uses2fa;
  if (!$('fName').value) $('fName').value = k;
});

function openEdit(p) {
  const isNew = !p;
  fillPresetDropdown();
  $('fPreset').value = '';
  $('editTitle').textContent = isNew ? 'Dodaj konekciju' : 'Izmijeni konekciju';
  $('fId').value = isNew ? '' : p.id;
  $('fName').value = isNew ? '' : p.name;
  $('fUrl').value = isNew ? 'https://' : p.url;
  // prefill MJU cert pin by default on a new connection so it works out of the box
  $('fPin').value = isNew ? (presets['Ministarstvo (MJU)'] ? presets['Ministarstvo (MJU)'].pin : '') : (p.pin || '');
  $('fUser').value = isNew ? '' : (p.username || '');
  $('fProto').value = isNew ? 'pulse' : (p.protocol || 'pulse');
  $('fSave').checked = isNew ? false : !!p.savePass;
  $('fPass').value = '';
  $('f2fa').checked = isNew ? true : !!p.uses2fa;
  show('ovEdit'); focus('fName');
}
$('addBtn').onclick = () => openEdit(null);
$('editCancel').onclick = () => hide('ovEdit');
$('editSave').onclick = async () => {
  const p = {
    id: $('fId').value || undefined, name: $('fName').value.trim() || 'VPN',
    url: $('fUrl').value.trim(), pin: $('fPin').value.trim(), username: $('fUser').value.trim(),
    protocol: $('fProto').value.trim() || 'pulse', savePass: $('fSave').checked,
    password: $('fPass').value, uses2fa: $('f2fa').checked,
  };
  profiles = await window.vpn.saveProfile(p);
  hide('ovEdit'); render();
};

// ---------- modals + Enter/Esc ----------
function show(id) { $(id).style.display = 'flex'; }
function hide(id) { $(id).style.display = 'none'; }
function hideAll() { ['ovEdit', 'ovPass', 'ov2fa'].forEach(hide); }
function focus(id) { setTimeout(() => { const el = $(id); if (el) el.focus(); }, 50); }
// Enter submits the visible modal, Esc cancels.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== 'Escape') return;
  const map = [['ovPass', 'passOk', 'passCancel'], ['ov2fa', 'tfaOk', 'tfaCancel'], ['ovEdit', 'editSave', 'editCancel']];
  for (const [ov, ok, cancel] of map) {
    if ($(ov).style.display === 'flex') { e.preventDefault(); $(e.key === 'Enter' ? ok : cancel).click(); return; }
  }
});

// ---------- log ----------
$('logtgl').onclick = () => { const l = $('log'); l.style.display = l.style.display === 'block' ? 'none' : 'block'; };
window.vpn.onLog((line) => { const l = $('log'); l.textContent += line + '\n'; if (l.textContent.length > 60000) l.textContent = l.textContent.slice(-40000); l.scrollTop = l.scrollHeight; });

// ---------- state ----------
window.vpn.onState((s) => { st = s; render(); });
setInterval(() => { if (st.status === 'connected') render(); }, 1000);

(async () => {
  try { const info = await window.vpn.info(); $('subline').textContent = 'Electroinvest · ' + info.platform + '/' + info.arch + ' · ' + info.driver; } catch (e) {}
  try { presets = await window.vpn.presets(); } catch (e) { presets = {}; }
  profiles = await window.vpn.getProfiles();
  try { st = await window.vpn.getState(); } catch (e) {}
  render();
})();
