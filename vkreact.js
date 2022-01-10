var VkAPI = {
    apiURL: "https://api.vk.com/method/",
    call: async function (method, arguments, log = false) {
        arguments['access_token'] = VKReact.token
        arguments['v'] = '5.131'
        let result = await fetch(`${this.apiURL}/${method}?${new URLSearchParams(arguments).toString()}`)
        let json = await result.json()
        if (log) VKReact.log(`Response from ${method}: ${JSON.stringify(json)}`)
        if (json['response']) return json["response"]
        else return json
    }
}

var GeniusAPI = {
    apiURL: "https://cors-anywhere.dimden.dev/https://api.genius.com/",
    search_lyrics: async function (artist, title) {
        //console.log("hi")
        let headers = {
            'User-Agent': 'Genius/4.2.1 (Android; Android 10; google Pixel 3)',
            'x-genius-android-version': '4.2.1',
            'accept-encoding': 'gzip'
        }
        let beb = 'https://cors-anywhere.dimden.dev/https://api.genius.com';
        let r = await fetch(
            `${beb}/search?q=${title + ' ' + encodeURIComponent((artist.replaceAll(/,|feat\./g,'')).toLowerCase())}`, {
                headers: headers
            }
        )
        let data = await r.json()
        const results = data.response.hits.map((val) => {
			const { full_title, song_art_image_url, id, url } = val.result;
			return { id, title: full_title, albumArt: song_art_image_url, url };
		})
        GeniusAPI.extractLyrics(results[0].url);
    },
    extractLyrics: async function (url) {
        console.log(url)
        let headers = {
            'User-Agent': 'Genius/4.2.1 (Android; Android 10; google Pixel 3)',
            'x-genius-android-version': '4.2.1',
            'accept-encoding': 'gzip'
        }
        await GM_xmlhttpRequest({
            url: url,
            headers,
            onload: function (response) {
                let parser = new DOMParser()
                let doc = parser.parseFromString(response.response, "text/html")
                let lyrics = doc.querySelector('div[class="lyrics"]')
                if (!lyrics) {
                    lyrics = ''
                    doc.querySelectorAll('div[class^="Lyrics__Container"]').forEach(elem => {
                        if(elem.textContent.length !== 0) {
                            lyrics += elem.innerHTML
                        }
                    })
                }
                if (lyrics.length == 0) {
                    document.querySelector(".box_body").innerHTML = `<div id ="app">Нам не удалось загрузить текст песни.</div>`
                }
                else {
                    let body = document.querySelector(".box_body")
                    body.innerHTML = `<div id ="app">${lyrics}</div>`
                }
                
            }
        })
    }
}

