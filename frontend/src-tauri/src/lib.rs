use tauri_plugin_updater::UpdaterExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // Подключаем плагин HTTP для запросов к API
    .plugin(tauri_plugin_http::init())
    // Подключаем плагин автообновления ОБЯЗАТЕЛЬНО до .setup()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .setup(|app| {
      // В режиме разработки подключаем логирование
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // Проверяем обновления при запуске
      let handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        // Небольшая задержка чтобы окно успело загрузиться
        tokio::time::sleep(std::time::Duration::from_secs(3)).await;
        
        log::info!("Проверяем обновления...");
        
        match handle.updater() {
          Ok(updater) => {
            match updater.check().await {
              Ok(Some(update)) => {
                log::info!("Доступно обновление: v{}", update.version);
                
                // Скачиваем и устанавливаем обновление
                match update.download_and_install(
                  |downloaded, total| {
                    if let Some(total) = total {
                      log::info!("Загрузка: {}/{} байт", downloaded, total);
                    }
                  },
                  || {
                    log::info!("Загрузка завершена, устанавливаем...");
                  }
                ).await {
                  Ok(_) => {
                    log::info!("Обновление установлено, перезапускаем...");
                    handle.restart();
                  }
                  Err(e) => {
                    log::error!("Ошибка установки обновления: {}", e);
                  }
                }
              }
              Ok(None) => {
                log::info!("Приложение уже обновлено до последней версии");
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
