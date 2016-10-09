const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const ShutdownTimerButton = new Lang.Class({
  Name: 'ShutdownTimerButton',
  Extends: PanelMenu.Button,

   _init: function ()
   {
     this.parent(0.0, "Transfer Wise Indicator");
     this.text = new St.Label({text: "Text"});

     this.button = new St.BoxLayout({ style_class: 'panel-button' });
     this.icon = new St.Icon({ icon_name: 'org.gnome.clocks-symbolic',
                             style_class: 'system-status-icon' });

      this.button.add_child(this.icon);
      this.actor.add_actor(this.button);

      this._buildMenu();
  },

  _buildMenu: function () {
      let that = this;
      // Create menu section for items
      that.historySection = new PopupMenu.PopupMenuSection();

      that.scrollViewMenuSection = new PopupMenu.PopupMenuSection();
      let historyScrollView = new St.ScrollView({
          style_class: 'ci-history-menu-section',
          overlay_scrollbars: true
      });
      historyScrollView.add_actor(that.historySection.actor);

      that.scrollViewMenuSection.actor.add_actor(historyScrollView);

      that.menu.addMenuItem(that.scrollViewMenuSection);

      // Add separator
      that.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      let menuItem = new PopupMenu.PopupMenuItem('fuck');
      this.historySection.addMenuItem(menuItem, 0);
    },

});

let shutdownTimerButton;

function init()
{
}

function enable()
{
  shutdownTimerButton = new ShutdownTimerButton;
  Main.panel.addToStatusArea('shutdown-timer-button', shutdownTimerButton);
}

function disable()
{
  twMenu.destroy();
}
