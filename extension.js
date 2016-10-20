// UI stuff
const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Gir = imports.gi.GIRepository;
const Lang = imports.lang;
// shutdown functionality
const GnomeSession = imports.misc.gnomeSession;
//settings
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;
const Util = imports.misc.util;
const GLib = imports.gi.GLib;

const ShutdownTimerButton = new Lang.Class({
  Name: 'ShutdownTimerButton',
  Extends: PanelMenu.Button,
  time: null,

   _init: function ()
   {
     this.parent(0.0, "Transfer Wise Indicator");

     this.button = new St.BoxLayout({ style_class: 'panel-button' });
     this.icon = new St.Icon({ icon_name: 'org.gnome.clocks-symbolic',
                             style_class: 'system-status-icon' });
     this.time = new St.Label({ text: "00:00:00",
                              style_class: 'timeLabel' });

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
      this.pauseTimer = new PopupMenu.PopupMenuItem('Pause/Resume Timer');
      this.popupMenu.addMenuItem(this.pauseTimer, 1);

      newTimer.connect('activate', Lang.bind(this, this._openSettings));
    },

    _openSettings: function () {
      global.log('how about no')
      Util.spawn([
          "gnome-shell-extension-prefs",
          Extension.metadata.uuid
      ]);
    },

});

let shutdownTimerButton;
let settings;

function onUpdate(){
  let h = settings.get_int('hours-value').toString()
  let m = settings.get_int('minutes-value').toString()
  let s = settings.get_int('seconds-value').toString()
  shutdownTimerButton.time.text =  GLib.test_timer_elapsed().toString() ;
}

function init()
{
  settings = Convenience.getSettings();
}

function enable()
{
  shutdownTimerButton = new ShutdownTimerButton();
  Main.panel.addToStatusArea('shutdown-timer-button', shutdownTimerButton);
  GLib.test_timer_start()
  settings.connect('changed::seconds-value', onUpdate);
	settings.connect('changed::hours-value', onUpdate);
	settings.connect('changed::minutes-value', onUpdate);
}

function disable()
{
  shutdownTimerButton.destroy()
}
