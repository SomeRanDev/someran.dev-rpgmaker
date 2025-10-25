/**
 * Types used to represent the simple format found in REPO/old_site_data txt files.
 *
 * This file cannot be executed alone.
 */

import { ScrapeResult } from "./SinglePageScraper.ts";

export enum TextEntryKind {
	Category,
	Plugin,
	DirectDownloadPlugin,
}

export interface TextEntry {
	kind: TextEntryKind;
	name: string;
}

export interface TextEntryCategory extends TextEntry {
	kind: TextEntryKind.Category;
	imageUrl: string;
	description: string;
}

export interface TextEntryPlugin extends TextEntry {
	kind: TextEntryKind.Plugin;
	url: string;
	scrapedData: ScrapeResult | null;
	engine: string;
	screenshots: string[];
	overrideDownloadUrl: string | undefined;
	requiredPlugin: string | undefined;
}

export interface TextEntryPluginDirectDownload extends TextEntry {
	kind: TextEntryKind.DirectDownloadPlugin;
	description: string;
	downloadUrl: string;
	filename: string;
	engine: string;
	screenshots: string[];
}

export function isEntryCategory(
	entry: TextEntry,
): entry is TextEntryCategory {
	return entry.kind === TextEntryKind.Category;
}

export function isEntryPlugin(entry: TextEntry): entry is TextEntryPlugin {
	return entry.kind === TextEntryKind.Plugin;
}

export function isEntryPluginDirectDownload(
	entry: TextEntry,
): entry is TextEntryPluginDirectDownload {
	return entry.kind === TextEntryKind.DirectDownloadPlugin;
}
