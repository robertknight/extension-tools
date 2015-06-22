var encryptObject = require('../src/encrypt-object');
var expect = require('chai').expect;

describe('encrypt-object', function() {
	it('should encrypt/decrypt object', function() {
		var input = {
			"__ignored" : "Should not be modified",
			key1: "key1",
			key2: "key2"
		};
		var passphrase = 'test-pass';
		var iter = 2000;

		var encrypted = encryptObject.encryptObject(input, passphrase, iter);
		expect(input['__ignored']).to.equal('Should not be modified');
		expect(encrypted.key1).to.not.equal('key1');
		expect(encrypted.key2).to.not.equal('key2');

		var decrypted = encryptObject.decryptObject(encrypted, passphrase, iter);
		expect(decrypted).to.deep.equal(input);
	});
});
