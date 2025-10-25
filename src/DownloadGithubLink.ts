/**
 * Declare the function on global to make TypeScript shut up.
 */
declare global {
	function downloadGithubLink(link: string, filename: string): void;
}

/**
 * This is called from HTML, so let's just assign to `globalThis`.
 */
globalThis.downloadGithubLink = function(link: string, filename: string) {
	const element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8, ' + encodeURIComponent(link));
	element.setAttribute('download', filename);
	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);
}