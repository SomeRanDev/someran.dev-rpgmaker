/**
 * Scrapes the screenshots from the plugin pages and adds them as a "screenshots" entry in an OldSiteData.json file.
 *
 * Recommended command to run this:
 * deno run --allow-read --allow-write --allow-net tools/transfer/ScreenshotScraper.ts old_site_data/PluginDataNoScreenshots.json old_site_data/PluginData.json
 */

import { DOMParser, HTMLDocument } from "jsr:@b-fuze/deno-dom@0.1.56";
import { basename } from "jsr:@std/path@1.1.2";

/**
 * A list of filenames that will be scraped from a sumrndm.site plugin page that should be ignored.
 */
const IGNORE_FILES = [
	"PatreonButton.png",
	"TwitterButton.png",
	"KoFiButton.png",
	"YouTubeButton.png",
	"Hudell.png",
	"Triacontane.png",
	"Galv.png",
	"yanflymoe.png",
	"banner_fungamemake.png",
	"SRDBanner.png",
	"SRDSiteBannerSmall-2.png",
];

async function scrapeImages(url: string): Promise<string[] | null> {
	const doc = await getHTMLDocument(url);
	if (!doc) {
		console.log(`Could not get HTMLDocument for ${url}.`);
		return null;
	}
	return filterAndConvertScreenshotsToArchiveUrls(extractAllImages(doc));
}

/**
 * Attempts to retrieve an instance of HTMLDocument from the provided `url`.
 * If an error occured, it is printed and `null` is returned.
 */
async function getHTMLDocument(url: string): Promise<HTMLDocument | null> {
	try {
		const resp = await fetch(url);
		if (!resp.ok) {
			console.error(`Could not fetch ${url}. Got status ${resp.status}`);
			return null;
		}
		const html = await resp.text();
		const doc = new DOMParser().parseFromString(html, "text/html");
		if (!doc) {
			console.error(`Could not parse HTML from ${url}.`);
			return null;
		}
		return doc;
	} catch (err) {
		console.error(`Error\n`, err);
		return null;
	}
}

/**
 * Extracts a list of all images on the page.
 */
function extractAllImages(doc: HTMLDocument): string[] {
	const links: string[] = [];
	for (const img of doc.querySelectorAll("img")) {
		const link = img.getAttribute("src");
		if (!link || !link.startsWith("http://sumrndm.site/")) continue;
		if (links.includes(link)) continue;
		links.push(link);
	}
	return links;
}

/**
 * Ensures the screenshot has the correct prefix, does not match any `IGNORE_FILES`,
 * and converts it to a readable version from the sumrndm.site-archive Github.
 */
function filterAndConvertScreenshotsToArchiveUrls(urls: string[]): string[] {
	return urls.filter(
		function (link: string) {
			if (
				!link.startsWith("http://sumrndm.site/wp-content/uploads")
			) {
				return false;
			}
			const linkFilename = basename(new URL(link).pathname);
			return !IGNORE_FILES.includes(linkFilename);
		},
	)
		.map((l) => l.substring("http://sumrndm.site/".length))
		.map((url) =>
			`https://raw.githubusercontent.com/SomeRanDev/sumrndm.site-archive/refs/heads/main/sumrndm.site/${url}`
		);
}

/**
 * Get arguments or crash tf out if they aren't there.
 */
function getArgs(): [string, string] {
	if (Deno.args.length !== 2) {
		console.error(
			"Expected 2 arguments:\ndeno run ScreenshotScraper <input.json> <output.json>",
		);
		Deno.exit(1);
	}
	return [Deno.args[0], Deno.args[1]];
}

/**
 * Main function.
 */
async function main() {
	const [inputFile, outputFile] = getArgs();
	const data: { kind: number; url: string; screenshots: string[] }[] = JSON
		.parse(
			Deno.readTextFileSync(inputFile),
		);

	for (const entry of data) {
		// Ignore "categories" or entries without a url.
		if (entry.kind === 0 || !entry.url) continue;

		// Get the images.
		const images = await scrapeImages(entry.url);
		if (images === null) continue;

		// Store screenshots in entry.
		entry.screenshots = images;

		// Print the result.
		if (images.length > 0) {
			console.log(
				`Found screenshots for \`${entry.url}\`:\n${
					images.join("\n")
				}\n`,
			);
		} else {
			console.log(
				`Found no screenshots for \`${entry.url}\`.`,
			);
		}

		// Wait.
		await new Promise((r) => setTimeout(r, 500));
	}

	Deno.writeTextFileSync(outputFile, JSON.stringify(data, null, 4));
}

if (import.meta.main) {
	main();
}
