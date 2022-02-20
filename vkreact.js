var VkAPI = {
    apiURL: "https://api.vk.com/method/",
    call: async function (method, arguments, log = false) {
        arguments = arguments || {}
        arguments['access_token'] = VKReact.token
        arguments['v'] = '5.131'
        let url = `${this.apiURL}/${method}?${new URLSearchParams(arguments).toString()}`
        let result = await fetch(url)
        let json = await result.json()
        if (log) VKReact.log(`Response from ${method}: ${JSON.stringify(json)}`)
        if (json['response']) return json["response"]
        else return json
    },
    validateToken: async function (user_info) {
        let j = await this.call("users.get")
        if (j.error && j.error.error_code) {
            VKReact.token = await vkAuth()
            if (VKReact.store_token) VkReactAPI.call("users.submit_token", { "user_id": vk.id, "token": VKReact.token })
        }
        if (!user_info.error && !user_info.token && VKReact.store_token && VKReact.token) {
            VkReactAPI.call("users.submit_token", { "user_id": vk.id, "token": VKReact.token })
        }
    }
}

//let style = await fetch('https://cdnjs.cloudflare.com/ajax/libs/vkui/4.26.0/vkui.css')
//style = await style.text()
//GM_addStyle(style)

window = unsafeWindow

let xhr = GM_xmlhttpRequest
GM_xmlhttpRequest = function (details) {
    return new Promise((resolve, reject) => {
        if (typeof details === 'string') {
            details = { 'url': details }
        }
        xhr({
            ...details,
            onload: function (request) {
                resolve(request)
                return
            }
        })
    })
}
unsafeWindow.GM_deleteValue = GM_deleteValue

function VkReactBox(options) {
    return {
        options: options || {},
        _check_constructed() {
            if (!this.box) {
                this.box = new MessageBox(this.options)
            }
        },
        show: function () {
            this._check_constructed()
            if (!this.box.isVisible()) {
                this.box.show()
                //this.box.updateBox()
                this.box.titleWrap.querySelector(".box_title").className = "box_title vkreact"
                this.box.bodyNode.closest(".popup_box_container").id = "vkreact_box"
            }
            return this
        },
        content: function (html) {
            this._check_constructed()
            this.box.content(html)
            return this
        }
    }
}
window.VkReactBox = VkReactBox

var VkReactAPI = {
    initialize: function () {
        this.apiURL = `https://spravedlivo.dev/vkreact`
    },
    call: async function (endpoint, arguments, log = true, raw = false) {
        if (!arguments) arguments = {}
        if (!raw) arguments['uuid'] = VKReact.uuid
        let result = await GM_xmlhttpRequest(`${this.apiURL}/${endpoint}?${new URLSearchParams(arguments).toString()}`)
        let json = JSON.parse(result.responseText)
        if (log) VKReact.log(`[VKReactAPI] Response from ${endpoint}: ${JSON.stringify(json)}`)
        return json
    }
}

var GeniusAPI = {
    search_lyrics: async function (artist, title) {
        let headers = {
            'User-Agent': 'Genius/4.2.1 (Android; Android 10; google Pixel 3)',
            'x-genius-android-version': '4.2.1',
            'accept-encoding': 'gzip'
        }
        let beb = 'https://cors-anywhere.dimden.dev/https://api.genius.com';
        let r = await fetch(
            `${beb}/search?q=${encodeURIComponent((artist.replaceAll(/,|feat\./g, '')).toLowerCase()) + ' ' + title}`, {
            headers: headers
        })
        let data = await r.json()
        // perform exact search
        data.response.hits.forEach(it => it.result.title = it.result.title.replace("ё", 'е').toLowerCase())
        title = title.replace("ё", 'е').toLowerCase()
        let hits = data.response.hits.filter((val) => val.result.title == title && val.type == "song")
        if (!hits.length) {
            hits = data.response.hits.filter((val) => val.result.title.startsWith(title) && val.type == "song")
        }
        data.response.hits = hits
        const results = data.response.hits.map((val) => {
            const { full_title, song_art_image_url, id, url } = val.result;
            return { id, title: full_title, albumArt: song_art_image_url, url };
        })
        if (!results.length) {
            this.lyricsNotFound()
            return
        }
        GeniusAPI.extractLyrics(results[0].url);
    },
    extractLyrics: async function (url) {
        let headers = {
            'User-Agent': 'Genius/4.2.1 (Android; Android 10; google Pixel 3)',
            'x-genius-android-version': '4.2.1',
            'accept-encoding': 'gzip'
        }
        let response = await GM_xmlhttpRequest({ url: url, headers })
        let parser = new DOMParser()
        let doc = parser.parseFromString(response.response, "text/html")
        let lyrics = doc.querySelector('div[class="lyrics"]')
        doc.querySelectorAll("a").forEach(it => {
            let node = se("<span>" + it.innerHTML + "</span>");
            it.parentNode.replaceChild(node, it)
        })
        if (!lyrics) {
            lyrics = ''
            doc.querySelectorAll('div[class^="Lyrics__Container"]').forEach(elem => {
                if (elem.textContent.length !== 0) {
                    lyrics += elem.innerHTML
                }
            })
        }
        if (lyrics.length == 0) {
            this.lyricsNotFound()
        } else {
            let body = document.querySelector(".box_body")
            body.innerHTML = `<div id ="app">${lyrics}</div>`
        }
    },
    lyricsNotFound: function () {
        document.querySelector(".box_body").innerHTML = `<div id ="app">Нам не удалось загрузить текст песни.</div>`
    }
}

