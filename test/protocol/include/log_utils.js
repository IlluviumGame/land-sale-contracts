// using logger instead of console to allow output control
const log = require("loglevel");
log.setLevel(process.env.LOG_LEVEL? process.env.LOG_LEVEL: "info");

// allows writing into stdout based on log level set without the new line in the end
function write_info(s) {
	if(log.getLevel() <= log.levels.INFO) {
		process.stdout.write(s);
	}
}

// export public utils API
module.exports = {
	write_info,
}
