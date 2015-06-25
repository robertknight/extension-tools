var child_process = require('child_process');
var fs = require('fs');
var Q = require('q');

function exec() {
	var result = Q.defer();
	var proc = child_process.spawn(arguments[0], Array.prototype.slice.call(arguments,1));
	var stdout = '';
	var stderr = '';
	proc.stdout.on('data', function(data) {
		stdout += data.toString();
	});
	proc.stderr.on('data', function(data) {
		stderr += '';
	});
	proc.on('close', function(status) {
		if (status == 0) {
			result.resolve([stdout, stderr]);
		} else {
			result.reject([status, stdout, stderr]);
		}
	});
	return result.promise;
}

module.exports = exec;

