/**
 * unseated.js — Չնստեցվածներ panel, seat flow (count → table picker)
 * Կախված է: api.js, state.js, modals.js, hall.js (seatMemberOnTable)
 */

async function reloadUnseated() {
    const [gR, uR] = await Promise.all([API.getGuests(), API.getUnseatedMembers()]);
    if (!gR.ok || !uR.ok) {
        document.getElementById('unseatedContainer').innerHTML =
            '<p class="text-center text-[#8c7b66] text-xs italic py-6">Սխալ</p>';
        return;
    }
    State.allGuests       = await gR.json();
    State.unseatedMembers = await uR.json();
    renderUnseatedList();
}

function renderUnseatedList() {
    const container = document.getElementById('unseatedContainer');
    if (!container) return;

    const totalMembers = State.allGuests.reduce((s, g) => s + g.total_count, 0);
    document.getElementById('unseatedSummary').innerText =
        `${totalMembers - State.unseatedMembers.length} / ${totalMembers} նստ.`;

    if (!State.allGuests.length) {
        container.innerHTML = '<p class="text-center text-[#8c7b66] text-xs italic py-6">Ավ. հյուրեր ←</p>';
        return;
    }

    const unseatedIds = new Set(State.unseatedMembers.map(m => m.id));
    const fragment    = document.createDocumentFragment();
    let hasVisible    = false;

    State.allGuests.forEach(guest => {
        if (State.currentUnseatedFilter !== 'all' && guest.side !== State.currentUnseatedFilter) return;
        hasVisible = true;

        const guestUnseated = guest.members.filter(m => unseatedIds.has(m.id));
        const uc   = guestUnseated.length;
        const total = guest.members.length;
        const pillCls  = uc === 0 ? 'bg-[#7a9e7e]/10 text-[#7a9e7e]' : uc === total ? 'bg-[#c4736a]/10 text-[#c4736a]' : 'bg-[#c9a96e]/15 text-[#8a6c30]';
        const pillText = uc === 0 ? '✓ Բոլ.' : uc === total ? `${uc} Չ.Ն.` : `${uc}/${total}`;

        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl border border-[#e8ddd0] mb-2 overflow-hidden hover:shadow-sm transition-shadow';

        const isOpen   = State.openedGroupIds.has(guest.id);
        const header   = document.createElement('div');
        header.className = 'flex items-center gap-2 px-3 py-2.5 cursor-pointer';
        header.innerHTML = `
            <span class="text-xs font-semibold text-[#1a1612] flex-1 truncate">${guest.display_name}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${pillCls}">${pillText}</span>
            <button onclick="event.stopPropagation();openSeatCountModal(${guest.id})" ${uc === 0 ? 'disabled' : ''}
                class="flex-shrink-0 text-[11px] font-semibold px-2 py-1 rounded-md transition-colors ${uc === 0 ? 'opacity-30 cursor-not-allowed bg-[#f7f3ee] text-[#8c7b66]' : 'bg-[#1a1612] text-[#e8d5b0] hover:bg-[#3d3228]'}">
                Նստ. ➔
            </button>`;

        const expandDiv = document.createElement('div');
        expandDiv.className = `border-t border-[#f7f3ee] ${isOpen ? '' : 'hidden'}`;

        guest.members.forEach(m => {
            const isSeated = !unseatedIds.has(m.id);
            const row = document.createElement('div');
            row.className = 'flex items-center gap-2 px-4 py-1.5 text-[11px] border-b border-[#f7f3ee] last:border-0 hover:bg-[#f7f3ee] transition-colors';

            if (!isSeated) {
                row.setAttribute('draggable', 'true');
                row.style.cursor = 'grab';
                row.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', m.id);
                    e.dataTransfer.effectAllowed = 'move';
                    setTimeout(() => { row.style.opacity = '0.5'; }, 0);
                });
                row.addEventListener('dragend', () => { row.style.opacity = '1'; });
            }

            row.innerHTML = `
                <span class="flex-1 ${isSeated ? 'text-[#7a9e7e]' : 'text-[#5c4f3d]'}">${m.first_name || 'Անանուն'}</span>
                ${isSeated
                    ? `<span class="text-[9px] bg-[#7a9e7e]/10 text-[#7a9e7e] px-1.5 py-0.5 rounded-full">Սեղ.${m.table_id}</span>
                       <button onclick="unseatMember(${m.id})" class="text-[#8c7b66] hover:text-[#c4736a] text-[10px] transition-colors">✕</button>`
                    : '<span class="text-[9px] text-[#c8bfb2]">⋮⋮ drag</span>'
                }`;
            expandDiv.appendChild(row);
        });

        header.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            const hidden = expandDiv.classList.toggle('hidden');
            if (!hidden) State.openedGroupIds.add(guest.id);
            else         State.openedGroupIds.delete(guest.id);
        });

        card.appendChild(header);
        card.appendChild(expandDiv);
        fragment.appendChild(card);
    });

    container.innerHTML = '';
    if (!hasVisible) container.innerHTML = '<p class="text-center text-[#8c7b66] text-xs italic py-6">Կողմից Չ.Ն. չկան 🍃</p>';
    else container.appendChild(fragment);
}