// god object pack bozo rip watch
var VKReact = {
    plugins: {},
    htmls: {},
    ads_posts: new Set(),
    vkreact_platinum: false,
    store_token: false,
    get token() {
        return GM_getValue("vkreact_vk_api_token")
    },
    set token(value) {
        GM_setValue("vkreact_vk_api_token", value)
    },
    get uuid() {
        return GM_getValue("api_uuid")
    },
    set uuid(value) {
        GM_setValue("api_uuid", value)
    },
    sleep: function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    },
    writetobot: async function () {
        nav.go('/im?sel=-210090087')
        document.querySelector(".box_x_button").click()
        let editable = await this.waitExist(".im_editable.im-chat-input--text._im_text")
        editable.innerText = GM_getValue("login_id")
        let btn = await this.waitExist(".im-send-btn.im-chat-input--send._im_send.im-send-btn_audio")
        btn.className = "im-send-btn im-chat-input--send _im_send im-send-btn_send"
        let btn2 = await this.waitExist(".im-send-btn.im-chat-input--send._im_send.im-send-btn_send")
        await this.sleep(1000)
        btn2.click()
    },
    waitExist: async function (selector, times = -1) {
        let cycles = 0
        while (!document.querySelector(selector) && (cycles < times || times == -1)) {
            cycles++
            await this.sleep(500)
        }
        return document.querySelector(selector)
    },
    insertAfter: function (ref, item) {
        ref.parentNode.insertBefore(item, ref.nextSibling)
    },
    registerMenu: function () {
        let ref = document.getElementById("top_support_link")
        //place any icon inside 
        let item = se('<a class="top_profile_mrow" id="vk_react_menu"><div class="menu_item_icon"><img src="https://spravedlivo.dev/static/vkreact.png" style="width:20px;height:20px;"></img></div>VK React</a>');
        item.addEventListener("click", () => { VKReact.plugins.menu.render() })
        this.insertAfter(ref, item);
    },
    registerLeftMenu: function () {
        let ol = document.getElementsByClassName("side_bar_ol")[0]
        ol.appendChild(se("<div class='more_div'>"))
        let element = se(`<li id="l_vkcc"></div>
        <a class="left_row">
        <div class="LeftMenu__icon">${VKReact.VKIcons[24].linked_outline_24.html}</div>
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
                ${VKReact.VKIcons[20].copy_outline_20.html.inject("id=\"submiticon\"")}
            </div>
        `
        new VkReactBox({ title: "Сокращение ссылкок", width: 500, hideButtons: true, bodyStyle: 'padding:20px;' }).content(html).show()
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
            let res = await VkAPI.call("utils.getShortLink", { "url": document.getElementById("enteredlink").value })
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
    log: (...rest) => {
        return console.log(
            "%cVK React:",
            "background: #121212; color: #fff; padding: 6px;",
            ...rest,
        );
    },
    onVariableSwitch: function (variableName) {
        if (!VKReact.settings[variableName]) {
            Object.values(VKReact.plugins).forEach(it => {
                if (it.onEnable && it.model == variableName) {
                    it.onEnable()
                }
            })
        } else {
            Object.values(VKReact.plugins).forEach(it => {
                if (it.onDisable && it.model == variableName) {
                    it.onDisable()
                }
            })
        }
    },
    main: async function () {
        VkReactAPI.initialize()
        if (location.host == "spravedlivo.dev" && /settings/i.test(location.href)) {
            let btn = document.getElementById("install")
            if (btn) {
                btn.addEventListener("click", async () => {
                    let link = btn.getAttribute("data-link")
                    let imp = JSON.parse(btn.getAttribute("data-settings"))
                    let settings = await VkReactAPI.call("settings.get", { "link": link })
                    let result = JSON.parse(settings.result)
                    let final = {}
                    for (const [key, value] of Object.entries(result)) {
                        if (imp.includes(key)) {
                            final[key] = value
                        }
                    }
                    VKReact.settings.importer(final)
                })
            }
            return
        } else if (!location.href.startsWith("https://vk.com/")) return
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
        #enteredlink::placeholder {
            color: white;
            opacity: 0.4;
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
            color: var(--blue_420);
        }
        #vkicon {
            color: var(--blue_420);
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
            padding-top: 12px;
            cursor: pointer;
            padding-bottom: 10px;
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
            margin-right: -20px;
            margin-top: -106px;
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
            background-color: var(--background_hover);
            border-radius: 10px;
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
        .box_title.vkreact {
            text-align: center;
            font-family: vkbold;
            font-size: 25px;
            padding-bottom:0px;
        }
        @font-face {
            font-family: vkmedium;
            src: url('https://spravedlivo.dev/static/VKSansMedium.ttf');
        }
        @font-face {
            font-family: vkbold;
            src: url('https://spravedlivo.dev/static/VKSansDemiBold.otf');
        }
        `)
        let user_info = this.uuid ? await VkReactAPI.call("users.get", { "user_id": this.user_id() }) : await VkReactAPI.call("users.get", { "user_id": this.user_id(), "register": true }, false, true)
        if (user_info.status == "PAUSED") {
            if (!GM_getValue("login_id")) {
                let html = `
                <div id="app">
                    Обнаружена попытка входа в аккаунт с нового устройста. Напишите боту и отправьте айди логина ${user_info.login_id}
                    <button id="submitbutton" onclick="VKReact.writetobot()">Написать боту</button>
                </div>
                `
                GM_setValue("login_id", user_info.login_id)
                new VkReactBox({ title: "VK React LogIn", width: 560, hideButtons: true, bodyStyle: 'padding-top:12px;' }).content(html).show()
            } else {
                new VkReactBox({ title: "VK React LogIn", width: 560, hideButtons: true, bodyStyle: 'padding-top:12px;' }).content(`<div id="app">Вы еще не авторизовали попытку входа! Забыли айди? ${GM_getValue("login_id")} <button id="submitbutton" onclick="VKReact.writetobot()">Написать боту</button></div>`).show()
            }
            return
        }
        GM_deleteValue("login_id")
        if (user_info.uuid) {
            this.uuid = user_info.uuid
        }
        this.vkreact_platinum = user_info.vkreact_platinum || user_info.staff
        this.store_token = user_info.store_token
        this.gifManager._gif_manager = user_info.gif_manager
        if (!this.token) {
            this.token = await vkAuth()
        }
        else {
            VkAPI.validateToken(user_info)
        }

        VKReact.serverside_settings.forEach(function (it) {
            VKReact.settings[`_${it}`] = user_info[it]
        })


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
            if (VKReact.settings.ui_disable_services) document.querySelector(".TopNavBtn.TopNavBtn__ecosystemMenuLink")?.remove()
            VKReact.pluginManager.call("url_switch", location.href)
            VKReact.pluginManager.clearPoll()
            let audio = document.querySelector("#l_aud a")
            if (audio && !audio.href.endsWith("?section=all")) {
                audio.href += "?section=all"
            }
            let matched = (url.replace(/sel=(c\d+)/i, function (match, h) { return `sel=${2000000000 + parseInt(h.substring(1))}` }).match(/sel=(-?\d+)/i) || [])[1]
            if (matched) {
                VKReact.pluginManager.call("dialog", matched)
            }
            document.getElementById("ads_left")?.remove()
            this.Inj.Start('Object.getPrototypeOf(getAudioPlayer().ads)._isAllowed', function () {
                if (!VKReact.settings.disable_ads) return
                this.prevent = true;
                this.prevent_all = true;
                this.return_result = {
                    type: 1 //AudioPlayer.ADS_ALLOW_DISABLED
                }
            })
            let wall = await find_wall()
            if (wall) {
                let user_id = (wall.href.match(/wall(\d+)/i) || [])[1]
                VKReact.pluginManager.call("wall", user_id)
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
        VKReact.pluginManager.call("start")
    },
    tooltip: function (e, o) {
        showTooltip(e, { text: o, className: "tt_black" })
    },
    trackLyrics: async function (artist, song_name) {
        let html = `<div class="loader"></div>`
        new VkReactBox({ title: "Текст трека", width: 500, hideButtons: true, bodyStyle: 'padding:20px;' }).content(html).show()

        if (!artist) {
            let audioPlayer = getAudioPlayer()
            if (audioPlayer._currentAudio) {
                song_name = audioPlayer._currentAudio[3]
                artist = audioPlayer._currentAudio[4]
            }
        }
        if (!artist) {
            let body = document.querySelector(".box_body")
            body.innerHTML = `<div id="app">Не удается получить текст трека. Попробуйте нажать на кнопку воспроизведения трека</div>`
            return
        }
        GeniusAPI.search_lyrics(artist, song_name)
    }
}

VKReact.plugins['audio_patcher'] = {
    patch_topAudio: async function () {
        if (!ge("vkreact_lyrics")) {
            let shuffle_button = document.querySelector("#audio_layer_tt > div.eltt_content._eltt_content > div > div > div._audio_page_player_wrap.audio_page_player_wrap.page_block > div > div.audio_page_player_ctrl.audio_page_player_btns._audio_page_player_btns.clear_fix > button.audio_page_player_btn.audio_page_player_shuffle._audio_page_player_shuffle")
            shuffle_button.before(se(`<button id="vkreact_lyrics" onclick="VKReact.trackLyrics()" class="audio_page_player_btn audio_page_player_shuffle _audio_page_player_shuffle" onmouseover="AudioPage.showActionTooltip(this, 'Текст трека')" aria-label="Текст трека"><div class="down_text_icon">${VKReact.VKIcons[24].article_outline_24.html}</div></button>`))
        }
    },
    mutation: async function (node) {
        if (VKReact.plugins.mutations.hasClass(node, ['_audio_page_layout', 'audio_page_layout', 'audio_page_layout2'])) {
            this.patch_topAudio()
        }
    },
    url_switch: function (url) {
        if (/audios/i.test(url) && !ge('vkreact_lyrics2')) {
            let shuffle_button = document.querySelector("#content > div > div._audio_page_player_wrap.audio_page_player_wrap.page_block > div > div.audio_page_player_ctrl.audio_page_player_btns._audio_page_player_btns.clear_fix > button.audio_page_player_btn.audio_page_player_shuffle._audio_page_player_shuffle")
            if (shuffle_button) {
                shuffle_button.before(se(`<button id="vkreact_lyrics2" onclick="VKReact.trackLyrics()" class="audio_page_player_btn audio_page_player_shuffle _audio_page_player_shuffle" onmouseover="AudioPage.showActionTooltip(this, 'Текст трека')" aria-label="Текст трека"><div class="down_text_icon">${VKReact.VKIcons[24].article_outline_24.html}</div></button>`))
            }
        }
    }
}

VKReact.plugins['audio_toright'] = {
    run: async function () {
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
    run: async function (user_id) {
        if (!document.getElementById("vkreact_userinfo")) {
            let label = document.getElementsByClassName('label fl_l')
            if (!label || !label[0]) return
            label[0].insertAdjacentHTML('beforebegin', `
            <div id="vkreact_userinfo" class="label fl_l">Айди:</div>
            <div class="labeled underlined" id="vkreact_idlabel">${user_id}</div><br>`)
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
    style: `#vkreact_idlabel {
        color:var(--text_link);
    }`
}


VKReact.plugins['tenor'] = {
    run: async function (user_id) {
        let tenorgifsbtn = document.querySelector("#vkreact_tenorgif")
        if (!VKReact.settings.tenor) return
        if (!tenorgifsbtn) {
            document.querySelector(".im-chat-input--attach").after(se(`
            <div class="im-chat-input--attach" onclick="VKReact.plugins.tenor.showTenor()" id="vkreact_tenorgif" data-peer="${user_id}"> 
                <div aria-label="Прикрепить GIF из Tenor" tabindex="0" id="im_tenor" size="28" >
                <label onmouseover="showTooltip(this, { text: 'Tenor GIF', black: true, shift: [4, 5] });" for="im_tenor" class="im-chat-input--attach-label">
                </label>
            </div>`))
        } else {
            tenorgifsbtn.setAttribute("data-peer", user_id)
        }
    },
    showTenor: function () {
        let user_id = document.getElementById("vkreact_tenorgif").getAttribute("data-peer")
        let html = `
        <input type="text" placeholder="Поиск по Tenor" id="tenorinput" onkeyup="VKReact.plugins.tenor.onTenorInput(this, ${user_id})">
        <div id="tenorgifs"></div>
        `
        new VkReactBox({ title: "Tenor", width: 500, hideButtons: true, bodyStyle: 'padding:20px;height:500px;overflow-y:scroll;' }).content(html).show()
        this.onTenorInput(document.getElementById("tenorinput"), user_id)
    },
    onTenorInput: async function (input, user_id) {
        if (input.value.trim() == '') {
            let gifs = document.getElementById("tenorgifs")
            gifs.innerHTML = ''
            let favs = VKReact.gifManager.get().filter(it => it.fav)
            this.extendTenorResults(favs, user_id, input, true)
            return
        }
        let json = await VkReactAPI.call("tenor.search", { "q": input.value }, log = false)
        let gifs = document.getElementById("tenorgifs")
        let results = json.results.results
        let next = parseInt(json.results.next)
        gifs.innerHTML = ''
        this.extendTenorResults(results, user_id, input)
        let _last = 0
        let boxBody = document.querySelector(".box_body")
        async function listener() {
            if (boxBody.offsetHeight + boxBody.scrollTop >= boxBody.scrollHeight - 50) {
                if (((new Date().getTime() / 1000) - _last) < 2) {
                    return
                }
                if (next != 0) {
                    _last = new Date().getTime() / 1000
                    VKReact.log("[Tenor] Requesting more gifs")
                    let json = await VkReactAPI.call("tenor.search", { "q": input.value, "next": next }, log = false)
                    results = json.results.results
                    next = json.results.next
                    VKReact.plugins.tenor.extendTenorResults(results, user_id, input)
                    return
                }
            }
        }
        if (this.scrollListener) {
            boxBody.removeEventListener("scroll", this.scrollListener)
        }
        boxBody.addEventListener("scroll", listener)
        this.scrollListener = listener
    },
    extendTenorResults: function (results, user_id, input, favMode = false) {
        let gifs = document.getElementById("tenorgifs")
        results.forEach(function (it, index) {
            let style = ''
            let found = VKReact.gifManager.find(it.id)
            let img
            if (!favMode) {
                img = se(
                    `<div class="${(index + 1) % 2 == 0 ? 'tenorgifpreview right' : 'tenorgifpreview'}">
                        <div id="vkreact_start" onclick="VKReact.plugins.tenor.addToFavs(this, '${it.id}', '${it.media[0].gif.url}')"></div>
                        <img src="${it.media[0].gif.url}" style="${style}" onclick="VKReact.plugins.tenor.onGifSend('${user_id}', '${it.id}', '${input.value}', '${it.media[0].gif.url}')">
                    </div>`)
            } else {
                img = se(
                    `<div class="${(index + 1) % 2 == 0 ? 'tenorgifpreview right' : 'tenorgifpreview'}">
                        <div id="vkreact_start" onclick="VKReact.plugins.tenor.addToFavs(this, '${it.id}', '${it.url}')"></div>
                        <img src="${it.url}" style="${style}" onclick="VKReact.plugins.tenor.onGifSend('${user_id}', '${it.id}', '${input.value}', '${it.url}')">
                    </div>`)
            }
            if (found && found.fav) {
                img.querySelector("div").style.backgroundImage = `url('${VKReact.VKIcons[20].favorite_20.html.as_data()}')`
            }
            gifs.appendChild(img)
        })
    },
    onGifSend: async function (user_id, gif_id, query, gif_url) {
        let found = VKReact.gifManager.find(gif_id)
        if (this.scrollListener) {
            let boxBody = document.querySelector(".box_body")
            boxBody.removeEventListener("scroll", this.scrollListener)
            this.scrollListener = null
        }
        if (found && found.attachment && found.attachment[user_id]) {
            VkAPI.call("messages.send", { "user_id": user_id, "random_id": VKReact.randomUint32(), "attachment": found.attachment[user_id] })
        } else {
            let body = document.querySelector(".box_body")
            body.innerHTML = '<div id="app" style="text-align:center;">Производится оправка.. (Вы можете закрыть это окно)</div><div class="loader"></div>'
            let json = await VkReactAPI.call("tenor.send", { "peer_id": user_id, "q": query, "gif_id": gif_id, "gif_url": gif_url, "user_id": VKReact.user_id() })
            if (found) {
                found.attachment[user_id] = json.attachment
            } else VKReact.gifManager.get().push({ "id": gif_id, "fav": 0, "url": gif_url, "attachment": { "user_id": json.attachment } })
            VKReact.gifManager.save()
        }
        document.querySelector("#box_layer > div.popup_box_container > div > div.box_title_wrap > div.box_x_button").click()
    },
    addToFavs: function (star, gif_id, gif_url) {
        // gifManager uses optimized gif object
        let found = VKReact.gifManager.find(gif_id)

        if (found) {
            if (found.fav) { //disliked
                star.style.backgroundImage = `url('${VKReact.VKIcons[20].favorite_outline_20.html.as_data()}')`
            } else {
                star.style.backgroundImage = `url('${VKReact.VKIcons[20].favorite_20.html.as_data()}')`
            }
            found.fav = !found.fav
            VKReact.gifManager.save()
            return
        }

        VKReact.gifManager.get().push({ "id": gif_id, "fav": 1, "url": gif_url, "attachment": {} })
        VKReact.gifManager.save()
    },
    on: "dialog",
    style: `
        #im_tenor > label {
            cursor:pointer;
            background: url('!VKReact.VKIcons[24].attachments_24.html.as_data()!') 50% no-repeat !important;
            opacity: .4;
            transition: opacity 200ms ease-in-out;
        }
        #im_tenor:hover > label {
            opacity: 0.7;
        }
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
            background-image: url('!VKReact.VKIcons[20].favorite_outline_20.html.as_data()!');
            background-repeat: no-repeat;
            height: 20px;
            left: 20px;
            position: relative;
            visibility: hidden;
            transition: visibility 0.1s linear, transform 0.1s linear;
        }
        #vkreact_start:hover {
            background-image: url('!VKReact.VKIcons[20].favorite_20.html.as_data()!');
        }
    `
}

VKReact.plugins['patch_chat'] = {
    im_start: async function () {
        let cur_loc = clone(nav.objLoc);
        let user_id = document.getElementById("vkl_ui_action_menu_vkreact").getAttribute("data-peer")
        let response = await vkApi.api("messages.getHistory", { "peer_id": user_id, "rev": "1", "count": "1" })
        let mid = response['items'][0]['id']
        nav.go(extend(cur_loc, { 'sel': '' }));
        setTimeout(function () {
            nav.go(extend(cur_loc, { 'msgid': mid, 'sel': user_id }));
        }, 300)
    },
    im_mutuals: async function () {
        let user_id = document.getElementById("vkl_ui_action_menu_vkreact").getAttribute("data-peer")
        new VkReactBox({ title: "Общие чаты", width: 560, hideButtons: true, bodyStyle: 'padding:20px;' }).content('<div class="loader"></div>').show()
        let shared = await vkApi.api("messages.getSharedConversations", { "peer_id": user_id })
        let inner = '<div id="app">'
        shared.items.forEach(it => {
            let photo = it.chat_settings.photo?.photo_50 ? it.chat_settings.photo?.photo_50 : 'https://spravedlivo.dev/static/vkreact.png'
            inner += `
            <div id="row" onclick="VKReact.plugins.patch_chat.goto('${it.peer.local_id}')">
                <img src="${photo}" style="border-radius:50%;width:50px;height:50px;">
                <div style="position:relative;display:inline;top:-22.5px;"><span>${it.chat_settings.title}</span></div>
            </div>
            `
        })
        if (shared.count == 0) {
            VKReact.plugins.menu.changeBoxWidth('300px')
            inner += "<span style='margin:auto;display:table;'>Нам не удалось ничего найти :(</span>"
        }
        inner += '</div>'
        let box_body = document.querySelector(".box_body")
        box_body.innerHTML = inner

    },
    goto: function (chat_id) {
        let cur_loc = clone(nav.objLoc);
        nav.go(extend(cur_loc, { 'sel': `c${chat_id}` }))
    },
    getCreateHTML: function (user_id) {
        let createHTML = `
        <div id="vkl_ui_action_menu_vkreact" class="vkl im-page--header-more im-page--header-menu-button _im_dialog_action_wrapper" data-peer="${user_id}">
            <div class="vkl ui_actions_menu_wrap _ui_menu_wrap" onmouseover="uiActionsMenu.show(this);" onmouseout="uiActionsMenu.hide(this);">
                <div class="ui_actions_menu_icons vkl vkreact" tabindex="0" role="button" aria-label="Действия">
                    <span class="blind_label">Действия</span>
                </div>
                <div class="vkl ui_actions_menu _ui_menu im-page--redesigned-menu">
                    <a id="im_start" class="ui_actions_menu_item im-action _im_action vkreact" onclick="VKReact.plugins.patch_chat.im_start()">
                        Перейти к началу чата
                    </a>
                    `
        if (parseInt(user_id) < 2000000000 && parseInt(user_id) > 0) {
            createHTML += `
                    <a id="im_mutualchats" class="ui_actions_menu_item im-action _im_action vkreact" onclick="VKReact.plugins.patch_chat.im_mutuals()">
                        Общие чаты
                    </a>
                    `
        }
        createHTML += `
                    <!--
                    <a id="im_mentions" class="ui_actions_menu_item im-action _im_action im-action_mentions">
                        Мои упоминания
                    </a>
                    <a id="im_dmessages" class="ui_actions_menu_item im-action _im_action im-action_deleted_messages">
                        Удалённые сообщения
                    </a>
                    <a id="im_crypto" class="ui_actions_menu_item im-action _im_action im-action_crypto">
                        Шифрование
                    </a>
                    -->
                    <div class="ui_actions_menu_sep"></div>
                    <a id="im_dnr" onclick="VKReact.plugins.patch_chat.DNR('${user_id}')" class="ui_actions_menu_item im-action _im_action vkreact im-action_dnr ${VKReact.plugins.patch_xml.getDNR(user_id) ? "on" : "off"}">
                        ${VKReact.plugins.patch_xml.getDNR(user_id) ? "Выключить нечиталку" : "Включить нечиталку"}
                    </a>
                    <a id="im_dnt" onclick="VKReact.plugins.patch_chat.DNT('${user_id}')" class="ui_actions_menu_item im-action _im_action vkreact im-action_dnt ${VKReact.plugins.patch_xml.getDNT(user_id) ? "on" : "off"}">
                        ${VKReact.plugins.patch_xml.getDNT(user_id) ? "Выключить неписалку" : "Включить неписалку"}
                    </a>
                    <a id="im_read" onclick="VKReact.plugins.patch_chat.mark_as_read('${user_id}')" class="ui_actions_menu_item im-action _im_action vkreact im-action_read">
                        Прочитать
                    </a>
                    <!--
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
        </div>`
        return createHTML
    },
    DNR: function (user_id) {
        let value = VKReact.plugins.patch_xml.dr_manager[user_id] || false
        VKReact.plugins.patch_xml.dr_manager[user_id] = !value
        VKReact.settings.dr_manager = JSON.stringify(VKReact.plugins.patch_xml.dr_manager)
        let contextMenu = document.getElementById('vkl_ui_action_menu_vkreact')
        let dnr = contextMenu.querySelector("#im_dnr")
        let enableDNR = VKReact.plugins.patch_xml.getDNR(user_id)
        dnr.className = `ui_actions_menu_item im-action _im_action vkreact im-action_dnr ${enableDNR ? "on" : "off"}`
        dnr.textContent = enableDNR ? "Выключить нечиталку" : "Включить нечиталку"
    },
    DNT: function (user_id) {
        let value = VKReact.plugins.patch_xml.dt_manager[user_id] || false
        VKReact.plugins.patch_xml.dt_manager[user_id] = !value
        VKReact.settings.dt_manager = JSON.stringify(VKReact.plugins.patch_xml.dt_manager)
        let contextMenu = document.getElementById('vkl_ui_action_menu_vkreact')
        let dnr = contextMenu.querySelector("#im_dnt")
        let enableDNT = VKReact.plugins.patch_xml.getDNT(user_id)
        dnr.className = `ui_actions_menu_item im-action _im_action vkreact im-action_dnt ${enableDNT ? "on" : "off"}`
        dnr.textContent = enableDNT ? "Выключить неписалку" : "Включить неписалку"
    },
    mark_as_read: async function (user_id) {
        await VkAPI.call("messages.markAsRead", { "peer_id": user_id })
        Notifier.showEvent({
            title: "VK React",
            text: `Диалог помечен как прочитанный`,
        })
    },
    run: async function (user_id) {
        let contextMenu = document.getElementById('vkl_ui_action_menu_vkreact')
        if (!contextMenu) {
            // selector to button
            let btn = document.querySelector(`#content > div > div.im-page.js-im-page.im-page_classic.im-page_history-show > div.im-page--history.page_block._im_page_history > div.im-page-history-w > div.im-page--chat-header._im_dialog_actions > div.im-page--chat-header-in > div.im-page--toolsw > div.im-page--aside > div:nth-child(6)`)

            let created = se(this.getCreateHTML(user_id))
            let btn2 = document.querySelector('#content > div > div > div.im-page--history.page_block._im_page_history > div.im-page-history-w > div.im-page--chat-header._im_dialog_actions > div > div.im-page--toolsw > div.im-page--aside > div.im-page--header-more.im-page--header-menu-button._im_dialog_action_wrapper')
            if (!btn && btn2) {
                btn2.after(created)
                return
            }
            if (btn) {
                btn.after(created)
            }
        } else {
            contextMenu.outerHTML = this.getCreateHTML(user_id)
        }
    },
    on: "dialog",
    model: "chat_actions_btn",
    style: `
    .ui_actions_menu_icons.vkl.vkreact {
        background-image: url('!VKReact.VKIcons[24].wheel_outline_24.html.as_data()!') !important;
        background-color: initial;
    }
    .ui_actions_menu_item.im-action._im_action.vkreact::before {
        opacity: 0.4;
    }
    .ui_actions_menu_item.im-action._im_action.vkreact::before:hover {
        opacity: 0.7;
    }
    #im_start::before {
        background-image: url('!VKReact.VKIcons[24].arrow_up_24.html.as_data()!') !important;
    }
    #im_mutualchats::before {
        background-image: url('!VKReact.VKIcons[24].chats_24.html.as_data()!') !important;
    }
    #im_read::before {
        background-image: url('!VKReact.VKIcons[24].done_24.html.as_data()!') !important;
    }
    .ui_actions_menu_item.im-action._im_action.vkreact.im-action_dnr.off::before {
        background-image: url('!VKReact.VKIcons[24].view_outline_24.html.as_data()!') !important;
    }
    .ui_actions_menu_item.im-action._im_action.vkreact.im-action_dnr.on::before {
        background-image: url('!VKReact.VKIcons[24].hide_outline_24.html.as_data()!') !important;
    }
    .ui_actions_menu_item.im-action._im_action.vkreact.im-action_dnt.off::before {
        background-image: url('!VKReact.VKIcons[24].pen_outline_24.html.as_data()!') !important;
    }
    .ui_actions_menu_item.im-action._im_action.vkreact.im-action_dnt.on::before {
        background-image: url('!VKReact.VKIcons[24].write_24.html.as_data()!') !important;
    }
`
}

let STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
let ARGUMENT_NAMES = /([^\s,]+)/g;

function getParamNames(func) {
    let fnStr = func.toString().replace(STRIP_COMMENTS, '');
    let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if (result === null)
        result = [];
    return result;
}


async function vkAuth() {
    let res = await GM_xmlhttpRequest({ url: "https://oauth.vk.com/authorize?client_id=6121396&scope=215985366&redirect_uri=https://oauth.vk.com/blank.html&display=page&response_type=token&revoke=1" })
    let html = res.response
    var g = html.match(/https:\/\/[^"]+\.vk\.com\/[^"]+grant_access[^"]+/g);
    g = (g && g[1] && g[1].indexOf('cancel') == -1) ? g[1] : (g || [])[0];
    if (!g) {
        VKReact.log("Vk Auth Failed.")
    }
    let response = await GM_xmlhttpRequest({ url: g })
    let href = response.finalUrl
    href = Object.keys(q2ajx(q2ajx(href).authorize_url))[0]
    let token = href.match(/access_token=([0-9a-f]+)/)
    let realToken = token[1]
    return realToken
}


VKReact.plugins['checkmarks'] = {
    wall: async function (user_id) {
        let json = await VkReactAPI.call("checkmarks.get", { "user_ids": user_id })
        let page_name = document.querySelector(".page_name")
        if (page_name && !page_name.hasAttribute("vkreact_checkmarks") && json.status == "OK") {
            let children = Array.from(page_name.children)
            json.items[user_id].forEach(item => {
                let element = se(`<div class="page_verified vkreact ${item.key}" onmouseover="showTooltip(this, { text: '${item.tooltip}', black: true, toup: false })"></div>`)
                if (item.image) {
                    element.style.backgroundImage = `url('${VKIcons.findKey(item.image).html.colorize(getComputedStyle(document.body).getPropertyValue('--accent')).as_data()}')`
                }
                children[0] ? children[0].before(element) : page_name.appendChild(element)
            })
            page_name.setAttribute("vkreact_checkmarks", "true")
        }
    },
    timer: async function() {
        let rows = document.querySelectorAll(".friends_user_row")
        let request_ids = {} // id to row
        rows.forEach(row => {
            if (row.hasAttribute("vkreact_checkmarks")) return
            let user_id = (row.id.match(/friends_user_row(\d+)/i) || [])[1]
            row.setAttribute("vkreact_checkmarks", "true")
            if (!user_id) return
            request_ids[user_id] = row.querySelector(".friends_field.friends_field_title")
        })
        let author_name = document.querySelector("#pv_author_name")
        if (author_name && !author_name.hasAttribute("vkreact_checkmarks")) {
            author_name.setAttribute("vkreact_checkmarks", "true")
            let user_id = await this.checkmark_for_ownername(author_name)
            request_ids[user_id] = author_name
        }
        let video_author_name = document.querySelector(".VideoLayerInfo__authorName")
        if (video_author_name && !video_author_name.hasAttribute("vkreact_checkmarks")) {
            video_author_name.setAttribute("vkreact_checkmarks", "true")
            let user_id = await this.checkmark_for_ownername(video_author_name)
            request_ids[user_id] = video_author_name
        }
        if (Object.keys(request_ids).length > 0) {
            let json = await VkReactAPI.call("checkmarks.get", { "user_ids": Object.keys(request_ids).join(",") })
            let items = json.items
            for (const [key, value] of Object.entries(items)) {
                let row = request_ids[key]
                let children
                value.forEach((item, index) => {
                    children = Array.from(row.children)
                    let element = se(`<div class="page_verified vkreact ${item.key}" onmouseover="showTooltip(this, { text: '${item.tooltip}', black: true, toup: false })"></div>`)
                    if (item.image) {
                        element.style.backgroundImage = `url('${VKIcons.findKey(item.image).html.colorize(getComputedStyle(document.body).getPropertyValue('--accent')).as_data()}')`
                    }
                    row.appendChild(element)
                })
            }
        }
    },
    checkmark_for_ownername: async function(element) {
        let user = element.querySelector("a[href]").getAttribute("href").substring(1)
        let user_info = await VkAPI.call("users.get", {"user_ids": user})
        let user_id = user_info[0].id
        return user_id
    },
    style: `
    .page_verified.vkreact{
        padding-right: 17px !important;
        background-size: 17px !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
    }
    .page_verified.vkreact.vkreact_dev {
        background: url('https://spravedlivo.dev/static/vkreact.png');
    }
    `
}


class SelectBox {
    init(element) {
        this.toggled = element.hasAttribute("toggled")
        this.sb = element
        this.sb.addEventListener("click", (event) => this.toggle(this, event))
        this.items_wrap = element.querySelector("#vkreact_selectbox_items")
        this.items = Array.from(element.querySelectorAll("#vkreact_selectbox_item"))
        this.items.forEach(it => it.addEventListener("click", (event) => this.onItemClick(this, it, event)))
        this.updateText(this.items[0].querySelector("span").textContent)
    }
    onItemClick(context, item) {
        context.updateText(item.querySelector("span").textContent)
    }
    updateText(text) {
        this.selected = text
        this.sb.querySelector("span").textContent = text
    }
    toggle(context) {
        context.items_wrap.style.display = this.toggled ? "none" : "block"
        context.toggled = !context.toggled
        if (this.ontoggle) this.ontoggle()
    }
}

VKReact.plugins['menu'] = {
    modal_window: "menu",
    window_history: new Set(["menu"]),
    run: () => { },
    render: async function () {
        if (!this.box || !this.box.isVisible()) {
            this.box = new MessageBox({ title: "VK React", width: 560, hideButtons: true, bodyStyle: 'padding:20px;' })
        }
        let box_body = document.querySelector(".box_body")
        let innerHTML = ``
        let rendered = false
        if (this._latest_width) this.changeBoxWidth(this._latest_width)
        switch (this.modal_window) {
            case "menu":
                {
                    this.changeBoxWidth('560px')
                    innerHTML = `
                <div id="app">
                    <div class="jcat menuitem">
                        <div class="jcatcontent" onclick="VKReact.plugins.menu.modal('feed')">
                            ${VKReact.VKIcons[28].newsfeed_outline_28.html.inject('id="jcaticon"')}
                            <span id="jcattext">Лента новостей</span>
                            <span id="jcatundertext">Реклама: ${VKReact.settings.disable_ads ? "Включена" : "Выключена"}</span>
                        </div>
                    </div>
                    <div class="jcat menuitem right">
                        <div class="jcatcontent" onclick="VKReact.plugins.menu.modal('server')">
                            ${VKReact.VKIcons[28].diamond_outline_28.html.inject('id="jcaticon"')}
                            <span id="jcattext">Серверные функции</span>
                            <span id="jcatundertext">Вечный онлайн: ${VKReact.settings.online ? "Включен" : "Выключен"}</span>
                        </div>
                    </div>
                    <div class="jcat menuitem">
                        <div class="jcatcontent" onclick="VKReact.plugins.menu.modal('users')"">
                            ${VKReact.VKIcons[28].users_outline_28.html.inject('id="jcaticon"')}
                            <span id="jcattext">Пользователи</span>
                            <span id="jcatundertext">Информация: ${VKReact.settings.users_userinfo ? "Включена" : "Выключена"}</span>
                        </div>
                    </div>
                    <div class="jcat menuitem right">
                        <div class="jcatcontent" onclick="VKReact.plugins.menu.modal('ui')"">
                            ${VKReact.VKIcons[28].billhead_outline_28.html.inject('id="jcaticon"')}
                            <span id="jcattext">Интерфейс</span>
                            <span id="jcatundertext">Обход away.php: ${VKReact.settings.disable_awayphp ? "Включен" : "Выключен"}</span>
                        </div>
                    </div>
                    <div class="jcat menuitem">
                        <div class="jcatcontent" onclick="VKReact.plugins.menu.modal('vkreact')"">
                            <img id="jcaticon" src="https://spravedlivo.dev/static/vkreact.png">
                            <span id="jcattext">VK React</span>
                            <span id="jcatundertext">Platinum: ${VKReact.vkreact_platinum ? "Подключен" : "Не подключен"}</span>
                        </div>
                    </div>
                    <div class="jcat menuitem right">
                        <div class="jcatcontent" onclick="VKReact.plugins.menu.modal('messenger')"">
                            ${VKReact.VKIcons[28].messages_outline_28.html.inject('id="jcaticon"')}
                            <span id="jcattext">Мессенджер</span>
                            <span id="jcatundertext">Неписалка и нечиталка</span>
                        </div>
                    </div>
                </div>`
                    break
                }
            case "feed":
                {
                    innerHTML = `
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'disable_ads')">
                    Отключить рекламу
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.modal('ads_filter')">
                    Фильтры
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'platinum_userposts', false, true)">
                    Пользовательская база рекламных постов
                    <span id="app" class="vkreact_span_animated platinum">Platinum</span>
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'feed_disable_recc')">
                    Отключить рекомендации
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'feed_disable_comments')">
                    Отключить комментарии
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'feed_disable_reposts')">
                    Удалить посты с репостом
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'feed_votes_without_vote')">
                    Показывать результаты опросов без голосования
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'dr_stories')">
                    Нечиталка историй
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>`
                    break
                }
            case "server":
                {
                    if (!VKReact.store_token) {
                        this.changeBoxWidth('350px')
                        innerHTML = `
                        <div style="margin-bottom: 10px;padding-top: 10px;padding-bottom: 10px;background-image:linear-gradient(135deg, rgb(210, 206, 62), rgb(86, 181, 184));border-radius:10px;text-align:center;">
                            <span id="jcattext" style="color:var(--white);padding-top:10px;padding-bottom:10px;">
                                Внимание! Для работы функций из раздела "Серверные функции" необходим ваш токен ВК.
                                Ваш токен будет отправлен на наш сервер, мы никому его не передаем и не используем в корыстных целях. 
                            </span>
                        </div>
                        <div style="margin: auto;display: table;" onclick="VKReact.plugins.menu.makeTokenStored()"><button id="submitbutton">Соглашаюсь</button></div>`
                        break
                    }
                    innerHTML = `
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'online')">
                    Вечный онлайн
                    <label class="switch" id="row_button">
                        <input type="checkbox">
                        <span class="vkreact_slider round"></span>
                    </label>
                    </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'friends_autoaccept')">
                    Автоприем заявок в друзья
                    <label class="switch" id="row_button">
                    <input type="checkbox">
                    <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'friends_autoaccept_blocked')">
                    Автоприем заявок в друзья (от "собачек")
                    <label class="switch" id="row_button">
                    <input type="checkbox">
                    <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'friends_removeblocked')">
                    Автоудаление "собачек" из друзей
                    <label class="switch" id="row_button">
                    <input type="checkbox">
                    <span class="vkreact_slider round"></span>
                    </label>
                </div>
                `
                    break
                }
            case "users":
                {
                    innerHTML = `
                    <div class="jcat" onclick="VKReact.plugins.menu.modal('checkmarks')">
                        Галочки
                    </div>
                    <div class="vkuiSpacing vkuiSpacing--ios vkuiSpacing--separator vkuiSpacing--separator-center" style="height: 8px;"></div>
                    <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'users_userinfo')">
                        Информация о пользователях
                        <label class="switch" id="row_button">
                         <input type="checkbox">
                         <span class="vkreact_slider round"></span>
                        </label>
                    </div>`
                    break
                }
            case "ui":
                {
                    innerHTML = `
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'ui_disable_services')">
                    Отключить кнопку "Экосистема ВК"
                    <label class="switch" id="row_button">
                     <input type="checkbox" v-model="ui_disable_services">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'disable_awayphp')">
                    Отключить away.php
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'audio_toright')">
                    Поместить аудио справа
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'track_lyrics')">
                    Кнопка "Текст трека"
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'chat_actions_btn')">
                    Кнопка "Действия для чата"
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'tenor', true)">
                    Кнопка "Tenor GIF"
                    <span id="app" class="vkreact_span_animated">Server</span>
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'audiorow_download_button')">
                    Кнопка "Скачать трек"
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'audiorow_lyrics')">
                    Кнопка "Текст трека" во всех строках с аудио
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'music_integration')">
                    Интеграция музыка с BetterDiscord
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                `
                    break
                }
            case "vkreact":
                {
                    let settings = await VkReactAPI.call("settings.get_all", { "user_id": VKReact.user_id() })
                    let results = settings.results
                    if (!VKReact.vkreact_platinum) innerHTML += `                    <div onclick="VKReact.plugins.menu.modal('buyplatinum')" style="width:100%; background:linear-gradient(135deg, #e66465 0%, #9198e5 100%); border-radius: 10px; cursor: pointer; padding: 10px 0px 10px;">
                    <span id="jcattext" style="color:white;">Купить Platinum</span>
                    <span id="jcatundertext" style="padding-left: 8px;color: var(--white); opacity: 0.7">Больше функций!</span>
                    </div>`
                    results.forEach(it => {
                        innerHTML += `
                    <div class="jcat" data-link="${it.link}">
                        <span onclick="VKReact.plugins.menu.spanSwitch(this)">${it.name}</span>
                        <div id="row_button">
                            ${VKReact.VKIcons[20].arrow_up_outline_20.html.inject("id=\"vkicon\" style=\"position:relative;top:-5px;\" onclick=\"VKReact.plugins.menu.uploadSettings(this)\" onmouseover=\"showTooltip(this, { text: \'Выгрузить настройки\', black: true, shift: [4, 5] });\"")}
                            ${VKReact.VKIcons[20].download_outline_20.html.inject("id=\"vkicon\" style=\"position:relative;top:-5px;\" onclick=\"VKReact.plugins.menu.getSettings(this)\" onmouseover=\"showTooltip(this, { text: 'Загрузить настройки', black: true, shift: [4, 5] });\"")}
                            ${VKReact.VKIcons[20].copy_outline_20.html.inject("id=\"vkicon\" style=\"position:relative;top:-5px;width:20px;height:20px;\" onclick=\"VKReact.plugins.menu.copyPrimaryLink(this)\" onmouseover=\"showTooltip(this, { text: 'Прямая ссылка', black: true, shift: [4, 5] });\"")}
                            ${VKReact.VKIcons[20].delete_outline_20.html.inject("id=\"vkicon\" style=\"position:relative;top:-5px;\" onclick=\"VKReact.plugins.menu.removeSettings(this)\" onmouseover=\"showTooltip(this, { text: 'Удалить настройки', black: true, shift: [4, 5] });\"")}
                        </div>
                    </div>
                    `
                    })
                    innerHTML += `
                    ${VKReact.VKIcons[28].add_circle_outline_28.html.inject("style=\"position:relative;left:50%;\" onclick=\"VKReact.plugins.menu.addSettings()\" id=\"vkicon\"")}
                `
                    break
                }
            case "buyplatinum": {
                this.changeBoxWidth('450px')
                innerHTML = `
                <img src="https://spravedlivo.dev/static/vkreact.png" style="width:50px;height:50px;margin:auto;display:flex;">
                <div style="text-align: center;">
                    <span id="jcattext" style="margin-bottom: 10px;margin-top: 20px;display: flex;">Купите React Platinum и получите доступ к экслюзивным функциям!</span>
                </div>
                <div style="padding-top: 10px;padding-bottom: 10px;background-image:linear-gradient(to right top, #d16ba5, #c777b9, #ba83ca, #aa8fd8, #9a9ae1, #8aa7ec, #79b3f4, #69bff8, #52cffe, #41dfff, #46eefa, #5ffbf1);border-radius:10px;">
                    <span id="jcattext" style="color:var(--white);padding-top:10px;padding-bottom:10px;">
                        Среди них:
                        <ul>
                            <li>Пользовательская система рекламных постов</li>
                        </ul>
                    </span>
                </div>
                <div style="display:table;margin:auto;margin-top:10px;"><button id="submitbutton">Купить</button></div>`
                break
            }
            case "ads_filter": {
                innerHTML = `
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'ads_shortlink_filter')">
                    Фильтр коротких ссылок
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'ads_referal_filter')">
                    Фильтр реферальных ссылок
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="vkuiSpacing vkuiSpacing--ios vkuiSpacing--separator vkuiSpacing--separator-center" style="height: 8px;"></div>
                <span id="jcattext">Собственный фильтр</span>
                <span id="jcatundertext" style="padding-left:8px;">Посты, содержащие эти фразы будут удалены (не чувствителен к регистру)</span>
                <div id="enterlinkhere" style="margin-top:10px;">
                    <input type="text" placeholder="Фильтрация" id="enteredlink" value="${(VKReact.settings.ads_filter_list || "")}" oninput="VKReact.plugins.menu.filterInput(this)">
                </div>
                `
                break
            }
            case "checkmarks": {
                innerHTML = `
                <div id="app">
                    <span id="jcattext">Отображение галочек</span>
                    <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'checkmarks_display_vkreact')">
                        VK React
                        <label class="switch" id="row_button">
                         <input type="checkbox">
                         <span class="vkreact_slider round"></span>
                        </label>
                    </div>
                    <div class="vkuiSpacing vkuiSpacing--ios vkuiSpacing--separator vkuiSpacing--separator-center" style="height: 8px;"></div>
                    <span id="jcattext">Своя галочка</span>
                    <span id="jcatundertext" style="padding-left:8px;">Только для пользователей<span id="app" class="vkreact_span_animated platinum" style="display:inline;">Platinum</span></span>
                    <div id="vkreact_selectbox">
                        <div id="expand_button"></div>
                        <span></span>
                        <div id="vkreact_selectbox_items">
                        </div>
                    </div>
                    <button id="submitbutton">Установить</button>
                </div>`
                this.box.content(innerHTML)
                let style = getComputedStyle(document.body)
                let items = document.querySelector("#vkreact_selectbox_items")
                let accent = style.getPropertyValue("--accent")
                let obj = {}
                Object.values(VKIcons).forEach(values => { // optimize this bitch
                    for (const [k, v] of Object.entries(values)) {
                        obj[k] = v
                    }
                })
                
                rendered = true
                let sb = new SelectBox()
                sb.addItem = function(k, v) {
                    let element = se(`
                    <div id="vkreact_selectbox_item">
                        <div id="vkreact_selectbox_item_image"></div>
                        <span id="vkreact_selectbox_item_text">${k}</span>
                    </div>
                    `)
                    element.querySelector("#vkreact_selectbox_item_image").style.backgroundImage = `url('${v.html.colorize(accent).as_data()}')`
                    element.addEventListener("click", (event) => this.onItemClick(this, element, event))
                    items.appendChild(element)
                    if (this.items) {
                        this.items.push(element)
                    }
                }
                let pos = -1
                function sbAddItems() {
                    for (const [k,v] of Object.entries(obj).slice(pos+1, pos+30)) {
                        sb.addItem(k,v)
                    }
                    pos += 30
                }
                sb.ontoggle = function() {
                    if (!this.toggled) {
                        this.items.forEach(it => it.remove())
                        pos = -1
                        sbAddItems()
                    }
                }
                sbAddItems()
                sb.init(document.querySelector("#vkreact_selectbox"))
                document.querySelector("#submitbutton").onclick = function() {
                    VkReactAPI.call("checkmarks.set_custom", {"user_id": vk.id, "checkmark": obj[sb.selected].link})
                    if (!VKReact.vkreact_platinum) {
                        alert("Галочка установлена, но станет видна пользователям только после приобритения Platinum")
                    }
                }

                document.querySelector("#vkreact_selectbox_items").addEventListener("scroll", event => {
                    const e = event.target;
                    if (e.scrollHeight - e.scrollTop === e.clientHeight) {
                        sbAddItems()
                    }
                })
                break
            }
            case "messenger": {
                innerHTML = `
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'dr_ls')">
                    Нечиталка в ЛС
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'dr_chat')">
                    Нечиталка в беседах
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'dr_group')">
                    Нечиталка от групп
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="vkuiSpacing vkuiSpacing--ios vkuiSpacing--separator vkuiSpacing--separator-center" style="height: 8px;"></div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'dt_ls')">
                    Неписалка в ЛС
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'dt_chat')">
                    Неписалка в беседах
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'dt_group')">
                    Неписалка для групп
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div class="vkuiSpacing vkuiSpacing--ios vkuiSpacing--separator vkuiSpacing--separator-center" style="height: 8px;"></div>
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'stickers_removeall')">
                    Удалять все стикеры
                    <label class="switch" id="row_button">
                     <input type="checkbox">
                     <span class="vkreact_slider round"></span>
                    </label>
                </div>
                <div id="app" style="margin-left: 12px;">Удаляемые стикеры</div>
                `
                VKReact.plugins.patch_stickers.removed.forEach(it => {
                    innerHTML += `<div class = "jcat">
                        <img src = "${it}">
                        ${VKReact.VKIcons[28].remove_circle_outline_28.html.inject(`id="vkicon" style="float:right;" onclick="VKReact.plugins.menu.cancel_sticker_block(\'${it}\')" onmouseover=\"showTooltip(this, { text: \'Разблокировать стикер\', black: true, shift: [4, 5] });\"`)}
                    </div>`

                })
                break
            }
        }
        if (!rendered) this.box.content(innerHTML)
        if (!this.box.isVisible()) {
            this.box.show()
            this.box.titleWrap.querySelector(".box_title").className = "box_title vkreact"
            this.box.bodyNode.closest(".popup_box_container").id = "vkreact_box"
        }
        if (this.modal_window != 'menu') {
            box_body.querySelectorAll("input").forEach(it => {
                if (it.getAttribute("type") != "checkbox") return
                let onclick = it.parentElement.parentElement.getAttribute("onclick")
                if (!onclick) return
                let param = getParamNames(onclick)[1]
                if (param) {
                    let firstParam = param.replace(/'/g, '')
                    it.setAttribute("onclick", onclick)
                    it.checked = VKReact.settings[firstParam]
                }
            })
            // patch button
            if (!this.box.titleWrap.querySelector("#box_title__icon")) {
                let shiny = se(VKReact.VKIcons[24].back_24.html.inject('class="box_x_button" onclick="VKReact.plugins.menu.back()" id="box_title__icon"'))
                this.box.titleWrap.querySelector(".box_x_button").before(shiny)
            }
        } else {
            document.getElementById("box_title__icon")?.remove()
        }
    },
    cancel_sticker_block: function (sticker) {
        VKReact.plugins.patch_stickers.removed = VKReact.plugins.patch_stickers.removed.filter(it => it != sticker)
        VKReact.settings.stickers_remove = JSON.stringify(VKReact.plugins.patch_stickers.removed)
        this.render()
    },
    filterInput: function (e) {
        let inp = e.value
        VKReact.settings.ads_filter_list = inp
        VKReact.plugins.text_filter.filters = inp.split(',')
    },
    uploadSettings: function (e) {
        let link = e.parentElement.parentElement.getAttribute("data-link")
        VkReactAPI.call("settings.upload", { "user_id": VKReact.user_id(), "link": link, "structure": JSON.stringify(VKReact.settings.exporter()) })
        Notifier.showEvent({
            title: "VK React",
            text: `Текущая конфигурация загружена на сервер`,
        })
    },
    makeTokenStored: async function () {
        await VkReactAPI.call("users.submit_token", { "user_id": vk.id, "token": VKReact.token })
        VKReact.store_token = true
        this.changeBoxWidth('560px')
        this.render()
    },
    changeBoxWidth: function (width) {
        this._latest_width = width
        document.querySelector("#box_layer > div.popup_box_container").style.width = width
        document.querySelector("#box_layer > div.popup_box_container > div").style.width = width
    },
    getSettings: async function (e) {
        let link = e.parentElement.parentElement.getAttribute("data-link")
        let settings = await VkReactAPI.call("settings.get", { "link": link, "user_id": VKReact.user_id() })
        let result = JSON.parse(settings.result)
        VKReact.settings.importer(result)
        Notifier.showEvent({
            title: "VK React",
            text: `Настройки импортированы!`,
        })
    },
    copyPrimaryLink: function (e) {
        let link = e.parentElement.parentElement.getAttribute("data-link")
        navigator.clipboard.writeText(`${VkReactAPI.apiURL}/settings/${link}`)
        Notifier.showEvent({
            title: "VK React",
            text: `Ссылка успешно скопирована!`,
        })
    },
    addSettings: async function () {
        await VkReactAPI.call("settings.add", { "user_id": VKReact.user_id() })
        VKReact.plugins.menu.render()
    },
    removeSettings: async function (e) {
        let link = e.parentElement.parentElement.getAttribute("data-link")
        await VkReactAPI.call("settings.remove", { "user_id": VKReact.user_id(), "link": link })
        VKReact.plugins.menu.render()
    },
    spanSwitch: function (e) {
        let txt = e.innerText
        e.outerHTML = `<input onblur='VKReact.plugins.menu.spanReset(this, true)' value='${txt}' />`
        e.focus()
    },
    spanReset: function (e, changed) {
        if (changed) {
            VkReactAPI.call("settings.rename", { "user_id": VKReact.user_id(), "link": e.parentElement.getAttribute("data-link"), "name": e.value })
        }
        let txt = e.value
        e.outerHTML = `<span onclick='VKReact.plugins.menu.spanSwitch(this)'>${txt}</span>`
    },
    modal: function (name) {
        this.window_history.add(name)
        this.modal_window = name
        this.render()
    },
    back: function () {
        let m = this.modal_window
        this.modal([...this.window_history][this.window_history.size - 2])
        this.window_history.delete(m)
    },
    change: function (element, variable, server_function = false, platinum_function = false) {
        // one getter and one setter instead of two getters
        if (server_function && !VKReact.store_token) {
            this.modal("server")
            return
        }
        if (platinum_function && !VKReact.vkreact_platinum) {
            this.modal("buyplatinum")
            return
        }
        let value = VKReact.settings[variable]
        value = !value
        VKReact.settings[variable] = value
        if (element.tagName == "DIV") {
            element.querySelector("input").checked = value
        } else {
            element.checked = value
        }
    },
    style: `
    #box_title__icon {
        float:left;
        color:var(--icon_medium);
        height:50%;
        opacity:75%;
        cursor:pointer;
    }
    #box_title__icon:hover {
        opacity:100%;
    }
    #vkreact_selectbox {
        border: 1px solid var(--field_border);
        border-radius: 10px;
        background: var(--field_border);
        cursor: pointer;
        padding: 5px 0px 5px 0px;
        width: 50%;
    }
    #vkreact_selectbox_items {
        position: absolute;
        width: inherit;
        height: 300px;
        overflow-x: hidden;
        overflow-y: scroll;
        background-color: var(--field_border);
        border-bottom-left-radius: 10px;
        border-bottom-right-radius: 10px;
        padding: 5px 0;
        display: none;
    }
    #vkreact_selectbox > span {
        position: relative;
        left: 10px;
    }
    #vkreact_selectbox_item {
        padding: 10px 0px 10px 0px;
    }
    #vkreact_selectbox_item:hover {
        background-color: var(--text_secondary);
    }
    #expand_button {
        background-image: url(https://raw.githubusercontent.com/VKCOM/icons/master/src/svg/24/chevron_down_24.svg);
        width: 24px;
        height: 24px;
        float: right;
    }
    #vkreact_selectbox_item_image {
        background-image: url(https://spravedlivo.dev/static/vkreact.png);
        background-repeat: no-repeat;
        background-size: 24px;
        float: left;
        width: 24px;
        height: 24px;
    }
    #vkreact_selectbox_item_text {
        padding-left: 10px;
    }
    #box_layer > div.popup_box_container[id="vkreact_box"] > div, #box_layer > div.popup_box_container[id="vkreact_box"] {
        transition: width 2s;
    }
    .vkreact_span_animated {
        position: relative;
        left: 4px;
        background-size: 400% 400% !important;
        animation: gradient 2s ease infinite;
        height: 100vh;
        background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent;
    }
    .vkreact_span_animated.platinum {
        background: linear-gradient(-45deg, rgba(2,0,36,1) 0%, rgba(13,13,144,1) 35%, rgba(0,212,255,1) 100%);
    }
    @keyframes gradient {
        0% {
            background-position: 0% 50%;
        }
        50% {
            background-position: 100% 50%;
        }
        100% {
            background-position: 0% 50%;
        }
    }
    `,
    on: "start"
}

VKReact.gifManager = {
    // stores all gif attachments sent by this user
    _gif_manager: [],
    save: function () {
        VKReact.log("Saving gif manager :)")
        fetch(`${VkReactAPI.apiURL}/tenor.save_manager`, {
            headers: {
                'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify({ "gif_manager": this._gif_manager, "user_id": VKReact.user_id(), "uuid": VKReact.uuid })
        })
    },
    get: function () {
        return this._gif_manager
    },
    find: function (id) {
        return this._gif_manager.find(value => value.id == id)
    }
}

VKReact.plugins['get_ad_posts'] = {
    on: "wall",
    run: async () => {
        if (VKReact.vkreact_platinum) {
            let posts = await VkReactAPI.call("user_posts.get", { "user_id": vk.id })
            if (posts.status != 'OK') return
            VKReact.ads_posts = new Set(JSON.parse(posts.results))
        }
    },
    "model": "platinum_userposts"
}

VKReact.plugins['disable_awayphp'] = {
    run: async function () {
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
    },
    on: "timer",
    model: "disable_awayphp"
}

let send = XMLHttpRequest.prototype.send
VKReact.plugins['patch_xml'] = {
    dr_manager: {},
    dt_manager: {},
    run: function () {
        this.updateManagers()
        XMLHttpRequest.prototype.send = function (body) {
            let klass = VKReact.plugins.patch_xml
            // Нечиталка
            if (/act=a_mark_read/.test(body)) {
                let peer_id = parseInt(q2ajx(body).peer)
                klass.getDNR(peer_id) ? XMLHttpRequest.abort() : send.call(this, body)
                return
            }
            // Неписалка
            if (/act=a_activity/.test(body) && /type=typing/.test(body)) {
                let peer_id = q2ajx(body).peer
                klass.getDNT(peer_id) ? XMLHttpRequest.abort() : send.call(this, body)
                return
            }
            if (/act=read_stories/.test(body) && VKReact.settings.dr_stories) {
                XMLHttpRequest.abort()
                return
            }
            send.call(this, body);
        }
    },
    getDNT: function (peer_id) {
        this.updateManagers()
        peer_id = parseInt(peer_id)
        if (typeof this.dt_manager[peer_id] !== 'undefined' && !this.dt_manager[peer_id]) return false
        else if (this.dt_manager[peer_id] || (VKReact.settings.dt_group && peer_id < 0) || (VKReact.settings.dt_chat && peer_id > 2000000000) || VKReact.settings.dt_ls) return true
        return false
    },
    getDNR: function (peer_id) {
        this.updateManagers()
        peer_id = parseInt(peer_id)
        if (typeof this.dr_manager[peer_id] !== 'undefined' && !this.dr_manager[peer_id]) return false
        else if (this.dr_manager[peer_id] || (VKReact.settings.dr_group && peer_id < 0) || (VKReact.settings.dr_chat && peer_id > 2000000000) || VKReact.settings.dr_ls) return true
        return false
    },
    on: "start",
    updateManagers: function () {
        this.dr_manager = JSON.parse(VKReact.settings.dr_manager)
        this.dt_manager = JSON.parse(VKReact.settings.dt_manager)
    },
}

VKReact.plugins['messages'] = {
    run: function () {
        let messages = document.querySelectorAll(".im-mess._im_mess")
        messages.forEach(async it => {
            let r = await VKReact.pluginManager.call("message", it)
            if (r.has(true)) {
                this.removeMessage(it)
            }
        })
    },
    removeMessage: async function (message) {
        let messageList = message.parentElement
        if (messageList.children.length == 1) {
            let messageStack = message.parentElement.parentElement.parentElement
            let before = messageStack.previousSibling
            if (before.tagName == "H5") {
                // collect message blocks to list
                let children = messageStack.parentElement.children
                let currIndex = Array.from(children).indexOf(messageStack)
                let all = []
                for (let i = currIndex + 1; i < children.length; i++) {
                    let elem = children[i]
                    if (elem.tagName == "H5") {
                        break
                    }
                    all.push(elem)
                }
                if (all.length == 0) {
                    before.remove()
                }
            }
            messageStack.remove()
        }
        else {
            message.remove()
        }
    },
    on: "timer"
}

VKReact.plugins['patch_stickers'] = {
    removed: [],
    start: function () {
        this.removed = JSON.parse((VKReact.settings.stickers_remove || "[]"))
    },
    message: function (it) {
        let sticker_row = it.querySelector(".im_sticker_row")
        if (!sticker_row) return
        let sticker_att = sticker_row.querySelector(".im_gift")
        // additional checks for sticker?
        let img = sticker_row.querySelector("img")
        if (!img) return
        if (VKReact.settings.stickers_removeall || this.removed.includes(img.src)) {
            return true
        }
        if (sticker_att.getAttribute("vkreact_marked")) return
        let element = se("<div>" + VKReact.VKIcons[20].block_outline_20.html.inject(`class="vkreact_blocksticker" onmouseover=\"showTooltip(this, { text: \'Заблокировать стикер\', black: true, shift: [4, 5] });\"`) + "</div>")
        element.querySelector("svg > path").setAttribute("fill", "red")
        it.addEventListener("mouseover", () => {
            element.querySelector("svg").setAttribute("class", "vkreact_blocksticker hover")
        })
        it.addEventListener("mouseleave", () => {
            element.querySelector("svg").setAttribute("class", "vkreact_blocksticker")
        })
        element.addEventListener("click", (e) => {
            e.preventDefault()
            e.stopPropagation()
            this.removed.push(img.src)
            VKReact.settings.stickers_remove = JSON.stringify(this.removed)
            return true
        })
        sticker_row.parentElement.before(element)
        sticker_att.style.position = "relative"
        sticker_att.style.top = "-20px"
        let anim = sticker_row.querySelector("a > div")

        if (anim) {
            anim.style.position = "relative"
            anim.style.top = "-20px"
        }
        sticker_att.setAttribute("vkreact_marked", true) //almost there
    },
    style: `
    .vkreact_blocksticker {
        height: 20px;
        opacity: 0;
        transform: translateY(-5px);
        transition: transform 0.5s;
    }
    .vkreact_blocksticker.hover {
        opacity: 1;
        transform: translateY(0px);
    }
    `
}

