from django.http import HttpResponse
from django.shortcuts import render
import csv
import io
from .forms import UploadFileForm

# Create your views here.


def helloWorld(request):
    return render(request, "helloWorld.html")

def showhorario(request):
    return render(request, 'tabela.html')

