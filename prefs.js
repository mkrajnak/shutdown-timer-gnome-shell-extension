const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
// Init translation
const Gettext = imports.gettext;
const _ = Gettext.domain("shutdown-timer-gnome-shell-extension").gettext;
// Utils
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;
const Pango = imports.gi.Pango;
// Create contants and variables for options
// Shutdown options
const SHUTDOWNAFTERAMOUNTOFTIME = 0;
const SHUTDOWNATTIME = 1;
// Actions trigerred when timer comes to an end
const SHUTDOWN = 0;
const REBOOT = 1;
const SUSPEND = 2;
// Position of the widget in the panel
const LEFT = 0;
const MIDDLE = 1;
const RIGHT = 2;
// Remaining constants and vars
const TIME_FONT_HEIGHT = "30";
let settings, widget;


// make sure that a number in spinbutton always constains 2 digits, including leading zero e.g.: 01, 02
function updateTimeToDoubleDigits(spinBtn) {
  time = spinBtn.get_value_as_int();
  if (time < 10) {
    spinBtn.set_text("0" + time.toString());
  }
}

// handles the conversion seconds -> minutes -> hours
// function checks for content after the value in spinBtn1 is increamented,
// if the conversion is required it makes the necessary changes
function handleTimeConversion(spinBtn1, spinBtn2, setting1, setting2) {
  let time = spinBtn1.get_value_as_int();
  if (time >= 60) {
    spinBtn1.set_value(0);
    spinBtn2.set_value(spinBtn2.get_value_as_int() + 1);
    settings.set_int(setting1, spinBtn1.get_value_as_int());
    settings.set_int(setting2, spinBtn2.get_value_as_int());
  } else if (time < 0) {
    spinBtn1.set_value(59);
    spinBtn2.set_value(spinBtn2.get_value_as_int() - 1);
    settings.set_int(setting1, spinBtn1.get_value_as_int());
    settings.set_int(setting2, spinBtn2.get_value_as_int());
  }
  updateTimeToDoubleDigits(spinBtn1);
  updateTimeToDoubleDigits(spinBtn2);
}

// set custom GtkSpinButton with corresponding event callbacks
function getGtkSpinButton(min_range, max_range, name){
  // initiate widget
  let spinButton = new Gtk.SpinButton({orientation: Gtk.Orientation.VERTICAL});
  spinButton.set_increments(1, 1);
  spinButton.modify_font(Pango.font_description_from_string(TIME_FONT_HEIGHT))
  spinButton.set_range(min_range, max_range);
  spinButton.set_value(settings.get_int(name));
  updateTimeToDoubleDigits(spinButton);
  // Add callback that will handle data changes
  spinButton.connect("value-changed", Lang.bind(this, function(){
    settings.set_int(name, spinButton.get_value_as_int());
  }));
  // Enforce double digit conversion after editing text in spin button
  spinButton.connect("output", Lang.bind(this, function() {
    updateTimeToDoubleDigits(spinButton);
  }));
  spinButton.connect("input", Lang.bind(this, function() {
    updateTimeToDoubleDigits(spinButton);
  }));
  return spinButton;
}

function init() {
  settings = Convenience.getSettings();
  let localeDir = Extension.dir.get_child("locale");
  Gettext.bindtextdomain("shutdown-timer-gnome-shell-extension", localeDir.get_path());
}

