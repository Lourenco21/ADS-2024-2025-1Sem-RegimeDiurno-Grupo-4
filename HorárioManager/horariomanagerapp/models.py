# Create your models here.
from django.db import models
from django.contrib.auth.models import User
from django.utils.timezone import now


class Schedule(models.Model):
    name = models.CharField(max_length=200)  # Schedule name
    file = models.FileField(upload_to='schedules/')  # Upload path
    uploaded_at = models.DateTimeField(auto_now_add=True)  # Timestamp

    def save(self, *args, **kwargs):
        if self.pk and self.file:  # Check if this is an update to an existing record
            self.uploaded_at = now()  # Update the timestamp to the current time
        super().save(*args, **kwargs)  # Call the parent save method

    def __str__(self):
        return self.name


class Characteristics(models.Model):
    name = models.CharField(max_length=255)  # File name
    file = models.FileField(upload_to='characteristics/')  # Save to 'media/characteristics'
    uploaded_at = models.DateTimeField(auto_now_add=True)  # Automatically set upload timestamp

    def __str__(self):
        return self.name
