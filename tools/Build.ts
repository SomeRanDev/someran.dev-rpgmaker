/**
 * SomeRanDev's RPG Maker Website Builder
 * https://someran.dev/rpgmaker/
 *
 * Builds the SomeRanDev RPG Maker website by combining all the necessary pieces into `public/`.
 */

import { join } from "jsr:@std/path@1.1.2";
import {
	isEntryCategory,
	isEntryPlugin,
	isEntryPluginDirectDownload,
	type TextEntry,
	type TextEntryCategory,
	TextEntryKind,
	type TextEntryPlugin,
	type TextEntryPluginDirectDownload,
} from "./transfer/OldSiteDataTypes.ts";
import { ScrapeResult } from "./transfer/SinglePageScraper.ts";
import {
	parseHeaders,
	type ParseHeadersResult,
} from "https://raw.githubusercontent.com/SomeRanDev/RPGMaker-PluginHeaderParser/refs/heads/main/Main.ts";
import hljs from "npm:highlight.js@11.11.1";
import {
	type PluginParamArrayType,
	PluginParamInnerType,
	type PluginParamStructType,
	type PluginParamType,
} from "https://raw.githubusercontent.com/SomeRanDev/RPGMaker-PluginHeaderParser/refs/heads/main/types/PluginParam.ts";

// import { SillyScript } from "npm:sillyscript@^1.0.0";

// async function getPluginsSillyCode(): Promise<string | null> {
// 	try {
// 		return await Deno.readTextFile("Plugins.silly");
// 	} catch (_) {
// 		return null;
// 	}
// }

/**
 * Returns the arguments if they are valid.
 * Crashes the program with a help message otherwise.
 */
function getArgs(): [string, string, string, string] {
	if (Deno.args.length < 3) {
		console.error(`Expected argument for old_site_data.json path.
deno run Build.ts <old_site_data.json> <plugin_template.html> <plugin_list_template.html> <output folder for plugins/list html files>`);
		Deno.exit(1);
	}
	return [Deno.args[0], Deno.args[1], Deno.args[2], Deno.args[3]];
}

/**
 * Main function.
 */
async function main() {
	// const sillyCode = await getPluginsSillyCode();
	// if (sillyCode === null) return;
	// if (sillyCode.length <= 0) return;

	// const compiler = new SillyScript();
	// const result = compiler.compile(sillyCode);

	// if (result.errors) {
	// 	for (const e of result.errors) {
	// 		console.log(compiler.getErrorString(e, { _hx_index: 0 }));
	// 	}
	// }
	// if (!result.content) return;

	const [
		oldDataPath,
		pluginTemplateHtmlPath,
		pluginListTemplateHtmlPath,
		outputHtmlPath,
	] = getArgs();
	const oldData: TextEntry[] = JSON.parse(
		await Deno.readTextFile(oldDataPath),
	);

	const pluginTemplateHtml = await Deno.readTextFile(pluginTemplateHtmlPath);
	const pluginListTemplateHtml = await Deno.readTextFile(
		pluginListTemplateHtmlPath,
	);

	const engine = { engine: "mv" };
	const entries = new Map<
		string,
		{ category: TextEntryCategory; entries: string[] }[]
	>();

	for (let i = 0; i < oldData.length; i++) {
		const entry = oldData[i];
		if (isEntryCategory(entry)) {
			const nextEntry = oldData.at(i + 1);
			let engineName = engine.engine;
			if (nextEntry && isEntryPlugin(nextEntry)) {
				engineName = nextEntry.engine;
			}
			handleEntryCategory(entry, entries, engineName);
		} else if (isEntryPlugin(entry)) {
			await handleTextEntryPlugin(
				entry,
				outputHtmlPath,
				pluginTemplateHtml,
				entries,
				engine,
			);
		} else if (isEntryPluginDirectDownload(entry)) {
		}
	}

	for (const [engine, originalHtml] of entries.entries()) {
		const html = originalHtml.filter((h) => h.entries.length > 0);

		const pluginListHtml = html.map((data) =>
			generatePrettyListCategory(
				data.category,
				data.entries.join("\n\n"),
			)
		).join("\n\n");

		Deno.writeTextFile(
			join(outputHtmlPath, engine, "index.html"),
			pluginListTemplateHtml.replace("PLUGINS", pluginListHtml)
				.replaceAll("PLUGIN_ENGINE", engine.toUpperCase()),
		);
	}
}

