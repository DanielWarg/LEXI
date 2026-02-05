#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // In release builds, the backend is started via shell plugin
            // In dev, user runs backend manually
            #[cfg(not(debug_assertions))]
            {
                println!("[Lexi] Release mode - backend should be bundled");
            }

            #[cfg(debug_assertions)]
            {
                println!("[Lexi] Dev mode - start backend manually");
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
