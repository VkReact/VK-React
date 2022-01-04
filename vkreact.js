// ==UserScript==
// @name         VK React
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Help tool for vk
// @author       SPRAVEDLIVO
// @match        https://vk.com/*
// @icon         https://www.google.com/s2/favicons?domain=vk.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    let registerStyle = (st) => {
        let style = document.createElement("style");
        style.innerHTML = st
        document.body.appendChild(style);
    }
    window.addEventListener("load", () => {
        registerStyle(`#ads_left: {display:none;}`)
        let ref = document.getElementById("top_support_link")
        //place any icon inside 
        let item = se('<a class="top_profile_mrow" id="vk_react_menu"><div class="menu_item_icon"><img src="https://edge.dimden.dev/835d299b61.png" style="width:20px;height:20px;"></img></div>VK React</a>');
        ref.parentNode.insertBefore(item, ref.nextSibling);
    })
})();