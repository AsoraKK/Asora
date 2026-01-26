// ignore_for_file: public_member_api_docs

/// LYTHAUS DEVICE EMULATOR WIDGET
///
/// 🎯 Purpose: Phone-frame mock emulator for testing app flows
/// 🏗️ Architecture: Reusable widget for admin control panel
/// 🎨 Features: Device presets, scale control, orientation toggle
/// 📱 Platform: Flutter widget for web/desktop admin panel
library;

import 'package:flutter/material.dart';

/// Device presets with common resolutions
enum DevicePreset {
  iPhoneSE(320, 568, 'iPhone SE', 2.0),
  iPhone14(390, 844, 'iPhone 14', 3.0),
  iPhone14ProMax(430, 932, 'iPhone 14 Pro Max', 3.0),
  iPhone15Pro(393, 852, 'iPhone 15 Pro', 3.0),
  pixel7(412, 915, 'Pixel 7', 2.75),
  pixel8Pro(448, 998, 'Pixel 8 Pro', 3.0),
  galaxyS23(360, 780, 'Galaxy S23', 3.0),
  galaxyS24Ultra(384, 824, 'Galaxy S24 Ultra', 3.0);

  final double width;
  final double height;
  final String label;
  final double devicePixelRatio;

  const DevicePreset(
    this.width,
    this.height,
    this.label,
    this.devicePixelRatio,
  );
}

/// Orientation options for the device emulator
enum DeviceOrientation { portrait, landscape }

/// A widget that wraps content in a phone-frame overlay at realistic dimensions
class DeviceEmulator extends StatefulWidget {
  /// The app content to display inside the device frame
  final Widget child;

  /// Whether to show the control panel on the left
  final bool showControls;

  /// Initial device preset
  final DevicePreset initialDevice;

  /// Optional callback when device changes
  final ValueChanged<DevicePreset>? onDeviceChanged;

  /// Optional callback when orientation changes
  final ValueChanged<DeviceOrientation>? onOrientationChanged;

  const DeviceEmulator({
    super.key,
    required this.child,
    this.showControls = true,
    this.initialDevice = DevicePreset.iPhone14,
    this.onDeviceChanged,
    this.onOrientationChanged,
  });

  @override
  State<DeviceEmulator> createState() => _DeviceEmulatorState();
}

class _DeviceEmulatorState extends State<DeviceEmulator> {
  late DevicePreset _selectedDevice;
  DeviceOrientation _orientation = DeviceOrientation.portrait;
  double _scale = 0.75;
  bool _showNotch = true;
  bool _showHomeIndicator = true;

  @override
  void initState() {
    super.initState();
    _selectedDevice = widget.initialDevice;
  }

  double get _deviceWidth => _orientation == DeviceOrientation.portrait
      ? _selectedDevice.width
      : _selectedDevice.height;

