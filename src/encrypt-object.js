const crypto = require('crypto');

// fast, but not strong.
const DEFAULT_ITERATIONS = 2000;

const CRYPTO_ALGORITHM = 'aes-128-cbc';
const IV_LENGTH = 16;
const KEY_LENGTH = 16;

// encrypt a string using CRYPTO_ALGORITHM with a given
// passphrase
function encryptString(input, passphrase, iterations) {
  const iv = crypto.pseudoRandomBytes(IV_LENGTH);
  const key = crypto.pbkdf2Sync(passphrase, iv, iterations, KEY_LENGTH);
  const cipher = crypto.createCipheriv(CRYPTO_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(input, 'binary'), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString('base64');
}

function decryptString(encryptedBase64, passphrase, iterations) {
  const encryptedBinary = Buffer(encryptedBase64, 'base64');
  const iv = encryptedBinary.slice(0, IV_LENGTH);
  const key = crypto.pbkdf2Sync(passphrase, iv, iterations, KEY_LENGTH);
  const data = encryptedBinary.slice(IV_LENGTH);
  const decipher = crypto.createDecipheriv(CRYPTO_ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('binary');
}

function isIgnoredKey(key) {
  return key.slice(0, 2) == '__';
}

function encryptObject(obj, passphrase, iterations) {
  encrypted = {};
  for (const key in obj) {
    if (isIgnoredKey(key)) {
      encrypted[key] = obj[key];
    } else {
      encrypted[key] = encryptString(obj[key], passphrase, iterations);
    }
  }
  return encrypted;
}

function decryptObject(obj, passphrase, iterations) {
  decrypted = {};
  for (const key in obj) {
    if (isIgnoredKey(key)) {
      decrypted[key] = obj[key];
    } else {
      decrypted[key] = decryptString(obj[key], passphrase, iterations);
    }
  }
  return decrypted;
}

module.exports = {
  DEFAULT_ITERATIONS,
  encryptString,
  decryptString,
  encryptObject,
  decryptObject
};

if (require.main === module) {
  let content = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', chunk => {
    content += chunk;
  });
  process.stdin.on('end', () => {
    const inputPassphrase = process.argv[2];
    const input = JSON.parse(content);
    const encrypted = encryptObject(input, inputPassphrase, DEFAULT_ITERATIONS);
    console.log(JSON.stringify(encrypted, null, 2));
  });
}
