// ==UserScript==
// @name         VK React
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Help tool for vk
// @author       SPRAVEDLIVO
// @match        https://vk.com/*
// @icon         https://edge.dimden.dev/835d299b61.png
// @grant        GM_addElement
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-idle
// @require      https://cdn.jsdelivr.net/npm/vue@2
// @connect      localhost
// @require      file://C:\Users\SPRAVEDLIVO\Desktop\work\js\VK React\VK-React\vkreact.js
// @require      https://gist.githubusercontent.com/eralston/968809/raw/a18b38bede4e3d0e2f1c720bd1e4c010e646bb6d/DateFormat.js
// ==/UserScript==

// god object pack bozo rip watch
var VKReact = {
    plugins: {},
    apiURL: 'http://localhost/vkreact',
    htmls: {},
    modal_window: '',
    insertAfter: function(ref, item) {
        ref.parentNode.insertBefore(item, ref.nextSibling)
    },
    registerMenu: function () {
        let ref = document.getElementById("top_support_link")
        //place any icon inside 
        let item = se('<a class="top_profile_mrow" id="vk_react_menu"><div class="menu_item_icon"><img src="https://edge.dimden.dev/835d299b61.png" style="width:20px;height:20px;"></img></div>VK React</a>');
        item.addEventListener("click", this.showVkReactSettings)
        this.insertAfter(ref, item);
    },
    registerLeftMenu: function () {
        let ol = document.getElementsByClassName("side_bar_ol")[0]
        ol.appendChild(se("<div class='more_div'>"))
        let element = se(`<li id="l_vkcc"></div>
        <a class="left_row">
        <div class="LeftMenu__icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="height: 20px;width: 20px;"><g fill="none" fill-rule="evenodd"><path d="M0 0h24v24H0z"></path><path d="M10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0a5.003 5.003 0 010-7.07l3.54-3.54a5.003 5.003 0 017.07 0 5.003 5.003 0 010 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 000-4.24 2.982 2.982 0 00-4.24 0l-3.53 3.53a2.982 2.982 0 000 4.24zm2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 010 7.07l-3.54 3.54a5.003 5.003 0 01-7.07 0 5.003 5.003 0 010-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 000 4.24 2.982 2.982 0 004.24 0l3.53-3.53a2.982 2.982 0 000-4.24.973.973 0 010-1.42z" fill="currentColor" fill-rule="nonzero"></path></g></svg></div>
        <span class="left_label inl_bl">Сократить ссылку</span>
        </a></li>`)
        element.addEventListener("click", this.shortifyLink)
        ol.appendChild(element)
    },
    shortifyLink: function () {
        let html = `
            <div id="enterlinkhere">
                <input type="text" placeholder="Ссылка" id="enteredlink">
                <button id="submitbutton">Сократить</button>
                <span id="submitresult">Ошибка</span>
                <svg id="submiticon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;"><path d="M9.2 3c-1.285 0-2.158.001-2.833.056-.658.054-.994.151-1.229.271a3 3 0 00-1.311 1.311c-.12.235-.217.57-.27 1.229C3.5 6.542 3.5 7.415 3.5 8.7v2.6c0 .585.001.933.022 1.191.01.11.02.176.028.212v.097c0 .761 0 1.264.068 1.642a1.723 1.723 0 01-.526-.16 2 2 0 01-.874-.874C2 12.98 2 12.42 2 11.3V8.7c0-2.52 0-3.78.49-4.743A4.5 4.5 0 014.457 1.99C5.42 1.5 6.68 1.5 9.2 1.5h2c1.12 0 1.68 0 2.108.218a2 2 0 01.874.874c.07.137.117.288.15.466C13.96 3 13.472 3 12.75 3H9.2z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M5.1 7.7c0-1.12 0-1.68.218-2.108a2 2 0 01.874-.874C6.62 4.5 7.18 4.5 8.3 4.5h6c1.12 0 1.68 0 2.108.218a2 2 0 01.874.874c.218.428.218.988.218 2.108v7.6c0 1.12 0 1.68-.218 2.108a2 2 0 01-.874.874c-.428.218-.988.218-2.108.218h-6c-1.12 0-1.68 0-2.108-.218a2 2 0 01-.874-.874C5.1 16.98 5.1 16.42 5.1 15.3V7.7zM8.3 6h6c.585 0 .933.001 1.191.022.158.013.224.03.242.036a.5.5 0 01.21.209c.005.018.022.084.035.242.02.258.022.606.022 1.191v7.6c0 .585-.001.933-.022 1.191-.013.158-.03.224-.036.242a.5.5 0 01-.209.21 1.253 1.253 0 01-.242.035c-.258.02-.606.022-1.191.022h-6c-.585 0-.933-.001-1.191-.022a1.253 1.253 0 01-.242-.036.5.5 0 01-.21-.209 1.255 1.255 0 01-.035-.242c-.02-.258-.022-.606-.022-1.191V7.7c0-.585.001-.933.022-1.191.013-.158.03-.224.036-.242a.5.5 0 01.209-.21c.018-.005.084-.022.242-.035C7.367 6.002 7.715 6 8.3 6zm7.438.06l-.003-.002.003.001zm.203.202v.003-.003zm0 10.476v-.003a.014.014 0 010 .003zm-.203.203h-.003.003zm-8.876 0h.003-.003zm-.203-.203v-.003.003zm0-10.476v0zm.203-.203h.003a.05.05 0 00-.003 0z" fill="currentColor"></path></svg>
            </div>
        `
        new MessageBox({ title: "Сокращение ссылкок", width: 500, hideButtons: true, bodyStyle: 'padding:20px;height:222' }).content(html).show()
        let shown = false
        document.getElementById("submiticon").addEventListener("click", () => {
            if (!VKReact.last_short) return
            navigator.clipboard.writeText(VKReact.last_short)
            Notifier.showEvent({
                title: "VK React",
                text: `Успешно скопировано!`,
            })
        })
        document.getElementById("submitbutton").addEventListener("click", async () => {
            let result = await fetch(`${VKReact.apiURL}/get_short_link`, {
				headers: {
				  'Content-Type': 'application/json'
				},
				method: "POST", 
				body: JSON.stringify({"link": document.getElementById("enteredlink").value})
			  })
            let json = await result.json()
            let code = json["result"] == "bad" ? "Ошибка" : json["result"]
            let submitresult = document.getElementById("submitresult")
            if (!shown) {
                submitresult.style.visibility = "visible";
                submitresult.style.opacity = 1;
                let submiticon = document.getElementById("submiticon")
                submiticon.style.visibility = "visible";
                submiticon.style.opacity = 1;
            }
            if (code != "bad") {
                VKReact.last_short = code
            }
            submitresult.textContent = code;
        })
    },
    showVkReactSettings: function () {
        let html = `
        <div id="app">
            <div id="mainmenu" v-if="modal_window==''">
                <div class="jcat menuitem">
                    <div class="jcatcontent" @click="modal_window='feed'">
                        <svg id="jcaticon" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="width: 28px; height: 28px;"><g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g id="newsfeed_outline_28"><rect x="0" y="0" width="28" height="28"></rect><path d="M17.590287,3.00000006 C19.7732933,3.00000006 20.8230261,3.20271282 21.9137131,3.78601861 C22.9027964,4.31498614 23.6850139,5.09720363 24.2139814,6.08628691 C24.7972872,7.17697392 25.0000001,8.22670674 25.0000001,10.409713 L25.0000001,17.590287 C25.0000001,19.7732933 24.7972872,20.8230261 24.2139814,21.9137131 C23.6850139,22.9027964 22.9027964,23.6850139 21.9137131,24.2139814 C20.8230261,24.7972872 19.7732933,25.0000001 17.590287,25.0000001 L10.409713,25.0000001 C8.22670674,25.0000001 7.17697392,24.7972872 6.08628691,24.2139814 C5.09720363,23.6850139 4.31498614,22.9027964 3.78601861,21.9137131 C3.20271282,20.8230261 3.00000006,19.7732933 3.00000006,17.590287 L3.00000006,10.409713 C3.00000006,8.22670674 3.20271282,7.17697392 3.78601861,6.08628691 C4.31498614,5.09720363 5.09720363,4.31498614 6.08628691,3.78601861 C7.17697392,3.20271282 8.22670674,3.00000006 10.409713,3.00000006 L17.590287,3.00000006 Z M4.99898867,10.9999996 L4.99999994,17.590287 C4.99999994,19.4713639 5.14247912,20.2091816 5.5496449,20.9705154 C5.89221284,21.6110618 6.38893822,22.1077872 7.02948457,22.4503551 C7.7908184,22.8575209 8.52863614,22.9999999 10.409713,22.9999999 L17.590287,22.9999999 C19.4713639,22.9999999 20.2091816,22.8575209 20.9705154,22.4503551 C21.6110618,22.1077872 22.1077872,21.6110618 22.4503551,20.9705154 C22.8575209,20.2091816 22.9999999,19.4713639 22.9999999,17.590287 L22.9990001,11.0000001 L4.99898867,10.9999996 L4.99898867,10.9999996 Z M17.590287,4.99999994 L10.409713,4.99999994 C8.52863614,4.99999994 7.7908184,5.14247912 7.02948457,5.5496449 C6.38893822,5.89221284 5.89221284,6.38893822 5.5496449,7.02948457 C5.2640519,7.56349707 5.10868095,8.08593997 5.04135983,8.99945251 L22.9586401,8.99945251 C22.891319,8.08593997 22.7359481,7.56349707 22.4503551,7.02948457 C22.1077872,6.38893822 21.6110618,5.89221284 20.9705154,5.5496449 C20.2091816,5.14247912 19.4713639,4.99999994 17.590287,4.99999994 Z" id="↳-Icon-Color" fill="currentColor" fill-rule="nonzero"></path></g></g></svg>
                        <span id="jcattext">Лента новостей</span>
                        <span id="jcatundertext" v-if="feed_disable_ads">Реклама: отключена</span>
                        <span id="jcatundertext" v-else>Реклама: включена</span>
                    </div>
                </div>
                <div class="jcat menuitem right">
                    <div class="jcatcontent" @click="modal_window='server'">
                        <svg fill="none" id="jcaticon" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" style="width: 28px; height: 28px;"><path fill-rule="evenodd" clip-rule="evenodd" d="M15.793 8.115a2 2 0 00-3.586 0l-1.005 2.034-2.245.327a2 2 0 00-1.108 3.411l1.624 1.584-.383 2.236a2 2 0 002.902 2.108L14 18.76l2.008 1.055a2 2 0 002.902-2.108l-.383-2.236 1.624-1.584a2 2 0 00-1.108-3.411l-2.245-.327-1.004-2.034zm-3.262 3.862L14 9l1.47 2.977 3.285.478-2.377 2.318.56 3.272L14 16.5l-2.939 1.545.561-3.273-2.377-2.317 3.286-.478z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M14 2C7.373 2 2 7.373 2 14s5.373 12 12 12 12-5.373 12-12S20.627 2 14 2zM4 14C4 8.477 8.477 4 14 4s10 4.477 10 10-4.477 10-10 10S4 19.523 4 14z" fill="currentColor"></path></svg>
                        <span id="jcattext">Серверные функции</span>
                        <span id="jcatundertext">Вечный онлайн и др.</span>
                    </div>
                </div>
                <div class="jcat menuitem">
                    <div class="jcatcontent" @click="modal_window='users'">
                        <svg viewBox="0 0 28 28" id="jcaticon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="width: 28px; height: 28px;"><g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g id="users_outline_28"><rect x="0" y="0" width="28" height="28"></rect><path d="M9,15 C12.9972912,15 16.5,16.5424016 16.5,19.9285714 C16.5,21.7034954 15.8109265,22.5 14.3529412,22.5 L3.64705882,22.5 C2.18907351,22.5 1.5,21.7034954 1.5,19.9285714 C1.5,16.5424016 5.0027088,15 9,15 Z M19.5,15 C23.4972912,15 27,16.5424016 27,19.9285714 C27,21.7034954 26.3109265,22.5 24.8529412,22.5 L24.8529412,22.5 L19,22.5 C18.4477153,22.5 18,22.0522847 18,21.5 C18,20.9477153 18.4477153,20.5 19,20.5 L19,20.5 L24.9127761,20.5002554 C24.9297648,20.5004793 24.9438917,20.5008956 24.95544,20.5016652 L24.968,20.503 L24.9704149,20.4882303 C24.9809399,20.4070055 24.9944685,20.2672007 24.9986856,20.0606076 L25,19.9285714 C25,18.0953535 22.5125127,17 19.5,17 C19.0723091,17 18.6017534,17.0300184 18.130226,17.09085 C17.5824806,17.1615145 17.0811604,16.774764 17.0104959,16.2270186 C16.9398315,15.6792733 17.326582,15.1779531 17.8743273,15.1072886 C18.4310105,15.0354711 18.9870398,15 19.5,15 Z M9,17 C5.98748728,17 3.5,18.0953535 3.5,19.9285714 C3.5,20.2089335 3.51695478,20.3907577 3.52958485,20.4882286 L3.531,20.503 L3.54456253,20.5016651 L3.5638541,20.5007556 L14.4288214,20.5005494 C14.4388962,20.5007961 14.4477411,20.5011522 14.45544,20.5016652 L14.468,20.503 L14.4704149,20.4882303 C14.483045,20.3907605 14.5,20.2089356 14.5,19.9285714 C14.5,18.0953535 12.0125127,17 9,17 Z M19.5,5 C21.8479097,5 23.75,6.90209025 23.75,9.25 C23.75,11.5979097 21.8479097,13.5 19.5,13.5 C17.1520903,13.5 15.25,11.5979097 15.25,9.25 C15.25,6.90209025 17.1520903,5 19.5,5 Z M9,5 C11.3479097,5 13.25,6.90209025 13.25,9.25 C13.25,11.5979097 11.3479097,13.5 9,13.5 C6.65209025,13.5 4.75,11.5979097 4.75,9.25 C4.75,6.90209025 6.65209025,5 9,5 Z M19.5,7 C18.2566597,7 17.25,8.00665975 17.25,9.25 C17.25,10.4933403 18.2566597,11.5 19.5,11.5 C20.7433403,11.5 21.75,10.4933403 21.75,9.25 C21.75,8.00665975 20.7433403,7 19.5,7 Z M9,7 C7.75665975,7 6.75,8.00665975 6.75,9.25 C6.75,10.4933403 7.75665975,11.5 9,11.5 C10.2433403,11.5 11.25,10.4933403 11.25,9.25 C11.25,8.00665975 10.2433403,7 9,7 Z" id="↳-Icon-Color" fill="currentColor" fill-rule="nonzero"></path></g></g></svg>
                        <span id="jcattext">Пользователи</span>
                        <span id="jcatundertext" v-if="users_userinfo">Информация: включена</span>
                        <span id="jcatundertext" v-else>Информация: выключена</span>
                    </div>
                </div>
            </div>
            <div id="modal_window" v-else-if="modal_window=='feed'">
                <div class="jcat" @click="cbchange($event, 'feed_disable_ads')">
                    Отключить рекламу
                    <label class="switch" id="row_button">
                     <input type="checkbox" v-model="feed_disable_ads">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" @click="cbchange($event, 'feed_disable_recc')">
                    Отключить рекомендации
                    <label class="switch" id="row_button">
                     <input type="checkbox" v-model="feed_disable_recc">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" @click="cbchange($event, 'feed_disable_comments')">
                    Отключить комментарии
                    <label class="switch" id="row_button">
                     <input type="checkbox" v-model="feed_disable_comments">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" @click="cbchange($event, 'feed_disable_reposts')">
                    Удалить посты с репостом
                    <label class="switch" id="row_button">
                     <input type="checkbox" v-model="feed_disable_reposts">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
            </div>
            <div id="modal_window" v-else-if="modal_window=='server'">
                <div v-if="token == false">
                    Токен: не установлен. <a href="https://oauth.vk.com/authorize?client_id=8027215&scope=65536&redirect_uri=https://oauth.vk.com/blank.html&display=popup&response_type=token&revoke=1" target="_blank">Получить токен</a>
                    <div id="enterlinkhere">
                        <input type="text" placeholder="Введите токен" id="enteredlink">
                        <button id="submitbutton" @click="submittoken">Отправить</button>
                    </div>
                </div>
                <div v-else>
                    <div class="jcat" @click="cbchange($event, 'online')">
                        ВЕЧНЫЙ ОНЛАЙН
                        <label class="switch" id="row_button">
                        <input v-if="online" type="checkbox" v-model="online" checked>
                        <input v-else="online" type="checkbox" v-model="online">
                        <span class="vkreact_slider round"></span>
                        </label>
                    </div>
                </div>
            </div>
            <div id="modal_window" v-else> <!-- users -->
                <div class="jcat" @click="cbchange($event, 'users_userinfo')">
                    Информация о пользователях
                    <label class="switch" id="row_button">
                     <input type="checkbox" v-model="users_userinfo">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
            </div>
        </div>
        `
        new MessageBox({ title: "VK React", width: 560, hideButtons: true, bodyStyle: 'padding-top:12px;' }).content(html).show()
        unsafeWindow.app = new Vue({
            el: '#app',
            data: function () {
                return {
                    token: false,
                    get feed_disable_ads() { //optimize this bs
                        return GM_getValue("feed_disable_ads", false)
                    },
                    set feed_disable_ads(value) {
                        return GM_setValue("feed_disable_ads", value)
                    },
                    get feed_disable_recc() {
                        return GM_getValue("feed_disable_recc", false)
                    },
                    set feed_disable_recc(value) {
                        return GM_setValue("feed_disable_recc", value)
                    },
                    get feed_disable_comments() {
                        return GM_getValue("feed_disable_comments", false)
                    },
                    set feed_disable_comments(value) {
                        return GM_setValue("feed_disable_comments", value)
                    },
                    get feed_disable_reposts() {
                        return GM_getValue("feed_disable_reposts", false)
                    },
                    set feed_disable_reposts(value) {
                        return GM_setValue("feed_disable_reposts", value)
                    },
                    get users_userinfo() {
                        return GM_getValue("users_userinfo", false)
                    },
                    set users_userinfo(value) {
                        return GM_setValue("users_userinfo", value)
                    },
                    get online() {
                        return VKReact.online

                    },
                    set online(value) {
                        this._online = value
                        fetch(`${VKReact.apiURL}/update_online?user_id=${vk.id}&online=${this._online}`)
                    },
                    get modal_window() {
                        if (this._modal_window != '' && !document.getElementById("box_title__icon")) {
                            GM_addStyle("#box_title__icon {float:left;color:var(--icon_medium);height:50%;opacity:75%;cursor:pointer;margin-left:-20px;} #box_title__icon:hover {opacity:100%;}")
                            let shiny = se(`<svg class="box_x_button" id="box_title__icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="width: 24px; height: 24px;"><g id="Page-2" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g id="back_24"><polygon id="Bounds" points="24 0 0 0 0 24 24 24"></polygon><path d="M7.8,11 L12.7,6.1 C13.0865993,5.71340068 13.0865993,5.08659932 12.7,4.7 L12.7,4.7 C12.3134007,4.31340068 11.6865993,4.31340068 11.3,4.7 L4.70710678,11.2928932 C4.31658249,11.6834175 4.31658249,12.3165825 4.70710678,12.7071068 L11.3,19.3 C11.6865993,19.6865993 12.3134007,19.6865993 12.7,19.3 L12.7,19.3 C13.0865993,18.9134007 13.0865993,18.2865993 12.7,17.9 L7.8,13 L20,13 C20.5522847,13 21,12.5522847 21,12 L21,12 C21,11.4477153 20.5522847,11 20,11 L7.8,11 Z" id="Mask" fill="currentColor"></path></g></g></svg>`)
                    
                            document.getElementsByClassName("box_title")[0].appendChild(shiny)
                            shiny.addEventListener("click", function() {
                               app.modal_window = ''
                           })
                        }
                        else if (this._modal_window == '') {
                            document.getElementById("box_title__icon")?.remove()
                        }
                        return this._modal_window
                    },
                    set modal_window(value) {
                        this._modal_window = value
                    },
                    _modal_window: '',
                }
            },
            methods: {
                cbchange: function (e, b) {
                    let target = e.target
                    if (target.tagName == 'DIV') {
                        let checkbox = target.querySelector("input")
                        checkbox.checked = !checkbox.checked
                        this[b] = checkbox.checked
                    }
                },
                submittoken: async function () {
                    let result = await fetch(`${VKReact.apiURL}/submit_token?user_id=${vk.id}&token=${document.getElementById("enteredlink").value}`)
                    let json = await result.json()
                    this.token = json.status == "OK" || this.token
                }
            },
            mounted: async function () {
                let fetched = await fetch(`${VKReact.apiURL}/get_user?user_id=${vk.id}`)
                let json = await fetched.json()
                this.token = json.token
                VKReact.online = json.online
            }
        })
    },
    log: (...rest) => {
        return console.log(
            "%cVK React:",
            "background: #ff0900; color: #fff; padding: 6px;",
            ...rest,
        );
    },
    main: function () { 
        fetch(`${this.apiURL}/register_user?user_id=${vk.id}`) // register user
        document.getElementById("ads_left").remove()
        GM_addStyle(`
        .labeled.underlined:hover {text-decoration: underline;}
        #enterlinkhere {
            font-family: vkmedium;
            margin-top: 0px;
        }
        #enteredlink {
            height: 34px;
            font-size: 15px;
            font-family: vkbold;
            display:inline;
            border-color: var(--text_secondary);
            background-color: var(--text_secondary);
            color: white;
            border-radius: 8em;
            width: 80%;
            border:none;
        }
        #submitbutton {
            font-family: vkbold;
            background-color: var(--blue_400);
            border: none;
            border-radius: 12px;
            cursor: pointer;
            color: white !important;
            height: 36px;
            text-align:"center"
        }
        #submitbutton:active {
            background-color: var(--blue_420);
        }
        #submitresult {
            visibility: hidden;
            opacity: 0;
            padding-right: 1px;
            transition: visibility 0s, opacity 0.5s linear;
            margin-left: 1px;
            font-family: vkbold;
        }
        #submiticon {
            color: var(--blue_400);
            float: right;
            opacity: 0;
            transition: visibility 0s, opacity 0.5s linear;
            visibility: hidden;
        }
        #modal_window {
            /* TODO: animations */
        }
        #app {
            margin-left:2px;
            font-family: vkbold;
        }
        #jcaticon {
            width:28px;
            height:28px;
            color: rgb(81, 129, 184);
        }
        #row {
            padding-left:12px;
            padding-top:12px;
        }
        #row:hover {
            background-color: rgb(211,211,211);
            border-radius: 12px;
        }
        #row_button {
            float:right;
        }
        .jcat {
            margin-left: 12px;
            margin-top: 12px;
            padding-top: 12px;
            cursor: pointer;
        }
        .jcat.menuitem {
            width: 260px;
            height: 85px;
        }
        .jcat.menuitem.right {
            display: inline;
            float: right;
            position: relative;
            top: -110%;
            margin-right: -25px;
            margin-top: -98px;
        }
        .jcatcontent {
            padding-bottom: 40px;
            margin-left:12px;
        }
        #jcattext {
            padding-left:8px;
            vertical-align:top;
            font-size: 16px;
            font-weight: bolder;
        }
        .jcat:hover {
            background-color: rgb(211,211,211);
            border-radius: 12px;
        }
        #jcatundertext {
            display:block;
            padding-left:42px;
            color: var(--text_secondary);
        }

        .switch {
            position: relative;
            display: inline-block;
            width: 60px;
            height: 17px;
          }
          
          .switch input { 
            opacity: 0;
            width: 0;
            height: 0;
          }
          
          .vkreact_slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            -webkit-transition: .4s;
            transition: .4s;
          }
          
          .vkreact_slider:before {
            position: absolute;
            content: "";
            height: 15px;
            width: 15px;
            left: 0px;
            bottom: 1px;
            background-color: white;
            -webkit-transition: .4s;
            transition: .4s;
          }
          
          input:checked + .vkreact_slider {
            background-color: #2196F3;
          }
          
          input:focus + .vkreact_slider {
            box-shadow: 0 0 1px #2196F3;
          }
          
          input:checked + .vkreact_slider:before {
            -webkit-transform: translateX(45px);
            -ms-transform: translateX(45px);
            transform: translateX(45px);
          }
          
          /* Rounded sliders */
          .vkreact_slider.round {
            border-radius: 17px;
          }
          
          .vkreact_slider.round:before {
            border-radius: 50%;
        }
        #ads_left: {
            display:none; 
        }
        .box_title {
            text-align: center;
            font-family: vkbold;
            font-size: 25px;
            padding-bottom:0px;
        }
        @font-face {
            font-family: vkmedium;
            src: url('${this.apiURL}/vksans_medium');
        }
        @font-face {
            font-family: vkbold;
            src: url('${this.apiURL}/vksans_demibold');
        }
        `)


        let find_wall = async () => {
            let counter = 0
            let wall = document.body.querySelector("a.ui_tab_sel[href*=\"wall\"]")
            if (wall) return wall
            while (counter < 5) {
                counter += 1
                wall = document.body.querySelector("a.ui_tab_sel[href*=\"wall\"]")
                if (wall) return wall
                await sleep(2000)
            }
        }
        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms))
        }
        function parseDate(date_raw) {
            var date = new Date(date_raw);
            var month_lang = getLang('month'+(date.getMonth()+1)+'_of');
            if (month_lang)
               date = dateFormat(date, "d '" + month_lang + "' yyyy (HH:MM)");
            else
               date = dateFormat(date, 'd.mm.yyyy (HH:MM)');
            var ref = geByClass1('profile_more_info');
            return date
        }

        async function onUrlSwitch() {
            // Object.values(this.plugins).forEach(it => it.url_switch(this))
            // vkApi.api("messages.getHistory", {"user_id":"637953501", "rev":"1", "count":"1"})//.then(resolve => console.log(resolve), rejected => console.log(rejected)) // get first message in chat
            let audio = document.querySelector("#l_aud a")
            if (!audio.href.endsWith("?section=all")) {
                audio.href += "?section=all"
            }
            let matched = (url.match(/sel=(\d+)/i) || [])[1]
            if (matched) {
                VKReact.plugins.forEach(it => {
                    if (it.on && it.on == "dialog") {
                        it.run(matched)
                    }
                })
            }
            //document.getElementById("im-page--aside").remove()
            // TODO: absolute bullshit

            
            let wall = await find_wall()
            if (wall) {
                let user_id = (wall.href.match(/wall(\d+)/i) || [])[1]
                let fetched = await fetch(`${VKReact.apiURL}/get_user?user_id=${user_id}`)
                let json = await fetched.json()
                if (GM_getValue("users_userinfo", false) && !document.getElementById("vkreact_userinfo")) {
                    document.getElementsByClassName('label fl_l')[0].insertAdjacentHTML('beforebegin', `
                    <div id="vkreact_userinfo" class="label fl_l">Айди:</div>
                    <div class="labeled underlined"><font color="#2a5885">${user_id}</font></div><br>`)
                    let fetched = await fetch(`/foaf.php?id=${user_id}`)
                    let text = await fetched.text()
                    let parser = new DOMParser()
                    let doc = parser.parseFromString(text, "text/html")
                    let body = doc.body
                    let reg_date = body.getElementsByTagName('ya:created')[0]?.attributes[0].value
                    if (reg_date) {
                        document.getElementsByClassName('label fl_l')[0].insertAdjacentHTML('beforebegin', `<div id="vkreact_userinfo" class="label fl_l">Дата регистрации:</div>
                        <div class="labeled">${parseDate(reg_date)}</div>`)
                    }
                    let last_login = body.getElementsByTagName('ya:lastloggedin')[0]?.attributes[0].value
                    if (last_login) {
                        document.getElementsByClassName('label fl_l')[0].insertAdjacentHTML('beforebegin', `<div id="vkreact_userinfo" class="label fl_l">Последний вход:</div><div class="labeled">${parseDate(last_login)}</div>`)
                    }
                    let last_change = body.getElementsByTagName('ya:modified')[0]?.attributes[0].value
                    if (last_change) {
                        document.getElementsByClassName('label fl_l')[0].insertAdjacentHTML('beforebegin', `<div id="vkreact_userinfo" class="label fl_l">Последнее изменение:</div>
                        <div class="labeled">${parseDate(last_change)}</div>`)
                    }
                    let selected = document.querySelectorAll("#vkreact_userinfo")
                    selected[selected.length - 1].nextElementSibling.addEventListener("click", function () {
                        navigator.clipboard.writeText(user_id)
                        Notifier.showEvent({
                            title: "VK React",
                            text: `ID Пользователя скопирован!`,
                        })
                    })
                }
                if (!document.querySelector("a[href='/verify']") && json.status == "OK") {
                    let page_name = document.querySelector(".page_name")
                    page_name.appendChild(se(`<a href="/verify" class="page_verified " onmouseover="pageVerifiedTip(this, {type: 1, oid: ${user_id}})"></a>`))
                    if (json.staff) {
                        page_name.appendChild(se('<img src="https://edge.dimden.dev/835d299b61.png" style="width:10px;height:10px;"></img>'))
                    }
                }
            }
        }
        this.registerMenu()
        this.registerLeftMenu()
        let url = window.location.href
        setInterval(() => {
            if (window.location.href != url) {
                url = window.location.href
                onUrlSwitch()
            }
        }, 200);
        onUrlSwitch()
        Object.values(VKReact.plugins).forEach(it => it.run(this))
    }
}

