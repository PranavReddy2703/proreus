package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/PranavReddy2703/proreus/agent/internal/api"
	"github.com/PranavReddy2703/proreus/agent/internal/api/generated"
	"github.com/PranavReddy2703/proreus/agent/internal/auth"
	"github.com/mdp/qrterminal/v3"
)

func getLocalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "127.0.0.1"
	}
	for _, address := range addrs {
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				return ipnet.IP.String()
			}
		}
	}
	return "127.0.0.1"
}

func main() {
	// Default dev mode to true if not specified
	if os.Getenv("PROREUS_DEV_MODE") == "" {
		os.Setenv("PROREUS_DEV_MODE", "true")
	}

	apiKey := os.Getenv("PROREUS_API_KEY")
	if apiKey == "" {
		apiKey = "dev-key"
		os.Setenv("PROREUS_API_KEY", apiKey)
	}

	e := echo.New()
	
	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())
	e.Use(auth.ApiKeyMiddleware())

	// Handlers
	server := &api.Server{}
	
	generated.RegisterHandlersWithBaseURL(e, server, "/api/v1")

	ip := getLocalIP()
	payload := map[string]string{
		"ip":   ip,
		"port": "8080",
		"key":  apiKey,
	}
	jsonPayload, _ := json.Marshal(payload)
	
	fmt.Println("\n========================================================")
	fmt.Println("🚀 PROREUS AGENT IS RUNNING")
	fmt.Println("========================================================")
	fmt.Println("Scan this QR Code in the Proreus mobile app to connect:")
	fmt.Println("")
	qrterminal.GenerateHalfBlock(string(jsonPayload), qrterminal.L, os.Stdout)
	fmt.Println("========================================================\n")

	log.Println("Starting Proreus agent on :8080...")
	if err := e.Start(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
