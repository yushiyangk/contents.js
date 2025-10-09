// contents.js
// version 0.1

// Yu Shiyang <yu.shiyang@gnayihs.uy>

// Browser compatibility: ES6
// This includes support for all current browsers with any significant market share (at least 0.1%)


import slugify from "slugify";


const DEFAULT_LIST_TAG_NAME = "ul";


interface MakeToCOptions {
	excludeElements: Element[],
	linkPrefix: string,
	linkableOnly: boolean,
	maxDepth: number | null,
	itemClassName: string,
	currentItemClassName: string,
}
const defaultMakeToCOptions: MakeToCOptions = {
	excludeElements: [],
	linkPrefix: "",
	linkableOnly: false,
	maxDepth: null,
	itemClassName: "toc-item",
	currentItemClassName: "toc-current",
}

function reifyOptions<T>(options: Partial<T> | undefined, defaultOptions: T): T {
	return {
		...defaultOptions,
		...(options === undefined ? {} : options),
	};
}


function isHeadingElement(element: Element): element is HTMLHeadingElement {
	const tagName = element.tagName.toLowerCase();
	return tagName.match(/^h[1-6]$/) !== null;
}

const sectioningTagNames = ["address", "article", "aside", "footer", "header", "main", "nav", "section", "search"];  // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements#content_sectioning
function isSectioningElement(element: Element): element is HTMLElement {
	return sectioningTagNames.includes(element.tagName.toLowerCase());
}

const listTagNames = ["ol", "ul"];
function isListElement(element: Element): element is HTMLOListElement | HTMLUListElement {
	return listTagNames.includes(element.tagName.toLowerCase());
}

function getLastElementChildOfTagName(element: Element, tagName: string): Element | null {
	tagName = tagName.toLowerCase();
	for (const childElement of Array.from(element.children).reverse()) {
		if (childElement.tagName.toLowerCase() === tagName) {
			return childElement;
		}
	}
	return null;
}

function addListItem(list: HTMLOListElement | HTMLUListElement, heading: HTMLHeadingElement, linkPrefix: string = ""): HTMLLIElement {
	let fragmentId = heading.getAttribute("id");
	if (fragmentId === null || fragmentId.length === 0) {
		fragmentId = slugify(heading.innerText.trim(), { lower: true, strict: true });
		heading.setAttribute("id", fragmentId);
	}

	const listItem = document.createElement("li");
	list.append(listItem);

	const anchor = document.createElement("a");
	anchor.setAttribute("href", `${linkPrefix}#${fragmentId}`);
	for (const childNode of Array.from(heading.childNodes)) {
		// Clone a snapshot of heading
		anchor.appendChild(childNode.cloneNode(true));
	}
	listItem.appendChild(anchor);

	return listItem;
}

function addSublist(list: HTMLOListElement | HTMLUListElement): HTMLOListElement | HTMLUListElement {
	let lastListItem = getLastElementChildOfTagName(list, "li");
	if (lastListItem === null) {
		lastListItem = addListItem(list, document.createElement("h6"));  // empty heading at the lowest level at the start, so that it can be superseded by any real headings after it
	}

	const listTagName = list.tagName.toLowerCase();

	const lastListItemLastChildElement = lastListItem.lastElementChild;
	if (lastListItemLastChildElement !== null && isListElement(lastListItemLastChildElement)) {
		// Do not add a new sublist if there is already one
		return lastListItemLastChildElement;

	} else {
		const sublist = document.createElement(listTagName) as HTMLOListElement | HTMLUListElement;
		lastListItem.appendChild(sublist);

		return sublist;
	}
}


function buildList(
	content: Element,
	list?: HTMLOListElement | HTMLUListElement,
	options: MakeToCOptions = {...defaultMakeToCOptions},
	isSublist: boolean = false,
): HTMLOListElement | HTMLUListElement {
	if (content.nodeType !== Node.ELEMENT_NODE) {
		throw new Error("argument must be an Element node");
	}
	if (list === undefined) {
		list = document.createElement(DEFAULT_LIST_TAG_NAME);
	}

	let currentList = list;
	let currentLevelStack: number[] = [];

	for (const childElement of Array.from(content.children)) {
		// Use a snapshot of content

		let excluded = false;
		for (const excludeElement of options.excludeElements) {
			if (childElement.isSameNode(excludeElement)) {
				excluded = true;
				break;
			}
		}
		if (excluded) {
			continue;
		}

		if (isHeadingElement(childElement)) {
			const headingTagName = childElement.tagName.toLowerCase();
			const headingLevel = parseInt(headingTagName[1]);

			if (currentLevelStack.length === 0) {
				if (isSublist) {
					currentList = addSublist(currentList);
				}
				currentLevelStack.push(headingLevel);

			} else {
				const lastHeadingLevel = currentLevelStack[currentLevelStack.length - 1];

				if (headingLevel < lastHeadingLevel) {
					while (currentLevelStack.length > 1 && headingLevel < lastHeadingLevel) {
						const parentList = currentList.parentElement;
						if (parentList === null || !(parentList instanceof HTMLUListElement || parentList instanceof HTMLOListElement)) {
							throw new Error("parent of sublist is not a valid list element");
						}
						currentList = parentList;
						currentLevelStack.pop();
					}
					if (headingLevel < lastHeadingLevel) {
						if (currentLevelStack.length !== 1) {
							throw new Error("currentLevelStack should only have one element");
						}
						currentLevelStack[0] = headingLevel;
					}

				} else if (headingLevel > lastHeadingLevel) {
					currentList = addSublist(currentList);
					currentLevelStack.push(headingLevel);
				}
			}

			addListItem(currentList, childElement, options.linkPrefix);

		} else if (isSectioningElement(childElement)) {
			currentList = buildList(
				childElement,
				currentList,
				options,
				currentLevelStack.length > 0 || isSublist,
			);
		}
	}

	return list;
}


export default function makeToC(
	tocElement: Element,
	contentParent?: Element,
	options?: Partial<MakeToCOptions>,
): void {
	if (contentParent === undefined) {
		contentParent = document.body;
	}

	const reifiedOptions = reifyOptions(options, defaultMakeToCOptions);

	const list = buildList(contentParent, undefined, reifiedOptions);
	tocElement.appendChild(list);
}
