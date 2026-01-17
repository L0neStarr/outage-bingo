const canvas = document.getElementById("confetti")
const confetti = new JSConfetti({ canvas })
const utilityButtons = document.getElementById("buttons-list");
const mql = window.matchMedia("(max-aspect-ratio: .823)");

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

var initialHeight = window.innerHeight;
var initialConfettiCheck = false;
var storageDarkmode = localStorage.getItem('darkmode');
var dataApiOutput = [];
var dataFinalCard = [];
var dataShareLinks = {
	"twitter": [
		"icon-share-twitter.svg",
		"https://twitter.com/share?url="
	],
	"bluesky": [
		"icon-share-bluesky.svg",
		"https://bsky.app/intent/compose?text="
	],
	// "tumblr": [
	// 	"share-icon-temp-tumblr.png",
	// 	"https://www.tumblr.com/widgets/share/tool?shareSource=legacy&canonicalUrl=&tags=outage+bingo&url=outage-bingo.com",
	// 	"&content=",
	// 	"&caption="
	// ],
	// "reddit": [
	// 	"share-icon-temp-reddit.png",
	// 	"https://www.reddit.com/submit?",
	// 	"url=",
	// 	"&title="
	// ]
};


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

// Functions
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

// Creates a <div> from a name and link value
// If no link exists, simply name the cell and mark as unchecked
// If multiple links are presnt map the array into HTML strings
// If only one link exists, place the name and link into the cell set URL text as name.
//If the cell contains a link mark as cell-checked
function createBingoCell(name, link) {
	const cell = document.createElement("div")

	if (link === "" || !link?.length) {
		cell.innerText = name
		cell.className = "cell-unchecked"
	} else {
		if (Array.isArray(link)) {
			let linkHTML = link
				.map((href, index) => `<a href="${href}">[${index + 1}]</a>`)
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
	if (url.includes("?")) {
		url = url.slice(0, url.indexOf("?"))
	}
	newSeed = Math.floor(Math.random() * 99999);
	urlValues = `?YYYY=${yyyy}`
	urlValues += `&MM=${mm}`
	urlValues += `&seed=${newSeed}`

	// Url changes without reloading the page before shuffling and passing the card data
	window.history.replaceState(url, "", urlValues);
	let outputMirror = dataApiOutput.slice();
	mutatedCardData = shuffle(outputMirror, newSeed);

	pageBingoConstruction(mutatedCardData);
	dataConfettiCheck();
}

// Get the monthly outage bingo card 
async function apiFetch(yyyy, mm) {
	const mmPad = String(mm).padStart(2, "0")
	const response = await fetch(`/api/outage-bingo/${yyyy}-${mmPad}`,{cache: "no-store"})
	if(!response.ok) throw new Error (`API Error: ${response.status}`)
	
	return await response.json()
}

// Reusable card creation logic taken from async
function pageBingoConstruction(givenData) {
	// Checking for an existing bingo table on the page
	var table;

	if (document.getElementById("bingo-table")) {
		table = document.getElementById("bingo-table");
		table.innerHTML = "";
	}
	else {
		table = document.createElement("div");
		table.id = "bingo-table";
	};
	
	// We're going to do a new array so that the final card will be in one
	// smaller array just in case we have more than 24 options, and so that
	// we can include the free space
	// Cece note: FinalCard(now dataFinalCard) has been moved to a global variable
	dataFinalCard = []

	for (let i = 0; i < 5; i++) {
		const row = document.createElement("div")
		row.className = "bingo-row";

		for (let j = 0; j < 5; j++) {
			let cell
			if (i === 2 && j === 2) {
				// This is the free space
				cell = document.createElement("div")
				cell.innerText = "Free Space (Fortnet Vulnerability)"
				cell.className = "cell-checked"
				dataFinalCard.push({
					name: "Free Space (Fortnet Vulnerability)",
					link: "free",
				})
			} else {
				const cellData = givenData.shift()
				dataFinalCard.push(cellData)
				cell = createBingoCell(cellData.name, cellData.link)
			}

			row.appendChild(cell)
		}

		table.appendChild(row)
	}

	if (document.getElementById("bingo-table") == null) {
		document.querySelector("body").appendChild(table);
	};

	/* Legacy New card button and function call.
	const newCard = document.createElement("button")
	newCard.innerText = "Get my own card"
	newCard.onclick = () => {
		redirectToNewCard(params.month)
	}
	*/

	// New card with new function call
	if (document.getElementById("card-new") == undefined) {
		const newCard = document.createElement("button")
		newCard.id = "card-new"
		newCard.innerText = "Get my own card"
		newCard.onclick = () => {
			createNewCard(params.yyyy, params.mm)
		}	
		
		document.querySelector("body").appendChild(newCard)
	};

	// Checking url to see if the current card is a user created one, which creates the popup
	if (window.location.href.includes("?")) {
		monthTitle = new Date(Date.UTC(2020, params.mm, 1)).toLocaleDateString("en-US", {month: "long"});
		shareText = `Check out my Outage Bingo board for ${monthTitle}: `;

		// Check for if a linkbox already exists, and if it does it updates the window location in onclick
		if (document.getElementById("card-linkbox")) {
			previousLinkbox = document.getElementById("card-linkbox");
			previousLinkbox.innerHTML = window.location.href;
			previousLinkbox.onclick = () => { navigator.clipboard.writeText(`${shareText}${window.location.href}`) };

			return;
		};

		const elemShareOptions = document.createElement("div");
		const elemSharePlatforms = document.createElement("div");

		elemShareOptions.id = "share-options";
		elemShareOptions.innerHTML = `<div id="card-linkbox" onclick="navigator.clipboard.writeText(\`${shareText}${window.location.href}\`)"><p>${window.location.href}</p><p>Copied :D</p></div>`;

		elemSharePlatforms.id = "share-platforms";

		// Buttons for every site listed in dataShareLinks are created
		Object.keys(dataShareLinks).forEach((newKey) => {
			newButton = document.createElement("button");
			newButton.id = newKey;
			// newButton.innerHTML = `<img src="./img/${dataShareLinks[newKey][0]}"></img>`;
			newButton.innerHTML = `<object data="./img/${dataShareLinks[newKey][0]}"></object>`;
			elemSharePlatforms.appendChild(newButton);
		});

		// All of the site specific share buttons are kept under one parent so that we can use just this one
		// event listener to handle differences between how share links work
		// Doing it this way also avoids having to refresh the window location on every single site button
		elemSharePlatforms.addEventListener("click", (e) => {
			if (e.target.nodeName != "BUTTON") return;

			switch (e.target.id) {
				case "tumblr":
				case "reddit":
					return;

				default:
					newEncodedUrl = encodeURIComponent(window.location.href);
					window.open(`${dataShareLinks[e.target.id][1]}${shareText}${newEncodedUrl}`, "_blank");
			}
		});

		elemShareOptions.appendChild(elemSharePlatforms);
		document.body.appendChild(elemShareOptions);
	};
};

// Confetti function taken from async
function dataConfettiCheck() {
	let numBingos = 0
	const marquee = document.getElementById("bingo")

	possibleBingos.forEach((line) => {
		if (
			line.every((index) => {
				const link = dataFinalCard[index].link // CHANGED: store link for clearer/consistent checked logic
				return (Array.isArray(link) ? link.length > 0 : link !== "") // CHANGED: [] is now treated as unchecked; non-empty array or non-empty string counts as checked
			})
		)
			numBingos++
	})

	if (numBingos == 0) {
		marquee.classList.add("invis")
	};

	if (numBingos > 0) {
		marquee.classList.remove("invis")
		marquee.innerText = `${numBingos} bingo${numBingos > 1 ? "s" : ""}`

		if (initialConfettiCheck == true) return;
		setTimeout(() => {
			confetti.addConfetti({
				emojis: ["⚡️", "💥", "🔥"],
				confettiNumber: 20 * numBingos,
			})
		}, 1000)
	}

	if (numBingos === possibleBingos.length) {
		// Lets add a little easter egg just in case we fill a card
		const marquee = document.getElementById("bingo")
		marquee.innerText = "🔥".repeat(500)
	}

	initialConfettiCheck = true;
};


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
		dataApiOutput = data.slice();
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


	// Cece notes:
	// - converted the table element into a grid to better handle styling issues
	// - this async function has now been bisected into two so that the bingo card creation can be done
	// without any more reloads
	// - bingo checking has simmilarly been split into its own function so that new cards don't create confetti
	// on reroll, and so that the banner has an accurate bingo count
	pageBingoConstruction(shuffled);
	dataConfettiCheck();
})()


// Fixed an ANNOYING fucking bug with fixed element positioning and the fuckass mobile address bar resizing the window
// https://developer.mozilla.org/en-US/docs/Web/API/Window/innerHeight
// https://medium.com/preprintblog/dont-use-vh-100-for-phone-webpage-it-ignores-the-address-bar-of-the-browser-chrome-safari-and-46c8a7fc5f2e
if (mql.matches == true) {
	window.addEventListener("resize", () => {
		utilityButtons.style.bottom = `calc(var(--n-margin-generic) - (${window.innerHeight}px - ${initialHeight}px))`;
	});
};