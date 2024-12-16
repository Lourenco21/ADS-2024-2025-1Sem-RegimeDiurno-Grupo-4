from django.test import TestCase, Client
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import Schedule, Characteristics
import json
import os

class ScheduleListViewTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        Schedule.objects.create(name="Test Schedule", file=SimpleUploadedFile("test.csv", b"dummy data"))

    def test_schedule_list_view(self):
        response = self.client.get(reverse('schedule_list'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'schedule_list.html')
        self.assertContains(response, "Test Schedule")

class UploadScheduleTestCase(TestCase):
    def setUp(self):
        self.client = Client()

    def test_upload_schedule(self):
        file = SimpleUploadedFile("test.csv", b"dummy data")
        response = self.client.post(reverse('upload_schedule'), {'file': file})
        self.assertRedirects(response, reverse('schedule_list'))
        self.assertEqual(Schedule.objects.count(), 1)
        self.assertEqual(Schedule.objects.first().name, "test.csv")

    def test_upload_invalid_file(self):
        file = SimpleUploadedFile("test.txt", b"dummy data")
        response = self.client.post(reverse('upload_schedule'), {'file': file})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Only CSV files are allowed!")
        self.assertEqual(Schedule.objects.count(), 0)


class ScheduleDetailViewTestCase(TestCase):
    def setUp(self):
        self.schedule = Schedule.objects.create(name="Test Schedule",file=SimpleUploadedFile("test.csv", b"dummy data"))
        self.characteristics = Characteristics.objects.create(name="Test Characteristics",file=SimpleUploadedFile("characteristics.csv",b"dummy data"))
        self.client = Client()

    def test_schedule_detail_view(self):
        response = self.client.get(reverse('schedule_detail', args=[self.schedule.id]))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'schedule_detail.html')
        self.assertContains(response, os.path.basename(self.schedule.file.name))
        self.assertContains(response, self.schedule.file.url)
        self.assertContains(response, self.characteristics.file.url)


class DeleteScheduleTestCase(TestCase):
    def setUp(self):
        self.schedule = Schedule.objects.create(name="Test Schedule", file=SimpleUploadedFile("test.csv", b"dummy data"))
        self.client = Client()

    def test_delete_schedule(self):
        response = self.client.post(reverse('delete_schedule', args=[self.schedule.id]))
        self.assertRedirects(response, reverse('schedule_list'))
        self.assertEqual(Schedule.objects.count(), 0)

class UpdateMetricsTestCase(TestCase):
    def setUp(self):
        self.schedule = Schedule.objects.create(name="Test Schedule", file=SimpleUploadedFile("test.csv", b"dummy data"))
        self.client = Client()

    def test_update_metrics(self):
        data = {
            "overcrowded": 5,
            "overlap": 3,
            "no_room": 2,
            "time_regulation": 1,
            "wrong_characteristics": 0
        }
        response = self.client.post(
            reverse('update_metrics', args=[self.schedule.id]),
            data=json.dumps(data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.overcrowded, 5)
        self.assertEqual(self.schedule.overlap, 3)