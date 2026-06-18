/**
 * hall.js — Hall canvas: render + drag/drop + zoom/pan + mutations.
 *
 * RULE: Zero GET requests after mutations.
 *       Every write uses the server response to patchState() directly.
 *
 * Depends on: api.js, state.js (State + patchState), modals.js
 */

// ── Position save ─────────────────────────────────────────────────────────────

let _saveTimer = null;

function scheduleSave(tableId) {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
        const pos = State.tablePositions[tableId];
        if (pos) _savePositionSilent(tableId, pos.x, pos.y);
    }, 1000);
}

async function _savePositionSilent(tableId, x, y) {
    const res = await API.updateTablePosition(tableId, x, y);
    if (res.ok) showSaveIndicator();
    // Position is already in State.tablePositions — no patchState needed
}

async function saveAllPositions() {
    const entries = Object.entries(State.tablePositions);
    if (!entries.length) return;
    const positions = entries.map(([id, pos]) => ({
        table_id: parseInt(id),
        x_pos:    pos.x,
        y_pos:    pos.y,
    }));
    const res = await API.bulkUpdatePositions(positions);
    if (res.ok) showSaveIndicator();
}

function showSaveIndicator() {
    const el = document.getElementById('saveIndicator');
    if (!el) return;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 2000);
}

// ── Zoom & Pan ────────────────────────────────────────────────────────────────

function updateCanvasTransform() {
    const w = document.getElementById('zoomWrapper');
    if (w) w.style.transform = `translate(${State.panOffset.x}px,${State.panOffset.y}px) scale(${State.zoomScale})`;
}

function zoomHall(f) {
    State.zoomScale = Math.min(2.5, Math.max(0.3, State.zoomScale * f));
    updateCanvasTransform();
}

function resetZoom() {
    State.zoomScale  = 1.0;
    State.panOffset  = { x: 0, y: 0 };
    updateCanvasTransform();
}

function initHallPanZoom() {
    const container = document.getElementById('hallContainer');
    if (!container) return;

    container.addEventListener('mousedown', (e) => {
        if (e.target.closest('.movable-table') || e.target.closest('.chair') || e.target.tagName === 'BUTTON') return;
        State.isPanning      = true;
        container.style.cursor = 'grabbing';
        State.panStart.x     = e.clientX - State.panOffset.x;
        State.panStart.y     = e.clientY - State.panOffset.y;
    });

    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const f = 1.08;
        State.zoomScale = e.deltaY < 0
            ? Math.min(2.5, State.zoomScale * f)
            : Math.max(0.3, State.zoomScale / f);
        updateCanvasTransform();
    }, { passive: false });
}

document.addEventListener('mousemove', (e) => {
    if (State.activeMovingTable) {
        const wrapRect = document.getElementById('zoomWrapper').getBoundingClientRect();
        const x = (e.clientX - wrapRect.left) / State.zoomScale - State.dragOffset.x;
        const y = (e.clientY - wrapRect.top)  / State.zoomScale - State.dragOffset.y;
        State.activeMovingTable.style.left = x + 'px';
        State.activeMovingTable.style.top  = y + 'px';
        const tableId = parseInt(State.activeMovingTable.getAttribute('data-table-id'));
        State.activeMovingTable.style.transform = `rotate(${State.tableRotations[tableId] || 0}deg)`;
        State.tablePositions[tableId] = { x, y };
        return;
    }
    if (State.isPanning) {
        State.panOffset.x = e.clientX - State.panStart.x;
        State.panOffset.y = e.clientY - State.panStart.y;
        updateCanvasTransform();
    }
});

document.addEventListener('mouseup', () => {
    if (State.activeMovingTable) {
        State.activeMovingTable.classList.remove('dragging');
        const tableId = parseInt(State.activeMovingTable.getAttribute('data-table-id'));
        const pos = State.tablePositions[tableId];
        if (pos) scheduleSave(tableId);
        State.activeMovingTable = null;
    }
    if (State.isPanning) {
        State.isPanning = false;
        const c = document.getElementById('hallContainer');
        if (c) c.style.cursor = 'auto';
    }
});

