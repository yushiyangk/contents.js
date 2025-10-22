"use strict";
// contents.js
// version 0.1.3
// Yu Shiyang <yu.shiyang@gnayihs.uy>
// Browser compatibility: ES6
// This includes support for all current browsers with any significant market share (at least 0.1%)
const makeToC = (() => {
    const DEFAULT_LIST_TAG_NAME = "ul";
    const SCROLL_UPDATE_RATE_MS = 100;
    const WINDOW_ONLOAD_UPDATE_DELAY_MS = 1000;
    const defaultMakeToCOptions = {
        excludeElements: [],
        margin: 0,
        linkPrefix: "",
        linkableOnly: false,
        maxDepth: null,
        currentItemLabel: null,
        currentItemLabelPreamble: "",
        itemClassName: "toc-item",
        currentItemClassName: "toc-current",
        depthDataAttribute: "data-toc-depth",
    };
    function validateMakeToCOptions(options) {
        for (let i = 0; i < options.excludeElements.length; i++) {
            if (!(options.excludeElements[i] instanceof Element)) {
                throw new Error(`options.excludeElements[${i}] is not an Element, got ${options.excludeElements[i]}`);
            }
        }
        if (options.maxDepth !== null && !Number.isInteger(options.maxDepth)) {
            throw new Error(`options.maxDepth must be an integer or null, got ${options.maxDepth}`);
        }
        if (options.depthDataAttribute !== null && !options.depthDataAttribute.startsWith("data-")) {
            throw new Error(`options.depthDataAttribute must start with 'data-', got '${options.depthDataAttribute}'`);
        }
        return true;
    }
    function reifyOptions(options, defaultOptions) {
        return Object.assign(Object.assign({}, defaultOptions), (options === undefined ? {} : options));
    }
    function isHeadingElement(element) {
        const tagName = element.tagName.toLowerCase();
        return tagName.match(/^h[1-6]$/) !== null;
    }
    const sectioningTagNames = ["address", "article", "aside", "footer", "header", "main", "nav", "section", "search"]; // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements#content_sectioning
    function isSectioningElement(element) {
        return sectioningTagNames.includes(element.tagName.toLowerCase());
    }
    const listTagNames = ["ul", "menu", "ol"];
    function isListElement(element) {
        return listTagNames.includes(element.tagName.toLowerCase());
    }
    function getLastElementChildOfTagName(element, tagName) {
        tagName = tagName.toLowerCase();
        for (const childElement of Array.from(element.children).reverse()) {
            if (childElement.tagName.toLowerCase() === tagName) {
                return childElement;
            }
        }
        return null;
    }
    function addListItem(list, heading, depth, options) {
        const fragmentId = heading.getAttribute("id");
        if (fragmentId === null || fragmentId === "") {
            if (options.linkableOnly) {
                return null;
            }
        }
        if (!Number.isInteger(depth) || depth <= 0) {
            throw new Error("depth must be a positive integer");
        }
        const listItem = document.createElement("li");
        if (options.itemClassName !== null) {
            listItem.classList.add(options.itemClassName);
        }
        if (options.depthDataAttribute !== null) {
            listItem.setAttribute(options.depthDataAttribute, depth.toString());
        }
        list.append(listItem);
        let tocItemContainer = listItem;
        if (fragmentId !== null && fragmentId !== "") {
            const anchor = document.createElement("a");
            anchor.setAttribute("href", `${options.linkPrefix}#${fragmentId}`);
            tocItemContainer.appendChild(anchor);
            tocItemContainer = anchor;
        }
        // Clone a snapshot of heading to tocItemContainer
        for (const childNode of Array.from(heading.childNodes)) {
            tocItemContainer.appendChild(childNode.cloneNode(true));
        }
        return listItem;
    }
    function addSublist(list) {
        let lastListItem = getLastElementChildOfTagName(list, "li");
        if (lastListItem === null) {
            throw new Error("cannot add sublist to a list without any list items");
        }
        const listTagName = list.tagName.toLowerCase();
        const lastListItemLastChildElement = lastListItem.lastElementChild;
        if (lastListItemLastChildElement !== null && isListElement(lastListItemLastChildElement)) {
            // Do not add a new sublist if there is already one
            return lastListItemLastChildElement;
        }
        else {
            const sublist = document.createElement(listTagName);
            lastListItem.appendChild(sublist);
            return sublist;
        }
    }
    function buildList(content, list, options = Object.assign({}, defaultMakeToCOptions), baseDepth = 1) {
        var _a, _b;
        if (content.nodeType !== Node.ELEMENT_NODE) {
            throw new Error("argument must be an Element node");
        }
        if (list === undefined) {
            list = document.createElement(DEFAULT_LIST_TAG_NAME);
        }
        if (options.maxDepth !== null && options.maxDepth <= 0) {
            console.warn("buildList: options.maxDepth is less than or equal to 0, returning empty list");
            return [list, []];
        }
        if (!Number.isInteger(baseDepth) || baseDepth <= 0) {
            throw new Error("baseDepth must be a positive integer");
        }
        let currentList = list;
        const currentLevelStack = [];
        const listedHeadings = [];
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
                    if (options.maxDepth !== null && baseDepth > options.maxDepth) { // baseDepth + currentLevelStack.length, but the latter is 0
                        continue;
                    }
                    if (baseDepth > 1) { // if in a sublist
                        currentList = addSublist(currentList);
                    }
                    currentLevelStack.push(headingLevel);
                }
                else {
                    const lastHeadingLevel = currentLevelStack[currentLevelStack.length - 1];
                    if (headingLevel < lastHeadingLevel) {
                        while (currentLevelStack.length > 1 && headingLevel < lastHeadingLevel) {
                            const parentList = (_b = (_a = currentList.parentElement) === null || _a === void 0 ? void 0 : _a.closest("ul, ol")) !== null && _b !== void 0 ? _b : null;
                            if (parentList === null || !isListElement(parentList)) {
                                throw new Error("ancestor of sublist is not a valid list element");
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
                    }
                    else if (headingLevel > lastHeadingLevel) {
                        if (options.maxDepth !== null && baseDepth + currentLevelStack.length > options.maxDepth) {
                            continue;
                        }
                        currentList = addSublist(currentList);
                        currentLevelStack.push(headingLevel);
                    }
                }
                addListItem(currentList, childElement, baseDepth + currentLevelStack.length - 1, options);
                listedHeadings.push(childElement);
            }
            else if (isSectioningElement(childElement)) {
                const [newCurrentList, sublistedHeadings] = buildList(childElement, currentList, options, baseDepth + currentLevelStack.length);
                currentList = newCurrentList;
                listedHeadings.push(...sublistedHeadings);
            }
        }
        return [list, listedHeadings];
    }
    function flattenListElement(list) {
        return Array.from(list.querySelectorAll("li"));
    }
    function registerObservers(tocList, listedHeadings, contentParent, options) {
        if (options.currentItemClassName === null) {
            return;
        }
        const listItems = flattenListElement(tocList);
        let currentIndex = -1;
        let headingLinks = [];
        const currentItemLabel = options.currentItemLabel;
        let margin = options.margin;
        if (typeof margin === "string") {
            const dummyDiv = document.createElement("div");
            dummyDiv.style.position = "absolute";
            dummyDiv.style.visibility = "hidden";
            dummyDiv.style.width = margin;
            document.body.appendChild(dummyDiv);
            margin = dummyDiv.offsetWidth;
            dummyDiv.remove();
        }
        let rateLimit = false;
        const updateCurrentHeading = () => {
            if (rateLimit) {
                return;
            }
            rateLimit = true;
            setTimeout(() => {
                rateLimit = false;
            }, SCROLL_UPDATE_RATE_MS);
            const scrollPosition = window.scrollY + margin;
            let low = 0;
            let high = headingLinks.length - 1;
            let mid = -1;
            while (low <= high) {
                mid = low + Math.floor((high - low) / 2);
                if (headingLinks[mid].position === scrollPosition) {
                    break;
                }
                else if (headingLinks[mid].position > scrollPosition) {
                    high = mid - 1;
                }
                else {
                    low = mid + 1;
                }
            }
            while (mid >= 0 && headingLinks[mid].position > scrollPosition) {
                mid--;
            }
            // Check against live heading positions in case memoised position is outdated
            while (mid < headingLinks.length - 1 && headingLinks[mid + 1].position <= scrollPosition) {
                mid++;
            }
            if (mid < 0) {
                if (currentIndex >= 0) {
                    if (options.currentItemClassName !== null && currentIndex >= 0 && currentIndex < headingLinks.length) {
                        headingLinks[currentIndex].listItem.classList.remove(options.currentItemClassName);
                    }
                    if (currentItemLabel !== null) {
                        currentItemLabel.innerText = options.currentItemLabelPreamble; // Remove all child nodes
                    }
                    currentIndex = -1;
                }
            }
            else {
                if (currentIndex !== mid) {
                    if (options.currentItemClassName !== null) {
                        if (currentIndex >= 0 && currentIndex < headingLinks.length) {
                            headingLinks[currentIndex].listItem.classList.remove(options.currentItemClassName);
                        }
                        headingLinks[mid].listItem.classList.add(options.currentItemClassName);
                    }
                    if (currentItemLabel !== null) {
                        currentItemLabel.innerText = ""; // Remove all child nodes
                        let currentItemContainer = currentItemLabel;
                        const fragmentId = headingLinks[mid].heading.getAttribute("id");
                        if (fragmentId !== null && fragmentId !== "") {
                            const anchor = document.createElement("a");
                            anchor.setAttribute("href", `${options.linkPrefix}#${fragmentId}`);
                            currentItemContainer.appendChild(anchor);
                            currentItemContainer = anchor;
                        }
                        for (const childNode of Array.from(headingLinks[mid].heading.childNodes)) {
                            currentItemContainer.appendChild(childNode.cloneNode(true));
                        }
                    }
                    currentIndex = mid;
                }
            }
        };
        const updateHeadingPositions = () => {
            console.log("updateHeadingPositions");
            headingLinks = listedHeadings.map((heading, i) => ({
                heading: heading,
                position: heading.getBoundingClientRect().top + window.scrollY,
                listItem: listItems[i],
            }));
            headingLinks.sort((a, b) => a.position - b.position);
            updateCurrentHeading();
        };
        window.addEventListener("load", updateHeadingPositions);
        window.addEventListener("load", () => {
            setTimeout(updateHeadingPositions, WINDOW_ONLOAD_UPDATE_DELAY_MS);
        });
        window.addEventListener("resize", updateHeadingPositions);
        const mutationObserver = new MutationObserver(updateHeadingPositions);
        mutationObserver.observe(contentParent, {
            subtree: true,
            childList: true,
            attributes: true,
            characterData: true,
        });
        for (const listItem of listItems) {
            listItem.querySelectorAll("a").forEach((anchor) => {
                anchor.addEventListener("click", updateHeadingPositions);
            });
        }
        document.addEventListener("scroll", updateCurrentHeading);
    }
    return (tocContainer, contentParent, options) => {
        if (contentParent === undefined) {
            contentParent = document.body;
        }
        const reifiedOptions = reifyOptions(options, defaultMakeToCOptions);
        validateMakeToCOptions(reifiedOptions);
        if (isListElement(tocContainer)) {
            const [tocList, listedHeadings] = buildList(contentParent, tocContainer, reifiedOptions);
            registerObservers(tocList, listedHeadings, contentParent, reifiedOptions);
        }
        else {
            const [tocList, listedHeadings] = buildList(contentParent, undefined, reifiedOptions);
            tocContainer.appendChild(tocList);
            registerObservers(tocList, listedHeadings, contentParent, reifiedOptions);
        }
    };
})();