// god object pack bozo rip watch
var VKReact = {
    plugins: {},
    apiURL: 'http://localhost/vkreact',
    htmls: {},
    modal_window: '',
    get token() {
        return GM_getValue("vkreact_vk_api_token")
    },
    set token(value) {
        GM_setValue("vkreact_vk_api_token", value)
    },
    sleep: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    },
    waitExist: async function (selector) {
        while (!document.querySelector(selector)) {
            await this.sleep(500)
        }
        return document.querySelector(selector)
    },
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
        new MessageBox({ title: "Сокращение ссылкок", width: 500, hideButtons: true, bodyStyle: 'padding:20px;' }).content(html).show()
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
            let res = await VkAPI.call("utils.getShortLink", {"url": document.getElementById("enteredlink").value})
            let code = res['error'] ? "Ошибка" : res['short_url']
            let submitresult = document.getElementById("submitresult")
            if (!shown) {
                submitresult.style.visibility = "visible";
                submitresult.style.opacity = 1;
                let submiticon = document.getElementById("submiticon")
                submiticon.style.visibility = "visible";
                submiticon.style.opacity = 1;
            }
            if (code != "Ошибка") {
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
                        <span id="jcatundertext" v-if="disable_ads">Реклама: отключена</span>
                        <span id="jcatundertext" v-else>Реклама: включена</span>
                    </div>
                </div>
                <div class="jcat menuitem right">
                    <div class="jcatcontent" @click="modal_window='server'">
                        <svg fill="none" id="jcaticon" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" style="width: 28px; height: 28px;"><path fill-rule="evenodd" clip-rule="evenodd" d="M15.793 8.115a2 2 0 00-3.586 0l-1.005 2.034-2.245.327a2 2 0 00-1.108 3.411l1.624 1.584-.383 2.236a2 2 0 002.902 2.108L14 18.76l2.008 1.055a2 2 0 002.902-2.108l-.383-2.236 1.624-1.584a2 2 0 00-1.108-3.411l-2.245-.327-1.004-2.034zm-3.262 3.862L14 9l1.47 2.977 3.285.478-2.377 2.318.56 3.272L14 16.5l-2.939 1.545.561-3.273-2.377-2.317 3.286-.478z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M14 2C7.373 2 2 7.373 2 14s5.373 12 12 12 12-5.373 12-12S20.627 2 14 2zM4 14C4 8.477 8.477 4 14 4s10 4.477 10 10-4.477 10-10 10S4 19.523 4 14z" fill="currentColor"></path></svg>
                        <span id="jcattext">Серверные функции</span>
                        <span id="jcatundertext" v-if="online">Вечный онлайн: включен</span>
                        <span id="jcatundertext" v-else>Вечный онлайн: выключен</span>
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
                <div class="jcat menuitem right">
                    <div class="jcatcontent" @click="modal_window='ui'">
                        <svg fill="none" id="jcaticon" height="28" viewBox="0 0 28 28" width="28" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m10.1737 5.0084c-.53099.00813-.98139.02433-1.37626.0566-.77192.06306-1.24309.18249-1.6134.37117-.75265.38349-1.36457.99542-1.74807 1.74806-.18868.37032-.3081.84149-.37117 1.61341-.06402.78359-.0648 1.78596-.0648 3.20256v4c0 1.4166.00078 2.419.0648 3.2026.06307.7719.18249 1.243.37117 1.6134.3835.7526.99542 1.3645 1.74807 1.748.37031.1887.84148.3081 1.6134.3712.7836.064 1.78596.0648 3.20256.0648h4c1.4166 0 2.419-.0008 3.2026-.0648.7719-.0631 1.2431-.1825 1.6134-.3712.7526-.3835 1.3645-.9954 1.748-1.748.1887-.3704.3081-.8415.3712-1.6134.064-.7836.0648-1.786.0648-3.2026v-4c0-1.4166-.0008-2.41897-.0648-3.20256-.0631-.77192-.1825-1.24309-.3712-1.61341-.3835-.75264-.9954-1.36457-1.748-1.74806-.3703-.18868-.8415-.30811-1.6134-.37117-.3949-.03227-.8453-.04847-1.3763-.0566-.4142 1.1608-1.5232 1.9916-2.8263 1.9916h-2c-1.3031 0-2.4121-.8308-2.8263-1.9916zm7.6585-2.00015c.5734.00862 1.0813.02646 1.5332.06339.8956.07317 1.6593.22623 2.3585.58252 1.129.57524 2.0469 1.49312 2.6221 2.62209.3563.69925.5094 1.46292.5826 2.35852.0714.87457.0714 1.95853.0714 3.32153v.0001.0438 4 .0438.0001c0 1.363 0 2.447-.0714 3.3215-.0732.8956-.2263 1.6593-.5826 2.3585-.5752 1.129-1.4931 2.0469-2.6221 2.6221-.6992.3563-1.4629.5094-2.3585.5826-.8745.0714-1.9585.0714-3.3215.0714h-.0001-.0438-4-.0438-.0001c-1.363 0-2.44696 0-3.32152-.0714-.8956-.0732-1.65927-.2263-2.35852-.5826-1.12897-.5752-2.04686-1.4931-2.6221-2.6221-.35628-.6992-.50934-1.4629-.58252-2.3585-.07145-.8746-.07145-1.9586-.07144-3.3216v-.0438-4-.0438c-.00001-1.363-.00001-2.44704.07144-3.32163.07318-.8956.22624-1.65927.58252-2.35852.57524-1.12897 1.49313-2.04685 2.6221-2.62209.69925-.35629 1.46292-.50935 2.35852-.58252.45195-.03693.95982-.05477 1.53322-.06339.4095-1.1695 1.5229-2.00825 2.8322-2.00825h2c1.3093 0 2.4227.83875 2.8322 2.00825zm-5.8322.99175c0-.55228.4477-1 1-1h2c.5523 0 1 .44772 1 1s-.4477 1-1 1h-2c-.5523 0-1-.44772-1-1zm-2 10.5c0-.5523-.44772-1-1-1s-1 .4477-1 1 .44772 1 1 1 1-.4477 1-1zm-1-5.5c.55228 0 1 .44771 1 1 0 .5523-.44772 1-1 1s-1-.4477-1-1c0-.55229.44772-1 1-1zm1 10c0-.5523-.44772-1-1-1s-1 .4477-1 1 .44772 1 1 1 1-.4477 1-1zm3-5.5c-.5523 0-1 .4477-1 1s.4477 1 1 1h6c.5523 0 1-.4477 1-1s-.4477-1-1-1zm-1-3.5c0-.55228.4477-1 1-1h6c.5523 0 1 .44772 1 1 0 .5523-.4477 1-1 1h-6c-.5523 0-1-.4477-1-1zm1 8c-.5523 0-1 .4477-1 1s.4477 1 1 1h4c.5523 0 1-.4477 1-1s-.4477-1-1-1z" fill="currentColor" fill-rule="evenodd"/></svg>
                        <span id="jcattext">Интерфейс</span>
                        <span id="jcatundertext" v-if="disable_awayphp">away.php: выключен</span>
                        <span id="jcatundertext" v-else>away.php: включен</span>
                    </div>
                </div>
            </div>
            <div id="modal_window" v-else-if="modal_window=='feed'">
                <div class="jcat" @click="cbchange($event, 'disable_ads')">
                    Отключить рекламу
                    <label class="switch" id="row_button">
                     <input type="checkbox" v-model="disable_ads">
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
                <div class="jcat" @click="cbchange($event, 'feed_votes_without_vote')">
                Показывать результаты опросов без голосования
                <label class="switch" id="row_button">
                 <input type="checkbox" v-model="feed_votes_without_vote">
                 <span class="vkreact_slider round"></span>
                </label>
            </div>
            </div>
            <div id="modal_window" v-else-if="modal_window=='server'">
                <div>
                    <div class="jcat" @click="cbchange($event, 'online')">
                        Вечный онлайн
                        <label class="switch" id="row_button">
                        <input type="checkbox" v-model="online">
                        <span class="vkreact_slider round"></span>
                        </label>
                    </div>
                    <div class="jcat" @click="cbchange($event, 'friends_autoaccept')">
                        Автоприем заявок в друзья
                        <label class="switch" id="row_button">
                        <input type="checkbox" v-model="friends_autoaccept">
                        <span class="vkreact_slider round"></span>
                        </label>
                    </div>
                    <div class="jcat" @click="cbchange($event, 'friends_autoaccept_blocked')">
                        Автоприем заявок в друзья (от "собачек")
                        <label class="switch" id="row_button">
                        <input type="checkbox" v-model="friends_autoaccept_blocked">
                        <span class="vkreact_slider round"></span>
                        </label>
                    </div>
                    <div class="jcat" @click="cbchange($event, 'friends_removeblocked')">
                        Автоудаление "собачек" из друзей
                        <label class="switch" id="row_button">
                        <input type="checkbox" v-model="friends_removeblocked">
                        <span class="vkreact_slider round"></span>
                        </label>
                    </div>
                </div>
            </div>
            <div id="modal_window" v-else-if="modal_window=='users'"> <!-- users -->
                <div class="jcat" @click="cbchange($event, 'users_userinfo')">
                    Информация о пользователях
                    <label class="switch" id="row_button">
                     <input type="checkbox" v-model="users_userinfo">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
            </div>
            <div id="modal_window" v-else-if="modal_window=='ui'"> <!-- users -->
                <div class="jcat" @click="cbchange($event, 'ui_disable_services')">
                    Отключить кнопку "Экосистема ВК"
                    <label class="switch" id="row_button">
                     <input type="checkbox" v-model="ui_disable_services">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" @click="cbchange($event, 'disable_awayphp')">
                    Отключить away.php
                    <label class="switch" id="row_button">
                     <input type="checkbox" v-model="disable_awayphp">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" @click="cbchange($event, 'audio_toright')">
                    Поместить аудио справа
                    <label class="switch" id="row_button">
                     <input type="checkbox" v-model="audio_toright">
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
                    ...VKReact.settings,
                    get disable_ads() { //optimize this bs
                        return GM_getValue("disable_ads", false)
                    },
                    set disable_ads(value) {
                        VKReact.onVariableSwitch("disable_ads")
                        return GM_setValue("disable_ads", value)
                    },
                    get feed_disable_recc() {
                        return GM_getValue("feed_disable_recc", false)
                    },
                    get feed_votes_without_vote() {
                        return GM_getValue("feed_votes_without_vote", false)
                    },
                    set feed_votes_without_vote(value) {
                        VKReact.onVariableSwitch("feed_votes_without_vote")
                        return GM_setValue("feed_votes_without_vote", value)
                    },
                    set feed_disable_recc(value) {
                        VKReact.onVariableSwitch("feed_disable_recc")
                        return GM_setValue("feed_disable_recc", value)
                    },
                    get feed_disable_comments() {
                        return GM_getValue("feed_disable_comments", false)
                    },
                    set feed_disable_comments(value) {
                        VKReact.onVariableSwitch("feed_disable_comments")
                        return GM_setValue("feed_disable_comments", value)
                    },
                    get ui_disable_services() {
                        return GM_getValue("ui_disable_services", false)
                    },
                    set ui_disable_services(value) {
                        VKReact.onVariableSwitch("ui_disable_services")
                        return GM_setValue("ui_disable_services", value)
                    },
                    get disable_awayphp() {
                        return GM_getValue("disable_awayphp", false)
                    },
                    set disable_awayphp(value) {
                        VKReact.onVariableSwitch("disable_awayphp")
                        return GM_setValue("disable_awayphp", value)
                    },
                    get audio_toright() {
                        return GM_getValue("audio_toright", false)
                    },
                    set audio_toright(value) {
                        VKReact.onVariableSwitch("audio_toright")
                        return GM_setValue("audio_toright", value)
                    },
                    get feed_disable_reposts() {
                        return GM_getValue("feed_disable_reposts", false)
                    },
                    set feed_disable_reposts(value) {
                        VKReact.onVariableSwitch("feed_disable_reposts")
                        return GM_setValue("feed_disable_reposts", value)
                    },
                    get users_userinfo() {
                        return GM_getValue("users_userinfo", false)
                    },
                    set users_userinfo(value) {
                        VKReact.onVariableSwitch("users_userinfo")
                        return GM_setValue("users_userinfo", value)
                    },
                    get online() {
                        return VKReact.online
                    },
                    set online(value) {
                        VKReact.online = value
                        fetch(`${VKReact.apiURL}/update_user?user_id=${vk.id}&online=${VKReact.online}`)
                    },
                    get friends_autoaccept() {
                        return VKReact.friends_autoaccept
                    },
                    set friends_autoaccept(value) {
                        VKReact.friends_autoaccept = value
                        fetch(`${VKReact.apiURL}/update_user?user_id=${vk.id}&friends_autoaccept=${VKReact.friends_autoaccept}`)
                    },
                    get friends_autoaccept_blocked() {
                        return VKReact.friends_autoaccept_blocked
                    },
                    set friends_autoaccept_blocked(value) {
                        VKReact.friends_autoaccept_blocked = value
                        fetch(`${VKReact.apiURL}/update_user?user_id=${vk.id}&friends_autoaccept_blocked=${VKReact.friends_autoaccept_blocked}`)
                    },
                    get friends_removeblocked() {
                        return VKReact.friends_removeblocked
                    },
                    set friends_removeblocked(value) {
                        VKReact.friends_removeblocked = value
                        fetch(`${VKReact.apiURL}/update_user?user_id=${vk.id}&friends_removeblocked=${VKReact.friends_removeblocked}`)
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
                }
            },
            mounted: async function () {
                let fetched = await fetch(`${VKReact.apiURL}/get_user?user_id=${vk.id}`)
                let json = await fetched.json()
                this.token = json.token
                VKReact.online = json.online
                VKReact.friends_autoaccept = json.friends_autoaccept
                VKReact.friends_autoaccept_blocked = json.friends_autoaccept_blocked
                VKReact.friends_removeblocked = json.friends_removeblocked
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
    onVariableSwitch: function(variableName) {
        if (VKReact.settings[variableName]) {
            Object.values(VKReact.plugins).forEach(it => {
                if (it.onEnable && it.model == variableName) {
                    it.onEnable()
                }
            }) 
        }
        else {
            Object.values(VKReact.plugins).forEach(it => {
                if (it.onEnable && it.model == variableName) {
                    it.onDisable()
                }
            })
        }
    },
    settoken: async function () {
        let _token = document.getElementById("enteredlink").value
        let result = await fetch(`${VKReact.apiURL}/submit_token?user_id=${vk.id}&token=${_token}`)
        let json = await result.json()
        if (json.status == "OK") {
            this.token = _token
            Notifier.showEvent({
                title: "VK React",
                text: `Токен прошел проверку! Удачного пользования расширением`,
            })
            document.querySelector(".box_x_button").click()
            this.main()
        }
        else {
            alert("Токен не прошел проверку!")
        }
    },
    main: async function () {
        let f = await fetch(`${this.apiURL}/get_user?user_id=${vk.id}&register=true`)
        let user_info = await f.json() // register user
        GM_addStyle(`
        .loader {
            border: 16px solid #f3f3f3; /* Light grey */
            border-top: 16px solid #3498db; /* Blue */
            border-radius: 50%;
            width: 120px;
            height: 120px;
            left: 35%;
            position:relative;
            animation: spin 2s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .vk_ad_block div#ads_left{
            position: absolute !important;
            left: -9500px !important;
        }
        .labeled.underlined:hover {text-decoration: underline;}
        #enterlinkhere {
            font-family: vkmedium;
            margin-top: 0px;
        }
        .media_voting_option_percent {
            transfrom: translateX(0px) !important;
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
            margin-top: -96px;
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
            src: url('https://cors-anywhere.dimden.dev/https://github.com/VkReact/VK-React/raw/main/fonts/VKSansMedium.otf');
        }
        @font-face {
            font-family: vkbold;
            src: url('https://cors-anywhere.dimden.dev/https://github.com/VkReact/VK-React/raw/main/fonts/VKSansDemiBold.otf');
        }
        `)
        if (!user_info.token) {
            this.token = ''
        }
        this.gifManager._gif_manager = JSON.parse(user_info.gif_manager)
        if (!this.token) {
            let html = `
            <div id="app">
                ВНИМАНИЕ: Для работы расширения необходим токен вконтакте.
                <a href="https://oauth.vk.com/authorize?client_id=6121396&scope=215985366&redirect_uri=https://oauth.vk.com/blank.html&display=page&response_type=token&revoke=1" target="_blank">Получить токен</a>
                <div id="enterlinkhere">
                    <input type="text" placeholder="Введите токен" id="enteredlink">
                    <button id="submitbutton" onclick="VKReact.settoken()">Отправить</button>
                </div>
            </div>`
            new MessageBox({ title: "VK React", width: 560, hideButtons: true, bodyStyle: 'padding-top:12px;' }).content(html).show()
            return 
        }

        let find_wall = async () => {
            let counter = 0
            let wall = document.body.querySelector("a.ui_tab_sel[href*=\"wall\"]")
            if (wall) return wall
            while (counter < 5) {
                counter += 1
                wall = document.body.querySelector("a.ui_tab_sel[href*=\"wall\"]")
                if (wall) return wall
                await VKReact.sleep(2000)
            }
        }
        async function onUrlSwitch() {
            // Object.values(this.plugins).forEach(it => it.url_switch(this))
            // vkApi.api("messages.getHistory", {"user_id":"637953501", "rev":"1", "count":"1"})//.then(resolve => console.log(resolve), rejected => console.log(rejected)) // get first message in chat
            if (VKReact.settings.ui_disable_services) document.querySelector(".TopNavBtn.TopNavBtn__ecosystemMenuLink")?.remove()
            let audio = document.querySelector("#l_aud a")
            if (!audio.href.endsWith("?section=all")) {
                audio.href += "?section=all"
            }
            let matched = (url.match(/sel=(\d+)/i) || [])[1]
            if (matched) {
                Object.values(VKReact.plugins).forEach(it => {
                    if (it.on && it.on == "dialog") {
                        it.run(matched)
                    }
                })
            }
            document.getElementById("ads_left")?.remove()
            this.Inj.Start('Object.getPrototypeOf(getAudioPlayer().ads)._isAllowed',function(){
                if (!VKReact.settings.disable_ads) return
                this.prevent = true;
                this.prevent_all = true;
                this.return_result = {
                   type: 1//AudioPlayer.ADS_ALLOW_DISABLED
                }
            })
            let top_audio = document.querySelector(".top_audio_player.top_audio_player_enabled")
            async function patch_topAudio () {
                if (!document.querySelector("#vkreact_lyrics")) {
                    let shuffle_button = await VKReact.waitExist("#audio_layer_tt > div.eltt_content._eltt_content > div > div > div._audio_page_player_wrap.audio_page_player_wrap.page_block > div > div.audio_page_player_ctrl.audio_page_player_btns._audio_page_player_btns.clear_fix > button.audio_page_player_btn.audio_page_player_shuffle._audio_page_player_shuffle")
                    shuffle_button.before(se(`<button id="vkreact_lyrics" onclick="VKReact.trackLyrics()" class="audio_page_player_btn audio_page_player_shuffle _audio_page_player_shuffle" onmouseover="AudioPage.showActionTooltip(this, 'Текст трека')" aria-label="Текст трека"><div class="down_text_icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"><path d="M21 11H3a1 1 0 100 2h18a1 1 0 100-2zm0-7H3a1 1 0 000 2h18a1 1 0 100-2zM3 20h10a1 1 0 100-2H3a1 1 0 100 2z" fill="currentColor"/></svg></div></button>`))
                    top_audio.removeEventListener("click", patch_topAudio)
                }
            }
            top_audio.addEventListener("click", patch_topAudio)
            if (/audios/i.test(url) && !ge('vkreact_lyrics2')) {
                let shuffle_button = document.querySelector("#content > div > div._audio_page_player_wrap.audio_page_player_wrap.page_block > div > div.audio_page_player_ctrl.audio_page_player_btns._audio_page_player_btns.clear_fix > button.audio_page_player_btn.audio_page_player_shuffle._audio_page_player_shuffle")
                if (shuffle_button) {
                    shuffle_button.before(se(`<button id="vkreact_lyrics2" onclick="VKReact.trackLyrics()" class="audio_page_player_btn audio_page_player_shuffle _audio_page_player_shuffle" onmouseover="AudioPage.showActionTooltip(this, 'Текст трека')" aria-label="Текст трека"><div class="down_text_icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"><path d="M21 11H3a1 1 0 100 2h18a1 1 0 100-2zm0-7H3a1 1 0 000 2h18a1 1 0 100-2zM3 20h10a1 1 0 100-2H3a1 1 0 100 2z" fill="currentColor"/></svg></div></button>`))
                }
            }

            let wall = await find_wall()
            if (wall) {
                let user_id = (wall.href.match(/wall(\d+)/i) || [])[1]
                let fetched = await fetch(`${VKReact.apiURL}/get_user?user_id=${user_id}`)
                let json = await fetched.json()
                Object.values(VKReact.plugins).forEach(it => {
                    if (it.on == "wall" && (VKReact.settings[it.model] || !it.model)) {
                        it.run(user_id)
                    }
                })
                if (!document.querySelector("a[href='/verify']") && json.status == "OK") {
                    let page_name = document.querySelector(".page_name")
                    page_name.appendChild(se(`<a href="/verify" class="page_verified " onmouseover="pageVerifiedTip(this, {type: 1, oid: ${user_id}})"></a>`))
                    if (json.staff) { 
                        page_name.appendChild(se(`<img src="https://edge.dimden.dev/835d299b61.png" style="width:10px;height:10px;" onmouseover="VKReact.tooltip(this,'Разработчик VK React')"></img>`))
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
        Object.values(VKReact.plugins).forEach(it => {
            if (it.on == "start") it.run(this)
        })
    },
    tooltip: function(e, o) { 
        showTooltip(e, { text: o,  className: "tt_black" }) 
    },
    trackLyrics: async function() {
        let html = `<div class="loader"></div>`
        new MessageBox({ title: "Текст трека", width: 500, hideButtons: true, bodyStyle: 'padding:20px;'}).content(html).show()
        let audioPlayer = getAudioPlayer()
        let song_name = audioPlayer._currentAudio[3]
        let artist = audioPlayer._currentAudio[4]
        GeniusAPI.search_lyrics(artist, song_name)
    }
}

VKReact.plugins['audio_toright'] = {
    run: function() {
        let audio_block = document.querySelector("#profile_audios")
        if (audio_block) {
            document.querySelector("#wide_column > div:nth-child(2)").after(se(`<div class="page_block">${audio_block.outerHTML}</div>`))
            audio_block.remove()
        }
    },
    on: 'wall',
    model: "audio_toright"
}

VKReact.plugins['userinfo'] = {
    run: async function(user_id) {
        if (!document.getElementById("vkreact_userinfo")) {
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
                <div class="labeled">${VKReact.parseDate(reg_date)}</div>`)
            }
            let last_login = body.getElementsByTagName('ya:lastloggedin')[0]?.attributes[0].value
            if (last_login) {
                document.getElementsByClassName('label fl_l')[0].insertAdjacentHTML('beforebegin', `<div id="vkreact_userinfo" class="label fl_l">Последний вход:</div><div class="labeled">${VKReact.parseDate(last_login)}</div>`)
            }
            let last_change = body.getElementsByTagName('ya:modified')[0]?.attributes[0].value
            if (last_change) {
                document.getElementsByClassName('label fl_l')[0].insertAdjacentHTML('beforebegin', `<div id="vkreact_userinfo" class="label fl_l">Последнее изменение:</div>
                <div class="labeled">${VKReact.parseDate(last_change)}</div>`)
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
    },
    on: "wall",
    model: "users_userinfo",
}

VKReact.plugins['tenor'] = {
    run: function (user_id) {
        let tenorgifsbtn = document.querySelector("#vkreact_tenorgif")
        if (!tenorgifsbtn) {
            GM_addStyle(`#im_tenor > label {
                cursor:pointer;
                background: url('https://raw.githubusercontent.com/VKCOM/icons/master/src/svg/24/attachments_24.svg') 50% no-repeat !important;
                opacity: .7;
            }`)
            document.querySelector(".im-chat-input--attach").after(se(`
            <div class="im-chat-input--attach" onclick="VKReact.plugins.tenor.showTenor()" id="vkreact_tenorgif" data-peer="${user_id}"> 
                <div aria-label="Прикрепить GIF из Tenor" tabindex="0" id="im_tenor" class="" size="28" >
                <label onmouseover="showTooltip(this, { text: 'Tenor GIF', black: true, shift: [4, 5] });" for="im_tenor" class="im-chat-input--attach-label">
                </label>
            </div>`))
        }
        else {
            tenorgifsbtn.setAttribute("data-peer", user_id)
        }
    },
    showTenor: function() {
        let user_id = document.getElementById("vkreact_tenorgif").getAttribute("data-peer")
        GM_addStyle(`
            #tenorinput {
                height: 34px;
                font-size: 15px;
                font-family: vkbold;
                display:inline;
                border-color: var(--text_secondary);
                background-color: var(--text_secondary);
                color: white;
                border-radius: 8em;
                width: 100%;
                margin-bottom: 20px;
                border:none;
            }
            #tenorinput::placeholder {
                color: white;
                opacity: 0.4;
            }
            .tenorgifpreview {
                display: inline;
            }
            .tenorgifpreview > img {
                border: solid 2px var(--modal_card_background);
                border-radius: 30px;
                max-width: 200px;
                margin-left: 15px;
                min-width: 200px;
                min-height: 200px;
                max-height: 200px;
                transition: border-width 0.1s linear, border 0.1s linear;
            }
            .tenorgifpreview.right {
                float:right;
                margin-top: -20px;
            }
            .tenorgifpreview:hover > img {
                border: solid 2px var(--blue_420);
            }
            .tenorgifpreview:hover > #vkreact_start {
                visibility: visible;
                transform: translateY(30px);
            }
            #vkreact_start {
                background-image: url('https://raw.githubusercontent.com/VKCOM/icons/master/src/svg/20/favorite_outline_20.svg');
                background-repeat: no-repeat;
                height: 20px;
                left: 20px;
                position: relative;
                visibility: hidden;
                transition: visibility 0.1s linear, transform 0.1s linear;
            }
            #vkreact_start:hover {
                background-image: url('https://raw.githubusercontent.com/VKCOM/icons/master/src/svg/20/favorite_20.svg');
            }
        `)
        let html = `
        <input type="text" placeholder="Поиск по Tenor" id="tenorinput" onkeyup="VKReact.plugins.tenor.onTenorInput(this, ${user_id})"> <!-- сука сука сука сука сука -->
        <div id="tenorgifs"></div>
        `
        new MessageBox({ title: "Tenor", width: 500, hideButtons: true, bodyStyle: 'padding:20px;height:500px;overflow-y:scroll;' }).content(html).show()
        this.onTenorInput(document.getElementById("tenorinput"), user_id)
    },
    onTenorInput: async function(input, user_id) {
        if (input.value.trim() == '') {
            let gifs = document.getElementById("tenorgifs")
            gifs.innerHTML = ''
            let favs = VKReact.gifManager.get().filter(it => it.fav)
            this.extendTenorResults(favs,user_id,input,true)
            return
        }
        let fetched = await fetch(`${VKReact.apiURL}/tenor_search?q=${input.value}`)
        let json = await fetched.json()
        let gifs = document.getElementById("tenorgifs")
        let results = json.results.results
        let next = parseInt(json.results.next)
        gifs.innerHTML = ''
        this.extendTenorResults(results, user_id, input)
        let _last = 0
        let boxBody = document.querySelector(".box_body")
        async function listener() {
            if (boxBody.offsetHeight + boxBody.scrollTop >= boxBody.scrollHeight - 50) {
                if (((new Date().getTime() / 1000) - _last) < 2 ) {
                    return
                }
                _last = new Date().getTime() / 1000
                VKReact.log("[Tenor] Requesting more gifs")
                let fetched = await fetch(`${VKReact.apiURL}/tenor_search?q=${input.value}&next=${next}`)
                let json = await fetched.json()
                results = json.results.results
                next += 10
                VKReact.plugins.tenor.extendTenorResults(results, user_id, input)
                return
            }
        }
        if (this.scrollListener) {
            boxBody.removeEventListener("scroll", this.scrollListener)
        }
        boxBody.addEventListener("scroll", listener)
        this.scrollListener = listener
        cancelEvent(input)
    },
    extendTenorResults: function(results, user_id, input, favMode = false) {
        let gifs = document.getElementById("tenorgifs")
        results.forEach(function (it, index) {
            let style = ''
            let found = VKReact.gifManager.find(it.id)
            let img
            if (!favMode) {
                img = se(
                    `<div class="${(index+1) % 2 == 0 ? 'tenorgifpreview right' : 'tenorgifpreview'}">
                        <div id="vkreact_start" onclick="VKReact.plugins.tenor.addToFavs(this, '${it.id}', '${it.media[0].gif.url}')"></div>
                        <img src="${it.media[0].gif.url}" style="${style}" onclick="VKReact.plugins.tenor.onGifSend('${user_id}', '${it.id}', '${input.value}', '${it.media[0].gif.url}')">
                    </div>`)
            }
            else {
                img = se(
                    `<div class="${(index+1) % 2 == 0 ? 'tenorgifpreview right' : 'tenorgifpreview'}">
                        <div id="vkreact_start" onclick="VKReact.plugins.tenor.addToFavs(this, '${it.id}', '${it.url}')"></div>
                        <img src="${it.url}" style="${style}" onclick="VKReact.plugins.tenor.onGifSend('${user_id}', '${it.id}', '${input.value}', '${it.url}')">
                    </div>`)
            }
            if (found && found.fav) {
                img.querySelector("div").style.backgroundImage = "url('https://raw.githubusercontent.com/VKCOM/icons/master/src/svg/20/favorite_20.svg')"
            }
            gifs.appendChild(img)
        })
    },
    onGifSend: async function(user_id, gif_id, query, gif_url) {
        let found = VKReact.gifManager.find(gif_id)
        if (found && found.attachment[user_id]) {
            VkAPI.call("messages.send", {"user_id": user_id, "random_id": VKReact.randomUint32(), "attachment": found.attachment[user_id]})
        }
        else {
            let body = document.querySelector(".box_body")
            body.innerHTML = '<div id="app" style="text-align:center;">Производится оправка.. (Вы можете закрыть это окно)</div><div class="loader"></div>'
            let response = await fetch(`${VKReact.apiURL}/send_gif?peer_id=${user_id}&q=${query}&gif_id=${gif_id}&gif_url=${gif_url}&user_id=${vk.id}`)
            let json = await response.json()
            if (found) {
                found.attachment[user_id] = json.attachment
            }
            else VKReact.gifManager.get().push({"id": gif_id, "fav": 0, "url": gif_url, "attachment": {user_id: json.attachment}})
            VKReact.gifManager.save()
        }
        document.querySelector("#box_layer > div.popup_box_container > div > div.box_title_wrap > div.box_x_button").click()
    },
    addToFavs: function(star, gif_id, gif_url) {
        console.log(gif_id)
        // gifManager uses optimized gif object
        let found = VKReact.gifManager.find(gif_id)

        if (found) {
            if (found.fav) { //disliked
                star.style.backgroundImage = "url('https://raw.githubusercontent.com/VKCOM/icons/master/src/svg/20/favorite_outline_20.svg')"
            }
            else {
                star.style.backgroundImage = "url('https://raw.githubusercontent.com/VKCOM/icons/master/src/svg/20/favorite_20.svg')"
            }
            found.fav = !found.fav
            VKReact.gifManager.save()
            return
        }

        VKReact.gifManager.get().push({"id": gif_id, "fav": 1, "url": gif_url})
        VKReact.gifManager.save()

    },
    on: "dialog"
}

VKReact.plugins['patch_chat'] = {
    im_start: async function () {
        let cur_loc = clone(nav.objLoc);
        let user_id = document.getElementById("vkl_ui_action_menu_vkreact").getAttribute("data-peer")
        let response = await vkApi.api("messages.getHistory", {"user_id":user_id, "rev":"1", "count":"1"})
        let mid = response['items'][0]['id']
        nav.go(extend(cur_loc, {'sel':''}));
         setTimeout(function(){
            nav.go(extend(cur_loc, {'msgid': mid,'sel':user_id}));
         },300)
    },
    run: function (user_id) {
        let contextMenu = document.getElementById('vkl_ui_action_menu_vkreact')
        if (!contextMenu) {
            // selector to button
            let btn = document.querySelector(`#content > div > div.im-page.js-im-page.im-page_classic.im-page_history-show > div.im-page--history.page_block._im_page_history > div.im-page-history-w > div.im-page--chat-header._im_dialog_actions > div.im-page--chat-header-in > div.im-page--toolsw > div.im-page--aside > div:nth-child(6)`)
            GM_addStyle(`
                .ui_actions_menu_icons.vkl.vkreact {
                    background-image: url('https://svgshare.com/i/dL2.svg') !important;
                    background-color: initial;
                }
                #im_start::before {
                    background-image: url('https://raw.githubusercontent.com/VKCOM/icons/master/src/svg/24/arrow_up_24.svg') !important;
                }
                #im_start::before:hover {
                    background-image: url('https://raw.githubusercontent.com/VKCOM/icons/master/src/svg/24/arrow_up_24.svg') !important;
                }
            `)
            let created = se(`
            <div id="vkl_ui_action_menu_vkreact" class="vkl im-page--header-more im-page--header-menu-button _im_dialog_action_wrapper" data-peer="${user_id}">
                <div class="vkl ui_actions_menu_wrap _ui_menu_wrap" onmouseover="uiActionsMenu.show(this);" onmouseout="uiActionsMenu.hide(this);">
                    <div class="ui_actions_menu_icons vkl vkreact" tabindex="0" role="button" aria-label="Действия">
                        <span class="blind_label">Действия</span>
                    </div>
                    <div class="vkl ui_actions_menu _ui_menu im-page--redesigned-menu">
                        <a id="im_start" class="ui_actions_menu_item im-action _im_action im-action_start vkreact" onclick="VKReact.plugins.patch_chat.im_start()">
                            Перейти к началу чата
                        </a>
                        <!--
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
                        -->
                    </div>
                </div>
            </div>`)
            btn.after(created)
        }
        else {
            contextMenu.setAttribute("data-peer", user_id)
        }
    },
    on: "dialog"
}

