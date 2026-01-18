# Faderfox PC12 Web Editor - Project Documentation

## Project Overview

Building a web-based editor for the Faderfox PC12 MIDI controller, similar to the existing Faderfox editor (https://github.com/privatepublic-de/faderfox-editor) but specifically for the PC12.

**Goal**: Create a web app to configure the PC12 with import/edit/export workflow:
1. Import current settings from device via SysEx
2. Make changes in a visual editor
3. Upload settings back to device

## Hardware Specifications

### Faderfox PC12 Details
- **72 pots** (12 tracks × 6 pots each)
- **1 encoder** with push button (30 detents, 14-bit high resolution mode)
- **12 buttons** with LEDs (green buttons)
- **30 internal setups** (memory slots for configurations)
- **4 MIDI ports** (2 in, 2 out) + USB
- **7-bit standard resolution** for pots (128 values)

### MIDI Capabilities
Each control (pots, encoder, buttons) can be programmed to send:
- Control Change (CC)
- Note On/Off
- Pitch Bend
- Aftertouch
- Program Change

### Configuration Features
- Different MIDI channels per control (1-16)
- Programmable min/max value ranges
- Button modes: momentary or toggle
- Pot modes: snap or jump
- MIDI learn functionality
- Copy/paste/duplicate operations
- Snapshot and preset functions

### SysEx Communication
- **Backup/restore** via SysEx dumps
- SysEx only works via **USB port** (not MIDI DIN)
- **Sending SysEx to device**: User manually triggers receive mode on PC12
- **Receiving SysEx from device**: Hold SHIFT + Blue key, then press Button 7

## Technical Architecture Plan

```
┌─────────────────────────────────────┐
│         Web App (React)             │
├─────────────────────────────────────┤
│                                     │
│  ┌────────────┐  ┌──────────────┐  │
│  │   MIDI     │  │  Config      │  │
│  │  Manager   │←→│  Parser      │  │
│  └────────────┘  └──────────────┘  │
│        ↕                ↕           │
│  ┌────────────┐  ┌──────────────┐  │
│  │    UI      │  │   State      │  │
│  │ Components │←→│  Management  │  │
│  └────────────┘  └──────────────┘  │
│                                     │
└─────────────────────────────────────┘
         ↕               ↕
    ┌─────────┐    ┌─────────┐
    │ PC12    │    │  .syx   │
    │ Device  │    │  Files  │
    └─────────┘    └─────────┘
```

## Development Phases

### Phase 1: Core Infrastructure ⬅️ CURRENT PHASE
- Set up React app with Web MIDI API integration
- MIDI device detection and connection
- Basic SysEx send/receive functionality
- File upload/download for .syx files
- **SysEx analyzer tool to reverse-engineer the format**

### Phase 2: SysEx Protocol Reverse Engineering
- Capture and analyze actual SysEx dumps from PC12
- Document the data structure (not publicly documented by Faderfox)
- Create parser/encoder for the format
- Validate with test data
- Compare multiple dumps to identify patterns

### Phase 3: UI Development
- 12-track visual layout (6 pots × 12 tracks)
- Control editor panels
- Setup selector (1-30)
- Import/Export buttons
- Status indicators
- Real-time connection status

### Phase 4: Advanced Features
- Copy/paste functionality
- Batch operations (apply to row/column)
- Preset library/templates
- Undo/redo
- Validation and error handling
- MIDI routing configuration

## Key Challenges

1. **SysEx Format Not Documented**: Need to reverse-engineer by capturing dumps and analyzing binary data
2. **Browser Compatibility**: Web MIDI API requires Chrome/Edge (or Firefox with flag)
3. **Permissions**: MIDI access requires user permission and proper security context
4. **Bidirectional Communication**: PC12 receives SysEx only via USB port

## Current Status: SysEx Analyzer Tool

### What We Built
Created an HTML-based SysEx analyzer to capture and examine dumps from the PC12. This tool will help us understand the binary format.

### Key Features
- Web MIDI API integration
- Auto-detect PC12 device
- Listen for incoming SysEx messages
- Display hex data and basic analysis
- Download captured dumps as .syx files
- Compare multiple dumps

### Analysis Strategy
1. Capture baseline dump from a known setup
2. Make a single change (e.g., change pot 1 CC number from 1 to 2)
3. Capture new dump
4. Compare the two dumps to identify where that parameter is stored
5. Repeat for different parameters to map the entire format

### What to Look For in Dumps
- **Header bytes**: Manufacturer ID, device ID, command type
- **Setup number**: Which of the 30 setups this dump represents
- **Control parameters**: For each of 72 pots, 1 encoder, 12 buttons:
  - MIDI channel (1-16)
  - CC number / Note number
  - Min/max values
  - Control type (CC, Note, PitchBend, etc.)
  - Button mode (momentary/toggle)
  - Pot mode (snap/jump)
- **Routing configuration**: MIDI port routing settings
- **Checksums**: Any validation bytes
- **Footer bytes**: End markers

## SysEx Analyzer Code

The analyzer is a standalone HTML file that needs to be:
1. Saved as `faderfox-analyzer.html`
2. Opened in Chrome/Edge browser
3. Connected to PC12 via USB

### Usage Instructions
1. Open the HTML file in browser
2. Grant MIDI permissions when prompted
3. Click "Connect to PC12"
4. On PC12 hardware:
   - Press SHIFT + Blue key
   - Press Button 7
   - Device sends current setup via SysEx
5. Dump appears in the analyzer
6. Download as .syx file
7. Make changes on PC12, capture again, compare

## Next Steps

1. **Capture initial dumps** using the analyzer
2. **Document patterns** in the SysEx data
3. **Build parser/encoder** based on discovered format
4. **Create main editor UI** with visual layout
5. **Implement bidirectional sync** with device
6. **Add advanced features** (copy/paste, templates, etc.)

## Hardware Connection Notes

- User has PC12 connected via USB ✅
- Ready to capture SysEx dumps
- Will need to run analyzer in local environment (Claude Code or local server) due to MIDI permissions

## Reference Links

- Faderfox PC12 Manual: http://www.faderfox.de/PDF/PC12%20Manual%20V02.pdf
- Faderfox PC12 Product Page: https://faderfox.de/pc12.html
- Existing Faderfox Editor (different models): https://github.com/privatepublic-de/faderfox-editor
- Web MIDI API Docs: https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API

## Tech Stack

- **React** for UI
- **Web MIDI API** for device communication
- **Tailwind CSS** for styling
- **Local development** (to handle MIDI permissions)

---

## File Structure (Proposed)

```
faderfox-pc12-editor/
├── README.md
├── package.json
├── public/
│   └── index.html
├── src/
│   ├── App.jsx
│   ├── components/
│   │   ├── MidiManager.jsx
│   │   ├── SysexAnalyzer.jsx      ← Start here
│   │   ├── ControlEditor.jsx      ← Phase 3
│   │   ├── SetupSelector.jsx      ← Phase 3
│   │   └── TrackLayout.jsx        ← Phase 3
│   ├── utils/
│   │   ├── midiUtils.js
│   │   ├── sysexParser.js         ← Phase 2
│   │   └── sysexEncoder.js        ← Phase 2
│   └── hooks/
│       └── useMidi.js
└── docs/
    ├── sysex-format.md            ← To be documented
    └── reverse-engineering.md     ← Capture analysis notes
```

---

## Immediate Action Items

1. Set up project in Claude Code
2. Run SysEx analyzer locally
3. Capture 3-5 different dumps with known changes
4. Begin reverse-engineering the SysEx format
5. Document findings in `docs/sysex-format.md`