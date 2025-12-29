// Countries data with pincode formats
export const COUNTRIES = [
  { name: 'India', pincodeFormat: '6 digits (e.g., 110001)' },
  { name: 'United States', pincodeFormat: '5 digits (e.g., 12345)' },
  { name: 'United Kingdom', pincodeFormat: 'Alphanumeric (e.g., SW1A 1AA)' },
  { name: 'Canada', pincodeFormat: 'Alphanumeric (e.g., K1A 0B1)' },
  { name: 'Australia', pincodeFormat: '4 digits (e.g., 2000)' },
  { name: 'Germany', pincodeFormat: '5 digits (e.g., 10115)' },
  { name: 'France', pincodeFormat: '5 digits (e.g., 75001)' },
  { name: 'Japan', pincodeFormat: '7 digits (e.g., 100-0001)' },
  { name: 'China', pincodeFormat: '6 digits (e.g., 100000)' },
  { name: 'Brazil', pincodeFormat: '8 digits (e.g., 01310-100)' },
  { name: 'Mexico', pincodeFormat: '5 digits (e.g., 01000)' },
  { name: 'Singapore', pincodeFormat: '6 digits (e.g., 018956)' },
  { name: 'South Korea', pincodeFormat: '5 digits (e.g., 03187)' },
  { name: 'Italy', pincodeFormat: '5 digits (e.g., 00100)' },
  { name: 'Spain', pincodeFormat: '5 digits (e.g., 28001)' },
  { name: 'Netherlands', pincodeFormat: '4 digits + 2 letters (e.g., 1012 AB)' },
  { name: 'Switzerland', pincodeFormat: '4 digits (e.g., 8001)' },
  { name: 'Sweden', pincodeFormat: '5 digits (e.g., 100 05)' },
  { name: 'Norway', pincodeFormat: '4 digits (e.g., 0010)' },
  { name: 'Denmark', pincodeFormat: '4 digits (e.g., 1000)' },
];

/**
 * Get pincode format for a specific country
 * @param {string} countryName - The name of the country
 * @returns {string} The pincode format for the country
 */
export const getPincodeFormat = (countryName) => {
  const country = COUNTRIES.find(c => c.name === countryName);
  return country ? country.pincodeFormat : 'Enter pincode';
};