const AutomaticShutdownTimerPrefs = new GObject.Class({
  Name: "AutomaticShutdownTimer.Prefs",
  GTypeName: "AutomaticShutdownTimerPrefs",
  Extends: Gtk.Box,

  _init: function() {
    this.parent();
    // Orientation and spacing must be set
    this.orientation = Gtk.Orientation.VERTICAL,
		this.spacing = 1;
    // Create stack and switcher
		let stack = new Gtk.Stack({
      transition_type: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT,
      transition_duration: 500,
    });
    let stack_switcher = new Gtk.StackSwitcher({
      margin: 5,
      halign: Gtk.Align.CENTER,
      stack: stack
    });
    // Create two grids, each one of them for different page in "stack", 
    // Set Timer grid/tab
    this.setTimerTab = new Gtk.Grid()
    this.setTimerTab.margin = 15;
    this.setTimerTab.row_spacing = this.column_spacing = 10;
    // Settings grid/tab
    this.settingsTab = new Gtk.Grid()
    this.settingsTab.margin = 15;
    this.settingsTab.row_spacing = this.column_spacing = 10;

    // 1st row, configure time options
    this.setTimerTab.attach(new Gtk.HSeparator(), 0, 0, 8, 1);
    this.setTimerTab.attach(new Gtk.HSeparator({orientation: Gtk.Orientation.VERTICAL, margin: 30}), 1, 0, 1, 8);
    // Fetch the current action setting and set the labels properly
    let action_setting = settings.get_int("action");
    let action_string;
    if (action_setting === SHUTDOWN) {
      action_string = _("Shutdown:");
    }
    else if (action_setting === REBOOT) {
      action_string = _("Reboot:");
    }
    else if (action_setting === SUSPEND) {
      action_string = _("Suspend:");
    }
    // Add rhe radio button which decides how the timer should be handled
    let actionLabel = new Gtk.Label({
      label: action_string, 
      halign: Gtk.Align.END,
    });
    this.setTimerTab.attach(actionLabel, 0, 1, 1, 1);
    let afterTime = new Gtk.RadioButton({label: _("After time has elapsed")});
    afterTime.connect("toggled", Lang.bind(this, function() {
            settings.set_int("timer", SHUTDOWNAFTERAMOUNTOFTIME);
    }));
    this.setTimerTab.attach(afterTime, 3, 1, 3, 1);

    let onTime = new Gtk.RadioButton({
      group: afterTime,
      label: _("At given time (24h format)"),
      halign: Gtk.Align.START});
    onTime.connect("toggled", Lang.bind(this, function() {
      settings.set_int("timer", SHUTDOWNATTIME);
    }));
    this.setTimerTab.attach_next_to(onTime, afterTime, Gtk.PositionType.RIGHT, 3, 1);

    let timeSet = settings.get_int("timer")
    if (timeSet === SHUTDOWNATTIME) {
      onTime.active = true;
    } else {
      afterTime.active = true;
    }
    // 2nd row, time configuration
    this.setTimerTab.attach(new Gtk.HSeparator(), 0, 3, 8, 1);
    let timeLabel = new Gtk.Label({
      label: _("Set Time:"), 
      halign: Gtk.Align.END,
      valign: Gtk.Align.CENTER
    });
    this.setTimerTab.attach(timeLabel, 0, 5, 1, 1);
    // Remember labels, so then can be attached to one another
    let hour_label = new Gtk.Label({label: _(" Hours ")});
    let min_label = new Gtk.Label({label: _("Minutes")});
    let sec_label = new Gtk.Label({label: _("Seconds")});
    // Build row from time label H:M:S
    this.setTimerTab.attach(hour_label, 3, 4, 2, 1);
    this.setTimerTab.attach_next_to(min_label, hour_label, Gtk.PositionType.RIGHT, 2, 1);
    this.setTimerTab.attach_next_to(sec_label, min_label, Gtk.PositionType.RIGHT, 2, 1);
    // Configure spin button for Hours
    let hours = getGtkSpinButton(0, 24, 'hours-value')
    this.setTimerTab.attach(hours, 3, 5, 2, 1);
    hours.connect("value-changed", Lang.bind(this, function() {
      updateTimeToDoubleDigits(hours);
    }));
    // Configure spin button for Minutes
    let minutes = getGtkSpinButton(-1, 60, 'minutes-value')
    this.setTimerTab.attach_next_to(minutes, hours, Gtk.PositionType.RIGHT, 2, 1);
    // This callback function handles incremements: 60 minutes == 1 hour
    minutes.connect("value-changed", Lang.bind(
      this,
      () => handleTimeConversion(minutes, hours, "minutes-value", "hours-value")
    ));
    // Configure spin button for Secons
    let seconds = getGtkSpinButton(-1, 60, 'seconds-value')
    this.setTimerTab.attach_next_to(seconds, minutes, Gtk.PositionType.RIGHT, 2, 1);
    // This callback function handles incremements seconds -> minutes -> hours
    seconds.connect("value-changed", Lang.bind(
      this,
      () => handleTimeConversion(seconds, minutes, "seconds-value", "minutes-value")
    ));
    // Add separator
    this.setTimerTab.attach(new Gtk.HSeparator(), 0, 6, 8, 1);
    this.setTimerTab.attach(new Gtk.Label({label: _("Action:"), halign: Gtk.Align.END}), 0, 7, 1, 1);
    //4rd row radio buttons with actions and their callbacks
    let shutdownRbtn = new Gtk.RadioButton({label: _("Shutdown")});
    shutdownRbtn.connect("toggled", Lang.bind(this, function() {
      settings.set_int("action", SHUTDOWN);
      action_label.set_text(_("Shutdown"))
    }));
    this.setTimerTab.attach(shutdownRbtn, 3, 7, 2, 1);

    let restartRbtn = new Gtk.RadioButton({ group: shutdownRbtn, label: _("Restart")});
    restartRbtn.connect("toggled", Lang.bind(this, function() {
      settings.set_int("action", REBOOT);
      action_label.set_text(_("Restart"))
    }));
    this.setTimerTab.attach_next_to(restartRbtn, shutdownRbtn, Gtk.PositionType.RIGHT, 2, 1);

    let suspendRbtn = new Gtk.RadioButton({ group: shutdownRbtn, label: _("Suspend")});
    suspendRbtn.connect("toggled", Lang.bind(this, function() {
      settings.set_int("action", SUSPEND);
      action_label.set_text(_("Suspend"))
    }));
    this.setTimerTab.attach_next_to(suspendRbtn, restartRbtn, Gtk.PositionType.RIGHT, 2, 1);

    if (action_setting === SHUTDOWN) {
      shutdownRbtn.active = true;
    }
    else if (action_setting === REBOOT) {
      restartRbtn.active = true;
    }
    else if (action_setting === SUSPEND) {
      suspendRbtn.active = true;
    }
    this.setTimerTab.attach(new Gtk.HSeparator(), 0, 8, 8, 1);
    // Start button
    let start = new Gtk.Button ({label: _("Start")});
    start.connect("clicked", Lang.bind(this, function(){
      settings.set_boolean("timer-start", !settings.get_boolean("timer-start"));
      let w = this.get_window();
      w.destroy();
    }));
    this.setTimerTab.attach(start, 3, 9, 6, 1);
    // Add Set Time tab to the stack
    stack.add_titled(this.setTimerTab, "set-timer", _("Set Timer"));
    this.settingsTab.attach(new Gtk.HSeparator(), 0, 0, 8, 1);
    this.setTimerTab.attach(new Gtk.Separator({orientation: Gtk.Orientation.VERTICAL, margin: 30}), 1, 0, 1, 6);
    this.settingsTab.attach(new Gtk.Label({label: _("Position in panel:"), halign: Gtk.Align.END}), 0, 1, 1, 1);

    let leftPositionRbtn = new Gtk.RadioButton({label: _("Left")});
    leftPositionRbtn.connect("toggled", Lang.bind(this, function() {
            settings.set_int("position", LEFT);
    }));
    this.settingsTab.attach(leftPositionRbtn, 3, 1, 1, 2);

    let middlePositionRbtn = new Gtk.RadioButton({ group: leftPositionRbtn, label: _("Middle")});
    middlePositionRbtn.connect("toggled", Lang.bind(this, function() {
            settings.set_int("position", MIDDLE);
    }));
    this.settingsTab.attach_next_to(middlePositionRbtn, leftPositionRbtn, Gtk.PositionType.RIGHT, 1, 2);

    let rightPositionRbtn = new Gtk.RadioButton({ group: leftPositionRbtn,
                                        label: _("Right")});
    rightPositionRbtn.connect("toggled", Lang.bind(this, function() {
            settings.set_int("position", RIGHT);
    }));
    this.settingsTab.attach_next_to(rightPositionRbtn, middlePositionRbtn, Gtk.PositionType.RIGHT, 1, 2);
    // Shorcuts section
    this.settingsTab.attach(new Gtk.HSeparator(), 0, 3, 8, 1);
    this.settingsTab.attach(new Gtk.Label({label: _("Shortcuts:"), halign: Gtk.Align.END}), 0, 4, 1, 1);

    let setPosition = settings.get_int("position");
    if (setPosition === LEFT) {
      leftPositionRbtn.active = true;
    }
    else if (setPosition === MIDDLE) {
      middlePositionRbtn.active = true;
    }
    else if (setPosition === RIGHT) {
      rightPositionRbtn.active = true;
    }

    let field_keybinding = createKeybindingWidget(settings);

    addKeybinding(field_keybinding.model, settings, "shortcut-start",
                  _("Start/Stop Timer"));
    addKeybinding(field_keybinding.model, settings, "shortcut-option",
                  _("Open options"));
    addKeybinding(field_keybinding.model, settings, "shortcut-restart",
                  _("Restart Timer "));
    this.settingsTab.attach(field_keybinding, 3, 3, 6, 4);
    this.settingsTab.attach(new Gtk.Label({label: _("Use Backspace to disable shortcut"), halign: Gtk.Align.CENTER}), 3, 4, 6, 1);

    this.field_keybinding_activation = new Gtk.Switch();
    this.field_keybinding_activation.connect("notify::active", function(widget){
        this.field_keybinding.set_sensitive(widget.active);
    });
    this.settingsTab.attach(new Gtk.HSeparator(), 0, 5, 8, 1);
    this.settingsTab.attach(new Gtk.Label({label: _("Toggle notifications:"), halign: Gtk.Align.END}), 0, 6, 2, 1);

    let notifications = new Gtk.Switch({
			active: settings.get_boolean("notifications"),
			halign: Gtk.Align.START
		});
    notifications.connect('notify::active', function() {
      settings.set_boolean("notifications", notifications.active);
    });
    this.settingsTab.attach(notifications, 3, 5, 1, 1);
    this.settingsTab.attach(new Gtk.HSeparator(), 0, 7, 8, 1);
    this.settingsTab.attach(new Gtk.Label({label: _("Hide time when innactive:"), halign: Gtk.Align.END}), 0, 8, 2, 1);
    let hideTime = new Gtk.Switch({
      active: settings.get_boolean("hide-time"),
			halign: Gtk.Align.START
		});
    hideTime.connect('notify::active', function() {
      settings.set_boolean("hide-time", hideTime.active);
    });
    this.settingsTab.attach(hideTime, 3, 6, 1, 1);

    // Add Settings tab to the stack
    stack.add_titled(this.settingsTab, "settings", _("Settings"));
    // finish switcher init
		this.pack_start(stack_switcher, false, true, 0);
    this.pack_start(stack, true, true, 0);
  }
});

