/**
 * Scrapes all the plugin pages from sumrndm.site using input from a simple format found in REPO/old_site_data txt files.
 *
 * Recommended command to run this:
 * deno run --node-modules-dir --allow-read --allow-env --allow-net --allow-write tools/transfer/OldSiteDataReader.ts ./old_site_data/OldSiteData.json  ./old_site_data/MVPlugins.txt ./old_site_data/MVPluginsUnsupported.txt ./old_site_data/MZPlugins.txt
 */

import scrape, {
	getFileNameFromDropdownUrl,
	ScrapeResult,
} from "./SinglePageScraper.ts";
import "../Utils.ts";
import * as OldSiteData from "./OldSiteDataTypes.ts";

/**
 * Parses a collection of lines grouped together in the input text files.
 */
async function parseGroup(
	group: string,
): Promise<OldSiteData.TextEntry[] | null> {
	const lines = group.split("\n");
	const description = lines.splice(lines.length - 1, 1).at(0);
	if (!description) {
		console.warn(
			"No description found for group with contents: " + group,
		);
		return null;
	}

	if (lines.length % 2 !== 0) {
		console.warn(
			"Expected pairs of name and URL for group with contents: " +
				group,
		);
		return null;
	}

	const data: OldSiteData.TextEntry[] = [];
	for (let i = 0; i < lines.length; i += 2) {
		const name = lines.at(i) ?? "";
		const url = lines.at(i + 1) ?? "";

		if (name.startsWith("Category: ")) {
			data.push({
				kind: OldSiteData.TextEntryKind.Category,
				name: name.substring("Category: ".length),
				imageUrl: url,
				description: description,
			} as OldSiteData.TextEntryCategory);
		} else if (name.includes("Direct Download")) {
			data.push({
				kind: OldSiteData.TextEntryKind.DirectDownloadPlugin,
				name: lines.at(i)?.replace("(Direct Download)", "").trim() ??
					"",
				downloadUrl: url,
				description,
				filename: getFileNameFromDropdownUrl(url),
			} as OldSiteData.TextEntryPluginDirectDownload);
		} else {
			data.push({
				kind: OldSiteData.TextEntryKind.Plugin,
				name: lines.at(i) ?? "",
				url: url,
				scrapedData: null,
			} as OldSiteData.TextEntryPlugin);
		}
	}

	for await (const entry of data) {
		if (!OldSiteData.isEntryPlugin(entry)) {
			continue;
		}

		const scrapedData = await scrapeRestOfData(entry.name, entry.url).catch(
			function (e) {
				console.error(e);
				return null;
			},
		);
		if (!scrapedData) continue;

		entry.scrapedData = scrapedData;
	}

	return data;
}

/**
 * Scrapes the data from the webpage.
 */
async function scrapeRestOfData(
	name: string,
	url: string,
): Promise<ScrapeResult | null> {
	return await scrape(url).catch(function (e) {
		console.error("Could not scrape " + name + " " + url + "\n" + e);
		return null;
	});
}

/**
 * Get the arguments for the run.
 */
function getArgs(): [string, string[]] {
	const firstArgument = Deno.args.at(0);

	if (Deno.args.length < 2 || !firstArgument) {
		console.error(
			`Expected at least two arguments. The first is the output file, the remaining are the input files.
deno run OldSiteDataReader.ts <output.json> <input files.txt ...>`,
		);
		Deno.exit(1);
	}

	return [firstArgument, Deno.args.slice(1)];
}

/**
 * Main function.
 */
async function main() {
	const [outputFile, inputFiles] = getArgs();
	const result: object[] = [];

	for await (const inputFile of inputFiles) {
		const contents = (await Deno.readTextFile(inputFile)).replace(
			/\r/g,
			"",
		).trim();
		if (!contents) {
			console.warn(contents + " does not exist. Skipping.");
			continue;
		}

		const groups = contents.split("\n\n");
		for (const group of groups) {
			const data = await parseGroup(group);
			if (!data) continue;
			result.append(data);
		}

		Deno.writeTextFile(outputFile, JSON.stringify(result, null, 4));
	}
}

/**
 * Runs main function.
 */
if (import.meta.main) {
	main();
}
