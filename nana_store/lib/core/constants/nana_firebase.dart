import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

abstract final class NanaFirebase {
  static const googleWebClientId =
      '194400153115-avc7u1ncd5ndoknapj2fs5oqidc6igog.apps.googleusercontent.com';

  static const web = FirebaseOptions(
    apiKey: 'AIzaSyD4kBkS848vFP4K0Fbo2yyG9j1VB77b2Qc',
    appId: '1:194400153115:web:fb48ed1a91854b74c612be',
    messagingSenderId: '194400153115',
    projectId: 'nana-store-8b0ab',
    authDomain: 'nana-store-8b0ab.firebaseapp.com',
    storageBucket: 'nana-store-8b0ab.firebasestorage.app',
  );

  static const android = FirebaseOptions(
    apiKey: 'AIzaSyCf0mzfIJmmqx2NHGoSgyTiMWpIC_vy3G0',
    appId: '1:194400153115:android:60392d72c555dc35c612be',
    messagingSenderId: '194400153115',
    projectId: 'nana-store-8b0ab',
    storageBucket: 'nana-store-8b0ab.firebasestorage.app',
  );

  static FirebaseOptions get current {
    return defaultTargetPlatform == TargetPlatform.android ? android : web;
  }
}