// ── Hall side filter ──────────────────────────────────────────────────────────

function filterHall(side) {
    State.currentHallFilter = side;
    ['all', 'bride', 'groom', 'mutual'].forEach(s => {
        const btn = document.getElementById(`hf-${s}`);
        if (!btn) return;
        btn.className = s === side
            ? 'hf-pill px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-[#1a1612] text-[#e8d5b0] transition-all'
            : 'hf-pill px-3 py-1.5 text-[11px] font-semibold rounded-lg text-[#5c4f3d] hover:bg-[#f7f3ee] transition-all';
    });
    document.querySelectorAll('.movable-table').forEach(el => {
        const tSide = el.getAttribute('data-side') || 'mutual';
        el.classList.toggle('hall-hidden', side !== 'all' && tSide !== side);
    });
}

// ── Table geometry helpers ────────────────────────────────────────────────────

function getTableDimensions(category, capacity = 10) {
    switch (category) {
        case 'round': {
            const extra = Math.max(0, capacity - 12);
            const w = 150 + extra * 12, h = 150 + extra * 12;
            return { w, h, radius: (w / 2) + 11 };
        }
        case 'rectangle': {
            const extra = Math.max(0, capacity - 8);
            return { w: 220 + Math.ceil(extra / 2) * 45, h: 100 };
        }
        case 'double_rectangle': {
            const extra = Math.max(0, capacity - 16);
            return { w: 300 + Math.ceil(extra / 2) * 40, h: 110 };
        }
        case 'presidium': {
            const extra = Math.max(0, capacity - 6);
            return { w: 240 + extra * 40, h: 70 };
        }
        default: return { w: 160, h: 160 };
    }
}

function getChairPosition(category, i, total, dim) {
    const { w, h } = dim;
    if (category === 'round') {
        const angle = (i * 2 * Math.PI) / total - Math.PI / 2;
        return { x: w / 2 + dim.radius * Math.cos(angle), y: h / 2 + dim.radius * Math.sin(angle) };
    }
    if (category === 'presidium') {
        const spacing = w / (total + 1);
        return { x: spacing * (i + 1), y: -16 };
    }
    const half    = Math.ceil(total / 2);
    const spacing = w / (half + 1);
    if (i < half) return { x: spacing * (i + 1),      y: -16 };
    return             { x: spacing * (i - half + 1), y: h + 16 };
}

// ── Rotate ────────────────────────────────────────────────────────────────────

function rotateTable(tableId, degrees) {
    if (State.tableRotations[tableId] === undefined) State.tableRotations[tableId] = 0;
    State.tableRotations[tableId] = (State.tableRotations[tableId] + degrees) % 360;
    const el = document.querySelector(`[data-table-id="${tableId}"]`);
    if (el) {
        el.style.transform = `rotate(${State.tableRotations[tableId]}deg)`;
        el.querySelectorAll('.chair').forEach(c => {
            c.style.transform = `translate(-50%,-50%) rotate(${-State.tableRotations[tableId]}deg)`;
        });
    }
}

// ── Build single table DOM element ───────────────────────────────────────────

