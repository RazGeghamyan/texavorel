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

    document.getElementById('tableSheetTitle').innerText = `Սեղան ${table.table_number} — Թերթիկ 📋`;
    const body = document.getElementById('tableSheetBody');
    body.innerHTML = '';

    // Summary row
    const summary = document.createElement('div');
    summary.style.cssText = 'font-size:11px;color:#8c7b66;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e8ddd0;display:flex;justify-content:space-between;';
    summary.innerHTML = `<span>${TABLE_DEFAULTS.label[table.category]} — ${table.capacity} տեղ</span><span>${seatedHere.length} / ${table.capacity} զբաղված է</span>`;
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

// ── PDF Export ────────────────────────────────────────────────────────────────

// Cache so the Armenian font is fetched only once per page session
let _armenianFontBase64 = null;

function _arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

async function _loadArmenianFont(doc) {
    if (!_armenianFontBase64) {
        const res = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-armenian@latest/armenian-400-normal.ttf');
        const buf = await res.arrayBuffer();
        _armenianFontBase64 = _arrayBufferToBase64(buf);
    }
    doc.addFileToVFS('NotoSansArmenian.ttf', _armenianFontBase64);
    doc.addFont('NotoSansArmenian.ttf', 'NotoArm', 'normal');
    doc.addFont('NotoSansArmenian.ttf', 'NotoArm', 'bold');
}

/**
 * ⚠️ ԽՆԴԻՐԻ ՊԱՏՃԱՌԸ.
 * «NotoSansArmenian» ֆայլը՝ ՄԻԱՅՆ հայկական ենթաբազմություն է (Google/Noto-ի
 * քաղաքականությամբ)՝ ՉՈՒՆԻ թվանշանների (0-9) ոչ էլ լատինատառ glyph-ներ։
 * Այդ իսկ պատճառով «Սեղան 1»-ի «1»-ը անհետանում էր PDF-ում։
 *
 * ԼՈՒՑՈՒՄ. տեքստը բաժանում ենք հատվածների (runs)՝ հայկական vs ոչ-հայկական,
 * և գծում ենք առանձին-առանձին՝ հայկականը NotoArm-ով, մնացածը (թվեր, լատին)՝
 * ներկառուցված helvetica-ով, որը հենազուրկ ունի թվանշանների glyph-ները։
 */
function _splitRuns(text) {
    const str = String(text == null ? '' : text);
    const runs = [];
    let current = '';
    let currentIsArm = null;
    for (const ch of str) {
        const isArm = /[\u0530-\u058F]/.test(ch);
        if (currentIsArm === null) {
            current = ch;
            currentIsArm = isArm;
        } else if (isArm === currentIsArm) {
            current += ch;
        } else {
            runs.push({ text: current, isArm: currentIsArm });
            current = ch;
            currentIsArm = isArm;
        }
    }
    if (current) runs.push({ text: current, isArm: currentIsArm });
    return runs;
}

/**
 * Ինքնուրույն գծում է cell-ի տեքստը՝ հատված-հատված, ֆոնտը փոխելով
 * հայկական/ոչ-հայկական հատվածների միջև։
 */
function _drawMixedCellText(doc, data) {
    const raw = data.cell.raw;
    if (raw === null || raw === undefined || raw === '') return;

    const fontSize = data.cell.styles.fontSize || 8;
    const isBold   = data.cell.styles.fontStyle === 'bold';
    const padLeft  = data.cell.padding('left');

    let x = data.cell.x + padLeft;
    const fontSizeMm = fontSize / 72 * 25.4; // pt → mm
    const y = data.cell.y + data.cell.height / 2 + fontSizeMm * 0.32;

    doc.setFontSize(fontSize);
    const c = data.cell.styles.textColor;

    _splitRuns(raw).forEach(run => {
        doc.setFont(run.isArm ? 'NotoArm' : 'helvetica', isBold ? 'bold' : 'normal');
        if (Array.isArray(c)) doc.setTextColor(c[0], c[1], c[2]);

        doc.text(run.text, x, y);
        x += doc.getTextWidth(run.text);
    });
}

/**
 * Ֆոնի թույլ երանգ՝ ըստ սեղանի կողմի — փոխարինում է հին «դատարկ տող»
 * անջատիչին, քանի որ պահում ենք էջի տարածքը հյուրերի համար։
 */
