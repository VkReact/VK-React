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

window = unsafeWindow

var VkReactAPI = {
    initialize: function () {
        this.apiURL = `https://spravedlivo.dev/vkreact`
    },
    call: async function (endpoint, arguments, log = true, raw = false) {
        if (!arguments) arguments = {}
        if (!raw) arguments['uuid'] = VKReact.uuid
        let result = await fetch(`${this.apiURL}/${endpoint}?${new URLSearchParams(arguments).toString()}`)
        let json = await result.json()
        if (log) VKReact.log(`[VKReactAPI] Response from ${endpoint}: ${JSON.stringify(json)}`)
        return json
    }
}

var GeniusAPI = {
    apiURL: "https://cors-anywhere.dimden.dev/https://api.genius.com/",
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
        }
        )
        let data = await r.json()
        data.response.hits = data.response.hits.filter((val) => val.result.title.startsWith(title) && val.type == "song")
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
        await GM_xmlhttpRequest({
            url: url,
            headers,
            onload: function (response) {
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

            }
        })
    },
    lyricsNotFound: function () {
        document.querySelector(".box_body").innerHTML = `<div id ="app">Нам не удалось загрузить текст песни.</div>`
    }
}

// god object pack bozo rip watch
var VKReact = {
    plugins: {},
    htmls: {},
    modal_window: '',
    ads_posts: new Set(),
    vkreact_platinum: false,
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
    waitExist: async function (selector) {
        while (!document.querySelector(selector)) {
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
        let item = se('<a class="top_profile_mrow" id="vk_react_menu"><div class="menu_item_icon"><img src="https://edge.dimden.dev/835d299b61.png" style="width:20px;height:20px;"></img></div>VK React</a>');
        item.addEventListener("click", this.showVkReactSettings)
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
    showVkReactSettings: function () {
        new MessageBox({ title: "VK React", width: 560, hideButtons: true, bodyStyle: 'padding-top:12px;' }).content("").show()
        VKReact.plugins.menu.render()
        return
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
    settoken: async function () {
        let _token = document.getElementById("enteredlink").value
        let json = await VkReactAPI.call("submit_token", { "user_id": VKReact.user_id(), "token": _token })
        if (json.status == "OK") {
            this.token = _token
            Notifier.showEvent({
                title: "VK React",
                text: `Токен прошел проверку! Удачного пользования расширением`,
            })
            document.querySelector(".box_x_button").click()
            this.main()
        } else {
            alert("Токен не прошел проверку!")
        }
    },
    main: async function () {
        VkReactAPI.initialize()
        if (location.host == "spravedlivo.dev" && /settings/i.test(location.href)) {
            let btn = document.getElementById("install")
            if (btn) {
                btn.addEventListener("click", async () => {
                    let link = btn.getAttribute("data-link")
                    let settings = await VkReactAPI.call("settings.get", { "link": link })
                    let result = JSON.parse(settings.result)
                    VKReact.settings.importer(result)
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
        #vkicon {
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
        let user_info = this.uuid ? await VkReactAPI.call("get_user", { "user_id": this.user_id() }) : await VkReactAPI.call("get_user", { "user_id": this.user_id(), "register": true }, false, true)
        if (user_info.status == "PAUSED") {
            if (!GM_getValue("login_id")) {
                let html = `
                <div id="app">
                    Обнаружена попытка входа в аккаунт с нового устройста. Напишите боту и отправьте айди логина ${user_info.login_id}
                    <button id="submitbutton" onclick="VKReact.writetobot()">Написать боту</button>

                </div>
                `
                GM_setValue("login_id", user_info.login_id)
                new MessageBox({ title: "VK React LogIn", width: 560, hideButtons: true, bodyStyle: 'padding-top:12px;' }).content(html).show()
            } else {
                new MessageBox({ title: "VK React LogIn", width: 560, hideButtons: true, bodyStyle: 'padding-top:12px;' }).content(`<div id="app">Вы еще не авторизовали попытку входа! Забыли айди? ${GM_getValue("login_id")} <button id="submitbutton" onclick="VKReact.writetobot()">Написать боту</button></div>`).show()
            }
            return
        }
        GM_deleteValue("login_id")
        if (user_info.uuid) {
            this.uuid = user_info.uuid
            this.token = user_info.token_value
        }
        if (user_info.status != "ERROR" && !user_info.token) {
            this.token = ''
        }
        this.vkreact_platinum = user_info.vkreact_platinum || user_info.staff
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
            let matched = (url.match(/sel=(\d+)/i) || [])[1]
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
                let json = await VkReactAPI.call("get_user", { "user_id": user_id })
                VKReact.pluginManager.call("wall", user_id)
                if (!document.querySelector("a[href='/verify']") && json.status == "OK") {
                    let page_name = document.querySelector(".page_name")
                    page_name.appendChild(se(`<a href="/verify" class="page_verified " onmouseover="pageVerifiedTip(this, {type: 1, oid: ${user_id}})"></a>`))
                    if (json.staff) {
                        page_name.appendChild(se(`<img src="https://edge.dimden.dev/835d299b61.png" style="width:10px;height:10px;" onmouseover="showTooltip(this, { text: 'VK Reat Dev', black: true, toup: false })"></img>`))
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
        VKReact.pluginManager.call("start")
    },
    tooltip: function (e, o) {
        showTooltip(e, { text: o, className: "tt_black" })
    },
    trackLyrics: async function () {
        let html = `<div class="loader"></div>`
        new MessageBox({ title: "Текст трека", width: 500, hideButtons: true, bodyStyle: 'padding:20px;' }).content(html).show()
        let audioPlayer = getAudioPlayer()
        if (audioPlayer._currentAudio) {
            let song_name = audioPlayer._currentAudio[3]
            let artist = audioPlayer._currentAudio[4]
            GeniusAPI.search_lyrics(artist, song_name)
        } else {
            let body = document.querySelector(".box_body")
            body.innerHTML = `<div id="app">Не удается получить текст трека. Попробуйте нажать на кнопку воспроизведения трека</div>`
        }
    }
}

VKReact.plugins['audio_patcher'] = {
    patch_topAudio: async function () {
        if (!document.querySelector("#vkreact_lyrics")) {
            let shuffle_button = await VKReact.waitExist("#audio_layer_tt > div.eltt_content._eltt_content > div > div > div._audio_page_player_wrap.audio_page_player_wrap.page_block > div > div.audio_page_player_ctrl.audio_page_player_btns._audio_page_player_btns.clear_fix > button.audio_page_player_btn.audio_page_player_shuffle._audio_page_player_shuffle")
            shuffle_button.before(se(`<button id="vkreact_lyrics" onclick="VKReact.trackLyrics()" class="audio_page_player_btn audio_page_player_shuffle _audio_page_player_shuffle" onmouseover="AudioPage.showActionTooltip(this, 'Текст трека')" aria-label="Текст трека"><div class="down_text_icon">${VKReact.VKIcons[24].article_outline_24.html}</div></button>`))
            top_audio.removeEventListener("click", this.patch_topAudio)
        }
    },
    run: async function (url) {
        let top_audio = document.querySelector(".top_audio_player.top_audio_player_enabled")
        if (top_audio && !this.listener) {
            this.listener = true
            top_audio.addEventListener("click", this.patch_topAudio)
        }
        if (/audios/i.test(url) && !ge('vkreact_lyrics2')) {
            let shuffle_button = document.querySelector("#content > div > div._audio_page_player_wrap.audio_page_player_wrap.page_block > div > div.audio_page_player_ctrl.audio_page_player_btns._audio_page_player_btns.clear_fix > button.audio_page_player_btn.audio_page_player_shuffle._audio_page_player_shuffle")
            if (shuffle_button) {
                shuffle_button.before(se(`<button id="vkreact_lyrics2" onclick="VKReact.trackLyrics()" class="audio_page_player_btn audio_page_player_shuffle _audio_page_player_shuffle" onmouseover="AudioPage.showActionTooltip(this, 'Текст трека')" aria-label="Текст трека"><div class="down_text_icon">${VKReact.VKIcons[24].article_outline_24.html}</div></button>`))
            }
        }
    },
    on: "url_switch",
    model: "track_lyrics"
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
    run: async function (user_id) {
        let tenorgifsbtn = document.querySelector("#vkreact_tenorgif")
        if (!VKReact.settings.tenor) return
        if (!tenorgifsbtn) {
            document.querySelector(".im-chat-input--attach").after(se(`
            <div class="im-chat-input--attach" onclick="VKReact.plugins.tenor.showTenor()" id="vkreact_tenorgif" data-peer="${user_id}"> 
                <div aria-label="Прикрепить GIF из Tenor" tabindex="0" id="im_tenor" class="" size="28" >
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
        <input type="text" placeholder="Поиск по Tenor" id="tenorinput" onkeyup="VKReact.plugins.tenor.onTenorInput(this, ${user_id})"> <!-- сука сука сука сука сука -->
        <div id="tenorgifs"></div>
        `
        new MessageBox({ title: "Tenor", width: 500, hideButtons: true, bodyStyle: 'padding:20px;height:500px;overflow-y:scroll;' }).content(html).show()
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
        let json = await VkReactAPI.call("tenor_search", { "q": input.value }, log = false)
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
                    let json = await VkReactAPI.call("tenor_search", { "q": input.value, "next": next }, log = false)
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
                img.querySelector("div").style.backgroundImage = `url('${VKReact.VKIcons[20].favorite_20.link}')`
            }
            gifs.appendChild(img)
        })
    },
    onGifSend: async function (user_id, gif_id, query, gif_url) {
        let found = VKReact.gifManager.find(gif_id)
        if (this.scrollListener) {
            boxBody.removeEventListener("scroll", this.scrollListener)
            this.scrollListener = null
        }
        if (found && found.attachment && found.attachment[user_id]) {
            VkAPI.call("messages.send", { "user_id": user_id, "random_id": VKReact.randomUint32(), "attachment": found.attachment[user_id] })
        } else {
            let body = document.querySelector(".box_body")
            body.innerHTML = '<div id="app" style="text-align:center;">Производится оправка.. (Вы можете закрыть это окно)</div><div class="loader"></div>'
            let json = await VkReactAPI.call("send_gif", { "peer_id": user_id, "q": query, "gif_id": gif_id, "gif_url": gif_url, "user_id": VKReact.user_id() })
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
                star.style.backgroundImage = `url('${VKReact.VKIcons[20].favorite_outline_20.link}')`
            } else {
                star.style.backgroundImage = `url('${VKReact.VKIcons[20].favorite_20.link}')`
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
            background: url(!VKReact.VKIcons[24].attachments_24.link!) 50% no-repeat !important;
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
            background-image: url('!VKReact.VKIcons[20].favorite_outline_20.link!');
            background-repeat: no-repeat;
            height: 20px;
            left: 20px;
            position: relative;
            visibility: hidden;
            transition: visibility 0.1s linear, transform 0.1s linear;
        }
        #vkreact_start:hover {
            background-image: url('!VKReact.VKIcons[20].favorite_20.link!');
        }
    `
}

VKReact.plugins['patch_chat'] = {
    im_start: async function () {
        let cur_loc = clone(nav.objLoc);
        let user_id = document.getElementById("vkl_ui_action_menu_vkreact").getAttribute("data-peer")
        let response = await vkApi.api("messages.getHistory", { "user_id": user_id, "rev": "1", "count": "1" })
        let mid = response['items'][0]['id']
        nav.go(extend(cur_loc, { 'sel': '' }));
        setTimeout(function () {
            nav.go(extend(cur_loc, { 'msgid': mid, 'sel': user_id }));
        }, 300)
    },
    run: async function (user_id) {
        let contextMenu = document.getElementById('vkl_ui_action_menu_vkreact')
        if (!contextMenu) {
            // selector to button
            let btn = document.querySelector(`#content > div > div.im-page.js-im-page.im-page_classic.im-page_history-show > div.im-page--history.page_block._im_page_history > div.im-page-history-w > div.im-page--chat-header._im_dialog_actions > div.im-page--chat-header-in > div.im-page--toolsw > div.im-page--aside > div:nth-child(6)`)
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
        } else {
            contextMenu.setAttribute("data-peer", user_id)
        }
    },
    on: "dialog",
    style: `
    .ui_actions_menu_icons.vkl.vkreact {
        background-image: url(!VKReact.VKIcons[24].wheel_outline_24.link!) !important;
        background-color: initial;
    }
    #im_start::before {
        background-image: url('!VKReact.VKIcons[24].arrow_up_24.link!') !important;
    }
    #im_start::before:hover {
        background-image: url('!VKReact.VKIcons[24].arrow_up_24.link!') !important;
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

VKReact.plugins['menu'] = {
    modal_window: "menu",
    render: async function () {
        let box_body = document.querySelector(".box_body")
        let innerHTML = ``
        switch (this.modal_window) {
            case "menu":
                {
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
                            <span id="jcatundertext">Обход away.php: ${VKReact.settings.users_userinfo ? "Включен" : "Выключен"}</span>
                        </div>
                    </div>
                    <div class="jcat menuitem">
                        <div class="jcatcontent" onclick="VKReact.plugins.menu.modal('vkreact')"">
                            <img id="jcaticon" src="https://edge.dimden.dev/835d299b61.png">
                            <span id="jcattext">VK React</span>
                            <span id="jcatundertext">Platinum: ${VKReact.vkreact_platinum ? "Подключен" : "Не подключен"}</span>
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
                </div>`
                    break
                }
            case "server":
                {
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
                <div class="jcat" onclick="VKReact.plugins.menu.change(this, 'tenor')">
                    Кнопка "Tenor GIF"
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
                    ${VKReact.VKIcons[28].add_circle_outline_28.html.inject("style=\"margin:auto;display:flex;\" onclick=\"VKReact.plugins.menu.addSettings()\" id=\"vkicon\"")}
                `
                    break
                }
        }

        box_body.innerHTML = innerHTML
        if (this.modal_window != 'menu') {
            box_body.querySelectorAll("input").forEach(it => {
                let onclick = it.parentElement.parentElement.getAttribute("onclick")
                let param = getParamNames(onclick)[1]
                if (param) {
                    let firstParam = param.replace(/'/g, '')
                    it.setAttribute("onclick", onclick)
                    it.checked = VKReact.settings[firstParam]
                }
            })
            // patch button
            if (!ge("box_title__icon")) {
                GM_addStyle("#box_title__icon {float:left;color:var(--icon_medium);height:50%;opacity:75%;cursor:pointer;margin-left:-20px;} #box_title__icon:hover {opacity:100%;}")
                let shiny = se(VKReact.VKIcons[24].back_24.html.inject('class="box_x_button" onclick="VKReact.plugins.menu.modal(\'menu\')" id="box_title__icon"'))
                document.getElementsByClassName("box_title")[0].appendChild(shiny)
            }
        } else {
            document.getElementById("box_title__icon")?.remove()
        }
    },
    uploadSettings: function (e) {
        let link = e.parentElement.parentElement.getAttribute("data-link")
        VkReactAPI.call("settings.upload", { "user_id": VKReact.user_id(), "link": link, "structure": JSON.stringify(VKReact.settings.exporter()) })
        Notifier.showEvent({
            title: "VK React",
            text: `Текущая конфигурация загружена на сервер`,
        })
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
        this.modal_window = name
        this.render()
    },
    change: function (element, variable) {
        // one getter and one setter instead of two getters
        let value = VKReact.settings[variable]
        value = !value
        VKReact.settings[variable] = value
        if (element.tagName == "DIV") {
            element.querySelector("input").checked = value
        } else {
            element.checked = value
        }
    },
}

VKReact.gifManager = {
    // stores all gif attachments sent by this user
    _gif_manager: [],
    save: function () {
        VKReact.log("Saving gif manager :)")
        fetch(`${VkReactAPI.apiURL}/save_gif_manager`, {
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
            let posts = await VkReactAPI.call("post_get_ads", { "user_id": vk.id })
            if (posts.status != 'OK') return
            VKReact.ads_posts = new Set(JSON.parse(posts.results))
        }
    }
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

            Object.values(answers).forEach(answer => {
                let option = null
                options.forEach(opt => {
                    if (opt.getAttribute("data-id") == answer["id"].toString()) option = opt
                })
                let option_bar = option.querySelector('.media_voting_option_bar')
                option_bar.style = `transform:scaleX(${answer['rate'] / 100});-o-transform:scaleX(${answer['rate'] / 100})`

                let text = option.querySelector(".media_voting_option_percent")
                text.textContent = answer['rate']
                this.object_poll.push([option_bar, text, vote])
            })
            vote.setAttribute("vkreact_marked", true)
            return false
        }
    },
    onDisable: function() {
        this.object_poll.forEach(it => {
            it[0].style = `transform:scaleX(0);-o-transform:scaleX(0)`
            it[1].textContent = ""
            it[2].removeAttribute("vkreact_marked")
        })
    },
    on: "post",
    model: "feed_votes_without_vote"
}

VKReact.plugins['feed_disable_ads'] = {
    run: async function(row, post_id) {
        let post_date = row.querySelector(".post_date")
        let retValue = false
        if (post_date?.textContent?.startsWith("Рекламная запись") || row.querySelector(".ads_ad_box") || row.querySelector(".wall_marked_as_ads") ||
            row.querySelector('.Post__copyright')) {
            retValue = true
        }
        if (VKReact.vkreact_platinum && post_id && VKReact.ads_posts.has(post_id)) {
            return true
        }
        if (VKReact.vkreact_platinum && !row.getAttribute("vkreact_actions_marked")) {
            row.querySelector(".ui_actions_menu._ui_menu.ui_actions_menu--actionSheet")?.lastChild.after(se(`
                <a class="ui_actions_menu_item" onclick="return VKReact.plugins.disable_ads.mark_as_ad(this);" tabindex="0" role="link">Отметить как рекламный</a>
            `))
            row.setAttribute("vkreact_actions_marked", true)
        }
        retValue && this.object_poll.push(row)
        return retValue
    },
    model: "disable_ads",
    on: "post",
    object_poll: [],
    onDisable: function() {
        this.object_poll.forEach(it => it.style.display = "block")
    }
}

VKReact.plugins['feed_disable_recc'] = {
    run: function(row) {
        if (row.querySelector(".feed_friends_recomm") || row.querySelector(".feed_groups_recomm")) {
            return true
        }
    },
    on: "feed_row",
    model: "feed_disable_recc"
}

VKReact.plugins['disable_reposts'] = {
    object_poll: [],
    run: function(row) {
        if (row.querySelector(".copy_quote")) {
            this.object_poll.push(row)
            return true
        }
    },
    on: "post",
    model: "feed_disable_reposts",
    onDisable: function() {
        this.object_poll.forEach(it => it.style.display = "block")
    }
}

VKReact.plugins['feed_disable_comments'] = {
    object_poll: [],
    run: function(row) {
        let r = row.querySelector(".replies_list")
        if (r) {
            r.style.display = "none"
            this.object_poll.push(r)
        }
    },
    on: "post",
    model: "feed_disable_comments",
    onDisable: function() {
        this.object_poll.forEach(it => it.style.display = "block")
    }
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
        VkReactAPI.call("post_mark_as_ad", { "post_id": post_id, "user_id": vk.id })
        return 0
    },
    run: async function () {
        setInterval(() => {
            VKReact.pluginManager.call("timer")
            if (VKReact.settings.disable_ads) document.querySelectorAll(".ads_ad_box").forEach(it => it.parentElement.parentElement.parentElement.remove())
            let posts = document.querySelectorAll("div[id*=\"post\"]")
            posts.forEach(async row => {
                let r = await VKReact.pluginManager.call("feed_row", row)
                let post_id = row.getAttribute("data-post-id")
                if (/post-?\d+_\d+/i.test(row.id) && row.style.display != "none") {
                    let j = await VKReact.pluginManager.call("post", row, post_id)
                    let merged = r.addAll(j)
                    if (merged.has(true)) {
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