//const { resolveTripleslashReference } = require("typescript")

const canvas = document.getElementById("confetti")
const confetti = new JSConfetti({ canvas })

const possibleBingos = [
	[0, 1, 2, 3, 4],
	[5, 6, 7, 8, 9],
	[10, 11, 12, 13, 14],
	[15, 16, 17, 18, 19],
	[20, 21, 22, 23, 24],

	[0, 5, 10, 15, 20],
	[1, 6, 11, 16, 21],
	[2, 7, 12, 17, 22],
	[3, 8, 13, 18, 23],
	[4, 9, 14, 19, 24],

	[0, 6, 12, 18, 24],
	[20, 16, 12, 8, 4],
]

// Parse the month and seed from the URL
const urlParams = new URLSearchParams(location.search)

// Array of paramaters for Bingo
const params = {}

// If month exists in URL, parse the Month as a number since 2021 ELSE get the current month index
// ***LEGACY CODE*** Support old JSON files
if (urlParams.has("month")) {
	params.month = parseInt(urlParams.get("month"))
} else {
	const date = new Date()
	const year = date.getUTCFullYear()
	const month = date.getUTCMonth()
	params.month = (year - 2021) * 12 + month - 9
	
}

// ***LEGACY CODE*** Keeps old seeds working
function stringToNumber(str) {
	let numeric = true
	for (let c of str) {
		if (c < "0" || c > "9") {
			numeric = false
			break
		}
	}
	if (numeric) {
		return parseInt(str)
	}

	// Handle alphanumerical seeds
	let result = 0
	Array.from(str).forEach((c) => {
		result = result * 0x10ffff + c.codePointAt(0)
		result = result % 0x1000000
	})
	return result
}

// If seed exists in URL, parse the seed as int
// Else set .seed = 1
if (urlParams.has("seed")) {
	params.seed = stringToNumber(urlParams.get("seed"))
} else {
	params.seed = 1
}

//Parse the new URL format
if (urlParams.has("YYYY")) {
	params.yyyy = parseInt(urlParams.get("YYYY"))
	params.mm = parseInt(urlParams.get("MM"))
}else {
	const date = new Date()
	params.yyyy = date.getUTCFullYear()
	params.mm = date.getUTCMonth() + 1
}

// Next two functions taken from https://stackoverflow.com/a/53758827/7595722
// With some slight modification to make them look nicer

// Function that generated a psedo random order for the bingo card array
function shuffle(array, seed) {
	let m = array.length
	let t
	let i

	while (m) {
		i = Math.floor(randomSeed(seed) * m--)

		t = array[m]
		array[m] = array[i]
		array[i] = t
		++seed
	}

	return array
}

// Generate a seed for the custom card function
function randomSeed(seed) {
	var x = Math.sin(seed) * 10000
	return x - Math.floor(x)
}

// Creates a <td> from a name and link value
// If no link exists, simply name the cell and mark as unchecked
// If multiple links are presnt map the array into HTML strings
// If only one link exists, place the name and link into the cell set URL text as name.
//If the cell contains a link mark as cell-checked
function createBingoCell(name, link) {
	const cell = document.createElement("td")
	if (link === "") {
		cell.innerText = name
		cell.className = "cell-unchecked"
	} else {
		if (Array.isArray(link)) {
			let linkHTML = link
				.map((href, index) => {
					return `<a href="${href}">[${index + 1}]</a>`
				})
				.join("")
			cell.innerHTML = `<p>${name}</p><div>${linkHTML}</div>`
		} else {
			cell.innerHTML = `<a href="${link}"><p>${name}</p></a>`
		}
		cell.className = "cell-checked"
	}
	return cell
}


