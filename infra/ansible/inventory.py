#!/usr/bin/env python3
import os
import json

server_ips = os.getenv("SERVER_IPS", "")
# Comma-separated; empty entries (an unset variable) and repeats are dropped
ip_list = list(dict.fromkeys(ip.strip() for ip in server_ips.split(",") if ip.strip()))

inventory = {
    "all": {
        "hosts": ip_list,
    }
}

print(json.dumps(inventory))
