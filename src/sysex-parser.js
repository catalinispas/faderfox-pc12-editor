/**
 * Faderfox PC12 SysEx Parser
 *
 * Encoding discovered through reverse engineering:
 * - CC values: split across 2 bytes using low nibbles
 *   CC = ((byte1 & 0x0F) << 4) | (byte2 & 0x0F)
 * - MIDI Channel: (byte & 0x0F) + 1
 * - Data organized in 3-byte groups: 4D XX YY
 */

// SysEx constants
const SYSEX_START = 0xF0;
const SYSEX_END = 0xF7;
const HEADER_LENGTH = 4; // F0 00 00 00

/**
 * Decode a CC value from two bytes (split-nibble encoding)
 * @param {number} byte1 - First byte (contains high nibble of CC in its low nibble)
 * @param {number} byte2 - Second byte (contains low nibble of CC in its low nibble)
 * @returns {number} Decoded CC value (0-127)
 */
export function decodeCC(byte1, byte2) {
    return ((byte1 & 0x0F) << 4) | (byte2 & 0x0F);
}

/**
 * Encode a CC value into two bytes (split-nibble encoding)
 * Preserves the high nibbles of the original bytes
 * @param {number} cc - CC value (0-127)
 * @param {number} byte1Template - Original byte1 (to preserve high nibble)
 * @param {number} byte2Template - Original byte2 (to preserve high nibble)
 * @returns {[number, number]} Encoded bytes
 */
export function encodeCC(cc, byte1Template = 0x20, byte2Template = 0x10) {
    const highNibble = (cc >> 4) & 0x0F;
    const lowNibble = cc & 0x0F;
    return [
        (byte1Template & 0xF0) | highNibble,
        (byte2Template & 0xF0) | lowNibble
    ];
}

/**
 * Decode MIDI channel from a byte
 * @param {number} byte - Encoded byte
 * @returns {number} MIDI channel (1-16)
 */
export function decodeChannel(byte) {
    return (byte & 0x0F) + 1;
}

/**
 * Encode MIDI channel into a byte
 * Preserves the high nibble of the original byte
 * @param {number} channel - MIDI channel (1-16)
 * @param {number} byteTemplate - Original byte (to preserve high nibble)
 * @returns {number} Encoded byte
 */
export function encodeChannel(channel, byteTemplate = 0x10) {
    return (byteTemplate & 0xF0) | ((channel - 1) & 0x0F);
}

/**
 * Known byte offsets discovered through analysis
 * These are 0-indexed offsets from the start of the SysEx message
 */
export const KNOWN_OFFSETS = {
    // Col 1, Row A
    col1RowA: {
        channel: 24,
        cc: [27, 28]  // CC spread across these two bytes
    },
    // Col 2, Row A
    col2RowA: {
        cc: [41, 42]
    },
    // Col 1, Row B
    col1RowB: {
        cc: [260, 261]
    },
    // Button 1
    button1: {
        cc: [1430, 1431]
    }
};

/**
 * Parse a SysEx dump into a structured object
 * @param {Uint8Array|number[]} data - Raw SysEx data
 * @returns {object} Parsed configuration
 */
