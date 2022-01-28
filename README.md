# VK React
## _Reactive extention for vk.com_

## Install
1. Get from [tampermonkey website](https://www.tampermonkey.net/) 
2. Go to [our site](https://spravedlivo.dev/static/vkreact_min.user.js) and click "Install"
3. Done! You won't even have to update script in future

## Use
VK token is required in order to make extention work. It will prompt you modal window asking for token

## Summary 
This repository contains source code for extention client. We do not reveal source code for server.

## Files

| File | Description |
| ------ | ------ |
| vkreact_min.user.js | Header for tampermonkey, installation from [our site](https://spravedlivo.dev/static/vkreact_min.user.js) |
| vkreact.js | Script source code |
| icons.js | Icons from [VKCOM/icons](https://github.com/VKCOM/icons) scrapped by [IconsParser](https://github.com/VkReact/IconsParser) |
| utils.js | Miscellaneous functions moved here to not make main file super big |

## Features
| Feature | Location | Description |
| ------ | ------ | ------ |
| Disable ads | Newsfeed | Removes most of ads (feed, audio, posts with copyright) |
| Disable recommendations | Newsfeed | Removes all recommendations |
| Disable Comments | Newsfeed | Removes comments section |
| Remove reposts | Newsfeed | Removes posts that are marked as repost |
| Votes without voting | Newsfeed | |
| Forever online | Server Functions | Sets online status for your account each 200 seconds |
| Friends autoaccept | Server Functions |  |
| Friends autoaccept from blocked users | Server Functions |  |
| Remove blocked users from friends | Server Functions | |
| User info | Users | Last info change, last login, date of registration, user_id |
| Disable "ecosystem" button | UI |  |
| Disable away.php | UI |  |
| Place audios to right | UI | Places audio section after photos block |
| Track lyrics | UI | Show lyrics of track (genius api) |
| Tenor gifs | UI | Gifs from tenor like in discord |
| Configs | VK React | Cloud configs |
| Filter shortlinks | Post ads filter | Remove posts with goo.gl, bit.ly etc. |
| Filter referal | Post ads filter | Remove posts with ali.pub etc. |
| Custom filter | Post ads filter | Custom filter for post ads, separated by comma |