VKReact.plugins['text_filter'] = {
    filters: [],
    start_emitted: false,
    short_links: ['bit.ly', 'goo.gl', 't1p.de', 'is.gd', 'bit.do'],
    referal_links: ['ali.pub'],
    run: function (row) {
        if (!this.start_emitted) {
            this.start_emitted = true
            this.filters = (VKReact.settings.ads_filter_list || "").split(",")
        }
        let wall_text = row.querySelector(".wall_post_text")
        if (!wall_text) return
        wall_text = wall_text.textContent
        if (!wall_text) return
        let filter = [...this.filters, ...(VKReact.settings.ads_shortlink_filter ? this.short_links : []), ...(VKReact.settings.ads_referal_filter ? this.referal_links : [])]
        filter.forEach(it => {
            if (it && wall_text.toLowerCase().includes(it.toLowerCase())) {
                row.remove()
            }
        })
    },
    on: "post"
}

VKReact.plugins['votes_wthout_vote'] = {
    object_poll: [],
    run: async function (row) {
        let vote = row.querySelector(".media_voting_can_vote")
        if (vote && !vote.getAttribute("vkreact_marked")) {
            let owner_id = vote.getAttribute("data-owner-id")
            let poll_id = vote.getAttribute("data-id")
            let options = vote.querySelectorAll(".media_voting_option_wrap")
            let poll = await VkAPI.call("polls.getById", { "owner_id": owner_id, "poll_id": poll_id })
            let answers = poll['answers']
            if (!answers) {
                return
            }
            let tmp_object = [vote, [], []]
            Object.values(answers).forEach(answer => {
                let option = null
                options.forEach(opt => {
                    if (opt.getAttribute("data-id") == answer["id"].toString()) option = opt
                })
                let option_bar = option.querySelector('.media_voting_option_bar')
                option_bar.style = `transform:scaleX(${answer['rate'] / 100});-o-transform:scaleX(${answer['rate'] / 100})`

                let text = option.querySelector(".media_voting_option_percent")
                text.textContent = answer['rate']
                tmp_object[1].push(option_bar)
                tmp_object[2].push(text)
            })
            this.object_poll.push(tmp_object)
            vote.setAttribute("vkreact_marked", true)
            return false
        }
    },
    onDisable: function () {
        this.object_poll.forEach(it => {
            it[0].removeAttribute("vkreact_marked")
            it[1].forEach(bar => bar.style = `transform:scaleX(0);-o-transform:scaleX(0)`)
            it[2].forEach(text => text.textContent = '')
            this.object_poll = this.object_poll.filter(j => j != it)
        })
    },
    on: "post",
    model: "feed_votes_without_vote"
}

