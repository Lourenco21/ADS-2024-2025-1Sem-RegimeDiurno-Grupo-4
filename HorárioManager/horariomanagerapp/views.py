from django.http import HttpResponse
from django.shortcuts import render
import csv
import io
from .forms import UploadFileForm

# Create your views here.


def showhorario(request):
    return render(request, 'tabela.html')