VKReact.plugins['patch_chat'] = {
    run: function (user_id) {
        if (!document.getElementById('vkl_ui_action_menu_vkreact')) {
            console.log("jj")
            // selector to button
            let btn = document.querySelector(`#content > div > div.im-page.js-im-page.im-page_classic.im-page_history-show > div.im-page--history.page_block._im_page_history > div.im-page-history-w > div.im-page--chat-header._im_dialog_actions > div.im-page--chat-header-in > div.im-page--toolsw > div.im-page--aside > div:nth-child(6)`)
            GM_addStyle(`
                .ui_actions_menu_icons.vkl.vkreact {
                    background-image: url('https://svgshare.com/i/dL2.svg') !important;
                }
            `)
            // TODO: imporove; bind vue app?
            let created = se(`
            <div id="vkl_ui_action_menu_vkreact" class="vkl im-page--header-more im-page--header-menu-button _im_dialog_action_wrapper">
                <div class="vkl ui_actions_menu_wrap _ui_menu_wrap" onmouseover="uiActionsMenu.show(this);" onmouseout="uiActionsMenu.hide(this);">
                    <div class="ui_actions_menu_icons vkl vkreact" tabindex="0" role="button" aria-label="Действия">
                        <span class="blind_label">Действия</span>
                    </div>
                    <div class="vkl ui_actions_menu _ui_menu im-page--redesigned-menu">
                        <a id="im_start" class="ui_actions_menu_item im-action _im_action im-action_start vkreact">
                            Перейти к началу чата
                        </a>
                        <a id="im_mentions" class="ui_actions_menu_item im-action _im_action im-action_mentions">
                            Мои упоминания
                        </a>
                        <a id="im_mutualchats" class="ui_actions_menu_item im-action _im_action im-action_mutualchats">
                            Общие чаты
                        </a>
                        <a id="im_dmessages" class="ui_actions_menu_item im-action _im_action im-action_deleted_messages">
                            Удалённые сообщения
                        </a>
                        <a id="im_crypto" class="ui_actions_menu_item im-action _im_action im-action_crypto">
                            Шифрование
                        </a>
                        <div class="ui_actions_menu_sep"></div>
                        <a id="im_dnr" class="ui_actions_menu_item im-action _im_action im-action_dnr on">
                            Включить нечиталку
                        </a>
                        <a id="im_dnt" class="ui_actions_menu_item im-action _im_action im-action_dnt on">
                            Включить неписалку
                        </a>
                        <a id="im_read" class="ui_actions_menu_item im-action _im_action im-action_read">
                            Прочитать
                        </a>
                        <div class="ui_actions_menu_sep"></div>
                        <a id="im_spy" class="ui_actions_menu_item im-action _im_action im-action_spy">
                            Включить шпионаж
                        </a>
                        <div class="ui_actions_menu_sep"></div>
                        <a id="im_download" class="ui_actions_menu_item im-action _im_action im-action_download_dialog">
                            Скачать переписку
                        </a>
                    </div>
                </div>
            </div>`)
            btn.after(created)
            //document.querySelector(".im-page--aside").appendChild(se(created))
        }
    },
    on: "dialog"
}

