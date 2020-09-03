const Discord = require("discord.js")
const Client = new Discord.Client()
const https = require("https")
const { google } = require("googleapis")
const fs = require("fs")

const commands = []
const prefix = "!"
const commandDescriptions = []

const categories = []
let currentCategory = ""

const emojis = {
	tick: "✅",
	cross: "❎",
	red_square: "🟥",
	done: "👍",
	green_square: "🟩"
}

function createCommand(id, func, exec, desc, minArgs = 0, botchannel = false) {
	commands[id] = function(req) {
		var res = req.content.split(" ")
		res[0] = res[0].substring(1)
		if (res.length <= minArgs) {
			req.reply("\nНедостаточно аргументов (требуется минимум " + minArgs + ", получено " + (res.length - 1) + ")!")
			return
		}
		if (!req.channel.guild || !req.channel.guild.available) {
			req.reply("\nСервер недоступен, повторите позже!")
			return
		}

		if (!botchannel || req.channel.name.indexOf("bot") >= 0)
			func(req, res)
	}

	exec = `**\`${prefix}${id}${minArgs ? " " : ""}${exec}\`**`

	commandDescriptions[currentCategory].push(exec + " - " + desc)
	console.log("Added !" + id + " command")
}

function addCategory(desc) {
	currentCategory = desc
	categories.push(desc)
	commandDescriptions[currentCategory] = []
}

function sendEmbed(channel, title, description, arr = {}) {
	arr.title = title
	arr.description = description
	channel.send({
		embed: arr
	})
}

function smartDate(text) {
	const tsplit = text.split("/")
	const date = tsplit[0]
	const time = tsplit[1] ? tsplit[1] : date

	const todaynow = new Date()
	let todaypoint = Date.now()
	if (date === "tomorrow")
		todaypoint += 86400000

	const parsedDate = Date.parse(date + "T00:00:00.000+03:00")
	if (parsedDate > 0) {
		const days = new Date(todaynow.toDateString() + " GMT+0300")
		todaypoint += parsedDate - days
	}

	const timeSplit = time.split(":")
	const hours = parseInt(timeSplit[0])
	const minutes = parseInt(timeSplit[1])
	if (timeSplit.length === 2 && !isNaN(hours) && !isNaN(minutes)) {
		let parsedTime = Number(new Date(todaynow.toDateString() + " GMT+0300"))
		parsedTime += 60000 * (60 * hours + minutes)
		todaypoint += parsedTime - Date.now()
	}

	return todaypoint + 100
}

function smartDateText(date) {
	const dateobj = new Date(date + 10800000)
	return new Intl.DateTimeFormat("ru", {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		timeZone: "UTC"
	}).format(dateobj)
}

let gmap = {}

function doRequest(options, input = false) {
	return new Promise((resolve, reject) => {
		const req = https.request(options, connection => {
			let data = ""
			connection.on("data", x => { data += x })
			connection.on("end", () => resolve(data))
		})

		req.on("error", err => {
			reject(err)
		})

		if (input)
			req.write(input)
		req.end()
	})
}

function parseJSON(str) {
	try {
		return JSON.parse(str)
	} catch (e) {
		return null
	}
}

async function generateGoogleAuth() {
	try {
		const cred = await parseJSON(fs.readFileSync("credentials.json"))
		const token = await parseJSON(fs.readFileSync("token.json"))
		const { client_secret, client_id, redirect_uris } = cred.installed
		const client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
		client.setCredentials(token)
		return client
	} catch(e) {
		console.error(e)
		process.exit(1)
	}
}

async function readSheet(id, table) {
	try {
		const auth = await generateGoogleAuth()
		const sheets = google.sheets({ version: "v4", auth: auth })
		const result = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: `${table}!A1:ZZ1000`, auth: auth })
		return result.data.values
	} catch(e) {
		console.log(e)
		return null
	}
}

function makeLetters(num) {
	let str = "";
	while (num > 0) {
		str = String.fromCharCode(65 + (num - 1) % 26) + str
		num = Math.floor((num - 1) / 26)
	}
	return str;
}

