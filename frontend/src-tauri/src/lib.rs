#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // Подключаем плагин HTTP для запросов к API
    .plugin(tauri_plugin_http::init())
    .setup(|app| {
      // В режиме разработки подключаем логирование
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // Подключаем плагин автообновления
      let handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        use tauri_plugin_updater::UpdaterExt;
        
        // Проверяем обновления при запуске
        match handle.updater() {
          Ok(updater) => {
            match updater.check().await {
              Ok(Some(update)) => {
                log::info!("Доступно обновление: {}", update.version);
                // Можно показать диалог пользователю
              }
              Ok(None) => {
                log::info!("Приложение обновлено");
              }
              Err(e) => {
                log::error!("Ошибка проверки обновлений: {}", e);
              }
            }
          }
          Err(e) => {
            log::error!("Не удалось инициализировать updater: {}", e);
          }
        }
      });
      
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
