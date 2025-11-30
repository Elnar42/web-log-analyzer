"""Database models for storing analysis history."""

from django.db import models
import uuid


class UploadedFile(models.Model):
    """Stores uploaded log file metadata."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filename = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.BigIntegerField()
    total_rows = models.IntegerField(default=0)
    valid_rows = models.IntegerField(default=0)
    error_rows = models.IntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']


class AnalysisJob(models.Model):
    """Stores analysis job metadata and status."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    uploaded_file = models.ForeignKey(UploadedFile, on_delete=models.CASCADE, related_name='jobs')
    selected_analyses = models.JSONField()  # List of analysis types
    filters = models.JSONField(default=dict)  # Applied filters
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    progress = models.IntegerField(default=0)  # 0-100
    result_path = models.CharField(max_length=500, blank=True)
    error_message = models.TextField(blank=True)
    records_processed = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']


class AnalysisResult(models.Model):
    """Stores individual analysis results."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(AnalysisJob, on_delete=models.CASCADE, related_name='results')
    analysis_type = models.CharField(max_length=50)
    result_data = models.JSONField()
    csv_path = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
