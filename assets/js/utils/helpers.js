/**
 * utils/helpers.js
 * Quote-number generation helpers.
 * Format:  {YY}.{NNNN}
 * Example: 26.0001  (year 26, sequence 0001 – resets each calendar year)
 */

const QUOTE_SEQ_KEY = 'tp_quote_seq_v1';

/**
 * Preview the *next* quote number without persisting the sequence.
 * Used on page load and after each save to show the upcoming number.
 * @returns {string}
 */
function generateQuoteNumber() {
    try {
        const now     = new Date();
        const year2   = String(now.getFullYear()).slice(-2);
        const yearFull = now.getFullYear();

        let seqObj = null;
        try { seqObj = JSON.parse(localStorage.getItem(QUOTE_SEQ_KEY) || 'null'); } catch (e) { }

        let nextSeq = 1;
        if (seqObj && seqObj.year === yearFull) {
            nextSeq = (parseInt(seqObj.seq, 10) || 0) + 1;
        }
        return `${year2}.${String(nextSeq).padStart(4, '0')}`;
    } catch (e) {
        return String(new Date().getFullYear()).slice(-2) + '.' + String(Date.now()).slice(-4);
    }
}

/**
 * Increment and persist the yearly sequence, then return the assigned quote number.
 * Call this only when the user confirms/finalises a quote.
 * @returns {string}
 */
function incrementQuoteSeqAndGet() {
    try {
        const now      = new Date();
        const year2    = String(now.getFullYear()).slice(-2);
        const yearFull = now.getFullYear();

        let seqObj = null;
        try { seqObj = JSON.parse(localStorage.getItem(QUOTE_SEQ_KEY) || 'null'); } catch (e) { }

        if (!seqObj || seqObj.year !== yearFull) {
            seqObj = { year: yearFull, seq: 1 };
        } else {
            seqObj.seq = (parseInt(seqObj.seq, 10) || 0) + 1;
        }
        try { localStorage.setItem(QUOTE_SEQ_KEY, JSON.stringify(seqObj)); } catch (e) { }

        return `${year2}.${String(seqObj.seq).padStart(4, '0')}`;
    } catch (e) {
        return String(new Date().getFullYear()).slice(-2) + '.' + String(Date.now()).slice(-4);
    }
}
