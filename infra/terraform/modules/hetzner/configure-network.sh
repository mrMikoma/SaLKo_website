#!/bin/bash
set -ex

PRIVATE_IP="${private_ip}"

echo "Starting network configuration for IP: $PRIVATE_IP" | tee -a /var/log/configure-network.log

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

# Remove cloud-init netplan config
rm -f /etc/netplan/50-cloud-init.yaml

# Create new netplan configuration
cat > /etc/netplan/01-netcfg.yaml <<NETPLAN_EOF
network:
  version: 2
  renderer: networkd
  ethernets:
    $PRIVATE_IFACE:
      dhcp4: false
      dhcp6: false
      accept-ra: false
      addresses:
        - $PRIVATE_IP/16
      routes:
        - to: default
          via: 10.1.2.1
          metric: 100
      nameservers:
        addresses:
          - 10.1.2.1
          - 1.1.1.1
NETPLAN_EOF

# Set permissions
chmod 600 /etc/netplan/01-netcfg.yaml

echo "Netplan configuration created:" | tee -a /var/log/configure-network.log
cat /etc/netplan/01-netcfg.yaml | tee -a /var/log/configure-network.log

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

echo "Configuration complete!" | tee -a /var/log/configure-network.log
