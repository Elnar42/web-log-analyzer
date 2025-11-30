# Sample Files Directory

Place your sample log files here. The following files are expected:

1. **sample-apache.log** - Apache Combined Log Format example
2. **sample-nginx.log** - Nginx Access Log example  
3. **sample.csv** - CSV format example
4. **sample.txt** - Apache Common Log Format example

These files will be accessible at `/samples/[filename]` and can be downloaded from the upload page.

## File Format Examples

### Apache Combined Log Format (sample-apache.log)
```
233.223.117.90 - - [27/Dec/2037:12:00:00 +0530] "DELETE /usr/admin HTTP/1.0" 502 4963 "-" "Mozilla/5.0..." 45
```

### Nginx Access Log (sample-nginx.log)
```
192.168.1.1 - - [25/Dec/2023:10:15:30 +0000] "GET /index.html HTTP/1.1" 200 1234 "-" "Mozilla/5.0..."
```

### CSV Format (sample.csv)
```
ip,timestamp,method,path,status,size
192.168.1.1,2023-12-25T10:15:30Z,GET,/index.html,200,1234
```

### Apache Common Log Format (sample.txt)
```
192.168.1.1 - - [25/Dec/2023:10:15:30 +0000] "GET /index.html HTTP/1.1" 200 1234
```

