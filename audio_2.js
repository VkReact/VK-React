// method to donwload audio using m3u8, not needed because there is a simplier solution
// may rollback to it in future

// minified version of VKMediaDownloader

GM_addElement('script', {
  src: 'https://unpkg.com/@ffmpeg/ffmpeg@0.6.1/dist/ffmpeg.min.js',
  type: 'text/javascript'
})

GM_addElement('script', {
  src: 'https://cdn.jsdelivr.net/npm/jszip@3.7.1/dist/jszip.min.js',
  type: 'text/javascript'
})

GM_addElement('script', {
  src: 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/0.14.16/hls.min.js',
  type: 'text/javascript'
})

GM_addElement('script', {
  src: 'https://unpkg.com/localforage@1.9.0/dist/localforage.min.js',
  type: 'text/javascript'
})


GM_addElement('script', {
  src: 'https://cdn.jsdelivr.net/npm/url-toolkit@2',
  type: 'text/javascript'
})

function createWorker(func) {
  var blob = new Blob([`;(${func.toString()})()`])
  var worker = new Worker(URL.createObjectURL(blob))
  return worker
}

function getImageBox() {
  var imageBox = document.querySelector('.VKReact-image-box')
  if (imageBox) {
    return imageBox
  }
  imageBox = document.createElement('div')
  imageBox.classList.add('VKReact-image-box')
  imageBox.style.display = 'none'
  return document.body.appendChild(imageBox)
}

function getDataURL(image) {
  var canvas = document.createElement('canvas')
  var context = canvas.getContext('2d')
  canvas.width = image.width
  canvas.height = image.height
  context.drawImage(image, 0, 0)
  var imageBox = getImageBox()
  imageBox.appendChild(canvas)
  var ext = getExtension(image.src) || 'jpg'
  setTimeout(function () {
    imageBox.removeChild(canvas)
  }, 1000)
  return canvas.toDataURL('image/' + ext)
}

function fetchImage(url) {
  var image = new Image()
  image.crossOrigin = 'Anonymous'
  var resolve, reject
  /** @type {Promise<string>} */
  var promise = new Promise(function (res, rej) { resolve = res; reject = rej; })
  image.addEventListener('load', function () {
    try {
      var data = getDataURL(image)
      resolve(data)
    } catch (e) {
      reject(e)
    }
  }, false)
  image.addEventListener('error', function () {
    reject(new Error('failed to fetch image (url = ' + url + ')'))
  }, false)
  image.src = url
  return promise.then(function (dataURL) {
    var ext = getExtension(image.src) || 'jpg'
    var data = dataURL.split(';base64,')
    return {
      mime: 'image/' + ext,
      base64: data[1],
    }
  })
}

var path = {
  join: function () {
    var args = Array.prototype.slice.call(arguments)
    return args.filter(Boolean).map(function (arg, idx, arr) {
      var ret = arg.trim()
      return idx < (arr.length - 1) ? ret.replace(/\/$/, '') : ret
    }).join('/')
  },
}

function requestWorker(worker, data) {
  var resolve
  var promise = new Promise(function (res) {
    resolve = res
  })
  var onMessage = function (e) {
    resolve(e.data)
    worker.removeEventListener('message', onMessage)
  }
  worker.addEventListener('message', onMessage)
  worker.postMessage(data)
  return promise
}


function downloadFile(source, name, onprogress) {
  var link = document.createElement('a')
  link.href = source
  if (link.origin === location.origin) {
    link.download = name || 'download'
    link.innerHTML = name || 'download'
    document.body.appendChild(link)
    link.click()
    return delay(300).then(function () {
      onprogress && onprogress(1, 1)
      document.body.removeChild(link)
    })
  }
  return makeRequest({
    method: 'GET',
    url: link.href,
    responseType: 'blob',
    onprogress: onprogress,
  }, true).then(function (response) {
    if (!response.ok) {
      return response
    }
    var URL = window.URL || window.webkitURL
    var resource = URL.createObjectURL(response.data);
    return downloadFile(resource, name).then(function () {
      URL.revokeObjectURL(resource)
      return response
    })
  })
}

let crypto = {
  createInitializationVector: function (segmentNumber) {
    var view = new Uint8Array(16);
    for (let i = 12; i < 16; ++i) {
      view[i] = (segmentNumber >> (8 * (15 - i))) & 0xff;
    }
    return view
  },
  hexadecimalInteger: function (hex) {
    if (!hex) {
      return null
    }
    var stringValue = (hex || '0x').slice(2);
    stringValue = ((stringValue.length & 1) ? '0' : '') + stringValue;
    var view = new Uint8Array(stringValue.length / 2);
    for (let i = 0; i < stringValue.length / 2; i++) {
      view[i] = parseInt(stringValue.slice(i * 2, i * 2 + 2), 16);
    }
    return view;
  },
  decrypt: function (data, key, iv) {
    var subtle = window.crypto.subtle || window.crypto.webkitSubtle
    if (!subtle) {
      throw new Error('Web crypto not supported')
    }
    return subtle.importKey('raw', key, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']).then(function (aesKey) {
      return subtle.decrypt({ name: 'AES-CBC', iv: iv }, aesKey, data);
    });
  },
}