/**
 * Handles `TextEntryCategory`
 */
function handleEntryCategory(
	entry: TextEntryCategory,
	entries: Map<
		string,
		{ category: TextEntryCategory; entries: string[] }[]
	>,
	engine: string,
) {
	const categoryEntry = {
		category: entry,
		entries: [],
	};
	let categories = entries.get(engine);
	if (!categories) {
		categories = [categoryEntry];
		entries.set(engine, categories);
	} else {
		categories.push(categoryEntry);
	}
}

/**
 * Handles `TextEntryPlugin`
 */
async function handleTextEntryPlugin(
	entry: TextEntryPlugin,
	outputHtmlPath: string,
	pluginTemplateHtml: string,
	entries: Map<
		string,
		{ category: TextEntryCategory; entries: string[] }[]
	>,
	engine: { engine: string },
): Promise<boolean> {
	const scrapedData = entry.scrapedData;
	if (!scrapedData) {
		console.warn(`${entry.name} scraped data does not exist!`);
		return false;
	}

	engine.engine = entry.engine;

	const folder = join(
		outputHtmlPath,
		entry.engine,
		scrapedData.filename.replace(":", ""),
	);
	await Deno.mkdir(folder, { recursive: true });

	const getPluginDataResult = await getPluginData(entry, scrapedData);
	if (getPluginDataResult === null) {
		return false;
	}
	const [pluginData, pluginCode] = getPluginDataResult;

	const pluginName = scrapedData.filename || `"${entry.name}"`;

	const defaultData = pluginData.data["default"];
	if (!defaultData) {
		console.error(
			`${pluginName} does not have a default header.`,
		);
		return false;
	}

	let versionString = "1.00";
	if (defaultData.help) {
		const versionRegex = /^Version (\d+\.\d+)$/m;
		const versionRegexResult = versionRegex.exec(defaultData.help);
		if (versionRegexResult) {
			versionString = versionRegexResult[1];
		}
	} else {
		console.warn(
			`${pluginName} does not have a HELP section.`,
		);
	}

	let categories = entries.get(entry.engine);
	if (!categories) {
		categories = [{
			category: {
				kind: TextEntryKind.Category,
				name: "Unknown",
				imageUrl: "",
				description: "There is no category here.",
			},
			entries: [],
		}];
		entries.set(entry.engine, categories);
	}

	const category = categories.at(categories.length - 1);
	if (!category) return false;

	category.entries.push(
		generatePrettyListEntry(
			scrapedData.filename,
			null,
			entry.name,
			scrapedData.description,
			versionString,
			scrapedData.date,
		),
	);

	let requiredPluginHtml = "";
	if (entry.requiredPlugin) {
		requiredPluginHtml =
			`<div class="meta-item"><strong>Requires:</strong> ${entry.requiredPlugin}</div>`;
	}

	const highlightedCode =
		hljs.highlight(pluginCode.trim(), { language: "js" })
			.value;

	const githubLink =
		`https://github.com/SomeRanDev/RPGMakerPlugins/blob/master/${entry.engine}/${scrapedData.filename}`;

	let youtubeId = null;
	if (scrapedData.youtubeUrl !== null) {
		const re = /embed\/(.+)\?feature/;
		const result = re.exec(scrapedData.youtubeUrl);
		if (result) {
			youtubeId = result[1];
		}
	}

	const replacements: Record<string, string> = {
		"PLUGIN_DOWNLOAD_CODE": entry.overrideDownloadUrl
			? `window.open("${entry.overrideDownloadUrl}")`
			: `downloadGithubLink("${githubLink}", "${scrapedData.filename}")`,
		"PLUGIN_NAME": entry.name,
		"PLUGIN_RELEASE_DATE": scrapedData.date,
		"PLUGIN_ENGINE": "RPG Maker " + entry.engine.toUpperCase(),
		"PLUGIN_DESCRIPTION": scrapedData.description.replaceAll("\n", "<br>"),
		"PLUGIN_YOUTUBE": scrapedData.youtubeUrl !== null
			? generateYouTubeHTML(scrapedData.youtubeUrl)
			: "",
		"PLUGIN_VERSION": versionString,
		"PLUGIN_FILENAME": scrapedData.filename,
		"PLUGIN_SCREENSHOTS": entry.screenshots.map((s, i) =>
			`<img src="${s}" alt=${entry.name.replace(/\s+/g, "") + i} />`
		).join("\n"),
		"REQUIRES_PLUGIN": requiredPluginHtml,
		"PLUGIN_CODE":
			`<pre class="code-holder"><code class="hljs">${highlightedCode}</code></pre>`,
		"PLUGIN_PARAMS": defaultData.params.map(function (p) {
			return generatePrettyListEntry(
				p.name,
				null,
				p.text ?? p.name,
				p.desc ?? "<i>No description</i>",
				paramTypeToHumanString(p.type),
				null,
			);
		}).join("\n"),
		"PLUGIN_HELP": defaultData.help.replaceAll("\n", "<br>"),
		"PLUGIN_GITHUB_LINK": githubLink,
		"PLUGIN_TAGS": scrapedData.tags.map((tag) =>
			`<a class="button-like tag">${tag}</a>` // TOOD: Add href="./tag-page" for tags...
		).join("\n"),
		"PLUGIN_REPORT_BUG_LINK":
			`https://github.com/SomeRanDev/RPGMakerPlugins/issues/new?template=bug.yaml&engine=%22RPG%20Maker%20${entry.engine.toUpperCase()}%22&plugin_name=${scrapedData.filename}`,
		"PLUGIN_META_IMAGE": youtubeId !== null
			? `<meta property="og:image" content="https://img.youtube.com/vi/${youtubeId}/0.jpg">`
			: "",
		"PLUGIN_META_IMAGE_TWITTER": youtubeId !== null
			? `<meta property="twitter:image" content="https://img.youtube.com/vi/${youtubeId}/0.jpg">`
			: "",
	};

	let html = pluginTemplateHtml;
	for (const [key, value] of Object.entries(replacements)) {
		html = html.replaceAll(key, value);
	}

	Deno.writeTextFile(
		join(folder, "index.html"),
		html,
	);

	return true;
}

