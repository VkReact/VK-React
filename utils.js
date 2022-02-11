// thanks to dear VkOpt


let makeCRCTable = function(){
    var c;
    var crcTable = [];
    for(var n =0; n < 256; n++){
        c = n;
        for(var k =0; k < 8; k++)
            c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        crcTable[n] = c;
    }
    return crcTable;
}

let crcTable = makeCRCTable()

let crc = function(str){
    let crc32 = function(str) {
        var crc = 0 ^ (-1);
        for (var i = 0; i < str.length; i++ )
            crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
        return (crc ^ (-1)) >>> 0;
    };

    return crc32(str);
}


unsafeWindow.Inj = { // KiberInfinity's JS_InjToFunc_Lib v2.1
    FRegEx : /(?:function|[A-Za-z0-9_]+?)[^\(]*\(\s*([^\)]*?)\s*\)[^\{]*\{([\s\S]+)\}/i,
    DisableHistrory : false,
    History : {},
    InitStringifier: function(){
     if (Function.prototype.toStringOriginal) return;
     Function.prototype.toStringOriginal = Function.prototype.toString;
     //var origFnToStr = Function.prototype.toString;
     Function.prototype.toString = function(){
        if (this.inj_func_main){
           var args = [];
           args.push(
                 'Inj modified function:       "'+this.inj_src_path+'"');
           if (this.inj_func_original != this.inj_func_main){
              args.push(
                 '\nSource function:            ',
                 this.inj_func_original,
                 '\nCurrent with modified code: ',
                 this.inj_func_main
              );
           }

           if (this.inj_handlers.before.length){
              args.push(
                 '\nBefore call handlers ('+this.inj_handlers.before.length+'):   ',
                 this.inj_handlers.before
              )
           }
           if (this.inj_handlers.after.length){
              args.push(
                 '\nAfter call handlers ('+this.inj_handlers.after.length+'):   ',
                 this.inj_handlers.after
              )
           }
           console.log.apply(console, args);
           return this.inj_func_main.toStringOriginal();
        } else
           return this.toStringOriginal();

     }
  },
  Wait : function (func, callback, check_timeout, check_count, fail_callback) {
        if (check_count == 0) {
            if (fail_callback)
                fail_callback('WaitForFunc out of allow checkes');
            return;
        }
        if (check_count)
            check_count--;
        var func_ = func;
        if (typeof func == 'string')
            func_ = eval(func);
        if (!check_timeout)
            check_timeout = 1000;
        if (func_)
            callback(func_);
        else
            return setTimeout(function () {
                Inj.Wait(func, callback, check_timeout, check_count, fail_callback)
            }, check_timeout);
        return false;
    },
  GetFunc: function(func){
     try {
        return isFunction(func) ? func : eval('window.' + func);
     } catch(e) {}
  },
  Parse : function (func) {
     // определение распарсить переданную функцию или же найти по имени функции.
     var fn = Inj.GetFunc(func);

     if (!fn){
        VKReact.log('Inj Parse Error: "' + func + '" not found', 1);
        return;
     }
     var wrp = Inj.Wrap(func);
     fn = wrp.inj_func_main;

     var res = (fn ? String(fn).match(Inj.FRegEx) : null) || ['', '', ''];
     if (Inj.need_porno()) {
        res[2] = res[2].replace(/\r?\n/g, " ");
     }
     return {
        func_name : func, // для последующего использования в Make, функция должна быть передана в Parse по строковому имени, либо обязательно переопредление этого параметра на нужное строковое имя.
        func: fn,
        wrapper: wrp,
        full : res[0],
        args : res[1],
        code : res[2],
        args_names : res[1].split(/\s*,\s*/) // используется для макрозамены обозначенных аргументов в коде
     }
  },
    Make : function (parsed_func, code, args) {
        var h = Array.prototype.join.call(args, '#_#');
        var hs = h.replace(/[^A-Za-z0-9]+/g, ""); // генерим "хеш" инъекции. не идеально, но так быстрее, чем crc/md5 и и.д считать.
        if (code.indexOf(hs) != -1) // проверяем, если ли уже метка этой инъекции в функции.
            return false;            // если инъекция уже была сделана ранее, то уходим.

        // Подстановка имён аргументов в места указанные в новом коде как #ARG1#, #ARG2# или __ARG0__, __ARG1__ и т.д
        code = code.replace(/(#|__)ARG(\d+)\1/g, function (s, prefix, idx) {
                var arg_idx = parseInt(idx);
                return parsed_func.args_names[arg_idx];
            });
            var ac = '\n"[inj_label]' + hs + '";';
            // добавляем косметический перенос строки перед родным кодом:
            if (!/^[\r\n\s]*['"]\[inj_label\]/.test(code))
                ac += '\n';
            // перезаписываем функцию новой:
            //eval(parsed_func.func_name + '=function(' + parsed_func.args + '){' + ac + code + '}');
        parsed_func.wrapper.inj_func_main = eval('(function(' + parsed_func.args + '){' + ac + code + '})');
        return true;
    },
    need_porno : function () {
        return false
    },
    toRE : function (s, m) {
        if (Inj.need_porno() && (typeof s) == 'string' && (s.indexOf("+'") != -1 || s.indexOf("'+") != -1 || s.indexOf('"+') != -1)) {
            /* this is Porno! */
            s = s.replace(/([\(\)\[\]\\\/\.\^\$\|\?\+])/g, "\\$1");
            s = s.replace(/(["']\\\+)/g, "\\\\?[\"']\\s*\\+\\s*");
            s = s.replace(/(\\\+["'])/g, "\\s*\\+\\s*\\\\?[\"']");
            s = s.replace(/([^\[]|^)["]([^']|$)/g, "$1\\\\?[\"']$2");
            return new RegExp(s, m || '');
        } else
            return s;
    },
    mc : function (s) {
        if (Inj.need_porno()) {
            if (s.substr(0, 2) == "'+")
                s = '"+' + s.substr(2);
            if (s.substr(-2) == "+'")
                s = s.substr(0, s.length - 2) + '+"';
            return s;
        } else
            return s;
    },
  Wrapped : function(func){
     return !!func.inj_handlers;
  },
  Wrap : function(func){
     var src_func = Inj.GetFunc(func);
     if (!src_func){
            VKReact.log('Inj Wrap Error: "' + func + '" not found', 1);
        return;
     }


     var fn_path = ('window.'+func).match(/(.+)\.([^\.]+)/);

     if (Inj.Wrapped(src_func))
        return src_func;

     var wrapper = function func_wrapper(){
        var
           i,
           res,
           result,
           before = func_wrapper.inj_handlers.before,
           after  = func_wrapper.inj_handlers.after,
           args = Array.prototype.slice.call(arguments),
           obj = {
              args: args,
              prevent: false,
              prevent_all: false,
              return_result: undefined,
              wrapper: func_wrapper,
              this_obj: this
           };

        for (i = 0; i < args.length; i++)
           obj['__ARG'+i+'__'] = args[i]; // back compatible

        // call "before" handlers
        for (i = 0; i < before.length; i++)
           if (!obj.prevent_all){
              before[i].apply(obj, args);
              if (obj.prevent_all)
                 res = obj.return_result;
           }

        // call original function
        if (!obj.prevent)
           result = func_wrapper.inj_func_main.apply(this, args);
        obj.result = result;

        // call "after" handlers
        for (i = 0; i < after.length; i++)
           if (!obj.prevent_all){
              after[i].apply(obj, args);
              if (obj.prevent_all)
                 res = obj.return_result;
           }

        return res || result;

     }
     wrapper.add = function(type, fn){
        var hash = crc(fn.toString());
        if (wrapper.inj_handlers[type + '_hashes'].indexOf(hash) == -1){
           wrapper.inj_handlers[type].push(fn);
           wrapper.inj_handlers[type + '_hashes'].push(hash);
           return true;
        } else
           return false;
     }

     wrapper.add_before = function(fn){
        return wrapper.add('before', fn);
     }
     wrapper.add_after = function(fn){
        return wrapper.add('after', fn);
     }

     wrapper.inj_src_path = fn_path[1];
     wrapper.inj_func_original = src_func;  // not modified original function
     wrapper.inj_func_main = src_func;      // we call this, it can contain other injections
     wrapper.inj_handlers = {
        before: [],
        before_hashes: [],
        after: [],
        after_hashes: []
     }
     eval(fn_path[1])[fn_path[2]] = wrapper;
     return wrapper;
  },
    Start : function (func, inj_code) {
     var new_func = Inj.Wrap(func);
     if (!new_func) return;

     if (isFunction(inj_code))
        new_func.add_before(inj_code)
     else {
        var s = Inj.Parse(func);
        new_func = Inj.Make(s, inj_code + ' ' + s.code, arguments);
     }

     return new_func;
     /*
        if (isFunction(inj_code))                 // ну а что? Inj и так костыль, а с этим удобней местами - передали интересующий нас логически завершённый код завёрнутым в анонимную функцию
            inj_code = Inj.Parse(inj_code).code;   // и выдрали его из неё, а не строкой с экранированиями, без переносов и т.д
        return Inj.Make(s, inj_code + ' ' + s.code, arguments);
     */

    },
    End : function (func, inj_code) {
     var new_func = Inj.Wrap(func);
     if (!new_func) return;

     if (isFunction(inj_code))
        new_func.add_after(inj_code)
     else {
        var s = Inj.Parse(func);
        new_func = Inj.Make(s, s.code + ' ' + inj_code, arguments);
     }

     return new_func;
    },
    Before : function (func, before_str, inj_code) {
        var s = Inj.Parse(func);
     if (!s) return;

        before_str = Inj.toRE(before_str);

        if (isFunction(inj_code))
            inj_code = Inj.Parse(inj_code).code;
        else
            inj_code = Inj.mc(inj_code);

        var orig_code = ((typeof before_str) == 'string') ? before_str : s.code.match(before_str);
        s.code = s.code.split(before_str).join(inj_code + ' ' + orig_code + ' '); //maybe split(orig_code) ?
        //if (func=='nav.go') alert(s.code);
        return Inj.Make(s, s.code, arguments);
    },
    After : function (func, after_str, inj_code) {
        var s = Inj.Parse(func);
     if (!s) return;

        after_str = Inj.toRE(after_str);

     if (isFunction(inj_code))
            inj_code = Inj.Parse(inj_code).code;
        else
            inj_code = Inj.mc(inj_code);

        var orig_code = ((typeof after_str) == 'string') ? after_str : s.code.match(after_str);
        s.code = s.code.split(after_str).join(orig_code + ' ' + inj_code + ' '); //maybe split(orig_code) ?
        //if (func=='stManager.add') alert(s.code);
        return Inj.Make(s, s.code, arguments);
    },

    BeforeR : function (func, before_rx, inj_code) {
        var s = Inj.Parse(func);
     if (!s) return;

     if (isFunction(inj_code))
            inj_code = Inj.Parse(inj_code).code;
        else
            inj_code = Inj.mc(inj_code);

        s.code = s.code.replace(before_rx, inj_code + ' $&');
        return Inj.Make(s, s.code, arguments);
    },
    AfterR : function (func, before_rx, inj_code) {
        var s = Inj.Parse(func);
     if (!s) return;

     if (isFunction(inj_code))
            inj_code = Inj.Parse(inj_code).code;
        else
            inj_code = Inj.mc(inj_code);

        s.code = s.code.replace(before_rx, '$& ' + inj_code);
        return Inj.Make(s, s.code, arguments);
    },

    Replace : function (func, rep_str, inj_code) {
        var s = Inj.Parse(func);
     if (!s) return;

        s.code = s.code.replace(rep_str, inj_code); //split(rep_str).join(inj_code);
        return Inj.Make(s, s.code, arguments);
    }
};
let vkCyr = {
    enc_map:{0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12, 13: 13, 14: 14, 15: 15, 16: 16, 17: 17, 18: 18, 19: 19, 20: 20, 21: 21, 22: 22, 23: 23, 24: 24, 25: 25, 26: 26, 27: 27, 28: 28, 29: 29, 30: 30, 31: 31, 32: 32, 33: 33, 34: 34, 35: 35, 36: 36, 37: 37, 38: 38, 39: 39, 40: 40, 41: 41, 42: 42, 43: 43, 44: 44, 45: 45, 46: 46, 47: 47, 48: 48, 49: 49, 50: 50, 51: 51, 52: 52, 53: 53, 54: 54, 55: 55, 56: 56, 57: 57, 58: 58, 59: 59, 60: 60, 61: 61, 62: 62, 63: 63, 64: 64, 65: 65, 66: 66, 67: 67, 68: 68, 69: 69, 70: 70, 71: 71, 72: 72, 73: 73, 74: 74, 75: 75, 76: 76, 77: 77, 78: 78, 79: 79, 80: 80, 81: 81, 82: 82, 83: 83, 84: 84, 85: 85, 86: 86, 87: 87, 88: 88, 89: 89, 90: 90, 91: 91, 92: 92, 93: 93, 94: 94, 95: 95, 96: 96, 97: 97, 98: 98, 99: 99, 100: 100, 101: 101, 102: 102, 103: 103, 104: 104, 105: 105, 106: 106, 107: 107, 108: 108, 109: 109, 110: 110, 111: 111, 112: 112, 113: 113, 114: 114, 115: 115, 116: 116, 117: 117, 118: 118, 119: 119, 120: 120, 121: 121, 122: 122, 123: 123, 124: 124, 125: 125, 126: 126, 127: 127, 1027: 129, 8225: 135, 1046: 198, 8222: 132, 1047: 199, 1168: 165, 1048: 200, 1113: 154, 1049: 201, 1045: 197, 1050: 202, 1028: 170, 160: 160, 1040: 192, 1051: 203, 164: 164, 166: 166, 167: 167, 169: 169, 171: 171, 172: 172, 173: 173, 174: 174, 1053: 205, 176: 176, 177: 177, 1114: 156, 181: 181, 182: 182, 183: 183, 8221: 148, 187: 187, 1029: 189, 1056: 208, 1057: 209, 1058: 210, 8364: 136, 1112: 188, 1115: 158, 1059: 211, 1060: 212, 1030: 178, 1061: 213, 1062: 214, 1063: 215, 1116: 157, 1064: 216, 1065: 217, 1031: 175, 1066: 218, 1067: 219, 1068: 220, 1069: 221, 1070: 222, 1032: 163, 8226: 149, 1071: 223, 1072: 224, 8482: 153, 1073: 225, 8240: 137, 1118: 162, 1074: 226, 1110: 179, 8230: 133, 1075: 227, 1033: 138, 1076: 228, 1077: 229, 8211: 150, 1078: 230, 1119: 159, 1079: 231, 1042: 194, 1080: 232, 1034: 140, 1025: 168, 1081: 233, 1082: 234, 8212: 151, 1083: 235, 1169: 180, 1084: 236, 1052: 204, 1085: 237, 1035: 142, 1086: 238, 1087: 239, 1088: 240, 1089: 241, 1090: 242, 1036: 141, 1041: 193, 1091: 243, 1092: 244, 8224: 134, 1093: 245, 8470: 185, 1094: 246, 1054: 206, 1095: 247, 1096: 248, 8249: 139, 1097: 249, 1098: 250, 1044: 196, 1099: 251, 1111: 191, 1055: 207, 1100: 252, 1038: 161, 8220: 147, 1101: 253, 8250: 155, 1102: 254, 8216: 145, 1103: 255, 1043: 195, 1105: 184, 1039: 143, 1026: 128, 1106: 144, 8218: 130, 1107: 131, 8217: 146, 1108: 186, 1109: 190},
    dec_map:{0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12, 13: 13, 14: 14, 15: 15, 16: 16, 17: 17, 18: 18, 19: 19, 20: 20, 21: 21, 22: 22, 23: 23, 24: 24, 25: 25, 26: 26, 27: 27, 28: 28, 29: 29, 30: 30, 31: 31, 32: 32, 33: 33, 34: 34, 35: 35, 36: 36, 37: 37, 38: 38, 39: 39, 40: 40, 41: 41, 42: 42, 43: 43, 44: 44, 45: 45, 46: 46, 47: 47, 48: 48, 49: 49, 50: 50, 51: 51, 52: 52, 53: 53, 54: 54, 55: 55, 56: 56, 57: 57, 58: 58, 59: 59, 60: 60, 61: 61, 62: 62, 63: 63, 64: 64, 65: 65, 66: 66, 67: 67, 68: 68, 69: 69, 70: 70, 71: 71, 72: 72, 73: 73, 74: 74, 75: 75, 76: 76, 77: 77, 78: 78, 79: 79, 80: 80, 81: 81, 82: 82, 83: 83, 84: 84, 85: 85, 86: 86, 87: 87, 88: 88, 89: 89, 90: 90, 91: 91, 92: 92, 93: 93, 94: 94, 95: 95, 96: 96, 97: 97, 98: 98, 99: 99, 100: 100, 101: 101, 102: 102, 103: 103, 104: 104, 105: 105, 106: 106, 107: 107, 108: 108, 109: 109, 110: 110, 111: 111, 112: 112, 113: 113, 114: 114, 115: 115, 116: 116, 117: 117, 118: 118, 119: 119, 120: 120, 121: 121, 122: 122, 123: 123, 124: 124, 125: 125, 126: 126, 127: 127, 128: 1026, 129: 1027, 130: 8218, 131: 1107, 132: 8222, 133: 8230, 134: 8224, 135: 8225, 136: 8364, 137: 8240, 138: 1033, 139: 8249, 140: 1034, 141: 1036, 142: 1035, 143: 1039, 144: 1106, 145: 8216, 146: 8217, 147: 8220, 148: 8221, 149: 8226, 150: 8211, 151: 8212, 153: 8482, 154: 1113, 155: 8250, 156: 1114, 157: 1116, 158: 1115, 159: 1119, 160: 160, 161: 1038, 162: 1118, 163: 1032, 164: 164, 165: 1168, 166: 166, 167: 167, 168: 1025, 169: 169, 170: 1028, 171: 171, 172: 172, 173: 173, 174: 174, 175: 1031, 176: 176, 177: 177, 178: 1030, 179: 1110, 180: 1169, 181: 181, 182: 182, 183: 183, 184: 1105, 185: 8470, 186: 1108, 187: 187, 188: 1112, 189: 1029, 190: 1109, 191: 1111, 192: 1040, 193: 1041, 194: 1042, 195: 1043, 196: 1044, 197: 1045, 198: 1046, 199: 1047, 200: 1048, 201: 1049, 202: 1050, 203: 1051, 204: 1052, 205: 1053, 206: 1054, 207: 1055, 208: 1056, 209: 1057, 210: 1058, 211: 1059, 212: 1060, 213: 1061, 214: 1062, 215: 1063, 216: 1064, 217: 1065, 218: 1066, 219: 1067, 220: 1068, 221: 1069, 222: 1070, 223: 1071, 224: 1072, 225: 1073, 226: 1074, 227: 1075, 228: 1076, 229: 1077, 230: 1078, 231: 1079, 232: 1080, 233: 1081, 234: 1082, 235: 1083, 236: 1084, 237: 1085, 238: 1086, 239: 1087, 240: 1088, 241: 1089, 242: 1090, 243: 1091, 244: 1092, 245: 1093, 246: 1094, 247: 1095, 248: 1096, 249: 1097, 250: 1098, 251: 1099, 252: 1100, 253: 1101, 254: 1102, 255: 1103},
    coder: function(s, map){
      let L = [];
      for (let i=0; i<s.length; i++) {
          let ord = s.charCodeAt(i);
          if (!(ord in map))
              throw "Character "+s.charAt(i)+" isn't supported by win1251!";
          L.push(String.fromCharCode(map[ord]))
      }
      return L.join('')
    },
    toWin: function(s){
       return vkCyr.coder(s, vkCyr.enc_map);
    },
    toUnicode: function(s){
       return vkCyr.coder(s, vkCyr.dec_map);
    },
    escape: function(s){
       return escape(vkCyr.toWin(s));
    },
    unescape: function(s){
       return (vkCyr.toUnicode(unescape(s)));
    }
 };

function vkUnescapeCyrLink(str){ // auto detect decode from utf8/win1251 escaped
    return str.replace(/(%[A-F0-9]{2})+/ig, function(s){
       try {
          return decodeURIComponent(s);
       }
       catch (e) {
          try {
             return vkCyr.unescape(s);
          } catch (e) {
             return s;
          }
       }
    });
}

function randomUint32() {
    if (window && window.crypto && window.crypto.getRandomValues && Uint32Array) {
        var o = new Uint32Array(1);
        window.crypto.getRandomValues(o);
        return o[0];
    } else {
        console.warn('Falling back to pseudo-random client seed');
        return Math.floor(Math.random() * Math.pow(2, 32));
    }
}


VKReact.clientside_settings = {"disable_ads":false, "feed_disable_recc":false, 'feed_votes_without_vote':false,
                               'feed_disable_comments':false, 'ui_disable_services':false, 'disable_awayphp':false, 'audio_toright':false, 'feed_disable_reposts':false, 'users_userinfo':false,
                               'track_lyrics':false, 'tenor':false, 'platinum_userposts':false, 'chat_actions_btn':false, 'ads_shortlink_filter':false, 'ads_referal_filter':false,
                               'ads_filter_list':false, 'stickers_remove':"[]", 'stickers_removeall':false,
                               'dr_manager':"{}", 'dr_ls':false, 'dr_chat':false, 'dr_group':false,
                               'dt_manager':"{}", 'dt_ls':false, 'dt_chat':false, 'dt_group':false, "audiorow_download_button": true, "audiorow_lyrics": true,
                               'dr_stories': false}
VKReact.serverside_settings = ["online", "friends_autoaccept", "friends_autoaccept_blocked", "friends_removeblocked"]

VKReact.settings = {
   importer: function(obj) {
      for (const [key, value] of Object.entries(obj)) {
         this[key] = value
      }
   },
   exporter: function() {
      let obj = {}
      Object.keys(VKReact.clientside_settings).forEach(it => obj[it] = GM_getValue(it))
      return obj
   },
}

for (const [key, _value] of Object.entries(VKReact.clientside_settings)) {
   Object.defineProperty(VKReact.settings, key, {get: function() {return GM_getValue(key, _value)}, set: function(value) {VKReact.onVariableSwitch(key); GM_setValue(key, value)}})
}

VKReact.serverside_settings.forEach(it => Object.defineProperty(VKReact.settings, it, {
   get: function() {
      return this[`_${it}`]
   }, 
   set: function(value) {
      this[`_${it}`] = value
      let obj = {"user_id":vk.id}
      Object.defineProperty(obj, it, {value: VKReact.settings["_"+it], enumerable: true})
      VkReactAPI.call("users.update", obj)
   }
}))

function parseDate(date_raw) {
    var date = new Date(date_raw);
    var month_lang = getLang('month'+(date.getMonth()+1)+'_of');
    if (month_lang)
       date = dateFormat(date, "d '" + month_lang + "' yyyy (HH:MM)");
    else
       date = dateFormat(date, 'd.mm.yyyy (HH:MM)');
    return date
}

VKReact.pluginManager = {
   call: function (event, ...args) {
      let retResults = new Set()
      Object.values(VKReact.plugins).forEach(async it => {
         if (it.on == event && (VKReact.settings[it.model] || !it.model)) {
            if (it.style && !it._style_injected) {
               GM_addStyle(it.style.evalute())
               it._style_injected = true
            }
            let retResult = await it.run(...args)
            if (typeof retResult !== "undefined") {
               retResults.add(retResult)
            }
         }
     })
     return retResults
   },
   clearPoll: function () {
      Object.values(VKReact.plugins).forEach(it => {
         it.object_poll = []
      })
   }
}

String.prototype.evalute = function() {
     return this.replace(/\!(.+?)\!/g, function(match, h) {return eval(h)});
};

Set.prototype.addAll = function(iterable) {
   for (let value of iterable) {
      this.add(value)
   }
   return this
}

function user_id() {
   if (window.vk && vk.id) return String(vk.id);
   let sidebar = window.ge && (ge('sideBar') || ge('side_bar'));
   if (window.im) return im.id;
   let tmp = null;
   if (sidebar) {
      tmp = sidebar.innerHTML.match(/albums(\d+)/);
      tmp = tmp ? tmp[1] : '';
   }
   return tmp;
}

VKReact.parseDate = parseDate
VKReact.user_id = user_id
VKReact.randomUint32 = randomUint32
Inj.InitStringifier();
VKReact.Inj = Inj
VKReact.vkUnescapeCyrLink = vkUnescapeCyrLink
VKReact.onLoad()