function getCell(row, column) {
	return makeLetters(parseInt(column) + 1) + String(parseInt(row) + 1)
}

async function writeSheet(id, table, row, column, value, input = false) {
	try {
		const auth = await generateGoogleAuth()
		const sheets = google.sheets({ version: "v4", auth: auth })
		const cell = getCell(row, column)
		const result = await sheets.spreadsheets.values.update({
			spreadsheetId: id,
			range: `${table}!${cell}`,
			valueInputOption: input ? "USER_ENTERED" : "RAW",
			auth: auth,
			resource: { values: [[value]] }
		})
		
		return true
	} catch(e) {
		console.log(e)
		return false
	}
}

async function importSheet(id, table, row, column, id2, table2, startx, starty, endx, endy) {
	const start2 = getCell(startx, starty)
	const end2 = getCell(endx, endy)
	const value = `=IMPORTRANGE("https://docs.google.com/spreadsheets/d/${id2}", "${table2}!${start2}:${end2}")`
	return await writeSheet(id, table, row, column, value, true)
}

async function createSpreadsheet(name) {
	try {
		const resource = { properties: { title: name }}
		const auth = await generateGoogleAuth()
		const sheets = google.sheets({ version: "v4", auth: auth })
		const result = await sheets.spreadsheets.create({ resource: resource, fields: "spreadsheetId", auth: auth })

		const id = result.data.spreadsheetId
		const drive = google.drive({ version: "v3", auth: auth })
		await drive.permissions.create({ fileId: id, requestBody: { role: "reader", type: "anyone" }})
		return id
	} catch(e) {
		console.log(e)
		return false
	}
}

async function makeSheet(id, table) {
	try {
		const resource = { requests: [{ addSheet: {properties: { title: table }}}]}
		const auth = await generateGoogleAuth()
		const sheets = google.sheets({ version: "v4", auth: auth })
		const result = await sheets.spreadsheets.batchUpdate({ resource: resource, spreadsheetId: id, auth: auth })
		return result.data.spreadsheetId
	} catch(e) {
		console.log(e)
		return false
	}
}

function setChannel(key, req, res) {
	const kk = req.guild.id
	gmap[kk][`${key}Channel`] = res[1].slice(2, -1)
}

const colorMap = {
	"красн": ["FF0000", 0],
	"оранжев": ["FF8000", 0],
	"желт": ["DDDD00", 0],
	"зелен": ["33CC00", 0],
	"голуб": ["00CCCC", 0],
	"син": ["0000FF", 1],
	"пурпурн": ["CC00FF", 0],
	"фиолетов": ["990099", 0],
	"сер": ["AAAAAA", 0],
	"коричнев": ["995000", 0],
	"бирюзов": ["33CCCC", 0],
	"оливков": ["808000", 0]
}

function getColor(name) {
	name = name.replace("ё", "е").slice(0, -2).toLowerCase()
	if (!colorMap[name]) return false
	const color = colorMap[name][0]
	name = name[0].toUpperCase() + name.slice(1) + (colorMap[name][1] === 1 ? "яя" : "ая")
	return [ name, color ]
}

const max = ["VIEW_CHANNEL"]
async function initRole(guild, name, ls_cat, glo_cat) {
	[ name, color ] = getColor(name)
	try {
		const role = await guild.roles.create({ data: { name: `МЭ - ${name}`, color: color, hoist: true }})
		const role_id = guild.roles.resolveID(role)
		const everyone = await guild.roles.everyone
		const everyone_id = guild.roles.resolveID(everyone)
		const perms = [{ id: everyone_id, deny: max }, { id: role_id, allow: max }]
		await guild.channels.create(`МЭ - ${name} - ЛС`, { permissionOverwrites: perms, parent: ls_cat })
		await guild.channels.create(`МЭ - ${name} - ЛС - голос`, { type: "voice", permissionOverwrites: perms, parent: ls_cat })
	} catch(e) {
		console.log(e)
	}
}

