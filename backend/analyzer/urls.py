"""URL patterns for the analyzer API."""

from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('upload/', views.upload_file, name='upload_file'),
    path('preview/<str:file_id>/', views.preview_data, name='preview_data'),
    path('analyze/', views.run_analysis, name='run_analysis'),
    path('results/', views.list_results, name='list_results'),
    path('results/<str:result_id>/', views.get_result, name='get_result'),
    path('results/<str:result_id>/download/', views.download_result, name='download_result'),
    path('status/<str:job_id>/', views.job_status, name='job_status'),
]
