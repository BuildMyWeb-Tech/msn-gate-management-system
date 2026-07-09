// utils/generateCredentials.js
const crypto = require('crypto');

/**
 * Generate a username from company name
 * e.g. "Acme Packaging Pvt. Ltd." → "acme_packaging"
 */
const generateUsername = (companyName) => {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')   // remove special chars
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join('_')
    .substring(0, 20);
};

/**
 * Generate a random temporary password
 * Format: 2 uppercase + 6 alphanumeric + 2 digits + special
 * Example: AB_xk7mP9q!2
 */
const generateTempPassword = () => {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower   = 'abcdefghjkmnpqrstuvwxyz';
  const digits  = '23456789';
  const special = '@#$!';

  const rand = (str) => str[crypto.randomInt(0, str.length)];

  const password = [
    rand(upper),
    rand(upper),
    rand(lower),
    rand(lower),
    rand(lower),
    rand(digits),
    rand(digits),
    rand(digits),
    rand(special),
    rand(lower),
    rand(lower),
    rand(digits),
  ].sort(() => crypto.randomInt(0, 3) - 1).join('');

  return password;
};

module.exports = { generateUsername, generateTempPassword };