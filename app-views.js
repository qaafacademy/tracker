/* Qaaf Tracker – main views */
(function () {
  'use strict';
  var Q = window.Q, S = Q.S, esc = Q.esc, icon = Q.icon;

  function filterAttr(f) { return esc(JSON.stringify(f)); }
  function emptyBox(text) { return '<div class="empty">' + esc(text) + '</div>'; }
  function taskMeta(t) {
    var g = Q.groupOf(t), d = Q.deptOf(t.dept);
    return esc(d.name) + ' · ' + esc(g.title);
  }

  /* ================= DASHBOARD ================= */
  Q.views.dashboard = function () {
    var all = Q.tasks(), open = all.filter(Q.isOpen), T = Q.today();
    var over = open.filter(Q.isOverdue);
    var week = open.filter(function (t) { return t.due && Q.diff(t.due) >= 0 && Q.diff(t.due) <= 7; });
    var blocked = open.filter(function (t) { return t.status === 'BLOCKED'; });
    var crit = open.filter(function (t) { return t.pri === 'P0'; });
    var nodue = open.filter(function (t) { return !t.due; });
    var done = all.length - open.length, avg = Q.avgPct(all);
    var segs = Q.STATUS_ORDER.map(function (s) { return { label: Q.STATUS[s].label, v: all.filter(function (t) { return t.status === s; }).length, color: Q.STATUS[s].color }; });

    var band = [
      [over.length, 'Overdue', over.length ? 'Needs attention' : 'Nothing late', 'var(--coral)', { due: 'overdue' }],
      [week.length, 'Due in 7 days', 'Next 7 days', 'var(--gold)', { due: 'week' }],
      [blocked.length, 'Blocked', 'Waiting on something', 'var(--coral)', { status: 'BLOCKED' }],
      [crit.length, 'Critical open', 'P0 priority', 'var(--purple)', { pri: 'P0' }],
      [nodue.length, 'No due date', 'Need a date', 'var(--gold)', { due: 'nodue' }]
    ].map(function (b) {
      return '<button data-filter="' + filterAttr(b[4]) + '" style="--tone:' + b[3] + '"><span class="v num">' + b[0] + '</span><span class="l">' + b[1] + '</span><span class="d">' + b[2] + '</span></button>';
    }).join('');

    var depts = S.data.departments.filter(function (d) { return d.active; }).map(function (d) {
      var ts = all.filter(function (t) { return t.dept === d.id; });
      var p = Q.avgPct(ts), n = ts.length;
      var stack = Q.STATUS_ORDER.map(function (s) {
        var c = ts.filter(function (t) { return t.status === s; }).length;
        return c ? '<span style="width:' + (c / n * 100) + '%;background:' + Q.STATUS[s].color + '" title="' + Q.STATUS[s].label + ': ' + c + '"></span>' : '';
      }).join('');
      return '<div class="drow" data-filter="' + filterAttr({ dept: d.id }) + '" style="cursor:pointer"><div class="nm">' + esc(d.name) + '<small>' +
        (n ? n + (n === 1 ? ' task · ' : ' tasks · ') + ts.filter(function (t) { return !Q.isOpen(t); }).length + ' done' : 'No tasks yet') + '</small></div>' +
        '<div class="stack" style="margin:0">' + (n ? stack : '') + '</div><div class="num" style="text-align:right;font-weight:600">' + (n ? p + '%' : '—') + '</div></div>';
    }).join('');

    var stageDepts = Object.keys(Q.ix.stages).filter(function (id) { return Q.ix.depts[id] && Q.ix.depts[id].active; });
    var stages = Q.ix.stages[S.pipeDept] || [];
    var stageCounts = stages.map(function (s) {
      var ts = all.filter(function (t) { return t.dept === S.pipeDept && t.stage === s.code; });
      return { s: s, open: ts.filter(Q.isOpen).length, total: ts.length, pct: Q.avgPct(ts) };
    });
    var maxOpen = Math.max.apply(null, [0].concat(stageCounts.map(function (x) { return x.open; })));
    var pipeline = stageDepts.length ? '<div class="panel mb"><div class="panel-h"><div><h2>Work by stage</h2><div class="muted small">Open tasks at each step. Click a stage to see them.</div></div>' +
      '<div class="track-tabs">' + stageDepts.map(function (id) { return '<button class="chip-btn" data-act="pipeDept" data-id="' + id + '" aria-pressed="' + (S.pipeDept === id) + '">' + esc(Q.ix.depts[id].name) + '</button>'; }).join('') + '</div></div>' +
      '<div class="track">' + stageCounts.map(function (x) {
        return '<button class="stage" data-filter="' + filterAttr({ dept: S.pipeDept, stage: x.s.code }) + '" style="all:unset;flex:1;min-width:112px;position:relative;padding:0 6px;cursor:pointer"><div class="line"></div>' +
          '<div class="dot ' + (x.total === 0 ? 'empty' : x.open === maxOpen && maxOpen > 0 ? 'hot' : '') + '">' + x.open + '</div>' +
          '<div class="nm">' + esc(x.s.label) + '</div><div class="meta">' + (x.total ? x.pct + '% done' : 'no tasks') + '</div></button>';
      }).join('') + '</div></div>' : '';

    var owners = Q.members().map(function (u) { return u.id; })
      .concat(S.data.teams.filter(function (t) { return all.some(function (x) { return x.owner === t.id && Q.isOpen(x); }); }).map(function (t) { return t.id; }));
    var loads = owners.map(function (id) {
      var ts = open.filter(function (t) { return t.owner === id; });
      return { id: id, ts: ts, over: ts.filter(Q.isOverdue).length };
    });
    var maxL = Math.max.apply(null, [1].concat(loads.map(function (x) { return x.ts.length; })));
    var workload = loads.map(function (x) {
      var parts = ['IN_PROGRESS', 'UNDER_REVIEW', 'BLOCKED', 'ON_HOLD', 'NOT_STARTED'].map(function (s) {
        var c = x.ts.filter(function (t) { return t.status === s; }).length;
        return c ? '<span style="width:' + (c / maxL * 100) + '%;background:' + Q.STATUS[s].color + '" title="' + Q.STATUS[s].label + ': ' + c + '"></span>' : '';
      }).join('');
      return '<div class="hb" data-filter="' + filterAttr({ owner: x.id }) + '" style="cursor:pointer"><span class="n">' + Q.av(x.id, 's') + esc(Q.pname(x.id)) + '</span>' +
        '<div class="track2">' + parts + '</div><span class="v num">' + x.ts.length + (x.over ? ' <span class="warn" title="overdue">·' + x.over + '</span>' : '') + '</span></div>';
    }).join('');

    var coming = open.filter(function (t) { return t.due; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; }).slice(0, 8).map(function (t) {
      return '<div class="li" data-open="' + t.id + '"><div><div class="tt">' + esc(t.title) + '</div><div class="mt">' + esc(Q.pname(t.owner)) + ' · ' + taskMeta(t) + '</div></div>' + Q.duePill(t) + '</div>';
    }).join('');

    var wsList = S.data.groups.filter(function (g) { return !g.archived && (S.wsDept === 'all' || g.dept === S.wsDept); }).map(function (g) {
      var ts = all.filter(function (t) { return t.group === g.id; });
      return { g: g, ts: ts, p: Q.avgPct(ts) };
    }).filter(function (x) { return x.ts.length; });
    var ws = wsList.map(function (x) {
      var od = x.ts.filter(Q.isOverdue).length;
      return '<div class="drow" data-ws="' + x.g.id + '" style="cursor:pointer"><div class="nm">' + esc(x.g.title) + '<small>' + x.ts.length + ' tasks' + (od ? ' · <span class="warn">' + od + ' overdue</span>' : '') + '</small></div>' +
        '<div class="bar"><span style="width:' + x.p + '%;background:' + (x.p === 100 ? 'var(--teal)' : 'var(--purple)') + '"></span></div><div class="num" style="text-align:right">' + x.p + '%</div></div>';
    }).join('');

    var weeks = [];
    for (var i = 7; i >= 0; i--) {
      var end = Q.addDays(T, -i * 7), start = Q.addDays(end, -6);
      var c = all.filter(function (t) { var d = Q.isoDay(t.completedAt); return t.status === 'COMPLETED' && d >= start && d <= end; }).length;
      weeks.push({ c: c, label: i === 0 ? 'This wk' : Q.fmt(start), now: i === 0 });
    }
    var maxW = Math.max.apply(null, [1].concat(weeks.map(function (w) { return w.c; })));
    var cols = weeks.map(function (w) { return '<div><em class="num">' + w.c + '</em><span class="b' + (w.now ? ' now' : '') + '" style="height:' + (w.c / maxW * 100) + '%"></span><small>' + w.label + '</small></div>'; }).join('');

    var acts = (S.data.activity || []).slice(0, 10).map(function (a) {
      var t = Q.ix.tasks[a.task];
      return '<div class="act"' + (t ? ' data-open="' + t.id + '" style="cursor:pointer"' : '') + '>' + Q.av(a.user, 's') + '<div><b>' + esc(Q.pname(a.user)) + '</b> ' + esc(activityText(a)) +
        (t ? ' <span class="muted">' + esc(t.title) + '</span>' : '') + '<time>' + Q.ago(a.at) + '</time></div></div>';
    }).join('');

    return '<div class="head"><div><h1>Dashboard</h1><p class="sub">' + esc(Q.fmtLong(T)) + ' · all departments</p></div>' +
      '<div class="actions"><button class="btn" data-go="reports">Reports</button><button class="btn" data-go="mine">My tasks</button></div></div>' +
      '<div class="band mb">' + band + '</div>' +
      '<div class="grid g-2-3 mb">' +
      '<div class="panel"><div class="panel-h"><h2>Overall progress</h2><span class="muted small">' + all.length + ' tasks</span></div>' +
      '<div class="overall"><div class="ring-wrap">' + Q.ring(0, 132, 14, segs) + '<div class="c"><div><b class="num">' + avg + '%</b><span>average done</span></div></div></div>' +
      '<div><div class="legend" style="flex-direction:column;gap:6px">' + segs.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + s.label + ' <b class="num">' + s.v + '</b></span>'; }).join('') + '</div>' +
      '<p class="muted small" style="margin:10px 0 0">' + done + ' of ' + all.length + ' completed</p></div></div></div>' +
      '<div class="panel"><div class="panel-h"><h2>Departments</h2><span class="muted small">Average % done</span></div>' + depts + '</div></div>' +
      pipeline +
      '<div class="grid g-2 mb">' +
      '<div class="panel"><div class="panel-h"><h2>Open work by person</h2><div class="legend">' + ['IN_PROGRESS', 'UNDER_REVIEW', 'BLOCKED', 'ON_HOLD', 'NOT_STARTED'].map(function (s) { return '<span><i style="background:' + Q.STATUS[s].color + '"></i>' + Q.STATUS[s].label + '</span>'; }).join('') + '</div></div>' + (workload || emptyBox('No team members yet')) + '</div>' +
      '<div class="panel"><div class="panel-h"><h2>Coming up</h2><button class="btn small" data-go="deadlines">All deadlines</button></div><div class="list">' + (coming || emptyBox('No upcoming due dates. Give open tasks a due date to see them here.')) + '</div></div></div>' +
      '<div class="grid g-3-2">' +
      '<div class="panel"><div class="panel-h"><h2>Workstreams</h2><select data-act="wsDept" aria-label="Department">' + Q.options([['all', 'All departments']].concat(S.data.departments.filter(function (d) { return d.active; }).map(function (d) { return [d.id, d.name]; })), S.wsDept) + '</select></div>' +
      '<div style="max-height:420px;overflow-y:auto">' + (ws || emptyBox('No workstreams with tasks here yet')) + '</div></div>' +
      '<div class="grid"><div class="panel"><div class="panel-h"><h2>Completed per week</h2></div><div class="cols">' + cols + '</div></div>' +
      '<div class="panel"><div class="panel-h"><h2>Recent activity</h2></div>' + (acts || emptyBox('Updates will appear here')) + '</div></div></div>';
  };

  function activityText(a) {
    if (a.field === 'created') return 'created';
    if (a.field === 'status') return 'changed status to ' + a.to + ' ·';
    if (a.field === 'progress') return 'set progress to ' + a.to + '% ·';
    if (a.field === 'due date') return 'moved the due date to ' + (a.to ? Q.fmt(a.to) : 'none') + ' ·';
    if (a.field === 'owner') return 'gave to ' + a.to + ' ·';
    if (a.field === 'file added') return 'added a file to';
    if (a.field === 'archived') return 'archived';
    if (a.field === 'restored') return 'restored';
    return 'updated ' + a.field + ' ·';
  }
  Q.activityText = activityText;

  /* ================= MY TASKS ================= */
  function taskRow(t) {
    var done = !Q.isOpen(t), can = Q.canEdit(t);
    var cl = Q.checklistOf(t.id), cld = cl.filter(function (c) { return c.done; }).length;
    return '<div class="task">' +
      '<button class="check' + (done ? ' done' : '') + '" data-act="toggleDone" data-id="' + t.id + '"' + (can ? '' : ' disabled') +
      ' aria-label="' + (done ? 'Reopen ' : 'Mark complete: ') + esc(t.title) + '">' + (done ? icon('check') : '') + '</button>' +
      '<div class="body" data-open="' + t.id + '"><div class="tt">' + esc(t.title) + '</div><div class="mt">' + Q.priPill(t.pri) +
      (t.status !== 'NOT_STARTED' && t.status !== 'COMPLETED' ? Q.statusPill(t.status) : '') +
      '<span>' + taskMeta(t) + '</span>' + (t.ownerType === 'TEAM' ? '<span class="tag-soft">' + esc(Q.pname(t.owner)) + '</span>' : '') +
      (t.recur ? '<span class="tag-soft">' + esc(t.recur) + '</span>' : '') +
      (cl.length ? '<span>☑ ' + cld + '/' + cl.length + '</span>' : '') +
      Q.duePill(t) + '</div>' + (t.status === 'BLOCKED' && t.blocker ? '<div class="mt warn">Blocked: ' + esc(t.blocker) + '</div>' : '') + '</div>' +
      '<div class="prog">' + Q.minibar(t) + '</div>' +
      '<div class="upd">' + (done ? '' : Q.updatedToday(t) ? '<span class="updated">✓ Updated today</span>' : can ? '<button class="btn small" data-act="update" data-id="' + t.id + '">Update</button>' : '') + '</div></div>';
  }
  Q.taskRow = taskRow;

  Q.views.mine = function () {
    var me = S.data.me, T = Q.today();
    var mine = Q.tasks().filter(Q.isMine);
    var open = mine.filter(Q.isOpen);
    var over = open.filter(Q.isOverdue);
    var today = open.filter(function (t) { return t.due && Q.diff(t.due) === 0; });
    var week = open.filter(function (t) { return t.due && Q.diff(t.due) > 0 && Q.diff(t.due) <= 7; });
    var later = open.filter(function (t) { return t.due && Q.diff(t.due) > 7; });
    var nodue = open.filter(function (t) { return !t.due; });
    var recent = mine.filter(function (t) { return !Q.isOpen(t) && t.completedAt && Q.diff(Q.isoDay(t.completedAt)) >= -7; });
    var updated = open.filter(Q.updatedToday).length;
    var hour = new Date().getHours();
    var greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    var mtg = S.data.meetings.filter(function (m) { return m.date === T && m.status !== 'CANCELLED' && m.participants.indexOf(me.id) >= 0; })
      .sort(function (a, b) { return a.time < b.time ? -1 : 1; });
    function sec(title, list, extra) {
      if (!list.length) return '';
      var sorted = list.slice().sort(function (a, b) { return Q.dueInfo(a).rank - Q.dueInfo(b).rank || a.pri.localeCompare(b.pri); });
      return '<section class="sec"><div class="sec-h"><h2>' + title + '</h2><span class="count">' + list.length + '</span>' + (extra || '') + '</div>' + sorted.map(taskRow).join('') + '</section>';
    }
    return '<div class="hello"><div class="today-card"><div><h1>' + greet + ', ' + esc(me.name) + '</h1><p>' + esc(Q.fmtLong(T)) +
      (open.length ? ' · Please update the tasks you worked on today.' : '') + '</p></div>' +
      '<div class="today-stats"><div><b class="num">' + open.length + '</b><span>Open tasks</span></div><div class="' + (over.length ? 'over' : '') + '"><b class="num">' + over.length + '</b><span>Overdue</span></div>' +
      '<div><b class="num">' + today.length + '</b><span>Due today</span></div><div><b class="num">' + updated + '/' + open.length + '</b><span>Updated today</span></div></div></div>' +
      '<div class="panel"><div class="panel-h"><h2>Today’s meetings</h2><button class="btn small" data-go="meetings">All meetings</button></div>' +
      (mtg.length ? mtg.map(function (m) {
        return '<div class="li" data-meeting="' + m.id + '"><div><div class="tt">' + esc(m.title) + '</div><div class="mt">' + Q.time12(m.time) + (m.location ? ' · ' + esc(m.location) : '') + '</div></div>' +
          '<div class="avs">' + m.participants.slice(0, 5).map(function (p) { return Q.av(p, 's'); }).join('') + '</div></div>';
      }).join('') : emptyBox('No meetings for you today')) + '</div></div>' +
      (mine.length === 0 ? emptyBox('You have no tasks yet. Tasks assigned to you will show up here.') : '') +
      sec('Overdue', over) + sec('Due today', today) + sec('Next 7 days', week) + sec('Later', later) +
      sec('No due date', nodue, '<span class="muted small">Set a date so reminders can help</span>') +
      (recent.length ? '<section class="sec"><div class="sec-h"><h2>Completed this week</h2><span class="count">' + recent.length + '</span></div>' + recent.map(taskRow).join('') + '</section>' : '');
  };

  /* ================= ALL TASKS ================= */
  Q.filteredTasks = function (extra) {
    var f = S.filters, q = f.q.trim().toLowerCase();
    return Q.tasks().filter(function (t) {
      if (f.dept && t.dept !== f.dept) return false;
      if (f.owner && (f.owner === '_none' ? t.owner : Q.ownerIds(t).indexOf(f.owner) < 0 && t.owner !== f.owner)) return false;
      if (f.status && (f.status === 'open' ? !Q.isOpen(t) : t.status !== f.status)) return false;
      if (f.pri && t.pri !== f.pri) return false;
      if (f.stage && t.stage !== f.stage) return false;
      if (f.group && t.group !== f.group) return false;
      if (f.due === 'overdue' && !Q.isOverdue(t)) return false;
      if (f.due === 'week' && !(Q.isOpen(t) && t.due && Q.diff(t.due) >= 0 && Q.diff(t.due) <= 7)) return false;
      if (f.due === 'nodue' && !(Q.isOpen(t) && !t.due)) return false;
      if (f.due === 'mine' && !Q.isMine(t)) return false;
      if (q && (t.title + ' ' + t.wbs + ' ' + Q.pname(t.owner) + ' ' + Q.groupOf(t).title + ' ' + (t.description || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  };

  function filterBar(opts) {
    var f = S.filters;
    var people = Q.members().map(function (u) { return [u.id, u.name]; }).concat(S.data.teams.map(function (t) { return [t.id, t.name]; }));
    var active = Object.keys(f).some(function (k) { return f[k]; });
    return '<div class="filters">' +
      (opts && opts.search === false ? '' : '<input type="text" data-filter-input="q" value="' + esc(f.q) + '" placeholder="Search title, owner, WBS" aria-label="Search">') +
      '<select data-filter-key="dept" aria-label="Department">' + Q.options(S.data.departments.map(function (d) { return [d.id, d.name]; }), f.dept, 'All departments') + '</select>' +
      '<select data-filter-key="owner" aria-label="Owner">' + Q.options(people.concat([['_none', 'Unassigned']]), f.owner, 'Everyone') + '</select>' +
      (opts && opts.status === false ? '' : '<select data-filter-key="status" aria-label="Status">' + Q.options([['open', 'All open']].concat(Q.STATUS_ORDER.map(function (s) { return [s, Q.STATUS[s].label]; })), f.status, 'Any status') + '</select>') +
      '<select data-filter-key="pri" aria-label="Priority">' + Q.options(Object.keys(Q.PRIORITY).map(function (p) { return [p, p + ' ' + Q.PRIORITY[p]]; }), f.pri, 'Any priority') + '</select>' +
      '<select data-filter-key="due" aria-label="Due">' + Q.options([['overdue', 'Overdue'], ['week', 'Due in 7 days'], ['nodue', 'No due date'], ['mine', 'Only mine']], f.due, 'Any due date') + '</select>' +
      (active ? '<button class="btn small ghost" data-act="clearFilters">Clear filters</button>' : '') + '</div>';
  }
  Q.filterBar = filterBar;

  Q.views.tasks = function () {
    var list = Q.filteredTasks();
    var f = S.filters;
    var filtered = Object.keys(f).some(function (k) { return f[k]; });
    var byDept = {};
    list.forEach(function (t) { ((byDept[t.dept] = byDept[t.dept] || {})[t.group] = byDept[t.dept][t.group] || []).push(t); });
    var rows = '';
    S.data.departments.forEach(function (d) {
      var groups = byDept[d.id];
      if (!groups) return;
      var n = Object.keys(groups).reduce(function (s, k) { return s + groups[k].length; }, 0);
      rows += '<tr class="drow2"><td colspan="7">' + esc(d.name) + ' <span class="muted small">' + n + '</span></td></tr>';
      Object.keys(groups).sort(function (a, b) { return wbsCmp((Q.ix.groups[a] || {}).wbs, (Q.ix.groups[b] || {}).wbs); }).forEach(function (gid) {
        var g = Q.ix.groups[gid] || { title: '—', wbs: '' }, ts = groups[gid];
        var closed = S.collapsed[gid] && !filtered;
        rows += '<tr class="grow' + (closed ? ' collapsed' : '') + '" data-act="collapse" data-id="' + gid + '"><td class="wbs">' + esc(g.wbs) + '</td>' +
          '<td colspan="4"><span class="caret">▾</span>' + esc(g.title) + ' <span class="muted small" style="font-weight:400">' + ts.length + ' tasks</span></td>' +
          '<td colspan="2">' + Q.minibar({ status: 'X', pct: Q.avgPct(ts) }) + '</td></tr>';
        if (closed) return;
        ts.sort(function (a, b) { return wbsCmp(a.wbs, b.wbs); }).forEach(function (t) {
          rows += '<tr class="trow" data-open="' + t.id + '"><td class="wbs">' + esc(t.wbs) + '</td>' +
            '<td style="min-width:260px"><span style="font-weight:500">' + esc(t.title) + '</span>' + (t.recur ? '<span class="tag-soft">' + esc(t.recur) + '</span>' : '') +
            (t.grade ? '<span class="tag-soft">Gr ' + esc(t.grade) + '</span>' : '') + '</td>' +
            '<td><span class="owner-cell">' + (t.owner ? Q.av(t.owner, 's') : '') + esc(Q.pname(t.owner)) + '</span></td>' +
            '<td>' + Q.priPill(t.pri) + '</td><td>' + Q.statusPill(t.status) + '</td><td style="min-width:130px">' + Q.minibar(t) + '</td><td>' + Q.duePill(t) + '</td></tr>';
        });
      });
    });
    return '<div class="head"><div><h1>All tasks</h1><p class="sub">' + list.length + ' of ' + Q.tasks().length + ' tasks · everyone can see all work</p></div>' +
      '<div class="actions"><button class="btn" data-act="exportTasks">Export CSV</button><button class="btn" data-act="collapseAll">Collapse all</button><button class="btn primary" data-act="newTask">' + icon('plus', ' width="16" height="16"') + 'New task</button></div></div>' +
      filterBar() +
      (list.length ? '<div class="tbl-wrap"><table><thead><tr><th>WBS</th><th>Task</th><th>Owner</th><th>Priority</th><th>Status</th><th>Progress</th><th>Due</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : emptyBox('No tasks match these filters.'));
  };

  function wbsCmp(a, b) {
    var x = String(a || '').split('.').map(Number), y = String(b || '').split('.').map(Number);
    for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (x[i] || 0) - (y[i] || 0); if (d) return d; }
    return 0;
  }
  Q.wbsCmp = wbsCmp;

  /* ================= BOARD ================= */
  var BOARD_COLS = ['NOT_STARTED', 'IN_PROGRESS', 'UNDER_REVIEW', 'BLOCKED', 'ON_HOLD', 'COMPLETED'];
  Q.views.board = function () {
    var list = Q.filteredTasks();
    var cols = BOARD_COLS.map(function (s) {
      var ts = list.filter(function (t) { return t.status === s; });
      var hidden = 0;
      if (s === 'COMPLETED') {
        var recent = ts.filter(function (t) { return !t.completedAt || Q.diff(Q.isoDay(t.completedAt)) >= -30; });
        hidden = ts.length - recent.length; ts = recent;
      }
      ts.sort(function (a, b) { return Q.dueInfo(a).rank - Q.dueInfo(b).rank || a.pri.localeCompare(b.pri); });
      var shown = ts.slice(0, 60);
      return '<div class="col" data-drop="' + s + '"><div class="col-h"><i style="background:' + Q.STATUS[s].color + '"></i>' + Q.STATUS[s].label + ' <span>' + ts.length + '</span></div>' +
        '<div class="kcards">' + shown.map(function (t) {
          var can = Q.canEdit(t);
          return '<div class="kcard' + (can ? '' : ' locked') + '"' + (can ? ' draggable="true"' : '') + ' data-drag="' + t.id + '" data-open="' + t.id + '" tabindex="0">' +
            '<div class="gp">' + taskMeta(t) + '</div><div class="tt">' + esc(t.title) + '</div>' +
            (t.status === 'BLOCKED' && t.blocker ? '<div class="blk">' + esc(t.blocker) + '</div>' : '') +
            '<div class="ft">' + Q.priPill(t.pri) + Q.duePill(t) + '<span style="margin-left:auto">' + (t.owner ? Q.av(t.owner, 's') : '') + '</span></div>' +
            (t.status !== 'COMPLETED' && t.pct ? '<div class="bar" style="margin-top:8px;height:5px"><span style="width:' + t.pct + '%"></span></div>' : '') + '</div>';
        }).join('') + (ts.length > shown.length ? '<div class="more">+' + (ts.length - shown.length) + ' more – use filters</div>' : '') +
        (hidden ? '<div class="more">' + hidden + ' older completed hidden</div>' : '') + '</div></div>';
    }).join('');
    return '<div class="head"><div><h1>Board</h1><p class="sub">Drag your own tasks between columns to change status.</p></div></div>' +
      filterBar({ status: false }) + '<div class="board" style="grid-template-columns:repeat(6,minmax(220px,1fr))">' + cols + '</div>';
  };
  Q.afterRender.board = function () {
    var dragId = null;
    Q.$$('[data-drag][draggable]').forEach(function (c) {
      c.addEventListener('dragstart', function (e) { dragId = c.dataset.drag; e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; });
    });
    Q.$$('[data-drop]').forEach(function (col) {
      col.addEventListener('dragover', function (e) { if (dragId) { e.preventDefault(); col.classList.add('over'); } });
      col.addEventListener('dragleave', function () { col.classList.remove('over'); });
      col.addEventListener('drop', function (e) {
        e.preventDefault(); col.classList.remove('over');
        var id = dragId; dragId = null;
        var t = Q.ix.tasks[id];
        if (!t || t.status === col.dataset.drop) return;
        Q.changeStatus(t, col.dataset.drop);
      });
    });
  };

  /* ================= DEADLINES ================= */
  Q.views.deadlines = function () {
    var open = Q.filteredTasks().filter(Q.isOpen);
    var groups = [
      ['Overdue', open.filter(Q.isOverdue), 'var(--coral)'],
      ['Next 7 days', open.filter(function (t) { return t.due && Q.diff(t.due) >= 0 && Q.diff(t.due) <= 7; }), 'var(--gold)'],
      ['8–30 days', open.filter(function (t) { return t.due && Q.diff(t.due) > 7 && Q.diff(t.due) <= 30; }), 'var(--purple)'],
      ['Later', open.filter(function (t) { return t.due && Q.diff(t.due) > 30; }), 'var(--teal)'],
      ['No due date', open.filter(function (t) { return !t.due; }), 'var(--notstarted)']
    ];
    return '<div class="head"><div><h1>Deadlines</h1><p class="sub">Open tasks by how soon they are due. Tasks without a date get no reminders.</p></div></div>' +
      filterBar({ status: false }) + '<div class="dl-grid">' + groups.map(function (g) {
        var ts = g[1].slice().sort(function (a, b) { return Q.dueInfo(a).rank - Q.dueInfo(b).rank; });
        return '<div class="panel" style="border-top:3px solid ' + g[2] + '"><div class="panel-h"><h2>' + g[0] + '</h2><span class="muted num">' + ts.length + '</span></div>' +
          '<div class="list" style="max-height:480px;overflow-y:auto">' + (ts.length ? ts.map(function (t) {
            return '<div class="li" data-open="' + t.id + '"><div><div class="tt">' + esc(t.title) + '</div><div class="mt">' + esc(Q.pname(t.owner)) + ' · ' + taskMeta(t) + '</div></div>' +
              (t.due ? '<span class="pill ' + Q.dueInfo(t).cls + '">' + Q.fmt(t.due) + '</span>' : Q.priPill(t.pri)) + '</div>';
          }).join('') : emptyBox('Nothing here')) + '</div></div>';
      }).join('') + '</div>';
  };

  /* ================= TEAM ================= */
  Q.views.team = function () {
    var all = Q.tasks();
    var admin = Q.isAdmin();
    var people = Q.members().map(function (u) {
      var mine = all.filter(function (t) { return Q.ownerIds(t).indexOf(u.id) >= 0 && t.ownerType === 'USER'; });
      var shared = all.filter(function (t) { return t.ownerType === 'TEAM' && Q.ownerIds(t).indexOf(u.id) >= 0 && Q.isOpen(t); }).length;
      var open = mine.filter(Q.isOpen), over = open.filter(Q.isOverdue);
      var doneMonth = mine.filter(function (t) { return t.status === 'COMPLETED' && t.completedAt && Q.diff(Q.isoDay(t.completedAt)) >= -30; }).length;
      var upd = open.filter(Q.updatedToday).length;
      var depts = (Q.ix.userDepts[u.id] || []).map(function (d) { return '<span class="dept-tag">' + esc(Q.deptOf(d).name) + '</span>'; }).join('');
      var note = open.length === 0 ? '<div class="loadnote ok">Free for new work</div>' :
        over.length >= 3 ? '<div class="loadnote heavy">' + over.length + ' overdue – may need help</div>' :
        '<div class="loadnote ok">' + upd + ' of ' + open.length + ' updated today</div>';
      var next = open.filter(function (t) { return t.due; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; })[0];
      return '<div class="panel person"><div class="ph">' + Q.av(u.id, 'l') + '<div style="min-width:0"><h3>' + esc(u.name) + '</h3>' +
        (depts ? '<div class="dept-tags">' + depts + '</div>' : '<div class="muted small">No department yet</div>') +
        (admin && u.email ? '<div class="muted small" style="overflow-wrap:anywhere">' + esc(u.email) + (u.whatsapp ? ' · ' + esc(u.whatsapp) : '') + '</div>' : '') + '</div></div>' +
        '<div class="pstats"><div><b class="num">' + open.length + '</b><span>Open</span></div><div><b class="num ' + (over.length ? 'warn' : '') + '">' + over.length + '</b><span>Overdue</span></div>' +
        '<div><b class="num">' + open.filter(function (t) { return t.status === 'IN_PROGRESS'; }).length + '</b><span>Active</span></div><div><b class="num">' + doneMonth + '</b><span>Done 30d</span></div></div>' +
        note + (shared ? '<div class="small muted">Also shares ' + shared + ' open team task' + (shared === 1 ? '' : 's') + '</div>' : '') + (next ? '<div class="small muted">Next: <a href="#" data-open="' + next.id + '">' + esc(next.title) + '</a> · ' + Q.fmt(next.due) + '</div>' : '') +
        '<button class="btn small" data-filter="' + filterAttr({ owner: u.id, status: 'open' }) + '">See ' + esc(u.name) + '’s tasks</button></div>';
    }).join('');
    var teams = S.data.teams.map(function (t) {
      var ts = all.filter(function (x) { return x.owner === t.id; });
      return '<div class="li" data-filter="' + filterAttr({ owner: t.id }) + '"><div><div class="tt">' + esc(t.name) + '</div><div class="mt">' +
        t.members.map(function (m) { return esc(Q.pname(m)); }).join(', ') + '</div></div><span class="pill">' + ts.filter(Q.isOpen).length + ' open</span></div>';
    }).join('');
    var depts = S.data.departments.filter(function (d) { return d.active; }).map(function (d) {
      var ts = all.filter(function (t) { return t.dept === d.id; });
      var who = Object.keys(Q.ix.userDepts).filter(function (u) { return Q.ix.userDepts[u].indexOf(d.id) >= 0 && Q.ix.users[u] && Q.ix.users[u].active; });
      var st = Q.ix.stages[d.id] || [];
      return '<div class="panel"><div class="panel-h"><h2>' + esc(d.name) + '</h2><span class="pill">' + ts.filter(Q.isOpen).length + ' open</span></div>' +
        '<div class="avs" style="gap:4px">' + (who.length ? who.map(function (u) { return Q.av(u, 's'); }).join('') + '<span class="muted small" style="margin-left:8px">' + who.map(Q.pname).join(', ') + '</span>' : '<span class="muted small">No members yet</span>') + '</div>' +
        (st.length ? '<div class="flow">' + st.map(function (s) { var n = ts.filter(function (t) { return t.stage === s.code && Q.isOpen(t); }).length; return '<span>' + esc(s.label) + (n ? '<b>' + n + '</b>' : '') + '</span>'; }).join('→') + '</div>' : '') + '</div>';
    }).join('');
    return '<div class="head"><div><h1>Team</h1><p class="sub">Everyone’s workload at a glance</p></div>' + (admin ? '<div class="actions"><button class="btn" data-go="admin">Manage people</button></div>' : '') + '</div>' +
      '<div class="people mb">' + people + '</div>' +
      '<div class="grid g-2"><div class="panel"><div class="panel-h"><h2>Shared team tasks</h2></div><div class="list">' + (teams || emptyBox('No teams')) + '</div></div>' +
      '<div class="grid">' + depts + '</div></div>';
  };
})();
