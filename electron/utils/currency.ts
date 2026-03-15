export function paiseToParts(paise: number): { rupees: number; paise: number } {
  return {
    rupees: Math.floor(paise / 100),
    paise: paise % 100,
  };
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return '₹' + rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
