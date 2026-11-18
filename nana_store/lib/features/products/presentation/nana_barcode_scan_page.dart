import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../core/constants/nana_colors.dart';

class NanaBarcodeScanPage extends StatefulWidget {
  const NanaBarcodeScanPage({super.key});

  @override
  State<NanaBarcodeScanPage> createState() => _NanaBarcodeScanPageState();
}

class _NanaBarcodeScanPageState extends State<NanaBarcodeScanPage> {
  var _locked = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _prepare();
  }

  Future<void> _prepare() async {
    final status = await Permission.camera.request();
    if (!mounted) return;
    if (!status.isGranted) {
      setState(() => _error = 'Activa la cámara para escanear el código.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Escanear código', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: _error != null
          ? Center(child: Text(_error!, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)))
          : Stack(
              children: [
                MobileScanner(
                  onDetect: (capture) {
                    if (_locked) return;
                    final codes = capture.barcodes
                        .map((barcode) => barcode.rawValue?.trim())
                        .whereType<String>()
                        .where((code) => code.isNotEmpty);
                    if (codes.isEmpty) return;
                    final value = codes.first;
                    _locked = true;
                    Navigator.of(context).pop(value);
                  },
                ),
                Align(
                  alignment: Alignment.bottomCenter,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                    color: Colors.black54,
                    child: const Text(
                      'Apunta al código de barras o QR',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: NanaColors.cream, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