function buildTableElement(table, allMembers) {
    const dim  = getTableDimensions(table.category, table.capacity);
    const tDiv = document.createElement('div');
    tDiv.className = 'movable-table';
    tDiv.setAttribute('data-table-id', table.id);
    tDiv.setAttribute('data-side', table.side || 'mutual');

    const pos = State.tablePositions[table.id];
    tDiv.style.left   = pos.x + 'px';
    tDiv.style.top    = pos.y + 'px';
    tDiv.style.width  = dim.w + 'px';
    tDiv.style.height = dim.h + 'px';

    if (State.tableRotations[table.id] === undefined) State.tableRotations[table.id] = 0;
    tDiv.style.transform = `rotate(${State.tableRotations[table.id]}deg)`;

    const sideBorderColor = { bride: '#c4736a', groom: '#7a9e7e', mutual: '#cfc4b4' }[table.side || 'mutual'];
    const sideBadge       = { bride: '👰',       groom: '🤵',      mutual: '🤝' }[table.side || 'mutual'];

    const body = document.createElement('div');
    body.className = 'table-inner';
    body.style.cssText = [
        'position:relative', 'width:100%', 'height:100%',
        'background:#e8e0d4', `border:2px solid ${sideBorderColor}`,
        'display:flex', 'align-items:center', 'justify-content:center', 'flex-direction:column',
        table.category === 'round'
            ? 'border-radius:50%'
            : table.category === 'presidium'
                ? 'border-radius:8px;background:#ddd5c4'
                : 'border-radius:10px',
    ].join(';');
    body.innerHTML = `
        <div style="text-align:center;pointer-events:none;z-index:2;">
            <div style="font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:700;color:#1a1612;line-height:1.1;">Սեղ. ${table.table_number}</div>
            <div style="font-size:10px;color:#8c7b66;margin-top:2px;">${table.capacity} տեղ ${sideBadge}</div>
        </div>`;

    const actions = document.createElement('div');
    actions.className = 'table-actions absolute top-full mt-10 left-0 w-full flex justify-center gap-1.5 z-30 whitespace-nowrap pointer-events-auto';

    actions.innerHTML = `
        <button onclick="event.stopPropagation();rotateTable(${table.id},-45)"
            class="bg-white border border-[#e8ddd0] hover:border-[#c9a96e] rounded-md text-[10px] font-medium text-[#5c4f3d] shadow-sm cursor-pointer transition-all"
            style="width:28px;height:24px;padding:0;" title="Պտտել ձախ">↩️</button>
        <button onclick="event.stopPropagation();openTableSheet(${table.id})"
            class="bg-white border border-[#e8ddd0] hover:border-[#c9a96e] rounded-md text-[10px] font-medium text-[#5c4f3d] shadow-sm cursor-pointer transition-all"
            style="width:76px;height:24px;padding:0;">📋 Թերթ.</button>
        <button onclick="event.stopPropagation();editTableCapacity(${table.id},${table.capacity})"
            class="bg-white border border-[#e8ddd0] hover:border-[#c9a96e] rounded-md text-[10px] font-medium text-[#5c4f3d] shadow-sm cursor-pointer transition-all"
            style="width:60px;height:24px;padding:0;">✏️ Աթ.</button>
        <button onclick="event.stopPropagation();rotateTable(${table.id},45)"
            class="bg-white border border-[#e8ddd0] hover:border-[#c9a96e] rounded-md text-[10px] font-medium text-[#5c4f3d] shadow-sm cursor-pointer transition-all"
            style="width:28px;height:24px;padding:0;" title="Պտտել աջ">↪️</button>
        <button onclick="event.stopPropagation();deleteTable(${table.id})"
            class="bg-white border border-[#e8ddd0] hover:text-[#c4736a] hover:border-[#c4736a] rounded-md text-[10px] font-medium text-[#5c4f3d] shadow-sm cursor-pointer transition-all"
            style="width:32px;height:24px;padding:0;">🗑️</button>`;

    tDiv.appendChild(body);
    tDiv.appendChild(actions);

    // ── Chairs ──
    const seatedHere  = allMembers.filter(m => m.table_id === table.id);
    const autoMembers = seatedHere.filter(m => m.seat_index == null).slice();

    for (let i = 0; i < table.capacity; i++) {
        const chair  = document.createElement('div');
        chair.className = 'chair';

        let member = seatedHere.find(m => m.seat_index === i);
        if (!member && autoMembers.length > 0) member = autoMembers.shift();

        if (member) {
            chair.classList.add('occupied');
            chair.innerText = member.first_name ? member.first_name.substring(0, 3) : '👤';
            chair.title     = member.first_name || 'Անանուն';
            chair.onclick   = (e) => { e.stopPropagation(); manageSeatedMember(member); };
        } else {
            chair.innerText = i + 1;
            chair.title     = 'Ազատ — սեղմեք';
            chair.onclick   = (e) => { e.stopPropagation(); openGuestPickerForSeat(table.id, i); };
        }

        chair.addEventListener('dragover', (e) => {
            e.preventDefault(); e.stopPropagation();
            if (!chair.classList.contains('occupied')) {
                chair.style.borderColor = '#c9a96e';
                chair.style.background  = 'rgba(201,169,110,0.2)';
            }
        });
        chair.addEventListener('dragleave', () => {
            if (!chair.classList.contains('occupied')) {
                chair.style.borderColor = '';
                chair.style.background  = '';
            }
        });
        chair.addEventListener('drop', async (e) => {
            e.preventDefault(); e.stopPropagation();
            chair.style.borderColor = ''; chair.style.background = '';
            if (chair.classList.contains('occupied')) return;
            const memberId = e.dataTransfer.getData('text/plain');
            if (memberId) await seatMemberOnChair(parseInt(memberId), table.id, i);
        });

        const p = getChairPosition(table.category, i, table.capacity, dim);
        chair.style.left      = p.x + 'px';
        chair.style.top       = p.y + 'px';
        chair.style.transform = `translate(-50%,-50%) rotate(${-State.tableRotations[table.id]}deg)`;
        body.appendChild(chair);
    }

    // ── Table drag (move on canvas) ──
    tDiv.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.classList.contains('chair')) return;
        e.preventDefault();
        State.activeMovingTable = tDiv;
        tDiv.classList.add('dragging');
        const wrapRect = document.getElementById('zoomWrapper').getBoundingClientRect();
        State.dragOffset.x = (e.clientX - wrapRect.left) / State.zoomScale - parseFloat(tDiv.style.left || 0);
        State.dragOffset.y = (e.clientY - wrapRect.top)  / State.zoomScale - parseFloat(tDiv.style.top  || 0);
    });

    // ── Table as drop target ──
    tDiv.addEventListener('dragover',  (e) => { e.preventDefault(); e.stopPropagation(); tDiv.classList.add('drag-over'); });
    tDiv.addEventListener('dragleave', (e) => { if (!tDiv.contains(e.relatedTarget)) tDiv.classList.remove('drag-over'); });
    tDiv.addEventListener('drop', async (e) => {
        e.preventDefault(); e.stopPropagation();
        tDiv.classList.remove('drag-over');
        const memberId = e.dataTransfer.getData('text/plain');
        if (memberId) await seatMemberOnTable(parseInt(memberId), table.id);
    });

    return tDiv;
}

