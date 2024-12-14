from django.shortcuts import render, redirect, get_object_or_404
from .models import Schedule


# Create your views here.

def schedule_list(request):
    schedules = Schedule.objects.all()
    return render(request, 'schedule_list.html', {'schedules': schedules})


def upload_schedule(request):
    if request.method == 'POST' and request.FILES.get('file'):
        file = request.FILES['file']
        schedule = Schedule(name=file.name, file=file)
        schedule.save()
        return redirect('schedule_list')  # Redirect to the list page after upload
    return render(request, 'upload_schedule.html')


def schedule_detail(request, schedule_id):
    # Obtenha o arquivo pelo ID
    schedule = get_object_or_404(Schedule, id=schedule_id)
    file_name = schedule.file.name.replace('schedules/', '')
    return render(request, 'schedule_detail.html', {
        'schedule': schedule,
        'file_url': schedule.file.url,
        'file_name': file_name
    })
