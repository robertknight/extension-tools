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

	var partsLength = Math.max(aParts.length, bParts.length);

	for(var x = 0; x < partsLength; x++) {
		var aVal = isNaN(aParts[x]) ? 0 : +aParts[x];
		var bVal = isNaN(bParts[x]) ? 0 : +bParts[x];
		if (aVal !== bVal) {
			return aVal < bVal;
		}
	}
	// if we reached the end of the loop the 2 version are equals
	return false;
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

