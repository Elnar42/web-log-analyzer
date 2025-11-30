"""API views for the WebLog Analyzer."""

import json
import os
import uuid
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.response import Response
from rest_framework import status

from .models import UploadedFile, AnalysisJob, AnalysisResult
from .log_parser import parse_log_file, ParsedLogEntry
from .spark_analyzer import SparkLogAnalyzer, save_results_to_csv


# In-memory storage for parsed data (for demo - use Redis/DB in production)
PARSED_DATA_CACHE = {}


def entry_to_dict(entry: ParsedLogEntry) -> dict:
    """Convert ParsedLogEntry to dictionary."""
    return {
        'ip': entry.ip,
        'timestamp': entry.timestamp.isoformat() if entry.timestamp else None,
        'method': entry.method,
        'path': entry.path,
        'protocol': entry.protocol,
        'status': entry.status,
        'size': entry.size,
    }


@api_view(['GET'])
def health_check(request):
    """Health check endpoint for frontend to verify backend is running."""
    return Response({
        'status': 'healthy',
        'service': 'WebLog Analyzer API',
        'spark': 'available',
        'timestamp': datetime.now().isoformat()
    })


@api_view(['POST'])
@parser_classes([MultiPartParser])
def upload_file(request):
    """
    Upload and parse a log file.
    Returns file ID and parsing summary.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Debug: log request data
    logger.info(f"Upload request - FILES keys: {list(request.FILES.keys())}, POST keys: {list(request.POST.keys())}")
    
    if 'file' not in request.FILES:
        logger.warning("Upload request missing 'file' field")
        return Response(
            {'error': 'No file provided. Make sure the form field is named "file".'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    file = request.FILES['file']
    filename = file.name.lower() if file.name else ''
    
    logger.info(f"Upload request for file: {file.name}, size: {file.size if hasattr(file, 'size') else 'unknown'}")
    
    # Validate file type - only .txt and .log files
    if not any(filename.endswith(ext) for ext in ['.txt', '.log']):
        logger.warning(f"Invalid file type: {filename}")
        return Response(
            {'error': 'Only TXT and LOG files are supported'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Read file content - handle large files and encoding
        # Django file uploads can only be read once, so read it completely first
        try:
            # Read the entire file content
            file_content = file.read()
            
            # Handle bytes vs string
            if isinstance(file_content, bytes):
                # Try UTF-8 first, fallback to latin-1
                try:
                    content = file_content.decode('utf-8', errors='ignore')
                except (UnicodeDecodeError, AttributeError):
                    content = file_content.decode('latin-1', errors='ignore')
            else:
                # Already a string
                content = str(file_content)
                
        except Exception as e:
            logger.error(f"Error reading file: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Error reading file: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not content:
            logger.warning("Uploaded file content is None or empty")
            return Response(
                {'error': 'File is empty or could not be read'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if content is just whitespace
        if len(content.strip()) == 0:
            logger.warning("Uploaded file contains only whitespace")
            return Response(
                {'error': 'File is empty (contains only whitespace)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Limit file size to prevent memory issues
        if len(content) > 100 * 1024 * 1024:  # 100MB limit
            logger.warning(f"File too large: {len(content)} bytes")
            return Response(
                {'error': 'File too large. Maximum size is 100MB'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse log file
        entries, errors = parse_log_file(content)
        
        if not entries:
            logger.warning(f"No valid log entries found. Errors: {len(errors)}")
            return Response(
                {
                    'error': 'No valid log entries found',
                    'details': errors[:10] if errors else ['Unable to parse file format'],
                    'supported_formats': [
                        'Apache Combined Log Format',
                        'Apache Common Log Format',
                        'Nginx Default Format'
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Save file metadata
        file_id = str(uuid.uuid4())
        
        # Store in media directory
        file_path = Path(settings.MEDIA_ROOT) / f"{file_id}_{file.name}"
        with open(file_path, 'w') as f:
            f.write(content)
        
        # Save to database
        uploaded_file = UploadedFile.objects.create(
            id=file_id,
            filename=file.name,
            file_path=str(file_path),
            file_size=file.size,
            total_rows=len(entries) + len(errors),
            valid_rows=len(entries),
            error_rows=len(errors),
        )
        
        # Cache parsed data
        PARSED_DATA_CACHE[file_id] = [entry_to_dict(e) for e in entries]
        
        return Response({
            'fileId': file_id,
            'filename': file.name,
            'totalRows': len(entries) + len(errors),
            'validRows': len(entries),
            'errorRows': len(errors),
            'errors': errors[:20],  # Return first 20 errors
            'message': f'Successfully parsed {len(entries)} entries'
        })
        
    except Exception as e:
        logger.error(f"Upload error: {str(e)}", exc_info=True)
        error_message = str(e) if str(e) else 'Unknown error occurred'
        return Response(
            {'error': f'Failed to process file: {error_message}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def preview_data(request, file_id):
    """
    Get paginated preview of parsed data.
    Query params: page (default 1), limit (default 100)
    """
    if file_id not in PARSED_DATA_CACHE:
        # Try to reload from database
        try:
            uploaded_file = UploadedFile.objects.get(id=file_id)
            with open(uploaded_file.file_path, 'r') as f:
                content = f.read()
            entries, _ = parse_log_file(content)
            PARSED_DATA_CACHE[file_id] = [entry_to_dict(e) for e in entries]
        except (UploadedFile.DoesNotExist, FileNotFoundError):
            return Response(
                {'error': 'File not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    data = PARSED_DATA_CACHE[file_id]
    
    # Pagination
    page = int(request.GET.get('page', 1))
    limit = int(request.GET.get('limit', 100))
    
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    
    paginated_data = data[start_idx:end_idx]
    
    return Response({
        'data': paginated_data,
        'total': len(data),
        'page': page,
        'limit': limit,
        'totalPages': (len(data) + limit - 1) // limit
    })


@api_view(['POST'])
def run_analysis(request):
    """
    Run selected analyses on uploaded data.
    Request body: {
        fileId: string,
        selectedAnalyses: string[],
        filters: object
    }
    """
    try:
        data = request.data
        file_id = data.get('fileId')
        selected_analyses = data.get('selectedAnalyses', [])
        filters = data.get('filters', {})
        
        if not file_id:
            return Response(
                {'error': 'fileId is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not selected_analyses:
            return Response(
                {'error': 'At least one analysis must be selected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get parsed data
        if file_id not in PARSED_DATA_CACHE:
            try:
                uploaded_file = UploadedFile.objects.get(id=file_id)
                with open(uploaded_file.file_path, 'r') as f:
                    content = f.read()
                entries, _ = parse_log_file(content)
                PARSED_DATA_CACHE[file_id] = [entry_to_dict(e) for e in entries]
            except (UploadedFile.DoesNotExist, FileNotFoundError):
                return Response(
                    {'error': 'File not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        entries = PARSED_DATA_CACHE[file_id]
        
        # Create analysis job
        uploaded_file = UploadedFile.objects.get(id=file_id)
        job = AnalysisJob.objects.create(
            uploaded_file=uploaded_file,
            selected_analyses=selected_analyses,
            filters=filters,
            status='running'
        )
        
        try:
            # Run Spark analysis
            analyzer = SparkLogAnalyzer()
            results = analyzer.run_analyses(entries, selected_analyses, filters)
            analyzer.stop()
            
            # Save results to CSV
            csv_paths = save_results_to_csv(results, str(job.id))
            
            # Update job status
            job.status = 'completed'
            job.records_processed = results['filteredRecords']
            job.result_path = csv_paths.get('json', '')
            job.completed_at = datetime.now()
            job.save()
            
            # Save individual results
            for analysis_type, result_data in results['analyses'].items():
                AnalysisResult.objects.create(
                    job=job,
                    analysis_type=analysis_type,
                    result_data=result_data,
                    csv_path=csv_paths.get(analysis_type, '')
                )
            
            return Response({
                'jobId': str(job.id),
                'status': 'completed',
                'results': results,
                'csvPaths': csv_paths
            })
            
        except Exception as e:
            job.status = 'failed'
            job.error_message = str(e)
            job.save()
            raise
        
    except Exception as e:
        return Response(
            {'error': f'Analysis failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def job_status(request, job_id):
    """Get status of an analysis job."""
    try:
        job = AnalysisJob.objects.get(id=job_id)
        return Response({
            'jobId': str(job.id),
            'status': job.status,
            'progress': job.progress,
            'recordsProcessed': job.records_processed,
            'error': job.error_message if job.status == 'failed' else None,
            'createdAt': job.created_at.isoformat(),
            'completedAt': job.completed_at.isoformat() if job.completed_at else None
        })
    except AnalysisJob.DoesNotExist:
        return Response(
            {'error': 'Job not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
def list_results(request):
    """List all analysis results (history)."""
    try:
        jobs = AnalysisJob.objects.filter(status='completed').select_related('uploaded_file')
    except Exception as e:
        # Database table doesn't exist - return empty list
        return Response({
            'results': [],
            'message': 'Database not initialized. Please run: python manage.py migrate'
        })
    
    results = []
    for job in jobs:
        results.append({
            'id': str(job.id),
            'filename': job.uploaded_file.filename,
            'selectedAnalyses': job.selected_analyses,
            'filters': job.filters,
            'recordsProcessed': job.records_processed,
            'createdAt': job.created_at.isoformat(),
            'completedAt': job.completed_at.isoformat() if job.completed_at else None
        })
    
    return Response({'results': results})


@api_view(['GET'])
def get_result(request, result_id):
    """Get detailed results for a specific job."""
    try:
        job = AnalysisJob.objects.get(id=result_id)
        
        # Load results from JSON file
        if job.result_path and os.path.exists(job.result_path):
            with open(job.result_path, 'r') as f:
                results = json.load(f)
        else:
            # Reconstruct from database
            analysis_results = job.results.all()
            results = {
                'timestamp': job.completed_at.isoformat() if job.completed_at else job.created_at.isoformat(),
                'totalRecords': job.uploaded_file.valid_rows,
                'filteredRecords': job.records_processed,
                'analyses': {r.analysis_type: r.result_data for r in analysis_results}
            }
        
        return Response({
            'jobId': str(job.id),
            'filename': job.uploaded_file.filename,
            'selectedAnalyses': job.selected_analyses,
            'filters': job.filters,
            'results': results
        })
        
    except AnalysisJob.DoesNotExist:
        return Response(
            {'error': 'Result not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
def download_result(request, result_id):
    """Download analysis results as CSV."""
    analysis_type = request.GET.get('type', 'json')
    
    try:
        job = AnalysisJob.objects.get(id=result_id)
        results_dir = settings.RESULTS_DIR / str(result_id)
        
        file_map = {
            'unique-ips': 'unique_ips.csv',
            'uniqueIps': 'unique_ips.csv',
            'top-pages': 'top_pages.csv',
            'topPages': 'top_pages.csv',
            'hourly-traffic': 'hourly_traffic.csv',
            'hourlyTraffic': 'hourly_traffic.csv',
            'status-codes': 'status_codes.csv',
            'statusCodes': 'status_codes.csv',
            'bandwidth': 'bandwidth.csv',
            'json': 'results.json',
        }
        
        filename = file_map.get(analysis_type, 'results.json')
        file_path = results_dir / filename
        
        if not file_path.exists():
            return Response(
                {'error': 'File not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        response = FileResponse(
            open(file_path, 'rb'),
            content_type='text/csv' if filename.endswith('.csv') else 'application/json'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
        
    except AnalysisJob.DoesNotExist:
        return Response(
            {'error': 'Result not found'},
            status=status.HTTP_404_NOT_FOUND
        )