async function init(req, res, sensible) {
	const result = await readSheet(res[1], "users")
	if (!result)
		req.reply("Инициализация не удалась")
	else {
		const key = req.guild.id
		gmap[key].spreadsheet = res[1]
		if (sensible) ls_cat = await req.guild.channels.create("МЭ - Личные каналы", { type: "category" })
		if (sensible) glo_cat = await req.guild.channels.create("МЭ - Сдача задач командам", { type: "category" })
		gmap[key].teams = {}
		let count = 0
		for (let i of result) {
			let j = 0
			if (sensible) initRole(req.guild, i[0], ls_cat, glo_cat)
			const arr = []
			while (i[++j])
				arr.push(i[j])
			gmap[key].teams[getColor(i[0])[0]] = arr
			count++
		}
		req.reply(`Инициализация прошла успешно, создано ${count} команд`)
	}
}

Client.on("ready", async() => {
	addCategory("Разное")
	createCommand("init", async(req, res) => {
		if (res[2] === "abcdefgh")
			init(req, res, true)
		else
			init(req, res, false)
	}, "<spreadsheet_id> [abcdefgh]", "инициализировать игру", 1, true)
	
	createCommand("qinit", async(req, res) => {
		init(req, res, false)
	}, "<spreadsheet_id>", "сохранить таблицу в память", 1)

	createCommand("initChannels", async(req, res) => {
		if (res[1] !== "abcdefgh")
			req.reply("Не выдано подтверждение")
		else {
			const channels = req.guild.channels
			const ch_cat = await channels.create("МЭ - Каналы игры", { type: "category" })
			const ch_welcome = await channels.create("МЭ - Приглашения", { parent: ch_cat })
			const ch_queue = await channels.create("МЭ - Очередь", { parent: ch_cat })
			const ch_buy = await channels.create("МЭ - Покупка задач", { parent: ch_cat })
			
			const everyone = await req.guild.roles.everyone
			const everyone_id = req.guild.roles.resolveID(everyone)
			const perms = [{ id: everyone_id, deny: max }]
			const perms2 = [{ id: everyone_id, deny: ["SEND_MESSAGES"] }]
			const orgchannel = await channels.create("МЭ - Организация", { parent: ch_cat, permissionOverwrites: perms2 })
			
			const embed = new Discord.MessageEmbed()
				.setColor(0x00AE86)
				.setTitle("Правила Математического Экстрим-магазина")
				.setFooter("Бот матигр © Wizzerine 2020")
				.setTimestamp()

			const welcome_id = req.guild.channels.resolveID(ch_welcome)
			const queue_id = req.guild.channels.resolveID(ch_queue)
			const buy_id = req.guild.channels.resolveID(ch_buy)
			embed.addField("Подготовка", `Если вы участвуете в игре, то напишите имя, которым вы регистрировались, в канал <#${welcome_id}>. Скорее всего, это фамилия в формате \`Иванов\` или имя в формате \`Иван\`. Если сообщение удаляется, значит, такое имя не найдено. После этого вы получите роль нужной команды и доступ в голосовой и текстовый каналы вашей команды.`)
			embed.addField("Задачи", "Есть задачи в шести блоках: методы \`M\`, комбинаторика \`C\`, числа \`N\`, алгебра \`A\`, графы \`G\` и матанализ \`L\`. В каждой теме 5 задач, задачи не упорядочены по сложности, и их названия делаются так: \`N1\`, \`A3\` и т.п., далее это называется номером. У вас изначально есть доступ к покупке всех этих задач и 13 кредитов. У каждой задачи есть стоимость в кредитах: покупка этой задачи стоит N кредитов, за её верное решение вы получите 3N кредитов, а за каждую неверную сдачу потеряете 1 кредит (если у вас кредитов отрицательное число, вы можете сдавать задачи, но не можете покупать новые). Некоторые задачи на ответ (они выделяются звёздочкой в условии, но изначально вы не знаете, какие), некоторые на решение. У некоторых задач нет стоимости, их нельзя покупать, пока стоимость не появится.")
			embed.addField("Процесс игры", `В начале игры вы получите от меня ссылку на таблицу с общей информацией, т.е. списком команд, списком задач (без условий) и разбалловкой этих задач, а также прогрессом каждой команды. Когда вы захотите сдать задачу, напишите её номер в канал <#${queue_id}>. К вам в личный голосовой канал придёт преподаватель и примет или не примет задачу (вы можете сдавать её всей командой), и если ваше решение верное, я скажу вам об этом.`)
			embed.addField("Покупка задач", `Для покупки задач напишите номер задачи, которую хотите купить, в канал <#${buy_id}>. Если у вас есть доступ к клетке с задачей и деньги на её покупку, вы получите условие задачи в вашем личном текстовом канале.`)
			embed.addField("Преподавателям", `Для того, чтобы обозначить, что вы принимаете задачу, поставьте почти любую emoji-реакцию на сообщение в <#${queue_id}>. Четыре реакции имеют особое значение и их нельзя использовать перед началом сдачи:\n\`:white_check_mark:\` :white_check_mark: обозначает, что задача правильно сдана.\n\`:negative_squared_cross_mark:\` :negative_squared_cross_mark: обозначает, что в решении была ошибка.\n\`:red_square:\` :red_square: обозначает, что сообщение с номером было написано неправильно (в нём должен быть только номер), в этом случае оповещение об этом придёт в ЛС той команды.\n\`:green_square:\` :green_square: обозначает, что бот обработал сообщение. Этот emoji можно использовать, но не рекомендуется.`)
			orgchannel.send({ embed })

			await channels.create("МЭ - Вопросы", { parent: ch_cat })
			await channels.create("МЭ - Итоги игры", { parent: ch_cat, type: "voice" })
			await channels.create("МЭ - Жюри", { parent: ch_cat, type: "voice", permissionOverwrites: perms })

			await req.guild.roles.create({ data: { name: "МЭ - Преподаватели", color: "FFFFFF", permissions: ["ADMINISTRATOR"], hoist: true }})

			req.reply("Каналы инициализированы успешно")
		}
	}, "abcdefgh", "инициализировать каналы", 1, true)

	createCommand("clean", async(req, res) => {
		if (res[1] !== "abcdefgh")
			req.reply("Не выдано подтверждение")
		else {
			const roles = await req.guild.roles.fetch()
			roles.cache.each(i => { if (i.name.slice(0, 2).toUpperCase() === "МЭ") i.delete() })
			const channels = req.guild.channels.cache
			channels.each(i => { if (i.name.slice(0, 2).toUpperCase() === "МЭ") i.delete() })
			req.reply("Очистка завершена")
		}
	}, "abcdefgh", "очистить всю информацию об игре", 1, true)
})

