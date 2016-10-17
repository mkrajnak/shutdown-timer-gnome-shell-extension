const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Gettext = imports.gettext.domain('AutomaticShutdownTimer');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;

let settings;

function init() {
    settings = Convenience.getSettings();
}

const AutomaticShutdownTimerPrefs = new GObject.Class({
    Name: 'AutomaticShutdownTimer.Prefs',
    GTypeName: 'AutomaticShutdownTimerPrefs',
    Extends: Gtk.Grid,

    _init: function(params) {
        this.parent(params);
        this.margin = 12;

        //this.row_homogeneous = true;
        this.column_homogeneous = true;
        this.row_spacing = this.column_spacing = 5;
        // this.vexpand = true;
        // this.hexpand = true;
        // this.resize_mode = 0;

        //this.set_orientation(Gtk.Orientation.VERTICAL);
        this.attach(new Gtk.Label({ label:'Shutdown:'}), 0, 0, 1, 1);
        //1st row
        let afterTime = new Gtk.RadioButton({label: 'after time expires'});
        this.attach(afterTime, 2, 0, 2, 1);

        let onTime = new Gtk.RadioButton({ group: afterTime,
                                            label: 'on time'});
        this.attach_next_to(onTime, afterTime, Gtk.PositionType.RIGHT, 2, 1);
        //     radio.connect('toggled', Lang.bind(this, function(widget) {
        //         if (widget.active)
        //             this._settings.set_string(SETTINGS_APP_ICON_MODE, modeCapture);
        //     }));
        // grid.add(radio);

        this.attach(new Gtk.HSeparator(), 0, 2, 6, 1);
        this.attach(new Gtk.Label({ label:'Time:'}), 0, 3, 1, 1);
        //2nd row
        let hour_label = new Gtk.Label({ label:' Hours '});
        let min_label = new Gtk.Label({ label: 'Minutes'});
        let sec_label = new Gtk.Label({ label: 'Seconds'});
        this.attach(hour_label, 2, 3, 1, 1);
        this.attach_next_to(min_label, hour_label, Gtk.PositionType.RIGHT, 1, 1);
        this.attach_next_to(sec_label, min_label, Gtk.PositionType.RIGHT, 1, 1);


        //3rd row
        let hours = new Gtk.SpinButton({ orientation: Gtk.Orientation.VERTICAL});
        let maxTimerValueDefault = settings.get_int('max-timer-value');
        hours.set_increments(1, 1);
        hours.set_range(1, 60);
        hours.connect('value-changed', Lang.bind(this, function(button){
            let s = button.get_value_as_int();
            settings.set_int('max-timer-value', s);
        }));
        hours.set_value(maxTimerValueDefault);
        this.attach(hours, 2, 4, 1, 1);
        //this.add(hours);

        let minutes = new Gtk.SpinButton({ orientation: Gtk.Orientation.VERTICAL});
        let maxTimerValueDefault = settings.get_int('max-timer-value');
        minutes.set_increments(2, 2);
        minutes.set_range(1, 60);
        minutes.connect('value-changed', Lang.bind(this, function(button){
            let s = button.get_value_as_int();
            settings.set_int('max-timer-value', s);
        }));
        minutes.set_value(maxTimerValueDefault);
        this.attach_next_to(minutes, hours, Gtk.PositionType.RIGHT, 1, 1);

        let seconds = new Gtk.SpinButton({ orientation: Gtk.Orientation.VERTICAL});
        let maxTimerValueDefault = settings.get_int('max-timer-value');
        seconds.set_increments(1, 1);
        seconds.set_range(1, 60);
        seconds.connect('value-changed', Lang.bind(this, function(button){
            let s = button.get_value_as_int();
            settings.set_int('max-timer-value', s);
        }));
        seconds.set_value(maxTimerValueDefault);
        this.attach_next_to(seconds, minutes, Gtk.PositionType.RIGHT, 1, 1);

        this.attach(new Gtk.HSeparator(), 0, 5, 6, 1);
        this.attach(new Gtk.Label({ label:'Action:'}), 0, 6, 1, 1);
        //4rd row
        let shutdownRbtn = new Gtk.RadioButton({label: 'Shutdown'});
        this.attach(shutdownRbtn, 2, 6, 1, 1);

        let restartRbtn = new Gtk.RadioButton({ group: shutdownRbtn,
                                            label: 'Restart'});
        this.attach_next_to(restartRbtn, shutdownRbtn, Gtk.PositionType.RIGHT, 1, 1);

        let suspendRbtn = new Gtk.RadioButton({ group: shutdownRbtn,
                                            label: 'Suspend'});
        this.attach_next_to(suspendRbtn, restartRbtn, Gtk.PositionType.RIGHT, 1, 1);

        this.attach(new Gtk.HSeparator(), 0, 7, 6, 1);
        let apply = new Gtk.Button ({label: "Apply"});
        this.attach(apply, 3, 8, 1, 1);
    }

});

function buildPrefsWidget() {
    let widget = new AutomaticShutdownTimerPrefs;
    widget.show_all();

    return widget;
}
