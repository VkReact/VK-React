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
// @run-at       document-idle
// ==/UserScript==

window.VKReact = {
    log: (...rest) => {
		return console.log(
			"%cVK React:",
			"background: #ff0900; color: #fff; padding: 6px;",
			...rest,
		);
	},
    main: function() {
        setInterval(() => {
            if (!window.location.href.endsWith("/feed")) return
            // test remove feed ads function, TODO: replace with looping foraech feed_row
            let elements = document.getElementsByClassName('post_date')
            elements.forEach((element) => {
                if (element.textContent.startsWith("Рекламная запись")) {
                    element.parentElement.parentElement.parentElement.parentElement.parentElement.remove()
                }
            })
            document.querySelectorAll(".Post__copyright").forEach(it => it.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.remove())
            document.querySelectorAll(".ads_ad_box").forEach(it => it.remove())
        }, 200)
        GM_addElement('script', {
            src: 'https://cdn.jsdelivr.net/npm/vue@2/dist/vue.js',
            type: 'text/javascript'
          });
        document.getElementById("ads_left").remove()
        GM_addStyle(`
        #ads_left: {
            display:none; 
        }
        .box_title {
            text-align: center;
        }
        `)
    
        let ref = document.getElementById("top_support_link")
        //place any icon inside 
        let item = se('<a class="top_profile_mrow" id="vk_react_menu"><div class="menu_item_icon"><img src="https://edge.dimden.dev/835d299b61.png" style="width:20px;height:20px;"></img></div>VK React</a>');
        item.addEventListener("click", showVkReactSettings)
        ref.parentNode.insertBefore(item, ref.nextSibling);
        function showVkReactSettings() {
                // TODO: Vk UI
                let html = `
                <div id="app">
                    <div class="vkuiModalPage__header">
                    {{message}}
                    </div>
                </div>
                `
                new MessageBox({title:"j", width: 650 ,hideButtons:true, bodyStyle: 'padding:0px;'}).content(html).show()
                var app = new Vue({
                    el: '#app',
                    data: function () {
                        return {
                            message: "hello vue"
                        }
                    }
                })
        }
    }
}

window.VKReact.main()