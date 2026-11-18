import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../../core/constants/nana_auth.dart';
import '../domain/session_user.dart';

class NanaAuthException implements Exception {
  const NanaAuthException(this.message);
  final String message;
}

class NanaAuthService {
  NanaAuthService({FirebaseAuth? auth, FirebaseFirestore? firestore})
    : _auth = auth ?? FirebaseAuth.instance,
      _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseAuth _auth;
  final FirebaseFirestore _firestore;
  var _googleReady = false;

  Stream<User?> authChanges() => _auth.authStateChanges();

  Future<SessionUser?> currentUser() async {
    final user = _auth.currentUser;
    if (user == null) return null;
    return _sessionFromFirebase(user);
  }

  Future<SessionUser> signInWithEmail(String email, String password) async {
    try {
      final cred = await _auth.signInWithEmailAndPassword(email: email.trim(), password: password);
      return await _sessionFromFirebase(cred.user!);
    } on FirebaseAuthException catch (error) {
      throw NanaAuthException(_messageFor(error.code));
    }
  }

  Future<SessionUser> signInWithGoogle() async {
    try {
      await _ensureGoogle();
      final googleUser = await GoogleSignIn.instance.authenticate();
      final idToken = googleUser.authentication.idToken;
      if (idToken == null) {
        throw const NanaAuthException('Google no devolvió el token. Intenta de nuevo.');
      }
      final cred = await _auth.signInWithCredential(GoogleAuthProvider.credential(idToken: idToken));
      return await _sessionFromFirebase(cred.user!);
    } on NanaAuthException {
      rethrow;
    } on GoogleSignInException catch (error) {
      if (error.code == GoogleSignInExceptionCode.canceled) {
        throw const NanaAuthException('Inicio de Google cancelado.');
      }
      throw NanaAuthException('No se pudo entrar con Google. ${error.description ?? ''}');
    } on FirebaseAuthException catch (error) {
      throw NanaAuthException(_messageFor(error.code));
    } catch (_) {
      throw const NanaAuthException('No se pudo entrar con Google.');
    }
  }

  Future<void> signOut() async {
    try {
      await GoogleSignIn.instance.signOut();
    } catch (_) {}
    await _auth.signOut();
  }

  Future<void> _ensureGoogle() async {
    if (_googleReady) return;
    await GoogleSignIn.instance.initialize();
    _googleReady = true;
  }

  Future<SessionUser> _sessionFromFirebase(User user) async {
    final email = user.email ?? '';
    final role = await _roleFor(email, user.uid);
    if (!NanaAuth.canUseAdmin(role, email)) {
      await signOut();
      throw const NanaAuthException('Esta cuenta no es de administración.');
    }
    await _syncUserDoc(user, role);
    return SessionUser(
      id: user.uid,
      name: user.displayName?.trim().isNotEmpty == true
          ? user.displayName!.trim()
          : email.split('@').first,
      email: email,
      role: NanaAuth.isSuperAdmin(email) ? 'desarrollador' : role,
    );
  }

  Future<String> _roleFor(String email, String uid) async {
    if (NanaAuth.isSuperAdmin(email)) return 'desarrollador';
    try {
      final snap = await _firestore.collection('users').doc(uid).get();
      final role = snap.data()?['role']?.toString();
      if (role != null && role.isNotEmpty) return role;
    } catch (_) {}
    return 'cliente';
  }

  Future<void> _syncUserDoc(User user, String role) async {
    final ref = _firestore.collection('users').doc(user.uid);
    final snap = await ref.get();
    final email = user.email ?? '';
    if (!snap.exists) {
      await ref.set({
        'id': user.uid,
        'name': user.displayName ?? email.split('@').first,
        'email': email,
        'role': NanaAuth.isSuperAdmin(email) ? 'desarrollador' : role,
        'createdAt': DateTime.now().toIso8601String(),
      });
      return;
    }
    if (NanaAuth.isSuperAdmin(email) && snap.data()?['role'] != 'desarrollador') {
      await ref.set({'role': 'desarrollador'}, SetOptions(merge: true));
    }
  }

  String _messageFor(String code) {
    switch (code) {
      case 'invalid-email':
        return 'Escribe un correo válido.';
      case 'user-disabled':
        return 'Esta cuenta está deshabilitada.';
      case 'too-many-requests':
        return 'Demasiados intentos. Espera un momento.';
      case 'network-request-failed':
        return 'Sin conexión. Revisa el internet.';
      case 'invalid-credential':
      case 'wrong-password':
      case 'user-not-found':
        return 'Correo o contraseña incorrectos.';
      default:
        return 'No se pudo iniciar sesión.';
    }
  }
}
