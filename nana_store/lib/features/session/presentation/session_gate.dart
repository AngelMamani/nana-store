import 'package:flutter/material.dart';

import '../../home/presentation/widgets/nana_boot_screen.dart';
import '../../shell/presentation/nana_shell.dart';
import 'nana_login_view.dart';
import 'session_scope.dart';

class SessionGate extends StatelessWidget {
  const SessionGate({super.key});

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    if (session.loading) {
      return const NanaBootScreen(progress: 0);
    }
    if (session.user == null) {
      return NanaLoginView(
        busy: session.busy,
        error: session.error,
        onSubmit: session.login,
        onGoogle: session.loginGoogle,
      );
    }
    return const NanaShell();
  }
}
