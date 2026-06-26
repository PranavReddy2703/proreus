package system

import (
	"context"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	psnet "github.com/shirou/gopsutil/v3/net"
	"github.com/PranavReddy2703/proreus/agent/internal/api/generated"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
)

var lastNetStat *psnet.IOCountersStat
var lastNetTime int64

func GetMetrics() (*generated.SystemMetrics, error) {
	metrics := &generated.SystemMetrics{}
	
	// CPU
	cpuPercent, _ := cpu.Percent(0, false)
	cpuInfo, _ := cpu.Info()
	if len(cpuInfo) > 0 {
		metrics.Cpu.Cores = int(cpuInfo[0].Cores)
		metrics.Cpu.Frequency = float32(cpuInfo[0].Mhz)
	}
	if len(cpuPercent) > 0 {
		metrics.Cpu.Usage = float32(cpuPercent[0])
	}
	
	// RAM
	v, _ := mem.VirtualMemory()
	if v != nil {
		metrics.Memory.Total = int64(v.Total)
		metrics.Memory.Used = int64(v.Used)
		metrics.Memory.Free = int64(v.Free)
		metrics.Memory.UsagePercent = float32(v.UsedPercent)
	}
	
	// Disk
	d, _ := disk.Usage("/")
	if d != nil {
		metrics.Disk.Total = int64(d.Total)
		metrics.Disk.Used = int64(d.Used)
		metrics.Disk.Free = int64(d.Free)
		metrics.Disk.UsagePercent = float32(d.UsedPercent)
	}
	
	// Uptime
	h, _ := host.Info()
	if h != nil {
		metrics.Uptime = int64(h.Uptime)
	}
	
	// Network
	netStats, _ := psnet.IOCounters(false)
	metrics.Network.DownMbps = 0
	metrics.Network.UpMbps = 0

	if len(netStats) > 0 {
		currentStat := netStats[0]
		currentTime := time.Now().UnixNano()
		if lastNetStat != nil {
			timeDiff := float64(currentTime-lastNetTime) / 1e9 // seconds
			if timeDiff > 0 {
				bytesSent := currentStat.BytesSent - lastNetStat.BytesSent
				bytesRecv := currentStat.BytesRecv - lastNetStat.BytesRecv
				
				metrics.Network.UpMbps = float32((float64(bytesSent) * 8 / 1e6) / timeDiff)
				metrics.Network.DownMbps = float32((float64(bytesRecv) * 8 / 1e6) / timeDiff)
			}
		}
		lastNetStat = &currentStat
		lastNetTime = currentTime
	}

	// Docker Containers
	metrics.Containers.Active = 0
	metrics.Containers.Exited = 0
	metrics.Containers.Warning = 0
	metrics.Containers.Running = false
	
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err == nil {
		_, pingErr := cli.Ping(context.Background())
		if pingErr == nil {
			metrics.Containers.Running = true
			containers, err := cli.ContainerList(context.Background(), container.ListOptions{All: true})
			if err == nil {
				for _, c := range containers {
					if c.State == "running" {
						metrics.Containers.Active++
					} else if c.State == "exited" {
						metrics.Containers.Exited++
					} else {
						metrics.Containers.Warning++
					}
				}
			}
		}
		cli.Close()
	}
	
	// Estimated Power (Watts)
	idleW := 30.0
	peakW := 120.0
	usageFrac := float64(metrics.Cpu.Usage) / 100.0
	estimatedWatts := idleW + (peakW-idleW)*usageFrac
	metrics.Power.Watts = int(estimatedWatts)
	
	return metrics, nil
}
