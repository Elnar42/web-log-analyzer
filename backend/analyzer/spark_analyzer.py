"""Apache Spark analysis jobs for web log processing."""

from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, TimestampType
from typing import Dict, List, Any, Optional
from datetime import datetime
import json
import os

from django.conf import settings


# Schema for log entries
LOG_SCHEMA = StructType([
    StructField("ip", StringType(), True),
    StructField("timestamp", TimestampType(), True),
    StructField("method", StringType(), True),
    StructField("path", StringType(), True),
    StructField("protocol", StringType(), True),
    StructField("status", IntegerType(), True),
    StructField("size", IntegerType(), True),
])


class SparkLogAnalyzer:
    """Spark-based log analyzer for large-scale processing."""
    
    def __init__(self):
        self.spark = None
    
    def _get_or_create_spark(self) -> SparkSession:
        """Get or create Spark session."""
        if self.spark is None:
            self.spark = SparkSession.builder \
                .appName(settings.SPARK_APP_NAME) \
                .master(settings.SPARK_MASTER) \
                .config("spark.driver.memory", "2g") \
                .config("spark.executor.memory", "2g") \
                .config("spark.sql.shuffle.partitions", "4") \
                .getOrCreate()
            
            # Set log level to reduce noise
            self.spark.sparkContext.setLogLevel("WARN")
        
        return self.spark
    
    def stop(self):
        """Stop Spark session."""
        if self.spark:
            self.spark.stop()
            self.spark = None
    
    def create_dataframe(self, entries: List[Dict[str, Any]]):
        """Create Spark DataFrame from log entries."""
        spark = self._get_or_create_spark()
        
        # Convert entries to Spark-compatible format
        data = []
        for entry in entries:
            timestamp = None
            if entry.get('timestamp'):
                try:
                    if isinstance(entry['timestamp'], str):
                        timestamp = datetime.fromisoformat(entry['timestamp'].replace('Z', '+00:00'))
                    else:
                        timestamp = entry['timestamp']
                except (ValueError, TypeError):
                    pass
            
            data.append((
                entry.get('ip', 'unknown'),
                timestamp,
                entry.get('method', 'GET'),
                entry.get('path', '/'),
                entry.get('protocol', 'HTTP/1.1'),
                entry.get('status', 0),
                entry.get('size', 0),
            ))
        
        return spark.createDataFrame(data, LOG_SCHEMA)
    
    def apply_filters(self, df, filters: Dict[str, Any]):
        """Apply filters to DataFrame."""
        if not filters:
            return df
        
        # Date range filter
        date_range = filters.get('dateRange', {})
        if date_range.get('start'):
            try:
                start_dt = datetime.fromisoformat(date_range['start'])
                df = df.filter(F.col('timestamp') >= start_dt)
            except ValueError:
                pass
        
        if date_range.get('end'):
            try:
                end_dt = datetime.fromisoformat(date_range['end'])
                df = df.filter(F.col('timestamp') <= end_dt)
            except ValueError:
                pass
        
        # IP address filter
        ip_pattern = filters.get('ipAddress', '')
        if ip_pattern:
            df = df.filter(F.col('ip').contains(ip_pattern))
        
        # URL pattern filter
        url_pattern = filters.get('urlPattern', '')
        if url_pattern:
            df = df.filter(F.col('path').contains(url_pattern))
        
        # Status codes filter
        status_codes = filters.get('statusCodes', [])
        if status_codes:
            # Handle both exact codes and code groups (200, 300, 400, 500)
            conditions = []
            for code in status_codes:
                if code in [200, 300, 400, 500]:
                    # It's a group code, match the range
                    conditions.append(
                        (F.col('status') >= code) & (F.col('status') < code + 100)
                    )
                else:
                    conditions.append(F.col('status') == code)
            
            if conditions:
                combined = conditions[0]
                for cond in conditions[1:]:
                    combined = combined | cond
                df = df.filter(combined)
        
        # HTTP methods filter
        methods = filters.get('httpMethods', [])
        if methods:
            df = df.filter(F.col('method').isin(methods))
        
        # Size range filter
        size_range = filters.get('sizeRange', {})
        if size_range.get('min'):
            try:
                min_size = int(size_range['min'])
                df = df.filter(F.col('size') >= min_size)
            except ValueError:
                pass
        
        if size_range.get('max'):
            try:
                max_size = int(size_range['max'])
                df = df.filter(F.col('size') <= max_size)
            except ValueError:
                pass
        
        return df
    
    def unique_ip_counter(self, df) -> Dict[str, Any]:
        """P1: Count unique IP addresses and rank by frequency."""
        # Count unique IPs
        unique_count = df.select('ip').distinct().count()
        
        # Top IPs by request count
        top_ips = df.groupBy('ip') \
            .count() \
            .orderBy(F.desc('count')) \
            .limit(10) \
            .collect()
        
        return {
            'count': unique_count,
            'topIps': [{'ip': row['ip'], 'count': row['count']} for row in top_ips]
        }
    
    def top_pages_counter(self, df) -> List[Dict[str, Any]]:
        """P2: Count top requested pages."""
        top_pages = df.groupBy('path') \
            .count() \
            .orderBy(F.desc('count')) \
            .limit(20) \
            .collect()
        
        return [{'path': row['path'], 'count': row['count']} for row in top_pages]
    
    def hourly_traffic_counter(self, df) -> List[Dict[str, Any]]:
        """P3: Count traffic by hour of day."""
        # Extract hour from timestamp
        hourly = df.filter(F.col('timestamp').isNotNull()) \
            .withColumn('hour', F.hour('timestamp')) \
            .groupBy('hour') \
            .count() \
            .orderBy('hour') \
            .collect()
        
        # Create full 24-hour result
        hour_counts = {row['hour']: row['count'] for row in hourly}
        return [{'hour': h, 'count': hour_counts.get(h, 0)} for h in range(24)]
    
    def status_code_distribution(self, df) -> List[Dict[str, Any]]:
        """P4: Distribution of HTTP status codes."""
        status_dist = df.groupBy('status') \
            .count() \
            .orderBy('status') \
            .collect()
        
        return [{'status': row['status'], 'count': row['count']} for row in status_dist]
    
    def bandwidth_aggregator(self, df) -> Dict[str, Any]:
        """P5: Aggregate bandwidth usage."""
        # Total and average size
        size_stats = df.agg(
            F.sum('size').alias('total'),
            F.avg('size').alias('avg')
        ).collect()[0]
        
        total_bytes = int(size_stats['total'] or 0)
        avg_size = float(size_stats['avg'] or 0)
        
        # Top paths by bandwidth
        top_paths = df.groupBy('path') \
            .agg(F.sum('size').alias('bytes')) \
            .orderBy(F.desc('bytes')) \
            .limit(10) \
            .collect()
        
        return {
            'totalBytes': total_bytes,
            'avgSize': avg_size,
            'byPath': [{'path': row['path'], 'bytes': int(row['bytes'])} for row in top_paths]
        }
    
    def run_analyses(
        self,
        entries: List[Dict[str, Any]],
        selected_analyses: List[str],
        filters: Optional[Dict[str, Any]] = None,
        progress_callback=None
    ) -> Dict[str, Any]:
        """Run selected analyses on log entries."""
        
        # Create DataFrame
        df = self.create_dataframe(entries)
        original_count = df.count()
        
        # Apply filters
        if filters:
            df = self.apply_filters(df, filters)
        
        filtered_count = df.count()
        
        # Cache for multiple analyses
        df.cache()
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'totalRecords': original_count,
            'filteredRecords': filtered_count,
            'analyses': {}
        }
        
        analysis_map = {
            'unique-ips': ('uniqueIps', self.unique_ip_counter),
            'top-pages': ('topPages', self.top_pages_counter),
            'hourly-traffic': ('hourlyTraffic', self.hourly_traffic_counter),
            'status-codes': ('statusCodes', self.status_code_distribution),
            'bandwidth': ('bandwidth', self.bandwidth_aggregator),
        }
        
        total = len(selected_analyses)
        for i, analysis_id in enumerate(selected_analyses):
            if analysis_id in analysis_map:
                key, func = analysis_map[analysis_id]
                results['analyses'][key] = func(df)
                
                if progress_callback:
                    progress_callback(int((i + 1) / total * 100))
        
        # Uncache
        df.unpersist()
        
        return results


