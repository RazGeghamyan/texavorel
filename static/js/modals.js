/**
 * modals.js — Modal helpers, table sheet, rename, confirm-delete, PDF export.
 *
 * RULE: Zero GET requests after mutations.
 * Every write uses the server response to patchState() directly.
 *
 * Depends on: api.js, state.js (State + patchState)
 */

// ── Core modal open/close ─────────────────────────────────────────────────────

function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ── Confirm-delete helper ─────────────────────────────────────────────────────

function showConfirmDelete(text, onConfirm) {
    document.getElementById('confirmDeleteText').innerText = text;
    openModal('confirmDeleteModal');
    document.getElementById('executeDeleteBtn').onclick = onConfirm;
}

// ── Rename member ─────────────────────────────────────────────────────────────

/**
 * openRenameModal(memberId, oldName)
 *
 * Updates the member's name and surgically updates the local state.
 */
function openRenameModal(memberId, oldName) {
    const input = document.getElementById('renameMemberInput');
    input.value = oldName;
    openModal('renameMemberModal');
    setTimeout(() => input.focus(), 100);

    document.getElementById('updateConfirmBtn').onclick = async () => {
        const newName = input.value.trim();
        if (!newName) return;
        const res = await API.renameMember(memberId, newName);
        if (res.ok) {
            closeModal('renameMemberModal');
            closeModal('tableSheetModal');  // safe if not open
            patchState({ memberRenamed: { memberId, firstName: newName } }); // ✅ Փոխարինված է
        }
    };
}

// ── Table Sheet ───────────────────────────────────────────────────────────────

/**
 * openTableSheet(tableId)
 *
 * Reads from State.allGuests + State.allTables — no API fetch needed.
 */
