/**
 * Declare the function on global to make TypeScript shut up.
 */
declare global {
	function downloadGithubLink(link: string, filename: string): void;
}

/**
 * This is called from HTML, so let's just assign to `globalThis`.
 */
globalThis.downloadGithubLink = async function(link: string, filename: string) {
	const response = await fetch(link);
	const blob = await response.blob();
	const blobUrl = URL.createObjectURL(blob);

	const element = document.createElement('a');
	element.setAttribute('href', blobUrl);
	element.setAttribute('download', filename);
	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);
}