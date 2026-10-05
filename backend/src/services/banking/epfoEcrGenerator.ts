import { Decimal } from '../payroll/decimal';

export interface ECRMemberInput {
  uan: string;
  memberName: string;
  grossWages: number | string;
  basicSalary: number | string;
  pfWageCeilingApplicable?: boolean;
  ncpDays?: number; // LOP / Non-Contributory Period days
}

export interface ECRExportResult {
  fileName: string;
  content: string;
  totalMembers: number;
  totalEEContribution: string;
  totalERContribution: string;
  totalEPSContribution: string;
}

/**
 * Standard EPFO Electronic Challan cum Return (ECR) format.
 *
 * Columns separated by '#~#':
 * 1. UAN
 * 2. Member Name
 * 3. Gross Wages
 * 4. EPF Wages (min(Basic, 15000) if ceiling)
 * 5. EPS Wages (min(Basic, 15000))
 * 6. EDLI Wages (min(Basic, 15000))
 * 7. EE Share (12% of EPF wages)
 * 8. EPS Share (8.33% capped at 1250)
 * 9. ER Share (12% - EPS Share, approx 3.67%)
 * 10. NCP Days (Loss of pay days)
 * 11. Refund of Advances (0)
 */
export function generateEPFOECRText(
  members: ECRMemberInput[],
  month: number,
  year: number
): ECRExportResult {
  const lines: string[] = [];

  let totalEEDec = new Decimal(0);
  let totalERDec = new Decimal(0);
  let totalEPSDec = new Decimal(0);

  const ceiling = new Decimal(15000);

  for (const m of members) {
    const grossDec = new Decimal(m.grossWages);
    const basicDec = new Decimal(m.basicSalary);

    // Eligible wages
    const useCeiling = m.pfWageCeilingApplicable !== false;
    const epfWages = useCeiling ? Decimal.min(basicDec, ceiling) : basicDec;
    const epsWages = useCeiling ? Decimal.min(basicDec, ceiling) : basicDec;
    const edliWages = useCeiling ? Decimal.min(basicDec, ceiling) : basicDec;

    // EE Share: 12% rounded half-up
    const eeShare = epfWages.mul('0.12');

    // EPS Share: 8.33% capped at 1250
    const rawEps = epsWages.mul('0.0833');
    const epsShare = useCeiling ? Decimal.min(rawEps, new Decimal(1250)) : rawEps;

    // ER Share: 12% total - EPS
    const totalEr = epfWages.mul('0.12');
    const erShare = totalEr.minus(epsShare);

    totalEEDec = totalEEDec.plus(eeShare);
    totalEPSDec = totalEPSDec.plus(epsShare);
    totalERDec = totalERDec.plus(erShare);

    // Clean member name (remove special chars)
    const cleanName = m.memberName.replace(/[^a-zA-Z\s]/g, '').trim().toUpperCase();
    const cleanUan = m.uan.replace(/[^0-9]/g, '') || '000000000000';
    const ncp = Math.max(0, Math.round(Number(m.ncpDays || 0)));

    const line = [
      cleanUan,
      cleanName,
      Math.round(Number(grossDec.toFixed(0))),
      Math.round(Number(epfWages.toFixed(0))),
      Math.round(Number(epsWages.toFixed(0))),
      Math.round(Number(edliWages.toFixed(0))),
      Math.round(Number(eeShare.toFixed(0))),
      Math.round(Number(epsShare.toFixed(0))),
      Math.round(Number(erShare.toFixed(0))),
      ncp,
      0, // Refund of advances
    ].join('#~#');

    lines.push(line);
  }

  const monthStr = String(month).padStart(2, '0');
  const fileName = `EPFO_ECR_${year}_${monthStr}.txt`;

  return {
    fileName,
    content: lines.join('\r\n'),
    totalMembers: members.length,
    totalEEContribution: totalEEDec.toFixed(2),
    totalERContribution: totalERDec.toFixed(2),
    totalEPSContribution: totalEPSDec.toFixed(2),
  };
}
