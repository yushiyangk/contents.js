// contents.js
// version 0.1
// Yu Shiyang <yu.shiyang@gnayihs.uy>
// Browser compatibility: ES6
// This includes support for all current browsers with any significant market share (at least 0.1%)
import slugify from "slugify";
function isHeading(childElement) {
    const tagName = childElement.tagName.toLowerCase();
    return tagName.match(/^h[1-6]$/) !== null;
}
function addListItem(list, heading, linkPrefix = "") {
    const listItem = document.createElement("li");
    list.append(listItem);
    const anchor = document.createElement("a");
    const slug = slugify(heading.innerText.trim(), { lower: true, strict: true });
    anchor.setAttribute("href", `${linkPrefix}#${slug}`);
    for (const childNode of Array.from(heading.childNodes)) {
        // Clone a snapshot of heading
        anchor.appendChild(childNode.cloneNode(true));
    }
    listItem.appendChild(anchor);
    return listItem;
}
function addSublist(list) {
    let lastListItem = list.lastElementChild;
    if (lastListItem === null) {
        lastListItem = addListItem(list, document.createElement("h6")); // empty heading at the lowest level at the start, so that it can be superseded by any real headings after it
    }
    const listTagName = list.tagName.toLowerCase();
    const sublist = document.createElement(listTagName);
    lastListItem.appendChild(sublist);
    return sublist;
}
function buildList(content, list, linkPrefix = "") {
    if (content.nodeType !== Node.ELEMENT_NODE) {
        throw new Error("argument must be an Element node");
    }
    if (list === undefined) {
        list = document.createElement("ol");
    }
    let currentList = list;
    let currentLevelStack = [];
    for (const childElement of Array.from(content.children)) {
        // Use a snapshot of content
        if (isHeading(childElement)) {
            const headingTagName = childElement.tagName.toLowerCase();
            const headingLevel = parseInt(headingTagName[1]);
            if (currentLevelStack.length === 0) {
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
                    currentList = addSublist(currentList);
                    currentLevelStack.push(headingLevel);
                }
            }
            addListItem(currentList, childElement, linkPrefix);
        }
        else {
            buildList(childElement, currentList);
        }
    }
    return list;
}
export default function makeToC(tocElement, contentParent) {
    if (contentParent === undefined) {
        contentParent = document.body;
    }
    const list = buildList(contentParent, undefined, "");
    tocElement.appendChild(list);
}
