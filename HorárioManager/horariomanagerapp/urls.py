from django.urls import path
from . import views

urlpatterns = [
    path("horarioloaded", views.showhorario, name="horarioloaded")
]