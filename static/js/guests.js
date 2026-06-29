/**
 * guests.js — Guest list panel: render + mutation handlers.
 *
 * RULE: Zero GET requests after mutations.
 *       Every write uses the server response to patchState() directly.
 *
 * PERF: renderGuestsPanel() does a keyed diff — only the guest card(s) whose
 * object reference actually changed get rebuilt. With 300+ guests this avoids
 * full innerHTML wipe + full DOM rebuild on every single mutation.
 *
 * Depends on: api.js, state.js (State + patchState), modals.js
 */

// ── Keyed DOM cache (guestId -> { el, lastGuestRef }) ─────────────────────────
const _guestCardCache = new Map();

function buildGuestHeader(guest) {
    const sideCls  = { bride: 'bg-[#c4736a]/10 text-[#c4736a]', groom: 'bg-[#7a9e7e]/10 text-[#7a9e7e]', mutual: 'bg-[#c9a96e]/15 text-[#8a6c30]' }[guest.side] || '';
    const sideIcon = { bride: '👰', groom: '🤵', mutual: '🤝' }[guest.side] || '';

    const header = document.createElement('div');
    header.className = 'flex items-center gap-1.5 px-2.5 py-2';
    header.innerHTML = `
        <input type="checkbox" value="${guest.id}" onchange="toggleGuestSelect(this)" class="flex-shrink-0 accent-[#c4736a]">
        <span class="text-xs font-semibold text-[#1a1612] flex-1 truncate">${guest.display_name}</span>
        <span class="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${sideCls}">${sideIcon}</span>
        <span class="text-[10px] bg-[#f7f3ee] border border-[#e8ddd0] text-[#5c4f3d] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">${guest.total_count}</span>
        <button onclick="deleteGuest(${guest.id})" class="text-[#8c7b66] hover:text-[#c4736a] text-xs px-1 transition-colors flex-shrink-0">🗑</button>`;
    return header;
}

