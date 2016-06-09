var hypercore = require('hypercore')
var level = require('level-browserify')
var swarm = require('webrtc-swarm')
var signalhub = require('signalhub')
var pump = require('pump')

var key = window.location.hash.slice(1)

var all = false
var cnt = 0
var db = level('hyperirc.db')
var core = hypercore(db)

var feed = core.createFeed(key)
var $main = document.getElementById('main')

function log (msg) {
  var pre = document.createElement('pre')
  pre.innerText = msg
  $main.appendChild(pre)
}

feed.get(0, function (err, channel) {
  if (err) throw err

  document.getElementById('channel').innerText = channel.toString()

  var end = feed.blocks

  if (!all) {
    feed.once('download', function () {
      if (feed.blocks - end > 10) {
        stream.destroy()
        log('(skipping to latest messages)')
        tail()
      }
    })
  }

  var stream = tail()

  function tail () {
    var stream = feed.createReadStream({live: true, start: all ? 0 : Math.max(feed.blocks - 10, 1)})
      .on('data', function (data) {
        log(data.toString())
      })

    return stream
  }
})

var sw = swarm(signalhub('hyperirc-' + feed.discoveryKey.toString('hex'), 'https://signalhub.mafintosh.com'))

console.log('Waiting for peers...')

sw.on('peer', function (connection) {
  console.log('(webrtc peer joined, %d total', ++cnt)
  document.getElementById('count').innerText = '' + cnt
  var peer = feed.replicate()
  pump(peer, connection, peer, function () {
    console.log('(webrtc peer left, %d total', --cnt)
    document.getElementById('count').innerText = '' + cnt
  })
})