async function unseatMember(memberId) {
    await API.unseatMember(memberId);
    await Promise.all([reloadHall(), reloadUnseated()]);
}

function filterUnseatedMembers(side) {
    State.currentUnseatedFilter = side;
    ['all', 'bride', 'groom'].forEach(s => {
        const btn = document.getElementById(`btnUnseatedFilter-${s}`);
        if (!btn) return;
        btn.className = s === side
            ? 'flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all bg-[#1a1612] text-[#e8d5b0] shadow-sm'
            : 'flex-1 py-1.5 text-[11px] font-semibold rounded-lg text-[#5c4f3d] hover:bg-[#f7f3ee] transition-all';
    });
    renderUnseatedList();
}

// ── Seat Count Modal ──────────────────────────────────────────────────────────
function openSeatCountModal(guestId) {
    const guest = State.allGuests.find(g => g.id === guestId);
    if (!guest) return;
    const unseatedIds   = new Set(State.unseatedMembers.map(m => m.id));
    const guestUnseated = guest.members.filter(m => unseatedIds.has(m.id));
    if (!guestUnseated.length) { alert('Բոլ. արդ. նստ.'); return; }

    State.pendingSeatGuest = { guestId, display_name: guest.display_name, unseatedMembers: guestUnseated };
    State.pendingSeatCount = guestUnseated.length;

    document.getElementById('seatCountTitle').innerText   = guest.display_name;
    document.getElementById('seatCountDisplay').innerText = State.pendingSeatCount;
    document.getElementById('seatCountMax').innerText     = `${guestUnseated.length} հոգի սպ.`;
    document.getElementById('seatCountHint').innerText    = 'Ընտրեք՝ քանիսին նստ.';
    openModal('seatCountModal');
}

function changeSeatCount(delta) {
    if (!State.pendingSeatGuest) return;
    State.pendingSeatCount = Math.max(1, Math.min(State.pendingSeatGuest.unseatedMembers.length, State.pendingSeatCount + delta));
    document.getElementById('seatCountDisplay').innerText = State.pendingSeatCount;
}

async function confirmSeatCount() {
    if (!State.pendingSeatGuest) return;
    closeModal('seatCountModal');
    await openTablePickerModal(State.pendingSeatGuest, State.pendingSeatCount);
}