// CODE forked from clipboard indicator
// https://github.com/Tudmotu/gnome-shell-extension-clipboard-indicator
const COLUMN_ID          = 0;
const COLUMN_DESCRIPTION = 1;
const COLUMN_KEY         = 2;
const COLUMN_MODS        = 3;

function addKeybinding(model, settings, id, description) {
  // Get the current accelerator.
  let accelerator = settings.get_strv(id)[0];
  let key, mods;
  if (accelerator == null)
      [key, mods] = [0, 0];
  else
      [key, mods] = Gtk.accelerator_parse(settings.get_strv(id)[0]);

  // Add a row for the keybinding.
  let row = model.insert(100); // Erm...
  model.set(row,
          [COLUMN_ID, COLUMN_DESCRIPTION, COLUMN_KEY, COLUMN_MODS],
          [id,        description,        key,        mods]);
}


function createKeybindingWidget(SettingsSchema) {
  let model = new Gtk.ListStore();

  model.set_column_types(
          [GObject.TYPE_STRING, // COLUMN_ID
           GObject.TYPE_STRING, // COLUMN_DESCRIPTION
           GObject.TYPE_INT,    // COLUMN_KEY
           GObject.TYPE_INT]);  // COLUMN_MODS

  let treeView = new Gtk.TreeView();
  treeView.model = model;
  treeView.headers_visible = false;

  let column, renderer;

  // Description column.
  renderer = new Gtk.CellRendererText();

  column = new Gtk.TreeViewColumn();
  column.expand = true;
  column.pack_start(renderer, true);
  column.add_attribute(renderer, "text", COLUMN_DESCRIPTION);

  treeView.append_column(column);

  // Key binding column.
  renderer = new Gtk.CellRendererAccel();
  renderer.accel_mode = Gtk.CellRendererAccelMode.GTK;
  renderer.editable = true;

  renderer.connect("accel-edited",
          function (renderer, path, key, mods, hwCode) {
              let [ok, iter] = model.get_iter_from_string(path);
              if(!ok)
                  return;

              // Update the UI.
              model.set(iter, [COLUMN_KEY, COLUMN_MODS], [key, mods]);

              // Update the stored setting.
              let id = model.get_value(iter, COLUMN_ID);
              let accelString = Gtk.accelerator_name(key, mods);
              SettingsSchema.set_strv(id, [accelString]);
          });

  renderer.connect("accel-cleared",
          function (renderer, path) {
              let [ok, iter] = model.get_iter_from_string(path);
              if(!ok)
                  return;

              // Update the UI.
              model.set(iter, [COLUMN_KEY, COLUMN_MODS], [0, 0]);

              // Update the stored setting.
              let id = model.get_value(iter, COLUMN_ID);
              SettingsSchema.set_strv(id, []);
          });

  column = new Gtk.TreeViewColumn();
  column.pack_end(renderer, false);
  column.add_attribute(renderer, "accel-key", COLUMN_KEY);
  column.add_attribute(renderer, "accel-mods", COLUMN_MODS);

  treeView.append_column(column);

  return treeView;
}


function buildPrefsWidget() {
  widget = new AutomaticShutdownTimerPrefs;
  widget.show_all();
  return widget;
}
