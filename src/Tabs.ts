/**
 * Sets up the "Screenshots"/"Description"/etc tabs at the bottom of the page.
 */
export default function setupTabs() {
	const tabs = Array.from(document.querySelectorAll(".tab")).filter(t => t instanceof HTMLElement);

	tabs.forEach((t, index) => {
		t.addEventListener("click", () => selectTab(tabs, index));
		t.addEventListener("keydown", (e) => {
			const index = tabs.indexOf(t);
			let newIndex = -1;
			if(e.key === "ArrowRight") newIndex = (index + 1) % tabs.length;
			if(e.key === "ArrowLeft") newIndex = (index - 1 + tabs.length) % tabs.length;
			if(newIndex >= 0) {
				selectTab(tabs, newIndex);
			}
		});
	});
}

function selectTab(tabs: HTMLElement[], tabIndex: number) {
	tabs.forEach((t, index) => {
		const selected = tabIndex === index;
		t.setAttribute("data-selected", selected ? "true" : "false");

		const panelId = t.getAttribute("data-controls");
		if(!panelId) return;
		const panel = document.getElementById(panelId);
		panel?.setAttribute("data-visible", selected ? "true" : "false");
	});

	tabs[tabIndex]?.focus();
}