function openTableSheet(tableId) {
    const table = State.allTables.find(t => t.id === tableId);
    if (!table) return;

    const allMembers = State.allGuests.flatMap(g =>
        g.members.map(m => ({ ...m, guestName: g.display_name })),
    );
    const seatedHere = allMembers.filter(m => m.table_id === tableId);

    document.getElementById('tableSheetTitle').innerText = `Սեղ. ${table.table_number} — Թերթ. 📋`;
    const body = document.getElementById('tableSheetBody');
    body.innerHTML = '';

    // Summary row
    const summary = document.createElement('div');
    summary.style.cssText = 'font-size:11px;color:#8c7b66;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e8ddd0;display:flex;justify-content:space-between;';
    summary.innerHTML = `<span>${TABLE_DEFAULTS.label[table.category]} — ${table.capacity} տեղ</span><span>${seatedHere.length} / ${table.capacity} զբաղ.</span>`;
    body.appendChild(summary);

    // Seated rows
    seatedHere.forEach(m => {
        const seatNum = m.seat_index != null ? m.seat_index + 1 : '-';
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;margin-bottom:6px;padding:6px 8px;background:rgba(0,0,0,0.02);border-radius:6px;';
        row.innerHTML = `
            <div style="font-weight:bold;color:#c9a96e;width:24px;font-size:11px;">#${seatNum}</div>
            <div style="flex:1;font-size:12px;font-weight:500;">👤 ${m.first_name || 'Անանուն'}</div>
            <div style="display:flex;gap:4px;">
                <button style="background:none;border:none;cursor:pointer;padding:2px 6px;"
                    onclick="openRenameModal(${m.id},'${(m.first_name || '').replace(/'/g, "\\'")}')">✏️</button>
                <button style="background:none;border:none;cursor:pointer;padding:2px 6px;color:#c4736a;"
                    onclick="sheetRemoveMember(${m.id})">✕</button>
            </div>`;
        body.appendChild(row);
    });

    // Free seat rows
    const freeCount = table.capacity - seatedHere.length;
    if (freeCount > 0) {
        const freeTitle = document.createElement('div');
        freeTitle.style.cssText = 'font-size:10px;color:#8c7b66;text-transform:uppercase;letter-spacing:1px;margin-top:14px;margin-bottom:8px;font-weight:bold;';
        freeTitle.innerText = `Ազատ տեղեր (${freeCount})`;
        body.appendChild(freeTitle);

        for (let i = 0; i < freeCount; i++) {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;margin-bottom:6px;padding:8px;border:1px dashed #c9a96e;background:rgba(201,169,110,0.03);border-radius:8px;cursor:pointer;transition:all 0.2s;';
            row.onmouseover = () => { row.style.background = 'rgba(201,169,110,0.09)'; row.style.borderColor = '#1a1612'; };
            row.onmouseout  = () => { row.style.background = 'rgba(201,169,110,0.03)'; row.style.borderColor = '#c9a96e'; };
            row.onclick = () => {
                // openGuestPicker lives in unseated.js and reads from State
                openGuestPicker(tableId);
                closeModal('tableSheetModal');
            };
            row.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;flex:1;">
                    <div style="width:18px;height:18px;border-radius:50%;border:1px dashed #c9a96e;display:flex;align-items:center;justify-content:center;font-size:9px;color:#c9a96e;">🪑</div>
                    <div style="font-size:11.5px;color:#8c7b66;font-style:italic;">Դատարկ աթոռ</div>
                </div>
                <div style="font-size:11px;color:#c9a96e;font-weight:bold;">Ընտրել →</div>`;
            body.appendChild(row);
        }
    }

    openModal('tableSheetModal');
}

function sheetRemoveMember(memberId) {
    showConfirmDelete(
        'Հեռացնե՞լ այս հյուրին սեղանից։',
        async () => {
            const res = await API.unseatMember(memberId);
            if (res.ok) {
                closeModal('confirmDeleteModal');
                closeModal('tableSheetModal');
                patchState({ memberUnseated: { memberId } }); // ✅ Փոխարինված է
            }
        },
    );
}

// ── PDF Export ────────────────────────────────────────────────────────────────

/**
 * exportToPDF()
 * Reads from State.allTables + State.allGuests — no extra fetch.
 */
function exportToPDF() {
    const tables     = [...State.allTables].sort((a, b) => parseInt(a.table_number) - parseInt(b.table_number));
    const allMembers = State.allGuests.flatMap(g => g.members);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('HURERI NSTECMAN CUC AK', 14, 15);

    const rows = [];
    tables.forEach(table => {
        const here = allMembers
            .filter(m => m.table_id === table.id)
            .sort((a, b) => (a.seat_index || 0) - (b.seat_index || 0));

        if (!here.length) {
            rows.push([`Sg. ${table.table_number}`, 'Datark', '']);
        } else {
            here.forEach((m, i) => rows.push([
                i === 0 ? `Seghan ${table.table_number}` : '',
                `Ator ${m.seat_index != null ? m.seat_index + 1 : i + 1}`,
                m.first_name || 'Ananun',
            ]));
        }
        rows.push(['', '', '']);
    });

    doc.autoTable({
        startY:      22,
        head:        [['Seghan', 'Ator', 'Anun']],
        body:        rows,
        theme:       'striped',
        headStyles:  { fillColor: [26, 22, 18], textColor: [232, 213, 176], fontStyle: 'bold' },
        styles:      { font: 'Helvetica', fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 30 } },
    });

    doc.save(`wedding_seating_id_${weddingId}.pdf`);
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (document.activeElement.id === 'guestName')      { addGuest();       return; }
        if (document.activeElement.id === 'newTableNumber') { confirmAddTable(); return; }
        if (document.getElementById('editCapacityModal')?.classList.contains('open')) { confirmEditCapacity(); return; }
        if (document.getElementById('renameMemberModal')?.classList.contains('open')) { document.getElementById('updateConfirmBtn').click(); return; }
    }
    if (e.key === 'Escape') {
        ['addTableModal', 'seatCountModal', 'tablePickerModal', 'guestPickerModal',
         'tableSheetModal', 'editCapacityModal', 'confirmDeleteModal',
         'renameMemberModal', 'chairActionsModal'].forEach(closeModal);
    }
});