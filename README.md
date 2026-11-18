# NaNa Store

Tienda pública (web) y panel administrativo nativo (Flutter) para NaNa, Puerto Maldonado.

- **Web:** catálogo, carrito y admin en el navegador (`npm run dev`)
- **Admin móvil/tablet:** app Flutter en `nana_store/` (no usa WebView)
- **Datos:** Firebase (Auth, Firestore, Storage) — proyecto `nana-store-8b0ab`
- **Producción web:** [nana-store-two.vercel.app](https://nana-store-two.vercel.app)

## Requisitos

- Node.js 20 o superior
- Flutter 3.32 o superior (canal estable)
- Android SDK (para la app)
- Acceso al proyecto Firebase y al repositorio GitHub

## Web

```bash
npm install
npm run dev
```

Build de producción:

```bash
npm run build
```

## Admin Flutter

```bash
cd nana_store
flutter pub get
flutter run
```

APK:

```bash
cd nana_store
flutter build apk --release
```

El APK queda en `nana_store/build/app/outputs/flutter-apk/app-release.apk`.

### Google Sign-In en Android

Cada computadora tiene un SHA-1 de debug distinto. Si el login con Google falla en un equipo nuevo:

1. Obtén el SHA-1:

```bash
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

2. En Firebase Console → app Android `pe.nanastore.admin` → agrega ese SHA-1 (y SHA-256).
3. Descarga de nuevo `google-services.json` si Firebase lo pide y reemplaza `nana_store/android/app/google-services.json`.

El cliente OAuth web ya está configurado en la app. PIN de la POS58: **0000**. Empareja la impresora en Bluetooth del dispositivo antes de cobrar.

### Permisos

La app pide cámara (código de barras) y Bluetooth (boleta térmica).

## Qué hay en cada carpeta

| Ruta | Contenido |
| --- | --- |
| `src/` | Tienda y admin web (Vite + React + TypeScript) |
| `nana_store/` | Admin nativo Flutter |
| `public/` | Assets estáticos de la web |

## Notas para el equipo

- No subas keystores (`.jks`, `key.properties`) ni archivos `.env`.
- `google-services.json` sí va en el repo: es configuración de cliente, no la cuenta de Firebase.
- El superadmin del panel es el correo configurado en el código de autenticación.
- Tras clonar, corre `flutter pub get` y `npm install` antes de abrir issues de “no arranca”.
