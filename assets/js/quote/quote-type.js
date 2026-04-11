/**
 * quote/quote-type.js
 * --------------------------------------------------
 * Handles switching between "In Ly" and "In Khác" quote types.
 *
 * Depends on:
 *   state.js               (currentQuoteType, quoteNumber)
 *   utils/helpers.js       (generateQuoteNumber)
 *   quote/quote-table.js   (resetFormForQuoteType, convertRowsForQuoteType)
 *   ui/notification.js     (showNotification)
 * --------------------------------------------------
 */

/**
 * Switch the active quote type and update the UI accordingly.
 * @param {'cup'|'other'} type
 */
function selectQuoteType(type) {
    currentQuoteType = type;

    const cupBtn   = document.getElementById('quoteTypeCup');
    const otherBtn = document.getElementById('quoteTypeOther');
    const addImageBtn            = document.getElementById('addImageBtn');
    const finalizeDropdownBtn    = document.getElementById('finalizeDropdownBtn');
    const finalizeDropdownDivider = document.getElementById('finalizeDropdownDivider');

    if (type === 'cup') {
        cupBtn.classList.add('active');
        otherBtn.classList.remove('active');

        quoteNumber = generateQuoteNumber();

        if (addImageBtn)            addImageBtn.style.display            = 'inline-block';
        if (finalizeDropdownBtn)    finalizeDropdownBtn.style.display    = 'block';
        if (finalizeDropdownDivider) finalizeDropdownDivider.style.display = 'block';

    } else {
        otherBtn.classList.add('active');
        cupBtn.classList.remove('active');

        quoteNumber = generateQuoteNumber();

        if (addImageBtn)            addImageBtn.style.display            = 'none';
        if (finalizeDropdownBtn)    finalizeDropdownBtn.style.display    = 'none';
        if (finalizeDropdownDivider) finalizeDropdownDivider.style.display = 'none';
    }

    resetFormForQuoteType();
    convertRowsForQuoteType();
}
