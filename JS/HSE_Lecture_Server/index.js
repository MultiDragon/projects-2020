const fs = require("fs")
const express = require("express")
const app = express()
// const port = process.env.PORT || 10000
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

// app.listen(port, () => (`HSE-LS, port ${port}`))

const colors = {
	seminar: "00FA9A",
	lecture: "B8860B",
	lesson: "808080",
	problems: "FFA500",
	change: "FF0000",
	underlineCurrent: "0000CD",
	underlineNext: "800080",
	underlineBreak: "FFFFFF",
	name: "32CD32",
	room: "4682B4",
	zoom: "FFD700"
}

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

function printType(t) {
	if (t === "Seminar")
		return `%{F#${colors.seminar}}Sem%{F-}`
	else if (t === "Lecture")
		return `%{F#${colors.lecture}}Lec%{F-}`
	else if (t === "Lesson")
		return `%{F#${colors.lesson}}Lsn%{F-}`
	else if (t === "Problems")
		return `%{F#${colors.problems}}Prob%{F-}`
	return ""
}

function printRoom(prev, next) {
	if (next.room === "Zoom")
		return ` %{A1:~/.custom/bin/xdg-rofi zoommtg\\://zoom.us/join\\?action=join\\&confno=${next.zoomID}\\&pwd=${next.zoomPassHash}:}` +
			`%{F#${colors.zoom}}Zoom%{F-}%{A}`
	else if (!prev || next.room !== prev.room)
		return ` %{F#${colors.room}}in ${next.room}%{F-}`
	return ""
}

function printCurrentEvent(currentEvent, currentTime) {
	const timeLeft = printTime(Math.round((currentEvent.endTime - currentTime) / 1000 / 60))
	return `%{u#${colors.underlineCurrent}}%{+u}%{F#${colors.name}}${currentEvent.name}%{F-} ${printType(currentEvent.type)} ` +
		`(ends ${timeLeft})%{-u} `
}

function printBreak() {
	return `%{u#${colors.underlineBreak}}%{+u}Break.%{-u} `
}

function printNextEvent(currentEvent, nextEvent, currentTime) {
	const timeLeft = printTime(Math.round((nextEvent.startTime - currentTime) / 1000 / 60))
	return `%{u#${colors.underlineNext}}%{+u}Next: %{F#${colors.name}}${nextEvent.name}%{F-} ${printType(nextEvent.type)} ` +
		`(starts ${timeLeft}${printRoom(currentEvent, nextEvent)})%{-u} `
}

function printUpdateButton(next) {
	return `%{A1:${home}/.custom/bin/projecteer ${home}/Projects list-projects "${next.name}":}` +
		`%{u#${colors.change}}%{+u}[CHANGE PROJECT]%{-u}%{A} `
}

// function printRoomChange(prev, next) {
// return `%{u#ccc}%{+u}Move from ${prev.room} to ${next.room}%{-u} `
// }

let notified = false
function processEvent(schedule, currentTime) {
	let text = ""
	const ckey = FSServer.getCurrentKey(schedule, home)
	const [key1, key2] = FSServer.getRealKey(schedule, currentTime)
	let bad = false
	if (key1 === schedule.length) {
		bad = true
	} else {
		if (key1 === key2) {
			text += printCurrentEvent(schedule[key1], currentTime)
			notified = false
		} else {
			text += printBreak()
		}

		if (key1 < schedule.length - 1) {
			if (key1 !== key2 && schedule[key1 + 1].startTime - currentTime < 300000 && !notified) {
				notified = true
				FSServer.sendNotification(home, schedule[key1 + 1])
			}

			text += printNextEvent(schedule[key1], schedule[key1 + 1], currentTime)
		}
	}

	if (!bad) {
		if (ckey === -1 || schedule[ckey].name !== schedule[key2].name)
			text += printUpdateButton(schedule[key2])
		setTimeout(() => processEvent(schedule, currentTime + 10000), 10000)
		console.log(text.trim())
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
