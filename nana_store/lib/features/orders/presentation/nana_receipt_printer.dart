import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;
import 'package:permission_handler/permission_handler.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/constants/nana_assets.dart';
import '../../../core/constants/nana_colors.dart';
import 'nana_receipt.dart';

const _printerMacKey = 'nana-thermal-printer-mac';

const _pc850 = {
  'Á': 0xb5,
  'É': 0x90,
  'Í': 0xd6,
  'Ó': 0xe0,
  'Ú': 0xe9,
  'Ü': 0x9a,
  'Ñ': 0xa5,
  'á': 0xa0,
  'é': 0x82,
  'í': 0xa1,
  'ó': 0xa2,
  'ú': 0xa3,
  'ü': 0x81,
  'ñ': 0xa4,
  '¿': 0xa8,
  '¡': 0xad,
  '°': 0xf8,
  'º': 0xa7,
  'ª': 0xa6,
  '·': 0xfa,
};

int _encodeChar(String char) {
  final mapped = _pc850[char];
  if (mapped != null) return mapped;
  final code = char.codeUnitAt(0);
  if (code < 128) return code;
  return 0x3f;
}

Uint8List _encodeLine(String text) {
  final codes = <int>[];
  for (final rune in text.runes) {
    codes.add(_encodeChar(String.fromCharCode(rune)));
  }
  codes.add(0x0a);
  return Uint8List.fromList(codes);
}

Uint8List _concat(List<Uint8List> chunks) {
  final size = chunks.fold<int>(0, (acc, chunk) => acc + chunk.length);
  final bytes = Uint8List(size);
  var offset = 0;
  for (final chunk in chunks) {
    bytes.setAll(offset, chunk);
    offset += chunk.length;
  }
  return bytes;
}

Future<Uint8List?> _encodeLogo(String url) async {
  try {
    Uint8List raw;
    if (url.startsWith('http')) {
      final client = HttpClient();
      final request = await client.getUrl(Uri.parse(url));
      final response = await request.close();
      final builder = BytesBuilder(copy: false);
      await for (final chunk in response) {
        builder.add(chunk);
      }
      client.close(force: true);
      raw = builder.takeBytes();
    } else {
      raw = (await rootBundle.load(url)).buffer.asUint8List();
    }
    final decoded = img.decodeImage(raw);
    if (decoded == null) return null;
    const paper = 384;
    final scale = paper / decoded.width;
    final width = paper;
    final height = (decoded.height * scale).round().clamp(8, 384);
    final resized = img.copyResize(decoded, width: width, height: height);
    final bytesPerRow = (width / 8).ceil();
    final canvasWidth = bytesPerRow * 8;
    final raster = Uint8List(bytesPerRow * height);
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < canvasWidth; x++) {
        if (x >= resized.width) continue;
        final pixel = resized.getPixel(x, y);
        final luma = pixel.r * 0.3 + pixel.g * 0.59 + pixel.b * 0.11;
        if (pixel.a > 40 && luma < 168) {
          raster[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
        }
      }
    }
    return _concat([
      Uint8List.fromList([
        0x1d,
        0x76,
        0x30,
        0x00,
        bytesPerRow & 0xff,
        (bytesPerRow >> 8) & 0xff,
        height & 0xff,
        (height >> 8) & 0xff,
      ]),
      raster,
      Uint8List.fromList([0x0a]),
    ]);
  } catch (_) {
    return null;
  }
}