// ── Pure UI renderer ──────────────────────────────────────────────────────────

function renderHall() {
    const wrapper = document.getElementById('zoomWrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    const allMembers = State.allGuests.flatMap(g => g.members);

    State.allTables.forEach((table, index) => {
        if (State.tablePositions[table.id] === undefined) {
            State.tablePositions[table.id] = {
                x: table.x_pos != null ? table.x_pos : 60 + (index % 3) * 300,
                y: table.y_pos != null ? table.y_pos : 80 + Math.floor(index / 3) * 230,
            };
        }
        wrapper.appendChild(buildTableElement(table, allMembers));
    });

    filterHall(State.currentHallFilter);
}

const loadTables = () => updateAppState();

// ── Seat on specific chair ────────────────────────────────────────────────────

async function seatMemberOnChair(memberId, tableId, seatIndex) {
    const res = await API.seatMember(memberId, tableId, seatIndex);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Ազատ տեղ չկա կամ սխալ կատարվեց');
        return;
    }
    // ✅ No GET — patch State directly
    patchState({ memberSeated: { memberId, tableId, seatIndex } });
}

// ── Guest picker for empty chair ──────────────────────────────────────────────

function openGuestPickerForSeat(tableId, seatIndex) {
    State.pendingSeatTableId = tableId;
    State.pendingSeatIndex   = seatIndex;
    const list = document.getElementById('guestPickerList');
    list.innerHTML = '';

    const unseatedIds = new Set(State.unseatedMembers.map(m => m.id.toString()));

    if (!State.unseatedMembers.length) {
        list.innerHTML = '<p class="text-center text-[#8c7b66] text-sm italic py-6">Չնստ. հյուրեր չկան 🎉</p>';
        openModal('guestPickerModal');
        return;
    }

    State.allGuests.forEach(guest => {
        const um = guest.members.filter(m => unseatedIds.has(m.id.toString()));
        if (!um.length) return;

        const hdr = document.createElement('div');
        hdr.className = 'text-[11px] font-bold text-[#8c7b66] uppercase tracking-wider mt-3 mb-1 px-1';
        hdr.innerText = guest.display_name;
        list.appendChild(hdr);

        um.forEach(m => {
            const btn = document.createElement('button');
            btn.className = 'w-full text-left px-3 py-2 rounded-lg border border-[#e8ddd0] bg-white text-xs font-medium text-[#1a1612] flex justify-between items-center hover:border-[#c9a96e] hover:bg-[#c9a96e]/5 transition-all mb-1';
            btn.innerHTML = `<span>👤 ${m.first_name || 'Անանուն'}</span><span class="text-[#c9a96e] font-bold text-sm">+</span>`;
            btn.addEventListener('click', async () => {
                await seatMemberOnChair(m.id, tableId, seatIndex);
                closeModal('guestPickerModal');
            });
            list.appendChild(btn);
        });
    });

    openModal('guestPickerModal');
}

