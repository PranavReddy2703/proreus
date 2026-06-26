package system

import (
	"bytes"
	"context"
	"fmt"
	"strings"

	"github.com/PranavReddy2703/proreus/agent/internal/api/generated"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
)

func GetDockerContainers() ([]generated.DockerContainer, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}
	defer cli.Close()

	containers, err := cli.ContainerList(context.Background(), container.ListOptions{All: true})
	if err != nil {
		return nil, err
	}

	var results []generated.DockerContainer
	for _, c := range containers {
		name := ""
		if len(c.Names) > 0 {
			name = strings.TrimPrefix(c.Names[0], "/")
		}

		portsStr := ""
		for _, p := range c.Ports {
			if p.PublicPort != 0 {
				portsStr += fmt.Sprintf("%d:%d ", p.PublicPort, p.PrivatePort)
			}
		}

		if portsStr == "" {
			portsStr = "-"
		}

		results = append(results, generated.DockerContainer{
			Id:     c.ID[:12],
			Name:   name,
			Status: c.State,
			Image:  c.Image,
			Uptime: c.Status,
			Ports:  portsStr,
		})
	}
	return results, nil
}

func GetDockerContainerLogs(id string) (*generated.DockerLogs, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}
	defer cli.Close()

	options := container.LogsOptions{ShowStdout: true, ShowStderr: true, Tail: "100"}
	out, err := cli.ContainerLogs(context.Background(), id, options)
	if err != nil {
		return nil, err
	}
	defer out.Close()

	var stdout, stderr bytes.Buffer
	_, err = stdcopy.StdCopy(&stdout, &stderr, out)
	if err != nil {
		return nil, err
	}

	allLogs := stdout.String() + stderr.String()
	lines := strings.Split(strings.TrimSpace(allLogs), "\n")

	// remove the last empty line if exists
	if len(lines) > 0 && lines[len(lines)-1] == "" {
		lines = lines[:len(lines)-1]
	}

	return &generated.DockerLogs{Logs: lines}, nil
}

func ExecuteDockerAction(id string, action string) (*generated.DockerActionResponse, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}
	defer cli.Close()

	ctx := context.Background()
	var actionErr error

	switch action {
	case "start":
		actionErr = cli.ContainerStart(ctx, id, container.StartOptions{})
	case "stop":
		timeout := int(10)
		stopOptions := container.StopOptions{Timeout: &timeout}
		actionErr = cli.ContainerStop(ctx, id, stopOptions)
	case "restart":
		timeout := int(10)
		stopOptions := container.StopOptions{Timeout: &timeout}
		actionErr = cli.ContainerRestart(ctx, id, stopOptions)
	default:
		return nil, fmt.Errorf("unknown action: %s", action)
	}

	if actionErr != nil {
		return &generated.DockerActionResponse{
			Success: false,
			Message: actionErr.Error(),
		}, nil
	}

	return &generated.DockerActionResponse{
		Success: true,
		Message: fmt.Sprintf("Successfully executed %s on container %s", action, id),
	}, nil
}
