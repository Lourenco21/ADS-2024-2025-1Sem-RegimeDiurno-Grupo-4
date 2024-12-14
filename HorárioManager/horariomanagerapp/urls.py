from django.urls import path
from . import views

urlpatterns = [
    path('', views.schedule_list, name='schedule_list'),
    path('upload/', views.upload_schedule, name='upload_schedule'),
    path('schedule/<int:schedule_id>/', views.schedule_detail, name='schedule_detail'),
    path('characteristics/upload/', views.upload_characteristics, name='upload_characteristics'),
    path('characteristics/delete/<int:pk>/', views.delete_characteristics, name='delete_characteristics'),
    path('schedule/delete/<int:pk>/', views.delete_schedule, name='delete_schedule'),
]
