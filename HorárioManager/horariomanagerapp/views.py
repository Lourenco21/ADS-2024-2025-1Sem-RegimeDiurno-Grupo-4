from django.shortcuts import render, redirect, get_object_or_404
from .models import Schedule, Characteristics
from django.contrib import messages
from django.core.files.storage import FileSystemStorage


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
    file_name = schedule.file.name.replace('schedules/', '')
    return render(request, 'schedule_detail.html', {
        'schedule': schedule,
        'file_url': schedule.file.url,
        'file_name': file_name,
        'characteristics': characteristics,
        'characteristics_url': characteristics.file.url,
        'characteristics_name': characteristics.file.name,
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
