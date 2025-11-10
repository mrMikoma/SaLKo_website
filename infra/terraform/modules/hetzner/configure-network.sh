#!/bin/bash
set -ex

PRIVATE_IP="${private_ip}"
PRIVATE_GATEWAY="${private_gateway}"
NETWORK_CIDR="${network_cidr}"

echo "Starting network configuration for IP: $PRIVATE_IP" | tee -a /var/log/configure-network.log
echo "Private Gateway: $PRIVATE_GATEWAY" | tee -a /var/log/configure-network.log
echo "Network CIDR: $NETWORK_CIDR" | tee -a /var/log/configure-network.log

# Wait for network to be up
sleep 10

# Find the private interface
PRIVATE_IFACE=$(ip -o addr show | grep "$PRIVATE_IP" | awk '{print $2}')

if [ -z "$PRIVATE_IFACE" ]; then
  echo "ERROR: Could not find interface with IP $PRIVATE_IP" | tee -a /var/log/configure-network.log
  ip -o addr show | tee -a /var/log/configure-network.log
  exit 1
fi

echo "Found interface: $PRIVATE_IFACE with IP: $PRIVATE_IP" | tee -a /var/log/configure-network.log

# Disable Hetzner's hc-utils auto-configuration for private interface
# This prevents conflicts between DHCP and our static configuration
echo "Disabling hc-utils auto-configuration for $PRIVATE_IFACE..." | tee -a /var/log/configure-network.log
if systemctl is-active --quiet "hc-net-ifup@$PRIVATE_IFACE.service"; then
  systemctl stop "hc-net-ifup@$PRIVATE_IFACE.service" 2>&1 | tee -a /var/log/configure-network.log
  systemctl mask "hc-net-ifup@$PRIVATE_IFACE.service" 2>&1 | tee -a /var/log/configure-network.log
  echo "hc-utils service disabled for $PRIVATE_IFACE" | tee -a /var/log/configure-network.log
else
  echo "hc-utils service not active for $PRIVATE_IFACE" | tee -a /var/log/configure-network.log
fi

# Remove cloud-init netplan config
rm -f /etc/netplan/50-cloud-init.yaml

# Create new netplan configuration using Hetzner's default gateway
# Using /32 addressing with on-link routing (Hetzner Cloud standard)
# Internet traffic stays on public interface (eth0)
# Private network traffic uses Hetzner's gateway (10.1.0.1)
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
        # Route private network traffic through Hetzner's gateway
        # This allows communication with all subnets in 10.1.0.0/16
        - to: $NETWORK_CIDR
          via: 10.1.0.1
          on-link: true
          metric: 100
      nameservers:
        addresses:
          - 1.1.1.1
          - 1.0.0.1
NETPLAN_EOF

# Set permissions
chmod 600 /etc/netplan/60-private-network.yaml

echo "Netplan configuration created:" | tee -a /var/log/configure-network.log
cat /etc/netplan/60-private-network.yaml | tee -a /var/log/configure-network.log

# Apply configuration
netplan apply 2>&1 | tee -a /var/log/configure-network.log

# Restart networkd for clean state
systemctl restart systemd-networkd 2>&1 | tee -a /var/log/configure-network.log

echo "Network configuration applied successfully" | tee -a /var/log/configure-network.log
echo "New network state:" | tee -a /var/log/configure-network.log
ip addr show $PRIVATE_IFACE | tee -a /var/log/configure-network.log
ip route show | tee -a /var/log/configure-network.log

# Disable cloud-init network management for future boots
echo 'network: {config: disabled}' > /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg

# Test connectivity within private network
echo "Testing connectivity to Hetzner gateway..." | tee -a /var/log/configure-network.log
if ping -c 3 10.1.0.1 >> /var/log/configure-network.log 2>&1; then
  echo "SUCCESS: Hetzner gateway 10.1.0.1 is reachable!" | tee -a /var/log/configure-network.log
else
  echo "WARNING: Cannot reach Hetzner gateway 10.1.0.1" | tee -a /var/log/configure-network.log
fi

# Test connectivity to pfSense (if specified)
if [ -n "$PRIVATE_GATEWAY" ] && [ "$PRIVATE_GATEWAY" != "10.1.0.1" ]; then
  echo "Testing connectivity to pfSense at $PRIVATE_GATEWAY..." | tee -a /var/log/configure-network.log
  if ping -c 3 $PRIVATE_GATEWAY >> /var/log/configure-network.log 2>&1; then
    echo "SUCCESS: pfSense $PRIVATE_GATEWAY is reachable!" | tee -a /var/log/configure-network.log
  else
    echo "INFO: pfSense $PRIVATE_GATEWAY not reachable (expected if using Hetzner routing)" | tee -a /var/log/configure-network.log
  fi
fi

echo "Configuration complete!" | tee -a /var/log/configure-network.log
