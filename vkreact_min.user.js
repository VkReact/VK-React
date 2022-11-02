// ==UserScript==
// @name         VK React
// @namespace    http://tampermonkey.net/
// @description  Help tool for vk
// @author       SPRAVEDLIVO
// @match        *://*/*
// @icon         https://spravedlivo.dev/static/vkreact.png
// @grant        GM_addElement
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @grant        GM_deleteValue
// @run-at       document-idle
// @version      1.0
// @connect      genius.com
// @connect      spravedlivo.dev
// @connect      vk.com
// @connect      vk-cdn.com
// @connect      vk-cdn.net
// @connect      userapi.com
// @connect      github.com
// @connect      vkuseraudio.net
// @connect      vkuservideo.net
// @require      https://raw.githubusercontent.com/VkReact/VK-React/main/vkreact.js
// @require      https://raw.githubusercontent.com/VkReact/VK-React/main/utils.js
// @require      https://raw.githubusercontent.com/VkReact/VK-React/main/icons.js
// @require      https://gist.githubusercontent.com/eralston/968809/raw/a18b38bede4e3d0e2f1c720bd1e4c010e646bb6d/DateFormat.js
// ==/UserScript==

//dev:
// @connect      localhost
// @require      file://C:\Users\SPRAVEDLIVO\Desktop\work\js\VK-React\VK-React\vkreact.js
// @require      file://C:\Users\SPRAVEDLIVO\Desktop\work\js\VK-React\VK-React\utils.js
// @require      file://C:\Users\SPRAVEDLIVO\Desktop\work\js\VK-React\VK-React\icons.js
//prod:
// @connect      spravedlivo.dev
// @require      https://raw.githubusercontent.com/VkReact/VK-React/main/vkreact.js
// @require      https://raw.githubusercontent.com/VkReact/VK-React/main/utils.js
// @require      https://raw.githubusercontent.com/VkReact/VK-React/main/icons.js

// look for source in @require urls