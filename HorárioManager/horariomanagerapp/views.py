from django.http import HttpResponse
from django.shortcuts import render

# Create your views here.


def helloWorld(request):
    return render(request, "helloWorld.html")
