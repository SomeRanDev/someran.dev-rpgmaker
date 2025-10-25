import setupDate from "./Date";
import setupTabs from "./Tabs";
import setupScreenshots, { closeScreenshotsIfOpen } from "./Screenshots";
import "./DownloadGithubLink";

setupDate();
setupTabs();
setupScreenshots();

document.addEventListener("keydown", (e) => {
	if(e.key === "Escape") {
		closeScreenshotsIfOpen();
	}
});


