pub use models::*;
use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};
pub mod commands;
pub mod model;
pub mod server;
pub mod syscmds;
pub mod utils;

// use commands::{apps::ApplicationsState, server::Server};
use std::{collections::HashMap, path::PathBuf, sync::Mutex};
use tauri_plugin_store::StoreBuilder;
use utils::{path::get_default_extensions_dir, settings::AppSettings};

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

// mod commands;
mod error;
mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::Jarvis;
#[cfg(mobile)]
use mobile::Jarvis;

// #[derive(Default)]
// struct MyState(Mutex<HashMap<String, String>>);

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the jarvis APIs.
pub trait JarvisExt<R: Runtime> {
    fn jarvis(&self) -> &Jarvis<R>;
}

impl<R: Runtime, T: Manager<R>> crate::JarvisExt<R> for T {
    fn jarvis(&self) -> &Jarvis<R> {
        self.state::<Jarvis<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("jarvis")
        .invoke_handler(tauri::generate_handler![
            // dev commands
            commands::dev::open_devtools,
            commands::dev::close_devtools,
            commands::dev::is_devtools_open,
            commands::dev::toggle_devtools,
            commands::dev::app_is_dev,
            // system commands
            commands::system::open_trash,
            commands::system::empty_trash,
            commands::system::shutdown,
            commands::system::reboot,
            commands::system::sleep,
            commands::system::toggle_system_appearance,
            commands::system::show_desktop,
            commands::system::quit_all_apps,
            commands::system::sleep_displays,
            commands::system::set_volume,
            commands::system::turn_volume_up,
            commands::system::turn_volume_down,
            commands::system::toggle_stage_manager,
            commands::system::toggle_bluetooth,
            commands::system::toggle_hidden_files,
            commands::system::eject_all_disks,
            commands::system::logout_user,
            commands::system::toggle_mute,
            commands::system::mute,
            commands::system::unmute,
            commands::system::hide_all_apps_except_frontmost,
            commands::system::get_selected_files_in_file_explorer,
            // run scripts
            commands::utils::run_apple_script,
            commands::utils::run_powershell,
            // applications
            commands::apps::get_applications,
            commands::apps::refresh_applications_list,
            commands::apps::refresh_applications_list_in_bg,
            // extensions
            commands::extension::load_manifest,
            commands::extension::load_all_extensions,
            // utils
            commands::fs::path_exists,
            // server
            commands::server::start_server,
            commands::server::stop_server,
            commands::server::restart_server,
            commands::server::set_dev_extension_folder,
            commands::server::set_extension_folder,
            commands::server::get_extension_folder,
            commands::server::get_dev_extension_folder,
            commands::server::server_is_running,
            // fs
            commands::fs::decompress_tarball,
            commands::fs::compress_tarball,
        ])
        .setup(|app, api| {
            #[cfg(mobile)]
            let jarvis = mobile::init(app, api)?;
            #[cfg(desktop)]
            let jarvis = desktop::init(app, api)?;
            app.manage(jarvis);

            // manage state so it is accessible by the commands
            // app.manage(MyState::default());
            app.manage(commands::apps::ApplicationsState::default());

            let mut store = StoreBuilder::new("appConfig.bin").build(app.clone());
            let _ = store.load();

            let app_settings = match AppSettings::load_from_store(&store) {
                Ok(settings) => settings,
                Err(_) => AppSettings::default(),
            };
            let ext_folder: Option<PathBuf> = get_default_extensions_dir(app).ok();
            app.manage(commands::server::Server::new(
                ext_folder,
                app_settings.dev_extention_path,
            ));
            // utils::setup::setup_server(app);
            // utils::setup::setup_app_path(app);
            Ok(())
        })
        .build()
}
