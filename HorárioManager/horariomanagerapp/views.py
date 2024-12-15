from django.core.files.base import ContentFile
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
import json
import base64
import os
from .models import Schedule, Characteristics
from django.contrib import messages
from django.core.files.storage import default_storage

# Create your views here.

def schedule_list(request):
    schedules = Schedule.objects.all()
    characteristics = Characteristics.objects.last()
    return render(request, 'schedule_list.html', {'schedules': schedules, 'characteristics': characteristics})


def upload_schedule(request):
    if request.method == 'POST' and request.FILES.get('file'):
        file = request.FILES['file']
        if not file.name.endswith('.csv'):
            return render(request, 'upload_characteristics.html', {
                'error': 'Only CSV files are allowed!'
            })
        schedule = Schedule(name=file.name, file=file)
        schedule.save()
        return redirect('schedule_list')
    return render(request, 'upload_schedule.html')


def schedule_detail(request, schedule_id):
    schedule = get_object_or_404(Schedule, id=schedule_id)
    characteristics = Characteristics.objects.last()
    file_name = os.path.basename(schedule.file.name)
    return render(request, 'schedule_detail.html', {
        'schedule': schedule,
        'file_url': schedule.file.url,
        'file_name': file_name,
        'characteristics': characteristics,
        'characteristics_url': characteristics.file.url,
        'characteristics_name': os.path.basename(characteristics.file.name),
    })


def characteristics_detail(request, characteristics_id):
    characteristics = get_object_or_404(Characteristics, id=characteristics_id)
    return render(request, 'characteristics_detail.html',
                  {
                      'characteristics': characteristics,
                      'characteristics_url': characteristics.file.url,
                  })


def upload_characteristics(request):
    if request.method == 'POST' and request.FILES['file']:
        file = request.FILES['file']
        if not file.name.endswith('.csv'):
            return render(request, 'upload_characteristics.html', {
                'error': 'Only CSV files are allowed!'
            })

        Characteristics.objects.create(name=file.name, file=file)
        return redirect('schedule_list')

    return render(request, 'upload_characteristics.html')


def delete_characteristics(request, pk):
    characteristics = get_object_or_404(Characteristics, pk=pk)
    if request.method == 'POST':
        if characteristics.file:
            characteristics.file.delete()

        characteristics.delete()
        messages.success(request, "File deleted successfully.")
        return redirect('schedule_list')
    return redirect('upload_characteristics')


def delete_schedule(request, pk):
    schedule = get_object_or_404(Schedule, pk=pk)
    if request.method == 'POST':
        if schedule.file:
            schedule.file.delete()

        schedule.delete()
        messages.success(request, "File deleted successfully.")
        return redirect('schedule_list')
    return redirect('upload_schedule')


@csrf_exempt  # Use proper CSRF handling in production
def update_schedule_file(request, schedule_id):
    if request.method == "POST":
        if 'file' in request.FILES:
            schedule = get_object_or_404(Schedule, id=schedule_id)
            new_file = request.FILES['file']

            # Extract the base name of the existing file (removes directory)
            existing_file_name = os.path.basename(schedule.file.name)  # Extract "schedule1.csv" from "schedules/schedule1.csv"

            if schedule.file:
                # Delete the old file
                schedule.file.delete()

            # Save the new file with the same name but in the schedules/ directory
            new_file_path = f"schedules_updated/{existing_file_name}"

            # Save the new file with the same path
            schedule.file.save(new_file_path, new_file)

            # Save the schedule instance with the updated file
            schedule.save()

            return JsonResponse({"success": True, "message": "File updated successfully."})
        else:
            return JsonResponse({"success": False, "message": "No file field in request.FILES."}, status=400)

    return JsonResponse({"success": False, "message": "Invalid request method."}, status=405)

