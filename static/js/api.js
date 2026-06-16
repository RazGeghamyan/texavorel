/**
 * api.js — Բոլոր API կանչերը մեկ տեղում։
 * Կախված է: weddingId, weddingToken (global, inject from template)
 */

async function apiFetch(url, options = {}) {
    options.headers = {
        ...(options.headers || {}),
        "X-Wedding-Token": weddingToken,
    };
    return fetch(url, options);
}

const API = {
    // ── Wedding ──────────────────────────────────────────────────────────
    getWedding: () =>
        apiFetch(`/api/v1/weddings/${weddingId}`),

    // ── Guests ───────────────────────────────────────────────────────────
    getGuests: () =>
        apiFetch(`/api/v1/guests/wedding/${weddingId}`),

    createGuest: (display_name, total_count, side) =>
        apiFetch(`/api/v1/guests/?wedding_id=${weddingId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wedding_id: weddingId, display_name, total_count, side, status: 'confirmed' }),
        }),

    deleteGuest: (guestId) =>
        apiFetch(`/api/v1/guests/${guestId}?wedding_id=${weddingId}`, { method: 'DELETE' }),

    mergeGuests: (guest_ids, new_display_name) =>
        apiFetch(`/api/v1/guests/wedding/${weddingId}/merge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guest_ids, new_display_name }),
        }),

    // ── Tables ───────────────────────────────────────────────────────────
    getTables: () =>
        apiFetch(`/api/v1/tables/wedding/${weddingId}`),

    createTable: (table_number, category, capacity, side) =>
        apiFetch(`/api/v1/tables/?wedding_id=${weddingId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wedding_id: weddingId, table_number, category, capacity, side }),
        }),

    deleteTable: (tableId) =>
        apiFetch(`/api/v1/tables/${tableId}?wedding_id=${weddingId}`, { method: 'DELETE' }),

    updateTableCapacity: (tableId, capacity) =>
        apiFetch(`/api/v1/tables/${tableId}/capacity?wedding_id=${weddingId}&capacity=${capacity}`, { method: 'PUT' }),

    updateTablePosition: (tableId, x_pos, y_pos) =>
        apiFetch(`/api/v1/tables/${tableId}/position?wedding_id=${weddingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x_pos, y_pos }),
        }),

    bulkUpdatePositions: (positions) =>
        apiFetch(`/api/v1/tables/bulk-position?wedding_id=${weddingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ positions }),
        }),

    // ── Guest Members ─────────────────────────────────────────────────────
    getAllMembers: () =>
        apiFetch(`/api/v1/guest-members/wedding/${weddingId}`),

    getUnseatedMembers: () =>
        apiFetch(`/api/v1/guest-members/wedding/${weddingId}/unseated`),

    seatMember: (memberId, tableId, seatIndex) => {
        let url = `/api/v1/guest-members/${memberId}/seat?wedding_id=${weddingId}`;
        if (tableId   != null) url += `&table_id=${tableId}`;
        if (seatIndex != null) url += `&seat_index=${seatIndex}`;
        return apiFetch(url, { method: 'PUT' });
    },

    unseatMember: (memberId) =>
        apiFetch(`/api/v1/guest-members/${memberId}/seat?wedding_id=${weddingId}`, { method: 'PUT' }),

    renameMember: (memberId, first_name) =>
        apiFetch(`/api/v1/guest-members/${memberId}/name?wedding_id=${weddingId}&first_name=${encodeURIComponent(first_name)}`, { method: 'PUT' }),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Ազատ հաջորդ seat_index-ը տվյալ սեղանի համար */
async function findNextFreeSeat(tableId) {
    const [tablesRes, membersRes] = await Promise.all([API.getTables(), API.getAllMembers()]);
    if (!tablesRes.ok || !membersRes.ok) return null;
    const tables  = await tablesRes.json();
    const members = await membersRes.json();
    const table   = tables.find(t => t.id === tableId);
    if (!table) return null;
    const occupied = new Set(
        members.filter(m => m.table_id === tableId && m.seat_index != null).map(m => m.seat_index)
    );
    for (let i = 0; i < table.capacity; i++) {
        if (!occupied.has(i)) return i;
    }
    return null;
}

/** Seat member + auto seat_index */
async function seatMemberOnTable(memberId, tableId) {
    const seatIndex = await findNextFreeSeat(tableId);
    if (seatIndex === null) { alert('Ազատ տեղ չկա։'); return false; }
    const res = await API.seatMember(memberId, tableId, seatIndex);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Սխալ');
        return false;
    }
    return true;
}