// Converts a relative month index into a human-readable month and year string
function getDateString(month) {
	const date = new Date()
	const year = Math.floor(month / 12) + 2021
	const newMonth = (month % 12) + 9
	date.setUTCFullYear(year, newMonth)
	return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

// Generates a new seed and sets the current month index value and encodes as a URL string
// Fixed the if (!url.indexOf("?") !== -1) logic error. Thank mr GPT
// ***LEGACY CODE*** Support creating a new bingo card on older JSONs
function redirectToNewCard(month) {
	let url = window.location.href
	if (url.includes("?")) {
		url = url.slice(0, url.indexOf("?"))
	}
	url += `?month=${month}`
	url += `&seed=${Math.floor(Math.random() * 99999)}`
	window.location.assign(url)
}

// New card randomizer behavior

function createNewCard(yyyy, mm) {
	let url = window.location.href
	if(url.includes("?")) {
		url =  url.slice(0, url.indexOf("?"))
	}
	url += `?YYYY=${yyyy}`
	url += `&MM=${mm}`
	url += `&seed=${Math.floor(Math.random() * 99999)}`
}

// Get the monthly outage bingo card 
async function apiFetch(yyyy, mm) {
	const mmPad = String(mm).padStart(2, "0")
	const response = await fetch(`/api/outage-bingo/${yyyy}-${mmPad}`,{cache: "no-store"})
	if(!response.ok) throw new Error (`API Error: ${response.status}`)
	
	return await response.json()
}


// Fetch the data
;(async () => {
	// Loads the latest outages-#.json from the root dir
	// If there isn't a file present, 404 error and create a message for the user
	// This will stay to support legacy .json files
	// OLD BEHAVIOR const response = await fetch(`./outages-1.json`)

 	document.getElementById("loading").remove()

  	let data
  	try {
		// apiFetch returns the parsed JSON array
    	data = await apiFetch(params.yyyy, params.mm)
  	} catch (err) {
    	// If the file isn't there (404) or anything else fails, show message
    	const whoops = document.createElement("p")
    	whoops.innerText =
      	"Whoops, looks like we haven't made a card for this month yet, check back later"
    	document.querySelector("body").appendChild(whoops)
    	console.error(err)
    	return
  	}

	// Set the header to reflect the YYYY/MM params
	const title = document.createElement("h2")
	title.innerText = new Date(Date.UTC(params.yyyy, params.mm, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
	})
	document.querySelector("body").appendChild(title)

	const shuffled = shuffle(data, params.seed)


	const table = document.createElement("table")
	// We're going to do a new array so that the final card will be in one
	// smaller array just in case we have more than 24 options, and so that
	// we can include the free space
	const finalCard = []

	for (let i = 0; i < 5; i++) {
		const row = document.createElement("tr")

		for (let j = 0; j < 5; j++) {
			let cell
			if (i === 2 && j === 2) {
				// This is the free space
				cell = document.createElement("td")
				cell.innerText = "Free Space (Github Actions)"
				cell.className = "cell-checked"
				finalCard.push({
					name: "Free Space (Github Actions)",
					link: "free",
				})
			} else {
				const cellData = shuffled.shift()
				finalCard.push(cellData)
				cell = createBingoCell(cellData.name, cellData.link)
			}
			row.appendChild(cell)
		}

		table.appendChild(row)
	}

	document.querySelector("body").appendChild(table)

	/* Legacy New card button and function call.
	const newCard = document.createElement("button")
	newCard.innerText = "Get my own card"
	newCard.onclick = () => {
		redirectToNewCard(params.month)
	}
	*/

	// New card with new function call
	const newCard = document.createElement("button")
	newCard.innerText = "Get my own card"
	newCard.onclick = () => {
		createNewCard(params.yyyy, params.mm)
	}	
	
	document.querySelector("body").appendChild(newCard)

	let numBingos = 0
	possibleBingos.forEach((line) => {
		if (
			line.every((index) => {
				return finalCard[index].link !== ""
			})
		)
			numBingos++
	})

	if (numBingos > 0) {
		setTimeout(() => {
			confetti.addConfetti({
				emojis: ["⚡️", "💥", "🔥"],
				confettiNumber: 20 * numBingos,
			})
		}, 1000)
		const marquee = document.getElementById("bingo")
		marquee.classList.remove("invis")
		marquee.innerText = `${numBingos} bingo${numBingos > 1 ? "s" : ""}`
	}

	if (numBingos === possibleBingos.length) {
		// Lets add a little easter egg just in case we fill a card
		const marquee = document.getElementById("bingo")
		marquee.innerText = "🔥".repeat(500)
	}
})()
