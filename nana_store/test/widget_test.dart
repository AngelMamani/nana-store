import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nana_store/features/home/presentation/widgets/nana_boot_screen.dart';
import 'package:nana_store/features/session/presentation/nana_login_view.dart';

void main() {
  testWidgets('login nativo tiene Material y el botón de entrar', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: NanaLoginView(
          busy: false,
          error: null,
          onSubmit: (email, password) async {},
          onGoogle: () async {},
        ),
      ),
    );
    await tester.pump();
    expect(tester.takeException(), isNull);
    expect(find.byType(Scaffold), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
    expect(find.text('Iniciar sesión'), findsOneWidget);
  });

  testWidgets('pantalla de arranque usa Scaffold', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: NanaBootScreen(progress: 0)));
    await tester.pump();
    expect(tester.takeException(), isNull);
    expect(find.byType(LinearProgressIndicator), findsOneWidget);
    expect(find.text('NaNa Admin'), findsOneWidget);
  });
}
