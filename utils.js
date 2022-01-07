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

Inj.InitStringifier();
VKReact.Inj = Inj
VKReact.onLoad()