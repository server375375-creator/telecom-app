#!/bin/bash
# Скрипт для генерации ключей подписи обновлений Tauri
# Запустите один раз для создания пары ключей

echo "=== Генерация ключей для Tauri Updater ==="
echo ""

# Проверяем наличие Tauri CLI
if ! command -v npm &> /dev/null; then
    echo "Ошибка: npm не установлен"
    exit 1
fi

# Генерируем ключи с помощью Tauri CLI
cd "$(dirname "$0")/.."

echo "Генерирую пару ключей..."
npx tauri signer generate -w .tauri/keys

echo ""
echo "=== Ключи сгенерированы! ==="
echo ""
echo "ВАЖНО: Сохраните эти ключи в безопасном месте!"
echo ""
echo "1. Добавьте TAURI_PRIVATE_KEY в GitHub Secrets (содержимое .tauri/keys/private.key)"
echo "2. Добавьте TAURI_KEY_PASSWORD в GitHub Secrets (пароль, который вы ввели)"
echo "3. Добавьте публичный ключ в tauri.conf.json в секцию plugins.updater.pubkey"
echo ""
echo "Файлы ключей:"
echo "  - Приватный ключ: .tauri/keys/private.key (НЕ КОММИТЬТЕ!)"
echo "  - Публичный ключ: .tauri/keys/public.key (можно коммитить)"
echo ""
echo "Добавьте .tauri/keys/private.key в .gitignore!"