var ffmpegController = {
  worker: createWorker(workerFunc),
  queue: new Queue({ workers: 1, autorun: true }),
  save: function (key, blob) {
    return localforage.setItem(key, blob).then(function () {
      return localforage.getItem(key)
    })
  },
  fetch: function (url) {
    if (location.hostname === 'vk.com' || location.hostname === 'm.vk.com') {
      return makeRequest({
        method: 'GET',
        url: url,
        responseType: 'blob',
      }, true)
    } else {
      return requestWorker(ffmpegController.worker, {
        url: url,
        type: 'blob',
      })
    }
  },
  request: function (key, url) {
    return localforage.getItem(key).then(function (result) {
      if (result) {
        return result
      }
      return ffmpegController.fetch(url).then(function (response) {
        if (!response.data) {
          throw new Error('failed to fetch resource', key, url, response.problem || response.message, response)
        }
        return ffmpegController.save(key, response.data)
      })
    })
  },
  create: function () {
    if (ffmpegController.ffmpeg) {
      return Promise.resolve(ffmpegController.ffmpeg)
    }
    return Promise.all([
      ffmpegController.request('ffmpeg-core.js', 'https://unpkg.com/@ffmpeg/core@v0.6.0/ffmpeg-core.js'),
      ffmpegController.request('ffmpeg-worker.js', 'https://unpkg.com/@ffmpeg/ffmpeg@v0.6.1/dist/worker.min.js'),
    ]).then(function (blobs) {
      return blobs.map(function (blob) {
        return blob instanceof Blob ? blob : new Blob([blob], { type: 'application/javascript' })
      })
    }).then(function (blobs) {
      var coreUrl = URL.createObjectURL(blobs[0])
      var workerUrl = URL.createObjectURL(blobs[1])
      ffmpegController.ffmpeg = FFmpeg.createWorker({
        logger: function (m) {  },
        log: false,
        corePath: coreUrl,
        workerPath: workerUrl,
      })
      return ffmpegController.ffmpeg
    }).catch(function (e) {
      return Promise.reject(e)
    })
  },
  load: function () {
    return ffmpegController.create().then(function (ffmpeg) {
      return ffmpegController.ffmpegLoaded ? Promise.resolve() : ffmpeg.load()
    }).then(function () {
      ffmpegController.ffmpegLoaded = true
      return ffmpegController.ffmpeg
    })
  },
  writeText: function (file, text) {
    return ffmpegController.ffmpeg.writeText(file, text)
  },
  write: function (file, data) {
    return ffmpegController.ffmpeg.write(file, data)
  },
  readText: function (file) {
    return ffmpegController.read(file).then(function (res) {
      return String.fromCharCode.apply(null, new Uint8Array(res.data))
    })
  },
  read: function (file) {
    return ffmpegController.ffmpeg.read(file)
  },
  /**
   * @param {{ name: string; data: Buffer; }[]} files 
   * @param {string} [dir]
   */
  writeFiles: function (files, dir) {
    var ffmpeg = ffmpegController.ffmpeg
    return files.reduce(function (p, f) {
      return p.then(function () {
        return ffmpeg.write(path.join(dir, f.name), new Uint8Array(f.data))
      })
    }, Promise.resolve())
  },
  /**
   * @param {Array<{ name: string } | string>} files 
   * @param {string} [dir]
   */
  removeFiles: function (files, dir) {
    var ffmpeg = ffmpegController.ffmpeg
    return files.reduce(function (p, f) {
      return p.then(function () {
        var name = typeof f == 'string' ? f : f.name
        return name ? ffmpeg.remove(path.join(dir, name)) : Promise.resolve()
      })
    }, Promise.resolve())
  },
  removeFilesAll: function () {
    var ffmpeg = ffmpegController.ffmpeg
    return ffmpeg.ls('./').then(function (result) {
      var files = result.data.filter(function (name) {
        return name.match(/[^.]+\.[^.]+$/)
      })
      return ffmpegController.removeFiles(files)
    })
  },
  /**
   * @param {string[]} fileNames
   * @param {string} outputFile
   * @param {string} [options]
   */
  concatFiles: function (fileNames, outputFile, options) {
    var ffmpeg = ffmpegController.ffmpeg
    unsafeWindow.ffmpeg = ffmpeg
    return Promise.race([
      ffmpeg.concatDemuxer(fileNames, outputFile, options),
      delay(45 * 1000).then(function () {
        throw new Error('ffmpeg concat timeout')
      }),
    ])
  },
  /**
   * @param {import('./audioController').IAudioMetaData} metadata
   * @param {string} artistsSep
   */
  formatMetadata: function (metadata, artistsSep = ',') {
    var options = {
      title: metadata.title || '',
      artist: metadata.artists.join(artistsSep),
      TIT3: metadata.subTitle || '',
    }
    return Object.keys(options).reduce(function (acc, cur) {
      if (options[cur].trim()) {
        acc[cur] = options[cur].trim()
      }
      return acc
    }, {})
  },
  addCover: async function (inputFile, url, outputFile) {
    var ffmpeg = ffmpegController.ffmpeg
    var metadataFile = 'v_metadata.txt', coverFile
    if (!url) {
      return ffmpeg.run(`-i ${inputFile} -c copy ${outputFile}`)
    }
    let image = await fetchImage(url)
    coverFile = 'cover.' + image.mime.split('/')[1]
    await ffmpeg.write(coverFile, base64ToUint8Array(image.base64))
    await ffmpeg.writeText(metadataFile, `;FFMETADATA1\ncomment=Cover (front)\n`)
    try {
      await ffmpeg.run(`-i ${inputFile} -i ${coverFile} -i ${metadataFile} -c copy -map 0:0 -map 1:0 -id3v2_version 3 -map_metadata:s:1 2 ${outputFile}`)
    }
    catch (e) {
      console.log('ffmpeg: addCover error', e)
      await ffmpeg.run(`-i ${inputFile} -c copy ${outputFile}`)
    }
  },
  addMetadata: async function (inputFile, metadata, outputFile) {
    var ffmpeg = ffmpegController.ffmpeg
    var metadataFile = `metadata_${Math.floor(Math.random() * 1e4)}.txt`
    await ffmpeg.run(`-i ${inputFile} -f ffmetadata ${metadataFile}`)
    let text = await ffmpegController.readText(metadataFile)

    for (var key of Object.keys(metadata)) {
      text = `${text}${key}=${metadata[key]}\n`
    }
    await ffmpeg.writeText(metadataFile, text)
    await ffmpeg.run(`-i ${inputFile} -i ${metadataFile} -map_metadata 1 -c copy ${outputFile}`)
  },
  download: async function (inputFile, filename) {
    var ffmpeg = ffmpegController.ffmpeg
    var url
    let res = await ffmpeg.read(inputFile)
    url = URL.createObjectURL(new Blob([res.data]))
    return downloadFile(url, filename)
  },
  concat: async function (data) {
    var fragmentNames = data.fragments.map(function (f) { return f.name })
    var files = data.fragments.map(function (f) { return { name: f.name, data: f.data }; })
    try {
      await ffmpegController.load()
      await ffmpegController.writeFiles(files)
      await ffmpegController.concatFiles(fragmentNames, `output.${data.ext}`, '-c copy')
      data.metadata ? await ffmpegController.addMetadata(`output.${data.ext}`, ffmpegController.formatMetadata(data.metadata), `output_a.${data.ext}`) : null
      data.metadata ? await ffmpegController.addCover(`output_a.${data.ext}`, data.metadata.cover_p || data.metadata.cover_s, `output_b.${data.ext}`) : null
      await ffmpegController.download(`output${data.metadata ? '_b' : ''}.${data.ext}`, data.filename)
      await ffmpegController.removeFilesAll()
    }
    catch (e) {
      console.log(e)
    }
  },
  metadata: async function (data) {
    let result
    await ffmpegController.load()
    await ffmpegController.write(`input.${data.ext}`, data.payload)
    await ffmpegController.addMetadata(`input.${data.ext}`, ffmpegController.formatMetadata(data.metadata), `output.${data.ext}`)
    await ffmpegController.addCover(`output.${data.ext}`, data.metadata.cover_p || data.metadata.cover_s, `output_b.${data.ext}`)
    if (!data.filename) return
    await ffmpegController.download(`output_b.${data.ext}`, data.filename)
    result = await ffmpegController.read(`output_b.${data.ext}`)
    await ffmpegController.removeFilesAll()
    return result.data
  },
  queueMetadata: function (data) {
    var resolve, reject;
    var promise = new Promise(function (res, rej) { resolve = res; reject = rej; })
    ffmpegController.queue.add({
      onSuccess: function (buffer) {
        resolve(Object.assign({}, data, { payloadWithMetadata: buffer }))
      },
      onError: function (e) {
        reject(Object.assign({ error: e }, data))
      },
      run: function () {
        return ffmpegController.metadata(data)
      },
    })
    return promise;
  },
  queueConcat: function (data) {
    var resolve, reject;
    var promise = new Promise(function (res, rej) { resolve = res; reject = rej; })
    ffmpegController.queue.add({
      onSuccess: function () {
        resolve(Object.assign({}, data, { fragments: null }))
      },
      onError: function (e) {
        reject(Object.assign({ error: e }, data, { fragments: null }))
      },
      run: function () {
        return ffmpegController.concat(data)
      },
    })
    return promise;
  },
}

let textarea = document.createElement('textarea')
let getTextAreaValue = function (text) {
  textarea.innerHTML = text
  return textarea.value
}
let link
function URLParse(url) {
  link = link || document.createElement('a')
  link.href = url
  return link.cloneNode()
}

