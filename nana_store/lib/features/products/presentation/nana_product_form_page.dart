import 'dart:io';

import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/constants/nana_colors.dart';
import '../../shell/presentation/nana_admin_store.dart';
import 'nana_barcode_scan_page.dart';

class NanaProductFormPage extends StatefulWidget {
  const NanaProductFormPage({super.key, this.product, this.initialCode});

  final NanaProduct? product;
  final String? initialCode;

  @override
  State<NanaProductFormPage> createState() => _NanaProductFormPageState();
}

class _NanaProductFormPageState extends State<NanaProductFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _picker = ImagePicker();
  late final TextEditingController _name;
  late final TextEditingController _code;
  late final TextEditingController _description;
  late final TextEditingController _price;
  late final TextEditingController _promo;
  late final TextEditingController _cost;
  late final TextEditingController _fillStock;
  late final String _productId;
  String? _categoryId;
  var _pin = false;
  var _busy = false;
  String? _videoUrl;
  String? _localVideo;
  final _gallery = <_Shot>[];
  final _colors = <TextEditingController>[];
  final _sizes = <TextEditingController>[];
  final _stocks = <String, TextEditingController>{};

  @override
  void initState() {
    super.initState();
    final product = widget.product;
    _productId = product?.id ?? 'prd_${DateTime.now().millisecondsSinceEpoch}';
    _name = TextEditingController(text: product?.name ?? '');
    _code = TextEditingController(text: product?.code ?? widget.initialCode ?? '');
    _description = TextEditingController(text: product?.description ?? '');
    _price = TextEditingController(text: product == null ? '' : product.price.toStringAsFixed(2));
    _promo = TextEditingController(text: product?.promotionalPrice?.toStringAsFixed(2) ?? '');
    _cost = TextEditingController(text: product?.cost?.toStringAsFixed(2) ?? '');
    _fillStock = TextEditingController();
    _categoryId = product?.categoryId;
    _pin = product?.pin ?? false;
    _videoUrl = product?.video;
    for (final url in product?.gallery ?? const <String>[]) {
      _gallery.add(_Shot.url(url));
    }
    if (_gallery.isEmpty && product?.image != null) {
      _gallery.add(_Shot.url(product!.image!));
    }
    final colors = product?.colors ?? const <String>[];
    final sizes = product?.sizes ?? const <String>[];
    if (colors.isEmpty && sizes.isEmpty) {
      _colors.add(TextEditingController());
      _sizes.add(TextEditingController());
    } else {
      for (final color in colors) {
        _colors.add(TextEditingController(text: color));
      }
      for (final size in sizes) {
        _sizes.add(TextEditingController(text: size));
      }
    }
    product?.stocks.forEach((key, value) {
      _stocks[key] = TextEditingController(text: value?.toString() ?? '');
    });
  }

  @override
  void dispose() {
    _name.dispose();
    _code.dispose();
    _description.dispose();
    _price.dispose();
    _promo.dispose();
    _cost.dispose();
    _fillStock.dispose();
    for (final controller in _colors) {
      controller.dispose();
    }
    for (final controller in _sizes) {
      controller.dispose();
    }
    for (final controller in _stocks.values) {
      controller.dispose();
    }
    super.dispose();
  }

  List<String> get _namedColors => _colors.map((item) => item.text.trim()).where((item) => item.isNotEmpty).toList();
  List<String> get _namedSizes => _sizes.map((item) => item.text.trim()).where((item) => item.isNotEmpty).toList();

  @override
  Widget build(BuildContext context) {
    final store = NanaAdminStoreScope.of(context);
    final editing = widget.product != null;
    _categoryId ??= store.categories.isEmpty ? null : store.categories.first.id;
    final combos = _comboKeys();

    return Scaffold(
      backgroundColor: NanaColors.cream,
      appBar: AppBar(
        title: Text(editing ? 'Editar prenda' : 'Nueva prenda', style: const TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          children: [
            const Text('Fotos', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: NanaColors.ink)),
            const SizedBox(height: 4),
            const Text('Puedes subir varias. La primera es la principal.', style: TextStyle(fontWeight: FontWeight.w600, color: NanaColors.muted)),
            const SizedBox(height: 10),
            SizedBox(
              height: 118,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _AddShot(label: 'Cámara', icon: Icons.photo_camera_outlined, onTap: () => _pickShot(ImageSource.camera)),
                  _AddShot(label: 'Galería', icon: Icons.photo_library_outlined, onTap: () => _pickMany()),
                  for (var index = 0; index < _gallery.length; index++)
                    _ShotThumb(
                      shot: _gallery[index],
                      principal: index == 0,
                      onPrincipal: () => setState(() {
                        final shot = _gallery.removeAt(index);
                        _gallery.insert(0, shot);
                      }),
                      onRemove: () => setState(() => _gallery.removeAt(index)),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _field(_name, 'Nombre', requiredField: true),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: _field(_code, 'Código')),
                const SizedBox(width: 8),
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: FilledButton.tonal(
                    onPressed: _busy ? null : _scanCode,
                    style: FilledButton.styleFrom(
                      backgroundColor: NanaColors.soft,
                      foregroundColor: NanaColors.pinkDark,
                      minimumSize: const Size(112, 52),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: const Text('Escanear'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: store.categories.any((item) => item.id == _categoryId) ? _categoryId : null,
              items: [
                for (final category in store.categories)
                  DropdownMenuItem(value: category.id, child: Text(category.name)),
              ],
              onChanged: _busy ? null : (value) => setState(() => _categoryId = value),
              decoration: _decoration('Categoría'),
            ),
            const SizedBox(height: 12),
            _field(_description, 'Descripción', maxLines: 3),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _field(_cost, 'Costo S/', number: true, onChanged: _onCost)),
                const SizedBox(width: 10),
                Expanded(child: _field(_price, 'Precio S/', requiredField: true, number: true)),
              ],
            ),
            const SizedBox(height: 12),
            _field(_promo, 'Oferta S/', number: true),
            const SizedBox(height: 8),
            Text(
              'Recomendación: ganancia 50% (costo × 2).',
              style: TextStyle(fontWeight: FontWeight.w600, color: NanaColors.muted.withValues(alpha: 0.95)),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                const Expanded(
                  child: Text('Colores, tallas y stock', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: NanaColors.ink)),
                ),
                TextButton(onPressed: () => setState(() => _colors.add(TextEditingController())), child: const Text('+ Color')),
                TextButton(onPressed: () => setState(() => _sizes.add(TextEditingController())), child: const Text('+ Talla')),
              ],
            ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (var index = 0; index < _colors.length; index++)
                  _ChipField(
                    controller: _colors[index],
                    hint: 'Color',
                    onChanged: () => setState(() {}),
                    onRemove: () => setState(() {
                      _colors.removeAt(index).dispose();
                    }),
                  ),
                for (var index = 0; index < _sizes.length; index++)
                  _ChipField(
                    controller: _sizes[index],
                    hint: 'Talla',
                    onChanged: () => setState(() {}),
                    onRemove: () => setState(() {
                      _sizes.removeAt(index).dispose();
                    }),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _field(_fillStock, 'Poner en todas', number: true)),
                const SizedBox(width: 8),
                FilledButton.tonal(
                  onPressed: () {
                    for (final key in combos) {
                      _stockCtrl(key).text = _fillStock.text.trim();
                    }
                    setState(() {});
                  },
                  child: const Text('Aplicar'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (combos.isEmpty)
              const Text('Agrega al menos un color o una talla.', style: TextStyle(fontWeight: FontWeight.w700, color: NanaColors.pinkDark))
            else
              ...[
                for (final key in combos)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: TextFormField(
                      controller: _stockCtrl(key),
                      keyboardType: TextInputType.number,
                      decoration: _decoration(
                        'Stock ${key.replaceAll('Color:', '').replaceAll('Tamaño:', '').replaceAll('|', ' · ')}',
                      ),
                    ),
                  ),
              ],
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _busy ? null : _pickVideo,
              icon: const Icon(Icons.videocam_outlined),
              label: Text(_videoUrl != null || _localVideo != null ? 'Cambiar video' : 'Subir video'),
            ),
            if (_videoUrl != null || _localVideo != null)
              TextButton(
                onPressed: () => setState(() {
                  _videoUrl = null;
                  _localVideo = null;
                }),
                child: const Text('Quitar video'),
              ),
            SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              title: const Text('Destacar en la tienda', style: TextStyle(fontWeight: FontWeight.w800)),
              subtitle: const Text('Sale primero en su categoría'),
              value: _pin,
              activeThumbColor: NanaColors.pinkDark,
              onChanged: _busy ? null : (value) => setState(() => _pin = value),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: _busy ? null : () => _save(store),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                backgroundColor: NanaColors.pinkDark,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: Text(_busy ? 'Guardando…' : 'Guardar producto'),
            ),
          ],
        ),
      ),
    );
  }

  List<String> _comboKeys() {
    final colors = _namedColors.isEmpty ? <String?>[null] : _namedColors.cast<String?>();
    final sizes = _namedSizes.isEmpty ? <String?>[null] : _namedSizes.cast<String?>();
    final keys = <String>[];
    for (final color in colors) {
      for (final size in sizes) {
        final options = <Map<String, String>>[
          if (color != null) {'name': 'Color', 'title': color},
          if (size != null) {'name': 'Tamaño', 'title': size},
        ];
        if (options.isEmpty) continue;
        keys.add(variantOptionKey(options));
      }
    }
    return keys;
  }

  TextEditingController _stockCtrl(String key) {
    return _stocks.putIfAbsent(key, () => TextEditingController());
  }

  void _onCost(String value) {
    final cost = double.tryParse(value.replaceAll(',', '.'));
    if (cost == null) return;
    final suggested = (cost * 2).toStringAsFixed(2);
    if (_price.text.trim().isEmpty) {
      _price.text = suggested;
    }
  }

  InputDecoration _decoration(String label) {
    return InputDecoration(
      labelText: label,
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: NanaColors.pink, width: 1.4),
      ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String label, {
    bool requiredField = false,
    bool number = false,
    int maxLines = 1,
    ValueChanged<String>? onChanged,
  }) {
    return TextFormField(
      controller: controller,
      enabled: !_busy,
      maxLines: maxLines,
      onChanged: onChanged,
      keyboardType: number ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
      decoration: _decoration(label),
      validator: (value) {
        if (requiredField && (value == null || value.trim().isEmpty)) return 'Obligatorio';
        if (number && requiredField && double.tryParse(value!.replaceAll(',', '.')) == null) return 'Número válido';
        return null;
      },
    );
  }

  Future<void> _scanCode() async {
    final code = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const NanaBarcodeScanPage()),
    );
    if (code == null || !mounted) return;
    setState(() => _code.text = code);
  }

  Future<void> _pickShot(ImageSource source) async {
    final file = await _picker.pickImage(source: source, imageQuality: 82);
    if (file == null) return;
    setState(() => _gallery.add(_Shot.file(file.path)));
  }

  Future<void> _pickMany() async {
    final files = await _picker.pickMultiImage(imageQuality: 82);
    if (files.isEmpty) return;
    setState(() {
      for (final file in files) {
        _gallery.add(_Shot.file(file.path));
      }
    });
  }

  Future<void> _pickVideo() async {
    final file = await _picker.pickVideo(source: ImageSource.gallery);
    if (file == null) return;
    setState(() => _localVideo = file.path);
  }

  Future<void> _save(NanaAdminStore store) async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_namedColors.isEmpty && _namedSizes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Agrega al menos un color o una talla.')));
      return;
    }
    setState(() => _busy = true);
    try {
      final gallery = <String>[];
      for (var index = 0; index < _gallery.length; index++) {
        final shot = _gallery[index];
        if (shot.url != null) {
          gallery.add(shot.url!);
          continue;
        }
        final ref = FirebaseStorage.instance.ref('products/$_productId/${DateTime.now().millisecondsSinceEpoch}-$index.jpg');
        await ref.putFile(File(shot.path!));
        gallery.add(await ref.getDownloadURL());
      }
      String? video = _videoUrl;
      if (_localVideo != null) {
        final ref = FirebaseStorage.instance.ref('products/$_productId/videos/${DateTime.now().millisecondsSinceEpoch}.mp4');
        await ref.putFile(File(_localVideo!));
        video = await ref.getDownloadURL();
      }
      final stocks = {for (final key in _comboKeys()) key: _stockCtrl(key).text};
      await store.saveProduct(
        existing: widget.product,
        id: _productId,
        name: _name.text,
        code: _code.text,
        description: _description.text,
        categoryId: _categoryId,
        gallery: gallery,
        video: video,
        colors: _namedColors,
        sizes: _namedSizes,
        stocks: stocks,
        price: double.parse(_price.text.replaceAll(',', '.')),
        promotionalPrice: _promo.text.trim().isEmpty ? null : double.tryParse(_promo.text.replaceAll(',', '.')),
        cost: _cost.text.trim().isEmpty ? null : double.tryParse(_cost.text.replaceAll(',', '.')),
        pin: _pin,
      );
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo guardar el producto.')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

class _Shot {
  const _Shot.url(this.url) : path = null;
  const _Shot.file(this.path) : url = null;
  final String? url;
  final String? path;
}

class _AddShot extends StatelessWidget {
  const _AddShot({required this.label, required this.icon, required this.onTap});

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          width: 92,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: NanaColors.line),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: NanaColors.pinkDark),
              const SizedBox(height: 6),
              Text(label, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
            ],
          ),
        ),
      ),
    );
  }
}

