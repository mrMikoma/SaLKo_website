# Simplified Network Configuration (Hetzner Gateway Routing)

## Architecture Overview

This is the **simplified** network configuration where Hetzner's infrastructure handles all inter-subnet routing.

### Traffic Flow

- **Internet Traffic**: Salko servers → Direct via public interface (no NAT)
- **Private Network Traffic**: Salko servers → Hetzner gateway (`10.1.0.1`) → Destination subnet
- **pfSense Role**: VPN gateway, firewall for specific use cases (not required for basic connectivity)

## Network Topology

```
Internet
    │
    ├─── Salko Server (10.1.2.2)
    │    ├─→ eth0 (public) ────→ Internet (direct)
    │    └─→ enp7s0 (private) ──→ Hetzner Gateway (10.1.0.1)
    │
    └─── Hetzner Cloud Network (10.1.0.0/16)
         │
         ├─── Hetzner Gateway (10.1.0.1)
         │    └─→ Routes between all subnets automatically
         │
         ├─── pfSense Subnet (10.1.0.0/24)
         │    └─── pfSense (10.1.0.2) - Optional, for VPN/firewall
         │
         ├─── Runner Subnet (10.1.1.0/24)
         │    └─── GitHub Runners (10.1.1.x)
         │
         └─── Salko Subnet (10.1.2.0/24)
              ├─── salko0 (10.1.2.2)
              ├─── salko1 (10.1.2.3)
              └─── salko2 (10.1.2.4)
```

## How It Works

### 1. Hetzner Gateway Handles Routing

Hetzner Cloud automatically routes traffic between all subnets within the `10.1.0.0/16` network:
- Salko servers can reach pfSense at `10.1.0.2`
- Salko servers can reach each other
- Runners can reach Salko servers
- All routing happens through Hetzner's infrastructure at `10.1.0.1`

### 2. Salko Server Configuration

Each Salko server has:

**Public Interface** (`eth0`):
- DHCP from Hetzner
- Public IPv4
- Default route to internet

**Private Interface** (`enp7s0`):
- Static IP: `10.1.2.x/32`
- Route: `10.1.0.0/16` via `10.1.0.1`
- DNS: Cloudflare (1.1.1.1)

### 3. Routing Table

```bash
default via X.X.X.X dev eth0 metric 100        # Internet via public
10.1.0.0/16 via 10.1.0.1 dev enp7s0 onlink     # Private via Hetzner
```

## Benefits of This Approach

✅ **Simpler Configuration**: No complex pfSense routing setup required
✅ **More Reliable**: Uses Hetzner's proven infrastructure for routing
✅ **Better Performance**: Direct routing through Hetzner's high-speed network
✅ **Easier Troubleshooting**: Standard Hetzner Cloud Network behavior
✅ **Automatic**: Works out of the box with Hetzner Cloud Networks
✅ **Scalable**: Easy to add more subnets and servers

## pfSense Role (Optional)

pfSense is still useful for:
- **VPN Gateway**: WireGuard tunnel to home network
- **Firewall**: Advanced filtering between subnets (if needed)
- **NAT**: For servers without public IPs (if you add them later)
- **DNS**: Custom DNS resolution for internal names

But it's **not required** for basic inter-subnet communication.

## Configuration on Salko Server

The netplan configuration uses Hetzner's gateway:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp7s0:
      addresses:
        - 10.1.2.2/32
      routes:
        - to: 10.1.0.0/16
          via: 10.1.0.1  # Hetzner's gateway
          on-link: true
          metric: 100
      nameservers:
        addresses:
          - 1.1.1.1
          - 1.0.0.1
```

## Testing Connectivity

### From Salko Server

```bash
# Test Hetzner gateway
ping 10.1.0.1
# Should work ✅

# Test pfSense
ping 10.1.0.2
# Should work ✅ (routed via 10.1.0.1)

# Test another Salko server
ping 10.1.2.3
# Should work ✅

# Test internet
ping 1.1.1.1
# Should work ✅ (direct via eth0)

# Check routing
ip route show
# Should show:
# default via X.X.X.X dev eth0
# 10.1.0.0/16 via 10.1.0.1 dev enp7s0 onlink
```

### From pfSense

```bash
# Test Salko server
ping 10.1.2.2
# Should work ✅

# Test Hetzner gateway
ping 10.1.0.1
# Should work ✅
```

## Applying the Fix to Existing Server

On your current Salko server:

```bash
# Backup current config
sudo cp /etc/netplan/60-private-network.yaml /etc/netplan/60-private-network.yaml.bak

# Edit the configuration
sudo nano /etc/netplan/60-private-network.yaml

# Change the route line from:
#   via: 10.1.0.2
# To:
#   via: 10.1.0.1

# Apply
sudo netplan apply

# Test
ping 10.1.0.1  # Hetzner gateway
ping 10.1.0.2  # pfSense
```

## Variables

The Terraform configuration doesn't need to change much:

```hcl
# The private_gateway_ip is still used for pfSense IP reference
# But routing goes through 10.1.0.1 (hardcoded in script)
private_gateway_ip = "10.1.0.2"  # pfSense IP for VPN/firewall use
```

## Comparison: Old vs New

### Old Approach (Complex)
```
Salko → pfSense (10.1.0.2) → Destination
❌ pfSense needs complex routing
❌ pfSense becomes bottleneck
❌ Hard to troubleshoot
```

### New Approach (Simple)
```
Salko → Hetzner Gateway (10.1.0.1) → Destination
✅ Hetzner handles routing
✅ No bottleneck
✅ Standard behavior
```

## When to Use pfSense Routing

Only use pfSense as gateway if you need:
- Deep packet inspection between subnets
- Custom firewall rules between subnets
- Traffic shaping/QoS
- IDS/IPS for internal traffic

For most homelab use cases, **Hetzner gateway routing is sufficient**.

## Summary

This simplified approach:
1. ✅ Uses Hetzner's gateway (`10.1.0.1`) for inter-subnet routing
2. ✅ Keeps internet traffic direct (no NAT)
3. ✅ Makes pfSense optional (only for VPN/advanced features)
4. ✅ Works reliably out of the box
5. ✅ Matches Hetzner's recommended architecture

Much simpler and more maintainable! 🎉