let iframeChannel = {
  init: function () {
    window.addEventListener('message', iframeChannel.onMessage)
    eventEmitter.on('iframe-ready', iframeChannel.onIFrameReady)
  },
  createRoot: function () {
    iframeChannel.id = iframeChannel.id || `iframe-root-${random()}`
    let root = document.querySelector('#' + iframeChannel.id)
    if (root) {
      return root
    }
    root = document.createElement('div')
    root.id = iframeChannel.id
    root.classList.add('VKReact-iframe-channel')
    iframeChannel.root = root
    return document.body.appendChild(root)
  },
  getEventName: function (data) {
    return data && data.id && data.event ? (data.id + '-' + data.event) : ''
  },
  request: function (data) {
    var event = iframeChannel.getEventName(data)
    if (!event) {
      return Promise.reject(new Error('invalid data'))
    }
    var resolve
    var promise = new Promise(function (res) {
      resolve = res
    })
    eventEmitter.once(event, function (response) {
      resolve(response)
    })

    iframeChannel.send(data)
    return promise
  },
  send: function (data) {
    var link = document.createElement('a')
    link.href = data.url
    var id = 'iframe_' + link.hostname.replace(/\./g, '_') + (link.port ? ('_' + link.port) : '')

    var iframe = document.querySelector('#' + id)
    if (!iframe) {
      iframe = iframeChannel.createIFrame(id, data, link.href)
    } else if (iframe.classList.contains('iframe-ready')) {
      iframe.contentWindow.postMessage(data, '*')
    } else {
      eventEmitter.once('iframe-' + iframe.id, function () {
        iframe.contentWindow.postMessage(data, '*')
      })
    }
    return iframe
  },
  onIFrameReady: function (id) {
    var iframe = document.body.querySelector('iframe#' + id)
    if (iframe) {
      iframe.classList.add('iframe-ready')
      eventEmitter.emit('iframe-' + id)
    }
  },
  createIFrame: function (id, data, url) {
    var iframe = document.createElement('iframe')
    iframe.id = id
    iframe.style.width = '1px'
    iframe.style.height = '1px'
    iframe.style.visibility = 'hidden'
    data = deepCopy(data)
    data.iframeId = iframe.id
    var root = iframeChannel.createRoot()
    root.appendChild(iframe)
    iframe.src = iframeChannel.getIFrameURL(data, url)
    return iframe
  },
  getIFrameURL: function (data, url) {
    var link = URLParse(url)
    link.pathname = link.pathname + '.html'
    link.hash = 'VKReact:' + encodeURIComponent(JSON.stringify(data))
    return link.href
  },
  onMessage: function (e) {
    var event = iframeChannel.getEventName(e.data)
    if (event) {
      eventEmitter.emit(event, e.data)
    }
    if (e.data && e.data.event === 'iframe-ready') {
      eventEmitter.emit('iframe-ready', e.data.iframeId)
    }
  },
}

/** @param {string} base64 */
function base64ToUint8Array(base64) {
  var byteChars = atob(base64);
  var bytes = new Array(byteChars.length);
  for (var i = 0; i < byteChars.length; ++i) {
    bytes[i] = byteChars.charCodeAt(i);
  }
  return new Uint8Array(bytes);
}

function getExtension(url) {
  var link = document.createElement('a')
  link.href = url
  var match = link.pathname.match(/\.([^.]+)$/)
  return match ? match[1] : '';
}

VKReact.plugins['bruhhhnah'] = {
  run: async function () {
    iframeChannel.init()
  },
  on: "start"
}

function workerFunc() {
  var time = function () { return `[${new Date().toISOString()}]` }
  var onFetch = function (e) {
    return fetch(e.data.url, {
      method: e.data.method || 'GET',
      headers: e.data.headers || {},
    }).then(function (response) {
      if (response.ok) {
        return response[e.data.type || 'text']()
      }
      throw new Error('failed to fetch resource = ' + e.data.url + ', status = ' + response.status)
    }).then(function (result) {
      self.postMessage({ url: e.data.url, data: result, type: e.data.type || 'text' })
    }).catch(function (e) {
      self.postMessage({ error: e.message, url: e.data.url })
    })
  }
  var onMessage = function (e) {
    if (e.data.url) {
      onFetch(e)
    }
  }
  self.onmessage = onMessage
}

// D U M B implementation of node.js EventEmitter

let eventEmitter = {
  callbacks: {},
  on: function (name, callback) {
    if (typeof this.callbacks[name] === "undefined") {
      this.callbacks[name] = [[callback, "on"]]
    }
    else {
      this.callbacks[name].push([callback, "once"])
    }
  },
  emit: function (name, ...args) {
    for (let ballback of (this.callbacks[name] || [])) {
      let callback = ballback[0]
      let opt = ballback[1]
      callback(...args)
      if (opt == "once") {
        this.callbacks[name] = this.callbacks[name].filter(it => it[0] != callback)
      }
    }
  },
  once: function (name, callback) {
    if (typeof this.callbacks[name] === "undefined") {
      this.callbacks[name] = [[callback, "once"]]
    }
    else {
      this.callbacks[name].push([callback, "once"])
    }
  },
}

function delay(timeout) {
  return new Promise(function (resolve) {
    setTimeout(resolve, timeout)
  })
}

let toUrlEncoded = function (data) {
  return typeof data === 'string' ? data : Object.keys(data).reduce(function (acc, key) {
    acc.push(key + '=' + encodeURIComponent(data[key]))
    return acc
  }, []).join('&')
}

let alphanum = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'

function pad(val, size = 2) {
  val = `${val}`
  return val.length >= size ? val : `0000000${val}`.slice(-size)
}

