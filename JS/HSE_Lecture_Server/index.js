const fs = require("fs")
const express = require("express")
const app = express()
const port = process.env.PORT || 10000
const home = process.env.HOME

const FSServer = require("./parts/fs_server.js")

app.set("view engine", "ejs")
app.use(express.static("static"))

// Module: Objects
app.get("/:object_id", (req, res) => {
	const data = FSServer.getObject(req.params.object_id, home)
	if (!data) {
		res.status(404)
		res.send("404 Object not found")
		res.end()
	} else {
		const file = data.path + "/" + data.file
		const stat = fs.statSync(file)
		res.writeHead(200, {
			"Content-Type": data.mime,
			"Content-Length": stat.size
		})
		const readStream = fs.createReadStream(file)
		readStream.pipe(res)
	}
})

app.get("/", (req, res) => {
	const data = FSServer.getObjects(home)
	res.render("template", { context: { page: "index" }, tree: data })
})

app.listen(port, () => (`HSE-LS, port ${port}`))

function printTime(num) {
	const h = Math.floor(num / 60)
	const m = num % 60
	if (!h && !m)
		return "now"
	else if (!m)
		return `in ${h} h.`
	else if (!h)
		return `in ${m} min.`
	else
		return `in ${h} h. ${m} min.`
}

function getType(t) {
	if (t === "Seminar")
		return "%{F#0F9}S%{F-}"
	else if (t === "Lecture")
		return "%{F#FF0}L%{F-}"
	else
		return ""
}

function printCurrentEvent(currentEvent, currentTime) {
	const timeLeft = printTime(Math.round((currentEvent.endTime - currentTime) / 1000 / 60))
	return `%{u#00c}%{+u}${currentEvent.name} ${getType(currentEvent.type)} (ends ${timeLeft})%{-u} `
}

function printBreak() {
	return "%{u#090}%{+u}Break.%{-u} "
}

function printNextEvent(nextEvent, currentTime) {
	const timeLeft = printTime(Math.round((nextEvent.startTime - currentTime) / 1000 / 60))
	return `%{u#60c}%{+u}Next: ${nextEvent.name} ${getType(nextEvent.type)} (starts ${timeLeft})%{-u} `
}

function printUpdateButton(next) {
	return `%{A1:${home}/.custom/bin/projecteer ${home}/Projects list-projects "${next.name}":}%{u#f00}%{+u}[CHANGE PROJECT]%{-u}%{A} `
}

function printRoomChange(prev, next) {
	return `%{u#ccc}%{+u}Move from ${prev.room} to ${next.room}%{-u} `
}

function processEvent(schedule, currentTime) {
	let text = ""
	const ckey = FSServer.getCurrentKey(schedule, home)
	const key = FSServer.getRealKey(schedule, currentTime)
	let kdelta = 0
	let bad = false
	if (key === schedule.length) {
		bad = true
	} else {
		if (currentTime >= schedule[key].startTime) {
			text += printCurrentEvent(schedule[key], currentTime)
		} else {
			text += printBreak()
			if (key > 0 && schedule[key].room !== schedule[key - 1].room)
				text += printRoomChange(schedule[key - 1], schedule[key])
			kdelta = -1
		}

		if (key + kdelta < schedule.length - 1)
			text += printNextEvent(schedule[key + kdelta + 1], currentTime)
	}

	if (!bad) {
		if (ckey !== key)
			text += printUpdateButton(schedule[key])
		setTimeout(() => processEvent(schedule, currentTime + 10000), 10000)
		console.log(text)
	} else {
		console.log("No events today")
	}
}

const currentTime = new Date().getTime()
const schedule = FSServer.getSchedule(currentTime, home)
if (schedule.length === 0)
	console.log("No events today")
else
	processEvent(schedule, currentTime)
