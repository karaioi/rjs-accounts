/**
 * Indian Goods & Services Tax (GSTIN) verification and state resolution utilities.
 * Follows the official Goods and Services Tax Network (GSTN) Modulo-36 checksum standard.
 */

export const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
  "99": "Centre Jurisdiction",
};

const CODE_POINT_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export interface GstinValidationResult {
  isValid: boolean;
  stateCode?: string;
  stateName?: string;
  pan?: string;
  expectedChecksum?: string;
  error?: string;
}

/**
 * Validates a 15-character Indian GSTIN format and its official Mod-36 checksum.
 */
export function validateGstin(rawGstin: string): GstinValidationResult {
  const gstin = rawGstin.trim().toUpperCase();

  if (!gstin) {
    return { isValid: false, error: "GSTIN is required." };
  }

  if (gstin.length !== 15) {
    return {
      isValid: false,
      error: `GSTIN must be 15 characters (currently ${gstin.length}).`,
    };
  }

  const structureRegex =
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!structureRegex.test(gstin)) {
    return {
      isValid: false,
      error: "Invalid GSTIN format (expected e.g., 27AAPFU0939F1ZV).",
    };
  }

  const stateCode = gstin.slice(0, 2);
  const stateName = GST_STATE_CODES[stateCode];
  if (!stateName) {
    return {
      isValid: false,
      error: `Invalid Indian State code '${stateCode}'.`,
    };
  }

  const pan = gstin.slice(2, 12);

  // Compute official Mod-36 checksum
  let factor = 1;
  let total = 0;
  const mod = CODE_POINT_CHARS.length;

  for (let i = 0; i < 14; i++) {
    const char = gstin[i];
    if (!char) {
      return { isValid: false, error: "Invalid character in GSTIN." };
    }
    const digit = CODE_POINT_CHARS.indexOf(char);
    if (digit < 0) {
      return { isValid: false, error: "Invalid character in GSTIN." };
    }

    let product = factor * digit;
    product = Math.floor(product / mod) + (product % mod);
    total += product;
    factor = factor === 2 ? 1 : 2;
  }

  const checkCodeIndex = (mod - (total % mod)) % mod;
  const expectedChecksum = CODE_POINT_CHARS[checkCodeIndex];

  if (gstin[14] !== expectedChecksum) {
    return {
      isValid: false,
      stateCode,
      stateName,
      pan,
      expectedChecksum,
      error: `Checksum mismatch: expected '${expectedChecksum}', but found '${gstin[14]}'.`,
    };
  }

  return {
    isValid: true,
    stateCode,
    stateName,
    pan,
    expectedChecksum,
  };
}
