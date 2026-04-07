/**
 * utils/helpers.js
 * Quote-number generation helpers.
 * Format:  BG{YY}-{DD}{MM}{NNN}
 * Example: BG25-0104001  (year 25, 01 April, sequence 001)
 */

const QUOTE_SEQ_KEY = 'tp_quote_seq_v1';

/**
 * Preview the *next* quote number without persisting the sequence.
 * Used on page load and after each save to show the upcoming number.
 * @returns {string}
 */
function generateQuoteNumber() {
    try {
        const now = new Date();
        const year2 = String(now.getFullYear()).slice(-2);
        const dd   = String(now.getDate()).padStart(2, '0');
        const mm   = String(now.getMonth() + 1).padStart(2, '0');
        const dayKey = `${now.getFullYear()}-${mm}-${dd}`;

        let seqObj = null;
        try { seqObj = JSON.parse(localStorage.getItem(QUOTE_SEQ_KEY) || 'null'); } catch (e) { }

        let nextSeq = 1;
        if (seqObj && seqObj.date === dayKey) {
            nextSeq = (parseInt(seqObj.seq, 10) || 0) + 1;
        }
        return `BG${year2}-${dd}${mm}${String(nextSeq).padStart(3, '0')}`;
    } catch (e) {
        return 'BG' + new Date().getFullYear() + String(Date.now()).slice(-6);
    }
}

/**
 * Increment and persist the daily sequence, then return the assigned quote number.
 * Call this only when the user confirms/finalises a quote.
 * @returns {string}
 */
function incrementQuoteSeqAndGet() {
    try {
        const now = new Date();
        const year2 = String(now.getFullYear()).slice(-2);
        const dd   = String(now.getDate()).padStart(2, '0');
        const mm   = String(now.getMonth() + 1).padStart(2, '0');
        const dayKey = `${now.getFullYear()}-${mm}-${dd}`;

        let seqObj = null;
        try { seqObj = JSON.parse(localStorage.getItem(QUOTE_SEQ_KEY) || 'null'); } catch (e) { }

        if (!seqObj || seqObj.date !== dayKey) {
            seqObj = { date: dayKey, seq: 1 };
        } else {
            seqObj.seq = (parseInt(seqObj.seq, 10) || 0) + 1;
        }
        try { localStorage.setItem(QUOTE_SEQ_KEY, JSON.stringify(seqObj)); } catch (e) { }

        return `BG${year2}-${dd}${mm}${String(seqObj.seq).padStart(3, '0')}`;
    } catch (e) {
        return 'BG' + new Date().getFullYear() + String(Date.now()).slice(-6);
    }
}
