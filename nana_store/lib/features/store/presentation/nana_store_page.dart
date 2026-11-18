import 'dart:io';

import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/constants/nana_colors.dart';
import '../../../core/layout/nana_layout.dart';
import '../../shell/presentation/nana_admin_store.dart';

class NanaStorePage extends StatefulWidget {
  const NanaStorePage({super.key});

  @override
  State<NanaStorePage> createState() => _NanaStorePageState();
}

class _NanaStorePageState extends State<NanaStorePage> {
  final _picker = ImagePicker();
  late final TextEditingController _name;
  late final TextEditingController _address;
  late final TextEditingController _phone;
  late final TextEditingController _whatsapp;
  late final TextEditingController _email;
  var _ready = false;
  var _busy = false;
  String _logo = '';
  String _banner = '';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_ready) return;
    final profile = NanaAdminStoreScope.of(context).storeProfile;
    _name = TextEditingController(text: profile.name);
    _address = TextEditingController(text: profile.address);
    _phone = TextEditingController(text: profile.phone);
    _whatsapp = TextEditingController(text: profile.whatsapp);
    _email = TextEditingController(text: profile.email);
    _logo = profile.logo;
    _banner = profile.banner;
    _ready = true;
  }

  @override
  void dispose() {
    _name.dispose();
    _address.dispose();
    _phone.dispose();
    _whatsapp.dispose();
    _email.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final padding = NanaLayout.pagePadding(context);
    return ListView(
      padding: EdgeInsets.fromLTRB(padding, 12, padding, 28),
      children: [
        const Text('Datos públicos', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        const SizedBox(height: 10),
        TextField(controller: _name, decoration: const InputDecoration(labelText: 'Nombre de la tienda', filled: true, fillColor: Colors.white)),
        const SizedBox(height: 10),
        TextField(controller: _address, decoration: const InputDecoration(labelText: 'Dirección', filled: true, fillColor: Colors.white)),
        const SizedBox(height: 10),
        TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Teléfono', filled: true, fillColor: Colors.white)),
        const SizedBox(height: 10),
        TextField(controller: _whatsapp, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'WhatsApp', filled: true, fillColor: Colors.white)),
        const SizedBox(height: 10),
        TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Correo', filled: true, fillColor: Colors.white)),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: _ImageSlot(label: 'Logo', url: _logo, onPick: () => _pick('logo'))),
            const SizedBox(width: 10),
            Expanded(child: _ImageSlot(label: 'Banner', url: _banner, onPick: () => _pick('banner'))),
          ],
        ),
        const SizedBox(height: 18),
        FilledButton(
          onPressed: _busy ? null : _save,
          style: FilledButton.styleFrom(backgroundColor: NanaColors.pinkDark, minimumSize: const Size.fromHeight(48)),
          child: Text(_busy ? 'Guardando…' : 'Guardar tienda'),
        ),
      ],
    );
  }

  Future<void> _pick(String kind) async {
    final file = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 86);
    if (file == null) return;
    setState(() => _busy = true);
    try {
      final ref = FirebaseStorage.instance.ref('store/$kind-${DateTime.now().millisecondsSinceEpoch}.jpg');
      await ref.putFile(File(file.path));
      final url = await ref.getDownloadURL();
      setState(() {
        if (kind == 'logo') {
          _logo = url;
        } else {
          _banner = url;
        }
      });
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo subir la imagen.')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save() async {
    final store = NanaAdminStoreScope.of(context);
    setState(() => _busy = true);
    try {
      await store.saveStoreProfile(
        NanaStoreProfile(
          name: _name.text.trim(),
          address: _address.text.trim(),
          phone: _phone.text.trim(),
          whatsapp: _whatsapp.text.trim(),
          email: _email.text.trim(),
          logo: _logo,
          banner: _banner,
          videos: store.storeProfile.videos,
        ),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Tienda actualizada.')));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo guardar la tienda.')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

class _ImageSlot extends StatelessWidget {
  const _ImageSlot({required this.label, required this.url, required this.onPick});

  final String label;
  final String url;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onPick,
      borderRadius: BorderRadius.circular(18),
      child: Ink(
        height: 120,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: NanaColors.line),
        ),
        child: url.isEmpty
            ? Center(child: Text('Subir $label', style: const TextStyle(fontWeight: FontWeight.w800)))
            : ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Image.network(url, fit: BoxFit.cover),
              ),
      ),
    );
  }
}