def save_results_to_csv(results: Dict[str, Any], job_id: str) -> Dict[str, str]:
    """Save analysis results to CSV files."""
    csv_paths = {}
    results_dir = settings.RESULTS_DIR / str(job_id)
    results_dir.mkdir(parents=True, exist_ok=True)
    
    analyses = results.get('analyses', {})
    
    # Unique IPs
    if 'uniqueIps' in analyses:
        path = results_dir / 'unique_ips.csv'
        with open(path, 'w') as f:
            f.write('ip,count\n')
            for item in analyses['uniqueIps']['topIps']:
                f.write(f"{item['ip']},{item['count']}\n")
        csv_paths['uniqueIps'] = str(path)
    
    # Top Pages
    if 'topPages' in analyses:
        path = results_dir / 'top_pages.csv'
        with open(path, 'w') as f:
            f.write('path,count\n')
            for item in analyses['topPages']:
                f.write(f"\"{item['path']}\",{item['count']}\n")
        csv_paths['topPages'] = str(path)
    
    # Hourly Traffic
    if 'hourlyTraffic' in analyses:
        path = results_dir / 'hourly_traffic.csv'
        with open(path, 'w') as f:
            f.write('hour,count\n')
            for item in analyses['hourlyTraffic']:
                f.write(f"{item['hour']},{item['count']}\n")
        csv_paths['hourlyTraffic'] = str(path)
    
    # Status Codes
    if 'statusCodes' in analyses:
        path = results_dir / 'status_codes.csv'
        with open(path, 'w') as f:
            f.write('status,count\n')
            for item in analyses['statusCodes']:
                f.write(f"{item['status']},{item['count']}\n")
        csv_paths['statusCodes'] = str(path)
    
    # Bandwidth
    if 'bandwidth' in analyses:
        path = results_dir / 'bandwidth.csv'
        with open(path, 'w') as f:
            f.write('path,bytes\n')
            for item in analyses['bandwidth']['byPath']:
                f.write(f"\"{item['path']}\",{item['bytes']}\n")
        csv_paths['bandwidth'] = str(path)
    
    # Save full results as JSON
    json_path = results_dir / 'results.json'
    with open(json_path, 'w') as f:
        json.dump(results, f, indent=2)
    csv_paths['json'] = str(json_path)
    
    return csv_paths
