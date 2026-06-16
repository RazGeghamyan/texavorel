/**
 * state.js — Ընդհանուր վիճակ (shared mutable state)
 * Բոլոր մոդուլները կարդում/գրում են այստեղ։
 */

const State = {
    // ── Data cache ────────────────────────────────────────────────────────
    allGuests:        [],   // Guest[]
    unseatedMembers:  [],   // GuestMember[]

    // ── Hall / canvas ─────────────────────────────────────────────────────
    zoomScale:        1.0,
    isPanning:        false,
    panStart:         { x: 0, y: 0 },
    panOffset:        { x: 0, y: 0 },
    activeMovingTable: null,
    dragOffset:       { x: 0, y: 0 },
    tablePositions:   {},   // { [tableId]: { x, y } }
    tableRotations:   {},   // { [tableId]: degrees }
    currentHallFilter: 'all',

    // ── Guest panel ───────────────────────────────────────────────────────
    selectedGuestIds:  [],
    currentMainFilter: 'all',

    // ── Unseated panel ────────────────────────────────────────────────────
    currentUnseatedFilter: 'all',
    openedGroupIds: new Set(),

    // ── Pending flows ─────────────────────────────────────────────────────
    pendingSeatGuest:   null,   // { guestId, display_name, unseatedMembers[] }
    pendingSeatCount:   1,
    pendingSeatTableId: null,
    pendingSeatIndex:   null,

    // ── Add-table flow ────────────────────────────────────────────────────
    pendingNewCategory: null,
    pendingNewCapacity: 10,
    pendingNewSide:     'mutual',

    // ── Edit capacity flow ────────────────────────────────────────────────
    pendingEditTableId:    null,
    pendingEditCapacityVal: 10,
};

// Table geometry constants
const TABLE_DEFAULTS = {
    capacity: { round: 12, rectangle: 8, double_rectangle: 16, presidium: 6 },
    label:    { round: 'Կլոր', rectangle: 'Ուղղ.', double_rectangle: 'Կրկ. Ուղղ.', presidium: 'Պրեզիդիում' },
};