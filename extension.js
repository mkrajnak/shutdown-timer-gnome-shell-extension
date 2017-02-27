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
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
// shutdown, reboot, suspend functionality
const GnomeSession = imports.misc.gnomeSession;
const GnomeDesktop = imports.gi.GnomeDesktop;
const LoginManager = imports.misc.loginManager;
//settings
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;
const Util = imports.misc.util;
const GLib = imports.gi.GLib;
// init translation
const Gettext = imports.gettext;
const _ = Gettext.domain("shutdown-timer-gnome-shell-extension").gettext;
// notification
const MessageTray = imports.ui.main.messageTray;
// option constants
const SHUTDOWN = 0;
const REBOOT = 1;
const SUSPEND = 2;
const SHUTDOWNAFTERTIME = 0;
const SHUTDOWNONTIME = 1;
const LEFT = 0;
const MIDDLE = 1;
const RIGHT = 2;

// remeber connect methods ids
let hChangeEventId, mChangeEventId, sChangeEventId, aChangeEventId;
let notificationsEventId, hideTimeEventId, startChangeEventId, sleepWithWakeEventId;
let positionEventId, tChangeEventId, shutdownTimerButton, settings, time, h, m, s;
let notificationsEnable, hideTime;
let isRunning = false;
let notified = false;
let position;

const ShutdownTimerButton = new Lang.Class({
  Name: "ShutdownTimerButton",
  Extends: PanelMenu.Button,

   _init: function ()
   {
     this.parent(0.0, _("Shutdown Timer"));
     this._shortcutsBindingIds = [];

     this.button = new St.BoxLayout();
     this.time = new St.Label({ style_class: "timeLabel" });

     // Icons
     let icon_shutdown = Gio.icon_new_for_string(Extension.path + "/icons/system-shutdown.png");
     let icon_suspend = Gio.icon_new_for_string(Extension.path + "/icons/media-playback-pause.png");
     let icon_restart = Gio.icon_new_for_string(Extension.path + "/icons/view-refresh.png");
     // Icons objs
     this.icon_shutdown_obj = new St.Icon({ gicon: icon_shutdown, style_class: "system-status-icon"});
     this.icon_suspend_obj = new St.Icon({ gicon: icon_suspend, style_class: "system-status-icon"});
     this.icon_restart_obj = new St.Icon({ gicon: icon_restart, style_class: "system-status-icon"});

     this.button.add_child(this.icon_shutdown_obj);
     this.button.add_child(this.icon_suspend_obj);
     this.button.add_child(this.icon_restart_obj);
     this.button.add_child(this.time);
     this.actor.add_actor(this.button);

     this._buildMenu();
  },

  _buildMenu: function () {

      // Create menu section for items
      this.popupMenu = new PopupMenu.PopupMenuSection();
      this.menu.addMenuItem(this.popupMenu);

      // First Item
      let newTimer = new PopupMenu.PopupMenuItem( _("New Timer"));
      this.popupMenu.addMenuItem(newTimer, 0);
      // Second Item
      let pauseTimer = new PopupMenu.PopupMenuItem(_("Pause/Resume Timer"));
      this.popupMenu.addMenuItem(pauseTimer, 1);
      // Third item
      let restartTimer = new PopupMenu.PopupMenuItem(_("Restart Timer"));
      this.popupMenu.addMenuItem(restartTimer, 2);
      // keep reference to binded callback
      this.pauseId = pauseTimer.connect("activate", Lang.bind(this, this._pause));
      this.openSettingsId = newTimer.connect("activate", Lang.bind(this, this._openSettings));
      this.restartTimerId = restartTimer.connect("activate", Lang.bind(this, restart));
    },

    _openSettings: function (){
      isRunning = false;
      onTimeUpdate();
      Util.spawn([
          "gnome-shell-extension-prefs",
          Extension.metadata.uuid
      ]);
    },

    _pause: function () {
      if (isRunning) {
        isRunning = false;
      }
      else {
        start();
      }
      renderTime();
    },

    _destroy: function(){
      this._unbindShortcuts()
      this.newTimer.disconnect(this.openSettingsId);
      this.pauseTimer.disconnect(this.pauseId);
      this.restartTimer.disconnect(this.restartTimerId);

      this.parent();
    },

    // Shortcut code borrowed from clipboard-indicator extension
    _bindShortcuts: function () {
      this._unbindShortcuts();                          // clear and get ready to bind callback
      this._bindShortcut("shortcut-start", this._pause);      //Timer start
      this._bindShortcut("shortcut-option", this._openSettings); // settings
      this._bindShortcut("shortcut-restart", restart);            // restart timer
    },

    _unbindShortcuts: function () {
        this._shortcutsBindingIds.forEach(
            (id) => Main.wm.removeKeybinding(id)
        );
        this._shortcutsBindingIds = [];
    },

    _bindShortcut: function(name, cb) {
        var ModeType = Shell.hasOwnProperty("ActionMode") ?
            Shell.ActionMode : Shell.KeyBindingMode;

        Main.wm.addKeybinding(
            name,
            settings,
            Meta.KeyBindingFlags.NONE,
            ModeType.ALL,
            Lang.bind(this, cb)
        );
        this._shortcutsBindingIds.push(name);
  }
});

