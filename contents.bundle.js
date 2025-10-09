"use strict";
var makeToC = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // contents.ts
  var contents_exports = {};
  __export(contents_exports, {
    default: () => makeToC
  });
  var DEFAULT_LIST_TAG_NAME = "ul";
  var defaultMakeToCOptions = {
    excludeElements: [],
    linkPrefix: "",
    linkableOnly: false,
    maxDepth: null,
    itemClassName: "toc-item",
    currentItemClassName: "toc-current"
  };
  function reifyOptions(options, defaultOptions) {
    return __spreadValues(__spreadValues({}, defaultOptions), options === void 0 ? {} : options);
  }
  function isHeadingElement(element) {
    const tagName = element.tagName.toLowerCase();
    return tagName.match(/^h[1-6]$/) !== null;
  }
  var sectioningTagNames = ["address", "article", "aside", "footer", "header", "main", "nav", "section", "search"];
  function isSectioningElement(element) {
    return sectioningTagNames.includes(element.tagName.toLowerCase());
  }
  var listTagNames = ["ol", "ul"];
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
  function addListItem(list, heading, linkPrefix = "") {
    let fragmentId = heading.getAttribute("id");
    const listItem = document.createElement("li");
    list.append(listItem);
    let tocItemContainer = listItem;
    if (fragmentId !== null && fragmentId !== "") {
      const anchor = document.createElement("a");
      anchor.setAttribute("href", `${linkPrefix}#${fragmentId}`);
      tocItemContainer = anchor;
      listItem.appendChild(anchor);
    }
    for (const childNode of Array.from(heading.childNodes)) {
      tocItemContainer.appendChild(childNode.cloneNode(true));
    }
    return listItem;
  }
  function addSublist(list) {
    let lastListItem = getLastElementChildOfTagName(list, "li");
    if (lastListItem === null) {
      lastListItem = addListItem(list, document.createElement("h6"));
    }
    const listTagName = list.tagName.toLowerCase();
    const lastListItemLastChildElement = lastListItem.lastElementChild;
    if (lastListItemLastChildElement !== null && isListElement(lastListItemLastChildElement)) {
      return lastListItemLastChildElement;
    } else {
      const sublist = document.createElement(listTagName);
      lastListItem.appendChild(sublist);
      return sublist;
    }
  }
  function buildList(content, list, options = __spreadValues({}, defaultMakeToCOptions), isSublist = false) {
    if (content.nodeType !== Node.ELEMENT_NODE) {
      throw new Error("argument must be an Element node");
    }
    if (list === void 0) {
      list = document.createElement(DEFAULT_LIST_TAG_NAME);
    }
    let currentList = list;
    let currentLevelStack = [];
    for (const childElement of Array.from(content.children)) {
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
          currentLevelStack.length > 0 || isSublist
        );
      }
    }
    return list;
  }
  function makeToC(tocElement, contentParent, options) {
    if (contentParent === void 0) {
      contentParent = document.body;
    }
    const reifiedOptions = reifyOptions(options, defaultMakeToCOptions);
    const list = buildList(contentParent, void 0, reifiedOptions);
    tocElement.appendChild(list);
  }
  return __toCommonJS(contents_exports);
})();
makeToC = makeToC.default;