function buildGuestMembers(guest) {
    if (!guest.members?.length) return null;
    const membersDiv = document.createElement('div');
    membersDiv.className = 'border-t border-[#f7f3ee]';

    guest.members.forEach(m => {
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between px-6 py-1 text-[11px] text-[#5c4f3d] border-b border-[#f7f3ee] last:border-0 hover:bg-[#f7f3ee] transition-colors';
        row.innerHTML = `
            <span class="flex-1">${m.first_name || '(Անանուն)'}</span>
            ${m.table_id ? '<span class="text-[9px] bg-[#7a9e7e]/10 text-[#7a9e7e] px-1.5 py-0.5 rounded-full">✓</span>' : ''}
            <button onclick="quickRenameMember(${m.id},'${(m.first_name || '').replace(/'/g, "\\'")}')"
                class="text-[#8c7b66] hover:text-[#1a1612] ml-1 transition-colors">✏</button>`;
        membersDiv.appendChild(row);
    });
    return membersDiv;
}

function buildGuestCard(guest) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl border border-[#e8ddd0] mb-2 overflow-hidden hover:shadow-sm transition-shadow';
    card.setAttribute('data-guest-id', guest.id);
    card.appendChild(buildGuestHeader(guest));
    const membersDiv = buildGuestMembers(guest);
    if (membersDiv) card.appendChild(membersDiv);
    return card;
}

// ── Pure UI renderer (keyed diff) ──────────────────────────────────────────────

function renderGuestsPanel() {
    const container = document.getElementById('guestsContainer');
    if (!container) return;

    if (!State.allGuests.length) {
        container.innerHTML = '<p class="text-center text-[#8c7b66] text-xs italic py-6">Ավ. հյուրեր ↑</p>';
        _guestCardCache.clear();
        return;
    }

    const visibleGuests = State.allGuests.filter(
        g => State.currentMainFilter === 'all' || g.side === State.currentMainFilter,
    );

    if (!visibleGuests.length) {
        container.innerHTML = '<p class="text-center text-[#8c7b66] text-xs italic py-6">Կողմից հյ. չկան 🍃</p>';
        _guestCardCache.clear();
        return;
    }

    // Clear placeholder paragraph if present
    if (container.children.length === 1 && container.firstElementChild.tagName === 'P') {
        container.innerHTML = '';
    }

    // 1. Drop cached cards for guests no longer visible/existing
    const visibleIds = new Set(visibleGuests.map(g => g.id));
    for (const [id, entry] of _guestCardCache) {
        if (!visibleIds.has(id)) {
            entry.el.remove();
            _guestCardCache.delete(id);
        }
    }

    // 2. Build/update only what changed, then fix ordering cheaply
    let prevEl = null;
    visibleGuests.forEach(guest => {
        let entry = _guestCardCache.get(guest.id);

        if (!entry) {
            const el = buildGuestCard(guest);
            entry = { el, lastGuestRef: guest };
            _guestCardCache.set(guest.id, entry);
        } else if (entry.lastGuestRef !== guest) {
            // Reference changed → this guest's data actually changed → rebuild only this card
            const newEl = buildGuestCard(guest);
            entry.el.replaceWith(newEl);
            entry.el = newEl;
            entry.lastGuestRef = guest;
        }
        // else: same reference → zero DOM work for this guest

        const expectedNext = prevEl ? prevEl.nextSibling : container.firstChild;
        if (expectedNext !== entry.el) {
            container.insertBefore(entry.el, expectedNext);
        }
        prevEl = entry.el;
    });
}

// ── Filter (local — no fetch) ─────────────────────────────────────────────────

function filterMainGuests(side) {
    State.currentMainFilter = side;
    ['all', 'bride', 'groom'].forEach(s => {
        const btn = document.getElementById(`btnMainFilter-${s}`);
        if (!btn) return;
        btn.className = s === side
            ? 'flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all bg-[#1a1612] text-[#e8d5b0] shadow-sm'
            : 'flex-1 py-1.5 text-[11px] font-semibold rounded-lg text-[#5c4f3d] hover:bg-[#f7f3ee] transition-all';
    });
    renderGuestsPanel();
}

// ── Mutations — surgical, zero GET ───────────────────────────────────────────

async function addGuest() {
    const name  = document.getElementById('guestName').value.trim();
    const count = parseInt(document.getElementById('guestCount').value) || 1;
    const side  = document.getElementById('guestSide').value;
    if (!name) { document.getElementById('guestName').focus(); return; }

    const res = await API.createGuest(name, count, side);
    if (res.ok) {
        const newGuest = await res.json();   // server returns full guest + members
        document.getElementById('guestName').value  = '';
        document.getElementById('guestCount').value = 1;
        // ✅ No GET — push server response directly into State
        patchState({ guestAdded: newGuest });
    }
}

function deleteGuest(id) {
    showConfirmDelete(
        'Ջնջե՞լ հրավերն ու բոլոր անդամներին։',
        async () => {
            const res = await API.deleteGuest(id);
            if (res.ok) {
                closeModal('confirmDeleteModal');
                // ✅ No GET — remove from State directly
                patchState({ guestRemoved: id });
            } else {
                alert('Չհաջողվեց ջնջել');
            }
        },
    );
}

function toggleGuestSelect(cb) {
    const id = parseInt(cb.value);
    if (cb.checked) State.selectedGuestIds.push(id);
    else            State.selectedGuestIds = State.selectedGuestIds.filter(x => x !== id);
    document.getElementById('mergeBar').classList.toggle('hidden', State.selectedGuestIds.length < 2);
}

async function mergeSelectedGuests() {
    const name = prompt('Նոր ընդ. անուն (օր.՝ Մարգ. ընտ.):');
    if (!name) return;

    const res = await API.mergeGuests(State.selectedGuestIds, name);
    if (res.ok) {
        const mergedGuest = await res.json();  // server returns new merged guest + all members
        const removedIds  = [...State.selectedGuestIds];

        State.selectedGuestIds = [];
        document.getElementById('mergeBar').classList.add('hidden');

        // ✅ No GET — remove old guests, add merged guest
        let updatedGuests = State.allGuests.filter(g => !removedIds.includes(g.id));
        updatedGuests = [...updatedGuests, mergedGuest];
        patchState({ guests: updatedGuests });
    }
}

// ── Rename shortcut ───────────────────────────────────────────────────────────

function quickRenameMember(id, oldName) {
    openRenameModal(id, oldName);
}