// ── Manage seated member ──────────────────────────────────────────────────────

function manageSeatedMember(member) {
    document.getElementById('chairActionsTitle').innerText = member.first_name || 'Անանուն հյուր';
    document.getElementById('chairActionRenameBtn').onclick = () => {
        closeModal('chairActionsModal');
        openRenameModal(member.id, member.first_name || '');
    };
    document.getElementById('chairActionUnseatBtn').onclick = () => {
        closeModal('chairActionsModal');
        showConfirmDelete(
            `«${member.first_name || 'Անանուն'}» — հեռ.?`,
            async () => {
                const res = await API.unseatMember(member.id);
                if (res.ok) {
                    closeModal('confirmDeleteModal');
                    // ✅ No GET
                    patchState({ memberUnseated: { memberId: member.id } });
                }
            },
        );
    };
    openModal('chairActionsModal');
}

// ── Seat helper (used by unseated.js drag-drop) ───────────────────────────────

/**
 * Find next free seat_index from State (no fetch).
 */
function findNextFreeSeatFromState(tableId) {
    const table = State.allTables.find(t => t.id === tableId);
    if (!table) return null;

    const allMembers = State.allGuests.flatMap(g => g.members);
    const occupied   = new Set(
        allMembers
            .filter(m => m.table_id === tableId && m.seat_index != null)
            .map(m => m.seat_index),
    );
    for (let i = 0; i < table.capacity; i++) {
        if (!occupied.has(i)) return i;
    }
    return null;
}

/**
 * Seat a member on a table, auto-assigning next free seat.
 * ✅ No GET — patches State from server response.
 */
async function seatMemberOnTable(memberId, tableId) {
    const seatIndex = findNextFreeSeatFromState(tableId);
    if (seatIndex === null) {
        alert('Ազատ տեղ չկա։');
        return false;
    }
    const res = await API.seatMember(memberId, tableId, seatIndex);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Սխալ');
        return false;
    }
    // ✅ No GET — patch State directly
    patchState({ memberSeated: { memberId, tableId, seatIndex } });
    return true;
}

// ── Add table flow ────────────────────────────────────────────────────────────

function selectNewTableSide(side) {
    State.pendingNewSide = side;
    document.querySelectorAll('.nts-btn').forEach(b => {
        b.className = 'nts-btn flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all border-[#e8ddd0] text-[#5c4f3d]';
    });
    const colors = {
        bride:  'border-[#c4736a] bg-[#c4736a]/10 text-[#c4736a]',
        groom:  'border-[#7a9e7e] bg-[#7a9e7e]/10 text-[#7a9e7e]',
        mutual: 'border-[#c9a96e] bg-[#c9a96e]/10 text-[#8a6c30]',
    };
    const el = document.getElementById(`nts-${side}`);
    if (el) el.className = `nts-btn flex-1 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all ${colors[side]}`;
}

