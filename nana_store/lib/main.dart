import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app/nana_admin_app.dart';
import 'app/nana_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(NanaTheme.systemUi);
  runApp(const NanaAdminApp());
}
