var crypto = require('crypto');

// fast, but not strong.
var DEFAULT_ITERATIONS = 2000;

var CRYPTO_ALGORITHM = 'aes-128-cbc';
var IV_LENGTH = 16;
var KEY_LENGTH = 16;

// encrypt a string using CRYPTO_ALGORITHM with a given
// passphrase
function encryptString(input, passphrase, iterations) {
	var iv = crypto.pseudoRandomBytes(IV_LENGTH);
	var key = crypto.pbkdf2Sync(passphrase, iv, iterations, KEY_LENGTH);
	var cipher = crypto.createCipheriv(CRYPTO_ALGORITHM, key, iv);
	var encrypted = Buffer.concat([cipher.update(input, 'binary'), cipher.final()]);
	return Buffer.concat([iv, encrypted]).toString('base64');
}

function decryptString(encryptedBase64, passphrase, iterations) {
	var encryptedBinary = Buffer(encryptedBase64, 'base64');
	var iv = encryptedBinary.slice(0, IV_LENGTH);
	var key = crypto.pbkdf2Sync(passphrase, iv, iterations, KEY_LENGTH);
	var data = encryptedBinary.slice(IV_LENGTH);
	var decipher = crypto.createDecipheriv(CRYPTO_ALGORITHM, key, iv);
	var decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
	return decrypted.toString('binary');
}

function isIgnoredKey(key) {
	return key.slice(0, 2) == '__';
}

function encryptObject(obj, passphrase, iterations) {
	encrypted = {};
	for (var key in obj) {
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
	for (var key in obj) {
		if (isIgnoredKey(key)) {
			decrypted[key] = obj[key];
		} else {
			decrypted[key] = decryptString(obj[key], passphrase, iterations);
		}
	}
	return decrypted;
}

module.exports = {
	DEFAULT_ITERATIONS: DEFAULT_ITERATIONS,
	encryptString: encryptString,
	decryptString: decryptString,
	encryptObject: encryptObject,
	decryptObject: decryptObject
};

if (require.main === module) {
	var content = '';
	process.stdin.setEncoding('utf-8');
	process.stdin.on('data', function(chunk) {
		content += chunk;
	});
	process.stdin.on('end', function() {
		var inputPassphrase = process.argv[2];
		var input = JSON.parse(content);
		var encrypted = encryptObject(input, inputPassphrase, DEFAULT_ITERATIONS);
		console.log(JSON.stringify(encrypted, null, 2));
	});
}

