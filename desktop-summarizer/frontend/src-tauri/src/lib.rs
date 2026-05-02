use std::sync::Mutex;

use tauri::Manager;

struct BackendProcess(Mutex<Option<tauri_plugin_shell::process::CommandChild>>);

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(not(debug_assertions))]
            {
                use tauri_plugin_shell::{process::CommandEvent, ShellExt};

                match app.shell().sidecar("offline-summarizer-backend") {
                    Ok(command) => match command.spawn() {
                        Ok((mut rx, child)) => {
                            app.manage(BackendProcess(Mutex::new(Some(child))));
                            tauri::async_runtime::spawn(async move {
                                while let Some(event) = rx.recv().await {
                                    match event {
                                        CommandEvent::Stdout(line) => {
                                            println!(
                                                "backend: {}",
                                                String::from_utf8_lossy(&line)
                                            );
                                        }
                                        CommandEvent::Stderr(line) => {
                                            eprintln!(
                                                "backend: {}",
                                                String::from_utf8_lossy(&line)
                                            );
                                        }
                                        _ => {}
                                    }
                                }
                            });
                        }
                        Err(error) => {
                            eprintln!("Could not start local backend sidecar: {error}");
                        }
                    },
                    Err(error) => {
                        eprintln!("Local backend sidecar is not bundled: {error}");
                    }
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Offline Document Summarizer");
}

