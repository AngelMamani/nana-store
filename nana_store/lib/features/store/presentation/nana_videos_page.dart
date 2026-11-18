import 'dart:io';

import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/constants/nana_colors.dart';
import '../../../core/layout/nana_layout.dart';
import '../../shell/presentation/nana_admin_store.dart';

const _slots = [
  ('hero', 'Video de campaña', 'Aparece después de la primera categoría.'),
  ('showcase', 'Video vitrina', 'Lookbook entre colecciones.'),
  ('story', 'Reel flotante', 'Burbuja Ver Reel en el inicio.'),
];

class NanaVideosPage extends StatefulWidget {
  const NanaVideosPage({super.key});

  @override
  State<NanaVideosPage> createState() => _NanaVideosPageState();
}

class _NanaVideosPageState extends State<NanaVideosPage> {
  final _picker = ImagePicker();
  String? _busyKey;

  @override
  Widget build(BuildContext context) {
    final store = NanaAdminStoreScope.of(context);
    final padding = NanaLayout.pagePadding(context);

    return ListView(
      padding: EdgeInsets.fromLTRB(padding, 12, padding, 24),
      children: [
        for (final slot in _slots)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _VideoCard(
              title: slot.$2,
              hint: slot.$3,
              url: store.storeProfile.videos[slot.$1]?['url']?.toString(),
              enabled: store.storeProfile.videos[slot.$1]?['enabled'] != false,
              busy: _busyKey == slot.$1,
              onToggle: () => _toggle(store, slot.$1),
              onPick: () => _upload(store, slot.$1),
            ),
          ),
      ],
    );
  }

  Future<void> _toggle(NanaAdminStore store, String key) async {
    final enabled = store.storeProfile.videos[key]?['enabled'] != false;
    setState(() => _busyKey = key);
    try {
      await store.saveStoreVideo(key, enabled: !enabled);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo actualizar el video.')));
    } finally {
      if (mounted) setState(() => _busyKey = null);
    }
  }

  Future<void> _upload(NanaAdminStore store, String key) async {
    final file = await _picker.pickVideo(source: ImageSource.gallery);
    if (file == null) return;
    setState(() => _busyKey = key);
    try {
      final ref = FirebaseStorage.instance.ref('store/videos/$key-${DateTime.now().millisecondsSinceEpoch}.mp4');
      await ref.putFile(File(file.path));
      final url = await ref.getDownloadURL();
      await store.saveStoreVideo(key, url: url, enabled: true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo subir el video.')));
    } finally {
      if (mounted) setState(() => _busyKey = null);
    }
  }
}

class _VideoCard extends StatelessWidget {
  const _VideoCard({
    required this.title,
    required this.hint,
    required this.url,
    required this.enabled,
    required this.busy,
    required this.onToggle,
    required this.onPick,
  });

  final String title;
  final String hint;
  final String? url;
  final bool enabled;
  final bool busy;
  final VoidCallback onToggle;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16))),
                Switch(value: enabled, onChanged: busy ? null : (_) => onToggle()),
              ],
            ),
            Text(hint, style: const TextStyle(color: NanaColors.muted, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text(
              url == null || url!.isEmpty ? 'Sin video personalizado' : 'Video cargado',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            FilledButton.icon(
              onPressed: busy ? null : onPick,
              icon: busy ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.upload_rounded),
              label: const Text('Subir video'),
              style: FilledButton.styleFrom(backgroundColor: NanaColors.pinkDark),
            ),
          ],
        ),
      ),
    );
  }
}
