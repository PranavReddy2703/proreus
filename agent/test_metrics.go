package main

import (
	"encoding/json"
	"fmt"
	"github.com/PranavReddy2703/proreus/agent/internal/system"
)

func main() {
	metrics, err := system.GetMetrics()
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	out, _ := json.MarshalIndent(metrics, "", "  ")
	fmt.Println(string(out))
}