/**
* get values from settings and render them immediately
*/
function onTimeUpdate(){
  let set = settings.get_int("timer");
  h = settings.get_int("hours-value");
  m = settings.get_int("minutes-value");
  s = settings.get_int("seconds-value");

  if (set === SHUTDOWNONTIME) {
    calculateTime();
  }
  time = (h*3600 + m*60 + s);
  renderTime();
}

/**
* set correct icon
*/
function changeIcon(){
  let action = settings.get_int("action");
  switch (action) {
    case SHUTDOWN:
      shutdownTimerButton.icon_restart_obj.hide()
      shutdownTimerButton.icon_suspend_obj.hide()
      shutdownTimerButton.icon_shutdown_obj.show()
      break;
    case REBOOT:
      shutdownTimerButton.icon_suspend_obj.hide()
      shutdownTimerButton.icon_shutdown_obj.hide()
      shutdownTimerButton.icon_restart_obj.show()
      break;
    case SUSPEND:
      shutdownTimerButton.icon_restart_obj.hide()
      shutdownTimerButton.icon_shutdown_obj.hide()
      shutdownTimerButton.icon_suspend_obj.show()
      break;
    default: break; // nothing
  }
}

/**
* start timer
*/
function start(){
  if (isRunning) {  // special case when option window is opened but timer
    return;         // is already running via keyboard shorcut
  }
  let action = settings.get_int("action");
  global.log("ShutdownTimer: "+ action.toString() +" in " + time.toString());

  let set = settings.get_int("timer");
  if (set === SHUTDOWNONTIME) {      // recalculate On Time timer after pause
    onTimeUpdate();
  }
  isRunning = true;
  notified = false;
  GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT , 1,  timer);
}

/**
* Restart timer from last know configuration
*/
function restart(){
  onTimeUpdate();
  start();
}

/**
* working only with afterTime option
* push time to applet
*/
function renderTime(){
  if (hideTime && !isRunning) {
    shutdownTimerButton.time.text = '';
  } else {
    let H,M,S;
    H = h.toString();
    M = m.toString();
    S = s.toString();
    H = H.length === 1 ? "0" + H : H;
    M = M.length === 1 ? "0" + M : M;
    S = S.length === 1 ? "0" + S : S;
    shutdownTimerButton.time.text = H + ":" + M + ":" + S;
  }
}

/**
* decrease seconds and properly set other values
*/
function timer(){
  if (!isRunning) {
    return false;
  }
  if (time < 60 && !notified) {
    send_notification();
  }
  if (time === 0) {
    isRunning = false;
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
  renderTime();
  return true;
}

/*
* pick action from settings and call function
*/
function doAction(){
  onTimeUpdate();
  let action = settings.get_int("action");
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
    default: break; // nothing
  }
}

/**
* Calculate the time difference only hours and minutes
*/
function calculateTime(){
  let now = new Date();                // get current now
  now.setHours(h);                     // set the values
  now.setMinutes(m);
  now.setSeconds(0);                   // seconds are not important for us here

  let d = new Date();
  let currentTime = d.getTime()/1000;   // ger rid of milliseconds
  let setTime = now.getTime()/1000;
  // compare with entered value and calculate the result

  if (setTime < currentTime) {
    now.setDate(now.getDate() + 1)
    setTime = now.getTime()/1000;
  }
  setTime = setTime - currentTime;
  // adjust values
  h = Math.floor(setTime/3600);
  m = Math.round(setTime/60%60);
  s = 0;
}