function paramTypeToHumanString(type: PluginParamType): string {
	switch (type.type) {
		case PluginParamInnerType.String:
			return "Text Input";
		case PluginParamInnerType.MultilineString:
			return "Multi-line Text Input";
		case PluginParamInnerType.Boolean:
			return "ON/OFF";
		case PluginParamInnerType.Number:
			return "Number";
		case PluginParamInnerType.File:
			return "File";
		case PluginParamInnerType.Select:
			return "Select";
		case PluginParamInnerType.Combo:
			return "Combo";
		case PluginParamInnerType.Actor:
			return "Actor";
		case PluginParamInnerType.Class:
			return "Class";
		case PluginParamInnerType.Skill:
			return "Skill";
		case PluginParamInnerType.Item:
			return "Item";
		case PluginParamInnerType.Weapon:
			return "Weapon";
		case PluginParamInnerType.Armor:
			return "Armor";
		case PluginParamInnerType.Enemy:
			return "Enemy";
		case PluginParamInnerType.Troop:
			return "Troop";
		case PluginParamInnerType.State:
			return "State";
		case PluginParamInnerType.Animation:
			return "Animation";
		case PluginParamInnerType.Tileset:
			return "Tileset";
		case PluginParamInnerType.CommonEvent:
			return "Common Event";
		case PluginParamInnerType.Switch:
			return "Switch";
		case PluginParamInnerType.Variable:
			return "Variable";
		case PluginParamInnerType.Array:
			return "Array of " +
				paramTypeToHumanString((type as PluginParamArrayType).subtype);
		case PluginParamInnerType.Struct:
			return (type as PluginParamStructType).structName + " Struct";
	}
}

