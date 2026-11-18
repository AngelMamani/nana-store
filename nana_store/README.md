# NaNa Admin (Flutter)

Panel administrativo nativo para tablet y celular. Comparte catálogo, pedidos y usuarios con la web.

## Correr

```bash
cd nana_store
flutter pub get
flutter run
```

## APK

```bash
flutter build apk --release
```

Salida: `build/app/outputs/flutter-apk/app-release.apk`.

## Uso

1. Entra con Google o correo de administrador (el mismo de la web).
2. Inicio: productos, categorías, ofertas, usuarios, videos y tienda.
3. Pedidos, venta en tienda (contado / contra entrega), inventario.
4. En venta: vincula la **POS58** (Bluetooth, PIN 0000) para imprimir la boleta simple.

Si Google no abre el selector de cuentas, agrega el SHA-1 de tu `debug.keystore` en Firebase (ver README de la raíz del repo).