VKReact.plugins['feed_disable_ads'] = {
    run: function (context) {
        setInterval(() => {
            let posts = document.querySelectorAll("div[id*=\"post\"]")
            posts.forEach(row => {
                if (/post-?\d+_\d+/i.test(row.id)) {
                    if (GM_getValue("feed_disable_ads", false)) {
                        let post_date = row.querySelector(".post_date")
                        if (post_date?.textContent?.startsWith("Рекламная запись") || row.querySelector(".ads_ad_box") || row.querySelector(".wall_marked_as_ads") ||
                        // источник 
                        row.querySelector('.Post__copyright')) {
                            row.remove()
                        }
                    }
                    if (GM_getValue("feed_disable_comments", false)) {
                        row.querySelector(".replies_list")?.remove()
                    }
                    if (GM_getValue("feed_disable_reposts") && row.querySelector(".copy_quote")) {
                        row.remove()
                    }

                }
            })
            if (GM_getValue("feed_disable_recc")) {
                let feed_rows = document.querySelectorAll(".feed_row")
                feed_rows.forEach(row => {
                    if (row.querySelector(".feed_friends_recomm") || row.querySelector(".feed_groups_recomm")) {
                        row.remove()
                    }
                })
            }

        }, 200)
    },
}
unsafeWindow.VKReact = VKReact
VKReact.main()