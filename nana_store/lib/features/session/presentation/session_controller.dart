import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../data/nana_auth_service.dart';
import '../domain/session_user.dart';

class SessionController extends ChangeNotifier {
  SessionController({NanaAuthService? auth}) : _auth = auth ?? NanaAuthService();

  final NanaAuthService _auth;
  StreamSubscription<User?>? _sub;

  SessionUser? user;
  var loading = true;
  var busy = false;
  String? error;

  Future<void> start() async {
    await _sub?.cancel();
    loading = true;
    notifyListeners();
    _sub = _auth.authChanges().listen((firebaseUser) async {
      if (firebaseUser == null) {
        user = null;
        loading = false;
        notifyListeners();
        return;
      }
      try {
        user = await _auth.currentUser();
      } on NanaAuthException {
        user = null;
      } finally {
        loading = false;
        notifyListeners();
      }
    });
  }

  Future<void> login(String email, String password) async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      user = await _auth.signInWithEmail(email, password);
    } on NanaAuthException catch (ex) {
      error = ex.message;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> loginGoogle() async {
    error = null;
    try {
      user = await _auth.signInWithGoogle();
    } on NanaAuthException catch (ex) {
      error = ex.message;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _auth.signOut();
    user = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}