var hlsController = {
  MP2T_SIZE_FACTOR: 0.915,
  MASTER_PLAYLIST_REGEX: /#EXT-X-STREAM-INF:([^\n\r]*)[\r\n]+([^\r\n]+)/g,
  DECIMAL_RESOLUTION_REGEX: /^(\d+)x(\d+)$/,
  ATTR_LIST_REGEX: /\s*(.+?)\s*=((?:\".*?\")|.*?)(?:,|$)/g,
  SOURCE_EXTENSION_REGEX: /\.([a-z\-0-9]+)$/,
  /**
   * 
   * @param {{
   *  url: string;
   *  media: 'audio' | 'video';
   *  name: string;
   *  metadata?: import('./audioController').IAudioMetaData
   * }} data
   * @param {(loaded: number, total: number) => void} [onprogress]
   */
  download: async function (data, onprogress = noop) {
    var hls = new Hls()
    hls.loadSource(data.url)
    await hlsController.levelLoaded(hls)
    let details = hlsController.getDetails(hls)
    let results = []
    var tasks = hlsController.createDownloadTasks(details.fragments, results, onprogress)
    var queue = new Queue({ retry: 5, workers: 10 })
    queue.add(tasks)
    await queue.run()
    results = await Promise.all(results.map(async (item) => {
      return await hlsController.decryptFragment(item)
    }));

    results = results.sort(function (a, b) { return a.segmentNumber - b.segmentNumber })
    let ext = data.media == 'audio' ? 'mp3' : 'mp4'
    return await hlsController.saveFragments({ fragments: results, name: data.name, ext: ext, metadata: data.metadata })
  },
  saveFragments: function (data) {
    var fragments = data.fragments,
      name = data.name
    var ffmpegEnabled = true //settingsModel.getValue('ffmpeg-enable')
    var ffmpegMaxSize = Infinity // settingsModel.getValue('ffmpeg-max-size')
    var size = fragments.reduce(function (s, f) {
      return s + f.decryptedData.byteLength
    }, 0)
    if (!ffmpegEnabled || size > ffmpegMaxSize) {
      return hlsController.downloadAsZip(fragments, name)
    }
    return hlsController.downloadAsMPx(data).then(function (response) {
      if (response.error) {
        return hlsController.downloadAsZip(fragments, name)
      }
    })
  },
  downloadAsZip: function (fragments, name) {
    var jszip = new JSZip()
    for (var f of fragments) {
      jszip.file('s/' + hlsController.fragmentName(f), f.decryptedData, { binary: true })
    }
    jszip.file(name + '.out', '')
    jszip.file('filename.txt', name)
    jszip.file('generate.mp3.bat', hlsController.generateMP3Bat(name))
    jszip.file('generate.mp3.sh', hlsController.generateMP3Bash())
    jszip.file('generate.mp4.bat', hlsController.generateMP4Bat(name))
    jszip.file('generate.mp4.sh', hlsController.generateMP4Bash())
    jszip.file('README.txt', hlsController.generateReadme())
    var type = hlsController.getSupportedZipType()
    return jszip.generateAsync({ type: type }).then(function (data) {
      var blob = hlsController.getZipBlob(data, type)
      var resource = URL.createObjectURL(blob);
      return downloadFile(resource, name + '.zip').then(function () {
        URL.revokeObjectURL(resource);
      })
    })
  },
  downloadAsMPx: function (payload) {
    var url = 'https://www.youtube.com/vk_media_downloader'
    var ext = payload.ext || 'mp4'
    var name = payload.name
    var filename = `${name}.${ext}`
    var files = payload.fragments.map(function (f) {
      return { name: hlsController.fragmentName(f), data: f.decryptedData }
    })
    var data = { id: 'ffmpeg', event: 'concatenate', name: name, url: url, ext: ext, filename: filename, fragments: files, metadata: payload.metadata }
    var promise = Promise.reject()
    return promise.catch(function (e) {
      return Promise.race([
        iframeChannel.request({ id: 'ffmpeg', event: 'load', url: url }),
        delay(10 * 1000).then(function () { return null }),
      ]).then(function (result) {
        return result ? iframeChannel.request(data) : ffmpegController.queueConcat(data)
      })
    })
  },
  getZipBlob: function (data, type) {
    switch (type) {
      case 'blob':
        return data
      case 'uint8array':
        return new Blob([data], { type: 'application/zip' })
      case 'base64':
        return new Blob([base64ToUint8Array(data)], { type: 'application/zip' })
      default:
        return null
    }
  },
  getSupportedZipType: function () {
    var types = ['uint8array', 'blob', 'base64'];
    var type = types.find(function (t) {
      return JSZip.support[t]
    })
    if (!type) {
      throw new Error('your browser does not support any of [' + types.join(', ') + '] zip types');
    }
    return type;
  },

  fragmentName: function (fragment) {
    var url = URLToolkit.buildAbsoluteURL(fragment.baseurl, fragment.relurl),
      segmentNumber = fragment.segmentNumber
    var n = Math.floor(segmentNumber / 1000)
    var ext = getExtension(url)
    var name = alphanum[n] + pad(segmentNumber, 3) + '.' + ext
    return name
  },
  decryptFragment: function (fragment) {
    var levelkey = fragment.levelkey || {}
    if (!levelkey || !levelkey.method) {
      fragment.decryptedData = fragment.data
      return Promise.resolve(fragment)
    }
    var keyurl = URLToolkit.buildAbsoluteURL(levelkey.baseuri, levelkey.reluri)
    return hlsController.fetchLevelKey(keyurl, 0).then(function (key) {
      var iv = levelkey.iv
      if (!iv) {
        iv = crypto.createInitializationVector(fragment.segmentNumber)
      } else if (typeof iv === 'string') {
        iv = crypto.hexadecimalInteger(levelkey.iv)
      }
      return crypto.decrypt(fragment.data, key, iv)
    }).then(function (data) {
      fragment.decryptedData = data
      return fragment
    }).catch(function (error) {
    })
  },
  fetchLevelKey: function (url, retries = 0) {
    return makeRequest({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer',
    }).then(function (response) {
      if (response.ok) {
        return new Uint8Array(response.data)
      }
      if (retries < 5) {
        return hlsController.fetchLevelKey(url, retries + 1)
      } else {
        return Promise.reject(response)
      }
    })
  },
  createDownloadTasks: function (fragments, results, onprogress) {
    var total = fragments.length, loaded = 0;
    var tasks = fragments.map(function (f, idx) {
      return {
        onSuccess: function (responseData) {
          loaded += 1
          onprogress && onprogress(loaded, total)
          var response = Object.assign({}, f, {
            data: responseData,
            segmentNumber: idx + 1,
          })
          results.push(response)
        },
        onError: function (error) {
        },
        run: function () {
          return makeRequest({
            method: 'GET',
            url: f.url,
            responseType: 'arraybuffer',
          }).then(function (response) {
            return response.ok ? response.rawData : Promise.reject(response)
          })
        },
      }
    })
    return tasks
  },
  fetchSize: function (url) {
    var hls = new Hls(), duration = 0, totalduration = 0
    hls.loadSource(url)
    return hlsController.levelLoaded(hls).then(function () {
      var details = hlsController.getDetails(hls)
      totalduration = details.totalduration
      var fragment = details.fragments.find(function (f) {
        return (!f.levelkey || !f.levelkey.method) && f.duration > 1
      })
      duration = fragment.duration
      var f_url = URLToolkit.buildAbsoluteURL(fragment.baseurl, fragment.relurl);
      return makeRequest({
        method: 'GET',
        url: f_url,
        responseType: 'arraybuffer',
      })
    }).then(function (response) {
      var size = response.data.byteLength || response.data.length
      size *= hlsController.MP2T_SIZE_FACTOR / (duration || 1) * totalduration
      hls.destroy()
      return { size: size, duration: totalduration }
    }).catch(function (e) {
      hls.destroy()
      return { size: -1, duration: totalduration }
    })
  },
  getDetails: function (hls) {
    var coreComponents = hls && hls.coreComponents || []
    var segments = coreComponents[4] && coreComponents[4].segments || []
    var levels = coreComponents[5] && coreComponents[5].levels || []
    var details = levels[0] && levels[0].details || {}
    var fragments = details.fragments || []
    var totalduration = details.totalduration || 0
    return {
      segments: segments,
      fragments: fragments,
      totalduration: totalduration,
    }
  },
  levelLoaded: function (hls) {
    var details = hlsController.getDetails(hls)
    if (details.fragments.length) {
      return Promise.resolve()
    }
    return new Promise(function (resolve) {
      var listener = function () {
        hls.off(Hls.Events.LEVEL_LOADED, listener)
        resolve()
      }
      hls.on(Hls.Events.LEVEL_LOADED, listener)
    })
  },
  fetchPlaylist: function (url) {
    return makeRequest({
      method: 'GET',
      url: url,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      }
    }).then(function (response) {
      if (response.ok) {
        return response.data
      }
      throw response
    })
  },
  parseMasterPlaylist: function (playlist) {
    var levels = {}
    var result
    hlsController.MASTER_PLAYLIST_REGEX.lastIndex = 0;
    while ((result = hlsController.MASTER_PLAYLIST_REGEX.exec(playlist)) != null) {
      var level = {}
      level.url = result[2]
      var attrs = hlsController.parseAttrList(result[1])

      var resolution = hlsController.decimalResolution(attrs['RESOLUTION'])
      if (resolution) {
        level.width = resolution.width
        level.height = resolution.height
      }
      var bitrate = level.bitrate = hlsController.decimalInteger(attrs['AVERAGE-BANDWIDTH']) || hlsController.decimalInteger(attrs['BANDWIDTH'])
      level.name = attrs.NAME
      levels[bitrate] = level
    }
    return levels
  },
  parseAttrList: function (input) {
    var match, attrs = {}
    hlsController.ATTR_LIST_REGEX.lastIndex = 0
    while ((match = hlsController.ATTR_LIST_REGEX.exec(input)) !== null) {
      var value = match[2], quote = '"'
      if (value.indexOf(quote) === 0 && value.lastIndexOf(quote) === (value.length - 1)) {
        value = value.slice(1, -1)
      }
      attrs[match[1]] = value
    }
    return attrs
  },
  decimalResolution: function (val) {
    var res = hlsController.DECIMAL_RESOLUTION_REGEX.exec(val)
    if (res === null) {
      return undefined
    }
    return {
      width: parseInt(res[1], 10),
      height: parseInt(res[2], 10)
    }
  },
  decimalInteger: function (val) {
    var intValue = parseInt(val, 10);
    if (intValue > Number.MAX_SAFE_INTEGER) {
      return Infinity;
    }
    return intValue;
  },
  generateMP3Bat: function (filename) {
    return [
      '@echo off',
      'setlocal enabledelayedexpansion',
      'chcp 65001',
      'ffmpeg -version',
      'if errorlevel 1 (',
      '  echo "ffmpeg not found"',
      '  @pause',
      '  exit',
      ')',
      'SET "filename=' + filename + '"',
      'echo "filename: %filename%"',
      'echo "cd: %cd%"',
      'dir',
      '@pause',
      '(FOR /R %%i IN (*.ts) DO @echo file \'s/%%~nxi\') > list.txt',
      'ffmpeg -f concat -safe 0 -loglevel panic -i list.txt -c:a copy -vn "%filename%.mp3"',
      'del "list.txt"',
      'echo "success"',
      '@pause',
    ].join('\r\n')
  },
  generateMP4Bat: function (filename) {
    return [
      '@echo off',
      'setlocal enabledelayedexpansion',
      'chcp 65001',
      'ffmpeg -version',
      'if errorlevel 1 (',
      '  echo "ffmpeg not found"',
      '  @pause',
      'exit',
      ')',
      'SET "filename=' + filename + '"',
      'echo "filename: %filename%"',
      'echo "cd: %cd%"',
      'dir',
      '@pause',
      '(FOR /R %%i IN (*.ts) DO @echo file \'s/%%~nxi\') > list.txt',
      'ffmpeg -f concat -safe 0 -loglevel panic -i list.txt -c:a copy -c:v copy "%filename%.mp4"',
      'del "list.txt"',
      'echo "success"',
      '@pause',
    ].join('\r\n')
  },
  generateMP3Bash: function () {
    return [
      '#!/bin/bash',
      'ffmpeg -version',
      'if [ $? != 0 ]; then',
      '  echo "ffmpeg not found"',
      '  exit 0',
      'fi',
      'filename=$(ls *.out)',
      'filename="${filename%.*}"',
      'for file in s/*.ts; do',
      '  echo "file \'$file\'" >> list.txt;',
      'done',
      'ffmpeg -f concat -safe 0 -loglevel panic -i list.txt -c:a copy -vn "$filename.mp3"',
      'rm -f list.txt',
      'exit 0',
    ].join('\n')
  },
  generateMP4Bash: function () {
    return [
      '#!/bin/bash',
      'ffmpeg -version',
      'if [ $? != 0 ]; then',
      '  echo "ffmpeg not found"',
      '  exit 0',
      'fi',
      'filename=$(ls *.out)',
      'filename="${filename%.*}"',
      'for file in s/*.ts; do',
      '  echo "file \'$file\'" >> list.txt;',
      'done',
      'ffmpeg -f concat -safe 0 -loglevel panic -i list.txt -c:a copy -c:v copy "$filename.mp4"',
      'rm -f list.txt',
      'exit 0',
    ].join('\n')
  },
  generateReadme: function () {
    return [
      'README',
      '1) install ffmpeg',
      '2.a) Windows users',
      '  run generate.mp3.bat',
      '2.b) Linux, MacOS users',
      '  chmod +x generate.mp3.sh # make generate.mp3.sh executable',
      '  ./generate.mp3.sh',
    ].join(platform.OS === 'windows' ? '\r\n' : '\n')
  },
}

function smartSize(size) {
  if (!size) {
    return '-- MiB'
  }
  var rest = size
  var mib = Math.floor(rest / (1024 * 1024))
  rest -= mib * 1024 * 1024
  var kib = Math.floor(rest / 1024)
  rest -= kib * 1024
  var bytes = rest
  var filesize;
  if (mib) {
    filesize = (size / (1024 * 1024)).toFixed(1) + ' MiB'
  } else if (kib) {
    filesize = (size / 1024).toFixed(1) + ' KiB'
  } else if (bytes) {
    filesize = bytes + ' bytes'
  } else {
    filesize = 'unknown'
  }
  return filesize
}

function makeRequest(options) {
  let details = {
    method: 'GET',
    headers: {},
  }
  if (typeof details === 'string') {
    details = Object.assign(details, { url: options })
  } else {
    details = Object.assign(details, options)
  }
  // Response
  let response = {
    ok: false,
    problem: undefined,
    headers: {},
    status: 0,
    data: undefined,
    finalUrl: details.url,
  }
  let resolve
  let promise = new Promise(function (r) {
    resolve = r
  })
  let onLoad = function (e) {
    let req = e.target || e
    response.status = req.status
    response.headers = parseAJAXHeaders((typeof req.getAllResponseHeaders == 'function' ? req.getAllResponseHeaders() : req.responseHeaders) || {})
    response.ok = req.status >= 200 && req.status < 300
    response.problem = response.ok ? undefined : response.problem
    let isText = !req.responseType || req.responseType.toLowerCase() === 'text'
    try {
      response.data = parseAJAXResponse({
        responseText: isText && (req instanceof XMLHttpRequest) ? req.responseText : req.response,
        headers: response.headers,
        responseType: req.responseType,
      })
    } catch (error) {
      response.data = isText && (req instanceof XMLHttpRequest) ? req.responseText : req.response
    }
    response.rawData = req.response
    response.finalUrl = req.finalUrl || req.responseURL || response.finalUrl
    return response
  }
  let onTimeout = function (e) {
    let req = e.target || e
    response.status = req.status
    response.ok = false
    response.problem = 'TIMEOUT'
    return response
  }
  let onError = function (e) {
    let req = e.target || e
    response.status = req.status
    response.problem = req.status.toString()
    response.ok = false
    return response
  }
  let onProgress = function (e) {
    if (typeof details.onprogress === 'function') {
      details.onprogress(e.loaded, e.total)
    }
  }
  xhr(Object.assign({}, details, {
    onload: function (req) {
      let r = onLoad(req)
      resolve(r)
    },
    onerror: function (req) {
      let r = onError(req)
      resolve(r)
    },
    ontimeout: function (req) {
      let r = onTimeout(req)
      resolve(r)
    },
    onprogress: function (req) {
      onProgress(req)
    },
  }))
  return promise
}

function Worker(queue) {
  this.queue = queue
}

Worker.prototype.run = function run() {
  if (this.aborted || this.running || !this.queue.size()) {
    return Promise.resolve()
  }
  var task = this.queue.nextTask()
  var _this = this

  this.running = true
  return task.run().then(function (response) {
    task.onSuccess(response)
    _this.running = false
  }).catch(function (error) {
    task.onError(error)
    _this.running = false
  }).then(function () {
    return _this.run()
  })
}

Worker.prototype.abort = function abort() {
  this.aborted = true
}

Worker.prototype.stop = function stop() {
  this.abort()
}

function Task(options, queue) {
  this.options = options
  this.queue = queue
}

Task.prototype.run = function run() {
  return this.options.run()
}

Task.prototype.onSuccess = function onSuccess(response) {
  this.queue.onSuccess(this)
  return this.options.onSuccess(response)
}

Task.prototype.onError = function onError(error) {
  this.queue.onError(this)
  return this.options.onError(error)
}

function noop() { }

function Queue(options) {
  this.options = options || {}
  this.retries = 0

  /** @type {Worker[]} */
  this.workers = []
  /** @type {Task[]} */
  this.tasks = []

  /** @type {Task[]} */
  this.success = []
  /** @type {Task[]} */
  this.errors = []
}

Queue.prototype.size = function () {
  return this.tasks.length
}

Queue.prototype.nextTask = function () {
  return this.tasks.shift()
}

/**
 * @param {ITaskOptions | ITaskOptions[]} taskOptions
 */
Queue.prototype.add = function (taskOptions) {
  taskOptions = Array.isArray(taskOptions) ? taskOptions : [taskOptions]
  var queue = this
  var tasks = taskOptions.map(function (options) {
    return new Task(options, queue)
  })
  this.tasks.push.apply(this.tasks, tasks)
  if (this.options.autorun && !this.running) {
    return this.run()
  }
  return Promise.resolve()
}

Queue.prototype.onSuccess = function onSuccess(task) {
  this.success.push(task)
}

Queue.prototype.onError = function onError(task) {
  this.errors.push(task)
}

Queue.prototype.fork = function fork() {
  if (this.running) {
    throw new Error('already running')
  }
  var worker = new Worker(this)
  this.workers.push(worker)
  return worker
}

Queue.prototype.forkAll = function forkAll(amount) {
  var workers = []
  for (var i = 0; i < amount; ++i) {
    workers.push(this.fork())
  }
  this.workers.push.apply(this.workers, workers)
  return workers
}

/** @param {(progress: number) => void} [onProgress] */
Queue.prototype.run = function run(onProgress = noop) {
  if (this.running) {
    return Promise.reject(new Error('already running'))
  }
  if (!this.workers.length && this.options.workers) {
    this.forkAll(this.options.workers)
  } else if (!this.workers.length) {
    this.fork()
  }
  this.running = true
  this.onProgress = onProgress.bind(null)
  var promises = this.workers.map(function (worker) {
    return worker.run()
  })
  var _this = this
  this.promise = Promise.all(promises).then(function () {
    _this.running = false
  }).catch(function () {
    _this.running = false
    if (_this.options.retry && _this.retries < _this.options.retry) {
      return _this.retry()
    }
  })
  return this.promise
}

Queue.prototype.retry = function retry() {
  if (this.errors.length) {
    this.tasks.push.apply(this.tasks, this.errors)
    this.errors.length = 0
    this.retries += 1
    return this.run(this.onProgress)
  }
  return Promise.resolve()
}

Queue.prototype.abort = function abort() {
  this.workers.forEach(function (worker) {
    worker.abort()
  })
  return this.promise
}

Queue.prototype.stop = function stop() {
  return this.abort()
}

Queue.prototype.clean = function clean() {
  if (this.running) {
    throw new Error('stop before clean; e.i., queue.stop().then(() => queue.clean())')
  }
  this.workers.length = 0
  this.tasks.length = 0
  this.success.length = 0
  this.errors.length = 0
}

function deepCopy(target) {
  if (target === null || typeof target !== 'object') {
    return target
  }
  let retval = Array.isArray(target) ? [] : {}
  for (let key of Object.keys(target)) {
    retval[key] = deepCopy(target[key])
  }
  return retval
}

function createDocument(text, title) {
  title = title || ''
  let doc = document.implementation.createHTMLDocument(title);
  doc.documentElement.innerHTML = text
  return doc
}

function parseAJAXResponse(params) {
  let responseText = params.responseText,
    headers = params.headers,
    responseType = params.responseType;
  let isText = !responseType || responseType.toLowerCase() === 'text'
  let contentType = headers['content-type'] || ''
  let ignoreXML = params.ignoreXML === undefined ? true : false;
  if (
    isText
    && contentType.indexOf('application/json') > -1
  ) {
    return JSON.parse(responseText)
  }
  if (
    !ignoreXML
    && isText
    && (
      contentType.indexOf('text/html') > -1
      || contentType.indexOf('text/xml') > -1
    )
  ) {
    return createDocument(responseText)
  }
  return responseText
}

function parseAJAXHeaders(headersString) {
  if (typeof headersString !== 'string') {
    return headersString
  }
  return headersString.split(/\r?\n/g)
    .map(function (s) { return s.trim() })
    .filter(Boolean)
    .reduce(function (acc, cur) {
      let res = cur.split(':')
      let key, val
      if (res[0]) {
        key = res[0].trim().toLowerCase()
        val = res.slice(1).join('').trim()
        acc[key] = val
      }
      return acc
    }, {})
}

var defaultOptions = {
  '<': '[',
  '>': ']',
  ':': '',
  '"': '\'',
  '/': '_',
  '\\': '_',
  '|': '_',
  '?': '',
  '*': '',
}

function normalizeFilename(name, options) {
  var regex = /[<>:"/\\|?*]/g
  return (name || '').replace(regex, function (match) {
    return (options || defaultOptions)[match] || ''
  })
}

let audioController = {
  vk_id: null,
  /** @type {IAudioData} */
  lastAudio: null,
  /** @type {import('../views/audioTooltip')} */
  tooltip: null,
  setTooltip: function (tooltip) {
    audioController.tooltip = tooltip
  },
  /** @type {import('../model/settingsModel')} */
  settingsModel: null,
  setSettingsModel: function (model) {
    audioController.settingsModel = model
  },
  /** @type {{ [x: string]: IAudioData }} */
  cache: {},
  cacheTimeout: 10 * 60 * 1000,
  /** @return {IAudioData} */
  getCache: function (full_id) {
    return audioController.cache[full_id] || { full_id: full_id, inserted_at: Date.now() }
  },
  isExpiredCache: function (full_id) {
    let cache = audioController.cache[full_id]
    if (cache && cache.inserted_at) {
      let diff = Date.now() - cache.inserted_at
      return diff > audioController.cacheTimeout
    }
    return true
  },
  updateCache: function (full_id) {
    let cache = audioController.cache[full_id] || { full_id: full_id, inserted_at: Date.now() }
    if (!cache.inserted_at) {
      cache.inserted_at = Date.now()
    }
    let data = Array.prototype.slice.call(arguments, 1)
    let args = [cache]
    args.push.apply(args, data)
    audioController.cache[full_id] = Object.assign.apply(Object, args)
  },
  setLastAudio: function (full_id) {
    /** @type {IAudioData} */
    let audio = audioController.getCache(full_id)
    audioController.lastAudio = Object.assign({ full_id: full_id }, audio)
  },
  updateLastAudio: function (full_id) {
    if (audioController.lastAudio && audioController.lastAudio.full_id == full_id) {
      /** @type {IAudioData} */
      let audio = audioController.getCache(full_id)
      audioController.lastAudio = Object.assign({}, audio)
    }
  },
  saveAudioToClipboard: function () {
    /** @type {IAudioData} */
    let lastAudio = audioController.lastAudio
    if (lastAudio && lastAudio.mp3Url) {
      copyTextToClipboard(lastAudio.mp3Url)
    }
    if (lastAudio && !lastAudio.mp3Url && lastAudio.src) {

    }
  },
  /**
   * @param {string[]} ids
   * @param {(id: string, cache?: IAudioData) => boolean} callback
   * @return {string[]}
   */
  filterIds: function (ids, callback) {
    let cache = audioController.cache
    return ids.filter(function (id) {
      return callback(id, cache[id] || {})
    })
  },
  /**
   * @param {string} full_id 
   * @return {string}
   */
  getHashId: function (full_id) {
    let audio_row = document.querySelector('.audio_row[data-full-id="' + full_id + '"]')
    let data_audio_json = audio_row.getAttribute('data-audio')
    let data_audio = JSON.parse(data_audio_json)
    let match = data_audio[13].match(/[0-9a-zA-Z]+/g);
    let hash = (match.length <= 3 ? match.slice(match.length - 2) : match.slice(-3, -1)).join('_')
    let hash_id = [full_id, hash].join('_')
    audioController.updateCache(full_id, { hash_id: hash_id })
    return hash_id;
  },
  register: function () {
    // data
    eventEmitter.on('audio_data_request', function (full_id) {
      audioController.updateCache(full_id, { fetching: true })
    })
    eventEmitter.on('audio_data_success', function (full_id, data) {
      audioController.updateCache(full_id, data, { fetching: false })
      audioController.updateLastAudio(full_id)
    })
    eventEmitter.on('audio_data_failure', function (full_id, error) {
      audioController.updateCache(full_id, { fetching: false, error: error && (error.message || error.problem) })
    })
    // size
    eventEmitter.on('audio_size_request', function (full_id) {
      audioController.updateCache(full_id, { size_fetching: true, size_error: '' })
    })
    eventEmitter.on('audio_size_success', function (full_id, size) {
      audioController.updateCache(full_id, { size: size, size_fetching: false, size_error: '' })
    })
    eventEmitter.on('audio_size_failure', function (full_id, error) {
      audioController.updateCache(full_id, { size_fetching: false, size_error: error && (error.message || error.problem) })
    })
    // download
    eventEmitter.on('audio_download_request', function (full_id) {
      audioController.updateCache(full_id, { downloading: true, download_error: '' })
    })
    eventEmitter.on('audio_download_success', function (full_id) {
      audioController.updateCache(full_id, { downloading: false, download_error: '' })
    })
    eventEmitter.on('audio_download_failure', function (full_id, error) {
      audioController.updateCache(full_id, { downloading: false, download_error: error })
    })
  },
  download: function (full_id, onprogress) {
    let onProgressEvent = function (loaded, total) {
      eventEmitter.emit('audio_download_progress', full_id, (loaded || 0) / (total || 0))
      onprogress && onprogress(loaded, total)
    }
    return audioController.fetchData([full_id]).then(function () {
      /** @type {IAudioData} */
      let data = audioController.cache[full_id]
      eventEmitter.emit('audio_download_request', full_id)
      let name = audioController.getName(data)
      if (data.ext === 'm3u' || data.ext === 'm3u8') {
        return audioController.downloadHls(Object.assign({}, data, { name: name }), onProgressEvent)
      }
      let details = audioController.getDownloadDetails(Object.assign({}, data, { name: name }), onProgressEvent)
      let options = audioController.getDownloadOptions()
      return downloadManager.download(details, options)
    }).then(function () {
      eventEmitter.emit('audio_download_success', full_id)
    }).catch(function (e) {
      eventEmitter.emit('audio_download_failure', full_id, e.message || e.problem)
    })
  },
  getName: function (data) {
    //let options = audioController.settingsModel.options.reduce(function (acc, option) {
    //  if (option.name && option.name.length === 1) {
    //    acc[option.name] = option.getValue()
    //  }
    //  return acc
    //}, {})
    let name = normalizeFilename(data.name, defaultOptions)
    return name
  },
  fetchSize: function (full_id) {
    let data = audioController.cache[full_id]
    if (data && data.size) {
      return Promise.resolve(data.size)
    }
    eventEmitter.emit('audio_size_request', full_id)
    return audioController.fetchData([full_id]).then(function () {

      let data = audioController.cache[full_id]
      if (data.mp3Size) {
        return Promise.resolve(data.mp3Size)
      }
      //if (data.ext !== 'm3u' && data.ext !== 'm3u8') {
      //  return audioController.fetchSizeMP3(data.src, full_id)
      //}
      return audioController.fetchSizeM3U(data.src, full_id)
    }).then(function (size) {
      eventEmitter.emit('audio_size_success', full_id, size)
      return size
    }).catch(function (e) {
      eventEmitter.emit('audio_size_failure', full_id, e.message || e.problem)
      return -1
    })
  },
  fetchData: function (full_ids) {
    full_ids = audioController.filterIds(full_ids, function (full_id, cache) {
      let hash_id = audioController.getCache(full_id).hash_id || audioController.getHashId(full_id)
      return (!cache.src || audioController.isExpiredCache(full_id)) && hash_id
    })
    if (!full_ids.length) {
      return Promise.resolve([])
    }
    let hash_ids = full_ids.map(function (full_id) {
      eventEmitter.emit('audio_data_request', full_id)
      return audioController.getCache(full_id).hash_id
    })
    return audioController.requestData(full_ids, hash_ids).then(function (data) {
      data.forEach(function (item) {
        eventEmitter.emit('audio_data_success', item.full_id, item)
      })
      return data
    }).catch(function (e) {
      full_ids.forEach(function (full_id) {
        eventEmitter.emit('audio_data_failure', full_id, e.message || e.problem)
      })
      return []
    })
  },
  requestData: function (full_ids, hash_ids) {
    return makeRequest({
      method: 'POST',
      url: 'https://vk.com/al_audio.php',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
      },
      data: toUrlEncoded({
        al: 1,
        act: 'reload_audio',
        ids: hash_ids.join(','),
      }),
    }).then(function (response) {
      if (!response.ok) {
        throw response
      }
      let data = audioController.parseData(response)
      let promises = data.map(function (item, index) {
        item.full_id = full_ids[index]
        return new Promise(resolve => resolve(Object.assign(item, { noMP3: true })))
        // return audioController.tryFetchMp3(item) // unable to fix to unknow reasons
      })
      return Promise.all(promises)
    })
  },
  fetchDataAll: function (begin, end) {
    begin = begin || 0
    end = end || undefined
    let audios = Array.from(document.querySelectorAll('.audio_row')).slice(begin, end)
    let full_ids_all = audios.map(function (element) {
      return element.getAttribute('data-full-id')
    })
    let ids = []
    for (let i = 0; i < full_ids_all.length; i += 10) {
      ids.push(full_ids_all.slice(i, i + 10))
    }
    return ids.reduce(function (promise, full_ids) {
      return promise.then(function () {
        return audioController.fetchData(full_ids);
      }).then(function (data) {
        return data.map(audioController.tryFetchMP3)
      })
    }, Promise.resolve())

  },
  tryFetchMP3: function (data) {
    if (data.mp3Url || getExtension(data.src).indexOf('m3u') === -1 || data.noMP3) {
      return Promise.resolve(data)
    }
    let mp3Url = data.src.replace(/\/index\.m3u8?/, '.mp3').split('/')
      .filter(function (_, idx, arr) {
        return idx !== arr.length - 2;
      }).join('/');
    let hlsSize
    let promise = data.size && data.size !== -1 ? Promise.resolve(data.size) : audioController.fetchSizeM3U(data.src)
    return promise.then(function (size) {
      hlsSize = size
      return Promise.race([
        audioController.fetchSizeMP3(mp3Url),
        delay(10 * 1000).then(function () { return -1 }),
      ])
    }).then(function (mp3Size) {
      let ratio = hlsSize / mp3Size
      let result = deepCopy(data)
      if (ratio >= 0.9 && ratio <= 1.1 || hlsSize == -1 || !hlsSize) {
        result = Object.assign(result, { mp3Size: mp3Size, mp3Url: mp3Url, size: mp3Size, noMP3: false })
      } else {
        result = Object.assign(result, { noMP3: true })
      }
      return Promise.resolve(result)
    })
  },
  getDownloadDetails: function (data, onProgress) {
    return {
      id: data.full_id,
      filename: data.name + '.mp3',
      name: data.name,
      url: data.src,
      size: data.size,
      ext: data.ext,
      metadata: data.metadata,
      onProgress: onProgress,
    }
  },
  getDownloadOptions: function () {
    let options = {
      blobMaxSize: true/*audioController.settingsModel.getValue('blob-max-size')*/,
      withMetadata: true /*audioController.settingsModel.getValue('audio-with-metadata')*/,
      ffmpegEnabled: true /*audioController.settingsModel.getValue('ffmpeg-enable')*/,
    }
    return options
  },
  downloadHls: function (_data, onProgress) {
    return audioController.tryFetchMP3(_data).then(function (data) {
      if (!data.mp3Url) {
        return hlsController.download({ url: data.src, name: data.name, media: 'audio', metadata: data.metadata }, onProgress)
      }
      let options = audioController.getDownloadOptions()
      return downloadManager.download({
        id: data.full_id,
        url: data.mp3Url,
        onProgress: onProgress,
        filename: data.name + '.mp3',
        name: data.name,
        size: data.mp3Size,
        metadata: data.metadata,
        ext: 'mp3',
      }, options)
    })
  },
  _downloadHls_: function (data, onProgress) {
    let mp3Url = data.src.replace(/\/index\.m3u8?/, '.mp3').split('/')
      .filter(function (_, idx, arr) {
        return idx !== arr.length - 2;
      }).join('/');
    let promise = data.size && data.size !== -1 ? Promise.resolve(data.size) : audioController.fetchSizeM3U(data.src)
    let hlsSize
    return promise.then(function (size) {
      hlsSize = size
      return audioController.fetchSizeMP3(mp3Url)
    }).then(function (mp3Size) {
      let ratio = hlsSize / mp3Size
      if (ratio < 0.9 || ratio > 1.1) {
        return hlsController.download({ url: data.src, name: data.name, media: 'audio' }, onProgress)
      }
      eventEmitter.emit('audio_size_success', data.full_id, mp3Size)
      eventEmitter.emit('audio_data_success', data.full_id, { mp3Url: mp3Url })
      let options = audioController.getDownloadOptions()
      return downloadManager.download({
        id: data.full_id,
        url: mp3Url,
        onProgress: onProgress,
        filename: data.name + '.mp3',
        name: data.name,
        size: mp3Size,
        ext: 'mp3',
      }, options)
    })
  },
  fetchSizeMP3: function (url, full_id) {
    return makeRequest({
      method: 'HEAD',
      url: url,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': location.href,
      },
    }, true).then(function (response) {
      return response.ok ? response : iframeChannel.request({
        event: 'audio_size',
        url: url,
        id: full_id || random(),
      })
    }).then(function (response) {
      let size = audioController.parseSize(response)
      return size
    })
  },
  fetchSizeM3U: function (url, full_id) {
    return hlsController.fetchSize(url).then(function (data) {
      if (data.duration && full_id) {
        audioController.updateCache(full_id, { duration: data.duration })
      }
      return data.size
    })
  },
  parseSize: function (response) {
    if (response.ok) {
      let contentLength = response.headers['content-length']
      return contentLength ? parseInt(contentLength, 10) : -1
    }
    return -1
  },
  parseData: function (response) {
    let headers = response.headers
    if (headers['content-type'] && headers['content-type'].indexOf('application/json') !== -1) {
      response = audioController.parseJSON(response)
    } else {
      response = audioController.parseXML(response)
    }
    if (!response.ok) {
      throw response
    }
    if (Array.isArray(response.data) && typeof response.data[1] === 'object') {
      audioController.vk_id = Object.keys(response.data[1])[0] || audioController.vk_id
    }
    return response.data[0].map(function (item) {
      return audioController.parseAudioData(item)
    })
  },
  parseJSON: function (response) {
    let rawData = response.rawData
    // json
    let payload
    let res = JSON.parse(rawData, function (key, val) {
      if (key === 'payload') {
        payload = val
      }
      return val
    })
    payload = Array.isArray(payload) ? payload : res.payload
    if (Array.isArray(payload)) {
      return Object.assign({}, response, { data: payload[1] })
    } else {
      return Object.assign({}, response, { ok: false, problem: 'Response is not iterable' })
    }
  },
  parseXML: function (response) {
    let rawData = response.rawData
    // xml
    let results = [];
    let idx = rawData.indexOf('<!json>');
    let idx2 = idx === -1 ? -1 : rawData.indexOf('<!>', idx + 7)
    while (idx !== -1 && idx2 !== -1) {
      results.push(JSON.parse(rawData.slice(idx + 7, idx2)));
      idx = rawData.indexOf('<!json>', idx2);
      idx2 = idx === -1 ? -1 : rawData.indexOf('<!>', idx + 7)
    }
    return Object.assign({}, response, { data: results })
  },
  parseMetaData: function (data) {
    let covers = data[14].split(',')
    let cover_s = covers[0]
    let cover_p = covers[1]
    let artists = Array.isArray(data[17]) ? data[17].map(function (d) {
      return d.name
    }) : []
    let title = data[3]
    let subTitle = data[16]
    let performer = data[4]
    let album = data[19]
    return {
      cover_p: cover_p,
      cover_s: cover_s,
      artists: artists,
      title: title,
      subTitle: subTitle,
      performer: performer,
    }
  },
  parseAudioData: function (data, full_id) {
    let keys = ['aid', 'oid', 'url', 'name', 'artist', 'duration'];
    let result = {};
    for (let k = 0, key; k < keys.length; ++k) {
      key = keys[k];
      result[key] = getTextAreaValue(k === 3 && data[16] ? (data[k] + ' (' + data[16] + ')') : data[k])
    }
    let win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window
    audioController.vk_id = audioController.vk_id || (win.vk && win.vk.id) || (data[15] && data[15].vk_id) || parseInt(result.oid, 10)
    result = Object.assign({}, result, {
      duration: +result.duration,
      src: audioController.unmask(result.url),
      vk_id: audioController.vk_id,
      media_id: result.oid + '_' + result.aid,
      full_id: full_id,
      name: result.artist + ' - ' + result.name,
      metadata: audioController.parseMetaData(data),
    })
    if (!audioController.vk_id) {

    }
    if (result.src.indexOf('audio_api_unavailable.mp3') !== -1) {
      delete result.src
    }
    result.ext = getExtension(result.src);
    result.filename = `${result.name}${result.ext ? ('.' + result.ext) : ''}`
    return result
  },
  unmask: (function () {
    function i() {
      return window.wbopen && ~(window.open + "").indexOf("wbopen")
    }
    function o(t) {
      if (!i() && ~t.indexOf("audio_api_unavailable")) {
        var e = t.split("?extra=")[1].split("#"),
          o = "" === e[1] ? "" : a(e[1]);
        if (e = a(e[0]), "string" != typeof o || !e) return t;
        o = o ? o.split(String.fromCharCode(9)) : [];
        for (var s, r, n = o.length; n--;) {
          if (r = o[n].split(String.fromCharCode(11)), s = r.splice(0, 1, e)[0], !l[s]) return t;
          e = l[s].apply(null, r)
        }
        if (e && "http" === e.substr(0, 4)) return e
      }
      return t
    }
    function a(t) {
      if (!t || t.length % 4 == 1) return !1;
      for (var e, i, o = 0, a = 0, s = ""; i = t.charAt(a++);) i = r.indexOf(i), ~i && (e = o % 4 ? 64 * e + i : i, o++ % 4) && (s += String.fromCharCode(
        255 & e >> (-2 * o & 6)));
      return s
    }
    function s(t, e) {
      var i = t.length,
        o = [];
      if (i) {
        var a = i;
        for (e = Math.abs(e); a--;) e = (i * (a + 1) ^ e + a) % i, o[a] = e
      }
      return o
    }
    var r = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN0PQRSTUVWXYZO123456789+/="
    var l = {
      v: function (t) {
        return t.split("").reverse().join("")
      },
      r: function (t, e) {
        t = t.split("");
        for (var i, o = r + r, a = t.length; a--;) i = o.indexOf(t[a]), ~i && (t[a] = o.substr(i - e, 1));
        return t.join("")
      },
      s: function (t, e) {
        var i = t.length;
        if (i) {
          var o = s(t, e),
            a = 0;
          for (t = t.split(""); ++a < i;) t[a] = t.splice(o[i - 1 - a], 1, t[a])[0];
          t = t.join("")
        }
        return t
      },
      i: function (t, e) {
        return l.s(t, e ^ audioController.vk_id)
      },
      x: function (t, e) {
        var i = [];
        return e = e.charCodeAt(0), each(t.split(""), function (t, o) {
          i.push(String.fromCharCode(o.charCodeAt(0) ^ e))
        }), i.join("")
      }
    }
    return o
  })(),
  createTip: function (node) {
    let target = node.querySelector('.audio_row__download')
    let full_id = node.getAttribute('data-full-id')
    let props = audioController.getCache(full_id)
    audioController.tooltip.createTip(target, full_id, props)
  },
}

