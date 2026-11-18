import 'package:flutter/material.dart';

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

  @override
  void initState() {
    super.initState();
    _session = SessionController()..start();
  }

  @override
  void dispose() {
    _session.dispose();
    super.dispose();
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
        home: const SessionGate(),
      ),
    );
  }
}
