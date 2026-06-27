# 🕯️ BotC Helper: Full Tutorial and Feature Guide

BotC Helper is a local web app for running a Blood on the Clocktower game at the table.
It tracks seats, player states, nominations, votes, notes, references, and script-specific data.

This guide explains all major functionality in practical, storyteller-friendly terms.

## 🧭 Quick Reference (Live Game Cheat Sheet)

Use this when running a live game and you need a fast reminder.

1. ⚙️ Setup
- Open Settings (⚙️) -> set Players and Script
- Optional: enable Compact mode or Storyteller view

2. 👥 Assign players
- Tap seat -> set Name, Role claimed, True role (if needed)
- Use player pool for fast repeat setup

3. ☀️ During day
- Use ⚖️ Nominate
- Tap nominator, then nominee
- In vote mode, tap voters and press Done

4. 🌙 During night
- Use 📜 Notes for night log
- Use 📖 Reference -> Night tab for wake order checklist

5. 🧪 Status tracking
- Seat editor toggles: Dead, Ghost vote, Drunk, Poisoned
- Top bar pills: 🟢 alive count, 💀 dead count
- Click 🟢 alive count to hide/show dead seats on the board

6. ♻️ Reset options
- Clear table: keeps names + seat positions
- Reset everything: full wipe

7. ✨ Hidden shortcuts
- Click version text: open in-app guide
- Long-press player-pool icon in seat editor: open pool manager

### Visual Legend
- 🟢 Alive
- 💀 Dead
- ⚖️ Nominations
- 📜 Notes
- 📖 Reference
- ⚙️ Settings
- 👻 Ghost vote used
- 🧪 Poisoned
- ☠ Dead marker

## 1. 🚀 Quick Start

### Requirements
- Node.js installed
- A modern browser (Chrome, Edge, Safari, Firefox)

### Run locally
```bash
npm install
npm start
```

Default local URL:
- http://localhost:3000

Notes:
- There is no compile/build step required for normal use.
- The app uses browser localStorage to keep data between reloads.

## 2. 🗺️ High-Level Layout

The UI has three primary areas:

1. 🔝 Top bar
- Day/Night cycle control
- Alive/Dead status indicators
- Quick action icons (roles visibility, notes, nominations, reference, settings)

2. ⭕ Circle board
- Seat tokens around a central day/night indicator
- Tap seats to edit
- Optional move mode for custom seat placement

3. 🫧 Floating action buttons
- Nominate button (day only)
- Players list button

## 3. 🎛️ Top Bar Controls

### Day/Night cycle
- ◀ Left arrow: move one step backward in cycle timeline
- ▶ Right arrow: move one step forward
- Label shows current phase and round (for example Day 2, Night 2)

### Alive/Dead visual cue
- Green pill with count: alive players
- Red pill with count: dead players

### Roles visibility toggle
- 🚫 Stop icon (roles visible): hides role text/icons/tags in board and player list views
- 👁️ Eye icon (roles hidden): shows role text/icons/tags again

### Dead seats visibility toggle
- Click the 🟢 alive-count pill to toggle dead seat visibility on the board
- 💀 dead-count pill is display-only

### Notes
📜 Opens notes sheet for day/night round notes.

### Nominations
⚖️ Opens nominations history sheet and vote review controls.

### Reference
📖 Opens unified full-screen reference (Roles, Night Order, Character Count).

### Settings
⚙️ Opens settings and reset tools.

## 4. 🪑 Seat Editing (Tap a Seat)

Tap any seat to open seat editor.

Editable fields:
- Player name
- Claimed role (searchable role combobox)
- Alignment (Unknown, Good, Evil, Suspicious)
- True role (Storyteller field)
- Notes
- Status toggles:
  - Dead
  - Ghost vote used (visible only if Dead is enabled)
  - Drunk
  - Poisoned

Behavior details:
- Drunk and Poisoned are mutually exclusive in toggle logic.
- Dead state stores death timing (phase + round).
- Poisoned state stores poisoning timing (phase + round).
- Clear seat resets that seat to empty.

## 5. 👤 Player Pool (Name Reuse)

Player pool lets you keep reusable names.

Ways to access:
1. Settings -> Player pool -> Open
2. In seat editor, use the player-pool icon next to Player name

Pool actions:
- Add names
- Remove names
- Tap a name to assign to current seat

Useful details:
- Seat editor filters pool so already-used names are not duplicated in other seats.

## 6. ⚖️ Nominations and Voting Flow

### Start nomination mode
- Press Nominate button (day only)
- Step 1: tap nominator seat
- Step 2: tap nominee seat

Nomination constraints:
- Dead players cannot nominate
- Dead players cannot be nominated
- A player may nominate only once per day
- A player may be nominated only once per day

### Voting mode
After creating nomination, app enters vote mode:
- Tap seats to add/remove votes
- Dead players with used ghost vote cannot vote again

### Finish vote mode
- Press Done on nominate button
- App stamps ghost voters for that nomination entry

