import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app/nana_admin_app.dart';
import 'app/nana_theme.dart';
import 'core/constants/nana_firebase.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(NanaTheme.systemUi);
  await Firebase.initializeApp(options: NanaFirebase.options);
  runApp(const NanaAdminApp());
}
