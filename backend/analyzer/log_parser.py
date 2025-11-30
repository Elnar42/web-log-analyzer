"""Log file parsing utilities supporting multiple formats."""

import re
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass


@dataclass
class ParsedLogEntry:
    """Represents a parsed log entry."""
    ip: str
    timestamp: Optional[datetime]
    method: str
    path: str
    protocol: str
    status: int
    size: int
    raw_line: str


# Regex patterns for different log formats
# Apache Combined Log Format with optional referrer, user-agent, and response time
APACHE_COMBINED_REGEX = re.compile(
    r'^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)\s*(\S*)"\s+(\d+)\s+(\S+)(?:\s+"([^"]*)"\s+"([^"]*)")?(?:\s+(\d+))?'
)

NGINX_REGEX = re.compile(
    r'^(\S+)\s+-\s+-\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)\s*(\S*)"\s+(\d+)\s+(\S+)(?:\s+"([^"]*)"\s+"([^"]*)")?(?:\s+(\d+))?'
)

# Month mapping for Apache date format
MONTH_MAP = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
}

# CSV header keywords for auto-detection
CSV_HEADER_KEYWORDS = ['ip', 'address', 'timestamp', 'date', 'method', 'url', 'path', 'status', 'size', 'bytes']


def parse_apache_timestamp(timestamp_str: str) -> Optional[datetime]:
    """Parse Apache log timestamp format: 15/Jul/2009:14:58:59 -0700"""
    try:
        match = re.match(r'(\d+)/(\w+)/(\d+):(\d+):(\d+):(\d+)\s*([+-]\d+)?', timestamp_str)
        if match:
            day, month, year, hour, minute, second, tz = match.groups()
            month_num = MONTH_MAP.get(month, 1)
            return datetime(
                int(year), month_num, int(day),
                int(hour), int(minute), int(second)
            )
    except (ValueError, TypeError):
        pass
    return None


def parse_log_line(line: str) -> Optional[ParsedLogEntry]:
    """Parse a single log line using multiple format patterns."""
    line = line.strip()
    if not line:
        return None
    
    # Try Apache/Nginx combined format
    for pattern in [APACHE_COMBINED_REGEX, NGINX_REGEX]:
        match = pattern.match(line)
        if match:
            ip, timestamp_str, method, path, protocol, status, size = match.groups()
            
            # Parse size, handling '-' for missing values
            parsed_size = 0 if size == '-' else int(size) if size.isdigit() else 0
            
            # Skip entries with size '-' (304 responses, etc.) as per requirements
            if size == '-':
                return None
            
            return ParsedLogEntry(
                ip=ip,
                timestamp=parse_apache_timestamp(timestamp_str),
                method=method or 'GET',
                path=path or '/',
                protocol=protocol or 'HTTP/1.1',
                status=int(status) if status.isdigit() else 0,
                size=parsed_size,
                raw_line=line
            )
    
    return None


def detect_csv_format(first_line: str) -> bool:
    """Detect if the file is in CSV format."""
    lower_line = first_line.lower()
    return any(keyword in lower_line for keyword in CSV_HEADER_KEYWORDS) or ',' in first_line


def parse_csv_line(values: List[str], field_map: Dict[str, int], line: str) -> Optional[ParsedLogEntry]:
    """Parse a CSV line based on detected field mapping."""
    try:
        ip = values[field_map.get('ip', -1)] if field_map.get('ip', -1) >= 0 else 'unknown'
        
        timestamp = None
        if field_map.get('timestamp', -1) >= 0:
            ts_str = values[field_map['timestamp']]
            try:
                timestamp = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
            except ValueError:
                timestamp = parse_apache_timestamp(ts_str)
        
        method = values[field_map.get('method', -1)] if field_map.get('method', -1) >= 0 else 'GET'
        path = values[field_map.get('path', -1)] if field_map.get('path', -1) >= 0 else '/'
        
        status = 0
        if field_map.get('status', -1) >= 0:
            status_str = values[field_map['status']]
            status = int(status_str) if status_str.isdigit() else 0
        
        size = 0
        if field_map.get('size', -1) >= 0:
            size_str = values[field_map['size']]
            if size_str and size_str != '-':
                size = int(size_str) if size_str.isdigit() else 0
            else:
                return None  # Skip entries with no size
        
        # Skip entries with insufficient data
        if ip == 'unknown' and path == '/' and status == 0:
            return None
        
        return ParsedLogEntry(
            ip=ip,
            timestamp=timestamp,
            method=method,
            path=path,
            protocol='HTTP/1.1',
            status=status,
            size=size,
            raw_line=line
        )
    except (IndexError, ValueError):
        return None


def detect_csv_fields(headers: List[str]) -> Dict[str, int]:
    """Map CSV headers to field indices."""
    field_map = {}
    
    for i, header in enumerate(headers):
        h = header.lower().strip().strip('"\'')
        
        if 'ip' in h or 'address' in h or 'client' in h:
            field_map['ip'] = i
        elif 'time' in h or 'date' in h:
            field_map['timestamp'] = i
        elif 'method' in h or 'verb' in h:
            field_map['method'] = i
        elif 'path' in h or 'url' in h or 'uri' in h or 'request' in h:
            field_map['path'] = i
        elif 'status' in h or 'code' in h or 'response' in h:
            field_map['status'] = i
        elif 'size' in h or 'bytes' in h or 'length' in h:
            field_map['size'] = i
    
    return field_map


def parse_csv_file(lines: List[str]) -> Tuple[List[ParsedLogEntry], List[str]]:
    """Parse a CSV file."""
    entries = []
    errors = []
    
    if not lines:
        return entries, ['Empty file']
    
    # Detect delimiter
    first_line = lines[0]
    delimiter = '\t' if '\t' in first_line else ','
    
    # Parse header
    headers = [h.strip() for h in first_line.split(delimiter)]
    field_map = detect_csv_fields(headers)
    
    if 'ip' not in field_map and 'path' not in field_map:
        errors.append('CSV does not contain recognizable log fields (ip, path, status, etc.)')
        return entries, errors
    
    # Parse data rows
    for i, line in enumerate(lines[1:], start=2):
        line = line.strip()
        if not line:
            continue
        
        values = [v.strip().strip('"\'') for v in line.split(delimiter)]
        entry = parse_csv_line(values, field_map, line)
        
        if entry:
            entries.append(entry)
        else:
            errors.append(f'Line {i}: Unable to parse - "{line[:60]}..."')
    
    return entries, errors


def parse_log_file(content: str) -> Tuple[List[ParsedLogEntry], List[str]]:
    """
    Parse log file content and return entries and errors.
    Supports Apache, Nginx, and CSV formats.
    """
    lines = [line for line in content.split('\n') if line.strip()]
    entries = []
    errors = []
    
    if not lines:
        return entries, ['Empty file']
    
    # Detect format
    if detect_csv_format(lines[0]):
        return parse_csv_file(lines)
    
    # Parse as standard log format
    for i, line in enumerate(lines, start=1):
        entry = parse_log_line(line)
        if entry:
            entries.append(entry)
        else:
            errors.append(f'Line {i}: Unable to parse - "{line[:60]}..."')
    
    return entries, errors