### Nomination history sheet
From top bar nominations icon:
- Review nominations by day (newest first)
- See vote counts and voter chips
- Resume voting on existing nomination
- Delete nomination entries
- Start a new nomination (day only)

Threshold indicator behavior:
- Required votes = ceil(aliveCount / 2) captured at nomination time
- Vote outcome badge reflects pass/fail styling in history

Execution marker behavior:
- 💀 is shown only for a unique highest nomination that reached threshold
- If top reached nominations are tied, nobody gets 💀 (all tied nominees only show ⚖️)
- If a later nomination exceeds that tie and is uniquely highest, it gets 💀

## 7. 📜 Notes System

Notes are stored per phase/round key:
- day-1, night-1, day-2, etc.

In Notes sheet:
- Navigate previous/next with phase-round controls
- Edit current note text
- See read-only list of previous non-empty notes below

## 8. 📋 Player List Sheet

Players list modal contains collapsible sections:

1. All seats
- Full roster view with alignment/status indicators
- Tap any row to open that seat editor

2. Deaths
- Grouped by cycle label (Day N / Night N)
- Shows player and role snapshot

3. Poisoned
- Grouped by cycle label
- Shows player and role snapshot

Collapse states are remembered between sessions.

## 9. 📚 Reference (Full-Screen)

Top bar Reference opens a 3-tab reference module:

1. Roles
- Script role cards with ability text
- In-play roles highlighted based on seat data

2. Night Order
- First Night and Other Nights tabs
- Checklist-style progress (tap rows to mark done)
- Shows in-play player names per role where possible

3. Character Count
- Character distribution table by player count
- Active column highlighted for current seat count

## 10. ⚙️ Settings Explained

### Players
- Change seat count (bounded min/max)

### Script
- Switch between:
  - Trouble Brewing (tb)
  - Bad Moon Rising (bmr)
  - Sects and Violets (snv)
- Open custom script menu (⋯) to:
  - Add custom script
  - Copy currently selected script into a custom draft
  - Edit selected custom script
  - Delete selected custom script (with confirmation)

Custom script builder:
- Name field first
- List/Slots tabs directly under Name
- Role search + experimental toggle shown in List mode
- In Slots mode, filtering is in the slot popup (`Choose a role for ...`)

### Appearance
- Theme toggle (dark/day)

### Extended hints
- Adds alignment ring cues on seats

### Compact mode
- Shrinks seat visuals and reduces clutter

### Storyteller view
- Rotates board perspective by 180 degrees

### Move seats
- Enables drag-and-drop seat positioning
- Press Done Moving in top bar to exit

### Data management
- Clear table: reset game state but keep names and seat positions
- Player pool clear: use ↺ button in the Player pool row (with confirmation)
- Reset everything: full reset including seat positions

## 11. 🧲 Move Mode and Custom Layout

In move mode:
- Drag seats to custom coordinates
- Positions persist in storage
- Useful for matching irregular table layouts

## 12. 💾 Persistence and Offline

### Auto-persisted data
The app stores:
- Seats and custom positions
- Current phase/round
- Nominations and vote history
- Notes
- Poison snapshots
- Collapse preferences
- Theme and visual options
- Script selection
- Player pool

### Service Worker / PWA behavior
- Service worker is registered on load
- Local assets are cached for offline fallback
- CDN module dependency is cached after first fetch
- Manifest supports standalone app installation on mobile/desktop

## 13. 📱 Mobile and Gesture Behavior

Most bottom sheets support:
- Drag bar tap to close
- Swipe down from top area to close
- Backdrop tap to close

The layout also respects safe-area insets for notch devices.

## 14. ✨ Hidden Productivity Features

1. 🧭 Version easter egg
- In Settings, click version text to open the in-app guide.

2. 👥 Edit modal long press
- Long-press the player-pool icon in seat editor to open pool management directly.

## 15. ✅ Suggested First-Game Workflow

1. Open Settings and set seat count + script.
2. Fill names quickly using player pool and seat editor.
3. During game, use seat status toggles and alignment hints.
4. Record each nomination and votes with Nominate flow.
5. Keep day/night notes every cycle.
6. Use Reference tabs for role text, night order, and counts.
7. At game end:
- Use Clear table for next game with same players/table layout, or
- Use Reset everything for a fully fresh board.

## 16. 🛠️ Troubleshooting

If something looks stale or mismatched:
1. Hard refresh browser tab.
2. Verify script selection in Settings.
3. Check if compact mode / storyteller view / hide roles is active.
4. If needed, use Clear table or Reset everything depending on desired scope.

If running locally fails:
1. Ensure Node.js is installed.
2. Run npm install, then npm start.
3. Make sure port 3000 is available.

### Status Symbols Used In App
- ✅ Success or completed action
- ✕ Cancel or remove
- ↻ Reset/reload action
- ➕ Add/create action

---

Version in app source at time of writing: v6.2.3
