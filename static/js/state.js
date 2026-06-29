/**
 * state.js — Shared mutable state + Central Orchestrator
 *
 * ARCHITECTURE: Surgical Updates
 * ───────────────────────────────
 * User Action
 * │
 * ▼
 * Mutation (API write)  ← server response → patch State directly
 * │
 * ▼
 * patchState(changes)   ← only update what actually changed
 * │
 * ▼
 * render*() functions   ← only re-render affected panels
 *
 * updateAppState()  — full reload, used ONLY on initial page load.
 * patchState(changes) — surgical, used after every mutation.
 *
 * PATCH RULES (what changed → what to render):
 * guests changed  → renderGuestsPanel(), renderUnseatedPanel()
 * tables changed  → renderHall()
 * both changed    → all three
 */

// ── Shared mutable state ──────────────────────────────────────────────────────
const State = {
    // ── Data cache ────────────────────────────────────────────────────────
    allGuests:        [],
    allTables:        [],
    unseatedMembers:  [],   // derived — always recomputed from allGuests

    // ── Hall / canvas ─────────────────────────────────────────────────────
    zoomScale:         1.0,
    isPanning:         false,
    panStart:          { x: 0, y: 0 },
    panOffset:         { x: 0, y: 0 },
    activeMovingTable: null,
    dragOffset:        { x: 0, y: 0 },
    tablePositions:    {},
    tableRotations:    {},
    currentHallFilter: 'all',

    // ── Guest panel ───────────────────────────────────────────────────────
    selectedGuestIds:  [],
    currentMainFilter: 'all',

    // ── Unseated panel ────────────────────────────────────────────────────
    currentUnseatedFilter: 'all',
    openedGroupIds: new Set(),

    // ── Pending flows ─────────────────────────────────────────────────────
    pendingSeatGuest:   null,
    pendingSeatCount:   1,
    pendingSeatTableId: null,
    pendingSeatIndex:   null,

    // ── Add-table flow ────────────────────────────────────────────────────
    pendingNewCategory: null,
    pendingNewCapacity: 10,
    pendingNewSide:     'mutual',

    // ── Edit capacity flow ────────────────────────────────────────────────
    pendingEditTableId:     null,
    pendingEditCapacityVal: 10,
};

// ── Table geometry constants ──────────────────────────────────────────────────
const TABLE_DEFAULTS = {
    capacity: { round: 12, rectangle: 8, double_rectangle: 16, presidium: 6 },
    label:    { round: 'Կլոր', rectangle: 'Ուղղ.', double_rectangle: 'Կրկ. Ուղղ.', presidium: 'Պրեզիդիում' },
};

// ── Derived state helper ──────────────────────────────────────────────────────
/**
 * Recomputes State.unseatedMembers from State.allGuests.
 * Call this after any guest/member mutation — no extra GET needed.
 */
function _recomputeUnseated() {
    State.unseatedMembers = State.allGuests
        .flatMap(g => g.members)
        .filter(m => m.table_id === null);
}

// ── Surgical patch ────────────────────────────────────────────────────────────
/**
 * patchState(changes)
 *
 * Apply known changes to State and re-render only what's affected.
 * Never fetches anything — callers supply the data from server responses.
 *
 * @param {Object} changes
 * @param {Guest[]}  [changes.guests]      — replace State.allGuests
 * @param {Guest}    [changes.guestAdded]  — push one guest into State.allGuests
 * @param {number}   [changes.guestRemoved]— remove guest by id
 * @param {Table[]}  [changes.tables]      — replace State.allTables
 * @param {Table}    [changes.tableAdded]  — push one table into State.allTables
 * @param {number}   [changes.tableRemoved]— remove table by id
 * @param {Table}    [changes.tableUpdated]— replace one table in State.allTables
 * @param {Object}   [changes.memberSeated]— { memberId, tableId, seatIndex }
 * @param {Object}   [changes.memberUnseated] — { memberId }
 * @param {Object}   [changes.memberRenamed]  — { memberId, firstName }
 */
