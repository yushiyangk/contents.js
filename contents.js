"use strict";
// contents.js
// version 0.1
// Yu Shiyang <yu.shiyang@gnayihs.uy>
// Browser compatibility: ES6
// This includes support for all current browsers with any significant market share (at least 0.1%)
const makeToC = (() => {
    const DEFAULT_LIST_TAG_NAME = "ul";
    const defaultMakeToCOptions = {
        excludeElements: [],
        linkPrefix: "",
        linkableOnly: false,
        maxDepth: null,
        itemClassName: "toc-item",
        currentItemClassName: "toc-current",
    };
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
    const listTagNames = ["ol", "ul"];
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
    function addListItem(list, heading, options) {
        const fragmentId = heading.getAttribute("id");
        if (fragmentId === null || fragmentId === "") {
            if (options.linkableOnly) {
                return null;
            }
        }
        const listItem = document.createElement("li");
        list.append(listItem);
        let tocItemContainer = listItem;
        if (fragmentId !== null && fragmentId !== "") {
            const anchor = document.createElement("a");
            anchor.setAttribute("href", `${options.linkPrefix}#${fragmentId}`);
            tocItemContainer = anchor;
            listItem.appendChild(anchor);
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
        if (content.nodeType !== Node.ELEMENT_NODE) {
            throw new Error("argument must be an Element node");
        }
        if (list === undefined) {
            list = document.createElement(DEFAULT_LIST_TAG_NAME);
        }
        if (options.maxDepth !== null && options.maxDepth <= 0) {
            console.warn("buildList: options.maxDepth is less than or equal to 0, returning empty list");
            return list;
        }
        let currentList = list;
        let currentLevelStack = [];
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
                    }
                    else if (headingLevel > lastHeadingLevel) {
                        if (options.maxDepth !== null && baseDepth + currentLevelStack.length > options.maxDepth) {
                            continue;
                        }
                        currentList = addSublist(currentList);
                        currentLevelStack.push(headingLevel);
                    }
                }
                addListItem(currentList, childElement, options);
            }
            else if (isSectioningElement(childElement)) {
                currentList = buildList(childElement, currentList, options, baseDepth + currentLevelStack.length);
            }
        }
        return list;
    }
    return (tocContainer, contentParent, options) => {
        if (contentParent === undefined) {
            contentParent = document.body;
        }
        const reifiedOptions = reifyOptions(options, defaultMakeToCOptions);
        if (isListElement(tocContainer)) {
            buildList(contentParent, tocContainer, reifiedOptions);
        }
        else {
            const list = buildList(contentParent, undefined, reifiedOptions);
            tocContainer.appendChild(list);
        }
    };
})();
