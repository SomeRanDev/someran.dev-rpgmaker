/**
 * Downloads all plugins from sumrndm.site to a folder provided in the command-line argument.
 *
 * Recommended command to run this:
 * deno run --allow-read --allow-write --allow-env --allow-net tools/transfer/DownloadPlugins.ts ./old_site_data/OldSiteData.json SomeRanDev/RPGMakerPluginsRepo
 */

import {
	isEntryPlugin,
	isEntryPluginDirectDownload,
	TextEntry,
} from "./OldSiteDataTypes.ts";
import { join } from "jsr:@std/path@1.1.2";

function getArgs(): [string, string] {
	if (Deno.args.length < 2) {
		console.error(`Expected argument for old_site_data.json path.
deno run Build.ts <old_site_data.json> <download_folder>`);
		Deno.exit(1);
	}
	return [Deno.args[0], Deno.args[1]];
}

async function main() {
	const [oldDataPath, downloadFolder] = getArgs();
	const oldData: TextEntry[] = JSON.parse(
		await Deno.readTextFile(oldDataPath),
	);

	for (const entry of oldData) {
		if (!isEntryPlugin(entry) && !isEntryPluginDirectDownload(entry)) {
			continue;
		}

		let downloadUrl = "";
		let pluginName = "";
		if (isEntryPlugin(entry)) {
			downloadUrl = entry.scrapedData?.downloadUrl ?? "";
			pluginName = entry.scrapedData?.filename ?? "";
		} else if (isEntryPluginDirectDownload(entry)) {
			downloadUrl = entry.downloadUrl;
			pluginName = entry.filename;
		}

		if (!downloadUrl || !pluginName) continue;

		const response = await fetch(downloadUrl);
		if (!response.ok) {
			console.error(
				`Failed to download: ${downloadUrl}
Response Code: ${response.status}
Response Status: ${response.statusText}`,
			);
			continue;
		}

		const fileData = new Uint8Array(await response.arrayBuffer());
		const pluginDownloadPath = join(downloadFolder, pluginName);
		await Deno.writeFile(pluginDownloadPath, fileData);
		console.log("Downloaded to " + pluginDownloadPath);
	}
}

if (import.meta.main) {
	main();
}