  double get _deviceHeight => _orientation == DeviceOrientation.portrait
      ? _selectedDevice.height
      : _selectedDevice.width;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (widget.showControls) _buildControlPanel(),
        Expanded(
          child: Container(
            color: Colors.grey[200],
            child: Center(
              child: Transform.scale(scale: _scale, child: _buildDeviceFrame()),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildControlPanel() {
    final theme = Theme.of(context);

    return Container(
      width: 220,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          right: BorderSide(color: theme.colorScheme.outlineVariant),
        ),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Device Preview',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),

            // Device selector
            Text('Device', style: theme.textTheme.labelMedium),
            const SizedBox(height: 4),
            DropdownButtonFormField<DevicePreset>(
              value: _selectedDevice,
              isExpanded: true,
              decoration: const InputDecoration(
                isDense: true,
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
              ),
              items: DevicePreset.values.map((d) {
                return DropdownMenuItem(
                  value: d,
                  child: Text(
                    d.label,
                    style: const TextStyle(fontSize: 13),
                    overflow: TextOverflow.ellipsis,
                  ),
                );
              }).toList(),
              onChanged: (v) {
                if (v != null) {
                  setState(() => _selectedDevice = v);
                  widget.onDeviceChanged?.call(v);
                }
              },
            ),
            const SizedBox(height: 8),
            Text(
              '${_deviceWidth.toInt()} × ${_deviceHeight.toInt()} @ ${_selectedDevice.devicePixelRatio}x',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),

            const SizedBox(height: 20),

            // Orientation toggle
            Text('Orientation', style: theme.textTheme.labelMedium),
            const SizedBox(height: 8),
            SegmentedButton<DeviceOrientation>(
              segments: const [
                ButtonSegment(
                  value: DeviceOrientation.portrait,
                  icon: Icon(Icons.stay_current_portrait, size: 18),
                  label: Text('Portrait', style: TextStyle(fontSize: 11)),
                ),
                ButtonSegment(
                  value: DeviceOrientation.landscape,
                  icon: Icon(Icons.stay_current_landscape, size: 18),
                  label: Text('Landscape', style: TextStyle(fontSize: 11)),
                ),
              ],
              selected: {_orientation},
              onSelectionChanged: (selected) {
                setState(() => _orientation = selected.first);
                widget.onOrientationChanged?.call(_orientation);
              },
            ),

            const SizedBox(height: 20),

            // Scale slider
            Text(
              'Scale: ${(_scale * 100).toInt()}%',
              style: theme.textTheme.labelMedium,
            ),
            Slider(
              value: _scale,
              min: 0.25,
              max: 1.0,
              divisions: 15,
              onChanged: (v) => setState(() => _scale = v),
            ),

            const Divider(height: 32),

            // Device chrome options
            Text('Device Chrome', style: theme.textTheme.labelMedium),
            const SizedBox(height: 8),
            SwitchListTile(
              title: const Text(
                'Notch / Dynamic Island',
                style: TextStyle(fontSize: 13),
              ),
              value: _showNotch,
              dense: true,
              contentPadding: EdgeInsets.zero,
              onChanged: (v) => setState(() => _showNotch = v),
            ),
            SwitchListTile(
              title: const Text(
                'Home Indicator',
                style: TextStyle(fontSize: 13),
              ),
              value: _showHomeIndicator,
              dense: true,
              contentPadding: EdgeInsets.zero,
              onChanged: (v) => setState(() => _showHomeIndicator = v),
            ),

            const Divider(height: 32),

            // Quick info
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer.withValues(
                  alpha: 0.3,
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        size: 16,
                        color: theme.colorScheme.primary,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Preview Tips',
                        style: theme.textTheme.labelMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '• Use flow selector to switch screens\n'
                    '• Test different device sizes\n'
                    '• Rotate for landscape testing',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDeviceFrame() {
    const bezelWidth = 12.0;
    const notchHeight = 34.0;
    const homeIndicatorHeight = 5.0;
    const homeIndicatorPadding = 8.0;

    final topPadding = _showNotch ? notchHeight : 24.0;
    final bottomPadding = _showHomeIndicator
        ? (homeIndicatorHeight + homeIndicatorPadding * 2)
        : 20.0;

    return Container(
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(
          _orientation == DeviceOrientation.portrait ? 44 : 32,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.4),
            blurRadius: 30,
            offset: const Offset(0, 15),
          ),
        ],
      ),
      padding: const EdgeInsets.all(bezelWidth),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(
          _orientation == DeviceOrientation.portrait ? 32 : 22,
        ),
        child: SizedBox(
          width: _deviceWidth,
          height: _deviceHeight,
          child: Stack(
            children: [
              // App content with proper MediaQuery
              Positioned.fill(
                child: MediaQuery(
                  data: MediaQueryData(
                    size: Size(_deviceWidth, _deviceHeight),
                    padding: EdgeInsets.only(
                      top: topPadding,
                      bottom: bottomPadding,
                      left: _orientation == DeviceOrientation.landscape
                          ? 44
                          : 0,
                      right: _orientation == DeviceOrientation.landscape
                          ? 44
                          : 0,
                    ),
                    viewPadding: EdgeInsets.only(
                      top: topPadding,
                      bottom: bottomPadding,
                    ),
                    devicePixelRatio: _selectedDevice.devicePixelRatio,
                    textScaler: TextScaler.noScaling,
                    platformBrightness: Theme.of(context).brightness,
                  ),
                  child: widget.child,
                ),
              ),

              // Notch / Dynamic Island overlay
              if (_showNotch && _orientation == DeviceOrientation.portrait)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: Container(
                      width: 126,
                      height: notchHeight,
                      decoration: BoxDecoration(
                        color: Colors.black,
                        borderRadius: const BorderRadius.vertical(
                          bottom: Radius.circular(20),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.2),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      // Camera and sensors
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              color: Colors.grey[850],
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.grey[700]!,
                                width: 1.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

              // Landscape notch (left side)
              if (_showNotch && _orientation == DeviceOrientation.landscape)
                Positioned(
                  top: 0,
                  bottom: 0,
                  left: 0,
                  child: Center(
                    child: Container(
                      width: notchHeight,
                      height: 126,
                      decoration: const BoxDecoration(
                        color: Colors.black,
                        borderRadius: BorderRadius.horizontal(
                          right: Radius.circular(20),
                        ),
                      ),
                    ),
                  ),
                ),

              // Home indicator
              if (_showHomeIndicator)
                Positioned(
                  bottom: homeIndicatorPadding,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: Container(
                      width: _orientation == DeviceOrientation.portrait
                          ? 134
                          : 180,
                      height: homeIndicatorHeight,
                      decoration: BoxDecoration(
                        color: Colors.grey[400],
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
