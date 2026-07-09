// frontend/src/components/GeneralMaster.jsx
// Reusable CRUD master — permissions from PR_Get_MenuRights_ForUser via API
//
// ✅ NEW: Restore (undelete) for inactive rows when canEdit
// ✅ NEW: loadingId — prevents double-click on restore
// ✅ NEW: Normalised isActive field (row.Active ?? row.active)

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  fetchGeneral,
  createGeneral,
  updateGeneral,
  deleteGeneral,
  restoreGeneral,          // ← NEW
} from '../services/generalService';
import { usePermissions } from '../context/AuthContext';

/* ── Icons ─────────────────────────────────────────────────── */
const Ico = {
  Edit:   () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>),
  Trash:  () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>),
  Plus:   () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>),
  Close:  () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  Search: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>),
  // RotateCcw — restore / undelete  ← NEW
  Restore: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
    </svg>
  ),
};

/* ── Toast ─────────────────────────────────────────────────── */
function Toast({ toast }) {
  if (!toast.msg) return null;
  return (
    <div className={`gm-toast ${toast.type === 'error' ? 'gm-toast-error' : toast.type === 'warn' ? 'gm-toast-warn' : ''}`}>
      <span>{toast.type === 'error' ? '⚠' : toast.type === 'warn' ? '🔒' : '✓'}</span>
      {toast.msg}
    </div>
  );
}

/* ── Toggle ─────────────────────────────────────────────────── */
function Toggle({ checked, onChange }) {
  return (
    <div
      className="gm-toggle-wrap"
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={e => e.key === ' ' && onChange()}
    >
      <span
        className={`gm-toggle-label ${!checked ? 'gm-toggle-label--on' : 'gm-toggle-label--off'}`}
        onClick={onChange}
        style={{ cursor: 'pointer' }}
      >
        Inactive
      </span>
      <div
        className={`gm-toggle-pill ${checked ? 'gm-toggle-pill--active' : 'gm-toggle-pill--inactive'}`}
        onClick={onChange}
      >
        <div className="gm-toggle-knob" />
      </div>
      <span
        className={`gm-toggle-label ${checked ? 'gm-toggle-label--on' : 'gm-toggle-label--off'}`}
        onClick={onChange}
        style={{ cursor: 'pointer' }}
      >
        Active
      </span>
    </div>
  );
}

/* ── SortTh ────────────────────────────────────────────────── */
function SortTh({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <th className="gm-th gm-th-sortable" onClick={() => onSort(field)} aria-sort={active ? sortDir : 'none'}>
      <div className="gm-th-inner">
        {label}
        <span className="gm-sort-arrows">
          <svg width="8" height="5" viewBox="0 0 8 5"><path d="M4 0L7.46 5H.54L4 0z" fill={active && sortDir === 'asc' ? '#818cf8' : '#475569'}/></svg>
          <svg width="8" height="5" viewBox="0 0 8 5"><path d="M4 5L.54 0H7.46L4 5z" fill={active && sortDir === 'desc' ? '#818cf8' : '#475569'}/></svg>
        </span>
      </div>
    </th>
  );
}

/* ── Form Modal ─────────────────────────────────────────────── */
const EMPTY_FORM = { code: '', name: '', shortName: '' };

