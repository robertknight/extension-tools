var child_process = require('child_process');
var fs = require('fs');
var Q = require('q');
var util = require('util');

function CommandError(cmd, status, stdout, stderr) {
	Error.call(this);
	this.message = 'Command \'' + cmd + '\' failed with status ' + status + ': ' + stderr;
	this.status = status;
	this.stdout = stdout;
	this.stderr = stderr;
}
util.inherits(CommandError, Error);

function exec() {
	var result = Q.defer();
	var cmdArgs = Array.prototype.slice.call(arguments);
	var proc = child_process.spawn(cmdArgs[0], cmdArgs.slice(1));
	var stdout = '';
	var stderr = '';
	proc.stdout.on('data', function(data) {
		stdout += data.toString();
	});
	proc.stderr.on('data', function(data) {
		stderr += data.toString();
	});
	proc.on('close', function(status) {
		if (status == 0) {
			result.resolve([stdout, stderr]);
		} else {
			result.reject(new CommandError(cmdArgs.join(" "), status, stdout, stderr));
		}
	});
	return result.promise;
}

module.exports = exec;
module.exports.CommandError = CommandError;


