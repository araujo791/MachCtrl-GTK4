mod cleaner;
mod gpu;
mod hwmon;
mod memory;
mod power;
mod profiles;

use adw::prelude::*;
use gtk::glib;

fn main() -> glib::ExitCode {
    let app = adw::Application::builder()
        .application_id("com.machctrl.app")
        .build();

    app.connect_activate(|app| {
        let window = adw::ApplicationWindow::builder()
            .application(app)
            .title("MachCtrl")
            .default_width(1100)
            .default_height(720)
            .build();

        let header = adw::HeaderBar::new();
        let content = gtk::Box::new(gtk::Orientation::Vertical, 0);
        content.append(&header);

        let label = gtk::Label::new(Some("MachCtrl 4.0 — esqueleto GTK4 + libadwaita"));
        label.set_vexpand(true);
        content.append(&label);

        window.set_content(Some(&content));
        window.present();
    });

    app.run()
}
