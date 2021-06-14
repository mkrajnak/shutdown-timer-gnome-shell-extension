const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
// init translation
const Gettext = imports.gettext;
const _ = Gettext.domain("shutdown-timer-gnome-shell-extension").gettext;
// Utils
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;

// options
const SHUTDOWN = 0;
const REBOOT = 1;
const SUSPEND = 2;
const SHUTDOWNAFTERTIME = 0;
const SHUTDOWNONTIME = 1;
const LEFT = 0;
const MIDDLE = 1;
const RIGHT = 2;
let settings, widget;

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

    this.orientation = Gtk.Orientation.VERTICAL,
		this.spacing = 5;

		let stack = new Gtk.Stack({
            transition_type: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT,
            transition_duration: 500,
            margin_start: 10,
            margin_end: 10
        });
    let stack_switcher = new Gtk.StackSwitcher({
        margin_start: 5,
        margin_top: 5,
        margin_bottom: 5,
        margin_end: 5,
        halign: Gtk.Align.CENTER,
        stack: stack
    });

    this.setTime = new Gtk.Grid()
    this.setTimargin = 5;
    this.setTime.column_homogeneous = true;
    this.setTime.row_spacing = this.column_spacing = 10;

    this.opt = new Gtk.Grid()
    this.opt.margin = 5;
    this.opt.column_homogeneous = true;
    this.opt.row_spacing = this.column_spacing = 10;

    //1st row
    this.setTime.attach(new Gtk.Separator({orientation : Gtk.Orientation.HORIZONTAL}), 0, 0, 6, 1);
    this.setTime.attach(new Gtk.Label({ label: _("Shutdown:"), halign: Gtk.Align.END }), 0, 1, 1, 1);
    let afterTime = new Gtk.CheckButton({label: _("after time expires")});
    afterTime.connect("toggled", Lang.bind(this, function() {
            settings.set_int("timer", SHUTDOWNAFTERTIME);
    }));
    this.setTime.attach(afterTime, 2, 1, 2, 1);

    let onTime = new Gtk.CheckButton({group: afterTime,
                                      label: _("on time (24h format)"),
                                      halign: Gtk.Align.START});
    onTime.connect("toggled", Lang.bind(this, function() {
            settings.set_int("timer", SHUTDOWNONTIME);
    }));
    this.setTime.attach_next_to(onTime, afterTime, Gtk.PositionType.RIGHT, 2, 1);

    let timeSet = settings.get_int("timer")
    if (timeSet === SHUTDOWNONTIME) {
      onTime.active = true;
    }else{
      afterTime.active = true;
    }

    this.setTime.attach(new Gtk.Separator({orientation : Gtk.Orientation.HORIZONTAL}), 0, 3, 6, 1);
    this.setTime.attach(new Gtk.Label({ label: _("Time:"), halign: Gtk.Align.END}), 0, 4, 1, 1);
    //2nd row
    let hour_label = new Gtk.Label({ label: _(" Hours ")});
    let min_label = new Gtk.Label({ label: _("Minutes")});
    let sec_label = new Gtk.Label({ label: _("Seconds")});
    this.setTime.attach(hour_label, 2, 4, 1, 1);
    this.setTime.attach_next_to(min_label, hour_label, Gtk.PositionType.RIGHT, 1, 1);
    this.setTime.attach_next_to(sec_label, min_label, Gtk.PositionType.RIGHT, 1, 1);

    //3rd row
    let hours = new Gtk.SpinButton({ orientation: Gtk.Orientation.VERTICAL});
    hours.set_increments(1, 1);
    hours.set_range(0, 24);
    hours.set_value(settings.get_int("hours-value"));
    hours.set_wrap(true)
    hours.connect("value-changed", Lang.bind(this, function(){
      settings.set_int("hours-value", hours.get_value_as_int());
    }));
    hours.set_value(settings.get_int("hours-value"));
    this.setTime.attach(hours, 2, 5, 1, 1);

    let minutes = new Gtk.SpinButton({ orientation: Gtk.Orientation.VERTICAL});
    minutes.set_increments(1, 1);
    minutes.set_range(-1, 60);
    minutes.set_value(settings.get_int("minutes-value"));

    let tmp_min = minutes.get_value_as_int()
    minutes.connect("value-changed", Lang.bind(this, function(){
      let time = minutes.get_value_as_int()
      if ( time === 60) {
        if (tmp_min < time) {
          minutes.set_value(0)
          let val = hours.get_value_as_int() + 1
          hours.set_value(val)
        }
      }
      if ( time < 0) {
        if (tmp_min > time) {
          minutes.set_value(59)
          let val = hours.get_value_as_int() - 1
          hours.set_value(val)
        }
      }
      tmp_min = time;
      settings.set_int("minutes-value", minutes.get_value_as_int());
    }));
    this.setTime.attach_next_to(minutes, hours, Gtk.PositionType.RIGHT, 1, 1);

    // init seconds
    let seconds = new Gtk.SpinButton({ orientation: Gtk.Orientation.VERTICAL});
    seconds.set_increments(1, 1);
    seconds.set_range(-1, 60);
    seconds.set_value(settings.get_int("seconds-value"));

    // handle change
    let tmp_secs = seconds.get_value_as_int()
    seconds.connect("value-changed", Lang.bind(this, function(){
      let cs_time = seconds.get_value_as_int()
      if ( cs_time === 60) {
        if (tmp_secs < cs_time) {
          seconds.set_value(0)
          let val = minutes.get_value_as_int() + 1
          if (val === 60) {
              hours.set_value(hours.get_value_as_int() + 1)
              val = 0
          }
          minutes.set_value(val)
        }
      }
      if ( cs_time < 0) {
        if (tmp_secs > cs_time) {
          seconds.set_value(59)
          let val = minutes.get_value_as_int()
          val = val - 1
          if (val < 0) {
            let hval;
            hval = hours.get_value_as_int()
            if (hval > 0) {
              hours.set_value(hval - 1)
            }
            val = 0
          }
          minutes.set_value(val)
        }
      }
      tmp_secs = cs_time;
      settings.set_int("seconds-value", seconds.get_value_as_int());
    }));
    this.setTime.attach_next_to(seconds, minutes, Gtk.PositionType.RIGHT, 1, 1);

    this.setTime.attach(new Gtk.Separator({orientation : Gtk.Orientation.HORIZONTAL}), 0, 6, 6, 1);
    this.setTime.attach(new Gtk.Label({ label: _("Action:"), halign: Gtk.Align.END}), 0, 7, 1, 1);
    //4rd row
    let shutdownRbtn = new Gtk.CheckButton({label: _("Shutdown")});
    shutdownRbtn.connect("toggled", Lang.bind(this, function() {
            settings.set_int("action", SHUTDOWN);
    }));
    this.setTime.attach(shutdownRbtn, 2, 7, 1, 1);

    let restartRbtn = new Gtk.CheckButton({ group: shutdownRbtn,
                                        label: _("Restart")});
    restartRbtn.connect("toggled", Lang.bind(this, function() {
            settings.set_int("action", REBOOT);
    }));
    this.setTime.attach_next_to(restartRbtn, shutdownRbtn, Gtk.PositionType.RIGHT, 1, 1);

    let suspendRbtn = new Gtk.CheckButton({ group: shutdownRbtn,
                                        label: _("Suspend")});
    suspendRbtn.connect("toggled", Lang.bind(this, function() {
            settings.set_int("action", SUSPEND);
    }));
    this.setTime.attach_next_to(suspendRbtn, restartRbtn, Gtk.PositionType.RIGHT, 1, 1);

    let set = settings.get_int("action");
    if (set === SHUTDOWN) {
      shutdownRbtn.active = true;
    }
    else if (set === REBOOT) {
      restartRbtn.active = true;
    }
    else if (set === SUSPEND) {
      suspendRbtn.active = true;
    }

    let start = new Gtk.Button ({label: _("Start")});
    start.connect("clicked", Lang.bind(this, function(){
      settings.set_boolean("timer-start", !settings.get_boolean("timer-start"));
      let w = this.get_root()
      w.destroy()
    }));
    this.setTime.attach(start, 2, 8, 3, 1);
    stack.add_titled(this.setTime, "set-timer", _("Set Timer"));

    // start of Option tab
    this.opt.attach(new Gtk.Separator({orientation : Gtk.Orientation.HORIZONTAL}), 0, 0, 6, 1);
    this.opt.attach(new Gtk.Label({ label: _("Position in panel:"), halign: Gtk.Align.END}), 0, 1, 2, 1);

    let leftPositionRbtn = new Gtk.CheckButton({label: _("Left")});
    leftPositionRbtn.connect("toggled", Lang.bind(this, function() {
            settings.set_int("position", LEFT);
    }));
    this.opt.attach(leftPositionRbtn, 3, 1, 1, 1);

    let middlePositionRbtn = new Gtk.CheckButton({ group: leftPositionRbtn,
                                        label: _("Middle")});
    middlePositionRbtn.connect("toggled", Lang.bind(this, function() {
            settings.set_int("position", MIDDLE);
    }));
    this.opt.attach_next_to(middlePositionRbtn, leftPositionRbtn, Gtk.PositionType.RIGHT, 1, 1);

    let rightPositionRbtn = new Gtk.CheckButton({ group: leftPositionRbtn,
                                        label: _("Right")});
    rightPositionRbtn.connect("toggled", Lang.bind(this, function() {
            settings.set_int("position", RIGHT);
    }));
    this.opt.attach_next_to(rightPositionRbtn, middlePositionRbtn, Gtk.PositionType.RIGHT, 1, 1);

    this.opt.attach(new Gtk.Label({ label: _("Shortcuts:"), halign: Gtk.Align.END}), 0, 3, 2, 1);

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
    this.opt.attach(field_keybinding, 3, 3, 3, 1);
    this.opt.attach(new Gtk.Label({ label: _("Use Backspace to disable shortcut"), halign: Gtk.Align.CENTER}), 3, 4, 3, 1);

    this.field_keybinding_activation = new Gtk.Switch();
    this.field_keybinding_activation.connect("notify::active", function(widget){
        this.field_keybinding.set_sensitive(widget.active);
    });

    this.opt.attach(new Gtk.Label({ label: _("Toggle notifications:"), halign: Gtk.Align.END}), 0, 5, 2, 1);

    let notifications = new Gtk.Switch({
			active: settings.get_boolean("notifications"),
			halign: Gtk.Align.START
		});
    notifications.connect('notify::active', function() {
      settings.set_boolean("notifications", notifications.active);
    });
    this.opt.attach(notifications, 3, 5, 1, 1);

    this.opt.attach(new Gtk.Label({ label: _("Hide time when inactive:"), halign: Gtk.Align.END}), 0, 6, 2, 1);
    let hideTime = new Gtk.Switch({
      active: settings.get_boolean("hide-time"),
			halign: Gtk.Align.START
		});
    hideTime.connect('notify::active', function() {
      settings.set_boolean("hide-time", hideTime.active);
    });
    this.opt.attach(hideTime, 3, 6, 1, 1);
    stack.add_titled(this.opt, "settings", _("Settings"));

		this.append(stack_switcher);
		this.append(stack);
		
    // Apply CSS styling
    provider = new Gtk.CssProvider();
    provider.load_from_path(Extension.dir.get_path() + '/prefs.css');
    Gtk.StyleContext.add_provider_for_display(
      Gdk.Display.get_default(), 
      provider, 
      Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
    );
  }
  
});

// CODE forked from clipboard indicator
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

  return widget;
}