function FormModal({ title, mode, initial, onSave, onClose, saving, saveError }) {
  const [form, setForm]     = useState(initial || EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.code.trim()) e.code = 'Code is required';
    if (!form.name.trim()) e.name = 'Name is required';
    return e;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(form);
  };

  return (
    <div className="gm-overlay" onClick={onClose}>
      <div className="gm-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
        aria-label={`${mode === 'add' ? 'Add' : 'Edit'} ${title}`}>
        <button className="gm-modal-close" onClick={onClose} aria-label="Close"><Ico.Close /></button>
        <h2 className="gm-modal-title">{mode === 'add' ? 'Add' : 'Edit'} {title}</h2>
        {saveError && <div className="gm-modal-error">⚠ {saveError}</div>}
        <form onSubmit={onSubmit} noValidate>
          <div className="gm-field">
            <label className="gm-label">Code <span className="gm-req">*</span></label>
            <input name="code" type="text" className={`gm-input ${errors.code ? 'error' : ''}`}
              placeholder="Enter code" value={form.code} onChange={onChange} autoFocus />
            {errors.code && <div className="gm-field-err">{errors.code}</div>}
          </div>
          <div className="gm-field">
            <label className="gm-label">Name <span className="gm-req">*</span></label>
            <input name="name" type="text" className={`gm-input ${errors.name ? 'error' : ''}`}
              placeholder="Enter name" value={form.name} onChange={onChange} />
            {errors.name && <div className="gm-field-err">{errors.name}</div>}
          </div>
          <div className="gm-field">
            <label className="gm-label">Short Name</label>
            <input name="shortName" type="text" className="gm-input"
              placeholder="Optional" value={form.shortName} onChange={onChange} />
          </div>
          <div className="gm-modal-footer">
            <button type="submit" className="gm-btn-save" disabled={saving}>
              {saving ? <><span className="gm-spinner-sm" />Saving...</> : 'Save'}
            </button>
            <button type="button" className="gm-btn-cancel" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Confirm Delete Modal ───────────────────────────────────── */
function ConfirmModal({ title, item, onConfirm, onClose, deleting }) {
  return (
    <div className="gm-overlay" onClick={onClose}>
      <div className="gm-confirm" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="gm-modal-close" onClick={onClose}><Ico.Close /></button>
        <div className="gm-confirm-emoji">🗑️</div>
        <h3 className="gm-confirm-title">Delete {title}</h3>
        <p className="gm-confirm-msg">
          Are you sure you want to delete <strong>{item?.name}</strong>?<br />
          This will deactivate the record.
        </p>
        <div className="gm-confirm-actions">
          <button className="gm-btn-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? <><span className="gm-spinner-sm" />Deleting...</> : 'Yes, Delete'}
          </button>
          <button className="gm-btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN GeneralMaster
   ═══════════════════════════════════════════════════════════ */
export default function GeneralMaster({ gtypeuid, title }) {
  const { canAdd, canEdit, canDelete } = usePermissions(title);

  // ── Data state ───────────────────────────────────────────
  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadErr]    = useState('');
  const [isActive,   setIsActive]   = useState(true);
  const [search,     setSearch]     = useState('');
  const [sortField,  setSortField]  = useState(null);
  const [sortDir,    setSortDir]    = useState('asc');

  // ── Modal state ──────────────────────────────────────────
  const [modal,       setModal]      = useState(null);
  const [editRow,     setEditRow]    = useState(null);
  const [saving,      setSaving]     = useState(false);
  const [saveErr,     setSaveErr]    = useState('');
  const [deleteItem,  setDeleteItem] = useState(null);
  const [deleting,    setDeleting]   = useState(false);

  // ── Prevent double-click: tracks which row.id is in-flight ── ← NEW
  const [loadingId, setLoadingId] = useState(null);

  // ── Toast ────────────────────────────────────────────────
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  };

  /* ── Load ── */
  const load = useCallback(async () => {
    setLoading(true); setLoadErr('');
    try {
      const res = await fetchGeneral(gtypeuid, isActive ? 1 : 0);
      setRows(res.success ? res.data : []);
    } catch (err) {
      setLoadErr(err.response?.data?.message || `Failed to load ${title}.`);
      setRows([]);
    } finally { setLoading(false); }
  }, [gtypeuid, isActive, title]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSearch(''); setSortField(null); }, [gtypeuid]);

  /* ── Filter + sort ── */
  const displayRows = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.code?.toLowerCase().includes(q) ||
        r.name?.toLowerCase().includes(q) ||
        r.shortName?.toLowerCase().includes(q)
      );
    }
    if (sortField) {
      list = [...list].sort((a, b) => {
        const av = (a[sortField] || '').toString().toLowerCase();
        const bv = (b[sortField] || '').toString().toLowerCase();
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ?  1 : -1;
        return 0;
      });
    }
    return list;
  }, [rows, search, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  /* ── CRUD ── */
  const openAdd       = ()    => { setSaveErr(''); setModal('add'); setEditRow(null); };
  const openEdit      = (row) => { setSaveErr(''); setEditRow(row); setModal('edit'); };
  const confirmDelete = (row) => { setDeleteItem(row); };

  const handleSave = async (form) => {
    setSaveErr(''); setSaving(true);
    try {
      let res;
      if (modal === 'add') res = await createGeneral({ type: gtypeuid, ...form });
      else                  res = await updateGeneral({ type: gtypeuid, id: editRow.id, ...form });
      const msg = res.message || (modal === 'add' ? 'Saved successfully.' : 'Updated successfully.');
      if (msg.toLowerCase().includes('already exists')) { setSaveErr(msg); return; }
      showToast(msg); setModal(null); load();
    } catch (err) {
      setSaveErr(err.response?.data?.message || 'Operation failed.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const res = await deleteGeneral({ type: gtypeuid, id: deleteItem.id });
      showToast(res.message || 'Deleted successfully.');
      setDeleteItem(null); load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed.', 'error');
      setDeleteItem(null);
    } finally { setDeleting(false); }
  };

  /* ── Restore (undelete) ──  ← NEW
     No confirm modal — restore is non-destructive.
     loadingId prevents double-click.
  ── */
  const handleRestore = async (row) => {
    setLoadingId(row.id);
    try {
      const res = await restoreGeneral({ type: gtypeuid, id: row.id });
      showToast(res.message || `"${row.name}" has been restored.`);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Restore failed.', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const COLS = [
    { key: 'code',      label: 'CODE' },
    { key: 'name',      label: `${title.toUpperCase()} NAME` },
    { key: 'shortName', label: 'SHORT NAME' },
  ];

  return (
    <div className="gm-page">
      <Toast toast={toast} />

      {modal && (
        <FormModal title={title} mode={modal}
          initial={modal === 'edit'
            ? { code: editRow.code, name: editRow.name, shortName: editRow.shortName || '' }
            : EMPTY_FORM}
          onSave={handleSave} onClose={() => setModal(null)}
          saving={saving} saveError={saveErr} />
      )}
      {deleteItem && (
        <ConfirmModal title={title} item={deleteItem}
          onConfirm={handleDelete} onClose={() => setDeleteItem(null)}
          deleting={deleting} />
      )}

      {/* ── Page header ── */}
      <div className="gm-page-header">
        <div>
          <h1 className="gm-page-title">{title} List</h1>
          <p className="gm-page-subtitle">
            {isActive ? 'Showing active records' : 'Showing inactive records'}
          </p>
        </div>

        {isActive && canAdd && (
          <button className="gm-btn-add" onClick={openAdd}>
            <Ico.Plus /> Add New Record
          </button>
        )}
      </div>

      {/* ── Controls row ── */}
      <div className="gm-controls">
        <Toggle checked={isActive} onChange={() => setIsActive(v => !v)} />
        <div className="gm-controls-right">
          <div className="gm-search-wrap">
            <span className="gm-search-icon"><Ico.Search /></span>
            <input type="text" className="gm-search-input"
              placeholder={`Search ${title}...`} value={search}
              onChange={e => setSearch(e.target.value)} />
            {search && (
              <button className="gm-search-clear" onClick={() => setSearch('')}><Ico.Close /></button>
            )}
          </div>
        </div>
      </div>

      {loadError && <div className="gm-alert-error">⚠ {loadError}</div>}

      {/* ── Table ── */}
      <div className="gm-table-wrap">
        {loading ? (
          <div className="gm-loading"><div className="gm-spinner" /><span>Loading {title}...</span></div>
        ) : (
          <table className="gm-table">
            <thead>
              <tr>
                {COLS.map(col => (
                  <SortTh key={col.key} label={col.label} field={col.key}
                    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                ))}
                <th className="gm-th gm-th-action">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr><td colSpan={4} className="gm-empty">
                  {search
                    ? `No results for "${search}".`
                    : `No ${isActive ? 'active' : 'inactive'} records found.`}
                </td></tr>
              ) : (
                displayRows.map(row => {
                  // ✅ Normalise Active field (SP may return Active or active)
                  const rowIsActive = row.Active ?? row.active ?? 1;

                  return (
                    <tr key={row.id} className="gm-row">
                      <td className="gm-td gm-td-code">{row.code}</td>
                      <td className="gm-td">{row.name}</td>
                      <td className="gm-td">{row.shortName || '—'}</td>

                      {/* ── Action cell ── */}
                      <td className="gm-td gm-td-actions">
                        {isActive ? (
                          /* ── ACTIVE ROW: Edit + Delete ── */
                          <>
                            {canEdit && (
                              <button
                                className="gm-icon-btn gm-icon-edit"
                                onClick={() => openEdit(row)}
                                disabled={loadingId === row.id}
                                title={`Edit ${row.name}`}
                                aria-label={`Edit ${row.name}`}
                              >
                                <Ico.Edit />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                className="gm-icon-btn gm-icon-delete"
                                onClick={() => confirmDelete(row)}
                                disabled={loadingId === row.id}
                                title={`Delete ${row.name}`}
                                aria-label={`Delete ${row.name}`}
                              >
                                <Ico.Trash />
                              </button>
                            )}
                            {!canEdit && !canDelete && (
                              <span className="gm-no-actions">—</span>
                            )}
                          </>
                        ) : (
                          /* ── INACTIVE ROW: Restore OR "Inactive" badge ── */
                          canEdit ? (
                            <button
                              className="gm-icon-btn gm-icon-restore"
                              onClick={() => handleRestore(row)}
                              disabled={loadingId === row.id}
                              title={`Restore ${row.name}`}
                              aria-label={`Restore ${row.name}`}
                            >
                              {loadingId === row.id
                                ? <span className="gm-spinner-sm" />
                                : <Ico.Restore />
                              }
                            </button>
                          ) : (
                            <span className="gm-inactive-badge">Inactive</span>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {!loading && (
        <div className="gm-footer">
          {displayRows.length !== rows.length
            ? `${displayRows.length} of ${rows.length} records`
            : `${rows.length} record${rows.length !== 1 ? 's' : ''}`}
          {' · '}{isActive ? '🟢 Active' : '🔴 Inactive'}
        </div>
      )}
    </div>
  );
}