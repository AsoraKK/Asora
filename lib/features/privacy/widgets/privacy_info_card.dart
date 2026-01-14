// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';

class PrivacyInfoCard extends StatelessWidget {
  const PrivacyInfoCard({super.key});

  static const _items = [
    (
      icon: Icons.policy_outlined,
      title: 'Privacy policy',
      body: 'Learn how we collect and use data across Lythaus surfaces.',
    ),
    (
      icon: Icons.verified_user_outlined,
      title: 'Data security',
      body:
          'We enforce encryption, device integrity checks, and telemetry monitoring.',
    ),
    (
      icon: Icons.mail_outline,
      title: 'Need help?',
      body: 'Contact privacy@asora.com for data-subject questions.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final primary = Theme.of(context).colorScheme.primary;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.info_outline, color: primary),
                const SizedBox(width: 12),
                Text(
                  'Privacy resources',
                  style: textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            for (var i = 0; i < _items.length; i++) ...[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(_items[i].icon, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _items[i].title,
                          style: textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(_items[i].body, style: textTheme.bodyMedium),
                      ],
                    ),
                  ),
                ],
              ),
              if (i < _items.length - 1) const SizedBox(height: 12),
            ],
          ],
        ),
      ),
    );
  }
}
