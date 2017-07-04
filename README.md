## How does it work?

We're listening on pm2 bus **automatic** events (manual exits won't be mailed). When an exit event happend we're keeping the pm2 process environnement in a queue. Those elements are then emailed through SMTP by using the famous [nodemailer](https://github.com/nodemailer/nodemailer).

Templates can be customized, if you want to use another mailing protocol feel free to dig into the code! This is meant to be used out of the box with minimal configuration but it can't fit everyone needs.

If you need better email interactions have a look at [Keymetrics](https://keymetrics.io/)!

## Configuration

```
mail:
    from: "me@example.com"
    to: "you@example.com"
# see https://github.com/andris9/nodemailer-smtp-transport#usage
smtp:
    host: "smtp.gmail.com"
    port: 25
# Events list:
# - restart
# - delete
# - stop
# - restart overlimit
# - exit
# - start
# - online
events:
    - exit
template: './template.md'
# this is the process subject if there is only one event to be mailed
subject: '<%= process.name %> errored (<%= process.NODE_ENV %>)'
# if multiple events are going to be mailed, use a global subject:
multiple_subject: 'Error on <%= hostname %>'
#wait for 5 seconds after each event before sending an email - avoid spam when a lot of events happened
polling: 2500 
#attach your process logs to the email
attach_logs: true 
```

## Templating

This is how a standard pm2 object looks like:

```
{ event: 'exit',
  manually: false,
  process:
   { name: 'throw',
     vizion: true,
     autorestart: true,
     exec_mode: 'fork_mode',
     exec_interpreter: 'node',
     pm_exec_path: '/usr/share/nginx/www/pm2-notify/throw.js',
     pm_cwd: '/usr/share/nginx/www/pm2-notify',
     instances: 1,
     node_args: [],
     pm_out_log_path: '/home/abluchet/.pm2/logs/throw-out-0.log',
     pm_err_log_path: '/home/abluchet/.pm2/logs/throw-error-0.log',
     pm_pid_path: '/home/abluchet/.pm2/pids/throw-0.pid',
     NODE_APP_INSTANCE: 0,
     NODE_ENV: 'production',

     ... //your env variables here

     status: 'stopped',
     pm_uptime: 1434096604224,
     axm_actions: [],
     axm_monitor: {},
     axm_options: {},
     axm_dynamic: {},
     vizion_running: false,
     created_at: 1434096545628,
     pm_id: 0,
     restart_time: 19,
     unstable_restarts: 0,
     started_inside: false,
     command:
      { locked: false,
        metadata: {},
        started_at: null,
        finished_at: null,
        error: null },
     versioning: null,
     exit_code: 1 },
  at: 1434096607294 }
```

You can use all those variables in the template. We're adding the `hostname` and we format `at` in a `date` variable by using `date = new Date(at).toString()`.
Templating is done through lodash and the email should be markdown-formatted.

## Testing

Mail testing is hard to automate. There is a sample throwing process in the `test` directory. To test manually just launch `pm2 start test/throw.js` with `node index.js`.
If you have an idea to unit test this feel free to open an issue.
