// Functions for validating, comparing and manipulating
// Chrome extension version numbers.
//
// Valid Chrome extension numbers are also valid Firefox
// addon versions.
//
// See https://developer.chrome.com/extensions/manifest/version
// for details on validating and comparing Chrome extension
// version numbers

function isValid(version) {
	return version.match(/^([0-9]+\.){0,3}[0-9]+$/) !== null;
}

function lessThan(versionA, versionB) {
	if (versionA != '' && !isValid(versionA)) {
		throw new Error('Extension version ' + versionA + ' is not valid');
	}
	if (versionB != '' && !isValid(versionB)) {
		throw new Error('Extension version ' + versionB + ' is not valid');
	}

	var aParts = versionA.split('.');
	var bParts = versionB.split('.');

	var aHead = aParts[0] || 0;
	var bHead = bParts[0] || 0;

	if (aParts.length == 1 && bParts.length == 1) {
		return aHead < bHead;
	} else if (aHead != bHead) {
		return aHead < bHead;
	} else {
		var aTail = aParts.slice(1).join('.');
		var bTail = bParts.slice(1).join('.');
		return aHead < bHead || lessThan(aTail, bTail);
	}
}

function increment(version, componentIndex) {
	return version.split('.').map(function(component, index) {
		if (index === componentIndex) {
			return (parseInt(component) + 1).toString();
		} else {
			return component;
		}
	}).join('.');
}

module.exports = {
	isValid: isValid,
	lessThan: lessThan,
	increment: increment
};

