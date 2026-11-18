# NANA

Aplicativo de la tienda **NANA** para el panel administrativo (pedidos, caja, inventario y productos).

Abre `https://nana-store-two.vercel.app`.

## Instalar en la tablet o el celular

1. Copia `build/app/outputs/flutter-apk/app-release.apk` (o `NANA.apk` si ya lo generamos).
2. En el Android: permite instalar apps de origen desconocido.
3. Abre el APK. El icono es el logo de NANA y el nombre en el menú es **NANA**.
4. Entra con el correo de administrador.

## Compilar de nuevo

En Windows activa **Modo de desarrollador**. Luego:

```bash
cd nana_store
flutter pub get
flutter build apk --release
```

El APK queda en `build/app/outputs/flutter-apk/app-release.apk`.

Para probar en un dispositivo conectado:

```bash
flutter run
```

## Uso

1. Entra con el mismo correo de administrador de la web.
2. El inicio muestra los menús: Pedidos, Productos, Inventario, etc.
3. Cámara y Bluetooth se piden al abrir (escáner e impresión).

La impresión Bluetooth de la POS58 funciona mejor en **Chrome**. El WebView de Android no habla Web Bluetooth; si no imprime desde la app, abre Pedidos en Chrome.
