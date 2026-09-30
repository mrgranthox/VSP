import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_theme.dart';

class VspTextField extends StatefulWidget {
  final TextEditingController? controller;
  final String? label;
  final String? hintText;
  final String? hint;
  final String? initialValue;
  final bool isPassword;
  final TextInputType keyboardType;
  final String? Function(String?)? validator;
  final void Function(String)? onChanged;
  final dynamic prefixIcon;
  final Widget? suffix;
  final int maxLines;
  final bool readOnly;
  final VoidCallback? onTap;

  const VspTextField({
    super.key,
    this.controller,
    this.label,
    this.hintText,
    this.hint,
    this.initialValue,
    this.isPassword = false,
    this.keyboardType = TextInputType.text,
    this.validator,
    this.onChanged,
    this.prefixIcon,
    this.suffix,
    this.maxLines = 1,
    this.readOnly = false,
    this.onTap,
  });

  @override
  State<VspTextField> createState() => _VspTextFieldState();
}

class _VspTextFieldState extends State<VspTextField> {
  bool _obscureText = true;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.label != null) ...[
          Text(
            widget.label!,
            style: (theme.textTheme.labelMedium ?? const TextStyle()).copyWith(
              fontWeight: FontWeight.w700,
              color: colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: AppTheme.spacingXxs + 2),
        ],
        TextFormField(
          controller: widget.controller,
          initialValue: widget.initialValue,
          obscureText: widget.isPassword && _obscureText,
          keyboardType: widget.keyboardType,
          validator: widget.validator,
          onChanged: widget.onChanged,
          maxLines: widget.isPassword ? 1 : widget.maxLines,
          readOnly: widget.readOnly,
          onTap: widget.onTap,
          style: (theme.textTheme.bodyMedium ?? const TextStyle()).copyWith(
            color: colorScheme.onSurface,
          ),
          decoration: InputDecoration(
            hintText: widget.hint ?? widget.hintText,
            prefixIcon: widget.prefixIcon is IconData
                ? Icon(
                    widget.prefixIcon as IconData,
                    size: 20,
                    color: colorScheme.onSurfaceVariant,
                  )
                : (widget.prefixIcon is Widget ? widget.prefixIcon as Widget : null),
            suffixIcon: widget.isPassword
                ? IconButton(
                    tooltip: _obscureText ? 'Show password' : 'Hide password',
                    icon: Icon(
                      _obscureText
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                      size: 20,
                      color: colorScheme.onSurfaceVariant,
                    ),
                    onPressed: () {
                      HapticFeedback.selectionClick();
                      setState(() {
                        _obscureText = !_obscureText;
                      });
                    },
                  )
                : widget.suffix,
          ),
        ),
      ],
    );
  }
}
