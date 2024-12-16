from django.urls import path
from . import views

urlpatterns = [
    path('', views.schedule_list, name='schedule_list'),
    path('upload/', views.upload_schedule, name='upload_schedule'),
    path('schedule/<int:schedule_id>/', views.schedule_detail, name='schedule_detail'),
    path('characteristics/upload/', views.upload_characteristics, name='upload_characteristics'),
    path('characteristics/delete/<int:pk>/', views.delete_characteristics, name='delete_characteristics'),
    path('schedule/delete/<int:pk>/', views.delete_schedule, name='delete_schedule'),
    path('update-schedule/<int:schedule_id>/', views.update_schedule_file, name='update_schedule_file'),
    path('characteristics/<int:characteristics_id>/', views.characteristics_detail, name='characteristics_detail'),
    path('update-characteristics/<int:characteristics_id>/', views.update_characteristics_file, name='update_characteristics_file'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('schedule/<int:schedule_id>/update-metrics/', views.update_metrics, name='update_metrics'),
]
