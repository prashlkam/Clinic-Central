"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paiseToParts = paiseToParts;
exports.rupeesToPaise = rupeesToPaise;
exports.formatINR = formatINR;
function paiseToParts(paise) {
    return {
        rupees: Math.floor(paise / 100),
        paise: paise % 100,
    };
}
function rupeesToPaise(rupees) {
    return Math.round(rupees * 100);
}
function formatINR(paise) {
    const rupees = paise / 100;
    return '₹' + rupees.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}
//# sourceMappingURL=currency.js.map