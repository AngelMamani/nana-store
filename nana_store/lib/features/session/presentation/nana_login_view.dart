import 'package:flutter/material.dart';

import '../../../core/constants/nana_assets.dart';
import '../../../core/constants/nana_colors.dart';

class NanaLoginView extends StatefulWidget {
  const NanaLoginView({
    super.key,
    required this.busy,
    required this.error,
    required this.onSubmit,
    required this.onGoogle,
  });

  final bool busy;
  final String? error;
  final Future<void> Function(String email, String password) onSubmit;
  final Future<void> Function() onGoogle;

  @override
  State<NanaLoginView> createState() => _NanaLoginViewState();
}

class _NanaLoginViewState extends State<NanaLoginView> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  var _hidePassword = true;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    await widget.onSubmit(_email.text.trim(), _password.text);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NanaColors.cream,
      body: DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFFB6D5), NanaColors.cream],
        ),
      ),
      child: Stack(
        children: [
          const Positioned(top: -80, right: -50, child: _GlowBlob(size: 240, opacity: 0.28)),
          const Positioned(bottom: 40, left: -90, child: _GlowBlob(size: 280, opacity: 0.2)),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(22, 16, 22, 24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Column(
                    children: [
                      Container(
                        width: 168,
                        height: 168,
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(36),
                          boxShadow: [
                            BoxShadow(
                              color: NanaColors.pinkDark.withValues(alpha: 0.22),
                              blurRadius: 28,
                              offset: const Offset(0, 12),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(30),
                          child: Image.asset(
                            NanaAssets.logo,
                            fit: BoxFit.cover,
                            semanticLabel: 'NaNa',
                            errorBuilder: (_, _, _) => const Icon(
                              Icons.storefront_rounded,
                              size: 72,
                              color: NanaColors.pinkDark,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      const Text(
                        'NaNa Admin',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          color: NanaColors.ink,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Entra para pedidos, caja e inventario.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: NanaColors.muted,
                        ),
                      ),
                      const SizedBox(height: 22),
                      Container(
                        padding: const EdgeInsets.fromLTRB(18, 20, 18, 18),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [
                            BoxShadow(
                              color: NanaColors.ink.withValues(alpha: 0.06),
                              blurRadius: 24,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            children: [
                              TextFormField(
                                controller: _email,
                                keyboardType: TextInputType.emailAddress,
                                autofillHints: const [AutofillHints.email],
                                enabled: !widget.busy,
                                decoration: _fieldDecoration('Correo', Icons.mail_outline_rounded),
                                validator: (value) {
                                  if (value == null || !value.contains('@')) {
                                    return 'Escribe un correo válido.';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 12),
                              TextFormField(
                                controller: _password,
                                obscureText: _hidePassword,
                                enabled: !widget.busy,
                                autofillHints: const [AutofillHints.password],
                                decoration: _fieldDecoration(
                                  'Contraseña',
                                  Icons.lock_outline_rounded,
                                  suffix: IconButton(
                                    onPressed: () => setState(() => _hidePassword = !_hidePassword),
                                    icon: Icon(
                                      _hidePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                      color: NanaColors.muted,
                                    ),
                                  ),
                                ),
                                validator: (value) {
                                  if (value == null || value.length < 6) {
                                    return 'Escribe tu contraseña.';
                                  }
                                  return null;
                                },
                                onFieldSubmitted: (_) => _submit(),
                              ),
                              if (widget.error != null) ...[
                                const SizedBox(height: 12),
                                Text(
                                  widget.error!,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    color: Color(0xFFC81E1E),
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                              const SizedBox(height: 16),
                              SizedBox(
                                width: double.infinity,
                                height: 52,
                                child: FilledButton(
                                  onPressed: widget.busy ? null : _submit,
                                  style: FilledButton.styleFrom(
                                    backgroundColor: NanaColors.pinkDark,
                                    foregroundColor: Colors.white,
                                    disabledBackgroundColor: NanaColors.line,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                  ),
                                  child: Text(
                                    widget.busy ? 'Entrando…' : 'Iniciar sesión',
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 14),
                              const Row(
                                children: [
                                  Expanded(child: Divider(color: NanaColors.line)),
                                  Padding(
                                    padding: EdgeInsets.symmetric(horizontal: 10),
                                    child: Text(
                                      'o continúa con',
                                      style: TextStyle(fontWeight: FontWeight.w700, color: NanaColors.muted, fontSize: 12),
                                    ),
                                  ),
                                  Expanded(child: Divider(color: NanaColors.line)),
                                ],
                              ),
                              const SizedBox(height: 14),
                              SizedBox(
                                width: double.infinity,
                                height: 52,
                                child: OutlinedButton.icon(
                                  onPressed: widget.busy ? null : widget.onGoogle,
                                  icon: const Icon(Icons.g_mobiledata_rounded, size: 28, color: NanaColors.ink),
                                  label: const Text(
                                    'Continuar con Google',
                                    style: TextStyle(fontWeight: FontWeight.w800, color: NanaColors.ink),
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: NanaColors.line, width: 1.4),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      const Text(
                        'Puerto Maldonado',
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          color: NanaColors.pinkDark,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      ),
    );
  }

  InputDecoration _fieldDecoration(String label, IconData icon, {Widget? suffix}) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(fontWeight: FontWeight.w700, color: NanaColors.muted),
      prefixIcon: Icon(icon, color: NanaColors.pinkDark),
      suffixIcon: suffix,
      filled: true,
      fillColor: NanaColors.cream,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: NanaColors.pink, width: 1.4),
      ),
    );
  }
}

class _GlowBlob extends StatelessWidget {
  const _GlowBlob({required this.size, required this.opacity});

  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: NanaColors.pink.withValues(alpha: opacity),
        ),
      ),
    );
  }
}
