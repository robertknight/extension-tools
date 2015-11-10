var expect = require('chai').expect;

var extensionVersion = require('../src/extension-version');

describe('extension-version', function() {
	it('should compare versions', function() {
		expect(extensionVersion.lessThan('1.0', '2.0')).to.equal(true);
		expect(extensionVersion.lessThan('1.0', '1.0')).to.equal(false);
		expect(extensionVersion.lessThan('1.0', '0.1')).to.equal(false);


		expect(extensionVersion.lessThan('1.0', '1')).to.equal(false);
		expect(extensionVersion.lessThan('1.0', '1.0.1')).to.equal(true);

		expect(extensionVersion.lessThan('1.0.9', '1.0.10')).to.equal(true);
		expect(extensionVersion.lessThan('1.0.10', '1.0.99')).to.equal(true);
		expect(extensionVersion.lessThan('10', '9')).to.equal(false);
	});

	it('should increment versions', function() {
		expect(extensionVersion.increment('1.0.1', 0)).to.equal('2.0.1');
		expect(extensionVersion.increment('1.0.1', 2)).to.equal('1.0.2');
	});

	it('should validate versions', function() {
		expect(extensionVersion.isValid('1.0')).to.equal(true);
		expect(extensionVersion.isValid('1.0.0.1')).to.equal(true);
		expect(extensionVersion.isValid('1.0.0.1.2')).to.equal(false);
		expect(extensionVersion.isValid('1.0-v2')).to.equal(false);
	});
});
