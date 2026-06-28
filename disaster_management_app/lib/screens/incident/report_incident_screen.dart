import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/widgets/custom_input.dart';
import '../../../core/widgets/custom_button.dart';
import '../../providers/incident/incident_provider.dart';

class ReportIncidentScreen extends ConsumerStatefulWidget {
  const ReportIncidentScreen({super.key});

  @override
  ConsumerState<ReportIncidentScreen> createState() => _ReportIncidentScreenState();
}

class _ReportIncidentScreenState extends ConsumerState<ReportIncidentScreen> {
  final TextEditingController titleController = TextEditingController();
  final TextEditingController descriptionController = TextEditingController();
  final TextEditingController locationController = TextEditingController();

  @override
  void dispose() {
    titleController.dispose();
    descriptionController.dispose();
    locationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Report Incident / الإبلاغ عن حادث')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(
              'Provide accurate details / قدّم تفاصيل دقيقة',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            CustomInput(controller: titleController, label: 'Title / العنوان'),
            SizedBox(height: 16),
            CustomInput(controller: descriptionController, label: 'Description / الوصف'),
            SizedBox(height: 16),
            CustomInput(controller: locationController, label: 'Location / الموقع'),
            SizedBox(height: 24),
            CustomButton(
              text: 'Submit Report / إرسال التقرير',
              onTap: () {
                ref.read(incidentControllerProvider).reportIncident(
                      title: titleController.text,
                      description: descriptionController.text,
                      location: locationController.text,
                    );
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Incident reported successfully / تم الإبلاغ عن الحادث')),
                );
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }
}