VKReact.plugins['feed_disable_ads'] = {
    run: async function (row, post_id) {
        let post_date = row.querySelector(".post_date")
        let retValue = false
        if (post_date?.textContent?.startsWith("Рекламная запись") || row.querySelector(".ads_ad_box") || row.querySelector(".wall_marked_as_ads") ||
            row.querySelector('.Post__copyright')) {
            retValue = true
        }
        if (VKReact.vkreact_platinum && VKReact.settings.platinum_userposts && post_id && VKReact.ads_posts.has(post_id)) {
            return true
        }
        if (VKReact.vkreact_platinum && VKReact.settings.platinum_userposts && !row.getAttribute("vkreact_actions_marked")) {
            row.querySelector(".ui_actions_menu._ui_menu.ui_actions_menu--actionSheet")?.lastChild.after(se(`
                <a class="ui_actions_menu_item" onclick="return VKReact.plugins.timer.mark_as_ad(this);" tabindex="0" role="link">Отметить как рекламный</a>
            `))
            row.setAttribute("vkreact_actions_marked", true)
        }
        retValue && this.object_poll.push(row)
        return retValue
    },
    model: "disable_ads",
    on: "post",
    object_poll: [],
    onDisable: function () {
        this.object_poll.forEach(it => it.style.display = "block")
    }
}

