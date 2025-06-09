#!/usr/bin/env python3
import os
import json

server_ips = os.getenv("SERVER_IPS", "")
ip_list = [ip.strip() for ip in server_ips.split(",") if ip.strip()]

inventory = {
    "all": {
        "hosts": ip_list,
    }
}

print(json.dumps(inventory))
