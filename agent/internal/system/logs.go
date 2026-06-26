package system

import (
	"bufio"
	"bytes"
	"crypto/rand"
	"fmt"
	"os/exec"
	"runtime"
	"strings"

	"github.com/PranavReddy2703/proreus/agent/internal/api/generated"
)

func generateID() string {
	b := make([]byte, 4)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}

func GetSystemLogs() ([]generated.SystemLogEntry, error) {
	var cmd *exec.Cmd

	if runtime.GOOS == "darwin" {
		cmd = exec.Command("log", "show", "--predicate", "process != \"kernel\"", "--last", "1m", "--style", "syslog")
	} else if runtime.GOOS == "linux" {
		cmd = exec.Command("journalctl", "-n", "200", "--no-pager")
	} else {
		return nil, fmt.Errorf("unsupported OS: %s", runtime.GOOS)
	}

	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get logs: %w", err)
	}

	var entries []generated.SystemLogEntry
	scanner := bufio.NewScanner(bytes.NewReader(out))

	var lines []string
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	if len(lines) > 200 {
		lines = lines[len(lines)-200:]
	}

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "Filtering the log data") || strings.HasPrefix(line, "Timestamp") || strings.HasPrefix(line, "Log      -") {
			continue
		}

		parts := strings.SplitN(line, ": ", 2)
		var prefix, message string
		if len(parts) == 2 {
			prefix = parts[0]
			message = parts[1]
		} else {
			prefix = ""
			message = line
		}

		service := "system"
		timestamp := ""
		level := "INFO"

		if prefix != "" {
			prefixParts := strings.Fields(prefix)
			if len(prefixParts) > 0 {
				serviceRaw := prefixParts[len(prefixParts)-1]
				if idx := strings.Index(serviceRaw, "["); idx != -1 {
					service = serviceRaw[:idx]
				} else {
					service = serviceRaw
				}
				
				if len(prefixParts) > 2 {
					timestamp = strings.Join(prefixParts[:len(prefixParts)-2], " ")
				} else {
					timestamp = prefixParts[0]
				}
			}
		}

		msgLower := strings.ToLower(message)
		if strings.Contains(msgLower, "error") || strings.Contains(msgLower, "failed") || strings.Contains(msgLower, "fatal") || strings.Contains(msgLower, "invalid") {
			level = "ERROR"
		} else if strings.Contains(msgLower, "warn") || strings.Contains(msgLower, "timeout") {
			level = "WARN"
		}

		if timestamp == "" {
			timestamp = "00:00:00"
		} else {
			if strings.Contains(timestamp, "+") { 
				timeParts := strings.Fields(timestamp)
				if len(timeParts) >= 2 {
					timeOnly := timeParts[1]
					if idx := strings.Index(timeOnly, "."); idx != -1 {
						timestamp = timeOnly[:idx] 
					} else {
						timestamp = timeOnly
					}
				}
			} else if len(timestamp) > 15 {
				timestamp = timestamp[len(timestamp)-8:] 
			}
		}

		entries = append(entries, generated.SystemLogEntry{
			Id:        generateID(),
			Timestamp: timestamp,
			Level:     level,
			Service:   service,
			Message:   message,
		})
	}

	return entries, nil
}