VKReact.gifManager = {
    // stores all gif attachments sent by this user
    _gif_manager: [],
    save: function() {
        VKReact.log("Saving gif manager :)")
        fetch(`${VKReact.apiURL}/save_gif_manager`, {
            headers: {
                'Content-Type': 'application/json'
              },
              method: "POST", 
              body: JSON.stringify({"gif_manager": this._gif_manager, "user_id": vk.id})
        })
    },
    get: function () {
        return this._gif_manager
    },
    find: function(id) {
        return this._gif_manager.find(value => value.id == id)
    }
}

// патчи в ленту (работает как в сообществе, так и с /feed)
VKReact.plugins['disable_ads'] = {
    run: function (context) {
        setInterval(() => {
            if (VKReact.settings.disable_awayphp) {
                let links = document.querySelectorAll('a[href*="/away.php"]:not([vkreact_marked="true"])')
                links.forEach(node => {
                    node.setAttribute("vkreact_marked", "true")
                    let href = node.getAttribute('href');
                    let params = q2ajx(href.split('?')[1]);
                    if (!params.to) 
                       return;
                    let new_lnk = vkUnescapeCyrLink(params.to)
                    if (/^[a-z]+%/.test(new_lnk))
                       return;
                    if (!new_lnk)
                       return;
                    node.setAttribute('href', new_lnk);
                })
            }
            if (VKReact.settings.disable_ads) document.querySelectorAll(".ads_ad_box").forEach(it => it.parentElement.parentElement.parentElement.remove())
            let posts = document.querySelectorAll("div[id*=\"post\"]")
            posts.forEach(async row => {
                if (/post-?\d+_\d+/i.test(row.id)) {
                    if (VKReact.settings.disable_ads) {
                        let post_date = row.querySelector(".post_date")
                        if (post_date?.textContent?.startsWith("Рекламная запись") || row.querySelector(".ads_ad_box") || row.querySelector(".wall_marked_as_ads") ||
                        // источник 
                        row.querySelector('.Post__copyright')) {
                            row.remove()
                        }
                    }
                    if (VKReact.settings.feed_disable_comments) {
                        row.querySelector(".replies_list")?.remove()
                    }
                    if (VKReact.settings.feed_disable_reposts && row.querySelector(".copy_quote")) {
                        row.remove()
                    }
                    if (VKReact.settings.feed_votes_without_vote) {
                        let vote = row.querySelector(".media_voting_can_vote")
                        if (vote && !vote.getAttribute("vkreact_marked")) {
                            let owner_id = vote.getAttribute("data-owner-id")
                            let poll_id = vote.getAttribute("data-id")
                            let options = vote.querySelectorAll(".media_voting_option_wrap")
                            let poll = await VkAPI.call("polls.getById", {"owner_id": owner_id, "poll_id": poll_id})
                            let answers = poll['answers']
                            if (!answers) {
                                return
                            }

                            Object.values(answers).forEach(answer => {
                                let option = null
                                options.forEach(opt => {
                                    if (opt.getAttribute("data-id") == answer["id"].toString()) option = opt
                                })
                                option.querySelector('.media_voting_option_bar').style = `transform:scaleX(${answer['rate']/100});-o-transform:scaleX(${answer['rate']/100})`

                                let text = option.querySelector(".media_voting_option_percent")
                                text.textContent = answer['rate']
                            })
                            vote.setAttribute("vkreact_marked", true)
                        }
                    }
                    
                }
            })
            if (VKReact.settings.feed_disable_recc) {
                let feed_rows = document.querySelectorAll(".feed_row")
                feed_rows.forEach(row => {
                    if (row.querySelector(".feed_friends_recomm") || row.querySelector(".feed_groups_recomm")) {
                        row.remove()
                    }
                })
                document.querySelector("#friends_possible_block")?.remove()
            }

        }, 200)
    },
    on: "start"
}
unsafeWindow.VKReact = VKReact
function onLoad() {
    VKReact.main()
}
VKReact.onLoad = onLoad