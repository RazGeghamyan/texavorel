/**
 * guests.js — Հյուրերի ցուցակ, ֆիլտր, ավելացնել, ջնջել, merge
 * Կախված է: api.js, state.js, modals.js
 */

async function reloadGuests() {
    const res = await API.getGuests();
    if (!res.ok) {
        document.getElementById('guestsContainer').innerHTML =
            '<p class="text-center text-[#8c7b66] text-xs italic py-6">Սխալ</p>';
        return;
    }
    State.allGuests = await res.json();
    renderGuestsList();
}

function renderGuestsList() {
    const container = document.getElementById('guestsContainer');
    if (!container) return;
    if (!State.allGuests.length) {
        container.innerHTML = '<p class="text-center text-[#8c7b66] text-xs italic py-6">Ավ. հյուրեր ↑</p>';
        return;
    }
    container.innerHTML = '';
    State.allGuests.forEach(guest => {
        if (State.currentMainFilter !== 'all' && guest.side !== State.currentMainFilter) return;

        const sideCls  = { bride:'bg-[#c4736a]/10 text-[#c4736a]', groom:'bg-[#7a9e7e]/10 text-[#7a9e7e]', mutual:'bg-[#c9a96e]/15 text-[#8a6c30]' }[guest.side] || '';
        const sideIcon = { bride:'👰', groom:'🤵', mutual:'🤝' }[guest.side] || '';

        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl border border-[#e8ddd0] mb-2 overflow-hidden hover:shadow-sm transition-shadow';

        const header = document.createElement('div');
        header.className = 'flex items-center gap-1.5 px-2.5 py-2';
        header.innerHTML = `
            <input type="checkbox" value="${guest.id}" onchange="toggleGuestSelect(this)" class="flex-shrink-0 accent-[#c4736a]">
            <span class="text-xs font-semibold text-[#1a1612] flex-1 truncate">${guest.display_name}</span>
            <span class="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${sideCls}">${sideIcon}</span>
            <span class="text-[10px] bg-[#f7f3ee] border border-[#e8ddd0] text-[#5c4f3d] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">${guest.total_count}</span>
            <button onclick="deleteGuest(${guest.id})" class="text-[#8c7b66] hover:text-[#c4736a] text-xs px-1 transition-colors flex-shrink-0">🗑</button>`;
        card.appendChild(header);

        if (guest.members?.length) {
            const membersDiv = document.createElement('div');
            membersDiv.className = 'border-t border-[#f7f3ee]';
            guest.members.forEach(m => {
                const row = document.createElement('div');
                row.className = 'flex items-center justify-between px-6 py-1 text-[11px] text-[#5c4f3d] border-b border-[#f7f3ee] last:border-0 hover:bg-[#f7f3ee] transition-colors';
                row.innerHTML = `
                    <span class="flex-1">${m.first_name || '(Անանուն)'}</span>
                    ${m.table_id ? '<span class="text-[9px] bg-[#7a9e7e]/10 text-[#7a9e7e] px-1.5 py-0.5 rounded-full">✓</span>' : ''}
                    <button onclick="quickRenameMember(${m.id},'${(m.first_name||'').replace(/'/g,"\\'")}','guests')"
                        class="text-[#8c7b66] hover:text-[#1a1612] ml-1 transition-colors">✏</button>`;
                membersDiv.appendChild(row);
            });
            card.appendChild(membersDiv);
        }
        container.appendChild(card);
    });

    if (!container.innerHTML) container.innerHTML = '<p class="text-center text-[#8c7b66] text-xs italic py-6">Կողմից հյ. չկան 🍃</p>';
}

async function addGuest() {
    const name  = document.getElementById('guestName').value.trim();
    const count = parseInt(document.getElementById('guestCount').value) || 1;
    const side  = document.getElementById('guestSide').value;
    if (!name) { document.getElementById('guestName').focus(); return; }
    const res = await API.createGuest(name, count, side);
    if (res.ok) {
        document.getElementById('guestName').value  = '';
        document.getElementById('guestCount').value = 1;
        await Promise.all([reloadGuests(), reloadUnseated()]);
    }
}

function deleteGuest(id) {
    showConfirmDelete(
        'Ջնջե՞լ հրավերն ու բոլոր անդամներին։',
        async () => {
            const res = await API.deleteGuest(id);
            if (res.ok) {
                closeModal('confirmDeleteModal');
                await Promise.all([reloadGuests(), reloadUnseated(), reloadHall()]);
            } else alert('Չհաջողվեց ջնջել');
        }
    );
}

function toggleGuestSelect(cb) {
    const id = parseInt(cb.value);
    if (cb.checked) State.selectedGuestIds.push(id);
    else State.selectedGuestIds = State.selectedGuestIds.filter(x => x !== id);
    document.getElementById('mergeBar').classList.toggle('hidden', State.selectedGuestIds.length < 2);
}

async function mergeSelectedGuests() {
    const name = prompt('Նոր ընդ. անուն (օր.՝ Մարգ. ընտ.):');
    if (!name) return;
    const res = await API.mergeGuests(State.selectedGuestIds, name);
    if (res.ok) {
        State.selectedGuestIds = [];
        document.getElementById('mergeBar').classList.add('hidden');
        await Promise.all([reloadGuests(), reloadUnseated(), reloadHall()]);
    }
}

function filterMainGuests(side) {
    State.currentMainFilter = side;
    ['all', 'bride', 'groom'].forEach(s => {
        const btn = document.getElementById(`btnMainFilter-${s}`);
        if (!btn) return;
        btn.className = s === side
            ? 'flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all bg-[#1a1612] text-[#e8d5b0] shadow-sm'
            : 'flex-1 py-1.5 text-[11px] font-semibold rounded-lg text-[#5c4f3d] hover:bg-[#f7f3ee] transition-all';
    });
    renderGuestsList();
}

function quickRenameMember(id, oldName, reloadTarget = 'all') {
    openRenameModal(id, oldName, reloadTarget);
}