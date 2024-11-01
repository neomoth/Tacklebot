module.exports = {
	log:(...arg)=>{console.log("[LOG]: ", ...arg)},
	info:(...arg)=>{console.info("[INFO]: ", ...arg)},
	warn:(...arg)=>{console.warn("[WARN]: ", ...arg)},
	error:(...arg)=>{console.error("[ERROR]: ", ...arg)},
	debug:(...arg)=>{console.debug("[DEBUG]: ", ...arg)}
}