/**
* Send notification to shell
*/
function send_notification() {
  if (!notificationsEnable) {
    return;
  }
  notified = true;
  let action = settings.get_int("action");
  switch (action) {
    case SHUTDOWN:
      Main.notify (_("Shutdown in less than one minute"));
      break;
    case REBOOT:
      Main.notify(_("Reboot in less than one minute"));
      break;
    case SUSPEND:
      Main.notify(_("Suspend in less than one minute"));
      break;
    default: break;
  }
}

/**
* uses gnome session manager to shutdown the session with one minute prompt
*/
function shutdown(){
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
* Change applet position in upper panel
*/
function changePosition(){
  let position = settings.get_int("position");
  switch (position) {
    case LEFT:
      Main.panel._addToPanelBox('shutdown-timer-button', shutdownTimerButton, -1, Main.panel._leftBox);
      break;
    case MIDDLE:
      Main.panel._addToPanelBox('shutdown-timer-button', shutdownTimerButton, -1, Main.panel._centerBox);
      break;
    case RIGHT:
      Main.panel._addToPanelBox('shutdown-timer-button', shutdownTimerButton, 0, Main.panel._rightBox);
      break;
    default: break;
  }

}

function sleepWithWakeUp(){
  let pkexec = GLib.find_program_in_path('pkexec');
	let rtcwake = GLib.find_program_in_path('rtcwake');
  let wh = settings.get_int("wake-hours-value");
  let wm = settings.get_int("wake-minutes-value");
  let ws = settings.get_int("wake-seconds-value");

  let wakeUpTime = new Date();
  wakeUpTime.setHours(wh);
  wakeUpTime.setMinutes(wm);
  wakeUpTime.setSeconds(ws);

  let now = new Date();
  if (wakeUpTime < now.getTime()) {
    wakeUpTime.setDate(wakeUpTime.getDate() + 1)
  }
  let t = Math.floor(wakeUpTime.getTime()/1000)
  global.log("pkexec" + " rtcwake" + " -m mem -t " + t.toString());

  Util.spawnCommandLine(pkexec + " " + rtcwake + " -m mem -t " + t.toString());
}

function toggleNotifications(){
  notificationsEnable = settings.get_boolean("notifications");
}

function toggleHideTime(){
  hideTime = settings.get_boolean("hide-time");
  renderTime();
}

function sleepAndWakeUp(){
  sleepWithWake = settings.get_boolean("wake-up");
}

/**
* connect variables to settings, render changes correctly
*/
function prepareSettings(){
  hChangeEventId = settings.connect("changed::seconds-value", onTimeUpdate);
	mChangeEventId = settings.connect("changed::hours-value", onTimeUpdate);
	sChangeEventId = settings.connect("changed::minutes-value", onTimeUpdate);

  //listen to user changes action after time expires
  aChangeEventId = settings.connect("changed::action", changeIcon);
  // listen to change of timer type
  tChangeEventId = settings.connect("changed::timer", onTimeUpdate);
  startChangeEventId = settings.connect("changed::timer-start", start);
  //extension position
  positionEventId = settings.connect("changed::position", changePosition);
  notificationsEventId = settings.connect("changed::notifications", toggleNotifications);
  hideTimeEventId = settings.connect("changed::hide-time", toggleHideTime);
  sleepWithWakeEventId = settings.connect("changed::wake-up", sleepWithWakeUp)
  shutdownTimerButton._bindShortcuts();
  changeIcon();
  onTimeUpdate();
  toggleNotifications();
  toggleHideTime();
}

function init(){
  settings = Convenience.getSettings();
  let localeDir = Extension.dir.get_child("locale");
  Gettext.bindtextdomain("shutdown-timer-gnome-shell-extension", localeDir.get_path());
}

/**
* Initialization of applet, call settings init
*/
function enable(){
  shutdownTimerButton = new ShutdownTimerButton();
  changePosition();
  prepareSettings();
}

/**
* destroy the applet
*/
function disable(){
  isRunning = false;
  settings.disconnect(hChangeEventId);
  settings.disconnect(mChangeEventId);
  settings.disconnect(sChangeEventId);
  settings.disconnect(aChangeEventId);
  settings.disconnect(tChangeEventId);
  settings.disconnect(startChangeEventId);
  settings.disconnect(positionEventId);
  settings.disconnect(notificationsEventId);
  settings.disconnect(hideTImeEventId);
  settings.disconnect(sleepWithWakeEventId);
  shutdownTimerButton.destroy()
}