function processMessage(req) {
	const msg = req.content.split(" ")
	if (msg[0][0] !== prefix) return
	msg[0] = msg[0].substring(1)

	if (commands[msg[0]])
		commands[msg[0]](req)
}

const filter = (reaction, user) => {
	return reaction.emoji.name === emojis.tick || reaction.emoji.name === emojis.cross || reaction.emoji.name === emojis.red_square
}

Client.on("message", async req => {
	if (req.author.bot) return

	const key = req.guild.id
	if (!gmap[key])
		gmap[key] = {}

	processMessage(req)
	if (req.channel.name === "мэ-приглашения") {
		if (!gmap[key].teams)
			req.reply("Бот не инициализирован")
		else {
			const teams = gmap[key].teams
			let good = false
			for (let team in teams) {
				if (good) break
				for (let person of teams[team])
					if (person === req.content) {
						good = true
						req.react(emojis.done)
						await req.member.roles.remove(req.member.roles.cache)
						const color = getColor(team)[0]
						const role = await req.guild.roles.cache.find(x => x.name === `МЭ - ${team}`)
						if (!role) req.reply("Ошибка")
						req.member.roles.add(role)
						req.member.setNickname(`${color} - ${person}`).catch(() => {}) // админу не меняется ник
						break
					}
			}
			if (!good)
				req.delete()
		}
	} else if (req.channel.name === "мэ-очередь") {
		req.awaitReactions(filter, { max: 1, time: 1800000, errors: ["time"] })
			.then(async collected => {
				const key = req.guild.id
				const role = await req.member.roles.cache.find(x => x.name.slice(0, 2) === "МЭ")
				if (!role) return
				const color = role.name.slice(5)
				const reaction = collected.keyArray()[0]
				if (reaction === emojis.red_square) {
					const str = `Вы пытались сдать задачу ${req.content}, но такой задачи нет или этот запрос был неверен`
					const channel = await req.guild.channels.cache.find(x => x.name === `мэ-${color}-лс`)
					if (channel) channel.send(str)
					else req.reply(str)
				}

				const sheet_id = gmap[key].spreadsheet
				const result = await readSheet(sheet_id, "territories")
				if (!result) req.channel.send(`Ошибка при проверке задачи ${req.content} от ${req.author}`)
				else {
					let row = -1
					for (let i in result)
						if (result[i][0] === color) {
							row = i
							break
						}

					if (row < 0) req.channel.send(`При проверке ${req.content} от ${req.author} оказалось, что автор не в команде`)

					let column = -1
					for (let i in result[0])
						if (result[0][i] === req.content) {
							column = i
							break
						}
					if (column < 0) req.channel.send(`При проверке ${req.content} от ${req.author} оказалось, что задачи не существует`)
					if (row < 0 || column < 0)
						return
					if (result[row][column] && parseInt(result[row][column]) > 0)
						req.channel.send(`Проверка ${req.content} от ${req.author} отменена`)
					else if (reaction === emojis.tick)
						await writeSheet(sheet_id, "territories", row, column, !result[row][column] ? 1 : 1 - parseInt(result[row][column]))
					else if (reaction === emojis.cross)
						await writeSheet(sheet_id, "territories", row, column, !result[row][column] ? -1 : parseInt(result[row][column]) - 1)
					req.react(emojis.green_square)
				}
			}).catch(collected => console.log(collected) || req.channel.send(`Нет ответа к решению ${req.content} от ${req.author}, я закрываюсь`))

		const key = req.guild.id
		const sheet_id = gmap[key].spreadsheet
		const result = await readSheet(sheet_id, "territories")
		if (!result) req.react(emojis.red_square)
		else {
			let good = false
			for (let i in result[0])
				if (result[0][i] === req.content) {
					good = true
					break
				}
			if (!good) req.react(emojis.red_square)
		}
	} else if (req.channel.name === "мэ-покупка-задач") {
		const key = req.guild.id
		const sheet_id = gmap[key].spreadsheet
		if (!sheet_id) {
			req.react(emojis.red_square)
			return
		}
		const result = await readSheet(sheet_id, "territories")
		if (!result) req.react(emojis.red_square)
		else {
			let good = false, column = false
			for (let i in result[0])
				if (result[0][i] === req.content) {
					good = parseInt(result[1][i])
					column = i
					break
				}
			if (!good || isNaN(good)) {
				req.react(emojis.red_square)
				return
			}

			const role = await req.member.roles.cache.find(x => x.name.slice(0, 2) === "МЭ")
			if (!role) return
			const color = role.name.slice(5)
			let row = -1
			for (let i in result)
				if (result[i][0] === color) {
					row = i
					break
				}
			if (!row) {
				req.react(emojis.red_square)
				return
			}

			let current_count = result[row]
			current_count = parseInt(current_count[current_count.length - 2])
			if (current_count < good) {
				req.react(emojis.cross)
				return
			}

			if (!isNaN(parseInt(result[row][column]))) {
				req.react(emojis.cross)
				return
			}

			await writeSheet(sheet_id, "territories", row, column, 0)
			req.react(emojis.green_square)

			for (let i in result)
				if (result[i][0] === "условия") {
					row = i
					break
				}

			const channel = await req.guild.channels.cache.find(x => x.name === `мэ-${color.toLowerCase()}-лс`)
			const embed = new Discord.MessageEmbed()
				.setImage(result[row][column])
				.addField(`Стоимость задачи`, `${good} кредитов`)
				.addField(`Баланс`, `${current_count - good} кредитов`)
			channel.send(embed)
		}
	}
})

const key = fs.readFileSync("key.txt").toString()
Client.login(key)
