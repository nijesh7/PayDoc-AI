/**
 * ============================================================================
 * PAYDOC AI — High-Precision Decimal Arithmetic for Financial Math
 * ============================================================================
 * Implements deterministic numeric(12,2) arithmetic using integer paisa scaling
 * (BigInt with 4-decimal precision internally, rounded half-up to 2 decimals).
 * Eliminates all IEEE-754 floating-point inaccuracies.
 */

export class Decimal {
  private readonly value: bigint; // Scaled by 10^4 (e.g. 100.50 -> 1005000n)
  private static readonly SCALE = 10000n;
  private static readonly DISPLAY_SCALE = 100n;

  constructor(val: number | string | bigint | Decimal) {
    if (val instanceof Decimal) {
      this.value = val.value;
      return;
    }

    if (typeof val === 'bigint') {
      this.value = val * Decimal.SCALE;
      return;
    }

    const str = String(val).trim();
    if (!str || isNaN(Number(str))) {
      this.value = 0n;
      return;
    }

    const isNegative = str.startsWith('-');
    const cleanStr = isNegative ? str.slice(1) : str;
    const parts = cleanStr.split('.');
    const whole = BigInt(parts[0] || '0');
    let fracStr = (parts[1] || '').slice(0, 4).padEnd(4, '0');
    const frac = BigInt(fracStr);

    const scaled = whole * Decimal.SCALE + frac;
    this.value = isNegative ? -scaled : scaled;
  }

  private static fromScaledBigInt(scaled: bigint): Decimal {
    const d = new Decimal(0);
    (d as any).value = scaled;
    return d;
  }

  plus(other: Decimal | number | string): Decimal {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return Decimal.fromScaledBigInt(this.value + o.value);
  }

  minus(other: Decimal | number | string): Decimal {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return Decimal.fromScaledBigInt(this.value - o.value);
  }

  times(other: Decimal | number | string): Decimal {
    const o = other instanceof Decimal ? other : new Decimal(other);
    // Multiply scaled values then divide by SCALE with half-up rounding
    const product = this.value * o.value;
    const isNegative = product < 0n;
    const abs = isNegative ? -product : product;
    const rounded = (abs + Decimal.SCALE / 2n) / Decimal.SCALE;
    return Decimal.fromScaledBigInt(isNegative ? -rounded : rounded);
  }

  dividedBy(other: Decimal | number | string): Decimal {
    const o = other instanceof Decimal ? other : new Decimal(other);
    if (o.value === 0n) {
      throw new Error('Division by zero in Decimal calculation');
    }
    const scaledDividend = this.value * Decimal.SCALE;
    const isNegative = (this.value < 0n) !== (o.value < 0n);
    const absDividend = scaledDividend < 0n ? -scaledDividend : scaledDividend;
    const absDivisor = o.value < 0n ? -o.value : o.value;
    const quotient = (absDividend + absDivisor / 2n) / absDivisor;
    return Decimal.fromScaledBigInt(isNegative ? -quotient : quotient);
  }

  div(other: Decimal | number | string): Decimal {
    return this.dividedBy(other);
  }

  mul(other: Decimal | number | string): Decimal {
    return this.times(other);
  }

  abs(): Decimal {
    return this.value < 0n ? Decimal.fromScaledBigInt(-this.value) : this;
  }

  lessThan(other: Decimal | number | string): boolean {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return this.value < o.value;
  }

  lessThanOrEqualTo(other: Decimal | number | string): boolean {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return this.value <= o.value;
  }

  greaterThan(other: Decimal | number | string): boolean {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return this.value > o.value;
  }

  greaterThanOrEqualTo(other: Decimal | number | string): boolean {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return this.value >= o.value;
  }

  equals(other: Decimal | number | string): boolean {
    const o = other instanceof Decimal ? other : new Decimal(other);
    return this.value === o.value;
  }

  /**
   * Round to 2 decimal places with standard half-up rounding
   */
  round(): Decimal {
    const isNegative = this.value < 0n;
    const abs = isNegative ? -this.value : this.value;
    // Round from 4 decimals (SCALE) to 2 decimals (100)
    const factor = Decimal.SCALE / Decimal.DISPLAY_SCALE; // 100n
    const rounded = ((abs + factor / 2n) / factor) * factor;
    return Decimal.fromScaledBigInt(isNegative ? -rounded : rounded);
  }

  /**
   * Returns exact numeric(12,2) number
   */
  toNumber(): number {
    return Number(this.toFixed(2));
  }

  /**
   * Format to string with exact decimal places
   */
  toFixed(decimalPlaces: number = 2): string {
    const isNegative = this.value < 0n;
    const abs = isNegative ? -this.value : this.value;
    
    // Desired scale factor
    const targetScale = 10n ** BigInt(decimalPlaces);
    let roundedAbs: bigint;
    if (decimalPlaces <= 4) {
      const dropFactor = Decimal.SCALE / targetScale;
      roundedAbs = (abs + dropFactor / 2n) / dropFactor;
    } else {
      const multFactor = targetScale / Decimal.SCALE;
      roundedAbs = abs * multFactor;
    }

    const whole = roundedAbs / targetScale;
    const frac = roundedAbs % targetScale;
    const fracStr = frac.toString().padStart(decimalPlaces, '0');

    const result = `${whole}.${fracStr}`;
    return isNegative && (whole !== 0n || frac !== 0n) ? `-${result}` : result;
  }

  toString(): string {
    return this.toFixed(2);
  }

  static min(a: Decimal | number | string, b: Decimal | number | string): Decimal {
    const decA = a instanceof Decimal ? a : new Decimal(a);
    const decB = b instanceof Decimal ? b : new Decimal(b);
    return decA.lessThan(decB) ? decA : decB;
  }

  static max(a: Decimal | number | string, b: Decimal | number | string): Decimal {
    const decA = a instanceof Decimal ? a : new Decimal(a);
    const decB = b instanceof Decimal ? b : new Decimal(b);
    return decA.greaterThan(decB) ? decA : decB;
  }
}

export function D(val: number | string | bigint | Decimal): Decimal {
  return new Decimal(val);
}
