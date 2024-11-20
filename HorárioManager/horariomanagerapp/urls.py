from django.urls import path
from . import views

urlpatterns = [
    path("", views.showhorario, name="horarioloaded")
]