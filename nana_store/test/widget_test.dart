import 'package:flutter_test/flutter_test.dart';
import 'package:nana_store/main.dart';

void main() {
  testWidgets('abre NaNa Admin', (tester) async {
    await tester.pumpWidget(const NanaAdminApp());
    expect(find.byType(NanaAdminApp), findsOneWidget);
  });
}