function _sideFillColor(sideLabel) {
    switch (sideLabel) {
        case 'Հարսի':     return [250, 235, 233]; // նուրբ վարդագույն
        case 'Փեսայի':    return [233, 241, 233]; // նուրբ կանաչ
        case 'Ընդհանուր': return [248, 242, 230]; // նուրբ ոսկեգույն
        default:          return [255, 255, 255];
    }
}
function _lighten(rgb, amt) {
    return rgb.map(v => Math.min(255, v + amt));
}

/**
 * exportToPDF()
 * Reads from State.allTables + State.allGuests — no extra fetch.
 *
 * Փոփոխություններ.
 * 1) Ավելացված է «Կողմ» սյունակ (Հարսի / Փեսայի / Ընդհանուր) յուրաքանչյուր
 *    սեղանի կողքին։ (Emoji-ները՝ 👰🤵🤝 դիտմամբ ՉԵՆ օգտագործվում PDF-ում,
 *    քանի որ ոչ մի բեռնված ֆոնտ emoji glyph-ներ չունի — կդրվեին դատարկ
 *    քառակուսիներ։ Փոխարենն օգտագործում ենք պարզ հայերեն բառ։)
 * 2) Շատ ավելի սահմանափակ չափսեր (fontSize 8, մինիմալ padding, հանված
 *    հին դատարկ բացատ-տողերը) → մոտ 1.8–2x ավելի շատ հյուր մեկ էջում։
 * 3) Նուրբ գունային շերտավորում ըստ կողմի՝ փոխարինում է հին բացատ-տողին
 *    որպես սեղանների միջև տեսողական անջատիչ։
 */
async function exportToPDF() {
    const tables     = [...State.allTables].sort((a, b) => parseInt(a.table_number) - parseInt(b.table_number));
    const allMembers = State.allGuests.flatMap(g => g.members);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    await _loadArmenianFont(doc);

    const titleText = 'Հյուրերի նստեցման ցուցակ';
    doc.setFont('NotoArm', 'bold');
    doc.setFontSize(16);
    doc.text(titleText, 8, 12);

    const sideLabelMap = { bride: 'Հարսի', groom: 'Փեսայի', mutual: 'Ընդհանուր' };

    const rows = [];
    tables.forEach(table => {
        const sideLabel = sideLabelMap[table.side || 'mutual'];
        const here = allMembers
            .filter(m => m.table_id === table.id)
            .sort((a, b) => (a.seat_index || 0) - (b.seat_index || 0));

        if (!here.length) {
            rows.push([sideLabel, `Սեղան ${table.table_number}`, 'Դատարկ', '']);
        } else {
            here.forEach((m, i) => {
                const seatNum = m.seat_index != null ? m.seat_index + 1 : i + 1;
                rows.push([
                    sideLabel,
                    `Սեղան ${table.table_number}`,
                    `Աթոռ ${seatNum}`,
                    m.first_name || 'Անանուն',
                ]);
            });
        }
        // ✅ Հին «դատարկ տողը» հանված է՝ տեղ խնայելու համար.
        // սեղանների միջև անջատիչը հիմա գունային շերտավորումն է (ստորև)։
    });

    let lastTableLabel = null;
    let bandToggle = false;

    doc.autoTable({
        startY:      17,
        margin:      { top: 10, left: 8, right: 8, bottom: 10 },
        head:        [['Կողմ', 'Սեղան', 'Աթոռ', 'Անուն']],
        body:        rows,
        theme:       'grid',
        headStyles:  { fillColor: [26, 22, 18], textColor: [232, 213, 176], fontStyle: 'bold', font: 'NotoArm', fontSize: 9 },
        styles:      { fontSize: 8, cellPadding: { top: 1.2, right: 2, bottom: 1.2, left: 2 }, font: 'NotoArm' },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 26 },
            1: { fontStyle: 'bold', cellWidth: 28 },
            2: { cellWidth: 24 },
        },
        didParseCell: (data) => {
            if (data.section === 'body') {
                const rowRaw     = data.row.raw;
                const sideLabel  = rowRaw[0];
                const tableLabel = rowRaw[1];
                if (tableLabel !== lastTableLabel) {
                    bandToggle = !bandToggle;
                    lastTableLabel = tableLabel;
                }
                const base = _sideFillColor(sideLabel);
                data.cell.styles.fillColor = bandToggle ? base : _lighten(base, 6);
            }
            data.cell.text = [' '];
        },
        didDrawCell: (data) => {
            _drawMixedCellText(doc, data);
        },
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
         'renameMemberModal', 'chairActionsModal', 'mergeGuestsModal'].forEach(closeModal);
    }
});