import 'package:permission_handler/permission_handler.dart';

abstract final class NanaPermissions {
  static Future<void> requestAppAccess() {
    return [
      Permission.camera,
      Permission.microphone,
      Permission.photos,
      Permission.locationWhenInUse,
      Permission.bluetooth,
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
    ].request();
  }
}