function patchState(changes) {
    let guestsChanged = false;
    let tablesChanged = false;

    // ── Guests ──
    if (changes.guests !== undefined) {
        State.allGuests = changes.guests;
        guestsChanged = true;
    }
    if (changes.guestAdded !== undefined) {
        State.allGuests = [...State.allGuests, changes.guestAdded];
        guestsChanged = true;
    }
    if (changes.guestRemoved !== undefined) {
        State.allGuests = State.allGuests.filter(g => g.id !== changes.guestRemoved);
        guestsChanged = true;
        tablesChanged = true;
    }

    // ── Tables ──
    if (changes.tables !== undefined) {
        State.allTables = changes.tables;
        tablesChanged = true;
    }
    if (changes.tableAdded !== undefined) {
        State.allTables = [...State.allTables, changes.tableAdded];
        tablesChanged = true;
    }
    if (changes.tableRemoved !== undefined) {
        const removedTableId = parseInt(changes.tableRemoved);
        State.allTables = State.allTables.filter(t => t.id !== removedTableId);
        if (State.tablePositions[removedTableId]) delete State.tablePositions[removedTableId];

        // ✅ Only rebuild the guest(s) that actually had a member at this table
        State.allGuests = State.allGuests.map(g => {
            const affected = g.members.some(m => m.table_id === removedTableId);
            if (!affected) return g; // ← same reference, no re-render needed
            return {
                ...g,
                members: g.members.map(m =>
                    m.table_id === removedTableId ? { ...m, table_id: null, seat_index: null } : m
                ),
            };
        });

        tablesChanged = true;
        guestsChanged = true;
    }
    if (changes.tableUpdated !== undefined) {
        State.allTables = State.allTables.map(t =>
            t.id === changes.tableUpdated.id ? changes.tableUpdated : t
        );
        tablesChanged = true;
    }

    // ── Member mutations — touch ONLY the guest that owns the member ──
    if (changes.memberSeated !== undefined) {
        const { memberId, tableId, seatIndex } = changes.memberSeated;
        State.allGuests = State.allGuests.map(g => {
            if (!g.members.some(m => m.id === memberId)) return g; // ✅ same ref
            return {
                ...g,
                members: g.members.map(m =>
                    m.id === memberId ? { ...m, table_id: tableId, seat_index: seatIndex } : m
                ),
            };
        });
        guestsChanged = true;
        tablesChanged = true;
    }
    if (changes.memberUnseated !== undefined) {
        const { memberId } = changes.memberUnseated;
        State.allGuests = State.allGuests.map(g => {
            if (!g.members.some(m => m.id === memberId)) return g; // ✅ same ref
            return {
                ...g,
                members: g.members.map(m =>
                    m.id === memberId ? { ...m, table_id: null, seat_index: null } : m
                ),
            };
        });
        guestsChanged = true;
        tablesChanged = true;
    }
    if (changes.memberRenamed !== undefined) {
        const { memberId, firstName } = changes.memberRenamed;
        State.allGuests = State.allGuests.map(g => {
            if (!g.members.some(m => m.id === memberId)) return g; // ✅ same ref
            return {
                ...g,
                members: g.members.map(m =>
                    m.id === memberId ? { ...m, first_name: firstName } : m
                ),
            };
        });
        guestsChanged = true;
        tablesChanged = true;
    }

    if (guestsChanged) _recomputeUnseated();
    if (guestsChanged) { renderGuestsPanel(); renderUnseatedPanel(); }
    if (tablesChanged) { renderHall(); }
}
// ── Full reload (initial load only) ──────────────────────────────────────────
/**
 * updateAppState()
 *
 * Full refetch — called ONCE on page load.
 * After that, all mutations use patchState() — zero GET requests.
 */
async function updateAppState({ skipHall = false } = {}) {
    const [guests, tables] = await Promise.all([
        API.getGuests(),
        API.getTables(),
    ]);

    State.allGuests = guests;
    State.allTables = tables;
    _recomputeUnseated();  // derived from allGuests, no separate endpoint needed

    renderGuestsPanel();
    renderUnseatedPanel();
    if (!skipHall) renderHall();
}