// ── Table Picker Modal ────────────────────────────────────────────────────────
async function openTablePickerModal(guestInfo, count) {
    const [tR, gR] = await Promise.all([API.getTables(), API.getGuests()]);
    if (!tR.ok) return;
    const tables = await tR.json();
    const allMembers = [];
    if (gR.ok) { const gs = await gR.json(); gs.forEach(g => g.members.forEach(m => allMembers.push(m))); }

    document.getElementById('tablePickerTitle').innerText = `${count} հոգ. համ.`;
    const list = document.getElementById('tablePickerList');
    list.innerHTML = '';

    if (!tables.length) {
        list.innerHTML = '<p class="text-center text-[#8c7b66] text-sm italic py-6">Սեղ. չկան</p>';
        openModal('tablePickerModal');
        return;
    }

    tables.forEach(table => {
        const seated   = allMembers.filter(m => m.table_id === table.id).length;
        const avail    = table.capacity - seated;
        const canFit   = avail >= count;
        const pct      = Math.round((seated / table.capacity) * 100);
        const sideBadge = { bride:'👰', groom:'🤵', mutual:'🤝' }[table.side || 'mutual'];

        const btn = document.createElement('button');
        btn.disabled  = !canFit;
        btn.className = `w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
            canFit ? 'border-[#e8ddd0] bg-white hover:border-[#c9a96e] hover:bg-[#c9a96e]/5 cursor-pointer'
                   : 'border-[#f0eae2] bg-[#faf8f5] opacity-40 cursor-not-allowed'}`;
        btn.innerHTML = `
            <div class="flex justify-between items-center mb-1.5">
                <span class="text-xs font-semibold text-[#1a1612]">Սեղ. ${table.table_number} ${sideBadge}</span>
                <span class="text-[10px] text-[#8c7b66]">${TABLE_DEFAULTS.label[table.category] || ''}</span>
            </div>
            <div class="flex items-center gap-2">
                <div class="flex-1 h-1 bg-[#f0eae2] rounded-full overflow-hidden">
                    <div class="h-full rounded-full ${canFit ? 'bg-[#7a9e7e]' : 'bg-[#c4736a]'}" style="width:${pct}%"></div>
                </div>
                <span class="text-[10px] font-medium ${canFit ? 'text-[#7a9e7e]' : 'text-[#c4736a]'}">${avail} ազ/${table.capacity}</span>
            </div>`;

        if (canFit) btn.onclick = async () => {
            closeModal('tablePickerModal');
            await seatGroupOnTable(guestInfo, count, table.id);
        };
        list.appendChild(btn);
    });
    openModal('tablePickerModal');
}

async function seatGroupOnTable(guestInfo, count, tableId) {
    for (const member of guestInfo.unseatedMembers.slice(0, count)) {
        const ok = await seatMemberOnTable(member.id, tableId);
        if (!ok) break;
    }
    await Promise.all([reloadHall(), reloadUnseated(), reloadGuests()]);
}

// ── Guest picker (from table sheet "free seat") ───────────────────────────────
function openGuestPicker(tableId) {
    State.pendingSeatTableId = tableId;
    const list = document.getElementById('guestPickerList');
    list.innerHTML = '';

    if (!State.unseatedMembers.length) {
        list.innerHTML = '<p class="text-center text-[#8c7b66] text-sm italic py-6">Չնստ. հյուրեր չկան 🎉</p>';
        openModal('guestPickerModal');
        return;
    }

    const unseatedIds = new Set(State.unseatedMembers.map(m => m.id.toString()));
    let hasGroups = false;
    State.allGuests.forEach(guest => {
        const um = guest.members.filter(m => unseatedIds.has(m.id.toString()));
        if (!um.length) return;
        hasGroups = true;
        const hdr = document.createElement('div');
        hdr.className = 'text-[11px] font-bold text-[#8c7b66] uppercase tracking-wider mt-3 mb-1 px-1';
        hdr.innerText = guest.display_name;
        list.appendChild(hdr);
        um.forEach(m => {
            const btn = document.createElement('button');
            btn.className = 'w-full text-left px-3 py-2 rounded-lg border border-[#e8ddd0] bg-white text-xs font-medium text-[#1a1612] flex justify-between items-center hover:border-[#c9a96e] hover:bg-[#c9a96e]/5 transition-all mb-1';
            btn.innerHTML = `<span>👤 ${m.first_name || 'Անանուն'}</span><span class="text-[#c9a96e] font-bold text-sm">+</span>`;
            btn.addEventListener('click', async () => {
                await seatMemberOnTable(m.id, tableId);
                closeModal('guestPickerModal');
                await Promise.all([reloadHall(), reloadUnseated(), reloadGuests()]);
            });
            list.appendChild(btn);
        });
    });
    if (!hasGroups) list.innerHTML = '<p class="text-center text-[#8c7b66] text-sm italic py-6">Չնստ. հյուրեր չկան 🎉</p>';
    openModal('guestPickerModal');
}