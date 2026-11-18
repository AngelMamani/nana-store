# NaNa Admin

Aplicativo Flutter de la **parte administrativa** de NaNa (Pedidos, caja, inventario). Abre el panel en `https://nana-store-two.vercel.app`.

## Cómo correrlo

En la tablet o el celular, con Flutter instalado:

```bash
cd nana_store
flutter pub get
flutter run
```

Para un APK instalable:

```bash
cd nana_store
flutter build apk --release
```

El archivo queda en `build/app/outputs/flutter-apk/app-release.apk`.

## Uso

1. Entra con el correo de administrador (el mismo de la web).
2. Quedas en `/admin`: Pedidos, venta, impresora, etc.
3. Cámara y Bluetooth se piden al abrir la app (escáner e impresión).

La impresión Bluetooth de la POS58 funciona mejor en **Chrome**. El WebView de Android no habla Web Bluetooth; si no imprime desde la app, abre Pedidos en Chrome.
