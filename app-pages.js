/* Qaaf Tracker – meetings, reports, admin */
(function () {
  'use strict';
  var Q = window.Q, S = Q.S, esc = Q.esc, icon = Q.icon;
  function emptyBox(text) { return '<div class="empty">' + esc(text) + '</div>'; }
  var DAY_LABEL = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' };

  /* ================= MEETINGS LIST ================= */
  function meetingCard(m) {
    var d = Q.asDate(m.date), T = Q.today();
    var cancelled = m.status === 'CANCELLED';
    return '<div class="mcard' + (m.date === T ? ' today' : '') + '" data-meeting="' + m.id + '">' +
      '<div class="mdate"><b>' + d.getDate() + '</b><span>' + d.toLocaleDateString('en-GB', { month: 'short' }) + '</span></div>' +
      '<div><div class="tt" style="font-weight:500">' + esc(m.title) + (cancelled ? ' <span class="pill due-over">Cancelled</span>' : m.status === 'HELD' ? ' <span class="pill">Notes taken</span>' : '') + '</div>' +
      '<div class="mt muted small">' + (m.date === T ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'long' })) + ' · ' + Q.time12(m.time) + (m.location ? ' · ' + esc(m.location) : '') + '</div></div>' +
      '<div class="avs">' + m.participants.slice(0, 6).map(function (p) { return Q.av(p, 's'); }).join('') + '</div></div>';
  }

  Q.views.meetings = function () {
    var T = Q.today(), ms = S.data.meetings.slice();
    var today = ms.filter(function (m) { return m.date === T; }).sort(byTime);
    var upcoming = ms.filter(function (m) { return m.date > T; }).sort(byWhen).slice(0, 12);
    var past = ms.filter(function (m) { return m.date < T; }).sort(byWhen).reverse().slice(0, 20);
    var pending = S.data.meetingItems.filter(function (i) { return i.type === 'ACTION' && !i.done; });
    var series = S.data.series.filter(function (s) { return s.active; });
    return '<div class="head"><div><h1>Meetings</h1><p class="sub">Daily standups and other meetings, with decisions and action items</p></div>' +
      '<div class="actions">' + (Q.isAdmin() ? '<button class="btn" data-act="seriesEdit">Recurring meetings</button>' : '') +
      '<button class="btn primary" data-act="newMeeting">' + icon('plus', ' width="16" height="16"') + 'New meeting</button></div></div>' +
      '<div class="grid g-3-2"><div class="grid">' +
      '<div class="panel"><div class="panel-h"><h2>Today</h2><span class="muted small">' + esc(Q.fmtLong(T)) + '</span></div>' + (today.length ? today.map(meetingCard).join('') : emptyBox('No meetings today')) + '</div>' +
      '<div class="panel"><div class="panel-h"><h2>Coming up</h2></div>' + (upcoming.length ? upcoming.map(meetingCard).join('') : emptyBox('Nothing scheduled yet. Daily standups appear each morning.')) + '</div>' +
      '<div class="panel"><div class="panel-h"><h2>Earlier</h2></div>' + (past.length ? past.map(meetingCard).join('') : emptyBox('Past meetings will appear here')) + '</div></div>' +
      '<div class="grid" style="align-content:start">' +
      '<div class="panel"><div class="panel-h"><h2>Open action items</h2><span class="muted small">' + pending.length + '</span></div>' +
      (pending.length ? pending.slice(0, 15).map(function (i) {
        return '<div class="li" data-meeting="' + i.meeting + '"><div><div class="tt">' + esc(i.text) + '</div><div class="mt">' + (i.owner ? esc(Q.pname(i.owner)) : 'No owner') + (i.due ? ' · due ' + Q.fmt(i.due) : '') + (i.task ? ' · tracked as task' : '') + '</div></div>' + (i.owner ? Q.av(i.owner, 's') : '') + '</div>';
      }).join('') : emptyBox('No open action items')) + '</div>' +
      '<div class="panel"><div class="panel-h"><h2>Recurring</h2></div>' + (series.length ? series.map(function (s) {
        return '<div class="li"' + (Q.isAdmin() ? ' data-act="seriesEdit" data-id="' + s.id + '"' : '') + '><div><div class="tt">' + esc(s.title) + '</div><div class="mt">' +
          s.days.map(function (d) { return DAY_LABEL[d]; }).join(', ') + ' · ' + Q.time12(s.time) + '</div></div><div class="avs">' + s.participants.map(function (p) { return Q.av(p, 's'); }).join('') + '</div></div>';
      }).join('') : emptyBox('No recurring meetings')) + '</div></div></div>';
  };
  function byTime(a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; }
  function byWhen(a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; }

  /* ================= MEETING DETAIL ================= */
  Q.views.meeting = function () {
    var id = S.params.id;
    var M = S.meeting && S.meeting.meeting.id === id ? S.meeting : null;
    var back = '<button class="btn small ghost" data-go="meetings" style="margin-bottom:10px">' + icon('back', ' width="16" height="16"') + 'Meetings</button>';
    if (!M) return back + '<div class="panel"><div class="spinner"></div><p class="muted" style="text-align:center">Loading meeting…</p></div>';
    var m = M.meeting, T = Q.today();
    var people = Q.activeUsers();
    function itemRow(i, carried) {
      var tracked = !!i.task;
      var t = tracked ? Q.ix.tasks[i.task] : null;
      return '<div class="ai">' +
        (i.type === 'ACTION' ? '<button class="check' + (i.done ? ' done' : '') + '" data-act="itemDone" data-id="' + i.id + '"' + (tracked || !M.canNote ? ' disabled title="' + (tracked ? 'Tracked as a task' : '') + '"' : '') + ' aria-label="Mark done">' + (i.done ? icon('check') : '') + '</button>' : '<span class="pill" style="background:var(--purple-soft);color:var(--purple)">Decision</span>') +
        '<div><div style="' + (i.done ? 'text-decoration:line-through;color:var(--muted)' : '') + '">' + esc(i.text) + '</div><div class="muted small">' +
        (i.owner ? esc(Q.pname(i.owner)) : i.type === 'ACTION' ? 'No owner' : '') + (i.due ? ' · due ' + Q.fmt(i.due) : '') +
        (carried && i.fromDate ? ' · from ' + Q.fmt(i.fromDate) : '') +
        (t ? ' · <a href="#" data-open="' + t.id + '">Task: ' + esc(Q.STATUS[t.status].label) + ' ' + Q.pct(t) + '%</a>' : '') + '</div></div>' +
        '<div style="display:flex;gap:6px">' + (i.type === 'ACTION' && !tracked ? '<button class="btn small" data-act="itemToTask" data-id="' + i.id + '">Make task</button>' : '') +
        (!carried && (M.canEdit || i.createdBy === Q.me()) ? '<button class="btn small ghost" data-act="itemRemove" data-id="' + i.id + '" aria-label="Remove">' + icon('close', ' width="14" height="14"') + '</button>' : '') + '</div></div>';
    }
    var decisions = M.items.filter(function (i) { return i.type === 'DECISION'; });
    var actions = M.items.filter(function (i) { return i.type === 'ACTION'; });
    var prev = M.previous;
    var addForms = M.canNote && m.status !== 'CANCELLED' ?
      '<div class="addrow"><input type="text" id="new-decision" placeholder="Add a decision" maxlength="500" aria-label="New decision"><button class="btn" data-act="addDecision">Add</button></div>' : '';
    var addAction = M.canNote && m.status !== 'CANCELLED' ?
      '<div class="addrow"><input type="text" id="new-action" placeholder="Add an action item" maxlength="500" aria-label="New action item">' +
      '<select id="new-action-owner" aria-label="Owner">' + Q.options(people.map(function (u) { return [u.id, u.name]; }), '', 'Owner') + '</select>' +
      '<input type="date" id="new-action-due" aria-label="Due date"><button class="btn" data-act="addAction">Add</button></div>' : '';
    return back +
      '<div class="head"><div><div class="muted small">' + (m.series ? 'Recurring meeting' : 'Meeting') + '</div><h1>' + esc(m.title) + '</h1>' +
      '<p class="sub">' + esc(Q.fmtLong(m.date)) + ' · ' + Q.time12(m.time) + (m.location ? ' · ' + esc(m.location) : '') +
      (m.status === 'CANCELLED' ? ' · <span class="warn">Cancelled</span>' : '') + '</p></div>' +
      '<div class="actions">' + (M.canEdit ? '<button class="btn" data-act="meetingEdit">Change details</button>' : '') +
      (M.canNote && m.status === 'SCHEDULED' && m.date <= T ? '<button class="btn" data-act="meetingHeld">Mark as held</button>' : '') + '</div></div>' +
      '<div class="grid g-3-2"><div class="grid" style="align-content:start">' +
      (M.pending.length || (prev && prev.decisions.length) ? '<div class="panel"><div class="panel-h"><h2>Carried forward</h2><span class="muted small">From earlier ' + esc(m.title) + ' meetings</span></div>' +
        (prev && prev.decisions.length ? '<div class="carry"><b class="small">Decisions on ' + Q.fmt(prev.date) + '</b>' + prev.decisions.map(function (d) { return '<div class="small">• ' + esc(d.text) + '</div>'; }).join('') + '</div>' : '') +
        (M.pending.length ? '<div class="label" style="margin-top:4px">Pending action items</div>' + M.pending.map(function (i) { return itemRow(i, true); }).join('') : '') + '</div>' : '') +
      '<div class="panel"><div class="panel-h"><h2>Decisions</h2></div>' + (decisions.length ? decisions.map(function (i) { return itemRow(i); }).join('') : '<p class="muted small">No decisions recorded yet.</p>') + addForms + '</div>' +
      '<div class="panel"><div class="panel-h"><h2>Action items</h2></div>' + (actions.length ? actions.map(function (i) { return itemRow(i); }).join('') : '<p class="muted small">No action items yet.</p>') + addAction + '</div>' +
      '</div><div class="grid" style="align-content:start">' +
      '<div class="panel"><div class="panel-h"><h2>Participants</h2></div>' + m.participants.map(function (p) {
        return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0">' + Q.av(p, 's') + esc(Q.pname(p)) + (p === m.organizer ? ' <span class="muted small">organiser</span>' : '') + '</div>';
      }).join('') + '</div>' +
      '<div class="panel"><div class="panel-h"><h2>Agenda</h2></div>' + (M.canNote ? '<textarea id="m-agenda" maxlength="5000" aria-label="Agenda" placeholder="Topics to discuss">' + esc(m.agenda) + '</textarea>' : '<p>' + (esc(m.agenda) || '<span class="muted">No agenda</span>') + '</p>') + '</div>' +
      '<div class="panel"><div class="panel-h"><h2>Notes</h2></div>' + (M.canNote ? '<textarea id="m-notes" style="min-height:140px" maxlength="5000" aria-label="Notes" placeholder="What was discussed">' + esc(m.notes) + '</textarea>' +
        '<div style="margin-top:10px;display:flex;justify-content:flex-end"><button class="btn primary" data-act="meetingSaveNotes">Save agenda & notes</button></div>' : '<p style="white-space:pre-wrap">' + (esc(m.notes) || '<span class="muted">No notes yet</span>') + '</p>') + '</div>' +
      '</div></div>';
  };
  Q.afterRender.meeting = function () {
    var id = S.params.id;
    if (S.meeting && S.meeting.meeting.id === id) return;
    Q.api('meeting.get', { id: id }).then(function (r) {
      S.meeting = r;
      if (S.view === 'meeting' && S.params.id === id) Q.render();
    }).catch(function (e) {
      if (e.code === 'AUTH') return;
      Q.$('#view').innerHTML = '<button class="btn small ghost" data-go="meetings">← Meetings</button><div class="empty" style="margin-top:12px">' + esc(e.message) + '</div>';
    });
  };
  Q.reloadMeeting = function () {
    var id = S.params.id;
    return Q.api('meeting.get', { id: id }).then(function (r) { S.meeting = r; if (S.view === 'meeting') Q.render(); });
  };

  /* ================= REPORTS ================= */
  function periodRange() {
    var r = S.reports, T = Q.today();
    if (r.period === 'custom' && r.from && r.to) return { from: r.from, to: r.to, label: Q.fmt(r.from) + ' – ' + Q.fmt(r.to) };
    if (r.period === 'week') { var wd = (Q.asDate(T).getDay() + 6) % 7; return { from: Q.addDays(T, -wd), to: T, label: 'This week' }; }
    if (r.period === 'month') return { from: T.slice(0, 8) + '01', to: T, label: 'This month' };
    if (r.period === 'year') return { from: T.slice(0, 5) + '01-01', to: T, label: 'This year' };
    var n = Number(r.period) || 30;
    return { from: Q.addDays(T, -(n - 1)), to: T, label: 'Last ' + n + ' days' };
  }
  Q.reportData = function () {
    var r = S.reports, range = periodRange();
    var scope = Q.tasks().filter(function (t) {
      if (r.dept && t.dept !== r.dept) return false;
      if (r.person && Q.ownerIds(t).indexOf(r.person) < 0) return false;
      return true;
    });
    var inRange = function (d) { return d && d >= range.from && d <= range.to; };
    var completed = scope.filter(function (t) { return t.status === 'COMPLETED' && inRange(Q.isoDay(t.completedAt)); });
    var created = scope.filter(function (t) { return inRange(Q.isoDay(t.createdAt)) && t.createdBy; });
    var dueInPeriod = scope.filter(function (t) { return inRange(t.due); });
    var onTime = completed.filter(function (t) { return !t.due || Q.isoDay(t.completedAt) <= t.due; });
    return { range: range, scope: scope, completed: completed, created: created, dueInPeriod: dueInPeriod, onTime: onTime };
  };

  Q.views.reports = function () {
    var r = S.reports, D = Q.reportData(), all = D.scope, open = all.filter(Q.isOpen);
    var segs = Q.STATUS_ORDER.map(function (s) { return { label: Q.STATUS[s].label, v: all.filter(function (t) { return t.status === s; }).length, color: Q.STATUS[s].color }; });
    var over = open.filter(Q.isOverdue).length;
    var dueSegs = [
      { label: 'Overdue', v: over, color: 'var(--coral)' },
      { label: 'Due in 7 days', v: open.filter(function (t) { return t.due && Q.diff(t.due) >= 0 && Q.diff(t.due) <= 7; }).length, color: 'var(--gold)' },
      { label: 'Later', v: open.filter(function (t) { return t.due && Q.diff(t.due) > 7; }).length, color: 'var(--purple)' },
      { label: 'No due date', v: open.filter(function (t) { return !t.due; }).length, color: 'var(--notstarted)' }
    ];
    var priSegs = ['P0', 'P1', 'P2', 'P3', 'P4'].map(function (p, i) {
      return { label: p + ' ' + Q.PRIORITY[p], v: open.filter(function (t) { return t.pri === p; }).length, color: ['var(--coral)', '#F79AA8', 'var(--purple)', '#A99DF0', 'var(--notstarted)'][i] };
    });
    function pie(title, list, center, sub) {
      var total = list.reduce(function (s, x) { return s + x.v; }, 0);
      return '<div class="panel"><div class="panel-h"><h2>' + title + '</h2></div><div class="overall"><div class="ring-wrap">' + Q.ring(0, 128, 22, list) +
        '<div class="c"><div><b class="num">' + center + '</b><span>' + sub + '</span></div></div></div><div class="legend" style="flex-direction:column;gap:6px">' +
        list.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + s.label + ' <b class="num">' + s.v + '</b>' + (total ? ' <span class="muted">(' + Math.round(s.v / total * 100) + '%)</span>' : '') + '</span>'; }).join('') + '</div></div></div>';
    }
    // completed per day/week within range
    var days = Q.dayNum(D.range.to) - Q.dayNum(D.range.from) + 1;
    var step = days > 62 ? 30 : days > 14 ? 7 : 1;
    var buckets = [];
    for (var start = D.range.from; start <= D.range.to; start = Q.addDays(start, step)) {
      var end = Q.addDays(start, step - 1); if (end > D.range.to) end = D.range.to;
      buckets.push({ start: start, end: end, c: D.completed.filter(function (t) { var d = Q.isoDay(t.completedAt); return d >= start && d <= end; }).length });
      if (buckets.length > 24) break;
    }
    var maxB = Math.max.apply(null, [1].concat(buckets.map(function (b) { return b.c; })));
    var cols = buckets.map(function (b) {
      var label = step === 30 ? Q.asDate(b.start).toLocaleDateString('en-GB', { month: 'short' }) : step === 7 ? Q.fmt(b.start) : Q.asDate(b.start).getDate();
      return '<div><em class="num">' + (b.c || '') + '</em><span class="b" style="height:' + (b.c / maxB * 100) + '%"></span><small>' + label + '</small></div>';
    }).join('');
    // per person
    var people = Q.members();
    var rows = people.map(function (u) {
      var ts = all.filter(function (t) { return Q.ownerIds(t).indexOf(u.id) >= 0; });
      var op = ts.filter(Q.isOpen);
      var comp = D.completed.filter(function (t) { return Q.ownerIds(t).indexOf(u.id) >= 0; });
      var ontime = comp.filter(function (t) { return !t.due || Q.isoDay(t.completedAt) <= t.due; }).length;
      return '<tr><td><span class="owner-cell">' + Q.av(u.id, 's') + esc(u.name) + '</span></td><td class="num">' + op.length + '</td><td class="num">' +
        op.filter(function (t) { return t.status === 'IN_PROGRESS'; }).length + '</td><td class="num ' + (op.filter(Q.isOverdue).length ? 'warn' : '') + '">' + op.filter(Q.isOverdue).length + '</td>' +
        '<td class="num">' + op.filter(function (t) { return t.status === 'BLOCKED'; }).length + '</td><td class="num"><b>' + comp.length + '</b></td><td class="num">' + (comp.length ? Math.round(ontime / comp.length * 100) + '%' : '—') + '</td>' +
        '<td style="min-width:120px">' + Q.minibar({ status: 'X', pct: Q.avgPct(ts) }) + '</td></tr>';
    }).join('');
    var deptPies = S.data.departments.filter(function (d) { return d.active && (!r.dept || r.dept === d.id); }).map(function (d) {
      var ts = all.filter(function (t) { return t.dept === d.id; });
      var dsegs = Q.STATUS_ORDER.map(function (s) { return { label: Q.STATUS[s].label, v: ts.filter(function (t) { return t.status === s; }).length, color: Q.STATUS[s].color }; });
      var c = D.completed.filter(function (t) { return t.dept === d.id; }).length;
      return '<div class="pie-card"><div class="ring-wrap">' + Q.ring(0, 86, 14, dsegs) + '<div class="c"><div><b class="num" style="font-size:17px">' + Q.avgPct(ts) + '%</b></div></div></div>' +
        '<div><h3>' + esc(d.name) + '</h3><div class="muted small">' + ts.length + ' tasks · ' + ts.filter(Q.isOpen).length + ' open</div><div class="small">' + c + ' completed in period</div></div></div>';
    }).join('');
    var periods = [['week', 'This week'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['month', 'This month'], ['90', 'Last 90 days'], ['year', 'This year'], ['custom', 'Custom']];
    var onTimeRate = D.completed.length ? Math.round(D.onTime.length / D.completed.length * 100) : null;
    return '<div class="head"><div><h1>Reports</h1><p class="sub">' + esc(D.range.label) + (r.dept ? ' · ' + esc(Q.deptOf(r.dept).name) : '') + (r.person ? ' · ' + esc(Q.pname(r.person)) : '') + '</p></div>' +
      '<div class="actions no-print"><button class="btn" data-act="exportReport">Export CSV</button><button class="btn" data-act="print">Print / PDF</button></div></div>' +
      '<div class="filters no-print"><select data-report="period" aria-label="Period">' + Q.options(periods, r.period) + '</select>' +
      (r.period === 'custom' ? '<input type="date" data-report="from" value="' + esc(r.from) + '" aria-label="From"><input type="date" data-report="to" value="' + esc(r.to) + '" aria-label="To">' : '') +
      '<select data-report="dept" aria-label="Department">' + Q.options(S.data.departments.map(function (d) { return [d.id, d.name]; }), r.dept, 'All departments') + '</select>' +
      '<select data-report="person" aria-label="Person">' + Q.options(people.map(function (u) { return [u.id, u.name]; }), r.person, 'Everyone') + '</select></div>' +
      '<div class="band mb">' +
      '<button style="--tone:var(--teal)" data-act="noop"><span class="v num">' + D.completed.length + '</span><span class="l">Completed</span><span class="d">in ' + esc(D.range.label.toLowerCase()) + '</span></button>' +
      '<button style="--tone:var(--purple)" data-act="noop"><span class="v num">' + (onTimeRate === null ? '—' : onTimeRate + '%') + '</span><span class="l">On time</span><span class="d">of completed tasks</span></button>' +
      '<button style="--tone:var(--gold)" data-act="noop"><span class="v num">' + D.created.length + '</span><span class="l">New tasks</span><span class="d">added in the app</span></button>' +
      '<button style="--tone:var(--coral)" data-act="noop"><span class="v num">' + over + '</span><span class="l">Overdue now</span><span class="d">open and late</span></button>' +
      '<button style="--tone:var(--purple)" data-act="noop"><span class="v num">' + Q.avgPct(all) + '%</span><span class="l">Average done</span><span class="d">' + all.length + ' tasks in scope</span></button></div>' +
      '<div class="grid g-3 mb">' + pie('Status', segs, all.length, 'tasks') + pie('Open work by due date', dueSegs, open.length, 'open') + pie('Open work by priority', priSegs, open.length, 'open') + '</div>' +
      '<div class="panel mb"><div class="panel-h"><h2>Completed over time</h2><span class="muted small">per ' + (step === 1 ? 'day' : step === 7 ? 'week' : 'month') + '</span></div><div class="cols">' + cols + '</div></div>' +
      '<div class="panel mb"><div class="panel-h"><h2>By person</h2><span class="muted small">Completed and on-time are for the selected period</span></div>' +
      '<div style="overflow-x:auto"><table><thead><tr><th>Person</th><th>Open</th><th>In progress</th><th>Overdue</th><th>Blocked</th><th>Completed</th><th>On time</th><th>Avg done</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
      '<div class="panel"><div class="panel-h"><h2>By department</h2></div><div class="pies">' + deptPies + '</div></div>';
  };

  /* ================= ADMIN ================= */
  var ADMIN_TABS = [['people', 'People'], ['departments', 'Departments'], ['meetings', 'Recurring meetings'], ['announce', 'Announcement'], ['archived', 'Archived tasks'], ['setup', 'Setup']];
  Q.views.admin = function () {
    var tab = S.adminTab, body = '';
    if (tab === 'people') {
      body = '<div class="panel-h"><p class="muted" style="margin:0">Only people listed here (and switched on) can sign in.</p><button class="btn primary" data-act="userEdit">' + icon('plus', ' width="16" height="16"') + 'Add person</button></div>' +
        '<div class="tbl-wrap"><table style="min-width:760px"><thead><tr><th>Person</th><th>Google email</th><th>WhatsApp</th><th>Departments</th><th>Daily email</th><th>Status</th><th></th></tr></thead><tbody>' +
        S.data.users.map(function (u) {
          return '<tr><td><span class="owner-cell">' + Q.av(u.id, 's') + esc(u.name) + (u.role === 'ADMIN' ? ' <span class="tag-soft">Admin</span>' : '') + '</span></td>' +
            '<td>' + esc(u.email) + '</td><td>' + (esc(u.whatsapp) || '<span class="faint">—</span>') + '</td>' +
            '<td>' + ((Q.ix.userDepts[u.id] || []).map(function (d) { return esc(Q.deptOf(d).name); }).join(', ') || '<span class="faint">None</span>') + '</td>' +
            '<td>' + (u.dailyEmail ? 'On' : 'Off') + '</td><td>' + (u.active ? '<span class="pill"><i style="background:var(--teal)"></i>Active</span>' : '<span class="pill"><i style="background:var(--notstarted)"></i>Switched off</span>') + '</td>' +
            '<td style="white-space:nowrap"><button class="btn small" data-act="userEdit" data-id="' + u.id + '">Edit</button></td></tr>';
        }).join('') + '</tbody></table></div>';
    } else if (tab === 'departments') {
      body = '<div class="panel-h"><p class="muted" style="margin:0">New departments start with a “General” workstream. Stages can be edited in the Stages tab of the sheet.</p><button class="btn primary" data-act="deptEdit">' + icon('plus', ' width="16" height="16"') + 'Add department</button></div>' +
        '<div class="tbl-wrap"><table style="min-width:600px"><thead><tr><th>Department</th><th>People</th><th>Tasks</th><th>Status</th><th></th></tr></thead><tbody>' +
        S.data.departments.map(function (d) {
          var who = Object.keys(Q.ix.userDepts).filter(function (u) { return Q.ix.userDepts[u].indexOf(d.id) >= 0; });
          return '<tr><td><span class="owner-cell"><i style="width:10px;height:10px;border-radius:3px;background:' + esc(d.color) + ';display:inline-block"></i>' + esc(d.name) + '</span></td>' +
            '<td>' + (who.map(Q.pname).map(esc).join(', ') || '<span class="faint">None</span>') + '</td><td class="num">' + Q.tasks().filter(function (t) { return t.dept === d.id; }).length + '</td>' +
            '<td>' + (d.active ? 'Active' : 'Hidden') + '</td><td><button class="btn small" data-act="deptEdit" data-id="' + d.id + '">Edit</button></td></tr>';
        }).join('') + '</tbody></table></div>';
    } else if (tab === 'meetings') {
      body = '<div class="panel-h"><p class="muted" style="margin:0">Each recurring meeting creates a meeting page on its days, with earlier decisions and open actions carried forward.</p><button class="btn primary" data-act="seriesEdit">' + icon('plus', ' width="16" height="16"') + 'Add recurring meeting</button></div>' +
        (S.data.series.length ? '<div class="tbl-wrap"><table style="min-width:600px"><thead><tr><th>Meeting</th><th>Days</th><th>Time</th><th>Participants</th><th>Status</th><th></th></tr></thead><tbody>' +
          S.data.series.map(function (s) {
            return '<tr><td>' + esc(s.title) + '</td><td>' + s.days.map(function (d) { return DAY_LABEL[d]; }).join(', ') + '</td><td>' + Q.time12(s.time) + '</td>' +
              '<td>' + s.participants.map(Q.pname).map(esc).join(', ') + '</td><td>' + (s.active ? 'Active' : 'Stopped') + '</td>' +
              '<td><button class="btn small" data-act="seriesEdit" data-id="' + s.id + '">Edit</button></td></tr>';
          }).join('') + '</tbody></table></div>' : emptyBox('No recurring meetings yet'));
    } else if (tab === 'announce') {
      body = '<div class="panel" style="max-width:620px"><h2>Send an announcement</h2><p class="muted">Every active team member sees it under the bell.</p>' +
        '<div class="field"><label for="ann-title">Title</label><input id="ann-title" type="text" maxlength="150" placeholder="e.g. Office closed on Friday"></div>' +
        '<div class="field"><label for="ann-body">Message</label><textarea id="ann-body" maxlength="1000"></textarea></div>' +
        '<button class="btn primary" data-act="announce">Send to everyone</button></div>';
    } else if (tab === 'archived') {
      var arch = S.data.tasks.filter(function (t) { return t.archived; });
      var groups = S.data.archiveGroups || {};
      var table = function (list) {
        return '<div class="tbl-wrap"><table style="min-width:600px"><thead><tr><th>WBS</th><th>Task</th><th>Department</th><th>Owner</th><th>Status then</th><th></th></tr></thead><tbody>' +
          list.sort(function (a, b) { return Q.wbsCmp(a.wbs, b.wbs); }).map(function (t) {
            return '<tr><td class="wbs">' + esc(t.wbs) + '</td><td>' + esc(t.title) + '</td><td>' + esc(Q.deptOf(t.dept).name) + '</td><td>' + esc(Q.pname(t.owner)) + '</td>' +
              '<td>' + Q.statusPill(t.status) + '</td>' +
              '<td style="white-space:nowrap"><button class="btn small" data-open="' + t.id + '">View</button> <button class="btn small" data-act="restore" data-id="' + t.id + '">Restore</button></td></tr>';
          }).join('') + '</tbody></table></div>';
      };
      body = Object.keys(groups).map(function (g) {
        var list = arch.filter(function (t) { return t.archiveGroup === g; });
        if (!list.length) return '';
        var done = list.filter(function (t) { return t.status === 'COMPLETED'; }).length;
        return '<div class="panel mb"><div class="panel-h"><div><h2>' + esc(groups[g]) + '</h2><div class="muted small">' + list.length + ' tasks (' + done +
          ' were completed). Hidden from everyone until restored. Restored tasks come back without due dates.</div></div>' +
          '<button class="btn primary" data-act="restoreGroup" data-id="' + esc(g) + '">Restore all ' + list.length + '</button></div>' +
          '<details><summary class="btn small" style="list-style:none;display:inline-flex;margin-bottom:10px">Show the ' + list.length + ' tasks</summary>' + table(list) + '</details></div>';
      }).join('');
      var own = arch.filter(function (t) { return !t.archiveGroup || !groups[t.archiveGroup]; });
      body += '<div class="panel"><div class="panel-h"><div><h2>Archived in the app</h2><div class="muted small">Tasks the admin archived. Restore them one by one.</div></div></div>' +
        (own.length ? table(own) : emptyBox('No tasks archived in the app yet.')) + '</div>';
    } else if (tab === 'setup') {
      var nodue = Q.tasks().filter(function (t) { return Q.isOpen(t) && !t.due; }).length;
      var noOwner = Q.tasks().filter(function (t) { return Q.isOpen(t) && !t.owner; }).length;
      var noEmail = S.data.users.filter(function (u) { return u.active && !u.email; }).length;
      var item = function (ok, text) { return '<div><span class="pill" style="' + (ok ? 'color:var(--teal-text)' : 'color:var(--coral-text)') + '">' + (ok ? 'OK' : 'To do') + '</span><span>' + text + '</span></div>'; };
      body = '<div class="grid g-2"><div class="panel"><h2>Health check</h2><div class="status-list" style="margin-top:12px">' +
        item(nodue === 0, nodue + ' open tasks have no due date (no reminders for them)') +
        item(noOwner === 0, noOwner + ' open tasks have no owner') +
        item(noEmail === 0, noEmail + ' active people have no email') +
        item(true, S.data.series.filter(function (s) { return s.active; }).length + ' recurring meeting(s) running') +
        '</div><div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn small" data-filter="' + esc(JSON.stringify({ due: 'nodue' })) + '">Tasks without a date</button>' +
        '<button class="btn small" data-filter="' + esc(JSON.stringify({ owner: '_none', status: 'open' })) + '">Tasks without an owner</button></div></div>' +
        '<div class="panel"><h2>About this app</h2><div class="status-list" style="margin-top:12px">' +
        '<div><span class="muted" style="width:120px">App version</span><span>' + esc(S.data.appVersion) + '</span></div>' +
        '<div><span class="muted" style="width:120px">Time zone</span><span>' + esc(S.data.settings.timezone) + '</span></div>' +
        '<div><span class="muted" style="width:120px">Daily reminders</span><span>' + S.data.settings.workDays.map(function (d) { return DAY_LABEL[d]; }).join(', ') + ' around ' + S.data.settings.dailyEmailHour + ':00</span></div>' +
        '<div><span class="muted" style="width:120px">File limit</span><span>' + S.data.settings.maxUploadMb + ' MB per file</span></div>' +
        '</div><p class="muted small">Other settings (reminder days, email on/off) are in the Settings tab of the Google Sheet. Everything is saved in that sheet, so it is also your backup.</p></div></div>';
    }
    return '<div class="head"><div><h1>Admin</h1><p class="sub">People, departments, meetings and announcements</p></div></div>' +
      '<div class="tabs" role="tablist">' + ADMIN_TABS.map(function (t) { return '<button role="tab" data-act="adminTab" data-id="' + t[0] + '" aria-selected="' + (S.adminTab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' + body;
  };

  Q.DAY_LABEL = DAY_LABEL;
})();
