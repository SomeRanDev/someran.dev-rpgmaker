/**
 * Generate Redirects for sumrndm.site
 * https://sumrndm.site/
 *
 * This generates redirection .html files for every old page on https://sumrndm.site to they
 * redirect to their corresponding new page on https://someran.dev/rpgmaker
 */

import { exists } from "jsr:@std/fs/exists";
import { join } from "jsr:@std/path";
import {
	isEntryPlugin,
	type TextEntry,
} from "./transfer/OldSiteDataTypes.ts";

/**
 * Returns the arguments if they are valid.
 * Crashes the program with a help message otherwise.
 */
function getArgs(): [string, string] {
	if (Deno.args.length < 2) {
		console.error(
			`Expected argument for old_site_data.json path and an output path.
deno run RedirectorGenerator.ts <old_site_data.json> <output_folder>`,
		);
		Deno.exit(1);
	}
	return [Deno.args[0], Deno.args[1]];
}

/**
 * Main function.
 */
async function main() {
	const [oldDataPath, outputFolder] = getArgs();
	const oldData: TextEntry[] = JSON.parse(
		await Deno.readTextFile(oldDataPath),
	);

	const redirects: Record<string, string> = {
		"": "",
		"mv-plugins": "plugins/mv",
		"mz-plugins": "plugins/mz",
		"report-bug": "bug",
		"terms-of-use": "terms",
		"contact-me": "",
		"discord": "discord",
	};

	let redirectCount = 0;

	for (const entry of oldData) {
		if (!isEntryPlugin(entry)) continue;

		const scrapedData = entry.scrapedData;
		if (!scrapedData) continue;

		const re = /http:\/\/sumrndm\.site\/([\w\d\-]+)\/?/;
		const result = re.exec(entry.url);
		if (!result) continue;
		const folderPath = result[1];

		redirects[folderPath] =
			`plugins/${entry.engine.toLowerCase()}/${scrapedData.filename}`;
	}

	for (const [originalUrl, newUrl] of Object.entries(redirects)) {
		const folder = originalUrl.length === 0
			? outputFolder
			: join(outputFolder, originalUrl);
		if (!await exists(folder)) {
			await Deno.mkdir(folder, { recursive: true });
		}

		await Deno.writeTextFile(
			join(folder, "index.html"),
			`<meta http-equiv="Refresh" content="0; url='https://someran.dev/rpgmaker/${newUrl}'" />`,
		);

		redirectCount++;
	}

	console.log(`Generated ${redirectCount} redirects!`);
}

if (import.meta.main) {
	main();
}
