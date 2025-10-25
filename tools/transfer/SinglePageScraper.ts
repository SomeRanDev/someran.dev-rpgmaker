/**
 * Scrapes various data from a single sumrndm.site plugin page.
 *
 * Recommended command to run this:
 * deno run --node-modules-dir --allow-env --allow-net tools/transfer/SinglePageScraper.ts http://sumrndm.site/plugin-page
 */

import { CheerioAPI } from "npm:cheerio@^1.1.2/slim";
import axios from "npm:axios@^1.12.2";
import { load as cheerioLoad } from "npm:cheerio@^1.1.2";

export interface ScrapeResult {
	path: string;
	title: string;
	youtubeUrl: string | null;
	date: string;
	tags: string[];
	categories: string[];
	description: string;
	downloadUrl: string;
	filename: string;
	extraFilenames: string[] | undefined;
}

export default async function scrape(url: string): Promise<ScrapeResult> {
	const res = await axios.get(url);
	const $ = cheerioLoad(res.data);
	const { downloadUrl, filename } = scrapePlugin($, url) ??
		{ downloadUrl: "", filename: "" };
	return {
		path: new URL(url).pathname.replace(/\//g, ""),
		title: $(".entry-title").text().trim(),
		youtubeUrl:
			$("iframe[src*='youtube'], iframe[src*='youtu']").attr("src")
				?.trim() || null,
		date: $("time.entry-date").text().trim(),
		tags: $(".entry-meta-tags a").map((_, el) => $(el).text().trim()).get(),
		categories: $(".entry-meta-categories a").map((_, el) =>
			$(el).text().trim()
		).get(),
		description: $(".entry-content p").eq(1).text().trim(),
		downloadUrl,
		filename,
	};
}

export function getFileNameFromDropdownUrl(url: string): string {
	return new URL(url).pathname.split("/").pop() ?? "";
}

function scrapePlugin(
	$: CheerioAPI,
	url: string,
): { downloadUrl: string; filename: string } | null {
	const downloadAnchor = $("a")
		.filter((_, el) => {
			const elHref = $(el).attr("href");
			const txt = $(el).text().trim().toLowerCase();
			return (elHref && elHref.endsWith(".js")) ||
				txt === "[download]";
		})
		.first();

	if (!downloadAnchor.length) return null;

	const urlStr = downloadAnchor.attr("href")?.trim();
	if (!urlStr) return null;

	const downloadUrl = new URL(urlStr, url).href;
	return {
		downloadUrl,
		filename: getFileNameFromDropdownUrl(downloadUrl),
	};
}

if (import.meta.main) {
	if (Deno.args.length < 1) {
		console.warn("Missing argument for URL to scrape. Aborting.");
		Deno.exit(1);
	}

	scrape(Deno.args[0]).then((data) => {
		console.log(JSON.stringify(data, null, 4));
	}).catch((err) => {
		console.error("Error scraping: ", err);
	});
}