unsafeWindow.audioController = audioController


VKReact.plugins['audio'] = {
  run: function (node) {
    if (node.nodeType !== 1) {
      return
    }
    if (this.hasClass(node, ['audio_row__actions', '_audio_row__actions'])) {
      this.activateAudioRow(node)
    }
  },
  activateAudioRow: function (node) {
    if (node.getAttribute('vkreact-marked') == 'true') {
      return
    }
    let classList = 'audio_row__action _audio_row__action audio_row__vkreact_download';
    let title = "Скачать"
    let element = se(`<button class="` + classList + '" ' + (title ? ('title="' + title + '"') : '') + '></button>')
    let lyrics = se(`<button class="audio_row__action _audio_row__action audio_row__vkreact_lyrics" title="Текст трека"></button>`)
    element.setAttribute('data-media', 'audio')
    element.addEventListener('click', this.onAudioDownload)
    element.addEventListener('mouseenter', this.onAudioEnter)
    lyrics.addEventListener('mouseenter', this.onAudioEnter)
    lyrics.addEventListener('click', this.onAudioLyrics)
    node.appendChild(element)
    node.appendChild(lyrics)
    node.setAttribute("vkreact-marked", 'true')
  },
  onAudioDownload: function (e) {
    e.preventDefault()
    e.stopPropagation()
    let full_id = e.target.getAttribute('data-full-id')
    audioController.download(full_id)
  },
  onAudioLyrics: async function(e) {
    e.preventDefault()
    e.stopPropagation()
    let full_id = e.target.getAttribute('data-full-id')
    await audioController.fetchData([full_id])
    let data = audioController.cache[full_id]
    let artist = data.artist
    let song_name = data.name.substr(artist.length + 3)
    VKReact.trackLyrics(artist, song_name)
  },
  onAudioEnter: function (e) {
    let audioRow = e.target.parentElement.parentElement.parentElement.parentElement.parentElement
    let full_id = audioRow.getAttribute("data-full-id")
    e.target.setAttribute("data-full-id", full_id)
    let data = audioController.getCache(full_id)
    audioController.setLastAudio(full_id)
    if (!data.fetching) {
      return audioController.fetchData([full_id]).then(function () {
        return audioController.fetchSize(full_id)
      })
    }
  },
  hasClass: function (element, classes) {
    let retval = 0
    for (let c of classes) {
      retval += Boolean(element && element.classList.contains(c))
    }
    return Boolean(retval)
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