function startAddTable(category) {
    State.pendingNewCategory = category;
    State.pendingNewCapacity = TABLE_DEFAULTS.capacity[category] || 10;
    State.pendingNewSide     = 'mutual';
    document.getElementById('addTableModalTitle').innerText  = `Նոր ${TABLE_DEFAULTS.label[category]} սեղան`;
    document.getElementById('newCapacityDisplay').innerText  = State.pendingNewCapacity;
    document.getElementById('newTableNumber').value          = '';
    document.getElementById('addTableCatNote').innerText     =
        category === 'round'            ? 'Կլոր սեղան — աթոռները շրջանով' :
        category === 'rectangle'        ? 'Ուղղանկյուն — աթոռները երկու կողմից' :
        category === 'double_rectangle' ? 'Կրկնակի — երկու կողմից, ավելի երկար' :
                                          'Պրեզիդիում — լայն, հյուրերի ի պատիվ';
    selectNewTableSide('mutual');
    openModal('addTableModal');
    setTimeout(() => document.getElementById('newTableNumber').focus(), 100);
}

function changeNewCapacity(delta) {
    State.pendingNewCapacity = Math.max(1, Math.min(60, State.pendingNewCapacity + delta));
    document.getElementById('newCapacityDisplay').innerText = State.pendingNewCapacity;
}

async function confirmAddTable() {
    const num = document.getElementById('newTableNumber').value.trim();
    if (!num) { document.getElementById('newTableNumber').focus(); return; }

    const res = await API.createTable(num, State.pendingNewCategory, State.pendingNewCapacity, State.pendingNewSide);
    if (res.ok) {
        const newTable = await res.json();  // server returns full table object
        closeModal('addTableModal');
        // ✅ No GET — push server response directly into State
        patchState({ tableAdded: newTable });
    }
}

// ── Edit capacity ─────────────────────────────────────────────────────────────

function editTableCapacity(tableId, current) {
    State.pendingEditTableId     = tableId;
    State.pendingEditCapacityVal = current;
    document.getElementById('editCapacityDisplay').innerText = current;
    openModal('editCapacityModal');
}

function changeEditCapacity(delta) {
    State.pendingEditCapacityVal = Math.max(1, Math.min(60, State.pendingEditCapacityVal + delta));
    document.getElementById('editCapacityDisplay').innerText = State.pendingEditCapacityVal;
}

async function confirmEditCapacity() {
    const res = await API.updateTableCapacity(State.pendingEditTableId, State.pendingEditCapacityVal);
    if (res.ok) {
        const updatedTable = await res.json();  // server returns updated table
        closeModal('editCapacityModal');
        // ✅ No GET — replace table in State
        patchState({ tableUpdated: updatedTable });
    } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Սխալ կատարվեց');
    }
}

// ── Delete table ──────────────────────────────────────────────────────────────

function deleteTable(id) {
    showConfirmDelete(
        'Ջնջե՞լ սեղանը։ Բոլոր հյուրերը կազատվեն։',
        async () => {
            const res = await API.deleteTable(id);
            if (res.ok) {
                closeModal('confirmDeleteModal');
                // ✅ Ուղղակի փոխանցում ենք ID-ն patchState-ին, ոչ մի սթեյթի ձեռքով փոփոխություն այստեղ չենք անում
                patchState({ tableRemoved: id });
            }
        },
    );
}


// ── Dropdown menu ─────────────────────────────────────────────────────────────

function toggleTableMenu(event) {
    event.stopPropagation();
    const menu  = document.getElementById('tableDropdownMenu');
    const arrow = document.getElementById('menuArrow');
    const isHidden = menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !isHidden);
    arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
}

function triggerMenuAction(category) {
    document.getElementById('tableDropdownMenu').classList.add('hidden');
    document.getElementById('menuArrow').style.transform = 'rotate(0deg)';
    startAddTable(category);
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('tableDropdownMenu');
    const btn  = document.getElementById('tableMenuBtn');
    if (menu && !menu.classList.contains('hidden') && btn && !btn.contains(e.target)) {
        menu.classList.add('hidden');
        document.getElementById('menuArrow').style.transform = 'rotate(0deg)';
    }
});