export function parseSysEx(data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

    // Validate SysEx structure
    if (bytes[0] !== SYSEX_START) {
        throw new Error('Invalid SysEx: missing start byte (F0)');
    }
    if (bytes[bytes.length - 1] !== SYSEX_END) {
        throw new Error('Invalid SysEx: missing end byte (F7)');
    }

    const result = {
        raw: bytes,
        length: bytes.length,
        header: {
            manufacturerId: [bytes[1], bytes[2], bytes[3]]
        },
        pots: [],
        buttons: [],
        // Store known values we can decode
        knownValues: {}
    };

    // Decode known offsets
    if (bytes.length > KNOWN_OFFSETS.col1RowA.channel) {
        result.knownValues.col1RowA = {
            channel: decodeChannel(bytes[KNOWN_OFFSETS.col1RowA.channel]),
            cc: decodeCC(bytes[KNOWN_OFFSETS.col1RowA.cc[0]], bytes[KNOWN_OFFSETS.col1RowA.cc[1]])
        };
    }

    if (bytes.length > KNOWN_OFFSETS.col2RowA.cc[1]) {
        result.knownValues.col2RowA = {
            cc: decodeCC(bytes[KNOWN_OFFSETS.col2RowA.cc[0]], bytes[KNOWN_OFFSETS.col2RowA.cc[1]])
        };
    }

    if (bytes.length > KNOWN_OFFSETS.col1RowB.cc[1]) {
        result.knownValues.col1RowB = {
            cc: decodeCC(bytes[KNOWN_OFFSETS.col1RowB.cc[0]], bytes[KNOWN_OFFSETS.col1RowB.cc[1]])
        };
    }

    if (bytes.length > KNOWN_OFFSETS.button1.cc[1]) {
        result.knownValues.button1 = {
            cc: decodeCC(bytes[KNOWN_OFFSETS.button1.cc[0]], bytes[KNOWN_OFFSETS.button1.cc[1]])
        };
    }

    return result;
}

/**
 * Analyze the structure of a SysEx dump
 * Useful for discovering patterns in the data
 * @param {Uint8Array|number[]} data - Raw SysEx data
 * @returns {object} Analysis results
 */
export function analyzeSysEx(data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

    const analysis = {
        length: bytes.length,
        markers: [],
        threeByteGroups: []
    };

    // Find all 'M' (0x4D) markers which seem to indicate parameter groups
    for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] === 0x4D) {
            analysis.markers.push({
                offset: i,
                next2Bytes: bytes.length > i + 2 ?
                    [bytes[i + 1], bytes[i + 2]] : null,
                decodedCC: bytes.length > i + 2 ?
                    decodeCC(bytes[i + 1], bytes[i + 2]) : null
            });
        }
    }

    return analysis;
}

/**
 * Compare two SysEx dumps and find differences
 * @param {Uint8Array|number[]} dump1 - First dump
 * @param {Uint8Array|number[]} dump2 - Second dump
 * @returns {object[]} Array of differences
 */
export function compareDumps(dump1, dump2) {
    const bytes1 = dump1 instanceof Uint8Array ? dump1 : new Uint8Array(dump1);
    const bytes2 = dump2 instanceof Uint8Array ? dump2 : new Uint8Array(dump2);

    const differences = [];
    const maxLength = Math.max(bytes1.length, bytes2.length);

    for (let i = 0; i < maxLength; i++) {
        const b1 = i < bytes1.length ? bytes1[i] : undefined;
        const b2 = i < bytes2.length ? bytes2[i] : undefined;

        if (b1 !== b2) {
            differences.push({
                offset: i,
                dump1: b1,
                dump2: b2,
                dump1Hex: b1 !== undefined ? b1.toString(16).padStart(2, '0') : 'N/A',
                dump2Hex: b2 !== undefined ? b2.toString(16).padStart(2, '0') : 'N/A'
            });
        }
    }

    return differences;
}

/**
 * Load a .syx file and return the data as Uint8Array
 * @param {File} file - File object from file input
 * @returns {Promise<Uint8Array>} Raw SysEx data
 */
export async function loadSyxFile(file) {
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
}

/**
 * Create a downloadable .syx file from data
 * @param {Uint8Array|number[]} data - SysEx data
 * @param {string} filename - Filename for download
 */
export function downloadSyxFile(data, filename = 'pc12_config.syx') {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Default export for convenience
export default {
    decodeCC,
    encodeCC,
    decodeChannel,
    encodeChannel,
    parseSysEx,
    analyzeSysEx,
    compareDumps,
    loadSyxFile,
    downloadSyxFile,
    KNOWN_OFFSETS
};
