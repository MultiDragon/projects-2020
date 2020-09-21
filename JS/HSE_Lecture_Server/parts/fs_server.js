const cp = require("child_process")
const fs = require("fs")
const yamllib = require("js-yaml")

module.exports = {}
module.exports.getObject = function(id, home) {
	const yaml = cp.execFileSync(home + "/.custom/bin/projecteer", [home + "/Projects", "generate-config", id])
	try {
		const data = yamllib.safeLoad(yaml)
		if (!data.file)
			return false
		return data
	} catch (e) {
		return false
	}
}

function proc(x) {
	if (x > 9)
		return x
	return "0" + x
}

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
module.exports.getSchedule = function(time, home) {
	try {
		const date = new Date(new Date(time).toDateString())
		const week = ((date.getTime() / (1000 * 60 * 60 * 24)) + 25 / 8) % 14 < 7 ? 1 : 2
		const yaml = fs.readFileSync(home + "/Projects/.metadata/schedule.yaml")
		const fullDoc = yamllib.safeLoad(yaml)
		const currentDate = `${proc(date.getDate())}.${proc(date.getMonth() + 1)}.${date.getFullYear()}`
		const data = (fullDoc[days[new Date().getDay()]] || []).concat(fullDoc[currentDate] || [])
		data.sort((a, b) => a.startTime - b.startTime)
		for (let j = 0; j < data.length; j++) {
			const i = data[j]
			if (i.week && i.week !== week) {
				data.splice(j, 1)
				j--
			}
			i.startTime = i.startTime * 1000 * 60 + date.getTime()
			i.endTime = i.endTime * 1000 * 60 + date.getTime()
		}
		return data
	} catch (e) {
		console.log(e)
		return []
	}
}

module.exports.getCurrentKey = function(schedule, home) {
	const yaml = fs.readFileSync(home + "/Projects/.metadata/current/info.yaml")
	try {
		const data = yamllib.safeLoad(yaml)
		const title = data.title
		for (let i = 0; i < schedule.length; i++)
			if (schedule[i].name === title)
				return i
		return 0
	} catch (e) {
		return 0
	}
}

module.exports.getRealKey = function(schedule, time) {
	let j = 0
	for (const i of schedule)
		if (i.endTime < time)
			j++
	// now j is the least key such that schedule[j] didn't end yet
	if (j === schedule.length || schedule[j].startTime < time)
		return [j, j]
	else
		return [j - 1, j]
}

function process(arr) {
	for (const i in arr)
		if (arr[i].nodes)
			arr[i].nodes = process(arr[i].nodes)
	return Object.values(arr)
}

module.exports.getObjects = function(home) {
	const list = cp.execFileSync(home + "/.custom/bin/projecteer", [home + "/Projects/Tex", "list-projects"])
	const str = list.toString().split("\n").slice(1, -2)

	const arr = {}
	const path = []
	for (const line of str) {
		const replace = line.replace(/\| {2}/g, "")
		const replace2 = replace.replace("-  ", "")
		const replace3 = replace2.replace(":", "")
		const depth = (line.length - replace2.length) / 3
		const subpath = path.slice(0, depth - 1)
		let subarr = arr
		for (const i of subpath)
			subarr = subarr[i].nodes

		subarr[replace3] = {}
		const local = subarr[replace3]
		local.text = replace3
		if (replace2 !== replace3) {
			local.nodes = {}
			local.backColor = "#CCC"
		} else {
			local.href = "/" + replace3
			local.backColor = "#66F"
		}

		path[depth - 1] = replace3
	}

	return process(arr)
}