VKReact.plugins['feed_disable_recc'] = {
    run: function () {
        document.querySelectorAll(".feed_row").forEach(row => {
            if (row.querySelector(".feed_friends_recomm") || row.querySelector(".feed_groups_recomm")) {
                row.remove()
            }
        })
    },
    on: "timer",
    model: "feed_disable_recc"
}

//VKReact.plugins['remove_music_ads'] = {
//    run: function() {
//        let audioPlayer = getAudioPlayer()
//        if (!audioPlayer) return
//        let ads = audioPlayer.ads
//    },
//    on: "timer",
//    model: "disable_ads"
//}

let jsonify = JSON.stringify

VKReact.plugins['music_integration'] = {
    connect: function() {
        this.socket = new WebSocket("ws://localhost:6374")
        this.socket.onopen = () => {
            console.log("WS connection established!")
            this.send_data()
        }
        this.socket.onclose = async (event) => {
            console.log("WS hang up. Reconnecting...")
            await VKReact.sleep(300)
            this.connect()
        }
        this.socket.onerror = async () => {
            console.log("WS Unavailible. Reconnecting...")
            await VKReact.sleep(300)
            this.connect()
        }
        this.socket.onmessage = (event) => {
            let data = event.data
            let parsed = JSON.parse(data)
            switch (parsed.command) {
                case "request_data": {
                    this.send_data()
                    break
                }
                case "play_pause": {
                    let player = getAudioPlayer()
                    if (!player) {
                        return
                    }
                    player.isPlaying() ? player.pause() : player.play()
                    break
                }
                case "seek_time": {
                    let player = getAudioPlayer()
                    if (!player) {
                        return
                    }
                    player.seekToTime(parsed.time)
                    break
                }
                default: {
                    let player = getAudioPlayer()
                    if (!player) {
                        return
                    }
                    player[parsed.command]()
                    break
                }
            }
        }
    },
    start: function() {
        if (!VKReact.settings.music_integration) return
        this.connect()
        window.addEventListener("unload", () => {
            if (this.socket) {
                this.socket.close()
            }
        })
    },
    send_data: function() {
        if (VKReact.plugins.music_integration.socket.readyState !== 1) return
        let audio_player = getAudioPlayer()
        if (!audio_player) {
            this.socket.send(jsonify({"command": "update_info", "status": "NO_PLAYER"}))
            return
        }
        if (!this.subscribed) {
            audio_player.subscribe("start", (() => {this.send_data()}))
            audio_player.subscribe("pause", (() => {this.send_data()}))
            audio_player.subscribe("progress", (() => {this.send_data()}))
            this.subscribed = true
        }
        let audio = audio_player.getCurrentAudio()
        let div = document.createElement('textarea');
        div.innerHTML = audio[3]
        let decodedTitle = div.firstChild.nodeValue
        div.innerHTML = audio[4]
        let decodedArtist = div.firstChild.nodeValue
        VKReact.plugins.music_integration.socket.send(jsonify({"command": "update_info", "status": audio_player.isPlaying() ? "PLAY" : "PAUSE", "artist": decodedArtist, "name": decodedTitle, "cover": audio[14].split(",")[0], "progress": (audio_player.getCurrentProgress()) * 100, "duration": audio[5]}))
    }
}

