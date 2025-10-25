declare global {
	interface Array<T> {
		append(other: T[]): void;
	}
}

Array.prototype.append = function <T>(other: T[]) {
	for (const element of other) {
		this.push(element);
	}
};

export default {};
