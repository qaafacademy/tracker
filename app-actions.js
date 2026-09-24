/* Qaaf Tracker – task drawer, forms, actions, events, start-up */
(function () {
  'use strict';
  var Q = window.Q, S = Q.S, esc = Q.esc, icon = Q.icon, $ = Q.$;

  /* ================= helpers ================= */
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function checked(name) { return Q.$$('input[name="' + name + '"]:checked').map(function (x) { return x.value; }); }
  function download(name, text, mime) {
    var blob = text instanceof Blob ? text : new Blob([text], { type: mime || 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }
  function csv(rows) {
    return '\ufeff' + rows.map(function (r) {
      return r.map(function (v) {
        var s = v === null || v === undefined ? '' : String(v);
        if (/^[=+\-@]/.test(s)) s = "'" + s;
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\r\n');
  }
  function renderText(text) {
    var names = {};
    Q.activeUsers().forEach(function (u) { names[u.name.split(/\s+/)[0].toLowerCase()] = 1; });
    return esc(text)
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|\s)@([A-Za-z0-9]+)/g, function (m, pre, n) { return names[n.toLowerCase()] ? pre + '<span class="mention">@' + n + '</span>' : m; })
      .replace(/\n/g, '<br>');
  }
  function peopleChecks(name, selected) {
    return '<div class="checks">' + Q.activeUsers().map(function (u) {
      return '<label><input type="checkbox" name="' + name + '" value="' + u.id + '"' + (selected.indexOf(u.id) >= 0 ? ' checked' : '') + '>' + esc(u.name) + '</label>';
    }).join('') + '</div>';
  }
  function groupOptions(dept, current) {
    var gs = S.data.groups.filter(function (g) { return g.dept === dept && !g.archived; }).sort(function (a, b) { return Q.wbsCmp(a.wbs, b.wbs); });
    return Q.options(gs.map(function (g) { return [g.id, g.title]; }), current) + '<option value="__new">+ New workstream…</option>';
  }
  function deptOptions(current) {
    return Q.options(S.data.departments.filter(function (d) { return d.active; }).map(function (d) { return [d.id, d.name]; }), current);
  }
  Q.readFile = function (file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result)); };
      r.onerror = function () { reject(new Error('The file could not be read.')); };
      r.readAsDataURL(file);
    });
  };
  Q.resizePhoto = function (file) {
    return Q.readFile(file).then(function (dataUrl) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () {
          var size = 160, c = document.createElement('canvas');
          c.width = size; c.height = size;
          var s = Math.min(img.width, img.height), sx = (img.width - s) / 2, sy = (img.height - s) / 2;
          c.getContext('2d').drawImage(img, sx, sy, s, s, 0, 0, size, size);
          var q = 0.85, out = c.toDataURL('image/jpeg', q);
          while (out.length > 44000 && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
          resolve(out);
        };
        img.onerror = function () { reject(new Error('This picture could not be opened. Try a JPG or PNG.')); };
        img.src = dataUrl;
      });
    });
  };

  /* ================= TASK DRAWER ================= */
  Q.openTask = function (id) {
    if (!Q.ix.tasks[id]) { Q.toast('This task is not available.', true); return; }
    S.drawer = { id: id, detail: null };
    closeNotif();
    if (!$('#drawer')) {
      var scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.id = 'd-scrim';
      scrim.addEventListener('click', Q.closeDrawer);
      var d = document.createElement('aside'); d.className = 'drawer'; d.id = 'drawer';
      d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'dr-title');
      document.body.appendChild(scrim); document.body.appendChild(d);
      requestAnimationFrame(function () { d.classList.add('open'); });
    }
    renderDrawer();
    $('#drawer').focus();
    loadDetail(id);
  };
  function loadDetail(id) {
    return Q.api('task.get', { id: id }).then(function (r) {
      if (S.drawer && S.drawer.id === id) { S.drawer.detail = r; renderDrawer(); }
    }).catch(function (e) {
      if (S.drawer && S.drawer.id === id && e.code !== 'AUTH') { S.drawer.error = e.message; renderDrawer(); }
    });
  }
  Q.refreshDrawer = function (refetch) {
    if (!S.drawer) return;
    if (!Q.ix.tasks[S.drawer.id]) { Q.closeDrawer(); return; }
    renderDrawer();
    if (refetch) loadDetail(S.drawer.id);
  };
  Q.closeDrawer = function () {
    S.drawer = null;
    var d = $('#drawer'), s = $('#d-scrim');
    if (d) { d.classList.remove('open'); setTimeout(function () { d.remove(); }, 200); }
    if (s) s.remove();
    if (/^#\/task\//.test(location.hash)) history.replaceState(null, '', '#/tasks');
  };

  function renderDrawer() {
    var el = $('#drawer'); if (!el || !S.drawer) return;
    var t = Q.ix.tasks[S.drawer.id]; if (!t) return;
    var can = Q.canEdit(t), D = S.drawer.detail, done = !Q.isOpen(t);
    var dept = Q.deptOf(t.dept), g = Q.groupOf(t), stages = Q.ix.stages[t.dept] || [];
    var cl = Q.checklistOf(t.id), cld = cl.filter(function (c) { return c.done; }).length;
    var creator = t.createdBy ? Q.pname(t.createdBy) : 'Imported from Excel';
    var ro = function (v) { return '<span>' + v + '</span>'; };

    var details =
      '<dt>Owner</dt><dd>' + (can ? '<select data-field="owner" aria-label="Owner">' + Q.ownerOptions(t.owner, true) + '</select>' : ro((t.owner ? Q.av(t.owner, 's') + ' ' : '') + esc(Q.pname(t.owner)))) + '</dd>' +
      '<dt>Status</dt><dd>' + (can ? '<select data-field="status" aria-label="Status">' + Q.options(Q.STATUS_ORDER.map(function (s) { return [s, Q.STATUS[s].label]; }), t.status) + '</select>' : Q.statusPill(t.status)) + '</dd>' +
      '<dt>Priority</dt><dd>' + (can ? '<select data-field="pri" aria-label="Priority">' + Q.options(Object.keys(Q.PRIORITY).map(function (p) { return [p, p + ' – ' + Q.PRIORITY[p]]; }), t.pri) + '</select>' : Q.priPill(t.pri) + ' ' + Q.PRIORITY[t.pri]) + '</dd>' +
      '<dt>Due date</dt><dd>' + (can ? '<input type="date" data-field="due" value="' + esc(t.due) + '" aria-label="Due date">' : ro(Q.fmt(t.due))) + (t.due ? ' ' + Q.duePill(t) : '') + '</dd>' +
      '<dt>Workstream</dt><dd>' + (can ? '<select data-field="group" aria-label="Workstream">' + Q.options(S.data.groups.filter(function (x) { return !x.archived; }).sort(function (a, b) { return Q.wbsCmp(a.wbs, b.wbs); }).map(function (x) { return [x.id, Q.deptOf(x.dept).name + ' › ' + x.title]; }), t.group) + '</select>' : ro(esc(g.title))) + '</dd>' +
      (stages.length ? '<dt>Stage</dt><dd>' + (can ? '<select data-field="stage" aria-label="Stage">' + Q.options(stages.map(function (s) { return [s.code, s.label]; }), t.stage, '—') + '</select>' : ro(esc((stages.find(function (s) { return s.code === t.stage; }) || {}).label || '—'))) + '</dd>' : '') +
      '<dt>Progress</dt><dd>' + Q.minibar(t) + (cl.length ? '<div class="muted small">Follows the checklist</div>' : '') +
        (t.qty ? '<div class="small"><b>' + Q.filesDone(t) + '</b> of ' + t.qty + ' files done</div>' : '') + '</dd>' +
      '<dt>Files</dt><dd>' + (can ? '<input type="number" min="1" step="1" data-field="qty" value="' + (t.qty || '') + '" style="width:90px" aria-label="Number of files"> <span class="muted small">for counting files (optional)</span>' : (t.qty ? t.qty + ' files' : '—')) + '</dd>' +
      '<dt>Time</dt><dd>' + (t.act ? t.act + ' h spent' : 'No hours logged') + (can ? ' · est. <input type="number" min="0" step="0.5" data-field="est" value="' + (t.est === null || t.est === undefined ? '' : t.est) + '" style="width:80px" aria-label="Estimated hours"> h' : t.est ? ' · est. ' + t.est + ' h' : '') + '</dd>' +
      '<dt>Created</dt><dd class="small">' + esc(creator) + (t.createdAt && t.createdBy ? ' · ' + Q.ago(t.createdAt) : '') + '</dd>' +
      (t.baselineDue ? '<dt>Old plan</dt><dd class="small muted">Excel date ' + Q.fmt(t.baselineDue) + '</dd>' : '') +
      (t.recur ? '<dt>Repeats</dt><dd>' + esc(t.recur) + '</dd>' : '') +
      (t.grade ? '<dt>Grades</dt><dd>' + esc(t.grade) + '</dd>' : '');

    var checklist = '<div class="label">Checklist' + (cl.length ? ' · ' + cld + '/' + cl.length : '') + '</div>' +
      cl.map(function (c) {
        return '<div class="cl-item' + (c.done ? ' done' : '') + '"><input type="checkbox" data-act="clToggle" data-id="' + c.id + '"' + (c.done ? ' checked' : '') + (can ? '' : ' disabled') + ' aria-label="' + esc(c.text) + '">' +
          '<span>' + esc(c.text) + '</span>' + (can ? '<button class="btn small ghost" data-act="clRemove" data-id="' + c.id + '" aria-label="Remove step">' + icon('close', ' width="14" height="14"') + '</button>' : '') + '</div>';
      }).join('') +
      (can ? '<div class="addrow"><input type="text" id="cl-new" maxlength="300" placeholder="Add a step – progress updates as steps are ticked" aria-label="New checklist step"><button class="btn" data-act="clAdd">Add</button></div>'
        : cl.length ? '' : '<p class="muted small">No checklist.</p>');

    var files = '', comments = '', history = '';
    if (D) {
      files = '<div class="label">Files' + (D.attachments.length ? ' · ' + D.attachments.length : '') + '</div>' +
        D.attachments.map(function (a) {
          var ext = (a.name.split('.').pop() || '').slice(0, 4).toUpperCase();
          return '<div class="file"><span class="file-ic">' + esc(ext) + '</span><div class="fn"><div class="fn" title="' + esc(a.name) + '">' + esc(a.name) + '</div><div class="muted small">' + Q.bytes(a.size) + ' · ' + esc(Q.pname(a.by)) + ' · ' + Q.ago(a.at) + '</div></div>' +
            '<button class="btn small" data-act="fileGet" data-id="' + a.id + '">Open</button>' +
            (a.by === Q.me() || Q.isAdmin() ? '<button class="btn small ghost" data-act="fileRemove" data-id="' + a.id + '" aria-label="Remove file">' + icon('close', ' width="14" height="14"') + '</button>' : '') + '</div>';
        }).join('') +
        '<label class="btn small" style="margin-top:8px">' + icon('clip', ' width="15" height="15"') + 'Attach a file<input type="file" id="file-in" hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp,.heic"></label>' +
        '<span class="muted small"> up to ' + S.data.settings.maxUploadMb + ' MB</span>';
      comments = '<div class="label">Comments' + (D.comments.length ? ' · ' + D.comments.length : '') + '</div>' +
        D.comments.map(function (c) {
          return '<div class="comment"><div class="who">' + Q.av(c.user, 's') + '<b class="small">' + esc(Q.pname(c.user)) + '</b><span class="faint small">' + Q.ago(c.at) + '</span>' +
            (c.user === Q.me() || Q.isAdmin() ? '<button class="btn small ghost" style="margin-left:auto;padding:0 6px" data-act="commentRemove" data-id="' + c.id + '" aria-label="Delete comment">' + icon('close', ' width="13" height="13"') + '</button>' : '') + '</div>' + renderText(c.text) + '</div>';
        }).join('') +
        '<div style="position:relative"><textarea id="c-text" maxlength="3000" placeholder="Write a comment. Type @ to mention someone." aria-label="Comment"></textarea></div>' +
        '<div style="display:flex;justify-content:flex-end;margin-top:6px"><button class="btn" data-act="commentAdd">Post comment</button></div>';
      var events = D.history.map(function (h) { return { at: h.at, user: h.user, html: histText(h) }; })
        .concat(D.updates.filter(function (u) { return u.workDone || u.nextAction || u.hours; }).map(function (u) {
          return { at: u.at, user: u.user, html: 'daily update' + (u.hours ? ' · ' + u.hours + ' h' : '') + (u.workDone ? '<div>' + esc(u.workDone) + '</div>' : '') + (u.nextAction ? '<div class="muted">Next: ' + esc(u.nextAction) + '</div>' : '') };
        })).sort(function (a, b) { return a.at < b.at ? 1 : -1; });
      history = '<div class="label">History</div>' + (events.length ? '<div class="hist">' + events.slice(0, 40).map(function (e) {
        return '<div><time>' + Q.ago(e.at) + '</time><b>' + esc(Q.pname(e.user)) + '</b> ' + e.html + '</div>';
      }).join('') + '</div>' : '<p class="muted small">No changes yet.</p>');
    } else {
      files = S.drawer.error ? '<div class="empty" style="margin-top:18px">' + esc(S.drawer.error) + '</div>' : '<div class="spinner"></div><p class="muted small" style="text-align:center">Loading comments and files…</p>';
    }

    el.innerHTML = '<div class="dr-h"><div class="ttl"><div class="muted small">' + esc(t.wbs) + ' · ' + esc(dept.name) + ' › ' + esc(g.title) + '</div>' +
      (can ? '<input type="text" id="dr-title-in" data-field="title" value="' + esc(t.title) + '" maxlength="300" aria-label="Task name" style="width:100%;font-size:17px;font-weight:600;border-color:transparent;padding:4px 6px;margin-left:-6px">' +
        '<h2 id="dr-title" hidden>' + esc(t.title) + '</h2>' : '<h2 id="dr-title">' + esc(t.title) + '</h2>') +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' + Q.statusPill(t.status) + Q.priPill(t.pri) + Q.duePill(t) + (t.archived ? '<span class="pill due-over">Archived</span>' : '') + '</div></div>' +
      '<button class="icon-btn" data-act="closeDrawer" aria-label="Close">' + icon('close') + '</button></div>' +
      '<div class="dr-b">' +
      (t.status === 'BLOCKED' && t.blocker ? '<div class="blocker-box"><b>Blocked:</b> ' + esc(t.blocker) + '</div>' : '') +
      (can ? '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">' +
        (done ? '<button class="btn" data-act="toggleDone" data-id="' + t.id + '">Reopen task</button>' :
          '<button class="btn primary" data-act="update" data-id="' + t.id + '">Update progress</button><button class="btn" data-act="toggleDone" data-id="' + t.id + '">' + icon('check', ' width="15" height="15"') + 'Mark complete</button>') + '</div>'
        : !t.archived ? '<p class="muted small" style="margin-top:14px">You can view and comment. Only the owner, the person who created this task or the admin can change it.</p>' : '') +
      '<dl class="kv">' + details + '</dl>' +
      '<div class="label">Description</div>' + (can ? '<textarea id="dr-desc" maxlength="5000" placeholder="Add details, links or instructions">' + esc(t.description) + '</textarea><div style="display:flex;justify-content:flex-end;margin-top:6px"><button class="btn small" data-act="saveDesc">Save description</button></div>'
        : '<p style="white-space:pre-wrap;margin:0">' + (renderText(t.description) || '<span class="muted">No description</span>') + '</p>') +
      (t.notes ? '<div class="label">Notes</div><p style="white-space:pre-wrap;margin:0" class="small">' + renderText(t.notes) + '</p>' : '') +
      checklist + files + comments + history +
      (Q.isAdmin() ? '<div class="label">Admin</div>' + (t.archived ? '<button class="btn" data-act="restore" data-id="' + t.id + '">Restore task</button>' : '<button class="btn danger" data-act="archive" data-id="' + t.id + '">Archive task</button><span class="muted small"> Archived tasks can be restored from Admin.</span>') : '') +
      '</div>';
    el.tabIndex = -1;
    var fi = $('#file-in'); if (fi) fi.addEventListener('change', uploadFile);
    var ct = $('#c-text'); if (ct) attachMentions(ct);
    var ti = $('#dr-title-in');
    if (ti) {
      ti.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ti.blur(); } });
      ti.addEventListener('blur', function () { var v = ti.value.trim(); if (v && v !== t.title) saveTask(t, { title: v }); else ti.value = t.title; });
    }
  }
  function histText(h) {
    if (h.field === 'created') return 'created this task' + (h.reason ? ' <span class="muted">(' + esc(h.reason) + ')</span>' : '');
    if (h.field === 'archived' || h.field === 'restored') return h.field + ' this task';
    if (h.field === 'file added') return 'added <b>' + esc(h.to) + '</b>';
    if (h.field === 'file removed') return 'removed <b>' + esc(h.from) + '</b>';
    if (h.field === 'description' || h.field === 'notes') return 'updated the ' + h.field;
    var from = h.from, to = h.to;
    if (h.field === 'due date') { from = from ? Q.fmt(from) : 'none'; to = to ? Q.fmt(to) : 'none'; }
    if (h.field === 'progress') { from = (from || 0) + '%'; to = to + '%'; }
    return 'changed ' + esc(h.field) + ' from <b>' + esc(from || '—') + '</b> to <b>' + esc(to || '—') + '</b>' + (h.reason ? '<div class="muted">Reason: ' + esc(h.reason) + '</div>' : '');
  }

  function afterTaskSave(r) {
    if (!r) return null;
    Q.applyTask(r.task, r.checklist);
    Q.render();
    if (S.drawer && S.drawer.id === r.task.id) loadDetail(r.task.id);
    return r;
  }
  function saveTask(t, patch, extra, btn, msg) {
    var p = { id: t.id, patch: patch };
    if (extra) p.update = extra;
    return Q.run(btn, 'task.update', p, msg || 'Saved').then(function (r) {
      if (!r) { renderDrawer(); return null; }
      return afterTaskSave(r);
    });
  }

  function onDrawerField(el) {
    var t = Q.ix.tasks[S.drawer.id], f = el.dataset.field, v = el.value;
    if (!t || f === 'title') return;
    if (f === 'status') { Q.changeStatus(t, v); return; }
    if (f === 'due') { changeDue(t, v); return; }
    if (f === 'est') { saveTask(t, { est: v === '' ? '' : Number(v) }); return; }
    if (f === 'qty') { saveTask(t, { qty: v === '' ? '' : Number(v) }); return; }
    var patch = {}; patch[f] = v;
    saveTask(t, patch);
  }

  function changeDue(t, newDue) {
    if (newDue === (t.due || '')) return;
    if (!t.due) { saveTask(t, { due: newDue }, null, null, newDue ? 'Due date set' : 'Saved'); return; }
    var m = Q.openModal(Q.modalHead('Why is the due date changing?', t.title) +
      '<div class="md-b"><p>' + Q.fmt(t.due) + ' → <b>' + (newDue ? Q.fmt(newDue) : 'no date') + '</b></p>' +
      '<div class="field"><label for="due-reason">Reason</label><input id="due-reason" type="text" maxlength="500" placeholder="e.g. waiting for design approval" autofocus>' +
      '<div class="hint">Everyone can see this in the task history.</div></div></div>' +
      '<div class="md-f"><button class="btn" data-act="closeModal">Cancel</button><button class="btn primary" id="due-save">Change due date</button></div>');
    m.querySelector('#due-save').addEventListener('click', function (e) {
      var reason = val('due-reason');
      if (!reason) { Q.toast('Please give a reason.', true); return; }
      saveTask(t, { due: newDue, dueReason: reason }, null, e.currentTarget, 'Due date changed').then(function (r) { if (r) Q.closeModal(); });
    });
    m.addEventListener('keydown', function (e) { if (e.key === 'Enter') m.querySelector('#due-save').click(); });
    var old = Q.closeModal;
    Q.closeModal = function () { Q.closeModal = old; old(); renderDrawer(); };
  }

  Q.changeStatus = function (t, status) {
    if (!Q.canEdit(t)) { Q.toast('Only the owner, the creator or the admin can change this task.', true); Q.render(); return; }
    if (status === 'BLOCKED' && !t.blocker) { openUpdate(t, 'BLOCKED'); return; }
    saveTask(t, { status: status }, null, null, status === 'COMPLETED' ? 'Marked complete' : 'Status: ' + Q.STATUS[status].label);
  };

  /* ---------- update progress modal ---------- */
  function openUpdate(t, presetStatus) {
    var cl = Q.checklistOf(t.id);
    var st = presetStatus || (t.status === 'NOT_STARTED' ? 'IN_PROGRESS' : t.status);
    var m = Q.openModal(Q.modalHead('Update progress', t.title) +
      '<div class="md-b">' +
      '<div class="field"><span class="lbl">Status</span><div class="seg" id="u-status">' + Q.STATUS_ORDER.map(function (s) {
        return '<button type="button" data-s="' + s + '" aria-pressed="' + (s === st) + '">' + Q.STATUS[s].label + '</button>';
      }).join('') + '</div></div>' +
      (cl.length ? '<div class="field"><span class="lbl">Progress</span><div class="hint">Progress follows the checklist (' + cl.filter(function (c) { return c.done; }).length + ' of ' + cl.length + ' steps done). Tick steps in the task.</div></div>'
        : t.qty ? '<div class="field"><label for="u-files">Files done so far <span class="muted">(of ' + t.qty + ')</span></label><input type="number" id="u-files" min="0" max="' + t.qty + '" step="1" value="' + Q.filesDone(t) + '" style="max-width:140px"><div class="hint" id="u-files-pct">' + (t.pct || 0) + '% done</div></div>'
        : '<div class="field"><label for="u-pct">Progress <span class="pctv" id="u-pctv">' + (t.pct || 0) + '%</span></label><input type="range" id="u-pct" min="0" max="100" step="5" value="' + (t.pct || 0) + '"></div>') +
      '<div class="field" id="u-blk-wrap"' + (st === 'BLOCKED' ? '' : ' hidden') + '><label for="u-blk">What is blocking it?</label><input id="u-blk" type="text" maxlength="500" value="' + esc(t.blocker) + '" placeholder="e.g. waiting for printer quote"></div>' +
      '<div class="two"><div class="field"><label for="u-hours">Hours spent today</label><input id="u-hours" type="number" min="0" max="24" step="0.5" placeholder="0"></div><div class="field"></div></div>' +
      '<div class="field"><label for="u-done">What did you do?</label><textarea id="u-done" maxlength="1000" placeholder="Short note for the team"></textarea></div>' +
      '<div class="field"><label for="u-next">Next step</label><input id="u-next" type="text" maxlength="500"></div>' +
      '</div><div class="md-f"><button class="btn" data-act="closeModal">Cancel</button><button class="btn primary" id="u-save">Save update</button></div>');
    var status = st;
    m.querySelector('#u-status').addEventListener('click', function (e) {
      var b = e.target.closest('[data-s]'); if (!b) return;
      status = b.dataset.s;
      Q.$$('#u-status button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      $('#u-blk-wrap').hidden = status !== 'BLOCKED';
      var r = $('#u-pct'); if (r && status === 'COMPLETED') { r.value = 100; $('#u-pctv').textContent = '100%'; }
    });
    var range = m.querySelector('#u-pct'), files = m.querySelector('#u-files');
    if (range) range.addEventListener('input', function () { $('#u-pctv').textContent = range.value + '%'; });
    if (files) files.addEventListener('input', function () {
      var raw = Number(files.value);
      if (isNaN(raw) || raw < 0 || raw > t.qty) { $('#u-files-pct').textContent = 'Enter a number from 0 to ' + t.qty; return; }
      var n = Math.round(raw);
      $('#u-files-pct').textContent = Math.round(n / t.qty * 100) + '% done' + (n === t.qty ? ' – all files done' : '');
      if (n === t.qty && status !== 'COMPLETED') { var cb = m.querySelector('#u-status [data-s="COMPLETED"]'); if (cb) cb.click(); }
    });
    m.querySelector('#u-save').addEventListener('click', function (e) {
      var patch = { status: status };
      if (range && status !== 'COMPLETED') patch.pct = Number(range.value);
      if (files) {
        var n = Number(files.value);
        if (isNaN(n) || n < 0 || n > t.qty) { Q.toast('Files done must be between 0 and ' + t.qty + '.', true); files.focus(); return; }
        if (status !== 'COMPLETED') patch.pct = Math.round(n / t.qty * 100);
      }
      if (status === 'BLOCKED') {
        patch.blocker = val('u-blk');
        if (!patch.blocker) { Q.toast('Please say what is blocking the task.', true); $('#u-blk').focus(); return; }
      }
      var extra = { hours: val('u-hours'), workDone: val('u-done'), nextAction: val('u-next') };
      saveTask(t, patch, extra, e.currentTarget, 'Update saved').then(function (r) { if (r) Q.closeModal(); });
    });
  }

  /* ---------- new task modal ---------- */
  function openNewTask(preset) {
    preset = preset || {};
    var myDepts = Q.ix.userDepts[Q.me()] || [];
    var active = S.data.departments.filter(function (d) { return d.active; });
    if (!active.length) { Q.toast('Add a department first (Admin).', true); return; }
    var dept = preset.dept || (S.filters.dept && Q.ix.depts[S.filters.dept] ? S.filters.dept : (myDepts.filter(function (d) { return Q.ix.depts[d] && Q.ix.depts[d].active; })[0] || active[0].id));
    var owner = preset.owner !== undefined ? preset.owner : (Q.isAdmin() ? '' : Q.me());
    var m = Q.openModal(Q.modalHead(preset.heading || 'New task') +
      '<div class="md-b">' +
      '<div class="field"><label for="n-title">Task</label><input id="n-title" type="text" maxlength="300" value="' + esc(preset.title || '') + '" placeholder="What needs to be done?" autofocus></div>' +
      '<div class="two"><div class="field"><label for="n-dept">Department</label><select id="n-dept">' + deptOptions(dept) + '</select></div>' +
      '<div class="field"><label for="n-group">Workstream</label><select id="n-group">' + groupOptions(dept, preset.group) + '</select>' +
      '<input id="n-newgroup" type="text" maxlength="120" placeholder="Name of the new workstream" hidden style="margin-top:6px"></div></div>' +
      '<div class="two"><div class="field"><label for="n-owner">Owner</label><select id="n-owner">' + Q.ownerOptions(owner, true) + '</select></div>' +
      '<div class="field"><label for="n-due">Due date</label><input id="n-due" type="date" value="' + esc(preset.due || '') + '"></div></div>' +
      '<div class="field"><span class="lbl">Priority</span><div class="seg" id="n-pri">' + Object.keys(Q.PRIORITY).map(function (p) {
        return '<button type="button" data-p="' + p + '" aria-pressed="' + (p === (preset.pri || 'P2')) + '">' + p + ' ' + Q.PRIORITY[p] + '</button>';
      }).join('') + '</div></div>' +
      (preset.fromItem ? '' : '<div class="field"><label for="n-desc">Details <span class="muted">(optional)</span></label><textarea id="n-desc" maxlength="5000"></textarea></div>' +
        '<div class="field"><label for="n-cl">Checklist steps <span class="muted">(optional, one per line)</span></label><textarea id="n-cl" placeholder="Draft\nReview\nPublish"></textarea><div class="hint">With steps, progress updates automatically as they are ticked.</div></div>') +
      '</div><div class="md-f"><button class="btn" data-act="closeModal">Cancel</button><button class="btn primary" id="n-save">' + esc(preset.saveLabel || 'Create task') + '</button></div>', true);
    var pri = preset.pri || 'P2';
    m.querySelector('#n-pri').addEventListener('click', function (e) {
      var b = e.target.closest('[data-p]'); if (!b) return;
      pri = b.dataset.p; Q.$$('#n-pri button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
    });
    var deptSel = m.querySelector('#n-dept'), grpSel = m.querySelector('#n-group'), newG = m.querySelector('#n-newgroup');
    function syncGroup() { newG.hidden = grpSel.value !== '__new'; if (!newG.hidden) newG.focus(); }
    deptSel.addEventListener('change', function () { grpSel.innerHTML = groupOptions(deptSel.value); syncGroup(); });
    grpSel.addEventListener('change', syncGroup);
    syncGroup();
    m.querySelector('#n-save').addEventListener('click', function (e) {
      var btn = e.currentTarget;
      var title = val('n-title');
      if (!title) { Q.toast('Enter a task name.', true); $('#n-title').focus(); return; }
      var groupP = Promise.resolve(grpSel.value);
      if (grpSel.value === '__new') {
        var name = newG.value.trim();
        if (!name) { Q.toast('Name the new workstream.', true); newG.focus(); return; }
        groupP = Q.run(btn, 'group.create', { dept: deptSel.value, title: name }).then(function (r) {
          if (!r) return null;
          if (!Q.ix.groups[r.group.id]) { S.data.groups.push(r.group); Q.index(); }
          grpSel.innerHTML = groupOptions(deptSel.value, r.group.id); syncGroup();
          return r.group.id;
        });
      }
      groupP.then(function (groupId) {
        if (!groupId) return;
        var payload = { title: title, group: groupId, owner: val('n-owner'), pri: pri, due: val('n-due') };
        if (preset.fromItem) {
          payload.id = preset.fromItem;
          return Q.run(btn, 'meetingItem.toTask', payload, 'Task created').then(function (r) {
            if (!r) return;
            Q.applyTask(r.task, r.checklist); Q.closeModal(); Q.reloadMeeting();
          });
        }
        payload.description = val('n-desc');
        payload.checklist = val('n-cl').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        return Q.run(btn, 'task.create', payload, 'Task created').then(function (r) {
          if (!r) return;
          Q.applyTask(r.task, r.checklist); Q.closeModal(); Q.render(); Q.openTask(r.task.id);
        });
      });
    });
  }

  /* ---------- checklist, comments, files ---------- */
  function checklistCall(btn, action, payload) {
    return Q.run(btn, action, payload).then(function (r) { if (r) { Q.applyTask(r.task, r.checklist); Q.render(); renderDrawer(); } return r; });
  }
  function uploadFile(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var max = S.data.settings.maxUploadMb * 1024 * 1024;
    if (file.size > max) { Q.toast('This file is ' + Q.bytes(file.size) + '. The limit is ' + S.data.settings.maxUploadMb + ' MB – share a Google Drive link in a comment instead.', true); return; }
    var label = e.target.closest('label');
    label.classList.add('busy');
    Q.readFile(file).then(function (dataUrl) {
      return Q.api('attachment.upload', { task: S.drawer.id, name: file.name, mime: file.type, data: dataUrl.split(',')[1] });
    }).then(function () { Q.toast('File attached'); loadDetail(S.drawer.id); })
      .catch(function (err) { if (err.code !== 'AUTH') Q.toast(err.message, true); label.classList.remove('busy'); });
  }
  function openFile(btn, id) {
    Q.run(btn, 'attachment.get', { id: id }).then(function (r) {
      if (!r) return;
      var bin = atob(r.data), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var blob = new Blob([bytes], { type: r.mime || 'application/octet-stream' });
      if (/^(image\/|application\/pdf)/.test(r.mime)) {
        var url = URL.createObjectURL(blob);
        var w = window.open(url, '_blank');
        if (!w) download(r.name, blob);
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      } else download(r.name, blob);
    });
  }

  /* ---------- @mentions ---------- */
  function attachMentions(ta) {
    var box = null, idx = 0, matches = [];
    function close() { if (box) { box.remove(); box = null; } }
    function current() {
      var before = ta.value.slice(0, ta.selectionStart);
      var m = /(^|\s)@([A-Za-z0-9]*)$/.exec(before);
      return m ? m[2] : null;
    }
    function pick(u) {
      var pos = ta.selectionStart, before = ta.value.slice(0, pos), after = ta.value.slice(pos);
      var first = u.name.split(/\s+/)[0];
      before = before.replace(/@([A-Za-z0-9]*)$/, '@' + first + ' ');
      ta.value = before + after; ta.focus();
      ta.selectionStart = ta.selectionEnd = before.length;
      close();
    }
    ta.addEventListener('input', function () {
      var q = current();
      if (q === null) { close(); return; }
      matches = Q.activeUsers().filter(function (u) { return u.id !== Q.me() && u.name.toLowerCase().indexOf(q.toLowerCase()) === 0; }).slice(0, 6);
      if (!matches.length) { close(); return; }
      idx = 0;
      if (!box) { box = document.createElement('div'); box.className = 'suggest'; box.setAttribute('role', 'listbox'); ta.parentNode.appendChild(box); }
      box.style.left = '8px'; box.style.top = (ta.offsetHeight + 2) + 'px';
      box.innerHTML = matches.map(function (u, i) { return '<button type="button" role="option" class="' + (i === idx ? 'on' : '') + '" data-i="' + i + '">' + Q.av(u.id, 's') + esc(u.name) + '</button>'; }).join('');
    });
    ta.addEventListener('keydown', function (e) {
      if (!box) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
        Q.$$('button', box).forEach(function (b, i) { b.className = i === idx ? 'on' : ''; });
      } else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(matches[idx]); }
      else if (e.key === 'Escape') { e.stopPropagation(); close(); }
    });
    ta.parentNode.addEventListener('mousedown', function (e) {
      var b = e.target.closest('.suggest button'); if (!b) return;
      e.preventDefault(); pick(matches[Number(b.dataset.i)]);
    });
    ta.addEventListener('blur', function () { setTimeout(close, 150); });
  }

  /* ================= MEETING FORMS ================= */
  function meetingForm(m, isNew) {
    var T = Q.today();
    return '<div class="md-b">' +
      '<div class="field"><label for="mt-title">Title</label><input id="mt-title" type="text" maxlength="150" value="' + esc(m.title || '') + '" autofocus></div>' +
      '<div class="two"><div class="field"><label for="mt-date">Date</label><input id="mt-date" type="date" value="' + esc(m.date || T) + '"></div>' +
      '<div class="field"><label for="mt-time">Time</label><input id="mt-time" type="time" value="' + esc(m.time || '11:00') + '"></div></div>' +
      '<div class="field"><label for="mt-loc">Place or meeting link <span class="muted">(optional)</span></label><input id="mt-loc" type="text" maxlength="300" value="' + esc(m.location || '') + '"></div>' +
      '<div class="field"><span class="lbl">Participants</span>' + peopleChecks('mt-p', m.participants || [Q.me()]) + '</div>' +
      (isNew ? '<div class="field"><label for="mt-agenda">Agenda <span class="muted">(optional)</span></label><textarea id="mt-agenda" maxlength="5000"></textarea></div>' : '') +
      '</div>';
  }
  function openNewMeeting() {
    var m = Q.openModal(Q.modalHead('New meeting') + meetingForm({}, true) +
      '<div class="md-f"><button class="btn" data-act="closeModal">Cancel</button><button class="btn primary" id="mt-save">Create meeting</button></div>');
    m.querySelector('#mt-save').addEventListener('click', function (e) {
      var p = { title: val('mt-title'), date: val('mt-date'), time: val('mt-time'), location: val('mt-loc'), participants: checked('mt-p'), agenda: val('mt-agenda') };
      if (!p.title) { Q.toast('Enter a meeting title.', true); return; }
      Q.run(e.currentTarget, 'meeting.create', p, 'Meeting created').then(function (r) {
        if (!r) return;
        S.data.meetings.push(r.meeting); Q.index(); Q.closeModal(); S.meeting = null; Q.go('meeting', r.meeting.id);
      });
    });
  }
  function openMeetingEdit() {
    var mt = S.meeting.meeting;
    var m = Q.openModal(Q.modalHead('Change meeting details', mt.series ? 'Only this day changes. Edit the recurring meeting in Admin to change every day.' : '') + meetingForm(mt, false) +
      '<div class="md-f"><button class="btn danger" id="mt-cancel" style="margin-right:auto">' + (mt.status === 'CANCELLED' ? 'Restore meeting' : 'Cancel this meeting') + '</button>' +
      '<button class="btn" data-act="closeModal">Close</button><button class="btn primary" id="mt-save">Save changes</button></div>');
    function send(btn, patch, msg) {
      return Q.run(btn, 'meeting.update', { id: mt.id, patch: patch }, msg).then(function (r) {
        if (!r) return;
        var i = S.data.meetings.findIndex(function (x) { return x.id === mt.id; });
        if (i >= 0) S.data.meetings[i] = r.meeting;
        Q.index(); Q.closeModal(); Q.reloadMeeting();
      });
    }
    m.querySelector('#mt-save').addEventListener('click', function (e) {
      send(e.currentTarget, { title: val('mt-title'), date: val('mt-date'), time: val('mt-time'), location: val('mt-loc'), participants: checked('mt-p') }, 'Meeting updated – participants were notified if the time changed');
    });
    m.querySelector('#mt-cancel').addEventListener('click', function (e) {
      send(e.currentTarget, { status: mt.status === 'CANCELLED' ? 'SCHEDULED' : 'CANCELLED' }, mt.status === 'CANCELLED' ? 'Meeting restored' : 'Meeting cancelled');
    });
  }
  function openSeriesEdit(id) {
    var s = id ? S.data.series.find(function (x) { return x.id === id; }) : { title: '', days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], time: '11:00', location: '', participants: [], active: true };
    var m = Q.openModal(Q.modalHead(id ? 'Edit recurring meeting' : 'New recurring meeting') +
      '<div class="md-b"><div class="field"><label for="se-title">Name</label><input id="se-title" type="text" maxlength="150" value="' + esc(s.title) + '" autofocus></div>' +
      '<div class="field"><span class="lbl">Days</span><div class="checks">' + Q.WEEKDAYS.map(function (d) {
        return '<label><input type="checkbox" name="se-d" value="' + d + '"' + (s.days.indexOf(d) >= 0 ? ' checked' : '') + '>' + Q.DAY_LABEL[d] + '</label>';
      }).join('') + '</div></div>' +
      '<div class="two"><div class="field"><label for="se-time">Time</label><input id="se-time" type="time" value="' + esc(s.time) + '"></div>' +
      '<div class="field"><label for="se-loc">Place or link</label><input id="se-loc" type="text" maxlength="300" value="' + esc(s.location) + '"></div></div>' +
      '<div class="field"><span class="lbl">Participants</span>' + peopleChecks('se-p', s.participants) + '</div>' +
      (id ? '<label class="checks" style="margin-bottom:10px"><input type="checkbox" id="se-active"' + (s.active ? ' checked' : '') + '> Running (untick to stop creating new meetings)</label>' : '') +
      '<p class="muted small">If you change the days or time, participants get a notification. Past meetings are not changed.</p></div>' +
      '<div class="md-f"><button class="btn" data-act="closeModal">Cancel</button><button class="btn primary" id="se-save">Save</button></div>');
    m.querySelector('#se-save').addEventListener('click', function (e) {
      var ac = $('#se-active');
      var p = { id: id || '', title: val('se-title'), days: checked('se-d'), time: val('se-time'), location: val('se-loc'), participants: checked('se-p'), active: ac ? ac.checked : true };
      Q.run(e.currentTarget, 'series.save', p, 'Recurring meeting saved').then(function (r) {
        if (!r) return;
        Q.closeModal(); S.meeting = null; Q.load(true);
      });
    });
  }

  /* ================= ADMIN FORMS ================= */
  var COLORS = [['#4A3D8F', 'Qaaf Purple'], ['#F35A71', 'Coral'], ['#48B09A', 'Teal'], ['#D4A415', 'Gold'], ['#8E86C0', 'Light purple'], ['#2E8C77', 'Dark teal'], ['#D63C55', 'Dark coral']];
  function openUserEdit(id) {
    var u = id ? Q.ix.users[id] : { name: '', email: '', whatsapp: '', active: true, dailyEmail: true };
    var depts = id ? (Q.ix.userDepts[id] || []) : [];
    var m = Q.openModal(Q.modalHead(id ? 'Edit ' + u.name : 'Add a person') +
      '<div class="md-b">' +
      (id ? '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">' + Q.av(id, 'l') + '<label class="btn small">Change photo<input type="file" id="ue-photo" accept="image/*" hidden></label></div>' : '') +
      '<div class="two"><div class="field"><label for="ue-name">Name</label><input id="ue-name" type="text" maxlength="120" value="' + esc(u.name) + '" autofocus></div>' +
      '<div class="field"><label for="ue-wa">WhatsApp number <span class="muted">(optional)</span></label><input id="ue-wa" type="tel" maxlength="20" value="' + esc(u.whatsapp) + '" placeholder="+919876543210"></div></div>' +
      '<div class="field"><label for="ue-email">Google account email</label><input id="ue-email" type="email" maxlength="200" value="' + esc(u.email) + '" placeholder="name@gmail.com"><div class="hint">They sign in with this Google account. Only the admin sees emails and phone numbers.</div></div>' +
      '<div class="field"><span class="lbl">Departments</span><div class="checks">' + S.data.departments.map(function (d) {
        return '<label><input type="checkbox" name="ue-d" value="' + d.id + '"' + (depts.indexOf(d.id) >= 0 ? ' checked' : '') + '>' + esc(d.name) + '</label>';
      }).join('') + '</div></div>' +
      '<div class="checks" style="flex-direction:column;gap:8px;margin-bottom:10px">' +
      '<label><input type="checkbox" id="ue-daily"' + (u.dailyEmail !== false ? ' checked' : '') + '> Send the morning task email</label>' +
      (u.role === 'ADMIN' ? '' : '<label><input type="checkbox" id="ue-active"' + (u.active ? ' checked' : '') + '> Can sign in (untick to switch this person off – their tasks stay)</label>') + '</div>' +
      '</div><div class="md-f">' + (id ? '<button class="btn" id="ue-signout" style="margin-right:auto">Sign out on all devices</button>' : '') +
      '<button class="btn" data-act="closeModal">Cancel</button><button class="btn primary" id="ue-save">' + (id ? 'Save' : 'Add person') + '</button></div>');
    m.querySelector('#ue-save').addEventListener('click', function (e) {
      var ac = $('#ue-active');
      var p = { id: id || '', name: val('ue-name'), email: val('ue-email'), whatsapp: val('ue-wa'), depts: checked('ue-d'),
        dailyEmail: $('#ue-daily').checked, active: ac ? ac.checked : true };
      Q.run(e.currentTarget, 'user.save', p, id ? 'Saved' : 'Added – they can sign in now').then(function (r) { if (r) { Q.closeModal(); Q.load(true); } });
    });
    var so = m.querySelector('#ue-signout');
    if (so) so.addEventListener('click', function (e) { Q.run(e.currentTarget, 'user.revokeSessions', { user_id: id }, u.name + ' was signed out everywhere'); });
    var ph = m.querySelector('#ue-photo');
    if (ph) ph.addEventListener('change', function () { setPhoto(id, ph); });
  }
  function setPhoto(userId, input, remove) {
    var p = remove ? Promise.resolve('') : Q.resizePhoto(input.files[0]);
    return p.then(function (data) {
      return Q.api('user.photo', { id: userId, data: data });
    }).then(function (r) {
      var i = S.data.users.findIndex(function (u) { return u.id === userId; });
      if (i >= 0) S.data.users[i].photo = r.user.photo;
      if (userId === Q.me()) S.data.me.photo = r.user.photo;
      Q.index(); Q.render(); Q.closeModal();
      Q.toast(remove ? 'Photo removed' : 'Photo updated');
    }).catch(function (e) { if (e.code !== 'AUTH') Q.toast(e.message, true); });
  }
  function openDeptEdit(id) {
    var d = id ? Q.ix.depts[id] : { name: '', color: '#48B09A', active: true, description: '' };
    var m = Q.openModal(Q.modalHead(id ? 'Edit department' : 'Add a department') +
      '<div class="md-b"><div class="field"><label for="de-name">Name</label><input id="de-name" type="text" maxlength="80" value="' + esc(d.name) + '" autofocus></div>' +
      '<div class="field"><label for="de-color">Colour</label><select id="de-color">' + Q.options(COLORS, d.color) + '</select></div>' +
      '<div class="field"><label for="de-desc">Description <span class="muted">(optional)</span></label><input id="de-desc" type="text" maxlength="300" value="' + esc(d.description) + '"></div>' +
      (id ? '<label class="checks" style="margin-bottom:10px"><input type="checkbox" id="de-active"' + (d.active ? ' checked' : '') + '> Active (untick to hide it from forms)</label>' : '') +
      '</div><div class="md-f"><button class="btn" data-act="closeModal">Cancel</button><button class="btn primary" id="de-save">Save</button></div>');
    m.querySelector('#de-save').addEventListener('click', function (e) {
      var ac = $('#de-active');
      Q.run(e.currentTarget, 'dept.save', { id: id || '', name: val('de-name'), color: val('de-color'), description: val('de-desc'), active: ac ? ac.checked : true }, 'Department saved')
        .then(function (r) { if (r) { Q.closeModal(); Q.load(true); } });
    });
  }

  /* ================= PROFILE & NOTIFICATIONS ================= */
  function openProfile() {
    var me = S.data.me, depts = (Q.ix.userDepts[me.id] || []).map(function (d) { return Q.deptOf(d).name; });
    var m = Q.openModal(Q.modalHead('Your profile') +
      '<div class="md-b"><div style="display:flex;gap:18px;align-items:center;margin-bottom:16px">' + Q.av(me.id, 'xl') +
      '<div><h2>' + esc(me.name) + '</h2><div class="muted small">' + esc(me.email || '') + '</div><div class="small">' + (Q.isAdmin() ? 'Admin' : esc(depts.join(', ') || 'No department yet')) + '</div>' +
      '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><label class="btn small">Change photo<input type="file" id="pf-photo" accept="image/*" hidden></label>' +
      (me.photo ? '<button class="btn small ghost" id="pf-remove">Remove photo</button>' : '') + '</div></div></div>' +
      '<p class="muted small">Morning task email: ' + (me.dailyEmail ? 'on' : 'off') + ' (the admin can change this). Name, email and departments are managed by the admin.</p>' +
      '<p class="muted small">On a phone, use your browser’s “Add to Home screen” to open Qaaf Tracker like an app.</p></div>' +
      '<div class="md-f"><button class="btn" id="pf-all" style="margin-right:auto">Sign out on all devices</button><button class="btn" data-act="theme">Light / dark</button><button class="btn primary" id="pf-out">Sign out</button></div>');
    m.querySelector('#pf-photo').addEventListener('change', function (e) { setPhoto(me.id, e.target); });
    var rm = m.querySelector('#pf-remove'); if (rm) rm.addEventListener('click', function () { setPhoto(me.id, null, true); });
    m.querySelector('#pf-out').addEventListener('click', function () { Q.signOut(false); });
    m.querySelector('#pf-all').addEventListener('click', function () { Q.signOut(true); });
  }

  var NOTIF_ICON = { TASK_ASSIGNED: 'mine', MENTION: 'team', COMMENT: 'team', MEETING: 'meetings', MEETING_CHANGED: 'meetings', ANNOUNCEMENT: 'bell',
    DUE_SOON: 'deadlines', OVERDUE: 'deadlines', BLOCKED: 'deadlines', TASK_DONE: 'mine', DUE_CHANGED: 'deadlines', FILE: 'tasks', MEETING_AGENDA: 'meetings' };
  function toggleNotif() {
    if ($('#notif-pop')) { closeNotif(); return; }
    var list = S.data.notifications;
    var pop = document.createElement('div'); pop.className = 'pop'; pop.id = 'notif-pop';
    pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Notifications');
    var r = $('#bell').getBoundingClientRect();
    pop.style.top = (r.bottom + 8) + 'px'; pop.style.right = Math.max(10, window.innerWidth - r.right) + 'px';
    pop.innerHTML = '<div class="pop-h"><h3>Notifications</h3>' + (list.some(function (n) { return !n.read; }) ? '<button class="btn small" data-act="readAll">Mark all read</button>' : '') + '</div>' +
      '<div class="pop-b">' + (list.length ? list.map(function (n) {
        var who = n.actor && Q.user(n.actor) ? Q.av(n.actor, 's') : '<span class="av s" style="background:var(--purple)">' + icon(NOTIF_ICON[n.type] || 'bell', ' width="12" height="12"') + '</span>';
        return '<div class="notif' + (n.read ? '' : ' unread') + '" data-notif="' + n.id + '" tabindex="0">' + who + '<div><b>' + esc(n.title) + '</b>' +
          (n.body ? '<div class="muted small">' + esc(n.body) + '</div>' : '') + '<time>' + Q.ago(n.at) + '</time></div></div>';
      }).join('') : '<div class="empty" style="margin:14px">No notifications yet</div>') + '</div>';
    document.body.appendChild(pop);
    setTimeout(function () { document.addEventListener('click', outsideNotif); }, 0);
  }
  function outsideNotif(e) { if (!e.target.closest('#notif-pop') && !e.target.closest('#bell')) closeNotif(); }
  function closeNotif() { var p = $('#notif-pop'); if (p) p.remove(); document.removeEventListener('click', outsideNotif); }
  function openNotif(id) {
    var n = S.data.notifications.find(function (x) { return x.id === id; });
    if (!n) return;
    if (!n.read) {
      n.read = true; Q.renderNav();
      Q.api('notif.read', { ids: [id] }).catch(function () {});
    }
    closeNotif();
    if (n.linkType === 'task' && Q.ix.tasks[n.linkId]) Q.openTask(n.linkId);
    else if (n.linkType === 'meeting') { S.meeting = null; Q.go('meeting', n.linkId); }
    else if (n.linkType === 'series') Q.go('meetings');
    else if (n.linkType === 'view') Q.go(n.linkId || 'mine');
    else if (n.type === 'ANNOUNCEMENT') Q.openModal(Q.modalHead(n.title, 'Announcement · ' + Q.ago(n.at)) + '<div class="md-b"><p style="white-space:pre-wrap">' + renderText(n.body) + '</p></div><div class="md-f"><button class="btn primary" data-act="closeModal">OK</button></div>');
    else if (n.linkType === 'task') Q.toast('This task is no longer available.', true);
  }

  /* ================= BULK ADD / BULK UPDATE ================= */
  var MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
  function monthNum(w) { w = String(w).toLowerCase(); return MONTHS[w.slice(0, 4)] || MONTHS[w.slice(0, 3)] || null; }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function validYmd(y, m, d) {
    if (y < 100) y += 2000;
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? y + '-' + pad2(m) + '-' + pad2(d) : null;
  }
  /** Accepts 2026-12-17, 17/12/2026, 17-12-2026, 17.12.2026, 17 Dec 2026, Dec 17 2026, 17-Dec-2026. */
  Q.parseDate = function (v) {
    v = String(v || '').trim();
    if (!v) return '';
    if (v === '-') return '-';
    var m;
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v))) return validYmd(+m[1], +m[2], +m[3]);
    if ((m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(v))) return validYmd(+m[3], +m[2], +m[1]);
    if ((m = /^(\d{1,2})[\s\-]+([A-Za-z]{3,9})[\s\-,]+(\d{2,4})$/.exec(v))) { var mo = monthNum(m[2]); return mo ? validYmd(+m[3], mo, +m[1]) : null; }
    if ((m = /^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{2,4})$/.exec(v))) { var mo2 = monthNum(m[1]); return mo2 ? validYmd(+m[3], mo2, +m[2]) : null; }
    return null;
  };
  var PRI_WORDS = { critical: 'P0', urgent: 'P0', high: 'P1', medium: 'P2', normal: 'P2', low: 'P3', later: 'P4' };
  function checkPri(v) { v = String(v || '').trim(); if (!v) return 'P2'; var up = v.toUpperCase(); if (Q.PRIORITY[up]) return up; return PRI_WORDS[v.toLowerCase()] || null; }
  function checkOwner(v) {
    v = String(v || '').trim(); if (!v || v === '-') return { id: '', label: '' };
    var low = v.toLowerCase();
    var team = S.data.teams.find(function (t) { return t.name.toLowerCase() === low || t.id.toLowerCase() === low; });
    if (team) return { id: team.id, label: team.name };
    var users = Q.activeUsers().filter(function (u) { var n = u.name.toLowerCase(); return n === low || n.split(/\s+/)[0] === low || u.id.toLowerCase() === low || String(u.email || '').toLowerCase() === low; });
    if (users.length === 1) return { id: users[0].id, label: users[0].name };
    return null;
  }
  function checkDept(v) {
    v = String(v || '').trim().toLowerCase(); if (!v) return null;
    return S.data.departments.find(function (d) { return d.active && (d.name.toLowerCase() === v || d.id.toLowerCase() === v); }) || null;
  }
  function splitLine(line) {
    var cells = line.indexOf('\t') >= 0 ? line.split('\t') : line.split('|');
    return cells.map(function (c) { return c.trim(); });
  }
  function parseBulk(text, mode, defaults) {
    var lines = String(text || '').split(/\r?\n/).map(function (l) { return l.replace(/\s+$/, ''); }).filter(function (l) { return l.trim(); });
    if (lines.length && /^(task|title|task name)\b/i.test(splitLine(lines[0])[0])) lines.shift();
    return lines.map(function (line, i) {
      var c = splitLine(line), r, errs = [];
      if (mode === 'update') {
        r = { title: c[0] || '', owner: c[1] || '', due: c[2] || '', pri: c[3] || '', qty: c[4] || '' };
        if (!r.title) errs.push('Task name missing');
        var match = Q.tasks().filter(function (t) { return t.title.toLowerCase() === r.title.toLowerCase(); });
        if (r.title && !match.length) errs.push('No task with this name');
        if (match.length > 1) errs.push(match.length + ' tasks have this name');
        if (match.length === 1 && !Q.canEdit(match[0])) errs.push('You cannot change this task');
        r.task = match.length === 1 ? match[0] : null;
      } else {
        r = { title: c[0] || '', dept: c[1] || defaults.dept || '', workstream: c[2] || defaults.workstream || '', owner: c[3] || '', due: c[4] || '', pri: c[5] || '', qty: c[6] || '', steps: (c[7] || '').split(';').map(function (x) { return x.trim(); }).filter(Boolean) };
        if (!r.title) errs.push('Task name missing');
        var d = checkDept(r.dept);
        if (!d) errs.push(r.dept ? 'Department "' + r.dept + '" not found' : 'Department missing');
        else r.dept = d.name;
        if (!r.workstream) r.workstream = 'General';
        if (r.steps.length > 50) errs.push('More than 50 checklist steps');
      }
      var o = checkOwner(r.owner);
      if (o === null) errs.push('Owner "' + r.owner + '" not found'); else r.ownerLabel = o.label;
      var due = Q.parseDate(r.due);
      if (due === null) { errs.push('Date "' + r.due + '" not understood'); r.dueRaw = r.due; r.due = ''; } else r.due = due;
      if (r.pri) { var pr = checkPri(r.pri); if (!pr) errs.push('Priority "' + r.pri + '" not known'); else r.pri = pr; }
      if (r.qty !== '' && !(Number(r.qty) >= 1 && Number(r.qty) === Math.round(Number(r.qty)))) errs.push('Files must be a whole number');
      r.line = i + 1; r.errors = errs;
      return r;
    });
  }
  /** Send rows in parts small enough for either connection route. */
  function sendBulk(mode, rows, reason, onProgress) {
    var parts = [], cur = [];
    rows.forEach(function (r) {
      var trial = cur.concat([r]);
      if (cur.length && (trial.length > 25 || encodeURIComponent(JSON.stringify({ mode: mode, rows: trial, dueReason: reason })).length > Q.GET_SAFE)) { parts.push(cur); cur = [r]; }
      else cur = trial;
    });
    if (cur.length) parts.push(cur);
    var out = { results: [], tasks: [], checklist: [], groups: null }, sent = 0;
    return parts.reduce(function (p, part) {
      return p.then(function () {
        return Q.api('task.bulk', { mode: mode, rows: part, dueReason: reason }).then(function (r) {
          if (!r || !r.results) throw new Q.ApiError('The server sent an incomplete reply. Check All tasks, then send the rest again.', 'HTTP');
          r.results.forEach(function (x) { out.results.push({ row: sent + x.row, ok: x.ok, error: x.error, changed: x.changed }); });
          out.tasks = out.tasks.concat(r.tasks); if (r.checklist) out.checklist = out.checklist.concat(r.checklist); if (r.groups) out.groups = r.groups;
          sent += part.length; onProgress(sent, rows.length);
        });
      });
    }, Promise.resolve()).then(function () { return out; });
  }

  function openBulkAdd(mode) {
    mode = mode || 'create';
    var active = S.data.departments.filter(function (d) { return d.active; });
    var m = Q.openModal(Q.modalHead('Add or update many tasks') +
      '<div class="md-b"><div class="tabs" role="tablist" style="margin-bottom:12px">' +
      '<button role="tab" data-mode="create" aria-selected="' + (mode === 'create') + '">Add new tasks</button>' +
      '<button role="tab" data-mode="update" aria-selected="' + (mode === 'update') + '">Update existing tasks</button></div>' +
      '<div id="bk-help"></div>' +
      '<div class="two" id="bk-defaults"' + (mode === 'create' ? '' : ' hidden') + '><div class="field"><label for="bk-dept">Department when a row leaves it empty</label><select id="bk-dept">' +
      Q.options(active.map(function (d) { return [d.name, d.name]; }), '', '—') + '</select></div>' +
      '<div class="field"><label for="bk-ws">Workstream when a row leaves it empty</label><input id="bk-ws" type="text" maxlength="120" placeholder="General"></div></div>' +
      '<div class="field"><label for="bk-text">Paste the list here (from Excel, Google Sheets or typed with | between columns)</label>' +
      '<textarea id="bk-text" style="min-height:160px;font-family:ui-monospace,Consolas,monospace;font-size:12.5px" spellcheck="false"></textarea></div>' +
      '<div class="field" id="bk-reason-wrap" hidden><label for="bk-reason">Reason for changing due dates that were already set</label><input id="bk-reason" type="text" maxlength="500"></div>' +
      '<div id="bk-preview"></div></div>' +
      '<div class="md-f"><span class="muted small" id="bk-status" style="margin-right:auto"></span><button class="btn" data-act="closeModal">Close</button>' +
      '<button class="btn" id="bk-check">Check list</button><button class="btn primary" id="bk-go" disabled>Create</button></div>', true);
    var rows = [];
    function help() {
      $('#bk-help').innerHTML = mode === 'create'
        ? '<div class="bulk-help">One task per line. Columns in this order (only the task name is required):<br>' +
          '<code>Task</code> | <code>Department</code> | <code>Workstream</code> | <code>Owner</code> | <code>Due date</code> | <code>Priority</code> | <code>Files</code> | <code>Steps</code><br>' +
          'Example: <code>Design landing page | Marketing | Admission – Website | Fahad | 30/09/2026 | High</code><br>' +
          'Steps make a checklist – separate them with a semicolon: <code>Draft; Review; Publish</code>. Progress then follows the ticks.<br>' +
          'Owner can be a first name or a team (e.g. Product Team). Dates like 30/09/2026 or 30 Sep 2026. Priority P0–P4, High, Medium, Low. New workstreams are created automatically.</div>'
        : '<div class="bulk-help">One task per line, matched by its exact name. Columns: <code>Task name</code> | <code>Owner</code> | <code>Due date</code> | <code>Priority</code> | <code>Files</code><br>' +
          'Leave a column empty to keep it as it is. Use <code>-</code> as the date to remove a due date.<br>' +
          'Example: <code>P1 Tarbiyah – Textbook – Batch 1 (files 1–24) | Wafi | 26/09/2026</code><br>' +
          'Tip: to change many tasks without typing names, tick them in All tasks instead.</div>';
      $('#bk-defaults').hidden = mode !== 'create';
      $('#bk-go').textContent = mode === 'create' ? 'Create' : 'Update';
    }
    help();
    m.querySelector('.tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-mode]'); if (!b) return;
      mode = b.dataset.mode;
      Q.$$('.tabs [data-mode]', m).forEach(function (x) { x.setAttribute('aria-selected', x === b); });
      rows = []; $('#bk-preview').innerHTML = ''; $('#bk-go').disabled = true; $('#bk-status').textContent = ''; $('#bk-reason-wrap').hidden = true;
      help();
    });
    m.querySelector('#bk-text').addEventListener('input', function () { $('#bk-go').disabled = true; $('#bk-status').textContent = 'Press “Check list” after pasting.'; });
    function preview() {
      rows = parseBulk($('#bk-text').value, mode, { dept: $('#bk-dept').value, workstream: $('#bk-ws').value.trim() });
      var good = rows.filter(function (r) { return !r.errors.length; });
      var needReason = mode === 'update' && good.some(function (r) { return r.task && r.task.due && r.due && r.due !== r.task.due; });
      $('#bk-reason-wrap').hidden = !needReason;
      if (!rows.length) { $('#bk-preview').innerHTML = '<div class="empty">Nothing to check yet. Paste your list above.</div>'; $('#bk-go').disabled = true; return; }
      var head = mode === 'create' ? ['#', 'Task', 'Department', 'Workstream', 'Owner', 'Due', 'Priority', 'Files', 'Steps', 'Check'] : ['#', 'Task', 'Owner', 'Due', 'Priority', 'Files', 'Check'];
      $('#bk-preview').innerHTML = '<div class="bulk-table"><table><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.map(function (r) {
          var dueCell = r.dueRaw ? r.dueRaw : r.due === '-' ? 'remove' : r.due ? Q.fmt(r.due) : (mode === 'create' ? '—' : 'keep');
          var cells = mode === 'create' ? [r.line, r.title, r.dept, r.workstream, r.ownerLabel || (r.owner || '—'), dueCell, r.pri || 'P2', r.qty || '', r.steps.length ? r.steps.length + ' steps' : '']
            : [r.line, r.title, r.ownerLabel || (r.owner || 'keep'), dueCell, r.pri || 'keep', r.qty || 'keep'];
          return '<tr class="' + (r.errors.length ? 'bad' : '') + '">' + cells.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') +
            '<td>' + (r.errors.length ? '<span class="err">' + esc(r.errors.join('; ')) + '</span>' : '<span class="good">OK</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      var bad = rows.length - good.length;
      $('#bk-status').textContent = good.length + ' ready' + (bad ? ' · ' + bad + ' with problems (they will be skipped)' : '');
      $('#bk-go').disabled = !good.length;
      $('#bk-go').textContent = (mode === 'create' ? 'Create ' : 'Update ') + good.length + ' task' + (good.length === 1 ? '' : 's');
    }
    m.querySelector('#bk-check').addEventListener('click', preview);
    m.querySelector('#bk-go').addEventListener('click', function (e) {
      var btn = e.currentTarget;
      var good = rows.filter(function (r) { return !r.errors.length; });
      if (!good.length) return;
      var reason = $('#bk-reason').value.trim();
      if (!$('#bk-reason-wrap').hidden && !reason) { Q.toast('Please give a reason for changing the due dates.', true); $('#bk-reason').focus(); return; }
      var payload = good.map(function (r) {
        return mode === 'create' ? { title: r.title, dept: r.dept, workstream: r.workstream, owner: r.owner, due: r.due, pri: r.pri, qty: r.qty, steps: r.steps }
          : { title: r.title, owner: r.owner, due: r.due, pri: r.pri, qty: r.qty };
      });
      btn.disabled = true; btn.classList.add('busy'); $('#bk-check').disabled = true;
      sendBulk(mode, payload, reason, function (done, total) { $('#bk-status').textContent = (mode === 'create' ? 'Creating ' : 'Updating ') + done + ' of ' + total + '…'; })
        .then(function (out) {
          if (out.groups) { S.data.groups = out.groups; }
          if (out.checklist && out.checklist.length) S.data.checklist = S.data.checklist.concat(out.checklist);
          out.tasks.forEach(function (t) { var i = S.data.tasks.findIndex(function (x) { return x.id === t.id; }); if (i >= 0) S.data.tasks[i] = t; else S.data.tasks.push(t); });
          Q.index(); Q.render();
          var okN = out.results.filter(function (x) { return x.ok; }).length, failed = out.results.filter(function (x) { return !x.ok; });
          $('#bk-preview').innerHTML = '<div class="loadnote ' + (failed.length ? 'heavy' : 'ok') + '">' + (mode === 'create' ? 'Created ' : 'Updated ') + okN + ' task' + (okN === 1 ? '' : 's') + '.' +
            (failed.length ? ' ' + failed.length + ' could not be saved:</div><ul class="small">' + failed.map(function (f) { return '<li>' + esc(payload[f.row].title) + ' – ' + esc(f.error) + '</li>'; }).join('') + '</ul>' : '</div>');
          $('#bk-status').textContent = '';
          $('#bk-text').value = ''; rows = [];
          btn.textContent = 'Done'; btn.classList.remove('busy'); btn.disabled = true;
          $('#bk-check').disabled = false;
          Q.toast((mode === 'create' ? 'Created ' : 'Updated ') + okN + ' tasks');
        }).catch(function (err) {
          btn.disabled = false; btn.classList.remove('busy'); $('#bk-check').disabled = false;
          if (err.code !== 'AUTH') { Q.toast(err.message, true); $('#bk-status').textContent = 'Stopped: ' + err.message + ' Tasks already saved stay saved. Check All tasks before sending again.'; }
          Q.load(true);
        });
    });
  }

  function selectedTasks() {
    return Object.keys(S.selected).filter(function (id) { return S.selected[id]; }).map(function (id) { return Q.ix.tasks[id]; }).filter(function (t) { return t && Q.canEdit(t); });
  }
  function openBulkEdit() {
    var list = selectedTasks();
    if (!list.length) { Q.toast('Tick the tasks you want to change first.', true); return; }
    var withDue = list.filter(function (t) { return t.due; }).length;
    var m = Q.openModal(Q.modalHead('Change ' + list.length + ' selected task' + (list.length === 1 ? '' : 's'), 'Leave a field empty to keep it as it is') +
      '<div class="md-b"><div class="two"><div class="field"><label for="be-owner">Owner</label><select id="be-owner"><option value="">Keep as it is</option>' + Q.ownerOptions('', false) + '</select></div>' +
      '<div class="field"><label for="be-due">Due date</label><input id="be-due" type="date"></div></div>' +
      '<div class="two"><div class="field"><label for="be-pri">Priority</label><select id="be-pri">' + Q.options(Object.keys(Q.PRIORITY).map(function (p) { return [p, p + ' – ' + Q.PRIORITY[p]]; }), '', 'Keep as it is') + '</select></div>' +
      '<div class="field"><label for="be-qty">Files per task</label><input id="be-qty" type="number" min="1" step="1" placeholder="Keep as it is"></div></div>' +
      '<div class="field" id="be-reason-wrap" hidden><label for="be-reason">Reason (' + withDue + ' of these already have a due date)</label><input id="be-reason" type="text" maxlength="500"></div>' +
      '<div class="small muted" style="max-height:120px;overflow:auto">' + list.map(function (t) { return esc(t.title); }).join('<br>') + '</div></div>' +
      '<div class="md-f"><span class="muted small" id="be-status" style="margin-right:auto"></span><button class="btn" data-act="closeModal">Cancel</button><button class="btn primary" id="be-save">Apply to ' + list.length + '</button></div>');
    m.querySelector('#be-due').addEventListener('change', function (e) { $('#be-reason-wrap').hidden = !(e.target.value && withDue); });
    m.querySelector('#be-save').addEventListener('click', function (e) {
      var owner = val('be-owner'), due = val('be-due'), pri = val('be-pri'), qty = val('be-qty'), reason = val('be-reason');
      if (!owner && !due && !pri && !qty) { Q.toast('Choose at least one thing to change.', true); return; }
      if (due && withDue && !reason) { Q.toast('Please give a reason for changing the due dates.', true); $('#be-reason').focus(); return; }
      var btn = e.currentTarget; btn.disabled = true; btn.classList.add('busy');
      sendBulk('update', list.map(function (t) { return { id: t.id, owner: owner, due: due, pri: pri, qty: qty }; }), reason,
        function (d, n) { $('#be-status').textContent = 'Saving ' + d + ' of ' + n + '…'; })
        .then(function (out) {
          out.tasks.forEach(function (t) { var i = S.data.tasks.findIndex(function (x) { return x.id === t.id; }); if (i >= 0) S.data.tasks[i] = t; });
          var failed = out.results.filter(function (x) { return !x.ok; });
          S.selected = {}; Q.index(); Q.closeModal(); Q.render();
          Q.toast('Updated ' + (out.results.length - failed.length) + ' task(s)' + (failed.length ? ' · ' + failed.length + ' skipped: ' + failed[0].error : ''), !!failed.length);
        }).catch(function (err) { btn.disabled = false; btn.classList.remove('busy'); if (err.code !== 'AUTH') Q.toast(err.message, true); Q.load(true); });
    });
  }

  /* ================= EXPORTS ================= */
  function exportTasks() {
    var rows = [['WBS', 'Task', 'Department', 'Workstream', 'Owner', 'Priority', 'Status', 'Progress %', 'Due date', 'Stage', 'Blocker', 'Created by', 'Completed on']];
    Q.filteredTasks().sort(function (a, b) { return Q.wbsCmp(a.wbs, b.wbs); }).forEach(function (t) {
      rows.push([t.wbs, t.title, Q.deptOf(t.dept).name, Q.groupOf(t).title, Q.pname(t.owner), t.pri, Q.STATUS[t.status].label, Q.pct(t), t.due,
        t.stage, t.blocker, t.createdBy ? Q.pname(t.createdBy) : 'Excel import', Q.isoDay(t.completedAt)]);
    });
    download('qaaf-tasks-' + Q.today() + '.csv', csv(rows));
    Q.toast('Exported ' + (rows.length - 1) + ' tasks');
  }
  function exportReport() {
    var D = Q.reportData();
    var rows = [['Qaaf Tracker report', D.range.label, D.range.from + ' to ' + D.range.to], [],
      ['Person', 'Open', 'In progress', 'Overdue', 'Blocked', 'Completed in period', 'On time %']];
    Q.members().forEach(function (u) {
      var ts = D.scope.filter(function (t) { return Q.ownerIds(t).indexOf(u.id) >= 0; });
      var op = ts.filter(Q.isOpen);
      var comp = D.completed.filter(function (t) { return Q.ownerIds(t).indexOf(u.id) >= 0; });
      var ot = comp.filter(function (t) { return !t.due || Q.isoDay(t.completedAt) <= t.due; }).length;
      rows.push([u.name, op.length, op.filter(function (t) { return t.status === 'IN_PROGRESS'; }).length, op.filter(Q.isOverdue).length,
        op.filter(function (t) { return t.status === 'BLOCKED'; }).length, comp.length, comp.length ? Math.round(ot / comp.length * 100) : '']);
    });
    rows.push([], ['Completed tasks in period'], ['Completed on', 'Task', 'Department', 'Owner', 'Due date', 'On time']);
    D.completed.sort(function (a, b) { return a.completedAt < b.completedAt ? -1 : 1; }).forEach(function (t) {
      var d = Q.isoDay(t.completedAt);
      rows.push([d, t.title, Q.deptOf(t.dept).name, Q.pname(t.owner), t.due, !t.due ? '' : d <= t.due ? 'Yes' : 'No']);
    });
    download('qaaf-report-' + D.range.from + '-to-' + D.range.to + '.csv', csv(rows));
  }

  /* ================= ACTIONS ================= */
  var ACTS = {
    closeModal: function () { Q.closeModal(); },
    closeDrawer: function () { Q.closeDrawer(); },
    openSide: function () { Q.openSide(); },
    theme: function () { Q.toggleTheme(); },
    bell: function () { toggleNotif(); },
    readAll: function (el) {
      Q.run(el, 'notif.readAll').then(function (r) { if (!r) return; S.data.notifications.forEach(function (n) { n.read = true; }); closeNotif(); Q.renderNav(); });
    },
    profile: function () { Q.closeSide(); openProfile(); },
    newTask: function () { openNewTask(); },
    update: function (el) { var t = Q.ix.tasks[el.dataset.id]; if (t) openUpdate(t); },
    toggleDone: function (el) {
      var t = Q.ix.tasks[el.dataset.id]; if (!t) return;
      if (!Q.isOpen(t)) Q.changeStatus(t, 'IN_PROGRESS');
      else Q.changeStatus(t, 'COMPLETED');
    },
    pipeDept: function (el) { S.pipeDept = el.dataset.id; Q.render(); },
    clearFilters: function () { S.filters = { q: '', dept: '', owner: '', status: '', pri: '', due: '' }; var q = $('#q'); if (q) q.value = ''; Q.render(); },
    collapse: function (el) { var id = el.dataset.id; S.collapsed[id] = !S.collapsed[id]; Q.render(); },
    collapseAll: function () {
      var any = Object.keys(S.collapsed).some(function (k) { return S.collapsed[k]; });
      S.collapsed = {};
      if (!any) S.data.groups.forEach(function (g) { S.collapsed[g.id] = true; });
      Q.render();
    },
    exportTasks: exportTasks,
    bulkAdd: function () { openBulkAdd('create'); },
    bulkEdit: function () { openBulkEdit(); },
    bulkArchive: function () {
      var list = selectedTasks();
      if (!list.length) { Q.toast('Tick the tasks you want to archive first.', true); return; }
      confirmBox('Archive ' + list.length + ' task' + (list.length === 1 ? '' : 's') + '?',
        'They will be hidden from everyone. You can restore them one by one from Admin → Archived tasks.', 'Archive ' + list.length, function (btn) {
          btn.disabled = true; btn.classList.add('busy');
          return sendBulk('archive', list.map(function (t) { return { id: t.id }; }), '', function () {})
            .then(function (out) {
              out.tasks.forEach(function (t) { var i = S.data.tasks.findIndex(function (x) { return x.id === t.id; }); if (i >= 0) S.data.tasks[i] = t; });
              var failed = out.results.filter(function (x) { return !x.ok; });
              S.selected = {}; Q.index(); Q.closeModal(); Q.render();
              Q.toast('Archived ' + (out.results.length - failed.length) + ' task(s)' + (failed.length ? ' · ' + failed.length + ' skipped' : ''), !!failed.length);
            }).catch(function (err) { btn.disabled = false; btn.classList.remove('busy'); if (err.code !== 'AUTH') Q.toast(err.message, true); Q.load(true); });
        });
    },
    clearSelection: function () { S.selected = {}; Q.render(); },
    exportReport: exportReport,
    print: function () { window.print(); },
    noop: function () {},
    saveDesc: function (el) { var t = Q.ix.tasks[S.drawer.id]; saveTask(t, { description: $('#dr-desc').value }, null, el, 'Description saved'); },
    clAdd: function (el) {
      var text = val('cl-new'); if (!text) { $('#cl-new').focus(); return; }
      checklistCall(el, 'checklist.add', { task: S.drawer.id, text: text }).then(function (r) { if (r) { var i = $('#cl-new'); if (i) i.focus(); } });
    },
    clToggle: function (el) { checklistCall(null, 'checklist.toggle', { id: el.dataset.id, done: el.checked }).then(function (r) { if (!r) renderDrawer(); }); },
    clRemove: function (el) { checklistCall(el, 'checklist.remove', { id: el.dataset.id }); },
    commentAdd: function (el) {
      var text = val('c-text'); if (!text) { $('#c-text').focus(); return; }
      Q.run(el, 'comment.add', { task: S.drawer.id, text: text }, 'Comment posted').then(function (r) {
        if (!r) return;
        S.data.commentCounts[S.drawer.id] = (S.data.commentCounts[S.drawer.id] || 0) + 1;
        loadDetail(S.drawer.id);
      });
    },
    commentRemove: function (el) { Q.run(el, 'comment.remove', { id: el.dataset.id }, 'Comment deleted').then(function (r) { if (r) loadDetail(S.drawer.id); }); },
    fileGet: function (el) { openFile(el, el.dataset.id); },
    fileRemove: function (el) { Q.run(el, 'attachment.remove', { id: el.dataset.id }, 'File removed').then(function (r) { if (r) loadDetail(S.drawer.id); }); },
    archive: function (el) {
      var t = Q.ix.tasks[el.dataset.id];
      confirmBox('Archive this task?', '“' + t.title + '” will be hidden from everyone. You can restore it from Admin → Archived tasks.', 'Archive', function (btn) {
        return Q.run(btn, 'task.archive', { id: t.id }, 'Task archived').then(function (r) { if (r) { Q.applyTask(r.task); Q.closeModal(); Q.closeDrawer(); Q.render(); } });
      });
    },
    restore: function (el) {
      Q.run(el, 'task.restore', { id: el.dataset.id }, 'Task restored').then(function (r) { if (r) { Q.applyTask(r.task); Q.render(); if (S.drawer) renderDrawer(); } });
    },
    restoreGroup: function (el) {
      var g = el.dataset.id, n = S.data.tasks.filter(function (t) { return t.archived && t.archiveGroup === g; }).length;
      var label = (S.data.archiveGroups || {})[g] || g;
      confirmBox('Restore all ' + n + ' tasks?', 'All tasks in “' + label + '” will be visible to the team again, with their old status and progress. They will have no due dates, so each owner should set new ones.', 'Restore all', function (btn) {
        return Q.run(btn, 'task.restoreGroup', { group: g }).then(function (r) {
          if (!r) return;
          Q.closeModal(); Q.toast(r.restored + ' tasks restored');
          Q.load(true);
        });
      });
    },
    newMeeting: function () { openNewMeeting(); },
    meetingEdit: function () { openMeetingEdit(); },
    meetingHeld: function (el) {
      Q.run(el, 'meeting.update', { id: S.meeting.meeting.id, patch: { status: 'HELD' } }, 'Marked as held').then(function (r) { if (r) Q.reloadMeeting(); });
    },
    meetingSaveNotes: function (el) {
      Q.run(el, 'meeting.update', { id: S.meeting.meeting.id, patch: { agenda: $('#m-agenda').value, notes: $('#m-notes').value } }, 'Saved').then(function (r) {
        if (!r) return;
        S.meeting.meeting = r.meeting;
        var i = S.data.meetings.findIndex(function (x) { return x.id === r.meeting.id; }); if (i >= 0) S.data.meetings[i] = r.meeting;
      });
    },
    addDecision: function (el) {
      var text = val('new-decision'); if (!text) { $('#new-decision').focus(); return; }
      Q.run(el, 'meetingItem.add', { meeting: S.meeting.meeting.id, type: 'DECISION', text: text }, 'Decision added').then(function (r) { if (r) Q.reloadMeeting(); });
    },
    addAction: function (el) {
      var text = val('new-action'); if (!text) { $('#new-action').focus(); return; }
      Q.run(el, 'meetingItem.add', { meeting: S.meeting.meeting.id, type: 'ACTION', text: text, owner: val('new-action-owner'), due: val('new-action-due') }, 'Action item added')
        .then(function (r) { if (r) Q.reloadMeeting(); });
    },
    itemDone: function (el) {
      var id = el.dataset.id;
      var item = S.meeting.items.concat(S.meeting.pending).find(function (i) { return i.id === id; });
      Q.run(el, 'meetingItem.update', { id: id, patch: { done: !item.done } }).then(function (r) { if (r) Q.reloadMeeting(); });
    },
    itemRemove: function (el) { Q.run(el, 'meetingItem.remove', { id: el.dataset.id }, 'Removed').then(function (r) { if (r) Q.reloadMeeting(); }); },
    itemToTask: function (el) {
      var id = el.dataset.id;
      var item = S.meeting.items.concat(S.meeting.pending).find(function (i) { return i.id === id; });
      var ownerDepts = item.owner ? (Q.ix.userDepts[item.owner] || []) : [];
      openNewTask({ heading: 'Make a task from this action item', title: item.text, owner: item.owner || '', due: item.due || '', fromItem: id,
        dept: ownerDepts.filter(function (d) { return Q.ix.depts[d] && Q.ix.depts[d].active; })[0], saveLabel: 'Create task' });
    },
    seriesEdit: function (el) { openSeriesEdit(el.dataset.id); },
    adminTab: function (el) { S.adminTab = el.dataset.id; Q.render(); },
    userEdit: function (el) { openUserEdit(el.dataset.id); },
    deptEdit: function (el) { openDeptEdit(el.dataset.id); },
    announce: function (el) {
      var title = val('ann-title'), body = val('ann-body');
      if (!title) { Q.toast('Enter a title.', true); $('#ann-title').focus(); return; }
      Q.run(el, 'announcement.create', { title: title, body: body }, 'Announcement sent to everyone').then(function (r) {
        if (r) { $('#ann-title').value = ''; $('#ann-body').value = ''; }
      });
    },
    signOutQuiet: function () { Q.store.set('session', null); Q.showLogin(); }
  };

  function confirmBox(title, text, okLabel, fn) {
    var m = Q.openModal(Q.modalHead(title) + '<div class="md-b"><p>' + esc(text) + '</p></div>' +
      '<div class="md-f"><button class="btn" data-act="closeModal">Cancel</button><button class="btn primary" id="cf-ok">' + esc(okLabel) + '</button></div>');
    m.querySelector('#cf-ok').addEventListener('click', function (e) { fn(e.currentTarget); });
  }

  /* ================= EVENTS ================= */
  document.addEventListener('click', function (e) {
    var el;
    if (e.target.matches('[data-select],[data-select-group]')) { e.stopPropagation(); return; }
    if ((el = e.target.closest('[data-demo-login]'))) { Q.doLogin('demo:' + el.dataset.demoLogin); return; }
    if ((el = e.target.closest('[data-notif]'))) { openNotif(el.dataset.notif); return; }
    if ((el = e.target.closest('[data-act]'))) {
      if (el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type !== 'button')) {
        if (el.dataset.act === 'clToggle') { ACTS.clToggle(el); }
        return;
      }
      var fn = ACTS[el.dataset.act];
      if (fn) { e.preventDefault(); fn(el, e); }
      return;
    }
    if ((el = e.target.closest('[data-open]'))) {
      if (e.target.closest('button,select,input,textarea') && !e.target.closest('[data-open]').matches('button')) return;
      e.preventDefault(); Q.closeModal(); Q.openTask(el.dataset.open); return;
    }
    if ((el = e.target.closest('[data-go]'))) {
      e.preventDefault();
      if (el.dataset.go === 'meetings') S.meeting = null;
      Q.closeDrawer(); Q.go(el.dataset.go); return;
    }
    if ((el = e.target.closest('[data-meeting]'))) {
      e.preventDefault(); Q.closeDrawer();
      if (!S.meeting || S.meeting.meeting.id !== el.dataset.meeting) S.meeting = null;
      Q.go('meeting', el.dataset.meeting); return;
    }
    if ((el = e.target.closest('[data-filter]'))) {
      e.preventDefault();
      var f = JSON.parse(el.dataset.filter);
      S.filters = { q: '', dept: '', owner: '', status: '', pri: '', due: '' };
      Object.keys(f).forEach(function (k) { S.filters[k] = f[k]; });
      if (!f.status && !f.due) S.filters.status = S.filters.stage || S.filters.owner ? 'open' : '';
      var q = $('#q'); if (q) q.value = '';
      Q.closeModal(); Q.closeDrawer(); Q.go('tasks'); return;
    }
    if ((el = e.target.closest('[data-ws]'))) {
      S.filters = { q: '', dept: '', owner: '', status: '', pri: '', due: '', group: el.dataset.ws };
      Q.go('tasks');
    }
  });

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset.select) { S.selected[el.dataset.select] = el.checked; Q.render(); return; }
    if (el.dataset.selectGroup) {
      var on = el.checked;
      Q.filteredTasks().forEach(function (t) { if (t.group === el.dataset.selectGroup && Q.canEdit(t)) S.selected[t.id] = on; });
      Q.render(); return;
    }
    if (el.dataset.filterKey) { S.filters[el.dataset.filterKey] = el.value; Q.render(); return; }
    if (el.dataset.report) {
      S.reports[el.dataset.report] = el.value;
      if (el.dataset.report === 'period' && el.value === 'custom' && !S.reports.from) { S.reports.from = Q.addDays(Q.today(), -29); S.reports.to = Q.today(); }
      Q.render(); return;
    }
    if (el.dataset.act === 'wsDept') { S.wsDept = el.value; Q.render(); return; }
    if (el.dataset.field && el.closest('#drawer') && el.dataset.field !== 'title') onDrawerField(el);
  });

  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.dataset.filterInput) {
      clearTimeout(Q._fi);
      Q._fi = setTimeout(function () {
        S.filters.q = el.value;
        var pos = el.selectionStart;
        Q.render();
        var again = $('[data-filter-input]');
        if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (x) { /* ignore */ } }
        var top = $('#q'); if (top) top.value = el.value;
      }, 250);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if ($('#notif-pop')) { closeNotif(); return; }
      if ($('#modal')) { Q.closeModal(); return; }
      if (S.drawer) { Q.closeDrawer(); return; }
      Q.closeSide();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && S.data) { e.preventDefault(); var q = $('#q'); if (q) q.focus(); }
    if (e.key === 'Enter') {
      var t = e.target;
      if (t.matches('.kcard,.li,.notif,.mcard,[data-open]:not(button):not(a)') && !t.matches('input,textarea,select')) {
        e.preventDefault(); t.click(); return;
      }
      if (t.id === 'cl-new') { e.preventDefault(); ACTS.clAdd($('[data-act="clAdd"]')); }
      if (t.id === 'new-decision') { e.preventDefault(); ACTS.addDecision($('[data-act="addDecision"]')); }
      if (t.id === 'new-action') { e.preventDefault(); ACTS.addAction($('[data-act="addAction"]')); }
    }
  });

  /* ================= START ================= */
  function boot() {
    if (!Q.DEMO && 'serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(function () { /* optional */ });
    }
    Q.start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
