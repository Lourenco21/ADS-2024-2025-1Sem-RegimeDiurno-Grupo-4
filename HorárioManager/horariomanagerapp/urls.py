from django.urls import path
from . import views

urlpatterns = [
    path('', views.schedule_list, name='schedule_list'),
    path('upload/', views.upload_schedule, name='upload_schedule'),
    path('schedule/<int:schedule_id>/', views.schedule_detail, name='schedule_detail'),

]