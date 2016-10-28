// UI stuff
const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Gir = imports.gi.GIRepository;
const Lang = imports.lang;
// shutdown functionality
const GnomeSession = imports.misc.gnomeSession;
const LoginManager = imports.misc.loginManager;
//settings
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;
const Util = imports.misc.util;
const GLib = imports.gi.GLib;
//OPT
const SHUTDOWN = 0;
const REBOOT = 1;
const SUSPEND = 2;
const SHUTDOWNAFTERTIME = 0;
const SHUTDOWNONTIME = 1;

let shutdownTimerButton, settings, time, h, m, s;
let isRunning = false;

const ShutdownTimerButton = new Lang.Class({
  Name: 'ShutdownTimerButton',
  Extends: PanelMenu.Button,

   _init: function ()
   {
     this.parent(0.0, "Automatic Shutdown Timer");

     let icon=Gio.icon_new_for_string(Extension.path + "/org.gnome.clocks-symbolic.svg");
     this.button = new St.BoxLayout({ style_class: 'panel-button'});
     this.icon = new St.Icon({ gicon: icon,
                             style_class: 'system-status-icon'});
     this.time = new St.Label({ style_class: 'timeLabel' });
     this.button.add_child(this.icon);
     this.button.add_child(this.time);

     this.actor.add_actor(this.button);

     this._buildMenu();
  },

  _buildMenu: function () {

      // Create menu section for items
      this.popupMenu = new PopupMenu.PopupMenuSection();

      this.scrollViewMenuSection = new PopupMenu.PopupMenuSection();
      let scrollView = new St.ScrollView();

      scrollView.add_actor(this.popupMenu.actor);
      this.scrollViewMenuSection.actor.add_actor(scrollView);
      this.menu.addMenuItem(this.scrollViewMenuSection);

      // Add separator
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      // First Item
      let newTimer = new PopupMenu.PopupMenuItem('New Timer');
      this.popupMenu.addMenuItem(newTimer, 0);
      // Second Item
      let pauseTimer = new PopupMenu.PopupMenuItem('Pause/Resume Timer');
      this.popupMenu.addMenuItem(pauseTimer, 1);

      pauseTimer.connect('activate', Lang.bind(this, this._pause));
      newTimer.connect('activate', Lang.bind(this, this._openSettings));
    },

    _openSettings: function () {
      isRunning = false;
      onTimeUpdate()
      Util.spawn([
          "gnome-shell-extension-prefs",
          Extension.metadata.uuid
      ]);
    },

    _pause: function () {
      if (isRunning) {
        isRunning = false;
      }
      else{
        isRunning = true;
        start();
      }
    }
});
//ShutdownTimerButton

/**
* get values from settings and render them immediately
*/
function onTimeUpdate(){
  let set = settings.get_int('timer')
  h = settings.get_int('hours-value');
  m = settings.get_int('minutes-value');
  s = settings.get_int('seconds-value');

  if (set === SHUTDOWNAFTERTIME) {
    time = (h*3600 + m*60 + s);
  }
  // else {
  //
  //
  // }
  renderTime()
}

/**
* start timer
*/
function start(){
  global.log('AST: shutdown in s' + time.toString());
  isRunning = true
  GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT , 1,  timer);
}

/**
* push time to applet
*/
function renderTime(){
  let H,M,S;
  H = h.toString();
  M = m.toString();
  S = s.toString();
  H = H.length === 1 ? '0' + H : H;
  M = M.length === 1 ? '0' + M : M;
  S = S.length === 1 ? '0' + S : S;
  shutdownTimerButton.time.text = H + ":" + M + ":" + S;
}

/**
* decrease seconds and properly set other values
*/
function timer(){
  if (!isRunning) {
    return false;
  }
  if (time === 0) {
    doAction();
    return false;
  }
  if (s === 0) {
    if (m === 0) {
      h = h - 1;
      m = 59;
    }
    else {
      m = m - 1;
    }
    s = 60;
  }
  s = s - 1;
  time = time - 1;
  renderTime()
  return true;
}

/*
* pick action from settings and call function
*/
function doAction(){
  let action = settings.get_int('action');
  switch (action) {
    case SHUTDOWN:
      shutdown();
      break;
    case REBOOT:
      reboot();
      break;
    case SUSPEND:
      suspend();
      break;
    default:

  }
}

/**
* uses gnome session manager to shutdown the session with one minute prompt
*/
function shutdown(){
  Main.overview.hide();
	let session = new GnomeSession.SessionManager();
	session.ShutdownRemote();
}

/**
* reboot via session
*/
function reboot(){
  let session = new GnomeSession.SessionManager();
	session.RebootRemote();
}

/**
* suspend via login manager
*/
function suspend(){
  let login = new LoginManager.getLoginManager();
	login.suspend();
}

/**
* First function called
*/
function init()
{
  settings = Convenience.getSettings();
}

/**
* Enable function
* Initialization of applet, listen to settings
*/
function enable()
{
  shutdownTimerButton = new ShutdownTimerButton();
  Main.panel.addToStatusArea('shutdown-timer-button', shutdownTimerButton);

  settings.connect('changed::seconds-value', onTimeUpdate);
	settings.connect('changed::hours-value', onTimeUpdate);
	settings.connect('changed::minutes-value', onTimeUpdate);
  settings.connect('changed::timer-start', start);

  onTimeUpdate();
  renderTime();
}

/**
* destroy the applet
*/
function disable()
{
  shutdownTimerButton.destroy()
}
