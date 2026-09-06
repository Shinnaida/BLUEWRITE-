const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');

const BCRYPT_COST = 12;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
const COMMON_PASSWORDS = new Set([
  '123456', 'password', 'password123', 'admin123', 'officer123',
  'qwerty123', 'letmein', 'welcome123', 'bluewrite',
]);

function validatePassword(password, { username = '', badgeNumber = '', minimumLength = MIN_PASSWORD_LENGTH } = {}) {
  const value = String(password || '');
  const lower = value.toLowerCase();
  const errors = [];

  if (value.length < minimumLength) errors.push(`Password must be at least ${minimumLength} characters.`);
  if (value.length > MAX_PASSWORD_LENGTH) errors.push(`Password must not exceed ${MAX_PASSWORD_LENGTH} characters.`);
  if (!/[A-Za-z]/.test(value)) errors.push('Password must include at least one letter.');
  if (!/\d/.test(value)) errors.push('Password must include at least one number.');
  if (!/[^A-Za-z0-9]/.test(value)) errors.push('Password must include at least one special character.');
  if (COMMON_PASSWORDS.has(lower)) errors.push('Choose a less common password.');
  if (username && lower === String(username).trim().toLowerCase()) errors.push('Password must not be the same as the username.');
  if (badgeNumber && lower === String(badgeNumber).trim().toLowerCase()) errors.push('Password must not be the same as the badge number.');

  return { valid: errors.length === 0, errors };
}

function secureShuffle(characters) {
  const output = [...characters];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const selected = crypto.randomInt(index + 1);
    [output[index], output[selected]] = [output[selected], output[index]];
  }
  return output.join('');
}

function generateTemporaryPassword(length = 16) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%&*+-=?';
  const all = upper + lower + numbers + special;
  const characters = [
    upper[crypto.randomInt(upper.length)],
    lower[crypto.randomInt(lower.length)],
    numbers[crypto.randomInt(numbers.length)],
    special[crypto.randomInt(special.length)],
  ];
  while (characters.length < Math.max(12, length)) characters.push(all[crypto.randomInt(all.length)]);
  return secureShuffle(characters);
}

const hashPassword = (password) => bcrypt.hash(password, BCRYPT_COST);
const comparePassword = (password, hash) => bcrypt.compare(password, hash);

module.exports = {
  BCRYPT_COST,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  validatePassword,
  generateTemporaryPassword,
  hashPassword,
  comparePassword,
};
