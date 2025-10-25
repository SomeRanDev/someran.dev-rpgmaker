/**
 * Set `posted-date` to current date if not set already.
 */
export default function setupDate() {
	const postedDate = document.getElementById("posted-date");

	if(!postedDate || postedDate.getAttribute("datetime")) return;

	const now = new Date();
	const readable = now.toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
	postedDate.textContent = readable;
	postedDate.setAttribute(
		"datetime",
		now.toISOString().split("T")[0] ?? "",
	);
}
