import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../core/constants/nana_firebase.dart';
import '../features/home/presentation/widgets/nana_boot_screen.dart';
import '../features/session/presentation/session_controller.dart';
import '../features/session/presentation/session_gate.dart';
import '../features/session/presentation/session_scope.dart';
import 'nana_navigator.dart';
import 'nana_theme.dart';

class NanaAdminApp extends StatefulWidget {
  const NanaAdminApp({super.key});

  @override
  State<NanaAdminApp> createState() => _NanaAdminAppState();
}

class _NanaAdminAppState extends State<NanaAdminApp> {
  late final SessionController _session;
  var _firebaseReady = false;
  String? _bootError;

  @override
  void initState() {
    super.initState();
    _session = SessionController();
    _boot();
  }

  @override
  void dispose() {
    _session.dispose();
    super.dispose();
  }

  Future<void> _boot() async {
    if (mounted && _bootError != null) {
      setState(() => _bootError = null);
    }
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(options: NanaFirebase.current);
      }
      try {
        await GoogleSignIn.instance.initialize(serverClientId: NanaFirebase.googleWebClientId);
      } catch (_) {
        // Ya quedó listo en un hot restart.
      }
      if (!mounted) return;
      setState(() {
        _bootError = null;
        _firebaseReady = true;
      });
      await _session.start();
    } catch (error) {
      if (!mounted) return;
      final detail = error is FirebaseException ? '${error.code}: ${error.message}' : '$error';
      setState(() {
        _firebaseReady = false;
        _bootError = 'No se pudo conectar. $detail';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return SessionScope(
      controller: _session,
      child: MaterialApp(
        navigatorKey: NanaNavigator.key,
        title: 'NaNa Admin',
        debugShowCheckedModeBanner: false,
        theme: NanaTheme.light,
        home: _firebaseReady
            ? const SessionGate()
            : NanaBootScreen(progress: 0, error: _bootError, onRetry: _bootError == null ? null : _boot),
      ),
    );
  }
}
