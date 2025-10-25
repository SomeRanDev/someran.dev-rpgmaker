let gallery: HTMLElement;
let screenshots: HTMLElement;
let currentScreenshot: HTMLImageElement;
let screenshotClose: HTMLElement;

/**
 * Sets up all the screenshot interaction stuff.
 */
export default function setupScreenshots() {
	gallery = document.getElementById("gallery") ?? new HTMLElement();
	screenshots = document.getElementById("screenshots") ?? new HTMLElement();
	screenshotClose = document.getElementById("screenshot-close") ?? new HTMLElement();
	currentScreenshot = (document.getElementById("current-screenshot") as HTMLImageElement) ?? new HTMLImageElement();

	gallery.addEventListener("click", onScreenshotClick);
	screenshotClose.addEventListener("click", closeScreenshotsIfOpen);
	screenshots.addEventListener("click", (e) => {
		if(e.target === screenshots) {
			closeScreenshotsIfOpen();
		}
	});
}

function openScreenshot() {
	if(!screenshots || !screenshotClose) return;
	screenshots.classList.add("open");
	screenshotClose.focus();
	document.body.style.overflow = "hidden";
}

export function closeScreenshotsIfOpen() {
	if(!screenshots) return;
	if(!screenshots.classList.contains("open")) return;
	screenshots.classList.remove("open");
	document.body.style.overflow = "";
}

function onScreenshotClick(this: HTMLElement, e: PointerEvent): any {
	const target = e.target;
	if(!target || !(target instanceof HTMLElement)) return;
	const img = target.closest("img");
	if(!img) return;
	currentScreenshot.src = img.src;
	currentScreenshot.alt = img.alt || "Screenshot";
	openScreenshot();
}