function generatePrettyListEntry(
	id: string,
	img: string | null,
	name: string,
	description: string,
	circledMetadata: string,
	metadata: string | null,
): string {
	return `
		<li>
			<a class="item" type="button" data-id="${id}">
			${
		img
			? `<div class="thumb">
						<img src="${img}" />
					</div>`
			: ""
	}
				<div class="content">
					<div class="title">${name}</div>
					<div class="desc">${description}</div>
				</div>

				<div class="meta">
					<div class="version">${circledMetadata}</div>
					${metadata ? `<div class="date">${metadata}</div>` : ""}
				</div>
			</a>
		</li>`;
}

function generatePrettyListCategory(
	entry: TextEntryCategory,
	entries: string,
): string {
	return `<div class="plugin-category">
		<!--<h2>${entry.name}</h2>-->
		<div class="category-image">
			<img src="${entry.imageUrl}"></img>
		</div>
		<ul class="pretty-list" role="list">
			${entries}
		</ul>
	</div>`;
}
/**
 * Parses the plugin's metadata using my Plugin Header Parser for RPG Maker MV/MZ.
 */
async function getPluginData(
	entry: TextEntryPlugin,
	scrapedData: ScrapeResult,
): Promise<[ParseHeadersResult, string] | null> {
	const pluginCodeUrl =
		`https://raw.githubusercontent.com/SomeRanDev/RPGMakerPlugins/refs/heads/master/${entry.engine}/${scrapedData.filename}`;

	let pluginCodeResponse = await fetch(pluginCodeUrl);
	if (!pluginCodeResponse.ok) {
		if (!scrapedData.downloadUrl) {
			console.error(
				`Could not fetch code for ${scrapedData.filename}.`,
			);
			return null;
		}

		// Reattempt using `downloadUrl`
		console.error(
			`Could not fetch code for ${scrapedData.filename}, attempting downloadUrl.`,
		);
		pluginCodeResponse = await fetch(scrapedData.downloadUrl);
		if (!pluginCodeResponse.ok) {
			console.error(
				`Could not fetch code for ${scrapedData.filename} using downloadUrl (${scrapedData.downloadUrl}).`,
			);
			return null;
		}
	}

	const pluginCode = await pluginCodeResponse.text();
	const plugin: ParseHeadersResult | null = parseHeaders(pluginCode);
	if (!plugin) {
		console.error(
			`Could not get plugin data for ${scrapedData.filename}.\n`,
		);
		return null;
	}
	if (plugin.warnings.length > 0) {
		console.error(
			`There were errors with parsing the the header for ${scrapedData.filename}.\n${
				plugin.warnings.join("\n")
			}\n`,
		);
		return null;
	}

	return [plugin, plugin.remainingContent];
}

function generateYouTubeHTML(url: string): string {
	return `<div>
	<h2
		id="video-heading"
		style="margin: 0 0 8px 0; font-size: 1.05rem"
	>
		Video
	</h2>

	<div class="video-frame" id="video">
		<iframe
			src="${url}"
			title="YouTube video player"
			frameborder="0"
			allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
			referrerpolicy="strict-origin-when-cross-origin"
			allowfullscreen
		></iframe>
	</div>
</div>`;
}

if (import.meta.main) {
	main();
}