class _ShotThumb extends StatelessWidget {
  const _ShotThumb({required this.shot, required this.principal, required this.onPrincipal, required this.onRemove});

  final _Shot shot;
  final bool principal;
  final VoidCallback onPrincipal;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final image = shot.path != null
        ? Image.file(File(shot.path!), fit: BoxFit.cover, width: 110, height: 118)
        : Image.network(shot.url!, fit: BoxFit.cover, width: 110, height: 118);
    return Padding(
      padding: const EdgeInsets.only(right: 10),
      child: SizedBox(
        width: 110,
        child: Stack(
          children: [
            ClipRRect(borderRadius: BorderRadius.circular(18), child: image),
            if (principal)
              const Positioned(
                left: 6,
                top: 6,
                child: _MiniBadge('Principal'),
              ),
            Positioned(
              right: 4,
              top: 4,
              child: IconButton.filledTonal(
                visualDensity: VisualDensity.compact,
                onPressed: onRemove,
                icon: const Icon(Icons.close, size: 16),
              ),
            ),
            if (!principal)
              Positioned(
                left: 4,
                bottom: 4,
                child: TextButton(
                  onPressed: onPrincipal,
                  child: const Text('Principal', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _MiniBadge extends StatelessWidget {
  const _MiniBadge(this.label);
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: NanaColors.pinkDark, borderRadius: BorderRadius.circular(99)),
      child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
    );
  }
}

class _ChipField extends StatelessWidget {
  const _ChipField({required this.controller, required this.hint, required this.onChanged, required this.onRemove});

  final TextEditingController controller;
  final String hint;
  final VoidCallback onChanged;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 140,
      child: TextField(
        controller: controller,
        onChanged: (_) => onChanged(),
        decoration: InputDecoration(
          hintText: hint,
          filled: true,
          fillColor: Colors.white,
          suffixIcon: IconButton(onPressed: onRemove, icon: const Icon(Icons.close, size: 16)),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
        ),
      ),
    );
  }
}
