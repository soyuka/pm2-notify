var pm2 = require('pm2')
var hostname = require('os').hostname()
var nodemailer = require('nodemailer')
var markdown = require('nodemailer-markdown').markdown
var config = require('yamljs').load(__dirname + '/config.yml')
var _ = require('lodash.template')
var template = require('fs').readFileSync(config.template)
var async = require('async')
var util = require('util')
var p = require('path')

var transporter = nodemailer.createTransport(require('nodemailer-smtp-transport')(config.smtp))

transporter.use('compile', markdown({useEmbeddedImages: true}))

var queue = []
var timeout = null

/**
 * Compile template
 * @param string template
 * @param object data
 */
function compile(template, data) {
    var s = _(template)
    return s(data)
}

/**
 * Send an email through smtp transport
 * @param object opts
 */
function sendMail(opts) {

  if(!opts.subject || !opts.text) {
    throw new ReferenceError("No text or subject to be mailed")
  }

  var opts = {
    from: opts.from || config.mail.from,
    to: opts.to ? opts.to : config.mail.to,
    subject: opts.subject,
    markdown: opts.text,
    attachments: opts.attachments || []
  }
    
  transporter.sendMail(opts, function(err, info) {
    if(err) {
      console.error(err) 
    } 

    console.log('Mail sent', info)
  })
}

/**
 * Process the events queue
 * if there is only one event, send an email with it
 * if there are more than one, join texts and attachments
 */
function processQueue() {
  var l = queue.length

  if(l == 0) {
    return; 
  }

  //just one?
  if(l === 1) {
    return sendMail(queue[0]) 
  }

  //Concat texts, get the multiple subject
  var text = ''
  var attachments = []

  var subject = compile(config.multiple_subject, queue[0])

  for(var i in queue) {
    text += queue[i].text
    
    if(config.attach_logs) {

      //don't attach twice the same file
      for(var j in queue[i].attachments) {
        var has = false

        for(var a in attachments) {
          if(attachments[a].path == queue[i].attachments[j].path) {
            has = true
            break; 
          } 
        }

        if(has === false) {
          attachments.push(queue[i].attachments[j])
        }
      }
    }

    sendMail({
      subject: subject,
      text: text,
      attachments: attachments
    }) 
  }

  //reset queue
  queue.length = 0
}

pm2.launchBus(function(err, bus) {

  if(err) {
    throw err 
  }

  bus.on('process:event', function(e) {

    if(e.manually === true) {
      return;
    }

    //it's an event we should watch 
    if(~config.events.indexOf(e.event)) {

      e.date = new Date(e.at).toString()

      e = util._extend(e, {
        hostname: hostname,
        text: compile(template, e),
        subject: compile(config.subject, e)
      })

      //should we add logs?
      if(config.attach_logs) {
        e.attachments = []
        ;['pm_out_log_path', 'pm_err_log_path']
        .forEach(function(log) {
          e.attachments.push({
            filename: p.basename(e.process[log]),
            path: e.process[log]
          })
        })
      }

      queue.push(e)

      if(timeout) {
        clearTimeout(timeout) 
      }

      setTimeout(processQueue, config.polling)
    }
  })

  bus.on('pm2:kill', function() {
    console.error('PM2 is beeing killed') 
  })
})
