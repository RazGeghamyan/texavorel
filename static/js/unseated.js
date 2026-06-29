/**
 * unseated.js — Unseated members panel: render + mutation handlers.
 *
 * RULE: Zero GET requests after mutations.
 * Every write uses the server response to patchState() directly.
 *
 * Depends on: api.js, state.js (State + patchState), modals.js, hall.js (seatMemberOnTable)
 */

// ── Pure UI renderer ──────────────────────────────────────────────────────────

/**
 * renderUnseatedPanel()
 * Called by patchState() after State has been refreshed.
 * Reads State.allGuests + State.unseatedMembers — does not fetch anything.
 */
function renderUnseatedPanel() {
    const container = document.getElementById('unseatedContainer');
    if (!container) return;

    const totalMembers = State.allGuests.reduce((s, g) => s + g.total_count, 0);
    document.getElementById('unseatedSummary').innerText =
        `${totalMembers - State.unseatedMembers.length} / ${totalMembers} նստեցնել`;

    if (!State.allGuests.length) {
        container.innerHTML = '<p class="text-center text-[#8c7b66] text-xs italic py-6">Ավելացնել հյուրեր ←</p>';
        return;
    }

    const unseatedIds = new Set(State.unseatedMembers.map(m => m.id));
    const fragment    = document.createDocumentFragment();
    let hasVisible    = false;

    State.allGuests.forEach(guest => {
        if (State.currentUnseatedFilter !== 'all' && guest.side !== State.currentUnseatedFilter) return;
        hasVisible = true;

        const guestUnseated = guest.members.filter(m => unseatedIds.has(m.id));
        const uc    = guestUnseated.length;
        const total = guest.members.length;
        const pillCls  = uc === 0
            ? 'bg-[#7a9e7e]/10 text-[#7a9e7e]'
            : uc === total
                ? 'bg-[#c4736a]/10 text-[#c4736a]'
                : 'bg-[#c9a96e]/15 text-[#8a6c30]';
        const pillText = uc === 0 ? '✓ Բոլորը' : uc === total ? `${uc} չնստեցված` : `${uc}/${total}`;

        const card   = document.createElement('div');
        card.className = 'bg-white rounded-xl border border-[#e8ddd0] mb-2 overflow-hidden hover:shadow-sm transition-shadow';

        const isOpen = State.openedGroupIds.has(guest.id);
        const header = document.createElement('div');

        // 1. Փոխում ենք ընդհանուր դասերը՝ flex-col (տողատում), իսկ padding-ը մի փոքր օպտիմալացնում ենք
        header.className = 'flex flex-col gap-2 px-3 py-2.5 cursor-pointer';

        // 2. Կառուցվածքը բաժանում ենք 2 տողի. վերևում անունն է, ներքևում՝ կոճակներն ու status-ը
        header.innerHTML = `
            <!-- Վերևի տող. Միայն անունը (այլևս չի խցկվի) -->
            <span class="text-xs font-semibold text-[#1a1612] block break-words">${guest.display_name}</span>

            <!-- Ներքևի տող. Կարգավիճակի Pill և Նստեցնել կոճակ -->
            <div class="flex items-center justify-between gap-2 mt-0.5">
                <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${pillCls}">${pillText}</span>
                <button onclick="event.stopPropagation();openSeatCountModal(${guest.id})" ${uc === 0 ? 'disabled' : ''}
                    class="flex-shrink-0 text-[11px] font-semibold px-2 py-1 rounded-md transition-colors ${uc === 0 ? 'opacity-30 cursor-not-allowed bg-[#f7f3ee] text-[#8c7b66]' : 'bg-[#445E3F] text-white hover:bg-[#32472e]' /** Գույնը համապատասխանեցված է քո CSS-ին */}">
                    Նստեցնել ➔
                </button>
            </div>`;

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

            // ✅ ՈՒՂՂՈՒՄ. m.table_id-ն բազայի ներքին ID է, ոչ թե սեղանի տեսանելի համարը։
            // Գտնում ենք համապատասխան table-ը State.allTables-ից և ցույց ենք տալիս
            // նրա իրական table_number-ը (օր.՝ "1", "A", "VIP" և այլն)։
            const seatedTable   = isSeated ? State.allTables.find(t => t.id === m.table_id) : null;
            const seatedTableNo = seatedTable ? seatedTable.table_number : m.table_id;

            row.innerHTML = `
                <span class="flex-1 ${isSeated ? 'text-[#7a9e7e]' : 'text-[#5c4f3d]'}">${m.first_name || 'Անանուն'}</span>
                ${isSeated
                    ? `<span class="text-[9px] bg-[#7a9e7e]/10 text-[#7a9e7e] px-1.5 py-0.5 rounded-full">Սեղան${seatedTableNo}</span>
                       <button onclick="unseatMemberAction(${m.id})" class="text-[#8c7b66] hover:text-[#c4736a] text-[10px] transition-colors">✕</button>`
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
    if (!hasVisible) {
        container.innerHTML = '<p class="text-center text-[#8c7b66] text-xs italic py-6">չնստեցվածներ չկան</p>';
    } else {
        container.appendChild(fragment);
    }
}

// ── Filter (local — no fetch needed) ─────────────────────────────────────────

function filterUnseatedMembers(side) {
    State.currentUnseatedFilter = side;
    ['all', 'bride', 'groom'].forEach(s => {
        const btn = document.getElementById(`btnUnseatedFilter-${s}`);
        if (!btn) return;
        btn.className = s === side
            ? 'flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all bg-[#1a1612] text-[#e8d5b0] shadow-sm'
            : 'flex-1 py-1.5 text-[11px] font-semibold rounded-lg text-[#5c4f3d] hover:bg-[#f7f3ee] transition-all';
    });
    renderUnseatedPanel();
}

// ── Mutations (write → patchState) ───────────────────────────────────────────

async function unseatMemberAction(memberId) {
    const res = await API.unseatMember(memberId);
    if (res.ok) {
        patchState({ memberUnseated: { memberId } });
    }
}

// ── Seat Count Modal ──────────────────────────────────────────────────────────

function openSeatCountModal(guestId) {
    const guest = State.allGuests.find(g => g.id === guestId);
    if (!guest) return;

    const unseatedIds   = new Set(State.unseatedMembers.map(m => m.id));
    const guestUnseated = guest.members.filter(m => unseatedIds.has(m.id));
    if (!guestUnseated.length) { alert('Բոլորը արդեն նստեցված են'); return; }

    State.pendingSeatGuest = { guestId, display_name: guest.display_name, unseatedMembers: guestUnseated };
    State.pendingSeatCount = guestUnseated.length;

    document.getElementById('seatCountTitle').innerText   = guest.display_name;
    document.getElementById('seatCountDisplay').innerText = State.pendingSeatCount;
    document.getElementById('seatCountMax').innerText     = `${guestUnseated.length} հոգի`;
    document.getElementById('seatCountHint').innerText    = 'Ընտրեք՝ քանիսին նստեցնել';
    openModal('seatCountModal');
}

function changeSeatCount(delta) {
    if (!State.pendingSeatGuest) return;
    State.pendingSeatCount = Math.max(
        1,
        Math.min(State.pendingSeatGuest.unseatedMembers.length, State.pendingSeatCount + delta),
    );
    document.getElementById('seatCountDisplay').innerText = State.pendingSeatCount;
}

async function confirmSeatCount() {
    if (!State.pendingSeatGuest) return;
    closeModal('seatCountModal');
    openTablePickerModal(State.pendingSeatGuest, State.pendingSeatCount);
}

// ── Table Picker Modal ────────────────────────────────────────────────────────

function openTablePickerModal(guestInfo, count) {
    document.getElementById('tablePickerTitle').innerText = `${count} հոգ. համ.`;
    const list = document.getElementById('tablePickerList');
    list.innerHTML = '';

    if (!State.allTables.length) {
        list.innerHTML = '<p class="text-center text-[#8c7b66] text-sm italic py-6">Սեղաններ չկան</p>';
        openModal('tablePickerModal');
        return;
    }

    const allMembers = State.allGuests.flatMap(g => g.members);

    State.allTables.forEach(table => {
        const seated  = allMembers.filter(m => m.table_id === table.id).length;
        const avail   = table.capacity - seated;
        const canFit  = avail >= count;
        const pct     = Math.round((seated / table.capacity) * 100);
        const sideBadge = { bride: '👰', groom: '🤵', mutual: '🤝' }[table.side || 'mutual'];

        const btn = document.createElement('button');
        btn.disabled  = !canFit;
        btn.className = `w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
            canFit
                ? 'border-[#e8ddd0] bg-white hover:border-[#c9a96e] hover:bg-[#c9a96e]/5 cursor-pointer'
                : 'border-[#f0eae2] bg-[#faf8f5] opacity-40 cursor-not-allowed'}`;
        btn.innerHTML = `
            <div class="flex justify-between items-center mb-1.5">
                <span class="text-xs font-semibold text-[#1a1612]">Սեղան ${table.table_number} ${sideBadge}</span>
                <span class="text-[10px] text-[#8c7b66]">${TABLE_DEFAULTS.label[table.category] || ''}</span>
            </div>
            <div class="flex items-center gap-2">
                <div class="flex-1 h-1 bg-[#f0eae2] rounded-full overflow-hidden">
                    <div class="h-full rounded-full ${canFit ? 'bg-[#7a9e7e]' : 'bg-[#c4736a]'}" style="width:${pct}%"></div>
                </div>
                <span class="text-[10px] font-medium ${canFit ? 'text-[#7a9e7e]' : 'text-[#c4736a]'}">${avail} ազ/${table.capacity}</span>
            </div>`;

        if (canFit) {
            btn.onclick = async () => {
                closeModal('tablePickerModal');
                await seatGroupOnTable(guestInfo, count, table.id);
            };
        }
        list.appendChild(btn);
    });

    openModal('tablePickerModal');
}

/**
 * ✨ Սրբագրված ֆունկցիա.
 * Լուպի ներսում կատարում է սուրգիական patchState ամեն անդամի համար,
 * որպեսզի վիզուալ մասը ճիշտ թարմանա առանց GET հարցումների։
 */
async function seatGroupOnTable(guestInfo, count, tableId) {
    for (const member of guestInfo.unseatedMembers.slice(0, count)) {
        // Գտնում ենք հաջորդ ազատ աթոռի ինդեքսը սթեյթից
        const seatIndex = findNextFreeSeatFromState(tableId);
        if (seatIndex === null) {
            alert('Այս սեղանն արդեն զբաղված է։');
            break;
        }

        // Կանչում ենք API-ն
        const res = await API.seatMember(member.id, tableId, seatIndex);
        if (res.ok) {
            // ✅ Մաքուր Surgical update` առանց updateAppState-ի
            patchState({ memberSeated: { memberId: member.id, tableId, seatIndex } });
        } else {
            alert('Չհաջողվեց նստեցնել հյուրին։');
            break;
        }
    }
}

// ── Guest Picker (from Table Sheet "free seat") ───────────────────────────────

function openGuestPicker(tableId) {
    State.pendingSeatTableId = tableId;
    const list = document.getElementById('guestPickerList');
    list.innerHTML = '';

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
                const seatIndex = findNextFreeSeatFromState(tableId);
                if (seatIndex === null) {
                    alert('Այս սեղանն արդեն զբաղված է։');
                    return;
                }

                const res = await API.seatMember(m.id, tableId, seatIndex);
                if (res.ok) {
                    closeModal('guestPickerModal');
                    // ✅ Կիրառում ենք Surgical update
                    patchState({ memberSeated: { memberId: m.id, tableId, seatIndex } });
                } else {
                    alert('Չհաջողվեց նստեցնել հյուրին։');
                }
            });
            list.appendChild(btn);
        });
    });

    if (!hasGroups) {
        list.innerHTML = '<p class="text-center text-[#8c7b66] text-sm italic py-6">Չնստեցված հյուրեր չկան 🎉</p>';
    }
    openModal('guestPickerModal');
}