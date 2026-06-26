package main

import (
	"context"
	"fmt"
	"github.com/docker/docker/client"
)

func main() {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		fmt.Printf("Client error: %v\n", err)
		return
	}
	defer cli.Close()

	ping, err := cli.Ping(context.Background())
	if err != nil {
		fmt.Printf("Ping error: %v\n", err)
	} else {
		fmt.Printf("Ping success! API version: %v\n", ping.APIVersion)
	}
}
