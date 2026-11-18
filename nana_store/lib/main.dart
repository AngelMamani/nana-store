import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

const adminOrigin = 'https://nana-store-two.vercel.app';
const adminStartUrl = '$adminOrigin/entrar?siguiente=/admin';
const nanaPink = Color(0xFFE84B8A);

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const NanaAdminApp());
}

class NanaAdminApp extends StatelessWidget {
  const NanaAdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NANA',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: nanaPink,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      home: const AdminWebScreen(),
    );
  }
}

class AdminWebScreen extends StatefulWidget {
  const AdminWebScreen({super.key});

  @override
  State<AdminWebScreen> createState() => _AdminWebScreenState();
}

class _AdminWebScreenState extends State<AdminWebScreen> {
  late final WebViewController _controller;
  var _loading = true;
  var _progress = 0;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFFFF7FB))
      ..setUserAgent(
        'Mozilla/5.0 (Linux; Android 14; Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 NaNaAdmin/1.0',
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (value) => setState(() => _progress = value),
          onPageStarted: (_) => setState(() => _loading = true),
          onPageFinished: (url) {
            setState(() => _loading = false);
            _keepInsideAdmin(url);
          },
          onNavigationRequest: (request) {
            final host = Uri.tryParse(request.url)?.host ?? '';
            if (host.contains('nana-store') ||
                host.contains('firebase') ||
                host.contains('google') ||
                host.contains('gstatic') ||
                host.contains('googleapis')) {
              return NavigationDecision.navigate;
            }
            return NavigationDecision.prevent;
          },
        ),
      )
      ..loadRequest(Uri.parse(adminStartUrl));
    _configureAndroid();
    _askPermissions();
  }

  void _configureAndroid() {
    final platform = _controller.platform;
    if (platform is AndroidWebViewController) {
      AndroidWebViewController.enableDebugging(false);
      platform
        ..setMediaPlaybackRequiresUserGesture(false)
        ..setGeolocationEnabled(true)
        ..setOnPlatformPermissionRequest((request) {
          request.grant();
        })
        ..setGeolocationPermissionsPromptCallbacks(
          onShowPrompt: (_) async =>
              const GeolocationPermissionsResponse(allow: true, retain: true),
        );
      final cookies = WebViewCookieManager();
      if (cookies.platform is AndroidWebViewCookieManager) {
        (cookies.platform as AndroidWebViewCookieManager)
            .setAcceptThirdPartyCookies(platform, true);
      }
    }
  }

  Future<void> _askPermissions() async {
    await [
      Permission.camera,
      Permission.microphone,
      Permission.locationWhenInUse,
      Permission.bluetooth,
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
    ].request();
  }

  void _keepInsideAdmin(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null || uri.host != Uri.parse(adminOrigin).host) return;
    final path = uri.path;
    if (path.isEmpty || path == '/') {
      _controller.loadRequest(Uri.parse(adminStartUrl));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF7FB),
      body: SafeArea(
        child: Column(
          children: [
            if (_loading)
              LinearProgressIndicator(
                value: _progress > 0 && _progress < 100 ? _progress / 100 : null,
                minHeight: 3,
                color: nanaPink,
                backgroundColor: const Color(0xFFFFD6E7),
              ),
            Expanded(child: WebViewWidget(controller: _controller)),
          ],
        ),
      ),
    );
  }
}
