#!/bin/bash
set -ex

# Template variables
PRIVATE_IP="${private_ip}"
PRIVATE_GATEWAY="${private_gateway}"
NETWORK_CIDR="${network_cidr}"
LOG_FILE="/var/log/configure-network.log"

log() {
  echo "$1" | tee -a "$LOG_FILE"
}

log "=== Starting network configuration ==="
log "Private IP: $PRIVATE_IP"
log "Network CIDR: $NETWORK_CIDR"
log "Gateway: $PRIVATE_GATEWAY"

# Wait for cloud-init to configure the public interface
log "Waiting for cloud-init to configure public interface..."
sleep 15

if [ ! -f /etc/netplan/50-cloud-init.yaml ]; then
  log "WARNING: cloud-init config missing, waiting..."
  cloud-init status --wait 2>&1 | tee -a "$LOG_FILE"
fi

# Verify internet connectivity before proceeding
log "Verifying internet access..."
if ! ping -c 2 1.1.1.1 >> "$LOG_FILE" 2>&1; then
  log "WARNING: Internet not reachable, applying cloud-init config..."
  netplan apply 2>&1 | tee -a "$LOG_FILE"
  sleep 5
fi

# Find the private network interface
PRIVATE_IFACE=$(ip -o addr show | grep "$PRIVATE_IP" | awk '{print $2}')

if [ -z "$PRIVATE_IFACE" ]; then
  log "ERROR: Could not find interface with IP $PRIVATE_IP"
  ip -o addr show | tee -a "$LOG_FILE"
  exit 1
fi

log "Found private interface: $PRIVATE_IFACE"

# Disable hc-utils for private interface to prevent DHCP conflicts
if systemctl is-active --quiet "hc-net-ifup@$PRIVATE_IFACE.service"; then
  log "Disabling hc-utils for $PRIVATE_IFACE..."
  systemctl stop "hc-net-ifup@$PRIVATE_IFACE.service" 2>&1 | tee -a "$LOG_FILE"
  systemctl mask "hc-net-ifup@$PRIVATE_IFACE.service" 2>&1 | tee -a "$LOG_FILE"
else
  log "hc-utils not active for $PRIVATE_IFACE"
fi

# Create netplan config for private interface
# NOTE: Do NOT remove /etc/netplan/50-cloud-init.yaml - it manages the public interface
log "Creating netplan configuration..."
cat > /etc/netplan/60-private-network.yaml <<NETPLAN_EOF
network:
  version: 2
  renderer: networkd
  ethernets:
    $PRIVATE_IFACE:
      dhcp4: false
      dhcp6: false
      accept-ra: false
      addresses:
        - $PRIVATE_IP/32
      routes:
        - to: $NETWORK_CIDR
          via: 10.1.0.1
          on-link: true
          metric: 100
      nameservers:
        addresses:
          - 1.1.1.1
          - 1.0.0.1
NETPLAN_EOF

chmod 600 /etc/netplan/60-private-network.yaml
cat /etc/netplan/60-private-network.yaml | tee -a "$LOG_FILE"

# Apply configuration
log "Applying netplan configuration..."
netplan apply 2>&1 | tee -a "$LOG_FILE"
sleep 3

systemctl restart systemd-networkd 2>&1 | tee -a "$LOG_FILE"
sleep 3

# Show final network state
log "=== Network configuration complete ==="
ip addr show "$PRIVATE_IFACE" | tee -a "$LOG_FILE"
ip route show | tee -a "$LOG_FILE"

# Test connectivity
log "=== Testing connectivity ==="

# Test internet
if ping -c 2 1.1.1.1 >> "$LOG_FILE" 2>&1; then
  log "✓ Internet reachable"
else
  log "✗ WARNING: Internet not reachable"
fi

# Test private network gateway
if ping -c 2 10.1.0.1 >> "$LOG_FILE" 2>&1; then
  log "✓ Hetzner gateway (10.1.0.1) reachable"
else
  log "✗ WARNING: Hetzner gateway not reachable"
fi

# Test pfSense if configured
if [ -n "$PRIVATE_GATEWAY" ] && [ "$PRIVATE_GATEWAY" != "10.1.0.1" ]; then
  if ping -c 2 "$PRIVATE_GATEWAY" >> "$LOG_FILE" 2>&1; then
    log "✓ pfSense ($PRIVATE_GATEWAY) reachable"
  else
    log "ℹ pfSense ($PRIVATE_GATEWAY) not reachable (may be expected)"
  fi
fi

log "=== Configuration complete ==="
