import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nana_store/features/session/presentation/nana_login_view.dart';

void main() {
  testWidgets('muestra el login nativo de NaNa Admin', (tester) async {
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
    expect(find.text('NaNa Admin'), findsOneWidget);
    expect(find.text('Iniciar sesión'), findsOneWidget);
  });
}
