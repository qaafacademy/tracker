/* Qaaf Tracker – app core: API, state, helpers, shell, routing, sign-in */
(function () {
  'use strict';
  var CFG = window.QAAF_CONFIG || {};
  var DEMO = !!CFG.demo;
  var Q = window.Q = { CFG: CFG, DEMO: DEMO };

  /* ---------- constants ---------- */
  Q.STATUS = {
    NOT_STARTED: { label: 'Not started', color: 'var(--notstarted)' },
    IN_PROGRESS: { label: 'In progress', color: 'var(--purple)' },
    UNDER_REVIEW: { label: 'Under review', color: 'var(--review)' },
    BLOCKED: { label: 'Blocked', color: 'var(--coral)' },
    ON_HOLD: { label: 'On hold', color: 'var(--hold)' },
    COMPLETED: { label: 'Completed', color: 'var(--teal)' }
  };
  Q.STATUS_ORDER = ['NOT_STARTED', 'IN_PROGRESS', 'UNDER_REVIEW', 'BLOCKED', 'ON_HOLD', 'COMPLETED'];
  Q.PRIORITY = { P0: 'Critical', P1: 'High', P2: 'Medium', P3: 'Low', P4: 'Later' };
  Q.WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  Q.ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    mine: '<path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',
    tasks: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    board: '<rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="10" y="3" width="5" height="12" rx="1.5"/><rect x="17" y="3" width="4" height="8" rx="1.5"/>',
    deadlines: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
    meetings: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    team: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
    reports: '<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.4A9 9 0 0 1 20.6 9H15z"/>',
    admin: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    clip: '<path d="M21.4 11.1 12.2 20.3a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
    arrow: '<path d="m9 6 6 6-6 6"/>',
    back: '<path d="m15 6-6 6 6 6"/>',
    whatsapp: '<path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3.5 20.5l1.6-5.1A8.5 8.5 0 1 1 21 11.5z"/><path d="M8.6 9.3c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .6.5l.7 1.6c.1.2 0 .4-.1.5l-.4.5c-.1.2-.2.3 0 .6a6 6 0 0 0 2.6 2.2c.3.1.4 0 .6-.1l.5-.6c.2-.2.3-.1.5 0l1.5.8c.2.1.3.2.3.4a1.6 1.6 0 0 1-1.1 1.4c-.5.2-1.2.2-3.4-.8a8 8 0 0 1-3.3-3.4c-.7-1.3-.5-2.3-.1-3.1z"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'
  };
  Q.icon = function (k, extra) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + Q.ICONS[k] + '</svg>';
  };

  /* ---------- small helpers ---------- */
  Q.$ = function (s, el) { return (el || document).querySelector(s); };
  Q.$$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  Q.esc = function (s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  Q.store = {
    get: function (k) { try { return localStorage.getItem('qaaf.' + k); } catch (e) { return null; } },
    set: function (k, v) { try { if (v === null || v === undefined) localStorage.removeItem('qaaf.' + k); else localStorage.setItem('qaaf.' + k, v); } catch (e) { /* private mode */ } }
  };
  Q.toast = function (msg, isError) {
    var el = Q.$('#toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show' + (isError ? ' err' : '');
    clearTimeout(Q.toast._t);
    Q.toast._t = setTimeout(function () { el.className = 'toast' + (isError ? ' err' : ''); }, isError ? 4500 : 2600);
  };

  /* dates: server sends plain 'yyyy-mm-dd' strings in India time */
  Q.dayNum = function (s) { var p = String(s).split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]) / 864e5; };
  Q.today = function () { return (Q.S.data && Q.S.data.today) || Q.localDay(new Date()); };
  Q.localDay = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  Q.addDays = function (s, n) { return new Date((Q.dayNum(s) + n) * 864e5).toISOString().slice(0, 10); };
  Q.diff = function (s) { return Q.dayNum(s) - Q.dayNum(Q.today()); };
  Q.asDate = function (s) { var p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  Q.fmt = function (s) {
    if (!s) return '—';
    var d = Q.asDate(s), opts = { day: 'numeric', month: 'short' };
    if (s.slice(0, 4) !== Q.today().slice(0, 4)) opts.year = 'numeric';
    return d.toLocaleDateString('en-GB', opts);
  };
  Q.fmtLong = function (s) { return Q.asDate(s).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); };
  Q.isoDay = function (iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('en-CA', { timeZone: (Q.S.data && Q.S.data.settings.timezone) || 'Asia/Kolkata' }); }
    catch (e) { return String(iso).slice(0, 10); }
  };
  Q.ago = function (iso) {
    if (!iso) return '';
    var m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (isNaN(m)) return '';
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60);
    if (h < 24) return h + ' h ago';
    var d = Math.round(h / 24);
    if (d < 30) return d + ' day' + (d > 1 ? 's' : '') + ' ago';
    return Q.fmt(Q.isoDay(iso));
  };
  Q.time12 = function (t) {
    if (!t) return '';
    var p = String(t).split(':').map(Number);
    var h = p[0] % 12 || 12;
    return h + ':' + String(p[1]).padStart(2, '0') + (p[0] < 12 ? ' AM' : ' PM');
  };
  Q.bytes = function (n) { if (!n) return ''; if (n < 1024) return n + ' B'; if (n < 1048576) return Math.round(n / 1024) + ' KB'; return (n / 1048576).toFixed(1) + ' MB'; };

  /* ---------- API ---------- */
  function ApiError(message, code) { this.message = message; this.code = code; }
  ApiError.prototype = Object.create(Error.prototype);
  Q.ApiError = ApiError;

  /* The app talks to Apps Script with POST. Apps Script answers through a redirect, and
   * some browsers/networks turn the redirected POST into a GET, which used to fail. So the
   * same call can also be sent as GET parameters, and whichever way works is remembered. */
  var GET_LIMIT = 7000;      // hard limit for one address
  Q.GET_SAFE = 2000;         // bulk requests are split to stay well under it
  function parseReply(r, how) {
    if (!r.ok) { var e = new ApiError('The server did not respond (' + r.status + ').', 'HTTP'); e.http = r.status; e.how = how; throw e; }
    return r.json().catch(function () {
      var e = new ApiError('The server sent an unexpected reply. Check the API address in config.js.', 'HTTP'); e.how = how; throw e;
    }).then(function (res) {
      // A long address can be cut short on the way; the server then answers with its plain
      // status line instead of doing the work. Treat that as "never arrived" and try again.
      if (res && res.ok && res.data === undefined) {
        var e = new ApiError('The request did not reach the server. Please try again.', 'NOT_DELIVERED'); e.how = how; throw e;
      }
      return res;
    });
  }
  function sendPost(body) {
    return fetch(CFG.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' })
      .catch(function () { var e = new ApiError('Could not reach the server. Check your internet connection and try again.', 'NETWORK'); e.how = 'post'; throw e; })
      .then(function (r) { return parseReply(r, 'post'); });
  }
  function getUrl(body) {
    return CFG.apiUrl + (CFG.apiUrl.indexOf('?') < 0 ? '?' : '&') + 'action=' + encodeURIComponent(body.action) +
      '&session=' + encodeURIComponent(body.session || '') + '&payload=' + encodeURIComponent(JSON.stringify(body.payload || {})) +
      '&t=' + Date.now();
  }
  function sendGet(body) {
    var url = getUrl(body);
    if (url.length > GET_LIMIT) {
      var big = new ApiError('This is too large to send the way your browser is connecting. Try a smaller file, or open the tracker in Chrome.', 'TOO_BIG');
      return Promise.reject(big);
    }
    return fetch(url, { method: 'GET', redirect: 'follow' })
      .catch(function () { var e = new ApiError('Could not reach the server. Check your internet connection and try again.', 'NETWORK'); e.how = 'get'; throw e; })
      .then(function (r) { return parseReply(r, 'get'); });
  }

  Q.api = function (action, payload) {
    var body = { action: action, payload: payload || {}, session: Q.store.get('session') };
    var p;
    if (DEMO) {
      p = window.DemoBackend.call(body);
    } else if (!CFG.apiUrl) {
      p = Promise.reject(new ApiError('The API address is missing from config.js.', 'SETUP'));
    } else {
      var way = Q.store.get('transport');
      var first = way === 'get' ? sendGet : sendPost;
      var second = way === 'get' ? sendPost : sendGet;
      p = first(body).then(function (res) {
        if (!way) Q.store.set('transport', way === 'get' ? 'get' : 'post');
        return res;
      }).catch(function (e) {
        if (e.code === 'TOO_BIG' || e.code === 'SETUP') throw e;
        if (e.code === 'NOT_DELIVERED' && way) { throw e; }   // route is known good; do not send twice
        return second(body).then(function (res) {
          Q.store.set('transport', way === 'get' ? 'post' : 'get');
          return res;
        }).catch(function (e2) { throw (e2.code === 'NETWORK' ? e2 : e); });
      });
    }
    return p.then(function (res) {
      if (!res || typeof res.ok !== 'boolean') throw new ApiError('The server sent an unexpected reply. Check the API address in config.js.', 'HTTP');
      if (!res.ok) {
        if (res.code === 'AUTH' && action !== 'login') Q.signedOut(res.error);
        throw new ApiError(res.error, res.code);
      }
      return res.data;
    });
  };

  /** Run an API call with a busy button and error toast. Resolves to data or null. */
  Q.run = function (btn, action, payload, okMsg) {
    if (btn && btn.classList.contains('busy')) return Promise.resolve(null);
    if (btn) { btn.classList.add('busy'); btn.disabled = true; }
    return Q.api(action, payload).then(function (d) {
      if (okMsg) Q.toast(okMsg);
      return d;
    }).catch(function (e) {
      if (e.code !== 'AUTH') Q.toast(e.message || 'Something went wrong.', true);
      return null;
    }).then(function (d) {
      if (btn) { btn.classList.remove('busy'); btn.disabled = false; }
      return d;
    });
  };

  /* ---------- state ---------- */
  var S = Q.S = {
    data: null, view: 'dashboard', params: {},
    filters: { q: '', dept: '', owner: '', status: '', pri: '', due: '' },
    collapsed: {}, pipeDept: '', wsDept: 'all',
    reports: { period: '30', from: '', to: '', dept: '', person: '' },
    adminTab: 'people', meeting: null, drawer: null, selected: {}
  };

  Q.index = function () {
    var d = S.data, ix = {};
    ix.users = {}; d.users.forEach(function (u) { ix.users[u.id] = u; });
    ix.teams = {}; d.teams.forEach(function (t) { ix.teams[t.id] = t; });
    ix.depts = {}; d.departments.forEach(function (x) { ix.depts[x.id] = x; });
    ix.groups = {}; d.groups.forEach(function (g) { ix.groups[g.id] = g; });
    ix.stages = {}; d.stages.forEach(function (s) { (ix.stages[s.dept] = ix.stages[s.dept] || []).push(s); });
    ix.checklist = {}; d.checklist.forEach(function (c) { (ix.checklist[c.task] = ix.checklist[c.task] || []).push(c); });
    Object.keys(ix.checklist).forEach(function (k) { ix.checklist[k].sort(function (a, b) { return (a.order || 0) - (b.order || 0); }); });
    ix.userDepts = {}; d.userDepartments.forEach(function (x) { (ix.userDepts[x.user] = ix.userDepts[x.user] || []).push(x.dept); });
    ix.tasks = {}; d.tasks.forEach(function (t) { ix.tasks[t.id] = t; });
    ix.meetings = {}; d.meetings.forEach(function (m) { ix.meetings[m.id] = m; });
    Q.ix = ix;
    if (!S.pipeDept || !ix.stages[S.pipeDept]) S.pipeDept = Object.keys(ix.stages)[0] || '';
  };

  Q.me = function () { return S.data.me.id; };
  Q.isAdmin = function () { return !!S.data.isAdmin; };
  Q.user = function (id) { return Q.ix.users[id] || Q.ix.teams[id] || null; };
  Q.pname = function (id) { var u = Q.user(id); return u ? u.name : 'Unassigned'; };
  Q.members = function () { return S.data.users.filter(function (u) { return u.active && u.role !== 'ADMIN'; }); };
  Q.activeUsers = function () { return S.data.users.filter(function (u) { return u.active; }); };
  Q.tasks = function () { return S.data.tasks.filter(function (t) { return !t.archived; }); };
  Q.isOpen = function (t) { return t.status !== 'COMPLETED'; };
  Q.ownerIds = function (t) {
    if (t.ownerType === 'TEAM' && Q.ix.teams[t.owner]) return Q.ix.teams[t.owner].members;
    return t.owner ? [t.owner] : [];
  };
  Q.isMine = function (t) { return Q.ownerIds(t).indexOf(Q.me()) >= 0; };
  Q.canEdit = function (t) { return !t.archived && (Q.isAdmin() || t.createdBy === Q.me() || Q.isMine(t)); };
  Q.groupOf = function (t) { return Q.ix.groups[t.group] || { title: '—', wbs: '' }; };
  Q.deptOf = function (id) { return Q.ix.depts[id] || { name: '—', color: '#888' }; };
  Q.checklistOf = function (id) { return Q.ix.checklist[id] || []; };
  Q.pct = function (t) { return t.status === 'COMPLETED' ? 100 : (t.pct || 0); };
  Q.avgPct = function (list) { return list.length ? Math.round(list.reduce(function (s, t) { return s + Q.pct(t); }, 0) / list.length) : 0; };
  Q.updatedToday = function (t) { return Q.isoDay(t.lastUpdateAt) === Q.today(); };
  Q.dueInfo = function (t) {
    if (!Q.isOpen(t)) return { cls: '', text: t.completedAt ? 'Done ' + Q.fmt(Q.isoDay(t.completedAt)) : 'Done', rank: 99999 };
    if (!t.due) return { cls: '', text: 'No due date', rank: 99998 };
    var d = Q.diff(t.due);
    if (d < 0) return { cls: 'due-over', text: -d + ' day' + (d === -1 ? '' : 's') + ' overdue', rank: d };
    if (d === 0) return { cls: 'due-today', text: 'Due today', rank: 0 };
    if (d === 1) return { cls: 'due-today', text: 'Due tomorrow', rank: 1 };
    if (d <= 7) return { cls: 'due-soon', text: 'Due in ' + d + ' days', rank: d };
    return { cls: '', text: 'Due ' + Q.fmt(t.due), rank: d };
  };
  Q.isOverdue = function (t) { return Q.isOpen(t) && t.due && Q.diff(t.due) < 0; };

  /* ---------- small UI pieces ---------- */
  Q.av = function (id, size) {
    var u = Q.user(id);
    var cls = 'av' + (size ? ' ' + size : '');
    if (!u) return '<span class="' + cls + '" style="background:var(--notstarted)" aria-hidden="true">?</span>';
    var palette = ['#4A3D8F', '#F35A71', '#48B09A', '#B08A00', '#6E62B6', '#2E8C77', '#D63C55', '#7A70B0'];
    var n = 0; for (var i = 0; i < id.length; i++) n += id.charCodeAt(i);
    var color = u.members ? '#8E8BA0' : palette[n % palette.length];
    if (u.photo) return '<span class="' + cls + '" style="background-image:url(' + Q.esc(u.photo) + ')" title="' + Q.esc(u.name) + '" role="img" aria-label="' + Q.esc(u.name) + '"></span>';
    var init = u.name.split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
    return '<span class="' + cls + '" style="background:' + color + '" title="' + Q.esc(u.name) + '" aria-hidden="true">' + Q.esc(init) + '</span>';
  };
  Q.statusPill = function (s) { var x = Q.STATUS[s] || Q.STATUS.NOT_STARTED; return '<span class="pill"><i style="background:' + x.color + '"></i>' + x.label + '</span>'; };
  Q.priPill = function (p) { return '<span class="pri ' + p + '" title="' + (Q.PRIORITY[p] || '') + ' priority">' + p + '</span>'; };
  Q.duePill = function (t) { var d = Q.dueInfo(t); return '<span class="pill ' + d.cls + '">' + d.text + '</span>'; };
  Q.ring = function (pct, size, stroke, segs, color) {
    size = size || 132; stroke = stroke || 12;
    var r = (size - stroke) / 2, c = 2 * Math.PI * r, off = 0, arcs = '', half = size / 2;
    if (segs) {
      var total = segs.reduce(function (s, x) { return s + x.v; }, 0) || 1;
      segs.forEach(function (x) {
        if (!x.v) return;
        var len = c * x.v / total;
        arcs += '<circle cx="' + half + '" cy="' + half + '" r="' + r + '" fill="none" stroke="' + x.color + '" stroke-width="' + stroke + '" stroke-dasharray="' + len + ' ' + (c - len) + '" stroke-dashoffset="' + (-off) + '"><title>' + Q.esc(x.label) + ': ' + x.v + '</title></circle>';
        off += len;
      });
    } else if (pct > 0) {
      arcs = '<circle cx="' + half + '" cy="' + half + '" r="' + r + '" fill="none" stroke="' + (color || 'var(--teal)') + '" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + (c * pct / 100) + ' ' + c + '"/>';
    }
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="transform:rotate(-90deg)" aria-hidden="true"><circle cx="' + half + '" cy="' + half + '" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="' + stroke + '"/>' + arcs + '</svg>';
  };
  Q.minibar = function (t) {
    var done = !Q.isOpen(t), p = Q.pct(t);
    return '<div class="minibar"><div class="bar"><span style="width:' + p + '%;background:' + (done ? 'var(--teal)' : 'var(--purple)') + '"></span></div><small class="num">' + p + '%</small></div>';
  };
  Q.options = function (list, current, placeholder) {
    return (placeholder !== undefined ? '<option value="">' + Q.esc(placeholder) + '</option>' : '') +
      list.map(function (o) { return '<option value="' + Q.esc(o[0]) + '"' + (String(o[0]) === String(current) ? ' selected' : '') + '>' + Q.esc(o[1]) + '</option>'; }).join('');
  };
  /** owner choices: people first, then teams */
  Q.ownerOptions = function (current, withNone) {
    var people = Q.activeUsers().filter(function (u) { return u.role !== 'ADMIN' || u.id === current; }).map(function (u) {
      var load = Q.tasks().filter(function (t) { return Q.isOpen(t) && t.owner === u.id; }).length;
      return [u.id, u.name + ' – ' + load + ' open'];
    });
    var teams = S.data.teams.map(function (t) { return [t.id, t.name + ' (team)']; });
    return (withNone ? '<option value="">Unassigned</option>' : '') + Q.options(people.concat(teams), current);
  };

  /* ---------- modal / drawer plumbing ---------- */
  Q.openModal = function (html, wide) {
    Q.closeModal();
    var scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.id = 'm-scrim';
    var m = document.createElement('div'); m.className = 'modal' + (wide ? ' wide' : ''); m.id = 'modal';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'md-title');
    m.innerHTML = html;
    document.body.appendChild(scrim); document.body.appendChild(m);
    scrim.addEventListener('click', Q.closeModal);
    setTimeout(function () { var f = m.querySelector('[autofocus],input:not([type=hidden]),select,textarea'); if (f) f.focus(); }, 30);
    return m;
  };
  Q.closeModal = function () { ['modal', 'm-scrim'].forEach(function (id) { var el = document.getElementById(id); if (el) el.remove(); }); };
  Q.modalHead = function (title, sub) {
    return '<div class="md-h"><div>' + (sub ? '<div class="muted small">' + Q.esc(sub) + '</div>' : '') + '<h2 id="md-title">' + Q.esc(title) + '</h2></div>' +
      '<button class="icon-btn" data-act="closeModal" aria-label="Close">' + Q.icon('close') + '</button></div>';
  };

  /* ---------- navigation ---------- */
  Q.NAV = function () {
    var n = [['dashboard', 'Dashboard'], ['mine', 'My tasks'], ['tasks', 'All tasks'], ['board', 'Board'], ['deadlines', 'Deadlines'],
      ['meetings', 'Meetings'], ['team', 'Team'], ['reports', 'Reports']];
    if (Q.isAdmin()) n.push(['admin', 'Admin']);
    return n;
  };
  var TITLES = { dashboard: 'Dashboard', mine: 'My tasks', tasks: 'All tasks', board: 'Board', deadlines: 'Deadlines', meetings: 'Meetings',
    meeting: 'Meeting', team: 'Team', reports: 'Reports', admin: 'Admin' };

  Q.go = function (view, id) {
    var hash = '#/' + view + (id ? '/' + encodeURIComponent(id) : '');
    if (location.hash === hash) Q.route(); else location.hash = hash;
  };
  Q.route = function () {
    if (!S.data) return;
    var parts = location.hash.replace(/^#\/?/, '').split('/');
    var view = parts[0] || (Q.isAdmin() ? 'dashboard' : 'mine');
    if (!TITLES[view] || (view === 'admin' && !Q.isAdmin())) view = 'dashboard';
    S.view = view;
    S.params = { id: parts[1] ? decodeURIComponent(parts[1]) : '' };
    if (view === 'task' || parts[0] === 'task') { S.view = 'tasks'; }
    Q.closeSide();
    Q.render();
    var v = Q.$('#view'); if (v) v.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    if (parts[0] === 'task' && parts[1]) Q.openTask(decodeURIComponent(parts[1]));
  };
  window.addEventListener('hashchange', Q.route);

  /* ---------- shell ---------- */
  Q.shell = function () {
    var root = Q.$('#root');
    root.innerHTML =
      '<div class="app">' +
      '<aside class="side" id="side" aria-label="Main navigation">' +
      '<div class="brand"><img src="assets/logo-white.png" alt="Qaaf"><small>Tracker</small></div>' +
      '<nav class="nav" id="nav"></nav>' +
      '<button class="side-foot" data-act="profile" id="side-me"></button>' +
      '</aside>' +
      '<div class="main">' +
      (DEMO ? '<div class="offline" style="background:var(--gold-soft);color:var(--text)"><b>Preview:</b> this copy runs in your browser with sample dates and resets when reloaded. The real app saves to the Qaaf Google Sheet.</div>' : '') +
      '<div class="offline" id="offline" hidden>You are offline. Changes will fail until the connection is back.</div>' +
      '<header class="top">' +
      '<button class="icon-btn menu-btn" data-act="openSide" aria-label="Open menu">' + Q.icon('menu') + '</button>' +
      '<div class="search">' + Q.icon('search') + '<input id="q" type="search" placeholder="Search tasks" aria-label="Search tasks" autocomplete="off"><kbd>Ctrl K</kbd></div>' +
      '<div class="spacer"></div>' +
      '<button class="icon-btn" data-act="bell" id="bell" aria-label="Notifications">' + Q.icon('bell') + '<span class="badge" id="bell-count" hidden></span></button>' +
      '<button class="icon-btn" data-act="theme" aria-label="Switch light or dark mode" title="Light / dark">' + Q.icon('moon') + '</button>' +
      '<button class="btn primary newbtn" data-act="newTask">' + Q.icon('plus', ' width="16" height="16"') + 'New task</button>' +
      '</header>' +
      '<main class="view" id="view" tabindex="-1"></main>' +
      '</div></div>' +
      '<nav class="bottom-nav" id="bnav" aria-label="Mobile navigation"></nav>' +
      '<button class="fab" data-act="newTask" aria-label="New task">' + Q.icon('plus') + '</button>' +
      '<div class="toast" id="toast" role="status" aria-live="polite"></div>';
    Q.$('#q').addEventListener('input', function (e) {
      clearTimeout(Q._qt);
      var v = e.target.value;
      Q._qt = setTimeout(function () {
        S.filters.q = v;
        if (S.view !== 'tasks') Q.go('tasks'); else Q.render();
      }, 250);
    });
    Q.updateOnline();
  };

  Q.renderNav = function () {
    var mine = Q.tasks().filter(function (t) { return Q.isMine(t) && Q.isOverdue(t); }).length;
    Q.$('#nav').innerHTML = Q.NAV().map(function (n, i) {
      var sep = n[0] === 'team' || n[0] === 'admin' ? '<div class="nav-sep"></div>' : '';
      var cur = S.view === n[0] || (S.view === 'meeting' && n[0] === 'meetings');
      return sep + '<button data-go="' + n[0] + '"' + (cur ? ' aria-current="page"' : '') + '>' + Q.icon(n[0]) + n[1] +
        (n[0] === 'mine' && mine ? '<span class="badge" title="' + mine + ' overdue">' + mine + '</span>' : '') + '</button>';
    }).join('');
    var bn = [['dashboard', 'Home'], ['mine', 'My tasks'], ['tasks', 'Tasks'], ['deadlines', 'Deadlines'], ['meetings', 'Meetings']];
    Q.$('#bnav').innerHTML = bn.map(function (n) {
      var cur = S.view === n[0] || (S.view === 'meeting' && n[0] === 'meetings');
      return '<button data-go="' + n[0] + '"' + (cur ? ' aria-current="page"' : '') + '>' + Q.icon(n[0]) + n[1] + '</button>';
    }).join('');
    var me = S.data.me;
    Q.$('#side-me').innerHTML = Q.av(me.id) + '<div><b>' + Q.esc(me.name) + '</b><span>' + (Q.isAdmin() ? 'Admin' : 'Profile & sign out') + '</span></div>';
    var unread = S.data.notifications.filter(function (n) { return !n.read; }).length;
    var bc = Q.$('#bell-count');
    bc.hidden = !unread; bc.textContent = unread > 99 ? '99+' : unread;
    Q.$('#bell').setAttribute('aria-label', unread ? 'Notifications, ' + unread + ' unread' : 'Notifications');
  };

  Q.render = function () {
    if (!S.data) return;
    if (!Q.$('#view')) Q.shell();
    var fn = Q.views[S.view] || Q.views.dashboard;
    Q.$('#view').innerHTML = fn();
    Q.renderNav();
    document.title = (TITLES[S.view] || 'Qaaf Tracker') + ' – Qaaf Tracker';
    if (Q.afterRender[S.view]) Q.afterRender[S.view]();
  };
  Q.views = {};
  Q.afterRender = {};

  Q.openSide = function () {
    Q.$('#side').classList.add('open');
    var s = document.createElement('div'); s.className = 'scrim'; s.id = 'side-scrim';
    s.addEventListener('click', Q.closeSide);
    document.body.appendChild(s);
  };
  Q.closeSide = function () {
    var side = Q.$('#side'); if (side) side.classList.remove('open');
    var s = Q.$('#side-scrim'); if (s) s.remove();
  };
  Q.updateOnline = function () { var o = Q.$('#offline'); if (o) o.hidden = navigator.onLine !== false; };
  window.addEventListener('online', Q.updateOnline);
  window.addEventListener('offline', Q.updateOnline);

  /* ---------- theme ---------- */
  (function () { var th = Q.store.get('theme'); if (th) document.documentElement.dataset.theme = th; })();
  Q.toggleTheme = function () {
    var root = document.documentElement;
    var dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    Q.store.set('theme', root.dataset.theme);
  };

  /* ---------- data loading & sync ---------- */
  Q.applyTask = function (task, checklist) {
    var list = S.data.tasks, i = list.findIndex(function (t) { return t.id === task.id; });
    if (i >= 0) list[i] = task; else list.push(task);
    if (checklist) {
      S.data.checklist = S.data.checklist.filter(function (c) { return c.task !== task.id; }).concat(checklist);
    }
    Q.index();
  };

  Q.load = function (quiet) {
    return Q.api('bootstrap').then(function (d) {
      S.data = d;
      Q.index();
      if (!Q.$('#view')) Q.shell();
      if (quiet) {
        Q.render();
        if (S.drawer) Q.refreshDrawer(true);
      } else {
        Q.route();
      }
      return d;
    });
  };

  Q.startSync = function () {
    clearInterval(Q._sync);
    Q._sync = setInterval(function () {
      if (document.hidden || !S.data || !Q.store.get('session')) return;
      if (Q.$('#modal')) return;   // never refresh under an open form
      Q.api('sync', { version: S.data.version }).then(function (r) {
        if (r.changed || r.today !== S.data.today) return Q.load(true);
        var unread = S.data.notifications.filter(function (n) { return !n.read; }).length;
        if (r.unread !== unread) return Q.load(true);
      }).catch(function () { /* next round */ });
    }, DEMO ? 20000 : 60000);
  };
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && S.data && Q.store.get('session') && !Q.$('#modal')) {
      Q.api('sync', { version: S.data.version }).then(function (r) { if (r.changed || r.today !== S.data.today) Q.load(true); }).catch(function () {});
    }
  });

  /* ---------- sign-in ---------- */
  function logoBlock() {
    return '<img class="logo-light" src="assets/logo-color.png" alt="Qaaf"><img class="logo-dark" src="assets/logo-white.png" alt="Qaaf">';
  }
  Q.showLoading = function (text) {
    Q.$('#root').innerHTML = '<div class="screen"><div style="text-align:center">' +
      '<img src="assets/qmark-color.png" alt="" width="54" style="display:block;margin:0 auto">' +
      '<div class="spinner" role="progressbar" aria-label="Loading"></div><p class="muted">' + Q.esc(text || 'Loading your tracker…') + '</p></div></div>' +
      '<div class="toast" id="toast" role="status" aria-live="polite"></div>';
  };

  Q.showLogin = function (message) {
    S.data = null;
    clearInterval(Q._sync);
    var configMissing = !DEMO && (!CFG.apiUrl || !CFG.googleClientId);
    Q.$('#root').innerHTML = '<div class="screen"><div class="login-card">' + logoBlock() +
      '<h1>Qaaf Tracker</h1>' +
      '<p>' + (DEMO ? 'Preview: choose a team member to sign in as.' : 'Sign in with the Google account the admin added for you.') + '</p>' +
      (configMissing ? '<div class="login-error">This copy is not set up yet: add the API address and Google Client ID in config.js.</div>' :
        DEMO ? '<div class="demo-users" id="demo-users"></div>' : '<div id="gbtn" style="min-height:44px"></div><div class="spinner" id="gspin"></div>') +
      (message ? '<div class="login-error" role="alert">' + Q.esc(message) + '</div>' : '') +
      '</div></div><div class="toast" id="toast" role="status" aria-live="polite"></div>';
    if (configMissing) return;
    if (DEMO) {
      Q.$('#demo-users').innerHTML = window.DemoBackend.people().map(function (p) {
        return '<button class="btn" data-demo-login="' + Q.esc(p.email) + '" style="justify-content:flex-start">' + Q.esc(p.name) +
          '<span class="muted small" style="margin-left:auto">' + (p.role === 'ADMIN' ? 'Admin' : 'Team member') + '</span></button>';
      }).join('');
      return;
    }
    loadGoogle().then(function () {
      var sp = Q.$('#gspin'); if (sp) sp.remove();
      google.accounts.id.initialize({ client_id: CFG.googleClientId, callback: function (r) { Q.doLogin(r.credential); },
        auto_select: false, cancel_on_tap_outside: true, itp_support: true });
      var w = Math.min(320, (Q.$('#gbtn').clientWidth || 300));
      google.accounts.id.renderButton(Q.$('#gbtn'), { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', width: w });
    }).catch(function () {
      var sp = Q.$('#gspin'); if (sp) sp.remove();
      Q.$('#gbtn').innerHTML = '<div class="login-error">Google sign-in could not load. Check your internet connection and reload the page.</div>';
    });
  };

  function loadGoogle() {
    if (window.google && google.accounts && google.accounts.id) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  Q.doLogin = function (credential) {
    Q.showLoading('Signing you in…');
    var device = (navigator.userAgent || '').slice(0, 140);
    Q.api('login', { credential: credential, device: device }).then(function (r) {
      Q.store.set('session', r.session);
      return Q.start();
    }).catch(function (e) { Q.showLogin(e.message); });
  };

  Q.signedOut = function (message) {
    Q.store.set('session', null);
    Q.closeModal();
    Q.closeDrawer && Q.closeDrawer();
    Q.showLogin(message || 'Please sign in again.');
  };

  Q.signOut = function (everywhere) {
    Q.api(everywhere ? 'logoutAll' : 'logout').catch(function () {}).then(function () {
      Q.store.set('session', null);
      Q.store.set('transport', null);
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
      if (!DEMO && window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
      Q.closeModal();
      Q.showLogin(everywhere ? 'You have been signed out on all devices.' : 'You have signed out.');
    });
  };

  Q.start = function () {
    if (!Q.store.get('session')) { Q.showLogin(); return Promise.resolve(); }
    Q.showLoading();
    return Q.load(false).then(function () { Q.startSync(); }).catch(function (e) {
      if (e.code === 'AUTH') return;
      Q.$('#root').innerHTML = '<div class="screen"><div class="login-card">' + logoBlock() +
        '<h1>Could not load the tracker</h1><p>' + Q.esc(e.message) + '</p><button class="btn primary" onclick="location.reload()">Try again</button>' +
        ' <button class="btn" data-act="signOutQuiet">Sign in again</button></div></div><div class="toast" id="toast"></div>';
    });
  };
})();