Future<Uint8List> encodeReceipt(NanaReceiptTicket ticket) async {
  final chunks = <Uint8List>[
    Uint8List.fromList([0x1b, 0x40]),
    Uint8List.fromList([0x1b, 0x74, 0x02]),
    Uint8List.fromList([0x1b, 0x61, 0x01]),
  ];
  final logoUrl = ticket.storeLogo.isNotEmpty ? ticket.storeLogo : NanaAssets.logo;
  final logo = await _encodeLogo(logoUrl);
  if (logo != null) chunks.add(logo);
  chunks.add(Uint8List.fromList([0x1d, 0x21, 0x10]));
  chunks.add(_encodeLine('BOLETA SIMPLE'));
  chunks.add(Uint8List.fromList([0x1d, 0x21, 0x00]));
  chunks.add(Uint8List.fromList([0x1b, 0x61, 0x00]));
  for (final line in receiptBodyLines(ticket)) {
    if (line.startsWith('TOTAL')) {
      chunks.add(Uint8List.fromList([0x1b, 0x45, 0x01]));
      chunks.add(_encodeLine(line));
      chunks.add(Uint8List.fromList([0x1b, 0x45, 0x00]));
      continue;
    }
    chunks.add(_encodeLine(line));
  }
  chunks.add(Uint8List.fromList([0x0a]));
  chunks.add(Uint8List.fromList([0x1d, 0x56, 0x41, 0x10]));
  return _concat(chunks);
}

Future<void> printNanaReceipt(NanaReceiptTicket ticket, {BuildContext? context}) async {
  if (Platform.isAndroid) {
    await Permission.bluetoothConnect.request();
    await Permission.bluetoothScan.request();
  }
  var linked = await PrintBluetoothThermal.connectionStatus;
  if (!linked) {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_printerMacKey);
    if (saved != null && saved.isNotEmpty) {
      linked = await PrintBluetoothThermal.connect(macPrinterAddress: saved);
    }
  }
  if (!linked) {
    if (context == null || !context.mounted) {
      throw StateError('Empareja la POS58 por Bluetooth (PIN 0000) y vuelve a imprimir.');
    }
    final mac = await _pickPrinter(context);
    if (mac == null || mac.isEmpty) {
      throw StateError('cancel');
    }
    linked = await PrintBluetoothThermal.connect(macPrinterAddress: mac);
    if (linked) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_printerMacKey, mac);
    }
  }
  if (!linked) {
    throw StateError('No se pudo vincular la POS58. PIN 0000.');
  }
  final bytes = await encodeReceipt(ticket);
  final sent = await PrintBluetoothThermal.writeBytes(bytes);
  if (!sent) {
    throw StateError('La POS58 no recibió la boleta.');
  }
}

Future<void> connectNanaPrinter(BuildContext context) async {
  if (Platform.isAndroid) {
    await Permission.bluetoothConnect.request();
    await Permission.bluetoothScan.request();
  }
  if (!context.mounted) return;
  final mac = await _pickPrinter(context);
  if (mac == null || mac.isEmpty) return;
  final linked = await PrintBluetoothThermal.connect(macPrinterAddress: mac);
  if (!linked) throw StateError('No se pudo vincular la POS58.');
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_printerMacKey, mac);
}

Future<String?> _pickPrinter(BuildContext context) async {
  final devices = await PrintBluetoothThermal.pairedBluetooths;
  if (!context.mounted) return null;
  if (devices.isEmpty) {
    await showDialog<void>(
      context: context,
      builder: (context) => const AlertDialog(
        title: Text('POS58 no encontrada'),
        content: Text('Empareja la impresora en Bluetooth del celular (PIN 0000) y vuelve a intentar.'),
      ),
    );
    return null;
  }
  return showModalBottomSheet<String>(
    context: context,
    showDragHandle: true,
    builder: (context) {
      return SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const ListTile(title: Text('Elegir POS58', style: TextStyle(fontWeight: FontWeight.w800))),
            for (final device in devices)
              ListTile(
                leading: const Icon(Icons.print_rounded, color: NanaColors.pinkDark),
                title: Text(device.name.isEmpty ? 'Impresora' : device.name),
                subtitle: Text(device.macAdress),
                onTap: () => Navigator.pop(context, device.macAdress),
              ),
          ],
        ),
      );
    },
  );
}