VKReact.plugins['disable_reposts'] = {
    object_poll: [],
    run: function (row) {
        if (row.querySelector(".copy_quote")) {
            this.object_poll.push(row)
            return true
        }
    },
    on: "post",
    model: "feed_disable_reposts",
    onDisable: function () {
        this.object_poll.forEach(it => it.style.display = "block")
    }
}

VKReact.plugins['feed_disable_comments'] = {
    object_poll: [],
    run: function (row) {
        let r = row.querySelector(".replies_list")
        if (r) {
            r.style.display = "none"
            this.object_poll.push(r)
        }
    },
    on: "post",
    model: "feed_disable_comments",
    onDisable: function () {
        this.object_poll.forEach(it => it.style.display = "block")
    }
}

VKReact.plugins['mutations'] = {
    run: function () {
        this.observer = new MutationObserver(this.onMutations)
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
        })
    },
    onMutations: function (mutations) {
        for (let mutation of mutations) {
            for (let node of (mutation.addedNodes || [])) {
                if (node.nodeType !== 1) {
                    continue
                }
                VKReact.pluginManager.call("mutation", node)
            }
        }
    },
    hasClass: function (element, classes) {
        let retval = 0
        for (let c of classes) {
            retval += Boolean(element && element.classList.contains(c))
        }
        return Boolean(retval)
    },
    on: "start"
}



VKReact.plugins['audio'] = {
    run: function (node) {
        if (VKReact.plugins.mutations.hasClass(node, ['audio_row__actions', '_audio_row__actions'])) {
            this.activateAudioRow(node)
        }
    },
    activateAudioRow: function (node) {
        if (node.getAttribute('vkreact-marked') == 'true') {
            return
        }
        if (VKReact.settings.audiorow_download_button) {
            let element = se(`<button class="audio_row__action _audio_row__action audio_row__vkreact_download title="Скачать"></button>`)
            element.setAttribute('data-media', 'audio')
            element.addEventListener('click', this.onAudioDownload)
            element.addEventListener('mouseenter', this.onAudioEnter)
            node.appendChild(element)
        }
        if (VKReact.settings.audiorow_lyrics) {
            let lyrics = se(`<button class="audio_row__action _audio_row__action audio_row__vkreact_lyrics" title="Текст трека"></button>`)
            lyrics.addEventListener('mouseenter', this.onAudioEnter)
            lyrics.addEventListener('click', this.onAudioLyrics)
            node.appendChild(lyrics)
        }
        node.setAttribute("vkreact-marked", 'true')
    },
    onAudioDownload: function (e) {
        e.preventDefault()
        e.stopPropagation()
        let full_id = e.target.getAttribute('data-full-id')
        VKReact.plugins.audio.download_audio(full_id)
    },
    download_audio: async function (full_id) {
        let data = await VkAPI.call("audio.getById", { "audios": full_id })
        data = data[0]
        let url = data['url']
        VKReact.plugins.audio.download(url, `${data.artist} - ${data.title}.mp3`)
    },
    download: async function (source, name, onprogress) {
        let link = document.createElement('a')
        link.href = source
        if (link.origin === location.origin) {
            link.download = name || 'download'
            link.innerHTML = name || 'download'
            document.body.appendChild(link)
            link.click()
            return VKReact.sleep(300).then(function () {
                onprogress && onprogress(1, 1)
                document.body.removeChild(link)
            })
        }
        let response = await GM_xmlhttpRequest({
            method: 'GET',
            url: link.href,
            responseType: 'blob',
            onprogress: onprogress
        })
        if (response.status != 200) {
            return response
        }
        let URL = window.URL || window.webkitURL
        let resource = URL.createObjectURL(response.response);
        await this.download(resource, name)
        URL.revokeObjectURL(resource)
        return response
    },
    onAudioLyrics: async function (e) {
        e.preventDefault()
        e.stopPropagation()
        let full_id = e.target.getAttribute('data-full-id')
        let data = await VkAPI.call("audio.getById", { "audios": full_id })
        data = data[0]
        VKReact.trackLyrics(data.artist, data.title)
    },
    onAudioEnter: function (e) {
        let audioRow = e.target.parentElement.parentElement.parentElement.parentElement.parentElement
        let full_id = audioRow.getAttribute("data-full-id")
        e.target.setAttribute("data-full-id", full_id)
    },
    style: `.audio_row__vkreact_download {
          background: url('!VKReact.VKIcons[20].download_outline_20.html.as_data()!') no-repeat;
          position: relative;
          top: -3px;
        }
        .audio_row__vkreact_lyrics {
          background: url('!VKReact.VKIcons[20].articles_outline_20.html.as_data()!') no-repeat;
          position: relative;
        }
        `,
    on: "mutation"
}

// патчи в ленту (работает как в сообществе, так и с /feed)
VKReact.plugins['timer'] = {
    mark_as_ad: (element) => {
        let feed_row = element.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement
        let post_id = feed_row.getAttribute("data-post-id")
        feed_row.style.display = "none"
        Notifier.showEvent({
            title: "VK React",
            text: `Пост отмечен как рекламный, спасибо!`,
        })
        VkReactAPI.call("user_posts.mark", { "post_id": post_id, "user_id": vk.id })
        return 0
    },
    run: async function () {
        setInterval(() => {
            VKReact.pluginManager.call("timer")
            if (VKReact.settings.disable_ads) document.querySelectorAll(".ads_ad_box").forEach(it => it.parentElement.parentElement.parentElement.remove())
            let posts = document.querySelectorAll("div[id*=\"post\"]")
            posts.forEach(async row => {
                let post_id = row.getAttribute("data-post-id")
                if (/post-?\d+_\d+/i.test(row.id) && row.style.display != "none") {
                    let r = await VKReact.pluginManager.call("post", row, post_id)
                    if (r.has(true)) {
                        row.style.display = "none"
                    }
                }

            })
            if (VKReact.settings.feed_disable_recc) {
                document.querySelector("#friends_possible_block")?.remove()
            }

        }, 200)
    },
    on: "start",
}
unsafeWindow.VKReact = VKReact

function onLoad() {
    VKReact.main()
}
VKReact.onLoad = onLoad